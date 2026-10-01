/**
 * ===================================================================
 * UNIT CONVERSIONS - Conversão de Unidades
 * ===================================================================
 * Módulo centralizado para conversão entre diferentes unidades de medida
 * Usado para ingredientes e quantidades em receitas
 */

/**
 * Converte quantidade para gramas/ml (unidade base)
 * Assume densidade 1 para líquidos (1ml = 1g)
 *
 * @param {number} quantity - Quantidade a converter
 * @param {string} unit - Unidade de origem (kg, g, L, ml, un, unidade, unit)
 * @returns {number} Quantidade em gramas/ml
 *
 * @example
 * convertToGrams(1, 'kg')      // => 1000 (1kg = 1000g)
 * convertToGrams(500, 'g')     // => 500  (já está em gramas)
 * convertToGrams(1.5, 'L')     // => 1500 (1.5L = 1500ml)
 * convertToGrams(250, 'ml')    // => 250  (ml ≈ g para densidade 1)
 * convertToGrams(2, 'un')      // => 0    (unidades não têm peso definido)
 */
export function convertToGrams(quantity, unit) {
    const qty = parseFloat(quantity) || 0;
    const unitLower = (unit || '').toLowerCase().trim();

    // Mapa de conversões
    const conversions = {
        // Peso sólido
        'kg': qty * 1000,
        'g': qty,
        'gram': qty,
        'grama': qty,
        'gramas': qty,

        // Volume líquido (densidade 1: 1ml = 1g)
        'l': qty * 1000,
        'litro': qty * 1000,
        'litros': qty * 1000,
        'ml': qty,
        'mililitro': qty,
        'mililitros': qty,

        // Unidades (não têm peso definido)
        'un': 0,
        'unidade': 0,
        'unidades': 0,
        'unit': 0,
        'units': 0,
        'u': 0
    };

    // Retorna conversão ou assume gramas se não encontrado
    return conversions[unitLower] !== undefined ? conversions[unitLower] : qty;
}

/**
 * Converte gramas para outra unidade
 *
 * @param {number} grams - Quantidade em gramas
 * @param {string} targetUnit - Unidade de destino (kg, g, L, ml)
 * @returns {number} Quantidade na unidade de destino
 *
 * @example
 * convertFromGrams(1000, 'kg')  // => 1    (1000g = 1kg)
 * convertFromGrams(500, 'g')    // => 500  (já está em gramas)
 * convertFromGrams(1500, 'L')   // => 1.5  (1500ml = 1.5L)
 */
export function convertFromGrams(grams, targetUnit) {
    const g = parseFloat(grams) || 0;
    const unitLower = (targetUnit || '').toLowerCase().trim();

    const conversions = {
        'kg': g / 1000,
        'g': g,
        'l': g / 1000,  // Assume densidade 1
        'ml': g
    };

    return conversions[unitLower] !== undefined ? conversions[unitLower] : g;
}

/**
 * Converte entre duas unidades quaisquer
 *
 * @param {number} quantity - Quantidade a converter
 * @param {string} fromUnit - Unidade de origem
 * @param {string} toUnit - Unidade de destino
 * @returns {number} Quantidade convertida
 *
 * @example
 * convertUnit(1, 'kg', 'g')     // => 1000
 * convertUnit(2000, 'ml', 'L')  // => 2
 * convertUnit(500, 'g', 'kg')   // => 0.5
 */
export function convertUnit(quantity, fromUnit, toUnit) {
    // Se as unidades são iguais, não precisa converter
    if (fromUnit.toLowerCase() === toUnit.toLowerCase()) {
        return parseFloat(quantity) || 0;
    }

    // Converter para gramas primeiro, depois para unidade de destino
    const inGrams = convertToGrams(quantity, fromUnit);
    return convertFromGrams(inGrams, toUnit);
}

/**
 * Formata peso para exibição legível (automático entre g e kg)
 *
 * @param {number} grams - Peso em gramas
 * @param {number} decimals - Casas decimais (padrão: 2 para kg, 0 para g)
 * @returns {string} Peso formatado (ex: "500 g", "1.25 kg")
 *
 * @example
 * formatWeight(500)     // => "500 g"
 * formatWeight(1000)    // => "1.00 kg"
 * formatWeight(1250)    // => "1.25 kg"
 * formatWeight(50)      // => "50 g"
 */
export function formatWeight(grams, decimals = null) {
    const g = parseFloat(grams) || 0;

    if (g >= 1000) {
        const kg = g / 1000;
        const dec = decimals !== null ? decimals : 2;
        return `${kg.toFixed(dec)} kg`;
    }

    const dec = decimals !== null ? decimals : 0;
    return `${g.toFixed(dec)} g`;
}

/**
 * Formata volume para exibição legível (automático entre ml e L)
 *
 * @param {number} milliliters - Volume em ml
 * @param {number} decimals - Casas decimais (padrão: 2 para L, 0 para ml)
 * @returns {string} Volume formatado (ex: "500 ml", "1.25 L")
 *
 * @example
 * formatVolume(500)    // => "500 ml"
 * formatVolume(1000)   // => "1.00 L"
 * formatVolume(1500)   // => "1.50 L"
 */
export function formatVolume(milliliters, decimals = null) {
    const ml = parseFloat(milliliters) || 0;

    if (ml >= 1000) {
        const liters = ml / 1000;
        const dec = decimals !== null ? decimals : 2;
        return `${liters.toFixed(dec)} L`;
    }

    const dec = decimals !== null ? decimals : 0;
    return `${ml.toFixed(dec)} ml`;
}

/**
 * Formata quantidade genérica (detecta tipo automaticamente)
 *
 * @param {number} quantity - Quantidade
 * @param {string} unit - Unidade
 * @returns {string} Quantidade formatada com unidade
 *
 * @example
 * formatQuantity(1500, 'g')   // => "1.50 kg"
 * formatQuantity(500, 'ml')   // => "500 ml"
 * formatQuantity(2, 'un')     // => "2 un"
 */
export function formatQuantity(quantity, unit) {
    const qty = parseFloat(quantity) || 0;
    const unitLower = (unit || '').toLowerCase().trim();

    // Se for peso, usar formatWeight
    if (['g', 'kg', 'gram', 'grama', 'gramas'].includes(unitLower)) {
        const grams = convertToGrams(qty, unit);
        return formatWeight(grams);
    }

    // Se for volume, usar formatVolume
    if (['ml', 'l', 'litro', 'litros', 'mililitro', 'mililitros'].includes(unitLower)) {
        const ml = convertToGrams(qty, unit); // Assume densidade 1
        return formatVolume(ml);
    }

    // Unidades ou outros
    return `${qty} ${unit}`;
}

/**
 * Arredonda quantidade para múltiplo prático de compra
 * Útil para lista de compras (arredondar para kg/L completos)
 *
 * @param {number} grams - Quantidade em gramas
 * @param {string} roundTo - Arredondar para: 'kg', 'half-kg', '100g' (padrão: 'kg')
 * @returns {number} Quantidade arredondada em gramas
 *
 * @example
 * roundForPurchase(1200, 'kg')       // => 2000 (arredonda para 2kg)
 * roundForPurchase(1200, 'half-kg')  // => 1500 (arredonda para 1.5kg)
 * roundForPurchase(250, '100g')      // => 300  (arredonda para 300g)
 */
export function roundForPurchase(grams, roundTo = 'kg') {
    const g = parseFloat(grams) || 0;

    switch (roundTo) {
        case 'kg':
            // Arredonda para kg completo (1000g)
            return Math.ceil(g / 1000) * 1000;

        case 'half-kg':
            // Arredonda para meio kg (500g)
            return Math.ceil(g / 500) * 500;

        case '100g':
            // Arredonda para 100g
            return Math.ceil(g / 100) * 100;

        case '50g':
            // Arredonda para 50g
            return Math.ceil(g / 50) * 50;

        default:
            return Math.ceil(g);
    }
}

/**
 * Normaliza nome de unidade para formato padrão
 *
 * @param {string} unit - Unidade em qualquer formato
 * @returns {string} Unidade normalizada (kg, g, L, ml, un)
 *
 * @example
 * normalizeUnit('QUILOGRAMA')  // => 'kg'
 * normalizeUnit('litros')      // => 'L'
 * normalizeUnit('GRAMAS')      // => 'g'
 * normalizeUnit('unidade')     // => 'un'
 */
export function normalizeUnit(unit) {
    const unitLower = (unit || '').toLowerCase().trim();

    const unitMap = {
        // Peso
        'kg': 'kg',
        'quilograma': 'kg',
        'quilogramas': 'kg',
        'kilo': 'kg',
        'kilos': 'kg',

        'g': 'g',
        'grama': 'g',
        'gramas': 'g',
        'gram': 'g',

        // Volume
        'l': 'L',
        'litro': 'L',
        'litros': 'L',
        'liter': 'L',
        'liters': 'L',

        'ml': 'ml',
        'mililitro': 'ml',
        'mililitros': 'ml',
        'milliliter': 'ml',
        'milliliters': 'ml',

        // Unidade
        'un': 'un',
        'unidade': 'un',
        'unidades': 'un',
        'unit': 'un',
        'units': 'un',
        'u': 'un'
    };

    return unitMap[unitLower] || unit;
}

/**
 * Verifica se uma unidade é de peso
 *
 * @param {string} unit - Unidade a verificar
 * @returns {boolean} True se for unidade de peso
 */
export function isWeightUnit(unit) {
    const unitLower = (unit || '').toLowerCase().trim();
    return ['kg', 'g', 'gram', 'grama', 'gramas', 'quilograma', 'quilogramas'].includes(unitLower);
}

/**
 * Verifica se uma unidade é de volume
 *
 * @param {string} unit - Unidade a verificar
 * @returns {boolean} True se for unidade de volume
 */
export function isVolumeUnit(unit) {
    const unitLower = (unit || '').toLowerCase().trim();
    return ['l', 'ml', 'litro', 'litros', 'mililitro', 'mililitros'].includes(unitLower);
}

// Exportar como objeto padrão também
export default {
    convertToGrams,
    convertFromGrams,
    convertUnit,
    formatWeight,
    formatVolume,
    formatQuantity,
    roundForPurchase,
    normalizeUnit,
    isWeightUnit,
    isVolumeUnit
};
