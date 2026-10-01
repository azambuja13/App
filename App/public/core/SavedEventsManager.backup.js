/**
 * SavedEventsManager.js
 * Gerenciador de eventos salvos - Agora usa IndexedDB via StorageManager
 */

const STORAGE_KEY = 'precificacao_eventos_salvos';

class SavedEventsManager {
    constructor() {
        this.events = [];
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
            console.log('✅ SavedEventsManager inicializado com IndexedDB');
        } catch (error) {
            console.error('❌ Erro ao inicializar SavedEventsManager:', error);
        }
    }

    /**
     * Carrega eventos do IndexedDB via StorageManager
     */
    async loadEvents() {
        try {
            // Tentar usar StorageManager (IndexedDB)
            if (window.storageManager) {
                const events = await window.storageManager.getAllEvents();
                this.events = events || [];
                console.log(`📋 ${this.events.length} eventos carregados via StorageManager`);
                return this.events;
            }

            // Fallback: localStorage direto
            console.warn('⚠️ StorageManager não disponível, usando localStorage');
            const data = localStorage.getItem(STORAGE_KEY);
            this.events = data ? JSON.parse(data) : [];
            return this.events;

        } catch (error) {
            console.error('❌ Erro ao carregar eventos:', error);
            // Tentar localStorage como último recurso
            try {
                const data = localStorage.getItem(STORAGE_KEY);
                this.events = data ? JSON.parse(data) : [];
            } catch (fallbackError) {
                this.events = [];
            }
            return this.events;
        }
    }

    /**
     * Retorna todos os eventos (síncrono)
     * Nota: Retorna cache, chame loadEvents() antes se precisar atualizar
     */
    getAllEvents() {
        return this.events;
    }

    /**
     * Busca evento por ID (síncrono)
     */
    getEventById(id) {
        return this.events.find(event => event.id === id);
    }

    /**
     * Salva um novo evento ou atualiza existente
     */
    async saveEvent(eventData) {
        try {
            const now = new Date().toISOString();
            let savedEvent;

            // Usar StorageManager (IndexedDB)
            if (window.storageManager) {
                const result = await window.storageManager.saveEvent(eventData);

                if (!result.success) {
                    console.error('❌ Erro do StorageManager:', result.message);
                    return result;
                }

                savedEvent = result.event || eventData;
                console.log('✅ Evento salvo via StorageManager (IndexedDB)');

            } else {
                // Fallback: localStorage direto
                console.warn('⚠️ StorageManager não disponível, usando localStorage');

                if (eventData.id) {
                    const index = this.events.findIndex(e => e.id === eventData.id);
                    if (index !== -1) {
                        this.events[index] = { ...eventData, updatedAt: now };
                        savedEvent = this.events[index];
                    } else {
                        savedEvent = { ...eventData, createdAt: now, updatedAt: now };
                        this.events.push(savedEvent);
                    }
                } else {
                    savedEvent = {
                        ...eventData,
                        id: this.generateId(),
                        createdAt: now,
                        updatedAt: now
                    };
                    this.events.push(savedEvent);
                }

                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events));
                } catch (quotaError) {
                    if (quotaError.name === 'QuotaExceededError') {
                        return {
                            success: false,
                            message: '❌ Espaço insuficiente! Use a ferramenta de migração para IndexedDB.',
                            isQuotaError: true
                        };
                    }
                    throw quotaError;
                }
            }

            // Atualizar cache local
            await this.loadEvents();

            return {
                success: true,
                message: 'Evento salvo com sucesso!',
                event: savedEvent
            };

        } catch (error) {
            console.error('❌ Erro ao salvar evento:', error);

            if (error.name === 'QuotaExceededError') {
                return {
                    success: false,
                    message: '❌ Espaço insuficiente! Abra migrate-to-indexeddb.html para migrar seus dados.',
                    isQuotaError: true
                };
            }

            return {
                success: false,
                message: 'Erro ao salvar evento: ' + error.message
            };
        }
    }

    /**
     * Duplica um evento
     */
    async duplicateEvent(eventId) {
        try {
            // Usar StorageManager se disponível
            if (window.storageManager) {
                const result = await window.storageManager.duplicateEvent(eventId);

                if (result.success) {
                    await this.loadEvents(); // Atualizar cache
                }

                return result;
            }

            // Fallback: lógica local
            const original = this.getEventById(eventId);
            if (!original) {
                return { success: false, message: 'Evento não encontrado.' };
            }

            const now = new Date().toISOString();
            const duplicate = {
                ...original,
                id: this.generateId(),
                name: `${original.name} (Cópia)`,
                createdAt: now,
                updatedAt: now
            };

            this.events.push(duplicate);

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events));
            } catch (quotaError) {
                if (quotaError.name === 'QuotaExceededError') {
                    return {
                        success: false,
                        message: '❌ Espaço insuficiente! Abra migrate-to-indexeddb.html',
                        isQuotaError: true
                    };
                }
                throw quotaError;
            }

            return {
                success: true,
                message: 'Evento duplicado com sucesso!',
                event: duplicate
            };

        } catch (error) {
            console.error('❌ Erro ao duplicar evento:', error);
            return { success: false, message: 'Erro ao duplicar evento.' };
        }
    }

    /**
     * Exclui um evento
     */
    async deleteEvent(eventId) {
        try {
            // Usar StorageManager se disponível
            if (window.storageManager) {
                const result = await window.storageManager.deleteEvent(eventId);

                if (result.success) {
                    await this.loadEvents(); // Atualizar cache
                }

                return result;
            }

            // Fallback: lógica local
            const index = this.events.findIndex(e => e.id === eventId);
            if (index === -1) {
                return { success: false, message: 'Evento não encontrado.' };
            }

            this.events.splice(index, 1);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events));

            return { success: true, message: 'Evento excluído com sucesso!' };

        } catch (error) {
            console.error('❌ Erro ao excluir evento:', error);
            return { success: false, message: 'Erro ao excluir evento.' };
        }
    }

    /**
     * Exporta eventos para JSON
     */
    exportEvents() {
        try {
            const dataStr = JSON.stringify(this.events, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `eventos-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();

            URL.revokeObjectURL(url);
            return { success: true, message: 'Backup exportado com sucesso!' };
        } catch (error) {
            console.error('Erro ao exportar eventos:', error);
            return { success: false, message: 'Erro ao exportar backup.' };
        }
    }

    /**
     * Importa eventos de JSON
     */
    async importEvents(jsonData) {
        try {
            const imported = JSON.parse(jsonData);

            if (!Array.isArray(imported)) {
                return { success: false, message: 'Formato de arquivo inválido.' };
            }

            // Importar cada evento
            for (const importedEvent of imported) {
                const exists = this.events.find(e => e.id === importedEvent.id);
                if (!exists) {
                    await this.saveEvent(importedEvent);
                }
            }

            await this.loadEvents();

            return {
                success: true,
                message: `${imported.length} evento(s) importado(s) com sucesso!`
            };
        } catch (error) {
            console.error('Erro ao importar eventos:', error);
            return { success: false, message: 'Erro ao importar eventos.' };
        }
    }

    /**
     * Limpa todos os eventos
     */
    async clearAll() {
        try {
            if (window.storageManager && window.storageManager.adapter) {
                const adapter = window.storageManager.adapter;
                if (adapter.clearAll) {
                    await adapter.clearAll();
                }
            }

            this.events = [];
            localStorage.removeItem(STORAGE_KEY);

            return { success: true, message: 'Todos os eventos foram removidos.' };
        } catch (error) {
            console.error('Erro ao limpar eventos:', error);
            return { success: false, message: 'Erro ao limpar eventos.' };
        }
    }

    /**
     * Gera ID único
     */
    generateId() {
        return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Conta total de eventos
     */
    count() {
        return this.events.length;
    }

    /**
     * Busca eventos por nome
     */
    searchByName(query) {
        const lowerQuery = query.toLowerCase();
        return this.events.filter(event =>
            event.name.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Ordena eventos por data (mais recente primeiro)
     */
    getSortedByDate() {
        return [...this.events].sort((a, b) =>
            new Date(b.updatedAt) - new Date(a.updatedAt)
        );
    }
}

// Expor classe e criar instância global
window.SavedEventsManager = SavedEventsManager;
window.savedEventsManager = new SavedEventsManager();
