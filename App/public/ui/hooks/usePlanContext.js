(function() {
/**
 * usePlanContext.js
 * Context API para gerenciar plano do usuário globalmente
 *
 * ✅ OTIMIZAÇÃO: Evita múltiplas chamadas a getCurrentPlan()
 * ✅ PERFORMANCE: Cache global com invalidação por evento
 */

const { createContext, useContext, useState, useEffect, useMemo } = React;

// Criar contexto
const PlanContext = createContext({
    plan: 'offline',
    licenseType: 'OFF',
    isCloudMode: false,
    isPremium: false,
    isStandard: false,
    isOffline: false,
    refreshPlan: () => {}
});

/**
 * Provider do contexto de plano
 */
function PlanProvider({ children }) {
    const [plan, setPlan] = useState('offline');
    const [licenseType, setLicenseType] = useState('OFF');

    // Função para atualizar o plano
    const refreshPlan = () => {
        if (window.ConfigHelper) {
            // Limpar cache para leitura fresca
            window.ConfigHelper._cachedPlan = null;
            window.ConfigHelper._cacheTime = null;

            const currentPlan = window.ConfigHelper.getCurrentPlan();
            const currentLicenseType = localStorage.getItem('licenseType') || 'OFF';

            setPlan(currentPlan);
            setLicenseType(currentLicenseType);

            console.log('🔄 [PlanContext] Plano atualizado:', {
                plan: currentPlan,
                licenseType: currentLicenseType,
                isPremium: currentPlan === 'premium',
                isStandard: currentPlan === 'standard',
                isOffline: currentPlan === 'offline' || currentPlan === 'free'
            });
        }
    };

    // Carregar plano inicial
    useEffect(() => {
        refreshPlan();

        // Escutar evento de mudança de plano
        const handlePlanChange = (event) => {
            console.log('📢 [PlanContext] Evento plan-changed recebido:', event.detail);
            refreshPlan();
        };

        window.addEventListener('plan-changed', handlePlanChange);

        // Escutar mudanças no localStorage (licenseType)
        const handleStorageChange = (e) => {
            if (e.key === 'licenseType') {
                console.log('📢 [PlanContext] licenseType mudou no localStorage');
                refreshPlan();
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('plan-changed', handlePlanChange);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    // Memoizar valor do contexto
    const contextValue = useMemo(() => ({
        plan,
        licenseType,
        isCloudMode: plan === 'standard' || plan === 'premium',
        isPremium: plan === 'premium',
        isStandard: plan === 'standard',
        isOffline: plan === 'offline' || plan === 'free',
        refreshPlan
    }), [plan, licenseType]);

    return React.createElement(
        PlanContext.Provider,
        { value: contextValue },
        children
    );
}

/**
 * Hook para acessar o plano do contexto
 * ✅ USE ESTE HOOK ao invés de window.ConfigHelper.getCurrentPlan()
 */
function usePlan() {
    const context = useContext(PlanContext);

    if (!context) {
        console.warn('⚠️ usePlan usado fora do PlanProvider, usando fallback');

        // Fallback para compatibilidade
        const plan = window.ConfigHelper?.getCurrentPlan() || 'offline';
        const licenseType = localStorage.getItem('licenseType') || 'OFF';

        return {
            plan,
            licenseType,
            isCloudMode: plan === 'standard' || plan === 'premium',
            isPremium: plan === 'premium',
            isStandard: plan === 'standard',
            isOffline: plan === 'offline' || plan === 'free',
            refreshPlan: () => {}
        };
    }

    return context;
}

// Expor globalmente
if (typeof window !== 'undefined') {
    window.PlanContext = PlanContext;
    window.PlanProvider = PlanProvider;
    window.usePlan = usePlan;
}

console.log('✅ PlanContext carregado (otimização de cache de plano)');

})();
