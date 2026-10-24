// Espelha docs/API.md. Valores monetários em centavos; datas como "YYYY-MM-DD".

export type StatusMatricula = 'ativa' | 'trancada' | 'cancelada' | 'formada';
export type SituacaoFinanceira = 'adimplente' | 'inadimplente';
export type SituacaoParcela = 'paga' | 'em_aberto' | 'vencida';

export interface AlunoResumo {
  id: number;
  nome: string;
  matricula: string;
  curso: string;
  status: StatusMatricula;
  /** Sempre calculada no back-end — o front apenas exibe. */
  situacaoFinanceira: SituacaoFinanceira;
}

export interface AlunoDetalhe extends AlunoResumo {
  email: string;
  dataIngresso: string;
  periodo: number;
}

export interface Parcela {
  id: string;
  /** "YYYY-MM" */
  competencia: string;
  vencimento: string;
  valorCentavos: number;
  valorPagoCentavos: number;
  pagoEm: string | null;
  situacao: SituacaoParcela;
}

export interface Financeiro {
  alunoId: number;
  situacao: SituacaoFinanceira;
  mensalidadeCentavos: number;
  resumo: {
    totalPagoCentavos: number;
    /** Tudo que falta pagar (vencido + a vencer). */
    totalEmAbertoCentavos: number;
    /** Só o que já venceu e não foi quitado. */
    totalVencidoCentavos: number;
    parcelasVencidas: number;
    proximoVencimento: string | null;
  };
  parcelas: Parcela[];
  calculadoEm: string;
}

export type ModoAssistente = 'llm' | 'demonstrativo';

export interface RespostaAssistente {
  resposta: string;
  modo: ModoAssistente;
  modelo: string | null;
  alunoId: number | null;
}

export interface ListaAlunosResposta {
  dados: AlunoResumo[];
  total: number;
}

export interface Envelope<T> {
  dados: T;
}

export interface EnvelopeErro {
  erro: { codigo: string; mensagem: string };
}
