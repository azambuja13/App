/**
 * ===================================================================
 * SAVED EVENTS MANAGER - Gerenciamento de Eventos (REFATORADO)
 * ===================================================================
 *
 * REFATORAÇÃO COMPLETA:
 * - Estende CrudManager
 * - Usa Result pattern e EventBus
 * - Integrado com StorageManager (IndexedDB)
 * - Redução: 364 → ~180 linhas (-51%)
 */

import { CrudManager } from './CrudManager.js';
import { Result } from './Result.js';
import { eventBus } from './EventBus.js';

export class SavedEventsManager extends CrudManager {
    constructor(storageKey = 'precificacao_eventos_salvos') {
        super({
            storageKey,
            entityName: 'Evento',
            idPrefix: 'event',
            eventPrefix: 'event'
        });

        // Cache reduzido para garantir dados frescos (5 segundos)
        this.cacheTTL = 5000;

        this.initialized = false;
        this.init();
    }

    /**
     * Inicializa o manager e carrega eventos
     */
    async init() {
        if (this.initialized) return;

        try {
            await this.loadEvents();
            this.initialized = true;
            console.log('✅ SavedEventsManager inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar SavedEventsManager:', error);
        }
    }

    /**
     * Carrega eventos do storage (IndexedDB)
     * SEMPRE busca direto da store 'events' do IndexedDB
     */
    async loadEvents() {
        try {
            console.log('🔄 [SavedEventsManager] Carregando eventos do IndexedDB...');

            // SEMPRE usar StorageManager (IndexedDB) - prioridade absoluta
            if (window.storageManager) {
                // Verificar se é Premium/Standard e se backend está disponível
                const ConfigHelper = window.ConfigHelper;
                const currentPlan = ConfigHelper ? ConfigHelper.getCurrentPlan() : 'offline';
                const isStandardOrPremium = currentPlan === 'standard' || currentPlan === 'premium';

                // Se Premium/Standard, aguardar backend estar pronto
                if (isStandardOrPremium && !window.appBackend) {
                    console.log(`⏸️ [${currentPlan.toUpperCase()}] Aguardando backend... retornando vazio`);
                    this.cache = [];
                    return [];
                }

                const events = await window.storageManager.getAllEvents();
                this.cache = events || [];
                this.cacheTime = Date.now();
                console.log(`✅ [SavedEventsManager] ${this.cache.length} eventos carregados da store 'events'`);

                // Log detalhado dos eventos
                if (this.cache.length > 0) {
                    console.log('📋 [SavedEventsManager] Eventos:', this.cache.map(e => e.eventName || e.name).join(', '));
                }

                return this.cache;
            }

            console.warn('⚠️ [SavedEventsManager] StorageManager não disponível, usando fallback');

            // Fallback: usar método do BaseManager (localStorage)
            const data = await this.storage.get(this.storageKey, []);
            this.cache = data;
            this.cacheTime = Date.now();
            console.log(`📋 ${data.length} eventos carregados via LocalStorage (fallback)`);
            return data;

        } catch (error) {
            console.error('❌ [SavedEventsManager] Erro ao carregar eventos:', error);
            return [];
        }
    }

    /**
     * Override getAll para sempre usar IndexedDB
     * @param {boolean} useCache - Se deve usar cache
     * @returns {Promise<Array>} Array de eventos
     */
    async getAll(useCache = true) {
        try {
            const now = Date.now();

            // Verificar cache válido
            if (useCache && this.cache && this.cacheTime && (now - this.cacheTime < this.cacheTTL)) {
                console.log(`📦 Cache hit para ${this.storageKey}`);
                return this.cache;
            }

            // Cache expirou ou não existe - recarregar do IndexedDB
            console.log(`🔄 Cache miss para ${this.storageKey} - recarregando do IndexedDB...`);
            return await this.loadEvents();

        } catch (error) {
            console.error(`❌ Erro ao carregar ${this.storageKey}:`, error);
            return [];
        }
    }

    // ===================================================================
    // MÉTODOS LEGADOS (Compatibilidade)
    // ===================================================================

    /**
     * @deprecated Use getAll() instead
     */
    async getAllEvents() {
        console.warn('⚠️ getAllEvents() está deprecated. Use getAll()');
        return await this.getAll();
    }

    /**
     * @deprecated Use getById() instead
     */
    async getEventById(id) {
        console.warn('⚠️ getEventById() está deprecated. Use getById()');

        // Tentar usar StorageManager (IndexedDB)
        if (window.storageManager) {
            const event = await window.storageManager.getEventById(id);
            console.log('📦 [getEventById] Evento carregado do IndexedDB:', {
                id,
                hasData: !!event?.data,
                guests: event?.data?.guests
            });
            return event;
        }

        // Fallback: usar CrudManager cache
        return this.getById(id);
    }

    /**
     * @deprecated Use saveItem() with Result pattern
     */
    async saveEvent(eventData) {
        // Usar StorageManager se disponível (IndexedDB)
        if (window.storageManager) {
            const result = await window.storageManager.saveEvent(eventData);

            if (result.success) {
                // Invalidar cache para forçar reload
                this.cacheTime = 0;
                await this.loadEvents(); // Atualizar cache
            }

            return result;
        }

        // Fallback: usar CrudManager
        const result = await this.saveItem(eventData);
        return result.toLegacy('event');
    }

    /**
     * @deprecated Use deleteItem() instead
     */
    async deleteEvent(eventId) {
        // Usar StorageManager se disponível
        if (window.storageManager) {
            const result = await window.storageManager.deleteEvent(eventId);

            if (result.success) {
                // Invalidar cache para forçar reload
                this.cacheTime = 0;
                await this.loadEvents(); // Atualizar cache
            }

            return result;
        }

        // Fallback: usar CrudManager
        const result = await this.deleteItem(eventId, false);
        return result.toLegacy();
    }

    /**
     * @deprecated Use duplicate() instead
     */
    async duplicateEvent(eventId) {
        // Usar StorageManager se disponível
        if (window.storageManager) {
            const result = await window.storageManager.duplicateEvent(eventId);

            if (result.success) {
                // Invalidar cache para forçar reload
                this.cacheTime = 0;
                await this.loadEvents(); // Atualizar cache
            }

            return result;
        }

        // Fallback: usar CrudManager
        const result = await this.duplicate(eventId);
        return result.toLegacy('event');
    }

    // ===================================================================
    // MÉTODOS ESPECÍFICOS DE EVENTOS
    // ===================================================================

    /**
     * Busca eventos por nome
     * @param {string} query - Termo de busca
     * @returns {Promise<Array>} Array de eventos
     */
    async searchByName(query) {
        return this.search(query, ['name']);
    }

    /**
     * Ordena eventos por data (mais recente primeiro)
     * @returns {Promise<Array>} Array de eventos ordenados
     */
    async getSortedByDate() {
        const events = await this.getAll();
        return [...events].sort((a, b) =>
            new Date(b.updatedAt) - new Date(a.updatedAt)
        );
    }

    /**
     * Retorna eventos recentes (últimos N)
     * @param {number} limit - Quantidade de eventos
     * @returns {Promise<Array>} Array de eventos
     */
    async getRecentEvents(limit = 10) {
        const sorted = await this.getSortedByDate();
        return sorted.slice(0, limit);
    }

    /**
     * Exporta eventos para JSON
     * @returns {Result} Resultado com download
     */
    exportEvents() {
        try {
            const events = this.getAll(false);
            const dataStr = JSON.stringify(events, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `eventos-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();

            URL.revokeObjectURL(url);

            return Result.ok(
                { count: events.length },
                'Backup exportado com sucesso!'
            );
        } catch (error) {
            console.error('Erro ao exportar eventos:', error);
            return Result.fail('Erro ao exportar backup', error);
        }
    }

    /**
     * Importa eventos de JSON
     * @param {string} jsonData - JSON string
     * @returns {Promise<Result>} Resultado da importação
     */
    async importEvents(jsonData) {
        try {
            const imported = JSON.parse(jsonData);

            if (!Array.isArray(imported)) {
                return Result.fail('Formato de arquivo inválido');
            }

            let importedCount = 0;
            let skippedCount = 0;

            // Importar cada evento
            for (const importedEvent of imported) {
                const exists = await this.exists(importedEvent.id);

                if (!exists) {
                    await this.saveItem(importedEvent);
                    importedCount++;
                } else {
                    skippedCount++;
                }
            }

            await this.loadEvents();

            return Result.ok(
                { imported: importedCount, skipped: skippedCount },
                `${importedCount} evento(s) importado(s) com sucesso! (${skippedCount} já existiam)`
            );
        } catch (error) {
            console.error('Erro ao importar eventos:', error);
            return Result.fail('Erro ao importar eventos', error);
        }
    }

    /**
     * Limpa todos os eventos (CUIDADO!)
     * @returns {Promise<Result>} Resultado
     */
    async clearAllEvents() {
        try {
            // Usar StorageManager se disponível
            if (window.storageManager && window.storageManager.adapter) {
                const adapter = window.storageManager.adapter;
                if (adapter.clearAll) {
                    await adapter.clearAll();
                }
            }

            // Limpar também via BaseManager
            await this.clearAll();

            return Result.ok(null, 'Todos os eventos foram removidos');
        } catch (error) {
            console.error('Erro ao limpar eventos:', error);
            return Result.fail('Erro ao limpar eventos', error);
        }
    }

    /**
     * Retorna estatísticas detalhadas
     * @returns {Promise<Object>} Estatísticas
     */
    async getDetailedStatistics() {
        const basicStats = await this.getStatistics();
        const events = await this.getAll();

        // Eventos por mês
        const byMonth = this.groupByMonth(events);

        // Valor total dos eventos
        const totalValue = events.reduce((sum, e) => sum + (e.finalTotal || 0), 0);

        // Valor médio
        const avgValue = events.length > 0 ? totalValue / events.length : 0;

        return {
            ...basicStats,
            byMonth,
            totalValue,
            avgValue
        };
    }

    /**
     * Agrupa eventos por mês
     * @private
     */
    groupByMonth(events) {
        return events.reduce((acc, event) => {
            if (!event.createdAt) return acc;

            const date = new Date(event.createdAt);
            const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!acc[month]) {
                acc[month] = 0;
            }
            acc[month]++;

            return acc;
        }, {});
    }
}

// Exportar instância singleton
export const savedEventsManager = new SavedEventsManager();

// Expor para window (compatibilidade)
if (typeof window !== 'undefined') {
    window.SavedEventsManager = SavedEventsManager;
    window.savedEventsManager = savedEventsManager;
}
