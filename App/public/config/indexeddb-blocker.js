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

        // Se não houver licenseType ainda, PERMITIR (fase de ativação inicial)
        // Só bloquear quando confirmarmos que é Premium ou Standard
        if (!licenseType) {
            console.log('ℹ️ licenseType não encontrado - permitindo IndexedDB para ativação inicial');
            return false; // PERMITIR durante setup inicial
        }

        // Verificar tanto 'PRM' quanto 'PREM', e tanto 'STD' quanto 'STANDARD'
        return licenseType === 'PRM' || licenseType === 'PREM' ||
               licenseType === 'STD' || licenseType === 'STANDARD';
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
