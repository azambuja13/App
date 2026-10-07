(function() {
/**
 * ===================================================================
 * SAVE MENU MODAL - Modal para Salvar Cardápio
 * ===================================================================
 * Modal profissional com formulário completo para salvar cardápio
 */

// React hooks usados via React.useState, React.useEffect, etc.
function SaveMenuModal({
  isOpen,
  onClose,
  onSave,
  menuItems
}) {
  const [formData, setFormData] = React.useState({
    name: '',
    eventType: 'churrasco',
    description: ''
  });
  const [existingMenu, setExistingMenu] = React.useState(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = React.useState(false);
  const eventTypes = [{
    value: 'casamento',
    label: 'Casamento',
    icon: '💒'
  }, {
    value: 'corporativo',
    label: 'Corporativo',
    icon: '🏢'
  }, {
    value: 'aniversario',
    label: 'Aniversário',
    icon: '🎂'
  }, {
    value: 'formatura',
    label: 'Formatura',
    icon: '🎓'
  }, {
    value: 'churrasco',
    label: 'Churrasco',
    icon: '🥩'
  }, {
    value: 'festa',
    label: 'Festa',
    icon: '🎉'
  }, {
    value: 'outro',
    label: 'Outro',
    icon: '🍽️'
  }];
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleSubmit = async e => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('❌ Por favor, digite um nome para o cardápio');
      return;
    }

    // Verificar se já existe um cardápio com o mesmo nome
    // ✅ USAR a mesma ordem de prioridade que MenuPage
    try {
      const savedMenusManager = window.ManagerHelper?.getSavedMenusManager() || window.PrecificacaoAPI?.savedMenusManager || window.savedMenusManager;
      if (savedMenusManager) {
        console.log('🔍 [SaveMenuModal] Verificando cardápios existentes...');
        const allMenus = await savedMenusManager.getAll();
        console.log('📋 [SaveMenuModal] Total de cardápios:', allMenus.length);

        const existing = allMenus.find(m =>
          m.name && m.name.toLowerCase().trim() === formData.name.toLowerCase().trim()
        );

        if (existing) {
          console.log('⚠️ [SaveMenuModal] Cardápio já existe:', existing.id, existing.name);
          setExistingMenu(existing);
          setShowOverwriteConfirm(true);
          return;
        } else {
          console.log('✅ [SaveMenuModal] Nenhum cardápio com esse nome encontrado');
        }
      } else {
        console.warn('⚠️ [SaveMenuModal] SavedMenusManager não disponível');
      }
    } catch (error) {
      console.error('❌ [SaveMenuModal] Erro ao verificar cardápios existentes:', error);
    }

    onSave(formData);
    handleClose();
  };

  const handleOverwrite = () => {
    // Passar o ID do cardápio existente para sobrescrever
    onSave({ ...formData, id: existingMenu.id, overwrite: true });
    setShowOverwriteConfirm(false);
    setExistingMenu(null);
    handleClose();
  };

  const handleCancelOverwrite = () => {
    setShowOverwriteConfirm(false);
    setExistingMenu(null);
  };
  const handleClose = () => {
    setFormData({
      name: '',
      eventType: 'churrasco',
      description: ''
    });
    setExistingMenu(null);
    setShowOverwriteConfirm(false);
    onClose();
  };
  if (!isOpen) return null;
  const selectedType = eventTypes.find(t => t.value === formData.eventType);
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-xl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold mb-1"
  }, "\uD83D\uDCBE Salvar Card\xE1pio"), /*#__PURE__*/React.createElement("p", {
    className: "text-purple-100 text-sm"
  }, "Salvar como template reutiliz\xE1vel")), /*#__PURE__*/React.createElement("button", {
    onClick: handleClose,
    className: "text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-6 h-6",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M6 18L18 6M6 6l12 12"
  }))))), /*#__PURE__*/React.createElement("form", {
    onSubmit: handleSubmit,
    className: "p-6 space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 rounded-lg p-4 border border-blue-200"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-blue-900 font-medium mb-2"
  }, "\uD83D\uDCCA Este card\xE1pio cont\xE9m:"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-6"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl font-bold text-blue-600"
  }, menuItems?.length || 0), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-blue-700 ml-2"
  }, menuItems?.length === 1 ? 'prato' : 'pratos')), menuItems && menuItems.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-blue-600"
  }, menuItems.map(item => item.dishName).join(', ')))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold text-gray-700 mb-2"
  }, "\uD83D\uDCDD Nome do Card\xE1pio *"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: formData.name,
    onChange: e => handleChange('name', e.target.value),
    placeholder: "Ex: Churrasco Premium, Casamento Elegante...",
    className: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg",
    autoFocus: true,
    required: true
  }), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-xs text-gray-500"
  }, "Escolha um nome descritivo para encontrar facilmente depois")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold text-gray-700 mb-2"
  }, "\uD83C\uDFAD Tipo de Evento *"), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("select", {
    value: formData.eventType,
    onChange: e => handleChange('eventType', e.target.value),
    className: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white text-lg cursor-pointer",
    required: true
  }, eventTypes.map(type => /*#__PURE__*/React.createElement("option", {
    key: type.value,
    value: type.value
  }, type.icon, " ", type.label))), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-5 h-5 text-gray-400",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M19 9l-7 7-7-7"
  })))), selectedType && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex items-center gap-2 text-sm text-purple-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, selectedType.icon), /*#__PURE__*/React.createElement("span", null, "Selecionado: ", /*#__PURE__*/React.createElement("strong", null, selectedType.label)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold text-gray-700 mb-2"
  }, "\uD83D\uDCC4 Descri\xE7\xE3o (opcional)"), /*#__PURE__*/React.createElement("textarea", {
    value: formData.description,
    onChange: e => handleChange('description', e.target.value),
    placeholder: "Ex: Card\xE1pio completo para churrasco de 100 pessoas, inclui carnes nobres e acompanhamentos...",
    rows: 4,
    className: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
  }), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-xs text-gray-500"
  }, "Adicione detalhes que ajudem a identificar este card\xE1pio no futuro")), menuItems && menuItems.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold text-gray-700 mb-3"
  }, "\uD83C\uDF7D\uFE0F Pratos que ser\xE3o salvos"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-4 border border-gray-200"
  }, menuItems.map((item, index) => /*#__PURE__*/React.createElement("div", {
    key: index,
    className: "flex items-center justify-between bg-white rounded-lg p-3 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-medium text-gray-800"
  }, item.dishName), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, item.dishCategory)), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-purple-600"
  }, item.portionsPerPerson, "x por pessoa"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "R$ ", (() => {
    const dishCost = item.dishCost || 0;
    const portionsPerPerson = item.portionsPerPerson || 0;

    // NOVA REGRA: Se houver ingrediente por unidade, calcular por porções
    const isPortionBased = window.isDishPortionBased ? window.isDishPortionBased(item) : item.servings > 0 && item.totalWeight === 0;
    if (isPortionBased) {
      // Custo por porção do prato
      const servings = item.servings || 1;
      const costPerDishPortion = dishCost / servings;
      // Multiplicar pelas porções que cada pessoa consome
      const costPerPerson = costPerDishPortion * portionsPerPerson;
      return costPerPerson.toFixed(2);
    }

    // Se o prato é por peso, calcular por grama (comportamento original)
    const totalWeight = item.totalWeight || 1;
    const gramsPerPerson = portionsPerPerson * 100;
    const costPerGram = dishCost / totalWeight;
    const costPerPortion = costPerGram * gramsPerPerson;
    return costPerPortion.toFixed(2);
  })())))))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-end gap-3 pt-4 border-t border-gray-200"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleClose,
    className: "px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors font-bold shadow-lg"
  }, "\uD83D\uDCBE Salvar Card\xE1pio")))), showOverwriteConfirm && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-60"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-3xl"
  }, "\u26A0\uFE0F")), /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold text-gray-800 mb-2"
  }, "Card\xE1pio j\xE1 existe!"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 mb-2"
  }, "J\xE1 existe um card\xE1pio com o nome:"), /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-semibold text-purple-600 mb-4"
  }, "\"", existingMenu?.name, "\""), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 mb-6"
  }, "Deseja sobrescrever o card\xE1pio existente?")), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleCancelOverwrite,
    className: "flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: handleOverwrite,
    className: "flex-1 px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-bold"
  }, "\uD83D\uDD04 Sobrescrever")))));
}

// Expor para window
window.SaveMenuModal = SaveMenuModal;
})();
