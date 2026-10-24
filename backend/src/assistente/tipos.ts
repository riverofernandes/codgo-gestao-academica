import type { ContextoAssistente } from "./contexto.js";

export interface RespostaAssistente {
  resposta: string;
  modo: "llm" | "demonstrativo";
  modelo: string | null;
}

/** Abstração do provedor: permite trocar Claude por outro LLM ou pelo modo demonstrativo. */
export interface ProvedorAssistente {
  readonly modo: RespostaAssistente["modo"];
  responder(pergunta: string, contexto: ContextoAssistente): Promise<RespostaAssistente>;
}
