/**
 * ===================================================================
 * DISH MANAGER - Gerenciamento de Pratos
 * ===================================================================
 * Gerencia CRUD de pratos e seus ingredientes
 */

import { storageService } from './StorageService.js';
import { calculateIngredientsCost } from './calculations.js';

/**
 * Classe para gerenciar pratos (receitas)
 */
export class DishManager {
    constructor(storageKey = 'precificacao_pratos') {
        this.storageKey = storageKey;
        this.ingredientsKey = 'precificacao_ingredientes';
        this.storage = storageService;
    }

    /**
     * Gera ID único para prato
     * @returns {string} ID único
     */
    generateId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        return `dish_${timestamp}_${random}`;
    }

    /**
     * Retorna todos os pratos
     * @returns {Array} Array de pratos
     */
    getAllDishes() {
        try {
            return this.storage.get(this.storageKey, []);
        } catch (error) {
            console.error('Erro ao carregar pratos:', error);
            return [];
        }
    }

    /**
     * Retorna apenas pratos ativos (não deletados)
     * @returns {Array} Array de pratos ativos
     */
    getActiveDishes() {
        try {
            const allDishes = this.getAllDishes();
            return allDishes.filter(dish => dish.isActive !== false);
        } catch (error) {
            console.error('Erro ao carregar pratos ativos:', error);
            return [];
        }
    }

    /**
     * Retorna prato por ID
     * @param {string} dishId - ID do prato
     * @returns {Object|null} Prato ou null
     */
    getDishById(dishId) {
        const dishes = this.getAllDishes();
        return dishes.find(d => d.id === dishId) || null;
    }

    /**
     * Retorna pratos por categoria
     * @param {string} category - Categoria (entrada, principal, sobremesa)
     * @returns {Array} Array de pratos
     */
    getDishesByCategory(category) {
        const dishes = this.getAllDishes();
        return dishes.filter(d => d.category === category && d.isActive);
    }

    /**
     * Retorna pratos favoritos
     * @returns {Array} Array de pratos favoritos
     */
    getFavoriteDishes() {
        const dishes = this.getAllDishes();
        return dishes.filter(d => d.isFavorite && d.isActive);
    }

    /**
     * Busca pratos por nome
     * @param {string} searchTerm - Termo de busca
     * @returns {Array} Array de pratos
     */
    searchDishes(searchTerm) {
        const dishes = this.getAllDishes();
        const term = searchTerm.toLowerCase();

        return dishes.filter(d =>
            d.isActive && (
                d.name.toLowerCase().includes(term) ||
                d.description?.toLowerCase().includes(term) ||
                d.category?.toLowerCase().includes(term)
            )
        );
    }

    /**
     * Salva ou atualiza prato
     * @param {Object} dishData - Dados do prato
     * @returns {Object} Resultado da operação
     */
    saveDish(dishData) {
        try {
            const dishes = this.getAllDishes();
            const now = new Date().toISOString();

            // Calcular custo total dos ingredientes
            const totalCost = this.calculateDishCost(dishData.ingredients || []);
            const costPerServing = dishData.servings > 0
                ? totalCost / dishData.servings
                : 0;

            // Se tem ID, é atualização
            if (dishData.id) {
                const index = dishes.findIndex(d => d.id === dishData.id);

                if (index !== -1) {
                    // Atualiza prato existente (manter isActive se não foi especificado)
                    dishes[index] = {
                        ...dishData,
                        isActive: dishData.isActive !== undefined ? dishData.isActive : dishes[index].isActive,
                        totalCost,
                        costPerServing,
                        updatedAt: now
                    };
                } else {
                    // ID não encontrado, cria novo
                    dishes.push({
                        ...dishData,
                        id: this.generateId(),
                        isActive: true,
                        totalCost,
                        costPerServing,
                        createdAt: now,
                        updatedAt: now
                    });
                }
            } else {
                // Cria novo prato
                const newDish = {
                    ...dishData,
                    id: this.generateId(),
                    totalCost,
                    costPerServing,
                    isActive: true,
                    isFavorite: dishData.isFavorite || false,
                    createdAt: now,
                    updatedAt: now
                };
                dishes.push(newDish);
            }

            this.storage.set(this.storageKey, dishes);

            return {
                success: true,
                message: 'Prato salvo com sucesso',
                dish: dishes[dishes.length - 1]
            };
        } catch (error) {
            console.error('Erro ao salvar prato:', error);
            return {
                success: false,
                message: 'Erro ao salvar prato',
                error: error.message
            };
        }
    }

    /**
     * Calcula custo total de um prato baseado nos ingredientes
     * @param {Array} ingredients - Array de ingredientes do prato
     * @returns {number} Custo total
     */
    calculateDishCost(ingredients) {
        // Usar função centralizada do módulo calculations
        return calculateIngredientsCost(ingredients);
    }

    /**
     * Adiciona ingrediente ao prato
     * @param {string} dishId - ID do prato
     * @param {Object} ingredientData - Dados do ingrediente
     * @returns {Object} Resultado da operação
     */
    addIngredientToDish(dishId, ingredientData) {
        try {
            const dish = this.getDishById(dishId);
            if (!dish) {
                return {
                    success: false,
                    message: 'Prato não encontrado'
                };
            }

            // Calcular custo do ingrediente
            const ingredientCost = ingredientData.quantity * ingredientData.costPerUnit;

            const newIngredient = {
                id: `ing_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                ingredientId: ingredientData.ingredientId,
                ingredientName: ingredientData.ingredientName,
                quantity: ingredientData.quantity,
                unit: ingredientData.unit,
                costPerUnit: ingredientData.costPerUnit,
                ingredientCost: ingredientCost,
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
            return this.saveDish(dish);
        } catch (error) {
            console.error('Erro ao adicionar ingrediente:', error);
            return {
                success: false,
                message: 'Erro ao adicionar ingrediente',
                error: error.message
            };
        }
    }

    /**
     * Remove ingrediente do prato
     * @param {string} dishId - ID do prato
     * @param {string} ingredientId - ID do ingrediente no prato
     * @returns {Object} Resultado da operação
     */
    removeIngredientFromDish(dishId, ingredientId) {
        try {
            const dish = this.getDishById(dishId);
            if (!dish) {
                return {
                    success: false,
                    message: 'Prato não encontrado'
                };
            }

            // Remover ingrediente
            dish.ingredients = dish.ingredients.filter(ing => ing.id !== ingredientId);

            // Recalcular custos
            dish.totalCost = this.calculateDishCost(dish.ingredients);
            dish.costPerServing = dish.servings > 0 ? dish.totalCost / dish.servings : 0;

            // Salvar
            return this.saveDish(dish);
        } catch (error) {
            console.error('Erro ao remover ingrediente:', error);
            return {
                success: false,
                message: 'Erro ao remover ingrediente',
                error: error.message
            };
        }
    }

    /**
     * Atualiza quantidade de ingrediente
     * @param {string} dishId - ID do prato
     * @param {string} ingredientId - ID do ingrediente no prato
     * @param {number} newQuantity - Nova quantidade
     * @returns {Object} Resultado da operação
     */
    updateIngredientQuantity(dishId, ingredientId, newQuantity) {
        try {
            const dish = this.getDishById(dishId);
            if (!dish) {
                return {
                    success: false,
                    message: 'Prato não encontrado'
                };
            }

            // Atualizar quantidade
            const ingredient = dish.ingredients.find(ing => ing.id === ingredientId);
            if (ingredient) {
                ingredient.quantity = newQuantity;
                ingredient.ingredientCost = newQuantity * ingredient.costPerUnit;

                // Recalcular custos
                dish.totalCost = this.calculateDishCost(dish.ingredients);
                dish.costPerServing = dish.servings > 0 ? dish.totalCost / dish.servings : 0;

                // Salvar
                return this.saveDish(dish);
            }

            return {
                success: false,
                message: 'Ingrediente não encontrado'
            };
        } catch (error) {
            console.error('Erro ao atualizar quantidade:', error);
            return {
                success: false,
                message: 'Erro ao atualizar quantidade',
                error: error.message
            };
        }
    }

    /**
     * Marca/desmarca prato como favorito
     * @param {string} dishId - ID do prato
     * @returns {Object} Resultado da operação
     */
    toggleFavorite(dishId) {
        try {
            const dish = this.getDishById(dishId);
            if (!dish) {
                return {
                    success: false,
                    message: 'Prato não encontrado'
                };
            }

            dish.isFavorite = !dish.isFavorite;
            return this.saveDish(dish);
        } catch (error) {
            console.error('Erro ao marcar favorito:', error);
            return {
                success: false,
                message: 'Erro ao marcar favorito',
                error: error.message
            };
        }
    }

    /**
     * Duplica um prato
     * @param {string} dishId - ID do prato a duplicar
     * @returns {Object} Resultado da operação
     */
    duplicateDish(dishId) {
        try {
            const dish = this.getDishById(dishId);
            if (!dish) {
                return {
                    success: false,
                    message: 'Prato não encontrado'
                };
            }

            // Criar cópia
            const duplicatedDish = {
                ...dish,
                id: null, // Novo ID será gerado
                name: `${dish.name} (Cópia)`,
                isFavorite: false,
                createdAt: null,
                updatedAt: null
            };

            return this.saveDish(duplicatedDish);
        } catch (error) {
            console.error('Erro ao duplicar prato:', error);
            return {
                success: false,
                message: 'Erro ao duplicar prato',
                error: error.message
            };
        }
    }

    /**
     * Verifica se um ingrediente está sendo usado em algum prato ativo
     * @param {number|string} ingredientId - ID do ingrediente
     * @returns {Object} { isInUse: boolean, dishes: Array }
     */
    isIngredientInUse(ingredientId) {
        try {
            const activeDishes = this.getActiveDishes();
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
     * Deleta prato (soft delete - marca como inativo)
     * @param {string} dishId - ID do prato
     * @returns {Object} Resultado da operação
     */
    deleteDish(dishId) {
        try {
            const dish = this.getDishById(dishId);
            if (!dish) {
                return {
                    success: false,
                    message: 'Prato não encontrado'
                };
            }

            // Verificar integridade: prato não pode estar em cardápios ativos
            const savedMenusManager = window.savedMenusManager;
            if (savedMenusManager) {
                console.log('🔍 [DishManager.deleteDish] Verificando cardápios para prato:', dishId);

                // Usar método getActiveMenus() do SavedMenusManager (já faz migração e filtra ativos)
                const activeMenus = savedMenusManager.getActiveMenus();

                console.log('📋 [DishManager.deleteDish] Cardápios ATIVOS:', activeMenus.length);

                // Log detalhado de cada cardápio
                if (activeMenus.length > 0) {
                    console.log('📋 [DishManager.deleteDish] Lista de cardápios ativos:');
                    activeMenus.forEach((menu, idx) => {
                        const dishCount = menu.dishes?.length || 0;
                        const hasDish = menu.dishes?.some(d => d.dishId === dishId) ? '🔴 TEM ESTE PRATO' : '';
                        console.log(`   ${idx + 1}. "${menu.name}" - ${dishCount} pratos ${hasDish}`);
                    });
                }

                // Verificar quais cardápios usam este prato
                const menusUsingDish = activeMenus.filter(menu =>
                    menu.dishes &&
                    menu.dishes.some(d => d.dishId === dishId)
                );

                if (menusUsingDish.length > 0) {
                    const menuNames = menusUsingDish.map(m => m.name).join(', ');
                    console.error('❌ [DishManager.deleteDish] Prato em uso nos cardápios:', menuNames);

                    // BLOQUEIA a exclusão
                    return {
                        success: false,
                        message: `❌ Este prato não pode ser excluído pois está sendo usado em ${menusUsingDish.length} cardápio(s) salvo(s):\n\n${menuNames}\n\nRemova o prato dos cardápios primeiro.`
                    };
                }

                console.log('✅ [DishManager.deleteDish] Prato não está em uso, pode ser deletado');
            }

            // Soft delete - marca como inativo
            dish.isActive = false;
            dish.deletedAt = new Date().toISOString();

            const result = this.saveDish(dish);

            // Sobrescrever mensagem para ser mais clara
            if (result.success) {
                return {
                    success: true,
                    message: 'Prato deletado com sucesso',
                    dish: result.dish
                };
            }

            return result;
        } catch (error) {
            console.error('❌ [DishManager.deleteDish] Erro ao deletar prato:', error);
            return {
                success: false,
                message: 'Erro ao deletar prato',
                error: error.message
            };
        }
    }

    /**
     * Deleta prato permanentemente
     * @param {string} dishId - ID do prato
     * @returns {Object} Resultado da operação
     */
    deleteDishPermanently(dishId) {
        try {
            const dishes = this.getAllDishes();
            const filteredDishes = dishes.filter(d => d.id !== dishId);

            this.storage.set(this.storageKey, filteredDishes);

            return {
                success: true,
                message: 'Prato deletado permanentemente'
            };
        } catch (error) {
            console.error('Erro ao deletar prato:', error);
            return {
                success: false,
                message: 'Erro ao deletar prato',
                error: error.message
            };
        }
    }

    /**
     * Retorna estatísticas dos pratos
     * @returns {Object} Estatísticas
     */
    getStatistics() {
        const dishes = this.getAllDishes();
        const activeDishes = dishes.filter(d => d.isActive);

        return {
            total: activeDishes.length,
            favorites: activeDishes.filter(d => d.isFavorite).length,
            byCategory: this.groupByCategory(activeDishes),
            avgCostPerServing: this.calculateAverageCost(activeDishes),
            mostExpensive: this.getMostExpensive(activeDishes),
            cheapest: this.getCheapest(activeDishes)
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

    /**
     * Exporta pratos para JSON
     * @returns {string} JSON string
     */
    exportToJSON() {
        const dishes = this.getAllDishes();
        return JSON.stringify(dishes, null, 2);
    }

    /**
     * Importa pratos de JSON
     * @param {string} jsonString - JSON string
     * @returns {Object} Resultado da operação
     */
    importFromJSON(jsonString) {
        try {
            const importedDishes = JSON.parse(jsonString);

            if (!Array.isArray(importedDishes)) {
                return {
                    success: false,
                    message: 'Formato inválido - esperado array de pratos'
                };
            }

            const dishes = this.getAllDishes();
            const now = new Date().toISOString();

            // Adicionar pratos importados com novos IDs
            importedDishes.forEach(dish => {
                dishes.push({
                    ...dish,
                    id: this.generateId(),
                    createdAt: now,
                    updatedAt: now
                });
            });

            this.storage.set(this.storageKey, dishes);

            return {
                success: true,
                message: `${importedDishes.length} pratos importados com sucesso`
            };
        } catch (error) {
            console.error('Erro ao importar pratos:', error);
            return {
                success: false,
                message: 'Erro ao importar pratos',
                error: error.message
            };
        }
    }
}

// Exportar instância singleton
export const dishManager = new DishManager();

// Expor para window (browser global)
if (typeof window !== 'undefined') {
    window.DishManager = DishManager;
    window.dishManager = dishManager;
}
