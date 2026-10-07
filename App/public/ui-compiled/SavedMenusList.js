(function() {
/**
 * ===================================================================
 * SAVED MENUS LIST - Lista de Cardápios Salvos
 * ===================================================================
 * Componente para visualizar e gerenciar cardápios salvos (templates)
 */

function SavedMenusList() {
  const {
    useState,
    useEffect
  } = React;
  const [savedMenus, setSavedMenus] = useState([]);
  const [filteredMenus, setFilteredMenus] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, casamento, corporativo, etc
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('savedMenusList_viewMode') || 'grid';
  });
  const [previewMenuId, setPreviewMenuId] = useState(null);

  // Tipos de eventos disponíveis
  const eventTypes = [{
    value: 'all',
    label: 'Todos os Tipos',
    icon: '🎭'
  }, {
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

  // Carregar cardápios
  useEffect(() => {
    loadMenus();
  }, []);

  // Filtrar cardápios quando mudar busca ou filtro
  useEffect(() => {
    applyFilters();
  }, [savedMenus, searchTerm, filterType]);

  // Persistir modo de visualização
  useEffect(() => {
    localStorage.setItem('savedMenusList_viewMode', viewMode);
  }, [viewMode]);
  const loadMenus = async () => {
    try {
      // Usar ManagerHelper para pegar o manager correto (backend > local)
      const manager = window.ManagerHelper?.getSavedMenusManager() || window.PrecificacaoAPI?.savedMenusManager || window.appBackend?.savedMenusManager || window.savedMenusManager;
      if (!manager) {
        console.error('SavedMenusManager não encontrado');
        setSavedMenus([]);
        return;
      }

      // Usar getAll() que é mais eficiente e usa cache
      const menus = await manager.getAll();

      // Calcular estatísticas para cada cardápio usando SavedMenusManager.calculateMenuStats
      const menusWithStats = (menus || []).map(menu => {
        // Extrair dishes do menuData (formato novo) ou do menu diretamente (formato legado)
        let dishes = [];
        if (menu.menuData && menu.menuData.dishes) {
          dishes = menu.menuData.dishes;
        } else if (menu.dishes) {
          dishes = menu.dishes;
        }

        // ✅ Usar calculateMenuStats do manager para incluir totalPrice (preço com margem)
        const stats = manager.calculateMenuStats(dishes);

        return {
          ...menu,
          stats: stats
        };
      });
      setSavedMenus(menusWithStats);
      console.log(`✅ ${menusWithStats.length} cardápios carregados com estatísticas`);
    } catch (error) {
      console.error('Erro ao carregar cardápios:', error);
      setSavedMenus([]);
    }
  };
  const applyFilters = () => {
    // Garantir que savedMenus é um array
    if (!Array.isArray(savedMenus)) {
      console.warn('⚠️ savedMenus não é um array:', savedMenus);
      setFilteredMenus([]);
      return;
    }
    let filtered = [...savedMenus];

    // Filtro por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(menu => menu.eventType === filterType);
    }

    // Filtro por busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(menu => menu.name.toLowerCase().includes(term) || menu.description?.toLowerCase().includes(term));
    }
    setFilteredMenus(filtered);
  };
  const handleLoadMenu = async menuId => {
    if (!confirm('Carregar este cardápio? Os pratos atuais do cardápio serão substituídos.')) {
      return;
    }
    try {
      // Usar ManagerHelper para pegar managers corretos
      const savedMenusManager = window.ManagerHelper?.getSavedMenusManager() || window.PrecificacaoAPI?.savedMenusManager || window.appBackend?.savedMenusManager || window.savedMenusManager;
      const menuManager = window.menuManager;
      if (!savedMenusManager || !menuManager) {
        alert('❌ Managers não disponíveis');
        return;
      }
      console.log('🔄 [handleLoadMenu] Carregando cardápio ID:', menuId);

      // Carregar cardápio salvo (AWAIT adicionado!)
      const result = await savedMenusManager.loadMenuToEvent(menuId);
      console.log('📊 [handleLoadMenu] Resultado do loadMenuToEvent:', result);
      if (!result.success) {
        alert(`❌ ${result.message}`);
        return;
      }

      // Limpar cardápio atual
      await menuManager.clearMenu();

      // Adicionar cada prato ao cardápio do evento
      for (const dish of result.data.dishes) {
        console.log('🍽️ [handleLoadMenu] Carregando prato:', {
          dishId: dish.dishId,
          dishName: dish.dishName,
          dishCost: dish.dishCost,
          totalWeight: dish.totalWeight,
          portionsPerPerson: dish.portionsPerPerson
        });
        // Mapear campos legados dos ingredientes (loss → lossPercentage)
        const mappedIngredients = (dish.dishIngredients || []).map(ing => ({
          ...ing,
          lossPercentage: ing.lossPercentage ?? ing.loss ?? 0,
          yieldMultiplier: ing.yieldMultiplier ?? 1
        }));
        await menuManager.addDishToMenu({
          id: dish.dishId,
          name: dish.dishName,
          category: dish.dishCategory,
          totalCost: dish.dishCost,
          totalWeight: dish.totalWeight,
          servings: dish.servings || 1,
          // IMPORTANTE: incluir servings!
          ingredients: mappedIngredients
        }, dish.portionsPerPerson || 1);
      }
      alert(`✅ Cardápio "${result.data.menu.name}" carregado com sucesso!\n\n${result.data.dishes.length} pratos adicionados.`);

      // Despachar evento para atualizar MenuPage
      window.dispatchEvent(new CustomEvent('menu-loaded', {
        detail: {
          menu: result.data.menu
        }
      }));

      // Despachar evento para vincular cardápio ao evento atual
      window.dispatchEvent(new CustomEvent('menu-linked', {
        detail: {
          id: result.data.menu.id,
          name: result.data.menu.name
        }
      }));
      console.log('📋 [SavedMenusList] Evento menu-linked disparado:', result.data.menu.id, result.data.menu.name);
    } catch (error) {
      console.error('Erro ao carregar cardápio:', error);
      alert(`❌ Erro ao carregar cardápio: ${error.message}`);
    }
  };
  const handleDuplicate = async menuId => {
    try {
      // Usar ManagerHelper para pegar o manager correto (backend > local)
      const manager = window.ManagerHelper?.getSavedMenusManager() || window.PrecificacaoAPI?.savedMenusManager || window.appBackend?.savedMenusManager || window.savedMenusManager;
      const result = await manager.duplicateMenu(menuId);
      if (result.success) {
        loadMenus();
        alert(`✅ ${result.message}`);
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (error) {
      console.error('Erro ao duplicar cardápio:', error);
      alert('❌ Erro ao duplicar cardápio');
    }
  };
  const handleToggleFavorite = async menuId => {
    try {
      // Usar ManagerHelper para pegar o manager correto (backend > local)
      const manager = window.ManagerHelper?.getSavedMenusManager() || window.PrecificacaoAPI?.savedMenusManager || window.appBackend?.savedMenusManager || window.savedMenusManager;
      await manager.toggleFavorite(menuId);
      await loadMenus(); // Aguardar reload
    } catch (error) {
      console.error('Erro ao marcar favorito:', error);
    }
  };
  const handleDelete = async (menuId, menuName) => {
    console.log(`🗑️ [SavedMenusList] Usuário solicitou exclusão do cardápio "${menuName}" (ID: ${menuId})`);
    if (!confirm(`Excluir o cardápio "${menuName}"?`)) {
      console.log('❌ [SavedMenusList] Exclusão cancelada pelo usuário');
      return;
    }
    try {
      console.log('📞 [SavedMenusList] Chamando savedMenusManager.deleteMenu()...');
      // Usar ManagerHelper para pegar o manager correto (backend > local)
      const manager = window.ManagerHelper?.getSavedMenusManager() || window.PrecificacaoAPI?.savedMenusManager || window.appBackend?.savedMenusManager || window.savedMenusManager;
      if (!manager) {
        console.error('❌ Manager não disponível!');
        alert('❌ Erro: Sistema de cardápios não inicializado');
        return;
      }
      console.log('📦 [SavedMenusList] Usando manager:', manager.constructor.name);
      const result = await manager.deleteMenu(menuId);
      console.log('📊 [SavedMenusList] Resultado da exclusão:', result);
      if (result && result.success) {
        console.log('✅ [SavedMenusList] Cardápio excluído com sucesso, recarregando lista...');
        await loadMenus();
        alert(`✅ Cardápio "${menuName}" excluído com sucesso`);
      } else {
        const errorMsg = result?.message || 'Erro desconhecido ao excluir cardápio';
        console.error('❌ [SavedMenusList] Falha na exclusão:', errorMsg);
        alert(`❌ ${errorMsg}`);
      }
    } catch (error) {
      console.error('❌ [SavedMenusList] Erro ao excluir cardápio:', error);
      alert('❌ Erro ao excluir cardápio: ' + error.message);
    }
  };
  const handleGenerateShoppingList = async menu => {
    try {
      // Buscar dados do evento atual do window.eventState
      const eventState = window.eventState;
      if (!eventState) {
        alert('❌ Nenhum evento ativo encontrado. Crie um evento primeiro.');
        return;
      }

      // Usar número de convidados do evento
      const guests = eventState.guests || 0;
      if (guests <= 0) {
        alert('❌ Configure o número de convidados no evento antes de gerar a lista de compras.');
        return;
      }
      console.log('📋 [SavedMenusList.handleGenerateShoppingList] Gerando lista de compras:', {
        menuName: menu.name,
        guests: guests,
        dishCount: menu.dishes?.length || 0,
        firstDish: menu.dishes?.[0],
        firstDishIngredients: menu.dishes?.[0]?.dishIngredients
      });
      const menuManager = window.menuManager;
      if (!menuManager) {
        alert('❌ MenuManager não encontrado');
        return;
      }

      // ✅ EXPOR ingredientes do eventState no window.ingredientsManager para MenuManager usar
      if (!window.ingredientsManager) {
        window.ingredientsManager = {};
      }
      window.ingredientsManager.ingredients = eventState.ingredientsDatabase || [];
      console.log(`🔧 [SavedMenusList] Expondo ${window.ingredientsManager.ingredients.length} ingredientes no window.ingredientsManager`);

      // ✅ FIX: Usar mesma lógica do MenuPage.jsx (linhas 88-159)
      // Gerar lista de ingredientes consolidada usando generateIngredientsListFromDishes
      console.log('📊 [SavedMenusList] Passando dishes para generateIngredientsListFromDishes:', menu.dishes?.map(d => ({
        dishName: d.dishName,
        ingredientsCount: d.dishIngredients?.length || 0
      })));
      const ingredientsList = await menuManager.generateIngredientsListFromDishes(menu.dishes, guests);
      console.log('🔍 [SavedMenusList] ingredientsList retornado:', {
        type: typeof ingredientsList,
        isArray: Array.isArray(ingredientsList),
        length: ingredientsList?.length
      });
      if (!Array.isArray(ingredientsList)) {
        console.error('❌ ingredientsList não é um array!', ingredientsList);
        alert('❌ Erro: A lista de ingredientes não foi gerada corretamente.');
        return;
      }

      // ✅ FIX: Usar APENAS ingredientes do PostgreSQL (eventState.ingredientsDatabase)
      const allIngredients = eventState.ingredientsDatabase || [];
      if (allIngredients.length === 0) {
        alert('❌ Erro: Nenhum ingrediente carregado do PostgreSQL!\n\nVerifique sua conexão com o backend.');
        return;
      }
      console.log('🔍 [SavedMenusList] Usando ingredientes do PostgreSQL:', {
        source: 'eventState.ingredientsDatabase',
        total: allIngredients.length
      });

      // ✅ FIX: Limpar itens existentes e criar nova lista
      console.log('🧹 [SavedMenusList] Limpando itens existentes...');

      // ✅ Usar função compartilhada para processar ingredientes (MESMA LÓGICA do MenuPage)
      const newItems = window.ShoppingListGenerator.processIngredientsToItems(
        ingredientsList,
        guests,
        allIngredients
      );

      // ✅ SUBSTITUIR todos os itens (não adicionar aos existentes)
      eventState.setItems(newItems);
      console.log('✅ [SavedMenusList] Lista de compras atualizada:', {
        ingredientsCount: ingredientsList.length
      });
      alert(`✅ Lista de compras gerada!\n\n${ingredientsList.length} ingredientes adicionados aos Itens do Evento para ${guests} pessoas.`);
    } catch (error) {
      console.error('Erro ao gerar lista de compras:', error);
      alert('❌ Erro ao gerar lista de compras. Veja o console.');
    }
  };
  const getEventTypeLabel = type => {
    const found = eventTypes.find(t => t.value === type);
    return found ? `${found.icon} ${found.label}` : `🍽️ ${type || 'Outro'}`;
  };
  const formatWeight = grams => {
    if (!grams || grams === 0) return '0 g';
    if (grams >= 1000) {
      return `${(grams / 1000).toFixed(2)} kg`;
    }
    return `${grams.toFixed(0)} g`;
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "saved-menus-list"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg p-6 mb-6 shadow-lg"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold mb-2"
  }, "\uD83D\uDCDA Card\xE1pios Salvos"), /*#__PURE__*/React.createElement("p", {
    className: "text-purple-100"
  }, "Templates de card\xE1pios reutiliz\xE1veis para seus eventos")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow-md p-4 mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col lg:flex-row gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "\uD83D\uDD0D Buscar card\xE1pio...",
    value: searchTerm,
    onChange: e => setSearchTerm(e.target.value),
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
  })), /*#__PURE__*/React.createElement("select", {
    value: filterType,
    onChange: e => setFilterType(e.target.value),
    className: "px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
  }, eventTypes.map(type => /*#__PURE__*/React.createElement("option", {
    key: type.value,
    value: type.value
  }, type.icon, " ", type.label))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setViewMode('grid'),
    className: `px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`
  }, "\u229E Grade"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setViewMode('list'),
    className: `px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`
  }, "\u2630 Lista")))), filteredMenus.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "text-center py-16"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-6xl mb-4"
  }, "\uD83D\uDCDA"), /*#__PURE__*/React.createElement("p", {
    className: "text-xl text-gray-600 mb-2"
  }, searchTerm || filterType !== 'all' ? 'Nenhum cardápio encontrado com esses filtros' : 'Nenhum cardápio salvo ainda'), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-500"
  }, searchTerm || filterType !== 'all' ? 'Tente ajustar os filtros de busca' : 'Vá para "Cardápio" e salve seu primeiro cardápio')) : /*#__PURE__*/React.createElement("div", {
    className: viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'
  }, filteredMenus.map(menu => /*#__PURE__*/React.createElement("div", {
    key: menu.id,
    className: "bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow border border-gray-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold text-gray-800 mb-1"
  }, menu.name), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-purple-600"
  }, getEventTypeLabel(menu.eventType))), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleToggleFavorite(menu.id),
    className: "text-2xl transition-transform hover:scale-125"
  }, menu.isFavorite ? '⭐' : '☆')), menu.description && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 mb-4"
  }, menu.description), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 rounded-lg p-3 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-blue-700"
  }, "Pratos"), /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-blue-900"
  }, menu.stats?.totalDishes || menu.dishes?.length || 0)), /*#__PURE__*/React.createElement("div", {
    className: "bg-green-50 rounded-lg p-3 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-green-700"
  }, "Custo/Pessoa"), /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-green-900"
  }, "R$ ", (menu.stats?.totalCost || 0).toFixed(2))), /*#__PURE__*/React.createElement("div", {
    className: "bg-purple-50 rounded-lg p-3 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-purple-700"
  }, "Valor/Pessoa"), /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-purple-900"
  }, "R$ ", (menu.stats?.totalPrice || 0).toFixed(2))), /*#__PURE__*/React.createElement("div", {
    className: "bg-orange-50 rounded-lg p-3 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-orange-700"
  }, "Peso Total"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold text-orange-900"
  }, formatWeight(menu.stats?.totalWeight || 0)))), /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-200 mt-3"
  }, menu.stats?.totalPrice && menu.stats.totalPrice > menu.stats?.totalCost ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-lg"
  }, "\u2728"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-green-700 font-semibold uppercase"
  }, "Pre\xE7o com Margem")), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-green-600 font-medium mt-1"
  }, "+", ((menu.stats.totalPrice - menu.stats.totalCost) / menu.stats.totalCost * 100).toFixed(0), "% margem \xB7 ", "R$ ", (menu.stats.totalPrice - menu.stats.totalCost).toFixed(2), " lucro")), /*#__PURE__*/React.createElement("span", {
    className: "text-2xl font-bold text-green-600"
  }, "R$ ", menu.stats.totalPrice.toFixed(2))) : /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-gray-600 font-semibold uppercase"
  }, "\u2728 Pre\xE7o com Margem"), /*#__PURE__*/React.createElement("span", {
    className: "text-lg font-bold text-gray-700"
  }, "R$ ", (menu.stats?.totalPrice || menu.stats?.totalCost || 0).toFixed(2))))), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-gray-200 p-4 bg-gray-50 flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setPreviewMenuId(menu.id),
    className: "flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors font-medium",
    title: "Visualizar card\xE1pio formatado"
  }, "\uD83D\uDC41\uFE0F Visualizar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleGenerateShoppingList(menu),
    className: "px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors",
    title: "Gerar lista de compras deste card\xE1pio"
  }, "\uD83D\uDED2"), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleLoadMenu(menu.id),
    className: "px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors",
    title: "Carregar este card\xE1pio no evento atual"
  }, "\uD83D\uDCCB"), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleDuplicate(menu.id),
    className: "px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors",
    title: "Duplicar card\xE1pio"
  }, "\uD83D\uDCD1"), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleDelete(menu.id, menu.name),
    className: "px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors",
    title: "Excluir card\xE1pio"
  }, "\uD83D\uDDD1\uFE0F"))))), window.MenuPreview && /*#__PURE__*/React.createElement(window.MenuPreview, {
    menuId: previewMenuId,
    isOpen: previewMenuId !== null,
    onClose: () => setPreviewMenuId(null)
  }));
}

// Expor para window
window.SavedMenusList = SavedMenusList;
})();
