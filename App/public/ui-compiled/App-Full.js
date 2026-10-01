(function() {
/**
 * App-Full.jsx
 * Aplicação completa com TODOS os 11 componentes integrados
 *
 * VERSÃO: Controlada por window.APP_CONFIG.version (fonte única de verdade)
 * Migração: 100% Completa
 */

// Usar React do window global
// React hooks usados via React.useState, React.useEffect, etc.
// PasswordManager e LicenseValidator são acessados diretamente via window para evitar conflito de nome
// (são classes globais carregadas via <script>)

// VERSÃO DA APLICAÇÃO - FONTE ÚNICA: window.APP_CONFIG.version (definido em config/app-config.js)
const APP_VERSION = window.APP_CONFIG?.version || '1.0.18';

// Inicializar PasswordManager (async)
if (window.PasswordManager) {
  window.window.PasswordManager.initialize(); // Não esperar - executa em background
}

/**
 * Botão da aba Propostas com controle de acesso
 * Exibe badge "STANDARD+" se usuário estiver em OFFLINE
 */
function ProposalTabButton({
  isActive,
  onClick
}) {
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
  const [currentPlan, setCurrentPlan] = React.useState('offline');
  const [hasAccess, setHasAccess] = React.useState(false);
  React.useEffect(() => {
    const ConfigHelper = window.ConfigHelper;
    if (ConfigHelper) {
      const plan = ConfigHelper.getCurrentPlan();
      const access = ConfigHelper.hasFeatureAccess('pdfExport');
      setCurrentPlan(plan);
      setHasAccess(access);
    }
  }, []);
  const handleClick = e => {
    if (!hasAccess) {
      e.preventDefault();
      e.stopPropagation();
      setShowUpgradeModal(true);
    } else {
      onClick();
    }
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    onClick: handleClick,
    className: `flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm transition relative ${isActive ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md' : hasAccess ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-400 hover:bg-gray-50 cursor-pointer'}`
  }, !hasAccess && /*#__PURE__*/React.createElement("svg", {
    className: "w-3.5 h-3.5",
    fill: "currentColor",
    viewBox: "0 0 20 20"
  }, /*#__PURE__*/React.createElement("path", {
    fillRule: "evenodd",
    d: "M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z",
    clipRule: "evenodd"
  })), "\uD83D\uDCC4 Propostas", !hasAccess && /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] bg-blue-500 text-white px-1 py-0.5 rounded font-bold"
  }, "STD+")), showUpgradeModal && UpgradeModal && /*#__PURE__*/React.createElement(UpgradeModal, {
    isOpen: showUpgradeModal,
    onClose: () => setShowUpgradeModal(false),
    currentPlan: currentPlan,
    highlightPlan: "standard",
    reason: "Para criar e gerenciar Propostas Comerciais, voc\xEA precisa do plano STANDARD ou PREMIUM"
  }));
}
window.AppFull = function AppFull() {
  // Referências aos componentes, hooks e funções do window global
  const {
    Icon,
    EventForm,
    CostsSummary,
    ItemsList,
    IngredientsDatabase,
    SupportList,
    TransportForm,
    LaborForm,
    SavedEventsList,
    LicenseActivation,
    PasswordLock,
    PasswordSetup,
    PasswordLogin,
    FeatureGate,
    UpgradeModal,
    LoadingScreen,
    useEventState,
    useCalculations,
    formatCurrency,
    formatDate,
    SavedEventsManager,
    savedEventsManager
  } = window;

  // ⚡ Performance: Log de render removido (executava em CADA render do componente principal)

  // ====================================
  // Estado Global
  // ====================================
  const state = useEventState();

  // Expor state para debug (window.eventState)
  React.useEffect(() => {
    window.eventState = state;
    // ⚡ Performance: Log removido (executava em cada mudança de state)
  }, [state]);

  // ====================================
  // Estados de Autenticação
  // ====================================
  const [passwordSet, setPasswordSet] = React.useState(false);
  const [authenticated, setAuthenticated] = React.useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true); // Flag para prevenir flash

  // Estados de progresso de carregamento
  const [isLoadingData, setIsLoadingData] = React.useState(false);
  const [loadingProgress, setLoadingProgress] = React.useState(0);
  const [loadingMessage, setLoadingMessage] = React.useState('Carregando dados...');
  const [loadingDetails, setLoadingDetails] = React.useState([]);

  // Carregar passwordSet e restaurar temp_license de forma async
  React.useEffect(() => {
    (async () => {
      console.log('📍 Iniciando carregamento de autenticação...');

      // 1. Verificar se tem licença temporária (escondida pelo session-auth.js)
      const tempLicense = sessionStorage.getItem('temp_license');
      const tempLicensedTo = sessionStorage.getItem('temp_licensedTo');
      const tempLicenseExpiry = sessionStorage.getItem('temp_licenseExpiry');
      const tempLicensedEmail = sessionStorage.getItem('temp_licensedEmail');
      const storage = window.indexedDBStorage || {
        get: key => {
          const value = localStorage.getItem(key);
          try {
            return Promise.resolve(value ? JSON.parse(value) : null);
          } catch {
            return Promise.resolve(value);
          }
        },
        set: (key, value) => {
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
          return Promise.resolve();
        }
      };
      if (tempLicense) {
        console.log('🔄 Restaurando licença temporária do sessionStorage...');
        await storage.set('appLicenseKey', tempLicense);
        if (tempLicensedTo) await storage.set('licensedTo', tempLicensedTo);
        if (tempLicenseExpiry) await storage.set('licenseExpiry', tempLicenseExpiry);
        if (tempLicensedEmail) await storage.set('licensedEmail', tempLicensedEmail);

        // Atualizar estado React
        state.setLicenseKey(tempLicense);
        state.setLicensedTo(tempLicensedTo || '');
        state.setLicenseExpiry(tempLicenseExpiry || null);
        state.setLicensedEmail(tempLicensedEmail || '');
        state.setLicenseValid(true);
        console.log('✅ Licença restaurada:', tempLicensedTo);

        // Limpar sessionStorage
        sessionStorage.removeItem('temp_license');
        sessionStorage.removeItem('temp_licensedTo');
        sessionStorage.removeItem('temp_licenseExpiry');
        sessionStorage.removeItem('temp_licensedEmail');
      } else {
        // Fallback: carregar licença diretamente do IndexedDB/localStorage
        console.log('🔄 Verificando licença no storage permanente...');
        const storedLicense = await storage.get('appLicenseKey');
        if (storedLicense) {
          console.log('✅ Licença encontrada no storage permanente');
          const storedLicensedTo = await storage.get('licensedTo');
          const storedLicenseExpiry = await storage.get('licenseExpiry');
          const storedLicensedEmail = await storage.get('licensedEmail');

          // Atualizar estado React
          state.setLicenseKey(storedLicense);
          state.setLicensedTo(storedLicensedTo || '');
          state.setLicenseExpiry(storedLicenseExpiry || null);
          state.setLicensedEmail(storedLicensedEmail || '');
          state.setLicenseValid(true);
          console.log('✅ Licença carregada no estado React:', storedLicensedTo);
        } else {
          console.log('ℹ️ Nenhuma licença encontrada no storage');
        }
      }

      // 2. Verificar passwordSet E se está vinculada à licença atual
      console.log('📍 Verificando PasswordManager.isPasswordSet()...');
      const passwordSetValue = await window.PasswordManager.isPasswordSet();
      console.log('📍 PasswordManager.isPasswordSet() retornou:', passwordSetValue);

      // IMPORTANTE: Verificar se a senha está associada à licença atual
      if (passwordSetValue) {
        const currentLicenseKey = await storage.get('appLicenseKey');
        const passwordLicenseKey = await storage.get('password_license_key');
        console.log('📍 Verificando vinculação senha-licença:');
        console.log('  - Licença atual:', currentLicenseKey ? currentLicenseKey.substring(0, 30) + '...' : '(nenhuma)');
        console.log('  - Senha vinculada a:', passwordLicenseKey ? passwordLicenseKey.substring(0, 30) + '...' : '(nenhuma)');
        if (currentLicenseKey && passwordLicenseKey !== currentLicenseKey) {
          console.warn('⚠️ Senha NÃO está vinculada à licença atual - pedindo nova senha');
          setPasswordSet(false); // Forçar criação de nova senha
        } else {
          setPasswordSet(true); // Senha está vinculada corretamente
        }
      } else {
        setPasswordSet(false);
      }

      // 3. Marcar carregamento como completo
      setIsLoadingAuth(false);
    })();
  }, []); // Executa apenas na inicialização

  // IMPORTANTE: Inicializar backend quando authenticated muda para true
  React.useEffect(() => {
    (async () => {
      if (!authenticated) return;

      // Evitar inicialização duplicada
      if (window.backendInitialized) {
        console.log('ℹ️ [useEffect authenticated] Backend já inicializado, pulando...');
        return;
      }
      console.log('🔐 [useEffect authenticated] Usuário autenticado, inicializando backend...');
      const ConfigHelper = window.ConfigHelper;
      if (ConfigHelper && ConfigHelper.isCloudMode()) {
        console.log('☁️ Modo Cloud detectado - inicializando backend...');

        // Mostrar tela de carregamento
        setIsLoadingData(true);
        setLoadingProgress(0);
        setLoadingMessage('Conectando ao servidor...');
        setLoadingDetails([{
          label: 'Conectando ao servidor',
          status: 'loading'
        }, {
          label: 'Carregando ingredientes',
          status: 'pending'
        }, {
          label: 'Carregando pratos',
          status: 'pending'
        }, {
          label: 'Carregando cardápios',
          status: 'pending'
        }, {
          label: 'Carregando clientes',
          status: 'pending'
        }, {
          label: 'Carregando propostas',
          status: 'pending'
        }]);
        const licenseKey = state.licenseKey || localStorage.getItem('appLicenseKey');
        if (licenseKey && window.PrecificacaoAPI) {
          try {
            setLoadingProgress(20);
            const backend = await window.PrecificacaoAPI.initializeApp(licenseKey);
            window.appBackend = backend;
            window.backendInitialized = true; // Marcar como inicializado
            console.log('✅ Backend inicializado com sucesso');

            // Atualizar progresso: servidor conectado
            setLoadingProgress(40);
            setLoadingMessage('Carregando dados...');
            setLoadingDetails(prev => prev.map((d, i) => i === 0 ? {
              ...d,
              status: 'completed'
            } : d));

            // Carregar dados da empresa do backend e aplicar ao state.proposalData
            if (backend.companyManager?.companyData) {
              console.log('📦 Carregando dados da empresa do backend...');
              const companyData = backend.companyManager.companyData;
              console.log('  - Dados da empresa:', companyData);

              // Aplicar ao state.proposalData
              state.setProposalData(prev => ({
                ...prev,
                companyName: companyData.companyName || prev.companyName || '',
                companyPhone: companyData.companyPhone || prev.companyPhone || '',
                companyEmail: companyData.companyEmail || prev.companyEmail || '',
                companyAddress: companyData.companyAddress || prev.companyAddress || '',
                companyHistory: companyData.companyHistory || prev.companyHistory || '',
                companyMission: companyData.companyMission || prev.companyMission || '',
                companyVision: companyData.companyVision || prev.companyVision || '',
                companyValues: companyData.companyValues || prev.companyValues || '',
                companyMotivation: companyData.companyMotivation || prev.companyMotivation || '',
                companyLogo: companyData.companyLogo || prev.companyLogo || null,
                companyPhoto1: companyData.companyPhoto1 || prev.companyPhoto1 || null,
                companyPhoto2: companyData.companyPhoto2 || prev.companyPhoto2 || null,
                companyPhoto3: companyData.companyPhoto3 || prev.companyPhoto3 || null
              }));
              console.log('✅ Dados da empresa carregados e aplicados ao state');
            } else {
              console.warn('⚠️ Nenhum dado de empresa encontrado no backend');
            }

            // MIGRAÇÃO: Enviar dados do IndexedDB para PostgreSQL ANTES de sincronizar
            // Garante que dados locais não sejam perdidos
            if (window.migrationService) {
              console.log('🔄 [MIGRAÇÃO] Enviando dados locais para backend...');
              try {
                const migrationResults = await window.migrationService.migrateAll();
                console.log('✅ [MIGRAÇÃO] Concluída:', migrationResults);
              } catch (migrationError) {
                console.warn('⚠️ [MIGRAÇÃO] Erro (continuará normalmente):', migrationError);
              }
            } else {
              console.warn('⚠️ [MIGRAÇÃO] MigrationService não disponível');
            }

            // Re-inicializar StorageManager para usar CloudStorageAdapter
            // IMPORTANTE: Isso vai sincronizar PostgreSQL → IndexedDB (backend sobrescreve local)
            if (window.storageManager) {
              console.log('🔄 Re-inicializando StorageManager com backend...');
              window.storageManager.initialized = false;
              await window.storageManager.initialize();
              console.log('✅ StorageManager agora usando:', window.storageManager.getAdapterType());
            }

            // ✅ INGREDIENTES JÁ FORAM CARREGADOS e MERGED no useEventState
            // useEventState faz: 328 públicos + 22 usuário = 348 total
            // NÃO carregar novamente aqui para não sobrescrever o MERGE!
            console.log('✅ Ingredientes já carregados no useEventState (MERGE público + usuário)');

            // Aguardar Phase 2 completar (dados carregados em background pelo api-client.js)
            // Phase 2 carrega: ingredientes, pratos, cardápios, clientes, propostas
            console.log('⏳ Aguardando Phase 2 (carregamento completo dos dados)...');
            const waitForPhase2 = new Promise(resolve => {
              let timeoutId;
              const handler = () => {
                clearTimeout(timeoutId); // Limpar timeout quando evento chegar
                window.removeEventListener('backend-phase2-complete', handler);
                console.log('✅ Phase 2 completa - todos os dados carregados!');

                // Atualizar progresso: todos os dados carregados
                setLoadingProgress(100);
                setLoadingMessage('Finalizando...');
                setLoadingDetails(prev => prev.map(d => ({
                  ...d,
                  status: 'completed'
                })));

                // Aguardar 500ms para mostrar 100% antes de esconder
                setTimeout(() => {
                  setIsLoadingData(false);
                }, 500);
                resolve();
              };
              window.addEventListener('backend-phase2-complete', handler);

              // Timeout de 15s
              timeoutId = setTimeout(() => {
                window.removeEventListener('backend-phase2-complete', handler);
                console.warn('⚠️ Phase 2 timeout após 15s - continuando...');

                // Esconder loading mesmo no timeout
                setIsLoadingData(false);
                resolve();
              }, 15000);
            });
            await waitForPhase2;

            // Obter accessToken para requisições autenticadas
            const accessToken = localStorage.getItem('accessToken');

            // Carregar configurações do usuário (apoio, mão de obra, transporte)
            console.log('🔄 Carregando configurações do usuário (apoio)...');

            // Tentar usar dados pré-carregados primeiro (Phase 2)
            if (window.userSettings) {
              console.log('⚡ Usando configurações pré-carregadas da Phase 2');
              const settings = window.userSettings;

              if (settings.support && Array.isArray(settings.support)) {
                console.log(`  - ${settings.support.length} itens de apoio`);
                state.setSupport(settings.support);
              }
              if (settings.labor) {
                console.log('  - Configurações de mão de obra');
                state.setLabor(settings.labor);
              }
              if (settings.transport) {
                console.log('  - Configurações de transporte');
                state.setTransport(settings.transport);
              }
            } else if (accessToken) {
              // Fallback: carregar via HTTP se cache não disponível
              try {
                console.log('🔍 Cache miss - carregando configurações via HTTP');
                const API_URL = window.APP_CONFIG?.backend?.baseURL || 'https://precificacao-api-production.up.railway.app';
                const response = await fetch(`${API_URL}/api/user-settings`, {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                  }
                });
                if (response.ok) {
                  const result = await response.json();
                  if (result.success && result.data?.settingsData) {
                    console.log('✅ Configurações carregadas via HTTP');
                    const settings = result.data.settingsData;
                    window.userSettings = settings;  // Armazenar em cache

                    if (settings.support && Array.isArray(settings.support)) {
                      console.log(`  - ${settings.support.length} itens de apoio`);
                      state.setSupport(settings.support);
                    }
                    if (settings.labor) {
                      console.log('  - Configurações de mão de obra');
                      state.setLabor(settings.labor);
                    }
                    if (settings.transport) {
                      console.log('  - Configurações de transporte');
                      state.setTransport(settings.transport);
                    }
                  }
                }
              } catch (error) {
                console.warn('⚠️ Erro ao carregar configurações (não crítico):', error);
              }
            } else {
              console.warn('⚠️ accessToken não disponível - pulando carregamento de configurações');
            }

            // Conectar WebSocket para sincronização em tempo real
            if (accessToken) {
              // Aguardar websocketService estar disponível
              const waitForWebSocket = async () => {
                let attempts = 0;
                while (!window.websocketService && attempts < 20) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                  attempts++;
                }
                return window.websocketService;
              };
              const ws = await waitForWebSocket();
              if (ws) {
                console.log('🔌 Conectando WebSocket para sincronização em tempo real...');
                // Desconectar primeiro se já estiver conectado (sem auth)
                if (ws.isConnected) {
                  console.log('🔄 WebSocket já conectado (sem auth) - desconectando para reconectar com token');
                  ws.disconnect();
                  await new Promise(resolve => setTimeout(resolve, 500)); // Aguardar desconexão
                }
                ws.connect(accessToken);

                // Escutar mudanças de licença de outros dispositivos
                ws.on('sync:license', payload => {
                  console.log('📥 [WebSocket] Recebido sync:license:', payload);
                  if (payload.operation === 'update' && payload.data?.licenseKey) {
                    console.log('🔄 Atualizando licença localmente');
                    state.setLicenseKey(payload.data.licenseKey);
                    if (window.indexedDBStorage) {
                      window.indexedDBStorage.set('appLicenseKey', payload.data.licenseKey);
                      if (payload.data.licensedTo) {
                        window.indexedDBStorage.set('licensedTo', payload.data.licensedTo);
                      }
                    }
                  }
                });
                console.log('✅ WebSocket conectado e escutando mudanças de licença');
              } else {
                console.warn('⚠️ WebSocket não conectado - websocketService não carregou após 2 segundos');
              }
            } else {
              console.warn('⚠️ WebSocket não conectado - accessToken não disponível');
            }
          } catch (error) {
            console.warn('⚠️ Erro ao inicializar backend (continuará em modo offline):', error);
          }
        } else {
          console.warn('⚠️ Backend não inicializado - licenseKey ou PrecificacaoAPI não disponível');
        }
      }
    })();
  }, [authenticated]); // Removido state.licenseKey para evitar inicialização duplicada

  // useEffect separado para detectar mudança de licença (COM DEBOUNCE)
  React.useEffect(() => {
    // Só verificar se já passou pela inicialização
    if (isLoadingAuth) return;

    // Só verificar se há uma licença digitada
    if (!state.licenseKey || state.licenseKey.trim().length === 0) return;

    // DEBOUNCE: Aguardar 500ms após o usuário parar de digitar
    const debounceTimer = setTimeout(async () => {
      console.log('🔄 [Mudança de licença detectada no input]');
      console.log('  - Licença digitada:', state.licenseKey.substring(0, 30) + '...');

      // IMPORTANTE: Verificar na API se esta licença tem senha configurada
      // Não confiar apenas no IndexedDB local, pois pode ter múltiplas licenças
      try {
        const API_URL = window.APP_CONFIG?.backend?.baseURL || 'https://precificacao-api-production.up.railway.app';

        // Verificar se a licença existe no banco de dados
        const response = await fetch(`${API_URL}/api/auth/check-license`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            licenseKey: state.licenseKey
          })
        });
        if (response.ok) {
          const result = await response.json();
          console.log('  - Resposta da API:', result);
          console.log('  - Licença existe?', result.exists);
          console.log('  - Senha configurada?', result.passwordSet);
          if (result.exists && result.passwordSet) {
            // Licença existe E tem senha configurada
            console.log('✅ Licença existente com senha - mostrar "Validar Senha"');
            setPasswordSet(true);
          } else {
            // Licença nova OU sem senha
            console.log('🆕 Licença nova ou sem senha - mostrar "Criar Senha"');
            setPasswordSet(false);
          }
        } else {
          // Erro na API - assumir licença nova
          console.log('⚠️ Erro na API - assumir licença nova');
          setPasswordSet(false);
        }
      } catch (error) {
        console.error('❌ Erro ao verificar licença na API:', error);
        // Em caso de erro, deixar o usuário tentar criar senha
        setPasswordSet(false);
      }
    }, 500); // Esperar 500ms após última mudança

    // Cleanup: Cancelar timer se licença mudar novamente antes de 500ms
    return () => clearTimeout(debounceTimer);
  }, [state.licenseKey, isLoadingAuth]);

  // Auto-calcular meses até o evento quando a data mudar
  React.useEffect(() => {
    if (!state.eventDate) return;
    try {
      const eventDate = new Date(state.eventDate);
      const today = new Date();

      // Calcular diferença em meses
      const yearsDiff = eventDate.getFullYear() - today.getFullYear();
      const monthsDiff = eventDate.getMonth() - today.getMonth();
      const totalMonths = yearsDiff * 12 + monthsDiff;

      // Só atualizar se for diferente do valor atual e se for >= 0
      if (totalMonths >= 0 && totalMonths !== state.monthsUntilEvent) {
        console.log(`📅 Auto-calculando meses até o evento: ${totalMonths} meses`);
        state.setMonthsUntilEvent(totalMonths);
      }
    } catch (error) {
      console.error('Erro ao calcular meses até o evento:', error);
    }
  }, [state.eventDate]);

  // ⚡ Performance: Log removido (executava em CADA render do App-Full)

  // ====================================
  // Estado da Logo da Empresa
  // ====================================
  const [companyLogo, setCompanyLogo] = React.useState(() => {
    // Tentar carregar do proposalData primeiro (sincronizado), depois localStorage (fallback)
    return state.proposalData?.companyLogo || localStorage.getItem('company_logo') || null;
  });

  // ====================================
  // Estado de Edição de Propostas
  // ====================================
  const [editingProposal, setEditingProposal] = React.useState(null);
  const [showProposalBuilder, setShowProposalBuilder] = React.useState(false);

  // ====================================
  // Estado de Salvamento
  // ====================================
  const [isSavingEvent, setIsSavingEvent] = React.useState(false);

  // Persistir logo no localStorage E no proposalData para sincronização
  React.useEffect(() => {
    if (companyLogo) {
      localStorage.setItem('company_logo', companyLogo);
      // Também salvar no proposalData para sincronizar entre dispositivos
      state.setProposalData(prev => ({
        ...prev,
        companyLogo: companyLogo
      }));
    } else {
      localStorage.removeItem('company_logo');
      // Remover do proposalData também
      state.setProposalData(prev => ({
        ...prev,
        companyLogo: null
      }));
    }
  }, [companyLogo]);

  // Carregar logo do proposalData quando ele mudar (sincronização do backend)
  React.useEffect(() => {
    if (state.proposalData?.companyLogo && state.proposalData.companyLogo !== companyLogo) {
      console.log('📦 Logo sincronizada do backend');
      setCompanyLogo(state.proposalData.companyLogo);
    }
  }, [state.proposalData?.companyLogo]);

  // ====================================
  // Migração: Garantir IDs únicos em support items
  // ====================================
  React.useEffect(() => {
    console.log('🔍 Verificando items de apoio:', state.support);
    const needsMigration = state.support.some(item => !item.id);
    console.log('🔍 Precisa migração?', needsMigration);
    if (needsMigration) {
      console.warn('⚠️ Items de apoio sem IDs detectados. Migrando...');
      const migratedSupport = state.support.map((item, idx) => ({
        id: item.id || Date.now() + idx,
        name: item.name || '',
        cost: item.cost || 0,
        quantity: item.quantity || item.qty || 0,
        active: item.active !== undefined ? item.active : true
      }));
      state.setSupport(migratedSupport);
      // ⚡ Performance: Log removido (executava após migração)
    } else {
      // ⚡ Performance: Log removido (executava em CADA mudança de support)
    }
  }, [state.support]); // Executar quando support mudar

  // Nota: Inicialização automática de ingredientes padrão foi removida
  // O usuário agora controla manualmente via botão "Lista Padrão" na aba Ingredientes

  // Debug: Log do estado de autenticação
  React.useEffect(() => {
    console.log('🔐 Estado de Autenticação:', {
      passwordSet,
      authenticated,
      licenseValid: state.licenseValid,
      showLicenseActivation: state.showLicenseActivation
    });
  }, [passwordSet, authenticated, state.licenseValid, state.showLicenseActivation]);

  // ====================================
  // Integração: Adicionar Prato ao Evento
  // ====================================
  React.useEffect(() => {
    const handleAddDishToEvent = event => {
      const {
        dish
      } = event.detail;
      console.log('🍽️ Recebido evento add-dish-to-event:', dish);
      if (!dish || !dish.ingredients || dish.ingredients.length === 0) {
        console.warn('⚠️ Prato sem ingredientes');
        return;
      }

      // Adicionar cada ingrediente do prato aos itens do evento
      // Como o prato é sempre para 1 porção, quantity = qtyPerPerson
      dish.ingredients.forEach(dishIngredient => {
        // Buscar o ingrediente na database
        const ingredient = state.ingredientsDatabase.find(ing => ing.id === dishIngredient.ingredientId);
        if (!ingredient) {
          console.warn(`⚠️ Ingrediente ${dishIngredient.ingredientId} não encontrado na database`);
          return;
        }

        // Prato = 1 porção, então quantity já é a quantidade por pessoa
        const qtyPerPerson = dishIngredient.quantity;

        // Criar novo item
        const newItem = {
          id: Date.now() + Math.random(),
          ingredientId: ingredient.id,
          qtyPerPerson: qtyPerPerson,
          active: true
        };

        // Adicionar ao estado
        state.setItems(prevItems => [...prevItems, newItem]);
        console.log(`✅ Ingrediente "${ingredient.name || ingredient.nome}" adicionado: ${qtyPerPerson.toFixed(2)}${dishIngredient.unit} por porção`);
      });
      console.log(`✅ Todos os ${dish.ingredients.length} ingredientes do prato "${dish.name}" foram adicionados!`);
    };
    window.addEventListener('add-dish-to-event', handleAddDishToEvent);
    return () => window.removeEventListener('add-dish-to-event', handleAddDishToEvent);
  }, [state.ingredientsDatabase, state.setItems]);

  // Expor função de atualização de ingredientes no window (para importação do Excel)
  React.useEffect(() => {
    window.updateIngredients = handleUpdateIngredients;
    return () => {
      delete window.updateIngredients;
    };
  }, [state.ingredientsDatabase]);

  // ====================================
  // Cálculos Automáticos
  // ====================================
  const costs = useCalculations({
    guests: state.guests,
    items: state.items,
    support: state.support,
    labor: state.labor,
    transport: state.transport,
    monthsUntilEvent: state.monthsUntilEvent
  }, state.ingredientsDatabase);

  // DEBUG: Verificar resultado dos cálculos
  React.useEffect(() => {
    if (costs) {
      // ⚡ Performance: Log removido (executava em CADA recálculo de costs)

      // Expor costs para debug
      window.costs = costs;
    }
  }, [costs]);

  // ====================================
  // Calcular total para itens de apoio
  // ====================================
  const supportItemsWithTotal = React.useMemo(() => {
    return state.support.map(item => ({
      ...item,
      total: (item.cost || 0) * (item.quantity || 0)
    }));
  }, [state.support]);

  // ====================================
  // Estatísticas por Categoria
  // ====================================
  const categoryStats = React.useMemo(() => {
    // ⚡ Performance: Log removido (executava em CADA recálculo de stats)

    if (!costs || !costs.itemsCalculated) {
      return {};
    }
    const stats = {};
    costs.itemsCalculated.forEach(item => {
      // Garantir que category não seja undefined
      const category = item.category || 'Sem Categoria';

      // ⚡ Performance: Log removido (executava para CADA item no loop)

      if (!stats[category]) {
        stats[category] = {
          total: 0,
          items: 0,
          active: 0
        };
      }
      stats[category].total += item.total || 0;
      stats[category].items += 1;
      if (item.active) stats[category].active += 1;
    });

    // ⚡ Performance: Log removido (executava em CADA recálculo)
    return stats;
  }, [costs]);

  // ====================================
  // Agrupar Itens por Categoria (usando itens calculados)
  // ====================================
  const groupedItems = React.useMemo(() => {
    const grouped = {};

    // Usar itens calculados se disponível, senão usar itens originais
    const itemsToGroup = costs?.itemsCalculated || state.items;
    itemsToGroup.forEach(item => {
      // Se o item já tem category (vem do calculator.js), usar ela
      // Senão, buscar do ingredient e normalizar
      let category = item.category;
      if (!category) {
        const ingredient = item.ingredient || state.ingredientsDatabase.find(ing => ing.id === item.ingredientId);
        if (ingredient) {
          const rawCategory = ingredient.category || ingredient.categoria || 'Sem Categoria';
          // Normalizar categoria usando window.normalizeCategory
          category = window.normalizeCategory ? window.normalizeCategory(rawCategory) : rawCategory;
        } else {
          category = 'Sem Categoria';
        }
      }
      if (!grouped[category]) {
        grouped[category] = [];
      }

      // Garantir que ingredient está disponível
      const ingredient = item.ingredient || state.ingredientsDatabase.find(ing => ing.id === item.ingredientId);
      grouped[category].push({
        ...item,
        ingredient,
        category
      });
    });

    // ⚡ Performance: Log removido (executava em CADA reagrupamento)
    return grouped;
  }, [costs, state.items, state.ingredientsDatabase]);

  // ====================================
  // Agrupar Ingredientes por Categoria
  // ====================================
  const groupedIngredients = React.useMemo(() => {
    const grouped = {};
    state.ingredientsDatabase.forEach(ing => {
      // Normalizar categoria do ingrediente
      const rawCategory = ing.category || ing.categoria || 'Outros';
      const category = window.normalizeCategory ? window.normalizeCategory(rawCategory) : rawCategory;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push({
        ...ing,
        category
      });
    });
    return grouped;
  }, [state.ingredientsDatabase]);

  // ====================================
  // Ingredientes em Uso
  // ====================================
  const ingredientsInUse = React.useMemo(() => {
    return new Set(state.items.map(item => item.ingredientId));
  }, [state.items]);

  // ====================================
  // Handlers - Ingredientes
  // ====================================
  const handleAddIngredient = async () => {
    if (!state.newIngredient.name.trim()) {
      alert('Por favor, insira um nome para o ingrediente');
      return;
    }

    // Preparar dados do ingrediente
    const ingredientData = {
      name: state.newIngredient.name,
      category: state.newIngredient.category || 'Outros',
      unitType: state.newIngredient.unitType || 'weight',
      costPerUnit: state.newIngredient.costPerUnit || 0,
      unitSize: state.newIngredient.unitSize || 0,
      loss: state.newIngredient.loss || 0,
      lossPercentage: state.newIngredient.lossPercentage || state.newIngredient.loss || 0,
      unit: state.newIngredient.unit || 'kg'
    };

    // Salvar no PostgreSQL se estiver em modo cloud
    let savedIngredient = null;
    console.log('💾 [handleAddIngredient] Tentando salvar ingrediente:', ingredientData.name);
    console.log('🔍 [handleAddIngredient] Backend inicializado?', window.backendInitialized);
    console.log('🔍 [handleAddIngredient] ingredientManager disponível?', !!window.PrecificacaoAPI?.ingredientManager);

    if (window.backendInitialized && window.PrecificacaoAPI?.ingredientManager) {
      try {
        console.log('📤 [handleAddIngredient] Enviando para API:', ingredientData);
        const result = await window.PrecificacaoAPI.ingredientManager.addIngredient(ingredientData);
        console.log('📥 [handleAddIngredient] Resposta da API:', result);

        if (result.success && result.data) {
          savedIngredient = result.data;
          console.log('✅ Ingrediente criado no PostgreSQL:', savedIngredient.name, savedIngredient.id);
        } else {
          console.error('❌ API retornou success=false:', result);
          alert('Erro ao salvar ingrediente: ' + (result.message || 'Falha desconhecida'));
          return;
        }
      } catch (error) {
        console.error('❌ Erro ao criar ingrediente no PostgreSQL:', error);
        alert('Erro ao salvar ingrediente no banco de dados: ' + error.message);
        return; // Não adiciona ao estado se falhar no PostgreSQL
      }
    } else {
      console.warn('⚠️ [handleAddIngredient] Backend não inicializado - salvando apenas localmente');
    }

    // Se salvou no PostgreSQL, usar o ingrediente retornado (com ID UUID)
    // Senão, criar um ingrediente local com ID timestamp
    const newIng = savedIngredient || {
      id: Date.now(),
      ...ingredientData
    };
    state.setIngredientsDatabase([...state.ingredientsDatabase, newIng]);
    state.setNewIngredient({
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
  };
  const handleStartEditingIngredient = ingredient => {
    state.setEditingIngredient({
      ...ingredient
    });
  };
  const handleSaveEditingIngredient = async () => {
    console.log('💾 [handleSaveEditingIngredient] Tentando atualizar ingrediente:', state.editingIngredient.name);

    // Salvar no PostgreSQL se estiver em modo cloud
    if (window.backendInitialized && window.PrecificacaoAPI?.ingredientManager) {
      try {
        console.log('📤 [handleSaveEditingIngredient] Enviando para API:', state.editingIngredient);
        const result = await window.PrecificacaoAPI.ingredientManager.updateIngredient(state.editingIngredient.id, state.editingIngredient);
        console.log('📥 [handleSaveEditingIngredient] Resposta da API:', result);

        if (!result || !result.success) {
          console.error('❌ API retornou erro:', result);
          alert('Erro ao atualizar ingrediente: ' + (result?.message || 'Falha desconhecida'));
          return;
        }

        console.log('✅ Ingrediente atualizado no PostgreSQL:', state.editingIngredient.name);
      } catch (error) {
        console.error('❌ Erro ao atualizar ingrediente no PostgreSQL:', error);
        alert('Erro ao atualizar ingrediente no banco de dados: ' + error.message);
        return;
      }
    }

    // Atualizar no estado local apenas se salvou com sucesso no backend
    const updatedIngredients = state.ingredientsDatabase.map(ing => ing.id === state.editingIngredient.id ? state.editingIngredient : ing);
    state.setIngredientsDatabase(updatedIngredients);
    state.setEditingIngredient(null);
  };
  const handleCancelEditingIngredient = () => {
    state.setEditingIngredient(null);
  };
  const handleDeleteIngredient = id => {
    // Verificar se está sendo usado no evento atual
    if (ingredientsInUse.has(id)) {
      alert('❌ Este ingrediente está sendo usado no evento atual e não pode ser excluído.');
      return;
    }

    // Verificar se está sendo usado em algum prato
    if (window.dishManager) {
      const usage = window.dishManager.isIngredientInUse(id);
      if (usage.isInUse) {
        const dishNames = usage.dishes.map(d => `• ${d.name}`).join('\n');
        alert(`❌ Este ingrediente não pode ser excluído!\n\n` + `Ele está sendo usado em ${usage.count} prato(s):\n\n${dishNames}\n\n` + `Para excluir este ingrediente, primeiro remova-o dos pratos acima.`);
        return;
      }
    }
    if (confirm('⚠️ Tem certeza que deseja excluir este ingrediente?\n\nEsta ação não pode ser desfeita.')) {
      state.setIngredientsDatabase(state.ingredientsDatabase.filter(ing => ing.id !== id));
      console.log('✅ Ingrediente excluído com sucesso');
    }
  };

  // Função para atualizar ingredientes (usada na importação do Excel)
  const handleUpdateIngredients = updatedIngredients => {
    if (!Array.isArray(updatedIngredients) || updatedIngredients.length === 0) {
      alert('❌ Nenhum ingrediente válido para atualizar.');
      return;
    }

    // Substituir todos os ingredientes pelos atualizados
    state.setIngredientsDatabase(updatedIngredients);
    console.log('✅ Ingredientes atualizados:', updatedIngredients.length);
  };
  const handleAddToEvent = ingredient => {
    // Detectar tipo de ingrediente e definir quantidade inicial apropriada
    const isUnitType = ingredient.unitType === 'unit' || ingredient.unit === 'un';
    const newItem = {
      id: Date.now(),
      ingredientId: ingredient.id,
      quantityPerPerson: isUnitType ? 1 : 0.1,
      // 1 unidade ou 100g
      unit: isUnitType ? 'un' : 'g',
      unitType: ingredient.unitType || (isUnitType ? 'unit' : 'weight'),
      active: true
    };
    state.setItems([...state.items, newItem]);
  };

  // ====================================
  // Handlers - Itens do Evento
  // ====================================
  const handleUpdateItem = (id, field, value) => {
    state.setItems(state.items.map(item => item.id === id ? {
      ...item,
      [field]: value
    } : item));
  };
  const handleDeleteItem = id => {
    if (state.items.length === 1) {
      if (!confirm('⚠️ ATENÇÃO! Este é o último item do evento. Tem certeza que deseja excluir?')) {
        return;
      }
    }
    state.setItems(state.items.filter(item => item.id !== id));
  };

  // ====================================
  // Handlers - Apoio
  // ====================================
  const handleUpdateSupport = (id, field, value) => {
    state.setSupport(state.support.map(item => item.id === id ? {
      ...item,
      [field]: value
    } : item));
  };
  const handleDeleteSupport = id => {
    state.setSupport(state.support.filter(item => item.id !== id));
  };
  const handleAddSupport = () => {
    if (!state.newSupport || !state.newSupport.name.trim()) {
      alert('Por favor, insira um nome para o item de apoio');
      return;
    }
    const newItem = {
      id: Date.now(),
      name: state.newSupport.name,
      cost: state.newSupport.cost || 0,
      quantity: state.newSupport.quantity || 1,
      active: true
    };
    state.setSupport([...state.support, newItem]);
    // Reset newSupport
    state.setNewSupport({
      name: '',
      cost: 0,
      quantity: 1
    });
  };
  const handleStartEditingSupport = item => {
    state.setEditingSupport({
      ...item
    });
  };
  const handleSaveEditingSupport = () => {
    state.setSupport(state.support.map(item => item.id === state.editingSupport.id ? state.editingSupport : item));
    state.setEditingSupport(null);
  };
  const handleCancelEditingSupport = () => {
    state.setEditingSupport(null);
  };
  const handleAddSupportToEvent = supportItem => {
    // O botão "+" não faz nada - os itens de apoio já fazem parte do evento
    // Eles são incluídos no cálculo quando têm quantity > 0
    console.log('ℹ️ Item de apoio já faz parte do evento. Edite a quantidade para incluir no custo.');
    alert('Para incluir este item no evento, edite a quantidade e o custo diretamente na tabela.');
  };

  // ====================================
  // Handlers - Eventos Salvos
  // ====================================
  const handleLoadEvent = async eventId => {
    console.log('🔄 [handleLoadEvent] Carregando evento:', eventId);

    // Usar ManagerHelper para pegar o manager correto (backend > local)
    const eventManager = window.ManagerHelper?.getSavedEventsManager() || window.PrecificacaoAPI?.eventManager || window.savedEventsManager;
    if (!eventManager) {
      console.error('❌ EventManager não disponível');
      return null;
    }

    // EventManager (backend) usa getEventByIdAsync, SavedEventsManager (local) usa getById
    const event = eventManager.getEventByIdAsync ? await eventManager.getEventByIdAsync(eventId) : await eventManager.getById(eventId, true);
    console.log('📦 [handleLoadEvent] Evento recebido:', {
      hasEvent: !!event,
      hasData: !!event?.data,
      guests: event?.data?.guests,
      itemsCount: event?.data?.items?.length || 0,
      eventStructure: event ? Object.keys(event) : [],
      fullEvent: event
    });
    if (event) {
      // Restaurar todos os dados do evento
      console.log('✅ [handleLoadEvent] Restaurando dados do evento:', event.name);

      // ✅ FIX: Suportar múltiplas estruturas de dados
      // - Backend PostgreSQL: event.guests (raiz) + event.stateData.data
      // - IndexedDB local: event.data
      const eventData = event.stateData?.data || event.data || {};
      const hasStateData = !!event.stateData;

      // Restaurar dados do evento
      if (eventData && Object.keys(eventData).length > 0) {
        console.log('📋 Restaurando dados do evento...');

        // Guests: priorizar campo raiz do backend, fallback para event.data
        const guests = event.guests !== undefined ? event.guests : eventData.guests;
        if (guests !== undefined) {
          console.log('  - guests:', guests);
          state.setGuests(guests);
        }

        if (eventData.monthsUntilEvent !== undefined) state.setMonthsUntilEvent(eventData.monthsUntilEvent);
        if (eventData.ingredientsDatabase) {
          console.log('  - ingredientes:', eventData.ingredientsDatabase.length);
          state.setIngredientsDatabase(eventData.ingredientsDatabase);
        }
        if (eventData.items) {
          console.log('  - items:', eventData.items.length);
          state.setItems(eventData.items);
        }
        if (eventData.support) {
          console.log('  - support:', eventData.support.length);
          state.setSupport(eventData.support);
        }
        if (eventData.labor) state.setLabor(eventData.labor);
        if (eventData.transport) state.setTransport(eventData.transport);
        if (eventData.clientData) state.setClientData(eventData.clientData);
        if (eventData.proposalData) state.setProposalData(eventData.proposalData);
      } else if (event.guests !== undefined) {
        // Backend pode ter guests na raiz sem stateData
        console.log('📋 Restaurando guests da raiz:', event.guests);
        state.setGuests(event.guests);
      }

      // Restaurar metadados do evento
      if (event.name) {
        console.log('  - nome:', event.name);
        state.setEventName(event.name);
      }

      // ✅ DEBUG: Verificar todos os campos de data possíveis
      console.log('🔍 [handleLoadEvent] Verificando campos de data:', {
        eventDate: event.eventDate,
        event_date: event.event_date,
        date: event.date,
        createdAt: event.createdAt,
        allEventKeys: Object.keys(event)
      });

      // Tentar múltiplos formatos de data (backend pode usar snake_case)
      const eventDate = event.eventDate || event.event_date || event.date;
      if (eventDate) {
        console.log('  - data encontrada (raw):', eventDate);

        // ✅ FIX: Converter ISO timestamp para formato YYYY-MM-DD (required by <input type="date">)
        let dateForInput = eventDate;
        if (typeof eventDate === 'string' && eventDate.includes('T')) {
          // Formato ISO: "2025-12-31T12:00:00.000Z" -> "2025-12-31"
          dateForInput = eventDate.split('T')[0];
          console.log('  - data convertida para input:', dateForInput);
        }

        state.setEventDate(dateForInput);
      } else {
        console.warn('⚠️ [handleLoadEvent] Nenhuma data encontrada no evento!');
      }

      // ✅ FIX: Backend usa "location", frontend usa "eventLocation"
      const location = event.location || event.eventLocation;
      if (location) {
        console.log('  - local:', location);
        state.setEventLocation(location);
      }
      state.setCurrentEventId(eventId);
      state.setShowEventsList(false);
      console.log('✅ Evento carregado com sucesso!');
      alert('✅ Evento carregado com sucesso!');
    } else {
      console.error('❌ [handleLoadEvent] Evento não encontrado! ID:', eventId);
      console.error('❌ Verifique se o evento existe no IndexedDB');
      alert('❌ Erro ao carregar evento: evento não encontrado');
    }
  };
  const handleDuplicateEvent = async eventId => {
    const manager = window.savedEventsManager || window.PrecificacaoAPI?.eventManager;
    if (!manager) {
      alert('Erro: Sistema de eventos não carregado. Por favor, recarregue a página.');
      return;
    }
    const result = await manager.duplicateEvent(eventId);
    if (result.success) {
      alert(result.message);
      // Forçar refresh da lista
      state.setRefreshList(prev => prev + 1);
    } else {
      alert(result.message);
    }
  };
  const handleDeleteEvent = async (eventId, eventName) => {
    const manager = window.savedEventsManager || window.PrecificacaoAPI?.eventManager;
    if (!manager) {
      alert('Erro: Sistema de eventos não carregado. Por favor, recarregue a página.');
      return;
    }
    if (confirm(`Tem certeza que deseja excluir "${eventName}"?`)) {
      const result = await manager.deleteEvent(eventId);
      if (result.success) {
        alert(result.message);
        // Forçar refresh da lista
        state.setRefreshList(prev => prev + 1);
        // Se era o evento atual, limpar ID
        if (state.currentEventId === eventId) {
          state.setCurrentEventId(null);
        }
      } else {
        alert(result.message);
      }
    }
  };
  const handleClearEvent = () => {
    if (confirm('Deseja limpar o evento atual e criar um novo?')) {
      // Limpar apenas dados específicos do evento
      state.setItems([]);
      // NÃO limpar itens de apoio, transporte e mão de obra - mantém os valores para facilitar criação de novos eventos
      // state.setSupport([...]) - REMOVIDO para manter valores existentes
      // state.setLabor({...}) - REMOVIDO para manter valores existentes
      // state.setTransport({...}) - REMOVIDO para manter valores existentes
      state.setClientData({
        name: '',
        address: '',
        phone: '',
        email: '',
        photo: null,
        logo: null
      });
      state.setEventName('');
      state.setEventDate('');
      state.setEventLocation('');
      state.setCurrentEventId(null);
      state.setGuests(100);
      state.setMonthsUntilEvent(0);
    }
  };
  const handleExportEvents = () => {
    const manager = window.savedEventsManager || window.PrecificacaoAPI?.eventManager;
    if (!manager) {
      alert('Erro: Sistema de eventos não carregado. Por favor, recarregue a página.');
      return;
    }
    const result = manager.exportEvents();
    if (result.success) {
      alert(result.message);
    } else {
      alert(result.message);
    }
  };

  // ====================================
  // Handler: Upload de Logo da Empresa
  // ====================================
  const handleLogoUpload = event => {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      alert('❌ Por favor, selecione um arquivo de imagem válido (PNG, JPG, etc.)');
      return;
    }

    // Validar tamanho (máximo 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      alert('❌ A imagem é muito grande. O tamanho máximo é 2MB.');
      return;
    }

    // Ler arquivo como base64
    const reader = new FileReader();
    reader.onload = e => {
      const base64 = e.target.result;

      // Criar imagem temporária para redimensionar
      const img = new Image();
      img.onload = () => {
        // Criar canvas quadrado de 200x200 para manter qualidade
        const size = 200;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Calcular dimensões para preencher o círculo (crop central)
        const scale = Math.max(size / img.width, size / img.height);
        const x = size / 2 - img.width / 2 * scale;
        const y = size / 2 - img.height / 2 * scale;

        // Desenhar imagem centralizada e preenchendo o canvas
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        // Converter para base64 com compressão
        const resizedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        setCompanyLogo(resizedBase64);
        console.log('✅ Logo carregada com sucesso!');
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  };
  const handleRemoveLogo = () => {
    if (confirm('Deseja remover a logo da empresa?')) {
      setCompanyLogo(null);
      console.log('✅ Logo removida');
    }
  };
  const handleSaveEvent = async eventNameParam => {
    // Prevenir cliques duplos
    if (isSavingEvent) {
      console.log('⏸️ [handleSaveEvent] Já está salvando, ignorando clique duplicado');
      return;
    }
    setIsSavingEvent(true);
    try {
      // VALIDAÇÃO #1: Cliente é obrigatório
      if (!state.clientData || !state.clientData.id) {
        alert('❌ ERRO: É obrigatório selecionar um cliente antes de salvar o evento!\n\nPor favor:\n1. Vá na aba "Clientes"\n2. Cadastre um cliente\n3. Volte na aba "Eventos"\n4. Selecione o cliente no campo "Cliente"');
        setIsSavingEvent(false);
        return;
      }

      // VALIDAÇÃO #2: Nome do evento é obrigatório
      const eventName = eventNameParam || state.eventName || '';
      if (!eventName.trim()) {
        alert('❌ ERRO: Nome do evento é obrigatório!');
        setIsSavingEvent(false);
        return;
      }

      // IMPORTANTE:
      // - Se currentEventId existe = ATUALIZA o evento existente
      // - Se currentEventId é null = CRIA um novo evento
      // - Para criar novo evento, usuário deve clicar em "Novo Evento" primeiro
      console.log('💾 [handleSaveEvent] state.currentEventId:', state.currentEventId);
      console.log('💾 [handleSaveEvent] eventNameParam:', eventNameParam);
      console.log('💾 [handleSaveEvent] Nome final do evento:', eventName);
      console.log('💾 [handleSaveEvent] Cliente selecionado:', state.clientData);
      if (state.currentEventId) {
        console.log('✏️ ATUALIZANDO evento existente:', state.currentEventId);
      } else {
        console.log('📝 CRIANDO novo evento');
      }
      // ✅ FIX: Estrutura de dados compatível com backend PostgreSQL
      console.log('🔍 [handleSaveEvent] VERSION CHECK: b5e8579 - results fix applied');
      console.log('🔍 [handleSaveEvent] costs object:', costs);

      const stateData = {
        data: {
          guests: state.guests,
          monthsUntilEvent: state.monthsUntilEvent,
          ingredientsDatabase: state.ingredientsDatabase,
          items: state.items,
          support: state.support,
          labor: state.labor,
          transport: state.transport,
          clientData: state.clientData,
          proposalData: state.proposalData
        },
        results: {
          totalWithInflation: costs?.totalCost || 0,
          pricePerPerson: costs?.pricePerPerson || 0
        }
      };

      console.log('🔍 [handleSaveEvent] stateData.results:', stateData.results);

      const eventData = {
        id: state.currentEventId,
        name: eventName,
        eventDate: state.eventDate,
        location: state.eventLocation,  // ✅ Backend usa "location"
        eventLocation: state.eventLocation,  // Manter para compatibilidade com IndexedDB local
        guests: state.guests,  // ✅ Guests na raiz para backend
        monthsUntilEvent: state.monthsUntilEvent,  // ✅ monthsUntilEvent na raiz
        clientId: state.clientData?.id,
        stateData: stateData,  // ✅ stateData explícito para backend PostgreSQL
        data: stateData.data,  // Manter para compatibilidade com IndexedDB local
        results: stateData.results  // ✅ results na raiz para logs e compatibilidade
      };

      // DEBUG: Verificar dados antes de salvar
      console.log('💾 [handleSaveEvent] Dados a serem salvos:', {
        id: eventData.id,
        name: eventData.name,
        eventDate: eventData.eventDate,  // ✅ Verificar se data está sendo enviada
        location: eventData.location,
        guests: eventData.data.guests,
        itemsCount: eventData.data.items?.length || 0,
        totalWithInflation: eventData.results.totalWithInflation,
        pricePerPerson: eventData.results.pricePerPerson,
        costs: costs
      });

      // Usar SavedEventsManager que agora usa IndexedDB via StorageManager
      const manager = window.savedEventsManager || window.PrecificacaoAPI?.eventManager;
      if (!manager) {
        throw new Error('Manager de eventos não está disponível. Aguarde o carregamento ou recarregue a página.');
      }
      const result = await manager.saveEvent(eventData);
      if (result.success) {
        alert(result.message);
        // IMPORTANTE: Setar currentEventId para que próximos saves ATUALIZEM ao invés de criar duplicados
        if (result.eventId) {
          state.setCurrentEventId(result.eventId);
          console.log('✅ currentEventId atualizado para:', result.eventId);
        }
      } else {
        if (result.isQuotaError) {
          alert('❌ Espaço insuficiente!\n\nPor favor, abra migrate-to-indexeddb.html para migrar seus dados para IndexedDB.');
        } else {
          alert(result.message);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao salvar evento:', error);
      alert('Erro ao salvar evento: ' + error.message);
    } finally {
      // Sempre liberar o botão de save, mesmo em caso de erro
      setIsSavingEvent(false);
    }
  };

  // ====================================
  // Handlers: Propostas
  // ====================================
  const handleEditProposal = proposal => {
    setEditingProposal(proposal);
    setShowProposalBuilder(true);
  };
  const handleSaveProposal = proposalData => {
    // Fechar modal
    setShowProposalBuilder(false);
    setEditingProposal(null);

    // Disparar evento para recarregar lista de propostas
    window.dispatchEvent(new CustomEvent('proposalSaved'));
  };
  const handleCancelProposal = () => {
    setShowProposalBuilder(false);
    setEditingProposal(null);
  };

  // ====================================
  // Handlers - Senha
  // ====================================
  const handlePasswordSet = () => {
    setPasswordSet(true);
    // Após definir senha, precisa fazer login
    setAuthenticated(false);
  };
  const handleLoginSuccess = async () => {
    setAuthenticated(true);

    // IMPORTANTE: Não inicializar backend aqui!
    // O useEffect (linha 221) detectará a mudança de 'authenticated' e inicializará automaticamente
    console.log('✅ [handleLoginSuccess] Autenticação marcada - useEffect vai inicializar backend');
  };

  // ====================================
  // Handlers - Licença
  // ====================================
  const handleActivateLicense = async () => {
    if (!state.licenseKey.trim()) {
      state.setLicenseError('Por favor, insira uma chave de licença');
      return;
    }
    state.setLicenseError('Validando licença...');
    try {
      const result = await window.LicenseValidator.validateLicense(state.licenseKey);
      if (result.valid) {
        // Salvar licença
        await window.LicenseValidator.saveLicense(state.licenseKey, result);

        // IMPORTANTE: Disparar evento de mudança de plano para atualizar FeatureGates
        const licenseType = result.licenseType || 'STD';
        const planMap = {
          'OFF': 'offline',
          'STD': 'standard',
          'PRM': 'premium'
        };
        const planName = planMap[licenseType] || 'standard';
        console.log('🔄 Disparando evento plan-changed:', planName);
        window.dispatchEvent(new CustomEvent('plan-changed', {
          detail: {
            plan: planName,
            licenseType: licenseType
          }
        }));

        // Atualizar estado
        state.setLicenseValid(true);
        state.setLicenseExpiry(result.expiryDate);
        state.setLicensedTo(result.clientName);
        state.setLicensedEmail(result.email);
        state.setLicenseError('');
        state.setShowLicenseActivation(false);

        // Verificar fingerprint para licença OFF
        console.log('✅ [handleActivateLicense] Licença validada, verificando fingerprint...', {
          hasMachineFingerprint: !!window.MachineFingerprint,
          licenseType: result.licenseType
        });
        if (window.MachineFingerprint) {
          console.log('🔐 Iniciando verificação de fingerprint após login...');
          await window.MachineFingerprint.init();
        } else {
          console.warn('⚠️ MachineFingerprint não disponível no window');
        }

        // alert('✅ Licença ativada com sucesso!');
      } else {
        state.setLicenseError(result.error || 'Erro ao validar licença');
      }
    } catch (error) {
      console.error('Erro ao ativar licença:', error);
      state.setLicenseError('Erro ao processar licença. Tente novamente.');
    }
  };
  const handleOpenLicenseModal = () => {
    console.log('🔄 [handleOpenLicenseModal] Abrindo modal para trocar licença');

    // Limpar autenticação para forçar re-login com nova licença
    setAuthenticated(false);
    sessionStorage.removeItem('authenticated');
    sessionStorage.removeItem('justAuthenticated');
    console.log('🔓 Autenticação limpa');

    // Limpar licença do input para forçar o sistema a detectar como "nova"
    // Isso fará o useEffect detectar que não há licença no IndexedDB
    // e mostrar o formulário de "Criar Senha"
    state.setLicenseKey('');
    setPasswordSet(false);
    console.log('🧹 Licença do input limpa');

    // Abrir modal de licença
    state.setShowLicenseActivation(true);
    console.log('📋 Modal de licença aberto');
  };

  // ====================================
  // Handler Combinado - Licença + Senha
  // ====================================
  const handleActivateLicenseWithPassword = async password => {
    console.log('🔐 [handleActivateLicenseWithPassword] Iniciando...', {
      passwordSet,
      hasLicense: !!state.licenseKey
    });

    // IMPORTANTE: Verificar se a licença atual já existe no IndexedDB
    await window.PasswordManager.init();
    const storage = window.PasswordManager.storage;
    if (!storage) {
      console.error('❌ Storage não disponível!');
      alert('❌ Erro ao configurar senha - storage não disponível');
      return;
    }
    const storedLicenseKey = await storage.get('appLicenseKey', null);
    const isNewLicense = !storedLicenseKey || storedLicenseKey !== state.licenseKey;
    console.log('🔍 Verificando se licença é nova:');
    console.log('  - Licença no IndexedDB:', storedLicenseKey ? storedLicenseKey.substring(0, 30) + '...' : '(nenhuma)');
    console.log('  - Licença sendo ativada:', state.licenseKey ? state.licenseKey.substring(0, 30) + '...' : '(nenhuma)');
    console.log('  - É licença nova?', isNewLicense);

    // 1. Validar e salvar senha
    if (isNewLicense) {
      // LICENÇA NOVA - sempre criar senha via API
      console.log('🆕 Licença nova detectada - criando senha via API');
      try {
        // Chamar API para criar senha
        const API_URL = window.APP_CONFIG?.backend?.baseURL || 'https://precificacao-api-production.up.railway.app';
        console.log('📡 Chamando API para criar senha:', `${API_URL}/api/auth/set-password`);
        const response = await fetch(`${API_URL}/api/auth/set-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            licenseKey: state.licenseKey,
            password: password
          })
        });
        const result = await response.json();
        console.log('📡 Resposta da API:', result);
        if (!response.ok || !result.success) {
          console.error('❌ Erro ao criar senha na API:', result.message);
          state.setLicenseError(result.message || 'Erro ao criar senha');
          return;
        }
        console.log('✅ Senha criada com sucesso na API');

        // Salvar senha localmente também (para fallback offline)
        console.log('💾 Salvando senha no storage local...');
        await storage.set('appPassword', password);
        await storage.set('passwordSet', 'true');
        await storage.set('password_license_key', state.licenseKey);
        console.log('🔗 Senha associada à licença:', state.licenseKey.substring(0, 20) + '...');
        setPasswordSet(true);
        console.log('✅ Estado React atualizado: passwordSet = true');

        // IMPORTANTE: Fazer login automático para obter accessToken
        console.log('🔐 Fazendo login automático após criar senha...');
        try {
          const API_URL = window.APP_CONFIG?.backend?.baseURL || 'https://precificacao-api-production.up.railway.app';
          const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              licenseKey: state.licenseKey,
              password: password
            })
          });
          if (loginResponse.ok) {
            const loginResult = await loginResponse.json();
            if (loginResult.success && loginResult.data?.accessToken) {
              localStorage.setItem('accessToken', loginResult.data.accessToken);
              localStorage.setItem('refreshToken', loginResult.data.refreshToken);
              console.log('✅ AccessToken obtido após criar senha - sincronização habilitada');
            }
          }
        } catch (error) {
          console.warn('⚠️ Erro ao fazer login automático:', error);
        }
      } catch (error) {
        console.error('❌ Erro ao criar senha:', error);
        state.setLicenseError('Erro ao conectar com servidor. Verifique sua conexão.');
        return;
      }
    } else {
      // LICENÇA EXISTENTE - verificar senha via API
      console.log('🔑 Licença existente - verificando senha...');
      const result = await window.PasswordManager.checkPassword(password);
      if (!result.success) {
        console.error('❌ Senha incorreta:', result.message);
        state.setLicenseError(result.message);
        return;
      }
      console.log('✅ Senha verificada com sucesso');
    }

    // 2. Autenticar
    setAuthenticated(true);
    sessionStorage.setItem('authenticated', 'true');
    sessionStorage.setItem('justAuthenticated', 'true');
    console.log('🔐 Autenticação marcada no sessionStorage');

    // 3. Validar licença
    if (!state.licenseKey.trim()) {
      state.setLicenseError('Por favor, insira uma chave de licença');
      return;
    }
    state.setLicenseError('Validando licença...');
    try {
      const result = await window.LicenseValidator.validateLicense(state.licenseKey);
      if (result.valid) {
        // Salvar licença
        await window.LicenseValidator.saveLicense(state.licenseKey, result);

        // IMPORTANTE: Disparar evento de mudança de plano para atualizar FeatureGates
        const licenseType = result.licenseType || 'STD';
        const planMap = {
          'OFF': 'offline',
          'STD': 'standard',
          'PRM': 'premium'
        };
        const planName = planMap[licenseType] || 'standard';
        console.log('🔄 Disparando evento plan-changed:', planName);
        window.dispatchEvent(new CustomEvent('plan-changed', {
          detail: {
            plan: planName,
            licenseType: licenseType
          }
        }));

        // Atualizar estado
        state.setLicenseValid(true);
        state.setLicenseExpiry(result.expiryDate);
        state.setLicensedTo(result.clientName);
        state.setLicensedEmail(result.email);
        state.setLicenseError('');
        state.setShowLicenseActivation(false);

        // Verificar fingerprint para licença OFF
        console.log('✅ Licença validada, verificando fingerprint...', {
          hasMachineFingerprint: !!window.MachineFingerprint,
          licenseType: result.licenseType
        });
        if (window.MachineFingerprint) {
          console.log('🔐 Iniciando verificação de fingerprint após login...');
          await window.MachineFingerprint.init();
        } else {
          console.warn('⚠️ MachineFingerprint não disponível no window');
        }

        // IMPORTANTE: Não inicializar backend aqui!
        // O useEffect (linha 221) detectará a mudança de 'authenticated' e inicializará automaticamente
        console.log('✅ [handleActivateLicenseWithPassword] Licença ativada - useEffect vai inicializar backend');

        // alert('✅ Licença ativada e senha configurada com sucesso!');
      } else {
        state.setLicenseError(result.error || 'Erro ao validar licença');
        // Se falhar a licença, desautenticar
        setAuthenticated(false);
      }
    } catch (error) {
      console.error('Erro ao ativar licença:', error);
      state.setLicenseError('Erro ao processar licença. Tente novamente.');
      setAuthenticated(false);
    }
  };

  // ====================================
  // Fluxo de Autenticação SIMPLIFICADO: Licença + Senha em uma tela
  // ====================================

  // Mostrar loading enquanto carrega estado de autenticação
  if (isLoadingAuth) {
    return /*#__PURE__*/React.createElement("div", {
      className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-red-50 to-pink-50"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto mb-4"
    }), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-600 text-lg"
    }, "Carregando...")));
  }

  // Mostrar tela de carregamento de dados
  if (isLoadingData) {
    return /*#__PURE__*/React.createElement(LoadingScreen, {
      progress: loadingProgress,
      message: loadingMessage,
      details: loadingDetails
    });
  }

  // Se não está autenticado OU licença inválida, mostrar tela de ativação com senha
  if (!authenticated || !state.licenseValid || state.showLicenseActivation) {
    // Expor função para resetar senha (usada pelo botão "Esqueci minha senha")
    window.resetPasswordMode = () => {
      console.log('🔄 Modo de reset de senha ativado');
      setPasswordSet(false);
    };
    return /*#__PURE__*/React.createElement(LicenseActivation, {
      appVersion: APP_VERSION,
      licenseKey: state.licenseKey,
      onLicenseKeyChange: state.setLicenseKey,
      licenseError: state.licenseError,
      onActivate: handleActivateLicenseWithPassword,
      needsPassword: !passwordSet
    });
  }

  // ====================================
  // App Principal
  // ====================================
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col lg:flex-row min-h-screen"
  }, /*#__PURE__*/React.createElement("div", {
    className: `lg:w-96 bg-white shadow-2xl overflow-y-auto ${state.activeTab === 'config' ? 'block' : 'hidden'} lg:block pb-20 lg:pb-0`
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-6 bg-gradient-to-br from-orange-600 to-red-600 text-white"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative group"
  }, companyLogo ? /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("img", {
    src: companyLogo,
    alt: "Logo da Empresa",
    className: "w-20 h-20 rounded-full object-cover bg-white shadow-xl ring-4 ring-white/30"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: handleRemoveLogo,
    className: "absolute -top-1 -right-1 w-7 h-7 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600",
    title: "Remover logo"
  }, "\u2715")) : /*#__PURE__*/React.createElement("label", {
    htmlFor: "logoUpload",
    className: "w-20 h-20 rounded-full border-2 border-dashed border-white/50 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all hover:border-white",
    title: "Clique para adicionar logo da empresa"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-3xl"
  }, "\uD83C\uDFE2")), /*#__PURE__*/React.createElement("input", {
    id: "logoUpload",
    type: "file",
    accept: "image/*",
    onChange: handleLogoUpload,
    className: "hidden"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-3xl font-bold"
  }, "Precifica\xE7\xE3o"), /*#__PURE__*/React.createElement("p", {
    className: "text-orange-100 text-sm"
  }, "Eventos & Churrascos - v", APP_VERSION)))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, (() => {
    const currentPlan = window.ConfigHelper?.getCurrentPlan() || 'offline';
    const planConfig = {
      offline: {
        icon: '💾',
        label: 'OFFLINE',
        subtitle: 'R$ 19,90/mês',
        gradient: 'from-gray-500 to-gray-600'
      },
      standard: {
        icon: '☁️',
        label: 'STANDARD',
        subtitle: 'R$ 49,90/mês',
        gradient: 'from-blue-500 to-blue-600'
      },
      premium: {
        icon: '⭐',
        label: 'PREMIUM',
        subtitle: 'R$ 69,90/mês',
        gradient: 'from-purple-500 to-purple-600'
      }
    };
    const plan = planConfig[currentPlan] || planConfig.offline;
    return /*#__PURE__*/React.createElement("div", {
      className: `flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r ${plan.gradient} text-white shadow-lg`
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-base"
    }, plan.icon), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-bold uppercase"
    }, plan.label), /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] opacity-90"
    }, plan.subtitle)));
  })(), state.licenseValid && /*#__PURE__*/React.createElement("button", {
    onClick: handleOpenLicenseModal,
    className: "flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-lg hover:shadow-xl hover:from-amber-600 hover:to-yellow-700 transition-all cursor-pointer",
    title: "Clique para alterar licen\xE7a"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-base"
  }, "\uD83D\uDD12"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold uppercase"
  }, "LICENCIADO"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] opacity-90 truncate max-w-[120px]"
  }, state.licensedTo))))), /*#__PURE__*/React.createElement("div", {
    className: "p-4 border-t border-gray-200 bg-blue-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg p-4 shadow-md border-2 border-blue-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-3xl"
  }, "\uD83D\uDCD6"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-gray-900 mb-1"
  }, "Manual do Usu\xE1rio"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 mb-3"
  }, "Guia completo com instru\xE7\xF5es detalhadas sobre todas as funcionalidades do sistema."), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: async () => {
      try {
        // Converter e baixar como PDF
        if (!window.MarkdownToPDF) {
          alert('Carregando conversor de PDF...');
          return;
        }
        const converter = new window.MarkdownToPDF();
        const result = await converter.downloadManualAsPDF();
        if (!result.success) {
          alert('Erro ao gerar PDF: ' + result.error);
        }
      } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        alert('Erro ao gerar PDF. Tente novamente.');
      }
    },
    className: "flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-5 h-5",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
  })), "PDF"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      // Abrir manual em nova aba
      window.open('/MANUAL-DO-USUARIO.md', '_blank');
    },
    className: "flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg font-semibold hover:from-gray-700 hover:to-gray-800 transition-all shadow-md hover:shadow-lg"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-5 h-5",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z"
  }), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
  })), "Ver")))))), /*#__PURE__*/React.createElement("div", {
    className: "lg:hidden p-4 border-t border-gray-200 bg-gradient-to-br from-green-50 to-emerald-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg p-4 shadow-md border-2 border-green-300"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-3xl"
  }, "\uD83D\uDCF1"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-gray-900 mb-1"
  }, "Instalar como App"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 mb-3"
  }, "Use como aplicativo nativo! Adicione \xE0 tela inicial do seu celular."), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const instructions = document.getElementById('pwa-instructions');
      if (instructions) {
        instructions.classList.toggle('hidden');
      }
    },
    className: "w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg mb-3"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-5 h-5",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
  })), "Ver Instru\xE7\xF5es"), /*#__PURE__*/React.createElement("div", {
    id: "pwa-instructions",
    className: "hidden space-y-3 text-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 p-3 rounded-lg border border-gray-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-lg"
  }, "\uD83C\uDF4E"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-gray-900"
  }, "iPhone/iPad")), /*#__PURE__*/React.createElement("ol", {
    className: "list-decimal list-inside space-y-1 text-gray-700 text-xs"
  }, /*#__PURE__*/React.createElement("li", null, "Abra no ", /*#__PURE__*/React.createElement("strong", null, "Safari")), /*#__PURE__*/React.createElement("li", null, "Toque em ", /*#__PURE__*/React.createElement("strong", null, "\uD83D\uDD17 Compartilhar"), " (barra inferior)"), /*#__PURE__*/React.createElement("li", null, "Role e toque ", /*#__PURE__*/React.createElement("strong", null, "\"Adicionar \xE0 Tela de In\xEDcio\"")), /*#__PURE__*/React.createElement("li", null, "Confirme tocando ", /*#__PURE__*/React.createElement("strong", null, "\"Adicionar\"")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 p-3 rounded-lg border border-gray-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-lg"
  }, "\uD83E\uDD16"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-gray-900"
  }, "Android")), /*#__PURE__*/React.createElement("ol", {
    className: "list-decimal list-inside space-y-1 text-gray-700 text-xs"
  }, /*#__PURE__*/React.createElement("li", null, "Abra no ", /*#__PURE__*/React.createElement("strong", null, "Chrome")), /*#__PURE__*/React.createElement("li", null, "Toque no menu ", /*#__PURE__*/React.createElement("strong", null, "\u22EE"), " (canto superior)"), /*#__PURE__*/React.createElement("li", null, "Selecione ", /*#__PURE__*/React.createElement("strong", null, "\"Adicionar \xE0 tela inicial\"")), /*#__PURE__*/React.createElement("li", null, "Confirme tocando ", /*#__PURE__*/React.createElement("strong", null, "\"Adicionar\"")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-green-50 p-3 rounded-lg border border-green-200"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-green-900 text-xs mb-1"
  }, "\u2728 Vantagens:"), /*#__PURE__*/React.createElement("ul", {
    className: "text-green-800 text-xs space-y-0.5"
  }, /*#__PURE__*/React.createElement("li", null, "\u2022 Abre em tela cheia"), /*#__PURE__*/React.createElement("li", null, "\u2022 Mais r\xE1pido de acessar"), /*#__PURE__*/React.createElement("li", null, "\u2022 Funciona offline"), /*#__PURE__*/React.createElement("li", null, "\u2022 Parece app nativo")))))))), /*#__PURE__*/React.createElement("div", {
    className: "p-4 border-t border-gray-200"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => state.setIsCompanyExpanded(!state.isCompanyExpanded),
    className: "w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "building",
    className: "w-5 h-5 text-orange-600"
  }), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-gray-900"
  }, "Dados da Empresa")), /*#__PURE__*/React.createElement(Icon, {
    type: state.isCompanyExpanded ? "chevron-up" : "chevron-down",
    className: "w-5 h-5 text-gray-400"
  })), state.isCompanyExpanded && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 space-y-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Nome da Empresa"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: state.proposalData.companyName,
    onChange: e => state.setProposalData({
      ...state.proposalData,
      companyName: e.target.value
    }),
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500",
    placeholder: "Sua Empresa"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Telefone"), /*#__PURE__*/React.createElement("input", {
    type: "tel",
    value: state.proposalData.companyPhone,
    onChange: e => {
      const masked = window.applyPhoneMask ? window.applyPhoneMask(e.target.value) : e.target.value;
      state.setProposalData({
        ...state.proposalData,
        companyPhone: masked
      });
    },
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500",
    placeholder: "(00) 00000-0000",
    maxLength: "15"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Email"), /*#__PURE__*/React.createElement("input", {
    type: "email",
    value: state.proposalData.companyEmail,
    onChange: e => state.setProposalData({
      ...state.proposalData,
      companyEmail: e.target.value
    }),
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500",
    placeholder: "contato@empresa.com"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Endere\xE7o"), /*#__PURE__*/React.createElement("textarea", {
    value: state.proposalData.companyAddress,
    onChange: e => state.setProposalData({
      ...state.proposalData,
      companyAddress: e.target.value
    }),
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500",
    placeholder: "Endere\xE7o da empresa",
    rows: "2"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "\uD83D\uDCD6 Hist\xF3ria da Empresa"), /*#__PURE__*/React.createElement("textarea", {
    value: state.proposalData.companyHistory || '',
    onChange: e => state.setProposalData({
      ...state.proposalData,
      companyHistory: e.target.value
    }),
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500",
    placeholder: "Conte a hist\xF3ria e trajet\xF3ria da sua empresa...",
    rows: "3"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "\uD83C\uDFAF Miss\xE3o"), /*#__PURE__*/React.createElement("textarea", {
    value: state.proposalData.companyMission || '',
    onChange: e => state.setProposalData({
      ...state.proposalData,
      companyMission: e.target.value
    }),
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500",
    placeholder: "Qual \xE9 a miss\xE3o da sua empresa?",
    rows: "2"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "\uD83D\uDD2D Vis\xE3o"), /*#__PURE__*/React.createElement("textarea", {
    value: state.proposalData.companyVision || '',
    onChange: e => state.setProposalData({
      ...state.proposalData,
      companyVision: e.target.value
    }),
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500",
    placeholder: "Onde a empresa quer chegar?",
    rows: "2"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "\uD83D\uDC8E Valores"), /*#__PURE__*/React.createElement("textarea", {
    value: state.proposalData.companyValues || '',
    onChange: e => state.setProposalData({
      ...state.proposalData,
      companyValues: e.target.value
    }),
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500",
    placeholder: "Quais s\xE3o os valores que guiam a empresa?",
    rows: "3"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "\u2B50 Motiva\xE7\xE3o / Diferenciais"), /*#__PURE__*/React.createElement("textarea", {
    value: state.proposalData.companyMotivation || '',
    onChange: e => state.setProposalData({
      ...state.proposalData,
      companyMotivation: e.target.value
    }),
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500",
    placeholder: "O que motiva a empresa? Quais s\xE3o os diferenciais?",
    rows: "3"
  })), /*#__PURE__*/React.createElement("div", {
    className: "border-t pt-4 mt-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-sm font-semibold text-gray-700 mb-3"
  }, "\uD83D\uDCF8 Galeria de Fotos da Empresa"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mb-3"
  }, "Adicione at\xE9 3 fotos que poder\xE3o ser usadas nas propostas"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-medium text-gray-600 mb-1"
  }, "Foto 1 - Principal"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3 items-start"
  }, /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: "image/*",
    onChange: e => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = event => {
          const img = new Image();
          img.src = event.target.result;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxWidth = 800;
            if (width > maxWidth) {
              height = height * maxWidth / width;
              width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.7);
            state.setProposalData({
              ...state.proposalData,
              companyPhoto1: compressed
            });
          };
        };
        reader.readAsDataURL(file);
      }
    },
    className: "flex-1 text-sm"
  }), state.proposalData.companyPhoto1 && /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("img", {
    src: state.proposalData.companyPhoto1,
    alt: "Foto 1",
    className: "w-16 h-16 object-cover rounded border"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => state.setProposalData({
      ...state.proposalData,
      companyPhoto1: null
    }),
    className: "absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
  }, "\xD7")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-medium text-gray-600 mb-1"
  }, "Foto 2 - Ambiente/Equipe"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3 items-start"
  }, /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: "image/*",
    onChange: e => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = event => {
          const img = new Image();
          img.src = event.target.result;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxWidth = 800;
            if (width > maxWidth) {
              height = height * maxWidth / width;
              width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.7);
            state.setProposalData({
              ...state.proposalData,
              companyPhoto2: compressed
            });
          };
        };
        reader.readAsDataURL(file);
      }
    },
    className: "flex-1 text-sm"
  }), state.proposalData.companyPhoto2 && /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("img", {
    src: state.proposalData.companyPhoto2,
    alt: "Foto 2",
    className: "w-16 h-16 object-cover rounded border"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => state.setProposalData({
      ...state.proposalData,
      companyPhoto2: null
    }),
    className: "absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
  }, "\xD7")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-medium text-gray-600 mb-1"
  }, "Foto 3 - Produtos/Servi\xE7os"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3 items-start"
  }, /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: "image/*",
    onChange: e => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = event => {
          const img = new Image();
          img.src = event.target.result;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxWidth = 800;
            if (width > maxWidth) {
              height = height * maxWidth / width;
              width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.7);
            state.setProposalData({
              ...state.proposalData,
              companyPhoto3: compressed
            });
          };
        };
        reader.readAsDataURL(file);
      }
    },
    className: "flex-1 text-sm"
  }), state.proposalData.companyPhoto3 && /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("img", {
    src: state.proposalData.companyPhoto3,
    alt: "Foto 3",
    className: "w-16 h-16 object-cover rounded border"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => state.setProposalData({
      ...state.proposalData,
      companyPhoto3: null
    }),
    className: "absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
  }, "\xD7")))))), /*#__PURE__*/React.createElement("div", {
    className: "border-t pt-4 mt-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: async () => {
      console.log('🔍 [Botão Salvar] Verificando window.companyManager...');
      console.log('🔍 [Botão Salvar] window.companyManager:', window.companyManager);
      console.log('🔍 [Botão Salvar] window.CompanyManager:', window.CompanyManager);

      // Usar ManagerHelper para pegar o manager correto (backend > local)
      const companyManager = window.ManagerHelper?.getCompanyManager() || window.PrecificacaoAPI?.companyManager || window.companyManager;
      if (companyManager) {
        try {
          console.log('💾 [Botão Salvar] Salvando dados:', state.proposalData);
          await companyManager.saveCompanyData(state.proposalData);
          alert('✅ Dados da empresa salvos com sucesso!');
        } catch (error) {
          console.error('❌ [Botão Salvar] Erro ao salvar:', error);
          alert('❌ Erro ao salvar: ' + error.message);
        }
      } else {
        console.error('❌ [Botão Salvar] CompanyManager não está disponível!');
        console.error('❌ [Botão Salvar] window.CompanyManager:', window.CompanyManager);
        alert('⚠️ CompanyManager não está disponível.\n\nVerifique o Console (F12) para mais detalhes.');
      }
    },
    className: "w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-5 h-5",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
  })), "\uD83D\uDCBE Salvar Dados da Empresa"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-2 text-center"
  }, "Os dados ser\xE3o automaticamente usados em todas as novas propostas")))), /*#__PURE__*/React.createElement(CostsSummary, {
    categoryStats: categoryStats,
    supportCost: costs?.supportCost || 0,
    laborCost: costs?.laborCost || 0,
    transportCost: costs?.transportCost || 0,
    subtotal: costs?.subtotal || 0,
    totalCost: costs?.totalCost || 0,
    pricePerPerson: costs?.pricePerPerson || 0,
    guests: state.guests
  }), /*#__PURE__*/React.createElement("div", {
    className: "p-4"
  }, /*#__PURE__*/React.createElement(PasswordLock, {
    isLocked: state.isLocked,
    lockoutTime: state.lockoutTime ? new Date(state.lockoutTime) : null,
    passwordAttempts: state.passwordAttempts
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto pb-20 lg:pb-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-8"
  }, (state.clientData?.name || state.eventName || state.guests > 0) && /*#__PURE__*/React.createElement("div", {
    className: "mb-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between flex-wrap gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4 flex-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "calendar",
    className: "w-8 h-8"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, state.eventName && /*#__PURE__*/React.createElement("div", {
    className: "text-lg font-bold mb-2 text-blue-50"
  }, "\uD83D\uDCCB ", state.eventName), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4 flex-wrap text-sm text-blue-100 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "user",
    className: "w-4 h-4"
  }), state.guests, " convidados"), state.eventDate && /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "calendar",
    className: "w-4 h-4"
  }), formatDate(state.eventDate)), state.eventLocation && /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "map-pin",
    className: "w-4 h-4"
  }), "Local: ", state.eventLocation)), state.clientData?.name && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-blue-200 mb-1"
  }, "Cliente:"), /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold"
  }, state.clientData.name)))), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-blue-100"
  }, "Custo por Pessoa"), /*#__PURE__*/React.createElement("div", {
    className: "text-3xl font-bold"
  }, formatCurrency(costs?.pricePerPerson || 0))))), state.activeTab !== 'whatsapp' && /*#__PURE__*/React.createElement("div", {
    className: "lg:hidden mb-6"
  }, /*#__PURE__*/React.createElement(CostsSummary, {
    categoryStats: categoryStats,
    supportCost: costs?.supportCost || 0,
    laborCost: costs?.laborCost || 0,
    transportCost: costs?.transportCost || 0,
    subtotal: costs?.subtotal || 0,
    totalCost: costs?.totalCost || 0,
    pricePerPerson: costs?.pricePerPerson || 0,
    guests: state.guests
  })), state.activeTab !== 'whatsapp' && /*#__PURE__*/React.createElement("div", {
    className: "lg:hidden mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200 shadow-lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-3xl"
  }, "\uD83D\uDCF1"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-gray-900 mb-1"
  }, "Instalar como App"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 mb-3"
  }, "Use como aplicativo nativo! Adicione \xE0 tela inicial do seu celular."), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const instructions = document.getElementById('pwa-instructions-mobile');
      if (instructions) {
        instructions.classList.toggle('hidden');
      }
    },
    className: "w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg mb-3"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-5 h-5",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
  })), "Ver Instru\xE7\xF5es"), state.activeTab !== 'whatsapp' && /*#__PURE__*/React.createElement("div", {
    id: "pwa-instructions-mobile",
    className: "hidden space-y-3 text-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-3 rounded-lg border border-gray-200 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-lg"
  }, "\uD83C\uDF4E"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-gray-900"
  }, "iPhone/iPad")), /*#__PURE__*/React.createElement("ol", {
    className: "list-decimal list-inside space-y-1 text-gray-700 text-xs"
  }, /*#__PURE__*/React.createElement("li", null, "Abra no ", /*#__PURE__*/React.createElement("strong", null, "Safari")), /*#__PURE__*/React.createElement("li", null, "Toque em ", /*#__PURE__*/React.createElement("strong", null, "\uD83D\uDD17 Compartilhar"), " (barra inferior)"), /*#__PURE__*/React.createElement("li", null, "Role e toque ", /*#__PURE__*/React.createElement("strong", null, "\"Adicionar \xE0 Tela de In\xEDcio\"")), /*#__PURE__*/React.createElement("li", null, "Confirme tocando ", /*#__PURE__*/React.createElement("strong", null, "\"Adicionar\"")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-3 rounded-lg border border-gray-200 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-lg"
  }, "\uD83E\uDD16"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-gray-900"
  }, "Android")), /*#__PURE__*/React.createElement("ol", {
    className: "list-decimal list-inside space-y-1 text-gray-700 text-xs"
  }, /*#__PURE__*/React.createElement("li", null, "Abra no ", /*#__PURE__*/React.createElement("strong", null, "Chrome")), /*#__PURE__*/React.createElement("li", null, "Toque no menu ", /*#__PURE__*/React.createElement("strong", null, "\u22EE"), " (canto superior)"), /*#__PURE__*/React.createElement("li", null, "Selecione ", /*#__PURE__*/React.createElement("strong", null, "\"Adicionar \xE0 tela inicial\"")), /*#__PURE__*/React.createElement("li", null, "Confirme tocando ", /*#__PURE__*/React.createElement("strong", null, "\"Adicionar\"")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-green-50 p-3 rounded-lg border border-green-200"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-green-900 text-xs mb-1"
  }, "\u2728 Vantagens:"), /*#__PURE__*/React.createElement("ul", {
    className: "text-green-800 text-xs space-y-0.5"
  }, /*#__PURE__*/React.createElement("li", null, "\u2022 Abre em tela cheia"), /*#__PURE__*/React.createElement("li", null, "\u2022 Mais r\xE1pido de acessar"), /*#__PURE__*/React.createElement("li", null, "\u2022 Funciona offline"), /*#__PURE__*/React.createElement("li", null, "\u2022 Parece app nativo")))))))), /*#__PURE__*/React.createElement("div", {
    className: "hidden lg:flex gap-2 mb-6 bg-white rounded-xl p-2 shadow-lg"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => state.setActiveTab('clients'),
    className: `flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm transition ${state.activeTab === 'clients' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "users",
    className: "w-4 h-4"
  }), "Clientes"), /*#__PURE__*/React.createElement("button", {
    onClick: () => state.setActiveTab('events'),
    className: `flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm transition ${state.activeTab === 'events' ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`
  }, "\uD83D\uDCC5 Eventos"), /*#__PURE__*/React.createElement("button", {
    onClick: () => state.setActiveTab('ingredients'),
    className: `flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm transition ${state.activeTab === 'ingredients' ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "database",
    className: "w-4 h-4"
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, "Ingredientes"), /*#__PURE__*/React.createElement("span", {
    className: "sm:hidden"
  }, "Ingred.")), /*#__PURE__*/React.createElement("button", {
    onClick: () => state.setActiveTab('dishes'),
    className: `flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm transition ${state.activeTab === 'dishes' ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`
  }, "\uD83C\uDF7D\uFE0F Pratos"), /*#__PURE__*/React.createElement("button", {
    onClick: () => state.setActiveTab('menu'),
    className: `flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm transition ${state.activeTab === 'menu' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`
  }, "\uD83D\uDCCB Card\xE1pio"), /*#__PURE__*/React.createElement("button", {
    onClick: () => state.setActiveTab('saved-menus'),
    className: `flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm transition ${state.activeTab === 'saved-menus' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`
  }, "\uD83D\uDCBE Salvos"), /*#__PURE__*/React.createElement("button", {
    onClick: () => state.setActiveTab('items'),
    className: `flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm transition ${state.activeTab === 'items' ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "package",
    className: "w-4 h-4"
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, "Itens"), /*#__PURE__*/React.createElement("span", {
    className: "sm:hidden"
  }, "Itens")), /*#__PURE__*/React.createElement("button", {
    onClick: () => state.setActiveTab('support'),
    className: `flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm transition ${state.activeTab === 'support' ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "settings",
    className: "w-4 h-4"
  }), "Apoio"), /*#__PURE__*/React.createElement(ProposalTabButton, {
    isActive: state.activeTab === 'proposals',
    onClick: () => state.setActiveTab('proposals')
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => state.setActiveTab('whatsapp'),
    className: `flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm transition ${state.activeTab === 'whatsapp' ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`
  }, "📱 WhatsApp")), state.activeTab === 'ingredients' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement(IngredientsDatabase, {
    groupedIngredients: groupedIngredients,
    ingredientsInUse: ingredientsInUse,
    newIngredient: state.newIngredient,
    onNewIngredientChange: state.setNewIngredient,
    onAddIngredient: handleAddIngredient,
    editingIngredient: state.editingIngredient,
    onStartEditing: handleStartEditingIngredient,
    onEditingChange: state.setEditingIngredient,
    onSaveEditing: handleSaveEditingIngredient,
    onCancelEditing: handleCancelEditingIngredient,
    onDeleteIngredient: handleDeleteIngredient,
    onAddToEvent: handleAddToEvent
  })), state.activeTab === 'clients' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, window.ClientsPage ? /*#__PURE__*/React.createElement(window.ClientsPage, null) : /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow p-6 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600"
  }, "Carregando componente de Clientes..."))), state.activeTab === 'events' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, window.EventsPage ? /*#__PURE__*/React.createElement(window.EventsPage, {
    eventData: {
      eventDate: state.eventDate,
      guests: state.guests,
      eventLocation: state.eventLocation,
      clientData: state.clientData,
      monthsUntilEvent: state.monthsUntilEvent,
      eventName: state.eventName
    },
    isSavingEvent: isSavingEvent,
    onSaveEvent: async eventName => {
      // Define o nome do evento no estado
      state.setEventName(eventName);
      // Salva diretamente passando o nome como parâmetro
      await handleSaveEvent(eventName);
    },
    onNewEvent: () => {
      // Usa o handler existente
      handleClearEvent();
    },
    onLoadEvent: handleLoadEvent,
    onUpdateEventData: updates => {
      // Atualiza campos do evento em tempo real
      if (updates.eventDate !== undefined) {
        state.setEventDate(updates.eventDate);
      }
      if (updates.guests !== undefined) {
        state.setGuests(updates.guests);
      }
      if (updates.eventLocation !== undefined) {
        state.setEventLocation(updates.eventLocation);
      }
      if (updates.clientData !== undefined) {
        state.setClientData(updates.clientData);
      }
      if (updates.monthsUntilEvent !== undefined) {
        state.setMonthsUntilEvent(updates.monthsUntilEvent);
      }
      if (updates.eventName !== undefined) {
        state.setEventName(updates.eventName);
      }
    },
    costs: costs
  }) : /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow p-6 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600"
  }, "Carregando componente de Eventos..."))), state.activeTab === 'items' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement(ItemsList, {
    groupedItems: groupedItems,
    categoryStats: categoryStats,
    guests: state.guests,
    onUpdateItem: handleUpdateItem,
    onDeleteItem: handleDeleteItem
  })), state.activeTab === 'support' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement(SupportList, {
    supportItems: supportItemsWithTotal,
    onUpdateItem: handleUpdateSupport,
    onDeleteItem: handleDeleteSupport,
    onAddToEvent: handleAddSupportToEvent,
    newSupport: state.newSupport,
    onNewSupportChange: state.setNewSupport,
    onAddSupport: handleAddSupport,
    editingSupport: state.editingSupport,
    onStartEditing: handleStartEditingSupport,
    onEditingChange: state.setEditingSupport,
    onSaveEditing: handleSaveEditingSupport,
    onCancelEditing: handleCancelEditingSupport
  }), /*#__PURE__*/React.createElement(TransportForm, {
    transport: state.transport,
    onTransportChange: state.setTransport,
    transportCost: costs?.transportCost || 0
  }), /*#__PURE__*/React.createElement(LaborForm, {
    labor: state.labor,
    onLaborChange: state.setLabor,
    laborCost: costs?.laborCost || 0
  })), state.activeTab === 'dishes' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, window.FeatureGate ? /*#__PURE__*/React.createElement(window.FeatureGate, {
    featureName: "dishes"
  }, window.DishesPage ? /*#__PURE__*/React.createElement(window.DishesPage, null) : /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow p-6 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600"
  }, "Carregando componente de Pratos..."))) : /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow p-6 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-red-600"
  }, "\u26A0\uFE0F FeatureGate n\xE3o carregado"))), state.activeTab === 'menu' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, window.MenuPage ? /*#__PURE__*/React.createElement(window.MenuPage, {
    state: state
  }) : /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow p-6 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600"
  }, "Carregando componente de Card\xE1pio..."), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-red-500 mt-2"
  }, "MenuPage n\xE3o encontrado no window"))), state.activeTab === 'saved-menus' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, window.SavedMenusList ? /*#__PURE__*/React.createElement(window.SavedMenusList, null) : /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow p-6 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600"
  }, "Carregando componente de Card\xE1pios Salvos..."), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-red-500 mt-2"
  }, "SavedMenusList n\xE3o encontrado no window"))), state.activeTab === 'proposals' && /*#__PURE__*/React.createElement(FeatureGate, {
    featureName: "pdfExport",
    requiredPlan: "standard"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, showProposalBuilder ? /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow p-6"
  }, window.ProposalBuilderSimple ? /*#__PURE__*/React.createElement(window.ProposalBuilderSimple, {
    proposal: editingProposal,
    onSave: handleSaveProposal,
    onCancel: handleCancelProposal,
    eventData: {
      guests: state.guests,
      eventDate: state.eventDate,
      eventLocation: state.eventLocation,
      monthsUntilEvent: state.monthsUntilEvent,
      clientData: state.clientData,
      proposalData: state.proposalData,
      costs: costs
    }
  }) : /*#__PURE__*/React.createElement("p", {
    className: "text-red-600"
  }, "ProposalBuilderSimple n\xE3o carregado")) : /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow"
  }, window.ProposalList ? /*#__PURE__*/React.createElement(window.ProposalList, {
    onEdit: handleEditProposal
  }) : /*#__PURE__*/React.createElement("div", {
    className: "p-6 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600"
  }, "Carregando componente de Propostas..."))))), state.activeTab === 'whatsapp' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, window.WhatsAppSettings ? /*#__PURE__*/React.createElement(window.WhatsAppSettings, null) : /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow p-6 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600"
  }, "Carregando configurações WhatsApp...")))), state.showSaveDialog && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold text-gray-800 mb-4"
  }, "\uD83D\uDCBE Salvar Evento"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4 mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Nome do Evento *"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: state.eventName,
    onChange: e => state.setEventName(e.target.value),
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent",
    placeholder: "Ex: Casamento Jo\xE3o e Maria",
    autoFocus: true
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Data do Evento"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: state.eventDate,
    onChange: e => state.setEventDate(e.target.value),
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Local do Evento"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: state.eventLocation,
    onChange: e => state.setEventLocation(e.target.value),
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent",
    placeholder: "Ex: Sal\xE3o de Festas"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (!state.eventName || state.eventName.trim() === '') {
        alert('⚠️ Por favor, digite um nome para o evento');
        return;
      }
      handleSaveEvent();
      state.setShowSaveDialog(false);
    },
    className: "flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition"
  }, "\u2705 Salvar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => state.setShowSaveDialog(false),
    className: "flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
  }, "\u274C Cancelar")))), state.showEventsList && /*#__PURE__*/React.createElement(SavedEventsList, {
    savedEvents: (window.savedEventsManager || window.PrecificacaoAPI?.eventManager)?.getSortedByDate?.() || [],
    currentEventId: state.currentEventId,
    onLoadEvent: handleLoadEvent,
    onDuplicateEvent: handleDuplicateEvent,
    onDeleteEvent: handleDeleteEvent,
    onExportEvents: handleExportEvents,
    onClose: () => state.setShowEventsList(false)
  }), /*#__PURE__*/React.createElement("div", {
    className: "lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "safe-bottom"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-around items-center py-1 px-0.5 border-b border-gray-100"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => state.setActiveTab('clients'),
    className: `flex flex-col items-center justify-center px-1 py-1 rounded-lg transition-all flex-1 ${state.activeTab === 'clients' ? 'text-orange-600 bg-orange-50' : 'text-gray-600'}`
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-4 h-4",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[8px] font-medium mt-0.5"
  }, "Clientes")), /*#__PURE__*/React.createElement("button", {
    onClick: () => state.setActiveTab('events'),
    className: `flex flex-col items-center justify-center px-1 py-1 rounded-lg transition-all flex-1 ${state.activeTab === 'events' ? 'text-orange-600 bg-orange-50' : 'text-gray-600'}`
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-4 h-4",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[8px] font-medium mt-0.5"
  }, "Eventos")), /*#__PURE__*/React.createElement("button", {
    onClick: () => state.setActiveTab('ingredients'),
    className: `flex flex-col items-center justify-center px-1 py-1 rounded-lg transition-all flex-1 ${state.activeTab === 'ingredients' ? 'text-orange-600 bg-orange-50' : 'text-gray-600'}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm"
  }, "\uD83E\uDD55"), /*#__PURE__*/React.createElement("span", {
    className: "text-[8px] font-medium mt-0.5"
  }, "Ingred.")), /*#__PURE__*/React.createElement("button", {
    onClick: () => state.setActiveTab('dishes'),
    className: `flex flex-col items-center justify-center px-1 py-1 rounded-lg transition-all flex-1 ${state.activeTab === 'dishes' ? 'text-orange-600 bg-orange-50' : 'text-gray-600'}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm"
  }, "\uD83C\uDF7D\uFE0F"), /*#__PURE__*/React.createElement("span", {
    className: "text-[8px] font-medium mt-0.5"
  }, "Pratos"))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-around items-center py-1 px-0.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => state.setActiveTab('menu'),
    className: `flex flex-col items-center justify-center px-1 py-1 rounded-lg transition-all flex-1 ${state.activeTab === 'menu' ? 'text-orange-600 bg-orange-50' : 'text-gray-600'}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm"
  }, "\uD83D\uDCCB"), /*#__PURE__*/React.createElement("span", {
    className: "text-[8px] font-medium mt-0.5"
  }, "Card\xE1pio")), /*#__PURE__*/React.createElement("button", {
    onClick: () => state.setActiveTab('saved-menus'),
    className: `flex flex-col items-center justify-center px-1 py-1 rounded-lg transition-all flex-1 ${state.activeTab === 'saved-menus' ? 'text-orange-600 bg-orange-50' : 'text-gray-600'}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm"
  }, "\uD83D\uDCBE"), /*#__PURE__*/React.createElement("span", {
    className: "text-[8px] font-medium mt-0.5"
  }, "Salvos")), /*#__PURE__*/React.createElement("button", {
    onClick: () => state.setActiveTab('items'),
    className: `flex flex-col items-center justify-center px-1 py-1 rounded-lg transition-all flex-1 ${state.activeTab === 'items' ? 'text-orange-600 bg-orange-50' : 'text-gray-600'}`
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-4 h-4",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[8px] font-medium mt-0.5"
  }, "Itens")), /*#__PURE__*/React.createElement("button", {
    onClick: () => state.setActiveTab('support'),
    className: `flex flex-col items-center justify-center px-1 py-1 rounded-lg transition-all flex-1 ${state.activeTab === 'support' ? 'text-orange-600 bg-orange-50' : 'text-gray-600'}`
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-4 h-4",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[8px] font-medium mt-0.5"
  }, "Apoio")), /*#__PURE__*/React.createElement("button", {
    onClick: () => state.setActiveTab('proposals'),
    className: `flex flex-col items-center justify-center px-1 py-1 rounded-lg transition-all flex-1 ${state.activeTab === 'proposals' ? 'text-orange-600 bg-orange-50' : 'text-gray-600'}`
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-4 h-4",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[8px] font-medium mt-0.5"
  }, "Propostas"))))))));
};

// Removido export default - já está em window.AppFull
})();
