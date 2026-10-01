/**
 * ===================================================================
 * MENU MANAGER - Gerenciamento de Cardápio (REFATORADO)
 * ===================================================================
 * Gerencia os pratos selecionados para o cardápio do evento
 * e as porções por pessoa de cada prato
 *
 * MIGRADO PARA INDEXEDDB:
 * - Usa IndexedDBStorageService em vez de localStorage
 * - Todos os métodos agora são async
 * - Suporta fallback para localStorage se IndexedDB falhar
 */

import { isDishPortionBased } from './calculations.js';
import { smartSave } from '../utils/smart-storage.js';

export class MenuManager {
    constructor() {
        this.storageKey = 'precificacao_menu';
        // Usar IndexedDBStorageService ou fallback para localStorage
        this.storage = null;
        this.init();
    }

    /**
     * Inicializa o storage (IndexedDB ou localStorage)
     */
    async init() {
        if (window.indexedDBStorage) {
            this.storage = window.indexedDBStorage;
            console.log('✅ [MenuManager] Usando IndexedDB');
        } else {
            // Fallback: criar wrapper para localStorage
            this.storage = {
                get: (key, defaultValue) => {
                    try {
                        const data = localStorage.getItem(key);
                        return Promise.resolve(data ? JSON.parse(data) : defaultValue);
                    } catch (error) {
                        console.error('Erro ao ler localStorage:', error);
                        return Promise.resolve(defaultValue);
                    }
                },
                set: async (key, value) => {
                    try {
                        // Usar smartSave para rotear para PostgreSQL ou IndexedDB
                        await smartSave(key, value);
                        return Promise.resolve();
                    } catch (error) {
                        console.error('Erro ao salvar via smartStorage:', error);
                        return Promise.reject(error);
                    }
                }
            };
            console.warn('⚠️ [MenuManager] IndexedDB não disponível, usando localStorage');
        }
    }

    /**
     * Adiciona prato ao cardápio
     * @param {Object} dish - Prato a adicionar
     * @param {number} portionsPerPerson - Porções por pessoa (padrão: 1)
     * @returns {Promise<Object>} Resultado da operação
     */
    async addDishToMenu(dish, portionsPerPerson = 1) {
        try {
            console.log(`🍽️ [MenuManager] Adicionando prato "${dish.name}" ao cardápio...`);
            const menu = await this.getMenu();
            console.log(`📊 [MenuManager] Cardápio atual tem ${menu.length} pratos`);

            // Verificar se o prato já está no cardápio
            const existingIndex = menu.findIndex(item => item.dishId === dish.id);

            if (existingIndex !== -1) {
                console.log(`🔄 [MenuManager] Prato já existe - atualizando...`);
                // Atualizar porções e peso se já existe
                menu[existingIndex].portionsPerPerson = portionsPerPerson;
                menu[existingIndex].servings = dish.servings || menu[existingIndex].servings || 1;
                menu[existingIndex].dishServings = dish.servings || menu[existingIndex].dishServings || 1; // DEPRECATED
                menu[existingIndex].totalWeight = dish.totalWeight || menu[existingIndex].totalWeight || 0;
                menu[existingIndex].useWeightCalculation = dish.useWeightCalculation !== undefined ? dish.useWeightCalculation : menu[existingIndex].useWeightCalculation || false; // ✅ Atualizar flag de cálculo
                menu[existingIndex].updatedAt = new Date().toISOString();
            } else {
                console.log(`➕ [MenuManager] Adicionando novo prato ao cardápio...`);
                // Adicionar novo item ao cardápio
                const menuItem = {
                    id: `menu_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                    dishId: dish.id,
                    dishName: dish.name,
                    dishCategory: dish.category,
                    dishCost: dish.totalCost || 0,
                    dishIngredients: dish.ingredients || [],
                    servings: dish.servings || 1, // Número de porções que o prato rende
                    dishServings: dish.servings || 1, // DEPRECATED - manter para compatibilidade
                    totalWeight: dish.totalWeight || 0, // Peso total do prato em gramas
                    portionsPerPerson: portionsPerPerson, // Quantas porções cada pessoa vai consumir
                    useWeightCalculation: dish.useWeightCalculation || false, // ✅ Usar cálculo por peso (false) ou porção (true)
                    active: true,
                    addedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                menu.push(menuItem);
                console.log(`✅ [MenuManager] Prato adicionado. Novo total: ${menu.length} pratos`);
            }

            console.log(`💾 [MenuManager] Salvando cardápio (${menu.length} pratos)...`);
            await this.storage.set(this.storageKey, menu);
            console.log(`✅ [MenuManager] Cardápio salvo com sucesso!`);

            return {
                success: true,
                message: 'Prato adicionado ao cardápio',
                menu: menu
            };
        } catch (error) {
            console.error('Erro ao adicionar prato ao cardápio:', error);
            return {
                success: false,
                message: 'Erro ao adicionar prato ao cardápio',
                error: error.message
            };
        }
    }

    /**
     * Remove prato do cardápio
     * @param {string} menuItemId - ID do item do cardápio
     * @returns {Promise<Object>} Resultado da operação
     */
    async removeDishFromMenu(menuItemId) {
        try {
            const menu = await this.getMenu();
            const filteredMenu = menu.filter(item => item.id !== menuItemId);
            await this.storage.set(this.storageKey, filteredMenu);

            return {
                success: true,
                message: 'Prato removido do cardápio'
            };
        } catch (error) {
            console.error('Erro ao remover prato do cardápio:', error);
            return {
                success: false,
                message: 'Erro ao remover prato',
                error: error.message
            };
        }
    }

    /**
     * Atualiza porções por pessoa de um prato no cardápio
     * @param {string} menuItemId - ID do item do cardápio
     * @param {number} portionsPerPerson - Novas porções por pessoa
     * @returns {Promise<Object>} Resultado da operação
     */
    async updatePortions(menuItemId, portionsPerPerson) {
        try {
            const menu = await this.getMenu();
            const itemIndex = menu.findIndex(item => item.id === menuItemId);

            if (itemIndex === -1) {
                return {
                    success: false,
                    message: 'Item não encontrado no cardápio'
                };
            }

            menu[itemIndex].portionsPerPerson = portionsPerPerson;
            menu[itemIndex].updatedAt = new Date().toISOString();

            await this.storage.set(this.storageKey, menu);

            return {
                success: true,
                message: 'Porções atualizadas',
                item: menu[itemIndex]
            };
        } catch (error) {
            console.error('Erro ao atualizar porções:', error);
            return {
                success: false,
                message: 'Erro ao atualizar porções',
                error: error.message
            };
        }
    }

    /**
     * Retorna todo o cardápio
     * @returns {Promise<Array>} Array de itens do cardápio
     */
    async getMenu() {
        try {
            console.log(`📖 [MenuManager] Lendo cardápio de "${this.storageKey}"...`);
            const data = await this.storage.get(this.storageKey, []);
            console.log(`📦 [MenuManager] ${data.length} pratos carregados`);
            if (data.length > 0) {
                console.log(`📋 [MenuManager] Primeiro prato:`, data[0]);
            }
            return data;
        } catch (error) {
            console.error('❌ [MenuManager] Erro ao carregar cardápio:', error);
            return [];
        }
    }

    /**
     * Retorna apenas itens ativos do cardápio
     * @returns {Promise<Array>} Array de itens ativos
     */
    async getActiveMenu() {
        const menu = await this.getMenu();
        return menu.filter(item => item.active);
    }

    /**
     * Limpa todo o cardápio
     * @returns {Promise<Object>} Resultado da operação
     */
    async clearMenu() {
        try {
            await this.storage.set(this.storageKey, []);
            return {
                success: true,
                message: 'Cardápio limpo'
            };
        } catch (error) {
            console.error('Erro ao limpar cardápio:', error);
            return {
                success: false,
                message: 'Erro ao limpar cardápio',
                error: error.message
            };
        }
    }

    /**
     * Calcula estatísticas do cardápio
     * @returns {Promise<Object>} Estatísticas
     */
    async getStatistics() {
        const menu = await this.getActiveMenu();

        return {
            totalDishes: menu.length,
            totalCost: menu.reduce((sum, item) => {
                const dishCost = item.dishCost || 0;
                const portionsPerPerson = item.portionsPerPerson || 0;

                // Se o prato tem servings definido (não é por peso), calcular por porção do prato
                if (item.servings > 0 && item.totalWeight === 0) {
                    // Custo por porção do prato
                    const costPerDishPortion = dishCost / item.servings;
                    // Multiplicar pelas porções que cada pessoa consome
                    const costPerPerson = costPerDishPortion * portionsPerPerson;
                    return sum + costPerPerson;
                }

                // Se o prato é por peso, calcular por grama (comportamento original)
                const totalWeight = item.totalWeight || 1;
                const gramsPerPerson = portionsPerPerson * 100; // 1 porção = 100g
                const costPerGram = dishCost / totalWeight;
                const costPerPortion = costPerGram * gramsPerPerson;
                return sum + costPerPortion;
            }, 0),
            byCategory: this.groupByCategory(menu)
        };
    }

    /**
     * Agrupa pratos por categoria
     * @private
     */
    groupByCategory(menu) {
        return menu.reduce((acc, item) => {
            const category = item.dishCategory || 'Sem categoria';
            if (!acc[category]) {
                acc[category] = {
                    count: 0,
                    totalCost: 0
                };
            }
            acc[category].count++;
            // Total cost = somar custo de todos os pratos da categoria
            acc[category].totalCost += item.dishCost || 0;
            return acc;
        }, {});
    }

    /**
     * Gera lista de ingredientes consolidada do cardápio
     * Agrupa ingredientes iguais e soma quantidades
     * @param {number} guests - Número de convidados
     * @returns {Array} Array de ingredientes consolidados
     */
    /**
     * Gera lista de compras de um array de pratos específico (para cardápios salvos)
     * @param {Array} dishes - Array de pratos
     * @param {number} guests - Número de convidados
     * @returns {Promise<Array>} Array de ingredientes consolidados
     */
    async generateIngredientsListFromDishes(dishes, guests) {
        const ingredientsMap = new Map();

        // Validar se dishes é um array
        if (!Array.isArray(dishes) || dishes.length === 0) {
            console.warn('⚠️ [generateIngredientsListFromDishes] Nenhum prato fornecido ou dishes não é um array:', dishes);
            return [];
        }

        dishes.forEach(menuItem => {
            const portionsPerPerson = menuItem.portionsPerPerson || 0;
            let portionFactor;

            // NOVA REGRA: Detectar se o prato é por porções checando ingredientes por unidade
            const isPortionBased = isDishPortionBased(menuItem);

            if (isPortionBased) {
                // Prato POR PORÇÃO (ex: Abacaxi dos Deuses, ou qualquer prato com ingrediente por unidade)
                const servings = menuItem.servings || 1;
                const totalPortionsNeeded = portionsPerPerson * guests;
                portionFactor = totalPortionsNeeded / servings;

                console.log(`📊 [${menuItem.dishName}] POR PORÇÃO: ${portionsPerPerson} porção(ões)/pessoa × ${guests} pessoas = ${totalPortionsNeeded} porções | Prato serve: ${servings} porções | Fator: ${portionFactor.toFixed(2)}x`);
            } else {
                // Prato POR PESO (comportamento original)
                const totalWeight = menuItem.totalWeight || 1;
                const gramsPerPerson = portionsPerPerson * 100;
                const totalGramsNeeded = gramsPerPerson * guests;
                portionFactor = totalGramsNeeded / totalWeight;

                console.log(`📊 [${menuItem.dishName}] POR PESO: ${portionsPerPerson} porção(ões) × 100g = ${gramsPerPerson.toFixed(0)}g/pessoa × ${guests} = ${totalGramsNeeded.toFixed(0)}g | Peso prato: ${totalWeight}g | Fator: ${portionFactor.toFixed(2)}x`);
            }

            const dishIngredients = menuItem.dishIngredients || [];
            dishIngredients.forEach(dishIng => {
                const key = dishIng.ingredientId || dishIng.ingredientName;
                const isUnitType = dishIng.unit === 'un' || dishIng.unitType === 'unit';

                if (ingredientsMap.has(key)) {
                    const existing = ingredientsMap.get(key);
                    if (isUnitType) {
                        // Para ingredientes por unidade, somar diretamente (não converter)
                        existing.totalQuantity += (dishIng.quantity * portionFactor);
                    } else {
                        // Para ingredientes por peso, converter para gramas
                        const newQty = this.convertToGrams(dishIng.quantity, dishIng.unit);
                        existing.totalQuantity += (newQty * portionFactor);
                    }
                } else {
                    if (isUnitType) {
                        // Ingrediente por unidade
                        ingredientsMap.set(key, {
                            ingredientId: dishIng.ingredientId,
                            ingredientName: dishIng.ingredientName || dishIng.name,
                            name: dishIng.ingredientName || dishIng.name,
                            totalQuantity: dishIng.quantity * portionFactor,
                            unit: 'un',
                            unitType: 'unit'
                        });
                    } else {
                        // Ingrediente por peso
                        const qtyInGrams = this.convertToGrams(dishIng.quantity, dishIng.unit);
                        ingredientsMap.set(key, {
                            ingredientId: dishIng.ingredientId,
                            ingredientName: dishIng.ingredientName || dishIng.name,
                            name: dishIng.ingredientName || dishIng.name,
                            totalQuantity: qtyInGrams * portionFactor,
                            unit: 'g',
                            unitType: 'weight'
                        });
                    }
                }
            });
        });

        return Array.from(ingredientsMap.values());
    }

    async generateIngredientsList(guests) {
        const menu = await this.getActiveMenu();
        const ingredientsMap = new Map();

        menu.forEach(menuItem => {
            const portionsPerPerson = menuItem.portionsPerPerson || 0;
            let portionFactor;

            // NOVA REGRA: Detectar se o prato é por porções checando ingredientes por unidade
            const isPortionBased = isDishPortionBased(menuItem);

            if (isPortionBased) {
                // Prato POR PORÇÃO (ex: Abacaxi dos Deuses, ou qualquer prato com ingrediente por unidade)
                // Quantas porções cada pessoa consome × total de pessoas ÷ porções por prato
                const servings = menuItem.servings || 1;
                const totalPortionsNeeded = portionsPerPerson * guests;
                portionFactor = totalPortionsNeeded / servings;

                console.log(`📊 [${menuItem.dishName}] POR PORÇÃO: ${portionsPerPerson} porção(ões)/pessoa × ${guests} pessoas = ${totalPortionsNeeded} porções | Prato serve: ${servings} porções | Fator: ${portionFactor.toFixed(2)}x`);
            } else {
                // Prato POR PESO (comportamento original)
                const totalWeight = menuItem.totalWeight || 1;
                const gramsPerPerson = portionsPerPerson * 100; // 1 porção = 100g FIXO
                const totalGramsNeeded = gramsPerPerson * guests;
                portionFactor = totalGramsNeeded / totalWeight;

                console.log(`📊 [${menuItem.dishName}] POR PESO: ${portionsPerPerson} porção(ões) × 100g = ${gramsPerPerson.toFixed(0)}g/pessoa × ${guests} = ${totalGramsNeeded.toFixed(0)}g | Peso prato: ${totalWeight}g | Fator: ${portionFactor.toFixed(2)}x`);
            }

            menuItem.dishIngredients.forEach(dishIng => {
                const key = dishIng.ingredientId;
                const isUnitType = dishIng.unit === 'un' || dishIng.unitType === 'unit';

                if (ingredientsMap.has(key)) {
                    // Ingrediente já existe, somar quantidade
                    const existing = ingredientsMap.get(key);

                    if (isUnitType) {
                        // Para ingredientes por unidade, somar diretamente
                        existing.totalQuantity += (dishIng.quantity * portionFactor);
                    } else {
                        // Para ingredientes por peso, converter para gramas
                        const newQty = this.convertToGrams(dishIng.quantity, dishIng.unit);
                        existing.totalQuantity += (newQty * portionFactor);
                    }

                    existing.dishes.push({
                        dishName: menuItem.dishName,
                        portionsPerPerson: menuItem.portionsPerPerson,
                        quantity: dishIng.quantity,
                        unit: dishIng.unit
                    });
                } else {
                    // Novo ingrediente
                    if (isUnitType) {
                        // Ingrediente por unidade
                        ingredientsMap.set(key, {
                            ingredientId: dishIng.ingredientId,
                            ingredientName: dishIng.ingredientName,
                            totalQuantity: dishIng.quantity * portionFactor,
                            unit: 'un',
                            unitType: 'unit',
                            originalUnit: dishIng.unit,
                            costPerUnit: dishIng.costPerUnit,
                            dishes: [{
                                dishName: menuItem.dishName,
                                portionsPerPerson: menuItem.portionsPerPerson,
                                quantity: dishIng.quantity,
                                unit: dishIng.unit
                            }]
                        });
                    } else {
                        // Ingrediente por peso
                        const qtyInGrams = this.convertToGrams(dishIng.quantity, dishIng.unit);

                        ingredientsMap.set(key, {
                            ingredientId: dishIng.ingredientId,
                            ingredientName: dishIng.ingredientName,
                            totalQuantity: qtyInGrams * portionFactor, // em gramas
                            unit: 'g', // Sempre em gramas para consolidação
                            unitType: 'weight',
                            originalUnit: dishIng.unit,
                            costPerUnit: dishIng.costPerUnit,
                            dishes: [{
                                dishName: menuItem.dishName,
                                portionsPerPerson: menuItem.portionsPerPerson,
                                quantity: dishIng.quantity,
                                unit: dishIng.unit
                            }]
                        });
                    }
                }
            });
        });

        return Array.from(ingredientsMap.values());
    }

    /**
     * Converte quantidade para gramas (para consolidação)
     * @private
     */
    convertToGrams(quantity, unit) {
        // Usar módulo de conversão de unidades se disponível
        if (window.unitConversions && window.unitConversions.convertToGrams) {
            return window.unitConversions.convertToGrams(quantity, unit);
        }
        // Fallback
        switch(unit) {
            case 'kg':
            case 'L':
                return quantity * 1000;
            case 'ml':
            case 'g':
                return quantity;
            default:
                return quantity;
        }
    }
}

// Criar instância global
export const menuManager = new MenuManager();

// Expor no window para uso em JSX
if (typeof window !== 'undefined') {
    window.MenuManager = MenuManager;
    window.menuManager = menuManager;
}
