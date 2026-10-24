import type { ReactNode } from 'react';
import { mensagemDeErro } from '../api/client';

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="estado estado--carregando" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}

export function Vazio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="estado estado--vazio" role="status">
      <p className="estado__titulo">{titulo}</p>
      {children && <p className="estado__texto">{children}</p>}
    </div>
  );
}

export function Erro({
  erro,
  titulo = 'Não foi possível carregar os dados.',
  onTentarNovamente,
}: {
  erro: unknown;
  titulo?: string;
  onTentarNovamente?: () => void;
}) {
  return (
    <div className="estado estado--erro" role="alert">
      <p className="estado__titulo">{titulo}</p>
      <p className="estado__texto">{mensagemDeErro(erro)}</p>
      {onTentarNovamente && (
        <button type="button" className="botao botao--secundario" onClick={onTentarNovamente}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
