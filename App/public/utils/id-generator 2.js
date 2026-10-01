/**
 * ===================================================================
 * ID GENERATOR - Geração Centralizada de IDs Únicos
 * ===================================================================
 *
 * Centraliza lógica de geração de IDs que estava duplicada em todos os managers.
 * Garante unicidade e padrão consistente.
 *
 * BENEFÍCIOS:
 * - Elimina código duplicado (~30 linhas em cada manager)
 * - Padrão consistente de IDs em toda aplicação
 * - Fácil de estender (UUIDs, nanoid, etc)
 * - Testável isoladamente
 */

/**
 * Gera ID único com timestamp + random
 * @param {string} prefix - Prefixo do ID (ex: 'dish', 'proposal', 'menu')
 * @returns {string} ID único (ex: 'dish_1697311234567_a3f9k2')
 *
 * @example
 * generateId('dish')      // 'dish_1697311234567_a3f9k2'
 * generateId('proposal')  // 'proposal_1697311234567_x7y2m9'
 */
export function generateId(prefix = 'item') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${prefix}_${timestamp}_${random}`;
}

/**
 * Gera número de proposta formatado (PROP-YYYY-NNN)
 * @param {number} sequentialNumber - Número sequencial (ex: 1, 2, 3...)
 * @returns {string} Número formatado (ex: 'PROP-2025-001')
 *
 * @example
 * generateProposalNumber(1)   // 'PROP-2025-001'
 * generateProposalNumber(42)  // 'PROP-2025-042'
 */
export function generateProposalNumber(sequentialNumber = 1) {
    const year = new Date().getFullYear();
    const paddedNumber = String(sequentialNumber).padStart(3, '0');
    return `PROP-${year}-${paddedNumber}`;
}

/**
 * Gera número de pedido formatado (ORD-YYYY-NNN)
 * @param {number} sequentialNumber - Número sequencial
 * @returns {string} Número formatado (ex: 'ORD-2025-001')
 */
export function generateOrderNumber(sequentialNumber = 1) {
    const year = new Date().getFullYear();
    const paddedNumber = String(sequentialNumber).padStart(3, '0');
    return `ORD-${year}-${paddedNumber}`;
}

/**
 * Gera código alfanumérico curto (para compartilhamento, etc)
 * @param {number} length - Tamanho do código (padrão: 6)
 * @returns {string} Código alfanumérico (ex: 'A3F9K2')
 *
 * @example
 * generateShortCode()     // 'A3F9K2'
 * generateShortCode(8)    // 'X7Y2M9P4'
 */
export function generateShortCode(length = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Remove ambíguos (0,O,1,I)
    let code = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        code += chars[randomIndex];
    }

    return code;
}

/**
 * Gera UUID v4 simples (sem dependências externas)
 * Menos colisão que timestamp+random, mas mais pesado
 * @returns {string} UUID v4 (ex: '550e8400-e29b-41d4-a716-446655440000')
 */
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Extrai timestamp de um ID gerado
 * @param {string} id - ID gerado (ex: 'dish_1697311234567_a3f9k2')
 * @returns {number|null} Timestamp ou null se inválido
 *
 * @example
 * const id = generateId('dish');
 * const timestamp = extractTimestamp(id); // 1697311234567
 * const date = new Date(timestamp);
 */
export function extractTimestamp(id) {
    try {
        const parts = id.split('_');
        if (parts.length >= 2) {
            const timestamp = parseInt(parts[1], 10);
            return isNaN(timestamp) ? null : timestamp;
        }
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Verifica se um ID é válido
 * @param {string} id - ID a validar
 * @param {string} expectedPrefix - Prefixo esperado (opcional)
 * @returns {boolean} True se válido
 *
 * @example
 * isValidId('dish_1697311234567_a3f9k2')           // true
 * isValidId('dish_1697311234567_a3f9k2', 'dish')   // true
 * isValidId('invalid')                             // false
 */
export function isValidId(id, expectedPrefix = null) {
    if (!id || typeof id !== 'string') return false;

    const parts = id.split('_');

    // Deve ter 3 partes: prefix_timestamp_random
    if (parts.length !== 3) return false;

    const [prefix, timestamp, random] = parts;

    // Validar prefixo se especificado
    if (expectedPrefix && prefix !== expectedPrefix) return false;

    // Validar timestamp (número válido)
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts) || ts <= 0) return false;

    // Validar random (não vazio)
    if (!random || random.length === 0) return false;

    return true;
}

/**
 * Exporta todas as funções como objeto também (compatibilidade)
 */
export default {
    generateId,
    generateProposalNumber,
    generateOrderNumber,
    generateShortCode,
    generateUUID,
    extractTimestamp,
    isValidId
};

// Expor no window para compatibilidade com código legado
if (typeof window !== 'undefined') {
    window.IdGenerator = {
        generateId,
        generateProposalNumber,
        generateOrderNumber,
        generateShortCode,
        generateUUID,
        extractTimestamp,
        isValidId
    };
}
