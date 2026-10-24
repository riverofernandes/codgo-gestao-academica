import { useRef, useState } from 'react';
import { Assistente } from './components/Assistente';
import { BuscaAlunos } from './components/BuscaAlunos';
import { DetalheAluno } from './components/DetalheAluno';
import { Vazio } from './components/Estado';
import { ListaAlunos } from './components/ListaAlunos';
import { PainelFinanceiro } from './components/PainelFinanceiro';
import { useAlunos } from './hooks/useAlunos';
import type { AlunoResumo } from './types';

export function App() {
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState<AlunoResumo | null>(null);
  const alunos = useAlunos(busca);
  const detalheRef = useRef<HTMLDivElement>(null);

  function selecionar(aluno: AlunoResumo) {
    setSelecionado(aluno);
    // Em telas estreitas a coluna de detalhes fica abaixo da lista: leva o usuário até ela.
    if (window.matchMedia?.('(max-width: 899px)').matches) {
      requestAnimationFrame(() => detalheRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

  return (
    <>
      <a href="#conteudo" className="pular-link">
        Pular para o conteúdo
      </a>
      <header className="topo">
        <div className="topo__conteudo">
          <h1 className="topo__titulo">Gestão Acadêmica</h1>
          <p className="topo__subtitulo">Alunos, situação financeira e assistente de IA</p>
        </div>
      </header>

      <main id="conteudo" className="layout">
        <aside className="layout__lista cartao" aria-labelledby="titulo-alunos">
          <h2 id="titulo-alunos" className="cartao__titulo">
            Alunos
          </h2>
          <BuscaAlunos valor={busca} onChange={setBusca} />
          <ListaAlunos
            estado={alunos}
            termo={alunos.termo}
            pendente={alunos.pendente}
            selecionadoId={selecionado?.id ?? null}
            onSelecionar={selecionar}
          />
        </aside>

        <div className="layout__detalhe" ref={detalheRef}>
          {selecionado ? (
            <>
              <DetalheAluno alunoId={selecionado.id} />
              <PainelFinanceiro alunoId={selecionado.id} />
            </>
          ) : (
            <section className="cartao" aria-label="Detalhes do aluno">
              <Vazio titulo="Nenhum aluno selecionado.">
                Escolha um aluno na lista para ver os dados cadastrais e a situação financeira.
              </Vazio>
            </section>
          )}
          <Assistente alunoSelecionado={selecionado} />
        </div>
      </main>
    </>
  );
}
