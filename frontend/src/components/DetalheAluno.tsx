import { useAluno } from '../hooks/useAlunos';
import { formatarData } from '../utils/formatacao';
import { BadgeFinanceiro, BadgeMatricula } from './Badges';
import { Carregando, Erro } from './Estado';

export function DetalheAluno({ alunoId }: { alunoId: number }) {
  const estado = useAluno(alunoId);

  // Ignora dados de um aluno anterior enquanto a nova requisição não começou.
  const aluno = estado.status === 'sucesso' && estado.dados.id === alunoId ? estado.dados : null;

  return (
    <section className="cartao" aria-labelledby="titulo-detalhe" aria-busy={!aluno && estado.status !== 'erro'}>
      <h2 id="titulo-detalhe" className="cartao__titulo">
        Dados do aluno
      </h2>

      {estado.status === 'erro' ? (
        <Erro
          erro={estado.erro}
          titulo="Não foi possível carregar os dados do aluno."
          onTentarNovamente={estado.recarregar}
        />
      ) : !aluno ? (
        <Carregando texto="Carregando dados do aluno…" />
      ) : (
        <>
          <div className="detalhe__cabecalho">
            <p className="detalhe__nome">{aluno.nome}</p>
            <div className="detalhe__badges">
              <BadgeMatricula status={aluno.status} />
              <BadgeFinanceiro situacao={aluno.situacaoFinanceira} />
            </div>
          </div>
          <dl className="detalhe__dados">
            <div>
              <dt>Matrícula</dt>
              <dd>{aluno.matricula}</dd>
            </div>
            <div>
              <dt>Curso</dt>
              <dd>{aluno.curso}</dd>
            </div>
            <div>
              <dt>Período</dt>
              <dd>{aluno.periodo}º semestre</dd>
            </div>
            <div>
              <dt>Ingresso</dt>
              <dd>{formatarData(aluno.dataIngresso)}</dd>
            </div>
            <div className="detalhe__email">
              <dt>E-mail</dt>
              <dd>{aluno.email}</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
