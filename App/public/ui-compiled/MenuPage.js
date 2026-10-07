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
  }, /*#__PURE__*/React.createElement("li", null, "V\xE1 para a aba ", /*#__PURE__*/React.createElement("strong", null, "Pratos")), /*#__PURE__*/React.createElement("li", null, "Clique em ", /*#__PURE__*/React.createElement("strong", null, "\"Adicionar ao Card\xE1pio\""), " nos pratos desejados"), /*#__PURE__*/React.createElement("li", null, "Volte aqui e ajuste o ", /*#__PURE__*/React.createElement("strong", null, "consumo por pessoa (em gramas)")), /*#__PURE__*/React.createElement("li", null, "Clique em ", /*#__PURE__*/React.createElement("strong", null, "\"Gerar Lista de Compras\"")))), menu.length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-4 mb-6"
  }, menu.map(item => /*#__PURE__*/React.createElement("div", {
    key: item.id,
    className: "bg-white rounded-lg shadow-md p-6 border border-gray-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-start justify-between gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    // ✅ min-w-0: sem isso a linha "Porções por pessoa" (que não quebrava) esticava o card além da tela
    className: "flex-1 min-w-0",
    // flexBasis: no celular o botão Remover vai pra linha de baixo em vez de espremer as informações
    style: { flexBasis: '240px' }
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold text-gray-800 mb-1",
    style: { overflowWrap: 'anywhere' }
  }, item.dishName), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 mb-3"
  }, item.dishCategory), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, (() => {
    // ✅ Usar useWeightCalculation ao invés de isDishPortionBased
    const isPortionBased = item.useWeightCalculation;
    return isPortionBased ? 'Serve Porções' : 'Peso Total do Prato';
  })()), /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-blue-600"
  }, (() => {
    // ✅ Usar useWeightCalculation ao invés de isDishPortionBased
    const isPortionBased = item.useWeightCalculation;
    return isPortionBased ? `${item.servings || 0} porções` : window.unitConversions?.formatWeight?.(item.totalWeight) || `${item.totalWeight.toFixed(0)}g`;
  })())), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, (() => {
    // ✅ Considerar useWeightCalculation OU totalWeight === 0
    const servings = item.servings || 1;
    const totalWeight = item.totalWeight || 0;
    const isPortionBased = item.useWeightCalculation || (servings > 0 && totalWeight === 0);
    return isPortionBased ? 'Custo por pessoa' : 'Custo por porção (100g)';
  })()), /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-gray-800"
  }, "R$ ", (() => {
    const dishCost = item.dishCost || 0;
    const numPortions = item.portionsPerPerson || 0;

    const servings = item.servings || 1;
    const totalWeight = item.totalWeight || 0;
    const isPortionBased = item.useWeightCalculation || (servings > 0 && totalWeight === 0);

    if (isPortionBased) {
      // Prato por PORÇÃO: totalCost / servings × porções por pessoa
      const costPerDishPortion = servings > 0 ? dishCost / servings : dishCost;
      const costPerPerson = costPerDishPortion * numPortions;
      return costPerPerson.toFixed(2);
    } else {
      // Prato por PESO: custo por grama × (porções × 100g)
      const gramsPerPerson = numPortions * 100;
      const costPerGram = totalWeight > 0 ? dishCost / totalWeight : dishCost;
      const costPerPerson = costPerGram * gramsPerPerson;
      return costPerPerson.toFixed(2);
    }
  })())), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "Total para ", state.guests, " pessoas"), /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-purple-600"
  }, "R$ ", (() => {
    const dishCost = item.dishCost || 0;
    const numPortions = item.portionsPerPerson || 0;

    const servings = item.servings || 1;
    const totalWeight = item.totalWeight || 0;
    const isPortionBased = item.useWeightCalculation || (servings > 0 && totalWeight === 0);

    if (isPortionBased) {
      // Prato por PORÇÃO
      const costPerDishPortion = servings > 0 ? dishCost / servings : dishCost;
      const costPerPerson = costPerDishPortion * numPortions;
      const totalCost = costPerPerson * state.guests;
      return totalCost.toFixed(2);
    } else {
      // Prato por PESO
      const gramsPerPerson = numPortions * 100;
      const costPerGram = totalWeight > 0 ? dishCost / totalWeight : dishCost;
      const costPerPerson = costPerGram * gramsPerPerson;
      const totalCost = costPerPerson * state.guests;
      return totalCost.toFixed(2);
    }
  })())),
  (() => {
    const profitMargin = item.profitMargin || 0;
    // ✅ Sempre mostrar valores, mesmo com margem 0% (preço = custo)
    return /*#__PURE__*/React.createElement(React.Fragment, null,
      /*#__PURE__*/React.createElement("div", null),
      /*#__PURE__*/React.createElement("div", {
        className: "mt-2"
      }, /*#__PURE__*/React.createElement("p", {
        className: "text-xs text-gray-500"
      }, "Valor/Pessoa (margem ", profitMargin, "%)"), /*#__PURE__*/React.createElement("p", {
        className: profitMargin > 0 ? "text-lg font-bold text-green-600" : "text-lg font-bold text-gray-700"
      }, "R$ ", (() => {
        const dishCost = item.dishCost || 0;
        const numPortions = item.portionsPerPerson || 0;
        const totalWeight = item.totalWeight || 0;
        const servings = item.servings || 1;
        const isPortionBased = item.useWeightCalculation || (servings > 0 && totalWeight === 0);
        let costPerPerson = 0;

        if (isPortionBased) {
          const costPerDishPortion = servings > 0 ? dishCost / servings : dishCost;
          costPerPerson = costPerDishPortion * numPortions;
        } else {
          const gramsPerPerson = numPortions * 100;
          const costPerGram = totalWeight > 0 ? dishCost / totalWeight : dishCost;
          costPerPerson = costPerGram * gramsPerPerson;
        }

        const pricePerPerson = costPerPerson * (1 + profitMargin / 100);
        return pricePerPerson.toFixed(2);
      })())),
      /*#__PURE__*/React.createElement("div", {
        className: "mt-2"
      }, /*#__PURE__*/React.createElement("p", {
        className: "text-xs text-gray-500"
      }, "Total com margem (", profitMargin, "%)"), /*#__PURE__*/React.createElement("p", {
        className: profitMargin > 0 ? "text-lg font-bold text-green-600" : "text-lg font-bold text-gray-700"
      }, "R$ ", (() => {
        const dishCost = item.dishCost || 0;
        const numPortions = item.portionsPerPerson || 0;
        const totalWeight = item.totalWeight || 0;
        const servings = item.servings || 1;
        const isPortionBased = item.useWeightCalculation || (servings > 0 && totalWeight === 0);
        let costPerPerson = 0;

        if (isPortionBased) {
          const costPerDishPortion = servings > 0 ? dishCost / servings : dishCost;
          costPerPerson = costPerDishPortion * numPortions;
        } else {
          const gramsPerPerson = numPortions * 100;
          const costPerGram = totalWeight > 0 ? dishCost / totalWeight : dishCost;
          costPerPerson = costPerGram * gramsPerPerson;
        }

        const pricePerPerson = costPerPerson * (1 + profitMargin / 100);
        const totalPrice = pricePerPerson * state.guests;
        return totalPrice.toFixed(2);
      })()))
    );
  })()),
  /*#__PURE__*/React.createElement("div", {
    className: "mt-4 flex flex-wrap items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium text-gray-700"
  }, (() => {
    const isPortionBased = item.useWeightCalculation;
    if (isPortionBased) {
      return "Porções do prato por pessoa:";
    } else {
      return "Porções por pessoa (1 porção = 100g):";
    }
  })()), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: editingPortions[item.id] !== undefined ? editingPortions[item.id] : (item.portionsPerPerson === 0 ? '' : item.portionsPerPerson),
    onChange: e => handlePortionsChange(item.id, e.target.value),
    onBlur: () => handlePortionsBlur(item.id, item.portionsPerPerson),
    step: "0.1",
    min: "0",
    max: "10",
    className: "w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent",
    placeholder: "1"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-gray-600 whitespace-nowrap"
  }, (() => {
    const isPortionBased = item.useWeightCalculation;
    return isPortionBased ?
    `= ${(() => {
      const numPortions = item.portionsPerPerson || 0;
      const totalPortionsNeeded = numPortions * state.guests;
      const totalDishesNeeded = Math.ceil(totalPortionsNeeded / (item.servings || 1));
      return `${totalPortionsNeeded.toFixed(1)} porções (≈ ${totalDishesNeeded} prato${totalDishesNeeded > 1 ? 's' : ''})`;
    })()}` :
    `= ${(() => {
      const numPortions = item.portionsPerPerson || 0;
      const gramsPerPerson = numPortions * 100;
      const totalGrams = gramsPerPerson * state.guests;
      return window.unitConversions?.formatWeight?.(totalGrams, 1) || `${totalGrams.toFixed(0)}g`;
    })()} total`;
  })()))),
  /*#__PURE__*/React.createElement("div", null),
  /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => handleRemoveDish(item.id),
    className: "px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
  }, "\uD83D\uDDD1\uFE0F Remover"))
)))) : /*#__PURE__*/React.createElement("div", {
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
    onClick: () => alert('🔒 Recurso disponível apenas no plano PREMIUM\n\nAtualize seu plano em: https://precificacao-vendas-production.up.railway.app'),
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
    event: state.event || { id: state.currentEventId, name: state.eventName || 'Evento', people: state.guests || 0 }
  }));
}

// Expor para window
window.MenuPage = MenuPage;
})();
