/**
 * ===================================================================
 * STATISTICS UTILITIES - Funções utilitárias para estatísticas
 * ===================================================================
 * Funções genéricas reutilizáveis para cálculos estatísticos
 * em diferentes managers (Proposal, Dish, SavedMenus, Menu)
 */

/**
 * Agrupa itens por uma propriedade específica
 * @param {Array} items - Array de itens para agrupar
 * @param {string} property - Nome da propriedade para agrupar
 * @param {string} defaultValue - Valor padrão se propriedade for undefined
 * @returns {Object} Objeto com contagem por grupo
 *
 * @example
 * groupBy(dishes, 'category', 'Sem categoria')
 * // { "Proteínas": 5, "Acompanhamentos": 3 }
 */
export function groupBy(items, property, defaultValue = 'Sem categoria') {
    return items.reduce((acc, item) => {
        const key = item[property] || defaultValue;
        if (!acc[key]) {
            acc[key] = 0;
        }
        acc[key]++;
        return acc;
    }, {});
}

/**
 * Agrupa itens e acumula valores numéricos
 * @param {Array} items - Array de itens para agrupar
 * @param {string} groupProperty - Nome da propriedade para agrupar
 * @param {string} sumProperty - Nome da propriedade numérica para somar
 * @param {string} defaultValue - Valor padrão se propriedade for undefined
 * @returns {Object} Objeto com contagem e soma por grupo
 *
 * @example
 * groupByWithSum(menu, 'dishCategory', 'dishCost', 'Sem categoria')
 * // { "Proteínas": { count: 5, total: 250.50 } }
 */
export function groupByWithSum(items, groupProperty, sumProperty, defaultValue = 'Sem categoria') {
    return items.reduce((acc, item) => {
        const key = item[groupProperty] || defaultValue;
        if (!acc[key]) {
            acc[key] = {
                count: 0,
                total: 0
            };
        }
        acc[key].count++;
        acc[key].total += item[sumProperty] || 0;
        return acc;
    }, {});
}

/**
 * Encontra item com valor extremo (máximo ou mínimo)
 * @param {Array} items - Array de itens
 * @param {string} property - Nome da propriedade numérica
 * @param {string} mode - 'max' ou 'min'
 * @returns {Object|null} Item com valor extremo ou null se array vazio
 *
 * @example
 * findExtreme(proposals, 'finalTotal', 'max') // proposta mais cara
 * findExtreme(dishes, 'totalCost', 'min') // prato mais barato
 */
export function findExtreme(items, property, mode = 'max') {
    if (!Array.isArray(items) || items.length === 0) {
        return null;
    }

    return items.reduce((extreme, item) => {
        const itemValue = item[property] || 0;
        const extremeValue = extreme[property] || 0;

        if (mode === 'max') {
            return itemValue > extremeValue ? item : extreme;
        } else {
            return itemValue < extremeValue ? item : extreme;
        }
    });
}

/**
 * Calcula média de uma propriedade numérica
 * @param {Array} items - Array de itens
 * @param {string} property - Nome da propriedade numérica
 * @returns {number} Valor médio ou 0 se array vazio
 *
 * @example
 * calculateAverage(dishes, 'totalCost') // 45.50
 */
export function calculateAverage(items, property) {
    if (!Array.isArray(items) || items.length === 0) {
        return 0;
    }

    const total = items.reduce((sum, item) => sum + (item[property] || 0), 0);
    return total / items.length;
}

/**
 * Calcula soma de uma propriedade numérica
 * @param {Array} items - Array de itens
 * @param {string} property - Nome da propriedade numérica
 * @param {Function} filter - Função opcional para filtrar itens
 * @returns {number} Soma total
 *
 * @example
 * sumReduce(ingredients, 'totalCost')
 * sumReduce(ingredients, 'quantity', item => item.active)
 */
export function sumReduce(items, property, filter = null) {
    if (!Array.isArray(items)) {
        return 0;
    }

    const itemsToSum = filter ? items.filter(filter) : items;
    return itemsToSum.reduce((sum, item) => sum + (item[property] || 0), 0);
}

/**
 * Calcula estatísticas detalhadas de um array
 * @param {Array} items - Array de itens
 * @param {string} property - Nome da propriedade numérica
 * @returns {Object} Objeto com min, max, avg, total
 *
 * @example
 * calculateStats(dishes, 'totalCost')
 * // { min: 10.50, max: 125.00, avg: 45.50, total: 273.00 }
 */
export function calculateStats(items, property) {
    if (!Array.isArray(items) || items.length === 0) {
        return {
            min: 0,
            max: 0,
            avg: 0,
            total: 0,
            count: 0
        };
    }

    const values = items.map(item => item[property] || 0);
    const total = values.reduce((sum, val) => sum + val, 0);

    return {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: total / items.length,
        total: total,
        count: items.length
    };
}

/**
 * Filtra e conta itens por condição
 * @param {Array} items - Array de itens
 * @param {Function} predicate - Função de filtro
 * @returns {number} Contagem de itens que atendem a condição
 *
 * @example
 * countBy(proposals, p => p.status === 'approved') // 15
 */
export function countBy(items, predicate) {
    if (!Array.isArray(items)) {
        return 0;
    }
    return items.filter(predicate).length;
}

/**
 * Calcula taxa de conversão entre dois estados
 * @param {number} converted - Quantidade convertida
 * @param {number} total - Quantidade total
 * @returns {number} Taxa de conversão em porcentagem (0-100)
 *
 * @example
 * calculateConversionRate(15, 50) // 30
 */
export function calculateConversionRate(converted, total) {
    if (!total || total === 0) {
        return 0;
    }
    return (converted / total) * 100;
}

// Expor no window para uso em componentes JSX compilados
if (typeof window !== 'undefined') {
    window.statisticsUtils = {
        groupBy,
        groupByWithSum,
        findExtreme,
        calculateAverage,
        sumReduce,
        calculateStats,
        countBy,
        calculateConversionRate
    };
}
