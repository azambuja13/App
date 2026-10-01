/**
 * CLOUD STORAGE ADAPTER
 *
 * Implementação do StorageAdapter usando backend PostgreSQL.
 * Inclui cache local e fallback para localStorage quando offline.
 * Usado apenas na versão CLOUD.
 */

class CloudStorageAdapter extends StorageAdapter {
    constructor(apiClient) {
        super();

        if (!apiClient) {
            throw new Error('CloudStorageAdapter requer uma instância de API client');
        }

        this.api = apiClient;
        this.cache = [];
        this.localStorageBackup = new LocalStorageAdapter();
        this.storageKey = (window.APP_CONFIG?.storage?.eventStorageKey || 'eventos-salvos') +
                         (window.APP_CONFIG?.storage?.backupSuffix || '-backup');

        console.log('☁️ CloudStorageAdapter inicializado');
    }

    /**
     * Sincroniza cache com localStorage para backup offline
     */
    syncToLocalStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.cache));
            console.log(`💾 Cache sincronizado com localStorage (${this.cache.length} eventos)`);
        } catch (error) {
            console.warn('⚠️ Erro ao sincronizar cache com localStorage:', error);
        }
    }

    /**
     * Carrega eventos do localStorage (fallback offline)
     */
    loadFromLocalStorage() {
        try {
            const data = localStorage.getItem(this.storageKey);
            this.cache = data ? JSON.parse(data) : [];
            console.log(`📦 ${this.cache.length} eventos carregados do cache local`);
            return this.cache;
        } catch (error) {
            console.error('❌ Erro ao carregar cache local:', error);
            return [];
        }
    }

    /**
     * MÉTODO PARA MIGRAÇÃO: Carrega eventos APENAS do IndexedDB local
     * Não depende do plano do usuário - sempre retorna dados locais
     * Usado pelo MigrationService para enviar dados locais ao backend
     */
    async getLocalEventsForMigration() {
        try {
            const data = localStorage.getItem(this.storageKey);
            const localEvents = data ? JSON.parse(data) : [];
            console.log(`📦 [Migration] ${localEvents.length} eventos no IndexedDB local`);
            return localEvents;
        } catch (error) {
            console.error('❌ Erro ao carregar eventos locais para migração:', error);
            return [];
        }
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

            // Garantir que tem ID
            const eventId = eventData.id || this.generateId();
            const event = {
                ...eventData,
                id: eventId
            };

            // Tentar salvar no backend
            try {
                if (this.api && this.api.eventManager) {
                    // Tentar buscar evento existente (primeiro do cache, depois do backend)
                    let existingEvent = this.api.eventManager.getEventById(eventId);

                    // Se não encontrou no cache, tentar buscar do backend
                    if (!existingEvent && this.api.eventManager.getEventByIdAsync) {
                        console.log('🔍 Buscando evento do backend:', eventId);
                        existingEvent = await this.api.eventManager.getEventByIdAsync(eventId);
                    }

                    if (existingEvent) {
                        console.log('✏️ Evento existe - atualizando:', eventId);
                        await this.api.eventManager.updateEvent(eventId, event);
                        console.log('✅ Evento atualizado no backend:', eventId);
                    } else {
                        console.log('📝 Evento novo - criando:', eventId);
                        await this.api.eventManager.saveEvent(event);
                        console.log('✅ Evento salvo no backend:', eventId);
                    }

                    // Atualizar cache
                    const cacheIndex = this.cache.findIndex(e => e.id === eventId);
                    if (cacheIndex !== -1) {
                        this.cache[cacheIndex] = event;
                    } else {
                        this.cache.push(event);
                    }

                    // Sincronizar com localStorage para backup
                    this.syncToLocalStorage();

                    return {
                        success: true,
                        message: 'Evento salvo com sucesso!',
                        event: event,
                        eventId: eventId
                    };
                } else {
                    throw new Error('Backend não disponível');
                }
            } catch (backendError) {
                console.warn('⚠️ Backend não disponível, usando fallback localStorage:', backendError.message);

                // Fallback para localStorage
                const result = await this.localStorageBackup.saveEvent(event);

                if (result.success) {
                    console.log('💾 Evento salvo em fallback localStorage');
                }

                return result;
            }

        } catch (error) {
            console.error('❌ Erro ao salvar evento:', error);
            return {
                success: false,
                message: 'Erro ao salvar evento: ' + error.message
            };
        }
    }

    async getAllEvents() {
        try {
            // Tentar carregar do backend
            if (this.api && this.api.eventManager) {
                await this.api.eventManager.loadEvents();

                // Mapear eventos do backend com estrutura correta
                const backendEvents = this.api.eventManager.events.map(e => {
                    // PostgreSQL/Prisma retorna 'id' (UUID), não 'event_id'
                    const eventId = e.id || e.event_id;

                    if (e.data) {
                        return {
                            ...e.data,
                            id: eventId,
                            event_id: eventId  // Manter compatibilidade
                        };
                    }
                    return {
                        ...e,
                        id: eventId,
                        event_id: eventId  // Manter compatibilidade
                    };
                });

                // Verificar plano do usuário
                const ConfigHelper = window.ConfigHelper;
                const currentPlan = ConfigHelper ? ConfigHelper.getCurrentPlan() : 'offline';
                const isStandardOrPremium = currentPlan === 'standard' || currentPlan === 'premium';

                if (isStandardOrPremium) {
                    // STANDARD/PREMIUM: Usar APENAS PostgreSQL (fonte única de verdade)
                    this.cache = backendEvents;
                    console.log(`☁️ [${currentPlan.toUpperCase()}] ${backendEvents.length} eventos do PostgreSQL (fonte única)`);

                    // Sincronizar com localStorage apenas para backup offline
                    this.syncToLocalStorage();

                    return this.cache;
                } else {
                    // OFFLINE: Fazer merge de backend + local (comportamento antigo)
                    const localEvents = await this.loadFromLocalStorage() || [];

                    // MERGE: Combinar backend + local sem duplicatas
                    const backendIds = new Set(backendEvents.map(e => e.id || e.event_id));
                    const uniqueLocalEvents = localEvents.filter(e => {
                        const eventId = e.id || e.event_id;
                        return !backendIds.has(eventId);
                    });

                    // Cache = backend + eventos locais únicos
                    this.cache = [...backendEvents, ...uniqueLocalEvents];

                    console.log(`☁️ [OFFLINE] ${backendEvents.length} eventos do backend + ${uniqueLocalEvents.length} eventos locais = ${this.cache.length} total`);

                    // Sincronizar com localStorage para backup
                    this.syncToLocalStorage();

                    return this.cache;
                }
            } else {
                throw new Error('Backend não disponível');
            }

        } catch (error) {
            console.warn('⚠️ Erro ao carregar do backend, usando cache local:', error.message);
            return this.loadFromLocalStorage();
        }
    }

    async getEventById(id) {
        try {
            // Buscar no cache primeiro
            let event = this.cache.find(e => e.id === id);

            if (event) {
                console.log('✅ Evento encontrado no cache:', id);
                return event;
            }

            // Se não está no cache, buscar do backend
            if (this.api && this.api.eventManager) {
                event = this.api.eventManager.getEventById(id);

                if (event) {
                    console.log('✅ Evento encontrado no backend:', id);
                    return event;
                }
            }

            // Fallback: buscar no localStorage
            event = await this.localStorageBackup.getEventById(id);

            if (event) {
                console.log('💾 Evento encontrado no fallback localStorage:', id);
                return event;
            }

            console.warn('⚠️ Evento não encontrado:', id);
            return null;

        } catch (error) {
            console.error('❌ Erro ao buscar evento:', error);
            return null;
        }
    }

    async updateEvent(id, eventData) {
        try {
            // Atualizar no backend
            if (this.api && this.api.eventManager) {
                await this.api.eventManager.updateEvent(id, eventData);
                console.log('✅ Evento atualizado no backend:', id);

                // Atualizar cache
                const cacheIndex = this.cache.findIndex(e => e.id === id);
                if (cacheIndex !== -1) {
                    this.cache[cacheIndex] = {
                        ...this.cache[cacheIndex],
                        ...eventData,
                        id: id,
                        updatedAt: new Date().toISOString()
                    };
                }

                this.syncToLocalStorage();

                return {
                    success: true,
                    message: 'Evento atualizado com sucesso!'
                };
            } else {
                throw new Error('Backend não disponível');
            }

        } catch (error) {
            console.warn('⚠️ Backend não disponível, usando fallback:', error.message);
            return await this.localStorageBackup.updateEvent(id, eventData);
        }
    }

    async deleteEvent(id) {
        try {
            console.log('🗑️ Iniciando exclusão do evento:', id);
            console.log('   Backend disponível?', !!(this.api && this.api.eventManager));

            // Tentar deletar do backend
            if (this.api && this.api.eventManager) {
                try {
                    console.log('   🌐 Deletando do backend...');
                    await this.api.eventManager.deleteEvent(id);
                    console.log('   ✅ Evento deletado do backend:', id);
                } catch (backendError) {
                    console.warn('   ⚠️ Evento não encontrado no backend (será removido do cache):', id);
                    console.warn('   Erro:', backendError.message);
                }

                // Remover do cache
                const countBefore = this.cache.length;
                this.cache = this.cache.filter(e => e.id !== id);
                const countAfter = this.cache.length;

                console.log(`   ✅ Evento removido do cache: ${id} (${countBefore} → ${countAfter})`);

                // Sincronizar com localStorage
                this.syncToLocalStorage();

                return {
                    success: true,
                    message: 'Evento excluído com sucesso!'
                };
            } else {
                throw new Error('Backend não disponível');
            }

        } catch (error) {
            console.warn('⚠️ Backend não disponível, usando fallback:', error.message);
            return await this.localStorageBackup.deleteEvent(id);
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

            // Salvar usando o método saveEvent (que já tem lógica de backend/fallback)
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
    window.CloudStorageAdapter = CloudStorageAdapter;
}
