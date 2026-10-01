/**
 * ===================================================================
 * CORE INDEX - Exportações Centralizadas
 * ===================================================================
 * Centraliza todas as exportações dos módulos core
 *
 * Uso:
 * import { formatCurrency, calculateEventCosts, SavedEventsManager } from './core/index.js';
 */

// Calculadora
export {
    calculateItems,
    calculateTransportCost,
    calculateSupport,
    calculateLaborCost,
    calculateSubtotal,
    applyInflation,
    calculatePricePerPerson,
    calculateMaterialsCost,
    calculateSupportCost,
    calculateEventCosts
} from './calculator.js';

// Formatadores
export {
    formatCurrency,
    formatDate,
    formatPercent,
    formatNumber
} from './formatters.js';

// Validadores
export {
    validateLicense,
    validatePassword,
    checkBrowserCompatibility,
    validateIngredientName,
    validateIngredientDeletion,
    validateEventData
} from './validators.js';

// Storage
export {
    SavedEventsManager,
    loadFromLocalStorage,
    saveToLocalStorage,
    exportToJSON,
    importFromJSON,
    clearAllData
} from './storage.js';

// Utilitários
export {
    groupByCategory,
    calculateCategoryStats,
    getIngredientsInUse,
    debounce,
    deepClone,
    generateId,
    slugify,
    sortBy,
    searchInFields,
    convertUnit,
    isValidNumber,
    roundTo,
    calculatePercentage,
    truncate,
    removeAccents,
    compareStrings,
    getOrDefault,
    formatPhoneBR,
    formatDocument
} from './utils.js';

// Exportação (PDF, Excel)
export {
    generateProposalPDF,
    exportIngredientsToExcel,
    importIngredientsFromExcel,
    exportShoppingListPDF,
    printPage
} from './export.js';

// === FASE 2: FEATURES PREMIUM ===

// Gerenciamento de Pratos
export {
    DishManager,
    dishManager
} from './DishManager.js';

// Gerenciamento de Propostas
export {
    ProposalManager,
    proposalManager
} from './ProposalManager.js';

// === MÓDULOS REFATORADOS ===

// StorageService - Abstração de persistência
export {
    StorageService,
    storageService
} from './StorageService.js';

// Calculations - Cálculos centralizados
export {
    calculateIngredientsCost,
    calculateCostPerServing,
    calculateCostPerGramMl,
    calculateIngredientCost,
    applyMarkup,
    applyDiscount,
    calculateEventTotal,
    ensureNumber,
    roundToDecimals
} from './calculations.js';

// Units - Conversão de unidades
export {
    UNIT_CONVERSIONS,
    WEIGHT_UNITS,
    VOLUME_UNITS,
    convertToGrams,
    convertFromGrams,
    convertUnit,
    normalizeUnit,
    formatWithUnit,
    getUnitDescription
} from './units.js';

/**
 * GUIA DE USO - FEATURES PREMIUM:
 *
 * 1. GERENCIAMENTO DE PRATOS:
 * ----------------------------
 * import { dishManager } from './core/index.js';
 *
 * // Criar prato
 * const result = dishManager.saveDish({
 *   name: 'Risoto de Funghi',
 *   description: 'Risoto cremoso com cogumelos',
 *   category: 'principal',
 *   servings: 4,
 *   ingredients: [
 *     {
 *       ingredientId: 'ing_123',
 *       ingredientName: 'Arroz Arbóreo',
 *       quantity: 0.3,
 *       unit: 'kg',
 *       costPerUnit: 18.50,
 *       ingredientCost: 5.55
 *     }
 *   ]
 * });
 *
 * // Listar pratos
 * const dishes = dishManager.getAllDishes();
 *
 *
 * 2. GERENCIAMENTO DE PROPOSTAS:
 * -------------------------------
 * import { proposalManager } from './core/index.js';
 *
 * // Criar proposta
 * const result = proposalManager.saveProposal({
 *   eventId: 'evt_123',
 *   proposalName: 'Opção Premium',
 *   proposalType: 'premium',
 *   dishes: [],
 *   transportCost: 150,
 *   laborCost: 200,
 *   markupPercent: 50
 * });
 *
 * // Adicionar prato à proposta
 * proposalManager.addDishToProposal('proposal_id', {
 *   dishId: 'dish_123',
 *   quantity: 50,
 *   pricePerServing: 15.00
 * });
 *
 *
 * 3. CONTROLE DE ACESSO (Feature Gating):
 * ----------------------------------------
 * // Via ConfigHelper (JavaScript puro):
 * if (window.ConfigHelper.hasFeatureAccess('dishes')) {
 *   // Feature liberada
 * } else {
 *   // Mostrar modal de upgrade
 * }
 *
 * // Verificar plano atual:
 * const currentPlan = window.ConfigHelper.getCurrentPlan();
 * // Retorna: 'offline', 'standard', ou 'premium'
 */
