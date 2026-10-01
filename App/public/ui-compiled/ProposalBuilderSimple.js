(function() {
/**
 * ===================================================================
 * PROPOSAL BUILDER SIMPLE - Construtor Simplificado de Propostas
 * ===================================================================
 * Versão simplificada: adiciona cardápio salvo + dados do evento atual
 */

function ProposalBuilderSimple({
  proposal = null,
  onSave,
  onCancel,
  eventData
}) {
  const {
    useState,
    useEffect
  } = React;
  const [formData, setFormData] = useState({
    id: null,
    // ID da proposta (para edição)
    clientId: null,  // ✅ ID do cliente vinculado
    proposalName: '',
    proposalType: 'standard',
    selectedMenuId: null,
    selectedMenuData: null,
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    clientAddress: '',
    eventDate: '',
    eventLocation: '',
    guests: 0,
    observations: '',
    markupPercent: 0,
    // Margem padrão 0%
    // Dados da empresa
    companyName: '',
    companyPhone: '',
    companyEmail: '',
    companyAddress: '',
    companyHistory: '',
    companyMission: '',
    companyVision: '',
    companyValues: '',
    companyMotivation: '',
    companyPhoto1: null,
    companyPhoto2: null,
    companyPhoto3: null,
    // Checkboxes para controlar quais campos da empresa exibir
    showCompanyName: true,
    showCompanyPhone: true,
    showCompanyEmail: true,
    showCompanyAddress: true,
    showCompanyHistory: true,
    showCompanyMission: true,
    showCompanyVision: true,
    showCompanyValues: true,
    showCompanyMotivation: true,
    showCompanyPhoto1: false,
    showCompanyPhoto2: false,
    showCompanyPhoto3: false,
    // Termos e Condições
    validityDays: 5,
    paymentMethod: '50% no fechamento e 50% um dia antes do evento',
    minConfirmationDays: 7,
    // Formas de Pagamento aceitas
    acceptCash: true,
    acceptCard: true,
    acceptPix: true,
    // Opções de exibição
    includeDishPhotos: true // Incluir fotos dos pratos por padrão
  });
  const [savedMenus, setSavedMenus] = useState([]);
  const [showMenuSelector, setShowMenuSelector] = useState(false);
  const [costs, setCosts] = useState(null);
  const [backendReady, setBackendReady] = useState(false);

  // Aguardar backend estar pronto
  useEffect(() => {
    const handleBackendReady = () => {
      console.log('✅ [ProposalBuilderSimple] Backend inicializado - pronto para carregar dados');
      setBackendReady(true);
    };

    // Se o backend já estiver pronto
    if (window.PrecificacaoAPI?.proposalManager) {
      console.log('✅ [ProposalBuilderSimple] Backend já está pronto');
      setBackendReady(true);
    } else {
      // Senão, aguardar evento
      window.addEventListener('backend-initialized', handleBackendReady);
      return () => window.removeEventListener('backend-initialized', handleBackendReady);
    }
  }, []);

  // Carregar cardápios salvos APÓS backend estar pronto
  useEffect(() => {
    if (backendReady) {
      loadSavedMenus();
    }
  }, [backendReady]);

  // Recarregar dados do evento sempre que eventData mudar
  useEffect(() => {
    loadEventData();
  }, [eventData]);

  // Carregar proposta para edição
  useEffect(() => {
    if (proposal) {
      console.log('📝 [ProposalBuilderSimple] Carregando proposta para edição:', {
        id: proposal.id,
        proposalName: proposal.proposalName
      });
      setFormData({
        id: proposal.id || null,
        // ✅ SALVAR ID NO FORMDATA
        clientId: proposal.clientId || proposal.client?.id || null,  // ✅ Preservar clientId ao editar
        proposalName: proposal.proposalName || '',
        proposalType: proposal.proposalType || 'standard',
        selectedMenuId: proposal.selectedMenuId || null,
        selectedMenuData: proposal.selectedMenuData || null,
        clientName: proposal.clientName || '',
        clientPhone: proposal.clientPhone || '',
        clientEmail: proposal.clientEmail || '',
        clientAddress: proposal.clientAddress || '',
        eventDate: proposal.eventDate || '',
        eventLocation: proposal.eventLocation || '',
        guests: proposal.guests || 0,
        observations: proposal.observations || '',
        markupPercent: proposal.markupPercent || 0,
        companyName: proposal.companyName || '',
        companyPhone: proposal.companyPhone || '',
        companyEmail: proposal.companyEmail || '',
        companyAddress: proposal.companyAddress || '',
        companyHistory: proposal.companyHistory || '',
        companyMission: proposal.companyMission || '',
        companyVision: proposal.companyVision || '',
        companyValues: proposal.companyValues || '',
        companyMotivation: proposal.companyMotivation || '',
        companyPhoto1: proposal.companyPhoto1 || null,
        companyPhoto2: proposal.companyPhoto2 || null,
        companyPhoto3: proposal.companyPhoto3 || null,
        // Checkboxes de exibição
        showCompanyName: proposal.showCompanyName !== undefined ? proposal.showCompanyName : true,
        showCompanyPhone: proposal.showCompanyPhone !== undefined ? proposal.showCompanyPhone : true,
        showCompanyEmail: proposal.showCompanyEmail !== undefined ? proposal.showCompanyEmail : true,
        showCompanyAddress: proposal.showCompanyAddress !== undefined ? proposal.showCompanyAddress : true,
        showCompanyHistory: proposal.showCompanyHistory !== undefined ? proposal.showCompanyHistory : false,
        showCompanyMission: proposal.showCompanyMission !== undefined ? proposal.showCompanyMission : false,
        showCompanyVision: proposal.showCompanyVision !== undefined ? proposal.showCompanyVision : false,
        showCompanyValues: proposal.showCompanyValues !== undefined ? proposal.showCompanyValues : false,
        showCompanyMotivation: proposal.showCompanyMotivation !== undefined ? proposal.showCompanyMotivation : false,
        showCompanyPhoto1: proposal.showCompanyPhoto1 !== undefined ? proposal.showCompanyPhoto1 : false,
        showCompanyPhoto2: proposal.showCompanyPhoto2 !== undefined ? proposal.showCompanyPhoto2 : false,
        showCompanyPhoto3: proposal.showCompanyPhoto3 !== undefined ? proposal.showCompanyPhoto3 : false,
        // Termos e Condições
        validityDays: proposal.validityDays || 15,
        paymentMethod: proposal.paymentMethod || 'A combinar',
        minConfirmationDays: proposal.minConfirmationDays || 7,
        // Formas de Pagamento
        acceptCash: proposal.acceptCash !== undefined ? proposal.acceptCash : true,
        acceptCard: proposal.acceptCard !== undefined ? proposal.acceptCard : true,
        acceptPix: proposal.acceptPix !== undefined ? proposal.acceptPix : true,
        // Opções de exibição
        includeDishPhotos: proposal.includeDishPhotos !== undefined ? proposal.includeDishPhotos : true
      });
    }
  }, [proposal]);
  const loadSavedMenus = async () => {
    try {
      console.log('🔄 [ProposalBuilderSimple] Carregando cardápios salvos...');

      // PRIORIDADE ABSOLUTA: Usar backend se disponível
      let savedMenusManager = null;

      // 1º: Tentar pegar do PrecificacaoAPI (backend)
      if (window.PrecificacaoAPI?.savedMenusManager) {
        savedMenusManager = window.PrecificacaoAPI.savedMenusManager;
        console.log('✅ [ProposalBuilderSimple] Usando PrecificacaoAPI.savedMenusManager (PostgreSQL)');
      }
      // 2º: Tentar pelo ManagerHelper
      else if (window.ManagerHelper?.getSavedMenusManager()) {
        savedMenusManager = window.ManagerHelper.getSavedMenusManager();
        console.log('✅ [ProposalBuilderSimple] Usando ManagerHelper.getSavedMenusManager()');
      }
      // 3º: Fallback para local (não deveria chegar aqui em modo cloud)
      else if (window.savedMenusManager) {
        savedMenusManager = window.savedMenusManager;
        console.warn('⚠️ [ProposalBuilderSimple] Usando window.savedMenusManager (LOCAL - não recomendado)');
      }
      if (!savedMenusManager) {
        console.warn('⚠️ [ProposalBuilderSimple] Nenhum savedMenusManager disponível');
        setSavedMenus([]);
        return;
      }
      console.log(`📡 [ProposalBuilderSimple] Manager final: ${savedMenusManager.constructor.name}`);

      // Usar getAll() para API ou getActive() para local
      let menus;
      if (savedMenusManager.constructor.name === 'SavedMenuManager') {
        // Manager da API - getAll() retorna array diretamente (já filtrado por isActive no backend)
        menus = await savedMenusManager.getAll();
      } else {
        // Manager local - getActive() retorna array diretamente
        menus = await savedMenusManager.getActive();
      }
      console.log(`✅ [ProposalBuilderSimple] ${menus.length} cardápios carregados:`, menus);

      // Garantir que seja um array
      setSavedMenus(Array.isArray(menus) ? menus : []);
    } catch (error) {
      console.error('❌ [ProposalBuilderSimple] Erro ao carregar cardápios:', error);
      setSavedMenus([]); // Garantir array vazio em caso de erro
    }
  };
  const loadEventData = () => {
    try {
      // Puxar dados do evento atual se disponível
      if (eventData) {
        setFormData(prev => {
          // Gerar nome da proposta automaticamente se estiver vazio e não for edição
          const clientName = eventData.clientData?.name || '';
          const autoProposalName = !proposal && !prev.proposalName && clientName ? `Proposta - ${clientName}` : prev.proposalName;
          return {
            ...prev,
            proposalName: autoProposalName,
            guests: eventData.guests || prev.guests,
            eventDate: eventData.eventDate || prev.eventDate,
            eventLocation: eventData.eventLocation || prev.eventLocation,
            // Dados do Cliente
            clientName: clientName,
            clientPhone: eventData.clientData?.phone || '',
            clientEmail: eventData.clientData?.email || '',
            clientAddress: eventData.clientData?.address || '',
            // Dados da Empresa
            companyName: eventData.proposalData?.companyName || prev.companyName,
            companyPhone: eventData.proposalData?.companyPhone || prev.companyPhone,
            companyEmail: eventData.proposalData?.companyEmail || prev.companyEmail,
            companyAddress: eventData.proposalData?.companyAddress || prev.companyAddress,
            companyHistory: eventData.proposalData?.companyHistory || prev.companyHistory,
            companyMission: eventData.proposalData?.companyMission || prev.companyMission,
            companyVision: eventData.proposalData?.companyVision || prev.companyVision,
            companyValues: eventData.proposalData?.companyValues || prev.companyValues,
            companyMotivation: eventData.proposalData?.companyMotivation || prev.companyMotivation,
            companyPhoto1: eventData.proposalData?.companyPhoto1 || prev.companyPhoto1,
            companyPhoto2: eventData.proposalData?.companyPhoto2 || prev.companyPhoto2,
            companyPhoto3: eventData.proposalData?.companyPhoto3 || prev.companyPhoto3
          };
        });

        // Puxar custos já calculados se disponíveis no eventData
        if (eventData.costs) {
          setCosts(eventData.costs);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do evento:', error);
    }
  };
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleSelectMenu = menu => {
    console.log('🔵 [handleSelectMenu] Menu selecionado:', menu);
    console.log('🔍 [handleSelectMenu] menu.menuData:', menu.menuData);
    console.log('🔍 [handleSelectMenu] menu.menuData?.dishes:', menu.menuData?.dishes);
    console.log('🔍 [handleSelectMenu] menu.menuData?.eventType:', menu.menuData?.eventType);
    setFormData(prev => ({
      ...prev,
      selectedMenuId: menu.id,
      selectedMenuData: menu
    }));
    setShowMenuSelector(false);
  };
  const handleRemoveMenu = () => {
    setFormData(prev => ({
      ...prev,
      selectedMenuId: null,
      selectedMenuData: null
    }));
  };
  const calculateTotalCost = () => {
    console.log('💰 calculateTotalCost - Iniciando cálculo COM INFLAÇÃO');
    console.log('💰 costs:', costs);

    // IMPORTANTE: usar costs.totalCost que JÁ INCLUI inflação aplicada
    // baseada em monthsUntilEvent no useCalculations
    //
    // costs.totalCost = applyInflation(subtotal, monthsUntilEvent)
    // onde subtotal = ingredientsCost + supportCost + transportCost + laborCost

    const totalWithInflation = costs?.totalCost || 0;
    console.log('💰 Total COM inflação (costs.totalCost):', totalWithInflation);
    console.log('💰 Breakdown:');
    console.log('   - Ingredientes:', costs?.ingredientsCost || 0);
    console.log('   - Apoio:', costs?.supportCost || 0);
    console.log('   - Transporte:', costs?.transportCost || 0);
    console.log('   - Mão de obra:', costs?.laborCost || 0);
    console.log('   - Subtotal sem inflação:', (costs?.ingredientsCost || 0) + (costs?.supportCost || 0) + (costs?.transportCost || 0) + (costs?.laborCost || 0));
    console.log('   - Total COM inflação:', totalWithInflation);
    return totalWithInflation;
  };
  const calculateFinalTotal = () => {
    const totalCost = calculateTotalCost();
    const markup = formData.markupPercent || 0;
    const finalTotal = totalCost * (1 + markup / 100);
    return finalTotal;
  };
  const handleSave = async () => {
    // Validação básica
    if (!formData.proposalName.trim()) {
      alert('❌ Por favor, digite um nome para a proposta');
      return;
    }
    if (!formData.selectedMenuId) {
      alert('❌ Por favor, selecione um cardápio');
      return;
    }
    if (!formData.guests || formData.guests <= 0) {
      alert('❌ Por favor, informe o número de convidados');
      return;
    }
    try {
      // PRIORIDADE ABSOLUTA: Usar backend (PostgreSQL)
      let proposalManager = null;

      // 1º: Tentar pegar do PrecificacaoAPI (backend)
      if (window.PrecificacaoAPI?.proposalManager) {
        proposalManager = window.PrecificacaoAPI.proposalManager;
        console.log('✅ [handleSave] Usando PrecificacaoAPI.proposalManager (PostgreSQL)');
      }
      // 2º: Tentar pelo ManagerHelper
      else if (window.ManagerHelper?.getProposalManager()) {
        proposalManager = window.ManagerHelper.getProposalManager();
        console.log('✅ [handleSave] Usando ManagerHelper.getProposalManager()');
      }
      // 3º: Fallback para local (não deveria chegar aqui em modo cloud)
      else if (window.proposalManager) {
        proposalManager = window.proposalManager;
        console.warn('⚠️ [handleSave] Usando window.proposalManager (LOCAL - não recomendado)');
      }
      if (!proposalManager) {
        alert('❌ Sistema de propostas não está pronto. Aguarde alguns segundos e tente novamente.');
        return;
      }
      console.log('📡 [handleSave] Manager final:', proposalManager?.constructor?.name);
      const totalCost = calculateTotalCost();
      const finalTotal = calculateFinalTotal();

      // Arredondar valores para cima
      const roundedTotalCost = Math.ceil(Number(totalCost) || 0);
      const roundedFinalTotal = Math.ceil(Number(finalTotal) || 0);
      console.log('💾 ===== SALVANDO PROPOSTA =====');
      console.log('💰 totalCost calculado:', totalCost, '→ arredondado:', roundedTotalCost);
      console.log('💵 finalTotal calculado:', finalTotal, '→ arredondado:', roundedFinalTotal);
      console.log('📊 markupPercent:', formData.markupPercent);
      console.log('📅 eventData:', eventData);
      console.log('📅 eventData.monthsUntilEvent:', eventData?.monthsUntilEvent);

      // Extrair pratos do cardápio selecionado para facilitar exibição
      const dishes = formData.selectedMenuData?.menuData?.dishes || formData.selectedMenuData?.dishes || [];
      console.log('🔍 [handleSave] Extraindo dishes:');
      console.log('  - selectedMenuData:', formData.selectedMenuData);
      console.log('  - menuData.dishes:', formData.selectedMenuData?.menuData?.dishes);
      console.log('  - dishes direto:', formData.selectedMenuData?.dishes);
      console.log('  - dishes extraído:', dishes);
      console.log('  - dishes.length:', dishes.length);
      const proposalData = {
        id: formData.id || null,
        // ✅ USAR formData.id (salvo no useEffect)
        status: 'draft',
        // ✅ Sempre resetar para "draft" ao salvar/editar
        proposalName: formData.proposalName,
        proposalType: formData.proposalType,
        selectedMenuId: formData.selectedMenuId,
        selectedMenuData: formData.selectedMenuData,
        dishes: dishes,
        // Array de pratos para exibição rápida
        // Dados do Cliente
        clientId: formData.clientId || eventData?.clientData?.id || null,  // ✅ Preservar clientId ao editar, ou pegar do evento
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        clientEmail: formData.clientEmail,
        clientAddress: formData.clientAddress,
        // Dados do Evento
        eventDate: formData.eventDate,
        eventLocation: formData.eventLocation,
        guests: parseInt(formData.guests),
        observations: formData.observations,
        // Dados da Empresa
        companyName: formData.companyName,
        companyPhone: formData.companyPhone,
        companyEmail: formData.companyEmail,
        companyAddress: formData.companyAddress,
        companyHistory: formData.companyHistory,
        companyMission: formData.companyMission,
        companyVision: formData.companyVision,
        companyValues: formData.companyValues,
        companyMotivation: formData.companyMotivation,
        companyPhoto1: formData.companyPhoto1,
        companyPhoto2: formData.companyPhoto2,
        companyPhoto3: formData.companyPhoto3,
        // Checkboxes de exibição dos campos da empresa
        showCompanyName: formData.showCompanyName,
        showCompanyPhone: formData.showCompanyPhone,
        showCompanyEmail: formData.showCompanyEmail,
        showCompanyAddress: formData.showCompanyAddress,
        showCompanyHistory: formData.showCompanyHistory,
        showCompanyMission: formData.showCompanyMission,
        showCompanyVision: formData.showCompanyVision,
        showCompanyValues: formData.showCompanyValues,
        showCompanyMotivation: formData.showCompanyMotivation,
        showCompanyPhoto1: formData.showCompanyPhoto1,
        showCompanyPhoto2: formData.showCompanyPhoto2,
        showCompanyPhoto3: formData.showCompanyPhoto3,
        // Termos e Condições
        validityDays: formData.validityDays,
        paymentMethod: formData.paymentMethod,
        minConfirmationDays: formData.minConfirmationDays,
        // Formas de Pagamento
        acceptCash: formData.acceptCash,
        acceptCard: formData.acceptCard,
        acceptPix: formData.acceptPix,
        // Opções de exibição
        includeDishPhotos: formData.includeDishPhotos,
        // Custos do resumo financeiro (garantir que sejam números)
        transportCost: Number(costs?.transportCost) || 0,
        laborCost: Number(costs?.laborCost) || 0,
        supportCost: Number(costs?.supportCost) || 0,
        ingredientsCost: Number(costs?.ingredientsCost) || 0,
        // Cálculos e margem (valores arredondados para cima)
        monthsUntilEvent: eventData?.monthsUntilEvent || 0,
        markup: Number(formData.markupPercent) || 0,
        totalCost: roundedTotalCost,
        markupPercent: Number(formData.markupPercent) || 0,
        finalTotal: roundedFinalTotal
        // dishes já foi definido na linha 384 - não duplicar aqui!
      };
      console.log('📝 Objeto proposalData antes de salvar:', proposalData);
      console.log('🆔 proposalData.id:', proposalData.id, '(null = criar novo, UUID = atualizar existente)');
      console.log('📊 proposalData.status:', proposalData.status, '(sempre "draft" ao salvar/editar)');
      console.log('💰 proposalData.totalCost:', proposalData.totalCost);
      console.log('💵 proposalData.finalTotal:', proposalData.finalTotal);
      const result = await proposalManager.saveProposal(proposalData);
      console.log('📦 Resultado do saveProposal:', result);
      if (result.success) {
        alert('✅ Proposta salva com sucesso!');
        // ✅ FIX: Usar result.data (resposta do backend) que contém o ID correto
        onSave(result.data || result.proposal);
      } else {
        // Erro de quota
        if (result.error === 'QuotaExceededError') {
          const message = `⚠️ ESPAÇO DE ARMAZENAMENTO INSUFICIENTE\n\n` + `Uso atual: ${result.storageSize}\n\n` + `${result.message}\n\n` + `Sugestões:\n` + `• Remova propostas antigas\n` + `• Use fotos menores (máx 800px)\n` + `• Desmarque fotos desnecessárias`;
          alert(message);

          // Perguntar se deseja salvar sem fotos
          if (confirm('Deseja tentar salvar a proposta sem as fotos da empresa?')) {
            const dataWithoutPhotos = {
              ...proposalData,
              companyPhoto1: null,
              companyPhoto2: null,
              companyPhoto3: null
            };
            const retryResult = proposalManager.saveProposal(dataWithoutPhotos);
            if (retryResult.success) {
              alert('✅ Proposta salva sem fotos!');
              onSave(retryResult.proposal);
            } else {
              alert('❌ Ainda não foi possível salvar. Por favor, remova propostas antigas.');
            }
          }
        } else {
          alert(`❌ ${result.message || 'Erro ao salvar proposta'}`);
        }
      }
    } catch (error) {
      console.error('Erro ao salvar proposta:', error);
      alert('❌ Erro ao salvar proposta: ' + (error.message || 'Erro desconhecido'));
    }
  };
  const getEventTypeLabel = type => {
    const icons = {
      'casamento': '💒',
      'corporativo': '🏢',
      'aniversario': '🎂',
      'formatura': '🎓',
      'churrasco': '🥩',
      'festa': '🎉',
      'outro': '🍽️'
    };
    return `${icons[type] || '🍽️'} ${type}`;
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "proposal-builder-simple"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold text-gray-800 mb-2"
  }, proposal ? '✏️ Editar Proposta' : '➕ Nova Proposta'), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600"
  }, "Selecione um card\xE1pio salvo e configure os dados do cliente")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold text-gray-700 mb-2"
  }, "\uD83D\uDCDD Nome da Proposta *"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: formData.proposalName,
    onChange: e => handleChange('proposalName', e.target.value),
    placeholder: "Ex: Proposta Churrasco Premium - Jo\xE3o Silva",
    className: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold text-gray-700 mb-2"
  }, "\uD83D\uDCDA Card\xE1pio *"), formData.selectedMenuData ? /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border-2 border-purple-300"
  }, (() => {
    console.log('🟣 [Render Card] formData.selectedMenuData:', formData.selectedMenuData);
    console.log('🟣 [Render Card] menuData:', formData.selectedMenuData.menuData);
    console.log('🟣 [Render Card] dishes:', formData.selectedMenuData.menuData?.dishes);
    return null;
  })(), /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-gray-800"
  }, formData.selectedMenuData.name), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 mt-1"
  }, getEventTypeLabel(formData.selectedMenuData.menuData?.eventType || formData.selectedMenuData.eventType)), formData.selectedMenuData.description && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 mt-2"
  }, formData.selectedMenuData.description), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-4 mt-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm"
  }, /*#__PURE__*/React.createElement("strong", null, (() => {
    const dishes = formData.selectedMenuData.menuData?.dishes || formData.selectedMenuData.dishes || [];
    return dishes.length;
  })()), " pratos"), /*#__PURE__*/React.createElement("span", {
    className: "text-sm"
  }, /*#__PURE__*/React.createElement("strong", null, "R$ ", (() => {
    // ✅ FIX: Usar menu.stats.totalCost (custo POR PESSOA) em vez de somar dish.dishCost (custo TOTAL)
    const costPerPerson = formData.selectedMenuData.stats?.totalCost || 0;
    return costPerPerson.toFixed(2);
  })()), " /pessoa"))), /*#__PURE__*/React.createElement("button", {
    onClick: handleRemoveMenu,
    className: "ml-4 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
  }, "\uD83D\uDDD1\uFE0F"))) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowMenuSelector(!showMenuSelector),
    className: "w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors"
  }, "\u2795 Selecionar Card\xE1pio Salvo"), showMenuSelector && !formData.selectedMenuData && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 max-h-96 overflow-y-auto space-y-2"
  }, savedMenus.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-center text-gray-500 py-4"
  }, "Nenhum card\xE1pio salvo dispon\xEDvel") : savedMenus.map(menu => {
    // ✅ Usar menu.stats.totalCost se disponível, senão calcular manualmente
    const dishes = menu.menuData?.dishes || menu.dishes || [];
    let costPerPerson = menu.stats?.totalCost || 0;

    // 🐛 DEBUG: Log completo do menu
    console.log('📋 [ProposalBuilder] Menu:', menu.name);
    console.log('  - menu.stats:', menu.stats);
    console.log('  - menu.stats?.totalCost:', menu.stats?.totalCost);
    console.log('  - costPerPerson inicial:', costPerPerson);
    console.log('  - dishes.length:', dishes.length);

    // ✅ FALLBACK: Se stats.totalCost for zero, calcular manualmente
    if (costPerPerson === 0 && dishes.length > 0) {
      console.log('⚠️ [ProposalBuilder] stats.totalCost zerado, calculando manualmente para:', menu.name);
      costPerPerson = dishes.reduce((sum, dish, index) => {
        // Mesma lógica do SavedMenusManager.calculateMenuStats
        const baseCost = dish.dishCost || dish.totalCost || 0;
        const totalWeight = dish.totalWeight || 0; // ✅ FIX: Usar 0, não 1
        const portionsPerPerson = dish.portionsPerPerson || 1;
        const gramsPerPerson = portionsPerPerson * 100;

        console.log(`  🍽️ Prato ${index + 1}: ${dish.dishName}`);
        console.log(`     - baseCost: R$ ${baseCost.toFixed(2)}`);
        console.log(`     - totalWeight: ${totalWeight}g`);
        console.log(`     - portionsPerPerson: ${portionsPerPerson}`);
        console.log(`     - gramsPerPerson: ${gramsPerPerson}g`);

        let dishCost = 0;
        if (totalWeight > 0) {
          // Se tem peso, calcular por grama
          const costPerGram = baseCost / totalWeight;
          dishCost = costPerGram * gramsPerPerson;
          console.log(`     - costPerGram: R$ ${costPerGram.toFixed(4)}`);
          console.log(`     - dishCost: R$ ${dishCost.toFixed(2)} (por peso)`);
        } else {
          // ✅ FIX: Se não tem peso, usar baseCost diretamente (NÃO dividir!)
          console.warn(`     ⚠️ Sem peso, usando baseCost direto: R$ ${baseCost.toFixed(2)}`);
          dishCost = baseCost;
        }
        return sum + dishCost;
      }, 0);
      console.log('✅ [ProposalBuilder] Custo total calculado:', costPerPerson.toFixed(2));
    }

    return /*#__PURE__*/React.createElement("div", {
      key: menu.id,
      onClick: () => handleSelectMenu(menu),
      className: "p-4 bg-white border border-gray-200 rounded-lg hover:border-orange-500 hover:shadow-md cursor-pointer transition-all"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-bold text-gray-800"
    }, menu.name), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-gray-600"
    }, getEventTypeLabel(menu.menuData?.eventType || menu.eventType), " \u2022 ", dishes.length, " pratos"), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-orange-600 font-semibold mt-1"
    }, "R$ ", costPerPerson.toFixed(2), " por pessoa"));
  }))), eventData?.clientData && /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 rounded-lg p-6 border border-blue-200"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-gray-800 mb-4"
  }, "\uD83D\uDC64 Cliente"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 text-sm"
  }, /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "Nome:"), " ", eventData.clientData.name), eventData.clientData.phone && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "Telefone:"), " ", eventData.clientData.phone), eventData.clientData.email && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "Email:"), " ", eventData.clientData.email), eventData.clientData.address && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "Endere\xE7o:"), " ", eventData.clientData.address)), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-3"
  }, "\u2139\uFE0F Cliente selecionado na aba \"Eventos\"")), /*#__PURE__*/React.createElement("div", {
    className: "bg-green-50 rounded-lg p-6 border border-green-200"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-gray-800 mb-4"
  }, "\uD83D\uDCC5 Dados do Evento"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-3 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Data *"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: formData.eventDate,
    onChange: e => handleChange('eventDate', e.target.value),
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Convidados *"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: formData.guests,
    onChange: e => handleChange('guests', e.target.value),
    placeholder: "100",
    min: "1",
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Local"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: formData.eventLocation,
    onChange: e => handleChange('eventLocation', e.target.value),
    placeholder: "Local do evento",
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
  })))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold text-gray-700 mb-2"
  }, "\uD83D\uDCAC Observa\xE7\xF5es"), /*#__PURE__*/React.createElement("textarea", {
    value: formData.observations,
    onChange: e => handleChange('observations', e.target.value),
    placeholder: "Observa\xE7\xF5es adicionais sobre a proposta...",
    rows: 3,
    className: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
  })), /*#__PURE__*/React.createElement("div", {
    className: "bg-orange-50 rounded-lg p-6 border border-orange-200"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-gray-800 mb-4"
  }, "\uD83D\uDCCB Termos e Condi\xE7\xF5es"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-3 gap-4 mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Validade da Proposta (dias)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: formData.validityDays,
    onChange: e => handleChange('validityDays', parseInt(e.target.value) || 15),
    min: "1",
    max: "90",
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Forma de Pagamento"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: formData.paymentMethod,
    onChange: e => handleChange('paymentMethod', e.target.value),
    placeholder: "Ex: A combinar, 50% antecipado",
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Confirma\xE7\xE3o m\xEDnima (dias)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: formData.minConfirmationDays,
    onChange: e => handleChange('minConfirmationDays', parseInt(e.target.value) || 7),
    min: "1",
    max: "30",
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "\uD83D\uDCB3 Formas de Pagamento Aceitas"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-4"
  }, /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 cursor-pointer"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: formData.acceptCash,
    onChange: e => handleChange('acceptCash', e.target.checked),
    className: "w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-gray-700"
  }, "\uD83D\uDCB5 Dinheiro")), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 cursor-pointer"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: formData.acceptCard,
    onChange: e => handleChange('acceptCard', e.target.checked),
    className: "w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-gray-700"
  }, "\uD83D\uDCB3 Cart\xE3o")), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 cursor-pointer"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: formData.acceptPix,
    onChange: e => handleChange('acceptPix', e.target.checked),
    className: "w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-gray-700"
  }, "\uD83D\uDCF1 PIX"))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-purple-50 rounded-lg p-6 border border-purple-200"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-gray-800 mb-4"
  }, "\uD83C\uDFE2 Informa\xE7\xF5es da Empresa na Proposta"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 mb-4"
  }, "Selecione quais informa\xE7\xF5es da empresa deseja exibir na proposta:"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: formData.showCompanyName,
    onChange: e => handleChange('showCompanyName', e.target.checked),
    className: "w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-gray-700"
  }, "Nome da Empresa")), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: formData.showCompanyPhone,
    onChange: e => handleChange('showCompanyPhone', e.target.checked),
    className: "w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-gray-700"
  }, "Telefone")), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: formData.showCompanyEmail,
    onChange: e => handleChange('showCompanyEmail', e.target.checked),
    className: "w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-gray-700"
  }, "E-mail")), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: formData.showCompanyAddress,
    onChange: e => handleChange('showCompanyAddress', e.target.checked),
    className: "w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-gray-700"
  }, "Endere\xE7o")), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: formData.showCompanyHistory,
    onChange: e => handleChange('showCompanyHistory', e.target.checked),
    className: "w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-gray-700"
  }, "Hist\xF3ria")), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: formData.showCompanyMission,
    onChange: e => handleChange('showCompanyMission', e.target.checked),
    className: "w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-gray-700"
  }, "Miss\xE3o")), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: formData.showCompanyVision,
    onChange: e => handleChange('showCompanyVision', e.target.checked),
    className: "w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-gray-700"
  }, "Vis\xE3o")), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: formData.showCompanyValues,
    onChange: e => handleChange('showCompanyValues', e.target.checked),
    className: "w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-gray-700"
  }, "Valores")), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: formData.showCompanyMotivation,
    onChange: e => handleChange('showCompanyMotivation', e.target.checked),
    className: "w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-gray-700"
  }, "Motiva\xE7\xE3o")), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: formData.showCompanyPhoto1,
    onChange: e => handleChange('showCompanyPhoto1', e.target.checked),
    className: "w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-gray-700"
  }, "Foto Principal")), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: formData.showCompanyPhoto2,
    onChange: e => handleChange('showCompanyPhoto2', e.target.checked),
    className: "w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-gray-700"
  }, "Foto Ambiente/Equipe")), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: formData.showCompanyPhoto3,
    onChange: e => handleChange('showCompanyPhoto3', e.target.checked),
    className: "w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-gray-700"
  }, "Foto Produtos/Servi\xE7os")))), costs && formData.selectedMenuData && formData.guests > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-6 border-2 border-orange-300"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-gray-800 mb-4"
  }, "\uD83D\uDCB0 Resumo de Custos"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 text-sm"
  }, costs.ingredientsCost > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between"
  }, /*#__PURE__*/React.createElement("span", null, "Ingredientes"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "R$ ", costs.ingredientsCost.toFixed(2))), costs.supportCost > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between"
  }, /*#__PURE__*/React.createElement("span", null, "Apoio"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "R$ ", costs.supportCost.toFixed(2))), costs.transportCost > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between"
  }, /*#__PURE__*/React.createElement("span", null, "Transporte"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "R$ ", costs.transportCost.toFixed(2))), costs.laborCost > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between"
  }, /*#__PURE__*/React.createElement("span", null, "M\xE3o de Obra"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "R$ ", costs.laborCost.toFixed(2))), /*#__PURE__*/React.createElement("div", {
    className: "border-t-2 border-orange-400 pt-2 mt-2 flex justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-lg font-bold"
  }, "CUSTO TOTAL"), /*#__PURE__*/React.createElement("span", {
    className: "text-2xl font-bold text-orange-600"
  }, "R$ ", Math.ceil(calculateTotalCost()).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-4 border-t border-orange-300"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "\uD83D\uDCC8 Margem de Lucro (%)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: formData.markupPercent === 0 ? 0 : formData.markupPercent,
    onChange: e => {
      const value = parseFloat(e.target.value);
      handleChange('markupPercent', isNaN(value) ? 0 : value);
    },
    placeholder: "30",
    step: "5",
    className: "w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-1"
  }, "\uD83D\uDCA1 Voc\xEA pode usar 0% para mostrar apenas o custo sem margem")), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-4 border-t border-orange-300"
  }, /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 cursor-pointer"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: formData.includeDishPhotos,
    onChange: e => handleChange('includeDishPhotos', e.target.checked),
    className: "w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium text-gray-700"
  }, "\uD83D\uDCF8 Incluir fotos dos pratos no card\xE1pio")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-1 ml-7"
  }, "Quando desmarcado, a proposta mostrar\xE1 apenas os nomes dos pratos")), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-4 border-t-2 border-green-400 flex justify-between bg-green-50 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-lg font-bold text-green-800"
  }, "VALOR FINAL"), /*#__PURE__*/React.createElement("span", {
    className: "text-2xl font-bold text-green-600"
  }, "R$ ", Math.ceil(calculateFinalTotal()).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-end gap-4 mt-8 pt-6 border-t border-gray-200"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onCancel,
    className: "px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: handleSave,
    className: "px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-colors font-bold shadow-lg"
  }, "\uD83D\uDCBE Salvar Proposta")));
}

// Expor para window
window.ProposalBuilderSimple = ProposalBuilderSimple;
})();
