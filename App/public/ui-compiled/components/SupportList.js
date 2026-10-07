(function() {
/**
 * SupportList - Lista de itens de apoio e logística com CRUD completo
 *
 * @param {Object} props
 * @param {Array} props.supportItems - Lista de itens de apoio calculados
 * @param {Function} props.onUpdateItem - Callback para atualizar item (id, field, value)
 * @param {Function} props.onDeleteItem - Callback para deletar item (id)
 * @param {Function} props.onAddToEvent - Callback para adicionar ao evento (item)
 * @param {Object} props.newSupport - Dados do novo item { name, cost, quantity }
 * @param {Function} props.onNewSupportChange - Callback para alterar novo item
 * @param {Function} props.onAddSupport - Callback para adicionar item
 * @param {Object|null} props.editingSupport - Item sendo editado (null se nenhum)
 * @param {Function} props.onStartEditing - Callback para iniciar edição (item)
 * @param {Function} props.onEditingChange - Callback para alterar item em edição
 * @param {Function} props.onSaveEditing - Callback para salvar edição
 * @param {Function} props.onCancelEditing - Callback para cancelar edição
 * @returns {JSX.Element}
 */
const SupportList = React.memo(function SupportList({
  supportItems = [],
  onUpdateItem,
  onDeleteItem,
  onAddToEvent,
  newSupport = {
    name: '',
    cost: 0,
    quantity: 1
  },
  onNewSupportChange,
  onAddSupport,
  editingSupport = null,
  onStartEditing,
  onEditingChange,
  onSaveEditing,
  onCancelEditing
}) {
  const {
    useState
  } = React;
  const [showNewForm, setShowNewForm] = useState(false);
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-bold text-gray-800"
  }, "Apoio & Log\xEDstica"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 no-print"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowNewForm(!showNewForm),
    className: "flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:shadow-lg transition"
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "plus",
    className: "w-5 h-5"
  }), showNewForm ? 'Fechar' : 'Novo Item'))), showNewForm && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-lg p-6 no-print"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold text-gray-800 mb-4"
  }, "Novo Item de Apoio"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-4 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "md:col-span-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Nome do Item"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: newSupport.name,
    onChange: e => onNewSupportChange({
      ...newSupport,
      name: e.target.value
    }),
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg",
    placeholder: "Ex: Equipamento de Som"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Custo (R$)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: newSupport.cost === 0 ? '' : newSupport.cost,
    onChange: e => onNewSupportChange({
      ...newSupport,
      cost: parseFloat(e.target.value) || 0
    }),
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg",
    step: "0.01",
    placeholder: "0.00"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Quantidade"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: newSupport.quantity === 0 ? '' : newSupport.quantity,
    onChange: e => onNewSupportChange({
      ...newSupport,
      quantity: parseFloat(e.target.value) || 0
    }),
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg",
    placeholder: "1"
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      onAddSupport();
      setShowNewForm(false);
    },
    className: "mt-4 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:shadow-lg transition font-semibold"
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "plus",
    className: "w-5 h-5"
  }), "Adicionar Item de Apoio")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-lg overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full"
  }, /*#__PURE__*/React.createElement("thead", {
    className: "bg-gradient-to-r from-orange-500 to-red-500 text-white"
  }, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-center font-semibold no-print"
  }, "\u2713"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left font-semibold min-w-48"
  }, "Item"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left font-semibold"
  }, "Custo (R$)"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left font-semibold"
  }, "Qtd"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left font-semibold"
  }, "Total"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-center font-semibold no-print"
  }, "A\xE7\xF5es"))), /*#__PURE__*/React.createElement("tbody", null, supportItems.map((item, idx) => /*#__PURE__*/React.createElement("tr", {
    key: item.id,
    className: `border-b hover:bg-orange-50 transition ${!item.active ? 'opacity-40' : ''} ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`
  }, editingSupport && editingSupport.id === item.id ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-center no-print"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: editingSupport.active,
    onChange: e => onEditingChange({
      ...editingSupport,
      active: e.target.checked
    }),
    className: "w-5 h-5 text-orange-600 rounded cursor-pointer"
  })), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: editingSupport.name,
    onChange: e => onEditingChange({
      ...editingSupport,
      name: e.target.value
    }),
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg"
  })), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: editingSupport.cost === 0 ? '' : editingSupport.cost,
    onChange: e => onEditingChange({
      ...editingSupport,
      cost: parseFloat(e.target.value) || 0
    }),
    className: "w-24 px-3 py-2 border border-gray-300 rounded-lg",
    step: "0.01",
    placeholder: "0.00"
  })), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: editingSupport.quantity === 0 ? '' : editingSupport.quantity,
    onChange: e => onEditingChange({
      ...editingSupport,
      quantity: parseFloat(e.target.value) || 0
    }),
    className: "w-24 px-3 py-2 border border-gray-300 rounded-lg",
    placeholder: "1"
  })), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-right font-bold text-orange-600 text-lg"
  }, "R$ ", ((editingSupport.cost || 0) * (editingSupport.quantity || 1)).toFixed(2)), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 no-print"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 justify-center"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onSaveEditing,
    className: "px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
  }, "Salvar"), /*#__PURE__*/React.createElement("button", {
    onClick: onCancelEditing,
    className: "px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
  }, "Cancelar")))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-center no-print"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: item.active,
    onChange: e => onUpdateItem(item.id, 'active', e.target.checked),
    className: "w-5 h-5 text-orange-600 rounded cursor-pointer"
  })), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 font-medium text-gray-800"
  }, item.name), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-gray-700"
  }, "R$ ", (item.cost || 0).toFixed(2)), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-gray-700"
  }, item.quantity), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-right font-bold text-orange-600 text-lg"
  }, "R$ ", (item.total || 0).toFixed(2)), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 no-print"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 justify-center"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onStartEditing(item),
    className: "text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50",
    title: "Editar"
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "edit",
    className: "w-5 h-5"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => onDeleteItem(item.id),
    className: "text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50",
    title: "Excluir"
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "trash",
    className: "w-5 h-5"
  })))))))), /*#__PURE__*/React.createElement("tfoot", null, /*#__PURE__*/React.createElement("tr", {
    className: "bg-gray-100 border-t-2 border-gray-300"
  }, /*#__PURE__*/React.createElement("td", {
    className: "no-print"
  }), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 font-bold text-gray-800 text-lg",
    colSpan: 3
  }, "Total Apoio & Logística"), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-right font-bold text-orange-700 text-xl"
  }, "R$ ", supportItems.filter(function(i) { return i.active; }).reduce(function(sum, i) { return sum + (i.total || 0); }, 0).toFixed(2)), /*#__PURE__*/React.createElement("td", {
    className: "no-print"
  })))))));
});

// Expor ao window para uso com Babel
window.SupportList = SupportList;
})();
