/**
 * ===================================================================
 * LOSS CALCULATIONS - Cálculos de Perda/Desperdício
 * ===================================================================
 * Módulo centralizado para cálculos relacionados a perda de ingredientes
 *
 * CONCEITO FUNDAMENTAL:
 * - Perda é armazenada como DECIMAL (0.1 = 10%, 0.25 = 25%)
 * - Usamos CÁLCULO INVERSO: Se preciso de 100g líquido com 10% perda,
 *   devo COMPRAR 111.11g (100 / (1 - 0.1) = 111.11)
 * - O peso do prato mostra quantidade LÍQUIDA (após perda)
 * - O custo e lista de compras incluem a perda (quantidade a comprar)
 */

/**
 * Calcula quantidade a comprar aplicando perda INVERSA
 *
 * @param {number} liquidQuantity - Quantidade líquida/final desejada (após perda)
 * @param {number} lossPercent - Perda em decimal (0.1 = 10%, 0.25 = 25%)
 * @returns {number} Quantidade que deve ser comprada (antes da perda)
 *
 * @example
 * // Preciso de 100g líquido com 10% de perda
 * calculateQuantityWithLoss(100, 0.1) // => 111.11g (comprar)
 *
 * @example
 * // Preciso de 500g líquido com 25% de perda
 * calculateQuantityWithLoss(500, 0.25) // => 666.67g (comprar)
 */
export function calculateQuantityWithLoss(liquidQuantity, lossPercent) {
    const qty = parseFloat(liquidQuantity) || 0;
    const loss = parseFloat(lossPercent) || 0;

    // Se perda inválida ou zero, retornar quantidade original
    if (loss <= 0 || loss >= 1) {
        return qty;
    }

    // Fórmula inversa: quantidade_comprar = quantidade_liquida / (1 - perda)
    // Exemplo: 100g / (1 - 0.1) = 100 / 0.9 = 111.11g
    return qty / (1 - loss);
}

/**
 * Calcula custo considerando perda
 *
 * @param {number} liquidQuantity - Quantidade líquida necessária
 * @param {number} costPerUnit - Custo por unidade
 * @param {number} lossPercent - Perda em decimal (0.1 = 10%)
 * @returns {number} Custo total considerando perda
 *
 * @example
 * // 100g líquido, R$0.05/g, 10% perda
 * calculateCostWithLoss(100, 0.05, 0.1) // => R$5.56 (pago por 111.11g)
 */
export function calculateCostWithLoss(liquidQuantity, costPerUnit, lossPercent) {
    const quantityToBuy = calculateQuantityWithLoss(liquidQuantity, lossPercent);
    const cost = parseFloat(costPerUnit) || 0;

    return quantityToBuy * cost;
}

/**
 * Calcula quantidade líquida a partir da quantidade comprada (cálculo direto)
 *
 * @param {number} purchasedQuantity - Quantidade comprada (antes da perda)
 * @param {number} lossPercent - Perda em decimal (0.1 = 10%)
 * @returns {number} Quantidade líquida resultante (após perda)
 *
 * @example
 * // Comprei 111g com 10% de perda
 * calculateLiquidQuantity(111, 0.1) // => 99.9g (líquido)
 */
export function calculateLiquidQuantity(purchasedQuantity, lossPercent) {
    const qty = parseFloat(purchasedQuantity) || 0;
    const loss = parseFloat(lossPercent) || 0;

    if (loss <= 0 || loss >= 1) {
        return qty;
    }

    // Fórmula direta: quantidade_liquida = quantidade_comprada × (1 - perda)
    return qty * (1 - loss);
}

/**
 * Valida se o valor de perda está no range válido
 *
 * @param {number} loss - Perda em decimal
 * @returns {boolean} True se a perda é válida (0 <= loss < 1)
 *
 * @example
 * isValidLoss(0.1)   // => true  (10%)
 * isValidLoss(0.5)   // => true  (50%)
 * isValidLoss(0.99)  // => true  (99%)
 * isValidLoss(1)     // => false (100% - perda total)
 * isValidLoss(1.5)   // => false (150% - inválido)
 * isValidLoss(-0.1)  // => false (negativo - inválido)
 */
export function isValidLoss(loss) {
    const lossNum = parseFloat(loss);
    return !isNaN(lossNum) && lossNum >= 0 && lossNum < 1;
}

/**
 * Valida e normaliza valor de perda para garantir consistência
 * Se o valor estiver inválido, retorna 0 (sem perda)
 *
 * @param {number} loss - Perda em decimal ou percentual
 * @param {boolean} warnOnInvalid - Se deve exibir warning no console (padrão: true)
 * @returns {number} Perda normalizada (0 se inválida)
 *
 * @example
 * validateAndNormalizeLoss(0.1)    // => 0.1  (10% - válido)
 * validateAndNormalizeLoss(1)      // => 0    (100% - inválido, retorna 0)
 * validateAndNormalizeLoss(-0.1)   // => 0    (negativo - inválido)
 * validateAndNormalizeLoss('abc')  // => 0    (não numérico - inválido)
 */
export function validateAndNormalizeLoss(loss, warnOnInvalid = true) {
    const lossNum = parseFloat(loss);

    // Não é número
    if (isNaN(lossNum)) {
        if (warnOnInvalid) {
            console.warn(`⚠️ Perda inválida (não numérico): "${loss}". Usando 0.`);
        }
        return 0;
    }

    // Perda negativa
    if (lossNum < 0) {
        if (warnOnInvalid) {
            console.warn(`⚠️ Perda inválida (negativa): ${loss}. Usando 0.`);
        }
        return 0;
    }

    // Perda >= 100% (perda total ou mais)
    if (lossNum >= 1) {
        if (warnOnInvalid) {
            console.warn(`⚠️ Perda inválida (>= 100%): ${(lossNum * 100).toFixed(0)}%. Perda deve ser < 1. Usando 0.`);
        }
        return 0;
    }

    return lossNum;
}

/**
 * Converte perda de percentual para decimal
 *
 * @param {number} percentValue - Perda em percentual (10 = 10%)
 * @returns {number} Perda em decimal (0.1)
 *
 * @example
 * percentToDecimal(10)  // => 0.1
 * percentToDecimal(25)  // => 0.25
 * percentToDecimal(0.1) // => 0.001 (assume que já era percentual)
 */
export function percentToDecimal(percentValue) {
    const value = parseFloat(percentValue) || 0;
    return value / 100;
}

/**
 * Converte perda de decimal para percentual
 *
 * @param {number} decimalValue - Perda em decimal (0.1)
 * @returns {number} Perda em percentual (10)
 *
 * @example
 * decimalToPercent(0.1)  // => 10
 * decimalToPercent(0.25) // => 25
 */
export function decimalToPercent(decimalValue) {
    const value = parseFloat(decimalValue) || 0;
    return value * 100;
}

/**
 * Formata perda para exibição
 *
 * @param {number} loss - Perda em decimal (0.1 = 10%)
 * @param {number} decimals - Casas decimais (padrão: 0)
 * @returns {string} Perda formatada com % (ex: "10%", "25.5%")
 *
 * @example
 * formatLoss(0.1)     // => "10%"
 * formatLoss(0.255, 1) // => "25.5%"
 * formatLoss(0, 0)    // => "0%"
 */
export function formatLoss(loss, decimals = 0) {
    const lossNum = parseFloat(loss) || 0;
    const percent = lossNum * 100;
    return `${percent.toFixed(decimals)}%`;
}

// Exportar como objeto padrão também
export default {
    calculateQuantityWithLoss,
    calculateCostWithLoss,
    calculateLiquidQuantity,
    isValidLoss,
    validateAndNormalizeLoss,
    percentToDecimal,
    decimalToPercent,
    formatLoss
};
