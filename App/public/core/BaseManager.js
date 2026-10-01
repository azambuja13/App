/**
 * ===================================================================
 * BASE MANAGER - Classe Base para Todos os Managers
 * ===================================================================
 *
 * Encapsula operações comuns de storage, cache e tratamento de erros.
 * Todos os managers devem estender esta classe para herdar funcionalidades.
 *
 * BENEFÍCIOS:
 * - Centraliza acesso ao storage (sem localStorage direto)
 * - Implementa cache para melhorar performance
 * - Padroniza tratamento de erros (QuotaExceededError, etc)
 * - Reduz duplicação de código em ~40%
 *
 * @example
 * export class DishManager extends BaseManager {
 *   constructor() {
 *     super('precificacao_pratos');
 *   }
 *
 *   getAllDishes() {
 *     return this.getAll();
 *   }
 * }
 */

import { storageService } from './StorageService.js';

export class BaseManager {
    /**
     * Construtor
     * @param {string} storageKey - Chave para armazenamento
     */
    constructor(storageKey) {
        if (!storageKey) {
            throw new Error('BaseManager requer storageKey');
        }

        this.storageKey = storageKey;

        // Usar IndexedDBStorage se disponível, senão fallback para localStorage
        this.storage = window.indexedDBStorage || storageService;

        // ⚡ Performance: Log removido (executava na inicialização de cada manager)

        // Cache simples para reduzir leituras
        this.cache = null;
        this.cacheTime = null;
        this.cacheTTL = 5000; // 5 segundos de cache
    }

    /**
     * Retorna todos os itens (com cache)
     * @param {boolean} useCache - Se deve usar cache (padrão: true)
     * @returns {Array} Array de itens
     */
    async getAll(useCache = true) {
        try {
            const now = Date.now();

            // Verificar cache válido
            if (useCache && this.cache && this.cacheTime && (now - this.cacheTime < this.cacheTTL)) {
                // ⚡ Performance: Log removido (executava em TODA leitura com cache)
                return this.cache;
            }

            // ⚡ Performance: Logs removidos (executavam em TODA leitura sem cache)

            // Ler do storage (pode ser síncrono ou assíncrono)
            const data = await this.storage.get(this.storageKey, []);

            // ⚡ Performance: Log removido (executava em TODA leitura do storage)

            // Atualizar cache
            this.cache = data;
            this.cacheTime = now;

            return data;
        } catch (error) {
            console.error(`Erro ao carregar ${this.storageKey}:`, error);
            return [];
        }
    }

    /**
     * Salva dados no storage
     * @param {Array} data - Dados a salvar
     * @returns {Object} Resultado da operação
     */
    async save(data) {
        try {
            // Salvar no storage (pode ser síncrono ou assíncrono)
            await this.storage.set(this.storageKey, data);

            // Invalidar cache
            this.clearCache();

            return {
                success: true,
                message: 'Dados salvos com sucesso'
            };
        } catch (error) {
            return this.handleStorageError(error);
        }
    }

    /**
     * Trata erros de storage de forma padronizada
     * @param {Error} error - Erro capturado
     * @returns {Object} Resultado com erro tratado
     */
    handleStorageError(error) {
        console.error(`Erro no storage [${this.storageKey}]:`, error);

        // QuotaExceededError - espaço insuficiente
        if (error.name === 'QuotaExceededError') {
            return {
                success: false,
                message: 'Espaço de armazenamento insuficiente. Por favor, remova itens antigos ou reduza o tamanho de imagens.',
                error: 'QuotaExceededError',
                isQuotaError: true
            };
        }

        // Outros erros
        return {
            success: false,
            message: `Erro ao salvar: ${error.message}`,
            error: error.message
        };
    }

    /**
     * Limpa o cache manualmente
     */
    clearCache() {
        this.cache = null;
        this.cacheTime = null;
    }

    /**
     * Retorna estatísticas de uso do storage
     * @returns {Object} Estatísticas
     */
    getStorageStats() {
        try {
            const data = this.getAll(false); // Sem cache
            const jsonString = JSON.stringify(data);
            const sizeInBytes = new Blob([jsonString]).size;
            const sizeInKB = (sizeInBytes / 1024).toFixed(2);
            const sizeInMB = (sizeInBytes / 1024 / 1024).toFixed(2);

            return {
                key: this.storageKey,
                itemCount: Array.isArray(data) ? data.length : 0,
                sizeInBytes,
                sizeInKB: `${sizeInKB} KB`,
                sizeInMB: `${sizeInMB} MB`
            };
        } catch (error) {
            console.error('Erro ao calcular estatísticas:', error);
            return {
                key: this.storageKey,
                itemCount: 0,
                sizeInBytes: 0,
                error: error.message
            };
        }
    }

    /**
     * Exporta dados para JSON
     * @returns {string} JSON string
     */
    exportToJSON() {
        try {
            const data = this.getAll(false);
            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('Erro ao exportar:', error);
            return null;
        }
    }

    /**
     * Limpa todos os dados (CUIDADO!)
     * @returns {Object} Resultado
     */
    async clearAll() {
        try {
            await this.save([]);
            return {
                success: true,
                message: 'Todos os dados foram removidos'
            };
        } catch (error) {
            return {
                success: false,
                message: 'Erro ao limpar dados',
                error: error.message
            };
        }
    }

    /**
     * Log de debug das informações do manager
     */
    logInfo() {
        const stats = this.getStorageStats();
        console.log(`📊 [${this.constructor.name}] Storage Key: ${this.storageKey}`);
        console.log(`📦 Items: ${stats.itemCount}`);
        console.log(`💾 Size: ${stats.sizeInKB} (${stats.sizeInMB})`);
        console.log(`⏰ Cache: ${this.cache ? 'Ativo' : 'Inativo'}`);
    }
}

// Exportar para uso global (compatibilidade)
if (typeof window !== 'undefined') {
    window.BaseManager = BaseManager;
}
