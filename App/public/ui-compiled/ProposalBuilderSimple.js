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
    useEffect,
    useRef
  } = React;
  const [formData, setFormData] = useState({
    id: null,
    // ID da proposta (para edição)
    clientId: null,  // ✅ ID do cliente vinculado
    proposalName: '',
    proposalType: 'standard',
    selectedMenuId: null,
    selectedMenuData: null,
    // ✅ Tipo de total a usar na proposta:
    // 'items' = Total Itens (ingredientes do evento)
    // 'menu_cost' = Total Pratos (cardápio sem margem)
    // 'menu_price' = Total Pratos + Margem (cardápio com margem)
    totalType: 'menu_price',
    // Regras de preço (out/2026): valores da PRÓPRIA proposta
    pricingMode: (window.PricingRules ? window.PricingRules.get().defaultPricingMode : 'markup'),
    supportCost: 0,
    laborCost: 0,
    transportCost: 0,
    itemsCostPerPerson: 0,
    inflationMonths: null, // null = automático pela data do evento
    proteinSafetyPct: null, // margem de segurança das proteínas (%); null = a das regras (Custos da empresa)
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
  const selectedMenuIdRef = useRef(null);
  const eventFieldsLoadedRef = useRef(false);
  // Proposta antiga (sem regras gravadas): mantém o valor salvo até o usuário mudar algum dado de preço
  const legacySigRef = useRef(null);
  // Insumos do cliente: lista do que o cliente compra (cardápio × convidados desta proposta)
  const [listaCliente, setListaCliente] = useState(null);
  const pricingSig = fd => JSON.stringify([parseInt(fd.guests) || 0, fd.selectedMenuId || null, fd.totalType || '', fd.pricingMode || 'markup',
    Number(fd.supportCost) || 0, Number(fd.laborCost) || 0, Number(fd.transportCost) || 0, Math.round((Number(fd.itemsCostPerPerson) || 0) * 100),
    Number(fd.markupPercent) || 0, fd.inflationMonths == null || fd.inflationMonths === '' ? null : Number(fd.inflationMonths) || 0,
    fd.proteinSafetyPct == null || fd.proteinSafetyPct === '' ? null : Number(fd.proteinSafetyPct) || 0,
    fd.clientSupply && fd.clientSupply.enabled ? JSON.stringify(fd.clientSupply) : null]);

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

  // Manter ref do selectedMenuId sempre atualizado (evita closure stale)
  useEffect(() => {
    selectedMenuIdRef.current = formData.selectedMenuId;
  }, [formData.selectedMenuId]);

  // Recarregar cardápios quando um cardápio for vinculado ou atualizado
  useEffect(() => {
    const handleMenuChange = async () => {
      if (!backendReady) return;
      console.log('🔄 [ProposalBuilderSimple] Cardápio alterado - recarregando lista...');
      loadSavedMenus();
      // Se o cardápio ativo está selecionado, recarregar os pratos atualizados
      if (selectedMenuIdRef.current === 'active-menu' && !proposal) { // proposta em edição não muda sozinha
        const menuManager = window.menuManager;
        if (!menuManager) return;
        try {
          const activeMenu = await menuManager.getActiveMenu();
          const statistics = await menuManager.getStatistics();
          console.log('🔄 [ProposalBuilderSimple] Atualizando cardápio ativo:', activeMenu.length, 'pratos');
          setFormData(prev => ({
            ...prev,
            selectedMenuData: {
              ...prev.selectedMenuData,
              menuData: {
                ...prev.selectedMenuData?.menuData,
                dishes: activeMenu
              },
              dishes: activeMenu,
              stats: statistics || prev.selectedMenuData?.stats
            }
          }));
        } catch (e) {
          console.error('❌ [ProposalBuilderSimple] Erro ao recarregar cardápio ativo:', e);
        }
      }
    };
    window.addEventListener('menu-linked', handleMenuChange);
    window.addEventListener('menu-updated', handleMenuChange);
    return () => {
      window.removeEventListener('menu-linked', handleMenuChange);
      window.removeEventListener('menu-updated', handleMenuChange);
    };
  }, [backendReady]);

  // Auto-selecionar cardápio vinculado ao evento (se existir)
  // Também atualiza selectedMenuData quando o cardápio é editado e savedMenus recarrega
  useEffect(() => {
    if (!proposal && eventData?.linkedMenuId && savedMenus.length > 0) {
      const linkedMenu = savedMenus.find(m => m.id === eventData.linkedMenuId);
      if (linkedMenu) {
        // Seleciona se ainda não há menu escolhido, OU atualiza os dados se o vinculado já estava selecionado
        if (!formData.selectedMenuId || formData.selectedMenuId === eventData.linkedMenuId) {
          console.log('📋 [ProposalBuilderSimple] Atualizando cardápio vinculado:', linkedMenu.name);
          setFormData(prev => ({
            ...prev,
            selectedMenuId: linkedMenu.id,
            selectedMenuData: linkedMenu
          }));
        }
      } else {
        console.log('⚠️ [ProposalBuilderSimple] Cardápio vinculado não encontrado:', eventData.linkedMenuId);
      }
    }
  }, [eventData?.linkedMenuId, savedMenus]);

  // Auto-selecionar cardápio ativo do evento (se não houver linkedMenuId)
  useEffect(() => {
    const loadActiveMenu = async () => {
      // Só executar se não há linkedMenuId e nenhum menu já selecionado
      if (proposal || eventData?.linkedMenuId || formData.selectedMenuId) return;

      const menuManager = window.menuManager;
      if (!menuManager) return;

      try {
        const activeMenu = await menuManager.getActiveMenu();
        if (!activeMenu || activeMenu.length === 0) return;

        const statistics = await menuManager.getStatistics();
        console.log('📋 [ProposalBuilderSimple] Usando cardápio ativo do evento:', activeMenu.length, 'pratos');

        // Criar estrutura compatível com savedMenu
        const activeMenuData = {
          id: 'active-menu',
          name: eventData?.linkedMenuName || 'Cardápio do Evento',
          description: '',
          menuData: {
            dishes: activeMenu,
            eventType: 'custom'
          },
          dishes: activeMenu,
          stats: statistics || { totalCost: 0, totalPrice: 0, totalDishes: activeMenu.length }
        };

        setFormData(prev => ({
          ...prev,
          selectedMenuId: 'active-menu',
          selectedMenuData: activeMenuData
        }));
      } catch (error) {
        console.error('❌ [ProposalBuilderSimple] Erro ao carregar cardápio ativo:', error);
      }
    };

    loadActiveMenu();
  }, [eventData?.linkedMenuId, backendReady]);

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
      const loadedFd = {
        id: proposal.id || null,
        // ✅ SALVAR ID NO FORMDATA
        clientId: proposal.clientId || proposal.client?.id || null,  // ✅ Preservar clientId ao editar
        proposalName: proposal.proposalName || '',
        proposalType: proposal.proposalType || 'standard',
        selectedMenuId: proposal.selectedMenuId || null,
        selectedMenuData: proposal.selectedMenuData || null,
        // ✅ Compatibilidade: converter useMenuWithMargin antigo para totalType
        totalType: proposal.totalType || (proposal.useMenuWithMargin ? 'menu_price' : 'menu_cost'),
        pricingMode: proposal.pricingMode || 'markup',
        supportCost: Number(proposal.supportCost) || 0,
        laborCost: Number(proposal.laborCost) || 0,
        transportCost: Number(proposal.transportCost) || 0,
        itemsCostPerPerson: proposal.itemsCostPerPerson != null ? Number(proposal.itemsCostPerPerson) : ((Number(proposal.ingredientsCost) || 0) / (Number(proposal.guests) || 1)),
        inflationMonths: proposal.inflationMonths != null ? Number(proposal.inflationMonths) : 0, // propostas antigas: o valor gravado não tinha correção
        proteinSafetyPct: null, // vem das regras gravadas na proposta (pricingSnapshot.proteinSafetyPct; propostas antigas = 0)
        // Insumos do cliente (out/2026)
        clientSupply: proposal.clientSupply || null,
        clientSupplyList: proposal.clientSupplyList || null,
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
      };
      legacySigRef.current = proposal.pricingSnapshot ? null : pricingSig(loadedFd);
      setFormData(loadedFd);
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
      // Puxar dados do evento atual se disponível (só para proposta NOVA;
      // ao editar, a proposta mantém os próprios convidados, cliente e custos)
      if (eventData && !proposal) {
        // Dados do evento entram uma vez só (depois o usuário pode mudar convidados etc. na proposta)
        const firstLoad = !eventFieldsLoadedRef.current;
        eventFieldsLoadedRef.current = true;
        setFormData(prev => {
          // Gerar nome da proposta automaticamente se estiver vazio e não for edição
          const clientName = eventData.clientData?.name || '';
          const autoProposalName = !proposal && !prev.proposalName && clientName ? `Proposta - ${clientName}` : prev.proposalName;
          return {
            ...prev,
            proposalName: autoProposalName,
            guests: firstLoad ? (eventData.guests || prev.guests) : prev.guests,
            eventDate: firstLoad ? (eventData.eventDate || prev.eventDate) : prev.eventDate,
            inflationMonths: firstLoad && eventData.monthsUntilEvent != null && eventData.monthsUntilEvent !== '' && !isNaN(Number(eventData.monthsUntilEvent)) ? Number(eventData.monthsUntilEvent) : prev.inflationMonths,
            proteinSafetyPct: firstLoad && !proposal && eventData.proteinSafetyPct != null && eventData.proteinSafetyPct !== '' ? Number(eventData.proteinSafetyPct) : prev.proteinSafetyPct,
            clientSupply: firstLoad && eventData.clientSupply && eventData.clientSupply.enabled ? eventData.clientSupply : prev.clientSupply,
            clientSupplyList: firstLoad && eventData.clientSupply && eventData.clientSupply.enabled ? (eventData.clientSupplyList || null) : prev.clientSupplyList,
            eventLocation: firstLoad ? (eventData.eventLocation || prev.eventLocation) : prev.eventLocation,
            // Dados do Cliente
            clientName: firstLoad ? clientName : prev.clientName,
            clientPhone: firstLoad ? (eventData.clientData?.phone || '') : prev.clientPhone,
            clientEmail: firstLoad ? (eventData.clientData?.email || '') : prev.clientEmail,
            clientAddress: firstLoad ? (eventData.clientData?.address || '') : prev.clientAddress,
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
          const c = eventData.costs;
          const eg = Number(eventData.guests) || 0;
          setFormData(prev => ({
            ...prev,
            supportCost: Number(c.supportCost) || 0,
            laborCost: Number(c.laborCost) || 0,
            transportCost: Number(c.transportCost) || 0,
            itemsCostPerPerson: eg > 0 ? (Number(c.ingredientsCost) || 0) / eg : 0
          }));
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
    legacySigRef.current = null; // escolheu o cardápio de novo: recalcula com as regras novas
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
    legacySigRef.current = null;
    setFormData(prev => ({
      ...prev,
      selectedMenuId: null,
      selectedMenuData: null
    }));
  };
  // ✅ Cálculo pela PRÓPRIA proposta: cardápio escolhido × convidados da proposta
  //    + apoio/mão de obra/transporte guardados na proposta (regras em utils/pricing-rules.js)
  // Proposta em edição usa as regras gravadas nela (snapshot); nova usa as configurações atuais
  const [, setRulesTick] = useState(0);
  const [pricingSettings, setPricingSettings] = useState(() => (proposal && proposal.pricingSnapshot) || (window.PricingRules ? window.PricingRules.get() : null));
  useEffect(() => {
    const upd = () => { setRulesTick(t => t + 1); if (proposal && proposal.pricingSnapshot) return; setPricingSettings(window.PricingRules ? window.PricingRules.get() : null); };
    window.addEventListener('pricing-settings-updated', upd);
    window.addEventListener('backend-phase2-complete', upd);
    return () => { window.removeEventListener('pricing-settings-updated', upd); window.removeEventListener('backend-phase2-complete', upd); };
  }, []);
  const autoMonths = window.PricingRules ? window.PricingRules.monthsUntil(formData.eventDate) : 0;
  const effectiveMonths = formData.inflationMonths != null && formData.inflationMonths !== '' ? Number(formData.inflationMonths) || 0 : autoMonths;
  const monthsFor = fd => fd.inflationMonths != null && fd.inflationMonths !== '' ? Number(fd.inflationMonths) || 0 : (window.PricingRules ? window.PricingRules.monthsUntil(fd.eventDate) : 0);
  // % da margem de segurança das proteínas: o da proposta, senão o das regras usadas (propostas antigas: 0)
  const proteinPctFor = (fd, rulesOverride) => {
    if (fd.proteinSafetyPct != null && fd.proteinSafetyPct !== '' && isFinite(Number(fd.proteinSafetyPct))) return Math.max(0, Number(fd.proteinSafetyPct));
    const r = rulesOverride || pricingSettings || {};
    return r.proteinSafetyPct != null && isFinite(Number(r.proteinSafetyPct)) ? Math.max(0, Number(r.proteinSafetyPct)) : 0;
  };
  // Parte de proteína do custo/preço por pessoa do cardápio escolhido (base da margem)
  const proteinBaseFor = fd => {
    try {
      const md = fd.selectedMenuData || {};
      const dishes = (md.menuData && md.menuData.dishes) || md.dishes || [];
      if (!window.PricingRules || !window.PricingRules.menuProteinBase || !dishes.length) return { cost: 0, price: 0 };
      return window.PricingRules.menuProteinBase(dishes, (window.eventState && window.eventState.ingredientsDatabase) || []);
    } catch (e) { return { cost: 0, price: 0 }; }
  };
  // Parte do cardápio que o cliente compra (custo e preço por pessoa), pelos ingredientes dos pratos
  const clientShareFor = fd => {
    const zero = { menu: { cost: 0, price: 0 }, protein: { cost: 0, price: 0 } };
    try {
      const CS = window.ClientSupply, PR = window.PricingRules;
      if (!CS || !PR || !PR.menuShareBase || !fd.clientSupply || !fd.clientSupply.enabled) return zero;
      const md = fd.selectedMenuData || {};
      const dishes = (md.menuData && md.menuData.dishes) || md.dishes || [];
      if (!dishes.length) return zero;
      const db = (window.eventState && window.eventState.ingredientsDatabase) || [];
      const pred = (ing, cat) => CS.ingrediente(ing.ingredientName || ing.name, cat, fd.clientSupply);
      return { menu: PR.menuShareBase(dishes, db, pred), protein: PR.menuShareBase(dishes, db, (ing, cat) => PR.isProteinCategory(cat) && pred(ing, cat)) };
    } catch (e) { return zero; }
  };
  const computeProposal = (fd = formData, rulesOverride = null) => {
    const stats = fd.selectedMenuData?.stats || {};
    // Proposta antiga sem os números do cardápio salvos: mantém o valor gravado (não recalcula às cegas)
    if (proposal && (!(Number(stats.totalCost) > 0) || (legacySigRef.current && pricingSig(fd) === legacySigRef.current))) {
      const fin = Number(proposal.finalTotal) || 0;
      const dc = Number(proposal.totalCost) || 0;
      return { legacy: true, mode: 'markup', directCost: dc, finalTotal: fin, finalTotalRounded: Math.ceil(fin), foodCost: 0, foodPrice: 0,
        support: Number(fd.supportCost) || 0, labor: Number(fd.laborCost) || 0, transport: Number(fd.transportCost) || 0,
        servicesPrice: 0, inflationAmount: 0, months: 0, salesDeductions: 0, profit: fin - dc, profitPct: fin > 0 ? Math.round((fin - dc) / fin * 10000) / 100 : 0,
        markupOnCostPct: dc > 0 ? Math.round((fin / dc - 1) * 10000) / 100 : 0, cmvPct: 0,
        pricePerPerson: (parseInt(fd.guests) || 0) > 0 ? fin / parseInt(fd.guests) : 0, noProfit: false, doubleMargin: false };
    }
    // Margem de segurança das proteínas: parte de proteína dos pratos × %
    const safetyPct = proteinPctFor(fd, rulesOverride);
    const pbAll = proteinBaseFor(fd);
    const temPreco = Number(stats.totalPrice) > 0;
    // Insumos do cliente: a parte dos pratos que o cliente compra sai do custo e do preço (e da margem de segurança)
    const cli = clientShareFor(fd);
    const pb = { cost: Math.max(0, pbAll.cost - cli.protein.cost), price: Math.max(0, pbAll.price - cli.protein.price) };
    const args = {
      perPersonCost: Math.max(0, (Number(stats.totalCost) || 0) - cli.menu.cost) + pb.cost * safetyPct / 100,
      perPersonPrice: Math.max(0, (Number(stats.totalPrice) || Number(stats.totalCost) || 0) - (temPreco ? cli.menu.price : cli.menu.cost)) + (temPreco ? pb.price : pb.cost) * safetyPct / 100,
      prepFee: window.ClientSupply ? window.ClientSupply.taxa(fd.clientSupply, parseInt(fd.guests) || 0) : 0,
      itemsCostPerPerson: Number(fd.itemsCostPerPerson) || 0,
      guests: parseInt(fd.guests) || 0,
      totalType: fd.totalType,
      supportCost: Number(fd.supportCost) || 0,
      laborCost: Number(fd.laborCost) || 0,
      transportCost: Number(fd.transportCost) || 0,
      months: monthsFor(fd),
      pricingMode: fd.pricingMode,
      extraPct: Number(fd.markupPercent) || 0,
      settings: rulesOverride || pricingSettings || {}
    };
    if (window.PricingRules) return window.PricingRules.calcProposal(args);
    const base = args.totalType === 'menu_price' ? args.perPersonPrice : args.perPersonCost;
    const direct = args.perPersonCost * args.guests + args.supportCost + args.laborCost + args.transportCost;
    const fin = (base * args.guests + args.supportCost + args.laborCost + args.transportCost) * (1 + args.extraPct / 100);
    return { directCost: direct, finalTotal: fin, finalTotalRounded: Math.ceil(fin), profit: fin - direct, profitPct: fin > 0 ? (fin - direct) / fin * 100 : 0 };
  };
  const csKey = formData.clientSupply && formData.clientSupply.enabled ? JSON.stringify(formData.clientSupply) : '';
  useEffect(() => {
    let vivo = true;
    if (!csKey || !window.ClientSupply) { setListaCliente(null); return; }
    const db = (window.eventState && window.eventState.ingredientsDatabase) || [];
    window.ClientSupply.listaDaProposta({ ...formData, pricingSnapshot: pricingSettings }, db).then(l => { if (vivo) setListaCliente(l); }).catch(() => { if (vivo) setListaCliente(null); });
    return () => { vivo = false; };
  }, [csKey, formData.selectedMenuId, formData.guests, formData.proteinSafetyPct]);
  const listaClienteAtual = () => {
    const cs = formData.clientSupply;
    if (!cs || !cs.enabled) return null;
    const salvo = formData.clientSupplyList || {};
    return { itens: listaCliente || salvo.itens || [], apoio: salvo.apoio || [] };
  };
  // 🔄 Puxar dados do evento aberto para a proposta em edição (com prévia e desfazer)
  const [pullPreview, setPullPreview] = useState(null);
  const [pullUndo, setPullUndo] = useState(null);
  const RULE_KEYS = ['taxesPct', 'cardFeesPct', 'fixedCostsPct', 'targetProfitPct', 'serviceMarkupPct', 'inflationMonthlyPct'];
  const sameRules = (a, b) => !a || !b || RULE_KEYS.every(k => (Number(a[k]) || 0) === (Number(b[k]) || 0));
  const currentRules = () => window.PricingRules ? window.PricingRules.get() : null;
  const eventHasData = !!(eventData && ((Number(eventData.guests) || 0) > 0 || eventData.eventDate || eventData.costs));
  const buildEventPatch = () => {
    const ed = eventData || {};
    const c = ed.costs || null;
    const eg = Number(ed.guests) || 0;
    const cd = ed.clientData || {};
    const patch = {};
    if (eg > 0) patch.guests = eg;
    if (ed.eventDate) patch.eventDate = ed.eventDate;
    const em = ed.monthsUntilEvent;
    if (em != null && em !== '' && !isNaN(Number(em))) patch.inflationMonths = Number(em); // mesmos meses de correção do evento
    else if (ed.eventDate && ed.eventDate !== formData.eventDate) patch.inflationMonths = null; // data nova: calcula pelos meses até o evento
    if (ed.eventLocation) patch.eventLocation = ed.eventLocation;
    if (ed.proteinSafetyPct != null && ed.proteinSafetyPct !== '') patch.proteinSafetyPct = Number(ed.proteinSafetyPct) || 0;
    // Insumos do cliente: a escolha e a lista do evento (inclui o apoio que o cliente traz)
    patch.clientSupply = ed.clientSupply && ed.clientSupply.enabled ? ed.clientSupply : null;
    patch.clientSupplyList = patch.clientSupply ? (ed.clientSupplyList || null) : null;
    if (cd.name) {
      patch.clientName = cd.name; patch.clientPhone = cd.phone || ''; patch.clientEmail = cd.email || ''; patch.clientAddress = cd.address || '';
      patch.clientId = cd.id || null;
    }
    if (c) {
      patch.supportCost = Number(c.supportCost) || 0;
      patch.laborCost = Number(c.laborCost) || 0;
      patch.transportCost = Number(c.transportCost) || 0;
      if (eg > 0) patch.itemsCostPerPerson = (Number(c.ingredientsCost) || 0) / eg;
    }
    return patch;
  };
  const openPull = () => {
    if (!eventHasData) return;
    const cur = currentRules();
    const rulesDiffer = !!(cur && pricingSettings && !sameRules(pricingSettings, cur));
    setPullPreview({ patch: buildEventPatch(), rulesDiffer, useCurrentRules: rulesDiffer });
  };
  const applyPull = () => {
    if (!pullPreview) return;
    const keys = Object.keys(pullPreview.patch);
    setPullUndo({ prev: keys.reduce((o, k) => { o[k] = formData[k]; return o; }, {}), pricingSettings, costs });
    setFormData(prev => ({ ...prev, ...pullPreview.patch }));
    if (pullPreview.useCurrentRules) setPricingSettings(currentRules());
    if (eventData && eventData.costs) setCosts(eventData.costs);
    setPullPreview(null);
  };
  const undoPull = () => {
    if (!pullUndo) return;
    setFormData(prev => ({ ...prev, ...pullUndo.prev }));
    setPricingSettings(pullUndo.pricingSettings);
    setCosts(pullUndo.costs);
    setPullUndo(null);
  };
  const shownClient = proposal
    ? (formData.clientName ? { name: formData.clientName, phone: formData.clientPhone, email: formData.clientEmail, address: formData.clientAddress } : null)
    : (eventData?.clientData || null);
  const renderEventPull = () => {
    if (!proposal) return null;
    const h = React.createElement;
    const brl = v => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const brl0 = v => 'R$ ' + Math.ceil((Number(v) || 0) - 1e-9).toLocaleString('pt-BR');
    const dt = v => v ? String(v).slice(0, 10).split('-').reverse().join('/') : '—';
    const pct = v => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
    const btnStyle = { display: 'inline-block', padding: '8px 14px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', userSelect: 'none' };
    let body = null;
    if (pullPreview) {
      const pt = pullPreview.patch;
      const next = { ...formData, ...pt };
      const nextRules = pullPreview.useCurrentRules ? currentRules() : pricingSettings;
      const before = computeProposal(formData, pricingSettings);
      const after = computeProposal(next, nextRules);
      const rows = [];
      const add = (label, a, b) => { if (String(a) !== String(b)) rows.push([label, a, b]); };
      add('Convidados', Number(formData.guests) || 0, Number(next.guests) || 0);
      add('Data', dt(formData.eventDate), dt(next.eventDate));
      add('Meses de corre\xE7\xE3o', monthsFor(formData), monthsFor(next));
      add('Local', formData.eventLocation || '—', next.eventLocation || '—');
      add('Cliente', formData.clientName || '—', next.clientName || '—');
      add('Apoio e log\xEDstica', brl(formData.supportCost), brl(next.supportCost));
      add('M\xE3o de obra', brl(formData.laborCost), brl(next.laborCost));
      add('Transporte', brl(formData.transportCost), brl(next.transportCost));
      add('Insumos do cliente', formData.clientSupply && formData.clientSupply.enabled ? 'sim' : 'n\xE3o', next.clientSupply && next.clientSupply.enabled ? 'sim' : 'n\xE3o');
      if (formData.totalType === 'items') add('Lista de compras por pessoa', brl(formData.itemsCostPerPerson), brl(next.itemsCostPerPerson));
      if (pullPreview.useCurrentRules) {
        const r = x => 'impostos ' + pct(x.taxesPct) + ', taxas ' + pct(x.cardFeesPct) + ', fixos ' + pct(x.fixedCostsPct) + ', lucro ' + pct(x.targetProfitPct);
        add('Custos da empresa', r(pricingSettings || {}), r(nextRules || {}));
      }
            body = h('div', { 'data-testid': 'pull-preview', style: { marginTop: 10, background: '#fff', border: '2px solid #60a5fa', borderRadius: 12, padding: 12 } },
        h('div', { style: { fontWeight: 700, marginBottom: 6 } }, 'O que muda na proposta' + (eventData && eventData.eventName ? ' (evento: ' + eventData.eventName + ')' : '')),
        rows.length === 0 && before.finalTotalRounded === after.finalTotalRounded
          ? h('p', { style: { fontSize: 13, color: '#4b5563' } }, 'Nada muda: a proposta j\xE1 est\xE1 igual ao evento aberto.')
          : h('div', null,
              rows.concat([
                ['VALOR FINAL', brl0(before.finalTotalRounded || before.finalTotal), brl0(after.finalTotalRounded || after.finalTotal), true],
                ['Lucro estimado', brl(before.profit) + ' (' + pct(before.profitPct) + ')', brl(after.profit) + ' (' + pct(after.profitPct) + ')', false, after.noProfit]
              ]).map(([l, a, b, big, bad]) => h('div', { key: l, style: { padding: '6px 0', borderBottom: '1px solid #e5e7eb' } },
                h('div', { style: { fontSize: 12, color: '#6b7280', fontWeight: 600 } }, l),
                h('div', { style: { fontSize: big ? 15 : 13, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'baseline' } },
                  h('span', { style: { color: '#6b7280', textDecoration: 'line-through' } }, String(a)),
                  h('span', { style: { color: '#6b7280' } }, '→'),
                  h('b', { style: { color: bad ? '#b91c1c' : (big ? '#15803d' : '#111827'), fontWeight: big ? 800 : 700 } }, String(b)))))),
        after.legacy ? h('p', { style: { fontSize: 12, color: '#92400e', marginTop: 6 } }, '⚠️ Proposta antiga: para recalcular o valor, remova o card\xE1pio (\uD83D\uDDD1\uFE0F) e selecione de novo.') : null,
        !pullPreview.patch.supportCost && !(eventData && eventData.costs) ? h('p', { style: { fontSize: 12, color: '#6b7280', marginTop: 6 } }, 'O evento aberto n\xE3o tem custos de apoio, m\xE3o de obra e transporte calculados: esses valores ficam como est\xE3o.') : null,
        pullPreview.rulesDiffer ? h('label', { style: { display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 8, fontSize: 13, cursor: 'pointer' } },
          h('input', { type: 'checkbox', checked: !!pullPreview.useCurrentRules, onChange: e => setPullPreview(pv => ({ ...pv, useCurrentRules: e.target.checked })), style: { marginTop: 2 } }),
          h('span', null, 'Usar tamb\xE9m os ', h('b', null, 'custos da empresa atuais'), ' (impostos, taxas, custos fixos e lucro). A proposta foi feita com outros valores.')) : null,
        h('div', { style: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' } },
          h('div', { role: 'button', onClick: applyPull, style: { ...btnStyle, background: '#2563eb', color: '#fff' } }, 'Aplicar na proposta'),
          h('div', { role: 'button', onClick: () => setPullPreview(null), style: { ...btnStyle, background: '#f3f4f6', color: '#111827' } }, 'Cancelar')),
        h('p', { style: { fontSize: 12, color: '#6b7280', marginTop: 6 } }, 'S\xF3 \xE9 gravado quando voc\xEA clicar em salvar a proposta.'));
    }
    return h('div', { style: { marginBottom: 14, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 12 } },
      h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' } },
        h('div', { style: { fontSize: 13, color: '#1e3a8a', flex: '1 1 240px' } },
          'Esta proposta guarda os pr\xF3prios dados. Mudou convidados, data ou custos no evento? Puxe daqui.',
          eventHasData && eventData.eventName ? h('div', { style: { color: '#6b7280', marginTop: 2 } }, 'Evento aberto: ', h('b', null, eventData.eventName)) : null),
        eventHasData
          ? h('div', { role: 'button', onClick: openPull, style: { ...btnStyle, background: '#2563eb', color: '#fff' } }, '🔄 Puxar dados do evento')
          : h('div', { style: { ...btnStyle, background: '#e5e7eb', color: '#6b7280', cursor: 'not-allowed' }, title: 'Abra o evento na aba Eventos' }, '🔄 Puxar dados do evento')),
      !eventHasData ? h('p', { style: { fontSize: 12, color: '#6b7280', marginTop: 6 } }, 'Nenhum evento aberto. Abra o evento na aba Eventos e volte aqui.') : null,
      pullUndo && !pullPreview ? h('div', { style: { marginTop: 8, fontSize: 13, color: '#15803d', fontWeight: 600 } },
        '✅ Dados do evento aplicados. Confira o pre\xE7o e salve. ',
        h('span', { role: 'button', onClick: undoPull, style: { color: '#c2410c', textDecoration: 'underline', cursor: 'pointer' } }, 'Desfazer')) : null,
      body);
  };
  const calculateTotalCost = () => computeProposal().directCost;
  const calculateFinalTotal = () => computeProposal().finalTotal;
  // Trava contra clique duplo: o 2º clique durante o salvamento criava uma proposta repetida
  const savingRef = React.useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const handleSave = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      await handleSaveInner();
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };
  const handleSaveInner = async () => {
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
    const calcCheck = computeProposal();
    if (calcCheck.noProfit && !confirm('⚠️ Esta proposta está SEM LUCRO (valor final igual ou menor que o custo).\n\nDeseja salvar mesmo assim?')) {
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
      const calcSaved = computeProposal();
      const totalCost = calcSaved.directCost;
      const finalTotal = calcSaved.finalTotal;

      // Arredondar valores para cima
      const roundedTotalCost = Math.ceil(Number(totalCost) || 0);
      const roundedFinalTotal = calcSaved.finalTotalRounded != null ? calcSaved.finalTotalRounded : Math.ceil(Number(finalTotal) || 0);
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
        // CRM: editar uma proposta enviada/aprovada/rejeitada mantém o status (não volta para rascunho)
        status: proposal && proposal.id && ['sent', 'accepted', 'rejected'].includes(proposal.status) ? proposal.status : 'draft',
        proposalName: formData.proposalName,
        proposalType: formData.proposalType,
        // Modelo visual (chef | moderno): mantém o escolhido na visualização
        ...(proposal && proposal.pdfTemplate ? { pdfTemplate: proposal.pdfTemplate } : {}),
        selectedMenuId: formData.selectedMenuId,
        selectedMenuData: formData.selectedMenuData,
        totalType: formData.totalType || 'menu_cost', // ✅ Tipo de total escolhido
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
        // Custos guardados NA PROPOSTA (editar depois não depende do evento aberto)
        transportCost: Number(formData.transportCost) || 0,
        laborCost: Number(formData.laborCost) || 0,
        supportCost: Number(formData.supportCost) || 0,
        itemsCostPerPerson: Number(formData.itemsCostPerPerson) || 0,
        // Insumos do cliente: escolha, lista para o cliente (aparece na proposta) e taxa de preparo
        clientSupply: formData.clientSupply && formData.clientSupply.enabled ? formData.clientSupply : null,
        clientSupplyList: listaClienteAtual(),
        prepFee: calcSaved.prepFee || 0,
        ingredientsCost: Math.round((Number(formData.itemsCostPerPerson) || 0) * (parseInt(formData.guests) || 0) * 100) / 100,
        // Regras de preço usadas
        pricingMode: formData.pricingMode,
        inflationMonths: effectiveMonths,
        monthsUntilEvent: effectiveMonths,
        // proposta antiga continua antiga; a margem de segurança das proteínas usada fica gravada junto das regras
        pricingSnapshot: calcSaved.legacy ? null : { ...(pricingSettings || {}), proteinSafetyPct: proteinPctFor(formData) },
        foodCost: calcSaved.foodCost,
        directCost: calcSaved.directCost,
        profit: calcSaved.profit,
        profitPct: calcSaved.profitPct,
        cmvPct: calcSaved.cmvPct,
        markup: Number(formData.markupPercent) || 0,
        totalCost: roundedTotalCost,
        markupPercent: Number(formData.markupPercent) || 0,
        markupAmount: roundedFinalTotal - roundedTotalCost,  // ✅ Valor da margem adicional em R$
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
            const retryResult = await proposalManager.saveProposal(dataWithoutPhotos);
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
  })()), " pratos"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-3 items-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm"
  }, "\uD83D\uDCB5 Custo: ", /*#__PURE__*/React.createElement("strong", null, "R$ ", (() => {
    // ✅ Usar menu.stats.totalCost (custo POR PESSOA)
    const costPerPerson = formData.selectedMenuData.stats?.totalCost || 0;
    return costPerPerson.toFixed(2);
  })()), "/pessoa"), (() => {
    // ✅ Mostrar preço com margem se disponível
    const totalPrice = formData.selectedMenuData.stats?.totalPrice || 0;
    const totalCost = formData.selectedMenuData.stats?.totalCost || 0;
    if (totalPrice > totalCost) {
      return /*#__PURE__*/React.createElement("span", {
        className: "text-sm"
      }, "\u2728 Com margem: ", /*#__PURE__*/React.createElement("strong", {
        className: "text-green-600"
      }, "R$ ", totalPrice.toFixed(2), "/pessoa"));
    }
    return null;
  })()))), /*#__PURE__*/React.createElement("button", {
    onClick: handleRemoveMenu,
    className: "ml-4 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
  }, "\uD83D\uDDD1\uFE0F")), (() => {
    // ✅ Seletor de tipo de total para a proposta
    const totalPrice = formData.selectedMenuData.stats?.totalPrice || 0;
    const totalCost = formData.selectedMenuData.stats?.totalCost || 0;
    const hasMargin = totalPrice > totalCost;
    const hasItems = (Number(formData.itemsCostPerPerson) || 0) > 0;
    const gq = Number(formData.guests) || 0;

    return /*#__PURE__*/React.createElement("div", {
      className: "mt-3 p-3 bg-blue-50 border-blue-200 border rounded-lg"
    },
    /*#__PURE__*/React.createElement("p", {
      className: "text-sm font-semibold text-gray-700 mb-3"
    }, "\uD83D\uDCB0 Qual total usar na proposta?"),
    /*#__PURE__*/React.createElement("div", {
      className: "space-y-2"
    },
    // Opção 1: Total dos Itens
    /*#__PURE__*/React.createElement("label", {
      className: `flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${formData.totalType === 'items' ? 'bg-orange-100 border border-orange-300' : 'hover:bg-gray-100'} ${!hasItems ? 'opacity-50 cursor-not-allowed' : ''}`
    },
    /*#__PURE__*/React.createElement("input", {
      type: "radio",
      name: "totalType",
      value: "items",
      checked: formData.totalType === 'items',
      onChange: () => hasItems && handleChange('totalType', 'items'),
      disabled: !hasItems,
      className: "w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
    }),
    /*#__PURE__*/React.createElement("div", null,
      /*#__PURE__*/React.createElement("span", {
        className: "text-sm font-medium text-gray-700"
      }, "Total Itens do Evento"),
      /*#__PURE__*/React.createElement("p", {
        className: "text-xs text-gray-500"
      }, "Custo da lista de compras do evento (R$ ", ((Number(formData.itemsCostPerPerson) || 0) * gq).toFixed(2), " para ", gq, " convidados)")
    )),
    // Opção 2: Total dos Pratos (sem margem)
    /*#__PURE__*/React.createElement("label", {
      className: `flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${formData.totalType === 'menu_cost' ? 'bg-blue-100 border border-blue-300' : 'hover:bg-gray-100'}`
    },
    /*#__PURE__*/React.createElement("input", {
      type: "radio",
      name: "totalType",
      value: "menu_cost",
      checked: formData.totalType === 'menu_cost',
      onChange: () => handleChange('totalType', 'menu_cost'),
      className: "w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
    }),
    /*#__PURE__*/React.createElement("div", null,
      /*#__PURE__*/React.createElement("span", {
        className: "text-sm font-medium text-gray-700"
      }, "Total Pratos (sem margem)"),
      /*#__PURE__*/React.createElement("p", {
        className: "text-xs text-gray-500"
      }, "S\xF3 o custo, sem lucro nos pratos (R$ ", (totalCost * gq).toFixed(2), ")")
    )),
    // Opção 3: Total dos Pratos (com margem)
    /*#__PURE__*/React.createElement("label", {
      className: `flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${formData.totalType === 'menu_price' ? 'bg-green-100 border border-green-300' : 'hover:bg-gray-100'} ${!hasMargin ? 'opacity-50 cursor-not-allowed' : ''}`
    },
    /*#__PURE__*/React.createElement("input", {
      type: "radio",
      name: "totalType",
      value: "menu_price",
      checked: formData.totalType === 'menu_price',
      onChange: () => hasMargin && handleChange('totalType', 'menu_price'),
      disabled: !hasMargin,
      className: "w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
    }),
    /*#__PURE__*/React.createElement("div", null,
      /*#__PURE__*/React.createElement("span", {
        className: "text-sm font-medium text-gray-700"
      }, "Total Pratos + Margem"),
      hasMargin
        ? /*#__PURE__*/React.createElement("p", {
            className: "text-xs text-green-600"
          }, "Com o markup de cada prato (R$ ", (totalPrice * gq).toFixed(2), ") \u2014 recomendado")
        : /*#__PURE__*/React.createElement("p", {
            className: "text-xs text-gray-500"
          }, "\u26A0\uFE0F Configure margem nos pratos para ativar")
    ))));
  })()) : /*#__PURE__*/React.createElement("button", {
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
  }))), (shownClient && shownClient.name) && /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 rounded-lg p-6 border border-blue-200"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-gray-800 mb-4"
  }, "\uD83D\uDC64 Cliente"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 text-sm"
  }, /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "Nome:"), " ", shownClient.name), shownClient.phone && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "Telefone:"), " ", shownClient.phone), shownClient.email && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "Email:"), " ", shownClient.email), shownClient.address && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "Endere\xE7o:"), " ", shownClient.address)), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-3"
  }, proposal ? "\u2139\uFE0F Cliente desta proposta" : "\u2139\uFE0F Cliente selecionado na aba \"Eventos\"")), /*#__PURE__*/React.createElement("div", {
    className: "bg-green-50 rounded-lg p-6 border border-green-200"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-gray-800 mb-4"
  }, "\uD83D\uDCC5 Dados do Evento"), renderEventPull(), /*#__PURE__*/React.createElement("div", {
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
  }, "Foto Produtos/Servi\xE7os")))), formData.selectedMenuData && formData.guests > 0 && (() => {
    // ✅ Resumo de preço da proposta (out/2026): custo real, preço, lucro, CMV e avisos
    const h = React.createElement;
    const R = computeProposal();
    const brl = v => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const pct = v => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
    const st = pricingSettings || {};
    const line = (label, value, opts = {}) => h('div', { className: 'flex justify-between gap-3' + (opts.muted ? ' text-gray-500' : ''), key: label },
      h('span', null, label), h('span', { className: opts.bold ? 'font-bold' : 'font-semibold' }, value));
    const modeBtn = (id, label, sub) => h('div', {
      role: 'button', key: id, onClick: () => handleChange('pricingMode', id),
      style: { flex: '1 1 200px', cursor: 'pointer', borderRadius: 10, padding: '8px 10px', border: '2px solid ' + (formData.pricingMode === id ? '#ea580c' : '#e5e7eb'), background: formData.pricingMode === id ? '#fff7ed' : '#fff' }
    }, h('div', { style: { fontWeight: 700, fontSize: 14, color: '#111827' } }, (formData.pricingMode === id ? '● ' : '○ ') + label), h('div', { style: { fontSize: 12, color: '#6b7280' } }, sub));
    const sumPct = (Number(st.taxesPct) || 0) + (Number(st.cardFeesPct) || 0) + (Number(st.fixedCostsPct) || 0);
    return h('div', { className: 'bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-6 border-2 border-orange-300' },
      h('h3', { className: 'text-lg font-bold text-gray-800 mb-3' }, '💰 Pre\xE7o da proposta'),
      (() => {
        if (!proposal || !proposal.pricingSnapshot) return null;
        const cur = currentRules();
        if (!cur || sameRules(proposal.pricingSnapshot, cur)) return null;
        const usingSaved = sameRules(pricingSettings, proposal.pricingSnapshot);
        return h('div', { 'data-testid': 'rules-note', className: 'text-xs', style: { background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8, padding: '6px 8px', marginBottom: 10, color: '#713f12' } },
          usingSaved ? 'Esta proposta usa os custos da empresa de quando foi feita (voc\xEA mudou depois). ' : 'Usando os custos da empresa atuais. ',
          h('span', { role: 'button', onClick: () => setPricingSettings(usingSaved ? cur : proposal.pricingSnapshot), style: { color: '#c2410c', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 } },
            usingSaved ? 'Usar os atuais' : 'Voltar aos da proposta'));
      })(),
      R.legacy ? h('div', { className: 'bg-yellow-50 border border-yellow-300 rounded p-2 text-yellow-800 text-xs mb-3' }, '\u2139\uFE0F Proposta antiga: o valor gravado foi mantido. Ao mudar convidados, custos, ajuste ou modo, ela \xE9 recalculada com as regras novas.') : null,
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 } },
        modeBtn('markup', 'Markup', 'Pratos com o markup de cada um + serviços com o markup de serviços'),
        modeBtn('divisor', 'Custos da empresa', 'Custo ÷ (1 − impostos − taxas − custos fixos − lucro)')),
      window.ClientSupplyProposalBox ? h(window.ClientSupplyProposalBox, {
        value: formData.clientSupply, onChange: v => { legacySigRef.current = null; handleChange('clientSupply', v); },
        pratos: (formData.selectedMenuData && ((formData.selectedMenuData.menuData && formData.selectedMenuData.menuData.dishes) || formData.selectedMenuData.dishes)) || [],
        db: (window.eventState && window.eventState.ingredientsDatabase) || [], guests: parseInt(formData.guests) || 0,
        lista: listaClienteAtual(),
        clientCost: (() => { const l = listaClienteAtual(); return l ? l.itens.reduce((t, i) => t + (Number(i.cost) || 0), 0) + l.apoio.reduce((t, i) => t + (Number(i.cost) || 0), 0) : 0; })()
      }) : null,
      h('div', { className: 'space-y-2 text-sm' },
        line(formData.totalType === 'items' ? 'Comida (lista de compras) — custo' : 'Comida — custo', brl(R.foodCost)),
        R.mode === 'markup' && formData.totalType === 'menu_price' ? line('Comida — preço com markup dos pratos', brl(R.foodPrice)) : null,
        (() => {
          if (formData.totalType === 'items' || R.legacy) return null;
          const sp = proteinPctFor(formData);
          const amt = Math.max(0, proteinBaseFor(formData).cost - clientShareFor(formData).protein.cost) * sp / 100 * (parseInt(formData.guests) || 0) * (R.inflationFactor || 1);
          return sp > 0 && amt > 0.004 ? line('Margem de seguran\xE7a das prote\xEDnas (+' + pct(sp) + ') — j\xE1 inclu\xEDda no custo', brl(amt), { muted: true }) : null;
        })(),
        line('Apoio e log\xEDstica', brl(R.support)),
        line('M\xE3o de obra', brl(R.labor)),
        line('Transporte', brl(R.transport)),
        R.prepFee > 0 ? line('🧺 Taxa de preparo (' + (parseInt(formData.guests) || 0) + ' × ' + brl(formData.clientSupply && formData.clientSupply.prepFeePerGuest) + ')', brl(R.prepFee)) : null,
        R.mode === 'markup' && (Number(st.serviceMarkupPct) || 0) > 0 ? line('Servi\xE7os com markup de ' + pct(st.serviceMarkupPct), brl(R.servicesPrice)) : null,
        R.inflationAmount > 0 ? line('Corre\xE7\xE3o at\xE9 o evento (' + R.months + (R.months === 1 ? ' m\xEAs' : ' meses') + ' \xD7 ' + pct(st.inflationMonthlyPct) + ') — j\xE1 inclu\xEDda', brl(R.inflationAmount), { muted: true }) : null,
        h('div', { className: 'border-t-2 border-orange-400 pt-2 mt-2' }, line('CUSTO DIRETO', brl(R.directCost), { bold: true })),
        R.mode === 'divisor' ? h('p', { className: 'text-xs text-gray-600' },
          'Impostos ' + pct(st.taxesPct) + ' + taxas ' + pct(st.cardFeesPct) + ' + custos fixos ' + pct(st.fixedCostsPct) + ' + lucro ' + pct(st.targetProfitPct) + '. ',
          h('span', { role: 'button', onClick: () => window.openPricingSettings && window.openPricingSettings(), style: { color: '#c2410c', textDecoration: 'underline', cursor: 'pointer' } }, 'Ajustar custos da empresa')) : null,
        R.divisorInvalid ? h('div', { className: 'bg-red-50 border border-red-300 rounded p-2 text-red-700 text-xs' }, '⚠️ A soma de impostos, taxas, custos fixos e lucro passou de 95%. Revise os custos da empresa.') : null,
        h('div', { className: 'mt-3 grid grid-cols-2 gap-2' },
          h('label', { className: 'text-xs text-gray-600' }, 'Meses at\xE9 o evento (corre\xE7\xE3o)',
            h('input', { type: 'number', min: 0, step: 1, value: formData.inflationMonths != null && formData.inflationMonths !== '' ? formData.inflationMonths : autoMonths,
              onChange: e => handleChange('inflationMonths', e.target.value === '' ? null : Math.max(0, parseInt(e.target.value) || 0)),
              className: 'w-full px-3 py-2 border border-orange-300 rounded-lg mt-1' })),
          formData.totalType === 'items' ? null : h('label', { className: 'text-xs text-gray-600' }, 'Margem de seguran\xE7a das prote\xEDnas (%)',
            h('input', { type: 'number', min: 0, max: 100, step: 1, 'aria-label': 'Margem de seguran\xE7a das prote\xEDnas da proposta', value: proteinPctFor(formData),
              onChange: e => handleChange('proteinSafetyPct', e.target.value === '' ? 0 : Math.max(0, Math.min(100, parseFloat(e.target.value) || 0))),
              className: 'w-full px-3 py-2 border border-orange-300 rounded-lg mt-1' })),
          h('label', { className: 'text-xs text-gray-600' }, 'Ajuste final (%) — desconto ou acr\xE9scimo',
            h('input', { type: 'number', step: 1, value: formData.markupPercent === 0 ? 0 : formData.markupPercent,
              onChange: e => { const v = parseFloat(e.target.value); handleChange('markupPercent', isNaN(v) ? 0 : v); },
              className: 'w-full px-3 py-2 border border-orange-300 rounded-lg mt-1' }))),
        R.doubleMargin ? h('div', { className: 'bg-yellow-50 border border-yellow-300 rounded p-2 text-yellow-800 text-xs' }, '⚠️ Os pratos j\xE1 t\xEAm markup. O ajuste final de ' + pct(formData.markupPercent) + ' entra em cima disso (margem sobre margem).') : null,
        h('div', { className: 'mt-4 pt-4 border-t-2 border-green-400 flex justify-between bg-green-50 rounded-lg p-3' },
          h('span', { className: 'text-lg font-bold text-green-800' }, 'VALOR FINAL'),
          h('span', { className: 'text-2xl font-bold text-green-600' }, 'R$ ', (R.finalTotalRounded || Math.ceil(R.finalTotal || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }))),
        line('Por pessoa', brl(R.pricePerPerson), { muted: true }),
        h('div', { className: 'mt-3 p-3 rounded-lg ' + (R.noProfit ? 'bg-red-50 border border-red-300' : 'bg-white border border-gray-200') },
          sumPct > 0 ? line('Impostos, taxas e custos fixos (' + pct(sumPct) + ' do pre\xE7o)', '− ' + brl(R.salesDeductions), { muted: true }) : null,
          line('Lucro estimado', brl(R.profit) + ' (' + pct(R.profitPct) + ')', { bold: true }),
          line('Markup sobre o custo', pct(R.markupOnCostPct), { muted: true }),
          line('CMV (comida \xF7 pre\xE7o)', pct(R.cmvPct), { muted: true }),
          R.noProfit ? h('p', { className: 'text-red-700 text-xs font-semibold mt-1' }, '⚠️ Proposta SEM LUCRO: o valor final n\xE3o cobre o custo. Escolha "Pratos + Margem", use o modo "Custos da empresa" ou aumente o ajuste final.') : null,
          sumPct === 0 ? h('p', { className: 'text-xs text-gray-500 mt-1' }, 'Dica: cadastre impostos, taxas e custos fixos em ',
            h('span', { role: 'button', onClick: () => window.openPricingSettings && window.openPricingSettings(), style: { color: '#c2410c', textDecoration: 'underline', cursor: 'pointer' } }, 'Custos da empresa'),
            ' para ver o lucro real.') : null)),
      h('div', { className: 'mt-4 pt-4 border-t border-orange-300' },
        h('label', { className: 'flex items-center gap-2 cursor-pointer' },
          h('input', { type: 'checkbox', checked: formData.includeDishPhotos, onChange: e => handleChange('includeDishPhotos', e.target.checked), className: 'w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500' }),
          h('span', { className: 'text-sm font-medium text-gray-700' }, '📸 Incluir fotos dos pratos no card\xE1pio')),
        h('p', { className: 'text-xs text-gray-500 mt-1 ml-7' }, 'Quando desmarcado, a proposta mostrar\xE1 apenas os nomes dos pratos')));
  })()), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-end gap-4 mt-8 pt-6 border-t border-gray-200"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onCancel,
    className: "px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: handleSave,
    disabled: isSaving,
    style: isSaving ? { opacity: 0.6, cursor: 'wait' } : undefined,
    className: "px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-colors font-bold shadow-lg"
  }, isSaving ? "\u23F3 Salvando..." : "\uD83D\uDCBE Salvar Proposta")));
}

// Expor para window
window.ProposalBuilderSimple = ProposalBuilderSimple;
})();
