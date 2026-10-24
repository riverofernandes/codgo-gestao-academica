import type {
  AlunoDetalhe,
  Envelope,
  EnvelopeErro,
  Financeiro,
  ListaAlunosResposta,
  RespostaAssistente,
} from '../types';

const BASE = '/api';

/** Erro normalizado de qualquer chamada à API (HTTP, rede ou resposta inválida). */
export class ApiError extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly mensagem: string;

  constructor(status: number, codigo: string, mensagem: string) {
    super(mensagem);
    this.name = 'ApiError';
    this.status = status;
    this.codigo = codigo;
    this.mensagem = mensagem;
  }
}

export function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

function ehEnvelopeErro(v: unknown): v is EnvelopeErro {
  if (typeof v !== 'object' || v === null || !('erro' in v)) return false;
  const erro = (v as { erro: unknown }).erro;
  return (
    typeof erro === 'object' &&
    erro !== null &&
    typeof (erro as { mensagem?: unknown }).mensagem === 'string'
  );
}

const MENSAGEM_SERVIDOR_INDISPONIVEL =
  'Não foi possível falar com o servidor. Verifique se a API está em execução e tente novamente.';

async function requisitar<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${caminho}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
  } catch (e) {
    if (isAbortError(e)) throw e;
    throw new ApiError(0, 'REDE', MENSAGEM_SERVIDOR_INDISPONIVEL);
  }

  // Lê como texto primeiro: com a API fora do ar o proxy devolve corpo não-JSON.
  const texto = await res.text();
  let corpo: unknown = null;
  if (texto) {
    try {
      corpo = JSON.parse(texto);
    } catch {
      corpo = null;
    }
  }

  if (!res.ok) {
    if (ehEnvelopeErro(corpo)) {
      throw new ApiError(res.status, corpo.erro.codigo, corpo.erro.mensagem);
    }
    throw new ApiError(
      res.status,
      res.status >= 500 ? 'SERVIDOR_INDISPONIVEL' : 'RESPOSTA_INVALIDA',
      res.status >= 500
        ? MENSAGEM_SERVIDOR_INDISPONIVEL
        : `Erro inesperado (HTTP ${res.status}).`,
    );
  }

  if (corpo === null || typeof corpo !== 'object' || !('dados' in corpo)) {
    throw new ApiError(res.status, 'RESPOSTA_INVALIDA', 'O servidor retornou uma resposta inválida.');
  }
  return corpo as T;
}

export async function listarAlunos(busca: string, signal?: AbortSignal): Promise<ListaAlunosResposta> {
  const termo = busca.trim();
  const qs = termo ? `?busca=${encodeURIComponent(termo)}` : '';
  return requisitar<ListaAlunosResposta>(`/alunos${qs}`, { signal });
}

export async function obterAluno(id: number, signal?: AbortSignal): Promise<AlunoDetalhe> {
  const r = await requisitar<Envelope<AlunoDetalhe>>(`/alunos/${id}`, { signal });
  return r.dados;
}

export async function obterFinanceiro(id: number, signal?: AbortSignal): Promise<Financeiro> {
  const r = await requisitar<Envelope<Financeiro>>(`/alunos/${id}/financeiro`, { signal });
  return r.dados;
}

export async function perguntarAssistente(
  pergunta: string,
  alunoId: number | null,
  signal?: AbortSignal,
): Promise<RespostaAssistente> {
  const body: { pergunta: string; alunoId?: number } = { pergunta: pergunta.trim() };
  if (alunoId !== null) body.alunoId = alunoId;
  const r = await requisitar<Envelope<RespostaAssistente>>('/assistente', {
    method: 'POST',
    body: JSON.stringify(body),
    signal,
  });
  return r.dados;
}

/** Mensagem amigável para exibir ao usuário a partir de qualquer erro. */
export function mensagemDeErro(e: unknown): string {
  if (e instanceof ApiError) return e.mensagem;
  return 'Ocorreu um erro inesperado. Tente novamente.';
}
