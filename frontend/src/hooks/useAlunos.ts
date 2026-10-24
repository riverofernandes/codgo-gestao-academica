import { listarAlunos, obterAluno, obterFinanceiro } from '../api/client';
import { useAsync } from './useAsync';
import { useDebounce } from './useDebounce';

/** Lista de alunos com busca no servidor (debounce de 300 ms + cancelamento). */
export function useAlunos(busca: string) {
  const termo = useDebounce(busca.trim(), 300);
  const estado = useAsync((signal) => listarAlunos(termo, signal), [termo]);
  // `pendente` indica que o usuário digitou algo que ainda não foi enviado.
  return { ...estado, termo, pendente: termo !== busca.trim() };
}

export function useAluno(id: number | null) {
  return useAsync(id === null ? null : (signal) => obterAluno(id, signal), [id]);
}

export function useFinanceiro(id: number | null) {
  return useAsync(id === null ? null : (signal) => obterFinanceiro(id, signal), [id]);
}
