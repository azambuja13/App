/**
 * INDEXEDDB ADAPTER
 *
 * Solução para problema de quota do localStorage.
 * IndexedDB suporta centenas de MB ou até GB de dados.
 */

class IndexedDBAdapter extends StorageAdapter {
    constructor() {
        super();
        this.dbName = 'precificacao_db';
        this.version = 3;
        this.db = null;
        this.storageKey = window.APP_CONFIG?.storage?.eventStorageKey || 'eventos-salvos';
        console.log('📦 IndexedDBAdapter inicializado');
    }

    /**
     * Inicializa conexão com IndexedDB
     */
    async init() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('❌ Erro ao abrir IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ IndexedDB conectado');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Store para key-value genérico (compatibilidade com IndexedDBStorageService)
                if (!db.objectStoreNames.contains('keyValueStore')) {
                    db.createObjectStore('keyValueStore', { keyPath: 'key' });
                    console.log('📋 Object store "keyValueStore" criado');
                }

                // Store para eventos
                if (!db.objectStoreNames.contains('events')) {
                    const eventStore = db.createObjectStore('events', { keyPath: 'id' });
                    eventStore.createIndex('createdAt', 'createdAt', { unique: false });
                    eventStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                    console.log('📋 Object store "events" criado');
                }

                // Store para dados gerais (ingredientes, etc)
                if (!db.objectStoreNames.contains('appData')) {
                    db.createObjectStore('appData', { keyPath: 'key' });
                    console.log('📋 Object store "appData" criado');
                }

                console.log('✅ Database schema criado');
            };
        });
    }

    /**
     * Salva evento no IndexedDB
     */
    async saveEvent(eventData) {
        try {
            await this.init();

            // Validar dados
            const validation = this.validateEventData(eventData);
            if (!validation.valid) {
                return {
                    success: false,
                    message: validation.errors.join(', ')
                };
            }

            const now = new Date().toISOString();

            // Preparar evento
            const event = {
                ...eventData,
                id: eventData.id || this.generateId(),
                createdAt: eventData.createdAt || now,
                updatedAt: now
            };

            // Salvar no IndexedDB
            await this._putEvent(event);

            console.log('✅ Evento salvo no IndexedDB:', event.id);
            return {
                success: true,
                message: 'Evento salvo com sucesso!',
                event: event
            };

        } catch (error) {
            console.error('❌ Erro ao salvar evento no IndexedDB:', error);
            return {
                success: false,
                message: 'Erro ao salvar evento: ' + error.message
            };
        }
    }

    /**
     * Método auxiliar para fazer put no IndexedDB
     */
    async _putEvent(event) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['events'], 'readwrite');
            const store = transaction.objectStore('events');
            const request = store.put(event);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Retorna todos os eventos
     */
    async getAllEvents() {
        try {
            await this.init();

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['events'], 'readonly');
                const store = transaction.objectStore('events');
                const request = store.getAll();

                request.onsuccess = () => {
                    const events = request.result || [];
                    console.log(`📋 ${events.length} eventos carregados do IndexedDB`);
                    resolve(events);
                };

                request.onerror = () => {
                    console.error('❌ Erro ao carregar eventos:', request.error);
                    reject(request.error);
                };
            });

        } catch (error) {
            console.error('❌ Erro ao carregar eventos do IndexedDB:', error);
            return [];
        }
    }

    /**
     * Busca evento por ID
     */
    async getEventById(id) {
        try {
            await this.init();

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['events'], 'readonly');
                const store = transaction.objectStore('events');
                const request = store.get(id);

                request.onsuccess = () => {
                    const event = request.result;
                    if (event) {
                        console.log('✅ Evento encontrado:', id);
                        resolve(event);
                    } else {
                        console.warn('⚠️ Evento não encontrado:', id);
                        resolve(null);
                    }
                };

                request.onerror = () => {
                    console.error('❌ Erro ao buscar evento:', request.error);
                    reject(request.error);
                };
            });

        } catch (error) {
            console.error('❌ Erro ao buscar evento:', error);
            return null;
        }
    }

    /**
     * Atualiza evento
     */
    async updateEvent(id, eventData) {
        try {
            await this.init();

            const existingEvent = await this.getEventById(id);
            if (!existingEvent) {
                return {
                    success: false,
                    message: 'Evento não encontrado'
                };
            }

            const updatedEvent = {
                ...existingEvent,
                ...eventData,
                id: id, // Garantir que ID não seja sobrescrito
                updatedAt: new Date().toISOString()
            };

            await this._putEvent(updatedEvent);

            console.log('✅ Evento atualizado no IndexedDB:', id);
            return {
                success: true,
                message: 'Evento atualizado com sucesso!',
                event: updatedEvent
            };

        } catch (error) {
            console.error('❌ Erro ao atualizar evento:', error);
            return {
                success: false,
                message: 'Erro ao atualizar evento: ' + error.message
            };
        }
    }

    /**
     * Deleta evento
     */
    async deleteEvent(id) {
        try {
            await this.init();

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['events'], 'readwrite');
                const store = transaction.objectStore('events');
                const request = store.delete(id);

                request.onsuccess = () => {
                    console.log('✅ Evento deletado do IndexedDB:', id);
                    resolve({
                        success: true,
                        message: 'Evento excluído com sucesso!'
                    });
                };

                request.onerror = () => {
                    console.error('❌ Erro ao deletar evento:', request.error);
                    reject(request.error);
                };
            });

        } catch (error) {
            console.error('❌ Erro ao deletar evento:', error);
            return {
                success: false,
                message: 'Erro ao excluir evento: ' + error.message
            };
        }
    }

    /**
     * Duplica evento
     */
    async duplicateEvent(id) {
        try {
            const originalEvent = await this.getEventById(id);

            if (!originalEvent) {
                return {
                    success: false,
                    message: 'Evento original não encontrado'
                };
            }

            const duplicatedEvent = {
                ...originalEvent,
                id: this.generateId(),
                name: (originalEvent.name || originalEvent.eventName || 'Evento') + ' (Cópia)',
                eventName: (originalEvent.name || originalEvent.eventName || 'Evento') + ' (Cópia)',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await this._putEvent(duplicatedEvent);

            console.log('✅ Evento duplicado no IndexedDB:', duplicatedEvent.id);
            return {
                success: true,
                message: 'Evento duplicado com sucesso!',
                event: duplicatedEvent
            };

        } catch (error) {
            console.error('❌ Erro ao duplicar evento:', error);
            return {
                success: false,
                message: 'Erro ao duplicar evento: ' + error.message
            };
        }
    }

    /**
     * Salva dados gerais da aplicação (ingredientes, etc)
     */
    async saveAppData(key, data) {
        try {
            await this.init();

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['appData'], 'readwrite');
                const store = transaction.objectStore('appData');
                const request = store.put({ key, data, updatedAt: new Date().toISOString() });

                request.onsuccess = () => {
                    console.log('✅ Dados salvos no IndexedDB:', key);
                    resolve({
                        success: true,
                        message: 'Dados salvos com sucesso!'
                    });
                };

                request.onerror = () => {
                    console.error('❌ Erro ao salvar dados:', request.error);
                    reject(request.error);
                };
            });

        } catch (error) {
            console.error('❌ Erro ao salvar dados:', error);
            return {
                success: false,
                message: 'Erro ao salvar dados: ' + error.message
            };
        }
    }

    /**
     * Carrega dados gerais da aplicação
     */
    async getAppData(key) {
        try {
            await this.init();

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['appData'], 'readonly');
                const store = transaction.objectStore('appData');
                const request = store.get(key);

                request.onsuccess = () => {
                    const result = request.result;
                    if (result) {
                        console.log('✅ Dados carregados do IndexedDB:', key);
                        resolve(result.data);
                    } else {
                        console.log('ℹ️ Nenhum dado encontrado para:', key);
                        resolve(null);
                    }
                };

                request.onerror = () => {
                    console.error('❌ Erro ao carregar dados:', request.error);
                    reject(request.error);
                };
            });

        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            return null;
        }
    }

    /**
     * Limpa todos os dados
     */
    async clearAll() {
        try {
            await this.init();

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['events', 'appData'], 'readwrite');

                transaction.objectStore('events').clear();
                transaction.objectStore('appData').clear();

                transaction.oncomplete = () => {
                    console.log('✅ Todos os dados do IndexedDB foram limpos');
                    resolve({
                        success: true,
                        message: 'Dados limpos com sucesso!'
                    });
                };

                transaction.onerror = () => {
                    console.error('❌ Erro ao limpar dados:', transaction.error);
                    reject(transaction.error);
                };
            });

        } catch (error) {
            console.error('❌ Erro ao limpar dados:', error);
            return {
                success: false,
                message: 'Erro ao limpar dados: ' + error.message
            };
        }
    }

    /**
     * Exporta todos os dados para backup
     */
    async exportAll() {
        try {
            const events = await this.getAllEvents();
            const appData = await this.getAppData('precificacao_event_data');

            return {
                events,
                appData,
                exportDate: new Date().toISOString(),
                version: window.APP_CONFIG?.version || '1.0.18'
            };

        } catch (error) {
            console.error('❌ Erro ao exportar dados:', error);
            throw error;
        }
    }

    /**
     * Importa dados de backup
     */
    async importAll(backup) {
        try {
            await this.init();

            // Importar eventos
            if (backup.events && Array.isArray(backup.events)) {
                for (const event of backup.events) {
                    await this._putEvent(event);
                }
                console.log(`✅ ${backup.events.length} eventos importados`);
            }

            // Importar dados gerais
            if (backup.appData) {
                await this.saveAppData('precificacao_event_data', backup.appData);
                console.log('✅ Dados gerais importados');
            }

            return {
                success: true,
                message: 'Dados importados com sucesso!'
            };

        } catch (error) {
            console.error('❌ Erro ao importar dados:', error);
            return {
                success: false,
                message: 'Erro ao importar dados: ' + error.message
            };
        }
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.IndexedDBAdapter = IndexedDBAdapter;
}
