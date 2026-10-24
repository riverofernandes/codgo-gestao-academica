import { criarApp } from "./app.js";
import { criarAssistente } from "./assistente/index.js";
import { gerarAlunos } from "./data/seed.js";
import { hojeISO } from "./domain/datas.js";
import { AlunosRepository } from "./repositories/alunosRepository.js";

const porta = Number(process.env.PORT ?? 3333);

// As datas do seed são ancoradas no dia em que o servidor sobe; o cálculo usa "hoje" a cada requisição.
const repo = new AlunosRepository(gerarAlunos(hojeISO()), () => hojeISO());
const assistente = criarAssistente();

criarApp({ repo, assistente }).listen(porta, () => {
  console.log(`API em http://localhost:${porta}/api`);
  console.log(
    assistente.modo === "llm"
      ? "Assistente: Claude (ANTHROPIC_API_KEY configurada)"
      : "Assistente: MODO DEMONSTRATIVO (sem ANTHROPIC_API_KEY — respostas locais)",
  );
});
