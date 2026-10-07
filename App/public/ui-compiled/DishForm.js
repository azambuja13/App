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
 * ⚡ Performance: Memoizado para evitar re-renders desnecessários
 *
 * @param {Object} props
 * @param {Object} props.dish - Prato para editar (null para novo)
 * @param {Function} props.onSave - Callback ao salvar
 * @param {Function} props.onCancel - Callback ao cancelar
 */
const DishForm = React.memo(function DishForm({
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
    useWeightCalculation: false, // false = cálculo por PESO (100g) | true = cálculo por PORÇÃO
    photos: [], // Array de até 3 fotos (base64)
    profitMargin: '', // Margem de lucro em % (ex: 300 = 300%) - INFORMATIVO
    suggestedPrice: '' // Preço sugerido - editável bidirecionalmente com margem
  });
  const [availableIngredients, setAvailableIngredients] = React.useState([]);
  const [showIngredientSelector, setShowIngredientSelector] = React.useState(false);
  const [ingredientSearch, setIngredientSearch] = React.useState('');
  const [errors, setErrors] = React.useState({});
  const [isSaving, setIsSaving] = React.useState(false);
  const fileInputRef = React.useRef(null);

  // Carregar fotos do prato para edição (isolado para não resetar fotos adicionadas pelo usuário)
  React.useEffect(() => {
    if (dish) {
      setFormData(prev => ({ ...prev, photos: dish.photos || [] }));
    }
  }, [dish?.id]);

  // Carregar dados do prato para edição
  React.useEffect(() => {
    if (dish && availableIngredients.length > 0) {
      console.log('📝 Carregando prato para edição:', dish);
      console.log('📝 useWeightCalculation do backend:', dish.useWeightCalculation);
      console.log('💰 profitMargin do backend:', dish.profitMargin);
      console.log('💵 suggestedPrice do backend:', dish.suggestedPrice);
      console.log('📝 Ingredientes do backend:', dish.ingredients?.map(i => ({name: i.ingredientName, isDiscarded: i.isDiscarded})));
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
        const unit = ing.unit || 'g';
        const unitCost = parseFloat(ing.unitCost) || 0;

        // ✅ Normalizar lossPercentage: garantir que está em formato de porcentagem (20) e não decimal (0.20)
        let lossValue = parseFloat(ing.lossPercentage) || lossFromDB || 0;
        // Se loss está entre 0-1, é decimal, converter para %
        const lossPercentage = lossValue > 0 && lossValue <= 1 ? lossValue * 100 : lossValue;

        // ✅ FIX: Converter quantidade para gramas antes de calcular custo
        let quantityInGrams = quantity;
        if (unit === 'kg' || unit === 'L') {
          quantityInGrams = quantity * 1000;
        } else if (unit === 'g' || unit === 'ml') {
          quantityInGrams = quantity;
        }
        const baseCost = quantityInGrams * unitCost;
        const lossMultiplier = 1 + lossPercentage / 100;
        const ingredientCost = baseCost * lossMultiplier;
        return {
          ...ing,
          loss: lossPercentage / 100,
          // Decimal para compatibilidade (0.20)
          lossPercentage: lossPercentage,
          // ✅ Porcentagem normalizada (20)
          ingredientCost,
          // Adicionar custo total calculado
          costPerUnit: unitCost, // Mapear unitCost para costPerUnit também
          isDiscarded: ing.isDiscarded || false // ✅ Preservar isDiscarded do backend
        };
      });
      console.log('🎯 Ingredientes enriquecidos:', enrichedIngredients);
      setFormData(prev => ({
        ...prev,
        name: dish.name || '',
        description: dish.description || '',
        category: dish.category || 'principal',
        servings: dish.servings || 4,
        ingredients: enrichedIngredients,
        observations: dish.observations || '',
        technicalSheet: dish.technicalSheet || '',
        isFavorite: dish.isFavorite || false,
        useWeightCalculation: dish.useWeightCalculation || false,
        profitMargin: dish.profitMargin || '',
        suggestedPrice: dish.suggestedPrice || ''
      }));
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
    icon: '🍚'
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
    icon: '📌'
  }];

  // ⚡ Performance: Memoizar cálculos pesados para evitar recálculos desnecessários
  const calculateTotalCost = React.useMemo(() => {
    if (window.calculateIngredientsCost) {
      return window.calculateIngredientsCost(formData.ingredients);
    }
    // Fallback se módulo não estiver carregado
    return formData.ingredients.reduce((sum, ing) => sum + (ing.ingredientCost || 0), 0);
  }, [formData.ingredients]);

  // Usar função de conversão do módulo utilitário (definir antes de usar em useMemo)
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

  const calculateTotalWeight = React.useMemo(() => {
    return formData.ingredients.reduce((sum, ing) => {
      // ✅ Pular ingredientes descartáveis (não contam no peso final)
      if (ing.isDiscarded) {
        return sum;
      }

      const quantityInGrams = convertToGrams(ing.quantity, ing.unit);

      // ✅ Aplicar perda e rendimento - peso final = quantidade × (1 - perda%) × rendimento
      const lossMultiplier = 1 - ((ing.lossPercentage || 0) / 100);
      const yieldFactor = parseFloat(ing.yieldMultiplier) || 1;
      const finalWeight = quantityInGrams * lossMultiplier * yieldFactor;

      return sum + finalWeight;
    }, 0);
  }, [formData.ingredients]);

  // Calcular custo por porção (usar módulo calculations)
  const calculateCostPerServing = React.useMemo(() => {
    if (window.calculations && window.calculations.calculateCostPerServing) {
      return window.calculations.calculateCostPerServing(calculateTotalCost, formData.servings);
    }
    // Fallback - arredondar para cima (2 casas decimais)
    return formData.servings > 0 ? Math.ceil((calculateTotalCost / formData.servings) * 100) / 100 : 0;
  }, [calculateTotalCost, formData.servings]);

  // Calcular preço sugerido baseado no modo de cálculo - INFORMATIVO
  const calculateSuggestedPrice = React.useMemo(() => {
    const margin = parseFloat(formData.profitMargin) || 0;

    if (margin <= 0) {
      return 0;
    }

    let baseCost = 0;

    if (formData.useWeightCalculation) {
      // Modo PORÇÃO: aplicar margem sobre o custo por porção
      baseCost = calculateCostPerServing;
    } else {
      // Modo PESO (100g): aplicar margem sobre o custo por 100g
      if (calculateTotalWeight > 0) {
        baseCost = (calculateTotalCost / calculateTotalWeight) * 100; // Custo por 100g
      }
    }

    if (baseCost <= 0) {
      return 0;
    }

    // Fórmula: Preço = Custo + (Custo * Margem / 100)
    // Ex: Custo R$ 10, Margem 300% = R$ 10 + (10 * 3) = R$ 40
    return baseCost + (baseCost * margin / 100);
  }, [formData.profitMargin, formData.useWeightCalculation, calculateCostPerServing, calculateTotalCost, calculateTotalWeight]);

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

  // Calcular custo base para precificação (reutilizável)
  const getBaseCost = React.useCallback(() => {
    if (formData.useWeightCalculation) {
      // Modo PORÇÃO: custo por porção
      return calculateCostPerServing;
    } else {
      // Modo PESO (100g): custo por 100g
      if (calculateTotalWeight > 0) {
        return (calculateTotalCost / calculateTotalWeight) * 100;
      }
    }
    return 0;
  }, [formData.useWeightCalculation, calculateCostPerServing, calculateTotalCost, calculateTotalWeight]);

  // Handler bidirecional: quando margem muda → calcular preço
  const handleMarginChange = (value) => {
    const margin = parseFloat(value) || 0;
    const baseCost = getBaseCost();

    // Calcular preço baseado na margem
    // Fórmula: Preço = Custo + (Custo × Margem / 100)
    const newPrice = baseCost > 0 && margin > 0
      ? baseCost + (baseCost * margin / 100)
      : '';

    setFormData(prev => ({
      ...prev,
      profitMargin: value,
      suggestedPrice: newPrice ? newPrice.toFixed(2) : ''
    }));
  };

  // Handler bidirecional: quando preço muda → calcular margem
  const handlePriceChange = (value) => {
    const price = parseFloat(value) || 0;
    const baseCost = getBaseCost();

    // Calcular margem reversa baseada no preço
    // Fórmula reversa: Margem = ((Preço - Custo) / Custo) × 100
    const newMargin = baseCost > 0 && price > baseCost
      ? ((price - baseCost) / baseCost) * 100
      : '';

    setFormData(prev => ({
      ...prev,
      suggestedPrice: value,
      profitMargin: newMargin ? newMargin.toFixed(0) : ''
    }));
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
    // ✅ Normalizar lossPercentage: garantir que está em formato de porcentagem (20) e não decimal (0.20)
    let lossPercentage = parseFloat(ingredient.lossPercentage) || parseFloat(ingredient.loss) || 0;
    // Se loss está entre 0-1, é decimal, converter para %
    if (lossPercentage > 0 && lossPercentage <= 1) {
      lossPercentage = lossPercentage * 100;
    }

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
      loss: lossPercentage / 100,
      // Decimal para compatibilidade (0.20)
      lossPercentage: lossPercentage,
      // ✅ Porcentagem normalizada (20)
      yieldMultiplier: ingredient.yieldMultiplier || 1,
      // ✅ Adicionar yieldMultiplier
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
          const loss = (parseFloat(ing.lossPercentage) || 0) / 100;

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
          const loss = (parseFloat(ing.lossPercentage) || 0) / 100;
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

  // Toggle ingrediente descartável
  const handleToggleDiscarded = (ingredientId, isDiscarded) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map(ing => {
        if (ing.id === ingredientId) {
          return {
            ...ing,
            isDiscarded
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
          lossPercentage: Math.min(parseFloat(ing.lossPercentage) || 0, 100),
          // Enviar lossPercentage limitado a 100 (0-100)
          yieldMultiplier: parseFloat(ing.yieldMultiplier) || 1,
          // Incluir yieldMultiplier
          isDiscarded: ing.isDiscarded || false // ✅ Incluir campo isDiscarded
        };
      });
      const dishData = {
        ...formData,
        id: dish?.id || null,
        // Se for edição, manter ID
        ingredients: mappedIngredients,
        // Usar ingredientes mapeados
        totalCost: calculateTotalCost,
        costPerServing: calculateCostPerServing,
        totalWeight: calculateTotalWeight, // Peso total em gramas
        profitMargin: formData.profitMargin ? parseFloat(formData.profitMargin) : null, // Margem de lucro (informativo)
        suggestedPrice: calculateSuggestedPrice > 0 ? calculateSuggestedPrice : null // Preço sugerido (informativo)
      };
      console.log('💾 [DishForm] Salvando prato com useWeightCalculation:', dishData.useWeightCalculation);
      console.log('💾 [DishForm] Ingredientes com isDiscarded:', dishData.ingredients.map(i => ({name: i.ingredientName, isDiscarded: i.isDiscarded})));
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
    disabled: !formData.useWeightCalculation,
    className: `w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${!formData.useWeightCalculation ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`,
    required: formData.useWeightCalculation
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-1"
  }, "\uD83D\uDCA1 Quantas por\xE7\xF5es este prato rende? (Ex: Um prato de 2kg pode render 20 por\xE7\xF5es de 100g cada)"))), /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, /*#__PURE__*/React.createElement("label", {
    className: "flex items-center cursor-pointer"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: formData.useWeightCalculation,
    onChange: e => handleChange('useWeightCalculation', e.target.checked),
    className: "mr-2 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-gray-700"
  }, "\uD83C\uDF7D\uFE0F Usar c\xE1lculo por por\xE7\xE3o"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-gray-500 mt-0.5"
  }, "Marcado = c\xE1lculo por por\xE7\xE3o | Desmarcado = c\xE1lculo por peso (R$/100g)")))), /*#__PURE__*/React.createElement("div", {
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
  }, "R$ ", ing.ingredientCost.toFixed(2))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3"
  }, ing.lossPercentage > 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-orange-600 font-medium"
  }, "\uD83D\uDD25 Perda: ", (parseFloat(ing.lossPercentage) || 0).toFixed(0), "%"), ing.yieldMultiplier && parseFloat(ing.yieldMultiplier) !== 1 && /*#__PURE__*/React.createElement("span", {
    className: "text-green-600 font-medium"
  }, "\uD83D\uDCC8 Rend.: ", (parseFloat(ing.yieldMultiplier) || 1).toFixed(1), "x"))), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    id: `discarded-${ing.id}`,
    checked: ing.isDiscarded || false,
    onChange: e => handleToggleDiscarded(ing.id, e.target.checked),
    className: "w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
  }), /*#__PURE__*/React.createElement("label", {
    htmlFor: `discarded-${ing.id}`,
    className: "text-sm text-gray-700 cursor-pointer select-none"
  }, "\uD83D\uDEAE Descart\u00E1vel ap\u00F3s uso (sal, a\u00E7\u00FAcar, vinho...)", /*#__PURE__*/React.createElement("span", {
    className: "block text-xs text-gray-500 mt-0.5"
  }, "N\u00E3o conta no peso final, mas conta no custo")))))) : /*#__PURE__*/React.createElement("div", {
    className: "border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500"
  }, "Nenhum ingrediente adicionado ainda")), /*#__PURE__*/React.createElement("div", {
    className: "mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-sm font-semibold text-green-900 mb-3 flex items-center gap-2"
  }, "\uD83D\uDCB0 Precifica\xE7\xE3o Sugerida", /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-normal text-green-700 bg-green-100 px-2 py-1 rounded-full"
  }, "\u21C4 Bidirecional")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Margem de Lucro (%)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: formData.profitMargin,
    onChange: e => handleMarginChange(e.target.value),
    min: "0",
    step: "1",
    placeholder: "Ex: 300 (para 300%)",
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-1"
  }, "\uD83D\uDCA1 Ex: 300% = vender por 4x o custo")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Pre\xE7o Sugerido ", formData.useWeightCalculation ? "por Por\xE7\xE3o" : "por 100g"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: formData.suggestedPrice,
    onChange: e => handlePriceChange(e.target.value),
    min: "0",
    step: "0.01",
    placeholder: "Ex: 40.00",
    className: "w-full px-4 py-2 border border-green-300 rounded-lg text-lg font-bold text-green-600 focus:ring-2 focus:ring-green-500 focus:border-transparent"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-1"
  }, "\uD83D\uDCCA Custo base: R$ ", formData.useWeightCalculation ? calculateCostPerServing.toFixed(2) : (calculateTotalCost / calculateTotalWeight * 100).toFixed(2)))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 p-3 bg-white rounded-lg border border-green-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4 text-sm"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600"
  }, "Custo Total do Prato"), /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-gray-800"
  }, "R$ ", calculateTotalCost.toFixed(2))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600"
  }, "Valor com Margem ", formData.useWeightCalculation ? `(${formData.servings} por\xE7\xF5es)` : "(total)"), /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-green-600"
  }, "R$ ", (() => {
    const price = parseFloat(formData.suggestedPrice) || 0;
    if (formData.useWeightCalculation && formData.servings > 0) {
      // Modo porção: multiplicar preço por porção × número de porções
      return (price * formData.servings).toFixed(2);
    } else {
      // Modo peso: multiplicar preço por 100g × peso total / 100
      const totalWeight = calculateTotalWeight;
      return (price * (totalWeight / 100)).toFixed(2);
    }
  })()))))), /*#__PURE__*/React.createElement("div", {
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
  }, "R$ ", calculateTotalCost.toFixed(2)), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-blue-600 mt-1"
  }, formData.ingredients.length, " ingrediente", formData.ingredients.length !== 1 ? 's' : '')), /*#__PURE__*/React.createElement("div", {
    className: "text-center p-3 bg-white rounded-lg"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-green-700 mb-2"
  }, "\u2696\uFE0F Peso Final"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold text-green-900"
  }, formatWeight(calculateTotalWeight)), /*#__PURE__*/React.createElement("p", {
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
    src: photo.photoData || photo.data,
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
}, (prevProps, nextProps) => {
  // ⚡ Performance: Comparação customizada para evitar re-renders desnecessários
  return (
    prevProps.dish?.id === nextProps.dish?.id &&
    prevProps.dish?.name === nextProps.dish?.name &&
    prevProps.dish?.totalCost === nextProps.dish?.totalCost &&
    prevProps.dish?.ingredients?.length === nextProps.dish?.ingredients?.length
  );
});

// export default DishForm;

// Expor para window (browser global)
window.DishForm = DishForm;
})();
