(function() {
/**
 * IngredientsDatabase - Banco de dados de ingredientes com CRUD completo
 *
 * @param {Object} props
 * @param {Object} props.groupedIngredients - Ingredientes agrupados por categoria
 * @param {Set} props.ingredientsInUse - Set de IDs de ingredientes em uso no evento
 * @param {Object} props.newIngredient - Dados do novo ingrediente
 * @param {Function} props.onNewIngredientChange - Callback para alterar novo ingrediente
 * @param {Function} props.onAddIngredient - Callback para adicionar ingrediente
 * @param {Object|null} props.editingIngredient - Ingrediente sendo editado (null se nenhum)
 * @param {Function} props.onStartEditing - Callback para iniciar edição (ingredient)
 * @param {Function} props.onEditingChange - Callback para alterar ingrediente em edição
 * @param {Function} props.onSaveEditing - Callback para salvar edição
 * @param {Function} props.onCancelEditing - Callback para cancelar edição
 * @param {Function} props.onDeleteIngredient - Callback para deletar ingrediente (id)
 * @param {Function} props.onAddToEvent - Callback para adicionar ao evento (id)
 * @returns {JSX.Element}
 */
function IngredientsDatabase({
  groupedIngredients = {},
  ingredientsInUse = new Set(),
  newIngredient = {
    name: '',
    category: 'Proteínas',
    loss: 0,
    lossPercentage: 0,
    yieldMultiplier: 1.0,
    costPerUnit: 0,
    unitSize: 0,
    unitType: 'weight'
  },
  onNewIngredientChange,
  onAddIngredient,
  editingIngredient = null,
  onStartEditing,
  onEditingChange,
  onSaveEditing,
  onCancelEditing,
  onDeleteIngredient,
  onAddToEvent
}) {
  const {
    useState
  } = React;
  const [showNewForm, setShowNewForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const [priceUpdateProgress, setPriceUpdateProgress] = useState(null); // { processed, total, percent }

  // Hook de plano - atualiza quando plano muda (escuta evento 'plan-changed')
  const { isPremium } = window.usePlan ? window.usePlan() : { isPremium: true };

  // Usar função centralizada do módulo calculations
  const calculateCostPerGramMl = window.calculateCostPerGramMl || (ingredient => {
    console.warn('⚠️ calculateCostPerGramMl não carregado, usando fallback');
    return 0;
  });

  // Função para normalizar texto (remover acentos, espaços, caracteres especiais)
  const normalizeText = text => {
    if (!text) return '';
    return text.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]/g, ''); // Remove tudo exceto letras e números
  };

  // Função para exportar ingredientes para Excel
  const handleExportExcel = () => {
    console.log('🔵 handleExportExcel chamado');
    console.log('📦 groupedIngredients:', groupedIngredients);
    console.log('📚 window.XLSX:', !!window.XLSX);
    if (!window.XLSX) {
      alert('❌ Biblioteca XLSX não carregada. Recarregue a página.');
      return;
    }
    try {
      // Preparar dados para exportação
      const ingredientsData = Object.values(groupedIngredients).flat().map(ing => {
        // Garantir que costPerUnit e unitSize sejam números
        const costPerUnit = parseFloat(ing.costPerUnit) || 0;
        const unitSize = parseFloat(ing.unitSize) || 0;
        // Suportar tanto lossPercentage (já em %) quanto loss (decimal 0-1)
        let lossValue = parseFloat(ing.lossPercentage) || parseFloat(ing.loss) || 0;
        // Se loss está entre 0-1, é decimal, converter para %
        const lossPercentage = lossValue > 0 && lossValue <= 1 ? lossValue * 100 : lossValue;
        const yieldMultiplier = parseFloat(ing.yieldMultiplier) || 1.0;
        return {
          'ID': ing.id || '',
          'Nome': ing.name || '',
          'Categoria': ing.category || 'Outros',
          'Tipo': ing.unitType === 'unit' ? 'Unidade' : 'Peso',
          'Perda (%)': lossPercentage.toFixed(0),
          'Rendimento (x)': yieldMultiplier.toFixed(1),
          'Custo/Un (R$)': costPerUnit.toFixed(2),
          'Tam. Un.': unitSize,
          'Custo Unitário': ing.unitType === 'unit' ? unitSize > 0 ? (costPerUnit / unitSize).toFixed(4) : '0.0000' : (calculateCostPerGramMl(ing) || 0).toFixed(4)
        };
      });
      console.log('📊 Ingredientes preparados:', ingredientsData.length);
      console.log('📋 Dados:', ingredientsData);
      if (ingredientsData.length === 0) {
        alert('⚠️ Nenhum ingrediente para exportar.');
        return;
      }

      // Criar planilha
      const ws = window.XLSX.utils.json_to_sheet(ingredientsData);
      console.log('✅ Worksheet criada');
      const wb = window.XLSX.utils.book_new();
      console.log('✅ Workbook criado');
      window.XLSX.utils.book_append_sheet(wb, ws, 'Ingredientes');
      console.log('✅ Sheet adicionada ao workbook');

      // Download
      const fileName = `ingredientes_${new Date().toISOString().split('T')[0]}.xlsx`;
      console.log('📥 Iniciando download:', fileName);
      window.XLSX.writeFile(wb, fileName);
      console.log('✅ Ingredientes exportados com sucesso:', ingredientsData.length);
      alert(`✅ Exportados ${ingredientsData.length} ingredientes para ${fileName}`);
    } catch (error) {
      console.error('❌ Erro ao exportar:', error);
      alert('❌ Erro ao exportar: ' + error.message);
    }
  };

  // Função para importar ingredientes com IA (qualquer tipo de arquivo)
  const handleImportWithAI = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log(`📂 Importando arquivo: ${file.name} (${file.type}, ${file.size} bytes)`);

    // Verificar tipos suportados
    const supportedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'text/plain', 'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!supportedTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|gif|webp|pdf|txt|csv|xls|xlsx)$/i)) {
      alert('❌ Tipo de arquivo não suportado!\n\nTipos aceitos:\n• Imagens (JPG, PNG, GIF, WebP)\n• PDF\n• Texto (TXT, CSV)\n• Excel (XLS, XLSX)');
      e.target.value = '';
      return;
    }

    // Mostrar loading
    const loadingMsg = confirm(`🤖 Processar "${file.name}" com IA?\n\nA IA vai extrair:\n• Nome dos ingredientes\n• Preços\n• Unidades\n• Categorias\n\nContinuar?`);

    if (!loadingMsg) {
      e.target.value = '';
      return;
    }

    try {
      const API_URL = window.APP_CONFIG?.backend?.baseURL || 'https://precificacao-api-production.up.railway.app';
      const token = localStorage.getItem('accessToken');

      // Criar FormData com o arquivo
      const formData = new FormData();
      formData.append('file', file);

      console.log('📤 Enviando arquivo para API...');

      const response = await fetch(`${API_URL}/api/ingredients/import-from-file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao importar arquivo');
      }

      console.log('✅ Importação concluída:', result);

      // Montar mensagem com resultados
      let message = `✅ Importação concluída!\n\n`;
      message += `📊 Estatísticas:\n`;
      message += `✓ Criados: ${result.stats.created}\n`;
      message += `♻️ Atualizados: ${result.stats.updated}\n`;
      message += `⏭️ Pulados: ${result.stats.skipped}\n`;

      if (result.stats.errors > 0) {
        message += `❌ Erros: ${result.stats.errors}\n`;
      }

      // Mostrar alguns exemplos de ingredientes criados/atualizados
      if (result.results.created.length > 0) {
        message += `\n📝 Exemplos criados:\n`;
        result.results.created.slice(0, 3).forEach(ing => {
          const price = parseFloat(ing.price) || 0;
          message += `• ${ing.name} - R$ ${price.toFixed(2)}\n`;
        });
        if (result.results.created.length > 3) {
          message += `  ...e mais ${result.results.created.length - 3}\n`;
        }
      }

      if (result.results.updated.length > 0) {
        message += `\n♻️ Exemplos atualizados:\n`;
        result.results.updated.slice(0, 3).forEach(ing => {
          const oldPrice = parseFloat(ing.oldPrice) || 0;
          const newPrice = parseFloat(ing.newPrice) || 0;
          message += `• ${ing.name}: R$ ${oldPrice.toFixed(2)} → R$ ${newPrice.toFixed(2)}\n`;
        });
        if (result.results.updated.length > 3) {
          message += `  ...e mais ${result.results.updated.length - 3}\n`;
        }
      }

      alert(message);

      // Recarregar página para mostrar novos ingredientes
      if (result.stats.created > 0 || result.stats.updated > 0) {
        window.location.reload();
      }

    } catch (error) {
      console.error('❌ Erro ao importar:', error);
      alert(`❌ Erro ao importar arquivo:\n\n${error.message}`);
    } finally {
      e.target.value = ''; // Limpar input
    }
  };

  // Função para filtrar ingredientes baseado no termo de busca
  const filterIngredients = ingredients => {
    // Blindagem: descarta entradas nulas/indefinidas (dados corrompidos) para
    // nao derrubar a tela inteira de Ingredientes com um TypeError
    const validIngredients = Array.isArray(ingredients) ? ingredients.filter(Boolean) : [];
    if (!searchTerm.trim()) return validIngredients;

    // Normalizar termo de busca (remover acentos, converter para minúsculas)
    const searchNormalized = normalizeText(searchTerm);
    return validIngredients.filter(ing => {
      // Normalizar campos do ingrediente
      const nameNormalized = normalizeText(ing.name || '');
      const categoryNormalized = normalizeText(ing.category || '');
      const unitNormalized = normalizeText(ing.unit || '');

      // Verificar se algum campo contém o termo de busca
      const nameMatch = nameNormalized.includes(searchNormalized);
      const categoryMatch = categoryNormalized.includes(searchNormalized);
      const unitMatch = unitNormalized.includes(searchNormalized);
      return nameMatch || categoryMatch || unitMatch;
    });
  };

  // Filtrar ingredientes agrupados
  const filteredGroupedIngredients = {};
  Object.keys(groupedIngredients).forEach(category => {
    const filtered = filterIngredients(groupedIngredients[category]);
    if (filtered.length > 0) {
      filteredGroupedIngredients[category] = filtered;
    }
  });

  // Contar total de ingredientes filtrados
  const totalFiltered = Object.values(filteredGroupedIngredients).flat().length;
  const totalOriginal = Object.values(groupedIngredients).flat().length;

  // Handler para processar seleção de template
  const handleSelectTemplate = async (ingredients) => {
    console.log(`📋 Adicionando ${ingredients.length} ingredientes do template...`);

    let added = 0;
    let skipped = 0;

    for (const templateIngredient of ingredients) {
      // Verificar se já existe ingrediente com mesmo nome
      const allIngredients = Object.values(groupedIngredients).flat();
      const exists = allIngredients.some(ing =>
        ing.name.toLowerCase() === templateIngredient.name.toLowerCase()
      );

      if (exists) {
        skipped++;
        console.log(`⏭️ Ingrediente "${templateIngredient.name}" já existe, pulando...`);
        continue;
      }

      // Adicionar ingrediente
      onNewIngredientChange(templateIngredient);
      await onAddIngredient();
      added++;

      // Pequeno delay para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    alert(`✅ Template aplicado!\n\n✓ ${added} ingredientes adicionados\n⏭️ ${skipped} ingredientes já existiam`);
  };

  // Polling fallback para quando WebSocket não está disponível
  const startPolling = (jobId, apiUrl, token) => {
    console.log('🔄 [PriceUpdate] Iniciando polling para job:', jobId);
    const pollInterval = setInterval(async () => {
      try {
        const resp = await fetch(`${apiUrl}/api/ingredients/price-update-status/${jobId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await resp.json();

        if (!data.success) return;

        if (data.status === 'processing') {
          setPriceUpdateProgress({
            processed: data.processed || 0,
            total: data.total || 0,
            percent: data.percent || 0,
            currentStats: data.currentStats
          });
        } else if (data.status === 'completed') {
          clearInterval(pollInterval);
          setUpdatingPrices(false);
          setPriceUpdateProgress(null);
          alert(`✅ ${data.message}\n\n📊 Estatísticas:\n✓ Atualizados: ${data.stats.updated}\n⏭️ Pulados: ${data.stats.skipped}\n❌ Erros: ${data.stats.failed}\n💰 Custo: R$ ${data.stats.estimatedCostBRL}`);
          window.location.reload();
        } else if (data.status === 'error') {
          clearInterval(pollInterval);
          setUpdatingPrices(false);
          setPriceUpdateProgress(null);
          alert(`❌ Erro no processamento: ${data.error}`);
        } else if (data.status === 'not_found') {
          clearInterval(pollInterval);
          setUpdatingPrices(false);
          setPriceUpdateProgress(null);
        }
      } catch (err) {
        console.warn('⚠️ [PriceUpdate] Erro no polling:', err.message);
      }
    }, 3000); // Consultar a cada 3 segundos

    return pollInterval;
  };

  // Handler para atualizar todos os preços com IA (processamento em background via WebSocket)
  const handleUpdateAllPrices = async () => {
    const total = Object.values(groupedIngredients).flat().length;
    const withoutPrice = Object.values(groupedIngredients).flat().filter(i => !i.costPerUnit || i.costPerUnit === 0).length;

    if (!confirm(`🤖 Atualizar preços com IA?\n\n${total} ingredientes total\n${withoutPrice} sem preço\n\nIsto utilizará a API Claude (Anthropic).\nCusto estimado: R$ ${(withoutPrice * 0.01).toFixed(2)}\n\nO processamento será feito em segundo plano.\nVocê pode acompanhar o progresso na tela.\n\nContinuar?`)) {
      return;
    }

    setUpdatingPrices(true);
    setPriceUpdateProgress({ processed: 0, total: total, percent: 0 });

    const API_URL = window.APP_CONFIG?.backend?.baseURL || 'https://precificacao-api-production.up.railway.app';
    const token = localStorage.getItem('accessToken');
    let pollIntervalId = null;

    // Cleanup: remove listeners WebSocket e polling
    const cleanup = () => {
      const ws = window.websocketService;
      if (ws && ws.socket) {
        ws.off('price-update:progress');
        ws.off('price-update:complete');
        ws.off('price-update:error');
      }
      if (pollIntervalId) clearInterval(pollIntervalId);
    };

    try {
      const response = await fetch(`${API_URL}/api/ingredients/update-all-prices`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        if (!result.async) {
          // Resposta imediata (ex: 0 ingredientes)
          setUpdatingPrices(false);
          setPriceUpdateProgress(null);
          alert(`✅ ${result.message}`);
          return;
        }

        console.log('🚀 [PriceUpdate] Processamento iniciado em background:', result.jobId);

        // Tentar usar WebSocket se disponível
        const ws = window.websocketService;
        const wsConnected = ws && ws.isSocketConnected && ws.isSocketConnected();

        if (wsConnected) {
          console.log('🔌 [PriceUpdate] Usando WebSocket para acompanhar progresso');

          ws.on('price-update:progress', (data) => {
            console.log('📊 [PriceUpdate] Progresso:', data);
            setPriceUpdateProgress({
              processed: data.processed,
              total: data.total,
              percent: data.percent,
              currentStats: data.currentStats
            });
          });

          ws.on('price-update:complete', (data) => {
            console.log('✅ [PriceUpdate] Concluído:', data);
            cleanup();
            setUpdatingPrices(false);
            setPriceUpdateProgress(null);
            if (data.success) {
              alert(`✅ ${data.message}\n\n📊 Estatísticas:\n✓ Atualizados: ${data.stats.updated}\n⏭️ Pulados: ${data.stats.skipped}\n❌ Erros: ${data.stats.failed}\n💰 Custo: R$ ${data.stats.estimatedCostBRL}`);
              window.location.reload();
            }
          });

          ws.on('price-update:error', (data) => {
            console.error('❌ [PriceUpdate] Erro:', data);
            cleanup();
            setUpdatingPrices(false);
            setPriceUpdateProgress(null);
            alert(`❌ Erro no processamento: ${data.error}`);
          });
        } else {
          // WebSocket não disponível - usar polling como fallback
          console.log('📡 [PriceUpdate] WebSocket não conectado - usando polling');
          pollIntervalId = startPolling(result.jobId, API_URL, token);
        }
      } else {
        throw new Error(result.error || 'Erro ao iniciar atualização de preços');
      }
    } catch (error) {
      console.error('❌ [PriceUpdate] Erro:', error);
      cleanup();
      setUpdatingPrices(false);
      setPriceUpdateProgress(null);
      alert(`❌ Erro: ${error.message}`);
    }
  };

  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-3"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-bold text-gray-800"
  }, "Cadastro de Ingredientes"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2 no-print"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleExportExcel,
    className: "flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:shadow-lg transition",
    title: "Exportar ingredientes para Excel"
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "download",
    className: "w-5 h-5"
  }), "Excel"), isPremium ? /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white rounded-xl font-bold hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer group",
    title: "Importar ingredientes de qualquer arquivo usando IA (PDF, imagem, Excel, CSV, texto)"
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "upload",
    className: "w-5 h-5 group-hover:scale-110 transition-transform"
  }), /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "🤖"), "Importar com IA"), /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: ".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.csv,.xls,.xlsx",
    onChange: handleImportWithAI,
    className: "hidden"
  })) : /*#__PURE__*/React.createElement("button", {
    onClick: () => alert('🔒 Recurso disponível apenas no plano PREMIUM\n\nAtualize seu plano em: https://precificacao-vendas-production.up.railway.app'),
    className: "flex items-center gap-2 px-5 py-3 bg-gray-400 text-white rounded-xl font-bold opacity-60 cursor-not-allowed",
    title: "🔒 Recurso Premium - Disponível apenas no plano PREMIUM"
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "upload",
    className: "w-5 h-5"
  }), /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "🤖"), "Importar com IA"), /*#__PURE__*/React.createElement("span", {
    className: "ml-2"
  }, "🔒")), isPremium ? /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowTemplates(true),
    className: "flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-semibold hover:shadow-lg transition",
    title: "Adicionar ingredientes de templates pré-definidos"
  }, "📋 Templates") : /*#__PURE__*/React.createElement("button", {
    onClick: () => alert('🔒 Recurso disponível apenas no plano PREMIUM\n\nAtualize seu plano em: https://precificacao-vendas-production.up.railway.app'),
    className: "flex items-center gap-2 px-4 py-2 bg-gray-400 text-white rounded-lg font-semibold opacity-60 cursor-not-allowed",
    title: "🔒 Recurso Premium - Disponível apenas no plano PREMIUM"
  }, "📋 Templates 🔒"), isPremium ? /*#__PURE__*/React.createElement("button", {
    onClick: handleUpdateAllPrices,
    disabled: updatingPrices,
    className: "flex items-center gap-2 px-5 py-3 text-white rounded-xl font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed",
    style: {
      background: updatingPrices ? '#94a3b8' : 'linear-gradient(to right, #eab308, #f97316, #ef4444)',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      transform: 'scale(1)',
      transition: 'all 0.3s ease'
    },
    onMouseEnter: (e) => {
      if (!updatingPrices) {
        e.currentTarget.style.background = 'linear-gradient(to right, #ca8a04, #ea580c, #dc2626)';
        e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
        e.currentTarget.style.transform = 'scale(1.05)';
      }
    },
    onMouseLeave: (e) => {
      if (!updatingPrices) {
        e.currentTarget.style.background = 'linear-gradient(to right, #eab308, #f97316, #ef4444)';
        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        e.currentTarget.style.transform = 'scale(1)';
      }
    },
    title: "Atualizar preços de ingredientes sem preço usando IA"
  }, updatingPrices ? /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl animate-spin"
  }, "⏳"), /*#__PURE__*/React.createElement("span", {
    style: { color: '#ffffff' }
  }, priceUpdateProgress ? `${priceUpdateProgress.percent}% (${priceUpdateProgress.processed}/${priceUpdateProgress.total})` : "Iniciando...")) : /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "🤖"), /*#__PURE__*/React.createElement("span", {
    style: { color: '#ffffff', fontWeight: 'bold' }
  }, "Atualizar ", /*#__PURE__*/React.createElement("span", {
    style: { color: '#ffffff', fontSize: '0.875rem', opacity: 0.9 }
  }, "Preços com IA")))) : /*#__PURE__*/React.createElement("button", {
    onClick: () => alert('🔒 Recurso disponível apenas no plano PREMIUM\n\nAtualize seu plano em: https://precificacao-vendas-production.up.railway.app'),
    className: "flex items-center gap-2 px-5 py-3 bg-gray-400 text-white rounded-xl font-bold opacity-60 cursor-not-allowed",
    title: "🔒 Recurso Premium - Disponível apenas no plano PREMIUM"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "🤖"), /*#__PURE__*/React.createElement("span", {
    style: { color: '#ffffff', fontWeight: 'bold' }
  }, "Atualizar ", /*#__PURE__*/React.createElement("span", {
    style: { color: '#ffffff', fontSize: '0.875rem', opacity: 0.9 }
  }, "Preços com IA")), /*#__PURE__*/React.createElement("span", {
    className: "ml-2"
  }, "🔒"))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowNewForm(!showNewForm),
    className: "flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:shadow-lg transition"
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "plus",
    className: "w-5 h-5"
  }), showNewForm ? 'Fechar' : 'Novo Item'))), /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 border-2 border-blue-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold text-gray-700 mb-2"
  }, "\uD83D\uDD0D Buscar Ingrediente"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: searchTerm,
    onChange: e => setSearchTerm(e.target.value),
    placeholder: "Digite o nome, categoria ou unidade...",
    className: "w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  })), searchTerm && /*#__PURE__*/React.createElement("button", {
    onClick: () => setSearchTerm(''),
    className: "mt-7 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
  }, "\u2716\uFE0F Limpar")), searchTerm && /*#__PURE__*/React.createElement("p", {
    className: "mt-3 text-sm text-gray-600"
  }, "\uD83D\uDCCA Mostrando ", totalFiltered, " de ", totalOriginal, " ingredientes")), showNewForm && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-lg p-6 no-print"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold text-gray-800 mb-4"
  }, "Novo Ingrediente"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col lg:flex-row gap-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Nome"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: newIngredient.name,
    onChange: e => onNewIngredientChange({
      ...newIngredient,
      name: e.target.value
    }),
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg",
    placeholder: "Ex: Picanha"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Categoria"), /*#__PURE__*/React.createElement("select", {
    value: newIngredient.category,
    onChange: e => onNewIngredientChange({
      ...newIngredient,
      category: e.target.value
    }),
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg"
  }, (window.INGREDIENT_CATEGORIES || ['Proteínas', 'Carboidratos', 'Vegetais', 'Laticínios', 'Gorduras', 'Temperos', 'Bebidas', 'Sobremesas', 'Outros']).map(cat => /*#__PURE__*/React.createElement("option", {
    key: cat,
    value: cat
  }, cat)))), /*#__PURE__*/React.createElement("div", {
    className: "col-span-2 bg-blue-50 border-2 border-blue-200 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold text-blue-900 mb-3"
  }, "\uD83D\uDCE6 Tipo de Venda"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-4"
  }, /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 cursor-pointer"
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: "unitType",
    value: "weight",
    checked: newIngredient.unitType === 'weight',
    onChange: e => onNewIngredientChange({
      ...newIngredient,
      unitType: e.target.value
    }),
    className: "w-4 h-4"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium text-gray-700"
  }, "\u2696\uFE0F Por Peso (kg/g/L/ml)")), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 cursor-pointer"
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: "unitType",
    value: "unit",
    checked: newIngredient.unitType === 'unit',
    onChange: e => onNewIngredientChange({
      ...newIngredient,
      unitType: e.target.value
    }),
    className: "w-4 h-4"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium text-gray-700"
  }, "\uD83D\uDD22 Por Unidade (p\xE3o, ovo, lata)")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Perda (%)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: newIngredient.lossPercentage == null || newIngredient.lossPercentage === 0 || newIngredient.lossPercentage === '' ? '' : newIngredient.lossPercentage,
    onChange: e => {
      const value = window.handleNumberInput ? window.handleNumberInput(e.target.value) : parseFloat(e.target.value) || 0;
      onNewIngredientChange({
        ...newIngredient,
        lossPercentage: value === '' ? 0 : value
      });
    },
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg",
    step: "1",
    placeholder: "0"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-1"
  }, "Perda no preparo (carnes, limpeza)")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Rendimento (x)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: newIngredient.yieldMultiplier == null || newIngredient.yieldMultiplier === 1 || newIngredient.yieldMultiplier === '' ? '' : newIngredient.yieldMultiplier,
    onChange: e => {
      const value = window.handleNumberInput ? window.handleNumberInput(e.target.value) : parseFloat(e.target.value) || 1.0;
      onNewIngredientChange({
        ...newIngredient,
        yieldMultiplier: value === '' ? 1.0 : value
      });
    },
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg",
    step: "0.1",
    placeholder: "1.0"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-1"
  }, "Arroz 3.0x, Massa 2.5x, Padr\xE3o 1.0x")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, newIngredient.unitType === 'unit' ? 'Custo da Embalagem (R$)' : 'Custo/Un (R$)'), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: newIngredient.costPerUnit == null || newIngredient.costPerUnit === 0 || newIngredient.costPerUnit === '' ? '' : newIngredient.costPerUnit,
    onChange: e => {
      const value = window.handleNumberInput ? window.handleNumberInput(e.target.value) : parseFloat(e.target.value) || 0;
      onNewIngredientChange({
        ...newIngredient,
        costPerUnit: value === '' ? 0 : value
      });
    },
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg",
    step: "0.01",
    placeholder: newIngredient.unitType === 'unit' ? 'Ex: 8.00' : '0.00'
  }), newIngredient.unitType === 'unit' && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-1"
  }, "Custo do pacote/caixa completa")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, newIngredient.unitType === 'unit' ? 'Qtd na Embalagem' : 'Tam. Un. (g/ml)'), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: newIngredient.unitSize == null || newIngredient.unitSize === 0 || newIngredient.unitSize === '' ? '' : newIngredient.unitSize,
    onChange: e => {
      const value = window.handleNumberInput ? window.handleNumberInput(e.target.value) : parseFloat(e.target.value) || 0;
      onNewIngredientChange({
        ...newIngredient,
        unitSize: value === '' ? 0 : value
      });
    },
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg",
    placeholder: newIngredient.unitType === 'unit' ? 'Ex: 10' : '0'
  }), newIngredient.unitType === 'unit' && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-1"
  }, "Quantas unidades vem no pacote/caixa")), newIngredient.unitType === 'unit' && newIngredient.costPerUnit > 0 && newIngredient.unitSize > 0 && /*#__PURE__*/React.createElement("div", {
    className: "col-span-2 bg-green-50 border border-green-200 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-green-900"
  }, "\uD83D\uDCB0 Custo por unidade: R$ ", (parseFloat(newIngredient.costPerUnit) / parseFloat(newIngredient.unitSize)).toFixed(4))))), window.UnitConverter && /*#__PURE__*/React.createElement("div", {
    className: "lg:w-80"
  }, /*#__PURE__*/React.createElement(window.UnitConverter, {
    onConvert: (calculatedPrice) => {
      onNewIngredientChange({
        ...newIngredient,
        costPerUnit: calculatedPrice
      });
    },
    defaultUnit: newIngredient.unitType === 'weight' ? 'kg' : 'un'
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      onAddIngredient();
      setShowNewForm(false);
    },
    className: "mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:shadow-lg transition font-semibold"
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "plus",
    className: "w-5 h-5"
  }), "Adicionar Ingrediente")), Object.entries(filteredGroupedIngredients).map(([category, ingredients]) => /*#__PURE__*/React.createElement("div", {
    key: category,
    className: "bg-white rounded-xl shadow-lg overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold text-white flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", null, category), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-normal text-orange-100"
  }, ingredients.length, " ingredientes"))), /*#__PURE__*/React.createElement("div", {
    className: "ingredients-table-wrapper overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full"
  }, /*#__PURE__*/React.createElement("thead", {
    className: "bg-gray-50 border-b-2 border-gray-200"
  }, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-center text-xs font-semibold text-gray-600 w-20"
  }, "Em Uso"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left text-xs font-semibold text-gray-600"
  }, "Nome"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left text-xs font-semibold text-gray-600"
  }, "Categoria"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left text-xs font-semibold text-gray-600"
  }, "Tipo"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left text-xs font-semibold text-gray-600"
  }, "Perda %"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left text-xs font-semibold text-gray-600"
  }, "Rend."), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left text-xs font-semibold text-gray-600"
  }, "Custo/Un (R$)"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left text-xs font-semibold text-gray-600"
  }, "Tam. Un."), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left text-xs font-semibold text-gray-600"
  }, "Custo Unit."), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-center text-xs font-semibold text-gray-600 no-print"
  }, "A\xE7\xF5es"))), /*#__PURE__*/React.createElement("tbody", null, ingredients.filter(Boolean).map((ing, idx) => /*#__PURE__*/React.createElement("tr", {
    key: ing.id,
    className: `border-b hover:bg-orange-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`
  }, editingIngredient && editingIngredient.id === ing.id ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-center"
  }, ingredientsInUse.has(ing.id) ? /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center justify-center w-6 h-6 bg-green-100 rounded-full",
    title: "Este ingrediente est\xE1 no evento"
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
    title: "Este ingrediente n\xE3o est\xE1 no evento"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-400 text-xs"
  }, "\u2014"))), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: editingIngredient.name,
    onChange: e => onEditingChange({
      ...editingIngredient,
      name: e.target.value
    }),
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg"
  })), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3"
  }, /*#__PURE__*/React.createElement("select", {
    value: editingIngredient.category || 'Proteínas',
    onChange: e => onEditingChange({
      ...editingIngredient,
      category: e.target.value
    }),
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
  }, /*#__PURE__*/React.createElement("option", {
    value: "Prote\xEDnas"
  }, "Prote\xEDnas"), /*#__PURE__*/React.createElement("option", {
    value: "Carboidratos"
  }, "Carboidratos"), /*#__PURE__*/React.createElement("option", {
    value: "Vegetais"
  }, "Vegetais"), /*#__PURE__*/React.createElement("option", {
    value: "Latic\xEDnios"
  }, "Latic\xEDnios"), /*#__PURE__*/React.createElement("option", {
    value: "Gorduras"
  }, "Gorduras"), /*#__PURE__*/React.createElement("option", {
    value: "Temperos"
  }, "Temperos"), /*#__PURE__*/React.createElement("option", {
    value: "Bebidas"
  }, "Bebidas"), /*#__PURE__*/React.createElement("option", {
    value: "Sobremesas"
  }, "Sobremesas"), /*#__PURE__*/React.createElement("option", {
    value: "Outros"
  }, "Outros"))), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3"
  }, /*#__PURE__*/React.createElement("select", {
    value: editingIngredient.unitType || 'weight',
    onChange: e => onEditingChange({
      ...editingIngredient,
      unitType: e.target.value
    }),
    className: "px-2 py-1 border border-gray-300 rounded text-sm"
  }, /*#__PURE__*/React.createElement("option", {
    value: "weight"
  }, "\u2696\uFE0F Peso"), /*#__PURE__*/React.createElement("option", {
    value: "unit"
  }, "\uD83D\uDD22 Unid"))), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: editingIngredient.lossPercentage == null || editingIngredient.lossPercentage === 0 || editingIngredient.lossPercentage === '' ? '' : isNaN(editingIngredient.lossPercentage) ? '' : editingIngredient.lossPercentage,
    onChange: e => {
      const value = window.handleNumberInput ? window.handleNumberInput(e.target.value) : parseFloat(e.target.value) || 0;
      onEditingChange({
        ...editingIngredient,
        lossPercentage: value === '' ? 0 : value,
        loss: value === '' ? 0 : value
      });
    },
    className: "w-20 px-3 py-2 border border-gray-300 rounded-lg",
    placeholder: "0"
  })), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: editingIngredient.yieldMultiplier == null || editingIngredient.yieldMultiplier === 1 || editingIngredient.yieldMultiplier === '' ? '' : isNaN(editingIngredient.yieldMultiplier) ? '' : editingIngredient.yieldMultiplier,
    onChange: e => {
      const value = window.handleNumberInput ? window.handleNumberInput(e.target.value) : parseFloat(e.target.value) || 1.0;
      onEditingChange({
        ...editingIngredient,
        yieldMultiplier: value === '' ? 1.0 : value
      });
    },
    className: "w-20 px-3 py-2 border border-gray-300 rounded-lg",
    step: "0.1",
    placeholder: "1.0"
  })), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: editingIngredient.costPerUnit == null || editingIngredient.costPerUnit === 0 || editingIngredient.costPerUnit === '' ? '' : isNaN(editingIngredient.costPerUnit) ? '' : editingIngredient.costPerUnit,
    onChange: e => {
      const value = window.handleNumberInput ? window.handleNumberInput(e.target.value) : parseFloat(e.target.value) || 0;
      onEditingChange({
        ...editingIngredient,
        costPerUnit: value === '' ? 0 : value
      });
    },
    className: "w-24 px-3 py-2 border border-gray-300 rounded-lg",
    step: "0.01",
    placeholder: "0.00"
  })), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: editingIngredient.unitSize == null || editingIngredient.unitSize === 0 || editingIngredient.unitSize === '' ? '' : isNaN(editingIngredient.unitSize) ? '' : editingIngredient.unitSize,
    onChange: e => {
      const value = window.handleNumberInput ? window.handleNumberInput(e.target.value) : parseFloat(e.target.value) || 0;
      onEditingChange({
        ...editingIngredient,
        unitSize: value === '' ? 0 : value
      });
    },
    className: "w-24 px-3 py-2 border border-gray-300 rounded-lg"
  })), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-right"
  }, editingIngredient.unitType === 'unit' ? editingIngredient.unitSize > 0 ? `R$ ${(parseFloat(editingIngredient.costPerUnit) / parseFloat(editingIngredient.unitSize)).toFixed(4)}/un` : 'R$ 0.0000/un' : `R$ ${(calculateCostPerGramMl(editingIngredient) || 0).toFixed(4)}/g`), /*#__PURE__*/React.createElement("td", {
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
    className: "px-4 py-3 text-center"
  }, ingredientsInUse.has(ing.id) ? /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center justify-center w-6 h-6 bg-green-100 rounded-full",
    title: "Este ingrediente est\xE1 no evento"
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
    title: "Este ingrediente n\xE3o est\xE1 no evento"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-400 text-xs"
  }, "\u2014"))), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 font-medium text-gray-800"
  }, ing.name), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-gray-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded"
  }, ing.category || 'Outros')), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-gray-700"
  }, ing.unitType === 'unit' ? '🔢 Unid' : '⚖️ Peso'), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-gray-700"
  }, (() => {
    // Suportar tanto lossPercentage (já em %) quanto loss (decimal 0-1)
    const loss = parseFloat(ing.lossPercentage) || parseFloat(ing.loss) || 0;
    // Se loss está entre 0-1, é decimal, converter para %
    const lossPercent = loss > 0 && loss <= 1 ? loss * 100 : loss;
    return lossPercent.toFixed(0) + "%";
  })()), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-gray-700"
  }, (parseFloat(ing.yieldMultiplier) || 1.0).toFixed(1), "x"), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-gray-700"
  }, "R$ ", (parseFloat(ing.costPerUnit) || 0).toFixed(2)), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-gray-700"
  }, ing.unitSize || 0, ing.unitType === 'unit' ? ' un' : ' g'), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-right text-gray-700"
  }, ing.unitType === 'unit' ? ing.unitSize > 0 ? `R$ ${(ing.costPerUnit / ing.unitSize).toFixed(4)}/un` : 'R$ 0.0000/un' : `R$ ${(calculateCostPerGramMl(ing) || 0).toFixed(4)}/g`), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 no-print"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 justify-center"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onStartEditing(ing),
    className: "text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50",
    title: "Editar"
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "edit",
    className: "w-5 h-5"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => onDeleteIngredient(ing.id),
    className: "text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50",
    title: "Excluir"
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "trash",
    className: "w-5 h-5"
  })))))))))), /*#__PURE__*/React.createElement("div", {
    className: "ingredients-mobile-cards"
  }, ingredients.filter(Boolean).map(ing => editingIngredient && editingIngredient.id === ing.id ? /*#__PURE__*/React.createElement("div", {
    key: ing.id,
    className: "ingredient-card ingredient-edit-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ingredient-card-header"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "ingredient-card-title"
  }, "\u270F\uFE0F Editando")), /*#__PURE__*/React.createElement("div", {
    className: "ingredient-card-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ingredient-card-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "ingredient-card-field-label"
  }, "Nome"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: editingIngredient.name,
    onChange: e => onEditingChange({...editingIngredient, name: e.target.value})
  })), /*#__PURE__*/React.createElement("div", {
    className: "ingredient-card-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "ingredient-card-field-label"
  }, "Categoria"), /*#__PURE__*/React.createElement("select", {
    value: editingIngredient.category || 'Proteínas',
    onChange: e => onEditingChange({...editingIngredient, category: e.target.value})
  }, /*#__PURE__*/React.createElement("option", {value: "Proteínas"}, "Proteínas"), /*#__PURE__*/React.createElement("option", {value: "Carboidratos"}, "Carboidratos"), /*#__PURE__*/React.createElement("option", {value: "Vegetais"}, "Vegetais"), /*#__PURE__*/React.createElement("option", {value: "Laticínios"}, "Laticínios"), /*#__PURE__*/React.createElement("option", {value: "Gorduras"}, "Gorduras"), /*#__PURE__*/React.createElement("option", {value: "Temperos"}, "Temperos"), /*#__PURE__*/React.createElement("option", {value: "Bebidas"}, "Bebidas"), /*#__PURE__*/React.createElement("option", {value: "Sobremesas"}, "Sobremesas"), /*#__PURE__*/React.createElement("option", {value: "Outros"}, "Outros"))), /*#__PURE__*/React.createElement("div", {
    className: "ingredient-card-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "ingredient-card-field-label"
  }, "Tipo"), /*#__PURE__*/React.createElement("select", {
    value: editingIngredient.unitType || 'weight',
    onChange: e => onEditingChange({...editingIngredient, unitType: e.target.value})
  }, /*#__PURE__*/React.createElement("option", {value: "weight"}, "⚖️ Peso"), /*#__PURE__*/React.createElement("option", {value: "unit"}, "🔢 Unidade"))), /*#__PURE__*/React.createElement("div", {
    className: "ingredient-card-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "ingredient-card-field-label"
  }, "Perda %"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: editingIngredient.lossPercentage == null || editingIngredient.lossPercentage === 0 || editingIngredient.lossPercentage === '' ? '' : isNaN(editingIngredient.lossPercentage) ? '' : editingIngredient.lossPercentage,
    onChange: e => {
      const value = window.handleNumberInput ? window.handleNumberInput(e.target.value) : parseFloat(e.target.value) || 0;
      onEditingChange({...editingIngredient, lossPercentage: value === '' ? 0 : value, loss: value === '' ? 0 : value});
    },
    placeholder: "0"
  })), /*#__PURE__*/React.createElement("div", {
    className: "ingredient-card-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "ingredient-card-field-label"
  }, "Rendimento (x)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: editingIngredient.yieldMultiplier == null || editingIngredient.yieldMultiplier === 1 || editingIngredient.yieldMultiplier === '' ? '' : isNaN(editingIngredient.yieldMultiplier) ? '' : editingIngredient.yieldMultiplier,
    onChange: e => {
      const value = window.handleNumberInput ? window.handleNumberInput(e.target.value) : parseFloat(e.target.value) || 1.0;
      onEditingChange({...editingIngredient, yieldMultiplier: value === '' ? 1.0 : value});
    },
    step: "0.1",
    placeholder: "1.0"
  })), /*#__PURE__*/React.createElement("div", {
    className: "ingredient-card-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "ingredient-card-field-label"
  }, editingIngredient.unitType === 'unit' ? 'Custo Embalagem' : 'Custo/Un (R$)'), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: editingIngredient.costPerUnit == null || editingIngredient.costPerUnit === 0 || editingIngredient.costPerUnit === '' ? '' : isNaN(editingIngredient.costPerUnit) ? '' : editingIngredient.costPerUnit,
    onChange: e => {
      const value = window.handleNumberInput ? window.handleNumberInput(e.target.value) : parseFloat(e.target.value) || 0;
      onEditingChange({...editingIngredient, costPerUnit: value === '' ? 0 : value});
    },
    step: "0.01",
    placeholder: "0.00"
  })), /*#__PURE__*/React.createElement("div", {
    className: "ingredient-card-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "ingredient-card-field-label"
  }, editingIngredient.unitType === 'unit' ? 'Qtd Embalagem' : 'Tam. Un. (g/ml)'), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: editingIngredient.unitSize == null || editingIngredient.unitSize === 0 || editingIngredient.unitSize === '' ? '' : isNaN(editingIngredient.unitSize) ? '' : editingIngredient.unitSize,
    onChange: e => {
      const value = window.handleNumberInput ? window.handleNumberInput(e.target.value) : parseFloat(e.target.value) || 0;
      onEditingChange({...editingIngredient, unitSize: value === '' ? 0 : value});
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "ingredient-card-actions"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onSaveEditing,
    style: {background: '#059669', color: 'white'}
  }, "\u2714\uFE0F Salvar"), /*#__PURE__*/React.createElement("button", {
    onClick: onCancelEditing,
    style: {background: '#6b7280', color: 'white'}
  }, "\u274C Cancelar"))) : /*#__PURE__*/React.createElement("div", {
    key: ing.id,
    className: "ingredient-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ingredient-card-header"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "ingredient-card-title"
  }, ing.name), /*#__PURE__*/React.createElement("span", {
    className: "ingredient-card-badge",
    style: {background: '#fed7aa', color: '#9a3412'}
  }, ing.category || 'Outros')), /*#__PURE__*/React.createElement("div", {
    className: "ingredient-card-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ingredient-card-field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ingredient-card-field-label"
  }, "Tipo"), /*#__PURE__*/React.createElement("span", {
    className: "ingredient-card-field-value"
  }, ing.unitType === 'unit' ? '🔢 Unidade' : '⚖️ Peso')), /*#__PURE__*/React.createElement("div", {
    className: "ingredient-card-field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ingredient-card-field-label"
  }, "Perda"), /*#__PURE__*/React.createElement("span", {
    className: "ingredient-card-field-value"
  }, (() => {
    // Suportar tanto lossPercentage (já em %) quanto loss (decimal 0-1)
    const loss = parseFloat(ing.lossPercentage) || parseFloat(ing.loss) || 0;
    const lossPercent = loss > 0 && loss <= 1 ? loss * 100 : loss;
    return lossPercent.toFixed(0) + "%";
  })())), /*#__PURE__*/React.createElement("div", {
    className: "ingredient-card-field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ingredient-card-field-label"
  }, "Rendimento"), /*#__PURE__*/React.createElement("span", {
    className: "ingredient-card-field-value"
  }, (parseFloat(ing.yieldMultiplier) || 1.0).toFixed(1), "x")), /*#__PURE__*/React.createElement("div", {
    className: "ingredient-card-field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ingredient-card-field-label"
  }, "Custo/Un"), /*#__PURE__*/React.createElement("span", {
    className: "ingredient-card-field-value"
  }, "R$ ", (parseFloat(ing.costPerUnit) || 0).toFixed(2))), /*#__PURE__*/React.createElement("div", {
    className: "ingredient-card-field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ingredient-card-field-label"
  }, "Tamanho"), /*#__PURE__*/React.createElement("span", {
    className: "ingredient-card-field-value"
  }, ing.unitSize || 0, ing.unitType === 'unit' ? ' un' : ' g')), /*#__PURE__*/React.createElement("div", {
    className: "ingredient-card-field",
    style: {gridColumn: '1 / -1'}
  }, /*#__PURE__*/React.createElement("span", {
    className: "ingredient-card-field-label"
  }, "Custo Unit\xE1rio"), /*#__PURE__*/React.createElement("span", {
    className: "ingredient-card-field-value highlight"
  }, ing.unitType === 'unit' ? ing.unitSize > 0 ? `R$ ${(ing.costPerUnit / ing.unitSize).toFixed(4)}/un` : 'R$ 0.0000/un' : `R$ ${(calculateCostPerGramMl(ing) || 0).toFixed(4)}/g`))), /*#__PURE__*/React.createElement("div", {
    className: "ingredient-card-actions"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onStartEditing(ing),
    style: {background: '#3b82f6', color: 'white'}
  }, /*#__PURE__*/React.createElement(Icon, {type: "edit", className: "w-5 h-5"}), "Editar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onDeleteIngredient(ing.id),
    style: {background: '#ef4444', color: 'white'}
  }, /*#__PURE__*/React.createElement(Icon, {type: "trash", className: "w-5 h-5"}), "Excluir"))))))), window.IngredientTemplates && /*#__PURE__*/React.createElement(window.IngredientTemplates, {
    isOpen: showTemplates,
    onClose: () => setShowTemplates(false),
    onSelectTemplate: handleSelectTemplate
  }));
}

// Expor ao window para uso com Babel
window.IngredientsDatabase = IngredientsDatabase;
})();
