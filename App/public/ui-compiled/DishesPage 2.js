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
 */
function DishesPage() {
  const [currentView, setCurrentView] = React.useState('list'); // list, form
  const [editingDish, setEditingDish] = React.useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

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
  const handleEditDish = dish => {
    setEditingDish(dish);
    setCurrentView('form');
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
  const handleUpgradeClick = (featureName, currentPlan) => {
    console.log('Upgrade solicitado:', featureName, currentPlan);
    setShowUpgradeModal(true);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "dishes-page container mx-auto px-4 py-6"
  }, /*#__PURE__*/React.createElement(FeatureGate, {
    featureName: "dishes",
    requiredPlan: "premium",
    fallbackUI: "overlay",
    onUpgradeClick: handleUpgradeClick
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-6"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-3xl font-bold text-gray-800"
  }, "\uD83C\uDF7D\uFE0F Gerenciar Pratos"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 mt-1"
  }, "Crie e gerencie pratos reutiliz\xE1veis para suas propostas")), currentView === 'list' && /*#__PURE__*/React.createElement("button", {
    onClick: handleNewDish,
    className: "px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-lg"
  }, "\u2795 Novo Prato")), currentView === 'list' ? /*#__PURE__*/React.createElement(DishList, {
    key: refreshKey,
    onEdit: handleEditDish,
    selectMode: false,
    dishesInUse: dishesInUse
  }) : /*#__PURE__*/React.createElement(DishForm, {
    dish: editingDish,
    onSave: handleSaveDish,
    onCancel: handleCancel
  })), showUpgradeModal && /*#__PURE__*/React.createElement(UpgradeModal, {
    isOpen: showUpgradeModal,
    onClose: () => setShowUpgradeModal(false),
    currentPlan: window.ConfigHelper?.getCurrentPlan() || 'offline',
    highlightPlan: "premium",
    reason: "Cadastro de pratos reutiliz\xE1veis"
  }));
}

// export default DishesPage;

// Expor para window (browser global)
window.DishesPage = DishesPage;
})();
