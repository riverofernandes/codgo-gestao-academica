import { z } from "zod";
import { ErroHttp } from "./erros.js";

const idNumerico = z
  .number({ error: "O id deve ser numérico." })
  .int("O id deve ser um número inteiro.")
  .positive("O id deve ser positivo.");

// Converte só strings decimais simples ("3", "-1", "1.5"); evita que z.coerce aceite
// "1e1", "0x3", " 3" ou booleanos (true → 1).
export const idSchema = z.preprocess(
  (v) => (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v),
  idNumerico,
);

export const buscaSchema = z
  .string()
  .trim()
  .max(100, "A busca deve ter no máximo 100 caracteres.")
  .optional();

export const assistenteSchema = z.object(
  {
    pergunta: z
      .string({ error: "Informe a pergunta (texto)." })
      .trim()
      .min(1, "A pergunta não pode estar vazia.")
      .max(500, "A pergunta deve ter no máximo 500 caracteres."),
    alunoId: idSchema.optional().nullable(),
  },
  { error: "O corpo deve ser um objeto JSON { pergunta, alunoId? }." },
);

/** Valida com zod e converte falhas em 400 com mensagens legíveis. */
export function validar<T>(schema: z.ZodType<T>, valor: unknown): T {
  const r = schema.safeParse(valor);
  if (!r.success) {
    const mensagens = r.error.issues.map((i) => i.message);
    throw new ErroHttp(400, "VALIDACAO", mensagens.join(" "), r.error.issues.map((i) => ({ campo: i.path.join("."), mensagem: i.message })));
  }
  return r.data;
}
