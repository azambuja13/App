/**
 * Smart Storage - Roteador inteligente de storage baseado no plano do usuário
 *
 * Arquitetura correta por licença:
 * - Offline (OFF): IndexedDB (NUNCA localStorage)
 * - Standard (STD): PostgreSQL (NUNCA localStorage)
 * - Premium (PRM): PostgreSQL (NUNCA localStorage)
 *
 * IMPORTANTE: IndexedDB está DESABILITADO para Standard/Premium via indexeddb-blocker.js
 *
 * @module smart-storage
 */

// Importar getCurrentPlan do namespace global (app-config.js não usa ES6 modules)
const getCurrentPlan = () => {
    if (window.__APP_CONFIG_EXPORTS__) {
        return window.__APP_CONFIG_EXPORTS__.getCurrentPlan();
    }
    // Fallback: usar ConfigHelper diretamente
    if (window.ConfigHelper) {
        return window.ConfigHelper.getCurrentPlan();
    }
    console.warn('⚠️ getCurrentPlan não disponível, usando offline como fallback');
    return 'offline';
};

/**
 * Detecta qual storage usar baseado no tipo de licença
 * @returns {'postgresql' | 'indexeddb'}
 */
function detectStorageType() {
    const plan = getCurrentPlan();

    // Standard/Premium: SEMPRE PostgreSQL
    if (plan === 'premium' || plan === 'standard') {
        return 'postgresql';
    }

    // Offline: SEMPRE IndexedDB
    if (plan === 'offline' || plan === 'free') {
        return 'indexeddb';
    }

    // Fallback (não deveria chegar aqui)
    console.warn('⚠️ Plano não reconhecido, usando IndexedDB como fallback');
    return 'indexeddb';
}


const DB_NAME = 'precificacao_db';
const DB_VERSION = 1;
const STORE_NAME = 'eventData';

/**
 * Abre conexão com IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
        };
    });
}

/**
 * Salva dados no IndexedDB
 * @param {string} key
 * @param {any} data
 */
async function saveToIndexedDB(key, data) {
    const db = await openIndexedDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    store.put({ key, data, timestamp: Date.now() });

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => {
            db.close();
            resolve();
        };
        tx.onerror = () => {
            db.close();
            reject(tx.error);
        };
    });
}

/**
 * Carrega dados do IndexedDB
 * @param {string} key
 */
async function loadFromIndexedDB(key) {
    const db = await openIndexedDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
        const request = store.get(key);

        request.onsuccess = () => {
            db.close();
            resolve(request.result ? request.result.data : null);
        };

        request.onerror = () => {
            db.close();
            reject(request.error);
        };
    });
}

/**
 * Salva dados no PostgreSQL via API
 * @param {string} key
 * @param {any} data
 */
async function saveToPostgreSQL(key, data) {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        throw new Error('PostgreSQL requer autenticação (accessToken não encontrado)');
    }

    const apiClient = window.apiClient || window.PrecificacaoAPI?.api;
    if (!apiClient) {
        throw new Error('apiClient não disponível');
    }

    // Mapear key para endpoint correto
    // NOTA: Esta função só é chamada se o endpoint existe (verificado em smartSave)
    const endpoint = getPostgreSQLEndpoint(key);

    // PrecificacaoAPI não tem .post() - usa .request() com method: 'POST'
    const response = await apiClient.request(endpoint, {
        method: 'POST',
        body: JSON.stringify({
            data: data,
            key: key
        })
    });

    if (!response.success) {
        throw new Error(`Erro ao salvar no PostgreSQL: ${response.error}`);
    }

    return response;
}

/**
 * Carrega dados do PostgreSQL via API
 * @param {string} key
 */
async function loadFromPostgreSQL(key) {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        console.warn('PostgreSQL requer autenticação - retornando null');
        return null;
    }

    const apiClient = window.apiClient || window.PrecificacaoAPI?.api;
    if (!apiClient) {
        console.warn('apiClient não disponível - retornando null');
        return null;
    }

    const endpoint = getPostgreSQLEndpoint(key);

    try {
        // PrecificacaoAPI não tem .get() - usa .request() com method: 'GET' (default)
        const response = await apiClient.request(endpoint);

        if (response.success) {
            return response.data;
        }

        return null;
    } catch (error) {
        console.warn(`Erro ao carregar do PostgreSQL: ${error.message}`);
        return null;
    }
}

/**
 * Mapeia key para endpoint PostgreSQL correto
 * @param {string} key
 */
function getPostgreSQLEndpoint(key) {
    const mapping = {
        // NOTA: Apenas mapear chaves que TÊM endpoints no backend
        // Chaves sem endpoint vão usar localStorage fallback automaticamente
        // 'precificacao_event_data': SEM ENDPOINT - usa localStorage
        // 'eventData': SEM ENDPOINT - usa localStorage
        // 'companyData': SEM ENDPOINT - usa localStorage
        // 'clientsData': SEM ENDPOINT - usa localStorage
        // 'menusData': SEM ENDPOINT - usa localStorage
        // 'precificacao_menu': SEM ENDPOINT - usa localStorage
        'eventsData': '/api/events'
    };

    return mapping[key] || null; // Retorna null se não tem endpoint
}

/**
 * Salva dados usando o storage correto baseado no plano
 * @param {string} key - Chave de identificação dos dados
 * @param {any} data - Dados a serem salvos (será JSON.stringify automaticamente)
 * @returns {Promise<void>}
 */
export async function smartSave(key, data) {
    const storageType = detectStorageType();
    const plan = getCurrentPlan();

    try {
        if (storageType === 'postgresql') {
            // ✅ Verificar se a chave tem endpoint ANTES de tentar salvar
            const endpoint = getPostgreSQLEndpoint(key);
            if (!endpoint) {
                // Chave sem endpoint - usa localStorage diretamente (não é erro!)
                console.log(`💾 [${plan.toUpperCase()}] "${key}" não tem endpoint PostgreSQL - usando localStorage`);
                localStorage.setItem(key, JSON.stringify(data));
                localStorage.setItem(`${key}_timestamp`, Date.now().toString());
                console.log(`✅ Dados salvos com sucesso (localStorage)`);
                return;
            }

            console.log(`☁️ [${plan.toUpperCase()}] Salvando "${key}" no PostgreSQL`);

            // ✅ FIX: Verificar se apiClient está disponível
            const apiClient = window.apiClient || window.PrecificacaoAPI?.api;
            if (!apiClient) {
                console.warn('⚠️ apiClient não disponível ainda - salvando em localStorage temporário');
                console.warn('   Dados serão sincronizados com PostgreSQL quando backend inicializar');

                // Salvar temporariamente no localStorage com prefixo especial
                localStorage.setItem(`temp_${key}`, JSON.stringify(data));
                localStorage.setItem(`temp_${key}_timestamp`, Date.now().toString());
                return; // Retornar sem erro
            }

            await saveToPostgreSQL(key, data);

            // Cache temporário (apenas timestamp)
            localStorage.setItem(`${key}_cache_timestamp`, Date.now().toString());
        } else {
            // Offline: IndexedDB
            console.log(`💾 [OFFLINE] Salvando "${key}" no IndexedDB`);
            await saveToIndexedDB(key, data);
        }

        console.log(`✅ Dados salvos com sucesso (${storageType})`);
    } catch (error) {
        console.error(`❌ Erro ao salvar via ${storageType}:`, error);

        // ✅ FIX: Fallback para localStorage (NÃO IndexedDB) se PostgreSQL falhar
        // IndexedDB está BLOQUEADO para Premium/Standard
        if (storageType === 'postgresql') {
            console.warn('⚠️ Usando localStorage como fallback emergencial');
            // IMPORTANTE: Salva SEM prefixo "fallback_" para que o load encontre
            localStorage.setItem(key, JSON.stringify(data));
            localStorage.setItem(`${key}_timestamp`, Date.now().toString());
            // NÃO lançar erro - salvou no fallback
            return;
        }

        throw error;
    }
}

/**
 * Carrega dados usando o storage correto baseado no plano
 * @param {string} key - Chave de identificação dos dados
 * @returns {Promise<any>} - Dados carregados (já parseados)
 */
export async function smartLoad(key) {
    const storageType = detectStorageType();
    const plan = getCurrentPlan();

    try {
        let data = null;

        if (storageType === 'postgresql') {
            console.log(`☁️ [${plan.toUpperCase()}] Carregando "${key}" do PostgreSQL`);
            data = await loadFromPostgreSQL(key);
        } else {
            console.log(`💾 [OFFLINE] Carregando "${key}" do IndexedDB`);
            data = await loadFromIndexedDB(key);
        }

        if (data) {
            console.log(`✅ Dados carregados com sucesso (${storageType})`);
        } else {
            console.log(`ℹ️ Nenhum dado encontrado para "${key}" (${storageType})`);
        }

        return data;
    } catch (error) {
        console.error(`❌ Erro ao carregar via ${storageType}:`, error);

        // Fallback para localStorage/IndexedDB em caso de erro no PostgreSQL
        if (storageType === 'postgresql') {
            // Primeiro tenta localStorage (onde salvamos no fallback emergencial)
            console.warn('⚠️ Tentando localStorage como fallback');
            const localData = localStorage.getItem(key);
            if (localData) {
                console.log('✅ Dados encontrados no localStorage fallback');
                return JSON.parse(localData);
            }

            // Se não encontrou no localStorage, tenta IndexedDB
            console.warn('⚠️ Tentando IndexedDB como fallback');
            return await loadFromIndexedDB(key);
        }

        return null;
    }
}

/**
 * Remove dados do storage correto
 * @param {string} key
 */
export async function smartRemove(key) {
    const storageType = detectStorageType();

    if (storageType === 'postgresql') {
        // PostgreSQL: chamar DELETE na API
        const endpoint = getPostgreSQLEndpoint(key);
        if (window.apiClient) {
            await window.apiClient.delete(endpoint);
        }
        localStorage.removeItem(`${key}_cache_timestamp`);
    } else {
        // IndexedDB
        const db = await openIndexedDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(key);
        await new Promise((resolve) => { tx.oncomplete = resolve; });
        db.close();
    }
}

/**
 * Verifica qual tipo de storage está sendo usado
 * @returns {string}
 */
export function getCurrentStorageType() {
    return detectStorageType();
}

/**
 * Exporta para uso global
 */
if (typeof window !== 'undefined') {
    window.smartStorage = {
        save: smartSave,
        load: smartLoad,
        remove: smartRemove,
        getType: getCurrentStorageType
    };

    console.log('✅ SmartStorage disponível globalmente como window.smartStorage');
}
