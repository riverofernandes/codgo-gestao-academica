import { type DataISO, ehDataISO } from "./datas.js";

export type SituacaoFinanceira = "adimplente" | "inadimplente";
export type SituacaoParcela = "paga" | "em_aberto" | "vencida";

/** Parcela como está registrada (fonte de verdade: vencimento + pagamento). */
export interface ParcelaRegistrada {
  id: string;
  competencia: string;
  vencimento: DataISO;
  valorCentavos: number;
  valorPagoCentavos: number;
  pagoEm: DataISO | null;
}

export interface ParcelaCalculada extends ParcelaRegistrada {
  situacao: SituacaoParcela;
}

export interface ResultadoFinanceiro {
  situacao: SituacaoFinanceira;
  parcelas: ParcelaCalculada[];
  resumo: {
    totalPagoCentavos: number;
    totalEmAbertoCentavos: number;
    totalVencidoCentavos: number;
    parcelasVencidas: number;
    proximoVencimento: DataISO | null;
  };
  calculadoEm: DataISO;
}

/**
 * Uma parcela só está quitada quando o valor pago cobre o valor devido.
 * Pagamento parcial NÃO quita a parcela.
 */
export function parcelaQuitada(p: ParcelaRegistrada): boolean {
  return p.valorPagoCentavos >= p.valorCentavos;
}

/**
 * Regras:
 *  - paga:      valor pago >= valor devido (independe de ter sido paga com atraso);
 *  - vencida:   não quitada e vencimento < hoje (vencer HOJE ainda não é atraso);
 *  - em_aberto: não quitada e vencimento >= hoje.
 */
export function calcularSituacaoParcela(p: ParcelaRegistrada, hoje: DataISO): SituacaoParcela {
  if (parcelaQuitada(p)) return "paga";
  return p.vencimento < hoje ? "vencida" : "em_aberto";
}

/**
 * Fonte única da situação financeira do aluno.
 *
 * O aluno é INADIMPLENTE se existir QUALQUER parcela vencida e não quitada —
 * não importa se a parcela mais recente foi paga, se há algum pagamento
 * registrado ou o que diga um campo de status armazenado.
 *
 * Função pura: `hoje` é injetado para tornar o cálculo determinístico e testável.
 */
export function calcularSituacaoFinanceira(
  parcelas: readonly ParcelaRegistrada[],
  hoje: DataISO,
): ResultadoFinanceiro {
  if (!ehDataISO(hoje)) throw new Error(`Data de referência inválida: ${String(hoje)}`);

  const calculadas: ParcelaCalculada[] = [...parcelas]
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .map((p) => ({ ...p, situacao: calcularSituacaoParcela(p, hoje) }));

  let totalPago = 0;
  let totalEmAberto = 0;
  let totalVencido = 0;
  let parcelasVencidas = 0;
  let proximoVencimento: DataISO | null = null;

  for (const p of calculadas) {
    const pago = Math.min(p.valorPagoCentavos, p.valorCentavos);
    const restante = p.valorCentavos - pago;
    totalPago += p.valorPagoCentavos;
    totalEmAberto += restante;
    if (p.situacao === "vencida") {
      totalVencido += restante;
      parcelasVencidas += 1;
    }
    if (p.situacao === "em_aberto" && proximoVencimento === null) {
      proximoVencimento = p.vencimento;
    }
  }

  return {
    situacao: parcelasVencidas > 0 ? "inadimplente" : "adimplente",
    parcelas: calculadas,
    resumo: {
      totalPagoCentavos: totalPago,
      totalEmAbertoCentavos: totalEmAberto,
      totalVencidoCentavos: totalVencido,
      parcelasVencidas,
      proximoVencimento,
    },
    calculadoEm: hoje,
  };
}
