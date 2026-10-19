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
// Campo numérico que aceita vírgula e não apaga o "0" enquanto digita (ex.: 0,80)
const parseDec = v => {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  let s = String(v == null ? '' : v).trim().replace(/\s/g, '');
  if (!s) return 0;
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
};
function DecInput({ value, onValue, className, placeholder, ariaLabel }) {
  const show = v => (v === 0 || v === '' || v == null ? '' : String(v).replace('.', ','));
  const [txt, setTxt] = React.useState(show(value));
  const foco = React.useRef(false);
  React.useEffect(() => { if (!foco.current) setTxt(show(value)); }, [value]);
  return React.createElement('input', {
    type: 'text', inputMode: 'decimal', value: txt, placeholder, className, 'aria-label': ariaLabel,
    onFocus: () => { foco.current = true; },
    onBlur: () => { foco.current = false; setTxt(show(value)); },
    onChange: e => { setTxt(e.target.value); onValue(parseDec(e.target.value)); }
  });
}
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
  // Cálculos detalhados — mesma conta de core/calculations.calculateTransportCost
  // (consumo vazio = 10 km/l; distância, litros e rodagem multiplicados pelas viagens)
  const trips = parseFloat(transport.quantity) || 1;
  const totalDistance = (parseFloat(transport.distance) || 0) * 2 * trips; // Ida e volta × viagens
  const litersNeeded = totalDistance / (parseFloat(transport.consumption) || 10);
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
  }, "Dist\xE2ncia (km)"), /*#__PURE__*/React.createElement(DecInput, {
    value: transport.distance,
    onValue: v => onTransportChange({
      ...transport,
      distance: v
    }),
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg",
    placeholder: "0"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Consumo (km/l)"), /*#__PURE__*/React.createElement(DecInput, {
    value: transport.consumption,
    onValue: v => onTransportChange({
      ...transport,
      consumption: v
    }),
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg",
    placeholder: "10"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Pre\xE7o Combust\xEDvel (R$/l)"), /*#__PURE__*/React.createElement(DecInput, {
    value: transport.fuelPrice,
    onValue: v => onTransportChange({
      ...transport,
      fuelPrice: v
    }),
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg",
    placeholder: "6,00"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Custo por Km (R$/km)"), /*#__PURE__*/React.createElement(DecInput, {
    value: transport.costPerKm,
    onValue: v => onTransportChange({
      ...transport,
      costPerKm: v
    }),
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg",
    placeholder: "0,50"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Ped\xE1gio por viagem, ida + volta (R$)"), /*#__PURE__*/React.createElement(DecInput, {
    value: transport.toll,
    onValue: v => onTransportChange({
      ...transport,
      toll: v
    }),
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg",
    placeholder: "0"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Viagens"), /*#__PURE__*/React.createElement(DecInput, {
    value: transport.quantity,
    onValue: v => onTransportChange({
      ...transport,
      quantity: v
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
  }, "\uD83D\uDCCA Detalhes do C\xE1lculo:"), /*#__PURE__*/React.createElement("p", null, "\u2022 Dist\xE2ncia total (ida e volta", trips > 1 ? ` \xD7 ${trips} viagens` : '', "): ", totalDistance.toFixed(1), " km"), /*#__PURE__*/React.createElement("p", null, "\u2022 Litros necess\xE1rios: ", litersNeeded.toFixed(2), " L"), /*#__PURE__*/React.createElement("p", null, "\u2022 Custo combust\xEDvel: R$ ", fuelCost.toFixed(2)), transport.costPerKm > 0 && /*#__PURE__*/React.createElement("p", null, "\u2022 Custo rodagem: R$ ", roadCost.toFixed(2)), transport.toll > 0 && /*#__PURE__*/React.createElement("p", null, "\u2022 Ped\xE1gio (ida + volta \xD7 ", transport.quantity || 1, " viagem(ns)): R$ ", ((parseFloat(transport.toll) || 0) * trips).toFixed(2)), transport.quantity > 1 && /*#__PURE__*/React.createElement("p", {
    className: "font-semibold mt-1"
  }, "\u2022 Total para ", transport.quantity, " viagem(ns): R$ ", transportCost.toFixed(2)))));
});

// Expor ao window para uso com Babel
window.TransportForm = TransportForm;
})();
