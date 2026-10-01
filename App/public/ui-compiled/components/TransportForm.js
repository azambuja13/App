(function() {
/**
 * TransportForm - Formulário de transporte e pedágio
 *
 * @param {Object} props
 * @param {Object} props.transport - Dados do transporte { active, distance, consumption, fuelPrice, costPerKm, toll, quantity }
 * @param {Function} props.onTransportChange - Callback para atualizar dados do transporte
 * @param {number} props.transportCost - Custo total calculado do transporte
 * @returns {JSX.Element}
 */
const TransportForm = React.memo(function TransportForm({
  transport = {
    active: false,
    distance: 50,
    consumption: 10,
    fuelPrice: 6.0,
    costPerKm: 0,
    toll: 0,
    quantity: 1
  },
  onTransportChange,
  transportCost = 0
}) {
  // Cálculos detalhados
  const totalDistance = (parseFloat(transport.distance) || 0) * 2; // Ida e volta
  const litersNeeded = totalDistance / (parseFloat(transport.consumption) || 1);
  const fuelCost = litersNeeded * (parseFloat(transport.fuelPrice) || 0);
  const roadCost = totalDistance * (parseFloat(transport.costPerKm) || 0);
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-lg p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold text-gray-800"
  }, "\uD83D\uDE97 Transporte & Ped\xE1gio"), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 cursor-pointer"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: transport.active,
    onChange: e => onTransportChange({
      ...transport,
      active: e.target.checked
    }),
    className: "w-5 h-5 text-blue-600 rounded cursor-pointer"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium text-gray-700"
  }, "Ativo"))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-3 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Dist\xE2ncia (km)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: transport.distance === 0 ? '' : transport.distance,
    onChange: e => onTransportChange({
      ...transport,
      distance: e.target.value === '' ? 0 : parseFloat(e.target.value)
    }),
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg",
    step: "0.1",
    placeholder: "0"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Consumo (km/l)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: transport.consumption === 0 ? '' : transport.consumption,
    onChange: e => onTransportChange({
      ...transport,
      consumption: e.target.value === '' ? 0 : parseFloat(e.target.value)
    }),
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg",
    step: "0.1",
    placeholder: "10"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Pre\xE7o Combust\xEDvel (R$/l)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: transport.fuelPrice === 0 ? '' : transport.fuelPrice,
    onChange: e => onTransportChange({
      ...transport,
      fuelPrice: e.target.value === '' ? 0 : parseFloat(e.target.value)
    }),
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg",
    step: "0.01",
    placeholder: "6.00"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Custo por Km (R$/km)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: transport.costPerKm === 0 ? '' : transport.costPerKm,
    onChange: e => onTransportChange({
      ...transport,
      costPerKm: e.target.value === '' ? 0 : parseFloat(e.target.value)
    }),
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg",
    step: "0.01",
    placeholder: "0.50"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Ped\xE1gio (R$)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: transport.toll === 0 ? '' : transport.toll,
    onChange: e => onTransportChange({
      ...transport,
      toll: e.target.value === '' ? 0 : parseFloat(e.target.value)
    }),
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg",
    step: "0.01",
    placeholder: "0"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Viagens"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: transport.quantity === 0 ? '' : transport.quantity,
    onChange: e => onTransportChange({
      ...transport,
      quantity: e.target.value === '' ? 0 : parseFloat(e.target.value)
    }),
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg",
    placeholder: "1"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Total"), /*#__PURE__*/React.createElement("div", {
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg bg-blue-50 font-bold text-blue-900 text-lg"
  }, "R$ ", transportCost.toFixed(2)))), transport.active && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 p-4 bg-blue-50 rounded-lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-blue-900"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold mb-2"
  }, "\uD83D\uDCCA Detalhes do C\xE1lculo:"), /*#__PURE__*/React.createElement("p", null, "\u2022 Dist\xE2ncia total (ida e volta): ", totalDistance.toFixed(1), " km"), /*#__PURE__*/React.createElement("p", null, "\u2022 Litros necess\xE1rios: ", litersNeeded.toFixed(2), " L"), /*#__PURE__*/React.createElement("p", null, "\u2022 Custo combust\xEDvel: R$ ", fuelCost.toFixed(2)), transport.costPerKm > 0 && /*#__PURE__*/React.createElement("p", null, "\u2022 Custo rodagem: R$ ", roadCost.toFixed(2)), transport.toll > 0 && /*#__PURE__*/React.createElement("p", null, "\u2022 Ped\xE1gio: R$ ", transport.toll.toFixed(2)), transport.quantity > 1 && /*#__PURE__*/React.createElement("p", {
    className: "font-semibold mt-1"
  }, "\u2022 Total para ", transport.quantity, " viagem(ns): R$ ", transportCost.toFixed(2)))));
});

// Expor ao window para uso com Babel
window.TransportForm = TransportForm;
})();
