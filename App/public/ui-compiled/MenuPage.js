(function() {
/**
 * ===================================================================
 * MENU PAGE - Página de Cardápio
 * ===================================================================
 * Página para gerenciar o cardápio do evento
 */

// React hooks usados via React.useState, React.useEffect, etc.
/**
 * Componente MenuPage
 * Gerencia cardápio do evento com consumo por pessoa em gramas
 */
function MenuPage({
  state
}) {
  const [menu, setMenu] = React.useState([]);
  const [stats, setStats] = React.useState(null);
  const [showSaveModal, setShowSaveModal] = React.useState(false);
  const [showMenuGenerator, setShowMenuGenerator] = React.useState(false);
  const [editingPortions, setEditingPortions] = React.useState({}); // { [itemId]: value }

  // Hook de plano - atualiza quando plano muda (escuta evento 'plan-changed')
  const { isPremium } = window.usePlan ? window.usePlan() : { isPremium: true };

  // Carregar cardápio
  React.useEffect(() => {
    loadMenu();
  }, []);

  // Recalcular stats sempre que o menu mudar
  React.useEffect(() => {
    if (menu.length > 0) {
      const recalculateStats = async () => {
        try {
          const menuManager = window.menuManager;
          const statistics = await menuManager.getStatistics();
          setStats(statistics);
        } catch (error) {
          console.error('Erro ao recalcular stats:', error);
        }
      };
      recalculateStats();
    } else {
      // Limpar stats quando o cardápio estiver vazio
      setStats(null);
    }
  }, [menu]);
  const loadMenu = async () => {
    try {
      const menuManager = window.menuManager;
      const activeMenu = await menuManager.getActiveMenu();
      const statistics = await menuManager.getStatistics();
      setMenu(activeMenu);
      setStats(statistics);
      console.log(`📋 Cardápio carregado: ${activeMenu.length} pratos`);
      console.log('📊 Stats do cardápio:', {
        totalCost: statistics.totalCost,
        totalPrice: statistics.totalPrice,
        hasMargin: statistics.totalPrice > statistics.totalCost
      });
      console.log('🍽️ Pratos no cardápio:', activeMenu.map(item => ({
        name: item.dishName,
        profitMargin: item.profitMargin,
        suggestedPrice: item.suggestedPrice,
        dishCost: item.dishCost
      })));
    } catch (error) {
      console.error('Erro ao carregar cardápio:', error);
    }
  };
  // Atualiza valor visual durante digitação (sem validar)
  const handlePortionsChange = (menuItemId, value) => {
    setEditingPortions(prev => ({ ...prev, [menuItemId]: value }));
  };

  // Valida e salva apenas ao sair do campo (onBlur)
  const handlePortionsBlur = async (menuItemId, originalValue) => {
    const editedValue = editingPortions[menuItemId];

    // Se não editou, apenas retorna
    if (editedValue === undefined) return;

    const trimmedValue = String(editedValue).trim();

    // Se está vazio ou é valor parcial (0, 0., 0,), apenas restaurar valor original sem erro
    // Usuário pode estar no meio de digitar 0.5
    if (trimmedValue === '' || trimmedValue === '0' || trimmedValue === '0.' || trimmedValue === '0,') {
      setEditingPortions(prev => {
        const updated = { ...prev };
        delete updated[menuItemId];
        return updated;
      });
      return;
    }

    const newGrams = parseFloat(editedValue);

    // Validar: não pode ser negativo ou inválido
    if (isNaN(newGrams) || newGrams <= 0) {
      alert('Valor inválido. Use um número maior que 0.');
      // Restaurar valor original
      setEditingPortions(prev => {
        const updated = { ...prev };
        delete updated[menuItemId];
        return updated;
      });
      return;
    }

    try {
      const menuManager = window.menuManager;
      const result = await menuManager.updatePortions(menuItemId, newGrams);
      if (result.success) {
        await loadMenu();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Erro ao atualizar gramas por pessoa:', error);
    }

    // Limpar estado de edição
    setEditingPortions(prev => {
      const updated = { ...prev };
      delete updated[menuItemId];
      return updated;
    });
  };

  // Mantém compatibilidade com código antigo (para chamadas diretas)
  const handleUpdateGramsPerPerson = async (menuItemId, newGrams) => {
    try {
      const menuManager = window.menuManager;
      const result = await menuManager.updatePortions(menuItemId, parseFloat(newGrams));
      if (result.success) {
        await loadMenu();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Erro ao atualizar gramas por pessoa:', error);
    }
  };
  const handleRemoveDish = async menuItemId => {
    if (!confirm('Remover este prato do cardápio?')) return;
    try {
      const menuManager = window.menuManager;
      const result = await menuManager.removeDishFromMenu(menuItemId);
      if (result.success) {
        await loadMenu();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Erro ao remover prato:', error);
    }
  };
  const handleGenerateShoppingList = async () => {
    try {
      const menuManager = window.menuManager;
      const guests = state.guests || 100;

      // ✅ EXPOR ingredientes do state no window.ingredientsManager para MenuManager usar
      if (!window.ingredientsManager) {
        window.ingredientsManager = {};
      }
      window.ingredientsManager.ingredients = state.ingredientsDatabase || [];
      console.log(`🔧 [MenuPage] Expondo ${window.ingredientsManager.ingredients.length} ingredientes no window.ingredientsManager`);

      // Gerar lista consolidada de ingredientes
      const ingredientsList = await menuManager.generateIngredientsList(guests);
      console.log('📋 Lista de ingredientes gerada:', ingredientsList);

      // ✅ FIX: Usar APENAS ingredientes do PostgreSQL (state.ingredientsDatabase)
      const allIngredients = state.ingredientsDatabase || [];
      if (allIngredients.length === 0) {
        alert('❌ Erro: Nenhum ingrediente carregado do PostgreSQL!\n\nVerifique sua conexão com o backend.');
        return;
      }
      console.log('🔍 [MenuPage] Usando ingredientes do PostgreSQL:', {
        source: 'state (PostgreSQL)',
        total: allIngredients.length
      });

      // ✅ Usar função compartilhada para processar ingredientes
      const newItems = window.ShoppingListGenerator.processIngredientsToItems(
        ingredientsList,
        guests,
        allIngredients
      );

      // Substituir itens do evento
      state.setItems(newItems);
      alert(`✅ Lista de compras gerada!\n\n${ingredientsList.length} ingredientes adicionados aos Itens do Evento.`);
    } catch (error) {
      console.error('Erro ao gerar lista de compras:', error);
      alert('Erro ao gerar lista de compras. Veja o console.');
    }
  };
  const handleClearMenu = async () => {
    if (!confirm('Limpar todo o cardápio?')) return;
    try {
      const menuManager = window.menuManager;
      const result = await menuManager.clearMenu();
      if (result.success) {
        await loadMenu();
      }
    } catch (error) {
      console.error('Erro ao limpar cardápio:', error);
    }
  };
  const handleSaveCurrentMenu = () => {
    if (menu.length === 0) {
      alert('❌ O cardápio está vazio. Adicione pratos antes de salvar.');
      return;
    }
    setShowSaveModal(true);
  };
  const handleSaveMenuSubmit = async formData => {
    try {
      // Usar ManagerHelper para pegar o manager correto (backend > local)
      const savedMenusManager = window.ManagerHelper?.getSavedMenusManager() || window.PrecificacaoAPI?.savedMenusManager || window.savedMenusManager;
      if (!savedMenusManager) {
        alert('❌ SavedMenusManager não disponível');
        return;
      }

      // Buscar peso dos pratos originais se não estiver no menu
      const dishManager = window.ManagerHelper?.getDishManager() || window.PrecificacaoAPI?.dishManager || window.dishManager;
      const menuData = {
        name: formData.name,
        description: formData.description,
        eventType: formData.eventType,
        dishes: []
      };

      // Se for sobrescrita, usar o ID do cardápio existente
      if (formData.id && formData.overwrite) {
        menuData.id = formData.id;
        console.log('🔄 [MenuPage] SOBRESCREVENDO cardápio existente:');
        console.log('  - ID:', formData.id);
        console.log('  - Nome:', formData.name);
        console.log('  - menuData com ID:', menuData);
      } else {
        console.log('📝 [MenuPage] Criando NOVO cardápio:', formData.name);
      }

      // Processar pratos de forma assíncrona
      console.log('🔍 [MenuPage] Processando pratos do menu:', menu.length);
      for (const item of menu) {
        console.log('🍽️ [MenuPage] Item original do menu:', {
          dishName: item.dishName,
          dishId: item.dishId,
          dishCost: item.dishCost,
          totalWeight: item.totalWeight,
          portionsPerPerson: item.portionsPerPerson,
          fullItem: item
        });
        let totalWeight = item.totalWeight || 0;
        let dishCost = item.dishCost || 0;
        let servings = item.servings || item.dishServings || 1;
        let dishIngredients = item.dishIngredients || [];
        let useWeightCalculation = item.useWeightCalculation || false;
        let profitMargin = item.profitMargin || 0;  // ✅ Margem de lucro
        let suggestedPrice = item.suggestedPrice || 0;  // ✅ Preço sugerido

        // Se não tem peso, custo, servings ou ingredientes, buscar do prato original
        if ((totalWeight === 0 || dishCost === 0 || servings === 1 || dishIngredients.length === 0 || profitMargin === 0) && item.dishId) {
          console.log(`🔍 Buscando dados do prato original: ${item.dishId}`);

          // ✅ Usar API para buscar prato completo com ingredientes (não cache!)
          let originalDish = null;
          if (window.PrecificacaoAPI?.api) {
            console.log('📡 Buscando prato completo da API...');
            const response = await window.PrecificacaoAPI.api.getDish(item.dishId);
            originalDish = response.data || response;
            console.log('📦 Prato da API:', originalDish);
          } else if (dishManager) {
            // Fallback para cache local (planos offline)
            console.log('💾 Fallback: buscando do cache local...');
            originalDish = await dishManager.getById(item.dishId);
            console.log('📦 Prato do cache:', originalDish);
          }

          console.log('📦 Prato original encontrado:', originalDish);
          if (originalDish) {
            if (totalWeight === 0 && originalDish.totalWeight) {
              totalWeight = originalDish.totalWeight;
              console.log(`✅ Peso recuperado: ${totalWeight}g`);
            }
            if (dishCost === 0 && originalDish.totalCost) {
              dishCost = originalDish.totalCost;
              console.log(`✅ Custo recuperado: R$ ${dishCost}`);
            }
            if (originalDish.servings) {
              servings = originalDish.servings;
              console.log(`✅ Servings recuperado: ${servings} porções`);
            }
            if (originalDish.useWeightCalculation !== undefined) {
              useWeightCalculation = originalDish.useWeightCalculation;
              console.log(`✅ useWeightCalculation recuperado: ${useWeightCalculation}`);
            }
            if (dishIngredients.length === 0 && originalDish.ingredients && originalDish.ingredients.length > 0) {
              dishIngredients = originalDish.ingredients;
              console.log(`✅ Ingredientes recuperados: ${dishIngredients.length} itens`);
            }
            // ✅ Buscar margem e preço do prato original
            if (profitMargin === 0 && originalDish.profitMargin) {
              profitMargin = originalDish.profitMargin;
              console.log(`✅ Margem recuperada: ${profitMargin}%`);
            }
            if (suggestedPrice === 0 && originalDish.suggestedPrice) {
              suggestedPrice = originalDish.suggestedPrice;
              console.log(`✅ Preço sugerido recuperado: R$ ${suggestedPrice}`);
            }
          }
        }

        // ✅ NOVO: Enriquecer ingredientes com dados completos do cadastro (snapshot)
        const enrichedIngredients = [];
        const allIngredients = eventState?.ingredientsDatabase || [];
        console.log(`🔍 [MenuPage] Enriquecendo ${dishIngredients.length} ingredientes com dados completos...`);
        for (const dishIng of dishIngredients) {
          // Buscar ingrediente completo no cadastro
          let fullIngredient = null;
          if (dishIng.ingredientId) {
            fullIngredient = allIngredients.find(i => i.id === dishIng.ingredientId);
          }
          if (!fullIngredient && dishIng.ingredientName) {
            fullIngredient = allIngredients.find(i => (i.name || i.ingredientName)?.toLowerCase() === dishIng.ingredientName.toLowerCase());
          }

          // Criar snapshot completo do ingrediente
          const ingredientSnapshot = {
            // Dados da receita (quantidade usada)
            quantity: dishIng.quantity,
            unit: dishIng.unit,
            ingredientId: dishIng.ingredientId,
            ingredientName: dishIng.ingredientName || dishIng.name,
            // Snapshot dos dados do cadastro (para lista de compras)
            name: fullIngredient?.name || dishIng.ingredientName || dishIng.name,
            category: fullIngredient?.category || 'Sem Categoria',
            unitType: fullIngredient?.unitType || dishIng.unitType || 'weight',
            costPerUnit: fullIngredient?.costPerUnit || fullIngredient?.price || 0,
            unitSize: fullIngredient?.unitSize || 1000,
            lossPercentage: fullIngredient?.lossPercentage || 0,
            yieldMultiplier: fullIngredient?.yieldMultiplier || 1,
            unit_cost: fullIngredient?.unit_cost || fullIngredient?.unitCost || 0
          };
          console.log(`  📦 Ingrediente "${ingredientSnapshot.name}":`, {
            found: !!fullIngredient,
            category: ingredientSnapshot.category,
            costPerUnit: ingredientSnapshot.costPerUnit,
            lossPercentage: ingredientSnapshot.lossPercentage,
            yieldMultiplier: ingredientSnapshot.yieldMultiplier
          });
          enrichedIngredients.push(ingredientSnapshot);
        }
        const dishData = {
          dishId: item.dishId,
          dishName: item.dishName,
          dishCategory: item.dishCategory,
          dishCost: dishCost,
          profitMargin: profitMargin,  // ✅ Salvar margem de lucro
          suggestedPrice: suggestedPrice,  // ✅ Salvar preço sugerido
          dishIngredients: enrichedIngredients,
          // ✅ USAR ingredientes enriquecidos
          servings: servings,
          // IMPORTANTE: salvar servings para cálculo correto
          portionsPerPerson: item.portionsPerPerson || 1,
          totalWeight: totalWeight,
          useWeightCalculation: useWeightCalculation // ✅ Incluir flag de cálculo
        };
        console.log(`✅ Prato FINAL para salvar "${item.dishName}":`, {
          dishId: dishData.dishId,
          dishCost: dishData.dishCost,
          profitMargin: dishData.profitMargin,
          suggestedPrice: dishData.suggestedPrice,
          totalWeight: dishData.totalWeight,
          servings: dishData.servings,
          ingredientsCount: dishData.dishIngredients.length,
          firstIngredient: dishData.dishIngredients[0]
        });
        menuData.dishes.push(dishData);
      }
      console.log('💾 [MenuPage] Dados COMPLETOS sendo enviados para savedMenusManager.saveItem():');
      console.log('  - menuData.id:', menuData.id);
      console.log('  - menuData.name:', menuData.name);
      console.log('  - menuData.dishes.length:', menuData.dishes.length);
      console.log('  - formData.overwrite:', formData.overwrite);

      const result = await savedMenusManager.saveItem(menuData);

      console.log('📦 [MenuPage] Resultado do saveItem:', result);

      if (result && result.success) {
        const savedId = result.data?.id || result.data?.menu?.id;
        const savedName = formData.name;
        const action = formData.overwrite ? 'atualizado' : 'salvo';
        console.log(`✅ [MenuPage] Cardápio ${action} com sucesso! ID final:`, savedId);

        // Vincular cardápio salvo ao evento
        if (savedId) {
          window.dispatchEvent(new CustomEvent('menu-linked', {
            detail: { id: savedId, name: savedName }
          }));
          console.log('📋 [MenuPage] Cardápio vinculado ao evento:', savedId, savedName);
        }

        alert(`✅ Cardápio "${savedName}" ${action} com sucesso!`);
        setShowSaveModal(false);
      } else {
        const errorMsg = result?.message || 'Erro desconhecido ao salvar cardápio';
        console.error('❌ [MenuPage] Erro ao salvar:', errorMsg, result);
        alert(`❌ ${errorMsg}`);
      }
    } catch (error) {
      console.error('Erro ao salvar cardápio:', error);
      alert(`❌ Erro ao salvar cardápio: ${error.message || 'Erro desconhecido'}`);
    }
  };
  // Nome do cardápio vinculado (se existir)
  const linkedMenuName = state?.linkedMenuName;


  // ===== Lista do cardápio compacta (igual à aba Itens): tabela no computador, linhas no celular =====
  const MENU_CATS = [['entrada', 'Entradas'], ['principal', 'Principais'], ['acompanhamento', 'Acompanhamentos'], ['sobremesa', 'Sobremesas'], ['bebida', 'Bebidas']];
  const catKey = c => {
    const t = String(c || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (/entrada|petisc|aperitiv/.test(t)) return 'entrada';
    if (/acompanh|guarni/.test(t)) return 'acompanhamento';
    if (/sobremes|doce/.test(t)) return 'sobremesa';
    if (/bebid|drink/.test(t)) return 'bebida';
    if (/princip|prato/.test(t)) return 'principal';
    return t || 'outros';
  };
  const brl = v => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // CMV (custo ÷ preço) com a cor da meta de Custos da empresa
  const cmvTag = (pct, extra) => {
    if (!(pct > 0)) return /*#__PURE__*/React.createElement("span", { className: "text-gray-400" }, "\u2014");
    const st = window.PricingRules && window.PricingRules.cmvStatus ? window.PricingRules.cmvStatus(pct) : null;
    return /*#__PURE__*/React.createElement("span", {
      "data-cmv": pct.toFixed(1),
      title: st ? `CMV = custo \xF7 pre\xE7o \xB7 meta ${st.meta}%: ${st.rotulo}` : 'CMV = custo \xF7 pre\xE7o',
      style: Object.assign({ color: st ? st.cor : '#374151', background: st ? st.fundo : 'transparent', borderRadius: 999, padding: '1px 8px', fontWeight: 600, whiteSpace: 'nowrap' }, extra || {})
    }, pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%');
  };
  const calcItem = item => {
    const guests = state.guests || 0;
    const dishCost = item.dishCost || 0;
    const numPortions = item.portionsPerPerson || 0;
    const servings = item.servings || 1;
    const totalWeight = item.totalWeight || 0;
    const isPortionBased = item.useWeightCalculation || (servings > 0 && totalWeight === 0);
    const costPerPerson = isPortionBased
      ? (servings > 0 ? dishCost / servings : dishCost) * numPortions
      : (totalWeight > 0 ? dishCost / totalWeight : dishCost) * numPortions * 100;
    const margin = item.profitMargin || 0;
    const pricePerPerson = costPerPerson * (1 + margin / 100);
    const tamanho = item.useWeightCalculation
      ? `${item.servings || 0} porções`
      : (window.unitConversions?.formatWeight?.(totalWeight) || `${totalWeight.toFixed(0)}g`);
    const qtd = item.useWeightCalculation
      ? (() => {
        const porcoes = numPortions * guests;
        const pratos = Math.ceil(porcoes / (item.servings || 1));
        return `${porcoes.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} porções (≈ ${pratos} prato${pratos > 1 ? 's' : ''})`;
      })()
      : `${window.unitConversions?.formatWeight?.(numPortions * 100 * guests, 1) || (numPortions * 100 * guests).toFixed(0) + 'g'} total`;
    return {
      isPortionBased, costPerPerson, totalCost: costPerPerson * guests, margin, pricePerPerson, totalPrice: pricePerPerson * guests,
      cmvPct: pricePerPerson > 0 ? costPerPerson / pricePerPerson * 100 : null,
      tamanho, qtd, porcaoLabel: item.useWeightCalculation ? 'Porções do prato por pessoa' : 'Porções por pessoa (1 = 100 g)'
    };
  };
  const portionsInput = (item, extra) => /*#__PURE__*/React.createElement("input", {
    type: "number",
    "aria-label": "Porções por pessoa",
    value: editingPortions[item.id] !== undefined ? editingPortions[item.id] : (item.portionsPerPerson === 0 ? '' : item.portionsPerPerson),
    onChange: e => handlePortionsChange(item.id, e.target.value),
    onBlur: () => handlePortionsBlur(item.id, item.portionsPerPerson),
    step: "0.1",
    min: "0",
    max: "10",
    placeholder: "1",
    className: "px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm",
    style: Object.assign({ width: '72px' }, extra || {})
  });
  const removeBtn = item => /*#__PURE__*/React.createElement("button", {
    onClick: () => handleRemoveDish(item.id),
    className: "px-2 py-1 rounded-lg hover:bg-red-50 text-red-600 text-sm",
    title: "Remover do card\xE1pio",
    "aria-label": "Remover " + (item.dishName || 'prato')
  }, "🗑️");
  const renderMenuList = () => {
    const grupos = {};
    const ordem = [];
    menu.forEach(item => {
      const k = catKey(item.dishCategory);
      if (!grupos[k]) { grupos[k] = []; ordem.push(k); }
      grupos[k].push(item);
    });
    const cats = MENU_CATS.filter(c => grupos[c[0]]).concat(ordem.filter(k => !MENU_CATS.some(c => c[0] === k)).map(k => [k, k.charAt(0).toUpperCase() + k.slice(1)]));
    const guests = state.guests || 0;
    const th = (txt, sub, align) => /*#__PURE__*/React.createElement("th", {
      className: "px-3 py-2 text-xs font-semibold text-gray-600",
      style: { textAlign: align || 'right', whiteSpace: 'nowrap' }
    }, txt, sub && /*#__PURE__*/React.createElement("div", { style: { fontWeight: 'normal', color: '#6c757d', fontSize: '10px' } }, sub));
    return /*#__PURE__*/React.createElement("div", {
      className: "space-y-4 mb-6",
      "data-menu-list": true
    }, cats.map(([key, titulo]) => {
      const itens = grupos[key];
      const linhas = itens.map(item => ({ item, c: calcItem(item) }));
      const soma = f => linhas.reduce((a, l) => a + l.c[f], 0);
      const header = (big) => /*#__PURE__*/React.createElement("div", {
        className: "px-4 py-3 flex flex-wrap items-center justify-between gap-3",
        style: { background: 'linear-gradient(90deg,#a855f7,#db2777)' }
      }, /*#__PURE__*/React.createElement("h3", {
        className: (big ? "text-xl" : "text-lg") + " font-bold text-white"
      }, titulo, " ", /*#__PURE__*/React.createElement("span", { className: "text-xs", style: { color: '#f5d0fe' } }, "(", itens.length, ")")), /*#__PURE__*/React.createElement("div", {
        className: "flex gap-4 text-right"
      }, (big ? [['Custo/pessoa', brl(soma('costPerPerson'))], [`Custo ${guests} pessoas`, brl(soma('totalCost'))], ['Com markup', brl(soma('totalPrice'))], ['CMV', soma('totalPrice') > 0 ? (soma('totalCost') / soma('totalPrice') * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' : '\u2014']] : [['Custo', brl(soma('totalCost'))], ['Com markup', brl(soma('totalPrice'))], ['CMV', soma('totalPrice') > 0 ? (soma('totalCost') / soma('totalPrice') * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' : '\u2014']]).map(([l, v]) => /*#__PURE__*/React.createElement("div", { key: l }, /*#__PURE__*/React.createElement("div", { className: "text-xs", style: { color: '#f5d0fe' } }, l), /*#__PURE__*/React.createElement("div", { className: "text-sm font-bold text-white", style: { whiteSpace: 'nowrap' } }, v)))));
      return /*#__PURE__*/React.createElement("div", {
        key: key,
        className: "bg-white rounded-xl shadow-lg overflow-hidden",
        "data-menu-cat": key
      },
      // Celular / tablet em pé: linhas compactas
      /*#__PURE__*/React.createElement("div", { className: "lg:hidden" }, header(false), linhas.map(({ item, c }, idx) => {
        const cell = (label, value, cor) => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", { className: "text-xs text-gray-500" }, label), /*#__PURE__*/React.createElement("div", { className: "text-sm font-medium", style: { color: cor || '#1f2937' } }, value));
        return /*#__PURE__*/React.createElement("div", {
          key: item.id,
          "data-menu-item": item.dishName,
          className: `px-4 py-3 border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`
        }, /*#__PURE__*/React.createElement("div", {
          className: "flex justify-between items-start gap-3"
        }, /*#__PURE__*/React.createElement("span", { className: "font-semibold text-gray-800 min-w-0", style: { overflowWrap: 'anywhere' } }, item.dishName), /*#__PURE__*/React.createElement("span", { className: "font-bold whitespace-nowrap", style: { color: '#9333ea' } }, brl(c.totalPrice))), /*#__PURE__*/React.createElement("div", {
          className: "grid gap-2 mt-2",
          style: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }
        }, cell(c.isPortionBased ? 'Custo/pessoa' : 'Custo/pessoa', brl(c.costPerPerson)), cell(`Custo ${guests} pessoas`, brl(c.totalCost)), cell(`Valor/pessoa (markup ${c.margin}%)`, brl(c.pricePerPerson), c.margin > 0 ? '#16a34a' : null), cell(item.useWeightCalculation ? 'Serve' : 'Peso do prato', c.tamanho), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", { className: "text-xs text-gray-500" }, "CMV"), /*#__PURE__*/React.createElement("div", { className: "text-sm" }, cmvTag(c.cmvPct)))), /*#__PURE__*/React.createElement("div", {
          className: "flex flex-wrap items-center gap-2 mt-2"
        }, /*#__PURE__*/React.createElement("span", { className: "text-xs text-gray-600" }, item.useWeightCalculation ? 'Porções/pessoa:' : 'Porções/pessoa (100 g):'), portionsInput(item), /*#__PURE__*/React.createElement("span", { className: "text-xs text-gray-500", style: { whiteSpace: 'nowrap' } }, "= ", c.qtd), /*#__PURE__*/React.createElement("span", { style: { marginLeft: 'auto' } }, removeBtn(item))));
      })),
      // Computador: tabela
      /*#__PURE__*/React.createElement("div", { className: "hidden lg:block overflow-x-auto" }, header(true), /*#__PURE__*/React.createElement("table", { className: "w-full", style: { tableLayout: 'fixed' } }, /*#__PURE__*/React.createElement("colgroup", null, ['20%', '9%', '21%', '10%', '11%', '10%', '7%', '9%', '3%'].map((w, i) => /*#__PURE__*/React.createElement("col", { key: i, style: { width: w } }))), /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
        className: "bg-gray-50 border-b-2 border-gray-200"
      }, th('Prato', null, 'left'), th('Tamanho', null, 'left'), th('Porções/pessoa', null, 'left'), th('Custo/pessoa'), th('Custo total', `${guests} pessoas`), th('Valor/pessoa', 'com markup'), th('CMV', 'custo \xF7 pre\xE7o', 'center'), th('Total c/ markup'), /*#__PURE__*/React.createElement("th", { className: "px-2 py-2" }))), /*#__PURE__*/React.createElement("tbody", null, linhas.map(({ item, c }, idx) => /*#__PURE__*/React.createElement("tr", {
        key: item.id,
        "data-menu-row": item.dishName,
        className: `border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`
      }, /*#__PURE__*/React.createElement("td", { className: "px-3 py-2" }, /*#__PURE__*/React.createElement("div", { className: "font-semibold text-gray-800" }, item.dishName)), /*#__PURE__*/React.createElement("td", { className: "px-3 py-2 text-sm text-gray-600", style: { whiteSpace: 'nowrap' } }, c.tamanho), /*#__PURE__*/React.createElement("td", { className: "px-3 py-2" }, /*#__PURE__*/React.createElement("div", { className: "flex items-center gap-2", title: c.porcaoLabel }, portionsInput(item), /*#__PURE__*/React.createElement("span", { className: "text-xs text-gray-500", style: { whiteSpace: 'nowrap' } }, "= ", c.qtd))), /*#__PURE__*/React.createElement("td", { className: "px-3 py-2 text-sm text-right", style: { whiteSpace: 'nowrap' } }, brl(c.costPerPerson)), /*#__PURE__*/React.createElement("td", { className: "px-3 py-2 text-sm text-right font-semibold", style: { whiteSpace: 'nowrap', color: '#9333ea' } }, brl(c.totalCost)), /*#__PURE__*/React.createElement("td", { className: "px-3 py-2 text-sm text-right", style: { whiteSpace: 'nowrap', color: c.margin > 0 ? '#16a34a' : '#374151' } }, brl(c.pricePerPerson), /*#__PURE__*/React.createElement("div", { className: "text-xs text-gray-400" }, c.margin, "%")), /*#__PURE__*/React.createElement("td", { className: "px-3 py-2 text-sm text-center" }, cmvTag(c.cmvPct)), /*#__PURE__*/React.createElement("td", { className: "px-3 py-2 text-sm text-right font-bold", style: { whiteSpace: 'nowrap', color: c.margin > 0 ? '#16a34a' : '#374151' } }, brl(c.totalPrice)), /*#__PURE__*/React.createElement("td", { className: "px-2 py-2 text-right" }, removeBtn(item))))))));
    }));
  };

  return /*#__PURE__*/React.createElement("div", {
    className: "menu-page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg p-6 mb-6 shadow-lg"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold mb-2"
  }, "🍽️ Cardápio do Evento"), linkedMenuName && /*#__PURE__*/React.createElement("p", {
    className: "text-purple-100 text-sm mb-4"
  }, "📋 ", linkedMenuName), !linkedMenuName && /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }), stats && /*#__PURE__*/React.createElement("div", {
    // ✅ Grade que quebra em várias linhas: no celular os 5 números não cabiam numa linha só e eram cortados
    className: "grid gap-4",
    style: { gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))' }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-purple-100 text-xs text-center"
  }, "Pratos no Cardápio"), /*#__PURE__*/React.createElement("p", {
    className: "text-xl font-bold text-center"
  }, stats.totalDishes)), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-purple-100 text-xs text-center"
  }, "Convidados"), /*#__PURE__*/React.createElement("p", {
    className: "text-xl font-bold text-center"
  }, state.guests || 0)), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-purple-100 text-xs text-center"
  }, "Custo/Pessoa"), /*#__PURE__*/React.createElement("p", {
    className: "text-xl font-bold text-center"
  }, "R$ ", stats.totalCost.toFixed(2))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-purple-100 text-xs text-center"
  }, "Valor/Pessoa"), /*#__PURE__*/React.createElement("p", {
    className: "text-xl font-bold text-center"
  }, "R$ ", stats.totalPrice ? stats.totalPrice.toFixed(2) : stats.totalCost.toFixed(2))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2",
    "data-menu-cmv": true
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-purple-100 text-xs text-center"
  }, "CMV"), /*#__PURE__*/React.createElement("p", {
    className: "text-xl font-bold text-center",
    title: "Custo \xF7 valor do card\xE1pio (meta em Custos da empresa)"
  }, stats.totalPrice > 0 ? (stats.totalCost / stats.totalPrice * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' : '\u2014')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-purple-100 text-xs text-center"
  }, "Total Geral"), /*#__PURE__*/React.createElement("p", {
    className: "text-xl font-bold text-center"
  }, "R$ ", ((stats.totalPrice || stats.totalCost) * (state.guests || 0)).toFixed(2))))), menu.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 border-l-4 border-blue-500 p-4 mb-6"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-blue-900 font-medium"
  }, "\uD83D\uDCCC Como usar o Card\xE1pio:"), /*#__PURE__*/React.createElement("ol", {
    className: "text-blue-800 text-sm mt-2 ml-4 list-decimal space-y-1"
  }, /*#__PURE__*/React.createElement("li", null, "V\xE1 para a aba ", /*#__PURE__*/React.createElement("strong", null, "Pratos")), /*#__PURE__*/React.createElement("li", null, "Clique em ", /*#__PURE__*/React.createElement("strong", null, "\"Adicionar ao Card\xE1pio\""), " nos pratos desejados"), /*#__PURE__*/React.createElement("li", null, "Volte aqui e ajuste o ", /*#__PURE__*/React.createElement("strong", null, "consumo por pessoa (em gramas)")), /*#__PURE__*/React.createElement("li", null, "Clique em ", /*#__PURE__*/React.createElement("strong", null, "\"Gerar Lista de Compras\"")))), menu.length > 0 ? renderMenuList() : /*#__PURE__*/React.createElement("div", {
    className: "text-center py-12 text-gray-400"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-6xl mb-4"
  }, "\uD83C\uDF7D\uFE0F"), /*#__PURE__*/React.createElement("p", {
    className: "text-lg"
  }, "Nenhum prato no card\xE1pio ainda"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm"
  }, "Adicione pratos da aba \"Pratos\"")), /*#__PURE__*/React.createElement("div", {
    className: "sticky bottom-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 menu-actions-sticky"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col sm:flex-row items-center justify-between gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    // ✅ flex-wrap: no celular os 3 botões não cabiam lado a lado e vazavam pra fora do quadro
    className: "flex flex-wrap justify-center gap-2"
  }, isPremium ? /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      console.log('🔘 [MenuPage] Botão "Montar com IA" clicado');
      console.log('📦 [MenuPage] state.event:', state.event);
      console.log('📦 [MenuPage] state.currentEventId:', state.currentEventId);
      console.log('📦 [MenuPage] state.eventName:', state.eventName);
      console.log('📦 [MenuPage] state.guests:', state.guests);
      const eventObject = state.event || { id: state.currentEventId, name: state.eventName || 'Evento', people: state.guests || 0 };
      console.log('📦 [MenuPage] eventObject criado:', eventObject);
      setShowMenuGenerator(true);
    },
    className: "px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors font-medium shadow-md"
  }, "\uD83E\uDD16 Montar com IA") : /*#__PURE__*/React.createElement("button", {
    onClick: () => alert(window.premiumOnlyMessage ? window.premiumOnlyMessage() : '🔒 Recurso disponível apenas no plano PREMIUM'),
    className: "px-6 py-3 bg-gray-400 text-white rounded-lg font-medium shadow-md opacity-60 cursor-not-allowed",
    title: "🔒 Recurso Premium - Disponível apenas no plano PREMIUM"
  }, "\uD83E\uDD16 Montar com IA \uD83D\uDD12"), menu.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    onClick: handleSaveCurrentMenu,
    className: "px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md",
    title: "Salvar este card\xE1pio como template reutiliz\xE1vel"
  }, "\uD83D\uDCBE Salvar Card\xE1pio"), /*#__PURE__*/React.createElement("button", {
    onClick: handleClearMenu,
    className: "px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
  }, "\uD83D\uDDD1\uFE0F Limpar"))), menu.length > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: handleGenerateShoppingList,
    className: "px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors font-bold text-lg shadow-lg"
  }, "\uD83D\uDCCB Gerar Lista de Compras (", state.guests, " pessoas)"))), window.SaveMenuModal && /*#__PURE__*/React.createElement(window.SaveMenuModal, {
    isOpen: showSaveModal,
    onClose: () => setShowSaveModal(false),
    onSave: handleSaveMenuSubmit,
    menuItems: menu
  }), window.MenuGenerator && /*#__PURE__*/React.createElement(window.MenuGenerator, {
    isOpen: showMenuGenerator,
    onClose: () => setShowMenuGenerator(false),
    onSuccess: () => {
      setShowMenuGenerator(false);
      loadMenu(); // Recarregar cardápio
    },
    event: state.event || { id: state.currentEventId, name: state.eventName || 'Evento', people: state.guests || 0, date: state.eventDate, location: state.eventLocation }
  }));
}

// Expor para window
window.MenuPage = MenuPage;
})();
