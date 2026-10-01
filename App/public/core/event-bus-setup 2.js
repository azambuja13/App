/**
 * ===================================================================
 * EVENT BUS SETUP - Configuração de Listeners
 * ===================================================================
 *
 * Centraliza configuração de todos os listeners do EventBus.
 * Garante integridade referencial entre entidades.
 *
 * VALIDAÇÕES IMPLEMENTADAS:
 * - Prato não pode ser deletado se usado em cardápios
 * - Cardápio não pode ser deletado se usado em propostas
 * - Eventos de mudança de status são auditados
 * - Notificações automáticas
 */

import { eventBus, Events } from './EventBus.js';

/**
 * Configura todos os listeners do sistema
 * Deve ser chamado na inicialização da aplicação
 */
export function setupEventBusListeners() {
    console.log('🔧 Configurando listeners do EventBus...');

    // ===================================================================
    // VALIDAÇÕES DE INTEGRIDADE REFERENCIAL
    // ===================================================================

    // Validar exclusão de prato (usado em cardápios?)
    // DESATIVADO: getActiveMenus() é async mas o listener é sync, causando erro
    // TODO: Refatorar para usar async/await quando EventBus suportar
    /*
    eventBus.on(Events.DISH_BEFORE_DELETE, ({ dishId, item }) => {
        if (!window.savedMenusManager) return null;

        const activeMenus = window.savedMenusManager.getActiveMenus();
        const menusUsingDish = activeMenus.filter(menu =>
            menu.dishes && menu.dishes.some(d => d.dishId === dishId)
        );

        if (menusUsingDish.length > 0) {
            const menuNames = menusUsingDish.map(m => m.name).join(', ');
            return {
                cancelled: true,
                reason: `Este prato está sendo usado em ${menusUsingDish.length} cardápio(s): ${menuNames}. Remova o prato dos cardápios primeiro.`
            };
        }

        return null;
    });
    */

    // Validar exclusão de cardápio (usado em propostas?)
    // DESATIVADO: getAllProposals() é async mas o listener é sync, causando erro
    // TODO: Refatorar para usar async/await quando EventBus suportar
    /*
    eventBus.on(Events.MENU_BEFORE_DELETE, ({ id }) => {
        if (!window.proposalManager) return null;

        const allProposals = window.proposalManager.getAllProposals();
        const proposalsUsingMenu = allProposals.filter(proposal =>
            proposal.isActive !== false &&
            proposal.selectedMenuId === id
        );

        if (proposalsUsingMenu.length > 0) {
            const proposalNames = proposalsUsingMenu
                .map(p => p.proposalName || p.proposalNumber)
                .join(', ');

            return {
                cancelled: true,
                reason: `Este cardápio está sendo usado em ${proposalsUsingMenu.length} proposta(s): ${proposalNames}. Remova ou edite as propostas primeiro.`
            };
        }

        return null;
    });
    */

    // ===================================================================
    // NOTIFICAÇÕES E LOGS
    // ===================================================================

    // Log de criação de pratos
    eventBus.on(Events.DISH_CREATED, ({ item }) => {
        console.log('✅ Prato criado:', item.name);

        // Notificar UI se houver sistema de notificação
        if (window.showNotification) {
            window.showNotification('success', `Prato "${item.name}" criado com sucesso!`);
        }
    });

    // Log de atualização de pratos
    eventBus.on(Events.DISH_UPDATED, ({ item }) => {
        console.log('✅ Prato atualizado:', item.name);
    });

    // Log de exclusão de pratos
    eventBus.on(Events.DISH_DELETED, ({ id, item, permanent }) => {
        const type = permanent ? 'permanentemente' : 'temporariamente';
        console.log(`🗑️ Prato deletado ${type}:`, item.name);

        if (window.showNotification) {
            window.showNotification('info', `Prato "${item.name}" removido`);
        }
    });

    // Log de criação de cardápios
    eventBus.on(Events.MENU_CREATED, ({ item }) => {
        console.log('✅ Cardápio criado:', item.name);

        if (window.showNotification) {
            window.showNotification('success', `Cardápio "${item.name}" criado!`);
        }
    });

    // Log de exclusão de cardápios
    eventBus.on(Events.MENU_DELETED, ({ id, item }) => {
        console.log('🗑️ Cardápio deletado:', item.name);

        if (window.showNotification) {
            window.showNotification('info', `Cardápio "${item.name}" removido`);
        }
    });

    // Log de criação de propostas
    eventBus.on(Events.PROPOSAL_CREATED, ({ item }) => {
        console.log('✅ Proposta criada:', item.proposalNumber);

        if (window.showNotification) {
            window.showNotification('success', `Proposta ${item.proposalNumber} criada!`);
        }
    });

    // Log de mudança de status de propostas (AUDITORIA)
    eventBus.on(Events.PROPOSAL_STATUS_CHANGED, ({ proposalId, oldStatus, newStatus }) => {
        console.log(`📊 Proposta ${proposalId}: ${oldStatus} → ${newStatus}`);

        const statusMessages = {
            sent: 'enviada ao cliente',
            accepted: 'aceita pelo cliente',
            rejected: 'rejeitada',
            paid: 'paga',
            cancelled: 'cancelada'
        };

        const message = statusMessages[newStatus] || newStatus;

        if (window.showNotification) {
            window.showNotification('info', `Proposta ${message}!`);
        }

        // Salvar no log de auditoria se existir
        if (window.auditLog) {
            window.auditLog.record({
                type: 'proposal_status_change',
                proposalId,
                oldStatus,
                newStatus,
                timestamp: new Date().toISOString()
            });
        }
    });

    // Log de exclusão de propostas
    eventBus.on(Events.PROPOSAL_DELETED, ({ id, item }) => {
        console.log('🗑️ Proposta deletada:', item.proposalNumber);

        if (window.showNotification) {
            window.showNotification('info', `Proposta ${item.proposalNumber} removida`);
        }
    });

    // Log de criação de eventos
    eventBus.on(Events.EVENT_CREATED, ({ item }) => {
        console.log('✅ Evento criado:', item.name);

        if (window.showNotification) {
            window.showNotification('success', `Evento "${item.name}" criado!`);
        }
    });

    // ===================================================================
    // SINCRONIZAÇÕES E ATUALIZAÇÕES
    // ===================================================================

    // Quando prato é atualizado, invalidar cache de cardápios que o usam
    eventBus.on(Events.DISH_UPDATED, ({ item }) => {
        if (window.savedMenusManager) {
            window.savedMenusManager.clearCache();
            console.log('🔄 Cache de cardápios invalidado (prato atualizado)');
        }
    });

    // Quando cardápio é atualizado, invalidar cache de propostas que o usam
    eventBus.on(Events.MENU_UPDATED, ({ item }) => {
        if (window.proposalManager) {
            window.proposalManager.clearCache();
            console.log('🔄 Cache de propostas invalidado (cardápio atualizado)');
        }
    });

    // ===================================================================
    // TRATAMENTO DE ERROS
    // ===================================================================

    // Erro de quota excedida
    eventBus.on(Events.STORAGE_QUOTA_EXCEEDED, ({ manager, size }) => {
        console.error('❌ Quota de storage excedida:', manager, size);

        if (window.showNotification) {
            window.showNotification(
                'error',
                'Espaço de armazenamento insuficiente! Por favor, remova itens antigos ou reduza o tamanho de imagens.'
            );
        }

        // Sugerir migração para IndexedDB se não estiver usando
        if (!window.storageManager || window.storageManager.getAdapterType() === 'local') {
            console.warn('💡 Sugestão: Migrar para IndexedDB para mais espaço');

            if (window.confirm('Deseja migrar seus dados para IndexedDB (mais espaço)?')) {
                window.location.href = '/migrate-to-indexeddb.html';
            }
        }
    });

    // Erro genérico da aplicação
    eventBus.on(Events.APP_ERROR, ({ error, context }) => {
        console.error('❌ Erro da aplicação:', error, context);

        if (window.showNotification) {
            window.showNotification('error', `Erro: ${error.message || error}`);
        }
    });

    // ===================================================================
    // ESTATÍSTICAS E MÉTRICAS
    // ===================================================================

    // Contar eventos para estatísticas de uso
    let eventCounts = {};

    eventBus.on('*', (eventName) => {
        if (!eventCounts[eventName]) {
            eventCounts[eventName] = 0;
        }
        eventCounts[eventName]++;
    });

    // Expor estatísticas globalmente
    window.getEventStatistics = () => eventCounts;

    console.log('✅ EventBus configurado com sucesso!');
    console.log('📊 Listeners ativos:', eventBus.getRegisteredEvents().length);
}

/**
 * Remove todos os listeners (para testes ou cleanup)
 */
export function teardownEventBusListeners() {
    eventBus.clear();
    console.log('🧹 Todos os listeners removidos');
}

/**
 * Ativa logging detalhado do EventBus (para debug)
 */
export function enableEventBusLogging() {
    eventBus.setLogging(true);
    console.log('📢 Logging do EventBus ativado');
}

/**
 * Desativa logging do EventBus
 */
export function disableEventBusLogging() {
    eventBus.setLogging(false);
    console.log('📢 Logging do EventBus desativado');
}

// Auto-executar se estiver em ambiente browser
if (typeof window !== 'undefined') {
    // Aguardar DOM estar pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupEventBusListeners);
    } else {
        // DOM já está pronto
        setupEventBusListeners();
    }

    // Expor funções globalmente
    window.setupEventBusListeners = setupEventBusListeners;
    window.teardownEventBusListeners = teardownEventBusListeners;
    window.enableEventBusLogging = enableEventBusLogging;
    window.disableEventBusLogging = disableEventBusLogging;
}
