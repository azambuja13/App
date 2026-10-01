(function() {
/**
 * EventForm - Formulário principal de configuração do evento
 */

// Usar componentes do window global
const {
  Icon
} = window;

/**
 * @param {Object} props
 * @param {number} props.guests - Número de convidados
 * @param {Function} props.onGuestsChange - Callback para alterar número de convidados
 * @param {number} props.monthsUntilEvent - Meses até o evento (para correção de inflação)
 * @param {Function} props.onMonthsUntilEventChange - Callback para alterar meses até o evento
 * @returns {JSX.Element}
 */
const EventForm = React.memo(function EventForm({
  guests,
  onGuestsChange,
  monthsUntilEvent,
  onMonthsUntilEventChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "p-4 border-b-4 border-orange-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-1 text-xs font-semibold text-gray-700 mb-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "users",
    className: "w-4 h-4 text-orange-600"
  }), "Convidados"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: guests === 0 || guests === '' ? '' : guests,
    onChange: e => {
      const value = window.handleNumberInput ? window.handleNumberInput(e.target.value) : parseInt(e.target.value) || 0;
      onGuestsChange(value === '' ? 0 : value);
    },
    className: "w-full px-3 py-2 text-lg font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent",
    min: "1",
    placeholder: "0"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-1 text-xs font-semibold text-gray-700 mb-1"
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "trending",
    className: "w-4 h-4 text-orange-600"
  }), "Meses"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: monthsUntilEvent === 0 || monthsUntilEvent === '' ? '' : monthsUntilEvent,
    onChange: e => {
      const value = window.handleNumberInput ? window.handleNumberInput(e.target.value) : parseInt(e.target.value) || 0;
      onMonthsUntilEventChange(value === '' ? 0 : value);
    },
    className: "w-full px-3 py-2 text-lg font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent",
    min: "0",
    placeholder: "0"
  }))), monthsUntilEvent > 0 && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-2"
  }, "Corre\xE7\xE3o: +", ((Math.pow(1.01, monthsUntilEvent) - 1) * 100).toFixed(2), "% materiais"));
});

// Expor ao window para uso com Babel
window.EventForm = EventForm;
})();
