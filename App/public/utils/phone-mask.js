/**
 * phone-mask.js
 * Utilitário para aplicar máscara de telefone brasileiro
 * Formato: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */

/**
 * Aplica máscara de telefone brasileiro
 * @param {string} value - Valor do input (pode conter números e caracteres)
 * @returns {string} - Telefone formatado com máscara (XX) XXXXX-XXXX
 *
 * Exemplos:
 * - "11999887766" → "(11) 99988-7766"
 * - "1133445566" → "(11) 3344-5566"
 * - "(11) 99988-7766" → "(11) 99988-7766" (já formatado)
 */
export function applyPhoneMask(value) {
    if (!value) return '';

    // Remove tudo que não for número
    const numbers = value.replace(/\D/g, '');

    // Limita a 11 dígitos (DDD + número)
    const limitedNumbers = numbers.slice(0, 11);

    // Aplica a máscara baseado no tamanho
    if (limitedNumbers.length <= 2) {
        // Apenas DDD
        return limitedNumbers.replace(/(\d{1,2})/, '($1');
    } else if (limitedNumbers.length <= 6) {
        // DDD + primeiros dígitos
        return limitedNumbers.replace(/(\d{2})(\d{1,4})/, '($1) $2');
    } else if (limitedNumbers.length <= 10) {
        // Telefone fixo: (XX) XXXX-XXXX
        return limitedNumbers.replace(/(\d{2})(\d{4})(\d{1,4})/, '($1) $2-$3');
    } else {
        // Celular: (XX) XXXXX-XXXX
        return limitedNumbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
}

/**
 * Remove a máscara do telefone, retornando apenas os números
 * @param {string} value - Telefone formatado
 * @returns {string} - Apenas números
 *
 * Exemplo:
 * - "(11) 99988-7766" → "11999887766"
 */
export function removePhoneMask(value) {
    if (!value) return '';
    return value.replace(/\D/g, '');
}

/**
 * Valida se o telefone tem um formato válido
 * @param {string} value - Telefone (com ou sem máscara)
 * @returns {boolean} - true se válido
 *
 * Valida:
 * - Telefone fixo: 10 dígitos (XX) XXXX-XXXX
 * - Celular: 11 dígitos (XX) XXXXX-XXXX
 */
export function isValidPhone(value) {
    const numbers = removePhoneMask(value);
    return numbers.length === 10 || numbers.length === 11;
}

/**
 * Formata telefone para display (usado em tabelas, cards, etc.)
 * @param {string} value - Telefone (com ou sem máscara)
 * @returns {string} - Telefone formatado ou vazio se inválido
 */
export function formatPhoneDisplay(value) {
    if (!value) return '';
    const numbers = removePhoneMask(value);

    if (numbers.length === 10) {
        return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else if (numbers.length === 11) {
        return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }

    return value; // Retorna como está se não for válido
}

// Expor globalmente para uso em inline handlers
if (typeof window !== 'undefined') {
    window.applyPhoneMask = applyPhoneMask;
    window.removePhoneMask = removePhoneMask;
    window.isValidPhone = isValidPhone;
    window.formatPhoneDisplay = formatPhoneDisplay;
}
