/**
 * INDEXEDDB STORAGE HELPER
 *
 * Helper functions para usar IndexedDB ao invés de localStorage
 * no hook useEventState.js
 */

// Instância global do adapter
let indexedDBAdapter = null;

/**
 * Inicializa o IndexedDB adapter
 */
async function initIndexedDB() {
    if (!indexedDBAdapter) {
        if (typeof IndexedDBAdapter === 'undefined') {
            console.error('❌ IndexedDBAdapter não está carregado!');
            return null;
        }

        indexedDBAdapter = new IndexedDBAdapter();
        await indexedDBAdapter.init();
        console.log('✅ IndexedDB Storage Helper inicializado');
    }
    return indexedDBAdapter;
}

/**
 * Carrega dados do IndexedDB (substitui loadFromLocalStorage)
 */
async function loadFromIndexedDB() {
    try {
        const adapter = await initIndexedDB();
        if (!adapter) {
            console.warn('⚠️ IndexedDB não disponível, tentando localStorage');
            return loadFromLocalStorageFallback();
        }

        const data = await adapter.getAppData('precificacao_event_data');

        if (data) {
            console.log('✅ Dados carregados do IndexedDB');
            return data;
        } else {
            console.log('ℹ️ Nenhum dado encontrado no IndexedDB');
            return null;
        }

    } catch (error) {
        console.error('❌ Erro ao carregar do IndexedDB:', error);
        console.warn('⚠️ Tentando fallback para localStorage');
        return loadFromLocalStorageFallback();
    }
}

/**
 * Salva dados no IndexedDB (substitui saveToLocalStorage)
 */
async function saveToIndexedDB(data) {
    try {
        const adapter = await initIndexedDB();
        if (!adapter) {
            console.warn('⚠️ IndexedDB não disponível, usando localStorage');
            return saveToLocalStorageFallback(data);
        }

        await adapter.saveAppData('precificacao_event_data', data);
        console.log('✅ Dados salvos no IndexedDB');

    } catch (error) {
        console.error('❌ Erro ao salvar no IndexedDB:', error);
        console.warn('⚠️ Tentando fallback para localStorage');
        saveToLocalStorageFallback(data);
    }
}

/**
 * Fallback para localStorage (caso IndexedDB falhe)
 */
function loadFromLocalStorageFallback() {
    try {
        const data = localStorage.getItem('precificacao_event_data');
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('❌ Erro ao carregar do localStorage:', error);
        return null;
    }
}

/**
 * Fallback para salvar no localStorage
 */
function saveToLocalStorageFallback(data) {
    try {
        localStorage.setItem('precificacao_event_data', JSON.stringify(data));
    } catch (error) {
        console.error('❌ Erro ao salvar no localStorage:', error);

        // Se der QuotaExceededError, tentar comprimir
        if (error.name === 'QuotaExceededError') {
            console.error('❌ QUOTA EXCEDIDA! Use IndexedDB ou limpe dados antigos.');
            alert('Espaço de armazenamento cheio! Por favor, execute a migração para IndexedDB ou exclua eventos antigos.');
        }
    }
}

/**
 * Verifica se IndexedDB está disponível
 */
function isIndexedDBAvailable() {
    return typeof indexedDB !== 'undefined';
}

/**
 * Migra dados do localStorage para IndexedDB
 */
async function migrateFromLocalStorage() {
    try {
        console.log('🔄 Iniciando migração localStorage → IndexedDB...');

        const adapter = await initIndexedDB();
        if (!adapter) {
            throw new Error('IndexedDB não disponível');
        }

        // Carregar dados do localStorage
        const localData = loadFromLocalStorageFallback();
        if (localData) {
            await adapter.saveAppData('precificacao_event_data', localData);
            console.log('✅ Dados da aplicação migrados');
        }

        // Migrar eventos salvos
        const eventsKeys = ['eventos-salvos', 'precificacao_eventos_salvos'];
        for (const key of eventsKeys) {
            const eventsData = localStorage.getItem(key);
            if (eventsData) {
                try {
                    const events = JSON.parse(eventsData);
                    if (Array.isArray(events)) {
                        for (const event of events) {
                            await adapter._putEvent(event);
                        }
                        console.log(`✅ ${events.length} eventos migrados de ${key}`);
                        break;
                    }
                } catch (e) {
                    console.error(`❌ Erro ao migrar eventos de ${key}:`, e);
                }
            }
        }

        console.log('✅ Migração concluída com sucesso!');
        return { success: true, message: 'Migração concluída!' };

    } catch (error) {
        console.error('❌ Erro na migração:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Limpa todos os dados do IndexedDB
 */
async function clearIndexedDB() {
    try {
        const adapter = await initIndexedDB();
        if (adapter) {
            await adapter.clearAll();
            console.log('✅ IndexedDB limpo');
        }
    } catch (error) {
        console.error('❌ Erro ao limpar IndexedDB:', error);
    }
}

// Exportar para window
if (typeof window !== 'undefined') {
    window.IndexedDBStorageHelper = {
        loadFromIndexedDB,
        saveToIndexedDB,
        loadFromLocalStorageFallback,
        saveToLocalStorageFallback,
        isIndexedDBAvailable,
        migrateFromLocalStorage,
        clearIndexedDB,
        initIndexedDB
    };

    console.log('✅ IndexedDBStorageHelper disponível globalmente');
}
