/**
 * ===================================================================
 * VALIDATORS - Funções de Validação
 * ===================================================================
 * Validações de dados, segurança, licenças e regras de negócio
 */

/**
 * Gera hash SHA-256
 * @param {string} message - Mensagem a ser hasheada
 * @returns {Promise<string>} Hash hexadecimal
 */
async function generateHash(message) {
    // Tenta usar Web Crypto API (requer HTTPS)
    if (window.crypto && window.crypto.subtle) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    // Fallback simples para desenvolvimento (NÃO SEGURO)
    console.warn('⚠️ Web Crypto API não disponível. Usando fallback simples.');
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
        const char = message.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

/**
 * Valida formato e autenticidade de licença
 * @param {string} licenseKey - Chave de licença
 * @returns {Promise<Object>} Resultado da validação
 */
export async function validateLicense(licenseKey) {
    try {
        // Formato esperado: CLIENTNAME-EMAILBASE64-YYYYMMDD-HASH
        const parts = licenseKey.split('-');

        if (parts.length < 4) {
            return {
                valid: false,
                error: 'Formato de licença inválido'
            };
        }

        const clientName = parts[0];
        const emailBase64 = parts[1];
        const expiryDate = parts[2];
        const providedHash = parts[3];

        // Decodifica email
        let email;
        try {
            email = atob(emailBase64);
        } catch (e) {
            return {
                valid: false,
                error: 'Email inválido na licença'
            };
        }

        // Valida formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return {
                valid: false,
                error: 'Formato de email inválido'
            };
        }

        // Verifica data de expiração
        const expiry = new Date(
            expiryDate.substring(0, 4),
            expiryDate.substring(4, 6) - 1,
            expiryDate.substring(6, 8)
        );

        if (expiry < new Date()) {
            return {
                valid: false,
                error: 'Licença expirada',
                expired: true
            };
        }

        // Valida hash
        const dataToHash = `${clientName}-${emailBase64}-${expiryDate}`;
        const computedHash = await generateHash(dataToHash);

        if (computedHash !== providedHash) {
            return {
                valid: false,
                error: 'Licença adulterada ou inválida'
            };
        }

        // Verifica revogação no servidor (se configurado)
        const ACTIVATION_SERVER = 'https://license-server-database.onrender.com';
        try {
            const response = await fetch(`${ACTIVATION_SERVER}/check-license`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ licenseKey })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.revoked) {
                    return {
                        valid: false,
                        error: 'Licença revogada',
                        revoked: true
                    };
                }
            }
        } catch (networkError) {
            // Ignora erros de rede - permite uso offline
            console.warn('⚠️ Não foi possível verificar revogação (offline)');
        }

        return {
            valid: true,
            clientName,
            email,
            expiryDate: expiry
        };

    } catch (error) {
        console.error('Erro ao validar licença:', error);
        return {
            valid: false,
            error: 'Erro ao validar licença'
        };
    }
}

/**
 * Valida senha do aplicativo
 * @param {string} password - Senha digitada
 * @param {string} correctPassword - Senha correta
 * @returns {Object} Resultado da validação
 */
export function validatePassword(password, correctPassword = '1234') {
    // Verifica tentativas anteriores
    const attempts = parseInt(localStorage.getItem('passwordAttempts') || '0');
    const lockoutTime = parseInt(localStorage.getItem('lockoutTime') || '0');

    // Verifica se está bloqueado
    if (lockoutTime > Date.now()) {
        const remainingMinutes = Math.ceil((lockoutTime - Date.now()) / 60000);
        return {
            valid: false,
            locked: true,
            remainingMinutes,
            error: `Bloqueado por ${remainingMinutes} minuto(s)`
        };
    }

    // Limpa bloqueio se expirou
    if (lockoutTime > 0 && lockoutTime <= Date.now()) {
        localStorage.removeItem('lockoutTime');
        localStorage.setItem('passwordAttempts', '0');
    }

    // Valida senha
    if (password === correctPassword) {
        localStorage.setItem('passwordAttempts', '0');
        localStorage.removeItem('lockoutTime');
        return {
            valid: true
        };
    }

    // Incrementa tentativas
    const newAttempts = attempts + 1;
    localStorage.setItem('passwordAttempts', newAttempts.toString());

    // Bloqueia após 3 tentativas
    if (newAttempts >= 3) {
        const lockUntil = Date.now() + (15 * 60 * 1000); // 15 minutos
        localStorage.setItem('lockoutTime', lockUntil.toString());
        return {
            valid: false,
            locked: true,
            remainingMinutes: 15,
            error: 'Bloqueado por 15 minutos'
        };
    }

    return {
        valid: false,
        attemptsRemaining: 3 - newAttempts,
        error: 'Senha incorreta'
    };
}

/**
 * Verifica compatibilidade do navegador
 * @returns {Object} Recursos suportados
 */
export function checkBrowserCompatibility() {
    const support = {
        localStorage: false,
        fetch: false,
        crypto: false,
        issues: []
    };

    // Verifica localStorage
    try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        support.localStorage = true;
    } catch (e) {
        support.issues.push('LocalStorage não suportado');
    }

    // Verifica Fetch API
    if (window.fetch) {
        support.fetch = true;
    } else {
        support.issues.push('Fetch API não suportado');
    }

    // Verifica Web Crypto API
    if (window.crypto && window.crypto.subtle) {
        support.crypto = true;
    } else {
        support.issues.push('Web Crypto API não suportado (requer HTTPS)');
    }

    return support;
}

/**
 * Valida nome de ingrediente (não vazio, sem duplicatas)
 * @param {string} name - Nome do ingrediente
 * @param {Array} existingIngredients - Lista de ingredientes existentes
 * @param {number} excludeId - ID para excluir da validação (ao editar)
 * @returns {Object} Resultado da validação
 */
export function validateIngredientName(name, existingIngredients, excludeId = null) {
    if (!name || name.trim() === '') {
        return {
            valid: false,
            error: 'Nome é obrigatório'
        };
    }

    const nameLower = name.toLowerCase().trim();
    const duplicate = existingIngredients.find(ing =>
        ing.id !== excludeId &&
        ing.name.toLowerCase().trim() === nameLower
    );

    if (duplicate) {
        return {
            valid: false,
            error: 'Já existe um ingrediente com este nome'
        };
    }

    return { valid: true };
}

/**
 * Valida se ingrediente pode ser excluído (não está em uso)
 * @param {number} ingredientId - ID do ingrediente
 * @param {Array} items - Lista de itens do evento
 * @returns {Object} Resultado da validação
 */
export function validateIngredientDeletion(ingredientId, items) {
    const inUse = items.some(item => item.ingredientId === ingredientId);

    if (inUse) {
        return {
            valid: false,
            error: 'Ingrediente está em uso no evento atual'
        };
    }

    return { valid: true };
}

/**
 * Valida dados do evento
 * @param {Object} eventData - Dados do evento
 * @returns {Object} Resultado da validação
 */
export function validateEventData(eventData) {
    const errors = [];

    if (!eventData.eventName || eventData.eventName.trim() === '') {
        errors.push('Nome do evento é obrigatório');
    }

    if (!eventData.guests || eventData.guests <= 0) {
        errors.push('Número de convidados deve ser maior que zero');
    }

    if (eventData.items && eventData.items.filter(item => item.active).length === 0) {
        errors.push('Adicione pelo menos um item ao evento');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
