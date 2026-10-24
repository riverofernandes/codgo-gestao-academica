import { useFinanceiro } from '../hooks/useAlunos';
import type { Financeiro } from '../types';
import { formatarCompetencia, formatarData, formatarMoeda } from '../utils/formatacao';
import { BadgeFinanceiro, BadgeParcela } from './Badges';
import { Carregando, Erro, Vazio } from './Estado';

// Importante: este painel apenas EXIBE o que o back-end calculou
// (`situacao`, `resumo`, `parcela.situacao`). Não há regra de status aqui.

export function PainelFinanceiro({ alunoId }: { alunoId: number }) {
  const estado = useFinanceiro(alunoId);
  const fin = estado.status === 'sucesso' && estado.dados.alunoId === alunoId ? estado.dados : null;

  return (
    <section
      className="cartao"
      aria-labelledby="titulo-financeiro"
      aria-busy={!fin && estado.status !== 'erro'}
    >
      <div className="cartao__cabecalho">
        <h2 id="titulo-financeiro" className="cartao__titulo">
          Situação financeira
        </h2>
        {fin && <BadgeFinanceiro situacao={fin.situacao} />}
      </div>

      {estado.status === 'erro' ? (
        <Erro
          erro={estado.erro}
          titulo="Não foi possível carregar a situação financeira."
          onTentarNovamente={estado.recarregar}
        />
      ) : !fin ? (
        <Carregando texto="Carregando situação financeira…" />
      ) : (
        <ConteudoFinanceiro fin={fin} />
      )}
    </section>
  );
}

function ConteudoFinanceiro({ fin }: { fin: Financeiro }) {
  const { resumo } = fin;
  return (
    <>
      <p className="dica">
        Mensalidade: <strong>{formatarMoeda(fin.mensalidadeCentavos)}</strong> · Situação calculada em{' '}
        {formatarData(fin.calculadoEm)}
      </p>

      <ul className="resumo" aria-label="Resumo financeiro">
        <li className="resumo__card">
          <span className="resumo__rotulo">Total pago</span>
          <span className="resumo__valor">{formatarMoeda(resumo.totalPagoCentavos)}</span>
        </li>
        <li className="resumo__card">
          <span className="resumo__rotulo">Em aberto</span>
          <span className="resumo__valor">{formatarMoeda(resumo.totalEmAbertoCentavos)}</span>
          <span className="resumo__nota">inclui vencido + a vencer</span>
        </li>
        <li className={`resumo__card${resumo.totalVencidoCentavos > 0 ? ' resumo__card--alerta' : ''}`}>
          <span className="resumo__rotulo">Vencido</span>
          <span className="resumo__valor">{formatarMoeda(resumo.totalVencidoCentavos)}</span>
          <span className="resumo__nota">
            {resumo.parcelasVencidas === 1 ? '1 parcela' : `${resumo.parcelasVencidas} parcelas`}
          </span>
        </li>
        <li className="resumo__card">
          <span className="resumo__rotulo">Próximo vencimento</span>
          <span className="resumo__valor">{formatarData(resumo.proximoVencimento)}</span>
        </li>
      </ul>

      <h3 className="subtitulo">Parcelas</h3>
      {fin.parcelas.length === 0 ? (
        <Vazio titulo="Nenhuma parcela registrada." />
      ) : (
        <div className="tabela-rolagem" tabIndex={0} role="region" aria-label="Tabela de parcelas">
          <table className="tabela">
            <thead>
              <tr>
                <th scope="col">Competência</th>
                <th scope="col">Vencimento</th>
                <th scope="col" className="num">
                  Valor
                </th>
                <th scope="col" className="num">
                  Pago
                </th>
                <th scope="col">Pago em</th>
                <th scope="col">Situação</th>
              </tr>
            </thead>
            <tbody>
              {fin.parcelas.map((p) => (
                <tr key={p.id} className={`linha--${p.situacao}`}>
                  <td>{formatarCompetencia(p.competencia)}</td>
                  <td>{formatarData(p.vencimento)}</td>
                  <td className="num">{formatarMoeda(p.valorCentavos)}</td>
                  <td className="num">{formatarMoeda(p.valorPagoCentavos)}</td>
                  <td>{formatarData(p.pagoEm)}</td>
                  <td>
                    <BadgeParcela situacao={p.situacao} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
