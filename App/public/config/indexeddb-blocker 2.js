/**
 * INDEXEDDB BLOCKER FOR PREMIUM/STANDARD PLANS
 *
 * Este script DEVE ser carregado ANTES de qualquer outro script que use IndexedDB.
 * Intercepta todas as chamadas de indexedDB.open() e bloqueia para planos Premium/Standard.
 */

(function() {
    console.log('🔒 [IndexedDB Blocker] Iniciando...');

    // Guardar referência original ANTES de qualquer outro código carregar
    const originalIndexedDB = window.indexedDB;
    const originalOpen = originalIndexedDB ? originalIndexedDB.open.bind(originalIndexedDB) : null;

    console.log('🔒 [IndexedDB Blocker] IndexedDB original:', !!originalIndexedDB);
    console.log('🔒 [IndexedDB Blocker] licenseType:', localStorage.getItem('licenseType'));

    // Função para verificar plano
    function isPremiumOrStandard() {
        // Verificar pelo licenseType no localStorage (disponível desde o início)
        const licenseType = localStorage.getItem('licenseType');

        // Se não houver licenseType ainda, BLOQUEAR por padrão (modo seguro)
        // IndexedDB só será permitido quando confirmarmos que é modo offline
        if (!licenseType) {
            console.log('⚠️ licenseType não encontrado - bloqueando IndexedDB por segurança');
            return true; // Bloquear até confirmar
        }

        return licenseType === 'PRM' || licenseType === 'STD';
    }

    // Se não houver suporte a IndexedDB, não fazer nada
    if (!originalIndexedDB) {
        console.log('⚠️ IndexedDB não suportado neste navegador');
        return;
    }

    // Criar proxy do IndexedDB
    const blockedIndexedDB = {
        open: function(dbName, version) {
            const isPremium = isPremiumOrStandard();

            if (isPremium) {
                // BLOQUEAR completamente para Premium/Standard
                const licenseType = localStorage.getItem('licenseType') || 'UNKNOWN';
                console.warn(`🚫 [${licenseType}] IndexedDB.open("${dbName}") BLOQUEADO - PostgreSQL obrigatório`);

                // LANÇAR EXCEÇÃO para impedir QUALQUER criação de banco
                throw new DOMException(
                    `IndexedDB desabilitado para planos Premium/Standard. Use PostgreSQL.`,
                    'InvalidStateError'
                );
            } else {
                // PERMITIR para planos Offline
                console.log(`✅ [OFFLINE] IndexedDB.open("${dbName}") permitido`);
                return originalOpen(dbName, version);
            }
        },

        deleteDatabase: originalIndexedDB.deleteDatabase.bind(originalIndexedDB),
        cmp: originalIndexedDB.cmp.bind(originalIndexedDB),
        databases: originalIndexedDB.databases ? originalIndexedDB.databases.bind(originalIndexedDB) : undefined
    };

    // Substituir window.indexedDB pelo proxy
    Object.defineProperty(window, 'indexedDB', {
        get: function() {
            return blockedIndexedDB;
        },
        configurable: true
    });

    console.log('🔒 IndexedDB Blocker ativado - verificará plano a cada tentativa de abertura');
})();
