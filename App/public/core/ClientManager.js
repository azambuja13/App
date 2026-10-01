/**
 * ClientManager - Gerenciador de Clientes (MIGRADO)
 * Gerencia cadastro, edição, exclusão e busca de clientes
 *
 * MIGRADO PARA INDEXEDDB:
 * - Usa IndexedDBStorageService com fallback para localStorage
 * - Todos os métodos agora são async
 */

import { smartSave } from '../utils/smart-storage.js';

class ClientManager {
    constructor() {
        this.storageKey = 'precificacao_clients';
        this.storage = null;
        this.init();
    }

    /**
     * Inicializa o storage (IndexedDB ou localStorage)
     */
    async init() {
        if (window.indexedDBStorage) {
            this.storage = window.indexedDBStorage;
            console.log('✅ [ClientManager] Usando IndexedDB');
        } else {
            // Fallback: criar wrapper para localStorage
            this.storage = {
                get: (key, defaultValue) => {
                    try {
                        const data = localStorage.getItem(key);
                        return Promise.resolve(data ? JSON.parse(data) : defaultValue);
                    } catch (error) {
                        console.error('Erro ao ler localStorage:', error);
                        return Promise.resolve(defaultValue);
                    }
                },
                set: async (key, value) => {
                    try {
                        // Usar smartSave para rotear para PostgreSQL ou IndexedDB
                        await smartSave(key, value);
                        return Promise.resolve();
                    } catch (error) {
                        console.error('Erro ao salvar via smartStorage:', error);
                        return Promise.reject(error);
                    }
                }
            };
            console.warn('⚠️ [ClientManager] IndexedDB não disponível, usando localStorage');
        }
    }

    /**
     * Obter todos os clientes
     */
    async getAllClients() {
        try {
            const data = await this.storage.get(this.storageKey, []);
            return data;
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
            return [];
        }
    }

    /**
     * Obter cliente por ID
     */
    async getClientById(id) {
        const clients = await this.getAllClients();
        return clients.find(client => client.id === id);
    }

    /**
     * Salvar ou atualizar cliente
     */
    async saveClient(clientData) {
        try {
            const clients = await this.getAllClients();

            // Validação básica
            if (!clientData.name || !clientData.name.trim()) {
                return {
                    success: false,
                    message: 'Nome do cliente é obrigatório'
                };
            }

            // Se tem ID, é atualização
            if (clientData.id) {
                const index = clients.findIndex(c => c.id === clientData.id);
                if (index !== -1) {
                    clients[index] = {
                        ...clients[index],
                        ...clientData,
                        updatedAt: new Date().toISOString()
                    };
                } else {
                    return {
                        success: false,
                        message: 'Cliente não encontrado'
                    };
                }
            } else {
                // Novo cliente
                const newClient = {
                    id: Date.now(),
                    ...clientData,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                clients.push(newClient);
            }

            await this.storage.set(this.storageKey, clients);

            return {
                success: true,
                message: clientData.id ? 'Cliente atualizado com sucesso' : 'Cliente cadastrado com sucesso',
                client: clientData.id ? clients.find(c => c.id === clientData.id) : clients[clients.length - 1]
            };
        } catch (error) {
            console.error('Erro ao salvar cliente:', error);
            return {
                success: false,
                message: 'Erro ao salvar cliente: ' + error.message
            };
        }
    }

    /**
     * Excluir cliente
     */
    async deleteClient(id) {
        try {
            console.log('🗑️ [ClientManager] deleteClient chamado com ID:', id, 'tipo:', typeof id);

            const clients = await this.getAllClients();
            console.log('📋 [ClientManager] Total de clientes:', clients.length);
            console.log('📋 [ClientManager] IDs dos clientes:', clients.map(c => ({ id: c.id, name: c.name, tipo: typeof c.id })));

            // FIX: Comparar como strings para evitar problemas de tipo (number vs string)
            const index = clients.findIndex(c => String(c.id) === String(id));
            console.log('🔍 [ClientManager] Cliente encontrado no índice:', index);

            if (index === -1) {
                console.error('❌ [ClientManager] Cliente não encontrado com ID:', id);
                return {
                    success: false,
                    message: 'Cliente não encontrado'
                };
            }

            const clienteExcluido = clients[index];
            console.log('🗑️ [ClientManager] Excluindo cliente:', { id: clienteExcluido.id, name: clienteExcluido.name });

            clients.splice(index, 1);
            await this.storage.set(this.storageKey, clients);

            console.log('✅ [ClientManager] Cliente excluído. Clientes restantes:', clients.length);

            return {
                success: true,
                message: 'Cliente excluído com sucesso'
            };
        } catch (error) {
            console.error('❌ [ClientManager] Erro ao excluir cliente:', error);
            return {
                success: false,
                message: 'Erro ao excluir cliente: ' + error.message
            };
        }
    }

    /**
     * Buscar clientes por nome
     */
    async searchClients(query) {
        const clients = await this.getAllClients();
        const normalizedQuery = query.toLowerCase().trim();

        if (!normalizedQuery) {
            return clients;
        }

        return clients.filter(client => {
            const name = (client.name || '').toLowerCase();
            const phone = (client.phone || '').toLowerCase();
            const email = (client.email || '').toLowerCase();

            return name.includes(normalizedQuery) ||
                   phone.includes(normalizedQuery) ||
                   email.includes(normalizedQuery);
        });
    }

    /**
     * Obter estatísticas de clientes
     */
    async getStatistics() {
        const clients = await this.getAllClients();

        return {
            total: clients.length,
            withPhone: clients.filter(c => c.phone && c.phone.trim()).length,
            withEmail: clients.filter(c => c.email && c.email.trim()).length,
            withAddress: clients.filter(c => c.address && c.address.trim()).length
        };
    }
}

// Criar instância global
const clientManager = new ClientManager();

if (typeof window !== 'undefined') {
    window.ClientManager = ClientManager;
    window.clientManager = clientManager;
    console.log('✅ ClientManager inicializado');
}

// Exports ES6 para uso com import
export { ClientManager, clientManager };
