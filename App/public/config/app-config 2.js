/**
 * CONFIGURAÇÃO CENTRAL DA APLICAÇÃO
 *
 * Este arquivo controla o comportamento da aplicação através de feature flags.
 * Existem 2 builds diferentes:
 * - 'OFFLINE': Versão standalone com IndexedDB (sem backend, máquina única)
 * - 'ONLINE': Versão com backend PostgreSQL + IndexedDB, multi-dispositivo e proposta em PDF
 *
 * PREMIUM não é um build separado - é controlado por licença/subscription
 * dentro da versão ONLINE através do sistema de autenticação.
 */

// ============================================================================
// CONFIGURAÇÃO PRINCIPAL
// ============================================================================

const APP_CONFIG = {
    // Modo da aplicação: 'OFFLINE' ou 'ONLINE'
    // Este valor é substituído automaticamente durante o build
    mode: 'ONLINE', // Será: 'OFFLINE' ou 'ONLINE'

    // Versão da aplicação
    version: '1.0.18',

    // Features disponíveis baseadas no modo
    features: {
        // Backend API (PostgreSQL + Render)
        backend: 'true', // true para ONLINE, false para OFFLINE

        // Sistema de licenças e autenticação
        license: 'true', // true para todas as versões

        // Auto-refresh periódico (sincronização multi-device)
        autoRefresh: 'true', // true para ONLINE, false para OFFLINE

        // Suporte multi-dispositivo
        multiDevice: 'true', // true para ONLINE, false para OFFLINE

        // Fallback para localStorage quando offline
        offlineFallback: 'true', // true para ONLINE, false para OFFLINE

        // Geração de proposta comercial em PDF
        proposalGeneration: 'true', // false para OFFLINE, true para ONLINE

        // Restrição de máquina única
        singleMachine: 'false', // true para OFFLINE, false para ONLINE

        // Features premium (controladas por licença/subscription no código)
        // Habilitadas no build ONLINE, mas restritas por verificação de licença
        premiumFeatures: 'true', // Sempre true no build ONLINE
    },

    // Configurações específicas do backend (apenas para CLOUD)
    backend: {
        // Auto-detectar ambiente baseado na URL do frontend
        get baseURL() {
            if (typeof window === 'undefined') {
                return 'https://precificacao-api-production.up.railway.app';
            }

            const hostname = window.location.hostname;

            // STAGING: Se URL contém "staging" ou é localhost
            if (hostname.includes('staging') || hostname.includes('localhost')) {
                return 'https://precificacao-api-staging.up.railway.app';
            }

            // PRODUCTION: Padrão
            return 'https://precificacao-api-production.up.railway.app';
        },
        timeout: 30000,
        retryAttempts: 3
    },

    // Detectar se é ambiente de produção
    get isProduction() {
        if (typeof window === 'undefined') return true;
        const hostname = window.location.hostname;
        return !hostname.includes('staging') && !hostname.includes('localhost');
    },

    // Configurações de armazenamento local
    storage: {
        eventStorageKey: 'eventos-salvos',
        ingredientStorageKey: 'ingredientes-database',
        expenseStorageKey: 'despesas-fixas',
        backupSuffix: '-backup' // Para cache offline na versão CLOUD
    },

    // Configurações de UI
    ui: {
        autoRefreshInterval: 5000, // ms - apenas para versão CLOUD
        showDebugLogs: false, // true para desenvolvimento
        showModeIndicator: true // Mostra badge "OFFLINE" ou "CLOUD"
    }
};

// ============================================================================
// HELPERS
// ============================================================================

const ConfigHelper = {
    /**
     * Verifica se é versão offline
     */
    isOfflineMode() {
        return APP_CONFIG.mode === 'OFFLINE';
    },

    /**
     * Verifica se é versão online (standard)
     */
    isOnlineMode() {
        // WORKAROUND: Se modo não foi substituído pelo build, detectar pelo hostname
        if (APP_CONFIG.mode === 'ONLINE' || APP_CONFIG.mode === 'ONLINE') {
            // Se estiver em railway.app, é versão ONLINE
            if (typeof window !== 'undefined' && window.location.hostname.includes('railway.app')) {
                return true;
            }
            return APP_CONFIG.mode === 'ONLINE';
        }
        return APP_CONFIG.mode === 'ONLINE';
    },

    /**
     * Verifica se é versão premium
     */
    isPremiumMode() {
        // WORKAROUND: Detectar premium pela licença do usuário
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            const licenseKey = localStorage.getItem('appLicenseKey');
            if (licenseKey && licenseKey.includes('-PRM-')) {
                return true;
            }
        }
        return APP_CONFIG.mode === 'PREMIUM';
    },

    /**
     * Verifica se é qualquer versão online (ONLINE ou PREMIUM)
     */
    isCloudMode() {
        // WORKAROUND: Se estiver em railway.app OU tiver licença PRM/STD, é cloud mode
        if (typeof window !== 'undefined') {
            if (window.location.hostname.includes('railway.app')) {
                return true;
            }
            if (typeof localStorage !== 'undefined') {
                const licenseKey = localStorage.getItem('appLicenseKey');
                if (licenseKey && (licenseKey.includes('-PRM-') || licenseKey.includes('-STD-'))) {
                    return true;
                }
            }
        }
        return this.isOnlineMode() || this.isPremiumMode();
    },

    /**
     * Verifica se uma feature está habilitada
     */
    hasFeature(featureName) {
        return APP_CONFIG.features[featureName] === true ||
               APP_CONFIG.features[featureName] === 'true';
    },

    /**
     * Verifica se pode gerar proposta
     */
    canGenerateProposal() {
        return this.hasFeature('proposalGeneration');
    },

    /**
     * Verifica se é restrito a uma máquina
     * IMPORTANTE: Apenas licença OFF (offline) é restrita a uma máquina
     * STD e PRM são multi-dispositivo
     */
    isSingleMachine() {
        const currentPlan = this.getCurrentPlan();
        return currentPlan === 'offline';
    },

    /**
     * Retorna configuração do backend
     */
    getBackendConfig() {
        if (!this.isCloudMode()) {
            throw new Error('Backend config only available in ONLINE/PREMIUM mode');
        }
        return APP_CONFIG.backend;
    },

    /**
     * Retorna configuração de storage
     */
    getStorageConfig() {
        return APP_CONFIG.storage;
    },

    /**
     * Retorna texto de modo para exibição
     * PREMIUM é detectado por licença/subscription, não por modo de build
     */
    getModeLabel() {
        const plan = this.getCurrentPlan();

        const labels = {
            'offline': '💾 Offline',
            'standard': '☁️ Standard',
            'premium': '⭐ Premium'
        };

        return labels[plan] || '💾 Offline';
    },

    /**
     * Retorna descrição completa da versão
     */
    getModeDescription() {
        const plan = this.getCurrentPlan();

        const descriptions = {
            'offline': 'Versão Offline - Armazenamento local + Máquina única',
            'standard': 'Versão Standard - Banco de dados + Multi-dispositivo + Proposta em PDF',
            'premium': 'Versão Premium - Todas as features + Analytics + Relatórios Financeiros'
        };

        return descriptions[plan] || descriptions['offline'];
    },

    /**
     * Verifica se usuário tem acesso premium (por licença/subscription)
     * TODO: Implementar verificação real de licença/subscription
     */
    hasPremiumAccess() {
        // Por enquanto, retorna true se tiver premiumFeatures habilitadas
        // No futuro, verificar licença do usuário no backend
        return this.hasFeature('premiumFeatures');
    },

    /**
     * Retorna o plano atual do usuário
     * @returns {string} 'offline', 'standard', ou 'premium'
     */
    getCurrentPlan() {
        // Cache para evitar múltiplas leituras do localStorage
        if (this._cachedPlan && this._cacheTime && (Date.now() - this._cacheTime < 5000)) {
            return this._cachedPlan;
        }

        let plan = 'offline';

        // SEMPRE verificar localStorage primeiro (para testes e uso real)
        try {
            // 1. Verificar licenseType salvo pelo LicenseValidator
            const licenseType = localStorage.getItem('licenseType');

            if (licenseType) {
                // Converter código de licença para nome do plano
                const typeMap = {
                    'OFF': 'offline',
                    'STD': 'standard',
                    'PRM': 'premium'
                };
                plan = typeMap[licenseType] || 'offline';
                console.log('📊 [Config] Plano detectado da licença:', plan, '(' + licenseType + ')');
            } else {
                // 2. Fallback: verificar formato antigo (user_license)
                const licenseData = localStorage.getItem('user_license');

                if (licenseData) {
                    const license = JSON.parse(licenseData);
                    plan = license.type ? license.type.toLowerCase() : 'offline';
                    console.log('📊 [Config] Plano detectado (formato antigo):', plan);
                }
            }
        } catch (error) {
            console.error('Erro ao verificar licença:', error);
        }

        // Fallback: Se for modo offline do build
        if (!plan || plan === 'offline') {
            if (this.isOfflineMode()) {
                plan = 'offline';
            } else if (this.isOnlineMode()) {
                plan = 'standard';
            }
        }

        // Cachear resultado por 5 segundos
        this._cachedPlan = plan;
        this._cacheTime = Date.now();

        return plan;
    },

    /**
     * Verifica se o usuário tem acesso a uma feature específica
     * @param {string} featureName - Nome da feature a verificar
     * @returns {boolean} true se tem acesso, false caso contrário
     */
    hasFeatureAccess(featureName) {
        const currentPlan = this.getCurrentPlan();

        // Mapa de features por plano
        const featureAccess = {
            // Features do OFFLINE (R$ 19.90/mês)
            offline: [
                'basicCalculation',
                'indexedDB', // IndexedDB local (melhor que localStorage)
                'singleEvent',
                'basicIngredients',
                'dishes' // Cadastro de pratos liberado para todos
            ],

            // Features do STANDARD (R$ 49.90/mês)
            standard: [
                'basicCalculation',
                'indexedDB', // IndexedDB + PostgreSQL
                'singleEvent',
                'basicIngredients',
                'cloudStorage',
                'multiDevice',
                'pdfExport', // 1 PDF por evento
                'cloudSync',
                'dishes' // Cadastro de pratos liberado para todos
            ],

            // Features do PREMIUM (R$ 69.90/mês)
            premium: [
                'basicCalculation',
                'indexedDB', // IndexedDB + PostgreSQL
                'singleEvent',
                'basicIngredients',
                'cloudStorage',
                'multiDevice',
                'pdfExport',
                'cloudSync',
                'dishes', // Cadastro de pratos liberado para todos
                'multipleProposals', // Múltiplas propostas por evento - EXCLUSIVO PREMIUM
                'analytics', // Dashboard com analytics - EXCLUSIVO PREMIUM
                'financialReports', // Relatórios financeiros - EXCLUSIVO PREMIUM
                'advancedIngredients', // Ingredientes personalizados - EXCLUSIVO PREMIUM
                'proposalComparison', // Comparação de propostas - EXCLUSIVO PREMIUM
                'prioritySupport' // Suporte prioritário - EXCLUSIVO PREMIUM
            ]
        };

        // Verificar se a feature está no plano atual
        const planFeatures = featureAccess[currentPlan] || [];
        return planFeatures.includes(featureName);
    },

    /**
     * Retorna lista de features bloqueadas para o plano atual
     * @returns {Array} Array de features bloqueadas
     */
    getBlockedFeatures() {
        const currentPlan = this.getCurrentPlan();
        const allPremiumFeatures = [
            'dishes',
            'multipleProposals',
            'analytics',
            'financialReports',
            'advancedIngredients',
            'proposalComparison',
            'prioritySupport'
        ];

        return allPremiumFeatures.filter(feature => !this.hasFeatureAccess(feature));
    },

    /**
     * Retorna o próximo plano sugerido para upgrade
     * @returns {string|null} 'standard' ou 'premium', ou null se já está no premium
     */
    getSuggestedUpgradePlan() {
        const currentPlan = this.getCurrentPlan();

        if (currentPlan === 'offline') return 'standard';
        if (currentPlan === 'standard') return 'premium';
        return null; // Já está no premium
    },

    /**
     * Dispara evento de mudança de plano
     * @param {string} newPlan - Novo plano ativado
     */
    setPlan(newPlan) {
        // Atualizar no localStorage
        try {
            const licenseData = {
                type: newPlan.toUpperCase(),
                activatedAt: new Date().toISOString(),
                status: 'active'
            };
            localStorage.setItem('user_license', JSON.stringify(licenseData));

            // Disparar evento customizado
            const event = new CustomEvent('plan-changed', {
                detail: { plan: newPlan }
            });
            window.dispatchEvent(event);

            this.log('Plano alterado para:', newPlan);
        } catch (error) {
            console.error('Erro ao atualizar plano:', error);
        }
    },

    /**
     * Retorna informações sobre uma feature específica
     * @param {string} featureName - Nome da feature
     * @returns {Object} Informações da feature
     */
    getFeatureInfo(featureName) {
        const featureDetails = {
            dishes: {
                name: 'Cadastro de Pratos',
                description: 'Crie e gerencie pratos reutilizáveis com ingredientes',
                icon: '🍽️',
                requiredPlan: 'premium'
            },
            multipleProposals: {
                name: 'Múltiplas Propostas',
                description: 'Crie várias propostas para o mesmo evento',
                icon: '📋',
                requiredPlan: 'premium'
            },
            analytics: {
                name: 'Analytics',
                description: 'Dashboard com métricas e análises avançadas',
                icon: '📈',
                requiredPlan: 'premium'
            },
            pdfExport: {
                name: 'Exportação PDF',
                description: 'Gere propostas profissionais em PDF',
                icon: '📄',
                requiredPlan: 'standard'
            },
            cloudSync: {
                name: 'Sincronização na Nuvem',
                description: 'Acesse seus dados de qualquer dispositivo',
                icon: '☁️',
                requiredPlan: 'standard'
            }
        };

        return featureDetails[featureName] || {
            name: featureName,
            description: 'Feature description not available',
            icon: '🔧',
            requiredPlan: 'premium'
        };
    },

    /**
     * Log condicional (apenas se debug habilitado)
     */
    log(...args) {
        if (APP_CONFIG.ui.showDebugLogs) {
            console.log('[APP_CONFIG]', ...args);
        }
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.APP_CONFIG = APP_CONFIG;
    window.ConfigHelper = ConfigHelper;
}

// Log de inicialização
console.log(`🚀 Aplicação inicializada em modo: ${APP_CONFIG.mode}`);
console.log(`📦 Versão: ${APP_CONFIG.version}`);
console.log(`⚙️  Features:`, APP_CONFIG.features);

// ============================================================================
// COMPATIBILIDADE: Expor getCurrentPlan globalmente para imports dinâmicos
// ============================================================================
// Nota: Não podemos usar ES6 export porque o arquivo é carregado via <script>
// Solução: Expor via window para módulos que usam import dinâmico

if (typeof window !== 'undefined') {
    // Criar namespace para exports simulados
    window.__APP_CONFIG_EXPORTS__ = {
        getCurrentPlan: () => ConfigHelper.getCurrentPlan()
    };
}
