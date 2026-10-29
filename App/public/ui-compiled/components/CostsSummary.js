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
  proteinSafetyCost = 0,  // quanto ela somou na comida (já incluído nos totais)
  prepFee = 0,            // insumos do cliente: taxa de preparo (entra no preço)
  clientSupplyOn = false, // insumos do cliente: há algo que o cliente compra/traz
  clientSupplyCost = 0    // insumos do cliente: custo que saiu do evento (informativo)
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
    ? window.PricingRules.eventTotal(comida, supportCost, laborCost, transportCost, mult, regras, prepFee)
    : Math.ceil(((comida + supportCost) * mult + laborCost + transportCost + prepFee) - 1e-9);
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

  // ✅ Margens do evento (bruta, operacional e líquida) sobre o preço de venda, com a mesma conta da proposta
  const margens = (() => {
    if (!window.PricingRules || !window.PricingRules.calcProposal || !window.PricingRules.marginBreakdown || !(guests > 0)) return null;
    const tipo = hasActiveMenu && hasMargin ? 'menu_price' : hasActiveMenu ? 'menu_cost' : 'items';
    const modo = regras && regras.defaultPricingMode === 'divisor' ? 'divisor' : 'markup';
    const c = window.PricingRules.calcProposal({
      perPersonCost: menuCostTotal / guests, perPersonPrice: menuPriceTotal / guests, itemsCostPerPerson: ingredientsCost / guests,
      guests, totalType: tipo, supportCost, laborCost, transportCost, months: monthsUntilEvent, pricingMode: modo, settings: regras, prepFee
    });
    const m = window.PricingRules.marginBreakdown(c, regras);
    if (!m) return null;
    m.base = modo === 'divisor' ? 'método do divisor' : tipo === 'menu_price' ? 'total com margem' : tipo === 'menu_cost' ? 'total dos pratos' : 'total dos itens';
    m.divisorInvalid = c.divisorInvalid;
    return m;
  })();
  const pctTxt = v => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',') + '%';
  const corPct = v => v < 0 ? 'text-red-600' : v < 10 ? 'text-orange-600' : 'text-green-700';
  const linhaConta = (rotulo, valor, sinal) => React.createElement("div", {
    key: rotulo, className: "flex justify-between text-xs text-gray-600"
  }, React.createElement("span", null, sinal ? sinal + " " + rotulo : rotulo), React.createElement("span", null, formatCurrency(valor)));
  const linhaTotal = (rotulo, valor) => React.createElement("div", {
    key: rotulo, className: "flex justify-between text-xs font-semibold text-gray-800 border-t", style: { paddingTop: 2 }
  }, React.createElement("span", null, "= " + rotulo), React.createElement("span", null, formatCurrency(valor)));
  const linhaMargem = (rotulo, valor, pctV, dica) => React.createElement("div", {
    key: rotulo, className: "flex justify-between items-center py-2 border-t border-gray-200", title: dica
  }, React.createElement("div", null,
      React.createElement("div", { className: "text-sm font-semibold text-gray-800" }, rotulo),
      React.createElement("div", { className: "text-xs text-gray-500" }, formatCurrency(valor) + " · " + dica)),
    React.createElement("span", { className: `text-xl font-bold ${corPct(pctV)}` }, pctTxt(pctV)));

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
  }, "+", formatCurrency(valorCorrecao))), clientSupplyOn && prepFee > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center text-sm",
    title: "Insumos do cliente: taxa de preparo por convidado (entra no preço)"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "\uD83E\uDDFA Taxa de preparo"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-gray-800"
  }, formatCurrency(prepFee))), clientSupplyOn && clientSupplyCost > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center text-xs",
    style: { color: '#9a3412' },
    title: "O cliente compra esses insumos: n\xE3o entram no custo nem no pre\xE7o"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83E\uDDFA Insumos do cliente (fora do pre\xE7o)"), /*#__PURE__*/React.createElement("span", null, formatCurrency(clientSupplyCost)))), /*#__PURE__*/React.createElement("div", {
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
  ))), margens && React.createElement("div", {
    className: "bg-white rounded-xl p-4 border border-gray-200 shadow-sm", "data-testid": "margens-evento"
  }, React.createElement("div", { className: "flex items-baseline justify-between gap-2 mb-1" },
      React.createElement("h4", { className: "font-bold text-gray-800" }, "📊 Margens do evento"),
      React.createElement("span", { className: "text-xs text-gray-500" }, "% do preço de venda")),
    React.createElement("div", { className: "flex justify-between items-center text-sm mb-1" },
      React.createElement("span", { className: "text-gray-600" }, "Preço de venda ", React.createElement("span", { className: "text-xs text-gray-400" }, "(" + margens.base + ")")),
      React.createElement("span", { className: "font-bold text-gray-800" }, formatCurrency(margens.price))),
    linhaMargem("Margem bruta", margens.gross, margens.grossPct, "preço − comida − apoio"),
    linhaMargem("Margem operacional", margens.operating, margens.operatingPct, "bruta − mão de obra, transporte, taxas e custos fixos"),
    linhaMargem("Margem líquida", margens.net, margens.netPct, "operacional − impostos"),
    React.createElement("details", { className: "mt-2" },
      React.createElement("summary", { className: "text-xs text-orange-700 font-semibold cursor-pointer" }, "Ver a conta"),
      React.createElement("div", { className: "mt-2 space-y-1" },
        linhaConta("Preço de venda", margens.price, ""), linhaConta("Comida", margens.food, "−"), linhaConta("Apoio", margens.support, "−"),
        linhaTotal("Lucro bruto", margens.gross),
        linhaConta("Mão de obra", margens.labor, "−"), linhaConta("Transporte", margens.transport, "−"),
        linhaConta("Taxas de cartão", margens.cardFees, "−"), linhaConta("Custos fixos", margens.fixedCosts, "−"),
        linhaTotal("Lucro operacional", margens.operating),
        linhaConta("Impostos", margens.taxes, "−"),
        linhaTotal("Lucro líquido", margens.net),
        mult > 1 && React.createElement("p", { className: "text-xs text-gray-500", style: { paddingTop: 4 } }, "Comida e apoio já com a correção até o evento."))),
    margens.divisorInvalid && React.createElement("p", { className: "text-xs text-red-600 mt-2" },
      "Os percentuais de Custos da empresa somam quase 100%: o método do divisor não fecha. Revise os percentuais."),
    !margens.hasCompanyCosts && React.createElement("p", { className: "text-xs text-yellow-800 bg-yellow-50 rounded-lg p-2 mt-2" },
      "Cadastre impostos, taxas de cartão e custos fixos em ",
      window.openPricingSettings ? React.createElement("button", { type: "button", className: "font-semibold", style: { textDecoration: "underline" }, onClick: () => window.openPricingSettings() }, "Custos da empresa") : "Custos da empresa",
      " para a margem operacional e a líquida ficarem reais.")
  )));
});

// Expor ao window para uso com Babel
window.CostsSummary = CostsSummary;
})();
