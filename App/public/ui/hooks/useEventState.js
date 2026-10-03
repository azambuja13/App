(function() {
/**
 * useEventState.js
 * Hook principal para gerenciar todos os estados do evento
 *
 * Consolida os 31 estados originais da aplicação
 */

const { useState, useEffect } = React;

// Import smart storage - usar window ao invés de ES6 import
// (smart-storage.js é carregado via <script> tag, não como módulo)
const smartSave = (...args) => {
    if (window.smartStorage && window.smartStorage.save) {
        return window.smartStorage.save(...args);
    }
    console.error('❌ smartStorage não disponível');
    return Promise.reject(new Error('smartStorage not available'));
};

const smartLoad = (...args) => {
    if (window.smartStorage && window.smartStorage.load) {
        return window.smartStorage.load(...args);
    }
    console.error('❌ smartStorage não disponível');
    return Promise.reject(new Error('smartStorage not available'));
};

// Importar WebSocket service (será carregado via script tag no HTML)
const getWebSocketService = () => {
    if (typeof window !== 'undefined' && window.websocketService) {
        return window.websocketService;
    }
    return null;
};

// Helper: Verificar se está autenticado
const isAuthenticated = () => {
    const token = localStorage.getItem('accessToken');
    return !!token;
};

// Helper: Verificar se é modo cloud (STD ou PRM)
const isCloudMode = () => {
    if (!window.ConfigHelper) return false;
    return window.ConfigHelper.isCloudMode();
};

// Helper: Carregar configurações do backend
const loadFromBackend = async () => {
    try {
        if (!isCloudMode() || !isAuthenticated()) {
            console.log('⏭️ [useEventState] Pulando backend: modo offline ou não autenticado');
            return null;
        }

        const token = localStorage.getItem('accessToken');
        const backendURL = window.APP_CONFIG?.backend?.baseURL || 'https://precificacao-api-production.up.railway.app';

        const response = await fetch(`${backendURL}/api/user-settings`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn('⚠️ [useEventState] Erro ao carregar do backend:', response.status);
            return null;
        }

        const result = await response.json();

        if (result.success && result.data && result.data.settingsData) {
            console.log('☁️ [useEventState] Dados carregados do backend:', {
                hasSupport: !!result.data.settingsData.support,
                supportCount: result.data.settingsData.support?.length || 0,
                hasLabor: !!result.data.settingsData.labor,
                hasTransport: !!result.data.settingsData.transport,
                hasProposalData: !!result.data.settingsData.proposalData,
                hasIngredientsDatabase: !!result.data.settingsData.ingredientsDatabase,
                ingredientsCount: result.data.settingsData.ingredientsDatabase?.length || 0
            });
            return result.data.settingsData;
        }

        return null;
    } catch (error) {
        console.warn('⚠️ [useEventState] Erro ao conectar ao backend:', error.message);
        return null;
    }
};

// Helper: Salvar configurações no backend
const saveToBackend = async (settingsData) => {
    try {
        if (!isCloudMode() || !isAuthenticated()) {
            console.log('⏭️ [useEventState] Pulando sincronização backend: modo offline ou não autenticado');
            return false;
        }

        const token = localStorage.getItem('accessToken');
        const backendURL = window.APP_CONFIG?.backend?.baseURL || 'https://precificacao-api-production.up.railway.app';

        const response = await fetch(`${backendURL}/api/user-settings`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ settingsData })
        });

        if (!response.ok) {
            console.warn('⚠️ [useEventState] Erro ao salvar no backend:', response.status);
            return false;
        }

        const result = await response.json();

        if (result.success) {
            console.log('☁️ [useEventState] Dados sincronizados com backend:', {
                hasSupport: !!settingsData.support,
                supportCount: settingsData.support?.length || 0,
                hasLabor: !!settingsData.labor,
                hasTransport: !!settingsData.transport,
                hasProposalData: !!settingsData.proposalData,
                hasIngredientsDatabase: !!settingsData.ingredientsDatabase,
                ingredientsCount: settingsData.ingredientsDatabase?.length || 0
            });
            return true;
        }

        return false;
    } catch (error) {
        console.warn('⚠️ [useEventState] Erro ao sincronizar com backend:', error.message);
        return false;
    }
};

// Helper functions for IndexedDB Storage (fallback local)
const loadFromStorage = async () => {
    try {
        // Tentar usar IndexedDBStorageService primeiro
        if (window.indexedDBStorage) {
            const data = await window.indexedDBStorage.get('precificacao_event_data', null);
            return data;
        }

        // Fallback para localStorage
        const data = localStorage.getItem('precificacao_event_data');
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        return null;
    }
};

const saveToStorage = async (data) => {
    try {
        // Tentar usar IndexedDBStorageService primeiro
        if (window.indexedDBStorage) {
            await window.indexedDBStorage.set('precificacao_event_data', data);
            console.log('✅ [useEventState] Dados salvos no IndexedDB');
            return;
        }

        // Fallback para smart storage (roteará para PostgreSQL ou IndexedDB)
        await smartSave('precificacao_event_data', data);
        console.log('⚠️ [useEventState] Dados salvos via smartStorage (fallback)');
    } catch (error) {
        console.error('❌ Erro ao salvar dados:', error);
        throw error;
    }
};

// Helper: Migrar dados locais para backend (primeira sincronização)
const migrateLocalDataToBackend = async () => {
    try {
        console.log('🔍 [Migration] Verificando condições para migração...', {
            isCloudMode: isCloudMode(),
            isAuthenticated: isAuthenticated(),
            hasToken: !!localStorage.getItem('accessToken'),
            migrationDone: localStorage.getItem('dataMigrationDone')
        });

        if (!isCloudMode() || !isAuthenticated()) {
            console.log('⏭️ [Migration] Pulando migração: modo offline ou não autenticado');
            return false;
        }

        // Verificar se já fez migração
        const migrationDone = localStorage.getItem('dataMigrationDone');
        if (migrationDone === 'true') {
            console.log('⏭️ [Migration] Migração já foi feita anteriormente');
            return false;
        }

        console.log('🔄 [Migration] Iniciando migração de dados locais para backend...');

        // Carregar dados locais
        const localData = await loadFromStorage();

        if (!localData) {
            console.log('⏭️ [useEventState] Nenhum dado local para migrar');
            localStorage.setItem('dataMigrationDone', 'true');
            return false;
        }

        // Extrair configurações para migrar
        const settingsToMigrate = {
            ingredientsDatabase: localData.ingredientsDatabase || [],
            support: localData.support || [],
            labor: localData.labor || { hours: 0, rate: 0 },
            transport: localData.transport || { distance: 0, fuelCost: 0, toll: 0 },
            proposalData: localData.proposalData || {}
        };

        // Verificar se há dados para migrar
        const hasData = settingsToMigrate.ingredientsDatabase.length > 0 ||
                       (settingsToMigrate.support && settingsToMigrate.support.length > 0);

        if (!hasData) {
            console.log('⏭️ [useEventState] Nenhum dado significativo para migrar');
            localStorage.setItem('dataMigrationDone', 'true');
            return false;
        }

        // Enviar para backend
        const success = await saveToBackend(settingsToMigrate);

        if (success) {
            console.log('✅ [useEventState] Migração concluída com sucesso!');
            console.log(`   - ${settingsToMigrate.ingredientsDatabase.length} ingredientes`);
            console.log(`   - ${settingsToMigrate.support.length} itens de apoio`);
            localStorage.setItem('dataMigrationDone', 'true');
            return true;
        } else {
            console.warn('⚠️ [useEventState] Falha na migração, tentará novamente no próximo login');
            return false;
        }
    } catch (error) {
        console.error('❌ [useEventState] Erro na migração:', error);
        return false;
    }
};

/**
 * Hook principal para gerenciar estado do evento
 */
function useEventState() {
    // ====================================
    // Flag de Inicialização
    // ====================================
    // IMPORTANTE: Previne auto-save durante carregamento inicial
    // Resolve bug onde ingredientes populados externamente eram sobrescritos
    const [isInitializing, setIsInitializing] = useState(true);

    // ====================================
    // Estados de Licenciamento e Segurança
    // ====================================
    const [licenseKey, setLicenseKey] = useState('');
    const [email, setEmail] = useState(''); // E-mail digitado na tela de login (substitui a chave de licença como identificador)
    const [licenseValid, setLicenseValid] = useState(false);
    const [licenseExpiry, setLicenseExpiry] = useState(null);
    const [licensedTo, setLicensedTo] = useState('');
    const [licensedEmail, setLicensedEmail] = useState('');
    const [showLicenseActivation, setShowLicenseActivation] = useState(false);
    const [licenseError, setLicenseError] = useState('');
    const [isLocked, setIsLocked] = useState(false);
    const [passwordAttempts, setPasswordAttempts] = useState(0);
    const [lockoutTime, setLockoutTime] = useState(0);

    // ====================================
    // Estados de Configuração do Evento
    // ====================================
    const [guests, setGuests] = useState(100);
    const [monthsUntilEvent, setMonthsUntilEvent] = useState(0);
    const [activeTab, setActiveTabInternal] = useState('events');
    const [isCompanyExpanded, setIsCompanyExpanded] = useState(false);

    // Wrapper para setActiveTab que dispara evento customizado
    const setActiveTab = (newTab) => {
        // ⚡ Performance: Log removido (executava em CADA mudança de tab)
        setActiveTabInternal(newTab);
        // Disparar evento customizado para que componentes possam reagir à mudança de aba
        window.dispatchEvent(new CustomEvent('tab-changed', { detail: newTab }));
    };
    const [isProposalExpanded, setIsProposalExpanded] = useState(false);
    const [isLogoExpanded, setIsLogoExpanded] = useState(false);

    // ====================================
    // Função auxiliar para migração de ingredientes
    // ====================================
    const migrateIngredients = (ingredients) => {
        if (!Array.isArray(ingredients)) return [];
        return ingredients.map(ing => ({
            ...ing,
            unitType: ing.unitType || 'weight' // Padrão: peso (compatibilidade com dados antigos)
        }));
    };

    // ====================================
    // Estados de Dados - Ingredientes
    // ====================================
    // IMPORTANTE: Inicializa vazio. Use o botão "Lista Padrão" na interface
    // ou clearAndInitializeIngredients() no console para popular com 397 ingredientes
    const [ingredientsDatabase, setIngredientsDatabase] = useState([]);

    const [editingIngredient, setEditingIngredient] = useState(null);
    const [newIngredient, setNewIngredient] = useState({
        name: '',
        cost: 0,
        unit: 'kg',
        category: 'Proteínas',
        unitType: 'weight',
        costPerUnit: 0,
        unitSize: 1000,
        loss: 0,
        lossPercentage: 0,
        unitCost: 0
    });

    // ====================================
    // Estados de Dados - Evento
    // ====================================
    const [items, setItems] = useState([]);
    // FIX BUG #7: IDs únicos usando timestamp para evitar colisões com novos itens
    const [support, setSupport] = useState([
        { id: Date.now() + 1, name: 'Lenha', cost: 0, quantity: 0, active: true },
        { id: Date.now() + 2, name: 'Carvão', cost: 0, quantity: 0, active: true },
        { id: Date.now() + 3, name: 'Guardanapos', cost: 0, quantity: 0, active: true },
        { id: Date.now() + 4, name: 'Pratos', cost: 0, quantity: 0, active: true },
        { id: Date.now() + 5, name: 'Talheres', cost: 0, quantity: 0, active: true },
        { id: Date.now() + 6, name: 'Copos', cost: 0, quantity: 0, active: true },
        { id: Date.now() + 7, name: 'Gelo', cost: 0, quantity: 0, active: true }
    ]);

    const [newSupport, setNewSupport] = useState({
        name: '',
        cost: 0,
        quantity: 1
    });

    const [editingSupport, setEditingSupport] = useState(null);

    const [labor, setLabor] = useState({
        hours: 0,
        rate: 0
    });

    const [transport, setTransport] = useState({
        distance: 0,
        fuelCost: 0,
        toll: 0
    });

    // ====================================
    // Estados de Cliente e Proposta
    // ====================================
    const [clientData, setClientData] = useState({
        name: '',
        address: '',
        phone: '',
        email: '',
        photo: null,
        logo: null
    });

    // Carregar dados da empresa do CompanyManager
    const [proposalData, setProposalData] = useState({
        companyName: '',
        companyPhone: '',
        companyEmail: '',
        companyAddress: '',
        companyHistory: '',
        companyMission: '',
        companyVision: '',
        companyValues: '',
        companyMotivation: '',
        companyPhoto1: null,
        companyPhoto2: null,
        companyPhoto3: null
    });

    // ====================================
    // Estados de Gerenciamento de Eventos
    // ====================================
    const [currentEventId, setCurrentEventId] = useState(null);
    const [eventName, setEventName] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventLocation, setEventLocation] = useState('');
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [showEventsList, setShowEventsList] = useState(false);
    const [refreshList, setRefreshList] = useState(0);

    // ====================================
    // Carregar dados do storage na montagem
    // (Dados da empresa serão carregados DENTRO deste useEffect, após o storage)
    // ====================================
    useEffect(() => {
        const loadData = async () => {
            console.log('🔄 Iniciando carregamento...');

            // PASSO 1: Tentar carregar do backend primeiro (se modo cloud)
            let backendData = await loadFromBackend();

            // PASSO 2: Carregar do storage local (sempre, como fallback)
            let savedData = await loadFromStorage();

            // PASSO 3: Mesclar dados backend com storage local (backend tem prioridade)
            if (backendData) {
                console.log('☁️ Mesclando dados do backend com storage local...');
                savedData = {
                    ...savedData,  // Dados locais (base)
                    ...backendData  // Dados do backend (prioridade)
                };
            }

            if (savedData) {
                // Restaurar estados salvos
                console.log('📦 Carregando dados salvos do storage...');
                if (savedData.guests) setGuests(savedData.guests);
                if (savedData.monthsUntilEvent) setMonthsUntilEvent(savedData.monthsUntilEvent);
                // ✅ SIMPLIFICADO: Ingredientes serão carregados do backend (IngredientManager)
                // Não fazer merge aqui - backend já gerencia tudo
                if (savedData.ingredientsDatabase) {
                    console.log(`📦 ${savedData.ingredientsDatabase.length} ingredientes no storage local (será sincronizado com backend)`);
                    setIngredientsDatabase(migrateIngredients(savedData.ingredientsDatabase));
                } else {
                    console.log('ℹ️ Nenhum ingrediente no storage local - aguardando carregar do backend');
                    setIngredientsDatabase([]);
                }

                // Auto-save será habilitado logo após
                setIsInitializing(false);

            if (savedData.items) setItems(savedData.items);
            // Só carregar support se tiver itens, senão manter os padrões
            if (savedData.support && savedData.support.length > 0) {
                setSupport(savedData.support);
            }
            if (savedData.labor) setLabor(savedData.labor);
            if (savedData.transport) setTransport(savedData.transport);
            if (savedData.clientData) setClientData(savedData.clientData);
            // NÃO carregar proposalData do storage aqui - será carregado do companyManager depois
            if (savedData.eventName) setEventName(savedData.eventName);
            if (savedData.eventDate) setEventDate(savedData.eventDate);
            if (savedData.eventLocation) setEventLocation(savedData.eventLocation);
            if (savedData.currentEventId) setCurrentEventId(savedData.currentEventId);

            // Carregar dados da empresa do CompanyManager DEPOIS de carregar o storage
            console.log('🏢 [useEventState] Carregando dados da empresa após storage...');
            if (window.companyManager) {
                try {
                    const companyData = await window.companyManager.getCompanyDataAsync();
                    console.log('✅ [useEventState] Dados da empresa carregados:', companyData);
                    // Se savedData.proposalData existe, mesclar mantendo dados da empresa
                    if (savedData.proposalData) {
                        setProposalData({
                            ...companyData,
                            ...savedData.proposalData,
                            // Forçar dados da empresa mesmo se estiverem no savedData
                            companyName: companyData.companyName,
                            companyPhone: companyData.companyPhone,
                            companyEmail: companyData.companyEmail,
                            companyAddress: companyData.companyAddress,
                            companyHistory: companyData.companyHistory,
                            companyMission: companyData.companyMission,
                            companyVision: companyData.companyVision,
                            companyValues: companyData.companyValues,
                            companyMotivation: companyData.companyMotivation,
                            companyPhoto1: companyData.companyPhoto1,
                            companyPhoto2: companyData.companyPhoto2,
                            companyPhoto3: companyData.companyPhoto3
                        });
                    } else {
                        setProposalData(companyData);
                    }
                } catch (error) {
                    console.error('❌ [useEventState] Erro ao carregar dados da empresa:', error);
                }
            }
        } else {
            console.log('ℹ️ Nenhum dado salvo encontrado no storage');

            // Carregar dados da empresa do CompanyManager para novo usuário
            console.log('🏢 [useEventState] Carregando dados da empresa para novo usuário...');
            if (window.companyManager) {
                try {
                    const companyData = await window.companyManager.getCompanyDataAsync();
                    console.log('✅ [useEventState] Dados da empresa carregados:', companyData);
                    setProposalData(companyData);
                } catch (error) {
                    console.error('❌ [useEventState] Erro ao carregar dados da empresa:', error);
                }
            }

            // ✅ FIX: REMOVIDO - Não usar mais DEFAULT_INGREDIENTS
            // Ingredientes serão carregados do PostgreSQL via backend
            console.log('ℹ️ Ingredientes serão carregados do PostgreSQL após autenticação');
        }

        // Carregar dados de licença (manter no localStorage - dados pequenos de autenticação)
        const savedLicenseKey = localStorage.getItem('appLicenseKey');
        const savedLicensedTo = localStorage.getItem('licensedTo');
        const savedLicensedEmail = localStorage.getItem('licensedEmail');

        if (savedLicenseKey) setLicenseKey(savedLicenseKey);
        if (savedLicensedTo) setLicensedTo(savedLicensedTo);
        if (savedLicensedEmail) setLicensedEmail(savedLicensedEmail);

        // Carregar tentativas de senha (manter no localStorage - dados pequenos de autenticação)
        const attempts = parseInt(localStorage.getItem('passwordAttempts') || '0');
        const lockout = parseInt(localStorage.getItem('lockoutTime') || '0');

        setPasswordAttempts(attempts);
        setLockoutTime(lockout);

        // ⚠️ NÃO habilitar auto-save aqui! Precisa aguardar PostgreSQL carregar primeiro
        // setIsInitializing(false) será chamado DEPOIS de carregar do PostgreSQL
        console.log('✅ Carregamento inicial do storage completo. Aguardando PostgreSQL...');
        // setIsInitializing(false); // ← Movido para DEPOIS do PostgreSQL

        // PASSO FINAL: Migrar dados locais para backend (se necessário)
        // Aguardar 2 segundos para garantir que está autenticado
        console.log('⏰ [Migration] Agendando migração para executar em 2 segundos...');
        setTimeout(async () => {
            console.log('▶️ [Migration] Executando migração agora...');
            await migrateLocalDataToBackend();
        }, 2000);
    };

    loadData();
    }, []);

    // ====================================
    // Carregar dados da empresa quando companyManager estiver disponível
    // ====================================
    useEffect(() => {
        const loadCompanyDataWhenReady = async () => {
            // Aguardar até que companyManager esteja disponível
            let attempts = 0;
            while (!window.companyManager && attempts < 20) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (window.companyManager) {
                try {
                    console.log('🏢 [useEventState] CompanyManager disponível, carregando dados...');
                    const companyData = await window.companyManager.getCompanyDataAsync();
                    console.log('✅ [useEventState] Dados da empresa carregados (retry):', companyData);

                    setProposalData(prev => ({
                        ...prev,
                        // Forçar dados da empresa
                        companyName: companyData.companyName || prev.companyName,
                        companyPhone: companyData.companyPhone || prev.companyPhone,
                        companyEmail: companyData.companyEmail || prev.companyEmail,
                        companyAddress: companyData.companyAddress || prev.companyAddress,
                        companyHistory: companyData.companyHistory || prev.companyHistory,
                        companyMission: companyData.companyMission || prev.companyMission,
                        companyVision: companyData.companyVision || prev.companyVision,
                        companyValues: companyData.companyValues || prev.companyValues,
                        companyMotivation: companyData.companyMotivation || prev.companyMotivation,
                        companyPhoto1: companyData.companyPhoto1 || prev.companyPhoto1,
                        companyPhoto2: companyData.companyPhoto2 || prev.companyPhoto2,
                        companyPhoto3: companyData.companyPhoto3 || prev.companyPhoto3
                    }));
                } catch (error) {
                    console.error('❌ [useEventState] Erro ao carregar dados da empresa (retry):', error);
                }
            } else {
                console.warn('⚠️ [useEventState] CompanyManager não disponível após 2 segundos');
            }
        };

        loadCompanyDataWhenReady();
    }, []); // Executar apenas uma vez na montagem

    // ====================================
    // Recarregar dados do backend quando usuário faz login (UMA VEZ)
    // ====================================
    const backendLoadedRef = React.useRef(false);  // Flag para evitar reload múltiplo

    useEffect(() => {
        const reloadFromBackendAfterLogin = async () => {
            // IMPORTANTE: Só recarregar UMA VEZ por sessão
            if (backendLoadedRef.current) {
                console.log('⏭️ [useEventState] Backend já foi carregado nesta sessão, pulando reload');
                return;
            }

            // Verificar se está autenticado e em modo cloud
            if (!isAuthenticated() || !isCloudMode()) {
                return;
            }

            console.log('🔄 [useEventState] Login detectado - recarregando dados do backend...');

            // Carregar dados do backend
            const backendData = await loadFromBackend();

            if (backendData) {
                console.log('☁️ [useEventState] Dados do backend recebidos após login');

                // ✅ SIMPLIFICADO: Ingredientes virão do IngredientManager (sem merge)
                // Apenas sincronizar se houver ingredientes no backend
                if (backendData.ingredientsDatabase && backendData.ingredientsDatabase.length > 0) {
                    console.log(`📦 [useEventState] ${backendData.ingredientsDatabase.length} ingredientes recebidos do backend`);
                    setIngredientsDatabase(migrateIngredients(backendData.ingredientsDatabase));
                }

                // Atualizar itens de apoio
                if (backendData.support && backendData.support.length > 0) {
                    console.log(`📦 [useEventState] Atualizando ${backendData.support.length} itens de apoio do backend`);
                    setSupport(backendData.support);
                }

                // Atualizar mão de obra
                if (backendData.labor) {
                    console.log('📦 [useEventState] Atualizando mão de obra do backend');
                    setLabor(backendData.labor);
                }

                // Atualizar transporte
                if (backendData.transport) {
                    console.log('📦 [useEventState] Atualizando transporte do backend');
                    setTransport(backendData.transport);
                }

                // Atualizar dados da proposta
                if (backendData.proposalData) {
                    console.log('📦 [useEventState] Atualizando dados da proposta do backend');
                    setProposalData(prev => ({
                        ...prev,
                        ...backendData.proposalData
                    }));
                }

                console.log('✅ [useEventState] Dados do backend carregados com sucesso após login!');

                // Marcar como carregado para evitar reload múltiplo
                backendLoadedRef.current = true;
            } else {
                console.log('ℹ️ [useEventState] Nenhum dado no backend para este usuário');
            }
        };

        // Executar quando accessToken estiver disponível
        const checkToken = setInterval(() => {
            if (localStorage.getItem('accessToken')) {
                clearInterval(checkToken);
                setTimeout(reloadFromBackendAfterLogin, 1000); // Aguardar 1 segundo após login
            }
        }, 500);

        // Limpar interval após 30 segundos
        setTimeout(() => clearInterval(checkToken), 30000);

        return () => clearInterval(checkToken);
    }, []); // Executar apenas uma vez na montagem

    // ====================================
    // Escutar evento backend-phase2-complete e atualizar ingredientes do PrecificacaoAPI
    // ====================================
    useEffect(() => {
        console.log('👂 [useEventState] Registrando listener para backend-phase2-complete');

        const handleBackendPhase2Complete = async () => {
            console.log('📢 [useEventState] Evento backend-phase2-complete recebido');

            if (window.PrecificacaoAPI && window.PrecificacaoAPI.ingredientes) {
                const backendIngredients = window.PrecificacaoAPI.ingredientes;
                console.log(`🔄 [useEventState] ${backendIngredients.length} ingredientes carregados do backend via IngredientManager`);

                // ✅ SIMPLIFICADO: Apenas atualizar se realmente houver ingredientes
                // Não fazer merge - IngredientManager já gerenciou tudo (públicos + usuário)
                if (backendIngredients.length > 0) {
                    setIngredientsDatabase(migrateIngredients(backendIngredients));
                    console.log('✅ [useEventState] ingredientsDatabase sincronizado com backend');
                }
            } else {
                console.warn('⚠️ [useEventState] PrecificacaoAPI.ingredientes não disponível após backend-phase2-complete');
            }
        };

        window.addEventListener('backend-phase2-complete', handleBackendPhase2Complete);

        // ✅ FIX: Checar se Phase 2 JÁ foi completada (evento disparado antes do listener)
        if (window.PrecificacaoAPI && window.PrecificacaoAPI.ingredientes && window.PrecificacaoAPI.ingredientes.length > 0) {
            console.log('🔄 [useEventState] Phase 2 JÁ completada - carregando ingredientes imediatamente');
            setTimeout(() => handleBackendPhase2Complete(), 100);
        }

        return () => {
            window.removeEventListener('backend-phase2-complete', handleBackendPhase2Complete);
        };
    }, []);

    // ====================================
    // Auto-save dos dados da empresa no CompanyManager - DESABILITADO
    // Para evitar loop infinito, dados da empresa devem ser salvos manualmente
    // via botão "Salvar Dados da Empresa"
    // ====================================
    // useEffect(() => {
    //     if (isInitializing) {
    //         return;
    //     }
    //     if (window.companyManager && proposalData) {
    //         console.log('💾 [useEventState] Salvando dados da empresa no CompanyManager...');
    //         window.companyManager.saveCompanyData(proposalData);
    //     }
    // }, [proposalData, isInitializing]);

    // ====================================
    // Auto-save no IndexedDB/Storage + Backend (Cloud)
    // ====================================
    useEffect(() => {
        // FIX: Não salvar durante inicialização
        // Previne que array vazio sobrescreva ingredientes populados externamente
        if (isInitializing) {
            // ⚡ Performance: Log removido (executava a cada tentativa de save durante init)
            return;
        }

        // ⚡ Performance: Log removido (executava em CADA auto-save)

        // DEBOUNCE: Aguardar 10 segundos antes de salvar no backend para evitar rate limit (HTTP 429)
        // ✅ OTIMIZAÇÃO: Aumentado de 5s para 10s para reduzir chamadas ao backend
        const debounceTimer = setTimeout(async () => {
            try {
                // FIX BUG #6: Capturar dados atuais no momento do save (não no closure)
                const currentDataToSave = {
                    guests,
                    monthsUntilEvent,
                    ingredientsDatabase,
                    items,
                    support,
                    labor,
                    transport,
                    clientData,
                    proposalData,
                    eventName,
                    eventDate,
                    eventLocation,
                    currentEventId
                };

                // PASSO 1: Salvar localmente (sempre)
                await saveToStorage(currentDataToSave);
                console.log(`✅ Auto-save local concluído (${ingredientsDatabase.length} ingredientes)`);

                // PASSO 2: Sincronizar com backend (se modo cloud)
                // Sincronizar configurações compartilhadas (não eventos específicos)
                const currentSettingsToSync = {
                    ingredientsDatabase,
                    support,
                    labor,
                    transport,
                    proposalData  // Dados da empresa
                };

                await saveToBackend(currentSettingsToSync);

                // PASSO 3: Sincronizar em tempo real via WebSocket
                const ws = getWebSocketService();
                if (ws && ws.isSocketConnected()) {
                    console.log('🔌 Sincronizando via WebSocket em tempo real...');
                    ws.syncSettings(currentSettingsToSync);
                }
            } catch (error) {
                console.error('❌ Erro no auto-save:', error);
            }
        }, 10000);

        // Cleanup: Cancelar timer se o componente for desmontado ou se houver nova mudança
        return () => clearTimeout(debounceTimer);
    }, [
        isInitializing, // Adicionar como dependência
        guests,
        monthsUntilEvent,
        ingredientsDatabase,
        items,
        support,
        labor,
        transport,
        clientData,
        proposalData,
        eventName,
        eventDate,
        eventLocation,
        currentEventId
    ]);

    // ====================================
    // WebSocket - Sincronização em tempo real
    // ====================================
    useEffect(() => {
        const ws = getWebSocketService();

        if (!ws || !isCloudMode() || !isAuthenticated()) {
            console.log('⏭️ WebSocket: modo offline ou não autenticado');
            return;
        }

        const token = localStorage.getItem('accessToken');
        if (!token) {
            console.log('⏭️ WebSocket: sem token');
            return;
        }

        // Conectar ao WebSocket
        console.log('🔌 Conectando ao WebSocket...');
        ws.connect(token);

        // Escutar sincronização de outros dispositivos
        ws.onSyncSettings((data) => {
            console.log('📥 Recebido sync de outro dispositivo via WebSocket:', data);

            // Atualizar estados locais com dados do outro dispositivo
            if (data.ingredientsDatabase) {
                console.log(`📦 Atualizando ${data.ingredientsDatabase.length} ingredientes do WebSocket`);
                setIngredientsDatabase(data.ingredientsDatabase);
            }

            if (data.support) {
                console.log(`📦 Atualizando ${data.support.length} itens de apoio do WebSocket`);
                setSupport(data.support);
            }

            if (data.labor) {
                console.log('📦 Atualizando labor do WebSocket');
                setLabor(data.labor);
            }

            if (data.transport) {
                console.log('📦 Atualizando transport do WebSocket');
                setTransport(data.transport);
            }

            if (data.proposalData) {
                console.log('📦 Atualizando proposalData do WebSocket');
                setProposalData(data.proposalData);
            }
        });

        // Cleanup: Desconectar quando o componente desmontar
        return () => {
            console.log('🔌 Desconectando WebSocket...');
            ws.disconnect();
        };
    }, []); // Conectar apenas uma vez quando componente montar

    // ====================================
    // Save antes de fechar página
    // ====================================
    useEffect(() => {
        const handleBeforeUnload = () => {
            const dataToSave = {
                guests,
                monthsUntilEvent,
                ingredientsDatabase,
                items,
                support,
                labor,
                transport,
                clientData,
                proposalData,
                eventName,
                eventDate,
                eventLocation,
                currentEventId
            };

            // beforeunload é síncrono, então usar versão síncrona do fallback
            if (window.indexedDBStorage) {
                // Tentar salvar no IndexedDB (pode não completar antes da página fechar)
                saveToStorage(dataToSave).catch(err => {
                    console.error('Erro ao salvar antes de fechar:', err);
                });
            } else {
                // Fallback localStorage é síncrono
                try {
                    localStorage.setItem('precificacao_event_data', JSON.stringify(dataToSave));
                } catch (error) {
                    console.error('Erro ao salvar antes de fechar:', error);
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [
        guests,
        monthsUntilEvent,
        ingredientsDatabase,
        items,
        support,
        labor,
        transport,
        clientData,
        proposalData,
        eventName,
        eventDate,
        currentEventId
    ]);

    // ====================================
    // Retornar todos os estados e setters
    // ====================================
    return {
        // Licenciamento
        licenseKey,
        setLicenseKey,
        email,
        setEmail,
        licenseValid,
        setLicenseValid,
        licenseExpiry,
        setLicenseExpiry,
        licensedTo,
        setLicensedTo,
        licensedEmail,
        setLicensedEmail,
        showLicenseActivation,
        setShowLicenseActivation,
        licenseError,
        setLicenseError,
        isLocked,
        setIsLocked,
        passwordAttempts,
        setPasswordAttempts,
        lockoutTime,
        setLockoutTime,

        // Configuração
        guests,
        setGuests,
        monthsUntilEvent,
        setMonthsUntilEvent,
        activeTab,
        setActiveTab,
        isCompanyExpanded,
        setIsCompanyExpanded,
        isProposalExpanded,
        setIsProposalExpanded,
        isLogoExpanded,
        setIsLogoExpanded,

        // Ingredientes
        ingredientsDatabase,
        setIngredientsDatabase,
        editingIngredient,
        setEditingIngredient,
        newIngredient,
        setNewIngredient,

        // Evento
        items,
        setItems,
        support,
        setSupport,
        newSupport,
        setNewSupport,
        editingSupport,
        setEditingSupport,
        labor,
        setLabor,
        transport,
        setTransport,

        // Cliente e Proposta
        clientData,
        setClientData,
        proposalData,
        setProposalData,

        // Gerenciamento
        currentEventId,
        setCurrentEventId,
        eventName,
        setEventName,
        eventDate,
        setEventDate,
        eventLocation,
        setEventLocation,
        showSaveDialog,
        setShowSaveDialog,
        showEventsList,
        setShowEventsList,
        refreshList,
        setRefreshList
    };
}

// Expor no window para uso global
window.useEventState = useEventState;

// ============================================================================
// COMPATIBILIDADE: Expor funções auxiliares globalmente
// ============================================================================
// Nota: Não podemos usar ES6 export porque o JSX é carregado via Babel runtime
// Solução: Expor via window para uso em outros módulos

if (typeof window !== 'undefined') {
    window.__USE_EVENT_STATE_EXPORTS__ = {
        getWebSocketService,
        loadFromBackend
    };
}

})();
