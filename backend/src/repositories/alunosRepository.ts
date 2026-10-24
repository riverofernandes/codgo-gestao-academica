import type { AlunoRegistro, StatusMatricula } from "../data/seed.js";
import type { DataISO } from "../domain/datas.js";
import {
  calcularSituacaoFinanceira,
  type ParcelaCalculada,
  type ResultadoFinanceiro,
  type SituacaoFinanceira,
} from "../domain/financeiro.js";

export interface AlunoResumo {
  id: number;
  nome: string;
  matricula: string;
  curso: string;
  status: StatusMatricula;
  situacaoFinanceira: SituacaoFinanceira;
}

export interface AlunoDetalhe extends AlunoResumo {
  email: string;
  dataIngresso: DataISO;
  periodo: number;
}

export interface Financeiro {
  alunoId: number;
  situacao: SituacaoFinanceira;
  mensalidadeCentavos: number;
  resumo: ResultadoFinanceiro["resumo"];
  parcelas: ParcelaCalculada[];
  calculadoEm: DataISO;
}

/** Normaliza para busca: minúsculas, sem acentos, espaços colapsados. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Repositório em memória. A situação financeira é SEMPRE derivada das parcelas
 * no momento da leitura (nunca lida de um campo armazenado).
 */
export class AlunosRepository {
  constructor(
    private readonly alunos: readonly AlunoRegistro[],
    private readonly hoje: () => DataISO,
  ) {}

  private financeiroDe(aluno: AlunoRegistro): ResultadoFinanceiro {
    return calcularSituacaoFinanceira(aluno.parcelas, this.hoje());
  }

  private resumoDe(aluno: AlunoRegistro): AlunoResumo {
    return {
      id: aluno.id,
      nome: aluno.nome,
      matricula: aluno.matricula,
      curso: aluno.curso,
      status: aluno.status,
      situacaoFinanceira: this.financeiroDe(aluno).situacao,
    };
  }

  listar(busca?: string): AlunoResumo[] {
    const termo = busca ? normalizar(busca) : "";
    return this.alunos
      .filter((a) => !termo || normalizar(a.nome).includes(termo) || a.matricula.includes(termo))
      .map((a) => this.resumoDe(a))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }

  buscarPorId(id: number): AlunoDetalhe | null {
    const aluno = this.alunos.find((a) => a.id === id);
    if (!aluno) return null;
    return {
      ...this.resumoDe(aluno),
      email: aluno.email,
      dataIngresso: aluno.dataIngresso,
      periodo: aluno.periodo,
    };
  }

  financeiro(id: number): Financeiro | null {
    const aluno = this.alunos.find((a) => a.id === id);
    if (!aluno) return null;
    const r = this.financeiroDe(aluno);
    return {
      alunoId: aluno.id,
      situacao: r.situacao,
      mensalidadeCentavos: aluno.mensalidadeCentavos,
      resumo: r.resumo,
      parcelas: r.parcelas,
      calculadoEm: r.calculadoEm,
    };
  }

  dataReferencia(): DataISO {
    return this.hoje();
  }
}
