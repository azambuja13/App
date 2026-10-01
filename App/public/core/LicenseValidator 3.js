/**
 * LicenseValidator.js - MIGRADO PARA INDEXEDDB
 * Sistema de validação de licenças
 *
 * MIGRADO PARA INDEXEDDB:
 * - Usa IndexedDBStorageService com fallback para localStorage
 * - Todos os métodos de storage agora são async
 *
 * ATUALIZADO PARA RAILWAY API:
 * - Backend: precificacao-api-production.up.railway.app
 * - Endpoint: PUT /api/auth/license (não POST /api/activate-license)
 */

// Usar configuração centralizada se disponível, senão usar Railway direto
const ACTIVATION_SERVER = window.APP_CONFIG?.backend?.baseURL || "https://precificacao-api-production.up.railway.app";

class LicenseValidator {
    /**
     * Inicializa o storage (IndexedDB ou localStorage)
     */
    static async init() {
        if (!this.storage) {
            if (window.indexedDBStorage) {
                this.storage = window.indexedDBStorage;
                console.log('✅ [LicenseValidator] Usando IndexedDB');
            } else {
                // Fallback: criar wrapper para localStorage
                this.storage = {
                    get: (key, defaultValue) => {
                        try {
                            const data = localStorage.getItem(key);
                            if (data === null) return Promise.resolve(defaultValue);
                            try {
                                return Promise.resolve(JSON.parse(data));
                            } catch {
                                return Promise.resolve(data);
                            }
                        } catch (error) {
                            console.error('Erro ao ler localStorage:', error);
                            return Promise.resolve(defaultValue);
                        }
                    },
                    set: (key, value) => {
                        try {
                            if (typeof value === 'string') {
                                localStorage.setItem(key, value);
                            } else {
                                localStorage.setItem(key, JSON.stringify(value));
                            }
                            return Promise.resolve();
                        } catch (error) {
                            console.error('Erro ao salvar localStorage:', error);
                            return Promise.reject(error);
                        }
                    },
                    remove: (key) => {
                        try {
                            localStorage.removeItem(key);
                            return Promise.resolve();
                        } catch (error) {
                            console.error('Erro ao remover localStorage:', error);
                            return Promise.reject(error);
                        }
                    }
                };
                console.warn('⚠️ [LicenseValidator] IndexedDB não disponível, usando localStorage');
            }
        }
        return this.storage;
    }
    /**
     * Valida formato da chave de licença
     * Formato esperado: CLIENTE-emailbase64-TYPE-20261231-hash
     * TYPE: OFF (Offline), STD (Standard), PRM (Premium)
     */
    static validateFormat(licenseKey) {
        if (!licenseKey || typeof licenseKey !== 'string') {
            return { valid: false, error: 'Chave de licença inválida' };
        }

        const parts = licenseKey.split('-');

        // Suportar tanto formato antigo (4 partes) quanto novo (5 partes)
        if (parts.length < 4) {
            return { valid: false, error: 'Formato de chave inválido' };
        }

        // Se tem 5 partes, validar tipo de licença
        if (parts.length >= 5) {
            const type = parts[2];
            const validTypes = ['OFF', 'STD', 'PRM'];
            if (!validTypes.includes(type)) {
                return { valid: false, error: 'Tipo de licença inválido' };
            }
        }

        return { valid: true };
    }

    /**
     * Extrai informações da licença
     * Suporta formato antigo (4 partes) e novo (5 partes com tipo)
     */
    static parseLicense(licenseKey) {
        try {
            const parts = licenseKey.split('-');
            if (parts.length < 4) {
                return null;
            }

            let clientName, emailBase64, licenseType, expiryDate, hash;

            // Detectar formato antigo (4 partes) vs novo (5 partes)
            if (parts.length === 4) {
                // Formato antigo: CLIENTE-emailbase64-YYYYMMDD-hash
                [clientName, emailBase64, expiryDate, hash] = parts;
                licenseType = 'STD'; // Assume Standard para licenças antigas
                console.log('📜 Licença formato antigo detectada (4 partes), assumindo STD');
            } else {
                // Formato novo: CLIENTE-emailbase64-TYPE-YYYYMMDD-hash
                [clientName, emailBase64, licenseType, expiryDate, hash] = parts;
                console.log('📜 Licença formato novo detectada (5 partes):', licenseType);
            }

            // Decodificar email
            let email = '';
            try {
                email = atob(emailBase64);
            } catch (e) {
                return null;
            }

            // Validar formato de email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return { valid: false, error: 'Formato de email inválido na licença' };
            }

            // Validar data de expiração
            const expiry = this.parseExpiryDate(expiryDate);
            if (!expiry) {
                return { valid: false, error: 'Data de expiração inválida' };
            }

            // Verificar se expirou
            if (new Date() > expiry) {
                return {
                    valid: false,
                    error: `Licença expirada em ${expiry.toLocaleDateString('pt-BR')}`
                };
            }

            return {
                valid: true,
                clientName: clientName.replace(/_/g, ' '),
                email,
                licenseType,
                expiryDate: expiry,
                hash
            };
        } catch (error) {
            console.error('Erro ao parsear licença:', error);
            return null;
        }
    }

    /**
     * Parse da data de expiração (formato YYYYMMDD)
     */
    static parseExpiryDate(dateStr) {
        try {
            if (dateStr.length !== 8) return null;

            const year = parseInt(dateStr.substring(0, 4));
            const month = parseInt(dateStr.substring(4, 6)) - 1; // Mês começa em 0
            const day = parseInt(dateStr.substring(6, 8));

            const date = new Date(year, month, day);
            if (isNaN(date.getTime())) return null;

            return date;
        } catch (error) {
            return null;
        }
    }

    /**
     * Valida hash da licença (validação local simplificada)
     */
    static validateHash(licenseData) {
        // TODO: Implementar validação criptográfica real
        // Por enquanto, apenas verificar se existe
        return licenseData.hash && licenseData.hash.length > 10;
    }

    /**
     * Valida licença com servidor (Railway API)
     * ATUALIZADO: Validação agora é feita via autenticação do usuário
     * A licença está vinculada ao usuário no banco de dados
     */
    static async validateWithServer(licenseKey) {
        try {
            // Verificar se usuário está autenticado
            const token = localStorage.getItem('accessToken');

            if (!token) {
                // Sem token = validação apenas local (modo offline)
                console.log('🔓 Validação offline - sem token');
                return { valid: true };
            }

            // Verificar licença via endpoint /api/auth/me
            const response = await fetch(`${ACTIVATION_SERVER}/api/auth/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                // Token inválido ou expirado = validação local
                console.log('⚠️ Token inválido, usando validação local');
                return { valid: true };
            }

            const result = await response.json();

            // Verificar se licença está ativa
            if (result.success && result.data) {
                const userData = result.data;

                // Verificar se usuário está ativo
                if (!userData.isActive) {
                    return {
                        valid: false,
                        error: '⛔ Conta desativada pelo administrador. Entre em contato com o suporte.'
                    };
                }

                // Verificar revogação (se campo existir)
                if (userData.revoked || userData.blocked) {
                    return {
                        valid: false,
                        error: '⛔ Licença revogada pelo administrador. Entre em contato com o suporte.'
                    };
                }

                return {
                    valid: true,
                    serverValidated: true,
                    isActive: userData.isActive
                };
            }

            // Dados inválidos do servidor
            return { valid: true };

        } catch (error) {
            console.warn('Servidor de ativação offline, continuando em modo local:', error);
            return {
                valid: true,
                serverValidated: false,
                offline: true
            };
        }
    }

    /**
     * Valida licença completa (formato + data + hash)
     */
    static async validateLicense(licenseKey) {
        // 1. Validar formato
        const formatCheck = this.validateFormat(licenseKey);
        if (!formatCheck.valid) {
            return formatCheck;
        }

        // 2. Parse e validações básicas
        const licenseData = this.parseLicense(licenseKey);
        if (!licenseData) {
            return {
                valid: false,
                error: 'Erro ao processar chave de licença'
            };
        }

        if (!licenseData.valid) {
            return licenseData;
        }

        // 3. Validar hash
        if (!this.validateHash(licenseData)) {
            return {
                valid: false,
                error: 'Chave de licença inválida ou adulterada'
            };
        }

        // 4. Validar com servidor (opcional)
        const serverCheck = await this.validateWithServer(licenseKey);
        if (!serverCheck.valid) {
            return serverCheck;
        }

        // Licença válida!
        return {
            valid: true,
            ...licenseData,
            ...serverCheck
        };
    }

    /**
     * Gera ID único do dispositivo
     */
    static async getDeviceId() {
        await this.init();
        let deviceId = await this.storage.get('device_id', null);

        if (!deviceId) {
            deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await this.storage.set('device_id', deviceId);
        }

        return deviceId;
    }

    /**
     * Salva licença válida no storage
     */
    static async saveLicense(licenseKey, licenseData) {
        try {
            await this.init();
            await this.storage.set('appLicenseKey', licenseKey);
            await this.storage.set('licenseExpiry', licenseData.expiryDate.toISOString());
            await this.storage.set('licensedTo', licenseData.clientName);
            await this.storage.set('licensedEmail', licenseData.email);
            await this.storage.set('licenseType', licenseData.licenseType || 'STD');

            // IMPORTANTE: Salvar licenseType também no localStorage para ConfigHelper.getCurrentPlan()
            // ConfigHelper lê do localStorage, não do IndexedDB
            localStorage.setItem('licenseType', licenseData.licenseType || 'STD');
            console.log('💾 Licença salva com tipo:', licenseData.licenseType || 'STD');

            // Limpar cache do ConfigHelper para forçar releitura do localStorage
            if (window.ConfigHelper) {
                window.ConfigHelper._cachedPlan = null;
                window.ConfigHelper._cacheTime = null;
                console.log('🔄 Cache do ConfigHelper limpo - próxima leitura será do localStorage');
            }

            return true;
        } catch (error) {
            console.error('Erro ao salvar licença:', error);
            return false;
        }
    }

    /**
     * Remove licença do storage
     */
    static async removeLicense() {
        await this.init();
        await this.storage.remove('appLicenseKey');
        await this.storage.remove('licenseExpiry');
        await this.storage.remove('licensedTo');
        await this.storage.remove('licensedEmail');
        await this.storage.remove('licenseType');
    }

    /**
     * Carrega licença salva
     */
    static async loadSavedLicense() {
        await this.init();
        const licenseKey = await this.storage.get('appLicenseKey', null);
        const expiryStr = await this.storage.get('licenseExpiry', null);
        const licensedTo = await this.storage.get('licensedTo', null);
        const licensedEmail = await this.storage.get('licensedEmail', null);
        const licenseType = await this.storage.get('licenseType', 'STD');

        if (!licenseKey) return null;

        return {
            licenseKey,
            expiryDate: expiryStr ? new Date(expiryStr) : null,
            licensedTo,
            licensedEmail,
            licenseType
        };
    }

    /**
     * Verifica se licença salva ainda é válida
     */
    static async checkSavedLicense() {
        const saved = await this.loadSavedLicense();
        if (!saved) return { valid: false };

        // Verificar se expirou
        if (saved.expiryDate && new Date() > saved.expiryDate) {
            await this.removeLicense();
            return {
                valid: false,
                error: `Licença expirada em ${saved.expiryDate.toLocaleDateString('pt-BR')}`
            };
        }

        return {
            valid: true,
            ...saved
        };
    }
}

// Expor no window para uso global
window.LicenseValidator = LicenseValidator;
