/**
 * ===================================================================
 * EVENT BUS - Sistema de Eventos para Desacoplar Módulos
 * ===================================================================
 *
 * Implementa padrão Observer/PubSub para comunicação entre managers
 * sem acoplamento direto (sem window.savedMenusManager, etc).
 *
 * BENEFÍCIOS:
 * - Elimina acoplamento entre managers
 * - Facilita testes (mock de eventos)
 * - Extensível (novos listeners sem modificar código)
 * - Auditável (log de todos os eventos)
 *
 * @example
 * // Manager A emite evento
 * eventBus.emit('dish:beforeDelete', { dishId: '123' });
 *
 * // Manager B escuta e pode cancelar
 * eventBus.on('dish:beforeDelete', (data) => {
 *   if (dishIsInUse(data.dishId)) {
 *     return { cancelled: true, reason: 'Prato em uso' };
 *   }
 * });
 */

export class EventBus {
    constructor() {
        // Map de eventos: { eventName: [callbacks] }
        this.events = new Map();

        // Log de eventos emitidos (debug)
        this.eventLog = [];
        this.maxLogSize = 100; // Manter últimos 100 eventos

        // Habilitar logs (para debug)
        this.enableLogging = false;
    }

    /**
     * Registra listener para um evento
     * @param {string} eventName - Nome do evento
     * @param {Function} callback - Função a chamar
     * @returns {Function} Função para remover listener
     *
     * @example
     * const unsubscribe = eventBus.on('dish:created', (data) => {
     *   console.log('Novo prato:', data);
     * });
     *
     * // Depois, para parar de escutar:
     * unsubscribe();
     */
    on(eventName, callback) {
        if (!eventName || typeof callback !== 'function') {
            console.error('EventBus.on: eventName e callback são obrigatórios');
            return () => {};
        }

        // Criar array se não existe
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }

        // Adicionar callback
        this.events.get(eventName).push(callback);

        if (this.enableLogging) {
            console.log(`📢 [EventBus] Listener adicionado: ${eventName}`);
        }

        // Retornar função de unsubscribe
        return () => this.off(eventName, callback);
    }

    /**
     * Registra listener que executa apenas uma vez
     * @param {string} eventName - Nome do evento
     * @param {Function} callback - Função a chamar
     * @returns {Function} Função para remover listener
     *
     * @example
     * eventBus.once('app:ready', () => {
     *   console.log('App pronto - executa só uma vez');
     * });
     */
    once(eventName, callback) {
        const wrappedCallback = (...args) => {
            callback(...args);
            this.off(eventName, wrappedCallback);
        };

        return this.on(eventName, wrappedCallback);
    }

    /**
     * Remove listener de um evento
     * @param {string} eventName - Nome do evento
     * @param {Function} callback - Callback a remover (opcional - remove todos se omitido)
     *
     * @example
     * eventBus.off('dish:created', myCallback);  // Remove callback específico
     * eventBus.off('dish:created');              // Remove todos os callbacks
     */
    off(eventName, callback = null) {
        if (!this.events.has(eventName)) {
            return;
        }

        if (callback === null) {
            // Remove todos os listeners deste evento
            this.events.delete(eventName);
            if (this.enableLogging) {
                console.log(`📢 [EventBus] Todos os listeners removidos: ${eventName}`);
            }
        } else {
            // Remove listener específico
            const callbacks = this.events.get(eventName);
            const filtered = callbacks.filter(cb => cb !== callback);

            if (filtered.length === 0) {
                this.events.delete(eventName);
            } else {
                this.events.set(eventName, filtered);
            }

            if (this.enableLogging) {
                console.log(`📢 [EventBus] Listener removido: ${eventName}`);
            }
        }
    }

    /**
     * Emite um evento, chamando todos os listeners
     * @param {string} eventName - Nome do evento
     * @param {*} data - Dados a passar para listeners
     * @returns {*} Resultado agregado dos listeners (se algum retornar)
     *
     * @example
     * const result = eventBus.emit('dish:beforeDelete', { dishId: '123' });
     * if (result?.cancelled) {
     *   console.log('Operação cancelada:', result.reason);
     * }
     */
    emit(eventName, data = null) {
        // Registrar no log
        this.logEvent(eventName, data);

        if (!this.events.has(eventName)) {
            if (this.enableLogging) {
                console.log(`📢 [EventBus] Evento emitido (sem listeners): ${eventName}`);
            }
            return null;
        }

        const callbacks = this.events.get(eventName);

        if (this.enableLogging) {
            console.log(`📢 [EventBus] Emitindo: ${eventName} para ${callbacks.length} listener(s)`);
        }

        // Executar todos os callbacks
        let lastResult = null;

        for (const callback of callbacks) {
            try {
                const result = callback(data);

                // Se callback retornar algo (ex: { cancelled: true }), guardar
                if (result !== undefined && result !== null) {
                    lastResult = result;

                    // Se retornou cancelled: true, parar propagação
                    if (result.cancelled === true) {
                        if (this.enableLogging) {
                            console.log(`📢 [EventBus] Propagação cancelada: ${eventName}`);
                        }
                        break;
                    }
                }
            } catch (error) {
                console.error(`❌ [EventBus] Erro em listener de ${eventName}:`, error);
            }
        }

        return lastResult;
    }

    /**
     * Emite evento de forma assíncrona (não bloqueia)
     * @param {string} eventName - Nome do evento
     * @param {*} data - Dados do evento
     *
     * @example
     * eventBus.emitAsync('dish:deleted', { dishId: '123' });
     * // Continua execução sem esperar listeners
     */
    emitAsync(eventName, data = null) {
        setTimeout(() => this.emit(eventName, data), 0);
    }

    /**
     * Registra evento no log interno (para debug)
     * @private
     */
    logEvent(eventName, data) {
        this.eventLog.push({
            name: eventName,
            data,
            timestamp: new Date().toISOString()
        });

        // Manter tamanho do log limitado
        if (this.eventLog.length > this.maxLogSize) {
            this.eventLog.shift(); // Remove o mais antigo
        }
    }

    /**
     * Retorna log de eventos
     * @param {number} limit - Número de eventos a retornar (padrão: 20)
     * @returns {Array} Últimos eventos
     *
     * @example
     * const recentEvents = eventBus.getEventLog(10);
     * console.table(recentEvents);
     */
    getEventLog(limit = 20) {
        return this.eventLog.slice(-limit);
    }

    /**
     * Retorna todos os eventos registrados
     * @returns {Array<string>} Nomes dos eventos
     *
     * @example
     * const events = eventBus.getRegisteredEvents();
     * // ['dish:created', 'dish:updated', 'menu:saved', ...]
     */
    getRegisteredEvents() {
        return Array.from(this.events.keys());
    }

    /**
     * Retorna quantidade de listeners para um evento
     * @param {string} eventName - Nome do evento
     * @returns {number} Quantidade de listeners
     *
     * @example
     * const count = eventBus.getListenerCount('dish:created');
     * console.log(`${count} listeners registrados`);
     */
    getListenerCount(eventName) {
        return this.events.has(eventName)
            ? this.events.get(eventName).length
            : 0;
    }

    /**
     * Remove todos os listeners de todos os eventos
     *
     * @example
     * eventBus.clear(); // Limpa tudo
     */
    clear() {
        this.events.clear();
        if (this.enableLogging) {
            console.log('📢 [EventBus] Todos os listeners removidos');
        }
    }

    /**
     * Ativa/desativa logging
     * @param {boolean} enabled - Se deve logar eventos
     */
    setLogging(enabled) {
        this.enableLogging = enabled;
        console.log(`📢 [EventBus] Logging ${enabled ? 'ativado' : 'desativado'}`);
    }

    /**
     * Imprime estatísticas do EventBus
     */
    printStats() {
        console.log('📊 EventBus Statistics:');
        console.log(`  Total de eventos registrados: ${this.events.size}`);
        console.log(`  Total de listeners: ${this.getTotalListenerCount()}`);
        console.log(`  Eventos no log: ${this.eventLog.length}`);
        console.log('\n  Eventos e seus listeners:');

        this.events.forEach((callbacks, eventName) => {
            console.log(`    ${eventName}: ${callbacks.length} listener(s)`);
        });
    }

    /**
     * Retorna total de listeners em todos os eventos
     * @private
     */
    getTotalListenerCount() {
        let total = 0;
        this.events.forEach(callbacks => {
            total += callbacks.length;
        });
        return total;
    }
}

/**
 * Instância singleton global do EventBus
 */
export const eventBus = new EventBus();

/**
 * Eventos padrão da aplicação (documentação)
 */
export const Events = {
    // Eventos de Prato (Dish)
    DISH_BEFORE_CREATE: 'dish:beforeCreate',
    DISH_CREATED: 'dish:created',
    DISH_BEFORE_UPDATE: 'dish:beforeUpdate',
    DISH_UPDATED: 'dish:updated',
    DISH_BEFORE_DELETE: 'dish:beforeDelete',
    DISH_DELETED: 'dish:deleted',
    DISH_DUPLICATED: 'dish:duplicated',

    // Eventos de Cardápio (Menu)
    MENU_BEFORE_CREATE: 'menu:beforeCreate',
    MENU_CREATED: 'menu:created',
    MENU_BEFORE_UPDATE: 'menu:beforeUpdate',
    MENU_UPDATED: 'menu:updated',
    MENU_BEFORE_DELETE: 'menu:beforeDelete',
    MENU_DELETED: 'menu:deleted',
    MENU_LOADED: 'menu:loaded',

    // Eventos de Proposta (Proposal)
    PROPOSAL_BEFORE_CREATE: 'proposal:beforeCreate',
    PROPOSAL_CREATED: 'proposal:created',
    PROPOSAL_BEFORE_UPDATE: 'proposal:beforeUpdate',
    PROPOSAL_UPDATED: 'proposal:updated',
    PROPOSAL_BEFORE_DELETE: 'proposal:beforeDelete',
    PROPOSAL_DELETED: 'proposal:deleted',
    PROPOSAL_STATUS_CHANGED: 'proposal:statusChanged',

    // Eventos de Evento (Event)
    EVENT_BEFORE_CREATE: 'event:beforeCreate',
    EVENT_CREATED: 'event:created',
    EVENT_BEFORE_UPDATE: 'event:beforeUpdate',
    EVENT_UPDATED: 'event:updated',
    EVENT_BEFORE_DELETE: 'event:beforeDelete',
    EVENT_DELETED: 'event:deleted',

    // Eventos de Aplicação
    APP_READY: 'app:ready',
    APP_ERROR: 'app:error',
    STORAGE_QUOTA_EXCEEDED: 'storage:quotaExceeded',
    STORAGE_CLEARED: 'storage:cleared',

    // Eventos de UI
    UI_NOTIFICATION: 'ui:notification',
    UI_CONFIRM: 'ui:confirm',
    UI_LOADING: 'ui:loading'
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.EventBus = EventBus;
    window.eventBus = eventBus;
    window.Events = Events;
}

export default eventBus;
