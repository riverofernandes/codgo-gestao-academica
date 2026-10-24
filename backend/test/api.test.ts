import request from "supertest";
import { describe, expect, it } from "vitest";
import { criarApp } from "../src/app.js";
import { AssistenteDemonstrativo } from "../src/assistente/demonstrativo.js";
import type { ProvedorAssistente } from "../src/assistente/tipos.js";
import { gerarAlunos } from "../src/data/seed.js";
import { ErroHttp } from "../src/http/erros.js";
import { AlunosRepository } from "../src/repositories/alunosRepository.js";

const HOJE = "2026-10-24";

function montar(assistente: ProvedorAssistente = new AssistenteDemonstrativo()) {
  const repo = new AlunosRepository(gerarAlunos(HOJE), () => HOJE);
  return criarApp({ repo, assistente });
}

describe("GET /api/alunos", () => {
  it("lista todos os alunos com situação financeira calculada", async () => {
    const res = await request(montar()).get("/api/alunos").expect(200);
    expect(res.body.total).toBe(12);
    expect(res.body.dados[0]).toEqual(
      expect.objectContaining({ id: expect.any(Number), nome: expect.any(String), situacaoFinanceira: expect.any(String) }),
    );
  });

  it("busca por nome ignorando acentos e caixa", async () => {
    const res = await request(montar()).get("/api/alunos").query({ busca: "joao" }).expect(200);
    expect(res.body.dados.map((a: { nome: string }) => a.nome)).toEqual(["João Pedro Ribeiro"]);
  });

  it("busca por matrícula", async () => {
    const res = await request(montar()).get("/api/alunos").query({ busca: "2023015" }).expect(200);
    expect(res.body.dados).toHaveLength(1);
    expect(res.body.dados[0].nome).toBe("Carla Mendes Rocha");
  });

  it("400 para busca longa demais", async () => {
    const res = await request(montar()).get("/api/alunos").query({ busca: "x".repeat(101) }).expect(400);
    expect(res.body.erro.codigo).toBe("VALIDACAO");
  });
});

describe("GET /api/alunos/:id e /financeiro", () => {
  it("retorna o detalhe do aluno", async () => {
    const res = await request(montar()).get("/api/alunos/1").expect(200);
    expect(res.body.dados).toEqual(expect.objectContaining({ id: 1, matricula: "2024001", status: "ativa" }));
    expect(res.body.dados).not.toHaveProperty("situacaoFinanceiraLegada");
  });

  it("400 para id inválido e 404 para id inexistente", async () => {
    const app = montar();
    expect((await request(app).get("/api/alunos/abc").expect(400)).body.erro.codigo).toBe("VALIDACAO");
    expect((await request(app).get("/api/alunos/0").expect(400)).body.erro.codigo).toBe("VALIDACAO");
    expect((await request(app).get("/api/alunos/999").expect(404)).body.erro.codigo).toBe("ALUNO_NAO_ENCONTRADO");
    expect((await request(app).get("/api/alunos/999/financeiro").expect(404)).body.erro.codigo).toBe("ALUNO_NAO_ENCONTRADO");
  });

  it("REGRESSÃO DO BUG: aluna com mensalidade antiga em aberto e campo legado 'adimplente' aparece INADIMPLENTE", async () => {
    const app = montar();
    const lista = await request(app).get("/api/alunos").query({ busca: "Carla" }).expect(200);
    expect(lista.body.dados[0].situacaoFinanceira).toBe("inadimplente");

    const fin = await request(app).get("/api/alunos/3/financeiro").expect(200);
    expect(fin.body.dados.situacao).toBe("inadimplente");
    expect(fin.body.dados.resumo.parcelasVencidas).toBe(1);
    // A parcela mais recente vencida está paga — exatamente o cenário que enganava a regra antiga.
    const vencidasOuPagas = fin.body.dados.parcelas.filter((p: { vencimento: string }) => p.vencimento < HOJE);
    expect(vencidasOuPagas.at(-1).situacao).toBe("paga");
  });

  it("404 com envelope padrão para rota desconhecida", async () => {
    const res = await request(montar()).get("/api/nao-existe").expect(404);
    expect(res.body.erro.codigo).toBe("ROTA_NAO_ENCONTRADA");
  });
});

describe("POST /api/assistente", () => {
  it("modo demonstrativo responde inadimplentes a partir dos dados", async () => {
    const res = await request(montar())
      .post("/api/assistente")
      .send({ pergunta: "Quais alunos estão inadimplentes?" })
      .expect(200);
    expect(res.body.dados.modo).toBe("demonstrativo");
    expect(res.body.dados.resposta).toContain("Carla Mendes Rocha");
    expect(res.body.dados.resposta).not.toContain("Ana Beatriz Souza");
  });

  it("modo demonstrativo conta matrículas ativas", async () => {
    const res = await request(montar())
      .post("/api/assistente")
      .send({ pergunta: "Quantos alunos estão com matrícula ativa?" })
      .expect(200);
    expect(res.body.dados.resposta).toMatch(/^9 aluno\(s\) com matrícula ativa/);
  });

  it("resume o aluno selecionado quando alunoId é enviado", async () => {
    const res = await request(montar())
      .post("/api/assistente")
      .send({ pergunta: "Resuma a situação financeira do aluno selecionado.", alunoId: 3 })
      .expect(200);
    expect(res.body.dados.alunoId).toBe(3);
    expect(res.body.dados.resposta).toContain("INADIMPLENTE");
  });

  it("400 para pergunta vazia, longa ou JSON inválido; 404 para alunoId inexistente", async () => {
    const app = montar();
    await request(app).post("/api/assistente").send({ pergunta: "   " }).expect(400);
    await request(app).post("/api/assistente").send({}).expect(400);
    await request(app).post("/api/assistente").send({ pergunta: "a".repeat(501) }).expect(400);
    await request(app).post("/api/assistente").set("Content-Type", "application/json").send("{oops").expect(400);
    const r = await request(app).post("/api/assistente").send({ pergunta: "oi", alunoId: 999 }).expect(404);
    expect(r.body.erro.codigo).toBe("ALUNO_NAO_ENCONTRADO");
  });

  it("propaga indisponibilidade da IA como 503 sem fallback silencioso", async () => {
    const quebrado: ProvedorAssistente = {
      modo: "llm",
      responder: async () => {
        throw new ErroHttp(503, "IA_INDISPONIVEL", "O serviço de IA está indisponível no momento.");
      },
    };
    const res = await request(montar(quebrado)).post("/api/assistente").send({ pergunta: "oi" }).expect(503);
    expect(res.body).toEqual({ erro: { codigo: "IA_INDISPONIVEL", mensagem: expect.any(String) } });
  });

  it("erro inesperado vira 500 genérico sem vazar stack trace", async () => {
    const explode: ProvedorAssistente = {
      modo: "llm",
      responder: async () => {
        throw new Error("segredo interno sk-ant-xxx");
      },
    };
    const res = await request(montar(explode)).post("/api/assistente").send({ pergunta: "oi" }).expect(500);
    expect(JSON.stringify(res.body)).not.toContain("segredo");
  });
});

describe("validação estrita de ids (regressão encontrada no QA)", () => {
  it("rejeita formatos que z.coerce aceitaria (1e1, 0x3, espaço, booleano, array)", async () => {
    const app = montar();
    for (const id of ["1e1", "0x3", "%203", "1.5", "-1"]) {
      await request(app).get(`/api/alunos/${id}`).expect(400);
    }
    for (const alunoId of [true, [3], "abc", 0]) {
      await request(app).post("/api/assistente").send({ pergunta: "Resuma", alunoId }).expect(400);
    }
  });

  it("body que não é objeto recebe mensagem em português", async () => {
    const res = await request(montar()).post("/api/assistente").send([1]).expect(400);
    expect(res.body.erro.mensagem).toMatch(/objeto JSON/);
  });
});
