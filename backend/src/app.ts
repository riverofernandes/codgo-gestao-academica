import express, { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { montarContexto } from "./assistente/contexto.js";
import type { ProvedorAssistente } from "./assistente/tipos.js";
import { ErroHttp, naoEncontrada, tratarErros } from "./http/erros.js";
import { assistenteSchema, buscaSchema, idSchema, validar } from "./http/validacao.js";
import type { AlunosRepository } from "./repositories/alunosRepository.js";

export interface LimiteAssistente {
  /** Máximo de perguntas por IP dentro da janela. */
  maximo: number;
  janelaMs: number;
}

export interface Dependencias {
  repo: AlunosRepository;
  assistente: ProvedorAssistente;
  limiteAssistente?: LimiteAssistente;
}

export const LIMITE_ASSISTENTE_PADRAO: LimiteAssistente = { maximo: 10, janelaMs: 60_000 };

export function criarApp({ repo, assistente, limiteAssistente = LIMITE_ASSISTENTE_PADRAO }: Dependencias) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "10kb" }));

  const api = Router();

  // Cada pergunta ao LLM tem custo: limita por IP para conter abuso e gasto inesperado.
  const limitarAssistente = rateLimit({
    windowMs: limiteAssistente.janelaMs,
    limit: limiteAssistente.maximo,
    standardHeaders: "draft-8", // RateLimit / RateLimit-Policy + Retry-After
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      const segundos = Math.ceil(limiteAssistente.janelaMs / 1000);
      next(
        new ErroHttp(
          429,
          "LIMITE_EXCEDIDO",
          `Muitas perguntas em pouco tempo (máximo de ${limiteAssistente.maximo} a cada ${segundos} s). Aguarde um pouco e tente novamente.`,
        ),
      );
    },
  });

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

  api.post("/assistente", limitarAssistente, async (req, res, next) => {
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
