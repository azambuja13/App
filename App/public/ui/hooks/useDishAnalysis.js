(function() {
/**
 * useDishAnalysis.js
 * Hook otimizado para análise de pratos com memoização
 *
 * ✅ OTIMIZAÇÃO: Cacheia resultados de isDishPortionBased
 * ✅ PERFORMANCE: Evita cálculos repetidos do mesmo prato
 */

const { useMemo } = React;

/**
 * Hook otimizado para análise de pratos
 * @param {Object} dish - Prato a ser analisado
 * @returns {Object} Análise do prato com cache
 */
function useDishAnalysis(dish) {
    // ✅ OTIMIZAÇÃO: Memoizar análise baseado no ID e ingredientes
    const analysis = useMemo(() => {
        if (!dish) {
            return {
                isPortionBased: false,
                hasUnitIngredient: false,
                usedField: null,
                ingredients: []
            };
        }

        // Usar a função global isDishPortionBased
        const isDishPortionBasedFn = window.isDishPortionBased;

        if (!isDishPortionBasedFn) {
            console.warn('⚠️ [useDishAnalysis] isDishPortionBased não disponível');
            return {
                isPortionBased: false,
                hasUnitIngredient: false,
                usedField: dish.dishIngredients ? 'dishIngredients' : 'ingredients',
                ingredients: dish.dishIngredients || dish.ingredients || []
            };
        }

        // Executar análise UMA VEZ
        const result = isDishPortionBasedFn(dish);

        return result;
    }, [
        dish?.id,
        dish?.dishIngredients?.length,
        dish?.ingredients?.length,
        // Incluir hash dos ingredientes para detectar mudanças
        JSON.stringify(dish?.dishIngredients?.map(i => i.id || i.name)),
        JSON.stringify(dish?.ingredients?.map(i => i.id || i.name))
    ]);

    return analysis;
}

/**
 * Hook para múltiplos pratos (batch analysis)
 * @param {Array} dishes - Array de pratos
 * @returns {Map} Map com ID do prato => análise
 */
function useDishesAnalysis(dishes) {
    return useMemo(() => {
        if (!dishes || !Array.isArray(dishes)) {
            return new Map();
        }

        const isDishPortionBasedFn = window.isDishPortionBased;

        if (!isDishPortionBasedFn) {
            return new Map();
        }

        const analysisMap = new Map();

        dishes.forEach(dish => {
            if (dish && dish.id) {
                analysisMap.set(dish.id, isDishPortionBasedFn(dish));
            }
        });

        return analysisMap;
    }, [
        dishes?.length,
        // Hash dos IDs para detectar mudanças na lista
        dishes?.map(d => d.id).join(',')
    ]);
}

// Expor globalmente
if (typeof window !== 'undefined') {
    window.useDishAnalysis = useDishAnalysis;
    window.useDishesAnalysis = useDishesAnalysis;
}

// Log de carregamento
console.log('✅ useDishAnalysis hook carregado (otimizado com memoização)');

})();
