/**
 * ===================================================================
 * STORAGE - Gerenciamento de Dados Salvos
 * ===================================================================
 * Gerencia salvamento e carregamento de eventos no localStorage
 */

/**
 * Classe para gerenciar eventos salvos
 */
export class SavedEventsManager {
    constructor(storageKey = 'precificacao_eventos_salvos') {
        this.storageKey = storageKey;
    }

    /**
     * Gera ID único para evento
     * @returns {string} ID único
     */
    generateId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        return `evt_${timestamp}_${random}`;
    }

    /**
     * Retorna todos os eventos salvos
     * @returns {Array} Array de eventos
     */
    getAllEvents() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Erro ao carregar eventos:', error);
            return [];
        }
    }

    /**
     * Salva ou atualiza evento
     * @param {Object} eventData - Dados do evento
     * @returns {Object} Resultado da operação
     */
    saveEvent(eventData) {
        try {
            const events = this.getAllEvents();
            const now = new Date().toISOString();

            // Se tem ID, é atualização
            if (eventData.id) {
                const index = events.findIndex(e => e.id === eventData.id);

                if (index !== -1) {
                    // Atualiza evento existente
                    events[index] = {
                        ...eventData,
                        updatedAt: now
                    };
                } else {
                    // ID não encontrado, cria novo
                    events.push({
                        ...eventData,
                        createdAt: now,
                        updatedAt: now
                    });
                }
            } else {
                // Cria novo evento
                const newEvent = {
                    ...eventData,
                    id: this.generateId(),
                    createdAt: now,
                    updatedAt: now
                };
                events.push(newEvent);
            }

            try {
                localStorage.setItem(this.storageKey, JSON.stringify(events));
            } catch (quotaError) {
                if (quotaError.name === 'QuotaExceededError') {
                    console.error('❌ Quota excedida! Espaço insuficiente no localStorage');
                    return {
                        success: false,
                        message: 'Espaço insuficiente. Por favor, exclua eventos antigos ou imagens grandes.',
                        isQuotaError: true
                    };
                }
                throw quotaError;
            }

            return {
                success: true,
                message: 'Evento salvo com sucesso!',
                id: eventData.id || events[events.length - 1].id
            };
        } catch (error) {
            console.error('Erro ao salvar evento:', error);

            if (error.name === 'QuotaExceededError') {
                return {
                    success: false,
                    message: 'Espaço insuficiente no localStorage. Exclua eventos antigos ou limpe imagens grandes.',
                    isQuotaError: true
                };
            }

            return {
                success: false,
                message: 'Erro ao salvar evento: ' + error.message
            };
        }
    }

    /**
     * Busca evento por ID
     * @param {string} id - ID do evento
     * @returns {Object|null} Evento encontrado ou null
     */
    getEventById(id) {
        const events = this.getAllEvents();
        return events.find(e => e.id === id) || null;
    }

    /**
     * Exclui evento
     * @param {string} id - ID do evento
     * @returns {Object} Resultado da operação
     */
    deleteEvent(id) {
        try {
            const events = this.getAllEvents();
            const filteredEvents = events.filter(e => e.id !== id);

            localStorage.setItem(this.storageKey, JSON.stringify(filteredEvents));

            return {
                success: true,
                message: 'Evento excluído com sucesso!'
            };
        } catch (error) {
            console.error('Erro ao excluir evento:', error);
            return {
                success: false,
                message: 'Erro ao excluir evento'
            };
        }
    }

    /**
     * Duplica evento existente
     * @param {string} id - ID do evento a duplicar
     * @returns {Object} Resultado da operação
     */
    duplicateEvent(id) {
        try {
            const event = this.getEventById(id);

            if (!event) {
                return {
                    success: false,
                    message: 'Evento não encontrado'
                };
            }

            const now = new Date().toISOString();
            const duplicated = {
                ...event,
                id: this.generateId(),
                eventName: `${event.eventName} (Cópia)`,
                createdAt: now,
                updatedAt: now
            };

            const events = this.getAllEvents();
            events.push(duplicated);

            localStorage.setItem(this.storageKey, JSON.stringify(events));

            return {
                success: true,
                message: 'Evento duplicado com sucesso!',
                id: duplicated.id
            };
        } catch (error) {
            console.error('Erro ao duplicar evento:', error);
            return {
                success: false,
                message: 'Erro ao duplicar evento'
            };
        }
    }

    /**
     * Retorna eventos ordenados por data de atualização (mais recente primeiro)
     * @returns {Array} Array de eventos ordenados
     */
    getSortedByDate() {
        const events = this.getAllEvents();
        return events.sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.createdAt || 0);
            const dateB = new Date(b.updatedAt || b.createdAt || 0);
            return dateB - dateA; // Mais recente primeiro
        });
    }
}

/**
 * Carrega dados da aplicação do localStorage
 * @returns {Object|null} Dados salvos ou null
 */
export function loadFromLocalStorage() {
    try {
        const data = localStorage.getItem('eventPricingData');
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        return null;
    }
}

/**
 * Salva dados da aplicação no localStorage
 * @param {Object} data - Dados a salvar
 * @returns {Object} Resultado da operação
 */
export function saveToLocalStorage(data) {
    try {
        localStorage.setItem('eventPricingData', JSON.stringify(data));
        return {
            success: true,
            message: 'Dados salvos com sucesso!'
        };
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        return {
            success: false,
            message: 'Erro ao salvar dados'
        };
    }
}

/**
 * Exporta dados para arquivo JSON
 * @param {Object} data - Dados a exportar
 * @param {string} filename - Nome do arquivo
 */
export function exportToJSON(data, filename = 'precificacao-backup.json') {
    try {
        const exportData = {
            version: '1.0.15',
            exportDate: new Date().toISOString(),
            data
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);

        return {
            success: true,
            message: 'Dados exportados com sucesso!'
        };
    } catch (error) {
        console.error('Erro ao exportar dados:', error);
        return {
            success: false,
            message: 'Erro ao exportar dados'
        };
    }
}

/**
 * Importa dados de arquivo JSON
 * @param {File} file - Arquivo JSON
 * @returns {Promise<Object>} Dados importados
 */
export function importFromJSON(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);

                if (imported.data) {
                    resolve({
                        success: true,
                        data: imported.data,
                        version: imported.version
                    });
                } else {
                    reject({
                        success: false,
                        message: 'Formato de arquivo inválido'
                    });
                }
            } catch (error) {
                reject({
                    success: false,
                    message: 'Erro ao ler arquivo'
                });
            }
        };

        reader.onerror = () => {
            reject({
                success: false,
                message: 'Erro ao ler arquivo'
            });
        };

        reader.readAsText(file);
    });
}

/**
 * Limpa todos os dados do localStorage
 * @returns {Object} Resultado da operação
 */
export function clearAllData() {
    try {
        localStorage.clear();
        return {
            success: true,
            message: 'Todos os dados foram limpos!'
        };
    } catch (error) {
        console.error('Erro ao limpar dados:', error);
        return {
            success: false,
            message: 'Erro ao limpar dados'
        };
    }
}

// Criar e exportar instância padrão
export const savedEventsManager = new SavedEventsManager();
