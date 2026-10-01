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
    } catch (error) {
      console.error('Erro ao carregar cardápio:', error);
    }
  };
  const handleUpdateGramsPerPerson = async (menuItemId, newGrams) => {
    try {
      const menuManager = window.menuManager;
      // Atualizar usando a mesma função, mas agora interpretando como gramas
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

      // Limpar itens atuais do evento
      state.setItems([]);

      // Adicionar ingredientes consolidados aos itens do evento
      ingredientsList.forEach(ing => {
        const isUnitType = ing.unitType === 'unit' || ing.unit === 'un';

        // Buscar ingrediente na base para pegar perda e outros dados
        let ingredientData = null;
        if (ing.ingredientId) {
          ingredientData = allIngredients.find(i => i.id === ing.ingredientId);
        }
        // Se não encontrou por ID, buscar por nome
        if (!ingredientData && ing.ingredientName) {
          ingredientData = allIngredients.find(i => (i.name || i.ingredientName)?.toLowerCase() === ing.ingredientName.toLowerCase());
        }
        console.log('🔍 [MenuPage] Buscando perda para:', {
          ingredientName: ing.ingredientName,
          ingredientId: ing.ingredientId,
          found: !!ingredientData,
          loss: ingredientData?.loss,
          totalIngredients: allIngredients.length
        });
        const newItem = {
          id: Date.now() + Math.random(),
          name: ing.ingredientName,
          // Nome do ingrediente
          ingredientId: ing.ingredientId,
          qtyPerPerson: ing.totalQuantity / guests,
          // Quantidade por pessoa (g ou un)
          unit: ing.unit,
          // Preservar unidade ('g' ou 'un')
          unitType: ing.unitType,
          // Preservar tipo ('weight' ou 'unit')
          loss: ingredientData?.loss || 0,
          // Perda do ingrediente
          active: true
        };
        console.log('📦 [MenuPage] Item criado com loss:', newItem.loss);
        state.setItems(prevItems => [...prevItems, newItem]);
      });
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

        // Se não tem peso, custo, servings ou ingredientes, buscar do prato original
        if ((totalWeight === 0 || dishCost === 0 || servings === 1 || dishIngredients.length === 0) && dishManager && item.dishId) {
          console.log(`🔍 Buscando dados do prato original: ${item.dishId}`);
          const originalDish = await dishManager.getById(item.dishId);
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
            if (dishIngredients.length === 0 && originalDish.ingredients && originalDish.ingredients.length > 0) {
              dishIngredients = originalDish.ingredients;
              console.log(`✅ Ingredientes recuperados: ${dishIngredients.length} itens`);
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
            loss: fullIngredient?.loss || 0,
            unit_cost: fullIngredient?.unit_cost || fullIngredient?.unitCost || 0
          };
          console.log(`  📦 Ingrediente "${ingredientSnapshot.name}":`, {
            found: !!fullIngredient,
            category: ingredientSnapshot.category,
            costPerUnit: ingredientSnapshot.costPerUnit,
            loss: ingredientSnapshot.loss
          });
          enrichedIngredients.push(ingredientSnapshot);
        }
        const dishData = {
          dishId: item.dishId,
          dishName: item.dishName,
          dishCategory: item.dishCategory,
          dishCost: dishCost,
          dishIngredients: enrichedIngredients,
          // ✅ USAR ingredientes enriquecidos
          servings: servings,
          // IMPORTANTE: salvar servings para cálculo correto
          portionsPerPerson: item.portionsPerPerson || 1,
          totalWeight: totalWeight
        };
        console.log(`✅ Prato FINAL para salvar "${item.dishName}":`, {
          dishId: dishData.dishId,
          dishCost: dishData.dishCost,
          totalWeight: dishData.totalWeight,
          servings: dishData.servings,
          ingredientsCount: dishData.dishIngredients.length,
          firstIngredient: dishData.dishIngredients[0]
        });
        menuData.dishes.push(dishData);
      }
      console.log('💾 [MenuPage] Dados COMPLETOS sendo enviados para savedMenusManager.saveItem():', menuData);
      const result = await savedMenusManager.saveItem(menuData);
      if (result && result.success) {
        alert(`✅ Cardápio "${formData.name}" salvo com sucesso!\n\nVocê pode carregá-lo em "Cardápios Salvos".`);
        setShowSaveModal(false);
      } else {
        const errorMsg = result?.message || 'Erro desconhecido ao salvar cardápio';
        alert(`❌ ${errorMsg}`);
      }
    } catch (error) {
      console.error('Erro ao salvar cardápio:', error);
      alert(`❌ Erro ao salvar cardápio: ${error.message || 'Erro desconhecido'}`);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "menu-page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg p-6 mb-6 shadow-lg"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold mb-4"
  }, "\uD83C\uDF7D\uFE0F Card\xE1pio do Evento"), stats && /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-purple-100 text-sm"
  }, "Pratos no Card\xE1pio"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold"
  }, stats.totalDishes)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-purple-100 text-sm"
  }, "Convidados"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold"
  }, state.guests || 0)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-purple-100 text-sm"
  }, "Custo/Pessoa"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold"
  }, "R$ ", stats.totalCost.toFixed(2))))), menu.length === 0 && /*#__PURE__*/React.createElement("div", {
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
    className: "flex items-start justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold text-gray-800 mb-1"
  }, item.dishName), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 mb-3"
  }, item.dishCategory), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-4 mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, (() => {
    const isPortionBased = window.isDishPortionBased ? window.isDishPortionBased(item) : false;
    return isPortionBased ? 'Serve Porções' : 'Peso Total do Prato';
  })()), /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-blue-600"
  }, (() => {
    const isPortionBased = window.isDishPortionBased ? window.isDishPortionBased(item) : false;
    return isPortionBased ? `${item.servings || 0} porções` : window.unitConversions?.formatWeight?.(item.totalWeight) || `${item.totalWeight.toFixed(0)}g`;
  })())), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, (() => {
    const isPortionBased = window.isDishPortionBased ? window.isDishPortionBased(item) : false;
    return isPortionBased ? 'Custo por pessoa' : 'Custo por porção (100g)';
  })()), /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-gray-800"
  }, "R$ ", (() => {
    const dishCost = item.dishCost || 0;
    const numPortions = item.portionsPerPerson || 0;
    console.log(`🧮 [MenuPage] Calculando custo para "${item.dishName}"`);
    console.log(`   dishCost: R$ ${dishCost}`);
    console.log(`   servings: ${item.servings}`);
    console.log(`   totalWeight: ${item.totalWeight}g`);
    console.log(`   portionsPerPerson: ${numPortions}`);

    // NOVA REGRA: Se houver ingrediente por unidade, calcular por porções
    const isPortionBased = window.isDishPortionBased ? window.isDishPortionBased(item) : item.servings > 0 && item.totalWeight === 0;
    if (isPortionBased) {
      // Custo por porção do prato
      const servings = item.servings || 1;
      const costPerDishPortion = dishCost / servings;
      console.log(`   ➡️ Prato POR PORÇÃO: R$ ${dishCost} ÷ ${servings} = R$ ${costPerDishPortion}/porção`);

      // Multiplicar pelas porções que cada pessoa consome
      const costPerPerson = costPerDishPortion * numPortions;
      console.log(`   ➡️ Custo por pessoa: R$ ${costPerDishPortion} × ${numPortions} = R$ ${costPerPerson}`);
      return costPerPerson.toFixed(2);
    }

    // Se o prato é por peso, calcular por grama (comportamento original)
    const totalWeight = item.totalWeight || 1;
    const gramsPerPerson = numPortions * 100; // 1 porção = 100g fixo
    const costPerGram = dishCost / totalWeight;
    const costPerPortion = costPerGram * gramsPerPerson;
    console.log(`   ➡️ Prato POR PESO: R$ ${dishCost} ÷ ${totalWeight}g = R$ ${costPerGram}/g`);
    console.log(`   ➡️ Custo por porção: R$ ${costPerGram}/g × ${gramsPerPerson}g = R$ ${costPerPortion}`);
    return costPerPortion.toFixed(2);
  })())), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "Total para ", state.guests, " pessoas"), /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-purple-600"
  }, "R$ ", (() => {
    const dishCost = item.dishCost || 0;
    const numPortions = item.portionsPerPerson || 0;

    // Se o prato tem servings definido (não é por peso), calcular por porção do prato
    if (item.servings > 0 && item.totalWeight === 0) {
      // Custo por porção do prato
      const costPerDishPortion = dishCost / item.servings;
      // Multiplicar pelas porções que cada pessoa consome
      const costPerPerson = costPerDishPortion * numPortions;
      // Total para todos os convidados
      const totalCost = costPerPerson * state.guests;
      return totalCost.toFixed(2);
    }

    // Se o prato é por peso, calcular por grama (comportamento original)
    const totalWeight = item.totalWeight || 1;
    const gramsPerPerson = numPortions * 100; // 1 porção = 100g fixo
    const costPerGram = dishCost / totalWeight;
    const costPerPortion = costPerGram * gramsPerPerson;
    const totalCost = costPerPortion * state.guests;
    return totalCost.toFixed(2);
  })()))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-sm font-medium text-gray-700"
  }, (() => {
    const isPortionBased = window.isDishPortionBased ? window.isDishPortionBased(item) : false;
    return isPortionBased ? 'Porções do prato por pessoa:' : 'Porções por pessoa (1 porção = 100g):';
  })()), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: item.portionsPerPerson === 0 ? '' : item.portionsPerPerson,
    onChange: e => handleUpdateGramsPerPerson(item.id, e.target.value),
    step: "0.25",
    min: "0.25",
    max: "10",
    className: "w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent",
    placeholder: "1"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-gray-600"
  }, (() => {
    const isPortionBased = window.isDishPortionBased ? window.isDishPortionBased(item) : false;
    return isPortionBased ?
    // Para pratos por porção: mostrar total de porções necessárias
    `= ${(() => {
      const numPortions = item.portionsPerPerson || 0;
      const totalPortionsNeeded = numPortions * state.guests;
      const totalDishesNeeded = Math.ceil(totalPortionsNeeded / (item.servings || 1));
      return `${totalPortionsNeeded.toFixed(1)} porções (≈ ${totalDishesNeeded} prato${totalDishesNeeded > 1 ? 's' : ''})`;
    })()}` :
    // Para pratos por peso: mostrar total em gramas
    `= ${(() => {
      const numPortions = item.portionsPerPerson || 0;
      const gramsPerPerson = numPortions * 100;
      const totalGrams = gramsPerPerson * state.guests;
      return window.unitConversions?.formatWeight?.(totalGrams, 1) || `${totalGrams.toFixed(0)}g`;
    })()} total`;
  })()))), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleRemoveDish(item.id),
    className: "ml-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
  }, "\uD83D\uDDD1\uFE0F Remover"))))) : /*#__PURE__*/React.createElement("div", {
    className: "text-center py-12 text-gray-400"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-6xl mb-4"
  }, "\uD83C\uDF7D\uFE0F"), /*#__PURE__*/React.createElement("p", {
    className: "text-lg"
  }, "Nenhum prato no card\xE1pio ainda"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm"
  }, "Adicione pratos da aba \"Pratos\"")), menu.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "sticky bottom-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col sm:flex-row items-center justify-between gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleSaveCurrentMenu,
    className: "px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md",
    title: "Salvar este card\xE1pio como template reutiliz\xE1vel"
  }, "\uD83D\uDCBE Salvar Card\xE1pio"), /*#__PURE__*/React.createElement("button", {
    onClick: handleClearMenu,
    className: "px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
  }, "\uD83D\uDDD1\uFE0F Limpar")), /*#__PURE__*/React.createElement("button", {
    onClick: handleGenerateShoppingList,
    className: "px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors font-bold text-lg shadow-lg"
  }, "\uD83D\uDCCB Gerar Lista de Compras (", state.guests, " pessoas)"))), window.SaveMenuModal && /*#__PURE__*/React.createElement(window.SaveMenuModal, {
    isOpen: showSaveModal,
    onClose: () => setShowSaveModal(false),
    onSave: handleSaveMenuSubmit,
    menuItems: menu
  }));
}

// Expor para window
window.MenuPage = MenuPage;
})();
