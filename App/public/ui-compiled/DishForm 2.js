(function() {
/**
 * ===================================================================
 * DISH FORM - Formulário de Cadastro/Edição de Pratos
 * ===================================================================
 * Formulário completo para criar e editar pratos reutilizáveis
 */

// React hooks usados via React.useState, React.useEffect, etc.
/**
 * Função utilitária para normalizar texto (remover acentos e converter para minúsculas)
 * Igual à função usada em IngredientsDatabase.jsx
 */
const normalizeText = text => {
  if (!text) return '';
  return text.toString().normalize('NFD') // Decompor caracteres acentuados
  .replace(/[\u0300-\u036f]/g, '') // Remover acentos
  .toLowerCase().trim();
};

/**
 * Componente DishForm
 * Formulário para cadastrar/editar pratos
 *
 * @param {Object} props
 * @param {Object} props.dish - Prato para editar (null para novo)
 * @param {Function} props.onSave - Callback ao salvar
 * @param {Function} props.onCancel - Callback ao cancelar
 */
function DishForm({
  dish = null,
  onSave,
  onCancel
}) {
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    category: 'principal',
    servings: 10,
    // Padrão: 10 porções por prato
    ingredients: [],
    observations: '',
    technicalSheet: '',
    // Ficha técnica
    isFavorite: false,
    photos: [] // Array de até 3 fotos (base64)
  });
  const [availableIngredients, setAvailableIngredients] = React.useState([]);
  const [showIngredientSelector, setShowIngredientSelector] = React.useState(false);
  const [ingredientSearch, setIngredientSearch] = React.useState('');
  const [errors, setErrors] = React.useState({});
  const [isSaving, setIsSaving] = React.useState(false);
  const fileInputRef = React.useRef(null);

  // Carregar dados do prato para edição
  React.useEffect(() => {
    if (dish && availableIngredients.length > 0) {
      console.log('📝 Carregando prato para edição:', dish);
      console.log('📦 Ingredientes disponíveis:', availableIngredients.length);

      // Enriquecer ingredientes com perda do banco
      const enrichedIngredients = (dish.ingredients || []).map(ing => {
        // SEMPRE buscar perda do ingrediente no banco (para atualizar caso tenha mudado)
        const originalIngredient = availableIngredients.find(i => i.id === ing.ingredientId);
        const lossFromDB = originalIngredient ? originalIngredient.perda || originalIngredient.loss || 0 : 0;
        console.log(`🔍 [${ing.ingredientName}] Buscando perda do banco:`, {
          ingredientId: ing.ingredientId,
          found: !!originalIngredient,
          lossInIngredient: ing.loss,
          lossFromDB: lossFromDB,
          originalIngredient: originalIngredient
        });

        // Calcular ingredientCost (custo total do ingrediente no prato)
        const quantity = parseFloat(ing.quantity) || 0;
        const unitCost = parseFloat(ing.unitCost) || 0;
        const lossPercentage = parseFloat(ing.lossPercentage) || lossFromDB || 0;
        const baseCost = quantity * unitCost;
        const lossMultiplier = 1 + lossPercentage / 100;
        const ingredientCost = baseCost * lossMultiplier;
        return {
          ...ing,
          loss: lossFromDB,
          // Sempre usar a perda atualizada do banco
          ingredientCost,
          // Adicionar custo total calculado
          costPerUnit: unitCost // Mapear unitCost para costPerUnit também
        };
      });
      console.log('🎯 Ingredientes enriquecidos:', enrichedIngredients);
      setFormData({
        name: dish.name || '',
        description: dish.description || '',
        category: dish.category || 'principal',
        servings: dish.servings || 4,
        ingredients: enrichedIngredients,
        observations: dish.observations || '',
        technicalSheet: dish.technicalSheet || '',
        isFavorite: dish.isFavorite || false,
        photos: dish.photos || []
      });
    }
  }, [dish, availableIngredients]);

  // Carregar ingredientes disponíveis
  React.useEffect(() => {
    loadAvailableIngredients();

    // ✅ FIX: Escutar mudanças no eventState para recarregar ingredientes quando disponíveis
    const interval = setInterval(() => {
      if (window.eventState && window.eventState.ingredientsDatabase && window.eventState.ingredientsDatabase.length > 0) {
        // Verificar se os ingredientes atuais estão sem preço (unitCost = 0)
        if (availableIngredients.length === 0 || availableIngredients[0] && availableIngredients[0].unitCost === 0) {
          console.log('🔄 [DishForm] Ingredientes do eventState disponíveis - recarregando...');
          loadAvailableIngredients();
        }
      }
    }, 1000);

    // Limpar interval após 10 segundos
    setTimeout(() => clearInterval(interval), 10000);
    return () => clearInterval(interval);
  }, [availableIngredients]);
  const loadAvailableIngredients = async () => {
    try {
      // ✅ FIX: SEMPRE usar window.eventState.ingredientsDatabase (estado React global)
      // Este estado já foi atualizado pelo PostgreSQL via useEventState
      if (window.eventState && Array.isArray(window.eventState.ingredientsDatabase)) {
        console.log('✅ Ingredientes carregados do eventState (PostgreSQL):', window.eventState.ingredientsDatabase.length);
        setAvailableIngredients(window.eventState.ingredientsDatabase);
        return;
      }

      // Fallback 1: Tentar window.ingredientsService (backend direto)
      if (window.ingredientsService && window.ingredientsService.loadIngredients) {
        try {
          const ingredients = await window.ingredientsService.loadIngredients();
          if (ingredients && ingredients.length > 0) {
            console.log('✅ Ingredientes carregados do IngredientsService (PostgreSQL):', ingredients.length);
            setAvailableIngredients(ingredients);
            return;
          }
        } catch (error) {
          console.warn('⚠️ Erro ao carregar do IngredientsService:', error);
        }
      }

      // Fallback 2: tentar localStorage apenas como último recurso
      console.warn('⚠️ window.eventState.ingredients não disponível - usando localStorage como fallback');
      const eventDataLS = localStorage.getItem('precificacao_event_data');
      if (eventDataLS) {
        const parsed = JSON.parse(eventDataLS);
        if (parsed.ingredientsDatabase && Array.isArray(parsed.ingredientsDatabase)) {
          console.log('⚠️ Ingredientes carregados de localStorage (fallback):', parsed.ingredientsDatabase.length);
          setAvailableIngredients(parsed.ingredientsDatabase);
          return;
        }
      }
      console.error('❌ Nenhuma fonte de ingredientes disponível!');
      setAvailableIngredients([]);
    } catch (error) {
      console.error('Erro ao carregar ingredientes:', error);
      setAvailableIngredients([]);
    }
  };

  // Categorias disponíveis
  const categories = [{
    value: 'entrada',
    label: 'Entrada',
    icon: '🥗'
  }, {
    value: 'principal',
    label: 'Prato Principal',
    icon: '🍽️'
  }, {
    value: 'acompanhamento',
    label: 'Acompanhamento',
    icon: '🥘'
  }, {
    value: 'sobremesa',
    label: 'Sobremesa',
    icon: '🍰'
  }, {
    value: 'bebida',
    label: 'Bebida',
    icon: '🥤'
  }, {
    value: 'outro',
    label: 'Outro',
    icon: '🍴'
  }];

  // Calcular custo total do prato (usar módulo calculations)
  const calculateTotalCost = () => {
    if (window.calculateIngredientsCost) {
      return window.calculateIngredientsCost(formData.ingredients);
    }
    // Fallback se módulo não estiver carregado
    return formData.ingredients.reduce((sum, ing) => sum + (ing.ingredientCost || 0), 0);
  };

  // Calcular custo por porção (usar módulo calculations)
  const calculateCostPerServing = () => {
    const totalCost = calculateTotalCost();
    if (window.calculations && window.calculations.calculateCostPerServing) {
      return window.calculations.calculateCostPerServing(totalCost, formData.servings);
    }
    // Fallback
    return formData.servings > 0 ? totalCost / formData.servings : 0;
  };

  // Usar função de conversão do módulo utilitário
  const convertToGrams = (quantity, unit) => {
    if (window.unitConversions && window.unitConversions.convertToGrams) {
      return window.unitConversions.convertToGrams(quantity, unit);
    }
    // Fallback se módulo não estiver carregado
    const qty = parseFloat(quantity) || 0;
    const unitLower = (unit || '').toLowerCase();
    if (unitLower === 'kg' || unitLower === 'l') return qty * 1000;
    if (unitLower === 'g' || unitLower === 'ml') return qty;
    return 0;
  };

  // Calcular peso total: somatório do peso dos ingredientes (SEM aplicar perda)
  // O peso representa a quantidade LÍQUIDA/FINAL que vai no prato
  // A perda será aplicada apenas na lista de compras
  const calculateTotalWeight = () => {
    return formData.ingredients.reduce((sum, ing) => {
      const quantityInGrams = convertToGrams(ing.quantity, ing.unit);

      // NÃO aplicar perda no peso - este é o peso final do prato
      return sum + quantityInGrams;
    }, 0);
  };

  // Usar função de formatação do módulo utilitário
  const formatWeight = grams => {
    if (window.unitConversions && window.unitConversions.formatWeight) {
      return window.unitConversions.formatWeight(grams);
    }
    // Fallback
    return grams >= 1000 ? `${(grams / 1000).toFixed(2)} kg` : `${grams.toFixed(0)} g`;
  };

  // Handler de mudança de campo
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  // Gerenciamento de Fotos com Compressão SUPER AGRESSIVA
  const compressImage = file => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const MAX_SIZE_KB = 200; // Tamanho máximo desejado: 200KB

      // Para arquivos muito grandes (>10MB), usar dimensões menores
      const isVeryLarge = file.size > 10 * 1024 * 1024;
      const maxWidth = isVeryLarge ? 600 : 800;
      const maxHeight = isVeryLarge ? 450 : 600;
      const initialQuality = isVeryLarge ? 0.5 : 0.7; // Começar com qualidade menor para arquivos grandes

      console.log(`📸 Processando imagem: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          // Calcular dimensões mantendo proporção
          let width = img.width;
          let height = img.height;
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          console.log(`🔧 Redimensionando: ${img.width}x${img.height} → ${width}x${height}`);

          // Criar canvas e redimensionar
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Compressão progressiva: reduzir qualidade até atingir tamanho desejado
          let quality = initialQuality;
          let compressedBase64;
          let compressedSize;
          let attempts = 0;
          const maxAttempts = 10; // Aumentado para 10 tentativas

          do {
            compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            compressedSize = Math.round(compressedBase64.length * 3 / 4);
            if (compressedSize / 1024 > MAX_SIZE_KB && attempts < maxAttempts) {
              quality -= 0.05; // Reduzir qualidade em 5% por vez (mais gradual)
              attempts++;
              console.log(`🔄 Tentativa ${attempts}: Reduzindo qualidade para ${(quality * 100).toFixed(0)}% (atual: ${(compressedSize / 1024).toFixed(1)}KB)`);
            } else {
              break;
            }
          } while (quality > 0.2); // Permitir até 20% de qualidade

          // Calcular redução
          const originalSize = file.size;
          const reduction = Math.round((originalSize - compressedSize) / originalSize * 100);
          console.log(`📸 Imagem comprimida: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${reduction}% menor, qualidade: ${(quality * 100).toFixed(0)}%)`);

          // Verificar se ainda está muito grande
          if (compressedSize / 1024 > 300) {
            console.warn(`⚠️ Imagem ainda grande após compressão: ${(compressedSize / 1024).toFixed(1)}KB`);
          }
          resolve(compressedBase64);
        };
        img.onerror = () => reject(new Error('Erro ao carregar imagem'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsDataURL(file);
    });
  };
  const handlePhotoUpload = async e => {
    const files = Array.from(e.target.files);

    // Limitar a 3 fotos
    const remainingSlots = 3 - formData.photos.length;
    const filesToProcess = files.slice(0, remainingSlots);
    for (const file of filesToProcess) {
      // Validar tipo
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas imagens');
        continue;
      }

      // Validar tamanho máximo absoluto (50MB - acima disso pode travar o navegador)
      if (file.size > 50 * 1024 * 1024) {
        alert(`Imagem muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Tamanho máximo: 50MB\n\nPor favor, use uma foto menor.`);
        continue;
      }
      try {
        // Comprimir imagem automaticamente (sem limite inferior)
        const compressedBase64 = await compressImage(file);
        const photoData = {
          id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          data: compressedBase64,
          // base64 comprimido
          name: file.name,
          size: Math.round(compressedBase64.length * 3 / 4),
          // tamanho após compressão
          originalSize: file.size,
          uploadedAt: new Date().toISOString()
        };
        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, photoData]
        }));
      } catch (error) {
        console.error('Erro ao comprimir imagem:', error);
        alert('Erro ao processar imagem. Tente outra.');
      }
    }

    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  const handleRemovePhoto = photoId => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter(photo => photo.id !== photoId)
    }));
  };
  const handleSetMainPhoto = photoId => {
    setFormData(prev => {
      const photos = [...prev.photos];
      const photoIndex = photos.findIndex(p => p.id === photoId);
      if (photoIndex > 0) {
        // Mover para primeira posição
        const [photo] = photos.splice(photoIndex, 1);
        photos.unshift(photo);
      }
      return {
        ...prev,
        photos
      };
    });
  };

  // Adicionar ingrediente
  const handleAddIngredient = ingredient => {
    // Normalizar ingrediente usando módulo de transformação de dados
    const normalized = window.dataTransform && window.dataTransform.normalizeIngredient ? window.dataTransform.normalizeIngredient(ingredient) : {
      name: ingredient.name || ingredient.nome,
      unit: ingredient.unit || ingredient.unidade || 'un',
      cost: ingredient.cost || ingredient.preco || ingredient.costPerUnit || 0,
      unitSize: ingredient.unitSize || 0,
      loss: ingredient.loss || ingredient.perda || 0
    };

    // Calcular custo por grama/ml usando a função do sistema
    const costPerGramMl = window.calculateCostPerGramMl ? window.calculateCostPerGramMl(ingredient, false) : normalized.unitSize > 0 ? normalized.cost / normalized.unitSize : normalized.cost;
    console.log('📝 [handleAddIngredient] Ingrediente:', ingredient);
    console.log('📝 [handleAddIngredient] unitType:', ingredient.unitType);
    console.log('📝 [handleAddIngredient] costPerUnit:', normalized.cost, 'unitSize:', normalized.unitSize);
    console.log('📝 [handleAddIngredient] costPerGramMl:', costPerGramMl);

    // Detectar tipo de ingrediente e definir quantidade/unidade inicial apropriada
    const isUnitType = ingredient.unitType === 'unit';
    const initialQuantity = isUnitType ? 1 : 1000; // 1 unidade OU 1000g (1kg)
    const initialUnit = isUnitType ? 'un' : 'g';

    // Aplicar perda: quantidade a comprar considerando a perda
    const loss = normalized.loss || 0;

    // Para ingredientes por unidade, não precisa converter unidades
    // Para ingredientes por peso, converter para gramas
    const quantityForCalculation = isUnitType ? initialQuantity : initialQuantity;
    const quantityToBuy = window.lossCalculations && window.lossCalculations.calculateQuantityWithLoss ? window.lossCalculations.calculateQuantityWithLoss(quantityForCalculation, loss) : loss > 0 && loss < 1 ? quantityForCalculation / (1 - loss) : quantityForCalculation;

    // Custo total = quantidade a comprar × custo unitário (grama OU unidade)
    const totalCost = quantityToBuy * costPerGramMl;
    console.log('📝 [handleAddIngredient] isUnitType:', isUnitType, 'quantity:', initialQuantity, 'unit:', initialUnit);
    console.log('📝 [handleAddIngredient] quantityToBuy:', quantityToBuy, 'totalCost:', totalCost);
    const newIngredient = {
      id: `ing_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      ingredientId: ingredient.id ? String(ingredient.id) : null,
      // Converter para string (PostgreSQL exige String)
      ingredientName: normalized.name,
      quantity: initialQuantity,
      unit: initialUnit,
      unitType: ingredient.unitType || 'weight',
      // Preservar tipo
      costPerUnit: costPerGramMl,
      // Custo por grama/ml OU por unidade
      ingredientCost: totalCost,
      // Custo total considerando perda
      loss: loss,
      isOptional: false,
      notes: null,
      displayOrder: formData.ingredients.length + 1
    };
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, newIngredient]
    }));
    setShowIngredientSelector(false);
    setIngredientSearch('');
  };

  // Remover ingrediente
  const handleRemoveIngredient = ingredientId => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter(ing => ing.id !== ingredientId)
    }));
  };

  // Atualizar quantidade de ingrediente
  const handleUpdateIngredientQuantity = (ingredientId, newQuantity) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map(ing => {
        if (ing.id === ingredientId) {
          const quantity = parseFloat(newQuantity) || 0;
          const loss = parseFloat(ing.loss) || 0;

          // Para ingredientes por unidade, não converter - usar quantidade diretamente
          // Para ingredientes por peso, converter para gramas/ml
          let quantityForCalculation = quantity;
          if (ing.unitType !== 'unit') {
            // Converter quantidade para gramas/ml apenas para ingredientes por peso
            if (ing.unit === 'kg') {
              quantityForCalculation = quantity * 1000;
            } else if (ing.unit === 'L') {
              quantityForCalculation = quantity * 1000;
            }
          }

          // Aplicar perda
          const quantityToBuy = window.lossCalculations && window.lossCalculations.calculateQuantityWithLoss ? window.lossCalculations.calculateQuantityWithLoss(quantityForCalculation, loss) : loss > 0 && loss < 1 ? quantityForCalculation / (1 - loss) : quantityForCalculation;

          // Custo = quantidade a comprar × custo unitário (grama OU unidade)
          const totalCost = quantityToBuy * ing.costPerUnit;
          return {
            ...ing,
            quantity: quantity,
            ingredientCost: totalCost
          };
        }
        return ing;
      })
    }));
  };

  // Atualizar unidade do ingrediente e recalcular custo
  const handleUpdateIngredientUnit = (ingredientId, newUnit) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map(ing => {
        if (ing.id === ingredientId) {
          // Buscar o ingrediente original no banco para pegar o custo base
          const originalIngredient = availableIngredients.find(i => i.id === ing.ingredientId);
          if (!originalIngredient) return ing;

          // Calcular custo por grama/ml do ingrediente original
          const costPerGramMl = window.calculateCostPerGramMl ? window.calculateCostPerGramMl(originalIngredient, false) : 0;

          // Converter quantidade atual para gramas/ml
          let quantityInGrams = ing.quantity;
          if (ing.unit === 'kg') {
            quantityInGrams = ing.quantity * 1000;
          } else if (ing.unit === 'L') {
            quantityInGrams = ing.quantity * 1000;
          }

          // Converter de gramas para a nova unidade
          let newQuantity = quantityInGrams;
          if (newUnit === 'kg') {
            newQuantity = quantityInGrams / 1000;
          } else if (newUnit === 'L') {
            newQuantity = quantityInGrams / 1000;
          }

          // Aplicar perda: quantidade a comprar considerando a perda
          const loss = parseFloat(ing.loss) || 0;
          const quantityToBuy = window.lossCalculations && window.lossCalculations.calculateQuantityWithLoss ? window.lossCalculations.calculateQuantityWithLoss(quantityInGrams, loss) : loss > 0 && loss < 1 ? quantityInGrams / (1 - loss) : quantityInGrams;
          const finalCost = quantityToBuy * costPerGramMl;
          return {
            ...ing,
            quantity: newQuantity,
            unit: newUnit,
            costPerUnit: costPerGramMl,
            // Custo por grama/ml
            ingredientCost: finalCost
          };
        }
        return ing;
      })
    }));
  };

  // Validar formulário
  const validate = () => {
    const newErrors = {};
    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'Nome do prato é obrigatório';
    }
    if (formData.ingredients.length === 0) {
      newErrors.ingredients = 'Adicione pelo menos um ingrediente';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Salvar prato
  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      // Usar ManagerHelper para pegar o manager correto (backend PostgreSQL > local)
      const dishManager = window.ManagerHelper?.getDishManager() || window.PrecificacaoAPI?.dishManager || window.dishManager;
      if (!dishManager) {
        alert('❌ Sistema de pratos não está pronto. Aguarde alguns segundos e tente novamente.');
        setIsSaving(false);
        return;
      }
      console.log('✅ [DishForm.handleSave] Usando dishManager:', dishManager?.constructor?.name);

      // Mapear ingredientes do formato frontend para backend
      const mappedIngredients = formData.ingredients.map(ing => {
        // Se ingredientId está null/undefined, tentar encontrar pelo nome
        let finalIngredientId = ing.ingredientId;
        if (!finalIngredientId && ing.ingredientName) {
          const foundIngredient = availableIngredients.find(i => (i.name || i.ingredientName)?.toLowerCase() === ing.ingredientName.toLowerCase());
          if (foundIngredient) {
            finalIngredientId = String(foundIngredient.id);
            console.log(`🔧 [DishForm] Corrigindo ingredientId para ${ing.ingredientName}: ${finalIngredientId}`);
          }
        }
        return {
          ingredientId: finalIngredientId,
          ingredientName: ing.ingredientName || ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          unitType: ing.unitType,
          unitCost: ing.costPerUnit || ing.unitCost || 0,
          // Frontend usa costPerUnit, backend usa unitCost
          loss: ing.loss || 0,
          // ✅ FIX: Preservar loss em formato decimal (0.15)
          lossPercentage: (ing.loss || 0) * 100 // Frontend usa loss (0-1), backend usa lossPercentage (0-100)
        };
      });
      const dishData = {
        ...formData,
        id: dish?.id || null,
        // Se for edição, manter ID
        ingredients: mappedIngredients,
        // Usar ingredientes mapeados
        totalCost: calculateTotalCost(),
        costPerServing: calculateCostPerServing(),
        totalWeight: calculateTotalWeight() // Peso total em gramas
      };
      const result = await dishManager.saveItem(dishData);
      if (result.success) {
        if (onSave) {
          onSave(result.data);
        }
      } else {
        alert(`Erro ao salvar prato: ${result.message}`);
      }
    } catch (error) {
      console.error('Erro ao salvar prato:', error);
      alert('Erro ao salvar prato. Verifique o console.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtrar ingredientes disponíveis (com normalização de texto para ignorar acentos e maiúsculas)
  const filteredIngredients = availableIngredients.filter(ing => {
    if (!ingredientSearch.trim()) return true;

    // Normalizar termo de busca
    const searchNormalized = normalizeText(ingredientSearch);

    // Normalizar campos do ingrediente
    const nome = normalizeText(ing.nome || ing.name || '');
    const categoria = normalizeText(ing.categoria || ing.category || '');
    const unidade = normalizeText(ing.unit || ing.unidade || '');

    // Verificar se algum campo contém o termo de busca
    return nome.includes(searchNormalized) || categoria.includes(searchNormalized) || unidade.includes(searchNormalized);
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "dish-form bg-white rounded-lg shadow-lg p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold text-gray-800 mb-2"
  }, dish ? '✏️ Editar Prato' : '➕ Novo Prato'), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600"
  }, "Crie pratos reutiliz\xE1veis com ingredientes para usar nas suas propostas")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4 mb-6"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-semibold text-gray-700 border-b pb-2"
  }, "\uD83D\uDCDD Informa\xE7\xF5es B\xE1sicas"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Nome do Prato *"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: formData.name,
    onChange: e => handleChange('name', e.target.value),
    placeholder: "Ex: Risoto de Funghi",
    className: `w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-300'}`
  }), errors.name && /*#__PURE__*/React.createElement("p", {
    className: "text-red-500 text-sm mt-1"
  }, errors.name)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Descri\xE7\xE3o"), /*#__PURE__*/React.createElement("textarea", {
    value: formData.description,
    onChange: e => handleChange('description', e.target.value),
    placeholder: "Descreva o prato...",
    rows: 3,
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Categoria *"), /*#__PURE__*/React.createElement("select", {
    value: formData.category,
    onChange: e => handleChange('category', e.target.value),
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  }, categories.map(cat => /*#__PURE__*/React.createElement("option", {
    key: cat.value,
    value: cat.value
  }, cat.icon, " ", cat.label)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "N\xFAmero de Por\xE7\xF5es *"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: formData.servings === '' ? '' : formData.servings,
    onChange: e => {
      const value = e.target.value;
      // Permitir campo vazio temporariamente durante digitação
      const newValue = value === '' ? '' : parseFloat(value) || 1;
      console.log('🔄 [DishForm] Alterando servings:', newValue);
      handleChange('servings', newValue);
    },
    onBlur: e => {
      // Ao sair do campo, garantir que tenha pelo menos 1
      if (formData.servings === '' || formData.servings < 1 || !formData.servings) {
        console.log('🔄 [DishForm] onBlur: corrigindo para 1');
        handleChange('servings', 1);
      }
    },
    min: "1",
    step: "1",
    placeholder: "Ex: 10",
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
    required: true
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-1"
  }, "\uD83D\uDCA1 Quantas por\xE7\xF5es este prato rende? (Ex: Um prato de 2kg pode render 20 por\xE7\xF5es de 100g cada)"))), /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-semibold text-gray-700"
  }, "\uD83E\uDDD1\u200D\uD83C\uDF73 Ingredientes"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowIngredientSelector(true),
    className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
  }, "\u2795 Adicionar Ingrediente")), errors.ingredients && /*#__PURE__*/React.createElement("p", {
    className: "text-red-500 text-sm mb-2"
  }, errors.ingredients), formData.ingredients.length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, formData.ingredients.map((ing, index) => /*#__PURE__*/React.createElement("div", {
    key: ing.id,
    className: "border border-gray-200 rounded-lg p-3 bg-gray-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-gray-700"
  }, index + 1, ". ", ing.ingredientName), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleRemoveIngredient(ing.id),
    className: "text-red-500 hover:text-red-700"
  }, "\uD83D\uDDD1\uFE0F")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs text-gray-600"
  }, "Quantidade"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: ing.quantity === 0 ? '' : ing.quantity,
    onChange: e => handleUpdateIngredientQuantity(ing.id, e.target.value),
    step: "0.01",
    min: "0",
    className: "w-full px-2 py-1 border border-gray-300 rounded text-sm",
    placeholder: "0"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs text-gray-600"
  }, "Unidade"), /*#__PURE__*/React.createElement("select", {
    value: ing.unit,
    onChange: e => handleUpdateIngredientUnit(ing.id, e.target.value),
    className: "w-full px-2 py-1 border border-gray-300 rounded text-sm",
    disabled: ing.unitType === 'unit'
  }, ing.unitType === 'unit' ? /*#__PURE__*/React.createElement("option", {
    value: "un"
  }, "un") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("option", {
    value: "kg"
  }, "kg"), /*#__PURE__*/React.createElement("option", {
    value: "g"
  }, "g"), /*#__PURE__*/React.createElement("option", {
    value: "L"
  }, "L"), /*#__PURE__*/React.createElement("option", {
    value: "ml"
  }, "ml")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs text-gray-600"
  }, "Custo/g (R$)"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: parseFloat(ing.costPerUnit || 0).toFixed(4),
    disabled: true,
    className: "w-full px-2 py-1 border border-gray-300 rounded text-sm bg-gray-100"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex items-center justify-between text-sm text-gray-600"
  }, /*#__PURE__*/React.createElement("span", null, "Custo total: ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "R$ ", ing.ingredientCost.toFixed(2))), ing.loss > 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-orange-600 font-medium"
  }, "\uD83D\uDD25 Perda: ", (ing.loss * 100).toFixed(0), "%"))))) : /*#__PURE__*/React.createElement("div", {
    className: "border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500"
  }, "Nenhum ingrediente adicionado ainda")), /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 rounded-lg p-4 mb-6"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-semibold text-blue-900 mb-3"
  }, "\uD83D\uDCCA Resumo do Prato"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center p-3 bg-white rounded-lg"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-blue-700 mb-2"
  }, "\uD83D\uDCB0 Custo Total"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold text-blue-900"
  }, "R$ ", calculateTotalCost().toFixed(2)), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-blue-600 mt-1"
  }, formData.ingredients.length, " ingrediente", formData.ingredients.length !== 1 ? 's' : '')), /*#__PURE__*/React.createElement("div", {
    className: "text-center p-3 bg-white rounded-lg"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-green-700 mb-2"
  }, "\u2696\uFE0F Peso Final"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold text-green-900"
  }, formatWeight(calculateTotalWeight())), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-green-600 mt-1"
  }, "ap\xF3s perda dos ingredientes")))), /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-semibold text-gray-700"
  }, "\uD83D\uDCF7 Fotos do Prato ", /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-gray-500 font-normal"
  }, "(at\xE9 3 fotos)")), formData.photos.length < 3 && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => fileInputRef.current?.click(),
    className: "px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
  }, "\u2795 Adicionar Foto"), /*#__PURE__*/React.createElement("input", {
    ref: fileInputRef,
    type: "file",
    accept: "image/*",
    multiple: true,
    onChange: handlePhotoUpload,
    className: "hidden"
  })), formData.photos.length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-4"
  }, formData.photos.map((photo, index) => /*#__PURE__*/React.createElement("div", {
    key: photo.id,
    className: "relative group"
  }, /*#__PURE__*/React.createElement("img", {
    src: photo.data,
    alt: photo.name,
    className: "w-full h-48 object-cover rounded-lg border-2 border-gray-300"
  }), index === 0 && /*#__PURE__*/React.createElement("div", {
    className: "absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold"
  }, "\u2B50 Principal"), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex space-x-2"
  }, index !== 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => handleSetMainPhoto(photo.id),
    className: "px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm",
    title: "Definir como principal"
  }, "\u2B50"), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleRemovePhoto(photo.id),
    className: "px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm",
    title: "Remover foto"
  }, "\uD83D\uDDD1\uFE0F"))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-1 truncate"
  }, photo.name))), Array.from({
    length: 3 - formData.photos.length
  }).map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: `empty-${i}`,
    onClick: () => fileInputRef.current?.click(),
    className: "h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center text-gray-400"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-4xl mb-2"
  }, "\uD83D\uDCF7"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm"
  }, "Adicionar foto"))))) : /*#__PURE__*/React.createElement("div", {
    onClick: () => fileInputRef.current?.click(),
    className: "border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-6xl mb-4"
  }, "\uD83D\uDCF7"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 font-medium mb-2"
  }, "Nenhuma foto adicionada"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500"
  }, "Clique aqui ou no bot\xE3o acima para adicionar fotos do prato"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-400 mt-2"
  }, "Tamanho m\xE1ximo: 5MB por foto \u2022 Formatos: JPG, PNG, GIF"))), /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "\uD83D\uDCCC Observa\xE7\xF5es"), /*#__PURE__*/React.createElement("textarea", {
    value: formData.observations,
    onChange: e => handleChange('observations', e.target.value),
    placeholder: "Adicione observa\xE7\xF5es, modo de preparo, etc.",
    rows: 3,
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  })), /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "\uD83D\uDCCB Ficha T\xE9cnica"), /*#__PURE__*/React.createElement("textarea", {
    value: formData.technicalSheet,
    onChange: e => handleChange('technicalSheet', e.target.value),
    placeholder: "Adicione informa\xE7\xF5es t\xE9cnicas: tempo de preparo, temperatura, t\xE9cnicas especiais, equipamentos necess\xE1rios, etc.",
    rows: 4,
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  }), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-xs text-gray-500"
  }, "Ex: Pr\xE9-aquecer forno a 180\xB0C, tempo de coc\xE7\xE3o 45min, descanso 10min")), /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("label", {
    className: "flex items-center cursor-pointer"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: formData.isFavorite,
    onChange: e => handleChange('isFavorite', e.target.checked),
    className: "mr-2 w-5 h-5"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium text-gray-700"
  }, "\u2B50 Marcar como favorito"))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-end space-x-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onCancel,
    className: "px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: handleSave,
    disabled: isSaving,
    className: "px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
  }, isSaving ? 'Salvando...' : dish ? 'Salvar Alterações' : 'Criar Prato')), showIngredientSelector && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-600 text-white px-6 py-4 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold"
  }, "Selecionar Ingrediente"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowIngredientSelector(false);
      setIngredientSearch('');
    },
    className: "text-white hover:bg-blue-700 rounded-full p-2 transition-colors",
    title: "Fechar"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-6 h-6",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M6 18L18 6M6 6l12 12"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "p-6"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: ingredientSearch,
    onChange: e => setIngredientSearch(e.target.value),
    placeholder: "Buscar ingrediente...",
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg mb-4",
    autoFocus: true
  }), /*#__PURE__*/React.createElement("div", {
    className: "max-h-96 overflow-y-auto"
  }, filteredIngredients.length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, filteredIngredients.map(ing => {
    const nome = ing.nome || ing.name;
    const categoria = ing.categoria || ing.category;
    return /*#__PURE__*/React.createElement("button", {
      key: ing.id,
      onClick: () => handleAddIngredient(ing),
      className: "w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-medium text-gray-800"
    }, nome), /*#__PURE__*/React.createElement("div", {
      className: "text-sm text-gray-600"
    }, categoria));
  })) : /*#__PURE__*/React.createElement("p", {
    className: "text-center text-gray-500 py-8"
  }, "Nenhum ingrediente encontrado"))), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 px-6 py-4 flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, "Clique em um ingrediente para adicionar ao prato"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowIngredientSelector(false);
      setIngredientSearch('');
    },
    className: "flex items-center gap-2 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-4 h-4",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M6 18L18 6M6 6l12 12"
  })), "Cancelar")))));
}

// export default DishForm;

// Expor para window (browser global)
window.DishForm = DishForm;
})();
