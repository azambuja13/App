/**
 * INGREDIENTS LOADER
 *
 * Estratégia de carregamento:
 * 1. ONLINE com autenticação: Carregar ingredientes DO USUÁRIO (tabela ingredients)
 * 2. OFFLINE ou sem autenticação: Carregar ingredientes PADRÃO (tabela default_ingredients)
 */

async function loadIngredientsHybrid() {
    const isAuthenticated = !!localStorage.getItem('accessToken');
    const isOnline = navigator.onLine && window.appMode === 'ONLINE';

    console.log(`☁️ [IngredientsLoader] Modo: ${isOnline ? 'ONLINE' : 'OFFLINE'}, Auth: ${isAuthenticated}`);

    try {
        // CASO 1: Usuário autenticado ONLINE → Carregar ingredientes DO USUÁRIO
        if (isAuthenticated && isOnline) {
            console.log('👤 [IngredientsLoader] Carregando ingredientes DO USUÁRIO...');

            if (!window.PrecificacaoAPI?.ingredientManager) {
                console.error('❌ IngredientManager não disponível!');
                return await loadDefaultIngredients(); // Fallback
            }

            const ingredients = await window.PrecificacaoAPI.ingredientManager.loadIngredients();

            if (ingredients && ingredients.length > 0) {
                console.log(`✅ ${ingredients.length} ingredientes DO USUÁRIO carregados`);
                return ingredients;
            }

            console.warn('⚠️ Usuário sem ingredientes - usando default como fallback');
            return await loadDefaultIngredients();
        }

        // CASO 2: OFFLINE ou sem autenticação → Carregar ingredientes PADRÃO
        console.log('📦 [IngredientsLoader] Modo OFFLINE - carregando ingredientes PADRÃO...');
        return await loadDefaultIngredients();

    } catch (error) {
        console.error('❌ [IngredientsLoader] Erro:', error);
        return await loadDefaultIngredients(); // Fallback
    }
}

/**
 * Carregar ingredientes padrão (default_ingredients) do banco
 * Usado para modo OFFLINE
 */
async function loadDefaultIngredients() {
    try {
        console.log('🔄 Carregando ingredientes padrão do banco...');

        const response = await fetch(`${window.APP_CONFIG?.backend?.baseURL || 'https://precificacao-api-production.up.railway.app'}/api/public/default-ingredients`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
            console.log(`✅ ${result.count} ingredientes padrão carregados`);

            // Mapear para formato esperado pelo frontend
            return result.data.map(ing => ({
                id: ing.id,
                name: ing.name,
                unit: ing.unit,
                unitType: ing.unitType || 'weight',
                category: ing.category || 'Outros',
                unitCost: 0, // Padrão sem preço
                price: 0,
                preco: 0,
                lossPercentage: parseFloat(ing.lossPercentage || 0),
                loss: parseFloat(ing.lossPercentage || 0)
            }));
        }

        console.error('❌ Resposta inválida da API');
        return [];

    } catch (error) {
        console.error('❌ Erro ao carregar ingredientes padrão:', error);
        return [];
    }
}

// Disponibilizar globalmente
window.loadIngredientsHybrid = loadIngredientsHybrid;

console.log('✅ ingredients-loader.js carregado');
