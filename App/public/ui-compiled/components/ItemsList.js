(function() {
/**
 * ItemsList - Lista de itens/ingredientes do evento agrupados por categoria
 */

// Usar React e componentes do window global
const {
  useState,
  useEffect
} = React;
const {
  Icon
} = window;
const {
  formatCurrency
} = window;

/**
 * ItemsList Component
 *
 * @param {Object} props
 * @param {Object} props.groupedItems - Itens agrupados por categoria { category: [items] }
 * @param {Object} props.categoryStats - Estatísticas por categoria { category: { total, items, active } }
 * @param {Function} props.onUpdateItem - Callback para atualizar item (id, field, value)
 * @param {Function} props.onDeleteItem - Callback para deletar item (id)
 * @returns {JSX.Element}
 */
const ItemsList = React.memo(function ItemsList({
  groupedItems = {},
  categoryStats = {},
  guests = 100,
  onUpdateItem,
  onDeleteItem
}) {
  // Função para imprimir lista de compras
  const printShoppingList = () => {
    const printWindow = window.open('', '', 'width=800,height=600');

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lista de Compras</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          h1 {
            text-align: center;
            color: #333;
            border-bottom: 3px solid #f97316;
            padding-bottom: 10px;
          }
          .category {
            margin-top: 30px;
            page-break-inside: avoid;
          }
          .category-header {
            background: linear-gradient(to right, #f97316, #ef4444);
            color: white;
            padding: 10px 15px;
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            background-color: #f3f4f6;
            padding: 10px;
            text-align: left;
            border-bottom: 2px solid #e5e7eb;
            font-weight: bold;
          }
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #e5e7eb;
          }
          tr:hover {
            background-color: #fef3c7;
          }
          .checkbox {
            width: 20px;
            height: 20px;
            border: 2px solid #d1d5db;
            display: inline-block;
            margin-right: 10px;
          }
          @media print {
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <h1>🛒 Lista de Compras</h1>
        <p style="text-align: center; color: #666; margin-bottom: 20px;">
          Data: ${new Date().toLocaleDateString('pt-BR')}
        </p>
    `;

    // Iterar por cada categoria
    Object.entries(groupedItems).forEach(([category, items]) => {
      html += `
        <div class="category">
          <div class="category-header">${category.toUpperCase()}</div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px"></th>
                <th>Item</th>
                <th style="text-align: right">Quantidade</th>
              </tr>
            </thead>
            <tbody>
      `;

      items.forEach(item => {
        const isUnitType = item.unitType === 'unit' || item.unit === 'un';
        const quantity = Math.ceil(item.qtyInKgL || 0);
        const unit = isUnitType ? 'un' : 'kg/L';
        const itemName = item.ingredient?.nome || item.ingredient?.name || item.name || 'Sem nome';

        html += `
          <tr>
            <td><span class="checkbox"></span></td>
            <td><strong>${itemName}</strong></td>
            <td style="text-align: right">${quantity} ${unit}</td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
        </div>
      `;
    });

    html += `
        <div style="text-align: center; margin-top: 40px; color: #999; font-size: 12px;">
          Gerado pela Calculadora de Precificação
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap justify-between items-center gap-3"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold text-gray-800"
  }, "Itens do Evento"), /*#__PURE__*/React.createElement("button", {
    onClick: printShoppingList,
    className: "px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 text-sm font-medium transition-colors"
  }, "\uD83D\uDCCB Imprimir Lista de Compras")), Object.entries(groupedItems).map(([category, categoryItems]) => {
    const totalCost = categoryStats[category]?.total || 0;

    // ✅ qtyPerPerson agora é LÍQUIDO (vem do MenuPage já como líquido)
    // Calcular total LÍQUIDO por pessoa (somando qtyPerPerson que já é líquido)
    const totalQtyPerPersonLiquid = categoryItems.reduce((sum, item) => {
      return sum + (item.qtyPerPerson || 0);
    }, 0);

    // ✅ Calcular total BRUTO por pessoa (aplicando perda e rendimento INVERSOS)
    const totalQtyPerPersonBruto = categoryItems.reduce((sum, item) => {
      const lossDecimal = (item.loss || 0) > 1 ? (item.loss || 0) / 100 : (item.loss || 0);
      const yieldMultiplier = parseFloat(item.yieldMultiplier) || 1;

      // Aplicar perda inversa: líquido / (1 - perda) = bruto
      const qtyWithLoss = lossDecimal > 0 && lossDecimal < 1
        ? item.qtyPerPerson / (1 - lossDecimal)
        : item.qtyPerPerson;

      // Aplicar rendimento inverso: qty / yieldMultiplier
      const qtyPerPersonBruto = yieldMultiplier > 0 ? qtyWithLoss / yieldMultiplier : qtyWithLoss;

      return sum + (qtyPerPersonBruto || 0);
    }, 0);

    // Determinar se categoria é de unidades ou gramas/kg
    const allUnitItems = categoryItems.every(item => item.unitType === 'unit' || item.unit === 'un');

    return /*#__PURE__*/React.createElement("div", {
      key: category,
      className: "bg-white rounded-xl shadow-lg overflow-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      // ✅ MOBILE (celular/iPad em pé): cards empilhados em vez da tabela de 6 colunas com rolagem lateral
      className: "lg:hidden"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "text-lg font-bold text-white"
    }, category, " ", /*#__PURE__*/React.createElement("span", {
      className: "text-xs text-orange-100"
    }, "(", categoryItems.length, ")")), /*#__PURE__*/React.createElement("div", {
      className: "grid gap-2 mt-2",
      style: { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-orange-100"
    }, "A Servir"), /*#__PURE__*/React.createElement("div", {
      className: "text-sm font-bold text-white"
    }, allUnitItems ? `${totalQtyPerPersonLiquid.toFixed(2)} un` : `${totalQtyPerPersonLiquid.toFixed(2)} g`)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-orange-100"
    }, "A Comprar"), /*#__PURE__*/React.createElement("div", {
      className: "text-sm font-bold text-white"
    }, allUnitItems ? `${totalQtyPerPersonBruto.toFixed(2)} un` : `${totalQtyPerPersonBruto.toFixed(2)} g`)), /*#__PURE__*/React.createElement("div", {
      className: "text-right"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-orange-100"
    }, "Custo Total"), /*#__PURE__*/React.createElement("div", {
      className: "text-sm font-bold text-white"
    }, formatCurrency(totalCost))))), categoryItems.map((item, idx) => {
      const isUnitType = item.unitType === 'unit' || item.unit === 'un';
      // Mesma conta da tabela: qtyPerPerson é LÍQUIDO (preparado); bruto (cru) = perda e rendimento inversos
      const lossDecimal = (item.loss || 0) > 1 ? (item.loss || 0) / 100 : (item.loss || 0);
      const yieldMultiplier = parseFloat(item.yieldMultiplier) || 1;
      const qtyWithLoss = lossDecimal > 0 && lossDecimal < 1 ? item.qtyPerPerson / (1 - lossDecimal) : item.qtyPerPerson;
      const qtyPerPersonBruto = yieldMultiplier > 0 ? qtyWithLoss / yieldMultiplier : qtyWithLoss;
      const fmtPerPerson = v => !v || v === 0 ? '0' : isUnitType ? `${v.toFixed(2)} un` : `${v.toFixed(2)} g`;
      const cell = (label, value) => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        className: "text-xs text-gray-500"
      }, label), /*#__PURE__*/React.createElement("div", {
        className: "text-sm font-medium text-gray-800"
      }, value));
      return /*#__PURE__*/React.createElement("div", {
        key: item.id,
        className: `px-4 py-3 border-b border-gray-100 ${!item.active ? 'opacity-40' : ''} ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex justify-between items-start gap-3"
      }, /*#__PURE__*/React.createElement("span", {
        className: "font-semibold text-gray-800 min-w-0"
      }, item.name || item.ingredient?.nome || item.ingredient?.name || 'Sem nome'), /*#__PURE__*/React.createElement("span", {
        className: "font-bold text-orange-600 whitespace-nowrap"
      }, formatCurrency(item.total))), /*#__PURE__*/React.createElement("div", {
        className: "grid gap-2 mt-2",
        style: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }
      }, cell("Consumo/pessoa (preparado)", fmtPerPerson(item.qtyPerPerson)), cell("Consumo/pessoa (cru)", fmtPerPerson(qtyPerPersonBruto)), cell("Comprar (exato)", isUnitType ? `${(item.qtyInKgL || 0).toFixed(2)} un` : `${(item.qtyInKgL || 0).toFixed(2)} kg/L`), cell("Quantidade (arredondado)", isUnitType ? `${Math.ceil(item.qtyInKgL || 0)} un` : `${Math.ceil(item.qtyInKgL || 0)} kg/L`)));
    })), /*#__PURE__*/React.createElement("div", {
      // Telas largas (lg): tabela original
      className: "hidden lg:block overflow-x-auto"
    }, /*#__PURE__*/React.createElement("table", {
      className: "w-full"
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
      className: "bg-gradient-to-r from-orange-500 to-red-500"
    }, /*#__PURE__*/React.createElement("th", {
      className: "px-4 py-3 text-left min-w-40"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "text-xl font-bold text-white"
    }, category)), /*#__PURE__*/React.createElement("th", {
      className: "px-4 py-3 text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-orange-100"
    }, "A Servir"), /*#__PURE__*/React.createElement("div", {
      className: "text-lg font-bold text-white"
    }, allUnitItems ? `${totalQtyPerPersonLiquid.toFixed(2)} un` : `${totalQtyPerPersonLiquid.toFixed(2)} g`)), /*#__PURE__*/React.createElement("th", {
      className: "px-4 py-3 text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-orange-100"
    }, "A Comprar"), /*#__PURE__*/React.createElement("div", {
      className: "text-lg font-bold text-white"
    }, allUnitItems ? `${totalQtyPerPersonBruto.toFixed(2)} un` : `${totalQtyPerPersonBruto.toFixed(2)} g`)), /*#__PURE__*/React.createElement("th", {
      className: "px-4 py-3 text-right"
    }), /*#__PURE__*/React.createElement("th", {
      className: "px-4 py-3 text-right"
    }), /*#__PURE__*/React.createElement("th", {
      className: "px-4 py-3 text-right"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-orange-100"
    }, "Custo Total"), /*#__PURE__*/React.createElement("div", {
      className: "text-lg font-bold text-white"
    }, formatCurrency(totalCost)))), /*#__PURE__*/React.createElement("tr", {
      className: "bg-gray-50 border-b-2 border-gray-200"
    }, /*#__PURE__*/React.createElement("th", {
      className: "px-4 py-3 text-left text-xs font-semibold text-gray-600 min-w-40"
    }, "Item"), /*#__PURE__*/React.createElement("th", {
      className: "px-4 py-3 text-center text-xs font-semibold text-gray-600"
    }, /*#__PURE__*/React.createElement("div", null, "Consumo/Pessoa"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 'normal',
        color: '#6c757d',
        fontSize: '10px'
      }
    }, "(preparado)")), /*#__PURE__*/React.createElement("th", {
      className: "px-4 py-3 text-center text-xs font-semibold text-gray-600"
    }, /*#__PURE__*/React.createElement("div", null, "Consumo/Pessoa"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 'normal',
        color: '#6c757d',
        fontSize: '10px'
      }
    }, "(cru)")), /*#__PURE__*/React.createElement("th", {
      className: "px-4 py-3 text-right text-xs font-semibold text-gray-600"
    }, /*#__PURE__*/React.createElement("div", null, "Comprar"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 'normal',
        color: '#6c757d',
        fontSize: '10px'
      }
    }, "(total exato)")), /*#__PURE__*/React.createElement("th", {
      className: "px-4 py-3 text-right text-xs font-semibold text-gray-600"
    }, /*#__PURE__*/React.createElement("div", null, "Quantidade"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 'normal',
        color: '#6c757d',
        fontSize: '10px'
      }
    }, "(arredondado)")), /*#__PURE__*/React.createElement("th", {
      className: "px-4 py-3 text-right text-xs font-semibold text-gray-600"
    }, /*#__PURE__*/React.createElement("div", null, "Total (R$)"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 'normal',
        color: '#6c757d',
        fontSize: '10px'
      }
    }, "(baseado em Quantidade)")))), /*#__PURE__*/React.createElement("tbody", null, categoryItems.map((item, idx) => {
      const isUnitType = item.unitType === 'unit' || item.unit === 'un';

      // ✅ qtyPerPerson agora é LÍQUIDO (vem do MenuPage)
      // Calcular BRUTO aplicando perda e rendimento INVERSOS
      const lossDecimal = (item.loss || 0) > 1 ? (item.loss || 0) / 100 : (item.loss || 0);
      const yieldMultiplier = parseFloat(item.yieldMultiplier) || 1;

      // Aplicar perda inversa: líquido / (1 - perda) = bruto
      const qtyWithLoss = lossDecimal > 0 && lossDecimal < 1
        ? item.qtyPerPerson / (1 - lossDecimal)
        : item.qtyPerPerson;

      // Aplicar rendimento inverso: qty / yieldMultiplier
      const qtyPerPersonBruto = yieldMultiplier > 0 ? qtyWithLoss / yieldMultiplier : qtyWithLoss;

      return /*#__PURE__*/React.createElement("tr", {
        key: item.id,
        className: `border-b hover:bg-orange-50 transition ${!item.active ? 'opacity-40' : ''} ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`
      }, /*#__PURE__*/React.createElement("td", {
        className: "px-4 py-3 font-medium text-gray-800"
      }, item.name || item.ingredient?.nome || item.ingredient?.name || 'Sem nome'), /*#__PURE__*/React.createElement("td", {
        className: "px-4 py-3 text-center"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-center font-medium text-gray-800"
      }, !item.qtyPerPerson || item.qtyPerPerson === 0 ? '0' : isUnitType ? `${item.qtyPerPerson.toFixed(2)} un` : `${item.qtyPerPerson.toFixed(2)} g`)), /*#__PURE__*/React.createElement("td", {
        className: "px-4 py-3 text-center"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-center font-medium text-gray-700"
      }, !qtyPerPersonBruto || qtyPerPersonBruto === 0 ? '0' : isUnitType ? `${qtyPerPersonBruto.toFixed(2)} un` : `${qtyPerPersonBruto.toFixed(2)} g`)), /*#__PURE__*/React.createElement("td", {
        className: "px-4 py-3 text-right font-medium text-gray-700"
      }, isUnitType ? `${(item.qtyInKgL || 0).toFixed(2)} un` : `${(item.qtyInKgL || 0).toFixed(2)} kg/L`), /*#__PURE__*/React.createElement("td", {
        className: "px-4 py-3 text-right font-medium text-gray-700"
      }, isUnitType ? `${Math.ceil(item.qtyInKgL || 0)} un` : `${Math.ceil(item.qtyInKgL || 0)} kg/L`), /*#__PURE__*/React.createElement("td", {
        className: "px-4 py-3 text-right font-bold text-orange-600"
      }, formatCurrency(item.total)));
    })))));
  }));
});

// Expor ao window para uso com Babel
window.ItemsList = ItemsList;
})();
