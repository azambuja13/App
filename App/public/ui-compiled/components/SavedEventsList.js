(function() {
/**
 * SavedEventsList - Lista de eventos salvos com opções de carregar/duplicar/excluir
 */

// Usar funções do window global
const {
  formatCurrency,
  formatDate
} = window;

/**
 * @param {Object} props
 * @param {Array} props.savedEvents - Lista de eventos salvos
 * @param {string} props.currentEventId - ID do evento atualmente carregado
 * @param {Function} props.onLoadEvent - Callback para carregar evento
 * @param {Function} props.onDuplicateEvent - Callback para duplicar evento
 * @param {Function} props.onDeleteEvent - Callback para excluir evento
 * @param {Function} props.onExportEvents - Callback para exportar backup
 * @param {Function} props.onClose - Callback para fechar modal
 * @returns {JSX.Element}
 */
function SavedEventsList({
  savedEvents = [],
  currentEventId = null,
  onLoadEvent,
  onDuplicateEvent,
  onDeleteEvent,
  onExportEvents,
  onClose
}) {
  // Ordena eventos por data de atualização (mais recente primeiro)
  const sortedEvents = [...savedEvents].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center p-6 border-b"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold text-gray-800"
  }, "\uD83D\uDCCB Eventos Salvos"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "text-gray-500 hover:text-gray-700 text-3xl leading-none"
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto p-6"
  }, savedEvents.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "text-center py-12 text-gray-500"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-6xl mb-3"
  }, "\uD83D\uDCCB"), /*#__PURE__*/React.createElement("p", {
    className: "text-lg"
  }, "Nenhum evento salvo ainda"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm mt-2"
  }, "Clique em \"\uD83D\uDCBE Salvar\" para salvar seu primeiro evento")) : /*#__PURE__*/React.createElement("div", {
    className: "grid gap-3"
  }, sortedEvents.map(event => /*#__PURE__*/React.createElement("div", {
    key: event.id,
    className: `border-2 rounded-lg p-4 transition-all ${currentEventId === event.id ? 'border-orange-500 bg-orange-50 shadow-md' : 'border-gray-200 hover:border-gray-300'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-lg mb-1"
  }, event.name), /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-gray-600 space-y-1"
  }, event.eventDate && /*#__PURE__*/React.createElement("p", {
    className: "flex items-center gap-1"
  }, "\uD83D\uDCC5 ", formatDate(event.eventDate)), /*#__PURE__*/React.createElement("p", {
    className: "flex items-center gap-1"
  }, "\uD83D\uDC65 ", event.data?.guests || event.guests || 0, " pessoas"), /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-green-700 text-base"
  }, "Total: ", formatCurrency(event.results?.totalWithInflation || event.totalCost || 0)), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-500 text-xs"
  }, "Por pessoa: ", formatCurrency(event.results?.pricePerPerson || event.pricePerPerson || 0))), currentEventId === event.id && /*#__PURE__*/React.createElement("span", {
    className: "inline-block mt-2 bg-orange-600 text-white text-xs px-2 py-1 rounded"
  }, "\u2713 Evento Atual")), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onLoadEvent(event.id),
    className: "bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 font-semibold whitespace-nowrap"
  }, "\uD83D\uDCC2 Abrir"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onDuplicateEvent(event.id),
    className: "bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 font-semibold whitespace-nowrap"
  }, "\uD83D\uDCCB Copiar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onDeleteEvent(event.id, event.name),
    className: "bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 font-semibold whitespace-nowrap"
  }, "\uD83D\uDDD1\uFE0F Excluir"))))))), /*#__PURE__*/React.createElement("div", {
    className: "p-6 pt-4 border-t flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onExportEvents,
    className: "bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 font-semibold"
  }, "\uD83D\uDCBE Exportar Backup"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "bg-orange-600 text-white px-6 py-2 rounded hover:bg-orange-700 font-semibold"
  }, "Fechar"))));
}

// Expor ao window para uso com Babel
window.SavedEventsList = SavedEventsList;
})();
