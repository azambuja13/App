/**
 * IndexedDB Storage Service
 *
 * Implementa a mesma interface do StorageService (localStorage)
 * mas usando IndexedDB para evitar QuotaExceededError.
 *
 * Interface compatível:
 * - get(key, defaultValue)
 * - set(key, value)
 */

class IndexedDBStorageService {
    constructor() {
        this.dbName = 'precificacao_db';
        this.version = 3;
        this.db = null;
        this.initPromise = null;
    }

    /**
     * Inicializa conexão com IndexedDB
     * @returns {Promise<IDBDatabase>}
     */
    async init() {
        if (this.db) return this.db;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('❌ [IndexedDBStorage] Erro ao abrir:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ [IndexedDBStorage] Conectado');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Store genérica para todos os dados (key-value)
                if (!db.objectStoreNames.contains('keyValueStore')) {
                    db.createObjectStore('keyValueStore', { keyPath: 'key' });
                    console.log('📋 [IndexedDBStorage] Store "keyValueStore" criada');
                }

                // Store para eventos (compatibilidade com IndexedDBAdapter)
                if (!db.objectStoreNames.contains('events')) {
                    const eventStore = db.createObjectStore('events', { keyPath: 'id' });
                    eventStore.createIndex('createdAt', 'createdAt', { unique: false });
                    eventStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                    console.log('📋 [IndexedDBStorage] Store "events" criada');
                }

                // Store para dados gerais (compatibilidade com IndexedDBAdapter)
                if (!db.objectStoreNames.contains('appData')) {
                    db.createObjectStore('appData', { keyPath: 'key' });
                    console.log('📋 [IndexedDBStorage] Store "appData" criada');
                }
            };
        });

        return this.initPromise;
    }

    /**
     * Lê valor do IndexedDB
     * @param {string} key - Chave
     * @param {*} defaultValue - Valor padrão se não encontrar
     * @returns {Promise<*>} Valor armazenado ou defaultValue
     */
    async get(key, defaultValue = null) {
        try {
            await this.init();

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['keyValueStore'], 'readonly');
                const store = transaction.objectStore('keyValueStore');
                const request = store.get(key);

                request.onsuccess = () => {
                    if (request.result) {
                        resolve(request.result.value);
                    } else {
                        resolve(defaultValue);
                    }
                };

                request.onerror = () => {
                    console.error(`❌ [IndexedDBStorage] Erro ao ler ${key}:`, request.error);
                    resolve(defaultValue);
                };
            });
        } catch (error) {
            console.error(`❌ [IndexedDBStorage] Erro em get(${key}):`, error);
            return defaultValue;
        }
    }

    /**
     * Salva valor no IndexedDB
     * @param {string} key - Chave
     * @param {*} value - Valor a salvar
     * @returns {Promise<void>}
     */
    async set(key, value) {
        try {
            await this.init();

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['keyValueStore'], 'readwrite');
                const store = transaction.objectStore('keyValueStore');
                const request = store.put({ key, value });

                request.onsuccess = () => {
                    resolve();
                };

                request.onerror = () => {
                    console.error(`❌ [IndexedDBStorage] Erro ao salvar ${key}:`, request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error(`❌ [IndexedDBStorage] Erro em set(${key}):`, error);
            throw error;
        }
    }

    /**
     * Remove valor do IndexedDB
     * @param {string} key - Chave
     * @returns {Promise<void>}
     */
    async remove(key) {
        try {
            await this.init();

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['keyValueStore'], 'readwrite');
                const store = transaction.objectStore('keyValueStore');
                const request = store.delete(key);

                request.onsuccess = () => {
                    resolve();
                };

                request.onerror = () => {
                    console.error(`❌ [IndexedDBStorage] Erro ao remover ${key}:`, request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error(`❌ [IndexedDBStorage] Erro em remove(${key}):`, error);
            throw error;
        }
    }

    /**
     * Lista todas as chaves
     * @returns {Promise<string[]>}
     */
    async keys() {
        try {
            await this.init();

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['keyValueStore'], 'readonly');
                const store = transaction.objectStore('keyValueStore');
                const request = store.getAllKeys();

                request.onsuccess = () => {
                    resolve(request.result);
                };

                request.onerror = () => {
                    console.error('❌ [IndexedDBStorage] Erro ao listar chaves:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ [IndexedDBStorage] Erro em keys():', error);
            return [];
        }
    }

    /**
     * Limpa todos os dados
     * @returns {Promise<void>}
     */
    async clear() {
        try {
            await this.init();

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['keyValueStore'], 'readwrite');
                const store = transaction.objectStore('keyValueStore');
                const request = store.clear();

                request.onsuccess = () => {
                    console.log('✅ [IndexedDBStorage] Dados limpos');
                    resolve();
                };

                request.onerror = () => {
                    console.error('❌ [IndexedDBStorage] Erro ao limpar:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ [IndexedDBStorage] Erro em clear():', error);
            throw error;
        }
    }
}

// Criar instância global APENAS para planos offline
if (typeof window !== 'undefined') {
    // Verificar plano do usuário
    const ConfigHelper = window.ConfigHelper;
    const currentPlan = ConfigHelper ? ConfigHelper.getCurrentPlan() : 'offline';
    const isStandardOrPremium = currentPlan === 'standard' || currentPlan === 'premium';

    if (isStandardOrPremium) {
        // Premium/Standard NÃO USAM IndexedDB - apenas PostgreSQL
        console.log(`⚠️ [${currentPlan.toUpperCase()}] IndexedDB DESABILITADO - usando apenas PostgreSQL`);
        window.indexedDBStorage = null;
    } else {
        // Offline mode pode usar IndexedDB
        window.indexedDBStorage = new IndexedDBStorageService();
        console.log('✅ IndexedDBStorageService disponível como window.indexedDBStorage');
    }
}

// Nota: Não usar 'export' pois este arquivo é carregado como script regular, não como módulo ES6
