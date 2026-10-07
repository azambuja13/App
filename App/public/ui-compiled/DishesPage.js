(function() {
/**
 * ===================================================================
 * DISHES PAGE - Página Principal de Pratos
 * ===================================================================
 * Página completa para gerenciar pratos com FeatureGate
 */

// React hooks usados via React.useState, React.useEffect, etc.
/**
 * Componente DishesPage
 * Página principal com FeatureGate integrado
 * ⚡ Performance: Memoizado para evitar re-renders desnecessários
 */
const DishesPage = React.memo(function DishesPage() {
  // Referências aos componentes globais (acessados quando a função executa)
  const DishForm = window.DishForm;
  const DishList = window.DishList;
  const FeatureGate = window.FeatureGate;
  const UpgradeModal = window.UpgradeModal;
  const RecipeImporter = window.RecipeImporter;
  const [currentView, setCurrentView] = React.useState('list'); // list, form
  const [editingDish, setEditingDish] = React.useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
  const [showRecipeImporter, setShowRecipeImporter] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [isRecalculating, setIsRecalculating] = React.useState(false);

  // Hook de plano - atualiza quando plano muda (escuta evento 'plan-changed')
  const { isPremium } = window.usePlan ? window.usePlan() : { isPremium: true };

  // Pratos em Uso no Cardápio
  const [dishesInUse, setDishesInUse] = React.useState(new Set());
  React.useEffect(() => {
    const loadDishesInUse = async () => {
      try {
        const menuManager = window.menuManager;
        if (!menuManager) {
          setDishesInUse(new Set());
          return;
        }
        const menu = await menuManager.getMenu();
        setDishesInUse(new Set(menu.map(item => item.dishId)));
      } catch (error) {
        console.error('Erro ao carregar pratos em uso:', error);
        setDishesInUse(new Set());
      }
    };
    loadDishesInUse();

    // Escutar evento de menu atualizado (em tempo real)
    const handleMenuUpdated = event => {
      console.log('🔄 Menu atualizado:', event.detail);
      loadDishesInUse(); // Recarregar dishesInUse imediatamente
    };
    window.addEventListener('menu-updated', handleMenuUpdated);
    return () => {
      window.removeEventListener('menu-updated', handleMenuUpdated);
    };
  }, [refreshKey]); // Recalcular quando refreshKey mudar

  const handleNewDish = () => {
    setEditingDish(null);
    setCurrentView('form');
  };
  const handleEditDish = async dish => {
    // ✅ Buscar prato completo do backend (com ingredientes) em vez de usar cache
    try {
      const result = await window.PrecificacaoAPI.api.getDish(dish.id);
      const fullDish = result.data || result;
      setEditingDish(fullDish);
      setCurrentView('form');
    } catch (error) {
      console.error('❌ Erro ao carregar prato para edição:', error);
      alert('Erro ao carregar prato. Tente novamente.');
    }
  };
  const handleSaveDish = dish => {
    console.log('Prato salvo:', dish);
    setCurrentView('list');
    setEditingDish(null);
    // Forçar reload da lista
    setRefreshKey(prev => prev + 1);
  };
  const handleCancel = () => {
    setCurrentView('list');
    setEditingDish(null);
  };
  const handleRecalculateCosts = async () => {
    if (isRecalculating) return;
    const confirmed = confirm(
      'Deseja atualizar os valores dos ingredientes?\n\n' +
      'Isso irá:\n' +
      '• Atualizar o custo de cada ingrediente nos pratos com os preços atuais da tabela\n' +
      '• Recalcular o custo total e o preço sugerido de todos os pratos\n' +
      '• Atualizar todos os cardápios salvos com os novos valores\n\n' +
      'Esta ação não pode ser desfeita.'
    );
    if (!confirmed) return;
    setIsRecalculating(true);
    try {
      const dishManager = window.PrecificacaoAPI?.dishManager;
      if (!dishManager) {
        throw new Error('DishManager não disponível');
      }
      const result = await dishManager.recalculateCosts();
      if (result.success) {
        const data = result.data;
        alert(
          'Custos recalculados com sucesso!\n\n' +
          'Pratos atualizados: ' + data.dishesUpdated + ' de ' + data.totalDishes + '\n' +
          'Ingredientes recalculados: ' + data.ingredientsUpdated + '\n' +
          'Cardápios atualizados: ' + (data.menusUpdated || 0) +
          (data.errors && data.errors.length > 0 ? '\n\nErros: ' + data.errors.length : '')
        );
        // Atualizar cardapio ativo no frontend (IndexedDB)
        if (window.menuManager) {
          try {
            const menu = await window.menuManager.getMenu();
            if (menu.length > 0) {
              let menuChanged = false;
              for (let i = 0; i < menu.length; i++) {
                const item = menu[i];
                if (!item.dishId) continue;
                try {
                  const dishResult = await window.PrecificacaoAPI.api.getDish(item.dishId);
                  const freshDish = dishResult.data || dishResult;
                  if (!freshDish) continue;
                  const newCost = freshDish.totalCost || 0;
                  const newWeight = freshDish.totalWeight || 0;
                  const newServings = freshDish.servings || 1;
                  const newMargin = freshDish.profitMargin || 0;
                  const portions = item.portionsPerPerson || 1;
                  let costPP = 0;
                  const isPortionBased = freshDish.useWeightCalculation || (newServings > 0 && newWeight === 0);
                  if (isPortionBased) {
                    costPP = newServings > 0 ? (newCost / newServings) * portions : newCost;
                  } else if (newWeight > 0) {
                    costPP = (newCost / newWeight) * (portions * 100);
                  } else {
                    costPP = newCost;
                  }
                  let pricePP = costPP;
                  if (newMargin > 0) pricePP = costPP * (1 + newMargin / 100);
                  menu[i] = { ...item, dishCost: newCost, totalWeight: newWeight, servings: newServings, dishServings: newServings, profitMargin: newMargin, suggestedPrice: freshDish.suggestedPrice || 0, dishCostPerPerson: costPP, dishPricePerPerson: pricePP, updatedAt: new Date().toISOString() };
                  menuChanged = true;
                } catch (e) { /* prato pode ter sido deletado */ }
              }
              if (menuChanged) {
                await window.menuManager.storage.set(window.menuManager.storageKey, menu);
                console.log('✅ Cardápio ativo atualizado com novos custos');
              }
            }
          } catch (e) {
            console.warn('Erro ao atualizar cardápio ativo:', e);
          }
        }
        // Disparar evento para recalcular custos do evento
        window.dispatchEvent(new CustomEvent('menu-updated', { detail: { source: 'recalculate-costs' } }));
        setRefreshKey(prev => prev + 1);
      } else {
        alert('Erro ao recalcular custos: ' + (result.message || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao recalcular custos:', error);
      alert('Erro ao recalcular custos. Tente novamente.');
    } finally {
      setIsRecalculating(false);
    }
  };
  const handleUpgradeClick = (featureName, currentPlan) => {
    console.log('Upgrade solicitado:', featureName, currentPlan);
    setShowUpgradeModal(true);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "dishes-page container mx-auto px-4 py-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-6"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-3xl font-bold text-gray-800"
  }, "\uD83C\uDF7D\uFE0F Gerenciar Pratos"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 mt-1"
  }, "Crie e gerencie pratos reutiliz\xE1veis para suas propostas")), currentView === 'list' && /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleRecalculateCosts,
    disabled: isRecalculating,
    className: isRecalculating
      ? "px-4 py-3 bg-gray-400 text-white rounded-lg font-semibold cursor-not-allowed"
      : "px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold shadow-lg",
    title: "Atualiza os preços dos ingredientes em todos os pratos e cardápios salvos com os valores atuais da tabela de ingredientes"
  }, isRecalculating ? "\u23F3 Atualizando..." : "\uD83D\uDD04 Atualizar Ingredientes"), isPremium ? /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowRecipeImporter(true),
    className: "px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
  }, "\uD83E\uDD16 Importar Receita com IA") : /*#__PURE__*/React.createElement("button", {
    onClick: () => alert('🔒 Recurso disponível apenas no plano PREMIUM\n\nAtualize seu plano em: https://precificacao-vendas-production.up.railway.app'),
    className: "px-6 py-3 bg-gray-400 text-white rounded-lg font-semibold opacity-60 cursor-not-allowed",
    title: "🔒 Recurso Premium - Disponível apenas no plano PREMIUM"
  }, "\uD83E\uDD16 Importar Receita com IA \uD83D\uDD12"), /*#__PURE__*/React.createElement("button", {
    onClick: handleNewDish,
    className: "px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-lg"
  }, "\u2795 Novo Prato"))), currentView === 'list' ? /*#__PURE__*/React.createElement(DishList, {
    key: refreshKey,
    onEdit: handleEditDish,
    selectMode: false,
    dishesInUse: dishesInUse
  }) : /*#__PURE__*/React.createElement(DishForm, {
    dish: editingDish,
    onSave: handleSaveDish,
    onCancel: handleCancel
  }), RecipeImporter && /*#__PURE__*/React.createElement(RecipeImporter, {
    isOpen: showRecipeImporter,
    onClose: () => setShowRecipeImporter(false),
    onSuccess: async (dish) => {
      console.log('Prato criado via IA:', dish);
      setShowRecipeImporter(false);

      // Invalidar TODOS os caches do dishManager para forçar reload
      if (window.PrecificacaoAPI?.dishManager) {
        window.PrecificacaoAPI.dishManager.cacheTime = null; // Invalidar cache de tempo
        window.PrecificacaoAPI.dishManager.dishes = []; // Limpar array de pratos
        console.log('🗑️ [DishesPage] Cache do dishManager invalidado completamente');
      }

      setRefreshKey(prev => prev + 1); // Forçar reload da lista
    }
  }), showUpgradeModal && /*#__PURE__*/React.createElement(UpgradeModal, {
    isOpen: showUpgradeModal,
    onClose: () => setShowUpgradeModal(false),
    currentPlan: window.ConfigHelper?.getCurrentPlan() || 'offline',
    highlightPlan: "premium",
    reason: "Cadastro de pratos reutiliz\xE1veis"
  }));
});

// export default DishesPage;

// Expor para window (browser global)
window.DishesPage = DishesPage;
})();
