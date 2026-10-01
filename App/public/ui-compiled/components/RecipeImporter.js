(function() {
/**
 * RecipeImporter - Importação inteligente de receitas com IA
 *
 * Permite colar texto de receita e processa com GPT-4 para:
 * - Extrair ingredientes estruturados
 * - Fazer matching com base existente
 * - Estimar preços para itens novos
 * - Criar prato automaticamente
 */
function RecipeImporter({ isOpen, onClose, onSuccess }) {
  const { useState } = React;

  const [step, setStep] = useState(1); // 1: Input, 2: Review, 3: Success
  const [recipeText, setRecipeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [editedIngredients, setEditedIngredients] = useState([]);
  const [editedDishName, setEditedDishName] = useState('');
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  // Reset ao fechar
  const handleClose = () => {
    setStep(1);
    setRecipeText('');
    setParsedData(null);
    setEditedIngredients([]);
    setEditedDishName('');
    setError(null);
    onClose();
  };

  // Step 1: Processar receita com IA
  const handleProcessRecipe = async () => {
    if (!recipeText.trim() || recipeText.trim().length < 10) {
      setError('Por favor, cole uma receita válida (mínimo 10 caracteres)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const API_URL = window.APP_CONFIG?.backend?.baseURL || 'https://precificacao-api-production.up.railway.app';
      const token = localStorage.getItem('accessToken');

      console.log('🤖 Enviando receita para processamento...');

      const response = await fetch(`${API_URL}/api/recipes/parse`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ recipeText })
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao processar receita');
      }

      console.log('✅ Receita processada:', result.data);

      setParsedData(result.data);
      setEditedIngredients(result.data.ingredients);
      setEditedDishName(result.data.dishName);
      setStep(2); // Ir para revisão

    } catch (err) {
      console.error('❌ Erro ao processar receita:', err);
      setError(err.message || 'Erro ao processar receita. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Criar prato com ingredientes
  const handleCreateDish = async () => {
    setLoading(true);
    setError(null);

    try {
      const API_URL = window.APP_CONFIG?.backend?.baseURL || 'https://precificacao-api-production.up.railway.app';
      const token = localStorage.getItem('accessToken');

      console.log('🍽️ Criando prato...');

      const response = await fetch(`${API_URL}/api/recipes/create-dish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dishName: editedDishName,
          ingredients: editedIngredients,
          recipeText: recipeText
        })
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar prato');
      }

      console.log('✅ Prato criado:', result.data);

      setStep(3); // Ir para sucesso

      // Chamar callback de sucesso após 2 segundos
      setTimeout(() => {
        if (onSuccess) onSuccess(result.data);
        handleClose();
      }, 2000);

    } catch (err) {
      console.error('❌ Erro ao criar prato:', err);
      setError(err.message || 'Erro ao criar prato. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Atualizar ingrediente específico
  const updateIngredient = (index, field, value) => {
    const updated = [...editedIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setEditedIngredients(updated);
  };

  return React.createElement('div', {
    className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4',
    onClick: (e) => e.target === e.currentTarget && handleClose()
  },
    React.createElement('div', {
      className: 'bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col'
    },
      // Header
      React.createElement('div', {
        className: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex items-center justify-between'
      },
        React.createElement('div', {},
          React.createElement('h2', { className: 'text-2xl font-bold flex items-center gap-3' },
            '🤖 Importação Inteligente de Receitas'
          ),
          React.createElement('p', { className: 'text-indigo-100 text-sm mt-1' },
            step === 1 ? 'Cole o texto da sua receita' :
            step === 2 ? 'Revise os ingredientes detectados' :
            'Prato criado com sucesso!'
          )
        ),
        React.createElement('button', {
          onClick: handleClose,
          className: 'text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition'
        }, '✕')
      ),

      // Content
      React.createElement('div', { className: 'flex-1 overflow-y-auto p-6' },
        // Step 1: Input de receita
        step === 1 && React.createElement('div', { className: 'space-y-4' },
          React.createElement('div', {},
            React.createElement('label', { className: 'block text-sm font-semibold text-gray-700 mb-2' },
              '📝 Cole sua receita aqui:'
            ),
            React.createElement('textarea', {
              value: recipeText,
              onChange: (e) => setRecipeText(e.target.value),
              placeholder: `Exemplo:

Picanha ao Molho de Tomate (4 pessoas)

Ingredientes:
- 800g de picanha
- 3 tomates médios
- 1 cebola grande
- 200ml de vinho tinto
- 2 dentes de alho
- Sal e pimenta a gosto
- 2 colheres de azeite

Modo de preparo:
1. Tempere a picanha com sal e pimenta...
2. Doure a carne em fogo alto...
etc.`,
              className: 'w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm',
              rows: 15
            })
          ),
          error && React.createElement('div', {
            className: 'bg-red-50 border-l-4 border-red-500 p-4 rounded'
          },
            React.createElement('p', { className: 'text-red-700 font-semibold' }, '❌ ', error)
          ),
          React.createElement('div', { className: 'bg-blue-50 border-l-4 border-blue-500 p-4 rounded' },
            React.createElement('p', { className: 'text-sm font-semibold text-blue-900 mb-2' },
              '💡 Dicas:'
            ),
            React.createElement('ul', { className: 'text-sm text-blue-800 space-y-1 list-disc list-inside' },
              React.createElement('li', {}, 'Cole receitas de qualquer fonte (sites, livros, WhatsApp)'),
              React.createElement('li', {}, 'Inclua quantidades e unidades (kg, g, ml, L, un)'),
              React.createElement('li', {}, 'A IA identifica ingredientes automaticamente'),
              React.createElement('li', {}, 'Ingredientes já cadastrados serão detectados'),
              React.createElement('li', {}, 'Preços faltantes serão estimados para você revisar')
            )
          )
        ),

        // Step 2: Review de ingredientes
        step === 2 && parsedData && React.createElement('div', { className: 'space-y-4' },
          React.createElement('div', {},
            React.createElement('label', { className: 'block text-sm font-semibold text-gray-700 mb-2' },
              '🍽️ Nome do Prato'
            ),
            React.createElement('input', {
              type: 'text',
              value: editedDishName,
              onChange: (e) => setEditedDishName(e.target.value),
              className: 'w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500',
              placeholder: 'Nome do prato'
            })
          ),

          React.createElement('div', { className: 'bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200' },
            React.createElement('p', { className: 'text-sm font-semibold text-gray-700 mb-2' },
              '📊 Estatísticas:'
            ),
            React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3 text-sm' },
              React.createElement('div', { className: 'bg-white rounded-lg p-2 text-center' },
                React.createElement('div', { className: 'text-2xl font-bold text-gray-800' }, parsedData.stats.total),
                React.createElement('div', { className: 'text-xs text-gray-600' }, 'Total')
              ),
              React.createElement('div', { className: 'bg-white rounded-lg p-2 text-center' },
                React.createElement('div', { className: 'text-2xl font-bold text-green-600' }, parsedData.stats.matched),
                React.createElement('div', { className: 'text-xs text-gray-600' }, 'Já Cadastrados')
              ),
              React.createElement('div', { className: 'bg-white rounded-lg p-2 text-center' },
                React.createElement('div', { className: 'text-2xl font-bold text-blue-600' }, parsedData.stats.new),
                React.createElement('div', { className: 'text-xs text-gray-600' }, 'Novos')
              ),
              React.createElement('div', { className: 'bg-white rounded-lg p-2 text-center' },
                React.createElement('div', { className: 'text-2xl font-bold text-orange-600' }, parsedData.stats.needsPrice),
                React.createElement('div', { className: 'text-xs text-gray-600' }, 'Preço Estimado')
              )
            )
          ),

          React.createElement('div', {},
            React.createElement('h3', { className: 'text-lg font-bold text-gray-800 mb-2' },
              '📝 Ingredientes Detectados (revise e edite se necessário):'
            ),
            React.createElement('div', { className: 'bg-blue-50 border-l-4 border-blue-500 p-3 rounded mb-3 text-sm' },
              React.createElement('p', { className: 'font-semibold text-blue-900 mb-1' }, '💡 Entenda as colunas:'),
              React.createElement('ul', { className: 'text-blue-800 space-y-1 text-xs' },
                React.createElement('li', {}, '📏 Qtd. Receita: Quantidade necessária NA RECEITA (ex: 395g, 2L, 3un)'),
                React.createElement('li', {}, '💰 Preço Compra: Quanto você PAGA por unidade (ex: R$ 126,00 por lata)'),
                React.createElement('li', {}, '📦 Tamanho Compra: Tamanho da unidade que você COMPRA (ex: 395g, 1kg, 1L)'),
                React.createElement('li', {}, '📉 Perda: % desperdiçado/descartado (ex: casca, osso, evaporação)'),
                React.createElement('li', {}, '💵 Valor Total: Custo deste ingrediente nesta receita (incluindo perda)')
              )
            ),
            React.createElement('div', { className: 'space-y-2 max-h-96 overflow-y-auto' },
              editedIngredients.map((ing, index) =>
                React.createElement('div', {
                  key: index,
                  className: `border-2 rounded-lg p-3 ${
                    ing.matchedInDatabase
                      ? (ing.estimatedPrice ? 'border-orange-300 bg-orange-50' : 'border-green-300 bg-green-50')
                      : 'border-blue-300 bg-blue-50'
                  }`
                },
                  React.createElement('div', { className: 'flex items-center gap-2 mb-2' },
                    React.createElement('span', { className: 'text-lg' },
                      ing.matchedInDatabase
                        ? (ing.estimatedPrice ? '⚠️' : '✅')
                        : '🆕'
                    ),
                    React.createElement('input', {
                      type: 'text',
                      value: ing.name,
                      onChange: (e) => updateIngredient(index, 'name', e.target.value),
                      className: 'flex-1 px-3 py-1 border border-gray-300 rounded font-semibold'
                    }),
                    React.createElement('span', { className: 'text-xs px-2 py-1 bg-white rounded border border-gray-300' },
                      ing.category
                    )
                  ),
                  React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-6 gap-2 text-sm' },
                    React.createElement('div', {},
                      React.createElement('label', { className: 'text-xs text-gray-600 font-semibold' }, '📏 Qtd. Receita'),
                      React.createElement('div', { className: 'flex gap-1' },
                        React.createElement('input', {
                          type: 'number',
                          step: '0.01',
                          value: ing.quantity,
                          onChange: (e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0),
                          className: 'w-full px-2 py-1 border border-gray-300 rounded'
                        }),
                        React.createElement('select', {
                          value: ing.unit,
                          onChange: (e) => updateIngredient(index, 'unit', e.target.value),
                          className: 'px-1 py-1 border border-gray-300 rounded text-xs'
                        },
                          React.createElement('option', { value: 'g' }, 'g'),
                          React.createElement('option', { value: 'kg' }, 'kg'),
                          React.createElement('option', { value: 'ml' }, 'ml'),
                          React.createElement('option', { value: 'L' }, 'L'),
                          React.createElement('option', { value: 'un' }, 'un'),
                          React.createElement('option', { value: 'dz' }, 'dz')
                        )
                      )
                    ),
                    React.createElement('div', {},
                      React.createElement('label', { className: 'text-xs text-gray-600' }, '💰 Preço Compra (R$)'),
                      React.createElement('input', {
                        type: 'number',
                        step: '0.01',
                        value: ing.costPerUnit,
                        onChange: (e) => updateIngredient(index, 'costPerUnit', parseFloat(e.target.value) || 0),
                        className: 'w-full px-2 py-1 border border-gray-300 rounded'
                      })
                    ),
                    React.createElement('div', {},
                      React.createElement('label', { className: 'text-xs text-gray-600' }, '📦 Tamanho Compra'),
                      React.createElement('div', { className: 'flex gap-1' },
                        React.createElement('input', {
                          type: 'number',
                          value: ing.unitSize,
                          onChange: (e) => updateIngredient(index, 'unitSize', parseFloat(e.target.value) || 1),
                          className: 'w-full px-2 py-1 border border-gray-300 rounded'
                        }),
                        React.createElement('span', { className: 'text-xs text-gray-500 self-center whitespace-nowrap' },
                          ing.unitType === 'weight' ? 'g' : ing.unitType === 'volume' ? 'ml' : 'un'
                        )
                      )
                    ),
                    React.createElement('div', {},
                      React.createElement('label', { className: 'text-xs text-gray-600' }, '📉 Perda (%)'),
                      React.createElement('input', {
                        type: 'number',
                        step: '1',
                        value: (ing.loss * 100).toFixed(0),
                        onChange: (e) => updateIngredient(index, 'loss', parseFloat(e.target.value) / 100 || 0),
                        className: 'w-full px-2 py-1 border border-gray-300 rounded'
                      })
                    ),
                    React.createElement('div', {},
                      React.createElement('label', { className: 'text-xs text-gray-600' }, '💵 Valor Total'),
                      React.createElement('div', { className: 'text-sm font-bold pt-2 text-green-700' },
                        (() => {
                          // Converter quantidade para unidade base (g, ml, ou un)
                          let quantityInBaseUnit = ing.quantity || 0;
                          if (ing.unit === 'kg') quantityInBaseUnit *= 1000;
                          if (ing.unit === 'L') quantityInBaseUnit *= 1000;
                          if (ing.unit === 'dz') quantityInBaseUnit *= 12;

                          // Calcular custo unitário (por g, ml, ou un)
                          const unitCost = (ing.costPerUnit || 0) / (ing.unitSize || 1);

                          // Calcular valor total (quantidade × custo unitário × (1 + perda))
                          const totalCost = quantityInBaseUnit * unitCost * (1 + (ing.loss || 0));

                          return `R$ ${totalCost.toFixed(2)}`;
                        })()
                      )
                    ),
                    React.createElement('div', {},
                      React.createElement('label', { className: 'text-xs text-gray-600' }, 'Status'),
                      React.createElement('div', { className: 'text-xs font-semibold pt-2' },
                        ing.matchedInDatabase
                          ? (ing.estimatedPrice ? '⚠️ Estimado' : '✅ OK')
                          : '🆕 Novo'
                      )
                    )
                  )
                )
              )
            )
          ),

          error && React.createElement('div', {
            className: 'bg-red-50 border-l-4 border-red-500 p-4 rounded'
          },
            React.createElement('p', { className: 'text-red-700 font-semibold' }, '❌ ', error)
          )
        ),

        // Step 3: Sucesso
        step === 3 && React.createElement('div', { className: 'text-center py-12' },
          React.createElement('div', { className: 'text-6xl mb-4' }, '✅'),
          React.createElement('h3', { className: 'text-2xl font-bold text-green-600 mb-2' },
            'Prato criado com sucesso!'
          ),
          React.createElement('p', { className: 'text-gray-600' },
            'Ingredientes processados e prato adicionado ao sistema.'
          )
        )
      ),

      // Footer
      React.createElement('div', {
        className: 'bg-gray-50 p-4 border-t border-gray-200 flex justify-between items-center'
      },
        React.createElement('button', {
          onClick: handleClose,
          className: 'px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold',
          disabled: loading
        }, step === 3 ? 'Fechar' : 'Cancelar'),

        step === 1 && React.createElement('button', {
          onClick: handleProcessRecipe,
          disabled: loading || !recipeText.trim(),
          className: 'px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
        },
          loading && React.createElement('span', { className: 'animate-spin' }, '⏳'),
          loading ? 'Processando com IA...' : '🤖 Processar Receita'
        ),

        step === 2 && React.createElement('button', {
          onClick: handleCreateDish,
          disabled: loading,
          className: 'px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
        },
          loading && React.createElement('span', { className: 'animate-spin' }, '⏳'),
          loading ? 'Criando Prato...' : '✅ Criar Prato'
        )
      )
    )
  );
}

window.RecipeImporter = RecipeImporter;
})();
