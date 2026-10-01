/**
 * ===================================================================
 * STORAGE CONSOLE UTILS - Utilitários de Console para Storage
 * ===================================================================
 * Funções para gerenciar localStorage e IndexedDB via console do navegador
 */

// ========================================
// FUNÇÕES DE LISTAGEM
// ========================================

/**
 * Lista todas as chaves do localStorage
 */
function listLocalStorage() {
    console.log('📦 LocalStorage Keys:');
    console.log('─'.repeat(60));

    const keys = Object.keys(localStorage);

    if (keys.length === 0) {
        console.log('  (vazio)');
        return;
    }

    keys.forEach(key => {
        const value = localStorage.getItem(key);
        let size = new Blob([value]).size;
        let sizeStr = size < 1024 ? `${size}B` : `${(size/1024).toFixed(2)}KB`;

        console.log(`  🔑 ${key}`);
        console.log(`     📏 Tamanho: ${sizeStr}`);

        // Tentar parsear JSON
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                console.log(`     📊 Tipo: Array com ${parsed.length} itens`);
            } else if (typeof parsed === 'object') {
                console.log(`     📊 Tipo: Object com ${Object.keys(parsed).length} propriedades`);
            } else {
                console.log(`     📊 Tipo: ${typeof parsed}`);
            }
        } catch (e) {
            console.log(`     📊 Tipo: String`);
        }
        console.log('');
    });

    // Total
    const totalSize = keys.reduce((acc, key) => {
        return acc + new Blob([localStorage.getItem(key)]).size;
    }, 0);

    console.log('─'.repeat(60));
    console.log(`📊 Total: ${keys.length} chaves`);
    console.log(`💾 Tamanho total: ${(totalSize/1024).toFixed(2)}KB`);
    console.log(`📈 Uso estimado: ${((totalSize / (5 * 1024 * 1024)) * 100).toFixed(2)}% de ~5MB`);
}

/**
 * Lista todas as chaves do IndexedDB
 */
async function listIndexedDB() {
    try {
        if (!window.indexedDBStorage) {
            console.warn('⚠️ IndexedDBStorageService não está disponível');
            return;
        }

        await window.indexedDBStorage.init();

        console.log('💾 IndexedDB Keys:');
        console.log('─'.repeat(60));

        const keys = await window.indexedDBStorage.keys();

        if (keys.length === 0) {
            console.log('  (vazio)');
            return;
        }

        for (const key of keys) {
            const value = await window.indexedDBStorage.get(key);
            const jsonStr = JSON.stringify(value);
            const size = new Blob([jsonStr]).size;
            const sizeStr = size < 1024 ? `${size}B` : size < 1024*1024 ? `${(size/1024).toFixed(2)}KB` : `${(size/(1024*1024)).toFixed(2)}MB`;

            console.log(`  🔑 ${key}`);
            console.log(`     📏 Tamanho: ${sizeStr}`);

            if (Array.isArray(value)) {
                console.log(`     📊 Tipo: Array com ${value.length} itens`);
            } else if (typeof value === 'object' && value !== null) {
                console.log(`     📊 Tipo: Object com ${Object.keys(value).length} propriedades`);
            } else {
                console.log(`     📊 Tipo: ${typeof value}`);
            }
            console.log('');
        }

        console.log('─'.repeat(60));
        console.log(`📊 Total: ${keys.length} chaves`);

    } catch (error) {
        console.error('❌ Erro ao listar IndexedDB:', error);
    }
}

// ========================================
// FUNÇÕES DE VISUALIZAÇÃO
// ========================================

/**
 * Mostra o conteúdo de uma chave do localStorage
 */
function viewLocalStorage(key) {
    const value = localStorage.getItem(key);

    if (value === null) {
        console.warn(`⚠️ Chave "${key}" não encontrada no localStorage`);
        return;
    }

    console.log(`📦 localStorage["${key}"]:`);
    console.log('─'.repeat(60));

    try {
        const parsed = JSON.parse(value);
        console.log(parsed);
    } catch (e) {
        console.log(value);
    }
}

/**
 * Mostra o conteúdo de uma chave do IndexedDB
 */
async function viewIndexedDB(key) {
    try {
        if (!window.indexedDBStorage) {
            console.warn('⚠️ IndexedDBStorageService não está disponível');
            return;
        }

        const value = await window.indexedDBStorage.get(key);

        if (value === null || value === undefined) {
            console.warn(`⚠️ Chave "${key}" não encontrada no IndexedDB`);
            return;
        }

        console.log(`💾 IndexedDB["${key}"]:`);
        console.log('─'.repeat(60));
        console.log(value);

    } catch (error) {
        console.error('❌ Erro ao visualizar IndexedDB:', error);
    }
}

// ========================================
// FUNÇÕES DE LIMPEZA
// ========================================

/**
 * Limpa uma chave específica do localStorage
 */
function clearLocalStorageKey(key) {
    if (localStorage.getItem(key) === null) {
        console.warn(`⚠️ Chave "${key}" não encontrada`);
        return false;
    }

    localStorage.removeItem(key);
    console.log(`✅ Chave "${key}" removida do localStorage`);
    return true;
}

/**
 * Limpa uma chave específica do IndexedDB
 */
async function clearIndexedDBKey(key) {
    try {
        if (!window.indexedDBStorage) {
            console.warn('⚠️ IndexedDBStorageService não está disponível');
            return false;
        }

        await window.indexedDBStorage.remove(key);
        console.log(`✅ Chave "${key}" removida do IndexedDB`);
        return true;

    } catch (error) {
        console.error('❌ Erro ao remover chave do IndexedDB:', error);
        return false;
    }
}

/**
 * Limpa TUDO do localStorage (com confirmação)
 */
function clearAllLocalStorage(confirm = false) {
    if (!confirm) {
        console.warn('⚠️ ATENÇÃO: Isso vai limpar TODOS os dados do localStorage!');
        console.log('Para confirmar, execute: clearAllLocalStorage(true)');
        return;
    }

    const count = localStorage.length;
    localStorage.clear();
    console.log(`✅ ${count} chaves removidas do localStorage`);
}

/**
 * Limpa TUDO do IndexedDB (com confirmação)
 */
async function clearAllIndexedDB(confirm = false) {
    if (!confirm) {
        console.warn('⚠️ ATENÇÃO: Isso vai limpar TODOS os dados do IndexedDB!');
        console.log('Para confirmar, execute: await clearAllIndexedDB(true)');
        return;
    }

    try {
        if (!window.indexedDBStorage) {
            console.warn('⚠️ IndexedDBStorageService não está disponível');
            return;
        }

        await window.indexedDBStorage.clear();
        console.log('✅ IndexedDB limpo completamente');

    } catch (error) {
        console.error('❌ Erro ao limpar IndexedDB:', error);
    }
}

/**
 * Limpa apenas dados da aplicação (mantém autenticação)
 */
function clearAppData() {
    console.log('🧹 Limpando dados da aplicação...');

    // Lista de chaves de dados da aplicação
    const appKeys = [
        'precificacao_event_data',
        'precificacao_menu',
        'precificacao_clients',
        'custom_templates',
        'company_logo',
        'dishList_viewMode',
        'savedMenusList_viewMode'
    ];

    let removed = 0;
    appKeys.forEach(key => {
        if (localStorage.getItem(key) !== null) {
            localStorage.removeItem(key);
            removed++;
            console.log(`  ✅ Removido: ${key}`);
        }
    });

    console.log(`✅ ${removed} chaves de dados removidas`);
    console.log('🔐 Dados de autenticação mantidos');
}

/**
 * Limpa apenas dados de autenticação
 */
function clearAuthData() {
    console.log('🔐 Limpando dados de autenticação...');

    const authKeys = [
        'appLicenseKey',
        'licensedTo',
        'licensedEmail',
        'appPassword',
        'passwordSet',
        'passwordAttempts',
        'lockoutTime',
        'session_authenticated',
        'skip_license_screen'
    ];

    let removed = 0;
    authKeys.forEach(key => {
        if (localStorage.getItem(key) !== null) {
            localStorage.removeItem(key);
            removed++;
            console.log(`  ✅ Removido: ${key}`);
        }
    });

    // Limpar sessionStorage também
    sessionStorage.removeItem('session_authenticated');

    console.log(`✅ ${removed} chaves de autenticação removidas`);
    console.log('💡 Recarregue a página para aplicar as mudanças');
}

/**
 * Reseta senha (remove senha e bloqueios)
 * Mantém todos os outros dados da aplicação e licença
 */
async function resetPassword() {
    console.log('🔓 Resetando senha...');
    console.log('');

    const passwordKeys = [
        'appPassword',
        'passwordSet',
        'passwordAttempts',
        'lockoutTime'
    ];

    // 1. Limpar de localStorage
    console.log('📦 Limpando localStorage...');
    let clearedLocal = 0;
    passwordKeys.forEach(key => {
        if (localStorage.getItem(key) !== null) {
            localStorage.removeItem(key);
            clearedLocal++;
            console.log(`  ✅ Removido: ${key}`);
        }
    });

    // 2. Limpar de IndexedDB se disponível
    if (window.indexedDBStorage) {
        console.log('');
        console.log('🗄️ Limpando IndexedDB...');
        for (const key of passwordKeys) {
            try {
                await window.indexedDBStorage.remove(key);
                console.log(`  ✅ Removido: ${key}`);
            } catch (err) {
                // Chave pode não existir, ignorar erro
            }
        }
    }

    // 3. Limpar sessionStorage
    console.log('');
    console.log('🔄 Limpando sessão...');
    const sessionKeys = [
        'authenticated',
        'justAuthenticated',
        'skipLicenseScreen',
        'temp_license',
        'temp_licensedTo',
        'temp_licenseExpiry',
        'temp_licensedEmail'
    ];
    sessionKeys.forEach(key => {
        sessionStorage.removeItem(key);
    });

    console.log('');
    console.log('✅ Senha resetada com sucesso!');
    console.log('✅ Bloqueios removidos');
    console.log('✅ Sessão limpa');
    console.log('💾 Licença e dados mantidos');
    console.log('');
    console.log('🔄 Recarregando página em 2 segundos...');

    setTimeout(() => {
        location.reload();
    }, 2000);
}

// ========================================
// FUNÇÕES DE MIGRAÇÃO/BACKUP
// ========================================

/**
 * Exporta todos os dados do localStorage como JSON
 */
function exportLocalStorage() {
    const data = {};
    Object.keys(localStorage).forEach(key => {
        try {
            data[key] = JSON.parse(localStorage.getItem(key));
        } catch (e) {
            data[key] = localStorage.getItem(key);
        }
    });

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `localStorage-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log('✅ localStorage exportado!');
}

/**
 * Exporta todos os dados do IndexedDB como JSON
 */
async function exportIndexedDB() {
    try {
        if (!window.indexedDBStorage) {
            console.warn('⚠️ IndexedDBStorageService não está disponível');
            return;
        }

        const keys = await window.indexedDBStorage.keys();
        const data = {};

        for (const key of keys) {
            data[key] = await window.indexedDBStorage.get(key);
        }

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `indexedDB-backup-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        console.log('✅ IndexedDB exportado!');

    } catch (error) {
        console.error('❌ Erro ao exportar IndexedDB:', error);
    }
}

// ========================================
// AJUDA
// ========================================

function storageHelp() {
    console.log(`
╔════════════════════════════════════════════════════════╗
║           COMANDOS DE GERENCIAMENTO DE STORAGE         ║
╚════════════════════════════════════════════════════════╝

📋 LISTAGEM:
  listLocalStorage()         - Lista todas as chaves do localStorage
  await listIndexedDB()      - Lista todas as chaves do IndexedDB

👁️ VISUALIZAÇÃO:
  viewLocalStorage('key')    - Mostra conteúdo de uma chave (localStorage)
  await viewIndexedDB('key') - Mostra conteúdo de uma chave (IndexedDB)

🗑️ LIMPEZA DE CHAVE ESPECÍFICA:
  clearLocalStorageKey('key')      - Remove uma chave do localStorage
  await clearIndexedDBKey('key')   - Remove uma chave do IndexedDB

🧹 LIMPEZA COMPLETA:
  clearAllLocalStorage(true)  - Limpa TODO o localStorage
  await clearAllIndexedDB(true) - Limpa TODO o IndexedDB

🎯 LIMPEZA SELETIVA:
  clearAppData()              - Limpa dados da app (mantém autenticação)
  clearAuthData()             - Limpa senha E licença
  await resetPassword()       - 🔓 Reseta APENAS senha (mantém licença e dados)

💾 BACKUP/EXPORTAÇÃO:
  exportLocalStorage()     - Exporta localStorage como JSON
  await exportIndexedDB()  - Exporta IndexedDB como JSON

📊 EXEMPLOS:

  // Ver o que tem no localStorage
  listLocalStorage()

  // Ver dados do evento
  viewLocalStorage('precificacao_event_data')

  // Limpar apenas dados da aplicação
  clearAppData()

  // Limpar tudo e começar do zero
  clearAllLocalStorage(true)
  await clearAllIndexedDB(true)
  location.reload()

⚠️ ATENÇÃO: Operações de limpeza são irreversíveis!
💡 DICA: Use exportLocalStorage() antes de limpar dados importantes!
    `);
}

// ========================================
// EXPOR GLOBALMENTE
// ========================================

if (typeof window !== 'undefined') {
    // Funções de listagem
    window.listLocalStorage = listLocalStorage;
    window.listIndexedDB = listIndexedDB;

    // Funções de visualização
    window.viewLocalStorage = viewLocalStorage;
    window.viewIndexedDB = viewIndexedDB;

    // Funções de limpeza
    window.clearLocalStorageKey = clearLocalStorageKey;
    window.clearIndexedDBKey = clearIndexedDBKey;
    window.clearAllLocalStorage = clearAllLocalStorage;
    window.clearAllIndexedDB = clearAllIndexedDB;
    window.clearAppData = clearAppData;
    window.clearAuthData = clearAuthData;
    window.resetPassword = resetPassword;

    // Funções de backup
    window.exportLocalStorage = exportLocalStorage;
    window.exportIndexedDB = exportIndexedDB;

    // Ajuda
    window.storageHelp = storageHelp;

    console.log('✅ Storage Console Utils carregados!');
    console.log('💡 Digite storageHelp() para ver todos os comandos disponíveis');
}
