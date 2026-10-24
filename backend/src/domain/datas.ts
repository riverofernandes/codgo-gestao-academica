/**
 * Datas de negócio são tratadas como strings `YYYY-MM-DD` (sem horário).
 * Comparar strings ISO de data é seguro e evita bugs de fuso horário
 * (ex.: `new Date("2026-10-10")` é meia-noite UTC = dia 09 no Brasil).
 */
export type DataISO = string;

const FUSO_PADRAO = process.env.TZ_NEGOCIO ?? "America/Sao_Paulo";

/** Data de hoje no fuso de negócio, como `YYYY-MM-DD`. */
export function hojeISO(agora: Date = new Date(), fuso: string = FUSO_PADRAO): DataISO {
  // en-CA formata como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

/** Soma dias a uma data ISO (aritmética em UTC para não sofrer com horário de verão). */
export function somarDias(data: DataISO, dias: number): DataISO {
  const [a, m, d] = data.split("-").map(Number);
  const utc = new Date(Date.UTC(a, m - 1, d + dias));
  return utc.toISOString().slice(0, 10);
}

/** Soma meses mantendo o dia, limitado a 28 (existe em todos os meses). */
export function somarMeses(data: DataISO, meses: number): DataISO {
  const [a, m, d] = data.split("-").map(Number);
  const utc = new Date(Date.UTC(a, m - 1 + meses, Math.min(d, 28)));
  return utc.toISOString().slice(0, 10);
}

const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;

export function ehDataISO(valor: unknown): valor is DataISO {
  return typeof valor === "string" && REGEX_DATA.test(valor);
}
