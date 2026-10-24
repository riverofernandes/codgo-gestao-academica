import type { AlunoResumo } from '../types';
import type { EstadoAsync } from '../hooks/useAsync';
import type { ListaAlunosResposta } from '../types';
import { BadgeFinanceiro, BadgeMatricula } from './Badges';
import { Carregando, Erro, Vazio } from './Estado';

interface Props {
  estado: EstadoAsync<ListaAlunosResposta> & { recarregar: () => void };
  termo: string;
  pendente: boolean;
  selecionadoId: number | null;
  onSelecionar: (aluno: AlunoResumo) => void;
}

export function ListaAlunos({ estado, termo, pendente, selecionadoId, onSelecionar }: Props) {
  if (estado.status === 'erro') {
    return (
      <Erro
        erro={estado.erro}
        titulo="Não foi possível carregar a lista de alunos."
        onTentarNovamente={estado.recarregar}
      />
    );
  }

  const resultado =
    estado.status === 'sucesso'
      ? estado.dados
      : estado.status === 'carregando'
        ? estado.anteriores
        : undefined;
  const carregando = estado.status === 'carregando' || pendente;

  if (!resultado) {
    return <Carregando texto="Carregando alunos…" />;
  }

  return (
    <div className="lista" aria-busy={carregando}>
      <p className="lista__contagem" role="status" aria-live="polite">
        {carregando
          ? 'Buscando…'
          : termo
            ? `${resultado.total} resultado(s) para “${termo}”`
            : `${resultado.total} aluno(s)`}
      </p>

      {resultado.dados.length === 0 ? (
        <Vazio titulo="Nenhum aluno encontrado.">
          {termo ? 'Confira a grafia ou tente buscar pela matrícula.' : 'Não há alunos cadastrados.'}
        </Vazio>
      ) : (
        <ul className={`lista__itens${carregando ? ' lista__itens--atualizando' : ''}`}>
          {resultado.dados.map((aluno) => {
            const selecionado = aluno.id === selecionadoId;
            return (
              <li key={aluno.id}>
                <button
                  type="button"
                  className={`aluno-item${selecionado ? ' aluno-item--selecionado' : ''}`}
                  aria-pressed={selecionado}
                  onClick={() => onSelecionar(aluno)}
                >
                  <span className="aluno-item__topo">
                    <span className="aluno-item__nome">{aluno.nome}</span>
                    <span className="aluno-item__matricula">Mat. {aluno.matricula}</span>
                  </span>
                  <span className="aluno-item__curso">{aluno.curso}</span>
                  <span className="aluno-item__badges">
                    <BadgeMatricula status={aluno.status} />
                    <BadgeFinanceiro situacao={aluno.situacaoFinanceira} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
