// ========================================
// session-auth.js
// Gerenciamento de Autenticação por Sessão
// ========================================

(async function() {
    console.log('🔐 Sistema de Autenticação por Sessão iniciado');

    // Helper para ler do storage (IndexedDB com fallback para localStorage)
    async function getStorageValue(key, defaultValue = null) {
        try {
            // Tentar IndexedDB primeiro
            if (window.indexedDBStorage) {
                const value = await window.indexedDBStorage.get(key, defaultValue);
                console.log(`📦 IndexedDB: ${key} =`, value);
                return value;
            }
        } catch (error) {
            console.warn(`⚠️ Erro ao ler ${key} do IndexedDB:`, error);
        }

        // Fallback para localStorage
        const localValue = localStorage.getItem(key);
        console.log(`💾 localStorage: ${key} =`, localValue);
        return localValue !== null ? localValue : defaultValue;
    }

    // Verificar se acabou de autenticar (permite um reload)
    const justAuthenticated = sessionStorage.getItem('justAuthenticated') === 'true';

    if (justAuthenticated) {
        console.log('✅ Reload após autenticação - permitindo acesso');

        // Garantir que authenticated está setado
        sessionStorage.setItem('authenticated', 'true');

        // IMPORTANTE: Sinalizar para o React pular a tela de licença
        // Isso faz o React iniciar com showLicenseActivation = false
        sessionStorage.setItem('skipLicenseScreen', 'true');
        console.log('🚫 Flag skipLicenseScreen ativada - React não vai renderizar tela de licença');

        // IMPORTANTE: Verificar se a licença está no storage
        const hasLicenseInStorage = await getStorageValue('appLicenseKey');

        if (!hasLicenseInStorage) {
            console.log('⚠️ Licença não encontrada no storage - possível problema no fluxo');
        } else {
            console.log('✅ Licença confirmada no storage');
        }

        // Limpar flags após carregamento completo
        window.addEventListener('load', function() {
            setTimeout(function() {
                console.log('🧹 Limpando flags de autenticação');
                sessionStorage.removeItem('justAuthenticated');
                sessionStorage.removeItem('skipLicenseScreen');
                console.log('✅ Flags limpas');
            }, 500); // Tempo suficiente para React inicializar
        });

        return;
    }

    // Verificar se há licença válida no storage
    const currentLicenseKey = await getStorageValue('appLicenseKey', null);
    const passwordSet = (await getStorageValue('passwordSet', 'false')) === 'true';
    const passwordLicenseKey = await getStorageValue('password_license_key', null);
    const sessionAuthenticated = sessionStorage.getItem('authenticated') === 'true';

    // IMPORTANTE: NUNCA autenticar automaticamente!
    // Sempre pedir senha, mesmo se a senha está vinculada à licença
    // A autenticação só deve acontecer via handleActivateLicenseWithPassword

    // Remover qualquer autenticação automática anterior
    if (!sessionAuthenticated) {
        console.log('🔐 Autenticação necessária - usuário precisa fazer login');
        sessionStorage.removeItem('authenticated');
        sessionStorage.removeItem('skipLicenseScreen');
    }

    // Se chegou aqui, não há licença válida ou a senha é de outra licença
    console.log('🔄 Sem licença válida ou senha incompatível - limpando autenticação');
    sessionStorage.removeItem('authenticated');

    // Verificar se senha é válida para a licença atual
    let isPasswordValidForLicense = false;
    if (passwordSet) {
        if (!currentLicenseKey) {
            // Sem licença, senha é válida
            isPasswordValidForLicense = true;
        } else if (!passwordLicenseKey) {
            // Senha sem associação (legado), assumir válida
            isPasswordValidForLicense = true;
        } else if (passwordLicenseKey === currentLicenseKey) {
            // Senha pertence à licença atual
            isPasswordValidForLicense = true;
        } else {
            // Senha é de outra licença - ignorar
            console.log('⚠️ Senha é de outra licença - será pedida nova senha');
            isPasswordValidForLicense = false;
        }
    }

    if (isPasswordValidForLicense && !sessionAuthenticated) {
        console.log('⚠️ Senha configurada mas não autenticado - forçando login');

        // Esconder licença temporariamente até validar senha (ler do storage)
        const savedLicense = await getStorageValue('appLicenseKey', null);
        const savedLicensedTo = await getStorageValue('licensedTo', null);
        const savedLicenseExpiry = await getStorageValue('licenseExpiry', null);
        const savedLicensedEmail = await getStorageValue('licensedEmail', null);

        if (savedLicense) {
            // Guardar no sessionStorage temporariamente
            sessionStorage.setItem('temp_license', savedLicense);
            sessionStorage.setItem('temp_licensedTo', savedLicensedTo || '');
            sessionStorage.setItem('temp_licenseExpiry', savedLicenseExpiry || '');
            sessionStorage.setItem('temp_licensedEmail', savedLicensedEmail || '');

            // Remover do localStorage temporariamente para forçar tela de login
            // NOTA: Ainda removemos do localStorage para compatibilidade,
            // mas o IndexedDB continuará com os dados
            localStorage.removeItem('appLicenseKey');
            localStorage.removeItem('licensedTo');
            localStorage.removeItem('licenseExpiry');
            localStorage.removeItem('licensedEmail');

            console.log('🔒 Licença escondida - tela de login será exibida');
        }
    } else if (!isPasswordValidForLicense && passwordSet) {
        console.log('🔄 Senha de outra licença detectada - app iniciará normalmente');
    } else if (!passwordSet) {
        console.log('📝 Primeira vez - senha não configurada ainda');
    } else if (sessionAuthenticated) {
        console.log('✅ Já autenticado nesta sessão');
    }
})();
