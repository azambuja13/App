/**
 * WebSocket Service
 * Gerencia conexão WebSocket para sincronização em tempo real
 */

// Socket.io já está carregado via CDN no HTML como window.io
// Não precisamos importar

class WebSocketService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.listeners = new Map();
    }

    /**
     * Conectar ao servidor WebSocket
     * @param {string} token - JWT token para autenticação
     */
    connect(token) {
        if (this.socket && this.isConnected) {
            console.log('🔌 WebSocket já conectado');
            return;
        }

        const backendURL = window.APP_CONFIG?.backend?.baseURL || 'https://precificacao-api-production.up.railway.app';

        console.log('🔌 Conectando ao WebSocket...', backendURL);

        // Usar io do window (carregado via CDN)
        if (!window.io) {
            console.error('❌ Socket.io não carregado! Verifique o CDN no HTML.');
            return;
        }

        this.socket = window.io(backendURL, {
            auth: {
                token: token
            },
            transports: ['websocket', 'polling'], // Tentar WebSocket primeiro, depois polling
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        });

        // Eventos de conexão
        this.socket.on('connect', () => {
            console.log('✅ WebSocket conectado:', this.socket.id);
            this.isConnected = true;
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ WebSocket desconectado:', reason);
            this.isConnected = false;
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ Erro de conexão WebSocket:', error.message);
            this.isConnected = false;
        });

        this.socket.on('reconnect', (attemptNumber) => {
            console.log(`🔄 WebSocket reconectado após ${attemptNumber} tentativas`);
            this.isConnected = true;
        });

        this.socket.on('reconnect_attempt', (attemptNumber) => {
            console.log(`🔄 Tentando reconectar WebSocket (tentativa ${attemptNumber})...`);
        });

        this.socket.on('reconnect_error', (error) => {
            console.error('❌ Erro ao reconectar WebSocket:', error.message);
        });

        this.socket.on('reconnect_failed', () => {
            console.error('❌ Falha ao reconectar WebSocket após todas as tentativas');
            this.isConnected = false;
        });
    }

    /**
     * Desconectar do servidor WebSocket
     */
    disconnect() {
        if (this.socket) {
            console.log('🔌 Desconectando WebSocket...');
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.listeners.clear();
        }
    }

    /**
     * Emitir evento para o servidor
     * @param {string} event - Nome do evento
     * @param {any} data - Dados a enviar
     */
    emit(event, data) {
        if (!this.socket || !this.isConnected) {
            console.warn('⚠️ WebSocket não conectado - não é possível emitir evento', event);
            return;
        }

        console.log(`📤 Emitindo evento: ${event}`);
        this.socket.emit(event, data);
    }

    /**
     * Escutar evento do servidor
     * @param {string} event - Nome do evento
     * @param {Function} callback - Função a executar quando evento ocorrer
     */
    on(event, callback) {
        if (!this.socket) {
            console.warn('⚠️ WebSocket não inicializado - não é possível escutar evento', event);
            return;
        }

        console.log(`👂 Escutando evento: ${event}`);

        // Remover listener anterior se existir
        if (this.listeners.has(event)) {
            this.socket.off(event, this.listeners.get(event));
        }

        // Adicionar novo listener
        this.socket.on(event, callback);
        this.listeners.set(event, callback);
    }

    /**
     * Parar de escutar evento
     * @param {string} event - Nome do evento
     */
    off(event) {
        if (!this.socket) {
            return;
        }

        if (this.listeners.has(event)) {
            this.socket.off(event, this.listeners.get(event));
            this.listeners.delete(event);
            console.log(`🔇 Parou de escutar evento: ${event}`);
        }
    }

    /**
     * Sincronizar dados genéricos
     * @param {string} dataType - Tipo de dado (events, ingredients, dishes, etc)
     * @param {object} payload - { operation: 'create'|'update'|'delete', id, data }
     */
    syncData(dataType, payload) {
        if (!this.isSocketConnected()) {
            console.warn(`⚠️ WebSocket não conectado - sync:${dataType} não enviado`);
            return;
        }

        console.log(`📤 Sincronizando ${dataType}:`, payload.operation, payload.id);
        this.emit(`sync:${dataType}`, payload);
    }

    /**
     * Escutar sincronização de dados genéricos
     * @param {string} dataType - Tipo de dado
     * @param {Function} callback - Função a executar quando receber sync
     */
    onSyncData(dataType, callback) {
        this.on(`sync:${dataType}`, (payload) => {
            console.log(`📥 Recebido sync:${dataType}:`, payload.operation, payload.id);
            callback(payload);
        });
    }

    // ========================================================================
    // MÉTODOS ESPECÍFICOS POR TIPO DE DADO
    // ========================================================================

    syncEvent(operation, eventId, eventData) {
        this.syncData('events', { operation, id: eventId, data: eventData });
    }

    onSyncEvent(callback) {
        this.onSyncData('events', callback);
    }

    syncIngredient(operation, ingredientId, ingredientData) {
        this.syncData('ingredients', { operation, id: ingredientId, data: ingredientData });
    }

    onSyncIngredient(callback) {
        this.onSyncData('ingredients', callback);
    }

    syncDish(operation, dishId, dishData) {
        this.syncData('dishes', { operation, id: dishId, data: dishData });
    }

    onSyncDish(callback) {
        this.onSyncData('dishes', callback);
    }

    syncSavedMenu(operation, menuId, menuData) {
        this.syncData('savedMenus', { operation, id: menuId, data: menuData });
    }

    onSyncSavedMenu(callback) {
        this.onSyncData('savedMenus', callback);
    }

    syncClient(operation, clientId, clientData) {
        this.syncData('clients', { operation, id: clientId, data: clientData });
    }

    onSyncClient(callback) {
        this.onSyncData('clients', callback);
    }

    syncCompany(operation, companyData) {
        this.syncData('company', { operation, data: companyData });
    }

    onSyncCompany(callback) {
        this.onSyncData('company', callback);
    }

    syncProposal(operation, proposalId, proposalData) {
        this.syncData('proposals', { operation, id: proposalId, data: proposalData });
    }

    onSyncProposal(callback) {
        this.onSyncData('proposals', callback);
    }

    syncLicense(operation, licenseData) {
        this.syncData('license', { operation, data: licenseData });
    }

    onSyncLicense(callback) {
        this.onSyncData('license', callback);
    }

    /**
     * Sincronizar configurações do usuário (mantido para compatibilidade)
     * @param {object} settings - Configurações a sincronizar
     */
    syncSettings(settings) {
        this.syncData('settings', { operation: 'update', data: settings });
    }

    /**
     * Escutar sincronização de configurações (mantido para compatibilidade)
     * @param {Function} callback - Função a executar quando receber sync
     */
    onSyncSettings(callback) {
        this.onSyncData('settings', callback);
    }

    /**
     * Verificar se está conectado
     * @returns {boolean}
     */
    isSocketConnected() {
        return this.isConnected && this.socket && this.socket.connected;
    }
}

// Exportar instância singleton
export const websocketService = new WebSocketService();

// Expor no window para debug
if (typeof window !== 'undefined') {
    window.websocketService = websocketService;
}
