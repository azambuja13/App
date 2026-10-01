(function() {
/**
 * LaborForm - Formulário de mão de obra
 *
 * @param {Object} props
 * @param {Object} props.labor - Dados da mão de obra { hours, rate }
 * @param {Function} props.onLaborChange - Callback para atualizar dados da mão de obra
 * @param {number} props.laborCost - Custo total calculado da mão de obra
 * @returns {JSX.Element}
 */
const LaborForm = React.memo(function LaborForm({
  labor = {
    hours: 0,
    rate: 0
  },
  onLaborChange,
  laborCost = 0
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-lg p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center mb-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold text-gray-800"
  }, "\uD83D\uDC77 M\xE3o de Obra")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-3 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Horas Trabalhadas"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: labor.hours === 0 ? '' : labor.hours,
    onChange: e => onLaborChange({
      ...labor,
      hours: e.target.value === '' ? 0 : parseFloat(e.target.value)
    }),
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg",
    step: "0.5",
    placeholder: "10",
    min: "0"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Valor/Hora (R$)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: labor.rate === 0 ? '' : labor.rate,
    onChange: e => onLaborChange({
      ...labor,
      rate: e.target.value === '' ? 0 : parseFloat(e.target.value)
    }),
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg",
    step: "0.01",
    placeholder: "500",
    min: "0"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Total"), /*#__PURE__*/React.createElement("div", {
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg bg-green-50 font-bold text-green-900 text-lg"
  }, "R$ ", laborCost.toFixed(2)))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 p-4 bg-green-50 rounded-lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-green-900"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold mb-2"
  }, "\uD83D\uDCCA Detalhes do C\xE1lculo:"), /*#__PURE__*/React.createElement("p", null, "\u2022 Horas: ", labor.hours, "h"), /*#__PURE__*/React.createElement("p", null, "\u2022 Valor/Hora: R$ ", (labor.rate || 0).toFixed(2)), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold mt-1"
  }, "\u2022 Total M\xE3o de Obra: R$ ", laborCost.toFixed(2)))));
});

// Expor ao window para uso com Babel
window.LaborForm = LaborForm;
})();
