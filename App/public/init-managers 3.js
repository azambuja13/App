/**
 * Inicialização dos Managers
 * Importa os managers e expõe no window para uso nos componentes JSX
 */

(async function() {
    console.log('🚀 [init-managers] Iniciando carregamento...');
    try {
        // Importar SavedEventsManager (atualizado para usar IndexedDB)
        const storageModule = await import('./core/SavedEventsManager.js?v=' + Date.now());
        window.SavedEventsManager = storageModule.SavedEventsManager || window.SavedEventsManager;

        // Se já existe uma instância, usar ela (carregada via script tag)
        if (!window.savedEventsManager) {
            window.savedEventsManager = new window.SavedEventsManager();
        }

        // Adicionar método getSortedByDate se não existir (hotfix para cache)
        if (!window.savedEventsManager.getSortedByDate) {
            window.savedEventsManager.getSortedByDate = function() {
                const events = this.getAllEvents();
                return events.sort((a, b) => {
                    const dateA = new Date(a.updatedAt || a.createdAt || 0);
                    const dateB = new Date(b.updatedAt || b.createdAt || 0);
                    return dateB - dateA;
                });
            };
            console.log('⚠️ Hotfix: método getSortedByDate adicionado');
        }

        console.log('✅ SavedEventsManager carregado');

        // Importar DishManager (refatorado com StorageService e calculations)
        const dishModule = await import('./core/DishManager.js?v=' + Date.now());
        window.DishManager = dishModule.DishManager;
        window.dishManager = dishModule.dishManager;
        console.log('✅ DishManager carregado');

        // Importar ProposalManager
        const proposalModule = await import('./core/ProposalManager.js?v=' + Date.now());
        window.ProposalManager = proposalModule.ProposalManager;
        window.proposalManager = proposalModule.proposalManager;
        console.log('✅ ProposalManager carregado com updateStatus');

        // Importar MenuManager
        const menuModule = await import('./core/MenuManager.js?v=' + Date.now());
        window.MenuManager = menuModule.MenuManager;
        window.menuManager = menuModule.menuManager;
        console.log('✅ MenuManager carregado');

        // Importar SavedMenusManager
        const savedMenusModule = await import('./core/SavedMenusManager.js?v=' + Date.now());
        window.SavedMenusManager = savedMenusModule.SavedMenusManager;
        window.savedMenusManager = savedMenusModule.savedMenusManager;
        console.log('✅ SavedMenusManager carregado');

        // === MÓDULOS REFATORADOS ===

        // Importar StorageService
        console.log('📦 [init-managers] Importando StorageService...');
        const storageServiceModule = await import('./core/StorageService.js?v=' + Date.now());
        window.StorageService = storageServiceModule.StorageService;
        window.storageService = storageServiceModule.storageService;
        console.log('✅ StorageService carregado');

        // Importar CompanyManager (APÓS StorageService, pois depende dele)
        console.log('📦 [init-managers] Importando CompanyManager...');
        try {
            const companyModule = await import('./core/CompanyManager.js?v=' + Date.now());
            console.log('📦 [init-managers] companyModule:', companyModule);
            console.log('📦 [init-managers] companyModule.CompanyManager:', companyModule.CompanyManager);
            console.log('📦 [init-managers] companyModule.companyManager:', companyModule.companyManager);

            window.CompanyManager = companyModule.CompanyManager;
            window.companyManager = companyModule.companyManager;

            console.log('📦 [init-managers] window.CompanyManager:', window.CompanyManager);
            console.log('📦 [init-managers] window.companyManager:', window.companyManager);
            console.log('✅ CompanyManager carregado');
        } catch (error) {
            console.error('❌ [init-managers] ERRO ao importar CompanyManager:', error);
            console.error('❌ [init-managers] Stack:', error.stack);
        }

        // Importar ClientManager (para gerenciar clientes)
        console.log('📦 [init-managers] Importando ClientManager...');
        try {
            const clientModule = await import('./core/ClientManager.js?v=' + Date.now());
            window.ClientManager = clientModule.ClientManager;
            window.clientManager = clientModule.clientManager;
            console.log('✅ ClientManager carregado');
        } catch (error) {
            console.error('❌ [init-managers] ERRO ao importar ClientManager:', error);
            console.error('❌ [init-managers] Stack:', error.stack);
        }

        // Importar Calculations
        const calculationsModule = await import('./core/calculations.js?v=' + Date.now());
        window.calculations = calculationsModule.default;
        // Expor funções principais diretamente
        window.calculateCostPerGramMl = calculationsModule.calculateCostPerGramMl;
        window.calculateIngredientsCost = calculationsModule.calculateIngredientsCost;
        window.calculateLaborCost = calculationsModule.calculateLaborCost;
        window.calculateTransportCost = calculationsModule.calculateTransportCost;
        window.calculateSupportCost = calculationsModule.calculateSupportCost;
        window.applyInflation = calculationsModule.applyInflation;
        console.log('✅ Calculations carregado');

        // Importar Calculator (funções de cálculo de items)
        const calculatorModule = await import('./core/calculator.js?v=' + Date.now());
        window.calculator = calculatorModule;
        // Expor função principal diretamente
        window.calculateItems = calculatorModule.calculateItems;
        console.log('✅ Calculator carregado');

        // Importar Units
        const unitsModule = await import('./core/units.js?v=' + Date.now());
        window.units = unitsModule.default;
        // Expor funções principais diretamente
        window.convertUnit = unitsModule.convertUnit;
        window.convertToGrams = unitsModule.convertToGrams;
        window.normalizeUnit = unitsModule.normalizeUnit;
        console.log('✅ Units carregado');

        // Importar Constants
        const constantsModule = await import('./constants/index.js?v=' + Date.now());
        window.constants = constantsModule.default;
        window.STORAGE_KEYS = constantsModule.STORAGE_KEYS;
        window.INGREDIENT_CATEGORIES = constantsModule.INGREDIENT_CATEGORIES;
        console.log('✅ Constants carregado');

        // Importar Utils (funções utilitárias)
        const utilsModule = await import('./core/utils.js?v=' + Date.now());
        window.utils = utilsModule;
        window.handleNumberInput = utilsModule.handleNumberInput;
        window.parseNumberInput = utilsModule.parseNumberInput;
        console.log('✅ Utils carregado');

        // Importar MigrationService (para migrar dados do IndexedDB para backend)
        console.log('📦 [init-managers] Importando MigrationService...');
        try {
            const migrationModule = await import('./services/MigrationService.js?v=' + Date.now());
            window.MigrationService = migrationModule.MigrationService;
            window.migrationService = migrationModule.migrationService || new migrationModule.MigrationService();
            console.log('✅ MigrationService carregado');
        } catch (error) {
            console.error('❌ [init-managers] ERRO ao importar MigrationService:', error);
        }

        // Marcar como carregado
        window.managersReady = true;

        // Disparar evento de managers prontos
        window.dispatchEvent(new Event('managers-ready'));
        console.log('🚀 [init-managers] Managers e módulos refatorados prontos para uso!');
        console.log('✅ [init-managers] window.calculateItems:', typeof window.calculateItems);
    } catch (error) {
        console.error('❌ [init-managers] Erro ao carregar managers:', error);
        console.error('Detalhes:', error);
    }
})();
