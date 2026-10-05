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

                // ✅ Recalcular custo e preço por pessoa quando atualiza o prato
                const dishCost = dish.totalCost || menu[existingIndex].dishCost || 0;
                const servings = dish.servings || menu[existingIndex].servings || 1;
                const totalWeight = dish.totalWeight || menu[existingIndex].totalWeight || 0;
                const profitMargin = dish.profitMargin !== undefined ? dish.profitMargin : (menu[existingIndex].profitMargin || 0);

                let dishCostPerPerson = 0;
                let dishPricePerPerson = 0;

                // Calcular custo por pessoa
                const isPortionBased = dish.useWeightCalculation || (servings > 0 && totalWeight === 0);
                if (isPortionBased) {
                    // Prato por porção
                    const costPerDishPortion = servings > 0 ? dishCost / servings : dishCost;
                    dishCostPerPerson = costPerDishPortion * portionsPerPerson;
                } else {
                    // Prato por peso
                    const gramsPerPerson = portionsPerPerson * 100;
                    const costPerGram = totalWeight > 0 ? dishCost / totalWeight : dishCost;
                    dishCostPerPerson = costPerGram * gramsPerPerson;
                }

                // Calcular preço por pessoa COM margem
                if (profitMargin > 0) {
                    dishPricePerPerson = dishCostPerPerson * (1 + profitMargin / 100);
                } else {
                    dishPricePerPerson = dishCostPerPerson; // Sem margem
                }

                console.log(`💰 [MenuManager] Valores atualizados: custo/pessoa=R$ ${dishCostPerPerson.toFixed(2)}, preço/pessoa=R$ ${dishPricePerPerson.toFixed(2)}`);

                // Atualizar porções, peso, margem e preço se já existe
                menu[existingIndex].portionsPerPerson = portionsPerPerson;
                menu[existingIndex].dishCost = dishCost; // ✅ Atualizar custo total do prato
                menu[existingIndex].profitMargin = profitMargin; // ✅ Atualizar margem de lucro
                menu[existingIndex].suggestedPrice = dish.suggestedPrice !== undefined ? dish.suggestedPrice : menu[existingIndex].suggestedPrice || 0; // ✅ Atualizar preço sugerido
                menu[existingIndex].dishCostPerPerson = dishCostPerPerson; // ✅ Atualizar custo por pessoa
                menu[existingIndex].dishPricePerPerson = dishPricePerPerson; // ✅ Atualizar preço por pessoa COM margem
                menu[existingIndex].servings = servings;
                menu[existingIndex].dishServings = servings; // DEPRECATED
                menu[existingIndex].totalWeight = totalWeight;
                menu[existingIndex].useWeightCalculation = dish.useWeightCalculation !== undefined ? dish.useWeightCalculation : menu[existingIndex].useWeightCalculation || false; // ✅ Atualizar flag de cálculo
                menu[existingIndex].updatedAt = new Date().toISOString();
            } else {
                console.log(`➕ [MenuManager] Adicionando novo prato ao cardápio...`);

                // ✅ Calcular custo e preço por pessoa no momento de adicionar ao cardápio
                const dishCost = dish.totalCost || 0;
                const servings = dish.servings || 1;
                const totalWeight = dish.totalWeight || 0;
                const profitMargin = dish.profitMargin || 0;

                let dishCostPerPerson = 0;
                let dishPricePerPerson = 0;

                // Calcular custo por pessoa
                const isPortionBased2 = dish.useWeightCalculation || (servings > 0 && totalWeight === 0);
                if (isPortionBased2) {
                    // Prato por porção
                    const costPerDishPortion = servings > 0 ? dishCost / servings : dishCost;
                    dishCostPerPerson = costPerDishPortion * portionsPerPerson;
                } else {
                    // Prato por peso
                    const gramsPerPerson = portionsPerPerson * 100;
                    const costPerGram = totalWeight > 0 ? dishCost / totalWeight : dishCost;
                    dishCostPerPerson = costPerGram * gramsPerPerson;
                }

                // Calcular preço por pessoa COM margem
                if (profitMargin > 0) {
                    dishPricePerPerson = dishCostPerPerson * (1 + profitMargin / 100);
                } else {
                    dishPricePerPerson = dishCostPerPerson; // Sem margem
                }

                console.log(`💰 [MenuManager] Valores calculados: custo/pessoa=R$ ${dishCostPerPerson.toFixed(2)}, preço/pessoa=R$ ${dishPricePerPerson.toFixed(2)}`);

                // Adicionar novo item ao cardápio
                const menuItem = {
                    id: `menu_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                    dishId: dish.id,
                    dishName: dish.name,
                    dishCategory: dish.category,
                    dishType: dish.category, // ✅ Copiar category como dishType para compatibilidade com ProposalPreview
                    dishCost: dishCost,
                    profitMargin: profitMargin, // ✅ Copiar margem de lucro do prato
                    suggestedPrice: dish.suggestedPrice || 0, // ✅ Copiar preço sugerido (com margem) do prato
                    dishCostPerPerson: dishCostPerPerson, // ✅ Custo por pessoa (pré-calculado)
                    dishPricePerPerson: dishPricePerPerson, // ✅ Preço por pessoa COM margem (pré-calculado)
                    dishIngredients: dish.ingredients || [],
                    servings: servings, // Número de porções que o prato rende
                    dishServings: servings, // DEPRECATED - manter para compatibilidade
                    totalWeight: totalWeight, // Peso total do prato em gramas
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

            // ✅ FIX: Disparar evento para atualizar cálculos
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('menu-updated'));
            }

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

            // ✅ FIX: Disparar evento para atualizar cálculos
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('menu-updated'));
            }

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

            // ✅ Validar valor antes de salvar
            const validPortions = parseFloat(portionsPerPerson);
            if (isNaN(validPortions) || validPortions <= 0) {
                return {
                    success: false,
                    message: 'Valor inválido. Use um número maior que 0.'
                };
            }

            // ✅ RECALCULAR valores por pessoa quando porções mudam
            const item = menu[itemIndex];
            const dishCost = item.dishCost || 0;
            const servings = item.servings || 1;
            const totalWeight = item.totalWeight || 0;
            const profitMargin = item.profitMargin || 0;

            let dishCostPerPerson = 0;

            // Calcular custo por pessoa baseado nas NOVAS porções
            const isPortionBased = item.useWeightCalculation || (servings > 0 && totalWeight === 0);
            if (isPortionBased) {
                // Prato por porção
                const costPerDishPortion = servings > 0 ? dishCost / servings : dishCost;
                dishCostPerPerson = costPerDishPortion * validPortions;
                console.log(`📊 [updatePortions] Prato POR PORÇÃO: R$ ${dishCost} ÷ ${servings} = R$ ${costPerDishPortion}/porção × ${validPortions} = R$ ${dishCostPerPerson.toFixed(2)}/pessoa`);
            } else {
                // Prato por peso
                const gramsPerPerson = validPortions * 100;
                const costPerGram = totalWeight > 0 ? dishCost / totalWeight : dishCost;
                dishCostPerPerson = costPerGram * gramsPerPerson;
                console.log(`📊 [updatePortions] Prato POR PESO: R$ ${dishCost} ÷ ${totalWeight}g = R$ ${costPerGram.toFixed(4)}/g × ${gramsPerPerson}g = R$ ${dishCostPerPerson.toFixed(2)}/pessoa`);
            }

            // Calcular preço por pessoa COM margem
            let dishPricePerPerson = 0;
            if (profitMargin > 0) {
                dishPricePerPerson = dishCostPerPerson * (1 + profitMargin / 100);
            } else {
                dishPricePerPerson = dishCostPerPerson;
            }

            console.log(`💰 [updatePortions] Valores recalculados: custo/pessoa=R$ ${dishCostPerPerson.toFixed(2)}, preço/pessoa=R$ ${dishPricePerPerson.toFixed(2)}`);

            // ✅ Atualizar TODOS os valores relacionados
            menu[itemIndex].portionsPerPerson = validPortions;
            menu[itemIndex].dishCostPerPerson = dishCostPerPerson;
            menu[itemIndex].dishPricePerPerson = dishPricePerPerson;
            menu[itemIndex].updatedAt = new Date().toISOString();

            await this.storage.set(this.storageKey, menu);

            // ✅ FIX: Disparar evento para atualizar cálculos
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('menu-updated'));
            }

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
     * Restaura um cardápio completo (usado ao carregar evento salvo)
     * @param {Array} dishes - Array de pratos do cardápio
     * @returns {Promise<Object>} Resultado da operação
     */
    async restoreMenu(dishes) {
        try {
            if (!dishes || !Array.isArray(dishes)) {
                console.warn('⚠️ [MenuManager] restoreMenu: dishes inválido');
                return { success: false, message: 'Dados de cardápio inválidos' };
            }

            await this.storage.set(this.storageKey, dishes);
            console.log(`✅ [MenuManager] Cardápio restaurado com ${dishes.length} pratos`);

            // ✅ FIX: avisar a UI (useCalculations escuta 'menu-updated') para recalcular,
            // inclusive quando o cardápio restaurado é vazio.
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('menu-updated'));
            }

            return {
                success: true,
                message: `Cardápio restaurado com ${dishes.length} pratos`,
                count: dishes.length
            };
        } catch (error) {
            console.error('❌ [MenuManager] Erro ao restaurar cardápio:', error);
            return {
                success: false,
                message: 'Erro ao restaurar cardápio',
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

        let totalCost = 0;
        let totalPrice = 0;

        menu.forEach(item => {
            console.log(`📊 [${item.dishName}] portionsPerPerson=${item.portionsPerPerson}`);

            // ✅ SEMPRE recalcular baseado nas porções ATUAIS
            // Os valores salvos dishCostPerPerson/dishPricePerPerson eram para uma quantidade específica,
            // mas o usuário pode alterar portionsPerPerson dinamicamente
            const dishCost = item.dishCost || 0;
            const portionsPerPerson = item.portionsPerPerson || 0;
            const totalWeight = item.totalWeight || 0;
            const servings = item.servings || 1;
            const profitMargin = item.profitMargin || 0;

            let dishCostPerPerson = 0;

            // Calcular custo por pessoa baseado nas porções ATUAIS
            const isPortionBased = item.useWeightCalculation || (servings > 0 && totalWeight === 0);
            if (isPortionBased) {
                // Prato por porção
                const costPerDishPortion = servings > 0 ? dishCost / servings : dishCost;
                dishCostPerPerson = costPerDishPortion * portionsPerPerson;
            } else {
                // Prato por peso
                const gramsPerPerson = portionsPerPerson * 100;
                const costPerGram = totalWeight > 0 ? dishCost / totalWeight : dishCost;
                dishCostPerPerson = costPerGram * gramsPerPerson;
            }

            totalCost += dishCostPerPerson;

            // Calcular preço por pessoa COM margem
            let dishPricePerPerson = 0;
            if (profitMargin > 0) {
                dishPricePerPerson = dishCostPerPerson * (1 + profitMargin / 100);
            } else {
                dishPricePerPerson = dishCostPerPerson; // Sem margem
            }

            totalPrice += dishPricePerPerson;
            console.log(`   ✅ Calculado com ${portionsPerPerson} porções: custo=R$ ${dishCostPerPerson.toFixed(2)}, preço=R$ ${dishPricePerPerson.toFixed(2)}`);

            // DEPRECATED: Código de fallback removido (não é mais necessário)
            if (false) {
                console.warn(`   ⚠️ Valores não encontrados, recalculando (cardápio antigo)`);

                const dishCost = item.dishCost || 0;
                const portionsPerPerson = item.portionsPerPerson || 0;
                const totalWeight = item.totalWeight || 0;

                // Calcular custo por pessoa
                let dishCostPerPerson = 0;

                if (item.servings > 0 && totalWeight === 0) {
                    // Prato por porção
                    const costPerDishPortion = dishCost / item.servings;
                    dishCostPerPerson = costPerDishPortion * portionsPerPerson;
                } else {
                    // Prato por peso
                    const gramsPerPerson = portionsPerPerson * 100;
                    const costPerGram = totalWeight > 0 ? dishCost / totalWeight : dishCost;
                    dishCostPerPerson = costPerGram * gramsPerPerson;
                }

                totalCost += dishCostPerPerson;

                // Calcular preço por pessoa COM margem
                let dishPricePerPerson = 0;

                if (item.profitMargin && item.profitMargin > 0) {
                    dishPricePerPerson = dishCostPerPerson * (1 + item.profitMargin / 100);
                } else if (item.suggestedPrice && item.suggestedPrice > 0) {
                    // suggestedPrice é o preço TOTAL, converter para por pessoa
                    if (item.servings > 0 && totalWeight === 0) {
                        const pricePerDishPortion = item.suggestedPrice / item.servings;
                        dishPricePerPerson = pricePerDishPortion * portionsPerPerson;
                    } else {
                        const gramsPerPerson = portionsPerPerson * 100;
                        const pricePerGram = totalWeight > 0 ? item.suggestedPrice / totalWeight : item.suggestedPrice;
                        dishPricePerPerson = pricePerGram * gramsPerPerson;
                    }
                } else {
                    dishPricePerPerson = dishCostPerPerson; // Sem margem
                }

                totalPrice += dishPricePerPerson;
                console.log(`   🔄 Recalculado: custo=R$ ${dishCostPerPerson.toFixed(2)}, preço=R$ ${dishPricePerPerson.toFixed(2)}`);
            }
        });

        console.log(`📊 TOTAL: totalCost=${totalCost.toFixed(2)}, totalPrice=${totalPrice.toFixed(2)}`);

        const stats = {
            totalDishes: menu.length,
            totalCost: totalCost,
            totalPrice: totalPrice, // ✅ Preço com margem
            byCategory: this.groupByCategory(menu)
        };

        console.log('✅ [MenuManager.getStatistics] Retornando:', stats);
        return stats;
    }

    /**
     * Agrupa pratos por categoria
     * @private
     */
    groupByCategory(menu) {
        // Usar função utilitária genérica
        if (window.statisticsUtils?.groupByWithSum) {
            return window.statisticsUtils.groupByWithSum(menu, 'dishCategory', 'dishCost', 'Sem categoria');
        }

        // Fallback para garantir compatibilidade
        return menu.reduce((acc, item) => {
            const category = item.dishCategory || 'Sem categoria';
            if (!acc[category]) {
                acc[category] = {
                    count: 0,
                    totalCost: 0
                };
            }
            acc[category].count++;
            acc[category].totalCost += item.dishCost || 0;
            return acc;
        }, {});
    }

    /**
     * Gera lista de ingredientes consolidada a partir de um array de pratos
     * Agrupa ingredientes iguais e soma quantidades
     * @param {Array} dishes - Array de pratos do cardápio
     * @param {number} guests - Número de convidados
     * @param {boolean} includeDishTracking - Se true, adiciona campo 'dishes' com origem de cada ingrediente
     * @returns {Promise<Array>} Array de ingredientes consolidados
     */
    async generateIngredientsListFromDishes(dishes, guests, includeDishTracking = false) {
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
                // Prato POR PESO
                const totalWeight = menuItem.totalWeight || 1;

                // ✅ Sempre usar 100g por porção quando checkbox desmarcado (servings é ignorado)
                const gramsPerPerson = portionsPerPerson * 100;
                const totalGramsNeeded = gramsPerPerson * guests;
                portionFactor = totalGramsNeeded / totalWeight;

                console.log(`📊 [${menuItem.dishName}] POR PESO: ${portionsPerPerson} porção(ões) × 100g = ${gramsPerPerson.toFixed(0)}g/pessoa × ${guests} = ${totalGramsNeeded.toFixed(0)}g | Peso prato: ${totalWeight}g | Fator: ${portionFactor.toFixed(2)}x`);
            }

            const dishIngredients = menuItem.dishIngredients || [];
            dishIngredients.forEach(dishIng => {
                const key = dishIng.ingredientId || dishIng.ingredientName;
                const isUnitType = dishIng.unit === 'un' || dishIng.unitType === 'unit';

                // ✅ IMPORTANTE: Usar SEMPRE os valores de perda/rendimento salvos NO PRATO
                // Motivo: O totalWeight do prato foi calculado com esses valores.
                // Se usarmos valores diferentes (do banco), o cálculo fica inconsistente.
                //
                // Exemplo de inconsistência:
                // - Prato criado com: 1000g ingrediente, 20% perda → totalWeight = 800g
                // - Ingrediente atualizado no banco para: 0.2% perda
                // - Se usar 0.2%: 1000g × (1 - 0.2%) = 998g ≠ 800g ❌ ERRADO!

                const lossPercentage = dishIng.lossPercentage || 0;
                const yieldMultiplier = dishIng.yieldMultiplier || 1;

                console.log(`🔍 [MenuManager] Usando valores salvos no prato para ${dishIng.ingredientName}: loss=${lossPercentage}%, yield=${yieldMultiplier}x`);

                // ✅ A quantidade na receita (dishIng.quantity) é a quantidade CRUA
                // Precisamos aplicar perda/rendimento para obter a quantidade PREPARADA do ingrediente no prato

                if (ingredientsMap.has(key)) {
                    const existing = ingredientsMap.get(key);
                    if (isUnitType) {
                        // Para ingredientes por unidade, somar diretamente (não converter)
                        const rawQty = dishIng.quantity;
                        // Aplicar perda e rendimento para obter quantidade preparada
                        const lossMultiplier = 1 - (lossPercentage / 100);
                        const preparedQty = rawQty * lossMultiplier * yieldMultiplier;
                        const liquidQty = preparedQty * portionFactor;
                        existing.totalQuantity += liquidQty;

                        // ✅ Acumular perda/rendimento ponderados para média
                        existing.weightedLoss = (existing.weightedLoss || 0) + (preparedQty * lossPercentage);
                        existing.weightedYield = (existing.weightedYield || 0) + (preparedQty * yieldMultiplier);
                        existing.totalPreparedQty = (existing.totalPreparedQty || 0) + preparedQty;
                    } else {
                        // Para ingredientes por peso, converter para gramas
                        const qtyInGrams = this.convertToGrams(dishIng.quantity, dishIng.unit);
                        // Aplicar perda e rendimento para obter quantidade preparada
                        const lossMultiplier = 1 - (lossPercentage / 100);
                        const preparedQtyInGrams = qtyInGrams * lossMultiplier * yieldMultiplier;
                        const liquidQty = preparedQtyInGrams * portionFactor;
                        existing.totalQuantity += liquidQty;

                        // ✅ Acumular perda/rendimento ponderados para média
                        existing.weightedLoss = (existing.weightedLoss || 0) + (preparedQtyInGrams * lossPercentage);
                        existing.weightedYield = (existing.weightedYield || 0) + (preparedQtyInGrams * yieldMultiplier);
                        existing.totalPreparedQty = (existing.totalPreparedQty || 0) + preparedQtyInGrams;
                    }

                    // ✅ Adicionar rastreamento de origem se solicitado
                    if (includeDishTracking && existing.dishes) {
                        existing.dishes.push({
                            dishName: menuItem.dishName,
                            portionsPerPerson: menuItem.portionsPerPerson,
                            quantity: dishIng.quantity,
                            unit: dishIng.unit
                        });
                    }
                } else {
                    if (isUnitType) {
                        // Ingrediente por unidade - aplicar perda/rendimento para obter quantidade preparada
                        const rawQty = dishIng.quantity;
                        const lossMultiplier = 1 - (lossPercentage / 100);
                        const preparedQty = rawQty * lossMultiplier * yieldMultiplier;
                        const liquidQty = preparedQty * portionFactor;

                        const ingredientData = {
                            ingredientId: dishIng.ingredientId,
                            ingredientName: dishIng.ingredientName || dishIng.name,
                            name: dishIng.ingredientName || dishIng.name,
                            totalQuantity: liquidQty,
                            unit: 'un',
                            unitType: 'unit',
                            // ✅ Inicializar valores ponderados para média
                            weightedLoss: preparedQty * lossPercentage,
                            weightedYield: preparedQty * yieldMultiplier,
                            totalPreparedQty: preparedQty
                        };

                        // ✅ Adicionar campos extras se rastreamento ativado
                        if (includeDishTracking) {
                            ingredientData.originalUnit = dishIng.unit;
                            ingredientData.costPerUnit = dishIng.costPerUnit;
                            ingredientData.dishes = [{
                                dishName: menuItem.dishName,
                                portionsPerPerson: menuItem.portionsPerPerson,
                                quantity: dishIng.quantity,
                                unit: dishIng.unit
                            }];
                        }

                        ingredientsMap.set(key, ingredientData);
                    } else {
                        // Ingrediente por peso - aplicar perda/rendimento para obter quantidade preparada
                        const qtyInGrams = this.convertToGrams(dishIng.quantity, dishIng.unit);
                        const lossMultiplier = 1 - (lossPercentage / 100);
                        const preparedQtyInGrams = qtyInGrams * lossMultiplier * yieldMultiplier;
                        const liquidQty = preparedQtyInGrams * portionFactor;

                        const ingredientData = {
                            ingredientId: dishIng.ingredientId,
                            ingredientName: dishIng.ingredientName || dishIng.name,
                            name: dishIng.ingredientName || dishIng.name,
                            totalQuantity: liquidQty,
                            unit: 'g',
                            unitType: 'weight',
                            // ✅ Inicializar valores ponderados para média
                            weightedLoss: preparedQtyInGrams * lossPercentage,
                            weightedYield: preparedQtyInGrams * yieldMultiplier,
                            totalPreparedQty: preparedQtyInGrams
                        };

                        // ✅ Adicionar campos extras se rastreamento ativado
                        if (includeDishTracking) {
                            ingredientData.originalUnit = dishIng.unit;
                            ingredientData.costPerUnit = dishIng.costPerUnit;
                            ingredientData.dishes = [{
                                dishName: menuItem.dishName,
                                portionsPerPerson: menuItem.portionsPerPerson,
                                quantity: dishIng.quantity,
                                unit: dishIng.unit
                            }];
                        }

                        ingredientsMap.set(key, ingredientData);
                    }
                }
            });
        });

        // ✅ Calcular média ponderada de perda/rendimento para cada ingrediente
        const ingredients = Array.from(ingredientsMap.values()).map(ing => {
            // Se tem valores acumulados, calcular média ponderada
            if (ing.totalPreparedQty && ing.totalPreparedQty > 0) {
                const avgLoss = ing.weightedLoss / ing.totalPreparedQty;
                const avgYield = ing.weightedYield / ing.totalPreparedQty;

                console.log(`📊 [MenuManager] ${ing.name}: Média ponderada - Perda: ${avgLoss.toFixed(2)}%, Rendimento: ${avgYield.toFixed(2)}x`);

                return {
                    ...ing,
                    lossPercentage: avgLoss,
                    yieldMultiplier: avgYield,
                    // Remover campos temporários de cálculo
                    weightedLoss: undefined,
                    weightedYield: undefined,
                    totalPreparedQty: undefined
                };
            }

            // Fallback para ingredientes sem valores (não deveria acontecer)
            return {
                ...ing,
                lossPercentage: 0,
                yieldMultiplier: 1
            };
        });

        return ingredients;
    }

    /**
     * Gera lista de ingredientes do cardápio ativo (wrapper)
     * Chama generateIngredientsListFromDishes com rastreamento de origem ativado
     * @param {number} guests - Número de convidados
     * @returns {Promise<Array>} Array de ingredientes consolidados com origem
     */
    async generateIngredientsList(guests) {
        const menu = await this.getActiveMenu();
        return this.generateIngredientsListFromDishes(menu, guests, true);
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
