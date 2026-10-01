/**
 * Category Helper - Funções para normalização de categorias
 */

import { INGREDIENT_CATEGORIES, CATEGORY_MAPPING } from '../constants/index.js';

/**
 * Normaliza uma categoria antiga para a nova taxonomia
 * @param {string} oldCategory - Categoria antiga
 * @returns {string} Categoria normalizada
 */
export function normalizeCategory(oldCategory) {
    if (!oldCategory) return 'Outros';

    // Se já é uma categoria válida, retornar
    if (INGREDIENT_CATEGORIES.includes(oldCategory)) {
        return oldCategory;
    }

    // Tentar mapear de categoria antiga para nova
    if (CATEGORY_MAPPING[oldCategory]) {
        return CATEGORY_MAPPING[oldCategory];
    }

    // Tentar match parcial (case-insensitive)
    const lowerCategory = oldCategory.toLowerCase();

    // Proteínas
    if (lowerCategory.includes('carne') || lowerCategory.includes('boi') ||
        lowerCategory.includes('porco') || lowerCategory.includes('frango') ||
        lowerCategory.includes('peixe') || lowerCategory.includes('camarão') ||
        lowerCategory.includes('ovo')) {
        return 'Proteínas';
    }

    // Carboidratos
    if (lowerCategory.includes('pão') || lowerCategory.includes('massa') ||
        lowerCategory.includes('arroz') || lowerCategory.includes('batata') ||
        lowerCategory.includes('macarrão')) {
        return 'Carboidratos';
    }

    // Vegetais
    if (lowerCategory.includes('vegetal') || lowerCategory.includes('verdura') ||
        lowerCategory.includes('legume') || lowerCategory.includes('salada')) {
        return 'Vegetais';
    }

    // Laticínios
    if (lowerCategory.includes('queijo') || lowerCategory.includes('leite') ||
        lowerCategory.includes('iogurte') || lowerCategory.includes('manteiga') ||
        lowerCategory.includes('cream') || lowerCategory.includes('nata')) {
        return 'Laticínios';
    }

    // Gorduras
    if (lowerCategory.includes('óleo') || lowerCategory.includes('azeite') ||
        lowerCategory.includes('banha') || lowerCategory.includes('gordura')) {
        return 'Gorduras';
    }

    // Temperos
    if (lowerCategory.includes('tempero') || lowerCategory.includes('especiaria') ||
        lowerCategory.includes('condimento') || lowerCategory.includes('erva')) {
        return 'Temperos';
    }

    // Bebidas
    if (lowerCategory.includes('bebida') || lowerCategory.includes('suco') ||
        lowerCategory.includes('refrigerante') || lowerCategory.includes('cerveja') ||
        lowerCategory.includes('água')) {
        return 'Bebidas';
    }

    // Sobremesas
    if (lowerCategory.includes('sobremesa') || lowerCategory.includes('doce') ||
        lowerCategory.includes('fruta') || lowerCategory.includes('sorvete')) {
        return 'Sobremesas';
    }

    // Padrão
    return 'Outros';
}

/**
 * Normaliza categorias de um array de ingredientes
 * @param {Array} ingredients - Array de ingredientes
 * @returns {Array} Array com categorias normalizadas
 */
export function normalizeIngredientCategories(ingredients) {
    return ingredients.map(ingredient => ({
        ...ingredient,
        category: normalizeCategory(ingredient.category || ingredient.categoria)
    }));
}

/**
 * Agrupa ingredientes por categoria normalizada
 * @param {Array} ingredients - Array de ingredientes
 * @returns {Object} Ingredientes agrupados por categoria
 */
export function groupByCategory(ingredients) {
    const grouped = {};

    INGREDIENT_CATEGORIES.forEach(cat => {
        grouped[cat] = [];
    });

    ingredients.forEach(ingredient => {
        const category = normalizeCategory(ingredient.category || ingredient.categoria);
        if (grouped[category]) {
            grouped[category].push(ingredient);
        } else {
            grouped['Outros'].push(ingredient);
        }
    });

    // Remover categorias vazias
    Object.keys(grouped).forEach(key => {
        if (grouped[key].length === 0) {
            delete grouped[key];
        }
    });

    return grouped;
}

/**
 * Retorna estatísticas por categoria
 * @param {Array} ingredients - Array de ingredientes
 * @returns {Object} Estatísticas por categoria
 */
export function getCategoryStats(ingredients) {
    const stats = {};

    INGREDIENT_CATEGORIES.forEach(cat => {
        stats[cat] = {
            count: 0,
            withPrice: 0,
            totalCost: 0
        };
    });

    ingredients.forEach(ingredient => {
        const category = normalizeCategory(ingredient.category || ingredient.categoria);

        if (stats[category]) {
            stats[category].count++;

            if (ingredient.costPerUnit || ingredient.cost) {
                stats[category].withPrice++;
                stats[category].totalCost += (ingredient.costPerUnit || ingredient.cost || 0);
            }
        }
    });

    return stats;
}

// Expor para window (compatibilidade)
if (typeof window !== 'undefined') {
    window.normalizeCategory = normalizeCategory;
    window.normalizeIngredientCategories = normalizeIngredientCategories;
    window.groupByCategory = groupByCategory;
    window.getCategoryStats = getCategoryStats;
}
