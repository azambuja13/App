(function() {
/**
 * Menu Generator Component
 * Gera cardápio automaticamente usando IA baseado no evento
 */

const API_URL = window.APP_CONFIG?.backend?.baseURL || 'https://precificacao-api-production.up.railway.app';

function MenuGenerator({ isOpen, onClose, onSuccess, event }) {
  const [step, setStep] = React.useState(1); // 1: Input, 2: Processing, 3: Review
  const [preferences, setPreferences] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [generatedMenu, setGeneratedMenu] = React.useState(null);

  React.useEffect(() => {
    if (isOpen) {
      setStep(1);
      setPreferences('');
      setError(null);
      setGeneratedMenu(null);
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    console.log('🚀 [MenuGenerator] handleGenerate chamado');
    console.log('📦 [MenuGenerator] event recebido:', event);
    console.log('🔍 [MenuGenerator] event.id:', event?.id);
    console.log('🔍 [MenuGenerator] event.name:', event?.name);
    console.log('🔍 [MenuGenerator] event.people:', event?.people);

    setLoading(true);
    setError(null);
    setStep(2);

    try {
      const token = localStorage.getItem('accessToken');

      // Validar eventId
      if (!event || !event.id) {
        console.error('❌ [MenuGenerator] Validação falhou:', { hasEvent: !!event, hasId: !!event?.id, event });
        throw new Error('Evento não encontrado. Por favor, recarregue a página.');
      }

      const requestBody = {
        eventId: event.id,
        preferences: preferences.trim() || undefined
      };

      console.log('🎯 Gerando cardápio para evento:', event);
      console.log('📤 Request body:', requestBody);

      const response = await fetch(`${API_URL}/api/savedMenus/generate-with-ai`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao gerar cardápio');
      }

      console.log('✅ Cardápio gerado:', result.data);

      setGeneratedMenu(result.data);
      setStep(3);
    } catch (err) {
      console.error('❌ Erro ao gerar cardápio:', err);
      setError(err.message || 'Erro ao gerar cardápio. Tente novamente.');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToMenu = async () => {
    setLoading(true);
    setError(null);

    try {
      const menuManager = window.menuManager;
      const dishManager = window.ManagerHelper?.getDishManager() || window.PrecificacaoAPI?.dishManager || window.dishManager;

      if (!menuManager) {
        throw new Error('MenuManager não disponível. Por favor, recarregue a página.');
      }

      if (!dishManager) {
        throw new Error('DishManager não disponível. Por favor, recarregue a página.');
      }

      const token = localStorage.getItem('accessToken');
      let addedCount = 0;
      let skippedCount = 0;
      let createdCount = 0;

      // Adicionar cada prato sugerido ao cardápio ativo
      for (const dish of generatedMenu.dishes) {
        if (dish.matchedInDatabase && dish.matchedId) {
          // Prato já existe no banco - adicionar direto
          try {
            // ✅ Buscar o prato completo do banco COM ingredientes (não cache!)
            let fullDish = null;
            if (window.PrecificacaoAPI?.api) {
              console.log(`📡 Buscando prato completo da API: ${dish.name}`);
              const response = await window.PrecificacaoAPI.api.getDish(dish.matchedId);
              fullDish = response.data || response;
            } else {
              // Fallback para cache local (planos offline)
              fullDish = dishManager.getById
                ? await dishManager.getById(dish.matchedId)
                : dishManager.getDishById?.(dish.matchedId);
            }

            if (!fullDish) {
              console.warn(`⚠️ Prato não encontrado: ${dish.name} (ID: ${dish.matchedId})`);
              skippedCount++;
              continue;
            }

            // Adicionar ao cardápio usando o método correto (sempre 1 porção por pessoa)
            await menuManager.addDishToMenu(fullDish, 1);
            console.log(`✅ Prato adicionado: ${dish.name} (1 porção por pessoa)`);
            addedCount++;
          } catch (error) {
            console.error(`❌ Erro ao adicionar prato ${dish.name}:`, error);
            skippedCount++;
          }
        } else {
          // Prato NÃO existe no banco - criar automaticamente com IA
          try {
            console.log(`🤖 Criando prato automaticamente: ${dish.name}`);

            const response = await fetch(`${API_URL}/api/recipes/create-from-name`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                dishName: dish.name,
                category: dish.category
              })
            });

            if (!response.ok) {
              throw new Error(`Erro HTTP: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
              throw new Error(result.error || 'Erro ao criar prato');
            }

            console.log(`✅ Prato criado: ${result.data.dishName} (ID: ${result.data.dishId})`);
            createdCount++;

            // Invalidar cache do dishManager
            if (window.PrecificacaoAPI?.dishManager) {
              window.PrecificacaoAPI.dishManager.cacheTime = null;
              window.PrecificacaoAPI.dishManager.dishes = [];
            }

            // ✅ Buscar o prato recém-criado COM ingredientes (não cache!)
            let newDish = null;
            if (window.PrecificacaoAPI?.api) {
              console.log(`📡 Buscando prato recém-criado da API: ${dish.name}`);
              const response = await window.PrecificacaoAPI.api.getDish(result.data.dishId);
              newDish = response.data || response;
            } else {
              // Fallback para cache local (planos offline)
              newDish = dishManager.getById
                ? await dishManager.getById(result.data.dishId)
                : dishManager.getDishById?.(result.data.dishId);
            }

            if (!newDish) {
              console.warn(`⚠️ Prato criado mas não encontrado: ${dish.name}`);
              skippedCount++;
              continue;
            }

            // Adicionar ao cardápio (sempre 1 porção por pessoa)
            await menuManager.addDishToMenu(newDish, 1);
            console.log(`✅ Prato recém-criado adicionado ao cardápio: ${dish.name} (1 porção por pessoa)`);
            addedCount++;
          } catch (error) {
            console.error(`❌ Erro ao criar prato ${dish.name}:`, error);
            skippedCount++;
          }
        }
      }

      console.log(`📊 Resumo: ${addedCount} pratos adicionados, ${createdCount} pratos criados, ${skippedCount} pulados`);

      setLoading(false);
      if (onSuccess) {
        onSuccess(generatedMenu);
      }
    } catch (err) {
      console.error('❌ Erro ao adicionar pratos:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return /*#__PURE__*/React.createElement('div', {
    className: 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4',
    onClick: handleClose
  },
    /*#__PURE__*/React.createElement('div', {
      className: 'bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col',
      onClick: (e) => e.stopPropagation()
    },
      // Header
      /*#__PURE__*/React.createElement('div', {
        className: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6'
      },
        /*#__PURE__*/React.createElement('h2', { className: 'text-2xl font-bold' }, '🤖 Montar Cardápio com IA'),
        /*#__PURE__*/React.createElement('p', { className: 'text-indigo-100 mt-1 text-sm' },
          `Evento: ${event.name} - ${event.people} pessoas`
        )
      ),

      // Body
      /*#__PURE__*/React.createElement('div', { className: 'flex-1 overflow-y-auto p-6' },
        // Step 1: Input de preferências
        step === 1 && /*#__PURE__*/React.createElement('div', {},
          /*#__PURE__*/React.createElement('div', { className: 'bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-4' },
            /*#__PURE__*/React.createElement('p', { className: 'text-sm text-blue-800' },
              '💡 A IA vai sugerir um cardápio completo baseado nos dados do seu evento e nos pratos que você já tem cadastrados.'
            )
          ),
          /*#__PURE__*/React.createElement('label', { className: 'block text-sm font-semibold text-gray-700 mb-2' },
            '💭 Preferências (opcional)'
          ),
          /*#__PURE__*/React.createElement('textarea', {
            value: preferences,
            onChange: (e) => setPreferences(e.target.value),
            className: 'w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none',
            rows: 4,
            placeholder: 'Ex: Comida japonesa, sem lactose, vegetariano, orçamento baixo, etc...'
          }),
          /*#__PURE__*/React.createElement('p', { className: 'text-xs text-gray-500 mt-2' },
            'Deixe em branco para uma sugestão padrão baseada no tipo de evento.'
          ),
          error && /*#__PURE__*/React.createElement('div', {
            className: 'bg-red-50 border-l-4 border-red-500 p-4 rounded mt-4'
          },
            /*#__PURE__*/React.createElement('p', { className: 'text-red-700 font-semibold' }, '❌ ', error)
          )
        ),

        // Step 2: Processing
        step === 2 && /*#__PURE__*/React.createElement('div', { className: 'text-center py-12' },
          /*#__PURE__*/React.createElement('div', { className: 'inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-4' }),
          /*#__PURE__*/React.createElement('h3', { className: 'text-xl font-bold text-gray-800 mb-2' },
            'Montando cardápio...'
          ),
          /*#__PURE__*/React.createElement('p', { className: 'text-gray-600' },
            'A IA está analisando os pratos disponíveis e criando a melhor combinação para seu evento.'
          )
        ),

        // Step 3: Review
        step === 3 && generatedMenu && /*#__PURE__*/React.createElement('div', {},
          /*#__PURE__*/React.createElement('div', { className: 'bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 mb-4 border border-green-200' },
            /*#__PURE__*/React.createElement('h3', { className: 'text-lg font-bold text-gray-800 mb-1' },
              generatedMenu.menuName
            ),
            /*#__PURE__*/React.createElement('p', { className: 'text-sm text-gray-700' },
              generatedMenu.description
            )
          ),

          /*#__PURE__*/React.createElement('div', { className: 'bg-blue-50 border-l-4 border-blue-500 p-3 rounded mb-4 text-sm' },
            /*#__PURE__*/React.createElement('p', { className: 'font-semibold text-blue-900' },
              `📊 ${generatedMenu.stats.totalDishes} pratos sugeridos - ${generatedMenu.stats.existingDishes} já cadastrados, ${generatedMenu.stats.newDishes} novos`
            )
          ),

          /*#__PURE__*/React.createElement('div', { className: 'space-y-2 max-h-96 overflow-y-auto' },
            generatedMenu.dishes.map((dish, index) =>
              /*#__PURE__*/React.createElement('div', {
                key: index,
                className: `border-2 rounded-lg p-3 ${
                  dish.matchedInDatabase
                    ? 'border-green-300 bg-green-50'
                    : 'border-orange-300 bg-orange-50'
                }`
              },
                /*#__PURE__*/React.createElement('div', { className: 'flex items-center justify-between' },
                  /*#__PURE__*/React.createElement('div', { className: 'flex-1' },
                    /*#__PURE__*/React.createElement('div', { className: 'flex items-center gap-2 mb-1' },
                      /*#__PURE__*/React.createElement('span', { className: 'text-lg' },
                        dish.matchedInDatabase ? '✅' : '⚠️'
                      ),
                      /*#__PURE__*/React.createElement('span', { className: 'font-semibold text-gray-800' },
                        dish.name
                      ),
                      /*#__PURE__*/React.createElement('span', { className: 'text-xs px-2 py-1 bg-white rounded border border-gray-300' },
                        dish.category
                      )
                    ),
                    /*#__PURE__*/React.createElement('div', { className: 'text-sm text-gray-700 ml-8' },
                      `${dish.servings || 1} porções sugeridas`
                    ),
                    dish.notes && /*#__PURE__*/React.createElement('div', { className: 'text-xs text-gray-600 ml-8 mt-1 italic' },
                      dish.notes
                    )
                  ),
                  !dish.matchedInDatabase && /*#__PURE__*/React.createElement('span', {
                    className: 'text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-1 rounded'
                  }, 'Não cadastrado')
                )
              )
            )
          ),

          generatedMenu.stats.newDishes > 0 && /*#__PURE__*/React.createElement('div', {
            className: 'bg-orange-50 border-l-4 border-orange-500 p-4 rounded mt-4'
          },
            /*#__PURE__*/React.createElement('p', { className: 'text-sm text-orange-800' },
              `⚠️ ${generatedMenu.stats.newDishes} prato(s) sugerido(s) ainda não está(ão) cadastrado(s). Apenas os pratos já cadastrados serão adicionados ao cardápio.`
            )
          )
        )
      ),

      // Footer
      /*#__PURE__*/React.createElement('div', {
        className: 'bg-gray-50 p-4 border-t border-gray-200 flex justify-between items-center'
      },
        /*#__PURE__*/React.createElement('button', {
          onClick: handleClose,
          className: 'px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold',
          disabled: loading
        }, step === 3 ? 'Fechar' : 'Cancelar'),

        step === 1 && /*#__PURE__*/React.createElement('button', {
          onClick: handleGenerate,
          className: 'px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors font-bold shadow-lg',
          disabled: loading
        }, loading ? 'Gerando...' : '🤖 Gerar Cardápio'),

        step === 3 && /*#__PURE__*/React.createElement('button', {
          onClick: handleAddToMenu,
          className: 'px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-colors font-bold shadow-lg',
          disabled: loading
        }, loading ? 'Adicionando...' : '✅ Adicionar ao Cardápio')
      )
    )
  );
}

window.MenuGenerator = MenuGenerator;
})();
