(function() {
/**
 * ===================================================================
 * PROPOSAL LIST - Listagem de Propostas
 * ===================================================================
 * Componente para listar, filtrar e gerenciar propostas
 * Versão: 1.0.1 - Bug fix: previewProposalId passado como prop
 */

/**
 * Componente ProposalList
 * Lista todas as propostas com filtros e ações
 *
 * @param {Object} props
 * @param {string} props.eventId - ID do evento (opcional, filtra por evento)
 * @param {Function} props.onEdit - Callback ao editar proposta
 * @param {Function} props.onSelect - Callback ao selecionar proposta
 */
function ProposalList({
  eventId = null,
  onEdit,
  onSelect
}) {
  const [proposals, setProposals] = React.useState([]);
  const [filteredProposals, setFilteredProposals] = React.useState([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [sortBy, setSortBy] = React.useState('date'); // date, value, name
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(null);
  const [stats, setStats] = React.useState(null);
  const [previewProposalId, setPreviewProposalId] = React.useState(null);
  const [selectedProposals, setSelectedProposals] = React.useState([]);
  const [showDeleteSelectedConfirm, setShowDeleteSelectedConfirm] = React.useState(false);
  const [showDeleted, setShowDeleted] = React.useState(false); // ✅ Mostrar propostas deletadas

  // Aguardar backend estar pronto antes de carregar
  React.useEffect(() => {
    console.log('🎯 [ProposalList] Componente montado - aguardando Phase 2...');

    // Listener para carregar quando Phase 2 completar
    const handlePhase2Complete = () => {
      console.log('✅ [ProposalList] Phase 2 completa - carregando propostas...');
      loadProposals();
    };

    // SEMPRE registrar o listener para Phase 2
    window.addEventListener('backend-phase2-complete', handlePhase2Complete);

    // Se Phase 2 já completou (dados em cache), carregar imediatamente também
    if (window.PrecificacaoAPI?.proposalManager?.proposals?.length > 0) {
      console.log('⚡ [ProposalList] Dados já em cache - carregando imediatamente');
      loadProposals();
    }
    return () => window.removeEventListener('backend-phase2-complete', handlePhase2Complete);
  }, [eventId]);

  // Listener para recarregar quando proposta for salva
  React.useEffect(() => {
    const handleProposalSaved = () => {
      // ⚡ Performance: Log removido (executava em CADA salvamento de proposta)
      loadProposals();
    };
    window.addEventListener('proposalSaved', handleProposalSaved);
    return () => {
      window.removeEventListener('proposalSaved', handleProposalSaved);
    };
  }, [eventId]);

  // Recarregar quando mudar filtro de deletadas
  React.useEffect(() => {
    loadProposals();
  }, [showDeleted]);

  // Aplicar filtros
  React.useEffect(() => {
    applyFilters();
  }, [proposals, searchTerm, statusFilter, sortBy, showDeleted]);
  const loadProposals = async () => {
    try {
      console.log('🔄 [ProposalList.loadProposals] Iniciando carregamento...');

      // USAR APENAS BACKEND (PostgreSQL) - NÃO usar localStorage
      const proposalManager = window.PrecificacaoAPI?.proposalManager;
      if (!proposalManager) {
        console.error('❌ [loadProposals] Backend não está pronto. Aguarde a inicialização.');
        setProposals([]);
        return;
      }
      console.log('✅ [ProposalList.loadProposals] proposalManager encontrado');
      let allProposals;

      // Se estiver mostrando deletadas, chamar API diretamente
      if (showDeleted) {
        console.log('🗑️ [ProposalList.loadProposals] Carregando propostas DELETADAS...');
        const API_URL = window.APP_CONFIG?.backend?.baseURL || 'https://precificacao-api-production.up.railway.app';
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_URL}/api/proposals?onlyDeleted=true`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        allProposals = data.success ? data.data : [];
      } else if (eventId) {
        console.log(`🔍 [ProposalList.loadProposals] Filtrando por eventId: ${eventId}`);
        allProposals = await proposalManager.getByFilter(p => p.eventId === eventId);
      } else {
        console.log('📋 [ProposalList.loadProposals] Carregando propostas ativas...');
        allProposals = await proposalManager.getAll(true); // USA CACHE para performance
      }
      console.log(`📦 [ProposalList.loadProposals] Propostas carregadas: ${allProposals?.length || 0}`);

      // 🔍 DEBUG: Inspecionar dados da primeira proposta
      if (allProposals && allProposals.length > 0) {
        console.log('🔍 [DEBUG] Primeira proposta COMPLETA:', allProposals[0]);
        console.log('🔍 [DEBUG] Campos importantes:', {
          id: allProposals[0].id,
          title: allProposals[0].title,
          proposalName: allProposals[0].proposalName,
          proposalNumber: allProposals[0].proposalNumber,
          finalTotal: allProposals[0].finalTotal,
          subtotal: allProposals[0].subtotal,
          dishes: allProposals[0].dishes?.length || 0,
          status: allProposals[0].status
        });
      }
      setProposals(allProposals || []);

      // Usar getDetailedStatistics() que inclui byStatus, totalRevenue, avgTicket
      const statistics = await proposalManager.getDetailedStatistics();
      console.log('📊 [ProposalList.loadProposals] Estatísticas carregadas:', statistics);
      setStats(statistics);
    } catch (error) {
      console.error('❌ [ProposalList.loadProposals] Erro ao carregar propostas:', error);
    }
  };
  const applyFilters = () => {
    let filtered = [...proposals];

    // Filtro de deletadas
    if (showDeleted) {
      // Mostrar APENAS deletadas
      filtered = filtered.filter(p => p.status === 'deleted');
    } else {
      // Esconder deletadas
      filtered = filtered.filter(p => p.status !== 'deleted');
    }

    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(proposal => proposal.proposalNumber?.toLowerCase().includes(term) || proposal.proposalName?.toLowerCase().includes(term) || proposal.proposalType?.toLowerCase().includes(term));
    }

    // Filtro de status (somente se não estiver mostrando deletadas)
    if (statusFilter !== 'all' && !showDeleted) {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.proposalName.localeCompare(b.proposalName);
        case 'value':
          return (b.finalTotal || 0) - (a.finalTotal || 0);
        case 'date':
          return new Date(b.createdAt) - new Date(a.createdAt);
        default:
          return 0;
      }
    });
    setFilteredProposals(filtered);
  };
  const handleUpdateStatus = async (proposalId, newStatus) => {
    try {
      console.log(`🔄 [ProposalList] Atualizando status da proposta ${proposalId} para "${newStatus}"`);
      const proposalManager = window.PrecificacaoAPI?.proposalManager;
      if (!proposalManager) {
        console.error('❌ Backend não disponível');
        alert('❌ Erro: Backend não disponível');
        return;
      }
      const result = await proposalManager.updateStatus(proposalId, newStatus);
      console.log('📦 [ProposalList] Resultado do updateStatus:', result);
      if (result.success) {
        console.log('✅ [ProposalList] Status atualizado com sucesso, recarregando lista...');

        // ✅ LIMPAR CACHE antes de recarregar para ver mudanças visuais
        if (proposalManager.clearCache) {
          proposalManager.clearCache();
          console.log('🗑️ [ProposalList] Cache limpo');
        }
        await loadProposals();

        // Feedback visual
        const statusLabels = {
          draft: 'Rascunho',
          sent: 'Enviada',
          accepted: 'Aprovada',
          rejected: 'Rejeitada'
        };

        // Mensagem especial para "Enviada"
        if (newStatus === 'sent') {
          alert(`✅ Proposta marcada como "Enviada"!\n\n📱 Em breve você poderá enviar propostas diretamente pelo WhatsApp.`);
        } else {
          alert(`✅ Proposta marcada como "${statusLabels[newStatus] || newStatus}"!`);
        }
      } else {
        console.error('❌ [ProposalList] Erro ao atualizar status:', result.message);
        alert(`❌ Erro ao atualizar status: ${result.message || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('❌ [ProposalList] Erro ao atualizar status:', error);
      alert(`❌ Erro ao atualizar status: ${error.message || 'Erro desconhecido'}`);
    }
  };
  const handleDuplicate = async proposalId => {
    try {
      const proposalManager = window.PrecificacaoAPI?.proposalManager;
      if (!proposalManager) {
        console.error('❌ Backend não disponível');
        return;
      }
      const result = await proposalManager.duplicateProposal(proposalId);
      if (result.success) {
        await loadProposals();
      }
    } catch (error) {
      console.error('Erro ao duplicar:', error);
    }
  };
  const handleDelete = async proposalId => {
    try {
      const proposalManager = window.PrecificacaoAPI?.proposalManager;
      if (!proposalManager) {
        console.error('❌ Backend não disponível');
        return;
      }
      // Hard delete (exclusão permanente)
      const result = await proposalManager.deleteProposal(proposalId);
      if (result.success) {
        // ⚡ Performance: Log removido (executava em CADA exclusão)

        // Invalidar cache antes de recarregar
        proposalManager.clearCache();
        // ⚡ Performance: Log removido (executava em CADA exclusão)

        await loadProposals();
        setShowDeleteConfirm(null);
        setSelectedProposals([]);
      } else {
        console.error('❌ Erro ao excluir proposta:', result.message);
        alert(`❌ ${result.message || 'Erro ao excluir proposta'}`);
      }
    } catch (error) {
      console.error('Erro ao deletar:', error);
      alert('❌ Erro ao excluir proposta');
    }
  };
  const handleSelectProposal = proposalId => {
    setSelectedProposals(prev => {
      if (prev.includes(proposalId)) {
        return prev.filter(id => id !== proposalId);
      } else {
        return [...prev, proposalId];
      }
    });
  };
  const handleSelectAll = () => {
    if (selectedProposals.length === filteredProposals.length) {
      setSelectedProposals([]);
    } else {
      setSelectedProposals(filteredProposals.map(p => p.id));
    }
  };
  const handleDeleteSelected = async () => {
    try {
      const proposalManager = window.PrecificacaoAPI?.proposalManager;
      if (!proposalManager) {
        console.error('❌ Backend não disponível');
        return;
      }
      let successCount = 0;
      let failCount = 0;
      for (const proposalId of selectedProposals) {
        // Hard delete (exclusão permanente)
        const result = await proposalManager.deleteProposal(proposalId);
        if (result.success) {
          successCount++;
          // ⚡ Performance: Log removido (executava para CADA proposta excluída)
        } else {
          failCount++;
          console.error('❌ Falha ao excluir:', proposalId, result.message);
        }
      }

      // ⚡ Performance: Log removido (executava após exclusão em lote)

      // Invalidar cache antes de recarregar
      proposalManager.clearCache();
      // ⚡ Performance: Log removido (executava após exclusão em lote)

      if (failCount > 0) {
        console.error(`❌ ${failCount} proposta(s) falharam`);
        alert(`⚠️ ${successCount} proposta(s) excluída(s), ${failCount} falharam`);
      } else {
        alert(`✅ ${successCount} proposta(s) excluída(s) com sucesso!`);
      }
      await loadProposals();
      setSelectedProposals([]);
      setShowDeleteSelectedConfirm(false);
    } catch (error) {
      console.error('Erro ao deletar propostas selecionadas:', error);
      alert('❌ Erro ao excluir propostas');
    }
  };

  // Status disponíveis
  const statuses = [{
    value: 'all',
    label: 'Todos',
    icon: '📋',
    color: 'gray'
  }, {
    value: 'draft',
    label: 'Rascunho',
    icon: '📝',
    color: 'yellow'
  }, {
    value: 'sent',
    label: 'Enviadas',
    icon: '📤',
    color: 'blue'
  }, {
    value: 'accepted',
    label: 'Aprovadas',
    icon: '✅',
    color: 'green'
  }, {
    value: 'rejected',
    label: 'Rejeitadas',
    icon: '❌',
    color: 'red'
  }];
  const getStatusBadge = status => {
    const statusConfig = {
      draft: {
        label: 'Rascunho',
        color: 'bg-yellow-100 text-yellow-800',
        icon: '📝'
      },
      sent: {
        label: 'Enviada',
        color: 'bg-blue-100 text-blue-800',
        icon: '📤'
      },
      accepted: {
        label: 'Aprovada',
        color: 'bg-green-100 text-green-800',
        icon: '✅'
      },
      rejected: {
        label: 'Rejeitada',
        color: 'bg-red-100 text-red-800',
        icon: '❌'
      }
    };
    return statusConfig[status] || statusConfig.draft;
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "proposal-list"
  }, stats && !eventId && /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg p-6 mb-6 shadow-lg"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold mb-4"
  }, "\uD83D\uDCCB Minhas Propostas"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-blue-100 text-sm"
  }, "Total de Propostas"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold"
  }, stats.total)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-blue-100 text-sm"
  }, "Aprovadas"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold"
  }, "\u2705 ", stats.byStatus?.accepted || 0)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-blue-100 text-sm"
  }, "Receita Total"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold"
  }, "R$ ", stats.totalRevenue?.toFixed(2) || '0.00')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-blue-100 text-sm"
  }, "Ticket M\xE9dio"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold"
  }, "R$ ", stats.avgTicket?.toFixed(2) || '0.00')))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow p-4 mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 max-w-md"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: searchTerm,
    onChange: e => setSearchTerm(e.target.value),
    placeholder: "\uD83D\uDD0D Buscar propostas...",
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, selectedProposals.length > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowDeleteSelectedConfirm(true),
    className: "px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold shadow-md flex items-center gap-2"
  }, "\uD83D\uDDD1\uFE0F Excluir Selecionadas (", selectedProposals.length, ")"), onEdit && /*#__PURE__*/React.createElement("button", {
    onClick: () => onEdit(null),
    className: "px-6 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-colors font-bold shadow-md"
  }, "\u2795 Nova Proposta"), /*#__PURE__*/React.createElement("select", {
    value: sortBy,
    onChange: e => setSortBy(e.target.value),
    className: "px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: "date"
  }, "\uD83D\uDCC5 Data"), /*#__PURE__*/React.createElement("option", {
    value: "value"
  }, "\uD83D\uDCB0 Valor"), /*#__PURE__*/React.createElement("option", {
    value: "name"
  }, "\uD83D\uDCDD Nome")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowDeleted(!showDeleted),
    className: `px-4 py-2 rounded-lg font-medium transition-colors shadow-md ${showDeleted ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`
  }, showDeleted ? '🔙 Voltar' : '🗑️ Deletadas'))), filteredProposals.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-4 pb-4 border-b border-gray-200"
  }, /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: selectedProposals.length === filteredProposals.length && filteredProposals.length > 0,
    onChange: handleSelectAll,
    className: "w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium text-gray-700"
  }, "Selecionar todas (", filteredProposals.length, ")"))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, statuses.map(status => /*#__PURE__*/React.createElement("button", {
    key: status.value,
    onClick: () => setStatusFilter(status.value),
    className: `px-3 py-1 rounded-full text-sm font-medium transition-colors ${statusFilter === status.value ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`
  }, status.icon, " ", status.label)))), filteredProposals.length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, filteredProposals.map(proposal => /*#__PURE__*/React.createElement(ProposalCard, {
    key: proposal.id,
    proposal: proposal,
    onEdit: onEdit,
    onSelect: onSelect,
    onUpdateStatus: handleUpdateStatus,
    onDuplicate: handleDuplicate,
    onDelete: () => setShowDeleteConfirm(proposal.id),
    onPreview: () => {
      console.log('🔍 [ProposalList] Visualizar proposta clicado:', proposal.id);
      console.log('🔍 [ProposalList] window.ProposalPreview disponível?', !!window.ProposalPreview);
      setPreviewProposalId(proposal.id);
    },
    getStatusBadge: getStatusBadge,
    isSelected: selectedProposals.includes(proposal.id),
    onSelectToggle: () => handleSelectProposal(proposal.id)
  }))) : /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow p-12 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-6xl mb-4"
  }, "\uD83D\uDCCB"), /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-semibold text-gray-700 mb-2"
  }, searchTerm || statusFilter !== 'all' ? 'Nenhuma proposta encontrada' : 'Nenhuma proposta cadastrada'), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-500 mb-6"
  }, searchTerm || statusFilter !== 'all' ? 'Tente ajustar os filtros de busca' : 'Comece criando sua primeira proposta')), showDeleteConfirm && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-6xl mb-4"
  }, "\u26A0\uFE0F"), /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold text-gray-800 mb-2"
  }, "Excluir Proposta?"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600"
  }, "Esta a\xE7\xE3o n\xE3o pode ser desfeita. A proposta ser\xE1 removida permanentemente.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-end space-x-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowDeleteConfirm(null),
    className: "px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleDelete(showDeleteConfirm),
    className: "px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
  }, "Excluir")))), showDeleteSelectedConfirm && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-6xl mb-4"
  }, "\u26A0\uFE0F"), /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold text-gray-800 mb-2"
  }, "Excluir ", selectedProposals.length, " Proposta(s)?"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600"
  }, "Esta a\xE7\xE3o n\xE3o pode ser desfeita. As propostas selecionadas ser\xE3o removidas permanentemente.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-end space-x-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowDeleteSelectedConfirm(false),
    className: "px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: handleDeleteSelected,
    className: "px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
  }, "Excluir Todas")))), window.ProposalPreview && /*#__PURE__*/React.createElement(window.ProposalPreview, {
    proposalId: previewProposalId,
    isOpen: previewProposalId !== null,
    onClose: () => setPreviewProposalId(null),
    onDelete: async deletedProposalId => {
      // ⚡ Performance: Logs removidos (executavam em CADA exclusão)
      await loadProposals(); // Recarrega a lista após exclusão
    }
  }));
}

/**
 * Componente ProposalCard
 * Card individual de proposta
 */
function ProposalCard({
  proposal,
  onEdit,
  onSelect,
  onUpdateStatus,
  onDuplicate,
  onDelete,
  onPreview,
  getStatusBadge,
  isSelected,
  onSelectToggle
}) {
  const [showMenu, setShowMenu] = React.useState(false);
  const statusBadge = getStatusBadge(proposal.status);

  // Tipos de proposta
  const typeConfig = {
    basic: {
      label: 'Básica',
      color: 'bg-gray-100 text-gray-700',
      icon: '📝'
    },
    standard: {
      label: 'Standard',
      color: 'bg-blue-100 text-blue-700',
      icon: '⭐'
    },
    premium: {
      label: 'Premium',
      color: 'bg-purple-100 text-purple-700',
      icon: '👑'
    }
  };
  const typeBadge = typeConfig[proposal.proposalType] || typeConfig.standard;
  return /*#__PURE__*/React.createElement("div", {
    className: `bg-white rounded-lg shadow hover:shadow-xl transition-all ${isSelected ? 'ring-4 ring-blue-500' : ''}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-6 min-h-[320px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 flex-1"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: isSelected,
    onChange: onSelectToggle,
    className: "w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer",
    onClick: e => e.stopPropagation()
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-3 mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold text-gray-800"
  }, proposal.proposalName), /*#__PURE__*/React.createElement("span", {
    className: `px-3 py-1 rounded-full text-xs font-bold ${statusBadge.color}`
  }, statusBadge.icon, " ", statusBadge.label), /*#__PURE__*/React.createElement("span", {
    className: `px-3 py-1 rounded-full text-xs font-bold ${typeBadge.color}`
  }, typeBadge.icon, " ", typeBadge.label)), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, "\uD83D\uDCCB ", proposal.proposalNumber, " \u2022 \uD83D\uDCC5 ", window.formatDate(proposal.createdAt))))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 mb-1"
  }, "Pratos"), /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-gray-800"
  }, "\uD83C\uDF7D\uFE0F ", proposal.dishes?.length || 0)), /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-blue-600 mb-1"
  }, "Custo Total"), /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-blue-800"
  }, "R$ ", proposal.totalCost?.toFixed(2) || '0.00')), /*#__PURE__*/React.createElement("div", {
    className: "bg-green-50 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-green-600 mb-1"
  }, "Margem"), /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-green-800"
  }, proposal.markupPercent || 0, "%")), /*#__PURE__*/React.createElement("div", {
    className: "bg-purple-50 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-purple-600 mb-1"
  }, "Valor Final"), /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-purple-800"
  }, "R$ ", proposal.finalTotal?.toFixed(2) || '0.00'))), proposal.dishes && proposal.dishes.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-medium text-gray-700 mb-2"
  }, "Pratos inclusos:"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, proposal.dishes.slice(0, 5).map((dish, index) => /*#__PURE__*/React.createElement("span", {
    key: index,
    className: "px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
  }, dish.dishName, " (", dish.quantity, "x)")), proposal.dishes.length > 5 && /*#__PURE__*/React.createElement("span", {
    className: "px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs font-medium"
  }, "+", proposal.dishes.length - 5, " mais"))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-2 pt-4 border-t"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, proposal.status === 'draft' && /*#__PURE__*/React.createElement("button", {
    onClick: () => onUpdateStatus(proposal.id, 'sent'),
    className: "px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
  }, "\uD83D\uDCE4 Enviar"), proposal.status === 'sent' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    onClick: () => onUpdateStatus(proposal.id, 'accepted'),
    className: "px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
  }, "\u2705 Aprovar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onUpdateStatus(proposal.id, 'rejected'),
    className: "px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
  }, "\u274C Rejeitar"))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onPreview,
    className: "px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 text-sm font-medium"
  }, "\uD83D\uDC41\uFE0F Visualizar"), onSelect && /*#__PURE__*/React.createElement("button", {
    onClick: () => onSelect(proposal),
    className: "px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
  }, "Ver Detalhes"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onEdit(proposal),
    className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
  }, "\u270F\uFE0F Editar"), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowMenu(!showMenu),
    className: "px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
  }, "\u22EE"), showMenu && /*#__PURE__*/React.createElement("div", {
    className: "absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border z-50"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      onDuplicate(proposal.id);
      setShowMenu(false);
    },
    className: "w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
  }, "\uD83D\uDCCB Duplicar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      onDelete();
      setShowMenu(false);
    },
    className: "w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 text-sm"
  }, "\uD83D\uDDD1\uFE0F Excluir")))))));
}

// export default ProposalList;

// Expor para window (browser global)
window.ProposalList = ProposalList;
})();
