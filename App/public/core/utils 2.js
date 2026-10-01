/**
 * ===================================================================
 * UTILS - Funções Utilitárias
 * ===================================================================
 * Funções auxiliares e utilitárias gerais
 */

/**
 * Agrupa itens por categoria
 * @param {Array} items - Array de itens
 * @returns {Object} Objeto com itens agrupados por categoria
 */
export function groupByCategory(items) {
    return items.reduce((groups, item) => {
        const category = item.category || 'Sem categoria';
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(item);
        return groups;
    }, {});
}

/**
 * Calcula estatísticas por categoria
 * @param {Array} items - Array de itens calculados
 * @returns {Object} Estatísticas por categoria
 */
export function calculateCategoryStats(items) {
    const grouped = groupByCategory(items);
    const stats = {};

    for (const [category, categoryItems] of Object.entries(grouped)) {
        const activeItems = categoryItems.filter(item => item.active);
        const total = activeItems.reduce((sum, item) => sum + (item.total || 0), 0);

        stats[category] = {
            total,
            items: categoryItems.length,
            active: activeItems.length
        };
    }

    return stats;
}

/**
 * Retorna IDs de ingredientes em uso
 * @param {Array} items - Array de itens do evento
 * @returns {Set} Set de IDs em uso
 */
export function getIngredientsInUse(items) {
    return new Set(items.map(item => item.ingredientId));
}

/**
 * Debounce de função
 * @param {Function} func - Função a debounce
 * @param {number} wait - Tempo de espera em ms
 * @returns {Function} Função com debounce
 */
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Cria cópia profunda de objeto
 * @param {Object} obj - Objeto a copiar
 * @returns {Object} Cópia do objeto
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Gera ID único simples
 * @returns {string} ID único
 */
export function generateId() {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Formata nome para slug (URL-friendly)
 * @param {string} text - Texto a formatar
 * @returns {string} Slug
 */
export function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

/**
 * Ordena array de objetos por campo
 * @param {Array} array - Array a ordenar
 * @param {string} field - Campo para ordenação
 * @param {string} order - 'asc' ou 'desc'
 * @returns {Array} Array ordenado
 */
export function sortBy(array, field, order = 'asc') {
    return [...array].sort((a, b) => {
        const valueA = a[field];
        const valueB = b[field];

        if (valueA < valueB) return order === 'asc' ? -1 : 1;
        if (valueA > valueB) return order === 'asc' ? 1 : -1;
        return 0;
    });
}

/**
 * Filtra array por texto de busca
 * @param {Array} array - Array a filtrar
 * @param {string} searchText - Texto de busca
 * @param {Array} fields - Campos a buscar
 * @returns {Array} Array filtrado
 */
export function searchInFields(array, searchText, fields) {
    if (!searchText || searchText.trim() === '') {
        return array;
    }

    const search = searchText.toLowerCase().trim();

    return array.filter(item => {
        return fields.some(field => {
            const value = item[field];
            if (!value) return false;
            return value.toString().toLowerCase().includes(search);
        });
    });
}

/**
 * Converte unidade de medida
 * @param {number} value - Valor a converter
 * @param {string} fromUnit - Unidade de origem
 * @param {string} toUnit - Unidade de destino
 * @returns {number} Valor convertido
 */
export function convertUnit(value, fromUnit, toUnit) {
    const conversions = {
        'kg_g': 1000,
        'g_kg': 0.001,
        'L_ml': 1000,
        'ml_L': 0.001
    };

    const key = `${fromUnit}_${toUnit}`;
    const factor = conversions[key];

    if (factor === undefined) {
        console.warn(`Conversão ${fromUnit} → ${toUnit} não disponível`);
        return value;
    }

    return value * factor;
}

/**
 * Valida se é número válido
 * @param {*} value - Valor a validar
 * @returns {boolean} Se é número válido
 */
export function isValidNumber(value) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Converte valor de input para número, permitindo vazio
 * Resolve o problema de campos numéricos que ficam com zero ao apagar
 * @param {string} value - Valor do input (e.target.value)
 * @param {number} defaultValue - Valor padrão quando campo vazio (default: 0)
 * @returns {number|string} Número parseado ou string vazia
 */
export function parseNumberInput(value, defaultValue = 0) {
    // Se está vazio ou apenas espaços, retorna default
    if (value === '' || value === null || value === undefined) {
        return defaultValue;
    }

    // Se é string com apenas espaços
    if (typeof value === 'string' && value.trim() === '') {
        return defaultValue;
    }

    // Tentar converter para número
    const parsed = parseFloat(value);

    // Se não é número válido, retorna default
    if (isNaN(parsed) || !isFinite(parsed)) {
        return defaultValue;
    }

    return parsed;
}

/**
 * Handler para onChange de inputs numéricos que permite campo vazio
 * @param {string} value - Valor do input
 * @returns {number|string} Número ou string vazia (para permitir deletar)
 */
export function handleNumberInput(value) {
    // Se campo vazio, retorna string vazia (permite deletar)
    if (value === '' || value === null || value === undefined) {
        return '';
    }

    // Se é string com apenas espaços, retorna string vazia
    if (typeof value === 'string' && value.trim() === '') {
        return '';
    }

    // Tentar converter para número
    const parsed = parseFloat(value);

    // Se não é número válido, retorna string vazia
    if (isNaN(parsed) || !isFinite(parsed)) {
        return '';
    }

    return parsed;
}

/**
 * Arredonda para N casas decimais
 * @param {number} value - Valor a arredondar
 * @param {number} decimals - Número de casas decimais
 * @returns {number} Valor arredondado
 */
export function roundTo(value, decimals = 2) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}

/**
 * Calcula porcentagem
 * @param {number} part - Parte
 * @param {number} total - Total
 * @returns {number} Porcentagem (0-100)
 */
export function calculatePercentage(part, total) {
    if (total === 0) return 0;
    return (part / total) * 100;
}

/**
 * Retorna texto truncado com reticências
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Comprimento máximo
 * @returns {string} Texto truncado
 */
export function truncate(text, maxLength = 50) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Remove acentos de string
 * @param {string} text - Texto com acentos
 * @returns {string} Texto sem acentos
 */
export function removeAccents(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Compara strings ignorando acentos e case
 * @param {string} str1 - String 1
 * @param {string} str2 - String 2
 * @returns {boolean} Se são iguais
 */
export function compareStrings(str1, str2) {
    const normalize = (str) => removeAccents(str).toLowerCase().trim();
    return normalize(str1) === normalize(str2);
}

/**
 * Retorna valor padrão se valor for null/undefined
 * @param {*} value - Valor a verificar
 * @param {*} defaultValue - Valor padrão
 * @returns {*} Valor ou padrão
 */
export function getOrDefault(value, defaultValue) {
    return value !== null && value !== undefined ? value : defaultValue;
}

/**
 * Formata número de telefone brasileiro
 * @param {string} phone - Telefone
 * @returns {string} Telefone formatado
 */
export function formatPhoneBR(phone) {
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length === 11) {
        return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }

    if (cleaned.length === 10) {
        return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }

    return phone;
}

/**
 * Formata CPF/CNPJ
 * @param {string} doc - Documento
 * @returns {string} Documento formatado
 */
export function formatDocument(doc) {
    const cleaned = doc.replace(/\D/g, '');

    // CPF
    if (cleaned.length === 11) {
        return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    // CNPJ
    if (cleaned.length === 14) {
        return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }

    return doc;
}
