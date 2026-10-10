/**
 * API CLIENT - Calculadora de Precificação
 *
 * Sistema de integração com backend PostgreSQL para isolamento de dados por cliente.
 * Cada licença possui seus próprios eventos, ingredientes e despesas.
 */

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const API_CONFIG = {
    // Usar auto-detecção de ambiente do app-config.js
    get baseURL() {
        return window.APP_CONFIG?.backend?.baseURL || 'https://precificacao-api-production.up.railway.app';
    },
    licenseKey: null,

    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'X-License-Key': this.licenseKey
        };
    }
};

// ============================================================================
// CLASSE DE GERENCIAMENTO DA API
// ============================================================================

class PrecificacaoAPI {
    constructor() {
        this.baseURL = API_CONFIG.baseURL;
        this.licenseKey = API_CONFIG.licenseKey;
    }

    setLicenseKey(key) {
        this.licenseKey = key;
        API_CONFIG.licenseKey = key;
    }

    async refreshAccessToken() {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            throw new Error('Token inválido ou expirado');
        }

        try {
            console.log('🔄 Tentando renovar accessToken...');
            const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-License-Key': this.licenseKey
                },
                body: JSON.stringify({ refreshToken })
            });

            const result = await response.json();

            if (response.ok && result.success && result.data?.accessToken) {
                localStorage.setItem('accessToken', result.data.accessToken);
                if (result.data.refreshToken) {
                    localStorage.setItem('refreshToken', result.data.refreshToken);
                }
                // Notificar consumidores que o token foi renovado (ex.: websocket)
                try {
                    window.dispatchEvent(new CustomEvent('auth:tokenRefreshed', {
                        detail: { accessToken: result.data.accessToken }
                    }));
                } catch (_) {}
                console.log('✅ AccessToken renovado com sucesso');
                return result.data.accessToken;
            } else {
                throw new Error('Falha ao renovar token');
            }
        } catch (error) {
            console.error('❌ Erro ao renovar token:', error);
            throw new Error('Token inválido ou expirado');
        }
    }

    async request(endpoint, options = {}, isRetry = false) {
        const url = `${this.baseURL}${endpoint}`;

        // Obter accessToken do localStorage
        const accessToken = localStorage.getItem('accessToken');

        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'X-License-Key': this.licenseKey,
                ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);

            // Verificar se a resposta é 429 (Rate Limit)
            if (response.status === 429) {
                console.warn('⚠️ Rate limit atingido (429) - aguardando antes de tentar novamente');
                throw new Error('Rate limit atingido. Por favor, aguarde alguns segundos.');
            }

            // Verificar se é 403 (Token inválido/expirado)
            if (response.status === 403 && !isRetry) {
                console.warn('⚠️ Token expirado (403) - tentando renovar...');
                try {
                    await this.refreshAccessToken();
                    // Tentar novamente com novo token
                    return this.request(endpoint, options, true);
                } catch (refreshError) {
                    console.error('❌ Falha ao renovar token:', refreshError);
                    throw new Error('Token inválido ou expirado');
                }
            }

            // Tentar fazer parse do JSON
            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                // Se falhar o parse, pode ser HTML (erro do servidor)
                console.error('❌ Resposta não é JSON válido:', jsonError);
                throw new Error(`Erro no servidor (status ${response.status})`);
            }

            if (!response.ok) {
                // ✅ Preservar informações adicionais do erro (ex: ingredientes similares)
                const error = new Error(data.message || 'Erro na requisição');
                error.statusCode = response.status;
                if (data.similar) {
                    error.similar = data.similar; // Lista de ingredientes similares (409)
                }
                throw error;
            }

            return data;
        } catch (error) {
            // Logar message/statusCode/stack explicitamente: o bridge nativo do Capacitor (app iOS)
            // serializa objetos Error como "{}" no console, escondendo a causa real.
            console.error('❌ Erro na API:', error && error.message ? error.message : String(error), error && error.statusCode ? `(status ${error.statusCode})` : '(sem status - possível erro de rede/CORS/JSON)');
            if (error && error.stack) {
                console.error('❌ Stack:', error.stack);
            }
            throw error;
        }
    }

    // EVENTOS
    async getEvents() {
        return this.request('/api/events');
    }

    async getEvent(eventId) {
        return this.request(`/api/events/${eventId}`);
    }

    async createEvent(event) {
        return this.request('/api/events', {
            method: 'POST',
            body: JSON.stringify(event)
        });
    }

    async updateEvent(eventId, event) {
        return this.request(`/api/events/${eventId}`, {
            method: 'PUT',
            body: JSON.stringify(event)
        });
    }

    async deleteEvent(eventId) {
        return this.request(`/api/events/${eventId}`, {
            method: 'DELETE'
        });
    }

    // INGREDIENTES
    async getIngredients() {
        return this.request('/api/ingredients');
    }

    async getDefaultIngredients() {
        // Buscar ingredientes padrão (para modo OFFLINE)
        return this.request('/api/public/default-ingredients');
    }

    async initializeIngredientsFromPublic() {
        return this.request('/api/ingredients/initialize-from-public', {
            method: 'POST'
        });
    }

    async createIngredient(ingredient, force = false) {
        const url = force ? '/api/ingredients?force=true' : '/api/ingredients';
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(ingredient)
        });
    }

    async updateIngredient(ingredientId, ingredient) {
        return this.request(`/api/ingredients/${ingredientId}`, {
            method: 'PUT',
            body: JSON.stringify(ingredient)
        });
    }

    async deleteIngredient(ingredientId) {
        return this.request(`/api/ingredients/${ingredientId}`, {
            method: 'DELETE'
        });
    }

    // PRATOS (DISHES)
    async getDishes() {
        return this.request('/api/dishes');
    }

    // ⚡ OTIMIZADO: Buscar pratos com dados mínimos (sem ingredients/photos)
    async getDishSummary() {
        return this.request('/api/dishes/summary');
    }

    // Buscar prato específico por ID (com ingredients e photos)
    async getDish(dishId) {
        return this.request(`/api/dishes/${dishId}`);
    }

    async createDish(dish) {
        return this.request('/api/dishes', {
            method: 'POST',
            body: JSON.stringify(dish)
        });
    }

    async initializeDishesFromPublic() {
        return this.request('/api/dishes/initialize-from-public', {
            method: 'POST'
        });
    }

    async updateDish(dishId, dish) {
        return this.request(`/api/dishes/${dishId}`, {
            method: 'PUT',
            body: JSON.stringify(dish)
        });
    }

    async deleteDish(dishId) {
        return this.request(`/api/dishes/${dishId}`, {
            method: 'DELETE'
        });
    }

    async duplicateDish(dishId) {
        return this.request(`/api/dishes/${dishId}/duplicate`, {
            method: 'POST'
        });
    }

    async recalculateDishCosts() {
        return this.request('/api/dishes/recalculate-costs', {
            method: 'POST'
        });
    }

    // CARDÁPIOS (SAVED MENUS)
    async getSavedMenus() {
        return this.request('/api/savedMenus');
    }

    async createSavedMenu(menu) {
        return this.request('/api/savedMenus', {
            method: 'POST',
            body: JSON.stringify(menu)
        });
    }

    async updateSavedMenu(menuId, menu) {
        return this.request(`/api/savedMenus/${menuId}`, {
            method: 'PUT',
            body: JSON.stringify(menu)
        });
    }

    async deleteSavedMenu(menuId) {
        return this.request(`/api/savedMenus/${menuId}`, {
            method: 'DELETE'
        });
    }

    async duplicateSavedMenu(menuId) {
        return this.request(`/api/savedMenus/${menuId}/duplicate`, {
            method: 'POST'
        });
    }

    // CLIENTES
    async getClients() {
        return this.request('/api/clients');
    }

    async createClient(client) {
        return this.request('/api/clients', {
            method: 'POST',
            body: JSON.stringify(client)
        });
    }

    async updateClient(clientId, client) {
        return this.request(`/api/clients/${clientId}`, {
            method: 'PUT',
            body: JSON.stringify(client)
        });
    }

    // CRM (etapa 1): funil e linha do tempo
    async getClient(clientId) {
        return this.request(`/api/clients/${clientId}`);
    }

    async updateClientStage(clientId, stage, lostReason) {
        return this.request(`/api/clients/${clientId}/stage`, {
            method: 'PATCH',
            body: JSON.stringify({ stage, lostReason })
        });
    }

    async updateProposalStage(proposalId, stage, lostReason) {
        return this.request(`/api/proposals/${proposalId}/stage`, {
            method: 'PATCH',
            body: JSON.stringify({ stage, lostReason })
        });
    }

    async getClientActivities(clientId) {
        return this.request(`/api/clients/${clientId}/activities`);
    }

    async addClientActivity(clientId, activity) {
        return this.request(`/api/clients/${clientId}/activities`, {
            method: 'POST',
            body: JSON.stringify(activity)
        });
    }

    async deleteClientActivity(clientId, activityId) {
        return this.request(`/api/clients/${clientId}/activities/${activityId}`, {
            method: 'DELETE'
        });
    }

    // CRM (etapa 2): tarefas e lembretes
    async getTasks(params = {}) {
        const q = new URLSearchParams();
        if (params.status) q.set('status', params.status);
        if (params.clientId) q.set('clientId', params.clientId);
        const qs = q.toString();
        return this.request('/api/tasks' + (qs ? '?' + qs : ''));
    }

    async createTask(task) {
        return this.request('/api/tasks', { method: 'POST', body: JSON.stringify(task) });
    }

    async updateTask(taskId, fields) {
        return this.request(`/api/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(fields) });
    }

    async deleteTask(taskId) {
        return this.request(`/api/tasks/${taskId}`, { method: 'DELETE' });
    }

    async deleteClient(clientId) {
        return this.request(`/api/clients/${clientId}`, {
            method: 'DELETE'
        });
    }

    // EMPRESA (COMPANY)
    async getCompany() {
        return this.request('/api/company');
    }

    async updateCompany(companyData) {
        return this.request('/api/company', {
            method: 'PUT',
            body: JSON.stringify(companyData)
        });
    }

    // PROPOSTAS
    async getProposals() {
        return this.request('/api/proposals');
    }

    async createProposal(proposal) {
        return this.request('/api/proposals', {
            method: 'POST',
            body: JSON.stringify(proposal)
        });
    }

    async updateProposal(proposalId, proposal) {
        return this.request(`/api/proposals/${proposalId}`, {
            method: 'PUT',
            body: JSON.stringify(proposal)
        });
    }

    async deleteProposal(proposalId) {
        return this.request(`/api/proposals/${proposalId}`, {
            method: 'DELETE'
        });
    }

    async duplicateProposal(proposalId) {
        return this.request(`/api/proposals/${proposalId}/duplicate`, {
            method: 'POST'
        });
    }
}

// ============================================================================
// INSTÂNCIA GLOBAL DA API
// ============================================================================

const api = new PrecificacaoAPI();

// ============================================================================
// HELPERS PARA INDEXEDDB
// ============================================================================

/**
 * Abre conexão com IndexedDB
 */
function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('precificacao_db', 3);

        request.onerror = () => {
            console.warn('IndexedDB não disponível');
            reject(request.error);
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = () => {
            // Não fazer nada - o banco já deve existir
        };

        // Timeout de 2 segundos
        setTimeout(() => reject(new Error('Timeout ao abrir IndexedDB')), 2000);
    });
}

/**
 * Busca todos os registros de uma object store
 */
function getAllFromStore(db, storeName) {
    return new Promise((resolve, reject) => {
        try {
            if (!db.objectStoreNames.contains(storeName)) {
                console.warn(`Object store "${storeName}" não existe`);
                resolve([]);
                return;
            }

            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                console.warn(`Erro ao ler ${storeName}:`, request.error);
                resolve([]);
            };
        } catch (error) {
            console.warn(`Erro ao acessar ${storeName}:`, error);
            resolve([]);
        }
    });
}

// ============================================================================
// MIGRAÇÃO DE DADOS DO LOCALSTORAGE PARA O BACKEND
// ============================================================================

async function migrateLocalStorageToBackend() {
    if (localStorage.getItem('migrated_to_backend') === 'true') {
        console.log('✅ Dados já foram migrados anteriormente');
        return;
    }

    try {
        let events = [];
        let ingredients = [];
        let dishes = [];
        let savedMenus = [];
        let clients = [];
        let proposals = [];
        let customTemplates = [];
        let companyData = null;
        let expenses = [];

        // Tentar carregar do IndexedDB primeiro (novo sistema)
        try {
            const db = await openIndexedDB();
            if (db) {
                events = await getAllFromStore(db, 'events');
                console.log(`📦 ${events.length} eventos carregados do IndexedDB`);
            }
        } catch (error) {
            console.warn('⚠️ IndexedDB não disponível, tentando localStorage:', error);
        }

        // Fallback: carregar do localStorage (sistema antigo)
        if (events.length === 0) {
            events = JSON.parse(localStorage.getItem('saved_events') || '[]');
            console.log(`📦 ${events.length} eventos carregados do localStorage (legado)`);
        }

        // Ingredientes ainda podem estar no localStorage
        ingredients = JSON.parse(localStorage.getItem('ingredients_database') || '[]');

        // Carregar pratos do localStorage
        dishes = JSON.parse(localStorage.getItem('precificacao_pratos') || '[]');
        console.log(`📦 ${dishes.length} pratos carregados do localStorage`);

        // Carregar cardápios salvos do localStorage
        savedMenus = JSON.parse(localStorage.getItem('precificacao_saved_menus') || '[]');
        console.log(`📦 ${savedMenus.length} cardápios salvos carregados do localStorage`);

        // ✅ NOVO: Carregar clientes do localStorage
        clients = JSON.parse(localStorage.getItem('precificacao_clients') || '[]');
        console.log(`📦 ${clients.length} clientes carregados do localStorage`);

        // ✅ NOVO: Carregar propostas do localStorage
        proposals = JSON.parse(localStorage.getItem('precificacao_propostas') || '[]');
        console.log(`📦 ${proposals.length} propostas carregadas do localStorage`);

        // ✅ NOVO: Carregar templates customizados do localStorage
        customTemplates = JSON.parse(localStorage.getItem('custom_templates') || '[]');
        console.log(`📦 ${customTemplates.length} templates customizados carregados do localStorage`);

        // ✅ NOVO: Carregar dados da empresa do localStorage
        try {
            // Campos individuais (formato antigo)
            const companyName = localStorage.getItem('company_name') || '';
            const companyPhone = localStorage.getItem('company_phone') || '';
            const companyEmail = localStorage.getItem('company_email') || '';
            const companyAddress = localStorage.getItem('company_address') || '';
            const companyHistory = localStorage.getItem('company_history') || '';
            const companyLogo = localStorage.getItem('company_logo') || '';
            const companyMission = localStorage.getItem('company_mission') || '';
            const companyVision = localStorage.getItem('company_vision') || '';
            const companyValues = localStorage.getItem('company_values') || '';
            const companyMotivation = localStorage.getItem('company_motivation') || '';
            const companyPhoto1 = localStorage.getItem('company_photo1') || null;
            const companyPhoto2 = localStorage.getItem('company_photo2') || null;
            const companyPhoto3 = localStorage.getItem('company_photo3') || null;

            // Tentar carregar objeto completo (formato novo - CompanyManager)
            let companyDataFromStorage = null;
            try {
                const stored = localStorage.getItem('precificacao_company_data');
                if (stored) {
                    companyDataFromStorage = JSON.parse(stored);
                }
            } catch (e) {
                console.warn('⚠️ Erro ao parsear precificacao_company_data:', e);
            }

            // Mesclar dados de ambas as fontes (prioridade para formato novo)
            if (companyDataFromStorage || companyName || companyPhone || companyEmail ||
                companyAddress || companyHistory || companyLogo || companyMission ||
                companyVision || companyValues || companyMotivation ||
                companyPhoto1 || companyPhoto2 || companyPhoto3) {

                companyData = {
                    companyName: companyDataFromStorage?.companyName || companyName,
                    companyPhone: companyDataFromStorage?.companyPhone || companyPhone,
                    companyEmail: companyDataFromStorage?.companyEmail || companyEmail,
                    companyAddress: companyDataFromStorage?.companyAddress || companyAddress,
                    companyHistory: companyDataFromStorage?.companyHistory || companyHistory,
                    companyLogo: companyDataFromStorage?.companyLogo || companyLogo,
                    companyMission: companyDataFromStorage?.companyMission || companyMission,
                    companyVision: companyDataFromStorage?.companyVision || companyVision,
                    companyValues: companyDataFromStorage?.companyValues || companyValues,
                    companyMotivation: companyDataFromStorage?.companyMotivation || companyMotivation,
                    companyPhoto1: companyDataFromStorage?.companyPhoto1 || companyPhoto1,
                    companyPhoto2: companyDataFromStorage?.companyPhoto2 || companyPhoto2,
                    companyPhoto3: companyDataFromStorage?.companyPhoto3 || companyPhoto3
                };
                console.log(`📦 Dados da empresa carregados do localStorage (${Object.keys(companyData).filter(k => companyData[k]).length} campos)`);
            }
        } catch (error) {
            console.warn('⚠️ Erro ao carregar dados da empresa:', error);
        }

        const totalItems = events.length + ingredients.length + dishes.length + savedMenus.length +
                          clients.length + proposals.length + customTemplates.length + (companyData ? 1 : 0);
        if (totalItems === 0) {
            console.log('ℹ️ Nenhum dado para migrar');
            localStorage.setItem('migrated_to_backend', 'true');
            return;
        }

        console.log(`📦 Migrando ${totalItems} itens para o backend...`);
        console.log(`   - ${events.length} eventos`);
        console.log(`   - ${ingredients.length} ingredientes`);
        console.log(`   - ${dishes.length} pratos`);
        console.log(`   - ${savedMenus.length} cardápios salvos`);
        console.log(`   - ${clients.length} clientes`);
        console.log(`   - ${proposals.length} propostas`);
        console.log(`   - ${customTemplates.length} templates`);
        console.log(`   - ${companyData ? '1' : '0'} dados de empresa`);

        // Backup antes de migrar
        localStorage.setItem('backup_before_migration', JSON.stringify({
            events,
            ingredients,
            dishes,
            savedMenus,
            clients,
            proposals,
            customTemplates,
            companyData,
            migrated_at: new Date().toISOString()
        }));
        console.log('📁 Backup criado em: backup_before_migration');

        // Migrar eventos EM PARALELO (muito mais rápido)
        let migratedEvents = 0;
        if (events.length > 0) {
            const eventPromises = events.map(async (event) => {
                try {
                    // Mapear estrutura antiga para nova API
                    const eventData = {
                        name: event.name || event.nomeEvento || 'Evento Sem Nome',
                        eventDate: event.date || event.dataEvento || null,
                        location: event.location || event.local || '',
                        guests: parseInt(event.numeroConvidados || event.guests || 0),
                        monthsUntilEvent: parseInt(event.mesesAteEvento || event.monthsUntilEvent || 0),
                        stateData: event // Salvar todo o objeto antigo como stateData
                    };

                    await api.createEvent(eventData);
                    console.log(`✅ Evento migrado: ${eventData.name}`);
                    return true;
                } catch (error) {
                    console.warn(`⚠️ Erro ao migrar evento "${event.name}":`, error.message);
                    return false;
                }
            });

            const results = await Promise.all(eventPromises);
            migratedEvents = results.filter(r => r).length;
        }

        // Migrar ingredientes em lote (muito mais rápido)
        let migratedIngredients = 0;
        let skippedIngredients = 0;

        if (ingredients.length > 0) {
            try {
                console.log(`📦 Migrando ${ingredients.length} ingredientes em lote...`);

                const ingredientsData = ingredients.map(ing => ({
                    name: ing.name || ing.nome || 'Ingrediente',
                    unitCost: parseFloat(ing.unitCost || ing.price || ing.preco || 0),
                    lossPercentage: parseFloat(ing.lossPercentage || ing.perdaPercentual || 0),
                    unit: ing.unit || ing.unidade || 'g',
                    unitType: ing.unitType || ing.tipoUnidade || 'weight',
                    category: ing.category || ing.categoria || 'Outros'
                }));

                const response = await fetch(`${api.baseURL}/ingredients/import-bulk`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${api.licenseKey}`
                    },
                    body: JSON.stringify({ ingredients: ingredientsData })
                });

                const result = await response.json();

                if (result.success) {
                    migratedIngredients = result.count;
                    skippedIngredients = result.skipped || 0;
                    console.log(`✅ ${migratedIngredients} ingredientes migrados em lote`);
                    if (skippedIngredients > 0) {
                        console.log(`⏭️  ${skippedIngredients} ingredientes pulados (duplicados)`);
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Erro ao migrar ingredientes em lote:`, error.message);
            }
        }

        // ✅ FIX: Migrar pratos EM PARALELO
        let migratedDishes = 0;
        if (dishes.length > 0) {
            const dishPromises = dishes.map(async (dish) => {
                try {
                    // Mapear estrutura para API
                    const dishData = {
                        name: dish.name,
                        category: dish.category || 'Outros',
                        ingredients: dish.ingredients || [],
                        servings: dish.servings || 1,
                        totalCost: dish.totalCost || 0,
                        totalWeight: dish.totalWeight || 0,
                        description: dish.description || '',
                        photos: dish.photos || [],
                        technicalSheet: dish.technicalSheet || '',
                        observations: dish.observations || '',
                        isActive: dish.isActive !== false,
                        isFavorite: dish.isFavorite || false
                    };

                    await api.createDish(dishData);
                    console.log(`✅ Prato migrado: ${dishData.name}`);
                    return true;
                } catch (error) {
                    console.warn(`⚠️ Erro ao migrar prato "${dish.name}":`, error.message);
                    return false;
                }
            });

            const results = await Promise.all(dishPromises);
            migratedDishes = results.filter(r => r).length;
        }

        // ✅ FIX: Migrar cardápios salvos EM PARALELO
        let migratedMenus = 0;
        if (savedMenus.length > 0) {
            const menuPromises = savedMenus.map(async (menu) => {
                try {
                    // Mapear estrutura para API
                    const menuData = {
                        name: menu.name,
                        description: menu.description || '',
                        eventType: menu.eventType || 'outro',
                        dishes: menu.dishes || menu.menuData?.dishes || [],
                        isFavorite: menu.isFavorite || false
                    };

                    await api.createSavedMenu(menuData);
                    console.log(`✅ Cardápio migrado: ${menuData.name}`);
                    return true;
                } catch (error) {
                    console.warn(`⚠️ Erro ao migrar cardápio "${menu.name}":`, error.message);
                    return false;
                }
            });

            const results = await Promise.all(menuPromises);
            migratedMenus = results.filter(r => r).length;
        }

        // ✅ NOVO: Migrar clientes EM PARALELO
        let migratedClients = 0;
        if (clients.length > 0) {
            const clientPromises = clients.map(async (client) => {
                try {
                    const clientData = {
                        name: client.name || client.clientName,
                        email: client.email || client.clientEmail || '',
                        phone: client.phone || client.clientPhone || '',
                        cpf: client.cpf || client.clientCPF || '',
                        address: client.address || client.clientAddress || '',
                        observations: client.observations || client.obs || ''
                    };

                    await api.createClient(clientData);
                    console.log(`✅ Cliente migrado: ${clientData.name}`);
                    return true;
                } catch (error) {
                    console.warn(`⚠️ Erro ao migrar cliente "${client.name}":`, error.message);
                    return false;
                }
            });

            const results = await Promise.all(clientPromises);
            migratedClients = results.filter(r => r).length;
        }

        // ✅ NOVO: Migrar propostas EM PARALELO
        let migratedProposals = 0;
        if (proposals.length > 0) {
            const proposalPromises = proposals.map(async (proposal) => {
                try {
                    const proposalData = {
                        clientId: proposal.clientId,
                        eventName: proposal.eventName || proposal.name,
                        eventDate: proposal.eventDate,
                        guests: proposal.guests || proposal.numeroConvidados || 0,
                        totalCost: proposal.totalCost || proposal.valorTotal || 0,
                        status: proposal.status || 'pending',
                        notes: proposal.notes || proposal.observacoes || '',
                        proposalData: proposal // Salvar dados completos
                    };

                    await api.createProposal(proposalData);
                    console.log(`✅ Proposta migrada: ${proposalData.eventName}`);
                    return true;
                } catch (error) {
                    console.warn(`⚠️ Erro ao migrar proposta "${proposal.eventName}":`, error.message);
                    return false;
                }
            });

            const results = await Promise.all(proposalPromises);
            migratedProposals = results.filter(r => r).length;
        }

        // ✅ NOVO: Migrar templates customizados EM PARALELO
        let migratedTemplates = 0;
        if (customTemplates.length > 0) {
            const templatePromises = customTemplates.map(async (template) => {
                try {
                    const templateData = {
                        name: template.name,
                        type: template.type || 'custom',
                        content: template.content || template.template || '',
                        category: template.category || 'Geral'
                    };

                    await api.createTemplate(templateData);
                    console.log(`✅ Template migrado: ${templateData.name}`);
                    return true;
                } catch (error) {
                    console.warn(`⚠️ Erro ao migrar template "${template.name}":`, error.message);
                    return false;
                }
            });

            const results = await Promise.all(templatePromises);
            migratedTemplates = results.filter(r => r).length;
        }

        // ✅ NOVO: Migrar dados da empresa
        let migratedCompany = 0;
        if (companyData) {
            try {
                await api.updateCompany(companyData);
                migratedCompany = 1;
                console.log(`✅ Dados da empresa migrados`);
            } catch (error) {
                console.warn(`⚠️ Erro ao migrar dados da empresa:`, error.message);
            }
        }

        // Marcar como migrado
        localStorage.setItem('migrated_to_backend', 'true');

        // Limpar dados antigos somente se migração foi bem-sucedida
        const anyMigrated = migratedEvents > 0 || migratedIngredients > 0 || migratedDishes > 0 ||
                           migratedMenus > 0 || migratedClients > 0 || migratedProposals > 0 ||
                           migratedTemplates > 0 || migratedCompany > 0;

        if (anyMigrated) {
            // Limpar dados migrados
            localStorage.removeItem('saved_events');
            localStorage.removeItem('ingredients_database');
            localStorage.removeItem('precificacao_pratos');
            localStorage.removeItem('precificacao_saved_menus');
            localStorage.removeItem('precificacao_clients');
            localStorage.removeItem('precificacao_propostas');
            localStorage.removeItem('custom_templates');
            localStorage.removeItem('precificacao_company_data');

            // Limpar campos individuais da empresa
            localStorage.removeItem('company_name');
            localStorage.removeItem('company_phone');
            localStorage.removeItem('company_email');
            localStorage.removeItem('company_address');
            localStorage.removeItem('company_history');
            localStorage.removeItem('company_logo');
            localStorage.removeItem('company_mission');
            localStorage.removeItem('company_vision');
            localStorage.removeItem('company_values');
            localStorage.removeItem('company_motivation');
            localStorage.removeItem('company_photo1');
            localStorage.removeItem('company_photo2');
            localStorage.removeItem('company_photo3');

            console.log('🧹 LocalStorage limpo após migração bem-sucedida');
        }

        console.log('✅ Migração concluída!');
        console.log(`   - ${migratedEvents}/${events.length} eventos migrados`);
        console.log(`   - ${migratedIngredients}/${ingredients.length} ingredientes migrados`);
        console.log(`   - ${migratedDishes}/${dishes.length} pratos migrados`);
        console.log(`   - ${migratedMenus}/${savedMenus.length} cardápios migrados`);
        console.log(`   - ${migratedClients}/${clients.length} clientes migrados`);
        console.log(`   - ${migratedProposals}/${proposals.length} propostas migradas`);
        console.log(`   - ${migratedTemplates}/${customTemplates.length} templates migrados`);
        console.log(`   - ${migratedCompany}/${companyData ? '1' : '0'} dados de empresa migrados`);

        return {
            success: true,
            migratedEvents,
            migratedIngredients,
            migratedDishes,
            migratedMenus,
            migratedClients,
            migratedProposals,
            migratedTemplates,
            migratedCompany,
            totalEvents: events.length,
            totalIngredients: ingredients.length,
            totalDishes: dishes.length,
            totalMenus: savedMenus.length,
            totalClients: clients.length,
            totalProposals: proposals.length,
            totalTemplates: customTemplates.length
        };

    } catch (error) {
        console.error('❌ Erro na migração:', error);
        alert('Erro ao migrar dados para o servidor. Seus dados locais estão seguros no backup.');
        throw error;
    }
}

// ============================================================================
// GERENCIADOR DE EVENTOS
// ============================================================================

class EventManager {
    constructor(api) {
        this.api = api;
        this.events = [];
        this.loading = false;
        this.cacheTime = null;
        this.cacheTTL = 5 * 60 * 1000; // 5 minutos
    }

    async loadEvents() {
        this.loading = true;
        try {
            const result = await this.api.getEvents();
            // API retorna { success: true, data: [...], count: N }
            const events = result.data || result.events || [];
            this.events = events;
            this.cacheTime = Date.now();
            console.log(`☁️ ${this.events.length} eventos carregados do backend`);
            return this.events;
        } finally {
            this.loading = false;
        }
    }

    // Método compatível com SavedEventsManager local
    async getAll(forceReload = false) {
        const now = Date.now();
        const cacheValid = this.cacheTime && (now - this.cacheTime < this.cacheTTL);

        // Se cache válido e não forçar reload, retornar do cache
        if (!forceReload && cacheValid && this.events.length >= 0) {
            console.log('📦 [EventManager] Cache hit - retornando do cache');
            return this.events;
        }

        // Cache inválido ou forçando reload
        console.log('🔄 [EventManager] Cache miss - carregando do backend...');
        await this.loadEvents();
        return this.events;
    }

    // Invalida cache manualmente
    invalidateCache() {
        this.cacheTime = null;
        console.log('🗑️ [EventManager] Cache invalidado');
    }

    async saveEvent(eventData) {
        // Mapear para estrutura esperada pela API
        const event = {
            id: eventData.id || undefined,
            name: eventData.name || eventData.nomeEvento || 'Novo Evento',
            eventDate: eventData.date || eventData.dataEvento || eventData.eventDate || null,
            location: eventData.location || eventData.local || eventData.eventLocation || '',
            guests: parseInt(eventData.numeroConvidados || eventData.guests || eventData.data?.guests || 0),
            monthsUntilEvent: parseInt(eventData.mesesAteEvento || eventData.monthsUntilEvent || eventData.data?.monthsUntilEvent || 0),
            totalWithInflation: eventData.results?.totalWithInflation || 0,
            totalWithMargin: eventData.results?.totalWithMargin || 0,
            pricePerPerson: eventData.results?.pricePerPerson || 0,
            stateData: eventData // Salvar estado completo (inclui support, labor, transport)
        };

        // Se tem ID, atualizar evento existente; senão, criar novo
        // ✅ FIX: updateEvent lança exceção (404) quando o evento ainda não existe no backend
        // (ex: evento NOVO, cujo ID já vem pré-gerado pelo CloudStorageAdapter) — por isso o
        // fallback para createEvent precisa estar num catch, não só num "if (!result.success)".
        let result;
        if (event.id) {
            try {
                result = await this.api.updateEvent(event.id, event);
            } catch (updateError) {
                console.log('ℹ️ updateEvent falhou (provavelmente evento novo, ainda não existe no backend) - criando:', updateError.message);
                result = { success: false };
            }
            if (!result.success) {
                // Evento não existe no backend ainda — criar com o mesmo ID
                result = await this.api.createEvent(event);
            }
        } else {
            result = await this.api.createEvent(event);
        }
        if (result.success) {
            // API retorna { success: true, data: event }
            // Verificar se evento já existe no cache
            const existingIndex = this.events.findIndex(e => e.id === result.data.id);
            if (existingIndex !== -1) {
                // Atualizar evento existente
                this.events[existingIndex] = result.data;
                window.dispatchEvent(new CustomEvent('events-updated', { detail: { action: 'update', event: result.data } }));
            } else {
                // Adicionar novo evento
                this.events.push(result.data);
                window.dispatchEvent(new CustomEvent('events-updated', { detail: { action: 'create', event: result.data } }));
            }
            this.cacheTime = Date.now(); // Atualizar cache time
        }
        return result;
    }

    async updateEvent(eventId, eventData) {
        // Mapear para estrutura esperada pela API
        const update = {
            name: eventData.name || eventData.nomeEvento,
            eventDate: eventData.date || eventData.dataEvento || eventData.eventDate || null,
            location: eventData.location || eventData.local || eventData.eventLocation || '',
            guests: parseInt(eventData.numeroConvidados || eventData.guests || eventData.data?.guests || 0),
            monthsUntilEvent: parseInt(eventData.mesesAteEvento || eventData.monthsUntilEvent || eventData.data?.monthsUntilEvent || 0),
            // Adicionar valores calculados no nível raiz para fácil acesso na listagem
            totalWithInflation: eventData.results?.totalWithInflation || 0,
            pricePerPerson: eventData.results?.pricePerPerson || 0,
            stateData: eventData
        };

        const result = await this.api.updateEvent(eventId, update);
        if (result.success) {
            const index = this.events.findIndex(e => e.id === eventId);
            if (index !== -1) {
                this.events[index] = result.data;
            }
        }
        return result;
    }

    async deleteEvent(eventId) {
        const result = await this.api.deleteEvent(eventId);
        if (result.success) {
            this.events = this.events.filter(e => e.id !== eventId);
        }
        return result;
    }

    getEventById(eventId) {
        // Procurar primeiro no cache em memória
        const cachedEvent = this.events.find(e => e.id === eventId);
        if (cachedEvent) {
            console.log('📦 Evento encontrado no cache:', eventId);
            return cachedEvent;
        }

        // Se não encontrou no cache, retornar null
        // (o CloudStorageAdapter vai criar novo)
        console.log('❌ Evento NÃO encontrado no cache:', eventId);
        return null;
    }

    async getEventByIdAsync(eventId, forceRefresh = false) {
        // Versão assíncrona que busca do backend se necessário
        // ✅ FIX: forceRefresh=true ignora o cache em memória e busca a versão atual
        // no backend. Sem isso, abrir um evento editado em OUTRO aparelho (ex: iOS → web)
        // devolvia a cópia antiga carregada junto com a lista.
        const cachedEvent = this.events.find(e => e.id === eventId);
        if (cachedEvent && !forceRefresh) {
            return cachedEvent;
        }

        // Buscar do backend
        try {
            const result = await this.api.getEvent(eventId);
            if (result.success && result.data) {
                const index = this.events.findIndex(e => e.id === eventId);
                if (index !== -1) {
                    this.events[index] = result.data; // Atualizar cache com a versão do backend
                }
                return result.data;
            }
        } catch (error) {
            console.warn('⚠️ Erro ao buscar evento do backend:', error.message);
        }

        // Fallback: se o backend falhou, usar o cache (se houver)
        return cachedEvent || null;
    }
}

// ============================================================================
// GERENCIADOR DE INGREDIENTES
// ============================================================================

class IngredientManager {
    constructor(api) {
        this.api = api;
        this.ingredients = [];
        this.loading = false;
        this.initialized = false;
    }

    async loadIngredients() {
        // ⚡ Cache: Se já carregou, retorna sem fazer nova requisição
        if (this.ingredients.length > 0) {
            return this.ingredients;
        }

        this.loading = true;
        try {
            // ⚡ OTIMIZAÇÃO: Carregar ingredientes primeiro para verificar se usuário já tem
            const result = await this.api.getIngredients();
            const rawIngredients = result.data || result.ingredients || [];

            // ✅ Se usuário não tem ingredientes, carregar padrão diretamente
            if (rawIngredients.length === 0 && !this.initialized) {
                console.log('🔄 Primeira carga sem ingredientes - carregando base pública...');
                try {
                    // Carregar ingredientes padrão diretamente do endpoint público
                    const defaultResult = await this.api.getDefaultIngredients();
                    if (defaultResult.success && defaultResult.data) {
                        console.log(`✅ ${defaultResult.count} ingredientes padrão carregados`);
                        rawIngredients.length = 0;
                        rawIngredients.push(...defaultResult.data);
                    } else {
                        console.warn('⚠️ Nenhum ingrediente padrão encontrado');
                    }
                    this.initialized = true;
                } catch (error) {
                    console.error('❌ Erro ao carregar ingredientes padrão:', error.message);
                    this.initialized = true;
                }
            } else if (!this.initialized) {
                console.log(`⚡ Usuário já possui ${rawIngredients.length} ingredientes - pulando inicialização`);
                this.initialized = true;
            }

            // Mapear campos do PostgreSQL para frontend
            // Backend → Frontend:
            // - cost_per_unit (65.00) → costPerUnit (Custo/Un - valor da embalagem)
            // - unit_cost (0.07) → unitCost (Custo Unit. - valor por grama)
            // - loss_percentage (0.20) → loss/lossPercentage (Perda %)
            // - unit_size (1000) → unitSize (Tam. Un.)
            this.ingredients = rawIngredients.map(ing => ({
                ...ing,
                // PRIORIDADE CORRETA: costPerUnit (embalagem) → unitCost (por grama) → 0
                costPerUnit: parseFloat(ing.costPerUnit || ing.unitCost || 0),
                price: parseFloat(ing.costPerUnit || ing.unitCost || ing.price || 0),
                preco: parseFloat(ing.costPerUnit || ing.unitCost || ing.preco || 0),
                unitCost: parseFloat(ing.unitCost || 0), // Custo por grama
                unitSize: ing.unitSize ? parseFloat(ing.unitSize) : 0,
                loss: ing.lossPercentage ? parseFloat(ing.lossPercentage) : 0,
                lossPercentage: ing.lossPercentage ? parseFloat(ing.lossPercentage) : 0
            }));

            // Expor ingredientes em window.PrecificacaoAPI para compatibilidade
            if (window.PrecificacaoAPI) {
                window.PrecificacaoAPI.ingredientes = this.ingredients;
            }

            console.log(`✅ ${this.ingredients.length} ingredientes carregados`);
            return this.ingredients;
        } finally {
            this.loading = false;
        }
    }

    async addIngredient(ingredientData, force = false) {
        // Mapear para estrutura esperada pela API
        const ingredient = {
            name: ingredientData.name || ingredientData.nome || 'Ingrediente',
            unitCost: parseFloat(ingredientData.unitCost || ingredientData.costPerUnit || ingredientData.price || ingredientData.preco || 0),
            lossPercentage: parseFloat(ingredientData.lossPercentage || ingredientData.loss || ingredientData.perdaPercentual || 0),
            unit: ingredientData.unit || ingredientData.unidade || 'g',
            unitType: ingredientData.unitType || ingredientData.tipoUnidade || 'weight',
            category: ingredientData.category || ingredientData.categoria || 'Outros',
            costPerUnit: ingredientData.costPerUnit ? parseFloat(ingredientData.costPerUnit) : null,
            unitSize: ingredientData.unitSize ? parseFloat(ingredientData.unitSize) : null
        };

        const result = await this.api.createIngredient(ingredient, force);
        if (result.success) {
            // API retorna { success: true, data: ingredient }
            // Mapear resposta do backend (unitCost Decimal/string) para frontend (costPerUnit number)
            const mappedIngredient = {
                ...result.data,
                costPerUnit: parseFloat(result.data.costPerUnit || result.data.unitCost || 0),
                price: parseFloat(result.data.unitCost || result.data.price || 0),
                preco: parseFloat(result.data.unitCost || result.data.preco || 0),
                unitSize: result.data.unitSize ? parseFloat(result.data.unitSize) : 0,
                loss: result.data.lossPercentage ? parseFloat(result.data.lossPercentage) : 0,
                lossPercentage: result.data.lossPercentage ? parseFloat(result.data.lossPercentage) : 0
            };
            this.ingredients.push(mappedIngredient);
        }
        return result;
    }

    async updateIngredient(ingredientId, ingredientData) {
        // Mapear para estrutura esperada pela API
        // Usar ?? em vez de || para preservar valores 0 (zero é válido para perda)
        const update = {
            name: ingredientData.name || ingredientData.nome,
            unitCost: parseFloat(ingredientData.unitCost || ingredientData.costPerUnit || ingredientData.price || ingredientData.preco || 0),
            lossPercentage: parseFloat(ingredientData.lossPercentage ?? ingredientData.loss ?? ingredientData.perdaPercentual ?? 0),
            yieldMultiplier: parseFloat(ingredientData.yieldMultiplier ?? 1),
            unit: ingredientData.unit || ingredientData.unidade || 'g',
            unitType: ingredientData.unitType || ingredientData.tipoUnidade || 'weight',
            category: ingredientData.category || ingredientData.categoria || 'Outros',
            costPerUnit: ingredientData.costPerUnit ? parseFloat(ingredientData.costPerUnit) : undefined,
            unitSize: ingredientData.unitSize ? parseFloat(ingredientData.unitSize) : undefined
        };

        const result = await this.api.updateIngredient(ingredientId, update);
        if (result.success) {
            // Mapear resposta do backend (unitCost Decimal/string) para frontend (costPerUnit number)
            const mappedIngredient = {
                ...result.data,
                costPerUnit: parseFloat(result.data.costPerUnit || result.data.unitCost || 0),
                price: parseFloat(result.data.unitCost || result.data.price || 0),
                preco: parseFloat(result.data.unitCost || result.data.preco || 0),
                unitSize: result.data.unitSize ? parseFloat(result.data.unitSize) : 0,
                loss: result.data.lossPercentage ? parseFloat(result.data.lossPercentage) : 0,
                lossPercentage: result.data.lossPercentage ? parseFloat(result.data.lossPercentage) : 0
            };

            const index = this.ingredients.findIndex(i => i.id === ingredientId);
            if (index !== -1) {
                this.ingredients[index] = mappedIngredient;
            }
        }
        return result;
    }

    async deleteIngredient(ingredientId) {
        const result = await this.api.deleteIngredient(ingredientId);
        if (result.success) {
            this.ingredients = this.ingredients.filter(i => i.id !== ingredientId);
        }
        return result;
    }

    /**
     * Importar ingredientes em lote (para migração do localStorage)
     */
    async importBulk(ingredientsData) {
        try {
            const response = await fetch(`${this.api.baseURL}/ingredients/import-bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.api.licenseKey}`
                },
                body: JSON.stringify({ ingredients: ingredientsData })
            });

            const result = await response.json();

            if (result.success) {
                // Atualizar cache local com ingredientes importados
                this.ingredients = [...this.ingredients, ...(result.data || [])];
                console.log(`✅ ${result.count} ingredientes importados para PostgreSQL`);
                if (result.skipped > 0) {
                    console.log(`⏭️  ${result.skipped} ingredientes pulados (duplicados)`);
                }
            }

            return result;
        } catch (error) {
            console.error('Erro ao importar ingredientes:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
}

// ============================================================================
// GERENCIADOR DE PRATOS (DISHES)
// ============================================================================

class DishManager {
    constructor(api) {
        this.api = api;
        this.dishes = [];
        this.activeDishes = null; // ✅ Cache para pratos ativos
        this.loading = false;
        this.cacheTime = null;  // Timestamp do último carregamento
        this.CACHE_DURATION = 5 * 60 * 1000; // ⚡ 5 minutos de cache (aumentado de 2min)
    }

    async loadDishes(forceReload = false) {
        // Se já está carregando, aguardar
        if (this.loading) {
            console.log('⏳ [DishManager] Já carregando pratos, aguardando...');
            while (this.loading) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return this.dishes;
        }

        this.loading = true;
        try {
            // ⚡ OTIMIZADO: Usar getDishSummary() para listagem (75% mais rápido)
            // Carrega apenas dados essenciais sem ingredients/photos (elimina N+1 queries)
            const result = await this.api.getDishSummary();
            this.dishes = result.data || result.dishes || [];
            this.activeDishes = null; // ✅ Invalidar cache de ativos ao recarregar
            this.cacheTime = Date.now(); // Atualizar tempo do cache
            console.log(`⚡ [DishManager] ${this.dishes.length} pratos carregados (modo otimizado)`);
            return this.dishes;
        } finally {
            this.loading = false;
        }
    }

    async saveDish(dishData) {
        const result = await this.api.createDish(dishData);
        if (result.success && result.data) {
            this.dishes.push(result.data);
            this.activeDishes = null; // ✅ Invalidar cache de ativos
            this.cacheTime = Date.now(); // Atualizar cache após criar
        }
        return result;
    }

    async updateDish(dishId, dishData) {
        const result = await this.api.updateDish(dishId, dishData);
        if (result.success && result.data) {
            const index = this.dishes.findIndex(d => d.id === dishId);
            if (index !== -1) {
                this.dishes[index] = result.data;
            }
            this.activeDishes = null; // ✅ Invalidar cache de ativos
            this.cacheTime = Date.now(); // Atualizar cache após editar
        }
        return result;
    }

    async deleteDish(dishId) {
        const result = await this.api.deleteDish(dishId);
        if (result.success) {
            this.dishes = this.dishes.filter(d => d.id !== dishId);
            this.activeDishes = null; // ✅ Invalidar cache de ativos
            this.cacheTime = Date.now(); // Atualizar cache após deletar
        }
        return result;
    }

    // Métodos de compatibilidade com DishManager local
    async saveItem(dishData) {
        // Se tem ID, é update; senão é create
        if (dishData.id) {
            return this.updateDish(dishData.id, dishData);
        } else {
            return this.saveDish(dishData);
        }
    }

    async getAll(forceReload = false) {
        // Verificar se cache é válido
        const now = Date.now();
        const cacheValid = this.cacheTime && (now - this.cacheTime < this.CACHE_DURATION);

        if (forceReload || !cacheValid || this.dishes.length === 0) {
            console.log(`🔄 [DishManager] Cache ${forceReload ? 'forçado' : !cacheValid ? 'expirado' : 'vazio'} - recarregando...`);
            await this.loadDishes();
        } else {
            console.log(`📦 [DishManager] Usando cache (${this.dishes.length} pratos)`);
        }
        return this.dishes;
    }

    async getActive() {
        // ✅ Usar cache de pratos ativos se disponível
        if (this.activeDishes && this.cacheTime) {
            const now = Date.now();
            const cacheValid = (now - this.cacheTime < this.CACHE_DURATION);
            if (cacheValid) {
                console.log(`⚡ [DishManager] Usando cache de pratos ativos (${this.activeDishes.length} pratos)`);
                return this.activeDishes;
            }
        }

        // ⚡ OTIMIZADO: Backend já filtra isActive=true, não precisa filtrar no frontend
        // Eliminado: all.filter(d => !d.isDeleted) - reduz 400-800ms
        console.log('🔄 [DishManager] Buscando pratos ativos...');
        const all = await this.getAll();
        this.activeDishes = all;  // Backend já retorna apenas ativos
        console.log(`✅ [DishManager] ${this.activeDishes.length} pratos ativos`);
        return this.activeDishes;
    }

    async getById(dishId) {
        if (this.dishes.length === 0) {
            await this.loadDishes();
        }
        return this.dishes.find(d => d.id === dishId) || null;
    }

    async duplicateDish(dishId) {
        // ✅ FIX: Usar endpoint de duplicação da API que busca o prato completo
        // (com ingredientes e fotos) ao invés de usar cache local que não tem ingredientes
        console.log(`📋 [DishManager] Duplicando via API endpoint: /api/dishes/${dishId}/duplicate`);
        const result = await this.api.duplicateDish(dishId);
        console.log(`📋 [DishManager] Resultado da duplicação via API:`, result);
        if (result.success && result.data) {
            console.log(`📋 [DishManager] Prato duplicado com ${result.data.ingredients?.length || 0} ingredientes`);
            this.dishes.push(result.data);
            this.activeDishes = null; // Invalidar cache de ativos
            this.cacheTime = Date.now();
        }
        return result;
    }

    async recalculateCosts() {
        const result = await this.api.recalculateDishCosts();
        if (result.success) {
            this.dishes = [];
            this.activeDishes = null;
            this.cacheTime = null;
            console.log('🔄 [DishManager] Cache invalidado após recalcular custos');
        }
        return result;
    }

    async toggleFavorite(dishId) {
        const dish = await this.getById(dishId);
        if (!dish) {
            return { success: false, message: 'Prato não encontrado' };
        }

        return this.updateDish(dishId, {
            ...dish,
            isFavorite: !dish.isFavorite
        });
    }

    async deleteItem(dishId, hardDelete = false) {
        // Backend sempre faz soft delete por padrão
        return this.deleteDish(dishId);
    }

    async getDetailedStatistics() {
        const dishes = await this.getActive();

        // ⚡ OTIMIZADO: Single-pass reduce (elimina 4 iterações separadas)
        const stats = dishes.reduce((acc, dish) => {
            // Contar por categoria
            const cat = dish.category || 'outro';
            acc.byCategory[cat] = (acc.byCategory[cat] || 0) + 1;

            // Somar custos
            acc.totalCost += (dish.totalCost || 0);
            acc.totalCostPerServing += (dish.costPerServing || 0);

            // Contar favoritos
            if (dish.isFavorite) {
                acc.favorites++;
            }

            return acc;
        }, {
            byCategory: {},
            totalCost: 0,
            totalCostPerServing: 0,
            favorites: 0
        });

        return {
            total: dishes.length,
            active: dishes.length,
            byCategory: stats.byCategory,
            avgCostPerServing: dishes.length > 0 ? stats.totalCostPerServing / dishes.length : 0,
            favorites: stats.favorites
        };
    }

    exportToJSON() {
        return JSON.stringify(this.dishes, null, 2);
    }
}

// ============================================================================
// GERENCIADOR DE CARDÁPIOS (SAVED MENUS)
// ============================================================================

class SavedMenuManager {
    constructor(api) {
        this.api = api;
        this.menus = [];
        this.loading = false;
    }

    async loadMenus() {
        // ⚡ Cache: Se já carregou, retorna sem fazer nova requisição
        if (this.menus.length > 0) {
            return this.menus;
        }

        this.loading = true;
        try {
            const result = await this.api.getSavedMenus();
            this.menus = result.data || result.menus || [];
            // ⚡ Performance: Log removido (executava após carregar cardápios)
            return this.menus;
        } finally {
            this.loading = false;
        }
    }

    async saveMenu(menuData) {
        const result = await this.api.createSavedMenu(menuData);
        if (result.success && result.data) {
            this.menus.push(result.data);
        }
        return result;
    }

    async updateMenu(menuId, menuData) {
        const result = await this.api.updateSavedMenu(menuId, menuData);
        if (result.success && result.data) {
            const index = this.menus.findIndex(m => m.id === menuId);
            if (index !== -1) {
                this.menus[index] = result.data;
            }
        }
        return result;
    }

    async deleteMenu(menuId) {
        const result = await this.api.deleteSavedMenu(menuId);
        if (result.success) {
            this.menus = this.menus.filter(m => m.id !== menuId);
        }
        return result;
    }

    // Métodos compatíveis com SavedMenusManager local
    async saveItem(menuData) {
        return this.saveMenu(menuData);
    }

    async getAll() {
        if (this.menus.length === 0) {
            await this.loadMenus();
        }

        // ✅ FIX: Recalcular stats se não existir
        return this.menus.map(menu => {
            if (!menu.stats && menu.dishes) {
                console.log('📊 [SavedMenuManager.getAll] Recalculando stats para:', menu.name);
                menu.stats = this.calculateMenuStats(menu.dishes);
            }
            return menu;
        });
    }

    /**
     * Calcula estatísticas do cardápio
     * @param {Array} dishes - Array de pratos do cardápio
     * @returns {Object} Estatísticas
     */
    calculateMenuStats(dishes) {
        if (!dishes || dishes.length === 0) {
            return {
                totalDishes: 0,
                totalCost: 0,
                totalPrice: 0, // ✅ Preço com margem
                totalWeight: 0,
                byCategory: {}
            };
        }

        const stats = {
            totalDishes: dishes.length,
            totalCost: 0,
            totalPrice: 0, // ✅ Preço com margem
            totalWeight: 0,
            byCategory: {}
        };

        dishes.forEach(dish => {
            // Calcular custo proporcional baseado em porções
            const totalWeight = dish.totalWeight || 0;
            const baseCost = dish.dishCost || dish.totalCost || 0;
            const portionsPerPerson = dish.portionsPerPerson || 1;
            const servings = dish.servings || 0;

            console.log(`📊 [calculateMenuStats] Prato: ${dish.dishName}`, {
                totalWeight,
                baseCost,
                portionsPerPerson,
                servings
            });

            // ✅ Considerar useWeightCalculation OU totalWeight === 0
            const isPortionBased = dish.useWeightCalculation || (servings > 0 && totalWeight === 0);
            let dishCost = 0;

            if (isPortionBased) {
                // Por porção do prato: totalCost / servings × porções por pessoa
                const costPerDishPortion = servings > 0 ? baseCost / servings : baseCost;
                dishCost = costPerDishPortion * portionsPerPerson;
                console.log(`  📊 Calculando por PORÇÃO: ${baseCost} / ${servings} × ${portionsPerPerson} = R$ ${dishCost.toFixed(2)}`);
            } else {
                // Por peso (100g por porção)
                const gramsPerPerson = portionsPerPerson * 100;
                if (totalWeight > 0) {
                    const costPerGram = baseCost / totalWeight;
                    dishCost = costPerGram * gramsPerPerson;
                    console.log(`  📊 Calculando por PESO: ${baseCost} / ${totalWeight}g × ${gramsPerPerson}g = R$ ${dishCost.toFixed(2)}`);
                } else {
                    console.warn(`⚠️ Prato "${dish.dishName}" sem peso e sem servings, usando custo base direto`);
                    dishCost = baseCost;
                }
            }

            stats.totalCost += dishCost;

            // ✅ Calcular preço com margem por pessoa
            let dishPrice = 0;

            console.log(`🔍 [${dish.dishName}] DEBUG MARGIN (api-client):`)
            console.log(`   - dishCost: R$ ${dishCost.toFixed(2)}`);
            console.log(`   - profitMargin: ${dish.profitMargin}%`);
            console.log(`   - suggestedPrice: R$ ${dish.suggestedPrice}`);

            // ✅ Prioridade 1: Calcular com profitMargin (sempre atualizado)
            if (dish.profitMargin && dish.profitMargin > 0) {
                dishPrice = dishCost * (1 + dish.profitMargin / 100);
                console.log(`   ✅ Usando profitMargin: ${dishCost.toFixed(2)} × (1 + ${dish.profitMargin}/100) = R$ ${dishPrice.toFixed(2)}`);
            }
            // Prioridade 2: Usar suggestedPrice se profitMargin não disponível
            else if (dish.suggestedPrice && dish.suggestedPrice > 0) {
                if (isPortionBased) {
                    // Por porção: suggestedPrice / servings × porções por pessoa
                    const pricePerPortion = servings > 0 ? dish.suggestedPrice / servings : dish.suggestedPrice;
                    dishPrice = pricePerPortion * portionsPerPerson;
                    console.log(`   ⚠️ Usando suggestedPrice por PORÇÃO: ${dish.suggestedPrice.toFixed(2)} / ${servings} × ${portionsPerPerson} = R$ ${dishPrice.toFixed(2)}`);
                } else if (totalWeight > 0) {
                    // Por peso: suggestedPrice / totalWeight × gramas por pessoa
                    const gramsPerPerson = portionsPerPerson * 100;
                    const pricePerGram = dish.suggestedPrice / totalWeight;
                    dishPrice = pricePerGram * gramsPerPerson;
                    console.log(`   ⚠️ Usando suggestedPrice por PESO: ${dish.suggestedPrice.toFixed(2)} / ${totalWeight}g × ${gramsPerPerson}g = R$ ${dishPrice.toFixed(2)}`);
                } else {
                    dishPrice = dish.suggestedPrice;
                    console.log(`   ⚠️ Usando suggestedPrice direto: R$ ${dishPrice.toFixed(2)}`);
                }
            }
            // Fallback: Usar apenas o custo (sem margem)
            else {
                dishPrice = dishCost;
                console.log(`   ⚠️ Sem margem, usando apenas custo: R$ ${dishPrice.toFixed(2)}`);
            }

            stats.totalPrice += dishPrice;

            // Peso por pessoa em gramas (100g por porção)
            const dishWeight = portionsPerPerson * 100;
            stats.totalWeight += dishWeight;

            // Por categoria
            const category = dish.dishCategory || dish.category || 'Sem categoria';
            if (!stats.byCategory[category]) {
                stats.byCategory[category] = {
                    count: 0,
                    cost: 0,
                    price: 0, // ✅ Preço com margem por categoria
                    weight: 0
                };
            }
            stats.byCategory[category].count++;
            stats.byCategory[category].cost += dishCost;
            stats.byCategory[category].price += dishPrice; // ✅ Adicionar preço com margem
            stats.byCategory[category].weight += dishWeight;
        });

        console.log('✅ [calculateMenuStats] Estatísticas calculadas:', stats);

        return stats;
    }

    async duplicateMenu(menuId) {
        const menu = this.menus.find(m => m.id === menuId);
        if (!menu) {
            return { success: false, message: 'Cardápio não encontrado' };
        }

        const duplicated = {
            ...menu,
            name: `${menu.name} (Cópia)`,
            id: undefined // Será gerado novo ID pelo backend
        };

        return this.saveMenu(duplicated);
    }

    async toggleFavorite(menuId) {
        const menu = this.menus.find(m => m.id === menuId);
        if (!menu) {
            return { success: false, message: 'Cardápio não encontrado' };
        }

        return this.updateMenu(menuId, {
            ...menu,
            isFavorite: !menu.isFavorite
        });
    }

    async loadMenuToEvent(menuId) {
        try {
            const menu = this.menus.find(m => m.id === menuId);

            if (!menu) {
                return { success: false, message: 'Cardápio não encontrado' };
            }

            // Extrair dishes do menuData (formato novo) ou do menu diretamente (formato legado)
            let dishes = [];
            if (menu.menuData && menu.menuData.dishes) {
                dishes = menu.menuData.dishes;
            } else if (menu.dishes) {
                dishes = menu.dishes;
            } else {
                return { success: false, message: 'Cardápio está vazio' };
            }

            if (dishes.length === 0) {
                return { success: false, message: 'Cardápio está vazio' };
            }

            return {
                success: true,
                message: `Cardápio "${menu.name}" carregado`,
                data: {
                    dishes: dishes,
                    menu: menu
                }
            };
        } catch (error) {
            console.error('Erro ao carregar cardápio:', error);
            return { success: false, message: 'Erro ao carregar cardápio: ' + error.message };
        }
    }

    async getById(menuId) {
        if (this.menus.length === 0) {
            await this.loadMenus();
        }
        return this.menus.find(m => m.id === menuId) || null;
    }
}

// ============================================================================
// GERENCIADOR DE CLIENTES
// ============================================================================

class ClientManager {
    constructor(api) {
        this.api = api;
        this.clients = [];
        this.loading = false;
    }

    async loadClients() {
        console.log(`🔄 [ClientManager.loadClients] CHAMADO! Cache: ${this.clients.length} clientes`);

        // ⚡ Cache: Se já carregou, retorna sem fazer nova requisição
        if (this.clients.length > 0) {
            console.log(`💾 [ClientManager.loadClients] Usando CACHE - retornando ${this.clients.length} clientes`);
            return this.clients;
        }

        console.log('🌐 [ClientManager.loadClients] Cache vazio - fazendo requisição HTTP...');
        this.loading = true;
        try {
            const result = await this.api.getClients();
            this.clients = result.data || result.clients || [];
            console.log(`📦 [ClientManager.loadClients] ${this.clients.length} clientes carregados da API`);
            if (this.clients.length > 0) {
                console.log('📋 [ClientManager.loadClients] Primeiro cliente da API:', this.clients[0]);
            }
            return this.clients;
        } finally {
            this.loading = false;
        }
    }

    // Método compatível com ClientManager local
    async getAllClients() {
        console.log(`🔄 [ClientManager.getAllClients] CHAMADO! Cache atual: ${this.clients.length} clientes`);

        if (this.clients.length === 0) {
            console.log('📥 [ClientManager.getAllClients] Cache vazio - chamando loadClients()...');
            await this.loadClients();
        }

        console.log(`📤 [ClientManager.getAllClients] Retornando ${this.clients.length} clientes`);
        return this.clients;
    }

    // Método compatível com ClientManager local
    async searchClients(query) {
        const clients = await this.getAllClients();
        const normalizedQuery = query.toLowerCase().trim();

        if (!normalizedQuery) {
            return clients;
        }

        return clients.filter(client => {
            return (
                client.name?.toLowerCase().includes(normalizedQuery) ||
                client.phone?.toLowerCase().includes(normalizedQuery) ||
                client.email?.toLowerCase().includes(normalizedQuery)
            );
        });
    }

    // Método compatível com ClientManager local
    async getStatistics() {
        const clients = await this.getAllClients();

        return {
            total: clients.length,
            withPhone: clients.filter(c => c.phone && c.phone.trim()).length,
            withEmail: clients.filter(c => c.email && c.email.trim()).length,
            withAddress: clients.filter(c => c.address && c.address.trim()).length
        };
    }

    // Método para buscar cliente por ID
    async getById(clientId) {
        // Carregar clientes se o cache estiver vazio
        if (this.clients.length === 0) {
            await this.loadClients();
        }

        // Buscar no cache
        const client = this.clients.find(c => c.id === clientId);

        if (client) {
            return client;
        }

        // Se não encontrou no cache, tentar buscar da API diretamente
        // (caso o cliente tenha sido criado recentemente por outro processo)
        console.log(`⚠️ [ClientManager] Cliente ${clientId} não encontrado no cache, recarregando...`);
        await this.loadClients();
        return this.clients.find(c => c.id === clientId) || null;
    }

    async saveClient(clientData) {
        // Verificar se é atualização (tem ID) ou criação (sem ID)
        const isUpdate = clientData.id && clientData.id !== null;

        console.log(`📤 [ClientManager.saveClient] ${isUpdate ? 'Atualizando' : 'Criando'} cliente:`, {
            id: clientData.id,
            name: clientData.name
        });

        let result;
        if (isUpdate) {
            // ATUALIZAR cliente existente (PUT /api/clients/:id)
            result = await this.updateClient(clientData.id, clientData);
        } else {
            // CRIAR novo cliente (POST /api/clients)
            result = await this.api.createClient(clientData);
            if (result.success && result.data) {
                this.clients.push(result.data);
            }
        }

        return result;
    }

    async updateClient(clientId, clientData) {
        const result = await this.api.updateClient(clientId, clientData);
        if (result.success && result.data) {
            const index = this.clients.findIndex(c => c.id === clientId);
            if (index !== -1) {
                this.clients[index] = result.data;
            }
        }
        return result;
    }

    async deleteClient(clientId) {
        const result = await this.api.deleteClient(clientId);
        if (result.success) {
            this.clients = this.clients.filter(c => c.id !== clientId);
        }
        return result;
    }
}

// ============================================================================
// GERENCIADOR DE EMPRESA (COMPANY)
// ============================================================================

class CompanyManager {
    constructor(api) {
        this.api = api;
        this.companyData = null;
        this.loading = false;
    }

    async loadCompany() {
        this.loading = true;
        try {
            const result = await this.api.getCompany();
            const backendData = result.data || result.company || null;

            // Mapear campos do backend (name, phone, email) para frontend (companyName, companyPhone, companyEmail)
            if (backendData) {
                this.companyData = {
                    companyName: backendData.name || '',
                    companyPhone: backendData.phone || '',
                    companyEmail: backendData.email || '',
                    companyAddress: backendData.address || '',
                    companyHistory: backendData.history || '',
                    companyMission: backendData.mission || '',
                    companyVision: backendData.vision || '',
                    companyValues: backendData.values || '',
                    companyMotivation: backendData.motivation || '',
                    // ✅ FIX: a logo nunca era lida do backend (campo "logo" no banco), só do
                    // localStorage do navegador onde foi enviada - por isso não aparecia no iOS
                    companyLogo: backendData.logo || null,
                    companyPhoto1: backendData.photo1 || null,
                    companyPhoto2: backendData.photo2 || null,
                    companyPhoto3: backendData.photo3 || null
                };
            } else {
                this.companyData = null;
            }

            console.log(`☁️ Dados da empresa carregados do backend`);
            return this.companyData;
        } finally {
            this.loading = false;
        }
    }

    async updateCompany(companyData) {
        // Mapear campos do frontend (companyName, companyPhone, companyEmail) para backend (name, phone, email)
        const backendData = {
            name: companyData.companyName || '',
            phone: companyData.companyPhone || '',
            email: companyData.companyEmail || '',
            address: companyData.companyAddress || '',
            history: companyData.companyHistory || '',
            mission: companyData.companyMission || '',
            vision: companyData.companyVision || '',
            values: companyData.companyValues || '',
            motivation: companyData.companyMotivation || '',
            // ✅ FIX: a logo nunca era enviada ao backend (o PDF gerado no servidor também usa company.logo)
            logo: companyData.companyLogo || null,
            photo1: companyData.companyPhoto1 || null,
            photo2: companyData.companyPhoto2 || null,
            photo3: companyData.companyPhoto3 || null
        };

        const result = await this.api.updateCompany(backendData);
        if (result.success && result.data) {
            // Mapear resposta do backend de volta para formato do frontend
            this.companyData = {
                companyName: result.data.name || '',
                companyPhone: result.data.phone || '',
                companyEmail: result.data.email || '',
                companyAddress: result.data.address || '',
                companyHistory: result.data.history || '',
                companyMission: result.data.mission || '',
                companyVision: result.data.vision || '',
                companyValues: result.data.values || '',
                companyMotivation: result.data.motivation || '',
                companyLogo: result.data.logo || null,
                companyPhoto1: result.data.photo1 || null,
                companyPhoto2: result.data.photo2 || null,
                companyPhoto3: result.data.photo3 || null
            };
        }
        return result;
    }

    // Método compatível com CompanyManager local
    async saveCompanyData(companyData) {
        return this.updateCompany(companyData);
    }
}

// ============================================================================
// GERENCIADOR DE PROPOSTAS
// ============================================================================

class ProposalManager {
    constructor(api) {
        this.api = api;
        this.proposals = [];
        this.loading = false;
    }

    /**
     * Gera UUID v4
     * @returns {string} UUID
     */
    generateUUID() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback para navegadores antigos
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async loadProposals() {
        console.log('🚀 [ProposalManager.loadProposals] CHAMADO! Cache:', this.proposals.length, 'propostas');

        // ⚡ Cache: Se já carregou, retorna sem fazer nova requisição
        if (this.proposals.length > 0) {
            console.log('💾 [ProposalManager.loadProposals] Usando CACHE - retornando', this.proposals.length, 'propostas');
            console.log('📋 [ProposalManager.loadProposals] Proposta do cache:', this.proposals[0]);
            return this.proposals;
        }

        console.log('🌐 [ProposalManager.loadProposals] Cache vazio - fazendo requisição HTTP...');
        this.loading = true;
        try {
            const result = await this.api.getProposals();
            let proposals = result.data || result.proposals || [];

            // ✅ FIX: Filtrar propostas com ID inválido (null/undefined/empty)
            const invalidProposals = proposals.filter(p => !p.id || p.id === null || p.id === '');
            if (invalidProposals.length > 0) {
                console.warn(`⚠️ [ProposalManager] ${invalidProposals.length} propostas com ID inválido foram IGNORADAS:`);
                invalidProposals.forEach(p => {
                    console.warn(`  - title: "${p.title}", id: ${p.id}`);
                });
            }

            proposals = proposals.filter(p => p.id && p.id !== null && p.id !== '');
            this.proposals = proposals;

            console.log(`📦 [ProposalManager.loadProposals] ${this.proposals.length} propostas VÁLIDAS carregadas da API`);
            if (this.proposals.length > 0) {
                console.log('📋 [ProposalManager.loadProposals] Primeira proposta da API:', this.proposals[0]);
            }
            return this.proposals;
        } finally {
            this.loading = false;
        }
    }

    async saveProposal(proposalData) {
        // Verificar se é atualização (tem ID) ou criação (sem ID)
        const isUpdate = proposalData.id && proposalData.id !== null;

        // ✅ FIX: Se for criação e não tem ID, gerar UUID ANTES de enviar
        if (!isUpdate && (!proposalData.id || proposalData.id === null)) {
            proposalData.id = this.generateUUID();
            console.log('🆔 [ProposalManager] UUID gerado para nova proposta:', proposalData.id);
        }

        console.log(`📤 [ProposalManager.saveProposal] ${isUpdate ? 'Atualizando' : 'Criando'} proposta:`, {
            id: proposalData.id,
            title: proposalData.proposalName || proposalData.title
        });

        // Transformar campos do frontend para o formato do backend
        const backendData = {
            ...proposalData,
            id: proposalData.id, // ✅ Garantir que ID está presente
            title: proposalData.proposalName || proposalData.title, // Backend espera 'title'
            proposalData: proposalData // Manter todos os dados originais também
        };

        let result;
        if (isUpdate) {
            // ATUALIZAR proposta existente
            result = await this.updateProposal(proposalData.id, backendData);
        } else {
            // CRIAR nova proposta (já com UUID gerado)
            result = await this.api.createProposal(backendData);
            if (result.success && result.data) {
                // ✅ Garantir que o ID gerado está na resposta
                if (!result.data.id || result.data.id === null) {
                    result.data.id = proposalData.id; // Usar o UUID que geramos
                    console.warn('⚠️ Backend não retornou ID - usando UUID gerado no frontend:', result.data.id);
                }
                this.proposals.push(result.data);
            }
        }

        return result;
    }

    async updateProposal(proposalId, proposalData) {
        // Transformar campos do frontend para o formato do backend
        const backendData = {
            ...proposalData,
            title: proposalData.proposalName || proposalData.title, // Backend espera 'title'
            proposalData: proposalData // Manter todos os dados originais também
        };

        console.log('📤 [ProposalManager] Atualizando no backend:', {
            id: proposalId,
            title: backendData.title,
            dishes: backendData.dishes?.length || 0
        });

        const result = await this.api.updateProposal(proposalId, backendData);
        if (result.success && result.data) {
            const index = this.proposals.findIndex(p => p.id === proposalId);
            if (index !== -1) {
                this.proposals[index] = result.data;
            }
        }
        return result;
    }

    async updateStatus(proposalId, newStatus) {
        console.log(`📤 [ProposalManager] Atualizando status da proposta ${proposalId} para "${newStatus}"`);

        // Buscar proposta atual do cache
        let proposal = this.proposals.find(p => p.id === proposalId);

        // Se não encontrou no cache, recarregar do backend
        if (!proposal) {
            console.warn(`⚠️ [ProposalManager] Proposta ${proposalId} não encontrada no cache, recarregando do backend...`);
            await this.loadProposals();
            proposal = this.proposals.find(p => p.id === proposalId);

            if (!proposal) {
                throw new Error(`Proposta ${proposalId} não encontrada no backend`);
            }
        }

        // Atualizar apenas o status
        const result = await this.updateProposal(proposalId, {
            ...proposal,
            status: newStatus
        });

        console.log(`✅ [ProposalManager] Status atualizado com sucesso`);
        return result;
    }

    async deleteProposal(proposalId) {
        const result = await this.api.deleteProposal(proposalId);
        if (result.success) {
            this.proposals = this.proposals.filter(p => p.id !== proposalId);
        }
        return result;
    }

    async duplicateProposal(proposalId) {
        console.log(`📋 [ProposalManager] Duplicando proposta ${proposalId}`);

        // Buscar proposta original do cache
        const original = this.proposals.find(p => p.id === proposalId);
        if (!original) {
            throw new Error(`Proposta ${proposalId} não encontrada no cache`);
        }

        // Criar cópia com novo título e status "draft"
        const duplicate = {
            ...original,
            id: undefined, // Remover ID para criar nova proposta
            title: `${original.title || original.proposalName} (Cópia)`,
            proposalName: `${original.title || original.proposalName} (Cópia)`,
            status: 'draft',
            createdAt: new Date().toISOString()
        };

        // Salvar como nova proposta
        const result = await this.saveProposal(duplicate);

        console.log(`✅ [ProposalManager] Proposta duplicada com sucesso`);
        return result;
    }

    // Métodos de compatibilidade com ProposalList-v2
    async getAll(useCache = true) {
        console.log(`🔄 [ProposalManager.getAll] useCache=${useCache}, cache.length=${this.proposals.length}`);

        if (!useCache || this.proposals.length === 0) {
            await this.loadProposals();
        }

        console.log(`📤 [ProposalManager.getAll] Retornando ${this.proposals.length} propostas`);
        if (this.proposals.length > 0) {
            console.log('📋 [ProposalManager.getAll] Primeira proposta:', this.proposals[0]);
        }

        return this.proposals;
    }

    async getByFilter(filterFn) {
        if (this.proposals.length === 0) {
            await this.loadProposals();
        }
        return this.proposals.filter(filterFn);
    }

    clearCache() {
        console.log('🧹 [ProposalManager] Limpando cache de propostas');
        this.proposals = [];
    }

    async getDetailedStatistics() {
        if (this.proposals.length === 0) {
            await this.loadProposals();
        }

        const proposals = this.proposals;

        // Contar por status
        const byStatus = {
            draft: proposals.filter(p => p.status === 'draft').length,
            sent: proposals.filter(p => p.status === 'sent').length,
            accepted: proposals.filter(p => p.status === 'accepted').length,
            rejected: proposals.filter(p => p.status === 'rejected').length,
            cancelled: proposals.filter(p => p.status === 'cancelled').length,
            paid: proposals.filter(p => p.status === 'paid').length
        };

        // Receita total (apenas propostas aprovadas/pagas)
        const acceptedProposals = proposals.filter(p => p.status === 'accepted' || p.status === 'paid');
        const totalRevenue = acceptedProposals.reduce((sum, p) => {
            const proposalData = p.proposalData || p;
            return sum + (proposalData.finalTotal || 0);
        }, 0);

        // Ticket médio (apenas propostas aprovadas/pagas)
        const avgTicket = acceptedProposals.length > 0 ? totalRevenue / acceptedProposals.length : 0;

        return {
            total: proposals.length,
            active: proposals.filter(p => !p.isDeleted).length,
            deleted: proposals.filter(p => p.isDeleted).length,
            favorites: proposals.filter(p => p.isFavorite).length,
            byStatus,
            totalRevenue,
            avgTicket
        };
    }
}

// ============================================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ============================================================================

// Guard para evitar múltiplas inicializações simultâneas
let isInitializing = false;
let initializationPromise = null;

async function initializeApp(licenseKey) {
    // Se já está inicializando, retorna a promise existente
    if (isInitializing) {
        console.log('⏸️ Inicialização já em andamento, aguardando...');
        return initializationPromise;
    }

    // Se já foi inicializado, retorna os managers existentes
    if (window.appBackend) {
        console.log('✅ Backend já inicializado, reutilizando...');
        return window.appBackend;
    }

    console.log('🚀 Inicializando aplicação com backend...');
    isInitializing = true;

    // Armazenar a promise para que outras chamadas possam await
    initializationPromise = (async () => {
        try {
            api.setLicenseKey(licenseKey);

            try {
                await migrateLocalStorageToBackend();
            } catch (error) {
                console.warn('Aviso: Migração falhou, mas app continuará funcionando:', error);
            }

            // Criar todos os managers
            const eventManager = new EventManager(api);
            const ingredientManager = new IngredientManager(api);
            const dishManager = new DishManager(api);
            const savedMenusManager = new SavedMenuManager(api);
            const clientManager = new ClientManager(api);
            const companyManager = new CompanyManager(api);
            const proposalManager = new ProposalManager(api);

            // OTIMIZAÇÃO: Carregamento em 2 fases
            // Fase 1 (CRÍTICA): Dados essenciais para app funcionar
            // ⚡ Performance: Log removido (executava na inicialização)
            const startTime = performance.now();

            await Promise.all([
                eventManager.loadEvents(),      // CRÍTICO: eventos do usuário
                companyManager.loadCompany()    // CRÍTICO: dados da empresa
            ]);

            const phase1Time = performance.now() - startTime;
            // ⚡ Performance: Log removido (executava após Phase 1)
            // ⚡ Performance: Logs removidos (executavam na inicialização)

            // CRITICAL FIX: Atribuir managers ao window.PrecificacaoAPI ANTES da Fase 2
            // Isso permite que o app já funcione enquanto o resto carrega
            const managers = {
                api,
                eventManager,
                ingredientManager,
                dishManager,
                savedMenusManager,
                clientManager,
                companyManager,
                proposalManager
            };

            Object.assign(window.PrecificacaoAPI, managers);
            // ⚡ Performance: Log removido (executava na inicialização)

            // Notificar componentes React IMEDIATAMENTE que o backend está pronto
            // Fase 2 roda em background sem bloquear
            window.dispatchEvent(new Event('backend-initialized'));
            // ⚡ Performance: Log removido (executava na inicialização)

            // ⚡ Performance: Log removido (executava na inicialização)

            // Fase 2 (LAZY): Carregar resto em background de forma assíncrona
            // Isso NÃO bloqueia o retorno da função initializeApp()
            // ⚡ Performance: Log removido (executava na inicialização)

            // Usar setTimeout para garantir que isso roda totalmente em background
            setTimeout(() => {
                const phase2Start = performance.now();
                console.log('🔄 Phase 2: Iniciando carregamento de dados...');

                Promise.all([
                    ingredientManager.loadIngredients().then(() => console.log(`✅ Phase 2: Ingredientes carregados em ${(performance.now() - phase2Start).toFixed(0)}ms`)),
                    dishManager.loadDishes().then(() => console.log(`✅ Phase 2: Pratos carregados em ${(performance.now() - phase2Start).toFixed(0)}ms`)),
                    savedMenusManager.loadMenus().then(() => console.log(`✅ Phase 2: Cardápios carregados em ${(performance.now() - phase2Start).toFixed(0)}ms`)),
                    clientManager.loadClients().then(() => console.log(`✅ Phase 2: Clientes carregados em ${(performance.now() - phase2Start).toFixed(0)}ms`)),
                    proposalManager.loadProposals().then(() => console.log(`✅ Phase 2: Propostas carregadas em ${(performance.now() - phase2Start).toFixed(0)}ms`)),
                    fetch(`${API_CONFIG.baseURL}/api/company/whatsapp`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}`, 'Content-Type': 'application/json' }
                    }).then(r => r.json()).then(data => {
                        if (data.success && data.data) {
                            window.whatsappSettings = data.data;
                            console.log(`✅ Phase 2: WhatsApp carregado em ${(performance.now() - phase2Start).toFixed(0)}ms`);
                        }
                    }).catch(() => {
                        window.whatsappSettings = null;
                        console.log(`⚠️ Phase 2: WhatsApp não disponível`);
                    }),
                    fetch(`${API_CONFIG.baseURL}/api/user-settings`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}`, 'Content-Type': 'application/json' }
                    }).then(r => r.json()).then(result => {
                        if (result.success && result.data?.settingsData) {
                            window.userSettings = result.data.settingsData;
                            console.log(`✅ Phase 2: Configurações carregadas em ${(performance.now() - phase2Start).toFixed(0)}ms`);
                        }
                    }).catch(() => {
                        window.userSettings = null;
                        console.log(`⚠️ Phase 2: Configurações não disponíveis`);
                    })
                ]).then(() => {
                    const phase2Time = performance.now() - phase2Start;
                    console.log(`🎯 Phase 2: COMPLETA em ${phase2Time.toFixed(0)}ms`);

                    // Disparar evento quando Fase 2 completar (para componentes que precisam desses dados)
                    window.dispatchEvent(new Event('backend-phase2-complete'));
                }).catch(error => {
                    console.warn('⚠️ Erro ao carregar dados secundários (não crítico):', error);
                    // IMPORTANTE: Disparar evento mesmo em caso de erro para não bloquear UI
                    window.dispatchEvent(new Event('backend-phase2-complete'));
                });
            }, 100); // 100ms de delay para não bloquear thread principal

            return managers;
        } finally {
            isInitializing = false;
        }
    })();

    return initializationPromise;
}

// ============================================================================
// EXPORTAR PARA USO NO FRONTEND
// ============================================================================

window.PrecificacaoAPI = {
    api,
    PrecificacaoAPI,
    EventManager,
    IngredientManager,
    DishManager,
    SavedMenuManager,
    ClientManager,
    CompanyManager,
    ProposalManager,
    initializeApp
};

console.log('📦 API de Precificação carregada e pronta para uso!');
