/**
 * STORAGE ADAPTER - Interface Base
 *
 * Define a interface comum que todas as implementações de storage devem seguir.
 * Isto permite trocar entre localStorage e backend sem alterar o código da aplicação.
 */

class StorageAdapter {
    constructor() {
        if (new.target === StorageAdapter) {
            throw new TypeError("Cannot construct StorageAdapter instances directly");
        }
    }

    /**
     * Salva um evento
     * @param {Object} eventData - Dados do evento
     * @returns {Promise<{success: boolean, message: string, event?: Object}>}
     */
    async saveEvent(eventData) {
        throw new Error('Method saveEvent() must be implemented');
    }

    /**
     * Obtém todos os eventos
     * @returns {Promise<Array<Object>>}
     */
    async getAllEvents() {
        throw new Error('Method getAllEvents() must be implemented');
    }

    /**
     * Obtém um evento por ID
     * @param {string} id - ID do evento
     * @returns {Promise<Object|null>}
     */
    async getEventById(id) {
        throw new Error('Method getEventById() must be implemented');
    }

    /**
     * Atualiza um evento
     * @param {string} id - ID do evento
     * @param {Object} eventData - Novos dados
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async updateEvent(id, eventData) {
        throw new Error('Method updateEvent() must be implemented');
    }

    /**
     * Deleta um evento
     * @param {string} id - ID do evento
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async deleteEvent(id) {
        throw new Error('Method deleteEvent() must be implemented');
    }

    /**
     * Duplica um evento
     * @param {string} id - ID do evento a duplicar
     * @returns {Promise<{success: boolean, message: string, event?: Object}>}
     */
    async duplicateEvent(id) {
        throw new Error('Method duplicateEvent() must be implemented');
    }

    /**
     * Gera um ID único para evento
     * @returns {string}
     */
    generateId() {
        return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Valida dados de evento
     * @param {Object} eventData - Dados a validar
     * @returns {{valid: boolean, errors: Array<string>}}
     */
    validateEventData(eventData) {
        const errors = [];

        if (!eventData) {
            errors.push('Dados do evento não fornecidos');
            return { valid: false, errors };
        }

        if (!eventData.name || eventData.name.trim() === '') {
            errors.push('Nome do evento é obrigatório');
        }

        if (!eventData.data) {
            errors.push('Dados do evento estão incompletos');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.StorageAdapter = StorageAdapter;
}
