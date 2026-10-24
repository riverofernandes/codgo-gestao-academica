import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Assistente } from './Assistente';

function respostaJson(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Assistente', () => {
  it('mostra a mensagem amigável do back-end quando a IA está indisponível (503)', async () => {
    const fetchMock = vi.fn(async () =>
      respostaJson(
        { erro: { codigo: 'IA_INDISPONIVEL', mensagem: 'O assistente de IA está indisponível.' } },
        503,
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<Assistente alunoSelecionado={null} />);
    fireEvent.change(screen.getByLabelText('Sua pergunta'), {
      target: { value: 'Quais alunos estão inadimplentes?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pergunta' }));

    const alerta = await screen.findByRole('alert');
    expect(alerta.textContent).toContain('Assistente indisponível no momento.');
    expect(alerta.textContent).toContain('O assistente de IA está indisponível.');
  });

  it('envia o alunoId selecionado e exibe o badge do modo demonstrativo', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      respostaJson({
        dados: { resposta: 'Aluno adimplente.', modo: 'demonstrativo', modelo: null, alunoId: 3 },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<Assistente alunoSelecionado={{ id: 3, nome: 'Ana Souza', matricula: '2024003' }} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Resuma a situação financeira do aluno selecionado.' }),
    );

    expect(await screen.findByText('Aluno adimplente.')).toBeTruthy();
    expect(screen.getByText('Modo demonstrativo — respostas locais')).toBeTruthy();

    const init = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(String(init?.body))).toEqual({
      pergunta: 'Resuma a situação financeira do aluno selecionado.',
      alunoId: 3,
    });
  });

  it('desabilita o envio com pergunta vazia e o exemplo que exige aluno', () => {
    render(<Assistente alunoSelecionado={null} />);
    expect((screen.getByRole('button', { name: 'Enviar pergunta' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    const chip = screen.getByRole('button', { name: /aluno selecionado/ }) as HTMLButtonElement;
    expect(chip.disabled).toBe(true);
  });
});
