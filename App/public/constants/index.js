/**
 * ===================================================================
 * CONSTANTS - Constantes Centralizadas da Aplicação
 * ===================================================================
 * Centraliza todas as constantes, categorias e configurações
 * para facilitar manutenção e customização
 */

/**
 * Categorias de Ingredientes - Simplificadas
 * Estas são as categorias que aparecem no dropdown de edição
 */
export const INGREDIENT_CATEGORIES = [
    'Proteínas',
    'Carboidratos',
    'Vegetais',
    'Frutas',
    'Lácteos',
    'Temperos',
    'Bebidas',
    'Outros'
];

/**
 * Mapeamento de subcategorias antigas para novas categorias
 * Usado para migração automática de ingredientes antigos
 */
export const CATEGORY_MAPPING = {
    // Proteínas - Carnes Bovinas
    'Carnes': 'Proteínas',
    'Carne Bovina': 'Proteínas',
    'Carne Suína': 'Proteínas',
    'Carne Ovina': 'Proteínas',
    'Carne de Cordeiro': 'Proteínas',
    'Carneiro': 'Proteínas',
    'Miúdos': 'Proteínas',

    // Proteínas - Aves
    'Aves': 'Proteínas',
    'Ave': 'Proteínas',
    'Frango': 'Proteínas',
    'Peru': 'Proteínas',
    'Pato': 'Proteínas',

    // Proteínas - Linguiças e Embutidos
    'Linguiça': 'Proteínas',
    'Linguiças': 'Proteínas',
    'Embutidos': 'Proteínas',

    // Proteínas - Peixes e Frutos do Mar
    'Peixes': 'Proteínas',
    'Peixe': 'Proteínas',
    'Frutos do Mar': 'Proteínas',
    'Fruto do Mar': 'Proteínas',

    // Proteínas - Outros
    'Ovos': 'Proteínas',
    'Leguminosas': 'Proteínas',

    // Carboidratos
    'Pães': 'Carboidratos',
    'Pão': 'Carboidratos',
    'Massas': 'Carboidratos',
    'Massa': 'Carboidratos',
    'Grãos': 'Carboidratos',
    'Grão': 'Carboidratos',
    'Cereais': 'Carboidratos',
    'Cereal': 'Carboidratos',
    'Tubérculos': 'Carboidratos',
    'Tubérculo': 'Carboidratos',
    'Arroz': 'Carboidratos',
    'Batata': 'Carboidratos',
    'Acompanhamento': 'Carboidratos',

    // Vegetais
    'Verduras': 'Vegetais',
    'Verdura': 'Vegetais',
    'Legumes': 'Vegetais',
    'Legume': 'Vegetais',
    'Saladas': 'Vegetais',
    'Salada': 'Vegetais',
    'Vegetal': 'Vegetais',

    // Frutas (nova categoria)
    'Fruta': 'Frutas',
    'Sobremesas': 'Frutas',
    'Sobremesa': 'Frutas',

    // Lácteos (simplificado de Laticínios)
    'Queijos': 'Lácteos',
    'Queijo': 'Lácteos',
    'Derivados do Leite': 'Lácteos',
    'Leite': 'Lácteos',
    'Iogurte': 'Lácteos',
    'Lácteo': 'Lácteos',
    'Laticínios': 'Lácteos',

    // Temperos (incluindo gorduras e molhos)
    'Temperos': 'Temperos',
    'Tempero': 'Temperos',
    'Condimentos': 'Temperos',
    'Condimento': 'Temperos',
    'Especiarias': 'Temperos',
    'Especiaria': 'Temperos',
    'Ervas': 'Temperos',
    'Erva': 'Temperos',
    'Molho': 'Temperos',
    'Molho Líquido': 'Temperos',
    'Óleos': 'Temperos',
    'Óleo': 'Temperos',
    'Azeites': 'Temperos',
    'Azeite': 'Temperos',
    'Manteigas': 'Temperos',
    'Manteiga': 'Temperos',
    'Banha': 'Temperos',
    'Gorduras': 'Temperos',

    // Bebidas
    'Bebidas': 'Bebidas',
    'Bebida': 'Bebidas',

    // Outros
    'Fora da Churrasqueira': 'Outros',
    'Outros': 'Outros',
    'Outro': 'Outros',
    'Básico': 'Outros',
    'Combustível': 'Outros',
    'Descartável': 'Outros',
    'Doces': 'Outros',
    'Doce': 'Outros'
};

/**
 * Categorias de Pratos
 */
export const DISH_CATEGORIES = [
    { value: 'entrada', label: 'Entrada' },
    { value: 'principal', label: 'Prato Principal' },
    { value: 'acompanhamento', label: 'Acompanhamento' },
    { value: 'sobremesa', label: 'Sobremesa' },
    { value: 'bebida', label: 'Bebida' },
    { value: 'outro', label: 'Outro' }
];

/**
 * Status de Propostas
 */
export const PROPOSAL_STATUS = [
    { value: 'rascunho', label: 'Rascunho', color: 'gray' },
    { value: 'enviada', label: 'Enviada', color: 'blue' },
    { value: 'aprovada', label: 'Aprovada', color: 'green' },
    { value: 'rejeitada', label: 'Rejeitada', color: 'red' },
    { value: 'em_negociacao', label: 'Em Negociação', color: 'yellow' }
];

/**
 * Tipos de Evento
 */
export const EVENT_TYPES = [
    'Casamento',
    'Aniversário',
    'Festa Corporativa',
    'Churrasco',
    'Confraternização',
    'Formatura',
    'Batizado',
    'Outros'
];

/**
 * Configurações de Inflação
 */
export const INFLATION_CONFIG = {
    monthlyRate: 0.01,  // 1% ao mês
    defaultMonths: 0,
    maxMonths: 24,
    minMonths: 0
};

/**
 * Configurações de Imagem
 */
export const IMAGE_CONFIG = {
    maxWidth: 800,
    maxHeight: 600,
    quality: 0.7,
    maxSizeKB: 500,
    acceptedFormats: ['image/jpeg', 'image/png', 'image/jpg']
};

/**
 * Configurações de Paginação
 */
export const PAGINATION_CONFIG = {
    defaultPageSize: 10,
    pageSizeOptions: [5, 10, 20, 50, 100],
    maxPageSize: 100
};

/**
 * Chaves de Storage
 */
export const STORAGE_KEYS = {
    // Dados principais
    EVENT_DATA: 'precificacao_event_data',
    INGREDIENTS: 'precificacao_ingredientes',
    DISHES: 'precificacao_pratos',
    MENUS: 'precificacao_cardapios',
    PROPOSALS: 'precificacao_propostas',
    EVENTS: 'precificacao_eventos_salvos',

    // Configurações
    APP_CONFIG: 'precificacao_config',
    USER_PREFERENCES: 'precificacao_preferences',

    // Autenticação e Licença
    LICENSE_KEY: 'appLicenseKey',
    LICENSE_DATA: 'licenseData',
    LICENSE_TO: 'licensedTo',
    LICENSE_EMAIL: 'licensedEmail',
    LICENSE_EXPIRY: 'licenseExpiry',
    PASSWORD: 'appPassword',
    PASSWORD_SET: 'passwordSet',
    PASSWORD_ATTEMPTS: 'passwordAttempts',
    LOCKOUT_TIME: 'lockoutTime',

    // Sessão
    SESSION_AUTHENTICATED: 'session_authenticated',
    SKIP_LICENSE_SCREEN: 'skipLicenseScreen'
};

/**
 * Mensagens de Erro Padrão
 */
export const ERROR_MESSAGES = {
    REQUIRED_FIELD: 'Este campo é obrigatório',
    INVALID_EMAIL: 'Email inválido',
    INVALID_NUMBER: 'Número inválido',
    MIN_VALUE: (min) => `Valor mínimo: ${min}`,
    MAX_VALUE: (max) => `Valor máximo: ${max}`,
    DUPLICATE: 'Já existe um registro com este nome',
    NOT_FOUND: 'Registro não encontrado',
    SAVE_ERROR: 'Erro ao salvar dados',
    LOAD_ERROR: 'Erro ao carregar dados',
    DELETE_ERROR: 'Erro ao excluir registro',
    NETWORK_ERROR: 'Erro de conexão',
    PERMISSION_DENIED: 'Sem permissão para esta ação',
    INVALID_FILE: 'Arquivo inválido',
    FILE_TOO_LARGE: 'Arquivo muito grande'
};

/**
 * Mensagens de Sucesso Padrão
 */
export const SUCCESS_MESSAGES = {
    SAVED: 'Salvo com sucesso!',
    UPDATED: 'Atualizado com sucesso!',
    DELETED: 'Excluído com sucesso!',
    CREATED: 'Criado com sucesso!',
    COPIED: 'Copiado com sucesso!',
    SENT: 'Enviado com sucesso!'
};

/**
 * Cores do Sistema
 */
export const COLORS = {
    primary: '#10b981',      // green-600
    secondary: '#f97316',    // orange-500
    danger: '#ef4444',       // red-500
    warning: '#f59e0b',      // yellow-500
    info: '#3b82f6',         // blue-500
    success: '#10b981',      // green-500
    dark: '#1f2937',         // gray-800
    light: '#f3f4f6'         // gray-100
};

/**
 * Tamanhos de Fonte
 */
export const FONT_SIZES = {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem' // 30px
};

/**
 * Breakpoints Responsivos
 */
export const BREAKPOINTS = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
};

/**
 * Configurações de Validação
 */
export const VALIDATION = {
    NAME_MIN_LENGTH: 3,
    NAME_MAX_LENGTH: 100,
    DESCRIPTION_MAX_LENGTH: 500,
    PASSWORD_MIN_LENGTH: 6,
    MIN_PRICE: 0,
    MAX_PRICE: 999999,
    MIN_QUANTITY: 0,
    MAX_QUANTITY: 10000,
    MIN_SERVINGS: 1,
    MAX_SERVINGS: 1000
};

/**
 * Formatos de Data
 */
export const DATE_FORMATS = {
    SHORT: 'DD/MM/YYYY',
    LONG: 'DD/MM/YYYY HH:mm',
    FULL: 'DD/MM/YYYY HH:mm:ss',
    ISO: 'YYYY-MM-DD',
    TIME: 'HH:mm',
    MONTH_YEAR: 'MM/YYYY'
};

/**
 * Configurações de Export
 */
export const EXPORT_CONFIG = {
    PDF: {
        format: 'A4',
        orientation: 'portrait',
        unit: 'mm'
    },
    EXCEL: {
        sheetName: 'Dados',
        bookType: 'xlsx'
    },
    JSON: {
        pretty: true,
        indent: 2
    }
};

/**
 * Planos de Licença
 */
export const LICENSE_PLANS = {
    FREE: {
        name: 'Gratuito',
        features: ['Cálculos básicos', 'Até 10 ingredientes'],
        maxIngredients: 10,
        maxDishes: 5,
        maxProposals: 3
    },
    OFFLINE: {
        name: 'Offline',
        features: ['Uso ilimitado', 'Sem conexão necessária', 'Todos os recursos'],
        maxIngredients: Infinity,
        maxDishes: Infinity,
        maxProposals: Infinity
    },
    PREMIUM: {
        name: 'Premium',
        features: ['Uso ilimitado', 'Suporte prioritário', 'Atualizações automáticas'],
        maxIngredients: Infinity,
        maxDishes: Infinity,
        maxProposals: Infinity
    }
};

/**
 * Ícones do Sistema
 */
export const ICONS = {
    ADD: 'plus',
    EDIT: 'edit',
    DELETE: 'trash',
    SAVE: 'save',
    CANCEL: 'x',
    SEARCH: 'search',
    FILTER: 'filter',
    SORT: 'sort',
    DOWNLOAD: 'download',
    UPLOAD: 'upload',
    PRINT: 'printer',
    SHARE: 'share',
    SETTINGS: 'settings',
    USER: 'user',
    LOGOUT: 'logout',
    MENU: 'menu',
    CLOSE: 'x',
    CHECK: 'check',
    ARROW_LEFT: 'arrow-left',
    ARROW_RIGHT: 'arrow-right',
    ARROW_UP: 'arrow-up',
    ARROW_DOWN: 'arrow-down',
    STAR: 'star',
    HEART: 'heart',
    EYE: 'eye',
    CALENDAR: 'calendar',
    CLOCK: 'clock',
    DOLLAR: 'dollar',
    PERCENTAGE: 'percentage'
};

/**
 * URLs e Links
 */
export const URLS = {
    DOCS: 'https://docs.example.com',
    SUPPORT: 'https://support.example.com',
    PRIVACY: 'https://example.com/privacy',
    TERMS: 'https://example.com/terms'
};

/**
 * Versão da Aplicação
 * FONTE ÚNICA: window.APP_CONFIG.version (definido em config/app-config.js)
 */
export const APP_VERSION = window.APP_CONFIG?.version || '1.0.18';

/**
 * Nome da Aplicação
 */
export const APP_NAME = 'Calculadora de Precificação';

/**
 * Configurações Gerais
 */
export const APP_CONFIG = {
    VERSION: APP_VERSION,
    NAME: APP_NAME,
    DEBUG: false,
    AUTO_SAVE: true,
    AUTO_SAVE_DELAY: 1000, // ms
    NOTIFICATION_DURATION: 3000, // ms
    MAX_UNDO_HISTORY: 50
};

// Exportar tudo como objeto padrão também
export default {
    INGREDIENT_CATEGORIES,
    CATEGORY_MAPPING,
    DISH_CATEGORIES,
    PROPOSAL_STATUS,
    EVENT_TYPES,
    INFLATION_CONFIG,
    IMAGE_CONFIG,
    PAGINATION_CONFIG,
    STORAGE_KEYS,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    COLORS,
    FONT_SIZES,
    BREAKPOINTS,
    VALIDATION,
    DATE_FORMATS,
    EXPORT_CONFIG,
    LICENSE_PLANS,
    ICONS,
    URLS,
    APP_VERSION,
    APP_NAME,
    APP_CONFIG
};
