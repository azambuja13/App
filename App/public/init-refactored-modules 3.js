/**
 * ===================================================================
 * INIT REFACTORED MODULES - Inicialização dos Módulos Refatorados
 * ===================================================================
 *
 * Carrega todos os novos módulos refatorados mantendo compatibilidade
 * com código existente.
 *
 * MODO: Coexistência
 * - Managers antigos continuam funcionando
 * - Managers novos disponíveis como window.*New
 * - Você pode escolher qual usar
 */

(async function initRefactoredModules() {
    console.log('🚀 [RefactoredModules] Iniciando carregamento...');

    try {
        // ===================================================================
        // 1. CARREGAR INFRAESTRUTURA BASE
        // ===================================================================
        console.log('📦 [RefactoredModules] Carregando infraestrutura...');

        // Importar módulos base
        const { BaseManager } = await import('./core/BaseManager.js');
        const { CrudManager } = await import('./core/CrudManager.js');
        const { Result, fromPromise } = await import('./core/Result.js');
        const { eventBus, Events } = await import('./core/EventBus.js');
        const idGeneratorModule = await import('./utils/id-generator.js');

        // Expor no window
        window.BaseManager = BaseManager;
        window.CrudManager = CrudManager;
        window.Result = Result;
        window.fromPromise = fromPromise;
        window.eventBus = eventBus;
        window.Events = Events;
        window.IdGenerator = idGeneratorModule;

        console.log('✅ [RefactoredModules] Infraestrutura carregada');

        // ===================================================================
        // 2. CONFIGURAR EVENT BUS
        // ===================================================================
        console.log('📡 [RefactoredModules] Configurando EventBus...');

        const { setupEventBusListeners } = await import('./core/event-bus-setup.js');
        setupEventBusListeners();

        console.log('✅ [RefactoredModules] EventBus configurado');

        // ===================================================================
        // 3. CARREGAR MANAGERS REFATORADOS
        // ===================================================================
        console.log('🔧 [RefactoredModules] Carregando managers refatorados...');

        // Managers Refatorados (agora são os padrões!)
        const { DishManager, dishManager } =
            await import('./core/DishManager.js');

        const { ProposalManager, proposalManager } =
            await import('./core/ProposalManager.js');

        const { SavedMenusManager, savedMenusManager } =
            await import('./core/SavedMenusManager.js');

        const { SavedEventsManager, savedEventsManager } =
            await import('./core/SavedEventsManager.js');

        // ===================================================================
        // 4. EXPOR MANAGERS REFATORADOS COMO PADRÃO
        // ===================================================================
        // ATENÇÃO: Agora os managers refatorados SÃO os managers padrão!
        window.DishManager = DishManager;
        window.dishManager = dishManager;

        window.ProposalManager = ProposalManager;
        window.proposalManager = proposalManager;

        window.SavedMenusManager = SavedMenusManager;
        window.savedMenusManager = savedMenusManager;

        window.SavedEventsManager = SavedEventsManager;
        window.savedEventsManager = savedEventsManager;

        console.log('✅ [RefactoredModules] Managers refatorados carregados e ativos!');
        console.log('📦 Managers disponíveis: dishManager, proposalManager, savedMenusManager, savedEventsManager');

        // ===================================================================
        // 6. FUNÇÕES DE UTILIDADE
        // ===================================================================

        // Função para migrar para novos managers
        window.useRefactoredManagers = function() {
            console.log('🔄 Migrando para managers refatorados...');

            window.dishManager = dishManagerNew;
            window.proposalManager = proposalManagerNew;
            window.savedMenusManager = savedMenusManagerNew;
            window.savedEventsManager = savedEventsManagerNew;

            console.log('✅ Managers refatorados agora são os padrões!');
            console.log('💡 Para reverter, recarregue a página');
        };

        // Função para comparar managers
        window.compareManagers = function() {
            console.group('📊 Comparação de Managers');

            console.log('DishManager:');
            console.log('  Antigo:', window.dishManager?.constructor?.name);
            console.log('  Novo:', dishManagerNew?.constructor?.name);

            console.log('ProposalManager:');
            console.log('  Antigo:', window.proposalManager?.constructor?.name);
            console.log('  Novo:', proposalManagerNew?.constructor?.name);

            console.log('SavedMenusManager:');
            console.log('  Antigo:', window.savedMenusManager?.constructor?.name);
            console.log('  Novo:', savedMenusManagerNew?.constructor?.name);

            console.log('SavedEventsManager:');
            console.log('  Antigo:', window.savedEventsManager?.constructor?.name);
            console.log('  Novo:', savedEventsManagerNew?.constructor?.name);

            console.groupEnd();
        };

        // Função para testar managers refatorados
        window.testRefactoredManagers = async function() {
            console.group('🧪 Testando Managers Refatorados');

            try {
                // Teste DishManager
                console.log('Testando DishManager...');
                const dishes = await window.dishManager.getActive();
                console.log(`✅ DishManager: ${dishes.length} pratos ativos`);

                // Teste ProposalManager
                console.log('Testando ProposalManager...');
                const proposals = await window.proposalManager.getActive();
                console.log(`✅ ProposalManager: ${proposals.length} propostas ativas`);

                // Teste SavedMenusManager
                console.log('Testando SavedMenusManager...');
                const menus = await window.savedMenusManager.getActive();
                console.log(`✅ SavedMenusManager: ${menus.length} cardápios ativos`);

                // Teste SavedEventsManager
                console.log('Testando SavedEventsManager...');
                const events = await window.savedEventsManager.getAll();
                console.log(`✅ SavedEventsManager: ${events.length} eventos`);

                // Teste EventBus
                console.log('Testando EventBus...');
                const registeredEvents = window.eventBus.getRegisteredEvents();
                console.log(`✅ EventBus: ${registeredEvents.length} eventos registrados`);

                console.log('\n🎉 Todos os testes passaram!');
                console.log('💡 Managers refatorados estão ativos e funcionando!');

            } catch (error) {
                console.error('❌ Erro nos testes:', error);
            }

            console.groupEnd();
        };

        // ===================================================================
        // 7. INFORMAÇÕES E AJUDA
        // ===================================================================

        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║  ✅ MANAGERS REFATORADOS CARREGADOS COM SUCESSO!      ║');
        console.log('╚════════════════════════════════════════════════════════╝');
        console.log('\n📚 COMANDOS DISPONÍVEIS NO CONSOLE:\n');
        console.log('  🧪 testRefactoredManagers()     - Testar todos os managers');
        console.log('  📊 compareManagers()             - Comparar antigo vs novo');
        console.log('  🔄 useRefactoredManagers()       - Migrar para novos');
        console.log('  📡 eventBus.printStats()         - Ver estatísticas do EventBus');
        console.log('  📋 eventBus.getEventLog()        - Ver log de eventos');
        console.log('  🔊 enableEventBusLogging()       - Ativar logging detalhado');
        console.log('\n📦 MANAGERS DISPONÍVEIS:\n');
        console.log('  ✅ dishManager - Gerenciador de Pratos (Refatorado)');
        console.log('  ✅ proposalManager - Gerenciador de Propostas (Refatorado)');
        console.log('  ✅ savedMenusManager - Gerenciador de Cardápios (Refatorado)');
        console.log('  ✅ savedEventsManager - Gerenciador de Eventos (Refatorado)');
        console.log('\n💡 DICA: Execute testRefactoredManagers() para verificar!\n');

        // Emitir evento de inicialização completa
        eventBus.emit('app:ready', {
            timestamp: new Date().toISOString(),
            managers: ['dish', 'proposal', 'menus', 'events'],
            mode: 'coexistence'
        });

        // Auto-executar testes se em desenvolvimento
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('\n🔍 [DEV] Executando testes automáticos...\n');
            setTimeout(() => {
                window.testRefactoredManagers();
            }, 1000);
        }

    } catch (error) {
        console.error('❌ [RefactoredModules] Erro ao carregar:', error);
        console.error('Stack:', error.stack);

        // Notificar erro
        if (window.eventBus) {
            eventBus.emit('app:error', { error, context: 'init-refactored-modules' });
        }
    }
})();

// Exportar funções utilitárias
export {
    // Funções serão expostas via window.*
};
