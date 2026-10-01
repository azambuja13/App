/**
 * STORAGE MANAGER
 *
 * Gerenciador central que escolhe automaticamente qual adapter usar
 * baseado na configuração (CLOUD ou OFFLINE).
 *
 * Este é o ÚNICO ponto de acesso a storage que o código da aplicação deve usar.
 * O resto do código não precisa saber se está usando localStorage ou backend.
 */

class StorageManager {
    constructor() {
        this.adapter = null;
        this.initialized = false;
    }

    /**
     * Inicializa o storage adapter adequado
     */
    async initialize() {
        if (this.initialized) {
            console.warn('⚠️ StorageManager já foi inicializado');
            return;
        }

        try {
            const isCloudMode = window.ConfigHelper?.isCloudMode();
            const currentPlan = window.ConfigHelper?.getCurrentPlan() || 'offline';
            const isStandardOrPremium = currentPlan === 'standard' || currentPlan === 'premium';

            if (isCloudMode) {
                // Versão CLOUD: usar CloudStorageAdapter
                console.log('☁️ Inicializando CloudStorageAdapter...');

                // Aguardar API client estar pronto
                if (window.appBackend && window.appBackend.eventManager) {
                    this.adapter = new CloudStorageAdapter(window.appBackend);
                    console.log('✅ CloudStorageAdapter inicializado com sucesso');
                } else {
                    // IMPORTANTE: Premium/Standard NÃO PODEM usar IndexedDB local
                    if (isStandardOrPremium) {
                        console.warn(`⚠️ [${currentPlan.toUpperCase()}] Backend não disponível - aguardando inicialização`);
                        // NÃO criar adapter ainda - aguardar backend
                        this.adapter = null;
                    } else {
                        console.warn('⚠️ Backend não disponível, usando IndexedDBAdapter como fallback');
                        this.adapter = new IndexedDBAdapter();
                        await this.adapter.init();
                    }
                }
            } else {
                // Versão OFFLINE: usar IndexedDBAdapter (melhor que localStorage)
                console.log('💾 Inicializando IndexedDBAdapter...');
                this.adapter = new IndexedDBAdapter();
                await this.adapter.init();
                console.log('✅ IndexedDBAdapter inicializado com sucesso');
            }

            this.initialized = true;

        } catch (error) {
            console.error('❌ Erro ao inicializar StorageManager:', error);

            // Fallback APENAS para offline mode
            const currentPlan = window.ConfigHelper?.getCurrentPlan() || 'offline';
            const isStandardOrPremium = currentPlan === 'standard' || currentPlan === 'premium';

            if (!isStandardOrPremium) {
                console.log('💾 Fallback: usando LocalStorageAdapter');
                this.adapter = new LocalStorageAdapter();
            } else {
                console.error(`❌ [${currentPlan.toUpperCase()}] Não é possível usar fallback - PostgreSQL é obrigatório`);
                this.adapter = null;
            }

            this.initialized = true;
        }
    }

    /**
     * Garante que o adapter foi inicializado antes de usar
     */
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.adapter) {
            const currentPlan = window.ConfigHelper?.getCurrentPlan() || 'offline';
            const isStandardOrPremium = currentPlan === 'standard' || currentPlan === 'premium';

            if (isStandardOrPremium) {
                // Premium/Standard aguardando backend - retornar falso para usar backend diretamente
                console.warn(`⚠️ [${currentPlan.toUpperCase()}] Adapter não disponível - use window.appBackend diretamente`);
                return false;
            }

            throw new Error('StorageManager não conseguiu inicializar nenhum adapter');
        }

        return true;
    }

    // ========================================================================
    // MÉTODOS PÚBLICOS - Delegam para o adapter correto
    // ========================================================================

    async saveEvent(eventData) {
        const isReady = await this.ensureInitialized();
        if (!isReady) return { success: false, message: 'Backend não disponível' };
        return this.adapter.saveEvent(eventData);
    }

    async getAllEvents() {
        const isReady = await this.ensureInitialized();
        if (!isReady) return [];  // Retornar array vazio se backend não pronto
        return this.adapter.getAllEvents();
    }

    async getEventById(id) {
        const isReady = await this.ensureInitialized();
        if (!isReady) return null;
        return this.adapter.getEventById(id);
    }

    async updateEvent(id, eventData) {
        const isReady = await this.ensureInitialized();
        if (!isReady) return { success: false, message: 'Backend não disponível' };
        return this.adapter.updateEvent(id, eventData);
    }

    async deleteEvent(id) {
        const isReady = await this.ensureInitialized();
        if (!isReady) return { success: false, message: 'Backend não disponível' };
        return this.adapter.deleteEvent(id);
    }

    async duplicateEvent(id) {
        const isReady = await this.ensureInitialized();
        if (!isReady) return { success: false, message: 'Backend não disponível' };
        return this.adapter.duplicateEvent(id);
    }

    generateId() {
        return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * MÉTODO PARA MIGRAÇÃO: Retorna eventos APENAS do storage local
     * Independente do plano do usuário
     * Usado pelo MigrationService para enviar dados locais ao backend
     */
    async getLocalEventsForMigration() {
        await this.ensureInitialized();

        // Se adapter é CloudStorageAdapter, usar método específico para migração
        if (this.adapter && typeof this.adapter.getLocalEventsForMigration === 'function') {
            return this.adapter.getLocalEventsForMigration();
        }

        // Senão, usar getAllEvents normal (para IndexedDBAdapter/LocalStorageAdapter)
        return this.adapter.getAllEvents();
    }

    // ========================================================================
    // MÉTODOS DE INFORMAÇÃO
    // ========================================================================

    /**
     * Retorna o tipo de adapter em uso
     */
    getAdapterType() {
        if (!this.adapter) return 'none';
        if (this.adapter instanceof CloudStorageAdapter) return 'cloud';
        if (this.adapter instanceof IndexedDBAdapter) return 'indexeddb';
        if (this.adapter instanceof LocalStorageAdapter) return 'local';
        return 'unknown';
    }

    /**
     * Retorna informações de status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            adapterType: this.getAdapterType(),
            mode: window.APP_CONFIG?.mode || 'unknown'
        };
    }

    /**
     * Log de debug do status
     */
    logStatus() {
        const status = this.getStatus();
        console.log('📊 StorageManager Status:', status);
    }
}

// ============================================================================
// INICIALIZAÇÃO GLOBAL
// ============================================================================

// Criar instância global
if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;

    // Criar instância singleton
    window.storageManager = new StorageManager();

    // Log de inicialização
    console.log('✅ StorageManager disponível globalmente como window.storageManager');
}
