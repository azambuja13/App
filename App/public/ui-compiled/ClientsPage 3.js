(function() {
/**
 * ClientsPage - Página de Cadastro de Clientes
 * Permite cadastrar, editar, buscar e excluir clientes
 */

function ClientsPage() {
  const {
    useState,
    useEffect
  } = React;
  const [clients, setClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    withPhone: 0,
    withEmail: 0,
    withAddress: 0
  });
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  // Usar ManagerHelper para pegar o manager correto (backend > local)
  const getClientManager = () => {
    return window.ManagerHelper?.getClientManager() || window.PrecificacaoAPI?.clientManager || window.clientManager;
  };

  // Carregar dados ao montar E quando a aba ficar visível
  useEffect(() => {
    console.log('🎯 [ClientsPage] Componente montado - carregando dados...');

    // SEMPRE tentar carregar quando montar
    (async () => {
      await loadClients();
      await loadStats();
    })();

    // Listener para Phase 2 - recarrega quando dados estiverem prontos
    const handlePhase2Complete = async () => {
      console.log('✅ [ClientsPage] Phase 2 completa - recarregando dados...');
      await loadClients();
      await loadStats();
    };

    // Listener customizado para quando trocar de aba dentro do app
    const handleTabChange = async e => {
      if (e.detail === 'clients') {
        console.log('🔄 [ClientsPage] Tab "clients" ativada - recarregando...');
        await loadClients();
        await loadStats();
      }
    };

    // Listener para quando a aba do navegador ficar visível
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        console.log('👁️ [ClientsPage] Aba visível - recarregando dados...');
        await loadClients();
        await loadStats();
      }
    };
    window.addEventListener('backend-phase2-complete', handlePhase2Complete);
    window.addEventListener('tab-changed', handleTabChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Atualizar lista de clientes a cada 60 segundos quando a tela está visível
    const intervalId = setInterval(async () => {
      if (document.visibilityState === 'visible') {
        await loadClients();
        await loadStats();
      }
    }, 60000); // 60 segundos (1 minuto)

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('backend-phase2-complete', handlePhase2Complete);
      window.removeEventListener('tab-changed', handleTabChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // FIX BUG #5: Carregar stats de forma assíncrona
  const loadStats = async () => {
    try {
      const clientManager = getClientManager();
      if (clientManager) {
        const statistics = await clientManager.getStatistics();
        setStats(statistics || {
          total: 0,
          withPhone: 0,
          withEmail: 0,
          withAddress: 0
        });
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };
  const loadClients = async () => {
    try {
      console.log('🔄 [ClientsPage] Carregando clientes...');
      const clientManager = getClientManager();
      console.log('📦 [ClientsPage] clientManager:', clientManager ? clientManager.constructor.name : 'não encontrado');
      if (clientManager) {
        const allClients = await clientManager.getAllClients();
        console.log('👥 [ClientsPage] Clientes carregados do manager:', allClients.length, allClients);
        setClients(Array.isArray(allClients) ? allClients : []);
      } else {
        console.warn('⚠️ [ClientsPage] ClientManager não disponível');
        setClients([]);
      }
    } catch (error) {
      console.error('❌ [ClientsPage] Erro ao carregar clientes:', error);
      setClients([]);
    }
  };
  const handleSearch = async query => {
    setSearchQuery(query);
    try {
      const clientManager = getClientManager();
      if (clientManager) {
        const results = await clientManager.searchClients(query);
        setClients(Array.isArray(results) ? results : []);
      }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      setClients([]);
    }
  };
  const handleNewClient = () => {
    setEditingClient(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      notes: ''
    });
    setShowForm(true);
  };
  const handleEditClient = client => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      notes: client.notes || ''
    });
    setShowForm(true);
  };
  const handleSaveClient = async () => {
    if (!formData.name.trim()) {
      alert('❌ Nome do cliente é obrigatório');
      return;
    }
    const clientData = {
      ...formData,
      id: editingClient?.id
    };
    try {
      const clientManager = getClientManager();
      const result = await clientManager.saveClient(clientData);
      if (result.success) {
        alert(result.message);
        setShowForm(false);
        setEditingClient(null);

        // IMPORTANTE: Garantir reload dos dados
        console.log('✅ Cliente salvo, recarregando lista...');
        await loadClients();
        await loadStats(); // Atualizar estatísticas
        console.log('✅ Lista de clientes atualizada');
      } else {
        alert('❌ ' + result.message);
      }
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      alert('❌ Erro ao salvar cliente');
    } finally {
      // Garantir reload mesmo em caso de erro parcial
      await loadClients().catch(e => console.error('Erro ao recarregar clientes:', e));
    }
  };
  const handleDeleteClient = async client => {
    console.log('🗑️ [ClientsPage] Excluindo cliente:', {
      id: client.id,
      name: client.name
    });
    if (confirm(`⚠️ Tem certeza que deseja excluir o cliente "${client.name}"?\n\nID: ${client.id}\n\nEsta ação não pode ser desfeita.`)) {
      try {
        console.log('🗑️ [ClientsPage] Chamando deleteClient com ID:', client.id);
        const clientManager = getClientManager();
        const result = await clientManager.deleteClient(client.id);
        if (result.success) {
          console.log('✅ [ClientsPage] Cliente excluído com sucesso');
          alert(result.message);
          await loadClients();
          await loadStats(); // Atualizar estatísticas
        } else {
          console.error('❌ [ClientsPage] Erro ao excluir:', result.message);
          alert('❌ ' + result.message);
        }
      } catch (error) {
        console.error('❌ [ClientsPage] Erro ao excluir cliente:', error);
        alert('❌ Erro ao excluir cliente');
      } finally {
        // Garantir reload mesmo em caso de erro parcial
        await loadClients().catch(e => console.error('Erro ao recarregar clientes:', e));
      }
    }
  };
  const handleCancel = () => {
    setShowForm(false);
    setEditingClient(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      notes: ''
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-lg p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-bold text-gray-800"
  }, "\uD83D\uDC65 Clientes"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 mt-1"
  }, "Gerencie seus clientes e dados de contato")), /*#__PURE__*/React.createElement("button", {
    onClick: handleNewClient,
    className: "flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:shadow-lg transition"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "+"), "Novo Cliente")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-4 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-blue-600 font-medium"
  }, "Total de Clientes"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold text-blue-800"
  }, stats.total)), /*#__PURE__*/React.createElement("div", {
    className: "bg-green-50 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-green-600 font-medium"
  }, "Com Telefone"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold text-green-800"
  }, stats.withPhone)), /*#__PURE__*/React.createElement("div", {
    className: "bg-purple-50 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-purple-600 font-medium"
  }, "Com Email"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold text-purple-800"
  }, stats.withEmail)), /*#__PURE__*/React.createElement("div", {
    className: "bg-orange-50 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-orange-600 font-medium"
  }, "Com Endere\xE7o"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold text-orange-800"
  }, stats.withAddress))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: searchQuery,
    onChange: e => handleSearch(e.target.value),
    placeholder: "\uD83D\uDD0D Buscar por nome, telefone ou email...",
    className: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  }))), showForm && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-lg p-6"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold text-gray-800 mb-4"
  }, editingClient ? '✏️ Editar Cliente' : '➕ Novo Cliente'), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Nome do Cliente *"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: formData.name,
    onChange: e => setFormData({
      ...formData,
      name: e.target.value
    }),
    placeholder: "Ex: Jo\xE3o Silva",
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Telefone"), /*#__PURE__*/React.createElement("input", {
    type: "tel",
    value: formData.phone,
    onChange: e => {
      const masked = window.applyPhoneMask ? window.applyPhoneMask(e.target.value) : e.target.value;
      setFormData({
        ...formData,
        phone: masked
      });
    },
    placeholder: "(00) 00000-0000",
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500",
    maxLength: "15"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Email"), /*#__PURE__*/React.createElement("input", {
    type: "email",
    value: formData.email,
    onChange: e => setFormData({
      ...formData,
      email: e.target.value
    }),
    placeholder: "cliente@email.com",
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Endere\xE7o"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: formData.address,
    onChange: e => setFormData({
      ...formData,
      address: e.target.value
    }),
    placeholder: "Rua, n\xFAmero, bairro",
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
  })), /*#__PURE__*/React.createElement("div", {
    className: "md:col-span-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Observa\xE7\xF5es"), /*#__PURE__*/React.createElement("textarea", {
    value: formData.notes,
    onChange: e => setFormData({
      ...formData,
      notes: e.target.value
    }),
    placeholder: "Notas sobre o cliente...",
    rows: "3",
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3 mt-6"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleSaveClient,
    className: "flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:shadow-lg transition"
  }, "\u2705 Salvar"), /*#__PURE__*/React.createElement("button", {
    onClick: handleCancel,
    className: "flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
  }, "\u274C Cancelar"))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-lg overflow-hidden"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full"
  }, /*#__PURE__*/React.createElement("thead", {
    className: "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
  }, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    className: "px-6 py-4 text-left"
  }, "Nome"), /*#__PURE__*/React.createElement("th", {
    className: "px-6 py-4 text-left"
  }, "Telefone"), /*#__PURE__*/React.createElement("th", {
    className: "px-6 py-4 text-left"
  }, "Email"), /*#__PURE__*/React.createElement("th", {
    className: "px-6 py-4 text-left"
  }, "Endere\xE7o"), /*#__PURE__*/React.createElement("th", {
    className: "px-6 py-4 text-center"
  }, "A\xE7\xF5es"))), /*#__PURE__*/React.createElement("tbody", null, clients.length === 0 ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: "5",
    className: "px-6 py-8 text-center text-gray-500"
  }, searchQuery ? '🔍 Nenhum cliente encontrado' : '📋 Nenhum cliente cadastrado')) : clients.map((client, index) => /*#__PURE__*/React.createElement("tr", {
    key: client.id || `client-${index}`,
    className: index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
  }, /*#__PURE__*/React.createElement("td", {
    className: "px-6 py-4 font-medium text-gray-900"
  }, client.name), /*#__PURE__*/React.createElement("td", {
    className: "px-6 py-4 text-gray-600"
  }, client.phone ? window.formatPhoneDisplay ? window.formatPhoneDisplay(client.phone) : client.phone : '-'), /*#__PURE__*/React.createElement("td", {
    className: "px-6 py-4 text-gray-600"
  }, client.email || '-'), /*#__PURE__*/React.createElement("td", {
    className: "px-6 py-4 text-gray-600"
  }, client.address || '-'), /*#__PURE__*/React.createElement("td", {
    className: "px-6 py-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => handleEditClient(client),
    className: "px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm font-medium"
  }, "\u270F\uFE0F Editar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleDeleteClient(client),
    className: "px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm font-medium"
  }, "\uD83D\uDDD1\uFE0F Excluir")))))))));
}

// Expor para window
window.ClientsPage = ClientsPage;
})();
