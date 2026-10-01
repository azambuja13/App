/**
 * ===================================================================
 * CRUD MANAGER - Classe Base com Operações CRUD Genéricas
 * ===================================================================
 *
 * Estende BaseManager adicionando operações CRUD completas.
 * Elimina código duplicado em todos os managers.
 *
 * BENEFÍCIOS:
 * - Elimina ~200 linhas duplicadas por manager
 * - Padroniza CRUD em toda aplicação
 * - Integra com Result pattern
 * - Integra com EventBus
 * - Soft delete por padrão
 *
 * @example
 * export class DishManager extends CrudManager {
 *   constructor() {
 *     super({
 *       storageKey: 'precificacao_pratos',
 *       entityName: 'Prato',
 *       idPrefix: 'dish'
 *     });
 *   }
 *
 *   // Apenas métodos específicos de negócio
 *   calculateDishCost(ingredients) {
 *     return calculateIngredientsCost(ingredients);
 *   }
 * }
 */

import { BaseManager } from './BaseManager.js';
import { Result } from './Result.js';
import { generateId } from '../utils/id-generator.js';
import { eventBus, Events } from './EventBus.js';

export class CrudManager extends BaseManager {
    /**
     * Construtor
     * @param {Object} options - Opções de configuração
     * @param {string} options.storageKey - Chave do storage
     * @param {string} options.entityName - Nome da entidade (ex: 'Prato')
     * @param {string} options.idPrefix - Prefixo para IDs (ex: 'dish')
     * @param {string} options.eventPrefix - Prefixo para eventos (ex: 'dish')
     */
    constructor({ storageKey, entityName = 'Item', idPrefix = 'item', eventPrefix = null }) {
        super(storageKey);

        this.entityName = entityName;
        this.idPrefix = idPrefix;
        this.eventPrefix = eventPrefix || idPrefix; // Se não especificar, usa idPrefix
    }

    /**
     * Gera ID único para esta entidade
     * @returns {string} ID único
     */
    generateId() {
        return generateId(this.idPrefix);
    }

    /**
     * Retorna todos os itens ativos (não deletados)
     * @param {boolean} useCache - Se deve usar cache
     * @returns {Promise<Array>} Array de itens ativos
     */
    async getActive(useCache = true) {
        const all = await this.getAll(useCache);
        return all.filter(item => item.isActive !== false);
    }

    /**
     * Busca item por ID
     * @param {string} id - ID do item
     * @param {boolean} includeInactive - Se deve incluir inativos
     * @returns {Promise<*|null>} Item ou null
     */
    async getById(id, includeInactive = false) {
        const items = includeInactive
            ? await this.getAll()
            : await this.getActive();

        return items.find(item => item.id === id) || null;
    }

    /**
     * Busca itens por IDs (batch)
     * @param {Array<string>} ids - Array de IDs
     * @returns {Promise<Array>} Array de itens encontrados
     */
    async getByIds(ids) {
        const all = await this.getAll();
        return all.filter(item => ids.includes(item.id));
    }

    /**
     * Busca itens por propriedade
     * @param {string} key - Propriedade a filtrar
     * @param {*} value - Valor esperado
     * @returns {Promise<Array>} Array de itens
     *
     * @example
     * const dishes = await dishManager.findBy('category', 'Carnes');
     */
    async findBy(key, value) {
        const items = await this.getActive();
        return items.filter(item => item[key] === value);
    }

    /**
     * Busca um único item por propriedade
     * @param {string} key - Propriedade a filtrar
     * @param {*} value - Valor esperado
     * @returns {Promise<*|null>} Primeiro item encontrado ou null
     */
    async findOneBy(key, value) {
        const items = await this.findBy(key, value);
        return items[0] || null;
    }

    /**
     * Busca itens por texto (busca fuzzy)
     * @param {string} searchTerm - Termo de busca
     * @param {Array<string>} fields - Campos para buscar (padrão: ['name'])
     * @returns {Promise<Array>} Itens encontrados
     *
     * @example
     * const results = await dishManager.search('picanha', ['name', 'description']);
     */
    async search(searchTerm, fields = ['name']) {
        if (!searchTerm) return [];

        const term = searchTerm.toLowerCase().trim();
        const items = await this.getActive();

        return items.filter(item => {
            return fields.some(field => {
                const value = item[field];
                if (!value) return false;

                return String(value).toLowerCase().includes(term);
            });
        });
    }

    /**
     * Salva ou atualiza item
     * @param {Object} data - Dados a salvar
     * @param {Object} options - Opções adicionais
     * @returns {Promise<Result>} Resultado da operação
     */
    async saveItem(data, options = {}) {
        console.log('🔵 [CrudManager.saveItem] INÍCIO - entityName:', this.entityName);
        console.log('🔵 [CrudManager.saveItem] data.id:', data.id);
        console.log('🔵 [CrudManager.saveItem] Boolean(data.id):', Boolean(data.id));

        try {
            const items = await this.getAll(false); // Sem cache
            const now = new Date().toISOString();
            const isUpdate = Boolean(data.id);

            console.log('🔵 [CrudManager.saveItem] isUpdate:', isUpdate);
            console.log('🔵 [CrudManager.saveItem] now:', now);

            let savedItem;
            let eventName;

            if (isUpdate) {
                // Atualização
                const index = items.findIndex(item => item.id === data.id);

                if (index === -1) {
                    return Result.notFound(this.entityName, data.id);
                }

                // Emitir evento beforeUpdate (pode cancelar)
                eventName = `${this.eventPrefix}:beforeUpdate`;
                const beforeResult = eventBus.emit(eventName, { id: data.id, data, existing: items[index] });

                if (beforeResult?.cancelled) {
                    return Result.fail(beforeResult.reason || 'Operação cancelada');
                }

                // Atualizar item
                // Se createdAt do item original for inválido, usar o atual
                const validCreatedAt = items[index].createdAt && !isNaN(new Date(items[index].createdAt).getTime())
                    ? items[index].createdAt
                    : now;

                items[index] = {
                    ...items[index],
                    ...data,
                    id: data.id, // Garantir que ID não mude
                    createdAt: validCreatedAt, // Preservar data de criação original (ou corrigir se inválida)
                    isActive: data.isActive !== undefined ? data.isActive : items[index].isActive,
                    updatedAt: now
                };

                savedItem = items[index];
                eventName = `${this.eventPrefix}:updated`;

            } else {
                // Criação
                eventName = `${this.eventPrefix}:beforeCreate`;
                const beforeResult = eventBus.emit(eventName, { data });

                if (beforeResult?.cancelled) {
                    return Result.fail(beforeResult.reason || 'Operação cancelada');
                }

                // Criar novo item
                console.log('🆕 [CrudManager] Criando novo item:', this.entityName);
                console.log('📅 [CrudManager] now =', now);
                console.log('📋 [CrudManager] data.createdAt =', data.createdAt);

                savedItem = {
                    ...data,
                    id: this.generateId(),
                    isActive: true,
                    isFavorite: data.isFavorite || false,
                    createdAt: now,
                    updatedAt: now
                };

                console.log('✅ [CrudManager] savedItem.createdAt =', savedItem.createdAt);

                items.push(savedItem);
                eventName = `${this.eventPrefix}:created`;
            }

            // Salvar no storage
            const saveResult = await this.save(items);

            if (!saveResult.success) {
                return Result.fail(saveResult.message, saveResult.error);
            }

            // Emitir evento de sucesso
            eventBus.emitAsync(eventName, { item: savedItem });

            const message = isUpdate
                ? `${this.entityName} atualizado com sucesso`
                : `${this.entityName} criado com sucesso`;

            return Result.ok(savedItem, message);

        } catch (error) {
            console.error(`Erro ao salvar ${this.entityName}:`, error);
            return Result.fail(`Erro ao salvar ${this.entityName}`, error);
        }
    }

    /**
     * Deleta item (soft delete por padrão)
     * @param {string} id - ID do item
     * @param {boolean} permanent - Se true, deleta permanentemente
     * @returns {Promise<Result>} Resultado da operação
     */
    async deleteItem(id, permanent = false) {
        try {
            const items = await this.getAll(false);
            const item = items.find(i => i.id === id);

            if (!item) {
                return Result.notFound(this.entityName, id);
            }

            // Emitir evento beforeDelete (pode cancelar)
            const eventName = `${this.eventPrefix}:beforeDelete`;
            const beforeResult = eventBus.emit(eventName, { id, item });

            if (beforeResult?.cancelled) {
                return Result.fail(beforeResult.reason || 'Operação cancelada');
            }

            if (permanent) {
                // Hard delete
                const filtered = items.filter(i => i.id !== id);
                const saveResult = await this.save(filtered);

                if (!saveResult.success) {
                    return Result.fail(saveResult.message, saveResult.error);
                }

            } else {
                // Soft delete
                item.isActive = false;
                item.deletedAt = new Date().toISOString();

                const saveResult = await this.save(items);

                if (!saveResult.success) {
                    return Result.fail(saveResult.message, saveResult.error);
                }
            }

            // Emitir evento de sucesso
            eventBus.emitAsync(`${this.eventPrefix}:deleted`, { id, item, permanent });

            return Result.ok(
                { id, permanent },
                `${this.entityName} deletado com sucesso`
            );

        } catch (error) {
            console.error(`Erro ao deletar ${this.entityName}:`, error);
            return Result.fail(`Erro ao deletar ${this.entityName}`, error);
        }
    }

    /**
     * Duplica um item
     * @param {string} id - ID do item a duplicar
     * @param {Object} overrides - Propriedades a sobrescrever
     * @returns {Promise<Result>} Resultado com item duplicado
     *
     * @example
     * const result = await dishManager.duplicate('dish_123', { name: 'Cópia Modificada' });
     */
    async duplicate(id, overrides = {}) {
        try {
            const original = await this.getById(id);

            if (!original) {
                return Result.notFound(this.entityName, id);
            }

            // Criar cópia
            const duplicate = {
                ...original,
                ...overrides,
                id: null, // Novo ID será gerado
                name: overrides.name || `${original.name} (Cópia)`,
                isFavorite: false,
                isActive: true,
                createdAt: undefined, // undefined permite que saveItem gere nova data
                updatedAt: undefined,
                deletedAt: null
            };

            const result = await this.saveItem(duplicate);

            if (result.success) {
                eventBus.emitAsync(`${this.eventPrefix}:duplicated`, {
                    originalId: id,
                    duplicateId: result.data.id
                });
            }

            return result;

        } catch (error) {
            console.error(`Erro ao duplicar ${this.entityName}:`, error);
            return Result.fail(`Erro ao duplicar ${this.entityName}`, error);
        }
    }

    /**
     * Marca/desmarca item como favorito
     * @param {string} id - ID do item
     * @returns {Promise<Result>} Resultado da operação
     */
    async toggleFavorite(id) {
        try {
            const item = await this.getById(id);

            if (!item) {
                return Result.notFound(this.entityName, id);
            }

            const updated = {
                ...item,
                isFavorite: !item.isFavorite
            };

            return this.saveItem(updated);

        } catch (error) {
            console.error(`Erro ao marcar favorito:`, error);
            return Result.fail('Erro ao marcar favorito', error);
        }
    }

    /**
     * Retorna itens favoritos
     * @returns {Promise<Array>} Array de favoritos
     */
    async getFavorites() {
        const items = await this.getActive();
        return items.filter(item => item.isFavorite);
    }

    /**
     * Conta itens ativos
     * @returns {Promise<number>} Quantidade
     */
    async count() {
        const items = await this.getActive();
        return items.length;
    }

    /**
     * Verifica se item existe
     * @param {string} id - ID do item
     * @returns {Promise<boolean>} True se existe
     */
    async exists(id) {
        const item = await this.getById(id);
        return item !== null;
    }

    /**
     * Retorna estatísticas básicas
     * @returns {Promise<Object>} Estatísticas
     */
    async getStatistics() {
        const all = await this.getAll();
        const active = all.filter(i => i.isActive !== false);
        const deleted = all.filter(i => i.isActive === false);
        const favorites = active.filter(i => i.isFavorite);

        return {
            total: active.length,  // ✅ Mudado: mostrar apenas ativos, não todos
            active: active.length,
            deleted: deleted.length,
            favorites: favorites.length,
            storageStats: this.getStorageStats()
        };
    }

    /**
     * Importa itens de JSON
     * @param {string} jsonString - JSON string
     * @param {Object} options - Opções de importação
     * @returns {Promise<Result>} Resultado da importação
     */
    async importFromJSON(jsonString, options = {}) {
        try {
            const importedItems = JSON.parse(jsonString);

            if (!Array.isArray(importedItems)) {
                return Result.fail('Formato inválido - esperado array de itens');
            }

            const items = await this.getAll();
            const now = new Date().toISOString();
            let imported = 0;
            let skipped = 0;

            for (const importedItem of importedItems) {
                // Verificar se já existe (se tiver ID)
                if (importedItem.id) {
                    const exists = items.some(i => i.id === importedItem.id);
                    if (exists && !options.overwrite) {
                        skipped++;
                        continue;
                    }
                }

                // Adicionar com novo ID
                items.push({
                    ...importedItem,
                    id: this.generateId(),
                    isActive: true,
                    createdAt: now,
                    updatedAt: now
                });

                imported++;
            }

            if (imported > 0) {
                await this.save(items);
            }

            return Result.ok(
                { imported, skipped },
                `${imported} ${this.entityName}(s) importado(s) com sucesso`
            );

        } catch (error) {
            console.error('Erro ao importar:', error);
            return Result.fail('Erro ao importar dados', error);
        }
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.CrudManager = CrudManager;
}

export default CrudManager;
