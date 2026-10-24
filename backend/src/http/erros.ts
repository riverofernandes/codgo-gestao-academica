import type { ErrorRequestHandler, RequestHandler } from "express";

export type CodigoErro =
  | "VALIDACAO"
  | "ALUNO_NAO_ENCONTRADO"
  | "ROTA_NAO_ENCONTRADA"
  | "IA_INDISPONIVEL"
  | "IA_TIMEOUT"
  | "IA_RECUSOU"
  | "ERRO_INTERNO";

export class ErroHttp extends Error {
  constructor(
    readonly status: number,
    readonly codigo: CodigoErro,
    mensagem: string,
    readonly detalhes?: unknown,
  ) {
    super(mensagem);
    this.name = "ErroHttp";
  }
}

export const naoEncontrada: RequestHandler = (req, _res, next) => {
  next(new ErroHttp(404, "ROTA_NAO_ENCONTRADA", `Rota ${req.method} ${req.path} não encontrada.`));
};

/** Handler central: formato único de erro e nunca vaza stack trace para o cliente. */
export const tratarErros: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ErroHttp) {
    res.status(err.status).json({
      erro: { codigo: err.codigo, mensagem: err.message, ...(err.detalhes ? { detalhes: err.detalhes } : {}) },
    });
    return;
  }
  // JSON malformado no body (lançado pelo express.json)
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ erro: { codigo: "VALIDACAO", mensagem: "Corpo da requisição não é um JSON válido." } });
    return;
  }
  if (err?.type === "entity.too.large") {
    res.status(413).json({ erro: { codigo: "VALIDACAO", mensagem: "Corpo da requisição muito grande." } });
    return;
  }
  console.error("[erro não tratado]", err);
  res.status(500).json({ erro: { codigo: "ERRO_INTERNO", mensagem: "Erro interno inesperado." } });
};
