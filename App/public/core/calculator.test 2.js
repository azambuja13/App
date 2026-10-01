/**
 * Testes para calculator.js
 */

import { describe, test, expect } from 'vitest';
import {
    calculateItems,
    calculateTransportCost,
    calculateLaborCost,
    applyInflation,
    calculatePricePerPerson,
    calculateEventCosts
} from './calculator.js';

describe('calculator', () => {
    describe('calculateItems', () => {
        test('calcula custos de ingredientes corretamente', () => {
            const items = [
                {
                    ingredientId: 1,
                    qtyPerPerson: 150, // 150g
                    unit: 'g',
                    loss: 10,
                    active: true,
                    name: 'Carne',
                    category: 'Carnes'
                }
            ];

            const ingredients = [
                { id: 1, cost: 45, unit: 'kg' } // R$ 45/kg
            ];

            const guests = 100;

            const result = calculateItems(items, ingredients, guests);

            expect(result).toHaveLength(1);
            expect(result[0].total).toBeGreaterThan(0);
            // 100 pessoas * 150g = 15.000g = 15kg
            // Com 10% perda = 16.5kg
            // R$ 45/kg * 16.5kg = R$ 742,50
            expect(result[0].total).toBeCloseTo(742.5, 1);
        });

        test('ignora itens inativos', () => {
            const items = [
                {
                    ingredientId: 1,
                    active: false,
                    name: 'Carne'
                }
            ];

            const result = calculateItems(items, [], 100);

            expect(result[0]).toMatchObject({ active: false });
            expect(result[0].total).toBeUndefined();
        });
    });

    describe('calculateTransportCost', () => {
        test('calcula custo de transporte (ida e volta)', () => {
            const distance = 50; // km
            const fuelCost = 30;
            const toll = 15;
            const costPerKm = 0.5;

            const result = calculateTransportCost(distance, fuelCost, toll, costPerKm);

            // (30 * 2) + (15 * 2) + (50 * 2 * 0.5) = 60 + 30 + 50 = 140
            expect(result).toBe(140);
        });

        test('calcula sem pedágio', () => {
            const result = calculateTransportCost(50, 30, 0, 0.5);
            // (30 * 2) + (50 * 2 * 0.5) = 60 + 50 = 110
            expect(result).toBe(110);
        });
    });

    describe('calculateLaborCost', () => {
        test('calcula custo de mão de obra', () => {
            const hours = 8;
            const hourlyRate = 50;

            const result = calculateLaborCost(hours, hourlyRate);

            expect(result).toBe(400);
        });

        test('retorna zero para horas zero', () => {
            expect(calculateLaborCost(0, 50)).toBe(0);
        });
    });

    describe('applyInflation', () => {
        test('aplica inflação mensal', () => {
            const value = 1000;
            const months = 3;
            const monthlyRate = 0.01; // 1% ao mês

            const result = applyInflation(value, months, monthlyRate);

            // 1000 * (1.01^3) = 1030.30
            expect(result).toBeCloseTo(1030.30, 2);
        });

        test('retorna valor original para 0 meses', () => {
            expect(applyInflation(1000, 0)).toBe(1000);
        });
    });

    describe('calculatePricePerPerson', () => {
        test('calcula preço por pessoa', () => {
            const result = calculatePricePerPerson(5000, 100);
            expect(result).toBe(50);
        });

        test('retorna zero para guests zero', () => {
            expect(calculatePricePerPerson(5000, 0)).toBe(0);
        });
    });

    describe('calculateEventCosts', () => {
        test('calcula todos os custos do evento', () => {
            const eventData = {
                guests: 100,
                monthsUntilEvent: 0,
                ingredients: [
                    { id: 1, cost: 45, unit: 'kg' }
                ],
                items: [
                    {
                        ingredientId: 1,
                        qtyPerPerson: 150,
                        unit: 'g',
                        loss: 10,
                        active: true,
                        name: 'Carne',
                        category: 'Carnes'
                    }
                ],
                support: [
                    { name: 'Gelo', cost: 15, qty: 3 }
                ],
                distance: 50,
                fuelCost: 30,
                toll: 15,
                laborHours: 8,
                laborRate: 50
            };

            const result = calculateEventCosts(eventData);

            expect(result).toHaveProperty('materialsCost');
            expect(result).toHaveProperty('supportCost');
            expect(result).toHaveProperty('transportCost');
            expect(result).toHaveProperty('laborCost');
            expect(result).toHaveProperty('totalCost');
            expect(result).toHaveProperty('pricePerPerson');

            expect(result.totalCost).toBeGreaterThan(0);
            expect(result.pricePerPerson).toBeGreaterThan(0);
        });
    });
});
