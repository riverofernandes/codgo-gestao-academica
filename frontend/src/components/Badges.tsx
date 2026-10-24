import type { SituacaoFinanceira, SituacaoParcela, StatusMatricula } from '../types';
import {
  ROTULO_SITUACAO_FINANCEIRA,
  ROTULO_SITUACAO_PARCELA,
  ROTULO_STATUS_MATRICULA,
} from '../utils/formatacao';

// Matrícula e situação financeira são conceitos diferentes: a matrícula usa um
// badge "contornado" e a situação financeira um badge "preenchido", além de um
// prefixo textual que deixa claro o que cada um representa.

export function BadgeMatricula({ status }: { status: StatusMatricula }) {
  return (
    <span className={`badge badge--contorno badge--matricula-${status}`}>
      <span className="visualmente-oculto">Matrícula: </span>
      {ROTULO_STATUS_MATRICULA[status]}
    </span>
  );
}

export function BadgeFinanceiro({ situacao }: { situacao: SituacaoFinanceira }) {
  return (
    <span className={`badge badge--financeiro-${situacao}`}>
      <span className="visualmente-oculto">Situação financeira: </span>
      <span aria-hidden="true">{situacao === 'adimplente' ? '✓ ' : '! '}</span>
      {ROTULO_SITUACAO_FINANCEIRA[situacao]}
    </span>
  );
}

export function BadgeParcela({ situacao }: { situacao: SituacaoParcela }) {
  return (
    <span className={`badge badge--parcela-${situacao}`}>{ROTULO_SITUACAO_PARCELA[situacao]}</span>
  );
}
