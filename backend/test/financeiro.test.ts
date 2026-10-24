import { describe, expect, it } from "vitest";
import {
  calcularSituacaoFinanceira,
  calcularSituacaoParcela,
  type ParcelaRegistrada,
} from "../src/domain/financeiro.js";

const HOJE = "2026-10-24";

function parcela(over: Partial<ParcelaRegistrada> & Pick<ParcelaRegistrada, "vencimento">): ParcelaRegistrada {
  return {
    id: over.vencimento,
    competencia: over.vencimento.slice(0, 7),
    valorCentavos: 100000,
    valorPagoCentavos: 0,
    pagoEm: null,
    ...over,
  };
}
const paga = (vencimento: string, pagoEm = vencimento) =>
  parcela({ vencimento, valorPagoCentavos: 100000, pagoEm });
const aberta = (vencimento: string) => parcela({ vencimento });

describe("calcularSituacaoFinanceira — regra de adimplência", () => {
  it("BUG REPORTADO: parcela antiga em aberto + parcela mais recente paga => INADIMPLENTE", () => {
    // Antes da correção, o status olhava o último pagamento / um campo gravado
    // e este aluno aparecia como adimplente.
    const r = calcularSituacaoFinanceira(
      [paga("2026-07-10"), aberta("2026-08-10"), paga("2026-09-10"), paga("2026-10-10")],
      HOJE,
    );
    expect(r.situacao).toBe("inadimplente");
    expect(r.resumo.parcelasVencidas).toBe(1);
    expect(r.resumo.totalVencidoCentavos).toBe(100000);
  });

  it("todas as parcelas vencidas pagas e a próxima a vencer => adimplente", () => {
    const r = calcularSituacaoFinanceira([paga("2026-09-10"), paga("2026-10-10"), aberta("2026-11-10")], HOJE);
    expect(r.situacao).toBe("adimplente");
    expect(r.resumo.totalEmAbertoCentavos).toBe(100000);
    expect(r.resumo.totalVencidoCentavos).toBe(0);
    expect(r.resumo.proximoVencimento).toBe("2026-11-10");
  });

  it("pagamento parcial de parcela vencida NÃO quita => inadimplente", () => {
    const r = calcularSituacaoFinanceira(
      [parcela({ vencimento: "2026-10-10", valorPagoCentavos: 50000, pagoEm: "2026-10-11" })],
      HOJE,
    );
    expect(r.situacao).toBe("inadimplente");
    expect(r.parcelas[0].situacao).toBe("vencida");
    expect(r.resumo.totalVencidoCentavos).toBe(50000);
    expect(r.resumo.totalPagoCentavos).toBe(50000);
  });

  it("parcela paga com atraso conta como quitada => adimplente", () => {
    const r = calcularSituacaoFinanceira([paga("2026-09-10", "2026-10-20")], HOJE);
    expect(r.situacao).toBe("adimplente");
    expect(r.parcelas[0].situacao).toBe("paga");
  });

  it("vencimento HOJE ainda não é atraso; ontem já é", () => {
    expect(calcularSituacaoParcela(aberta(HOJE), HOJE)).toBe("em_aberto");
    expect(calcularSituacaoParcela(aberta("2026-10-23"), HOJE)).toBe("vencida");
  });

  it("aluno sem parcelas (ex.: bolsista) => adimplente com totais zerados", () => {
    const r = calcularSituacaoFinanceira([], HOJE);
    expect(r.situacao).toBe("adimplente");
    expect(r.resumo).toEqual({
      totalPagoCentavos: 0,
      totalEmAbertoCentavos: 0,
      totalVencidoCentavos: 0,
      parcelasVencidas: 0,
      proximoVencimento: null,
    });
  });

  it("independe da ordem em que as parcelas foram registradas", () => {
    const r = calcularSituacaoFinanceira([paga("2026-10-10"), aberta("2026-08-10"), paga("2026-09-10")], HOJE);
    expect(r.situacao).toBe("inadimplente");
    expect(r.parcelas.map((p) => p.vencimento)).toEqual(["2026-08-10", "2026-09-10", "2026-10-10"]);
  });

  it("muda com o passar do tempo: em aberto hoje, vencida amanhã+1", () => {
    const parcelas = [aberta("2026-10-25")];
    expect(calcularSituacaoFinanceira(parcelas, "2026-10-25").situacao).toBe("adimplente");
    expect(calcularSituacaoFinanceira(parcelas, "2026-10-26").situacao).toBe("inadimplente");
  });

  it("rejeita data de referência inválida em vez de calcular errado", () => {
    expect(() => calcularSituacaoFinanceira([], "24/10/2026")).toThrow();
  });
});
