(function() {
/**
 * ===================================================================
 * DISH LIST - Listagem de Pratos
 * ===================================================================
 * Componente para listar, filtrar e gerenciar pratos
 */

/**
 * Componente DishList
 * Lista todos os pratos com filtros e ações
 *
 * @param {Object} props
 * @param {Function} props.onEdit - Callback ao editar prato
 * @param {Function} props.onSelect - Callback ao selecionar prato
 * @param {boolean} props.selectMode - Se está em modo de seleção
 * @param {Set} props.dishesInUse - Set de IDs de pratos que estão no cardápio
 */
function DishList({
  onEdit,
  onSelect,
  selectMode = false,
  dishesInUse = new Set()
}) {
  // Referência ao componente global PDFButton
  const PDFButton = window.PDFButton;

  const [dishes, setDishes] = React.useState([]);
  const [filteredDishes, setFilteredDishes] = React.useState([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('all');
  const [sortBy, setSortBy] = React.useState('name'); // name, cost, date
  const [viewMode, setViewMode] = React.useState(() => {
    // Carregar preferência salva ou usar 'grid' como padrão
    return localStorage.getItem('dishList_viewMode') || 'grid';
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(null);
  const [stats, setStats] = React.useState(null);

  // Paginação
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 20;

  // ⚡ Performance: Ref para controlar cache de carregamento
  const lastLoadTime = React.useRef(0);
  const CACHE_DURATION = 300000; // 5 minutos

  // Salvar preferência de visualização quando mudar
  React.useEffect(() => {
    localStorage.setItem('dishList_viewMode', viewMode);
  }, [viewMode]);

  // Carregar pratos ao montar E quando dados estiverem prontos
  React.useEffect(() => {
    console.log('🎯 [DishList] Componente montado - carregando dados...');

    // SEMPRE tentar carregar quando montar
    (async () => {
      await loadDishes();
    })();

    // Listener para Phase 2 - recarrega quando dados estiverem prontos
    const handlePhase2Complete = async () => {
      console.log('✅ [DishList] Phase 2 completa - recarregando dados...');
      await loadDishes();
    };

    // Listener customizado para quando trocar de aba dentro do app
    const handleTabChange = async e => {
      if (e.detail === 'dishes') {
        const timeSinceLoad = Date.now() - lastLoadTime.current;
        // ⚡ Performance: só recarregar se cache expirou (30s)
        if (timeSinceLoad > CACHE_DURATION) {
          console.log('🔄 [DishList] Tab "dishes" ativada - cache expirado (' + Math.round(timeSinceLoad / 1000) + 's) - recarregando...');
          await loadDishes();
        } else {
          console.log('✅ [DishList] Tab "dishes" ativada - usando cache (' + Math.round(timeSinceLoad / 1000) + 's desde última carga)');
        }
      }
    };

    // Listener para quando a aba do navegador ficar visível
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        const timeSinceLoad = Date.now() - lastLoadTime.current;
        // ⚡ Performance: usar o mesmo cache de 5 minutos
        if (timeSinceLoad > CACHE_DURATION) {
          console.log('👁️ [DishList] Aba visível após ' + Math.round(timeSinceLoad / 1000) + 's - cache expirado - recarregando...');
          await loadDishes();
        } else {
          console.log('✅ [DishList] Aba visível - cache ainda válido (' + Math.round(timeSinceLoad / 1000) + 's desde última carga)');
        }
      }
    };
    window.addEventListener('backend-phase2-complete', handlePhase2Complete);
    window.addEventListener('tab-changed', handleTabChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('backend-phase2-complete', handlePhase2Complete);
      window.removeEventListener('tab-changed', handleTabChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Aplicar filtros e resetar página
  React.useEffect(() => {
    applyFilters();
    setCurrentPage(1); // Resetar para página 1 quando filtros mudarem
  }, [dishes, searchTerm, categoryFilter, sortBy]);
  const loadDishes = async () => {
    try {
      const startTime = performance.now();
      console.log('⏱️ [DishList] Iniciando carregamento de pratos...');

      // Usar ManagerHelper para pegar o manager correto (backend PostgreSQL > local)
      const dishManager = window.ManagerHelper?.getDishManager() || window.PrecificacaoAPI?.dishManager || window.dishManager;
      if (!dishManager) {
        console.error('❌ [DishList] dishManager não disponível');
        setDishes([]);
        return;
      }

      // Usar getActive() para não mostrar pratos deletados
      const t1 = performance.now();
      const activeDishes = await dishManager.getActive();
      const t2 = performance.now();
      console.log(`⏱️ [DishList] getActive() levou ${(t2 - t1).toFixed(0)}ms - ${activeDishes?.length || 0} pratos`);

      setDishes(activeDishes || []);

      // ⚡ Performance: Atualizar timestamp da última carga
      lastLoadTime.current = Date.now();

      // Usar getDetailedStatistics() que retorna avgCostPerServing e byCategory
      const t3 = performance.now();
      if (dishManager.getDetailedStatistics) {
        const statistics = await dishManager.getDetailedStatistics();
        setStats(statistics);
      } else if (dishManager.getStatistics) {
        // Fallback para getStatistics() básico
        const statistics = await dishManager.getStatistics();
        setStats(statistics);
      }
      const t4 = performance.now();
      console.log(`⏱️ [DishList] getDetailedStatistics() levou ${(t4 - t3).toFixed(0)}ms`);

      const totalTime = performance.now() - startTime;
      console.log(`⏱️ [DishList] ✅ Carregamento completo em ${totalTime.toFixed(0)}ms`);
    } catch (error) {
      console.error('Erro ao carregar pratos:', error);
      setDishes([]); // Garantir que seja array
    }
  };
  const applyFilters = () => {
    // Garantir que dishes é um array antes de fazer spread
    if (!Array.isArray(dishes)) {
      console.warn('⚠️ dishes não é um array:', dishes);
      setFilteredDishes([]);
      return;
    }
    let filtered = [...dishes];

    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(dish => dish.name.toLowerCase().includes(term) || dish.description?.toLowerCase().includes(term) || dish.category?.toLowerCase().includes(term));
    }

    // Filtro de categoria
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(dish => dish.category === categoryFilter);
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'cost':
          return (b.totalCost || 0) - (a.totalCost || 0);
        case 'date':
          return new Date(b.createdAt) - new Date(a.createdAt);
        default:
          return 0;
      }
    });
    setFilteredDishes(filtered);
  };
  const handleToggleFavorite = async dishId => {
    try {
      // Usar ManagerHelper para pegar o manager correto (backend PostgreSQL > local)
      const dishManager = window.ManagerHelper?.getDishManager() || window.PrecificacaoAPI?.dishManager || window.dishManager;
      if (!dishManager) {
        console.error('❌ dishManager não disponível');
        return;
      }
      dishManager.toggleFavorite(dishId);
      loadDishes();
    } catch (error) {
      console.error('Erro ao favoritar:', error);
    }
  };
  const handleDuplicate = async dishId => {
    try {
      console.log('🔄 Duplicando prato:', dishId);

      // Usar ManagerHelper para pegar o manager correto (backend PostgreSQL > local)
      const dishManager = window.ManagerHelper?.getDishManager() || window.PrecificacaoAPI?.dishManager || window.dishManager;
      if (!dishManager) {
        console.error('❌ dishManager não encontrado');
        return;
      }
      const result = await dishManager.duplicateDish(dishId);
      console.log('📊 Resultado da duplicação:', result);
      if (result.success) {
        console.log('✅ Prato duplicado com sucesso!');
        loadDishes();
      } else {
        alert(`Erro ao duplicar: ${result.message}`);
      }
    } catch (error) {
      console.error('❌ Erro ao duplicar:', error);
      alert('Erro ao duplicar prato. Veja o console para detalhes.');
    }
  };
  const handleDelete = async dishId => {
    try {
      console.log('🗑️ Deletando prato:', dishId);

      // Usar ManagerHelper para pegar o manager correto (backend PostgreSQL > local)
      const dishManager = window.ManagerHelper?.getDishManager() || window.PrecificacaoAPI?.dishManager || window.dishManager;
      if (!dishManager) {
        console.error('❌ dishManager não encontrado');
        alert('Erro: Sistema não inicializado. Recarregue a página.');
        return;
      }
      const result = await dishManager.deleteDish(dishId);
      console.log('📊 Resultado da exclusão:', result);
      if (result.success) {
        console.log('✅ Prato deletado com sucesso!');
        loadDishes();
        setShowDeleteConfirm(null);
      } else {
        console.error('❌ Falha ao deletar:', result.message);
        alert(`Erro ao deletar: ${result.message}`);
      }
    } catch (error) {
      console.error('❌ Erro ao deletar:', error);
      alert('Erro ao deletar prato. Veja o console para detalhes.');
    }
  };
  const handleAddToMenu = async dish => {
    try {
      console.log('🍽️ Adicionando prato ao cardápio:', dish.name);
      if (!dish.ingredients || dish.ingredients.length === 0) {
        alert('⚠️ Este prato não tem ingredientes cadastrados!');
        return;
      }
      const menuManager = window.menuManager;
      const result = await menuManager.addDishToMenu(dish, 1.0); // 1 porção por pessoa por padrão

      if (result.success) {
        console.log(`✅ Prato "${dish.name}" adicionado ao cardápio!`);

        // Disparar evento para atualizar dishesInUse em DishesPage
        window.dispatchEvent(new CustomEvent('menu-updated', {
          detail: {
            action: 'add',
            dishId: dish.id
          }
        }));
        alert(`✅ Prato "${dish.name}" adicionado ao cardápio!\n\nVá para a aba "Cardápio" para ajustar as porções por pessoa.`);
      } else {
        alert(result.message || 'Erro ao adicionar prato ao cardápio');
      }
    } catch (error) {
      console.error('❌ Erro ao adicionar prato ao cardápio:', error);
      alert('Erro ao adicionar prato ao cardápio: ' + (error.message || 'Erro desconhecido'));
    }
  };
  const handlePrintTechnicalSheet = dish => {
    try {
      console.log('🖨️ Imprimindo ficha técnica:', dish.name);

      // Criar janela de impressão
      const printWindow = window.open('', '_blank');

      // Montar HTML da ficha técnica
      const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ficha Técnica - ${dish.name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: Arial, sans-serif;
            padding: 20mm;
            line-height: 1.6;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .header h1 {
            font-size: 28px;
            color: #1e40af;
            margin-bottom: 5px;
        }
        .header .subtitle {
            font-size: 14px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .section {
            margin-bottom: 20px;
            page-break-inside: avoid;
        }
        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #1e40af;
            background: #eff6ff;
            padding: 8px 12px;
            border-left: 4px solid #2563eb;
            margin-bottom: 10px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-bottom: 15px;
        }
        .info-item {
            padding: 10px;
            background: #f8fafc;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
        }
        .info-label {
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 4px;
        }
        .info-value {
            font-size: 16px;
            font-weight: bold;
            color: #1e293b;
        }
        .ingredients-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .ingredients-table th {
            background: #1e40af;
            color: white;
            padding: 10px;
            text-align: left;
            font-size: 12px;
        }
        .ingredients-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 13px;
        }
        .ingredients-table tr:nth-child(even) {
            background: #f8fafc;
        }
        .technical-box {
            background: #fef3c7;
            border: 2px solid #fbbf24;
            border-radius: 6px;
            padding: 15px;
            margin-top: 10px;
        }
        .technical-box p {
            margin: 0;
            color: #78350f;
            line-height: 1.8;
            white-space: pre-wrap;
        }
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
        }
        @media print {
            body {
                padding: 10mm;
            }
            .section {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📋 ${dish.name}</h1>
        <div class="subtitle">Ficha Técnica de Produção</div>
    </div>

    <!-- Informações Gerais -->
    <div class="section">
        <div class="section-title">📊 Informações Gerais</div>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Categoria</div>
                <div class="info-value">${getCategoryIcon(dish.category)} ${dish.category || 'N/A'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Ingredientes</div>
                <div class="info-value">🧑‍🍳 ${dish.ingredients?.length || 0} ingredientes</div>
            </div>
            <div class="info-item">
                <div class="info-label">Custo Total</div>
                <div class="info-value">💰 R$ ${(dish.totalCost || 0).toFixed(2)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Peso Total</div>
                <div class="info-value">⚖️ ${formatWeight(dish.totalWeight)}</div>
            </div>
        </div>
        ${dish.description ? `<p style="color: #475569; font-style: italic; margin-top: 10px;">"${dish.description}"</p>` : ''}
    </div>

    <!-- Ingredientes -->
    <div class="section">
        <div class="section-title">🧑‍🍳 Lista de Ingredientes</div>
        <table class="ingredients-table">
            <thead>
                <tr>
                    <th style="width: 40%">Ingrediente</th>
                    <th style="width: 20%; text-align: center">Quantidade</th>
                    <th style="width: 20%; text-align: right">Custo Unit.</th>
                    <th style="width: 20%; text-align: right">Custo Total</th>
                </tr>
            </thead>
            <tbody>
                ${dish.ingredients && dish.ingredients.length > 0 ? dish.ingredients.map(ing => {
                    // Calcular custo total do ingrediente com conversão de unidades
                    const quantity = parseFloat(ing.quantity) || 0;
                    const unit = ing.unit || 'g';
                    const unitCost = parseFloat(ing.unitCost) || 0;
                    const lossPercentage = parseFloat(ing.lossPercentage) || 0;

                    // Converter para gramas
                    const quantityInGrams = (unit === 'kg' || unit === 'L') ? quantity * 1000 : quantity;

                    // Calcular custo total com perda
                    const totalIngredientCost = quantityInGrams * unitCost * (1 + lossPercentage / 100);

                    return `
                        <tr>
                            <td><strong>${ing.ingredientName || ing.name || 'N/A'}</strong></td>
                            <td style="text-align: center">${formatWeight(quantityInGrams)}</td>
                            <td style="text-align: right">R$ ${unitCost.toFixed(4)}/g</td>
                            <td style="text-align: right"><strong>R$ ${totalIngredientCost.toFixed(2)}</strong></td>
                        </tr>
                    `;
                }).join('') : '<tr><td colspan="4" style="text-align: center; color: #94a3b8;">Nenhum ingrediente cadastrado</td></tr>'}
            </tbody>
        </table>
    </div>

    ${dish.technicalSheet ? `
    <!-- Ficha Técnica -->
    <div class="section">
        <div class="section-title">📋 Instruções Técnicas</div>
        <div class="technical-box">
            <p>${dish.technicalSheet}</p>
        </div>
    </div>
    ` : ''}

    ${dish.observations ? `
    <!-- Observações -->
    <div class="section">
        <div class="section-title">📌 Observações</div>
        <p style="padding: 10px; background: #f8fafc; border-radius: 4px; color: #475569;">${dish.observations}</p>
    </div>
    ` : ''}

    <div class="footer">
        Ficha Técnica gerada em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
    </div>

    <script>
        window.onload = () => {
            window.print();
        };
    </script>
</body>
</html>
            `;
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error) {
      console.error('❌ Erro ao imprimir ficha técnica:', error);
      alert('Erro ao gerar ficha técnica para impressão.');
    }
  };
  const handleExport = async () => {
    try {
      // Usar ManagerHelper para pegar o manager correto (backend PostgreSQL > local)
      const dishManager = window.ManagerHelper?.getDishManager() || window.PrecificacaoAPI?.dishManager || window.dishManager;
      if (!dishManager) {
        console.error('❌ dishManager não disponível');
        alert('Erro: Sistema não inicializado. Recarregue a página.');
        return;
      }
      const jsonData = dishManager.exportToJSON();

      // Download do arquivo
      const blob = new Blob([jsonData], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pratos-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar:', error);
    }
  };

  // Categorias
  const categories = [{
    value: 'all',
    label: 'Todas',
    icon: '🍽️'
  }, {
    value: 'entrada',
    label: 'Entradas',
    icon: '🥗'
  }, {
    value: 'principal',
    label: 'Principais',
    icon: '🍖'
  }, {
    value: 'acompanhamento',
    label: 'Acompanhamentos',
    icon: '🥘'
  }, {
    value: 'sobremesa',
    label: 'Sobremesas',
    icon: '🍰'
  }, {
    value: 'bebida',
    label: 'Bebidas',
    icon: '🥤'
  }];
  const getCategoryIcon = category => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.icon : '🍴';
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "dish-list"
  }, stats && /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6 mb-6 shadow-lg"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold mb-4"
  }, "\uD83C\uDF7D\uFE0F Meus Pratos"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-blue-100 text-sm"
  }, "Total de Pratos"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold"
  }, stats.total)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-blue-100 text-sm"
  }, "Favoritos"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold"
  }, "\u2B50 ", stats.favorites)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-blue-100 text-sm"
  }, "Custo M\xE9dio"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold"
  }, "R$ ", stats.avgCostPerServing?.toFixed(2) || '0.00')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-blue-100 text-sm"
  }, "Mais Usada"), /*#__PURE__*/React.createElement("p", {
    className: "text-xl font-bold"
  }, stats.byCategory && Object.keys(stats.byCategory).length > 0 ? (() => {
    const mostUsed = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])[0];
    return `${getCategoryIcon(mostUsed[0])} ${mostUsed[0]}`;
  })() : '-')))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow p-4 mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-[200px] max-w-md"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: searchTerm,
    onChange: e => setSearchTerm(e.target.value),
    placeholder: "\uD83D\uDD0D Buscar pratos...",
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex border border-gray-300 rounded-lg overflow-hidden"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setViewMode('grid'),
    className: `px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`
  }, /*#__PURE__*/React.createElement(Icon, { type: "grid", className: "w-5 h-5" })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setViewMode('list'),
    className: `px-3 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`
  }, /*#__PURE__*/React.createElement(Icon, { type: "list", className: "w-5 h-5" }))), /*#__PURE__*/React.createElement("button", {
    onClick: handleExport,
    className: "px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
  }, "\uD83D\uDCE5 Exportar"))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, categories.map(cat => /*#__PURE__*/React.createElement("button", {
    key: cat.value,
    onClick: () => setCategoryFilter(cat.value),
    className: `px-3 py-1 rounded-full text-sm font-medium transition-colors ${categoryFilter === cat.value ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`
  }, cat.icon, " ", cat.label))), /*#__PURE__*/React.createElement("select", {
    value: sortBy,
    onChange: e => setSortBy(e.target.value),
    className: "px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: "name"
  }, "\uD83D\uDCDD Nome"), /*#__PURE__*/React.createElement("option", {
    value: "cost"
  }, "\uD83D\uDCB0 Custo"), /*#__PURE__*/React.createElement("option", {
    value: "date"
  }, "\uD83D\uDCC5 Data")))), filteredDishes.length > 0 ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'
  }, (() => {
    // Calcular paginação
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const paginatedDishes = filteredDishes.slice(indexOfFirstItem, indexOfLastItem);
    return paginatedDishes;
  })().map(dish => /*#__PURE__*/React.createElement(DishCard, {
    key: dish.id,
    dish: dish,
    viewMode: viewMode,
    selectMode: selectMode,
    isInMenu: dishesInUse.has(dish.id),
    onEdit: onEdit,
    onSelect: onSelect,
    onToggleFavorite: handleToggleFavorite,
    onDuplicate: handleDuplicate,
    onDelete: () => setShowDeleteConfirm(dish.id),
    onAddToMenu: handleAddToMenu,
    onPrintTechnicalSheet: handlePrintTechnicalSheet
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mt-6 pt-4 border-t"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setCurrentPage(prev => Math.max(prev - 1, 1)),
    disabled: currentPage === 1,
    className: "px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition"
  }, "\u2190 Anterior"), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-gray-600"
  }, "P\xE1gina ", currentPage, " de ", Math.ceil(filteredDishes.length / itemsPerPage), " (", filteredDishes.length, " pratos)"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredDishes.length / itemsPerPage))),
    disabled: currentPage >= Math.ceil(filteredDishes.length / itemsPerPage),
    className: "px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition"
  }, "Pr\xF3xima \u2192"))) : /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow p-12 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-6xl mb-4"
  }, "\uD83C\uDF7D\uFE0F"), /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-semibold text-gray-700 mb-2"
  }, searchTerm || categoryFilter !== 'all' ? 'Nenhum prato encontrado' : 'Nenhum prato cadastrado'), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-500 mb-6"
  }, searchTerm || categoryFilter !== 'all' ? 'Tente ajustar os filtros de busca' : 'Comece criando seu primeiro prato reutilizável')), showDeleteConfirm && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-6xl mb-4"
  }, "\u26A0\uFE0F"), /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold text-gray-800 mb-2"
  }, "Excluir Prato?"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600"
  }, "Esta a\xE7\xE3o n\xE3o pode ser desfeita. O prato ser\xE1 removido permanentemente.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-end space-x-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowDeleteConfirm(null),
    className: "px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleDelete(showDeleteConfirm),
    className: "px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
  }, "Excluir")))));
}

/**
 * Componente DishCard
 * Card individual de prato
 */
function DishCard({
  dish,
  viewMode,
  selectMode,
  isInMenu,
  onEdit,
  onSelect,
  onToggleFavorite,
  onDuplicate,
  onDelete,
  onAddToMenu,
  onPrintTechnicalSheet
}) {
  // Foto principal (primeira do array)
  const mainPhoto = dish.photos && dish.photos.length > 0 ? dish.photos[0] : null;
  if (viewMode === 'list') {
    // Visualização em lista (compacta)
    return /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-4 flex flex-wrap items-center justify-between gap-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center space-x-4 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex-shrink-0"
    }, isInMenu ? /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center justify-center w-6 h-6 bg-green-100 rounded-full",
      title: "Este prato est\xE1 no card\xE1pio"
    }, /*#__PURE__*/React.createElement("svg", {
      className: "w-4 h-4 text-green-600",
      fill: "currentColor",
      viewBox: "0 0 20 20"
    }, /*#__PURE__*/React.createElement("path", {
      fillRule: "evenodd",
      d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z",
      clipRule: "evenodd"
    }))) : /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full",
      title: "Este prato n\xE3o est\xE1 no card\xE1pio"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-gray-400 text-xs"
    }, "\u2014"))), mainPhoto ? /*#__PURE__*/React.createElement("img", {
      src: mainPhoto.photoData || mainPhoto.data,
      alt: dish.name,
      className: "w-16 h-16 object-cover rounded-lg"
    }) : /*#__PURE__*/React.createElement("div", {
      className: "text-4xl"
    }, getCategoryIcon(dish.category)), /*#__PURE__*/React.createElement("div", {
      className: "flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center space-x-2 mb-1"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "font-bold text-gray-800"
    }, dish.name), dish.isFavorite && /*#__PURE__*/React.createElement("span", {
      className: "text-yellow-500"
    }, "\u2B50")), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-gray-600 line-clamp-1"
    }, dish.description), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center space-x-4 mt-2 text-sm text-gray-500"
    }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCB0 R$ ", dish.totalCost?.toFixed(2)), /*#__PURE__*/React.createElement("span", null, "\u2696\uFE0F ", formatWeight(dish.totalWeight)), /*#__PURE__*/React.createElement("span", null, "\uD83E\uDDD1\u200D\uD83C\uDF73 ", dish.ingredients?.length || 0, " ingred.")))), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap items-center justify-end gap-2"
    }, selectMode ? /*#__PURE__*/React.createElement("button", {
      onClick: () => onSelect(dish),
      className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    }, "Selecionar") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      onClick: () => onAddToMenu(dish),
      className: "px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium",
      title: "Adicionar ao Card\xE1pio"
    }, "\uD83C\uDF7D\uFE0F Card\xE1pio"), PDFButton ? /*#__PURE__*/React.createElement("div", {
      className: "inline-block",
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement(PDFButton, {
      onClick: () => onPrintTechnicalSheet(dish),
      label: "\uD83D\uDDA8\uFE0F",
      featureName: "Impress\xE3o de Ficha T\xE9cnica",
      className: "!p-2 !px-3 !py-1 !text-sm hover:!bg-blue-100 !rounded !text-blue-600 !bg-transparent !shadow-none"
    })) : /*#__PURE__*/React.createElement("button", {
      onClick: () => onPrintTechnicalSheet(dish),
      className: "p-2 hover:bg-blue-100 rounded text-blue-600",
      title: "Imprimir Ficha T\xE9cnica"
    }, "\uD83D\uDDA8\uFE0F"), /*#__PURE__*/React.createElement("button", {
      onClick: () => onToggleFavorite(dish.id),
      className: "p-2 hover:bg-gray-100 rounded"
    }, dish.isFavorite ? '⭐' : '☆'), /*#__PURE__*/React.createElement("button", {
      onClick: () => onEdit(dish),
      className: "p-2 hover:bg-gray-100 rounded"
    }, "\u270F\uFE0F"), /*#__PURE__*/React.createElement("button", {
      onClick: () => onDuplicate(dish.id),
      className: "p-2 hover:bg-gray-100 rounded"
    }, "\uD83D\uDCCB"), /*#__PURE__*/React.createElement("button", {
      onClick: onDelete,
      className: "p-2 hover:bg-red-100 rounded text-red-600"
    }, "\uD83D\uDDD1\uFE0F"))));
  }

  // Visualização em grid (cards)
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow hover:shadow-xl transition-all overflow-hidden relative"
  }, isInMenu && /*#__PURE__*/React.createElement("div", {
    className: "absolute top-2 right-2 z-10"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white shadow-lg"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-3 h-3 mr-1",
    fill: "currentColor",
    viewBox: "0 0 20 20"
  }, /*#__PURE__*/React.createElement("path", {
    fillRule: "evenodd",
    d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z",
    clipRule: "evenodd"
  })), "No Card\xE1pio")), mainPhoto ? /*#__PURE__*/React.createElement("div", {
    className: "relative h-48"
  }, /*#__PURE__*/React.createElement("img", {
    src: mainPhoto.photoData || mainPhoto.data,
    alt: dish.name,
    className: "w-full h-full object-cover"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-0 left-0 right-0 p-4 text-white"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, getCategoryIcon(dish.category)), dish.isFavorite && /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "\u2B50")), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-lg"
  }, dish.name))) : /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-4xl"
  }, getCategoryIcon(dish.category)), dish.isFavorite && /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "\u2B50")), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-lg"
  }, dish.name)), /*#__PURE__*/React.createElement("div", {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 mb-4 line-clamp-2 h-10"
  }, dish.description || 'Sem descrição'), dish.technicalSheet && /*#__PURE__*/React.createElement("div", {
    className: "mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-blue-600 mr-2"
  }, "\uD83D\uDCCB"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-semibold text-blue-800 mb-1"
  }, "Ficha T\xE9cnica:"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-blue-700 line-clamp-3"
  }, dish.technicalSheet)))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "\uD83D\uDCB0 Custo total:"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "R$ ", dish.totalCost?.toFixed(2))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "\u2696\uFE0F Peso total:"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-green-600"
  }, formatWeight(dish.totalWeight))), dish.servings && dish.servings > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "\uD83C\uDF7D\uFE0F Serve:"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-blue-600"
  }, dish.servings, " ", dish.servings === 1 ? 'porção' : 'porções')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "\uD83E\uDDD1\u200D\uD83C\uDF73 Ingredientes:"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, dish.ingredients?.length || 0))), selectMode ? /*#__PURE__*/React.createElement("button", {
    onClick: () => onSelect(dish),
    className: "w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
  }, "Selecionar") : /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onAddToMenu(dish),
    className: "w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium",
    title: "Adicionar ao Card\xE1pio do Evento"
  }, "\uD83C\uDF7D\uFE0F Adicionar ao Card\xE1pio"), PDFButton ? /*#__PURE__*/React.createElement(PDFButton, {
    onClick: () => onPrintTechnicalSheet(dish),
    label: "\uD83D\uDDA8\uFE0F Imprimir Ficha T\xE9cnica",
    featureName: "Impress\xE3o de Ficha T\xE9cnica",
    className: "!w-full !bg-blue-500 hover:!bg-blue-600"
  }) : /*#__PURE__*/React.createElement("button", {
    onClick: () => onPrintTechnicalSheet(dish),
    className: "w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium",
    title: "Imprimir Ficha T\xE9cnica"
  }, "\uD83D\uDDA8\uFE0F Imprimir Ficha T\xE9cnica"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onToggleFavorite(dish.id),
    className: "flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
  }, dish.isFavorite ? '⭐' : '☆'), /*#__PURE__*/React.createElement("button", {
    onClick: () => onEdit(dish),
    className: "flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
  }, "\u270F\uFE0F"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onDuplicate(dish.id),
    className: "flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
  }, "\uD83D\uDCCB"), /*#__PURE__*/React.createElement("button", {
    onClick: onDelete,
    className: "flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
  }, "\uD83D\uDDD1\uFE0F")))));
}
function getCategoryIcon(category) {
  const icons = {
    entrada: '🥗',
    principal: '🍖',
    acompanhamento: '🥘',
    sobremesa: '🍰',
    bebida: '🥤',
    outro: '🍴'
  };
  return icons[category] || '🍽️';
}

// Formatar peso (gramas para kg se >= 1000g)
function formatWeight(grams) {
  if (!grams || grams === 0) return '0 g';
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg`;
  }
  return `${grams.toFixed(0)} g`;
}

// export default DishList;

// Expor para window (browser global)
window.DishList = DishList;
})();
