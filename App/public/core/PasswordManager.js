/**
 * PasswordManager.js - MIGRADO PARA INDEXEDDB
 * Sistema de proteção com senha e controle de tentativas
 *
 * MIGRADO PARA INDEXEDDB:
 * - Usa IndexedDBStorageService com fallback para localStorage
 * - Todos os métodos agora são async
 */

const MAX_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 15;

class PasswordManager {
    /**
     * Inicializa o storage (IndexedDB ou localStorage)
     */
    static async init() {
        if (!this.storage) {
            if (window.indexedDBStorage) {
                this.storage = window.indexedDBStorage;
                console.log('✅ [PasswordManager] Usando IndexedDB');
            } else {
                // Fallback: criar wrapper para localStorage
                this.storage = {
                    get: (key, defaultValue) => {
                        try {
                            const data = localStorage.getItem(key);
                            if (data === null) return Promise.resolve(defaultValue);
                            // Para valores simples (strings, booleans)
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
                console.warn('⚠️ [PasswordManager] IndexedDB não disponível, usando localStorage');
            }
        }
        return this.storage;
    }

    /**
     * Verifica se senha está configurada para a licença atual
     * Senha é vinculada à licença para evitar conflitos entre diferentes licenças
     */
    static async isPasswordSet() {
        await this.init();

        // Verificar se tem senha configurada
        const value = await this.storage.get('passwordSet', 'false');
        if (value !== 'true' && value !== true) {
            return false;
        }

        // Verificar se a senha é para a licença atual
        const currentLicenseKey = await this.storage.get('appLicenseKey', null);
        const passwordLicenseKey = await this.storage.get('password_license_key', null);

        // Se não tem licença, senha está configurada
        if (!currentLicenseKey) {
            return true;
        }

        // Se senha não tem licença associada (legado), associar à licença atual
        if (!passwordLicenseKey) {
            await this.storage.set('password_license_key', currentLicenseKey);
            console.log('🔗 Senha associada à licença atual');
            return true;
        }

        // Verificar se senha é para a licença atual
        if (passwordLicenseKey === currentLicenseKey) {
            return true;
        }

        // Senha é de outra licença - resetar senha
        console.log('⚠️ Senha é de outra licença - resetando...');
        await this.clearPasswordForLicenseChange();
        return false;
    }

    /**
     * Limpa senha quando a licença muda
     * @private
     */
    static async clearPasswordForLicenseChange() {
        await this.init();
        await this.storage.remove('appPassword');
        await this.storage.remove('passwordSet');
        await this.storage.remove('passwordAttempts');
        await this.storage.remove('lockoutTime');
        await this.storage.remove('password_license_key');
        console.log('🔓 Senha removida (mudança de licença)');
    }

    /**
     * Credencial para entrar sem internet (out/2026): guarda só um hash PBKDF2 da senha
     * (nunca a senha), o e-mail e a chave da conta do último login com internet neste aparelho.
     */
    static async _hashPassword(identifier, password, saltB64) {
        const enc = new TextEncoder();
        const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
        const key = await crypto.subtle.importKey('raw', enc.encode(String(identifier).toLowerCase().trim() + '\u0000' + password), 'PBKDF2', false, ['deriveBits']);
        const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, key, 256);
        return btoa(String.fromCharCode(...new Uint8Array(bits)));
    }

    static async saveOfflineCredential(identifier, password, user = null) {
        try {
            if (!identifier || !password || !(window.crypto && crypto.subtle)) return;
            const salt = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
            const hash = await this._hashPassword(identifier, password, salt);
            const ids = [String(identifier).toLowerCase().trim()];
            if (user && user.email) ids.push(String(user.email).toLowerCase().trim());
            localStorage.setItem('offline_credential', JSON.stringify({
                ids, salt, hash, user: user ? { licenseKey: user.licenseKey || null, email: user.email || null, id: user.id || null } : null, at: Date.now()
            }));
            // Senha em texto não fica mais guardada no aparelho
            await this.init();
            try { await this.storage.remove('appPassword'); } catch (e) {}
        } catch (e) {
            console.warn('⚠️ Não foi possível guardar o acesso offline:', e && e.message);
        }
    }

    static async checkOfflineCredential(identifier, password) {
        try {
            const c = JSON.parse(localStorage.getItem('offline_credential') || 'null');
            if (!c || !c.salt || !c.hash || !Array.isArray(c.ids)) return null;
            const id = String(identifier || '').toLowerCase().trim();
            if (!c.ids.includes(id) && !(c.user && c.user.licenseKey === identifier)) return null;
            const hash = await this._hashPassword(c.ids[0], password, c.salt);
            return hash === c.hash ? { user: c.user || null } : false;
        } catch (e) {
            return null;
        }
    }

    /**
     * Retorna a senha salva
     */
    static async getStoredPassword() {
        await this.init();
        return await this.storage.get('appPassword', '');
    }

    /**
     * Verifica se app está bloqueado
     */
    static async isLocked() {
        const lockoutTime = await this.getLockoutTime();
        if (!lockoutTime) return false;

        const now = new Date();
        const diffMinutes = (now - lockoutTime) / 1000 / 60;

        if (diffMinutes >= LOCKOUT_MINUTES) {
            // Tempo de bloqueio expirou
            await this.clearLockout();
            return false;
        }

        return true;
    }

    /**
     * Retorna minutos restantes de bloqueio
     */
    static async getMinutesRemaining() {
        const lockoutTime = await this.getLockoutTime();
        if (!lockoutTime) return 0;

        const now = new Date();
        const diffMinutes = (now - lockoutTime) / 1000 / 60;
        const remaining = Math.ceil(LOCKOUT_MINUTES - diffMinutes);

        return Math.max(0, remaining);
    }

    /**
     * Verifica senha SEMPRE consultando a API
     * IMPORTANTE: NUNCA validar apenas localmente - sempre verificar na base de dados
     */
    static async checkPassword(password, identifierOverride = null) {
        // Verificar se está bloqueado
        if (await this.isLocked()) {
            return {
                success: false,
                locked: true,
                message: `⚠️ App bloqueado por ${await this.getMinutesRemaining()} minutos`,
                minutesRemaining: await this.getMinutesRemaining()
            };
        }

        // Identificador: por padrão o e-mail/licenseKey explícito (ex: digitado na
        // tela de login); se não vier, cai para a licença já salva neste dispositivo
        await this.init();
        const currentLicenseKey = identifierOverride || (await this.storage.get('appLicenseKey', null));

        if (!currentLicenseKey) {
            return {
                success: false,
                locked: false,
                message: 'Nenhuma conta ativa'
            };
        }

        // IMPORTANTE: Validar senha na API
        console.log('🔐 Validando senha na API para:', currentLicenseKey.substring(0, 30) + '...');

        try {
            // Chamar endpoint de verificação de senha
            const API_URL = window.APP_CONFIG?.backend?.baseURL || 'https://precificacao-api-production.up.railway.app';
            const response = await fetch(`${API_URL}/api/auth/verify-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    licenseKey: currentLicenseKey,
                    password: password
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Senha correta - limpar tentativas
                await this.clearAttempts();

                // Atualizar vinculação da senha à licença (sempre a chave REAL
                // devolvida pela API, não o identificador usado pra buscar — que
                // pode ter sido um e-mail)
                const realLicenseKey = result.data?.user?.licenseKey || currentLicenseKey;
                await this.storage.set('password_license_key', realLicenseKey);
                await this.storage.set('passwordSet', 'true');

                console.log('✅ Senha validada com sucesso na API');
                await this.saveOfflineCredential(currentLicenseKey, password, result.data?.user || null);

                // PASSO 2: Fazer login automático para obter accessToken (JWT)
                // Isso permite sincronização multi-dispositivo via API REST
                try {
                    console.log('🔐 Fazendo login automático para sincronização...');

                    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            licenseKey: currentLicenseKey,
                            password: password
                        })
                    });

                    const loginResult = await loginResponse.json();

                    if (loginResponse.ok && loginResult.success && loginResult.data?.accessToken) {
                        // Salvar tokens para sincronização
                        localStorage.setItem('accessToken', loginResult.data.accessToken);
                        localStorage.setItem('refreshToken', loginResult.data.refreshToken);
                        console.log('✅ AccessToken obtido - sincronização multi-dispositivo habilitada');
                    } else {
                        console.warn('⚠️ Não foi possível obter accessToken, sincronização desabilitada');
                    }
                } catch (loginError) {
                    console.warn('⚠️ Erro ao fazer login automático:', loginError.message);
                }

                return {
                    success: true,
                    message: '✅ Senha correta!',
                    user: result.data?.user
                };
            } else {
                // Senha incorreta ou erro - incrementar tentativas
                const attempts = await this.incrementAttempts();
                const attemptsRemaining = MAX_ATTEMPTS - attempts;

                if (attemptsRemaining <= 0) {
                    // Máximo de tentativas atingido - bloquear
                    await this.lockApp();
                    return {
                        success: false,
                        locked: true,
                        maxAttemptsReached: true,
                        message: '❌ Máximo de tentativas excedido! App bloqueado por 15 minutos.',
                        minutesRemaining: LOCKOUT_MINUTES
                    };
                }

                console.error('❌ Senha incorreta (API):', result.message);

                return {
                    success: false,
                    locked: false,
                    attemptsRemaining,
                    message: `❌ Senha incorreta! ${attemptsRemaining} tentativa(s) restante(s).`
                };
            }
        } catch (error) {
            console.error('❌ Erro ao validar senha na API:', error);

            // Sem internet: entra com o último acesso feito neste aparelho (hash da senha)
            const isNetwork = !(error && error.statusCode) && (error && (error.name === 'TypeError' || /Failed to fetch|Load failed|NetworkError|network connection/i.test(String(error.message || ''))));
            if (isNetwork) {
                const off = await this.checkOfflineCredential(currentLicenseKey, password);
                if (off && off !== false) {
                    console.warn('📴 Entrando sem internet com o último acesso deste aparelho');
                    if (window.OfflineCache) window.OfflineCache.setOffline(true);
                    return { success: true, offline: true, message: '✅ Entrou sem internet (dados salvos neste aparelho)', user: off.user };
                }
                if (off === false) {
                    const attempts = await this.incrementAttempts();
                    return { success: false, locked: false, attemptsRemaining: MAX_ATTEMPTS - attempts, message: '❌ Senha incorreta! (sem internet)' };
                }
                return { success: false, locked: false, message: '📴 Sem internet. Para entrar sem internet, faça login uma vez com internet neste aparelho.' };
            }

            // Em caso de erro de rede, permitir fallback local SOMENTE em modo offline
            if (window.APP_CONFIG?.mode === 'offline') {
                console.warn('⚠️ Modo offline - usando validação local (fallback)');
                return await this.checkPasswordLocal(password);
            }

            return {
                success: false,
                locked: false,
                message: '❌ Erro ao conectar com servidor. Verifique sua conexão.'
            };
        }
    }

    /**
     * Validação local (fallback apenas para modo offline)
     * @private
     */
    static async checkPasswordLocal(password) {
        const storedPassword = await this.getStoredPassword();
        if (!storedPassword) {
            return {
                success: false,
                locked: false,
                message: 'Senha não configurada'
            };
        }

        if (password === storedPassword) {
            await this.clearAttempts();
            return {
                success: true,
                message: '✅ Senha correta! (validação local)'
            };
        }

        const attempts = await this.incrementAttempts();
        const attemptsRemaining = MAX_ATTEMPTS - attempts;

        if (attemptsRemaining <= 0) {
            await this.lockApp();
            return {
                success: false,
                locked: true,
                maxAttemptsReached: true,
                message: '❌ Máximo de tentativas excedido! App bloqueado por 15 minutos.',
                minutesRemaining: LOCKOUT_MINUTES
            };
        }

        return {
            success: false,
            locked: false,
            attemptsRemaining,
            message: `❌ Senha incorreta! ${attemptsRemaining} tentativa(s) restante(s).`
        };
    }

    /**
     * Retorna número de tentativas falhas
     */
    static async getAttempts() {
        await this.init();
        const attempts = await this.storage.get('passwordAttempts', 0);
        return typeof attempts === 'number' ? attempts : parseInt(attempts) || 0;
    }

    /**
     * Incrementa contador de tentativas
     */
    static async incrementAttempts() {
        await this.init();
        const current = await this.getAttempts();
        const newAttempts = current + 1;
        await this.storage.set('passwordAttempts', newAttempts);
        return newAttempts;
    }

    /**
     * Limpa contador de tentativas
     */
    static async clearAttempts() {
        await this.init();
        await this.storage.remove('passwordAttempts');
    }

    /**
     * Retorna data/hora de bloqueio
     */
    static async getLockoutTime() {
        await this.init();
        const lockoutStr = await this.storage.get('lockoutTime', null);
        if (!lockoutStr) return null;

        try {
            return new Date(lockoutStr);
        } catch (error) {
            return null;
        }
    }

    /**
     * Bloqueia app por 15 minutos
     */
    static async lockApp() {
        await this.init();
        const now = new Date();
        await this.storage.set('lockoutTime', now.toISOString());
    }

    /**
     * Limpa bloqueio
     */
    static async clearLockout() {
        await this.init();
        await this.storage.remove('lockoutTime');
        await this.storage.remove('passwordAttempts');
    }

    /**
     * Inicializa verificação de bloqueio
     * Deve ser chamado ao carregar a aplicação
     */
    static async initialize() {
        const lockoutTime = await this.getLockoutTime();
        if (!lockoutTime) return;

        const now = new Date();
        const diffMinutes = (now - lockoutTime) / 1000 / 60;

        if (diffMinutes >= LOCKOUT_MINUTES) {
            // Bloqueio expirou
            await this.clearLockout();
        }
    }

    /**
     * Altera senha (requer senha atual)
     */
    static async changePassword(currentPassword, newPassword) {
        const storedPassword = await this.getStoredPassword();

        if (currentPassword !== storedPassword) {
            return {
                success: false,
                message: 'Senha atual incorreta'
            };
        }

        if (!newPassword || newPassword.length < 4) {
            return {
                success: false,
                message: 'Nova senha deve ter no mínimo 4 caracteres'
            };
        }

        try {
            await this.init();
            await this.storage.set('appPassword', newPassword);
            return {
                success: true,
                message: '✅ Senha alterada com sucesso!'
            };
        } catch (error) {
            return {
                success: false,
                message: 'Erro ao salvar nova senha'
            };
        }
    }

    /**
     * Retorna informações de estado
     */
    static async getStatus() {
        return {
            isLocked: await this.isLocked(),
            attempts: await this.getAttempts(),
            attemptsRemaining: MAX_ATTEMPTS - await this.getAttempts(),
            minutesRemaining: await this.getMinutesRemaining(),
            lockoutTime: await this.getLockoutTime()
        };
    }
}

// Expor no window para uso global
window.PasswordManager = PasswordManager;
