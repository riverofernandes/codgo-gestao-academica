import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { AssistenteClaude, traduzirErro } from "../src/assistente/claude.js";
import { montarContexto } from "../src/assistente/contexto.js";
import { criarAssistente } from "../src/assistente/index.js";
import { gerarAlunos } from "../src/data/seed.js";
import { AlunosRepository } from "../src/repositories/alunosRepository.js";

const HOJE = "2026-10-24";
const repo = new AlunosRepository(gerarAlunos(HOJE), () => HOJE);

describe("contexto enviado ao modelo (minimização de dados)", () => {
  it("não inclui e-mail, ids internos nem campo legado; parcelas só do aluno selecionado", () => {
    const semSelecao = montarContexto(repo);
    const json = JSON.stringify(semSelecao);
    expect(json).not.toContain("@exemplo.edu.br");
    expect(json).not.toContain("situacaoFinanceiraLegada");
    expect(json).not.toContain('"parcelas"');
    expect(semSelecao.alunoSelecionado).toBeNull();
    expect(semSelecao.totais.porSituacaoFinanceira).toEqual({ adimplente: 6, inadimplente: 6 });

    const comSelecao = montarContexto(repo, 3);
    expect(comSelecao.alunoSelecionado?.nome).toBe("Carla Mendes Rocha");
    expect(comSelecao.alunoSelecionado?.parcelas.length).toBeGreaterThan(0);
  });
});

describe("criarAssistente", () => {
  it("usa modo demonstrativo sem chave e Claude com chave", () => {
    expect(criarAssistente({}).modo).toBe("demonstrativo");
    expect(criarAssistente({ ANTHROPIC_API_KEY: "  " }).modo).toBe("demonstrativo");
    expect(criarAssistente({ ANTHROPIC_API_KEY: "teste", ASSISTENTE_MODO: "demonstrativo" }).modo).toBe("demonstrativo");
    expect(criarAssistente({ ANTHROPIC_API_KEY: "teste" }).modo).toBe("llm");
  });
});

describe("AssistenteClaude (SDK mockado, sem rede)", () => {
  function clienteFalso(impl: (body: unknown) => Promise<unknown>) {
    const create = vi.fn(impl);
    return { cliente: { beta: { messages: { create } } } as unknown as Anthropic, create };
  }

  it("envia só o contexto e a pergunta, e devolve o texto", async () => {
    const { cliente, create } = clienteFalso(async () => ({
      model: "claude-opus-5-5",
      stop_reason: "end_turn",
      content: [{ type: "text", text: "Há 6 alunos inadimplentes." }],
    }));
    const ia = new AssistenteClaude({ apiKey: "x", cliente });
    const r = await ia.responder("Quantos inadimplentes?", montarContexto(repo));
    expect(r).toEqual({ resposta: "Há 6 alunos inadimplentes.", modo: "llm", modelo: "claude-opus-5-5" });
    const body = create.mock.calls[0][0] as unknown as { messages: Array<{ content: string }> };
    expect(body.messages[0].content).toContain("<pergunta>\nQuantos inadimplentes?\n</pergunta>");
    expect(body.messages[0].content).not.toContain("@exemplo.edu.br");
  });

  it("recusa do modelo vira 502 IA_RECUSOU", async () => {
    const { cliente } = clienteFalso(async () => ({ model: "m", stop_reason: "refusal", content: [] }));
    await expect(new AssistenteClaude({ apiKey: "x", cliente }).responder("?", montarContexto(repo))).rejects.toMatchObject({
      status: 502,
      codigo: "IA_RECUSOU",
    });
  });

  it("traduz timeout para 504 e falha de conexão/autenticação para 503", () => {
    expect(traduzirErro(new Anthropic.APIConnectionTimeoutError())).toMatchObject({ status: 504, codigo: "IA_TIMEOUT" });
    expect(traduzirErro(new Anthropic.APIConnectionError({ message: "ECONNREFUSED" }))).toMatchObject({
      status: 503,
      codigo: "IA_INDISPONIVEL",
    });
    expect(traduzirErro(new Error("x"))).toMatchObject({ status: 503 });
  });
});
