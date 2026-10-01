/**
 * ===================================================================
 * RESULT - Classe para Padronizar Retornos de Métodos
 * ===================================================================
 *
 * Implementa o Result Pattern para tratamento consistente de sucesso/erro.
 * Elimina inconsistências onde alguns métodos retornam { success, data }
 * e outros retornam { success, dish/menu/proposal }.
 *
 * BENEFÍCIOS:
 * - Padronização total de retornos
 * - Type safety (se migrar para TypeScript)
 * - Facilita tratamento de erros
 * - Código mais limpo e previsível
 *
 * @example
 * // Antes (inconsistente):
 * return { success: true, dish: savedDish };
 * return { success: true, menu: savedMenu };
 *
 * // Depois (padronizado):
 * return Result.ok(savedDish, 'Prato salvo');
 * return Result.ok(savedMenu, 'Cardápio salvo');
 */

export class Result {
    /**
     * Construtor privado (usar métodos estáticos)
     * @param {boolean} success - Se operação foi bem sucedida
     * @param {*} data - Dados retornados (se sucesso)
     * @param {string} message - Mensagem descritiva
     * @param {*} error - Erro detalhado (se falha)
     * @param {Object} metadata - Metadados adicionais
     */
    constructor(success, data = null, message = '', error = null, metadata = {}) {
        this.success = success;
        this.data = data;
        this.message = message;
        this.error = error;
        this.metadata = metadata;
        this.timestamp = new Date().toISOString();
    }

    /**
     * Cria resultado de sucesso
     * @param {*} data - Dados a retornar
     * @param {string} message - Mensagem de sucesso
     * @param {Object} metadata - Metadados opcionais
     * @returns {Result} Resultado de sucesso
     *
     * @example
     * const dish = { id: 1, name: 'Picanha' };
     * return Result.ok(dish, 'Prato salvo com sucesso');
     */
    static ok(data = null, message = 'Operação realizada com sucesso', metadata = {}) {
        return new Result(true, data, message, null, metadata);
    }

    /**
     * Cria resultado de falha
     * @param {string} message - Mensagem de erro
     * @param {*} error - Erro detalhado (opcional)
     * @param {Object} metadata - Metadados opcionais
     * @returns {Result} Resultado de falha
     *
     * @example
     * return Result.fail('Item não encontrado');
     * return Result.fail('Erro ao salvar', error);
     */
    static fail(message, error = null, metadata = {}) {
        // Log automático de erros
        console.error(`❌ [Result.fail] ${message}`, error);

        return new Result(false, null, message, error, metadata);
    }

    /**
     * Cria resultado de erro de quota excedida
     * @param {string} customMessage - Mensagem customizada (opcional)
     * @returns {Result} Resultado de quota excedida
     *
     * @example
     * return Result.quotaExceeded();
     */
    static quotaExceeded(customMessage = null) {
        const message = customMessage ||
            'Espaço de armazenamento insuficiente. Por favor, remova itens antigos ou reduza o tamanho de imagens.';

        return new Result(false, null, message, 'QuotaExceededError', {
            isQuotaError: true,
            errorType: 'quota_exceeded'
        });
    }

    /**
     * Cria resultado de validação falha
     * @param {Array} errors - Array de erros de validação
     * @returns {Result} Resultado de validação
     *
     * @example
     * const errors = [
     *   { field: 'name', message: 'Nome é obrigatório' },
     *   { field: 'price', message: 'Preço deve ser positivo' }
     * ];
     * return Result.validationError(errors);
     */
    static validationError(errors = []) {
        const message = errors.length > 0
            ? errors.map(e => e.message).join(', ')
            : 'Erros de validação';

        return new Result(false, null, message, 'ValidationError', {
            validationErrors: errors,
            errorType: 'validation'
        });
    }

    /**
     * Cria resultado de item não encontrado
     * @param {string} itemType - Tipo do item (ex: 'Prato', 'Proposta')
     * @param {string} id - ID do item (opcional)
     * @returns {Result} Resultado de não encontrado
     *
     * @example
     * return Result.notFound('Prato', dishId);
     */
    static notFound(itemType = 'Item', id = null) {
        const message = id
            ? `${itemType} não encontrado: ${id}`
            : `${itemType} não encontrado`;

        return new Result(false, null, message, 'NotFoundError', {
            itemType,
            id,
            errorType: 'not_found'
        });
    }

    /**
     * Cria resultado de operação não autorizada
     * @param {string} reason - Motivo da negação
     * @returns {Result} Resultado de não autorizado
     *
     * @example
     * return Result.unauthorized('Licença expirada');
     */
    static unauthorized(reason = 'Operação não autorizada') {
        return new Result(false, null, reason, 'UnauthorizedError', {
            errorType: 'unauthorized'
        });
    }

    /**
     * Cria resultado de conflito (ex: item já existe)
     * @param {string} message - Mensagem de conflito
     * @param {*} conflictingData - Dados conflitantes
     * @returns {Result} Resultado de conflito
     *
     * @example
     * return Result.conflict('Prato com este nome já existe', existingDish);
     */
    static conflict(message, conflictingData = null) {
        return new Result(false, conflictingData, message, 'ConflictError', {
            errorType: 'conflict'
        });
    }

    /**
     * Transforma um resultado de sucesso aplicando função ao data
     * @param {Function} fn - Função de transformação
     * @returns {Result} Novo resultado com data transformado
     *
     * @example
     * const result = Result.ok({ price: 100 });
     * const doubled = result.map(data => ({ ...data, price: data.price * 2 }));
     */
    map(fn) {
        if (!this.success) {
            return this;
        }

        try {
            const transformedData = fn(this.data);
            return Result.ok(transformedData, this.message, this.metadata);
        } catch (error) {
            return Result.fail('Erro ao transformar dados', error);
        }
    }

    /**
     * Executa função se resultado for sucesso
     * @param {Function} fn - Função a executar
     * @returns {Result} Este resultado (para chaining)
     *
     * @example
     * result.onSuccess(data => console.log('Salvo:', data));
     */
    onSuccess(fn) {
        if (this.success && fn) {
            fn(this.data);
        }
        return this;
    }

    /**
     * Executa função se resultado for falha
     * @param {Function} fn - Função a executar
     * @returns {Result} Este resultado (para chaining)
     *
     * @example
     * result.onFailure(error => console.error('Erro:', error));
     */
    onFailure(fn) {
        if (!this.success && fn) {
            fn(this.error, this.message);
        }
        return this;
    }

    /**
     * Converte para formato legado (compatibilidade)
     * @returns {Object} Objeto no formato antigo
     *
     * @example
     * const result = Result.ok(dish, 'Salvo');
     * const legacy = result.toLegacy(); // { success: true, dish: {...}, message: '...' }
     */
    toLegacy(dataKey = 'data') {
        const base = {
            success: this.success,
            message: this.message || (this.success ? 'Operação realizada com sucesso' : 'Erro ao realizar operação')
        };

        if (this.success) {
            base[dataKey] = this.data;
        } else {
            base.error = this.error;
            if (this.metadata.isQuotaError) {
                base.isQuotaError = true;
            }
            if (this.metadata.validationErrors) {
                base.errors = this.metadata.validationErrors;
            }
        }

        return base;
    }

    /**
     * Converte para JSON
     * @returns {Object} Representação JSON
     */
    toJSON() {
        return {
            success: this.success,
            data: this.data,
            message: this.message,
            error: this.error,
            metadata: this.metadata,
            timestamp: this.timestamp
        };
    }

    /**
     * Representação em string
     * @returns {string} String descritiva
     */
    toString() {
        return this.success
            ? `✅ Success: ${this.message}`
            : `❌ Failure: ${this.message}`;
    }
}

/**
 * Helper para criar Result a partir de Promise
 * @param {Promise} promise - Promise a executar
 * @param {string} errorMessage - Mensagem de erro padrão
 * @returns {Promise<Result>} Promise que resolve para Result
 *
 * @example
 * const result = await fromPromise(
 *   fetch('/api/dishes'),
 *   'Erro ao carregar pratos'
 * );
 */
export async function fromPromise(promise, errorMessage = 'Operação falhou') {
    try {
        const data = await promise;
        return Result.ok(data);
    } catch (error) {
        return Result.fail(errorMessage, error);
    }
}

/**
 * Combina múltiplos Results - só tem sucesso se todos tiverem
 * @param {Array<Result>} results - Array de Results
 * @returns {Result} Result combinado
 *
 * @example
 * const r1 = Result.ok(1);
 * const r2 = Result.ok(2);
 * const combined = Result.combine([r1, r2]); // ok([1, 2])
 */
Result.combine = function(results) {
    const failures = results.filter(r => !r.success);

    if (failures.length > 0) {
        const messages = failures.map(f => f.message).join('; ');
        return Result.fail(messages);
    }

    const data = results.map(r => r.data);
    return Result.ok(data, `${results.length} operações concluídas`);
};

// Exportar também como default
export default Result;

// Expor no window para compatibilidade
if (typeof window !== 'undefined') {
    window.Result = Result;
    window.fromPromise = fromPromise;
}
