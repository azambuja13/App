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
async function calculateEventCosts(data, ingredients) {
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
            subtotalWithMargin: 0,
            supportCost: 0,
            laborCost: 0,
            transportCost: 0,
            totalCost: 0,
            pricePerPerson: 0,
            monthsUntilEvent: 0,
            inflationApplied: 0,
            menuCostTotal: 0,
            menuPriceTotal: 0,
            menuPriceWithMargin: 0,
            menuCostWithoutMargin: 0,
            totalWithMargin: 0,
            menuMarginAmount: 0,
            hasActiveMenu: false
        };
    }

    // ✅ Buscar estatísticas do cardápio (com margem de lucro)
    let menuStats = { totalCost: 0, totalPrice: 0 };
    if (window.menuManager) {
        try {
            menuStats = await window.menuManager.getStatistics();
            console.log('📊 [useCalculations] MenuStats recebido:', menuStats);
        } catch (error) {
            console.warn('⚠️ Erro ao buscar stats do cardápio:', error);
        }
    } else {
        console.warn('⚠️ [useCalculations] window.menuManager não encontrado!');
    }

    // ✅ SEMPRE calcular os itens (para custo base E para exibir categorias)
    // Margem de segurança das proteínas: a do evento (se definida) ou a de Custos da empresa
    const proteinSafetyPct = window.PricingRules && window.PricingRules.proteinSafetyPct
        ? window.PricingRules.proteinSafetyPct(data.proteinSafetyPct) : 0;
    const itemsCalculated = window.calculateItems(data.items || [], ingredients, data.guests, { proteinSafetyPct: data.proteinSafetyPct });

    // Insumos do cliente (out/2026): o que o cliente compra sai do custo e do preço; entra a taxa de preparo
    const CS = window.ClientSupply;
    const cs = CS ? CS.normalizar(data.clientSupply) : { enabled: false };
    const doCliente = it => !!(CS && cs.enabled && CS.ingrediente(it.name || (it.ingredient && (it.ingredient.nome || it.ingredient.name)), it.category, data.clientSupply));
    itemsCalculated.forEach(it => { if (doCliente(it)) it.clientSupplied = true; else if (it.clientSupplied) delete it.clientSupplied; });
    const clientItemsCost = itemsCalculated.reduce((sum, item) => sum + (item.clientSupplied ? (item.total || 0) : 0), 0);

    // Custo dos itens do evento (para exibição por categorias) — sem o que o cliente compra
    const itemsEventCost = itemsCalculated.reduce((sum, item) => sum + (item.clientSupplied ? 0 : (item.total || 0)), 0);
    console.log(`📋 [useCalculations] Custo dos ITENS DO EVENTO: R$ ${itemsEventCost.toFixed(2)}`);

    // ✅ Verificar se tem cardápio ativo (para calcular margem)
    const hasActiveMenu = (menuStats.totalDishes || 0) > 0;

    // Usar módulo calculations para custos de apoio (funções diretas no window)
    const supportEmpresa = CS ? CS.filtrarApoio(data.support || [], data.clientSupply) : (data.support || []);
    const supportCost = window.calculateSupportCost
        ? window.calculateSupportCost(supportEmpresa, true)
        : supportEmpresa.reduce((sum, item) => {
            if (item.active) {
                return sum + (item.quantity || 0) * (item.cost || 0);
            }
            return sum;
        }, 0);

    // Usar módulo calculations para custo de mão de obra
    const laborCost = window.calculateLaborCost
        ? window.calculateLaborCost(data.labor || {})
        : (Array.isArray(data.labor?.team) && data.labor.team.length > 0
            ? data.labor.team.reduce((s, r) => s + (parseFloat(r.people) || 0) * (parseFloat(r.hours) || 0) * (parseFloat(r.rate) || 0) * (1 + (parseFloat(r.chargesPct) || 0) / 100), 0)
            : (data.labor?.hours || 0) * (data.labor?.rate || data.labor?.hourlyRate || 0));

    // Usar módulo calculations para custo de transporte
    const transportCost = window.calculateTransportCost
        ? window.calculateTransportCost(data.transport || {})
        : 0;

    // ✅ Custo dos ITENS DO EVENTO (custo real dos ingredientes)
    const ingredientsCost = itemsEventCost;

    // Parte do cardápio que o cliente compra (por pessoa): sai do custo e do preço dos pratos
    let clientMenu = { cost: 0, price: 0 }, clientProtein = { cost: 0, price: 0 };
    if (CS && cs.enabled && hasActiveMenu && window.PricingRules && window.PricingRules.menuShareBase && window.menuManager && window.menuManager.getActiveMenu) {
        try {
            const pratos = await window.menuManager.getActiveMenu();
            const pred = (ing, cat) => CS.ingrediente(ing.ingredientName || ing.name, cat, data.clientSupply);
            clientMenu = window.PricingRules.menuShareBase(pratos, ingredients, pred);
            clientProtein = window.PricingRules.menuShareBase(pratos, ingredients, (ing, cat) => window.PricingRules.isProteinCategory(cat) && pred(ing, cat));
        } catch (e) { console.warn('⚠️ [useCalculations] insumos do cliente no cardápio:', e); }
    }
    // Margem de segurança das proteínas no cardápio (por pessoa): parte de proteína × % (sem a carne do cliente)
    const menuSafetyCostPP = Math.max(0, (menuStats.proteinCost || 0) - clientProtein.cost) * proteinSafetyPct / 100;
    const menuSafetyPricePP = Math.max(0, (menuStats.proteinPrice || 0) - clientProtein.price) * proteinSafetyPct / 100;
    const menuCostPP = Math.max(0, (menuStats.totalCost || 0) - clientMenu.cost) + menuSafetyCostPP;
    const menuPricePP = Math.max(0, (menuStats.totalPrice || 0) - clientMenu.price) + menuSafetyPricePP;
    const prepFee = CS ? CS.taxa(data.clientSupply, data.guests) : 0;
    const itemsSafetyCost = itemsCalculated.reduce((sum, item) => sum + (item.safetyCost || 0), 0);

    // ✅ Custo do CARDÁPIO (sem margem de lucro, com a margem de segurança) × convidados
    const menuCostTotal = menuCostPP * (data.guests || 0);

    // ✅ Preço do CARDÁPIO (com margem) × convidados
    const menuPriceTotal = menuPricePP * (data.guests || 0);

    // ✅ Margem do cardápio = diferença entre preço e custo do CARDÁPIO
    const menuMarginAmount = menuPriceTotal - menuCostTotal;

    // Subtotal baseado nos ITENS DO EVENTO (custo real)
    const subtotalBeforeInflation = ingredientsCost + supportCost + laborCost + transportCost;

    // Subtotal com margem baseado no CARDÁPIO
    const subtotalWithMarginBeforeInflation = hasActiveMenu
        ? (menuPriceTotal + supportCost + laborCost + transportCost)
        : subtotalBeforeInflation;

    console.log(`✅ [useCalculations] Total ITENS DO EVENTO: R$ ${itemsEventCost.toFixed(2)}`);
    console.log(`✅ [useCalculations] Total CARDÁPIO (sem margem): R$ ${menuCostTotal.toFixed(2)}`);
    console.log(`✅ [useCalculations] Total CARDÁPIO (com margem): R$ ${menuPriceTotal.toFixed(2)}`);
    console.log(`✅ [useCalculations] Margem do cardápio: R$ ${menuMarginAmount.toFixed(2)}`)

    // Correção até o evento (out/2026): só sobre INSUMOS (comida e apoio).
    // Mão de obra e transporte não são corrigidos. Taxa mensal vem de "Custos da empresa" (padrão 1%).
    const monthsUntilEvent = data.monthsUntilEvent || 0;
    const monthlyRate = (window.PricingRules ? window.PricingRules.get().inflationMonthlyPct : 1) / 100;
    const inflationMultiplier = monthsUntilEvent > 0 ? Math.pow(1 + monthlyRate, monthsUntilEvent) : 1;
    const totalCost = (ingredientsCost + supportCost) * inflationMultiplier + laborCost + transportCost;
    const totalWithMargin = (hasActiveMenu
        ? (menuPriceTotal + supportCost) * inflationMultiplier + laborCost + transportCost
        : totalCost) + prepFee;

    const result = {
        itemsCalculated,
        ingredientsCost: ingredientsCost,  // ✅ Custo dos ITENS DO EVENTO (custo real)
        subtotal: subtotalBeforeInflation,
        subtotalWithMargin: subtotalWithMarginBeforeInflation,
        supportCost: supportCost,
        laborCost: laborCost,
        transportCost: transportCost,
        inflationMultiplier: inflationMultiplier,  // correção até o evento (comida e apoio)
        inflationMonthlyPct: monthlyRate * 100,
        totalCost: totalCost,  // ✅ Total baseado nos ITENS DO EVENTO
        pricePerPerson: data.guests > 0 ? totalCost / data.guests : 0,
        monthsUntilEvent: monthsUntilEvent,
        inflationApplied: totalCost - subtotalBeforeInflation,
        // ✅ Valores do CARDÁPIO (separados dos itens do evento)
        menuCostTotal: menuCostTotal,  // Total do cardápio SEM margem (custo × convidados)
        menuPriceTotal: menuPriceTotal,  // Total do cardápio COM margem (preço × convidados)
        menuPriceWithMargin: menuPricePP,  // Preço por pessoa COM margem
        menuCostWithoutMargin: menuCostPP,  // Custo por pessoa SEM margem
        proteinSafetyPct: proteinSafetyPct,  // % da margem de segurança das proteínas
        // Quanto a margem de segurança somou no custo da comida do evento (já incluído nos totais)
        proteinSafetyCost: hasActiveMenu ? menuSafetyCostPP * (data.guests || 0) : itemsSafetyCost,
        itemsSafetyCost: itemsSafetyCost,
        totalWithMargin: totalWithMargin,  // Total geral COM margem (cardápio + outros custos)
        menuMarginAmount: menuMarginAmount,  // Valor absoluto da margem
        hasActiveMenu: hasActiveMenu,  // ✅ Flag para saber se tem cardápio
        // Insumos do cliente: taxa de preparo (preço) e o que saiu do custo (informativo)
        clientSupplyOn: !!(CS && CS.ativo(data.clientSupply, data.support)),
        prepFee: prepFee,
        clientItemsCost: clientItemsCost,
        clientMenuCost: clientMenu.cost * (data.guests || 0),
        clientMenuPrice: clientMenu.price * (data.guests || 0),
        clientSupportCost: (data.support || []).reduce((t, i) => t + (CS && CS.apoio(i, data.clientSupply) && i.active ? (parseFloat(i.cost) || 0) * (parseFloat(i.quantity) || 0) : 0), 0)
    };

    console.log('💰 Cálculo concluído:', {
        fonte: hasActiveMenu ? 'CARDÁPIO' : 'ITENS DO EVENTO',
        totalDishes: menuStats.totalDishes || 0,
        menuCostPerPerson: menuStats.totalCost || 0,
        menuPricePerPerson: menuStats.totalPrice || 0,
        ingredientsCost: ingredientsCost,
        supportCost,
        laborCost,
        transportCost,
        subtotalSemMargem: subtotalBeforeInflation,
        menuMarginAmount,
        subtotalComMargem: subtotalWithMarginBeforeInflation,
        monthsUntilEvent,
        inflationMultiplier: inflationMultiplier.toFixed(4),
        totalSemMargem: totalCost,
        totalComMargem: totalWithMargin
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

    // ✅ FIX: Adicionar state para forçar recálculo quando cardápio mudar
    const [menuVersion, setMenuVersion] = useState(0);

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

    // ✅ FIX: Listener para mudanças no cardápio
    useEffect(() => {
        const handleMenuUpdate = () => {
            console.log('📊 [useCalculations] Cardápio atualizado, forçando recálculo...');
            setMenuVersion(v => v + 1);
        };

        window.addEventListener('menu-updated', handleMenuUpdate);
        // Correção mensal vem de "Custos da empresa": recalcular quando mudar ou chegar do servidor
        window.addEventListener('pricing-settings-updated', handleMenuUpdate);
        window.addEventListener('backend-phase2-complete', handleMenuUpdate);
        return () => {
            window.removeEventListener('menu-updated', handleMenuUpdate);
            window.removeEventListener('pricing-settings-updated', handleMenuUpdate);
            window.removeEventListener('backend-phase2-complete', handleMenuUpdate);
        };
    }, []);

    // ✅ OTIMIZAÇÃO: Criar hashes estáveis das dependências complexas
    const itemsHash = useMemo(() => {
        const items = eventData.items || [];
        // Todos os campos que entram na conta (qtyPerPerson, perda, rendimento, unidade, ativo, ingrediente)
        return items.map(item => [item.id || item.name, item.ingredientId, item.qtyPerPerson, item.quantity, item.unit, item.unitType,
            item.loss, item.yieldMultiplier, item.active].join('_')).join('|');
    }, [eventData.items]);

    const supportHash = useMemo(() => {
        const support = eventData.support || [];
        return support.map(s => `${s.name}_${s.quantity}_${s.cost}_${s.active}_${s.clientProvides ? 1 : 0}`).join("|");
    }, [eventData.support]);

    const ingredientsHash = useMemo(() => {
        if (!ingredients || !Array.isArray(ingredients)) return '';
        // Preço do ingrediente fica em costPerUnit/unitSize (cost/price em dados antigos)
        return ingredients.map(ing => [ing.id, ing.name || ing.ingredientName, ing.costPerUnit, ing.cost, ing.price, ing.unitSize,
            ing.unit, ing.unitType, ing.category || ing.categoria].join('_')).join('|');
    }, [ingredients]);

    const [costs, setCosts] = useState({
        itemsCalculated: [],
        ingredientsCost: 0,
        subtotal: 0,
        subtotalWithMargin: 0,
        supportCost: 0,
        laborCost: 0,
        transportCost: 0,
        totalCost: 0,
        pricePerPerson: 0,
        monthsUntilEvent: 0,
        inflationApplied: 0,
        menuCostTotal: 0,
        menuPriceTotal: 0,
        menuPriceWithMargin: 0,
        menuCostWithoutMargin: 0,
        totalWithMargin: 0,
        menuMarginAmount: 0,
        hasActiveMenu: false
    });

    // ✅ FIX: descartar resultados antigos quando um recálculo mais novo começou
    // (ex: limpar o cardápio logo após carregar um evento)
    const calcSeqRef = React.useRef(0);

    useEffect(() => {
        const seq = ++calcSeqRef.current;
        async function calculate() {
            try {
                // Aguardar managers carregarem
                if (!managersReady || !window.calculateItems) {
                    console.log('⏳ [useCalculations] Aguardando managers...');
                    return;
                }

                // Sempre calcular, mesmo sem itens (para labor e transport)
                const calculated = await calculateEventCosts(eventData, ingredients);
                if (seq !== calcSeqRef.current) return;
                setCosts(calculated);
            } catch (error) {
                console.error('❌ [useCalculations] Erro ao calcular custos:', error);
            }
        }

        calculate();
    }, [
        managersReady,
        menuVersion,            // ✅ FIX: Forçar recálculo quando cardápio muda
        itemsHash,              // ✅ Usar hash ao invés de array
        supportHash,            // ✅ Usar hash ao invés de array
        eventData.labor?.hours,
        eventData.labor?.rate,
        JSON.stringify(eventData.labor?.team || []),
        eventData.transport?.active,
        eventData.transport?.distance,
        eventData.transport?.consumption,
        eventData.transport?.fuelPrice,
        eventData.transport?.costPerKm,
        eventData.transport?.toll,
        eventData.transport?.quantity,
        eventData.guests,
        eventData.monthsUntilEvent,
        eventData.proteinSafetyPct,
        JSON.stringify(eventData.clientSupply || null),
        ingredientsHash         // ✅ Usar hash ao invés de array
    ]);

    return costs;
}

// Expor no window para uso global
window.useCalculations = useCalculations;
window.calculateEventCosts = calculateEventCosts;

})();
