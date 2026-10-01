/**
 * MANAGER HELPER
 *
 * Funções utilitárias para acessar os managers corretos
 * Prioriza backend (PostgreSQL) quando disponível, senão usa local (IndexedDB/localStorage)
 */

/**
 * Obtém o manager correto priorizando backend
 * @param {string} managerName - Nome do manager (ex: 'savedEventsManager', 'dishManager')
 * @returns {Object|null} Manager instance ou null
 */
function getManager(managerName) {
    // Prioridade 1: window.PrecificacaoAPI (backend após inicialização completa)
    if (window.PrecificacaoAPI && window.PrecificacaoAPI[managerName]) {
        return window.PrecificacaoAPI[managerName];
    }

    // Prioridade 2: window.appBackend (backend durante inicialização)
    if (window.appBackend && window.appBackend[managerName]) {
        return window.appBackend[managerName];
    }

    // Prioridade 3: window[managerName] (local - fallback)
    if (window[managerName]) {
        return window[managerName];
    }

    return null;
}

/**
 * Obtém o SavedEventsManager correto
 * IMPORTANTE: Backend usa 'eventManager', local usa 'savedEventsManager'
 * Prioriza eventManager (backend) sobre savedEventsManager (local)
 * @returns {Object|null}
 */
function getSavedEventsManager() {
    return getManager('eventManager') || getManager('savedEventsManager');
}

/**
 * Obtém o SavedMenusManager correto
 * @returns {Object|null}
 */
function getSavedMenusManager() {
    return getManager('savedMenusManager') || getManager('menuManager');
}

/**
 * Obtém o DishManager correto
 * @returns {Object|null}
 */
function getDishManager() {
    return getManager('dishManager');
}

/**
 * Obtém o ClientManager correto
 * @returns {Object|null}
 */
function getClientManager() {
    return getManager('clientManager');
}

/**
 * Obtém o CompanyManager correto
 * @returns {Object|null}
 */
function getCompanyManager() {
    return getManager('companyManager');
}

/**
 * Obtém o ProposalManager correto
 * @returns {Object|null}
 */
function getProposalManager() {
    return getManager('proposalManager');
}

/**
 * Obtém o IngredientManager correto
 * @returns {Object|null}
 */
function getIngredientManager() {
    return getManager('ingredientManager');
}

// Exportar para uso global
window.ManagerHelper = {
    getManager,
    getSavedEventsManager,
    getSavedMenusManager,
    getDishManager,
    getClientManager,
    getCompanyManager,
    getProposalManager,
    getIngredientManager
};

console.log('✅ ManagerHelper carregado e disponível globalmente');
