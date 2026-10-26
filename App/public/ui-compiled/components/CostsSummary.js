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
  additionalMarkupAmount = 0,
  monthsUntilEvent = 0,  // meses até o evento (correção de comida e apoio)
  inflationMultiplier = 1,
  inflationMonthlyPct = 1,
  proteinSafetyPct = 0,   // margem de segurança das proteínas (%)
  proteinSafetyCost = 0   // quanto ela somou na comida (já incluído nos totais)
}) {
  // ✅ Verificar se tem margem do cardápio
  const hasMargin = menuMarginAmount > 0;
  const pricePerPersonWithMargin = guests > 0 ? totalWithMargin / guests : 0;
  const marginPercentage = menuCostTotal > 0 ? (menuMarginAmount / menuCostTotal) * 100 : 0;

  // ✅ Calcular custos de apoio
  const apoioCost = supportCost + laborCost + transportCost;

  // ✅ Totais com apoio incluído + correção até o evento (mesma regra da proposta:
  //    comida e apoio corrigidos pela taxa mensal; mão de obra e transporte não)
  const mult = inflationMultiplier > 1 ? inflationMultiplier : 1;
  // Markup de serviços (Custos da empresa) entra como na proposta: só no modo markup
  const regras = window.PricingRules ? window.PricingRules.get() : null;
  const serviceMarkupPct = regras && regras.defaultPricingMode !== 'divisor' ? (Number(regras.serviceMarkupPct) || 0) : 0;
  // Arredondado para cima em reais, como o total da proposta
  const comCorrecao = comida => window.PricingRules && window.PricingRules.eventTotal
    ? window.PricingRules.eventTotal(comida, supportCost, laborCost, transportCost, mult, regras)
    : Math.ceil(((comida + supportCost) * mult + laborCost + transportCost) - 1e-9);
  const totalItensComApoio = comCorrecao(ingredientsCost);  // Total Geral (baseado em itens)
  const totalPratosComApoio = comCorrecao(menuCostTotal);   // Total Pratos + Apoio
  const totalMargemComApoio = comCorrecao(menuPriceTotal);  // Total com Margem + Apoio
  const baseCorrecao = hasActiveMenu && menuMarginAmount > 0 ? menuPriceTotal : hasActiveMenu ? menuCostTotal : ingredientsCost;
  const valorCorrecao = (baseCorrecao + supportCost * (1 + serviceMarkupPct / 100)) * (mult - 1);

  // ✅ Por pessoa como no PDF da proposta (centavos arredondados)
  const pp = t => window.PricingRules && window.PricingRules.perPerson ? window.PricingRules.perPerson(t, guests) : (guests > 0 ? Math.round(t * 100 / guests) / 100 : 0);
  const porPessoaItens = pp(totalItensComApoio);
  const porPessoaPratos = pp(totalPratosComApoio);
  const porPessoaMargem = pp(totalMargemComApoio);

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
  }, formatCurrency(transportCost))), proteinSafetyCost > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center text-sm",
    title: "Prote\xEDnas compradas a mais para n\xE3o faltar carne. J\xE1 est\xE1 inclu\xEDdo no custo da comida e nos totais."
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "\uD83E\uDD69 Margem de seguran\xE7a das prote\xEDnas (+", String(Math.round(proteinSafetyPct * 100) / 100).replace('.', ','), "%, j\xE1 inclu\xEDda)"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-gray-800"
  }, formatCurrency(proteinSafetyCost))), mult > 1 && /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center text-sm",
    title: "Comida e apoio corrigidos até a data do evento (mesma regra da proposta)"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "📈 Correção até o evento (", monthsUntilEvent, " ", monthsUntilEvent === 1 ? 'mês' : 'meses', " × ", String(inflationMonthlyPct).replace('.', ','), "%)"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-gray-800"
  }, "+", formatCurrency(valorCorrecao)))), /*#__PURE__*/React.createElement("div", {
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
    }, "para ", guests, " convidados"),
    mult > 1 && /*#__PURE__*/React.createElement("p", {
      className: "text-orange-200 text-xs mt-1"
    }, "inclui correção de ", monthsUntilEvent, " ", monthsUntilEvent === 1 ? 'mês' : 'meses', " em comida e apoio"),
    serviceMarkupPct > 0 && /*#__PURE__*/React.createElement("p", {
      className: "text-orange-200 text-xs mt-1"
    }, "inclui markup de serviços de ", String(serviceMarkupPct).replace('.', ','), "% (apoio, mão de obra e transporte)")
  )))));
});

// Expor ao window para uso com Babel
window.CostsSummary = CostsSummary;
})();
