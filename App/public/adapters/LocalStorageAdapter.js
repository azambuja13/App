/**
 * LOCAL STORAGE ADAPTER
 *
 * Implementação do StorageAdapter usando localStorage do navegador.
 * Usado na versão OFFLINE e como fallback na versão CLOUD.
 */

class LocalStorageAdapter extends StorageAdapter {
    constructor() {
        super();
        this.storageKey = window.APP_CONFIG?.storage?.eventStorageKey || 'eventos-salvos';
        console.log('📦 LocalStorageAdapter inicializado');
    }

    async saveEvent(eventData) {
        try {
            // Validar dados
            const validation = this.validateEventData(eventData);
            if (!validation.valid) {
                return {
                    success: false,
                    message: validation.errors.join(', ')
                };
            }

            const events = await this.getAllEvents();

            // Se já tem ID, é uma atualização
            if (eventData.id) {
                const index = events.findIndex(e => e.id === eventData.id);
                if (index !== -1) {
                    // Atualizar evento existente
                    events[index] = {
                        ...eventData,
                        updatedAt: new Date().toISOString()
                    };

                    try {
                        localStorage.setItem(this.storageKey, JSON.stringify(events));
                        console.log('✅ Evento atualizado no localStorage:', eventData.id);
                        return {
                            success: true,
                            message: 'Evento atualizado com sucesso!',
                            event: events[index]
                        };
                    } catch (quotaError) {
                        if (quotaError.name === 'QuotaExceededError') {
                            // Tentar comprimir imagens antes de salvar
                            console.warn('⚠️ Quota excedida, tentando comprimir imagens...');
                            this.compressEventImages(events[index]);
                            localStorage.setItem(this.storageKey, JSON.stringify(events));
                            return {
                                success: true,
                                message: 'Evento salvo (imagens comprimidas)',
                                event: events[index]
                            };
                        }
                        throw quotaError;
                    }
                }
            }

            // Criar novo evento
            const newEvent = {
                ...eventData,
                id: eventData.id || this.generateId(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            events.push(newEvent);

            try {
                localStorage.setItem(this.storageKey, JSON.stringify(events));
                console.log('✅ Evento salvo no localStorage:', newEvent.id);
                return {
                    success: true,
                    message: 'Evento salvo com sucesso!',
                    event: newEvent
                };
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

        } catch (error) {
            console.error('❌ Erro ao salvar evento no localStorage:', error);

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
     * Comprime imagens em um evento para economizar espaço
     */
    compressEventImages(event) {
        // Remover imagens muito grandes (>500KB em base64)
        if (event.clientData?.photo && event.clientData.photo.length > 500000) {
            console.warn('⚠️ Removendo foto do cliente (muito grande)');
            event.clientData.photo = null;
        }

        if (event.clientData?.logo && event.clientData.logo.length > 500000) {
            console.warn('⚠️ Removendo logo (muito grande)');
            event.clientData.logo = null;
        }

        // Comprimir imagens em pratos se existirem
        if (event.items && Array.isArray(event.items)) {
            event.items.forEach(item => {
                if (item.photo && item.photo.length > 500000) {
                    console.warn('⚠️ Removendo foto do prato (muito grande)');
                    item.photo = null;
                }
            });
        }
    }

    async getAllEvents() {
        try {
            const data = localStorage.getItem(this.storageKey);
            const events = data ? JSON.parse(data) : [];
            console.log(`📋 ${events.length} eventos carregados do localStorage`);
            return events;
        } catch (error) {
            console.error('❌ Erro ao carregar eventos do localStorage:', error);
            return [];
        }
    }

    async getEventById(id) {
        try {
            const events = await this.getAllEvents();
            const event = events.find(e => e.id === id);

            if (!event) {
                console.warn('⚠️ Evento não encontrado:', id);
                return null;
            }

            console.log('✅ Evento encontrado:', id);
            return event;
        } catch (error) {
            console.error('❌ Erro ao buscar evento:', error);
            return null;
        }
    }

    async updateEvent(id, eventData) {
        try {
            const events = await this.getAllEvents();
            const index = events.findIndex(e => e.id === id);

            if (index === -1) {
                return {
                    success: false,
                    message: 'Evento não encontrado'
                };
            }

            events[index] = {
                ...events[index],
                ...eventData,
                id: id, // Garantir que ID não seja sobrescrito
                updatedAt: new Date().toISOString()
            };

            localStorage.setItem(this.storageKey, JSON.stringify(events));

            console.log('✅ Evento atualizado:', id);
            return {
                success: true,
                message: 'Evento atualizado com sucesso!'
            };

        } catch (error) {
            console.error('❌ Erro ao atualizar evento:', error);
            return {
                success: false,
                message: 'Erro ao atualizar evento: ' + error.message
            };
        }
    }

    async deleteEvent(id) {
        try {
            console.log('🗑️ Deletando evento do localStorage:', id);

            let events = await this.getAllEvents();
            const countBefore = events.length;

            events = events.filter(e => e.id !== id);
            const countAfter = events.length;

            if (countBefore === countAfter) {
                console.warn('⚠️ Evento não encontrado para deletar:', id);
                return {
                    success: false,
                    message: 'Evento não encontrado'
                };
            }

            localStorage.setItem(this.storageKey, JSON.stringify(events));

            console.log(`✅ Evento deletado do localStorage: ${id} (${countBefore} → ${countAfter})`);
            return {
                success: true,
                message: 'Evento excluído com sucesso!'
            };

        } catch (error) {
            console.error('❌ Erro ao deletar evento:', error);
            return {
                success: false,
                message: 'Erro ao excluir evento: ' + error.message
            };
        }
    }

    async duplicateEvent(id) {
        try {
            const originalEvent = await this.getEventById(id);

            if (!originalEvent) {
                return {
                    success: false,
                    message: 'Evento original não encontrado'
                };
            }

            const duplicatedEvent = {
                ...originalEvent,
                id: this.generateId(),
                name: originalEvent.name + ' (Cópia)',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const result = await this.saveEvent(duplicatedEvent);

            if (result.success) {
                console.log('✅ Evento duplicado:', duplicatedEvent.id);
                return {
                    success: true,
                    message: 'Evento duplicado com sucesso!',
                    event: duplicatedEvent
                };
            }

            return result;

        } catch (error) {
            console.error('❌ Erro ao duplicar evento:', error);
            return {
                success: false,
                message: 'Erro ao duplicar evento: ' + error.message
            };
        }
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.LocalStorageAdapter = LocalStorageAdapter;
}
