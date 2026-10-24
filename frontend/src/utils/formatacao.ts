import type { SituacaoFinanceira, SituacaoParcela, StatusMatricula } from '../types';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata centavos (inteiro) como moeda BRL. Ex.: 123456 → "R$ 1.234,56". */
export function formatarMoeda(centavos: number): string {
  return moeda.format(centavos / 100);
}

/**
 * Formata "YYYY-MM-DD" como "dd/mm/aaaa" por manipulação de string.
 * Não usa `new Date(str)`: ele interpreta a data como UTC e, no fuso do Brasil,
 * exibiria o dia anterior.
 */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}

/** Formata competência "YYYY-MM" como "mm/aaaa". */
export function formatarCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split('-');
  if (!ano || !mes) return competencia;
  return `${mes}/${ano}`;
}

// Mapeamentos apenas de rótulo/estilo — nenhuma regra de negócio é calculada no front.

export const ROTULO_STATUS_MATRICULA: Record<StatusMatricula, string> = {
  ativa: 'Ativa',
  trancada: 'Trancada',
  cancelada: 'Cancelada',
  formada: 'Formada',
};

export const ROTULO_SITUACAO_FINANCEIRA: Record<SituacaoFinanceira, string> = {
  adimplente: 'Adimplente',
  inadimplente: 'Inadimplente',
};

export const ROTULO_SITUACAO_PARCELA: Record<SituacaoParcela, string> = {
  paga: 'Paga',
  em_aberto: 'Em aberto',
  vencida: 'Vencida',
};
