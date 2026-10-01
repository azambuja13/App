/**
 * ===================================================================
 * DATA TRANSFORM - Normalização e Transformação de Dados
 * ===================================================================
 * Módulo centralizado para normalizar estruturas de dados entre
 * formatos português/inglês e garantir consistência
 */

/**
 * Normaliza dados de ingrediente para formato padrão (inglês)
 * Garante que campos em português ou inglês sejam unificados
 *
 * @param {Object} ingredient - Ingrediente em qualquer formato
 * @returns {Object} Ingrediente normalizado
 *
 * @example
 * normalizeIngredient({
 *   nome: 'Arroz',
 *   preco: 5.50,
 *   unidade: 'kg',
 *   perda: 0.1
 * })
 * // => { name: 'Arroz', cost: 5.50, unit: 'kg', loss: 0.1 }
 */
export function normalizeIngredient(ingredient) {
    if (!ingredient) return null;

    return {
        // Campos obrigatórios
        id: ingredient.id,
        name: ingredient.name || ingredient.nome || '',
        cost: parseFloat(ingredient.cost || ingredient.preco || ingredient.costPerUnit || 0),
        unit: ingredient.unit || ingredient.unidade || 'un',
        loss: parseFloat(ingredient.loss || ingredient.perda || 0),

        // Campos opcionais
        category: ingredient.category || ingredient.categoria || 'outros',
        unitSize: parseFloat(ingredient.unitSize || ingredient.tamanhoUnidade || 1),
        description: ingredient.description || ingredient.descricao || '',
        notes: ingredient.notes || ingredient.observacoes || '',
        supplier: ingredient.supplier || ingredient.fornecedor || '',
        active: ingredient.active !== undefined ? ingredient.active : true,

        // Metadados
        createdAt: ingredient.createdAt || ingredient.criadoEm || new Date().toISOString(),
        updatedAt: ingredient.updatedAt || ingredient.atualizadoEm || new Date().toISOString()
    };
}

/**
 * Normaliza array de ingredientes
 *
 * @param {Array} ingredients - Array de ingredientes
 * @returns {Array} Array de ingredientes normalizados
 */
export function normalizeIngredients(ingredients) {
    if (!Array.isArray(ingredients)) return [];
    return ingredients.map(normalizeIngredient).filter(ing => ing !== null);
}

/**
 * Normaliza dados de prato para formato padrão
 *
 * @param {Object} dish - Prato em qualquer formato
 * @returns {Object} Prato normalizado
 */
export function normalizeDish(dish) {
    if (!dish) return null;

    return {
        id: dish.id,
        name: dish.name || dish.nome || '',
        description: dish.description || dish.descricao || '',
        category: dish.category || dish.categoria || 'principal',
        servings: parseInt(dish.servings || dish.porcoes || 1),

        // Ingredientes (normalizar cada um)
        ingredients: normalizeIngredients(dish.ingredients || dish.ingredientes || []),

        // Custos
        totalCost: parseFloat(dish.totalCost || dish.custoTotal || 0),
        costPerServing: parseFloat(dish.costPerServing || dish.custoPorPorcao || 0),
        totalWeight: parseFloat(dish.totalWeight || dish.pesoTotal || 0),

        // Campos opcionais
        observations: dish.observations || dish.observacoes || '',
        technicalSheet: dish.technicalSheet || dish.fichaTecnica || '',
        isFavorite: dish.isFavorite || dish.favorito || false,
        photos: dish.photos || dish.fotos || [],

        // Metadados
        active: dish.active !== undefined ? dish.active : true,
        deleted: dish.deleted || false,
        createdAt: dish.createdAt || dish.criadoEm || new Date().toISOString(),
        updatedAt: dish.updatedAt || dish.atualizadoEm || new Date().toISOString()
    };
}

/**
 * Normaliza dados de evento para formato padrão
 *
 * @param {Object} event - Evento em qualquer formato
 * @returns {Object} Evento normalizado
 */
export function normalizeEvent(event) {
    if (!event) return null;

    return {
        id: event.id,
        name: event.name || event.nome || event.eventName || '',
        date: event.date || event.data || event.eventDate || '',
        location: event.location || event.local || event.eventLocation || '',
        guests: parseInt(event.guests || event.convidados || 0),

        // Dados do cliente
        clientData: {
            name: event.clientData?.name || event.clientData?.nome || event.cliente || '',
            phone: event.clientData?.phone || event.clientData?.telefone || '',
            email: event.clientData?.email || '',
            address: event.clientData?.address || event.clientData?.endereco || ''
        },

        // Arrays de dados
        items: event.items || event.itens || [],
        support: event.support || event.apoio || [],

        // Custos adicionais
        labor: {
            hours: parseFloat(event.labor?.hours || event.maoDeObra?.horas || 0),
            rate: parseFloat(event.labor?.rate || event.labor?.hourlyRate || event.maoDeObra?.valorHora || 0)
        },

        transport: {
            active: event.transport?.active !== undefined ? event.transport.active : false,
            distance: parseFloat(event.transport?.distance || event.transporte?.distancia || 0),
            consumption: parseFloat(event.transport?.consumption || event.transporte?.consumo || 10),
            fuelPrice: parseFloat(event.transport?.fuelPrice || event.transporte?.precoCombustivel || 0),
            costPerKm: parseFloat(event.transport?.costPerKm || event.transporte?.custoPorKm || 0),
            toll: parseFloat(event.transport?.toll || event.transporte?.pedagio || 0),
            trips: parseInt(event.transport?.trips || event.transport?.quantity || event.transporte?.viagens || 1)
        },

        // Ajustes financeiros
        monthsUntilEvent: parseInt(event.monthsUntilEvent || event.mesesAteEvento || 0),
        inflationRate: parseFloat(event.inflationRate || event.taxaInflacao || 0.01),
        markup: parseFloat(event.markup || event.margem || 0),
        discount: parseFloat(event.discount || event.desconto || 0),

        // Metadados
        createdAt: event.createdAt || event.criadoEm || new Date().toISOString(),
        updatedAt: event.updatedAt || event.atualizadoEm || new Date().toISOString()
    };
}

/**
 * Normaliza item de ingrediente usado em prato/evento
 *
 * @param {Object} item - Item de ingrediente
 * @returns {Object} Item normalizado
 */
export function normalizeIngredientItem(item) {
    if (!item) return null;

    return {
        id: item.id,
        ingredientId: item.ingredientId || item.idIngrediente,
        ingredientName: item.ingredientName || item.nomeIngrediente || item.name,
        quantity: parseFloat(item.quantity || item.quantidade || 0),
        unit: item.unit || item.unidade || 'un',
        costPerUnit: parseFloat(item.costPerUnit || item.custoPorUnidade || 0),
        ingredientCost: parseFloat(item.ingredientCost || item.custoIngrediente || 0),
        loss: parseFloat(item.loss || item.perda || 0),
        isOptional: item.isOptional || item.opcional || false,
        notes: item.notes || item.observacoes || null,
        displayOrder: parseInt(item.displayOrder || item.ordem || 0)
    };
}

/**
 * Extrai campo de objeto com fallback para português/inglês
 * Útil para acessar dados sem saber se estão em PT ou EN
 *
 * @param {Object} obj - Objeto com dados
 * @param {string} enField - Nome do campo em inglês
 * @param {string} ptField - Nome do campo em português
 * @param {*} defaultValue - Valor padrão se não encontrado
 * @returns {*} Valor do campo
 *
 * @example
 * getField({ nome: 'Arroz' }, 'name', 'nome', '')  // => 'Arroz'
 * getField({ name: 'Rice' }, 'name', 'nome', '')   // => 'Rice'
 * getField({}, 'name', 'nome', 'N/A')              // => 'N/A'
 */
export function getField(obj, enField, ptField, defaultValue = null) {
    if (!obj) return defaultValue;
    return obj[enField] !== undefined ? obj[enField] : (obj[ptField] || defaultValue);
}

/**
 * Converte campos de português para inglês (in-place)
 * Modifica o objeto original
 *
 * @param {Object} obj - Objeto a converter
 * @param {Object} fieldMap - Mapa de conversões { en: 'pt' }
 * @returns {Object} Objeto modificado
 *
 * @example
 * const ing = { nome: 'Arroz', preco: 5 }
 * convertFieldsToEnglish(ing, { name: 'nome', cost: 'preco' })
 * // ing agora é: { name: 'Arroz', cost: 5, nome: 'Arroz', preco: 5 }
 */
export function convertFieldsToEnglish(obj, fieldMap) {
    if (!obj || typeof obj !== 'object') return obj;

    Object.keys(fieldMap).forEach(enKey => {
        const ptKey = fieldMap[enKey];
        if (obj[ptKey] !== undefined && obj[enKey] === undefined) {
            obj[enKey] = obj[ptKey];
        }
    });

    return obj;
}

/**
 * Remove campos null/undefined de um objeto
 * Útil para limpar dados antes de salvar
 *
 * @param {Object} obj - Objeto a limpar
 * @returns {Object} Objeto limpo
 */
export function removeNullFields(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    const cleaned = {};
    Object.keys(obj).forEach(key => {
        if (obj[key] !== null && obj[key] !== undefined) {
            cleaned[key] = obj[key];
        }
    });

    return cleaned;
}

/**
 * Valida estrutura de ingrediente
 *
 * @param {Object} ingredient - Ingrediente a validar
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateIngredient(ingredient) {
    const errors = [];

    if (!ingredient) {
        return { valid: false, errors: ['Ingrediente é nulo ou indefinido'] };
    }

    // Verificar campos obrigatórios
    const name = ingredient.name || ingredient.nome;
    if (!name || name.trim() === '') {
        errors.push('Nome do ingrediente é obrigatório');
    }

    const cost = parseFloat(ingredient.cost || ingredient.preco || 0);
    if (cost < 0) {
        errors.push('Custo do ingrediente não pode ser negativo');
    }

    const unit = ingredient.unit || ingredient.unidade;
    if (!unit || unit.trim() === '') {
        errors.push('Unidade do ingrediente é obrigatória');
    }

    const loss = parseFloat(ingredient.loss || ingredient.perda || 0);
    if (loss < 0 || loss >= 1) {
        errors.push('Perda deve estar entre 0 e 1 (0% a 99%)');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Valida estrutura de prato
 *
 * @param {Object} dish - Prato a validar
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateDish(dish) {
    const errors = [];

    if (!dish) {
        return { valid: false, errors: ['Prato é nulo ou indefinido'] };
    }

    const name = dish.name || dish.nome;
    if (!name || name.trim() === '') {
        errors.push('Nome do prato é obrigatório');
    }

    const ingredients = dish.ingredients || dish.ingredientes || [];
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
        errors.push('Prato deve ter pelo menos um ingrediente');
    }

    const servings = parseInt(dish.servings || dish.porcoes || 0);
    if (servings <= 0) {
        errors.push('Número de porções deve ser maior que zero');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

// Mapa de campos para conversão rápida
export const FIELD_MAP = {
    INGREDIENT: {
        name: 'nome',
        cost: 'preco',
        unit: 'unidade',
        loss: 'perda',
        category: 'categoria',
        description: 'descricao',
        supplier: 'fornecedor'
    },
    DISH: {
        name: 'nome',
        description: 'descricao',
        category: 'categoria',
        servings: 'porcoes',
        ingredients: 'ingredientes',
        totalCost: 'custoTotal',
        costPerServing: 'custoPorPorcao',
        totalWeight: 'pesoTotal',
        observations: 'observacoes'
    },
    EVENT: {
        name: 'nome',
        date: 'data',
        location: 'local',
        guests: 'convidados'
    }
};

// Exportar como objeto padrão também
export default {
    normalizeIngredient,
    normalizeIngredients,
    normalizeDish,
    normalizeEvent,
    normalizeIngredientItem,
    getField,
    convertFieldsToEnglish,
    removeNullFields,
    validateIngredient,
    validateDish,
    FIELD_MAP
};
