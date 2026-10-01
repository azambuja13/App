/**
 * ===================================================================
 * STORAGE SERVICE - Camada de Abstração para Persistência
 * ===================================================================
 * Centraliza acesso ao localStorage com tratamento de erros,
 * facilitando testes e futura migração para outros tipos de storage
 *
 * REFATORADO em 14/10/2025:
 * - Adicionado suporte a Result pattern
 * - Melhorado tratamento de quota exceeded
 * - Adiciona métodos getWithResult e setWithResult
 */

/**
 * Classe para gerenciar persistência de dados
 */
export class StorageService {
    constructor(storage = localStorage) {
        this.storage = storage;
    }

    /**
     * Obtém valor com Result pattern
     * @param {string} key - Chave do item
     * @param {*} defaultValue - Valor padrão
     * @returns {Object} { success, data, error }
     */
    getWithResult(key, defaultValue = null) {
        try {
            const value = this.storage.getItem(key);
            if (value === null) {
                return {
                    success: true,
                    data: defaultValue,
                    message: 'Chave não encontrada, retornando valor padrão'
                };
            }
            return {
                success: true,
                data: JSON.parse(value),
                message: 'Dados carregados com sucesso'
            };
        } catch (error) {
            console.error(`[StorageService] Erro ao ler "${key}":`, error);
            return {
                success: false,
                data: defaultValue,
                error: error.message,
                message: `Erro ao carregar dados da chave "${key}"`
            };
        }
    }

    /**
     * Armazena valor com Result pattern
     * @param {string} key - Chave do item
     * @param {*} value - Valor a armazenar
     * @returns {Object} { success, message, error }
     */
    setWithResult(key, value) {
        try {
            this.storage.setItem(key, JSON.stringify(value));
            return {
                success: true,
                message: 'Dados salvos com sucesso'
            };
        } catch (error) {
            console.error(`[StorageService] Erro ao salvar "${key}":`, error);

            let message = `Erro ao salvar dados na chave "${key}"`;
            if (error.name === 'QuotaExceededError') {
                message = 'Limite de armazenamento excedido! Considere limpar dados antigos.';
                console.error('[StorageService]', message);
            }

            return {
                success: false,
                error: error.message,
                message
            };
        }
    }

    /**
     * Obtém valor do storage
     * @param {string} key - Chave do item
     * @param {*} defaultValue - Valor padrão se não encontrar
     * @returns {*} Valor armazenado ou defaultValue
     */
    get(key, defaultValue = null) {
        try {
            const value = this.storage.getItem(key);
            if (value === null) {
                return defaultValue;
            }
            return JSON.parse(value);
        } catch (error) {
            console.error(`[StorageService] Erro ao ler "${key}":`, error);
            return defaultValue;
        }
    }

    /**
     * Armazena valor no storage
     * @param {string} key - Chave do item
     * @param {*} value - Valor a armazenar
     * @returns {boolean} Sucesso da operação
     */
    set(key, value) {
        try {
            this.storage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`[StorageService] Erro ao salvar "${key}":`, error);

            // Verificar se é erro de quota
            if (error.name === 'QuotaExceededError') {
                console.error('[StorageService] Limite de armazenamento excedido!');
            }

            return false;
        }
    }

    /**
     * Remove item do storage
     * @param {string} key - Chave do item
     * @returns {boolean} Sucesso da operação
     */
    remove(key) {
        try {
            this.storage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`[StorageService] Erro ao remover "${key}":`, error);
            return false;
        }
    }

    /**
     * Limpa todo o storage
     * @returns {boolean} Sucesso da operação
     */
    clear() {
        try {
            this.storage.clear();
            return true;
        } catch (error) {
            console.error('[StorageService] Erro ao limpar storage:', error);
            return false;
        }
    }

    /**
     * Verifica se chave existe
     * @param {string} key - Chave do item
     * @returns {boolean} True se existe
     */
    has(key) {
        try {
            return this.storage.getItem(key) !== null;
        } catch (error) {
            console.error(`[StorageService] Erro ao verificar "${key}":`, error);
            return false;
        }
    }

    /**
     * Obtém todas as chaves
     * @returns {string[]} Array de chaves
     */
    keys() {
        try {
            return Object.keys(this.storage);
        } catch (error) {
            console.error('[StorageService] Erro ao listar chaves:', error);
            return [];
        }
    }

    /**
     * Obtém tamanho aproximado do storage em bytes
     * @returns {number} Tamanho em bytes
     */
    getSize() {
        try {
            let size = 0;
            for (let key in this.storage) {
                if (this.storage.hasOwnProperty(key)) {
                    size += this.storage[key].length + key.length;
                }
            }
            return size;
        } catch (error) {
            console.error('[StorageService] Erro ao calcular tamanho:', error);
            return 0;
        }
    }

    /**
     * Obtém tamanho formatado
     * @returns {string} Tamanho formatado (KB, MB)
     */
    getSizeFormatted() {
        const bytes = this.getSize();
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    /**
     * Obtém ou cria valor
     * @param {string} key - Chave do item
     * @param {Function} factory - Função para criar valor se não existir
     * @returns {*} Valor armazenado ou criado
     */
    getOrCreate(key, factory) {
        if (this.has(key)) {
            return this.get(key);
        }
        const value = factory();
        this.set(key, value);
        return value;
    }

    /**
     * Atualiza valor parcialmente (merge)
     * @param {string} key - Chave do item
     * @param {Object} updates - Atualizações a aplicar
     * @returns {boolean} Sucesso da operação
     */
    update(key, updates) {
        try {
            const current = this.get(key, {});
            const updated = { ...current, ...updates };
            return this.set(key, updated);
        } catch (error) {
            console.error(`[StorageService] Erro ao atualizar "${key}":`, error);
            return false;
        }
    }

    /**
     * Busca por padrão na chave
     * @param {string} pattern - Padrão para buscar (regex string)
     * @returns {Object} Objeto com chaves encontradas e seus valores
     */
    search(pattern) {
        try {
            const regex = new RegExp(pattern);
            const results = {};

            for (let key of this.keys()) {
                if (regex.test(key)) {
                    results[key] = this.get(key);
                }
            }

            return results;
        } catch (error) {
            console.error('[StorageService] Erro ao buscar:', error);
            return {};
        }
    }

    /**
     * Exporta dados do storage
     * @param {string[]} keys - Chaves específicas (opcional)
     * @returns {Object} Dados exportados
     */
    export(keys = null) {
        try {
            const data = {};
            const keysToExport = keys || this.keys();

            for (let key of keysToExport) {
                data[key] = this.get(key);
            }

            return data;
        } catch (error) {
            console.error('[StorageService] Erro ao exportar:', error);
            return {};
        }
    }

    /**
     * Importa dados para o storage
     * @param {Object} data - Dados a importar
     * @param {boolean} merge - Se true, faz merge com dados existentes
     * @returns {boolean} Sucesso da operação
     */
    import(data, merge = false) {
        try {
            if (!merge) {
                this.clear();
            }

            for (let [key, value] of Object.entries(data)) {
                this.set(key, value);
            }

            return true;
        } catch (error) {
            console.error('[StorageService] Erro ao importar:', error);
            return false;
        }
    }
}

// Criar e exportar instância padrão
export const storageService = new StorageService();

// Exportar também como default
export default storageService;
