/**
 * Testes para formatters.js
 */

import { describe, test, expect } from 'vitest';
import { formatCurrency, formatDate, formatPercent, formatNumber } from './formatters.js';

describe('formatters', () => {
    describe('formatCurrency', () => {
        test('formata valor positivo corretamente', () => {
            expect(formatCurrency(1234.56)).toBe('R$ 1.234,56');
        });

        test('formata zero', () => {
            expect(formatCurrency(0)).toBe('R$ 0,00');
        });

        test('formata valor negativo', () => {
            expect(formatCurrency(-500.75)).toBe('-R$ 500,75');
        });

        test('formata valores grandes', () => {
            expect(formatCurrency(1000000)).toBe('R$ 1.000.000,00');
        });

        test('trata null/undefined como zero', () => {
            expect(formatCurrency(null)).toBe('R$ 0,00');
            expect(formatCurrency(undefined)).toBe('R$ 0,00');
        });
    });

    describe('formatDate', () => {
        test('formata data no formato YYYY-MM-DD', () => {
            expect(formatDate('2025-12-20')).toBe('20/12/2025');
        });

        test('formata data no início do ano', () => {
            expect(formatDate('2025-01-01')).toBe('01/01/2025');
        });

        test('retorna string vazia para data inválida', () => {
            expect(formatDate('')).toBe('');
            expect(formatDate(null)).toBe('');
        });
    });

    describe('formatPercent', () => {
        test('formata decimal como porcentagem', () => {
            expect(formatPercent(0.15)).toBe('15%');
        });

        test('formata zero', () => {
            expect(formatPercent(0)).toBe('0%');
        });

        test('formata porcentagens grandes', () => {
            expect(formatPercent(1.5)).toBe('150%');
        });
    });

    describe('formatNumber', () => {
        test('formata número com separadores', () => {
            expect(formatNumber(1234.56)).toBe('1.234,56');
        });

        test('formata com duas casas decimais', () => {
            expect(formatNumber(10)).toBe('10,00');
        });
    });
});
