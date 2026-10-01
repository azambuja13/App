/**
 * Testes para storage.js
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { SavedEventsManager } from './storage.js';

describe('SavedEventsManager', () => {
    let manager;

    beforeEach(() => {
        manager = new SavedEventsManager();
        localStorage.clear();
    });

    describe('generateId', () => {
        test('gera ID único', () => {
            const id1 = manager.generateId();
            const id2 = manager.generateId();

            expect(id1).toMatch(/^evt_\d+_[a-z0-9]+$/);
            expect(id2).toMatch(/^evt_\d+_[a-z0-9]+$/);
            expect(id1).not.toBe(id2);
        });
    });

    describe('saveEvent', () => {
        test('salva novo evento', () => {
            const eventData = {
                eventName: 'Casamento',
                guests: 150,
                items: []
            };

            const result = manager.saveEvent(eventData);

            expect(result.success).toBe(true);
            expect(result.id).toBeDefined();
            expect(result.message).toBe('Evento salvo com sucesso!');
        });

        test('atualiza evento existente', () => {
            // Criar evento
            const eventData = {
                eventName: 'Casamento',
                guests: 150
            };

            const saved = manager.saveEvent(eventData);
            const eventId = saved.id;

            // Atualizar
            const updated = manager.saveEvent({
                id: eventId,
                eventName: 'Casamento Atualizado',
                guests: 200
            });

            expect(updated.success).toBe(true);
            expect(updated.id).toBe(eventId);

            // Verificar atualização
            const event = manager.getEventById(eventId);
            expect(event.eventName).toBe('Casamento Atualizado');
            expect(event.guests).toBe(200);
        });

        test('adiciona timestamps automaticamente', () => {
            const result = manager.saveEvent({ eventName: 'Teste' });
            const event = manager.getEventById(result.id);

            expect(event.createdAt).toBeDefined();
            expect(event.updatedAt).toBeDefined();
        });
    });

    describe('getAllEvents', () => {
        test('retorna array vazio inicialmente', () => {
            const events = manager.getAllEvents();
            expect(events).toEqual([]);
        });

        test('retorna todos os eventos salvos', () => {
            manager.saveEvent({ eventName: 'Evento 1' });
            manager.saveEvent({ eventName: 'Evento 2' });
            manager.saveEvent({ eventName: 'Evento 3' });

            const events = manager.getAllEvents();
            expect(events).toHaveLength(3);
        });
    });

    describe('getEventById', () => {
        test('retorna evento por ID', () => {
            const saved = manager.saveEvent({
                eventName: 'Casamento',
                guests: 150
            });

            const event = manager.getEventById(saved.id);

            expect(event).toBeDefined();
            expect(event.id).toBe(saved.id);
            expect(event.eventName).toBe('Casamento');
            expect(event.guests).toBe(150);
        });

        test('retorna null para ID inexistente', () => {
            const event = manager.getEventById('invalid_id');
            expect(event).toBeNull();
        });
    });

    describe('deleteEvent', () => {
        test('exclui evento por ID', () => {
            const saved = manager.saveEvent({ eventName: 'Teste' });

            const result = manager.deleteEvent(saved.id);

            expect(result.success).toBe(true);
            expect(result.message).toBe('Evento excluído com sucesso!');

            // Verificar exclusão
            const events = manager.getAllEvents();
            expect(events).toHaveLength(0);
        });

        test('mantém outros eventos ao excluir um', () => {
            const event1 = manager.saveEvent({ eventName: 'Evento 1' });
            const event2 = manager.saveEvent({ eventName: 'Evento 2' });

            manager.deleteEvent(event1.id);

            const events = manager.getAllEvents();
            expect(events).toHaveLength(1);
            expect(events[0].id).toBe(event2.id);
        });
    });

    describe('duplicateEvent', () => {
        test('duplica evento existente', () => {
            const original = manager.saveEvent({
                eventName: 'Original',
                guests: 100,
                items: [{ name: 'Item 1' }]
            });

            const result = manager.duplicateEvent(original.id);

            expect(result.success).toBe(true);
            expect(result.id).not.toBe(original.id);

            // Verificar duplicado
            const duplicated = manager.getEventById(result.id);
            expect(duplicated.eventName).toBe('Original (Cópia)');
            expect(duplicated.guests).toBe(100);
            expect(duplicated.items).toHaveLength(1);
        });

        test('retorna erro para ID inexistente', () => {
            const result = manager.duplicateEvent('invalid_id');

            expect(result.success).toBe(false);
            expect(result.message).toBe('Evento não encontrado');
        });
    });
});
