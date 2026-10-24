import { criarApp, LIMITE_ASSISTENTE_PADRAO } from "./app.js";
import { criarAssistente } from "./assistente/index.js";
import { gerarAlunos } from "./data/seed.js";
import { hojeISO } from "./domain/datas.js";
import { AlunosRepository } from "./repositories/alunosRepository.js";

const porta = Number(process.env.PORT ?? 3333);

// As datas do seed são ancoradas no dia em que o servidor sobe; o cálculo usa "hoje" a cada requisição.
const repo = new AlunosRepository(gerarAlunos(hojeISO()), () => hojeISO());
const assistente = criarAssistente();

function inteiroPositivo(valor: string | undefined, padrao: number): number {
  const n = Number(valor);
  return valor && Number.isInteger(n) && n > 0 ? n : padrao;
}
const limiteAssistente = {
  maximo: inteiroPositivo(process.env.ASSISTENTE_LIMITE_REQUISICOES, LIMITE_ASSISTENTE_PADRAO.maximo),
  janelaMs: inteiroPositivo(process.env.ASSISTENTE_LIMITE_JANELA_MS, LIMITE_ASSISTENTE_PADRAO.janelaMs),
};

criarApp({ repo, assistente, limiteAssistente }).listen(porta, () => {
  console.log(`API em http://localhost:${porta}/api`);
  console.log(
    assistente.modo === "llm"
      ? "Assistente: Claude (ANTHROPIC_API_KEY configurada)"
      : "Assistente: MODO DEMONSTRATIVO (sem ANTHROPIC_API_KEY — respostas locais)",
  );
});
