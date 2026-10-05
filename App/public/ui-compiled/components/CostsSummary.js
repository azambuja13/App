(function() {
/**
 * CostsSummary - Resumo financeiro completo do evento
 */

// Usar React e componentes do window global
const {
  useState
} = React;
const {
  Icon
} = window;
const {
  formatCurrency
} = window;

/**
 * @param {Object} props
 * @param {Object} props.categoryStats - Estatísticas por categoria { category: { total, items, active } }
 * @param {number} props.supportCost - Custo total de apoio e logística
 * @param {number} props.laborCost - Custo de mão de obra
 * @param {number} props.transportCost - Custo de transporte (opcional)
 * @param {number} props.subtotal - Subtotal antes de inflação
 * @param {number} props.totalCost - Custo total com inflação
 * @param {number} props.pricePerPerson - Preço por pessoa
 * @param {number} props.guests - Número de convidados
 * @param {number} props.menuPriceWithMargin - Total do cardápio COM margem (opcional)
 * @param {number} props.menuCostWithoutMargin - Total do cardápio SEM margem (opcional)
 * @returns {JSX.Element}
 */
const CostsSummary = React.memo(function CostsSummary({
  categoryStats = {},
  supportCost = 0,
  laborCost = 0,
  transportCost = 0,
  subtotal = 0,
  subtotalWithMargin = 0,
  totalCost = 0,
  pricePerPerson = 0,
  guests = 0,
  // ✅ Novos props para exibir os 3 totais separados
  ingredientsCost = 0,  // Custo dos ITENS DO EVENTO (custo real)
  menuCostTotal = 0,  // Custo do CARDÁPIO sem margem × convidados
  menuPriceTotal = 0,  // Preço do CARDÁPIO com margem × convidados
  menuPriceWithMargin = 0,
  menuCostWithoutMargin = 0,
  totalWithMargin = 0,
  menuMarginAmount = 0,  // ✅ Agora vem calculado do useCalculations
  hasActiveMenu = false,  // ✅ Flag para saber se tem cardápio
  additionalMarkupPercent = 0,
  additionalMarkupAmount = 0
}) {
  // ✅ Verificar se tem margem do cardápio
  const hasMargin = menuMarginAmount > 0;
  const pricePerPersonWithMargin = guests > 0 ? totalWithMargin / guests : 0;
  const marginPercentage = menuCostTotal > 0 ? (menuMarginAmount / menuCostTotal) * 100 : 0;

  // ✅ Calcular custos de apoio
  const apoioCost = supportCost + laborCost + transportCost;

  // ✅ Totais com apoio incluído
  const totalItensComApoio = ingredientsCost + apoioCost;  // Total Geral (baseado em itens)
  const totalPratosComApoio = menuCostTotal + apoioCost;   // Total Pratos + Apoio
  const totalMargemComApoio = menuPriceTotal + apoioCost;  // Total com Margem + Apoio

  // ✅ Por pessoa com os totais corretos
  const porPessoaItens = guests > 0 ? totalItensComApoio / guests : 0;
  const porPessoaPratos = guests > 0 ? totalPratosComApoio / guests : 0;
  const porPessoaMargem = guests > 0 ? totalMargemComApoio / guests : 0;

  // ✅ Verificar se tem margem adicional (markup da proposta)
  const hasAdditionalMarkup = additionalMarkupPercent > 0 && additionalMarkupAmount > 0;

  console.log('📊 [CostsSummary] Valores recebidos:', {
    ingredientsCost,
    menuCostTotal,
    menuPriceTotal,
    menuMarginAmount,
    hasActiveMenu,
    guests,
    subtotal,
    subtotalWithMargin,
    totalCost,
    totalWithMargin
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "p-6 bg-gradient-to-br from-gray-50 to-orange-50"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "trending",
    className: "w-5 h-5"
  }), "Resumo Financeiro"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, Object.entries(categoryStats).filter(([category, stats]) => category && category !== 'undefined' && stats.total > 0).map(([category, stats]) => /*#__PURE__*/React.createElement("div", {
    key: category,
    className: "flex justify-between items-center text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, category, " (", stats.active, "/", stats.items, ")"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-gray-800"
  }, formatCurrency(stats.total)))), supportCost > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center text-sm border-t pt-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "Apoio & Log\xEDstica"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-gray-800"
  }, formatCurrency(supportCost))), /*#__PURE__*/React.createElement("div", {
    className: `flex justify-between items-center text-sm ${supportCost === 0 ? 'border-t pt-2' : ''}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "\uD83D\uDC77 M\xE3o de Obra"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-gray-800"
  }, formatCurrency(laborCost))), transportCost > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "\uD83D\uDE97 Transporte"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-gray-800"
  }, formatCurrency(transportCost)))), /*#__PURE__*/React.createElement("div", {
    className: "border-t-2 border-gray-300 pt-4 space-y-2"
  },
  /* ✅ Total dos Itens do Evento (custo real) */
  /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-700 font-medium"
  }, "Total Itens:"), /*#__PURE__*/React.createElement("span", {
    className: "text-xl font-bold text-gray-800"
  }, formatCurrency(ingredientsCost))),
  /* ✅ Total do Cardápio (sem margem) - só mostra se tiver cardápio */
  hasActiveMenu && /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-blue-700 font-medium"
  }, "Total Pratos:"), /*#__PURE__*/React.createElement("span", {
    className: "text-xl font-bold text-blue-700"
  }, formatCurrency(menuCostTotal))),
  /* ✅ Total do Cardápio (com margem) - só mostra se tiver margem */
  hasActiveMenu && hasMargin && /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-green-700 font-medium"
  }, "Total Pratos + Margem:"), /*#__PURE__*/React.createElement("span", {
    className: "text-xl font-bold text-green-700"
  }, formatCurrency(menuPriceTotal), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-green-600 ml-2"
  }, "(+", marginPercentage.toFixed(0), "%)"))),
  hasAdditionalMarkup && /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center bg-blue-50 rounded-lg p-3 border border-blue-200 mt-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-blue-800 font-medium"
  }, "+ Margem Adicional (", additionalMarkupPercent, "%)"), /*#__PURE__*/React.createElement("span", {
    className: "text-lg font-bold text-blue-600"
  }, formatCurrency(additionalMarkupAmount)))), /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-br from-orange-600 to-red-600 rounded-xl p-6 text-white shadow-lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center space-y-4"
  },
  /* TOTAL GERAL (Itens + Apoio) */
  /*#__PURE__*/React.createElement("div", null,
    /*#__PURE__*/React.createElement("p", {
      className: "text-orange-100 text-sm font-medium mb-1"
    }, "TOTAL GERAL (Itens + Apoio)"),
    /*#__PURE__*/React.createElement("p", {
      className: "text-3xl font-bold"
    }, formatCurrency(totalItensComApoio)),
    /*#__PURE__*/React.createElement("p", {
      className: "text-orange-200 text-xs"
    }, formatCurrency(porPessoaItens), "/pessoa")
  ),
  /* TOTAL PRATOS (Pratos + Apoio) - só mostra se tiver cardápio */
  hasActiveMenu && /*#__PURE__*/React.createElement("div", {
    className: "border-t border-white border-opacity-30 pt-3"
  },
    /*#__PURE__*/React.createElement("p", {
      className: "text-blue-200 text-sm font-medium mb-1"
    }, "TOTAL PRATOS (Card\xE1pio + Apoio)"),
    /*#__PURE__*/React.createElement("p", {
      className: "text-3xl font-bold text-blue-200"
    }, formatCurrency(totalPratosComApoio)),
    /*#__PURE__*/React.createElement("p", {
      className: "text-orange-200 text-xs"
    }, formatCurrency(porPessoaPratos), "/pessoa")
  ),
  /* TOTAL COM MARGEM (Pratos + Margem + Apoio) - só mostra se tiver margem */
  hasActiveMenu && hasMargin && /*#__PURE__*/React.createElement("div", {
    className: "border-t border-white border-opacity-30 pt-3"
  },
    /*#__PURE__*/React.createElement("p", {
      className: "text-green-200 text-sm font-medium mb-1"
    }, "TOTAL COM MARGEM (+", marginPercentage.toFixed(0), "%)"),
    /*#__PURE__*/React.createElement("p", {
      className: "text-4xl font-bold text-green-300"
    }, formatCurrency(totalMargemComApoio)),
    /*#__PURE__*/React.createElement("p", {
      className: "text-orange-200 text-xs"
    }, formatCurrency(porPessoaMargem), "/pessoa"),
    /*#__PURE__*/React.createElement("p", {
      className: "text-green-200 text-xs mt-1"
    }, "Margem: +", formatCurrency(menuMarginAmount))
  ),
  /* Rodapé com convidados */
  /*#__PURE__*/React.createElement("div", {
    className: "border-t-2 border-white border-opacity-30 pt-3 mt-2"
  },
    /*#__PURE__*/React.createElement("p", {
      className: "text-orange-200 text-sm"
    }, "para ", guests, " convidados")
  )))));
});

// Expor ao window para uso com Babel
window.CostsSummary = CostsSummary;
})();
