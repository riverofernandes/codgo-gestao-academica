import { describe, expect, it } from 'vitest';
import { formatarCompetencia, formatarData, formatarMoeda } from './formatacao';

// Intl usa espaço não separável entre "R$" e o valor; normalizamos para comparar.
const normalizar = (s: string) => s.replace(/\s/g, ' ');

describe('formatarMoeda', () => {
  it('converte centavos para BRL', () => {
    expect(normalizar(formatarMoeda(123456))).toBe('R$ 1.234,56');
    expect(normalizar(formatarMoeda(0))).toBe('R$ 0,00');
    expect(normalizar(formatarMoeda(5))).toBe('R$ 0,05');
  });
});

describe('formatarData', () => {
  it('formata YYYY-MM-DD como dd/mm/aaaa sem deslocamento de fuso', () => {
    expect(formatarData('2026-08-01')).toBe('01/08/2026');
    expect(formatarData('2026-01-31')).toBe('31/01/2026');
  });

  it('retorna travessão para valores nulos', () => {
    expect(formatarData(null)).toBe('—');
    expect(formatarData(undefined)).toBe('—');
  });
});

describe('formatarCompetencia', () => {
  it('formata YYYY-MM como mm/aaaa', () => {
    expect(formatarCompetencia('2026-08')).toBe('08/2026');
  });
});
