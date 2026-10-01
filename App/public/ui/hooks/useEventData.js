(function() {
/**
 * useEventData.js
 * Hook customizado para gerenciar dados do evento
 */

import { useState, useEffect } from 'react';
import { SavedEventsManager, loadFromLocalStorage, saveToLocalStorage } from '../../core/index.js';

/**
 * Hook para gerenciar dados do evento
 * @returns {Object} Objeto com eventData, métodos e estados
 */
export function useEventData() {
    const [eventData, setEventData] = useState({
        eventName: '',
        eventDate: '',
        guests: 100,
        monthsUntilEvent: 0,
        items: [],
        support: [],
        distance: 0,
        fuelCost: 0,
        toll: 0,
        laborHours: 0,
        laborRate: 0
    });

    const [currentEventId, setCurrentEventId] = useState(null);
    const [savedEvents, setSavedEvents] = useState([]);
    const [manager] = useState(() => new SavedEventsManager());

    // Carregar dados salvos na inicialização
    useEffect(() => {
        const savedData = loadFromLocalStorage();
        if (savedData) {
            setEventData(prevData => ({ ...prevData, ...savedData }));
        }

        // Carregar lista de eventos salvos
        refreshSavedEvents();
    }, []);

    // Salvar automaticamente no localStorage
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            saveToLocalStorage(eventData);
        }, 1000); // Debounce de 1 segundo

        return () => clearTimeout(timeoutId);
    }, [eventData]);

    // Atualizar campo do evento
    const updateField = (field, value) => {
        setEventData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Salvar evento
    const saveEvent = () => {
        const dataToSave = {
            ...eventData,
            id: currentEventId
        };

        const result = manager.saveEvent(dataToSave);

        if (result.success) {
            setCurrentEventId(result.id);
            refreshSavedEvents();
        }

        return result;
    };

    // Carregar evento salvo
    const loadEvent = (eventId) => {
        const event = manager.getEventById(eventId);

        if (event) {
            setEventData(event);
            setCurrentEventId(event.id);
            return { success: true };
        }

        return {
            success: false,
            message: 'Evento não encontrado'
        };
    };

    // Criar novo evento
    const newEvent = () => {
        setEventData({
            eventName: '',
            eventDate: '',
            guests: 100,
            monthsUntilEvent: 0,
            items: [],
            support: [],
            distance: 0,
            fuelCost: 0,
            toll: 0,
            laborHours: 0,
            laborRate: 0
        });
        setCurrentEventId(null);
    };

    // Excluir evento
    const deleteEvent = (eventId) => {
        const result = manager.deleteEvent(eventId);

        if (result.success) {
            if (currentEventId === eventId) {
                newEvent();
            }
            refreshSavedEvents();
        }

        return result;
    };

    // Duplicar evento
    const duplicateEvent = (eventId) => {
        const result = manager.duplicateEvent(eventId);

        if (result.success) {
            refreshSavedEvents();
        }

        return result;
    };

    // Atualizar lista de eventos salvos
    const refreshSavedEvents = () => {
        const events = manager.getAllEvents();
        setSavedEvents(events);
    };

    return {
        eventData,
        setEventData,
        updateField,
        currentEventId,
        savedEvents,
        saveEvent,
        loadEvent,
        newEvent,
        deleteEvent,
        duplicateEvent,
        refreshSavedEvents
    };
}

export default useEventData;

})();
