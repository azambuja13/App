/**
 * MIGRATION SERVICE
 *
 * Serviço responsável por migrar dados do IndexedDB para o backend PostgreSQL.
 * Garante que dados locais não sejam perdidos durante sincronização.
 */

class MigrationService {
    constructor() {
        this.migrationFlags = {
            events: 'eventsMigrationDone',
            menus: 'menusMigrationDone',
            dishes: 'dishesMigrationDone',
            ingredients: 'ingredientsMigrationDone',
            clients: 'clientsMigrationDone',
            proposals: 'proposalsMigrationDone'
        };
    }

    /**
     * Verifica se uma migração específica já foi executada
     */
    isMigrationDone(migrationType) {
        const flag = this.migrationFlags[migrationType];
        return localStorage.getItem(flag) === 'true';
    }

    /**
     * Marca uma migração como concluída
     */
    markMigrationDone(migrationType) {
        const flag = this.migrationFlags[migrationType];
        localStorage.setItem(flag, 'true');
        console.log(`✅ [Migration] ${migrationType} marcado como migrado`);
    }

    /**
     * Força resetar flag de migração (para re-executar)
     */
    resetMigration(migrationType) {
        const flag = this.migrationFlags[migrationType];
        localStorage.removeItem(flag);
        console.log(`🔄 [Migration] Reset flag: ${migrationType}`);
    }

    /**
     * Migra eventos do IndexedDB para o backend
     */
    async migrateEvents() {
        try {
            console.log('🔄 [Migration] Iniciando migração de eventos...');

            // Verificar se já foi executada
            if (this.isMigrationDone('events')) {
                console.log('⏭️ [Migration] Migração de eventos já foi executada');
                return { success: true, skipped: true };
            }

            // Verificar se está em modo cloud e autenticado
            // IMPORTANTE: Verificar se temos accessToken (indica modo cloud autenticado)
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                console.log('⏭️ [Migration] Pulando migração: não autenticado ou modo offline');
                return { success: true, skipped: true };
            }

            // DEBUG: Verificar o que está disponível
            console.log('🔍 [Migration] Verificando window.PrecificacaoAPI:', {
                exists: !!window.PrecificacaoAPI,
                hasEventManager: !!(window.PrecificacaoAPI && window.PrecificacaoAPI.eventManager),
                hasMenuManager: !!(window.PrecificacaoAPI && window.PrecificacaoAPI.menuManager)
            });

            // Verificar se window.PrecificacaoAPI e seus managers estão disponíveis
            if (!window.PrecificacaoAPI || !window.PrecificacaoAPI.eventManager) {
                console.warn('⏭️ [Migration] Pulando migração: API ainda não inicializada', {
                    hasPrecificacaoAPI: !!window.PrecificacaoAPI,
                    hasEventManager: !!(window.PrecificacaoAPI && window.PrecificacaoAPI.eventManager)
                });
                return { success: true, skipped: true };
            }

            // Verificar se StorageManager está disponível
            if (!window.storageManager) {
                console.log('⏭️ [Migration] StorageManager não disponível');
                return { success: true, skipped: true };
            }

            // IMPORTANTE: Usar método específico para migração que retorna APENAS dados locais
            // (independente do plano do usuário - Standard/Premium também precisa migrar dados locais)
            const localEvents = await window.storageManager.getLocalEventsForMigration() || [];
            console.log(`📋 [Migration] ${localEvents.length} eventos encontrados no storage local`);

            if (localEvents.length === 0) {
                console.log('⏭️ [Migration] Nenhum evento para migrar');
                this.markMigrationDone('events');
                return { success: true, count: 0 };
            }

            // Carregar eventos do backend
            const api = window.PrecificacaoAPI;
            if (!api || !api.eventManager) {
                console.warn('⚠️ [Migration] API não disponível');
                return { success: false, error: 'API não disponível' };
            }

            await api.eventManager.loadEvents();
            const backendEvents = api.eventManager.events || [];
            const backendEventIds = new Set(backendEvents.map(e => e.event_id));

            console.log(`☁️ [Migration] ${backendEvents.length} eventos no backend`);

            // Encontrar eventos que existem no IndexedDB mas não no backend
            const eventsToMigrate = localEvents.filter(event => {
                const eventId = event.id || event.event_id;
                return !backendEventIds.has(eventId);
            });

            console.log(`📤 [Migration] ${eventsToMigrate.length} eventos precisam ser migrados`);

            if (eventsToMigrate.length === 0) {
                console.log('✅ [Migration] Todos os eventos já estão no backend');
                this.markMigrationDone('events');
                return { success: true, count: 0 };
            }

            // Migrar cada evento
            let successCount = 0;
            let errorCount = 0;

            for (const event of eventsToMigrate) {
                try {
                    console.log(`📤 [Migration] Migrando evento: ${event.name || event.id}`);

                    // Garantir que tem estrutura correta
                    const eventData = {
                        name: event.name || 'Evento sem nome',
                        eventDate: event.eventDate || event.date,
                        location: event.location,
                        guests: event.guests || event.numberOfGuests || 0,
                        monthsUntilEvent: event.monthsUntilEvent || 0,
                        stateData: event.stateData || event
                    };

                    // Salvar no backend
                    await api.eventManager.saveEvent(eventData);
                    successCount++;
                    console.log(`✅ [Migration] Evento migrado: ${event.name}`);
                } catch (error) {
                    console.error(`❌ [Migration] Erro ao migrar evento ${event.name}:`, error);
                    errorCount++;
                }
            }

            console.log(`✅ [Migration] Migração de eventos concluída:`);
            console.log(`   - Sucesso: ${successCount}`);
            console.log(`   - Erros: ${errorCount}`);

            // Marcar como migrado se pelo menos um evento foi migrado com sucesso
            if (successCount > 0) {
                this.markMigrationDone('events');
            }

            return {
                success: true,
                count: successCount,
                errors: errorCount
            };

        } catch (error) {
            console.error('❌ [Migration] Erro na migração de eventos:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Migra cardápios salvos do IndexedDB para o backend
     */
    async migrateSavedMenus() {
        try {
            console.log('🔄 [Migration] Iniciando migração de cardápios...');

            if (this.isMigrationDone('menus')) {
                console.log('⏭️ [Migration] Migração de cardápios já foi executada');
                return { success: true, skipped: true };
            }

            // Verificar se está em modo cloud e autenticado
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                console.log('⏭️ [Migration] Pulando migração de cardápios: não autenticado ou modo offline');
                return { success: true, skipped: true };
            }

            // DEBUG: Verificar o que está disponível
            console.log('🔍 [Migration Menus] Verificando window.PrecificacaoAPI:', {
                exists: !!window.PrecificacaoAPI,
                hasMenuManager: !!(window.PrecificacaoAPI && window.PrecificacaoAPI.menuManager)
            });

            // Verificar se window.PrecificacaoAPI e seus managers estão disponíveis
            if (!window.PrecificacaoAPI || !window.PrecificacaoAPI.menuManager) {
                console.warn('⏭️ [Migration] Pulando migração de cardápios: API ainda não inicializada', {
                    hasPrecificacaoAPI: !!window.PrecificacaoAPI,
                    hasMenuManager: !!(window.PrecificacaoAPI && window.PrecificacaoAPI.menuManager)
                });
                return { success: true, skipped: true };
            }

            if (!window.savedMenusManager) {
                console.log('⏭️ [Migration] Pulando migração de cardápios: SavedMenusManager não disponível');
                return { success: true, skipped: true };
            }

            const localMenus = await window.savedMenusManager.getAll(false) || []; // false = skip cache
            console.log(`📋 [Migration] ${localMenus.length} cardápios encontrados no IndexedDB`);

            if (localMenus.length === 0) {
                this.markMigrationDone('menus');
                return { success: true, count: 0 };
            }

            const api = window.PrecificacaoAPI;
            if (!api || !api.menuManager) {
                return { success: false, error: 'API não disponível' };
            }

            await api.menuManager.loadMenus();
            const backendMenus = api.menuManager.menus || [];
            const backendMenuIds = new Set(backendMenus.map(m => m.menu_id));

            const menusToMigrate = localMenus.filter(menu => {
                const menuId = menu.id || menu.menu_id;
                return !backendMenuIds.has(menuId);
            });

            console.log(`📤 [Migration] ${menusToMigrate.length} cardápios precisam ser migrados`);

            let successCount = 0;
            for (const menu of menusToMigrate) {
                try {
                    await api.menuManager.saveMenu(menu);
                    successCount++;
                    console.log(`✅ [Migration] Cardápio migrado: ${menu.name}`);
                } catch (error) {
                    console.error(`❌ [Migration] Erro ao migrar cardápio ${menu.name}:`, error);
                }
            }

            if (successCount > 0) {
                this.markMigrationDone('menus');
            }

            return { success: true, count: successCount };

        } catch (error) {
            console.error('❌ [Migration] Erro na migração de cardápios:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Executa todas as migrações necessárias
     */
    async migrateAll() {
        console.log('🚀 [Migration] Iniciando migração completa...');

        const results = {
            events: await this.migrateEvents(),
            menus: await this.migrateSavedMenus()
        };

        console.log('✅ [Migration] Migração completa finalizada:', results);
        return results;
    }
}

// Expor no window
if (typeof window !== 'undefined') {
    window.MigrationService = MigrationService;
    window.migrationService = new MigrationService();
}

export { MigrationService };
export default MigrationService;
