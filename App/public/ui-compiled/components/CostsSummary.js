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
 * @returns {JSX.Element}
 */
const CostsSummary = React.memo(function CostsSummary({
  categoryStats = {},
  supportCost = 0,
  laborCost = 0,
  transportCost = 0,
  subtotal = 0,
  totalCost = 0,
  pricePerPerson = 0,
  guests = 0
}) {
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
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-700 font-medium"
  }, "Subtotal:"), /*#__PURE__*/React.createElement("span", {
    className: "text-xl font-bold text-gray-800"
  }, formatCurrency(subtotal)))), /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-br from-orange-600 to-red-600 rounded-xl p-6 text-white shadow-lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center space-y-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-orange-100 text-sm font-medium mb-1"
  }, "TOTAL GERAL"), /*#__PURE__*/React.createElement("p", {
    className: "text-4xl font-bold"
  }, formatCurrency(totalCost))), /*#__PURE__*/React.createElement("div", {
    className: "border-t-2 border-white border-opacity-30 pt-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-orange-100 text-sm font-medium mb-1"
  }, "POR PESSOA"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold"
  }, formatCurrency(pricePerPerson)), /*#__PURE__*/React.createElement("p", {
    className: "text-orange-200 text-xs mt-1"
  }, "para ", guests, " convidados"))))));
});

// Expor ao window para uso com Babel
window.CostsSummary = CostsSummary;
})();
