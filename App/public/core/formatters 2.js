/**
 * ===================================================================
 * FORMATTERS - Funções de Formatação
 * ===================================================================
 * Funções utilitárias para formatação de valores (moeda, datas, etc)
 */

/**
 * Formata valor numérico para moeda brasileira (BRL)
 * @param {number} value - Valor a ser formatado
 * @returns {string} Valor formatado (ex: R$ 1.234,56)
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value || 0);
}

/**
 * Formata string de data para formato brasileiro
 * @param {string} dateString - Data no formato YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss
 * @returns {string} Data formatada (ex: 11/10/2025)
 */
function formatDate(dateString) {
    if (!dateString) return '';

    // Se já tem horário (contém 'T'), usar diretamente
    // Se não tem, adicionar T12:00:00 para evitar problemas de timezone
    const dateStr = dateString.includes('T') ? dateString : dateString + 'T12:00:00';
    const date = new Date(dateStr);

    return date.toLocaleDateString('pt-BR');
}

/**
 * Formata número para percentual
 * @param {number} value - Valor decimal (0-1)
 * @returns {string} Percentual formatado (ex: 15%)
 */
function formatPercent(value) {
    return `${(value * 100).toFixed(0)}%`;
}

/**
 * Formata número com separadores de milhares
 * @param {number} value - Valor numérico
 * @returns {string} Número formatado (ex: 1.234,56)
 */
function formatNumber(value) {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value || 0);
}

// Expor no window para uso com Babel
if (typeof window !== 'undefined') {
    window.formatCurrency = formatCurrency;
    window.formatDate = formatDate;
    window.formatPercent = formatPercent;
    window.formatNumber = formatNumber;
}
