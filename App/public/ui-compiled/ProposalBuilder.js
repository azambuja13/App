(function() {
/**
 * ===================================================================
 * PROPOSAL BUILDER - Construtor de Propostas
 * ===================================================================
 * Componente para criar e editar propostas com múltiplos pratos
 */

// React hooks usados via React.useState, React.useEffect, etc.
/**
 * Componente ProposalBuilder
 * Construtor visual de propostas
 *
 * @param {Object} props
 * @param {string} props.eventId - ID do evento
 * @param {Object} props.proposal - Proposta para editar (null para nova)
 * @param {Function} props.onSave - Callback ao salvar
 * @param {Function} props.onCancel - Callback ao cancelar
 */
function ProposalBuilder({
  eventId,
  proposal = null,
  onSave,
  onCancel
}) {
  const [formData, setFormData] = React.useState({
    proposalName: '',
    proposalType: 'standard',
    dishes: [],
    transportCost: 0,
    laborCost: 0,
    otherCosts: 0,
    markupPercent: 50,
    // Campos do evento
    eventGuests: 0,
    eventDate: '',
    eventLocation: ''
  });
  const [showDishSelector, setShowDishSelector] = React.useState(false);
  const [totals, setTotals] = React.useState(null);
  const [errors, setErrors] = React.useState({});
  const [isSaving, setIsSaving] = React.useState(false);

  // ✅ NOVO: Carregar dados do evento ativo
  React.useEffect(() => {
    if (!proposal && window.eventState) {
      console.log('📋 [ProposalBuilder] Preenchendo com dados do evento ativo');
      setFormData(prev => ({
        ...prev,
        eventGuests: window.eventState.guests || 0,
        eventDate: window.eventState.eventDate || '',
        eventLocation: window.eventState.eventLocation || '',
        transportCost: window.eventState.transportCost || 0,
        laborCost: window.eventState.totalLaborCost || 0
      }));
    }
  }, []);

  // Carregar proposta para edição
  React.useEffect(() => {
    if (proposal) {
      setFormData({
        proposalName: proposal.proposalName || '',
        proposalType: proposal.proposalType || 'standard',
        dishes: proposal.dishes || [],
        transportCost: proposal.transportCost || 0,
        laborCost: proposal.laborCost || 0,
        otherCosts: proposal.otherCosts || 0,
        markupPercent: proposal.markupPercent || 50,
        eventGuests: proposal.eventGuests || 0,
        eventDate: proposal.eventDate || '',
        eventLocation: proposal.eventLocation || ''
      });
    }
  }, [proposal]);

  // Calcular totais sempre que os dados mudarem
  React.useEffect(() => {
    calculateTotals();
  }, [formData]);
  const calculateTotals = () => {
    // Custo dos pratos
    const dishesTotalCost = formData.dishes.reduce((sum, dish) => sum + (dish.totalCost || 0), 0);
    const dishesTotalPrice = formData.dishes.reduce((sum, dish) => sum + (dish.totalPrice || 0), 0);

    // Custos adicionais
    const transportCost = parseFloat(formData.transportCost) || 0;
    const laborCost = parseFloat(formData.laborCost) || 0;
    const otherCosts = parseFloat(formData.otherCosts) || 0;

    // Custo total
    const totalCost = dishesTotalCost + transportCost + laborCost + otherCosts;

    // Markup
    const markupPercent = parseFloat(formData.markupPercent) || 0;
    const markupValue = totalCost * (markupPercent / 100);

    // Total final
    const finalTotal = totalCost + markupValue + dishesTotalPrice;
    setTotals({
      dishesTotalCost,
      dishesTotalPrice,
      transportCost,
      laborCost,
      otherCosts,
      totalCost,
      markupPercent,
      markupValue,
      finalTotal
    });
  };

  // Tipos de proposta
  const proposalTypes = [{
    value: 'basic',
    label: 'Básica',
    icon: '📝',
    color: 'gray'
  }, {
    value: 'standard',
    label: 'Standard',
    icon: '⭐',
    color: 'blue'
  }, {
    value: 'premium',
    label: 'Premium',
    icon: '👑',
    color: 'purple'
  }];
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };
  const handleAddDish = dish => {
    const newDish = {
      id: `pdish_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      dishId: dish.id,
      dishName: dish.name,
      dishCategory: dish.category,
      quantity: 1,
      costPerServing: dish.costPerServing || 0,
      pricePerServing: 0,
      // Usuário define o preço de venda
      totalCost: dish.costPerServing || 0,
      totalPrice: 0,
      notes: null,
      displayOrder: formData.dishes.length + 1
    };
    setFormData(prev => ({
      ...prev,
      dishes: [...prev.dishes, newDish]
    }));
    setShowDishSelector(false);
  };
  const handleRemoveDish = dishId => {
    setFormData(prev => ({
      ...prev,
      dishes: prev.dishes.filter(d => d.id !== dishId)
    }));
  };
  const handleUpdateDishQuantity = (dishId, newQuantity) => {
    setFormData(prev => ({
      ...prev,
      dishes: prev.dishes.map(d => {
        if (d.id === dishId) {
          const quantity = parseInt(newQuantity) || 0;
          return {
            ...d,
            quantity: quantity,
            totalCost: d.costPerServing * quantity,
            totalPrice: d.pricePerServing * quantity
          };
        }
        return d;
      })
    }));
  };
  const handleUpdateDishPrice = (dishId, newPrice) => {
    setFormData(prev => ({
      ...prev,
      dishes: prev.dishes.map(d => {
        if (d.id === dishId) {
          const price = parseFloat(newPrice) || 0;
          return {
            ...d,
            pricePerServing: price,
            totalPrice: price * d.quantity
          };
        }
        return d;
      })
    }));
  };
  const validate = () => {
    const newErrors = {};
    if (!formData.proposalName || formData.proposalName.trim() === '') {
      newErrors.proposalName = 'Nome da proposta é obrigatório';
    }
    if (formData.dishes.length === 0) {
      newErrors.dishes = 'Adicione pelo menos um prato';
    }

    // Validar se todos os pratos têm preço definido
    const dishesWithoutPrice = formData.dishes.filter(d => !d.pricePerServing || d.pricePerServing <= 0);
    if (dishesWithoutPrice.length > 0) {
      newErrors.dishPrices = 'Defina o preço de venda para todos os pratos';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      // Usar ManagerHelper para pegar o manager correto (backend PostgreSQL > local)
      const proposalManager = window.ManagerHelper?.getProposalManager() || window.PrecificacaoAPI?.proposalManager || window.proposalManager;
      if (!proposalManager) {
        alert('❌ Sistema de propostas não está pronto. Aguarde alguns segundos e tente novamente.');
        setIsSaving(false);
        return;
      }

      // ⚡ Performance: Log removido (executava em CADA salvamento de proposta)

      const proposalData = {
        ...formData,
        id: proposal?.id || null,
        eventId: eventId,
        ...totals
      };
      const result = await proposalManager.saveProposal(proposalData);
      if (result.success) {
        if (onSave) {
          onSave(result.data || result.proposal);
        }
      } else {
        alert(`Erro ao salvar proposta: ${result.message}`);
      }
    } catch (error) {
      console.error('Erro ao salvar proposta:', error);
      alert('Erro ao salvar proposta. Verifique o console.');
    } finally {
      setIsSaving(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "proposal-builder bg-white rounded-lg shadow-lg p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold text-gray-800 mb-2"
  }, proposal ? '✏️ Editar Proposta' : '➕ Nova Proposta'), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600"
  }, "Monte sua proposta adicionando pratos e definindo custos")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4 mb-6"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-semibold text-gray-700 border-b pb-2"
  }, "\uD83D\uDCDD Informa\xE7\xF5es da Proposta"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Nome da Proposta *"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: formData.proposalName,
    onChange: e => handleChange('proposalName', e.target.value),
    placeholder: "Ex: Op\xE7\xE3o Premium, Proposta Econ\xF4mica",
    className: `w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.proposalName ? 'border-red-500' : 'border-gray-300'}`
  }), errors.proposalName && /*#__PURE__*/React.createElement("p", {
    className: "text-red-500 text-sm mt-1"
  }, errors.proposalName)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Tipo de Proposta *"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-3 gap-4"
  }, proposalTypes.map(type => /*#__PURE__*/React.createElement("button", {
    key: type.value,
    onClick: () => handleChange('proposalType', type.value),
    className: `p-4 border-2 rounded-lg transition-all ${formData.proposalType === type.value ? `border-${type.color}-500 bg-${type.color}-50` : 'border-gray-300 hover:border-gray-400'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-3xl mb-1"
  }, type.icon), /*#__PURE__*/React.createElement("div", {
    className: "font-semibold"
  }, type.label)))))), /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-semibold text-gray-700"
  }, "\uD83C\uDF7D\uFE0F Pratos da Proposta"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowDishSelector(true),
    className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
  }, "\u2795 Adicionar Prato")), errors.dishes && /*#__PURE__*/React.createElement("p", {
    className: "text-red-500 text-sm mb-2"
  }, errors.dishes), errors.dishPrices && /*#__PURE__*/React.createElement("p", {
    className: "text-red-500 text-sm mb-2"
  }, errors.dishPrices), formData.dishes.length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, formData.dishes.map((dish, index) => /*#__PURE__*/React.createElement("div", {
    key: dish.id,
    className: "border border-gray-200 rounded-lg p-4 bg-gray-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-2 mb-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-gray-800"
  }, index + 1, ". ", dish.dishName), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500"
  }, dish.dishCategory)), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleRemoveDish(dish.id),
    className: "text-red-500 hover:text-red-700 font-bold"
  }, "\uD83D\uDDD1\uFE0F Remover")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-4 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs text-gray-600 font-medium"
  }, "Por\xE7\xF5es"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: dish.quantity,
    onChange: e => handleUpdateDishQuantity(dish.id, e.target.value),
    min: "1",
    className: "w-full px-3 py-2 border border-gray-300 rounded text-sm"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs text-gray-600 font-medium"
  }, "Custo/Por\xE7\xE3o"), /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2 bg-gray-100 border border-gray-300 rounded text-sm font-semibold"
  }, "R$ ", dish.costPerServing.toFixed(2))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs text-gray-600 font-medium"
  }, "Pre\xE7o/Por\xE7\xE3o *"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: dish.pricePerServing,
    onChange: e => handleUpdateDishPrice(dish.id, e.target.value),
    step: "0.01",
    min: "0",
    placeholder: "0.00",
    className: `w-full px-3 py-2 border rounded text-sm ${!dish.pricePerServing || dish.pricePerServing <= 0 ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'}`
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs text-gray-600 font-medium"
  }, "Margem"), /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2 bg-green-50 border border-green-300 rounded text-sm font-bold text-green-700"
  }, dish.costPerServing > 0 && dish.pricePerServing > 0 ? `${((dish.pricePerServing - dish.costPerServing) / dish.costPerServing * 100).toFixed(0)}%` : '-'))), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex items-center justify-between bg-blue-50 rounded px-3 py-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-blue-700"
  }, "Custo Total:"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-blue-900"
  }, "R$ ", dish.totalCost.toFixed(2)), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-blue-700"
  }, "Pre\xE7o Total:"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-blue-900"
  }, "R$ ", dish.totalPrice.toFixed(2)))))) : /*#__PURE__*/React.createElement("div", {
    className: "border-2 border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-500"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-6xl mb-4"
  }, "\uD83C\uDF7D\uFE0F"), /*#__PURE__*/React.createElement("p", {
    className: "font-medium mb-2"
  }, "Nenhum prato adicionado ainda"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm"
  }, "Clique no bot\xE3o acima para adicionar pratos"))), /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-semibold text-gray-700 mb-4"
  }, "\uD83D\uDCB0 Custos Adicionais"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-3 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "\uD83D\uDE9A Transporte (R$)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: formData.transportCost,
    onChange: e => handleChange('transportCost', e.target.value),
    step: "0.01",
    min: "0",
    placeholder: "0.00",
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "\uD83D\uDC65 M\xE3o de Obra (R$)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: formData.laborCost,
    onChange: e => handleChange('laborCost', e.target.value),
    step: "0.01",
    min: "0",
    placeholder: "0.00",
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "\uD83D\uDCE6 Outros Custos (R$)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: formData.otherCosts,
    onChange: e => handleChange('otherCosts', e.target.value),
    step: "0.01",
    min: "0",
    placeholder: "0.00",
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-semibold text-gray-700 mb-2"
  }, "\uD83D\uDCC8 Markup / Margem"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-4"
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    value: formData.markupPercent,
    onChange: e => handleChange('markupPercent', e.target.value),
    min: "0",
    max: "200",
    step: "5",
    className: "flex-1"
  }), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: formData.markupPercent,
    onChange: e => handleChange('markupPercent', e.target.value),
    min: "0",
    max: "500",
    className: "w-24 px-3 py-2 border border-gray-300 rounded-lg text-center font-bold"
  }), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-gray-700"
  }, "%")), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500 mt-2"
  }, "Markup sobre o custo total (pratos + custos adicionais)")), totals && /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 mb-6 border-2 border-green-200"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold text-gray-800 mb-4"
  }, "\uD83D\uDCB5 Resumo Financeiro"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, "Custo dos Pratos"), /*#__PURE__*/React.createElement("p", {
    className: "text-xl font-bold text-gray-800"
  }, "R$ ", totals.dishesTotalCost.toFixed(2))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, "Custos Adicionais"), /*#__PURE__*/React.createElement("p", {
    className: "text-xl font-bold text-gray-800"
  }, "R$ ", (totals.transportCost + totals.laborCost + totals.otherCosts).toFixed(2))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, "Custo Total"), /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-bold text-red-600"
  }, "R$ ", totals.totalCost.toFixed(2))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, "Markup (", totals.markupPercent, "%)"), /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-bold text-blue-600"
  }, "R$ ", totals.markupValue.toFixed(2)))), /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-4 text-white text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm mb-1"
  }, "\uD83D\uDCB0 VALOR FINAL DA PROPOSTA"), /*#__PURE__*/React.createElement("p", {
    className: "text-4xl font-bold"
  }, "R$ ", totals.finalTotal.toFixed(2)), /*#__PURE__*/React.createElement("p", {
    className: "text-sm mt-2 opacity-90"
  }, "Margem total: ", totals.totalCost > 0 ? ((totals.finalTotal - totals.totalCost) / totals.totalCost * 100).toFixed(1) : 0, "%"))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-end space-x-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onCancel,
    className: "px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: handleSave,
    disabled: isSaving,
    className: "px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
  }, isSaving ? 'Salvando...' : proposal ? 'Salvar Alterações' : 'Criar Proposta')), showDishSelector && /*#__PURE__*/React.createElement(DishSelectorModal, {
    onSelect: handleAddDish,
    onClose: () => setShowDishSelector(false)
  }));
}

/**
 * Modal de Seleção de Prato
 */
function DishSelectorModal({
  onSelect,
  onClose
}) {
  const [dishes, setDishes] = React.useState([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  React.useEffect(() => {
    loadDishes();
  }, []);
  const loadDishes = async () => {
    try {
      // Usar ManagerHelper para pegar o manager correto (backend PostgreSQL > local)
      const dishManager = window.ManagerHelper?.getDishManager() || window.PrecificacaoAPI?.dishManager || window.dishManager;
      if (!dishManager) {
        console.error('❌ [DishSelectorModal] dishManager não disponível');
        setDishes([]);
        return;
      }

      // ⚡ Performance: Log removido (executava ao abrir modal de seleção de pratos)

      const allDishes = await dishManager.getActive();
      setDishes(allDishes || []);
    } catch (error) {
      console.error('Erro ao carregar pratos:', error);
      setDishes([]);
    }
  };
  const filteredDishes = dishes.filter(dish => dish.name.toLowerCase().includes(searchTerm.toLowerCase()) || dish.description?.toLowerCase().includes(searchTerm.toLowerCase()));
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-600 text-white px-6 py-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold"
  }, "Selecionar Prato")), /*#__PURE__*/React.createElement("div", {
    className: "p-6"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: searchTerm,
    onChange: e => setSearchTerm(e.target.value),
    placeholder: "\uD83D\uDD0D Buscar prato...",
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg mb-4",
    autoFocus: true
  }), /*#__PURE__*/React.createElement("div", {
    className: "max-h-96 overflow-y-auto"
  }, filteredDishes.length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4"
  }, filteredDishes.map(dish => /*#__PURE__*/React.createElement("button", {
    key: dish.id,
    onClick: () => onSelect(dish),
    className: "text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-gray-800"
  }, dish.name), dish.isFavorite && /*#__PURE__*/React.createElement("span", null, "\u2B50")), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 mb-2 line-clamp-2"
  }, dish.description || 'Sem descrição'), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-500"
  }, dish.servings, " por\xE7\xF5es"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-blue-600"
  }, "R$ ", dish.costPerServing?.toFixed(2), "/por\xE7\xE3o"))))) : /*#__PURE__*/React.createElement("p", {
    className: "text-center text-gray-500 py-8"
  }, "Nenhum prato encontrado"))), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 px-6 py-4 flex justify-end"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
  }, "Fechar"))));
}

// export default ProposalBuilder;

// Expor para window (browser global)
window.ProposalBuilder = ProposalBuilder;
})();
