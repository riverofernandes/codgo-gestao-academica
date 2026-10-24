import { useCallback, useEffect, useState, type DependencyList } from 'react';
import { isAbortError } from '../api/client';

export type EstadoAsync<T> =
  | { status: 'ocioso' }
  /** `anteriores`: último resultado com sucesso, útil para evitar "piscar" a lista. */
  | { status: 'carregando'; anteriores?: T }
  | { status: 'sucesso'; dados: T }
  | { status: 'erro'; erro: unknown };

/**
 * Executa `fn` sempre que `deps` mudar, cancelando (AbortController) a execução
 * anterior — assim uma resposta lenta e obsoleta nunca sobrescreve a atual.
 * Se `fn` for `null`, o estado fica "ocioso" (ex.: nenhum aluno selecionado).
 */
export function useAsync<T>(
  fn: ((signal: AbortSignal) => Promise<T>) | null,
  deps: DependencyList,
): EstadoAsync<T> & { recarregar: () => void } {
  const [estado, setEstado] = useState<EstadoAsync<T>>(
    fn ? { status: 'carregando' } : { status: 'ocioso' },
  );
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!fn) {
      setEstado({ status: 'ocioso' });
      return;
    }
    const controle = new AbortController();
    setEstado((atual) => ({
      status: 'carregando',
      anteriores:
        atual.status === 'sucesso'
          ? atual.dados
          : atual.status === 'carregando'
            ? atual.anteriores
            : undefined,
    }));
    fn(controle.signal).then(
      (dados) => {
        if (!controle.signal.aborted) setEstado({ status: 'sucesso', dados });
      },
      (erro: unknown) => {
        if (controle.signal.aborted || isAbortError(erro)) return;
        setEstado({ status: 'erro', erro });
      },
    );
    return () => controle.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tentativa]);

  const recarregar = useCallback(() => setTentativa((n) => n + 1), []);
  return { ...estado, recarregar };
}
