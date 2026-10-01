/**
 * ===================================================================
 * MENU MANAGER - Gerenciamento de Cardápio (Versão Standalone)
 * ===================================================================
 */

(function() {
    class MenuManager {
        constructor() {
            this.storageKey = 'precificacao_menu';
        }

        addDishToMenu(dish, portionsPerPerson = 1) {
            try {
                const menu = this.getMenu();
                const existingIndex = menu.findIndex(item => item.dishId === dish.id);

                if (existingIndex !== -1) {
                    menu[existingIndex].portionsPerPerson = portionsPerPerson;
                    menu[existingIndex].dishServings = dish.servings || menu[existingIndex].dishServings || 1;
                    menu[existingIndex].totalWeight = dish.totalWeight || menu[existingIndex].totalWeight || 0;
                    menu[existingIndex].updatedAt = new Date().toISOString();
                } else {
                    const menuItem = {
                        id: `menu_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                        dishId: dish.id,
                        dishName: dish.name,
                        dishCategory: dish.category,
                        dishCost: dish.totalCost || 0,
                        dishIngredients: dish.ingredients || [],
                        dishServings: dish.servings || 1, // Número de porções que o prato rende
                        totalWeight: dish.totalWeight || 0, // Peso total do prato em gramas
                        portionsPerPerson: portionsPerPerson, // Quantas porções cada pessoa vai consumir
                        active: true,
                        addedAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    menu.push(menuItem);
                }

                console.log(`💾 [MenuManager] Salvando cardápio (${menu.length} pratos) em localStorage["${this.storageKey}"]`);
                localStorage.setItem(this.storageKey, JSON.stringify(menu));
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

        removeDishFromMenu(menuItemId) {
            try {
                const menu = this.getMenu();
                const filteredMenu = menu.filter(item => item.id !== menuItemId);
                localStorage.setItem(this.storageKey, JSON.stringify(filteredMenu));

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

        updatePortions(menuItemId, portionsPerPerson) {
            try {
                const menu = this.getMenu();
                const itemIndex = menu.findIndex(item => item.id === menuItemId);

                if (itemIndex === -1) {
                    return {
                        success: false,
                        message: 'Item não encontrado no cardápio'
                    };
                }

                menu[itemIndex].portionsPerPerson = portionsPerPerson;
                menu[itemIndex].updatedAt = new Date().toISOString();

                localStorage.setItem(this.storageKey, JSON.stringify(menu));

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

        getMenu() {
            try {
                console.log(`📖 [MenuManager] Lendo cardápio de localStorage["${this.storageKey}"]...`);
                const data = localStorage.getItem(this.storageKey);
                const menu = data ? JSON.parse(data) : [];
                console.log(`📦 [MenuManager] ${menu.length} pratos carregados do localStorage`);
                return menu;
            } catch (error) {
                console.error('Erro ao carregar cardápio:', error);
                return [];
            }
        }

        getActiveMenu() {
            return this.getMenu().filter(item => item.active);
        }

        clearMenu() {
            try {
                localStorage.setItem(this.storageKey, JSON.stringify([]));
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

        getStatistics() {
            const menu = this.getActiveMenu();

            return {
                totalDishes: menu.length,
                totalCost: menu.reduce((sum, item) => {
                    // Calcular custo proporcional: (custo do prato / peso total) × gramas por pessoa
                    const totalWeight = item.totalWeight || 1;
                    const dishCost = item.dishCost || 0;
                    const portionsPerPerson = item.portionsPerPerson || 0;
                    const gramsPerPerson = portionsPerPerson * 100; // 1 porção = 100g
                    const costPerGram = dishCost / totalWeight;
                    const costPerPortion = costPerGram * gramsPerPerson;
                    return sum + costPerPortion;
                }, 0),
                byCategory: this.groupByCategory(menu)
            };
        }

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

        generateIngredientsList(guests) {
            const menu = this.getActiveMenu();
            const ingredientsMap = new Map();

            // Buscar ingredientes do banco para obter % de perda
            const ingredientsDB = this.getIngredientsFromStorage();

            menu.forEach(menuItem => {
                // Converter porções em gramas (1 porção = 100g fixo)
                const portionsPerPerson = menuItem.portionsPerPerson || 0; // Ex: 1 porção
                const totalWeight = menuItem.totalWeight || 1; // Ex: 2000g
                const gramsPerPerson = portionsPerPerson * 100; // 1 porção = 100g FIXO
                const totalGramsNeeded = gramsPerPerson * guests; // Ex: 100g × 100 = 10000g
                const portionFactor = totalGramsNeeded / totalWeight; // Ex: 10000g / 2000g = 5x

                console.log(`📊 [${menuItem.dishName}] ${portionsPerPerson} porção(ões) × 100g = ${gramsPerPerson.toFixed(0)}g/pessoa × ${guests} = ${totalGramsNeeded.toFixed(0)}g | Peso prato: ${totalWeight}g | Fator: ${portionFactor.toFixed(2)}x`);

                menuItem.dishIngredients.forEach(dishIng => {
                    const key = dishIng.ingredientId;

                    // Buscar ingrediente no banco para obter perda
                    const ingredientData = ingredientsDB.find(ing => ing.id === dishIng.ingredientId);
                    const lossPercent = ingredientData ? (parseFloat(ingredientData.perda || ingredientData.loss) || 0) : 0;

                    // Quantidade líquida necessária (proporcional ao consumo)
                    const liquidQty = this.convertToGrams(dishIng.quantity, dishIng.unit) * portionFactor;

                    // Usar módulo de cálculo de perda para aplicar fórmula inversa
                    const qtyToBuy = window.lossCalculations && window.lossCalculations.calculateQuantityWithLoss
                        ? window.lossCalculations.calculateQuantityWithLoss(liquidQty, lossPercent)
                        : (lossPercent > 0 && lossPercent < 1 ? liquidQty / (1 - lossPercent) : liquidQty);

                    console.log(`📋 [${dishIng.ingredientName}] Líquido: ${liquidQty}g, Perda: ${(lossPercent * 100).toFixed(0)}%, Comprar: ${qtyToBuy.toFixed(2)}g`);

                    if (ingredientsMap.has(key)) {
                        const existing = ingredientsMap.get(key);
                        existing.totalQuantity += qtyToBuy;
                        existing.dishes.push({
                            dishName: menuItem.dishName,
                            portionsPerPerson: menuItem.portionsPerPerson,
                            quantity: dishIng.quantity,
                            unit: dishIng.unit
                        });
                    } else {
                        ingredientsMap.set(key, {
                            ingredientId: dishIng.ingredientId,
                            ingredientName: dishIng.ingredientName,
                            totalQuantity: qtyToBuy,
                            unit: 'g',
                            originalUnit: dishIng.unit,
                            costPerUnit: dishIng.costPerUnit,
                            lossPercent: lossPercent,
                            dishes: [{
                                dishName: menuItem.dishName,
                                portionsPerPerson: menuItem.portionsPerPerson,
                                quantity: dishIng.quantity,
                                unit: dishIng.unit
                            }]
                        });
                    }
                });
            });

            return Array.from(ingredientsMap.values());
        }

        getIngredientsFromStorage() {
            try {
                // Tentar carregar de precificacao_event_data primeiro (lugar correto)
                const eventData = localStorage.getItem('precificacao_event_data');
                if (eventData) {
                    const parsed = JSON.parse(eventData);
                    if (parsed.ingredientsDatabase && Array.isArray(parsed.ingredientsDatabase)) {
                        return parsed.ingredientsDatabase;
                    }
                }

                // Fallback: ingredientes-database
                const data = localStorage.getItem('ingredientes-database');
                return data ? JSON.parse(data) : [];
            } catch (error) {
                console.error('Erro ao carregar ingredientes:', error);
                return [];
            }
        }

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
    window.MenuManager = MenuManager;
    window.menuManager = new MenuManager();
    console.log('✅ MenuManager carregado (standalone)');
})();
