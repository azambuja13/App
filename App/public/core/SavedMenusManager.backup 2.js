/**
 * ===================================================================
 * SAVED MENUS MANAGER - Gerenciamento de Cardápios Salvos
 * ===================================================================
 * Gerencia templates de cardápios reutilizáveis por tipo de evento
 */

export class SavedMenusManager {
    constructor() {
        this.storageKey = 'precificacao_saved_menus';
    }

    /**
     * Gera ID único para cardápio
     * @returns {string} ID único
     */
    generateId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        return `saved_menu_${timestamp}_${random}`;
    }

    /**
     * Retorna todos os cardápios salvos
     * @returns {Array} Array de cardápios
     */
    getAllMenus() {
        try {
            const data = localStorage.getItem(this.storageKey);
            const menus = data ? JSON.parse(data) : [];

            // Migração automática: garantir que todos os cardápios tenham isActive definido
            let needsMigration = false;
            const migratedMenus = menus.map(menu => {
                if (menu.isActive === undefined) {
                    needsMigration = true;
                    // Cardápios sem isActive definido são considerados ativos (compatibilidade)
                    return { ...menu, isActive: true };
                }
                return menu;
            });

            // Salvar se houve migração
            if (needsMigration) {
                console.log('🔄 Migrando cardápios antigos: adicionando propriedade isActive');
                localStorage.setItem(this.storageKey, JSON.stringify(migratedMenus));
                return migratedMenus;
            }

            return menus;
        } catch (error) {
            console.error('Erro ao carregar cardápios salvos:', error);
            return [];
        }
    }

    /**
     * Retorna apenas cardápios ativos (não deletados)
     * @returns {Array} Array de cardápios ativos
     */
    getActiveMenus() {
        // getAllMenus() já faz migração automática, então aqui todos têm isActive definido
        // Filtro explícito: apenas isActive === true
        return this.getAllMenus().filter(menu => menu.isActive === true);
    }

    /**
     * Retorna cardápio por ID
     * @param {string} menuId - ID do cardápio
     * @returns {Object|null} Cardápio ou null
     */
    getMenuById(menuId) {
        const menus = this.getAllMenus();
        return menus.find(m => m.id === menuId) || null;
    }

    /**
     * Retorna cardápios por tipo de evento
     * @param {string} eventType - Tipo de evento
     * @returns {Array} Array de cardápios
     */
    getMenusByEventType(eventType) {
        return this.getActiveMenus().filter(menu => menu.eventType === eventType);
    }

    /**
     * Retorna cardápios favoritos
     * @returns {Array} Array de cardápios favoritos
     */
    getFavoriteMenus() {
        return this.getActiveMenus().filter(menu => menu.isFavorite);
    }

    /**
     * Busca cardápios por nome ou descrição
     * @param {string} searchTerm - Termo de busca
     * @returns {Array} Array de cardápios
     */
    searchMenus(searchTerm) {
        const term = searchTerm.toLowerCase();
        return this.getActiveMenus().filter(menu =>
            menu.name.toLowerCase().includes(term) ||
            menu.description?.toLowerCase().includes(term) ||
            menu.eventType?.toLowerCase().includes(term)
        );
    }

    /**
     * Salva cardápio atual como template
     * @param {Object} menuData - Dados do cardápio
     * @returns {Object} Resultado da operação
     */
    saveMenu(menuData) {
        try {
            const menus = this.getAllMenus();
            const now = new Date().toISOString();

            // Calcular estatísticas
            const stats = this.calculateMenuStats(menuData.dishes);

            // Se tem ID, é atualização
            if (menuData.id) {
                const index = menus.findIndex(m => m.id === menuData.id);

                if (index !== -1) {
                    menus[index] = {
                        ...menuData,
                        stats,
                        updatedAt: now
                    };
                } else {
                    // ID não encontrado, criar novo
                    menus.push({
                        ...menuData,
                        id: this.generateId(),
                        stats,
                        isActive: true,
                        isFavorite: false,
                        createdAt: now,
                        updatedAt: now
                    });
                }
            } else {
                // Criar novo cardápio
                menus.push({
                    ...menuData,
                    id: this.generateId(),
                    stats,
                    isActive: true,
                    isFavorite: menuData.isFavorite || false,
                    createdAt: now,
                    updatedAt: now
                });
            }

            localStorage.setItem(this.storageKey, JSON.stringify(menus));

            return {
                success: true,
                message: 'Cardápio salvo com sucesso',
                menu: menus[menus.length - 1]
            };
        } catch (error) {
            console.error('Erro ao salvar cardápio:', error);
            return {
                success: false,
                message: 'Erro ao salvar cardápio',
                error: error.message
            };
        }
    }

    /**
     * Calcula estatísticas do cardápio
     * @private
     */
    calculateMenuStats(dishes) {
        if (!dishes || dishes.length === 0) {
            return {
                totalDishes: 0,
                totalCost: 0,
                totalWeight: 0,
                byCategory: {}
            };
        }

        const stats = {
            totalDishes: dishes.length,
            totalCost: 0,
            totalWeight: 0,
            byCategory: {}
        };

        dishes.forEach(dish => {
            // Calcular custo proporcional baseado em porções (1 porção = 100g)
            const totalWeight = dish.totalWeight || 1;
            const baseCost = dish.dishCost || dish.totalCost || 0;
            const portionsPerPerson = dish.portionsPerPerson || 1;
            const gramsPerPerson = portionsPerPerson * 100; // 1 porção = 100g fixo
            const costPerGram = baseCost / totalWeight;
            const dishCost = costPerGram * gramsPerPerson;

            console.log(`💰 [${dish.dishName || 'Sem nome'}] Custo: R$ ${baseCost.toFixed(2)} / ${totalWeight}g = R$ ${costPerGram.toFixed(4)}/g × ${gramsPerPerson}g = R$ ${dishCost.toFixed(2)}`);

            stats.totalCost += dishCost;

            // Peso por pessoa em gramas
            const dishWeight = gramsPerPerson;
            stats.totalWeight += dishWeight;

            // Por categoria
            const category = dish.dishCategory || dish.category || 'Sem categoria';
            if (!stats.byCategory[category]) {
                stats.byCategory[category] = {
                    count: 0,
                    cost: 0,
                    weight: 0
                };
            }
            stats.byCategory[category].count++;
            stats.byCategory[category].cost += dishCost;
            stats.byCategory[category].weight += dishWeight;
        });

        return stats;
    }

    /**
     * Duplica um cardápio
     * @param {string} menuId - ID do cardápio a duplicar
     * @returns {Object} Resultado da operação
     */
    duplicateMenu(menuId) {
        try {
            const menu = this.getMenuById(menuId);
            if (!menu) {
                return {
                    success: false,
                    message: 'Cardápio não encontrado'
                };
            }

            // Criar cópia
            const duplicatedMenu = {
                ...menu,
                id: null, // Novo ID será gerado
                name: `${menu.name} (Cópia)`,
                isFavorite: false,
                createdAt: null,
                updatedAt: null
            };

            return this.saveMenu(duplicatedMenu);
        } catch (error) {
            console.error('Erro ao duplicar cardápio:', error);
            return {
                success: false,
                message: 'Erro ao duplicar cardápio',
                error: error.message
            };
        }
    }

    /**
     * Marca/desmarca cardápio como favorito
     * @param {string} menuId - ID do cardápio
     * @returns {Object} Resultado da operação
     */
    toggleFavorite(menuId) {
        try {
            const menu = this.getMenuById(menuId);
            if (!menu) {
                return {
                    success: false,
                    message: 'Cardápio não encontrado'
                };
            }

            menu.isFavorite = !menu.isFavorite;
            return this.saveMenu(menu);
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
     * Deleta cardápio PERMANENTEMENTE (hard delete)
     * Remove o cardápio completamente do localStorage
     * @param {string} menuId - ID do cardápio
     * @returns {Object} Resultado da operação
     */
    deleteMenu(menuId) {
        try {
            console.log(`🔍 [deleteMenu] Iniciando exclusão do cardápio: ${menuId}`);

            const menu = this.getMenuById(menuId);
            if (!menu) {
                console.error(`❌ [deleteMenu] Cardápio não encontrado: ${menuId}`);
                return {
                    success: false,
                    message: 'Cardápio não encontrado'
                };
            }

            console.log(`📋 [deleteMenu] Cardápio encontrado: "${menu.name}"`);

            // Verificar integridade: cardápio não pode estar em propostas
            const proposalManager = window.proposalManager;
            if (proposalManager) {
                const allProposals = proposalManager.getAllProposals();
                const proposalsUsingMenu = allProposals.filter(proposal =>
                    proposal.isActive !== false &&
                    proposal.selectedMenuId === menuId
                );

                if (proposalsUsingMenu.length > 0) {
                    const proposalNames = proposalsUsingMenu.map(p => p.proposalName || p.proposalNumber).join(', ');
                    console.error(`❌ [deleteMenu] Cardápio em uso por ${proposalsUsingMenu.length} proposta(s)`);
                    return {
                        success: false,
                        message: `❌ Este cardápio não pode ser excluído pois está sendo usado em ${proposalsUsingMenu.length} proposta(s):\n\n${proposalNames}\n\nExclua as propostas primeiro ou edite-as para usar outro cardápio.`
                    };
                }
            }

            // HARD DELETE: Remover completamente do array
            console.log(`🗑️ [deleteMenu] Removendo cardápio "${menu.name}" (ID: ${menuId})`);

            // Buscar TODOS os cardápios diretamente do storage (ignorar cache)
            const storageData = localStorage.getItem(this.storageKey);
            const allMenus = storageData ? JSON.parse(storageData) : [];

            console.log(`📊 [deleteMenu] Total de cardápios ANTES: ${allMenus.length}`);

            // Filtrar removendo o cardápio
            const filteredMenus = allMenus.filter(m => m.id !== menuId);

            console.log(`📊 [deleteMenu] Total de cardápios DEPOIS: ${filteredMenus.length}`);

            // Salvar de volta no localStorage
            localStorage.setItem(this.storageKey, JSON.stringify(filteredMenus));

            // Verificar se foi salvo corretamente
            const verifyData = localStorage.getItem(this.storageKey);
            const verifyMenus = verifyData ? JSON.parse(verifyData) : [];
            const stillExists = verifyMenus.some(m => m.id === menuId);

            if (stillExists) {
                console.error(`❌ [deleteMenu] ERRO: Cardápio ainda existe após exclusão!`);
                return {
                    success: false,
                    message: 'Erro: Cardápio não foi removido corretamente'
                };
            }

            console.log(`✅ [deleteMenu] Cardápio deletado com sucesso! Restam ${filteredMenus.length} cardápios.`);

            return {
                success: true,
                message: 'Cardápio deletado com sucesso',
                deletedMenuId: menuId,
                remainingCount: filteredMenus.length
            };
        } catch (error) {
            console.error('❌ [deleteMenu] Erro ao deletar cardápio:', error);
            return {
                success: false,
                message: 'Erro ao deletar cardápio: ' + error.message,
                error: error.message
            };
        }
    }

    /**
     * Carrega cardápio para o evento atual
     * Converte cardápio salvo em itens do MenuManager
     * @param {string} menuId - ID do cardápio
     * @returns {Object} Resultado da operação com array de pratos
     */
    loadMenuToEvent(menuId) {
        try {
            const menu = this.getMenuById(menuId);
            if (!menu) {
                return {
                    success: false,
                    message: 'Cardápio não encontrado'
                };
            }

            if (!menu.dishes || menu.dishes.length === 0) {
                return {
                    success: false,
                    message: 'Cardápio está vazio'
                };
            }

            return {
                success: true,
                message: `Cardápio "${menu.name}" carregado`,
                dishes: menu.dishes,
                menu: menu
            };
        } catch (error) {
            console.error('Erro ao carregar cardápio:', error);
            return {
                success: false,
                message: 'Erro ao carregar cardápio',
                error: error.message
            };
        }
    }

    /**
     * Exporta cardápios para JSON
     * @returns {string} JSON string
     */
    exportToJSON() {
        const menus = this.getAllMenus();
        return JSON.stringify(menus, null, 2);
    }

    /**
     * Importa cardápios de JSON
     * @param {string} jsonString - JSON string
     * @returns {Object} Resultado da operação
     */
    importFromJSON(jsonString) {
        try {
            const importedMenus = JSON.parse(jsonString);

            if (!Array.isArray(importedMenus)) {
                return {
                    success: false,
                    message: 'Formato inválido - esperado array de cardápios'
                };
            }

            const menus = this.getAllMenus();
            const now = new Date().toISOString();

            // Adicionar cardápios importados com novos IDs
            importedMenus.forEach(menu => {
                menus.push({
                    ...menu,
                    id: this.generateId(),
                    createdAt: now,
                    updatedAt: now
                });
            });

            localStorage.setItem(this.storageKey, JSON.stringify(menus));

            return {
                success: true,
                message: `${importedMenus.length} cardápios importados com sucesso`
            };
        } catch (error) {
            console.error('Erro ao importar cardápios:', error);
            return {
                success: false,
                message: 'Erro ao importar cardápios',
                error: error.message
            };
        }
    }

    /**
     * Retorna estatísticas gerais
     * @returns {Object} Estatísticas
     */
    getStatistics() {
        const menus = this.getActiveMenus();

        return {
            total: menus.length,
            favorites: menus.filter(m => m.isFavorite).length,
            byEventType: this.groupByEventType(menus),
            avgDishesPerMenu: menus.length > 0
                ? menus.reduce((sum, m) => sum + (m.dishes?.length || 0), 0) / menus.length
                : 0
        };
    }

    /**
     * Agrupa cardápios por tipo de evento
     * @private
     */
    groupByEventType(menus) {
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

// Expor para window (browser global)
if (typeof window !== 'undefined') {
    window.SavedMenusManager = SavedMenusManager;
    window.savedMenusManager = savedMenusManager;
}
