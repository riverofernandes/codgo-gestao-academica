import express, { Router } from "express";
import { montarContexto } from "./assistente/contexto.js";
import type { ProvedorAssistente } from "./assistente/tipos.js";
import { ErroHttp, naoEncontrada, tratarErros } from "./http/erros.js";
import { assistenteSchema, buscaSchema, idSchema, validar } from "./http/validacao.js";
import type { AlunosRepository } from "./repositories/alunosRepository.js";

export interface Dependencias {
  repo: AlunosRepository;
  assistente: ProvedorAssistente;
}

export function criarApp({ repo, assistente }: Dependencias) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "10kb" }));

  const api = Router();

  api.get("/saude", (_req, res) => {
    res.json({ dados: { ok: true, modoAssistente: assistente.modo, dataReferencia: repo.dataReferencia() } });
  });

  api.get("/alunos", (req, res) => {
    const busca = validar(buscaSchema, typeof req.query.busca === "string" ? req.query.busca : undefined);
    const dados = repo.listar(busca);
    res.json({ dados, total: dados.length });
  });

  api.get("/alunos/:id", (req, res) => {
    const id = validar(idSchema, req.params.id);
    const aluno = repo.buscarPorId(id);
    if (!aluno) throw new ErroHttp(404, "ALUNO_NAO_ENCONTRADO", `Aluno ${id} não encontrado.`);
    res.json({ dados: aluno });
  });

  api.get("/alunos/:id/financeiro", (req, res) => {
    const id = validar(idSchema, req.params.id);
    const financeiro = repo.financeiro(id);
    if (!financeiro) throw new ErroHttp(404, "ALUNO_NAO_ENCONTRADO", `Aluno ${id} não encontrado.`);
    res.json({ dados: financeiro });
  });

  api.post("/assistente", async (req, res, next) => {
    try {
      const { pergunta, alunoId } = validar(assistenteSchema, req.body ?? {});
      if (alunoId != null && !repo.buscarPorId(alunoId)) {
        throw new ErroHttp(404, "ALUNO_NAO_ENCONTRADO", `Aluno ${alunoId} não encontrado.`);
      }
      const contexto = montarContexto(repo, alunoId);
      const r = await assistente.responder(pergunta, contexto);
      res.json({ dados: { ...r, alunoId: alunoId ?? null } });
    } catch (err) {
      next(err);
    }
  });

  app.use("/api", api);
  app.use(naoEncontrada);
  app.use(tratarErros);
  return app;
}
