import type { AlunosRepository } from "../repositories/alunosRepository.js";
import type { DataISO } from "../domain/datas.js";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatarCentavos = (c: number) => brl.format(c / 100);
export const formatarData = (d: DataISO | null) => (d ? d.split("-").reverse().join("/") : null);
/** "2026-08" → "08/2026" */
export const formatarCompetencia = (c: string) => c.split("-").reverse().join("/");

/**
 * Contexto MÍNIMO enviado ao modelo. Princípios:
 *  - nada de e-mail, data de ingresso, ids internos ou campos legados;
 *  - fatos agregados (contagens, listas) já calculados no servidor, para o modelo
 *    não precisar fazer contas nem "adivinhar";
 *  - parcelas detalhadas só do aluno selecionado (quando houver).
 */
export interface ContextoAssistente {
  dataReferencia: string;
  totais: {
    alunos: number;
    porStatusMatricula: Record<string, number>;
    porSituacaoFinanceira: Record<string, number>;
  };
  alunos: Array<{
    nome: string;
    matricula: string;
    curso: string;
    statusMatricula: string;
    situacaoFinanceira: string;
    parcelasVencidas: number;
    totalVencido: string;
  }>;
  alunoSelecionado: null | {
    nome: string;
    matricula: string;
    curso: string;
    statusMatricula: string;
    situacaoFinanceira: string;
    mensalidade: string;
    totalPago: string;
    totalEmAberto: string;
    totalVencido: string;
    parcelasVencidas: number;
    proximoVencimento: string | null;
    parcelas: Array<{
      competencia: string;
      vencimento: string | null;
      valor: string;
      valorPago: string;
      pagoEm: string | null;
      situacao: string;
    }>;
  };
}

function contar<T extends string>(valores: T[]): Record<string, number> {
  return valores.reduce<Record<string, number>>((acc, v) => ({ ...acc, [v]: (acc[v] ?? 0) + 1 }), {});
}

export function montarContexto(repo: AlunosRepository, alunoId?: number | null): ContextoAssistente {
  const lista = repo.listar();
  const alunos = lista.map((a) => {
    const f = repo.financeiro(a.id)!;
    return {
      nome: a.nome,
      matricula: a.matricula,
      curso: a.curso,
      statusMatricula: a.status,
      situacaoFinanceira: a.situacaoFinanceira,
      parcelasVencidas: f.resumo.parcelasVencidas,
      totalVencido: formatarCentavos(f.resumo.totalVencidoCentavos),
    };
  });

  let alunoSelecionado: ContextoAssistente["alunoSelecionado"] = null;
  if (alunoId != null) {
    const a = repo.buscarPorId(alunoId);
    const f = repo.financeiro(alunoId);
    if (a && f) {
      alunoSelecionado = {
        nome: a.nome,
        matricula: a.matricula,
        curso: a.curso,
        statusMatricula: a.status,
        situacaoFinanceira: f.situacao,
        mensalidade: formatarCentavos(f.mensalidadeCentavos),
        totalPago: formatarCentavos(f.resumo.totalPagoCentavos),
        totalEmAberto: formatarCentavos(f.resumo.totalEmAbertoCentavos),
        totalVencido: formatarCentavos(f.resumo.totalVencidoCentavos),
        parcelasVencidas: f.resumo.parcelasVencidas,
        proximoVencimento: formatarData(f.resumo.proximoVencimento),
        parcelas: f.parcelas.map((p) => ({
          competencia: formatarCompetencia(p.competencia),
          vencimento: formatarData(p.vencimento),
          valor: formatarCentavos(p.valorCentavos),
          valorPago: formatarCentavos(p.valorPagoCentavos),
          pagoEm: formatarData(p.pagoEm),
          situacao: p.situacao,
        })),
      };
    }
  }

  return {
    dataReferencia: formatarData(repo.dataReferencia())!,
    totais: {
      alunos: lista.length,
      porStatusMatricula: contar(lista.map((a) => a.status)),
      porSituacaoFinanceira: contar(lista.map((a) => a.situacaoFinanceira)),
    },
    alunos,
    alunoSelecionado,
  };
}
