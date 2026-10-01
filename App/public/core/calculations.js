/**
 * ===================================================================
 * CALCULATIONS - Módulo Central de Cálculos
 * ===================================================================
 * Centraliza toda lógica de cálculos de custos, preços e valores
 * para evitar duplicação e garantir consistência
 */

/**
 * Calcula custo total de ingredientes
 * @param {Array} ingredients - Array de ingredientes
 * @returns {number} Custo total
 */
export function calculateIngredientsCost(ingredients = []) {
    if (!Array.isArray(ingredients)) {
        return 0;
    }

    return ingredients.reduce((sum, ingredient) => {
        const cost = parseFloat(ingredient.ingredientCost) || 0;
        return sum + cost;
    }, 0);
}

/**
 * Calcula custo por porção
 * @param {number} totalCost - Custo total
 * @param {number} servings - Número de porções
 * @returns {number} Custo por porção
 */
export function calculateCostPerServing(totalCost, servings) {
    const total = parseFloat(totalCost) || 0;
    const portions = parseFloat(servings) || 1;

    if (portions <= 0) {
        return 0;
    }

    return total / portions;
}

/**
 * Calcula custo por grama/ml de ingrediente (para ingredientes por peso)
 * OU custo por unidade (para ingredientes por unidade)
 *
 * IMPORTANTE: NÃO aplica perda por padrão, porque a perda já é considerada nos pratos!
 * A perda só deve ser aplicada ao comprar ingredientes DIRETO (não de pratos).
 *
 * @param {Object} ingredient - Ingrediente com costPerUnit, unitSize, unitType e loss
 * @param {boolean} applyLoss - Se deve aplicar a perda (padrão: false)
 * @returns {number} Custo por grama/ml OU custo por unidade (dependendo do unitType)
 */
export function calculateCostPerGramMl(ingredient, applyLoss = false) {
    const unitSize = parseFloat(ingredient.unitSize) || 0;
    const loss = applyLoss ? (parseFloat(ingredient.loss) || 0) : 0; // NÃO aplicar perda por padrão!
    const costPerUnit = parseFloat(ingredient.costPerUnit) || 0;
    const unitType = ingredient.unitType || 'weight'; // Padrão: peso

    if (unitSize <= 0 || costPerUnit <= 0) {
        return 0;
    }

    // Para ingredientes por unidade, retorna custo por unidade
    // Para ingredientes por peso, retorna custo por grama/ml
    if (unitType === 'unit') {
        // Custo por unidade = custo total / quantidade de unidades
        // Exemplo: R$ 8,00 / 10 pães = R$ 0,80/pão
        const costPerItem = costPerUnit / unitSize;

        if (!isFinite(costPerItem) || isNaN(costPerItem)) {
            return 0;
        }

        return costPerItem;
    }

    // Para ingredientes por peso (comportamento original)
    // Calcular tamanho efetivo após perda (apenas se applyLoss = true)
    const effectiveSize = unitSize * (1 - loss);

    if (effectiveSize <= 0) {
        return 0;
    }

    const costPerGramMl = costPerUnit / effectiveSize;

    if (!isFinite(costPerGramMl) || isNaN(costPerGramMl)) {
        return 0;
    }

    return costPerGramMl;
}

/**
 * Calcula custo de ingrediente no prato
 * @param {Object} ingredient - Ingrediente base
 * @param {number} quantity - Quantidade usada
 * @returns {number} Custo do ingrediente
 */
export function calculateIngredientCost(ingredient, quantity) {
    const costPerGramMl = calculateCostPerGramMl(ingredient);
    const qty = parseFloat(quantity) || 0;

    return costPerGramMl * qty;
}

/**
 * Calcula custo de itens de apoio
 * @param {Array} supportItems - Array de itens de apoio
 * @param {boolean} onlyActive - Se deve considerar apenas ativos
 * @returns {number} Custo total de apoio
 */
export function calculateSupportCost(supportItems = [], onlyActive = true) {
    if (!Array.isArray(supportItems)) {
        return 0;
    }

    return supportItems.reduce((sum, item) => {
        if (onlyActive && !item.active) {
            return sum;
        }

        const cost = parseFloat(item.cost) || 0;
        const quantity = parseFloat(item.quantity) || 0;
        return sum + (cost * quantity);
    }, 0);
}

/**
 * Calcula custo de mão de obra
 * @param {Object} labor - Objeto com hours e rate
 * @returns {number} Custo de mão de obra
 */
export function calculateLaborCost(labor = {}) {
    const hours = parseFloat(labor.hours) || 0;
    const rate = parseFloat(labor.rate || labor.hourlyRate) || 0;

    return hours * rate;
}

/**
 * Calcula custo de transporte
 * @param {Object} transport - Objeto com dados de transporte
 * @returns {number} Custo de transporte
 */
export function calculateTransportCost(transport = {}) {
    if (!transport.active) {
        return 0;
    }

    const distance = parseFloat(transport.distance) || 0;
    const consumption = parseFloat(transport.consumption) || 10;
    const fuelPrice = parseFloat(transport.fuelPrice) || 0;
    const costPerKm = parseFloat(transport.costPerKm) || 0;
    const toll = parseFloat(transport.toll) || 0;
    const trips = parseFloat(transport.quantity || transport.trips) || 1;

    // Distância total (ida e volta × viagens)
    const totalDistance = distance * 2 * trips;

    // Custo de combustível
    const litersNeeded = totalDistance / consumption;
    const fuelCost = litersNeeded * fuelPrice;

    // Custo de rodagem
    const roadCost = totalDistance * costPerKm;

    // Custo de pedágio
    const tollCost = toll * trips;

    return fuelCost + roadCost + tollCost;
}

/**
 * Aplica inflação sobre valor
 * @param {number} value - Valor base
 * @param {number} months - Meses até o evento
 * @param {number} monthlyRate - Taxa mensal (padrão 1% = 0.01)
 * @returns {number} Valor com inflação aplicada
 */
export function applyInflation(value, months = 0, monthlyRate = 0.01) {
    const baseValue = parseFloat(value) || 0;
    const monthsUntilEvent = parseFloat(months) || 0;
    const rate = parseFloat(monthlyRate) || 0.01;

    if (monthsUntilEvent <= 0) {
        return baseValue;
    }

    const inflationMultiplier = Math.pow(1 + rate, monthsUntilEvent);
    return baseValue * inflationMultiplier;
}

/**
 * Calcula multiplicador de inflação
 * @param {number} months - Meses até o evento
 * @param {number} monthlyRate - Taxa mensal
 * @returns {number} Multiplicador de inflação
 */
export function getInflationMultiplier(months = 0, monthlyRate = 0.01) {
    const monthsUntilEvent = parseFloat(months) || 0;
    const rate = parseFloat(monthlyRate) || 0.01;

    if (monthsUntilEvent <= 0) {
        return 1;
    }

    return Math.pow(1 + rate, monthsUntilEvent);
}

/**
 * Calcula markup sobre custo
 * @param {number} cost - Custo base
 * @param {number} markupPercent - Percentual de markup (ex: 50 para 50%)
 * @returns {number} Preço com markup
 */
export function applyMarkup(cost, markupPercent) {
    const baseCost = parseFloat(cost) || 0;
    const markup = parseFloat(markupPercent) || 0;

    if (markup <= 0) {
        return baseCost;
    }

    return baseCost * (1 + markup / 100);
}

/**
 * Calcula desconto sobre valor
 * @param {number} value - Valor base
 * @param {number} discountPercent - Percentual de desconto
 * @returns {number} Valor com desconto
 */
export function applyDiscount(value, discountPercent) {
    const baseValue = parseFloat(value) || 0;
    const discount = parseFloat(discountPercent) || 0;

    if (discount <= 0) {
        return baseValue;
    }

    if (discount >= 100) {
        return 0;
    }

    return baseValue * (1 - discount / 100);
}

/**
 * Calcula total do evento completo
 * @param {Object} eventData - Dados do evento
 * @returns {Object} Objeto com breakdown de custos
 */
export function calculateEventTotal(eventData = {}) {
    const itemsCost = parseFloat(eventData.itemsCost) || 0;
    const supportCost = calculateSupportCost(eventData.support);
    const laborCost = calculateLaborCost(eventData.labor);
    const transportCost = calculateTransportCost(eventData.transport);

    // Subtotal antes da inflação
    const subtotal = itemsCost + supportCost + laborCost + transportCost;

    // Aplicar inflação
    const months = parseFloat(eventData.monthsUntilEvent) || 0;
    const inflationMultiplier = getInflationMultiplier(months);
    const totalWithInflation = applyInflation(subtotal, months);

    // Aplicar markup se houver
    const markup = parseFloat(eventData.markup) || 0;
    const totalWithMarkup = applyMarkup(totalWithInflation, markup);

    // Aplicar desconto se houver
    const discount = parseFloat(eventData.discount) || 0;
    const finalTotal = applyDiscount(totalWithMarkup, discount);

    return {
        itemsCost,
        supportCost,
        laborCost,
        transportCost,
        subtotal,
        inflationMultiplier,
        inflationAmount: totalWithInflation - subtotal,
        totalWithInflation,
        markupAmount: totalWithMarkup - totalWithInflation,
        totalWithMarkup,
        discountAmount: totalWithMarkup - finalTotal,
        finalTotal
    };
}

/**
 * Valida se valor é número válido
 * @param {*} value - Valor a validar
 * @returns {boolean} True se é número válido
 */
export function isValidNumber(value) {
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
}

/**
 * Garante que valor é número válido
 * @param {*} value - Valor a converter
 * @param {number} defaultValue - Valor padrão
 * @returns {number} Número válido
 */
export function ensureNumber(value, defaultValue = 0) {
    const num = parseFloat(value);
    return isValidNumber(num) ? num : defaultValue;
}

/**
 * Calcula porcentagem
 * @param {number} part - Parte
 * @param {number} total - Total
 * @returns {number} Porcentagem
 */
export function calculatePercentage(part, total) {
    const partValue = parseFloat(part) || 0;
    const totalValue = parseFloat(total) || 0;

    if (totalValue <= 0) {
        return 0;
    }

    return (partValue / totalValue) * 100;
}

/**
 * Arredonda para 2 casas decimais
 * @param {number} value - Valor a arredondar
 * @returns {number} Valor arredondado
 */
export function roundTo2Decimals(value) {
    return Math.round((parseFloat(value) || 0) * 100) / 100;
}

/**
 * Arredonda para N casas decimais
 * @param {number} value - Valor a arredondar
 * @param {number} decimals - Número de casas decimais
 * @returns {number} Valor arredondado
 */
export function roundToDecimals(value, decimals = 2) {
    const multiplier = Math.pow(10, decimals);
    return Math.round((parseFloat(value) || 0) * multiplier) / multiplier;
}

/**
 * Detecta se um prato deve ser calculado por porções (não por peso)
 * REGRA: Se houver pelo menos 1 ingrediente por unidade, calcular por porções
 * @param {Object} dish - Prato com array de ingredients ou dishIngredients
 * @returns {boolean} True se deve calcular por porções
 */
export function isDishPortionBased(dish) {
    if (!dish) {
        return false;
    }

    // Aceitar tanto 'ingredients' (do prato) quanto 'dishIngredients' (do cardápio)
    const ingredientsList = dish.ingredients || dish.dishIngredients;

    if (!ingredientsList || !Array.isArray(ingredientsList)) {
        return false;
    }

    // Checar se existe pelo menos 1 ingrediente por unidade
    const hasUnitIngredient = ingredientsList.some(ing => {
        const unitType = ing.unitType || ing.unit;
        return unitType === 'unit' || unitType === 'un' || unitType === 'unidade';
    });

    console.log(`🔍 [isDishPortionBased] ${dish.dishName || dish.name}:`, {
        hasUnitIngredient,
        usedField: dish.ingredients ? 'ingredients' : 'dishIngredients',
        ingredients: ingredientsList.map(ing => ({
            name: ing.name || ing.ingredientName,
            unitType: ing.unitType || ing.unit
        }))
    });

    return hasUnitIngredient;
}

// Exportar todas as funções como objeto também
export default {
    calculateIngredientsCost,
    calculateCostPerServing,
    calculateCostPerGramMl,
    calculateIngredientCost,
    calculateSupportCost,
    calculateLaborCost,
    calculateTransportCost,
    applyInflation,
    getInflationMultiplier,
    applyMarkup,
    applyDiscount,
    calculateEventTotal,
    isValidNumber,
    ensureNumber,
    calculatePercentage,
    roundTo2Decimals,
    roundToDecimals,
    isDishPortionBased
};
