import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ApiError, isAbortError, mensagemDeErro, perguntarAssistente } from '../api/client';
import type { AlunoResumo, RespostaAssistente } from '../types';

export const LIMITE_PERGUNTA = 500;

const EXEMPLOS = [
  { texto: 'Quais alunos estão inadimplentes?', precisaAluno: false },
  { texto: 'Quantos alunos estão com matrícula ativa?', precisaAluno: false },
  { texto: 'Resuma a situação financeira do aluno selecionado.', precisaAluno: true },
] as const;

type Item =
  | { id: number; pergunta: string; alunoNome: string | null; status: 'enviando' }
  | { id: number; pergunta: string; alunoNome: string | null; status: 'sucesso'; resposta: RespostaAssistente }
  | { id: number; pergunta: string; alunoNome: string | null; status: 'erro'; erro: unknown };

const TITULO_ERRO: Record<string, string> = {
  IA_INDISPONIVEL: 'Assistente indisponível no momento.',
  IA_TIMEOUT: 'O assistente demorou demais para responder.',
  IA_RECUSOU: 'O assistente não conseguiu responder.',
  LIMITE_EXCEDIDO: 'Limite de perguntas atingido.',
  VALIDACAO: 'Pergunta inválida.',
  ALUNO_NAO_ENCONTRADO: 'Aluno não encontrado.',
};

function tituloErro(e: unknown): string {
  if (e instanceof ApiError && TITULO_ERRO[e.codigo]) return TITULO_ERRO[e.codigo]!;
  return 'Não foi possível obter a resposta.';
}

export function BadgeModo({ resposta }: { resposta: RespostaAssistente }) {
  if (resposta.modo === 'llm') {
    return (
      <span className="badge badge--modo-llm" title={resposta.modelo ?? undefined}>
        IA (Claude){resposta.modelo ? ` · ${resposta.modelo}` : ''}
      </span>
    );
  }
  return <span className="badge badge--modo-demo">Modo demonstrativo — respostas locais</span>;
}

interface Props {
  alunoSelecionado: Pick<AlunoResumo, 'id' | 'nome' | 'matricula'> | null;
}

export function Assistente({ alunoSelecionado }: Props) {
  const [pergunta, setPergunta] = useState('');
  const [historico, setHistorico] = useState<Item[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const controleRef = useRef<AbortController | null>(null);
  const proximoId = useRef(1);
  const idBase = useId();

  const enviando = historico.some((i) => i.status === 'enviando');
  const vazia = pergunta.trim().length === 0;

  useEffect(() => () => controleRef.current?.abort(), []);

  async function enviar(texto: string) {
    const limpa = texto.trim();
    // Ref evita envio duplo em cliques rápidos (antes do re-render atualizar `enviando`).
    if (!limpa || controleRef.current) return;

    const id = proximoId.current++;
    const alunoId = alunoSelecionado?.id ?? null;
    const alunoNome = alunoSelecionado?.nome ?? null;
    setHistorico((h) => [{ id, pergunta: limpa, alunoNome, status: 'enviando' }, ...h]);
    setPergunta('');

    const controle = new AbortController();
    controleRef.current = controle;
    try {
      const resposta = await perguntarAssistente(limpa, alunoId, controle.signal);
      setHistorico((h) =>
        h.map((i) => (i.id === id ? { id, pergunta: limpa, alunoNome, status: 'sucesso', resposta } : i)),
      );
    } catch (erro) {
      if (isAbortError(erro)) return;
      setHistorico((h) =>
        h.map((i) => (i.id === id ? { id, pergunta: limpa, alunoNome, status: 'erro', erro } : i)),
      );
    } finally {
      if (controleRef.current === controle) controleRef.current = null;
    }
  }

  function aoSubmeter(e: FormEvent) {
    e.preventDefault();
    void enviar(pergunta);
  }

  const idCampo = `${idBase}-pergunta`;
  const idContador = `${idBase}-contador`;
  const idContexto = `${idBase}-contexto`;

  return (
    <section className="cartao assistente" aria-labelledby="titulo-assistente">
      <h2 id="titulo-assistente" className="cartao__titulo">
        Assistente de IA
      </h2>

      <form onSubmit={aoSubmeter} className="assistente__form">
        <label htmlFor={idCampo} className="rotulo">
          Sua pergunta
        </label>
        <textarea
          id={idCampo}
          ref={textareaRef}
          className="campo campo--area"
          rows={3}
          maxLength={LIMITE_PERGUNTA}
          value={pergunta}
          placeholder="Ex.: Quais alunos estão inadimplentes?"
          aria-describedby={`${idContador} ${idContexto}`}
          onChange={(e) => setPergunta(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void enviar(pergunta);
            }
          }}
        />
        <div className="assistente__barra">
          <span
            id={idContador}
            className={`contador${pergunta.length >= LIMITE_PERGUNTA ? ' contador--limite' : ''}`}
          >
            {pergunta.length}/{LIMITE_PERGUNTA} caracteres
          </span>
          <button type="submit" className="botao" disabled={vazia || enviando}>
            {enviando ? 'Enviando…' : 'Enviar pergunta'}
          </button>
        </div>
        <p id={idContexto} className="dica">
          {alunoSelecionado ? (
            <>
              Contexto: aluno selecionado <strong>{alunoSelecionado.nome}</strong> (mat.{' '}
              {alunoSelecionado.matricula}).
            </>
          ) : (
            'Nenhum aluno selecionado — perguntas sobre "o aluno selecionado" exigem selecionar alguém na lista.'
          )}{' '}
          Atalho: Ctrl/⌘ + Enter envia.
        </p>
      </form>

      <div className="exemplos" role="group" aria-label="Perguntas de exemplo">
        {EXEMPLOS.map((ex) => {
          const bloqueado = ex.precisaAluno && !alunoSelecionado;
          return (
            <button
              key={ex.texto}
              type="button"
              className="chip"
              disabled={enviando || bloqueado}
              title={bloqueado ? 'Selecione um aluno na lista para usar esta pergunta' : undefined}
              onClick={() => void enviar(ex.texto)}
            >
              {ex.texto}
              {bloqueado && <span className="chip__nota"> (selecione um aluno)</span>}
            </button>
          );
        })}
      </div>

      <div className="historico" aria-live="polite" aria-relevant="additions text">
        {historico.length === 0 ? (
          <p className="dica">As respostas desta sessão aparecerão aqui.</p>
        ) : (
          <ol className="historico__lista" aria-label="Histórico de perguntas">
            {historico.map((item) => (
              <li key={item.id} className="troca" aria-busy={item.status === 'enviando'}>
                <p className="troca__pergunta">
                  <span className="troca__autor">Você</span>
                  {item.pergunta}
                  {item.alunoNome && <span className="troca__contexto"> · sobre {item.alunoNome}</span>}
                </p>
                {item.status === 'enviando' && (
                  <p className="troca__resposta troca__resposta--carregando" role="status">
                    <span className="spinner" aria-hidden="true" /> Pensando…
                  </p>
                )}
                {item.status === 'sucesso' && (
                  <div className="troca__resposta">
                    <BadgeModo resposta={item.resposta} />
                    {/* Texto puro (sem HTML) — saída de LLM nunca é injetada como markup. */}
                    <p className="troca__texto">{item.resposta.resposta}</p>
                  </div>
                )}
                {item.status === 'erro' && (
                  <div className="troca__resposta troca__resposta--erro" role="alert">
                    <p className="estado__titulo">{tituloErro(item.erro)}</p>
                    <p>{mensagemDeErro(item.erro)}</p>
                    <button
                      type="button"
                      className="botao botao--secundario"
                      disabled={enviando}
                      onClick={() => {
                        setPergunta(item.pergunta);
                        textareaRef.current?.focus();
                      }}
                    >
                      Editar e reenviar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
