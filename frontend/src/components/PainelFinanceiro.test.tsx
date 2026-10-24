import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { PainelFinanceiro } from './PainelFinanceiro';
import type { Financeiro } from '../types';

const financeiro: Financeiro = {
  alunoId: 7,
  // O back-end diz "inadimplente": o front deve exibir exatamente isso.
  situacao: 'inadimplente',
  mensalidadeCentavos: 89000,
  resumo: {
    totalPagoCentavos: 89000,
    totalEmAbertoCentavos: 178000,
    totalVencidoCentavos: 89000,
    parcelasVencidas: 1,
    proximoVencimento: '2026-11-10',
  },
  parcelas: [
    {
      id: '7-2026-08',
      competencia: '2026-08',
      vencimento: '2026-08-10',
      valorCentavos: 89000,
      valorPagoCentavos: 89000,
      pagoEm: '2026-08-09',
      situacao: 'paga',
    },
    {
      id: '7-2026-09',
      competencia: '2026-09',
      vencimento: '2026-09-10',
      valorCentavos: 89000,
      valorPagoCentavos: 0,
      pagoEm: null,
      situacao: 'vencida',
    },
  ],
  calculadoEm: '2026-10-24',
};

describe('PainelFinanceiro', () => {
  it('exibe a situação e as parcelas calculadas pelo back-end', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ dados: financeiro }), { status: 200 })),
    );

    render(<PainelFinanceiro alunoId={7} />);

    expect(await screen.findByText('Inadimplente')).toBeTruthy();
    expect(screen.getByText('10/11/2026')).toBeTruthy();
    const tabela = screen.getByRole('table');
    expect(within(tabela).getByText('Vencida')).toBeTruthy();
    expect(within(tabela).getByText('Paga')).toBeTruthy();
  });

  it('mostra erro com "Tentar novamente" quando a API falha', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>proxy error</html>', { status: 500 })),
    );

    render(<PainelFinanceiro alunoId={7} />);

    const alerta = await screen.findByRole('alert');
    expect(alerta.textContent).toContain('Não foi possível falar com o servidor');
    expect(within(alerta).getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();
  });
});
