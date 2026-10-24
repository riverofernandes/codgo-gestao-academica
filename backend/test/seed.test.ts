import { describe, expect, it } from "vitest";
import { gerarAlunos } from "../src/data/seed.js";
import { somarDias } from "../src/domain/datas.js";
import { calcularSituacaoFinanceira } from "../src/domain/financeiro.js";

/** O seed usa datas relativas: a demo precisa se comportar igual em QUALQUER dia em que rodar. */
describe("seed com datas relativas", () => {
  const dias = Array.from({ length: 366 * 2 }, (_, i) => somarDias("2026-01-01", i));

  it("competências e ids de parcela são únicos e nenhum pagamento está no futuro, em qualquer dia de 2 anos", () => {
    for (const hoje of dias) {
      for (const aluno of gerarAlunos(hoje)) {
        const competencias = aluno.parcelas.map((p) => p.competencia);
        expect(new Set(competencias).size, `${hoje} aluno ${aluno.id}`).toBe(competencias.length);
        expect(new Set(aluno.parcelas.map((p) => p.id)).size).toBe(aluno.parcelas.length);
        for (const p of aluno.parcelas) {
          if (p.pagoEm) expect(p.pagoEm <= hoje, `${hoje} ${p.id}`).toBe(true);
        }
      }
    }
  });

  it("os mesmos 6 alunos são inadimplentes em qualquer dia", () => {
    for (const hoje of dias) {
      const inadimplentes = gerarAlunos(hoje)
        .filter((a) => calcularSituacaoFinanceira(a.parcelas, hoje).situacao === "inadimplente")
        .map((a) => a.id);
      expect(inadimplentes, hoje).toEqual([2, 3, 4, 5, 8, 12]);
    }
  });
});
