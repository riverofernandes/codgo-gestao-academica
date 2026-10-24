import { normalizar } from "../repositories/alunosRepository.js";
import type { ContextoAssistente } from "./contexto.js";
import type { ProvedorAssistente, RespostaAssistente } from "./tipos.js";

/**
 * MODO DEMONSTRATIVO — usado quando não há ANTHROPIC_API_KEY.
 * Não chama nenhum LLM: reconhece algumas intenções por palavras-chave e responde
 * com base nos MESMOS dados/contexto que seriam enviados ao modelo. As respostas
 * são reais (vêm dos dados), mas a "compreensão" da pergunta é limitada.
 */
export class AssistenteDemonstrativo implements ProvedorAssistente {
  readonly modo = "demonstrativo" as const;

  async responder(pergunta: string, ctx: ContextoAssistente): Promise<RespostaAssistente> {
    return { resposta: this.gerar(normalizar(pergunta), ctx), modo: this.modo, modelo: null };
  }

  private gerar(p: string, ctx: ContextoAssistente): string {
    const listar = (nomes: string[]) => nomes.map((n) => `• ${n}`).join("\n");

    if (/resum|selecionad|deste aluno|desse aluno|este aluno|esse aluno/.test(p)) {
      const a = ctx.alunoSelecionado;
      if (!a) return "Nenhum aluno está selecionado. Selecione um aluno na lista e pergunte novamente.";
      const linhas = [
        `${a.nome} (matrícula ${a.matricula}, ${a.curso}) — matrícula ${a.statusMatricula}, situação financeira: ${a.situacaoFinanceira.toUpperCase()}.`,
        `Mensalidade: ${a.mensalidade}. Total pago: ${a.totalPago}. Em aberto: ${a.totalEmAberto}.`,
      ];
      if (a.parcelasVencidas > 0) {
        const vencidas = a.parcelas.filter((x) => x.situacao === "vencida");
        linhas.push(
          `Há ${a.parcelasVencidas} parcela(s) vencida(s), somando ${a.totalVencido}: ${vencidas
            .map((x) => `${x.competencia} (venc. ${x.vencimento}, pago ${x.valorPago} de ${x.valor})`)
            .join("; ")}.`,
        );
      } else {
        linhas.push("Não há parcelas vencidas.");
      }
      if (a.proximoVencimento) linhas.push(`Próximo vencimento: ${a.proximoVencimento}.`);
      if (a.parcelas.length === 0) linhas.push("O aluno não possui parcelas registradas.");
      return linhas.join("\n");
    }

    if (/inadimplent|devendo|em atraso|atrasad|devedor/.test(p)) {
      const lista = ctx.alunos.filter((a) => a.situacaoFinanceira === "inadimplente");
      if (lista.length === 0) return "Nenhum aluno está inadimplente nos dados atuais.";
      return `${lista.length} aluno(s) inadimplente(s) em ${ctx.dataReferencia}:\n${listar(
        lista.map((a) => `${a.nome} (${a.matricula}) — ${a.parcelasVencidas} parcela(s) vencida(s), ${a.totalVencido}`),
      )}`;
    }

    if (/adimplent|em dia/.test(p)) {
      const lista = ctx.alunos.filter((a) => a.situacaoFinanceira === "adimplente");
      return `${lista.length} aluno(s) adimplente(s):\n${listar(lista.map((a) => `${a.nome} (${a.matricula})`))}`;
    }

    const status = (["ativa", "trancada", "cancelada", "formada"] as const).find((s) =>
      new RegExp(`\\b${s.slice(0, -1)}[ao]s?\\b`).test(p),
    );
    if (status) {
      const lista = ctx.alunos.filter((a) => a.statusMatricula === status);
      return `${lista.length} aluno(s) com matrícula ${status}:\n${listar(lista.map((a) => `${a.nome} (${a.matricula})`))}`;
    }

    if (/quantos alunos|total de alunos|quantidade de alunos/.test(p)) {
      return `Há ${ctx.totais.alunos} alunos cadastrados.`;
    }

    return [
      "Modo demonstrativo: não há um LLM configurado, então só reconheço algumas perguntas, como:",
      "• Quais alunos estão inadimplentes?",
      "• Quantos alunos estão com matrícula ativa?",
      "• Resuma a situação financeira do aluno selecionado.",
      "Configure ANTHROPIC_API_KEY no back-end para respostas com IA.",
    ].join("\n");
  }
}
