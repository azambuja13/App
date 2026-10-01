/**
 * ===================================================================
 * CALCULATOR - Funções de Cálculo
 * ===================================================================
 * Lógica de cálculo de custos, preços e totais para eventos
 */

/**
 * Calcula custos detalhados dos ingredientes
 * @param {Array} items - Array de itens com ingredientes
 * @param {Array} ingredients - Base de dados de ingredientes
 * @param {number} guests - Número de convidados
 * @returns {Array} Array de itens calculados
 */
export function calculateItems(items, ingredients, guests) {
    // 🐛 DEBUG: Log para identificar problema de custos R$ 0,00
    console.log('🔍 [calculateItems] Iniciando cálculo:', {
        totalItems: items.length,
        totalIngredients: ingredients.length,
        guests: guests,
        activeItems: items.filter(i => i.active).length
    });

    // 🐛 DEBUG: Mostrar amostra dos ingredientes disponíveis
    if (ingredients.length > 0) {
        const sampleIngredient = ingredients[0];
        console.log('🔍 [calculateItems] Amostra de ingrediente disponível:', {
            id: sampleIngredient.id,
            name: sampleIngredient.name || sampleIngredient.ingredientName,
            costPerUnit: sampleIngredient.costPerUnit,
            unitSize: sampleIngredient.unitSize
        });
    }

    return items.map(item => {
        if (!item.active) return item;

        // 🐛 DEBUG: Log para cada item processado
        console.log('🔍 [calculateItems] Processando item:', {
            itemName: item.name,
            ingredientId: item.ingredientId,
            qtyPerPerson: item.qtyPerPerson,
            unit: item.unit
        });

        // Tentar encontrar ingrediente por ID primeiro, depois por nome
        let ingredient = ingredients.find(ing => ing.id === item.ingredientId);

        // 🐛 DEBUG: Log resultado da busca por ID
        if (!ingredient && item.ingredientId) {
            console.warn('⚠️ [calculateItems] Ingrediente não encontrado por ID:', {
                ingredientId: item.ingredientId,
                availableIds: ingredients.slice(0, 5).map(ing => ing.id)
            });
        }

        // Se não encontrou por ID, tentar buscar por nome
        if (!ingredient && item.name) {
            ingredient = ingredients.find(ing =>
                (ing.name || ing.ingredientName)?.toLowerCase() === item.name.toLowerCase()
            );
            // 🐛 DEBUG: Log resultado da busca por nome
            if (!ingredient) {
                console.warn('⚠️ [calculateItems] Ingrediente não encontrado por nome:', {
                    itemName: item.name,
                    availableNames: ingredients.slice(0, 5).map(ing => ing.name || ing.ingredientName)
                });
            } else {
                console.log('✅ [calculateItems] Ingrediente encontrado por nome:', ingredient.name || ingredient.ingredientName);
            }
        } else if (ingredient) {
            console.log('✅ [calculateItems] Ingrediente encontrado por ID:', ingredient.name || ingredient.ingredientName);
        }

        if (!ingredient) {
            console.error('❌ [calculateItems] Ingrediente NÃO encontrado - total será R$ 0,00:', {
                itemName: item.name,
                ingredientId: item.ingredientId,
                totalIngredientsAvailable: ingredients.length
            });
            // Retornar item com valores padrão para evitar "Sem nome" na lista de compras
            return {
                ...item,
                name: item.name || item.ingredientName || 'Ingrediente desconhecido',
                category: item.category || 'Sem Categoria',
                total: 0,
                qtyToBuy: 0,
                qtyInKgL: 0
            };
        }

        // ⚡ Performance: Log removido (executava para CADA item processado)

        // Detectar se é ingrediente por unidade
        const isUnitType = item.unitType === 'unit' || item.unit === 'un' ||
                          ingredient.unitType === 'unit' || ingredient.unit === 'un';

        if (isUnitType) {
            // ============================================================
            // CÁLCULO PARA INGREDIENTES POR UNIDADE (pães, ovos, latas)
            // ============================================================

            // qtyPerPerson já está em unidades (ex: 1 pão/pessoa)
            // FIX: Garantir que valores são numéricos
            const unitsPerPerson = parseFloat(item.qtyPerPerson) || 0;

            // Total de unidades necessárias
            const totalUnitsNeeded = unitsPerPerson * (parseFloat(guests) || 0);

            // Aplicar perda (ex: 5% de pães quebrados)
            const lossDecimal = (item.loss || 0) > 1 ? (item.loss || 0) / 100 : (item.loss || 0);
            const unitsWithLoss = window.lossCalculations && window.lossCalculations.calculateQuantityWithLoss
                ? window.lossCalculations.calculateQuantityWithLoss(totalUnitsNeeded, lossDecimal)
                : (lossDecimal > 0 && lossDecimal < 1 ? totalUnitsNeeded / (1 - lossDecimal) : totalUnitsNeeded);

            // Custo por unidade do ingrediente
            // Suporte para costPerUnit (novo) e cost (legacy)
            const ingredientCost = ingredient.costPerUnit || ingredient.cost || 0;
            const unitSize = ingredient.unitSize || 1;
            const costPerUnit = ingredientCost / unitSize;

            // Custo total = quantidade de unidades × custo por unidade
            const total = unitsWithLoss * costPerUnit;

            // 🐛 DEBUG: Log do cálculo por unidade
            console.log('💰 [calculateItems] Cálculo POR UNIDADE:', {
                itemName: item.name,
                unitsPerPerson,
                totalUnitsNeeded,
                unitsWithLoss,
                costPerUnit,
                total: total.toFixed(2)
            });

            // Normalizar categoria do ingrediente
            const category = window.normalizeCategory
                ? window.normalizeCategory(ingredient.category || ingredient.categoria || 'Outros')
                : (ingredient.category || ingredient.categoria || 'Outros');

            return {
                ...item,
                name: ingredient.name || ingredient.ingredientName || item.name,  // Garantir que name está presente
                ingredient,
                category,              // Categoria normalizada do ingrediente
                unit: 'un',
                unitType: 'unit',
                costPerUnit,           // Custo por unidade individual
                qtyToBuy: unitsWithLoss,  // Quantidade total em unidades (não em kg)
                qtyInKgL: unitsWithLoss,  // Para "Kg/L" vai mostrar quantidade em Un
                total
            };

        } else {
            // ============================================================
            // CÁLCULO PARA INGREDIENTES POR PESO (carnes, legumes)
            // ============================================================

            // Converter quantidade para g/ml
            // FIX: Garantir que valores são numéricos
            let qtyInGramsMl = parseFloat(item.qtyPerPerson) || 0;
            if (item.unit === 'kg') qtyInGramsMl *= 1000;
            else if (item.unit === 'L') qtyInGramsMl *= 1000;

            // Total necessário para todos os convidados
            const totalQtyNeeded = qtyInGramsMl * (parseFloat(guests) || 0);

            // Usar módulo de cálculo de perda para aplicar perda INVERSA
            const lossDecimal = (item.loss || 0) > 1 ? (item.loss || 0) / 100 : (item.loss || 0);
            const qtyWithLoss = window.lossCalculations && window.lossCalculations.calculateQuantityWithLoss
                ? window.lossCalculations.calculateQuantityWithLoss(totalQtyNeeded, lossDecimal)
                : (lossDecimal > 0 && lossDecimal < 1 ? totalQtyNeeded / (1 - lossDecimal) : totalQtyNeeded);

            // Custo por grama/ml
            // Suporte para costPerUnit (novo) e cost (legacy)
            const ingredientCost = ingredient.costPerUnit || ingredient.cost || 0;
            const unitSize = ingredient.unitSize || 1000; // Default 1000g = 1kg

            // Se tem unitSize, usar ele para calcular custo por grama
            // Exemplo: costPerUnit=65, unitSize=1000 → 65/1000 = 0.065/g
            let costPerGramMl = ingredientCost / unitSize;

            // Fallback para lógica antiga baseada em unit
            if (!ingredient.unitSize) {
                costPerGramMl = ingredientCost;
                if (ingredient.unit === 'kg') costPerGramMl = ingredientCost / 1000;
                else if (ingredient.unit === 'L') costPerGramMl = ingredientCost / 1000;
            }

            // Quantidade a comprar (em kg/L para facilitar compra)
            const qtyToBuy = qtyWithLoss / 1000;

            // Total em kg/L
            const qtyInKgL = qtyWithLoss / 1000;

            // Custo total
            const total = costPerGramMl * qtyWithLoss;

            // 🐛 DEBUG: Log do cálculo por peso
            console.log('💰 [calculateItems] Cálculo POR PESO:', {
                itemName: item.name,
                qtyPerPerson: item.qtyPerPerson,
                unit: item.unit,
                qtyInGramsMl,
                totalQtyNeeded,
                qtyWithLoss,
                ingredientCost,
                unitSize,
                costPerGramMl: costPerGramMl.toFixed(4),
                total: total.toFixed(2)
            });

            // Normalizar categoria do ingrediente
            const category = window.normalizeCategory
                ? window.normalizeCategory(ingredient.category || ingredient.categoria || 'Outros')
                : (ingredient.category || ingredient.categoria || 'Outros');

            return {
                ...item,
                name: ingredient.name || ingredient.ingredientName || item.name,  // Garantir que name está presente
                ingredient,
                category,              // Categoria normalizada do ingrediente
                costPerGramMl,
                qtyToBuy,
                qtyInKgL,
                total
            };
        }
    });
}

/**
 * Calcula custo de transporte
 * @param {number} distance - Distância em km (ida)
 * @param {number} fuelCost - Custo do combustível
 * @param {number} toll - Custo do pedágio
 * @param {number} costPerKm - Custo por km (desgaste do veículo)
 * @returns {number} Custo total de transporte (ida e volta)
 */
export function calculateTransportCost(distance, fuelCost, toll, costPerKm = 0.5) {
    // Considera ida e volta
    const totalDistance = distance * 2;

    // Custo de combustível + pedágio + desgaste do veículo
    return (fuelCost * 2) + (toll * 2) + (totalDistance * costPerKm);
}

/**
 * Calcula custos dos itens de apoio
 * @param {Array} support - Array de itens de apoio
 * @returns {Array} Array de itens calculados
 */
export function calculateSupport(support) {
    return support.map(item => ({
        ...item,
        // FIX: Suportar tanto 'quantity' quanto 'qty' para compatibilidade
        total: (item.cost || 0) * (item.quantity || item.qty || 0)
    }));
}

/**
 * Calcula custo de mão de obra
 * @param {number} hours - Horas trabalhadas
 * @param {number} hourlyRate - Valor por hora
 * @returns {number} Custo total de mão de obra
 */
export function calculateLaborCost(hours, hourlyRate) {
    return hours * hourlyRate;
}

/**
 * Calcula subtotal (soma de todos os custos)
 * @param {Object} costs - Objeto com todos os custos
 * @param {number} costs.materials - Custo de materiais
 * @param {number} costs.support - Custo de apoio
 * @param {number} costs.transport - Custo de transporte
 * @param {number} costs.labor - Custo de mão de obra
 * @returns {number} Subtotal
 */
export function calculateSubtotal(costs) {
    return (costs.materials || 0) +
           (costs.support || 0) +
           (costs.transport || 0) +
           (costs.labor || 0);
}

/**
 * Aplica inflação ao valor
 * @param {number} value - Valor base
 * @param {number} months - Meses até o evento
 * @param {number} monthlyRate - Taxa mensal de inflação (padrão: 1% = 0.01)
 * @returns {number} Valor com inflação aplicada
 */
export function applyInflation(value, months, monthlyRate = 0.01) {
    return value * Math.pow(1 + monthlyRate, months);
}

/**
 * Calcula preço por pessoa
 * @param {number} total - Valor total do evento
 * @param {number} guests - Número de convidados
 * @returns {number} Preço por pessoa
 */
export function calculatePricePerPerson(total, guests) {
    if (guests <= 0) return 0;
    return total / guests;
}

/**
 * Calcula total de materiais (ingredientes)
 * @param {Array} items - Array de itens calculados
 * @returns {number} Total de materiais
 */
export function calculateMaterialsCost(items) {
    return items
        .filter(item => item.active)
        .reduce((sum, item) => sum + (item.total || 0), 0);
}

/**
 * Calcula total de apoio
 * @param {Array} support - Array de itens de apoio calculados
 * @returns {number} Total de apoio
 */
export function calculateSupportCost(support) {
    return support.reduce((sum, item) => sum + (item.total || 0), 0);
}

/**
 * Calcula todos os custos do evento
 * @param {Object} eventData - Dados do evento
 * @returns {Object} Objeto com todos os cálculos
 */
export function calculateEventCosts(eventData) {
    const {
        items,
        ingredients,
        guests,
        support,
        distance,
        fuelCost,
        toll,
        laborHours,
        laborRate,
        monthsUntilEvent
    } = eventData;

    // Calcula itens
    const itemsCalculated = calculateItems(items, ingredients, guests);

    // Calcula apoio
    const supportCalculated = calculateSupport(support);

    // Calcula custos individuais
    const materialsCost = calculateMaterialsCost(itemsCalculated);
    const supportCost = calculateSupportCost(supportCalculated);
    const transportCost = calculateTransportCost(distance, fuelCost, toll);
    const laborCost = calculateLaborCost(laborHours, laborRate);

    // Calcula subtotal
    const subtotal = calculateSubtotal({
        materials: materialsCost,
        support: supportCost,
        transport: transportCost,
        labor: laborCost
    });

    // Aplica inflação
    const totalWithInflation = applyInflation(subtotal, monthsUntilEvent);

    // Calcula preço por pessoa
    const pricePerPerson = calculatePricePerPerson(totalWithInflation, guests);

    return {
        itemsCalculated,
        supportCalculated,
        materialsCost,
        supportCost,
        transportCost,
        laborCost,
        subtotal,
        totalWithInflation,
        pricePerPerson,
        totalCost: totalWithInflation
    };
}
