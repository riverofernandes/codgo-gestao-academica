import { AssistenteClaude } from "./claude.js";
import { AssistenteDemonstrativo } from "./demonstrativo.js";
import type { ProvedorAssistente } from "./tipos.js";

/**
 * Escolhe o provedor a partir do ambiente:
 *  - ASSISTENTE_MODO=demonstrativo força o modo local;
 *  - com ANTHROPIC_API_KEY → Claude;
 *  - sem chave → modo demonstrativo (respostas locais, sinalizadas na resposta).
 */
export function criarAssistente(env: NodeJS.ProcessEnv = process.env): ProvedorAssistente {
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (env.ASSISTENTE_MODO === "demonstrativo" || !apiKey) {
    return new AssistenteDemonstrativo();
  }
  const timeoutMs = Number(env.ASSISTENTE_TIMEOUT_MS);
  if (env.ASSISTENTE_TIMEOUT_MS && !(Number.isInteger(timeoutMs) && timeoutMs > 0)) {
    console.warn(`ASSISTENTE_TIMEOUT_MS inválido (${env.ASSISTENTE_TIMEOUT_MS}); usando o padrão.`);
  }
  return new AssistenteClaude({
    apiKey,
    modelo: env.ANTHROPIC_MODEL?.trim(),
    timeoutMs: Number.isInteger(timeoutMs) && timeoutMs > 0 ? timeoutMs : undefined,
  });
}
