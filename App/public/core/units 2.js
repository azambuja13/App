/**
 * ===================================================================
 * UNITS - Módulo de Conversão de Unidades
 * ===================================================================
 * Centraliza lógica de conversão entre unidades de medida
 * (kg, g, L, ml, etc.)
 */

/**
 * Tabela de conversão para gramas
 * Todas as conversões são feitas tendo gramas como base
 */
export const UNIT_CONVERSIONS = {
    // Peso
    'kg': 1000,      // 1 kg = 1000 g
    'g': 1,          // 1 g = 1 g
    'mg': 0.001,     // 1 mg = 0.001 g
    'lb': 453.592,   // 1 lb = 453.592 g
    'oz': 28.3495,   // 1 oz = 28.3495 g

    // Volume (considerando densidade da água: 1g/ml)
    'L': 1000,       // 1 L = 1000 ml ≈ 1000 g
    'ml': 1,         // 1 ml ≈ 1 g
    'cl': 10,        // 1 cl = 10 ml
    'dl': 100,       // 1 dl = 100 ml

    // Unidades culinárias (aproximadas)
    'xícara': 240,   // 1 xícara ≈ 240 ml
    'colher_sopa': 15,     // 1 colher de sopa ≈ 15 ml
    'colher_cha': 5,       // 1 colher de chá ≈ 5 ml
    'copo': 200,     // 1 copo ≈ 200 ml

    // Unidades
    'un': 1,         // Unidade genérica
    'unidade': 1,
    'pct': 1,        // Pacote
    'pacote': 1,
    'caixa': 1
};

/**
 * Unidades de peso
 */
export const WEIGHT_UNITS = ['kg', 'g', 'mg', 'lb', 'oz'];

/**
 * Unidades de volume
 */
export const VOLUME_UNITS = ['L', 'ml', 'cl', 'dl', 'xícara', 'colher_sopa', 'colher_cha', 'copo'];

/**
 * Unidades culinárias
 */
export const CULINARY_UNITS = ['xícara', 'colher_sopa', 'colher_cha', 'copo'];

/**
 * Unidades discretas (não conversíveis)
 */
export const DISCRETE_UNITS = ['un', 'unidade', 'pct', 'pacote', 'caixa'];

/**
 * Todas as unidades disponíveis
 */
export const ALL_UNITS = Object.keys(UNIT_CONVERSIONS);

/**
 * Converte valor de uma unidade para gramas
 * @param {number} value - Valor a converter
 * @param {string} fromUnit - Unidade de origem
 * @returns {number} Valor em gramas
 */
export function convertToGrams(value, fromUnit) {
    const val = parseFloat(value) || 0;
    const unit = String(fromUnit).toLowerCase().trim();

    const factor = UNIT_CONVERSIONS[unit];

    if (factor === undefined) {
        console.warn(`[Units] Unidade desconhecida: "${fromUnit}". Usando valor direto.`);
        return val;
    }

    return val * factor;
}

/**
 * Converte valor de gramas para outra unidade
 * @param {number} grams - Valor em gramas
 * @param {string} toUnit - Unidade de destino
 * @returns {number} Valor na unidade de destino
 */
export function convertFromGrams(grams, toUnit) {
    const val = parseFloat(grams) || 0;
    const unit = String(toUnit).toLowerCase().trim();

    const factor = UNIT_CONVERSIONS[unit];

    if (factor === undefined) {
        console.warn(`[Units] Unidade desconhecida: "${toUnit}". Usando valor direto.`);
        return val;
    }

    return val / factor;
}

/**
 * Converte valor entre duas unidades
 * @param {number} value - Valor a converter
 * @param {string} fromUnit - Unidade de origem
 * @param {string} toUnit - Unidade de destino
 * @returns {number} Valor convertido
 */
export function convertUnit(value, fromUnit, toUnit) {
    const from = String(fromUnit).toLowerCase().trim();
    const to = String(toUnit).toLowerCase().trim();

    // Se são a mesma unidade, retornar valor direto
    if (from === to) {
        return parseFloat(value) || 0;
    }

    // Converter para gramas primeiro, depois para unidade de destino
    const inGrams = convertToGrams(value, from);
    return convertFromGrams(inGrams, to);
}

/**
 * Verifica se unidade é de peso
 * @param {string} unit - Unidade a verificar
 * @returns {boolean} True se é unidade de peso
 */
export function isWeightUnit(unit) {
    const u = String(unit).toLowerCase().trim();
    return WEIGHT_UNITS.includes(u);
}

/**
 * Verifica se unidade é de volume
 * @param {string} unit - Unidade a verificar
 * @returns {boolean} True se é unidade de volume
 */
export function isVolumeUnit(unit) {
    const u = String(unit).toLowerCase().trim();
    return VOLUME_UNITS.includes(u);
}

/**
 * Verifica se unidade é culinária
 * @param {string} unit - Unidade a verificar
 * @returns {boolean} True se é unidade culinária
 */
export function isCulinaryUnit(unit) {
    const u = String(unit).toLowerCase().trim();
    return CULINARY_UNITS.includes(u);
}

/**
 * Verifica se unidade é discreta (não conversível)
 * @param {string} unit - Unidade a verificar
 * @returns {boolean} True se é unidade discreta
 */
export function isDiscreteUnit(unit) {
    const u = String(unit).toLowerCase().trim();
    return DISCRETE_UNITS.includes(u);
}

/**
 * Verifica se duas unidades são compatíveis para conversão
 * @param {string} unit1 - Primeira unidade
 * @param {string} unit2 - Segunda unidade
 * @returns {boolean} True se são compatíveis
 */
export function areUnitsCompatible(unit1, unit2) {
    const u1 = String(unit1).toLowerCase().trim();
    const u2 = String(unit2).toLowerCase().trim();

    // Se são a mesma, são compatíveis
    if (u1 === u2) return true;

    // Unidades discretas não são compatíveis com outras
    if (isDiscreteUnit(u1) || isDiscreteUnit(u2)) return false;

    // Ambas devem ser de peso OU ambas de volume
    const u1IsWeight = isWeightUnit(u1);
    const u2IsWeight = isWeightUnit(u2);
    const u1IsVolume = isVolumeUnit(u1);
    const u2IsVolume = isVolumeUnit(u2);

    return (u1IsWeight && u2IsWeight) || (u1IsVolume && u2IsVolume);
}

/**
 * Normaliza unidade para formato padrão
 * @param {string} unit - Unidade a normalizar
 * @returns {string} Unidade normalizada
 */
export function normalizeUnit(unit) {
    const u = String(unit).toLowerCase().trim();

    // Mapeamento de aliases
    const aliases = {
        'quilograma': 'kg',
        'quilo': 'kg',
        'kilograma': 'kg',
        'kilo': 'kg',
        'grama': 'g',
        'litro': 'L',
        'mililitro': 'ml',
        'mL': 'ml',
        'und': 'un',
        'und.': 'un',
        'pc': 'pct',
        'xic': 'xícara',
        'xicara': 'xícara',
        'col': 'colher_sopa',
        'col.': 'colher_sopa',
        'colher': 'colher_sopa',
        'cs': 'colher_sopa',
        'cc': 'colher_cha'
    };

    return aliases[u] || u;
}

/**
 * Formata valor com unidade
 * @param {number} value - Valor
 * @param {string} unit - Unidade
 * @param {number} decimals - Casas decimais
 * @returns {string} Valor formatado com unidade
 */
export function formatWithUnit(value, unit, decimals = 2) {
    const val = parseFloat(value) || 0;
    const u = normalizeUnit(unit);

    // Mapeamento de símbolos
    const symbols = {
        'kg': 'kg',
        'g': 'g',
        'mg': 'mg',
        'lb': 'lb',
        'oz': 'oz',
        'L': 'L',
        'ml': 'ml',
        'cl': 'cl',
        'dl': 'dl',
        'un': 'un',
        'unidade': 'un',
        'pct': 'pct',
        'pacote': 'pct',
        'caixa': 'cx',
        'xícara': 'xíc',
        'colher_sopa': 'c. sopa',
        'colher_cha': 'c. chá',
        'copo': 'copo'
    };

    const symbol = symbols[u] || u;
    const formatted = val.toFixed(decimals);

    return `${formatted} ${symbol}`;
}

/**
 * Converte para unidade mais apropriada
 * Por exemplo: 1500g -> 1.5kg
 * @param {number} value - Valor em gramas
 * @param {string} type - Tipo ('weight' ou 'volume')
 * @returns {Object} {value, unit}
 */
export function convertToAppropriateUnit(value, type = 'weight') {
    const val = parseFloat(value) || 0;

    if (type === 'weight') {
        if (val >= 1000) {
            return { value: val / 1000, unit: 'kg' };
        }
        return { value: val, unit: 'g' };
    }

    if (type === 'volume') {
        if (val >= 1000) {
            return { value: val / 1000, unit: 'L' };
        }
        return { value: val, unit: 'ml' };
    }

    return { value: val, unit: 'g' };
}

/**
 * Obtém descrição da unidade
 * @param {string} unit - Unidade
 * @returns {string} Descrição
 */
export function getUnitDescription(unit) {
    const u = normalizeUnit(unit);

    const descriptions = {
        'kg': 'Quilograma',
        'g': 'Grama',
        'mg': 'Miligrama',
        'lb': 'Libra',
        'oz': 'Onça',
        'L': 'Litro',
        'ml': 'Mililitro',
        'cl': 'Centilitro',
        'dl': 'Decilitro',
        'un': 'Unidade',
        'unidade': 'Unidade',
        'pct': 'Pacote',
        'pacote': 'Pacote',
        'caixa': 'Caixa',
        'xícara': 'Xícara',
        'colher_sopa': 'Colher de Sopa',
        'colher_cha': 'Colher de Chá',
        'copo': 'Copo'
    };

    return descriptions[u] || u;
}

// Exportar tudo como objeto também
export default {
    UNIT_CONVERSIONS,
    WEIGHT_UNITS,
    VOLUME_UNITS,
    CULINARY_UNITS,
    DISCRETE_UNITS,
    ALL_UNITS,
    convertToGrams,
    convertFromGrams,
    convertUnit,
    isWeightUnit,
    isVolumeUnit,
    isCulinaryUnit,
    isDiscreteUnit,
    areUnitsCompatible,
    normalizeUnit,
    formatWithUnit,
    convertToAppropriateUnit,
    getUnitDescription
};
