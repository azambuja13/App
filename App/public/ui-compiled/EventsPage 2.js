(function() {
/**
 * EventsPage - Página de Gerenciamento de Eventos
 * Permite criar, editar, salvar e listar eventos salvos
 */

function EventsPage({
  eventData,
  isSavingEvent = false,
  onSaveEvent,
  onNewEvent,
  onLoadEvent,
  onUpdateEventData,
  costs
}) {
  const {
    useState,
    useEffect
  } = React;
  const [savedEvents, setSavedEvents] = useState([]);
  const [clients, setClients] = useState([]);

  // Usar o nome do evento das props (sincronizado com o estado global)
  const eventName = eventData?.eventName || '';
  useEffect(() => {
    console.log('🎯 [EventsPage] Componente montado - carregando dados...');

    // SEMPRE tentar carregar quando montar
    (async () => {
      await loadSavedEvents();
      await loadClients();
    })();

    // Listener para Phase 2 - recarrega quando dados estiverem prontos
    const handlePhase2Complete = async () => {
      console.log('✅ [EventsPage] Phase 2 completa - recarregando dados...');
      await loadSavedEvents();
      await loadClients();
    };

    // Listener customizado para quando trocar de aba dentro do app
    const handleTabChange = async e => {
      if (e.detail === 'events') {
        console.log('🔄 [EventsPage] Tab "events" ativada - recarregando...');
        await loadSavedEvents();
        await loadClients();
      }
    };

    // Listener para quando a aba do navegador ficar visível
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        // ⚡ Performance: Log removido (executava toda vez que aba ficava visível)
        await loadSavedEvents();
        await loadClients();
      }
    };
    window.addEventListener('backend-phase2-complete', handlePhase2Complete);
    window.addEventListener('tab-changed', handleTabChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Atualizar lista de eventos a cada 60 segundos quando a tela está visível
    // (reduzido de 2s → 10s → 30s → 60s para evitar rate limiting - erro 429)
    // NOTA: Eventos são automaticamente atualizados após save/delete via cache invalidation
    // NOTA: Com WebSocket, mudanças de outros dispositivos serão sincronizadas em tempo real
    const intervalId = setInterval(async () => {
      if (document.visibilityState === 'visible') {
        await loadSavedEvents();
      }
    }, 60000); // 60 segundos (1 minuto)

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('backend-phase2-complete', handlePhase2Complete);
      window.removeEventListener('tab-changed', handleTabChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  const loadClients = async () => {
    try {
      // ⚡ Performance: Log removido (executava em CADA carregamento de clientes)
      // Usar ManagerHelper para pegar o manager correto (backend > local)
      const clientManager = window.ManagerHelper?.getClientManager() || window.PrecificacaoAPI?.clientManager || window.clientManager;

      // ⚡ Performance: Log removido (executava em CADA carregamento)

      if (clientManager) {
        const allClients = await clientManager.getAllClients();
        // ⚡ Performance: Log removido (executava em CADA carregamento)
        setClients(Array.isArray(allClients) ? allClients : []);
      } else {
        console.warn('⚠️ [EventsPage] ClientManager não disponível');
        setClients([]);
      }
    } catch (error) {
      console.error('❌ [EventsPage] Erro ao carregar clientes:', error);
      setClients([]);
    }
  };
  const loadSavedEvents = async () => {
    try {
      // ⚡ Performance: Log removido (executava em CADA carregamento de eventos)
      // Usar ManagerHelper para pegar o manager correto (backend > local)
      const savedEventsManager = window.ManagerHelper?.getSavedEventsManager() || window.PrecificacaoAPI?.eventManager || window.savedEventsManager;
      if (!savedEventsManager) {
        console.warn('⚠️ [EventsPage] Manager não disponível - mantendo lista atual');
        return; // Mantém a lista atual, não limpa
      }

      // Usar o método assíncrono do manager refatorado
      const events = await savedEventsManager.getAll();
      // ⚡ Performance: Logs removidos (executavam em CADA carregamento - 3x)
      setSavedEvents(events || []);
    } catch (error) {
      console.error('❌ [EventsPage] Erro ao carregar eventos:', error);
      // NÃO limpar a lista em caso de erro - mantém os dados que já estavam
      console.warn('⚠️ [EventsPage] Mantendo lista atual após erro');
    }
  };
  const handleSaveEvent = async () => {
    if (!eventName.trim()) {
      alert('❌ Por favor, digite um nome para o evento no campo acima');
      return;
    }
    try {
      await onSaveEvent(eventName);

      // Aguardar um pouco para garantir que o IndexedDB salvou
      setTimeout(async () => {
        await loadSavedEvents();
      }, 500);
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
      alert('Erro ao salvar evento: ' + error.message);
    }
  };
  const handleLoadEvent = async event => {
    console.log('🎯 [EventsPage.handleLoadEvent] Iniciando carregamento:', {
      eventName: event.name,
      eventId: event.id
    });
    if (confirm(`Carregar evento "${event.name}"?\n\nOs dados atuais serão substituídos.`)) {
      console.log('✅ [EventsPage] Usuário confirmou - chamando onLoadEvent...');
      await onLoadEvent(event.id);
      console.log('✅ [EventsPage] onLoadEvent concluído - recarregando lista...');
      await loadSavedEvents();
      console.log('✅ [EventsPage] Lista recarregada');
    } else {
      console.log('❌ [EventsPage] Usuário cancelou o carregamento');
    }
  };
  const handleDeleteEvent = async (eventId, eventName) => {
    if (confirm(`⚠️ Tem certeza que deseja excluir o evento "${eventName}"?\n\nEsta ação não pode ser desfeita.`)) {
      const savedEventsManager = window.savedEventsManager;
      if (savedEventsManager) {
        try {
          console.log('🗑️ Excluindo evento:', eventId);
          const result = await savedEventsManager.deleteEvent(eventId);
          console.log('📊 Resultado da exclusão:', result);
          if (result.success) {
            alert('✅ Evento excluído com sucesso!');
            console.log('🔄 Recarregando lista de eventos...');
            await loadSavedEvents();
          } else {
            alert('❌ ' + result.message);
          }
        } catch (error) {
          console.error('❌ Erro ao excluir evento:', error);
          alert('❌ Erro ao excluir evento: ' + error.message);
        }
      }
    }
  };
  const formatCurrency = value => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };
  const formatDate = dateString => {
    if (!dateString) return '-';
    // Fix: Adicionar timezone para evitar problema de UTC
    // Quando a data vem no formato "YYYY-MM-DD", adicionar "T00:00:00" para forçar hora local
    const dateStr = dateString.includes('T') ? dateString : dateString + 'T00:00:00';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };

  // Log de debug para render
  // ⚡ Performance: Log de render removido

  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-lg p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-6"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-bold text-gray-800"
  }, "\uD83D\uDCC5 Eventos"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 mt-1"
  }, "Gerencie seus eventos e or\xE7amentos")), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleSaveEvent,
    disabled: isSavingEvent,
    className: `flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${isSavingEvent ? 'bg-gray-400 text-gray-200 cursor-not-allowed' : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:shadow-lg'}`
  }, isSavingEvent ? '⏳ Salvando...' : '💾 Salvar Evento'), /*#__PURE__*/React.createElement("button", {
    onClick: onNewEvent,
    className: "flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:shadow-lg transition"
  }, "\u2795 Novo Evento"))), eventData && /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-6 border-2 border-orange-200"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-gray-800 mb-4"
  }, "\uD83D\uDCCB Dados do Evento"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold text-gray-700 mb-2"
  }, "\uD83C\uDFF7\uFE0F Nome do Evento"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: eventName,
    onChange: e => onUpdateEventData && onUpdateEventData({
      eventName: e.target.value
    }),
    placeholder: "Ex: Casamento Jo\xE3o e Maria",
    className: "w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold text-gray-700 mb-2"
  }, "\uD83D\uDC64 Cliente ", clients.length > 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-gray-500"
  }, "(", clients.length, " dispon\xEDveis)")), /*#__PURE__*/React.createElement("select", {
    value: eventData.clientData?.id || eventData.clientData?.name || '',
    onChange: e => {
      const selectedValue = e.target.value;
      if (!selectedValue) {
        onUpdateEventData && onUpdateEventData({
          clientData: null
        });
        return;
      }

      // Buscar cliente por ID ou por nome (fallback para clientes sem ID)
      const selectedClient = clients.find(c => {
        const idMatch = c.id && String(c.id) === String(selectedValue);
        const nameMatch = c.name && String(c.name) === String(selectedValue);
        return idMatch || nameMatch;
      });
      if (selectedClient) {
        // FIX BUG #4: Se cliente não tem ID, adicionar E SALVAR antes de atribuir ao evento
        if (!selectedClient.id) {
          const newId = Date.now();
          selectedClient.id = newId;

          // Salvar cliente com ID no ClientManager
          const clientManager = window.ManagerHelper?.getClientManager() || window.PrecificacaoAPI?.clientManager || window.clientManager;
          if (clientManager) {
            clientManager.saveClient(selectedClient).catch(err => {
              console.error('Erro ao salvar ID do cliente:', err);
            });
          }
          console.log('✅ ID gerado para cliente:', {
            id: newId,
            name: selectedClient.name
          });
        }
        if (onUpdateEventData) {
          onUpdateEventData({
            clientData: selectedClient
          });
        }
      }
    },
    className: "w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, clients.length === 0 ? '⚠️ Nenhum cliente cadastrado' : 'Selecione um cliente...'), clients.map((client, index) => /*#__PURE__*/React.createElement("option", {
    key: client.id || client.name || index,
    value: client.id || client.name
  }, client.name, " ", !client.id && ' (⚠️ sem ID)'))), clients.length === 0 && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-red-600 mt-1"
  }, "\u2139\uFE0F Cadastre clientes na aba \"Clientes\" primeiro"), eventData.clientData && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 p-3 bg-green-50 border border-green-200 rounded-lg"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-semibold text-green-800"
  }, "\u2705 Cliente Selecionado:"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-green-900 font-bold"
  }, eventData.clientData.name), eventData.clientData.phone && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-green-700"
  }, "\uD83D\uDCDE ", eventData.clientData.phone), eventData.clientData.email && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-green-700"
  }, "\uD83D\uDCE7 ", eventData.clientData.email))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold text-gray-700 mb-2"
  }, "\uD83D\uDCC5 Data do Evento"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: eventData.eventDate || '',
    onChange: e => onUpdateEventData && onUpdateEventData({
      eventDate: e.target.value
    }),
    className: "w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold text-gray-700 mb-2"
  }, "\uD83D\uDC65 N\xFAmero de Convidados"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    value: eventData.guests || 0,
    onChange: e => onUpdateEventData && onUpdateEventData({
      guests: parseInt(e.target.value) || 0
    }),
    className: "w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold text-gray-700 mb-2"
  }, "\uD83D\uDCCD Local do Evento"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: eventData.eventLocation || '',
    onChange: e => onUpdateEventData && onUpdateEventData({
      eventLocation: e.target.value
    }),
    placeholder: "Ex: Ch\xE1cara Villa Verde",
    className: "w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold text-gray-700 mb-2"
  }, "\uD83D\uDCCA Meses at\xE9 o Evento"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0",
    value: eventData.monthsUntilEvent || 0,
    onChange: e => onUpdateEventData && onUpdateEventData({
      monthsUntilEvent: parseInt(e.target.value) || 0
    }),
    className: "w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
  }), eventData.monthsUntilEvent > 0 && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 mt-1"
  }, "\uD83D\uDCB0 Corre\xE7\xE3o de infla\xE7\xE3o: +", ((Math.pow(1.01, eventData.monthsUntilEvent) - 1) * 100).toFixed(2), "% nos materiais"))), costs && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-4 border-t border-orange-300"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-5 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600"
  }, "Ingredientes"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-orange-600"
  }, formatCurrency(costs.ingredientsCost || 0))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600"
  }, "Apoio"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-orange-600"
  }, formatCurrency(costs.supportCost || 0))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600"
  }, "Transporte"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-orange-600"
  }, formatCurrency(costs.transportCost || 0))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600"
  }, "M\xE3o de Obra"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-orange-600"
  }, formatCurrency(costs.laborCost || 0))), /*#__PURE__*/React.createElement("div", {
    className: "bg-orange-100 rounded px-2 py-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600"
  }, "Total"), /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-orange-700"
  }, formatCurrency(costs.totalCost || 0))))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-lg overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-purple-600 to-pink-600 p-6"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-2xl font-bold text-white"
  }, "\uD83D\uDCDA Eventos Salvos"), /*#__PURE__*/React.createElement("p", {
    className: "text-purple-100 mt-1"
  }, savedEvents.length, " evento(s) cadastrado(s)")), savedEvents.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "p-12 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-500 text-lg"
  }, "\uD83D\uDCCB Nenhum evento salvo ainda"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-400 text-sm mt-2"
  }, "Clique em \"Salvar Evento\" para criar seu primeiro evento")) : /*#__PURE__*/React.createElement("div", {
    className: "divide-y divide-gray-200"
  }, (() => {
    // DEBUG: Verificar IDs únicos
    const ids = savedEvents.map(e => e.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      console.error('❌ IDs DUPLICADOS ENCONTRADOS:', duplicateIds);
      console.error('   Eventos:', savedEvents);
    } else {
      console.log('✅ Todos os eventos têm IDs únicos:', ids);
    }
    return null;
  })(), savedEvents.map(event => /*#__PURE__*/React.createElement("div", {
    key: event.id,
    className: "p-6 hover:bg-gray-50 transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xl font-bold text-gray-800 mb-2"
  }, event.name), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-4 text-sm"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-500"
  }, "Data"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-700"
  }, event.eventDate ? formatDate(event.eventDate) : '-')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-500"
  }, "Convidados"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-700"
  }, event.data?.guests || event.guests || 0)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-500"
  }, "Total"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-green-600"
  }, formatCurrency(event.totalWithInflation || event.results?.totalWithInflation || event.stateData?.results?.totalWithInflation || event.totalCost || 0))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-500"
  }, "Salvo em"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-700"
  }, formatDate(event.createdAt))))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 ml-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => handleLoadEvent(event),
    className: "px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition font-medium"
  }, "\uD83D\uDCC2 Carregar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleDeleteEvent(event.id, event.name),
    className: "px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition font-medium"
  }, "\uD83D\uDDD1\uFE0F Excluir"))))))));
}

// Expor para window
window.EventsPage = EventsPage;
})();
