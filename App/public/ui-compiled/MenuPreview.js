(function() {
/**
 * ===================================================================
 * MENU PREVIEW - Visualização de Cardápio para Cliente
 * ===================================================================
 * Componente elegante para apresentar cardápio ao cliente
 */

// React hooks usados via React.useState, React.useEffect, etc.
function MenuPreview({
  menuId,
  isOpen,
  onClose
}) {
  const [menu, setMenu] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [companyLogo, setCompanyLogo] = React.useState(null);
  React.useEffect(() => {
    if (isOpen && menuId) {
      loadMenu();
      loadCompanyLogo();
    }
  }, [isOpen, menuId]);
  const loadMenu = async () => {
    try {
      setLoading(true);

      // Usar ManagerHelper para pegar os managers corretos (backend PostgreSQL > local)
      const savedMenusManager = window.ManagerHelper?.getSavedMenusManager() || window.PrecificacaoAPI?.savedMenusManager || window.savedMenusManager;
      const dishManager = window.ManagerHelper?.getDishManager() || window.PrecificacaoAPI?.dishManager || window.dishManager;
      if (!savedMenusManager) {
        console.error('❌ [MenuPreview] SavedMenusManager não encontrado');
        setLoading(false);
        return;
      }
      console.log('✅ [MenuPreview.loadMenu] Usando savedMenusManager:', savedMenusManager?.constructor?.name);

      // IMPORTANTE: await porque getMenuById/getById retorna Promise
      const menuData = await savedMenusManager.getById(menuId);
      console.log('🔍 [MenuPreview] menuData carregado:', menuData);
      if (menuData) {
        // Verificar se dishes existe e é um array
        if (!menuData.dishes || !Array.isArray(menuData.dishes)) {
          console.error('❌ menuData.dishes não é um array válido:', menuData.dishes);
          setMenu({
            ...menuData,
            dishes: []
          });
          setLoading(false);
          return;
        }

        // Buscar informações completas dos pratos (getById é async no BackendDishManager)
        const dishesWithDetails = await Promise.all(menuData.dishes.map(async dish => {
          try {
            // Tentar getById (async) primeiro, fallback para getDishById (sync)
            const fullDish = dishManager?.getById ? await dishManager.getById(dish.dishId) : dishManager?.getDishById?.(dish.dishId);
            return {
              ...dish,
              description: fullDish?.description || '',
              photos: fullDish?.photos || [],
              technicalSheet: fullDish?.technicalSheet || '',
              observations: fullDish?.observations || ''
            };
          } catch (error) {
            console.warn(`⚠️ Erro ao buscar prato ${dish.dishId}:`, error);
            return dish; // Retornar prato sem detalhes
          }
        }));
        setMenu({
          ...menuData,
          dishes: dishesWithDetails
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar cardápio:', error);
      setLoading(false);
    }
  };
  const loadCompanyLogo = () => {
    const logo = localStorage.getItem('company_logo');
    setCompanyLogo(logo);
  };

  // ✅ FIX: Calcular stats se não existir (mesma lógica do SavedMenusList.jsx linhas 74-96)
  const menuStats = React.useMemo(() => {
    if (!menu || !menu.dishes) return {
      totalDishes: 0,
      totalCost: 0,
      totalWeight: 0
    };

    // Se já tem stats calculados, usar
    if (menu.stats) return menu.stats;

    // Senão, calcular agora
    let totalCost = 0;
    let totalWeight = 0;
    let totalDishes = menu.dishes.length;
    menu.dishes.forEach(dish => {
      const dishCost = dish.dishCost || 0;
      const dishWeight = dish.totalWeight || 0;
      const portionsPerPerson = dish.portionsPerPerson || 1;
      const servings = dish.servings || 1;

      // Se o prato é por porção (tem servings > 0 e peso = 0)
      if (servings > 0 && dishWeight === 0) {
        const costPerPortion = dishCost / servings;
        totalCost += costPerPortion * portionsPerPerson;
      } else {
        // Por peso (comportamento padrão)
        const gramsPerPerson = portionsPerPerson * 100;
        const costPerGram = dishCost / (dishWeight || 1);
        totalCost += costPerGram * gramsPerPerson;
        totalWeight += gramsPerPerson;
      }
    });
    return {
      totalDishes,
      totalCost,
      totalWeight
    };
  }, [menu]);

  // Agrupar pratos por categoria
  const dishesByCategory = React.useMemo(() => {
    if (!menu || !menu.dishes) return {};
    const grouped = {};
    menu.dishes.forEach(dish => {
      const category = dish.dishCategory || 'Outros';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(dish);
    });
    return grouped;
  }, [menu]);
  const getCategoryIcon = category => {
    const icons = {
      'entrada': '🥗',
      'principal': '🍽️',
      'sobremesa': '🍰',
      'bebida': '🥤',
      'acompanhamento': '🍚',
      'outros': '🍴'
    };
    return icons[category.toLowerCase()] || '🍴';
  };
  const formatWeight = grams => {
    if (!grams || grams === 0) return '';
    if (grams >= 1000) {
      return `${(grams / 1000).toFixed(2)} kg`;
    }
    return `${grams.toFixed(0)} g`;
  };
  const handlePrint = () => {
    window.print();
  };
  if (!isOpen) return null;
  if (loading) {
    return /*#__PURE__*/React.createElement("div", {
      className: "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-8"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-gray-600"
    }, "Carregando card\xE1pio...")));
  }
  if (!menu) {
    return /*#__PURE__*/React.createElement("div", {
      className: "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-8"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-red-600"
    }, "Card\xE1pio n\xE3o encontrado"), /*#__PURE__*/React.createElement("button", {
      onClick: onClose,
      className: "mt-4 px-4 py-2 bg-gray-500 text-white rounded-lg"
    }, "Fechar")));
  }
  const eventTypeLabels = {
    'casamento': '💒 Casamento',
    'corporativo': '🏢 Evento Corporativo',
    'aniversario': '🎂 Aniversário',
    'formatura': '🎓 Formatura',
    'churrasco': '🥩 Churrasco',
    'festa': '🎉 Festa',
    'outro': '🍽️ Evento'
  };
  const eventTypeLabel = eventTypeLabels[menu.eventType] || eventTypeLabels['outro'];
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-50 overflow-y-auto bg-gray-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "print:hidden sticky top-0 z-10 bg-white shadow-md border-b border-gray-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-5xl mx-auto px-6 py-4 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-5 h-5",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M10 19l-7-7m0 0l7-7m-7 7h18"
  })), "Voltar"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handlePrint,
    className: "flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors font-medium shadow-md"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-5 h-5",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
  })), "\uD83D\uDDA8\uFE0F Imprimir")))), /*#__PURE__*/React.createElement("div", {
    className: "max-w-5xl mx-auto bg-white shadow-2xl my-8 print:my-0 print:shadow-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-8 print:p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-6"
  }, companyLogo && /*#__PURE__*/React.createElement("img", {
    src: companyLogo,
    alt: "Logo",
    className: "w-20 h-20 rounded-full object-cover bg-white shadow-lg print:w-16 print:h-16"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-4xl font-bold mb-2 print:text-3xl"
  }, menu.name), /*#__PURE__*/React.createElement("p", {
    className: "text-purple-100 text-lg print:text-base"
  }, eventTypeLabel), menu.description && /*#__PURE__*/React.createElement("p", {
    className: "text-purple-100 text-sm mt-2 max-w-2xl"
  }, menu.description))))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-4 p-6 bg-gray-50 border-b border-gray-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 mb-1"
  }, "Total de Pratos"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold text-purple-600 print:text-2xl"
  }, menuStats.totalDishes)), /*#__PURE__*/React.createElement("div", {
    className: "text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 mb-1"
  }, "Custo por Pessoa"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold text-green-600 print:text-2xl"
  }, "R$ ", menuStats.totalCost.toFixed(2))), /*#__PURE__*/React.createElement("div", {
    className: "text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 mb-1"
  }, "Peso Total"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold text-orange-600 print:text-2xl"
  }, formatWeight(menuStats.totalWeight) || '—'))), /*#__PURE__*/React.createElement("div", {
    className: "p-8 print:p-6"
  }, Object.keys(dishesByCategory).length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "text-center py-12 text-gray-400"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xl"
  }, "Nenhum prato neste card\xE1pio")) : Object.entries(dishesByCategory).map(([category, dishes], catIndex) => /*#__PURE__*/React.createElement("div", {
    key: catIndex,
    className: "mb-8 print:mb-6 print:break-inside-avoid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 mb-4 pb-2 border-b-2 border-purple-300"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-3xl"
  }, getCategoryIcon(category)), /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold text-gray-800 capitalize print:text-xl"
  }, category), /*#__PURE__*/React.createElement("span", {
    className: "ml-auto text-sm text-gray-500"
  }, dishes.length, " ", dishes.length === 1 ? 'prato' : 'pratos')), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, dishes.map((dish, dishIndex) => /*#__PURE__*/React.createElement("div", {
    key: dishIndex,
    className: "flex gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow print:break-inside-avoid print:hover:shadow-none"
  }, dish.photos && dish.photos.length > 0 && (() => {
    const photoData = dish.photos[0];
    // Extrair a string base64 (pode ser string direta ou objeto com propriedade data/src/url)
    const photoSrc = typeof photoData === 'string' ? photoData : photoData?.data || photoData?.src || photoData?.url || '';
    return photoSrc && /*#__PURE__*/React.createElement("div", {
      className: "flex-shrink-0"
    }, /*#__PURE__*/React.createElement("img", {
      src: photoSrc,
      alt: dish.dishName,
      className: "w-24 h-24 object-cover rounded-lg print:w-20 print:h-20"
    }));
  })(), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold text-gray-800 print:text-lg"
  }, dish.dishName), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-semibold text-purple-600 print:text-base"
  }, "R$ ", (() => {
    const dishCost = dish.dishCost || 0;
    const portionsPerPerson = dish.portionsPerPerson || 0;

    // NOVA REGRA: Se houver ingrediente por unidade, calcular por porções
    const isPortionBased = window.isDishPortionBased ? window.isDishPortionBased(dish) : dish.servings > 0 && dish.totalWeight === 0;
    if (isPortionBased) {
      // Custo por porção do prato
      const servings = dish.servings || 1;
      const costPerDishPortion = dishCost / servings;
      // Multiplicar pelas porções que cada pessoa consome
      const costPerPerson = costPerDishPortion * portionsPerPerson;
      return costPerPerson.toFixed(2);
    }

    // Se o prato é por peso, calcular por grama (comportamento original)
    const totalWeight = dish.totalWeight || 1;
    const gramsPerPerson = portionsPerPerson * 100;
    const costPerGram = dishCost / totalWeight;
    const costPerPortion = costPerGram * gramsPerPerson;
    return costPerPortion.toFixed(2);
  })()), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, dish.portionsPerPerson, "x por pessoa"))), dish.description && /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 text-sm mb-2 print:text-xs"
  }, dish.description), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-4 mt-3"
  }, dish.totalWeight > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 text-sm text-gray-600"
  }, /*#__PURE__*/React.createElement("span", null, "\u2696\uFE0F"), /*#__PURE__*/React.createElement("span", null, formatWeight(dish.totalWeight))), dish.dishIngredients && dish.dishIngredients.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 text-sm text-gray-600"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83E\uDD58"), /*#__PURE__*/React.createElement("span", null, dish.dishIngredients.length, " ingredientes"))), dish.technicalSheet && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400 print:bg-blue-50"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-semibold text-blue-800 mb-1"
  }, "\uD83D\uDCCB Ficha T\xE9cnica:"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-blue-700"
  }, dish.technicalSheet)), dish.observations && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 text-xs text-gray-500 italic"
  }, "\uD83D\uDCAC ", dish.observations)))))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 p-6 border-t border-gray-200 text-center print:p-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, "\uD83D\uDCC5 Card\xE1pio gerado em ", new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-2"
  }, "\uD83E\uDD16 Gerado com Precifica\xE7\xE3o - Sistema de Gest\xE3o de Eventos"))));
}

// Expor para window
window.MenuPreview = MenuPreview;
})();
