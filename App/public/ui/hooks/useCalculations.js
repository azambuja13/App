(function() {
/**
 * useCalculations.js
 * Hook customizado para cálculos automáticos do evento
 *
 * NOTA: Não usa import porque Babel tem problemas com ES6 modules em JSX.
 * Em vez disso, usa window.calculateItems carregado via init-managers.js
 * ou carregado manualmente.
 */

const { useMemo, useState, useEffect } = React;

/**
 * Calcula todos os custos do evento
 * NOTA: Definida aqui ao invés de importada para evitar problemas de scope com Babel
 */
function calculateEventCosts(data, ingredients) {
    // DEBUG: Verificar valor de guests
    if (!data.guests || data.guests === 0) {
        console.warn('⚠️ [calculateEventCosts] guests está zerado!', {
            guests: data.guests,
            items: data.items?.length || 0
        });
    }

    // Usar window.calculateItems (carregado via init-managers.js ou manualmente)
    if (!window.calculateItems) {
        console.error('❌ [calculateEventCosts] window.calculateItems não encontrado!');
        console.log('Carregue manualmente com: import("./core/calculator.js").then(m => window.calculateItems = m.calculateItems)');
        return {
            itemsCalculated: [],
            ingredientsCost: 0,
            subtotal: 0,
            supportCost: 0,
            laborCost: 0,
            transportCost: 0,
            totalCost: 0,
            pricePerPerson: 0,
            monthsUntilEvent: 0,
            inflationApplied: 0
        };
    }

    const itemsCalculated = window.calculateItems(data.items || [], ingredients, data.guests);

    const subtotal = itemsCalculated.reduce((sum, item) => sum + (item.total || 0), 0);

    // Usar módulo calculations para custos de apoio (funções diretas no window)
    const supportCost = window.calculateSupportCost
        ? window.calculateSupportCost(data.support || [], true)
        : (data.support || []).reduce((sum, item) => {
            if (item.active) {
                return sum + (item.quantity || 0) * (item.cost || 0);
            }
            return sum;
        }, 0);

    // Usar módulo calculations para custo de mão de obra
    const laborCost = window.calculateLaborCost
        ? window.calculateLaborCost(data.labor || {})
        : (data.labor?.hours || 0) * (data.labor?.rate || data.labor?.hourlyRate || 0);

    // Usar módulo calculations para custo de transporte
    const transportCost = window.calculateTransportCost
        ? window.calculateTransportCost(data.transport || {})
        : 0;

    // Subtotal sem inflação
    const subtotalBeforeInflation = subtotal + supportCost + laborCost + transportCost;

    // Usar módulo calculations para aplicar inflação
    const monthsUntilEvent = data.monthsUntilEvent || 0;
    const totalCost = window.applyInflation
        ? window.applyInflation(subtotalBeforeInflation, monthsUntilEvent, 0.01)
        : subtotalBeforeInflation * Math.pow(1.01, monthsUntilEvent);

    // Calcular multiplicador de inflação para log
    const inflationMultiplier = monthsUntilEvent > 0
        ? Math.pow(1.01, monthsUntilEvent)
        : 1;

    const result = {
        itemsCalculated,
        ingredientsCost: subtotal,  // Custo dos ingredientes (Itens do Evento)
        subtotal: subtotalBeforeInflation,
        supportCost: supportCost,
        laborCost: laborCost,
        transportCost: transportCost,
        totalCost: totalCost,
        pricePerPerson: data.guests > 0 ? totalCost / data.guests : 0,
        monthsUntilEvent: monthsUntilEvent,
        inflationApplied: totalCost - subtotalBeforeInflation
    };

    console.log('💰 Cálculo concluído:', {
        ingredientsCost: subtotal,
        supportCost,
        laborCost,
        transportCost,
        subtotal: subtotalBeforeInflation,
        monthsUntilEvent,
        inflationMultiplier: inflationMultiplier.toFixed(4),
        inflationApplied: (totalCost - subtotalBeforeInflation).toFixed(2),
        totalCost
    });

    return result;
};

/**
 * Hook para calcular automaticamente custos do evento
 * @param {Object} eventData - Dados do evento
 * @param {Array} ingredients - Base de ingredientes
 * @returns {Object|null} Custos calculados ou null
 */
function useCalculations(eventData, ingredients = []) {
    // Forçar re-render quando managers estiverem prontos
    const [managersReady, setManagersReady] = useState(!!window.managersReady);

    useEffect(() => {
        if (window.managersReady) {
            setManagersReady(true);
            return;
        }

        const handleReady = () => {
            console.log('✅ [useCalculations] Managers prontos, recalculando...');
            setManagersReady(true);
        };

        window.addEventListener('managers-ready', handleReady);
        return () => window.removeEventListener('managers-ready', handleReady);
    }, []);

    // ✅ OTIMIZAÇÃO: Criar hashes estáveis das dependências complexas
    const itemsHash = useMemo(() => {
        const items = eventData.items || [];
        return items.map(item => `${item.id || item.name}_${item.quantity}_${item.unit}`).join('|');
    }, [eventData.items]);

    const supportHash = useMemo(() => {
        const support = eventData.support || [];
        return support.map(s => `${s.name}_${s.quantity}_${s.cost}_${s.active}`).join('|');
    }, [eventData.support]);

    const ingredientsHash = useMemo(() => {
        if (!ingredients || !Array.isArray(ingredients)) return '';
        return ingredients.map(ing => `${ing.id}_${ing.price}_${ing.unit}`).join('|');
    }, [ingredients]);

    const costs = useMemo(() => {
        try {
            // Aguardar managers carregarem
            if (!managersReady || !window.calculateItems) {
                console.log('⏳ [useCalculations] Aguardando managers...');
                return {
                    itemsCalculated: [],
                    ingredientsCost: 0,
                    subtotal: 0,
                    supportCost: 0,
                    laborCost: 0,
                    transportCost: 0,
                    totalCost: 0,
                    pricePerPerson: 0,
                    monthsUntilEvent: 0,
                    inflationApplied: 0
                };
            }

            // ⚡ Performance: Log removido (executava em CADA cálculo de evento)

            // Sempre calcular, mesmo sem itens (para labor e transport)
            const calculated = calculateEventCosts(eventData, ingredients);

            // ⚡ Performance: Log removido (executava em CADA cálculo de evento)

            return calculated;
        } catch (error) {
            console.error('❌ [useCalculations] Erro ao calcular custos:', error);
            return null;
        }
    }, [
        managersReady,
        itemsHash,              // ✅ Usar hash ao invés de array
        supportHash,            // ✅ Usar hash ao invés de array
        eventData.labor?.hours,
        eventData.labor?.rate,
        eventData.transport?.active,
        eventData.transport?.distance,
        eventData.transport?.consumption,
        eventData.transport?.fuelPrice,
        eventData.transport?.costPerKm,
        eventData.transport?.toll,
        eventData.transport?.quantity,
        eventData.guests,
        eventData.monthsUntilEvent,
        ingredientsHash         // ✅ Usar hash ao invés de array
    ]);

    return costs;
}

// Expor no window para uso global
window.useCalculations = useCalculations;
window.calculateEventCosts = calculateEventCosts;

})();
