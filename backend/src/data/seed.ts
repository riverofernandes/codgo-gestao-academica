/**
 * Dados 100% FICTÍCIOS. Nenhum nome, e-mail ou matrícula corresponde a pessoa real.
 *
 * As datas das parcelas são RELATIVAS à data de referência (deslocamento em dias),
 * resolvidas no carregamento. Assim a demonstração se comporta igual em qualquer dia
 * em que for executada (datas fixas fariam todo mundo virar inadimplente com o tempo).
 */
import { type DataISO, somarDias, somarMeses } from "../domain/datas.js";
import type { ParcelaRegistrada } from "../domain/financeiro.js";

export type StatusMatricula = "ativa" | "trancada" | "cancelada" | "formada";

export interface AlunoRegistro {
  id: number;
  nome: string;
  matricula: string;
  curso: string;
  status: StatusMatricula;
  email: string;
  dataIngresso: DataISO;
  periodo: number;
  mensalidadeCentavos: number;
  parcelas: ParcelaRegistrada[];
  /**
   * Campo herdado do sistema antigo, gravado uma única vez e nunca atualizado.
   * Era a origem do bug "aluno com mensalidade em aberto aparece como adimplente".
   * Mantido apenas para documentar o problema — NÃO é usado por nenhuma regra nem exposto pela API.
   */
  situacaoFinanceiraLegada?: "adimplente" | "inadimplente";
}

/**
 * Padrão de pagamento por parcela:
 *  P = paga em dia · L = paga com atraso · X = pagamento parcial (50%) · A = em aberto
 */
type Padrao = "P" | "L" | "X" | "A";

/**
 * Uma parcela por mês, de 3 meses atrás até 1 mês à frente. A âncora fica 5 dias antes da
 * referência, então a parcela do "mês 0" está sempre vencida e a do mês seguinte sempre a vencer.
 * (Meses distintos garantem competências únicas; o dia é limitado a 28 para existir em todo mês.)
 */
const MESES_VENCIMENTO = [-3, -2, -1, 0, 1];
const DIAS_ANCORA = -5;

interface AlunoSemente {
  id: number;
  nome: string;
  matricula: string;
  curso: string;
  status: StatusMatricula;
  periodo: number;
  ingressoOffsetDias: number;
  mensalidadeCentavos: number;
  padrao: string; // um caractere por parcela, na ordem de MESES_VENCIMENTO
  situacaoFinanceiraLegada?: "adimplente" | "inadimplente";
}

const SEMENTES: AlunoSemente[] = [
  { id: 1, nome: "Ana Beatriz Souza", matricula: "2024001", curso: "Engenharia de Software", status: "ativa", periodo: 3, ingressoOffsetDias: -400, mensalidadeCentavos: 129000, padrao: "PPPPA" },
  { id: 2, nome: "Bruno Carvalho Lima", matricula: "2024002", curso: "Direito", status: "ativa", periodo: 3, ingressoOffsetDias: -400, mensalidadeCentavos: 145000, padrao: "PPPAA" },
  // Caso do bug: parcela antiga em aberto, mas a mais recente foi paga e o campo legado diz "adimplente".
  { id: 3, nome: "Carla Mendes Rocha", matricula: "2023015", curso: "Administração", status: "ativa", periodo: 5, ingressoOffsetDias: -760, mensalidadeCentavos: 98000, padrao: "PAPPA", situacaoFinanceiraLegada: "adimplente" },
  { id: 4, nome: "Diego Fernandes Alves", matricula: "2023022", curso: "Ciência da Computação", status: "trancada", periodo: 4, ingressoOffsetDias: -760, mensalidadeCentavos: 135000, padrao: "PPA" },
  { id: 5, nome: "Eduarda Martins Pires", matricula: "2022031", curso: "Medicina", status: "ativa", periodo: 7, ingressoOffsetDias: -1130, mensalidadeCentavos: 890000, padrao: "PPPXA" },
  { id: 6, nome: "Felipe Araújo Costa", matricula: "2024010", curso: "Engenharia Civil", status: "ativa", periodo: 3, ingressoOffsetDias: -400, mensalidadeCentavos: 152000, padrao: "PLLPA" },
  { id: 7, nome: "Gabriela Nunes Teixeira", matricula: "2021044", curso: "Psicologia", status: "formada", periodo: 10, ingressoOffsetDias: -1860, mensalidadeCentavos: 112000, padrao: "PPPP" },
  { id: 8, nome: "Henrique Barbosa Dias", matricula: "2023030", curso: "Arquitetura e Urbanismo", status: "cancelada", periodo: 4, ingressoOffsetDias: -760, mensalidadeCentavos: 141000, padrao: "PAA" },
  { id: 9, nome: "Isabela Moreira Cardoso", matricula: "2024018", curso: "Engenharia de Software", status: "ativa", periodo: 3, ingressoOffsetDias: -400, mensalidadeCentavos: 129000, padrao: "PPPPP" },
  { id: 10, nome: "João Pedro Ribeiro", matricula: "2022050", curso: "Direito", status: "ativa", periodo: 7, ingressoOffsetDias: -1130, mensalidadeCentavos: 145000, padrao: "PPPPA" },
  // Bolsista integral: sem parcelas.
  { id: 11, nome: "Larissa Gomes Freitas", matricula: "2024025", curso: "Administração", status: "ativa", periodo: 3, ingressoOffsetDias: -400, mensalidadeCentavos: 0, padrao: "" },
  { id: 12, nome: "Marcos Vinícius Rocha", matricula: "2023041", curso: "Ciência da Computação", status: "ativa", periodo: 5, ingressoOffsetDias: -760, mensalidadeCentavos: 135000, padrao: "AAAAA" },
];

function gerarParcelas(s: AlunoSemente, referencia: DataISO): ParcelaRegistrada[] {
  return [...s.padrao].map((codigo, i) => {
    const padrao = codigo as Padrao;
    const vencimento = somarMeses(somarDias(referencia, DIAS_ANCORA), MESES_VENCIMENTO[i]);
    const valor = s.mensalidadeCentavos;
    const pago =
      padrao === "P" || padrao === "L" ? valor : padrao === "X" ? Math.round(valor / 2) : 0;
    const dataPagamento =
      padrao === "P" ? somarDias(vencimento, -2)
      : padrao === "L" ? somarDias(vencimento, 12)
      : padrao === "X" ? somarDias(vencimento, 1)
      : null;
    // Um pagamento nunca está no futuro (parcela futura paga antecipadamente = paga hoje).
    const pagoEm = dataPagamento && dataPagamento > referencia ? referencia : dataPagamento;
    return {
      id: `${s.id}-${vencimento.slice(0, 7)}`,
      competencia: vencimento.slice(0, 7),
      vencimento,
      valorCentavos: valor,
      valorPagoCentavos: pago,
      pagoEm,
    };
  });
}

export function gerarAlunos(referencia: DataISO): AlunoRegistro[] {
  return SEMENTES.map((s) => ({
    id: s.id,
    nome: s.nome,
    matricula: s.matricula,
    curso: s.curso,
    status: s.status,
    email: `${s.nome.split(" ")[0].toLowerCase()}.${s.matricula}@exemplo.edu.br`.normalize("NFD").replace(/[̀-ͯ]/g, ""),
    dataIngresso: somarDias(referencia, s.ingressoOffsetDias),
    periodo: s.periodo,
    mensalidadeCentavos: s.mensalidadeCentavos,
    parcelas: gerarParcelas(s, referencia),
    situacaoFinanceiraLegada: s.situacaoFinanceiraLegada,
  }));
}
