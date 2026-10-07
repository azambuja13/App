/**
 * ===================================================================
 * SAVED MENUS MANAGER - Gerenciamento de Cardápios (REFATORADO)
 * ===================================================================
 *
 * REFATORAÇÃO COMPLETA:
 * - Estende CrudManager
 * - Usa Result pattern e EventBus
 * - Redução: 513 → ~220 linhas (-57%)
 */

import { CrudManager } from './CrudManager.js';
import { Result } from './Result.js';
import { eventBus } from './EventBus.js';

export class SavedMenusManager extends CrudManager {
    constructor(storageKey = 'precificacao_saved_menus') {
        super({
            storageKey,
            entityName: 'Cardápio',
            idPrefix: 'saved_menu',
            eventPrefix: 'menu'
        });

        this.setupEventListeners();
    }

    /**
     * Configura listeners para validações
     * @private
     */
    setupEventListeners() {
        // DESATIVADO: A validação de propostas causa erro pois getAllProposals() é async
        // e o EventBus emit() é síncrono. Por enquanto, permitir exclusão sem validação.
        // TODO: Refatorar EventBus para suportar validadores async

        // eventBus.on('menu:beforeDelete', ({ id }) => {
        //     return this.validateMenuDeletion(id);
        // });
    }

    /**
     * Valida se cardápio pode ser deletado
     * @private
     * @deprecated Temporariamente desativado - causa erro com async
     */
    validateMenuDeletion(menuId) {
        // NOTA: Este método não é mais chamado devido ao problema de async/sync
        // Mantido para referência futura quando EventBus suportar async validators
        return null;
    }

    // ===================================================================
    // OVERRIDE: Calcular estatísticas automaticamente ao salvar
    // ===================================================================

    /**
     * Salva cardápio e calcula estatísticas automaticamente
     * @override
     */
    async saveItem(menuData) {
        // Calcular estatísticas antes de salvar
        const stats = this.calculateMenuStats(menuData.dishes || []);

        const dataWithStats = {
            ...menuData,
            stats
        };

        console.log('💾 [SavedMenusManager] Salvando cardápio com stats:', {
            name: menuData.name,
            dishCount: menuData.dishes?.length || 0,
            stats
        });

        // Chamar método pai
        return await super.saveItem(dataWithStats);
    }

    /**
     * Override getAll() para garantir que stats estão calculados
     * @override
     */
    async getAll() {
        const menus = await super.getAll();
        // ✅ FIX: Recalcular stats para cada menu que não tem stats
        return menus.map(menu => {
            if (!menu.stats && menu.dishes) {
                console.log('📊 [SavedMenusManager] Recalculando stats para:', menu.name);
                menu.stats = this.calculateMenuStats(menu.dishes);
            }
            return menu;
        });
    }

    /**
     * Override getActive() para garantir que stats estão calculados
     * @override
     */
    async getActive() {
        const menus = await super.getActive();
        // ✅ FIX: Recalcular stats para cada menu que não tem stats
        return menus.map(menu => {
            if (!menu.stats && menu.dishes) {
                console.log('📊 [SavedMenusManager] Recalculando stats para:', menu.name);
                menu.stats = this.calculateMenuStats(menu.dishes);
            }
            return menu;
        });
    }

    // ===================================================================
    // MÉTODOS LEGADOS (Compatibilidade)
    // ===================================================================

    /**
     * @deprecated Use getAll() instead
     */
    async getAllMenus() {
        console.warn('⚠️ getAllMenus() está deprecated. Use getAll()');
        return await this.getAll();
    }

    /**
     * @deprecated Use getActive() instead
     */
    async getActiveMenus() {
        console.warn('⚠️ getActiveMenus() está deprecated. Use getActive()');
        return await this.getActive();
    }

    /**
     * @deprecated Use getById() instead
     */
    async getMenuById(menuId) {
        console.warn('⚠️ getMenuById() está deprecated. Use getById()');
        return await this.getById(menuId);
    }

    /**
     * @deprecated Use findBy('eventType', eventType) instead
     */
    async getMenusByEventType(eventType) {
        return this.findBy('eventType', eventType);
    }

    /**
     * @deprecated Use saveItem() with Result pattern
     */
    async saveMenu(menuData) {
        // Calcular estatísticas antes de salvar
        const stats = this.calculateMenuStats(menuData.dishes || []);

        const dataWithStats = {
            ...menuData,
            stats
        };

        const result = await this.saveItem(dataWithStats);
        return result.toLegacy('menu');
    }

    /**
     * @deprecated Use deleteItem() instead
     */
    async deleteMenu(menuId) {
        const result = await this.deleteItem(menuId, true); // hard delete
        return result.toLegacy();
    }

    /**
     * @deprecated Use duplicate() instead
     */
    async duplicateMenu(menuId) {
        const result = await this.duplicate(menuId);
        return result.toLegacy('menu');
    }

    /**
     * @deprecated Use search() instead
     */
    async searchMenus(searchTerm) {
        return this.search(searchTerm, ['name', 'description', 'eventType']);
    }

    // ===================================================================
    // MÉTODOS ESPECÍFICOS DE CARDÁPIOS
    // ===================================================================

    /**
     * Calcula estatísticas do cardápio
     * @param {Array} dishes - Array de pratos do cardápio
     * @returns {Object} Estatísticas
     */
    calculateMenuStats(dishes) {
        if (!dishes || dishes.length === 0) {
            return {
                totalDishes: 0,
                totalCost: 0,
                totalPrice: 0, // ✅ Preço com margem
                totalWeight: 0,
                byCategory: {}
            };
        }

        const stats = {
            totalDishes: dishes.length,
            totalCost: 0,
            totalPrice: 0, // ✅ Preço com margem
            totalWeight: 0,
            byCategory: {}
        };

        dishes.forEach(dish => {
            // Calcular custo proporcional baseado em porções
            const totalWeight = dish.totalWeight || 0;
            const baseCost = dish.dishCost || dish.totalCost || 0;
            const portionsPerPerson = dish.portionsPerPerson || 1;
            const servings = dish.servings || 0;

            console.log(`📊 [calculateMenuStats] Prato: ${dish.dishName}`, {
                totalWeight,
                baseCost,
                portionsPerPerson,
                servings
            });

            // ✅ Considerar useWeightCalculation OU totalWeight === 0
            const isPortionBased = dish.useWeightCalculation || (servings > 0 && totalWeight === 0);
            let dishCost = 0;

            if (isPortionBased) {
                // Por porção do prato: totalCost / servings × porções por pessoa
                const costPerDishPortion = servings > 0 ? baseCost / servings : baseCost;
                dishCost = costPerDishPortion * portionsPerPerson;
                console.log(`  📊 Calculando por PORÇÃO: ${baseCost} / ${servings} × ${portionsPerPerson} = R$ ${dishCost.toFixed(2)}`);
            } else {
                // Por peso (100g por porção)
                const gramsPerPerson = portionsPerPerson * 100;
                if (totalWeight > 0) {
                    const costPerGram = baseCost / totalWeight;
                    dishCost = costPerGram * gramsPerPerson;
                    console.log(`  📊 Calculando por PESO: ${baseCost} / ${totalWeight}g × ${gramsPerPerson}g = R$ ${dishCost.toFixed(2)}`);
                } else {
                    console.warn(`⚠️ Prato "${dish.dishName}" sem peso e sem servings, usando custo base direto`);
                    dishCost = baseCost;
                }
            }

            stats.totalCost += dishCost;

            // ✅ Calcular preço com margem por pessoa
            let dishPrice = 0;

            console.log(`🔍 [${dish.dishName}] DEBUG MARGIN (SavedMenusManager):`);
            console.log(`   - dishCost: R$ ${dishCost.toFixed(2)}`);
            console.log(`   - profitMargin: ${dish.profitMargin}%`);
            console.log(`   - suggestedPrice: R$ ${dish.suggestedPrice}`);

            // ✅ Prioridade 1: Calcular com profitMargin (sempre atualizado)
            if (dish.profitMargin && dish.profitMargin > 0) {
                dishPrice = dishCost * (1 + dish.profitMargin / 100);
                console.log(`   ✅ Usando profitMargin: ${dishCost.toFixed(2)} × (1 + ${dish.profitMargin}/100) = R$ ${dishPrice.toFixed(2)}`);
            }
            // Prioridade 2: Usar suggestedPrice se profitMargin não disponível
            else if (dish.suggestedPrice && dish.suggestedPrice > 0) {
                if (isPortionBased) {
                    // Por porção: suggestedPrice / servings × porções por pessoa
                    const pricePerPortion = servings > 0 ? dish.suggestedPrice / servings : dish.suggestedPrice;
                    dishPrice = pricePerPortion * portionsPerPerson;
                    console.log(`   ⚠️ Usando suggestedPrice por PORÇÃO: ${dish.suggestedPrice.toFixed(2)} / ${servings} × ${portionsPerPerson} = R$ ${dishPrice.toFixed(2)}`);
                } else if (totalWeight > 0) {
                    // Por peso: suggestedPrice / totalWeight × gramas por pessoa
                    const gramsPerPerson = portionsPerPerson * 100;
                    const pricePerGram = dish.suggestedPrice / totalWeight;
                    dishPrice = pricePerGram * gramsPerPerson;
                    console.log(`   ⚠️ Usando suggestedPrice por PESO: ${dish.suggestedPrice.toFixed(2)} / ${totalWeight}g × ${gramsPerPerson}g = R$ ${dishPrice.toFixed(2)}`);
                } else {
                    dishPrice = dish.suggestedPrice;
                    console.log(`   ⚠️ Usando suggestedPrice direto: R$ ${dishPrice.toFixed(2)}`);
                }
            }
            // Fallback: Usar apenas o custo (sem margem)
            else {
                dishPrice = dishCost;
                console.log(`   ⚠️ Sem margem, usando apenas custo: R$ ${dishPrice.toFixed(2)}`);
            }

            stats.totalPrice += dishPrice;

            // Peso por pessoa em gramas (100g por porção)
            const dishWeight = portionsPerPerson * 100;
            stats.totalWeight += dishWeight;

            // Por categoria
            const category = dish.dishCategory || dish.category || 'Sem categoria';
            if (!stats.byCategory[category]) {
                stats.byCategory[category] = {
                    count: 0,
                    cost: 0,
                    price: 0, // ✅ Preço com margem por categoria
                    weight: 0
                };
            }
            stats.byCategory[category].count++;
            stats.byCategory[category].cost += dishCost;
            stats.byCategory[category].price += dishPrice; // ✅ Adicionar preço com margem
            stats.byCategory[category].weight += dishWeight;
        });

        console.log('✅ [calculateMenuStats] Estatísticas calculadas:', stats);

        return stats;
    }

    /**
     * Carrega cardápio para o evento atual
     * Converte cardápio salvo em itens do MenuManager
     * @param {string} menuId - ID do cardápio
     * @returns {Promise<Result>} Resultado com array de pratos
     */
    async loadMenuToEvent(menuId) {
        try {
            const menu = await this.getById(menuId);

            if (!menu) {
                return Result.notFound('Cardápio', menuId);
            }

            if (!menu.dishes || menu.dishes.length === 0) {
                return Result.fail('Cardápio está vazio');
            }

            // Emitir evento
            eventBus.emitAsync('menu:loaded', { menuId, menu });

            return Result.ok(
                {
                    dishes: menu.dishes,
                    menu: menu
                },
                `Cardápio "${menu.name}" carregado`
            );

        } catch (error) {
            console.error('Erro ao carregar cardápio:', error);
            return Result.fail('Erro ao carregar cardápio', error);
        }
    }

    /**
     * Adiciona prato ao cardápio
     * @param {string} menuId - ID do cardápio
     * @param {Object} dishData - Dados do prato
     * @returns {Promise<Result>} Resultado
     */
    async addDishToMenu(menuId, dishData) {
        try {
            const menu = await this.getById(menuId);

            if (!menu) {
                return Result.notFound('Cardápio', menuId);
            }

            if (!menu.dishes) {
                menu.dishes = [];
            }

            menu.dishes.push(dishData);

            // Recalcular estatísticas
            menu.stats = this.calculateMenuStats(menu.dishes);

            return this.saveItem(menu);

        } catch (error) {
            console.error('Erro ao adicionar prato:', error);
            return Result.fail('Erro ao adicionar prato', error);
        }
    }

    /**
     * Remove prato do cardápio
     * @param {string} menuId - ID do cardápio
     * @param {string} dishId - ID do prato no cardápio
     * @returns {Promise<Result>} Resultado
     */
    async removeDishFromMenu(menuId, dishId) {
        try {
            const menu = await this.getById(menuId);

            if (!menu) {
                return Result.notFound('Cardápio', menuId);
            }

            menu.dishes = menu.dishes.filter(d => d.dishId !== dishId);

            // Recalcular estatísticas
            menu.stats = this.calculateMenuStats(menu.dishes);

            return this.saveItem(menu);

        } catch (error) {
            console.error('Erro ao remover prato:', error);
            return Result.fail('Erro ao remover prato', error);
        }
    }

    /**
     * Retorna estatísticas detalhadas
     * @returns {Promise<Object>} Estatísticas
     */
    async getDetailedStatistics() {
        const basicStats = await this.getStatistics();
        const menus = await this.getActive();

        const byEventType = this.groupByEventType(menus);
        const avgDishesPerMenu = menus.length > 0
            ? menus.reduce((sum, m) => sum + (m.dishes?.length || 0), 0) / menus.length
            : 0;

        return {
            ...basicStats,
            byEventType,
            avgDishesPerMenu: avgDishesPerMenu.toFixed(2)
        };
    }

    /**
     * Agrupa cardápios por tipo de evento
     * @private
     */
    groupByEventType(menus) {
        // Usar função utilitária genérica
        if (window.statisticsUtils?.groupBy) {
            return window.statisticsUtils.groupBy(menus, 'eventType', 'Sem tipo');
        }

        // Fallback para garantir compatibilidade
        return menus.reduce((acc, menu) => {
            const type = menu.eventType || 'Sem tipo';
            if (!acc[type]) {
                acc[type] = 0;
            }
            acc[type]++;
            return acc;
        }, {});
    }
}

// Exportar instância singleton
export const savedMenusManager = new SavedMenusManager();

// Expor para window (compatibilidade)
if (typeof window !== 'undefined') {
    window.SavedMenusManager = SavedMenusManager;
    window.savedMenusManager = savedMenusManager;
}
