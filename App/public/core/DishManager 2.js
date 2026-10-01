/**
 * ===================================================================
 * DISH MANAGER - Gerenciamento de Pratos (REFATORADO)
 * ===================================================================
 *
 * REFATORAÇÃO COMPLETA:
 * - Estende CrudManager (herda CRUD completo)
 * - Usa Result pattern (retornos padronizados)
 * - Usa EventBus (desacoplado de SavedMenusManager)
 * - Redução: 664 → ~320 linhas (-52%)
 *
 * HERDA AUTOMATICAMENTE:
 * - getAll(), getActive(), getById()
 * - saveItem(), deleteItem(), duplicate()
 * - toggleFavorite(), getFavorites()
 * - search(), findBy(), count(), exists()
 * - getStatistics(), importFromJSON()
 */

import { CrudManager } from './CrudManager.js';
import { Result } from './Result.js';
import { calculateIngredientsCost } from './calculations.js';
import { generateId } from '../utils/id-generator.js';
import { eventBus } from './EventBus.js';

export class DishManager extends CrudManager {
    constructor(storageKey = 'precificacao_pratos') {
        super({
            storageKey,
            entityName: 'Prato',
            idPrefix: 'dish',
            eventPrefix: 'dish'
        });

        this.ingredientsKey = 'precificacao_ingredientes';

        // Configurar listeners do EventBus
        this.setupEventListeners();
    }

    /**
     * Configura listeners para validações e integridade
     * @private
     */
    setupEventListeners() {
        // DESATIVADO: getActiveMenus() é async mas o listener é sync, causando erro
        // TODO: Refatorar para usar async/await quando EventBus suportar

        // eventBus.on('dish:beforeDelete', ({ id, item }) => {
        //     return this.validateDishDeletion(id);
        // });
    }

    /**
     * Valida se prato pode ser deletado
     * @private
     * @deprecated Temporariamente desativado - causa erro com async
     */
    validateDishDeletion(dishId) {
        // NOTA: Este método não é mais chamado devido ao problema de async/sync
        // Mantido para referência futura quando EventBus suportar async validators
        return null;
    }

    // ===================================================================
    // MÉTODOS LEGADOS (Compatibilidade) - Delegam para CrudManager
    // ===================================================================

    /**
     * @deprecated Use getAll() instead
     */
    async getAllDishes() {
        console.warn('⚠️ getAllDishes() está deprecated. Use getAll()');
        return await this.getAll();
    }

    /**
     * @deprecated Use getActive() instead
     */
    async getActiveDishes() {
        console.warn('⚠️ getActiveDishes() está deprecated. Use getActive()');
        return await this.getActive();
    }

    /**
     * @deprecated Use getById() instead
     */
    getDishById(dishId) {
        return this.getById(dishId);
    }

    /**
     * @deprecated Use findBy('category', category) instead
     */
    async getDishesByCategory(category) {
        return this.findBy('category', category);
    }

    /**
     * @deprecated Use getFavorites() instead
     */
    async getFavoriteDishes() {
        return this.getFavorites();
    }

    /**
     * @deprecated Use search() instead
     */
    async searchDishes(searchTerm) {
        return this.search(searchTerm, ['name', 'description', 'category']);
    }

    /**
     * @deprecated Use saveItem() with Result pattern
     */
    async saveDish(dishData) {
        // Calcular custos antes de salvar
        const totalCost = this.calculateDishCost(dishData.ingredients || []);
        const costPerServing = dishData.servings > 0
            ? totalCost / dishData.servings
            : 0;

        const dataWithCosts = {
            ...dishData,
            totalCost,
            costPerServing
        };

        const result = await this.saveItem(dataWithCosts);

        // Converter Result para formato legado
        return result.toLegacy('dish');
    }

    /**
     * @deprecated Use deleteItem() with Result pattern
     */
    async deleteDish(dishId) {
        const result = await this.deleteItem(dishId, false); // soft delete

        // Converter Result para formato legado
        return result.toLegacy('dish');
    }

    /**
     * @deprecated Use deleteItem(id, true) instead
     */
    async deleteDishPermanently(dishId) {
        const result = await this.deleteItem(dishId, true);
        return result.toLegacy();
    }

    /**
     * @deprecated Use duplicate() instead
     */
    async duplicateDish(dishId) {
        const result = await this.duplicate(dishId);
        return result.toLegacy('dish');
    }

    // ===================================================================
    // MÉTODOS ESPECÍFICOS DE PRATOS (Lógica de Negócio)
    // ===================================================================

    /**
     * Calcula custo total de um prato baseado nos ingredientes
     * @param {Array} ingredients - Array de ingredientes do prato
     * @returns {number} Custo total
     */
    calculateDishCost(ingredients) {
        return calculateIngredientsCost(ingredients);
    }

    /**
     * Adiciona ingrediente ao prato
     * @param {string} dishId - ID do prato
     * @param {Object} ingredientData - Dados do ingrediente
     * @returns {Promise<Result>} Resultado da operação
     */
    async addIngredientToDish(dishId, ingredientData) {
        try {
            const dish = await this.getById(dishId);

            if (!dish) {
                return Result.notFound('Prato', dishId);
            }

            // Calcular custo do ingrediente
            const ingredientCost = (ingredientData.quantity || 0) * (ingredientData.costPerUnit || 0);

            const newIngredient = {
                id: generateId('ingredient'),
                ingredientId: ingredientData.ingredientId,
                ingredientName: ingredientData.ingredientName,
                quantity: ingredientData.quantity || 0,
                unit: ingredientData.unit,
                unitType: ingredientData.unitType || 'weight',
                costPerUnit: ingredientData.costPerUnit || 0,
                ingredientCost: ingredientCost,
                loss: ingredientData.loss || ingredientData.lossPercentage || 0, // ✅ FIX: Preservar perda
                isOptional: ingredientData.isOptional || false,
                notes: ingredientData.notes || null,
                displayOrder: (dish.ingredients?.length || 0) + 1
            };

            // Adicionar ingrediente ao prato
            if (!dish.ingredients) {
                dish.ingredients = [];
            }
            dish.ingredients.push(newIngredient);

            // Recalcular custos
            dish.totalCost = this.calculateDishCost(dish.ingredients);
            dish.costPerServing = dish.servings > 0 ? dish.totalCost / dish.servings : 0;

            // Salvar
            return this.saveItem(dish);

        } catch (error) {
            console.error('Erro ao adicionar ingrediente:', error);
            return Result.fail('Erro ao adicionar ingrediente', error);
        }
    }

    /**
     * Remove ingrediente do prato
     * @param {string} dishId - ID do prato
     * @param {string} ingredientId - ID do ingrediente no prato
     * @returns {Promise<Result>} Resultado da operação
     */
    async removeIngredientFromDish(dishId, ingredientId) {
        try {
            const dish = await this.getById(dishId);

            if (!dish) {
                return Result.notFound('Prato', dishId);
            }

            // Remover ingrediente
            dish.ingredients = dish.ingredients.filter(ing => ing.id !== ingredientId);

            // Recalcular custos
            dish.totalCost = this.calculateDishCost(dish.ingredients);
            dish.costPerServing = dish.servings > 0 ? dish.totalCost / dish.servings : 0;

            // Salvar
            return this.saveItem(dish);

        } catch (error) {
            console.error('Erro ao remover ingrediente:', error);
            return Result.fail('Erro ao remover ingrediente', error);
        }
    }

    /**
     * Atualiza quantidade de ingrediente
     * @param {string} dishId - ID do prato
     * @param {string} ingredientId - ID do ingrediente no prato
     * @param {number} newQuantity - Nova quantidade
     * @returns {Promise<Result>} Resultado da operação
     */
    async updateIngredientQuantity(dishId, ingredientId, newQuantity) {
        try {
            const dish = await this.getById(dishId);

            if (!dish) {
                return Result.notFound('Prato', dishId);
            }

            // Atualizar quantidade
            const ingredient = dish.ingredients.find(ing => ing.id === ingredientId);

            if (!ingredient) {
                return Result.fail('Ingrediente não encontrado');
            }

            ingredient.quantity = newQuantity;
            ingredient.ingredientCost = newQuantity * (ingredient.costPerUnit || 0);

            // Recalcular custos
            dish.totalCost = this.calculateDishCost(dish.ingredients);
            dish.costPerServing = dish.servings > 0 ? dish.totalCost / dish.servings : 0;

            // Salvar
            return this.saveItem(dish);

        } catch (error) {
            console.error('Erro ao atualizar quantidade:', error);
            return Result.fail('Erro ao atualizar quantidade', error);
        }
    }

    /**
     * Verifica se um ingrediente está sendo usado em algum prato ativo
     * @param {number|string} ingredientId - ID do ingrediente
     * @returns {Promise<Object>} { isInUse: boolean, dishes: Array }
     */
    async isIngredientInUse(ingredientId) {
        try {
            const activeDishes = await this.getActive();
            const dishesUsingIngredient = [];

            activeDishes.forEach(dish => {
                if (dish.ingredients && Array.isArray(dish.ingredients)) {
                    const hasIngredient = dish.ingredients.some(
                        ing => String(ing.ingredientId) === String(ingredientId)
                    );

                    if (hasIngredient) {
                        dishesUsingIngredient.push({
                            id: dish.id,
                            name: dish.name,
                            category: dish.category
                        });
                    }
                }
            });

            return {
                isInUse: dishesUsingIngredient.length > 0,
                dishes: dishesUsingIngredient,
                count: dishesUsingIngredient.length
            };

        } catch (error) {
            console.error('Erro ao verificar uso do ingrediente:', error);
            return {
                isInUse: false,
                dishes: [],
                count: 0,
                error: error.message
            };
        }
    }

    /**
     * Retorna estatísticas detalhadas dos pratos
     * Estende estatísticas básicas do CrudManager
     * @returns {Promise<Object>} Estatísticas
     */
    async getDetailedStatistics() {
        const basicStats = await this.getStatistics();
        const dishes = await this.getActive();

        // Estatísticas específicas de pratos
        const byCategory = this.groupByCategory(dishes);
        const avgCostPerServing = this.calculateAverageCost(dishes);
        const mostExpensive = this.getMostExpensive(dishes);
        const cheapest = this.getCheapest(dishes);

        return {
            ...basicStats,
            byCategory,
            avgCostPerServing,
            mostExpensive,
            cheapest
        };
    }

    /**
     * Agrupa pratos por categoria
     * @private
     */
    groupByCategory(dishes) {
        return dishes.reduce((acc, dish) => {
            const category = dish.category || 'Sem categoria';
            if (!acc[category]) {
                acc[category] = 0;
            }
            acc[category]++;
            return acc;
        }, {});
    }

    /**
     * Calcula custo médio por porção
     * @private
     */
    calculateAverageCost(dishes) {
        if (dishes.length === 0) return 0;

        const totalCost = dishes.reduce((sum, dish) => sum + (dish.costPerServing || 0), 0);
        return totalCost / dishes.length;
    }

    /**
     * Retorna prato mais caro
     * @private
     */
    getMostExpensive(dishes) {
        if (dishes.length === 0) return null;

        return dishes.reduce((max, dish) => {
            return (dish.costPerServing || 0) > (max.costPerServing || 0) ? dish : max;
        });
    }

    /**
     * Retorna prato mais barato
     * @private
     */
    getCheapest(dishes) {
        if (dishes.length === 0) return null;

        return dishes.reduce((min, dish) => {
            return (dish.costPerServing || 0) < (min.costPerServing || 0) ? dish : min;
        });
    }
}

// Exportar instância singleton
export const dishManager = new DishManager();

// Expor para window (compatibilidade com código legado)
if (typeof window !== 'undefined') {
    window.DishManager = DishManager;
    window.dishManager = dishManager;
}
