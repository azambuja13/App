/**
 * SERVIÇO DE INGREDIENTES
 *
 * Estratégia baseada no modo:
 *
 * MODO ONLINE/CLOUD:
 * 1. Tenta carregar do cache local
 * 2. Se não tiver, busca da API PostgreSQL
 * 3. Se falhar, retorna vazio (eventState carregará do backend)
 *
 * MODO OFFLINE:
 * 1. Tenta carregar do cache local
 * 2. Se não tiver, busca da API PostgreSQL (primeira vez)
 * 3. Se falhar, usa DEFAULT_INGREDIENTS (fallback offline)
 */

class IngredientsService {
    constructor() {
        this.API_URL = window.APP_CONFIG?.backend?.baseURL || 'https://precificacao-api-production.up.railway.app';
        this.CACHE_KEY = 'ingredientes-database';
        this.CACHE_VERSION_KEY = 'ingredientes-version';
        this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas
    }

    /**
     * Carrega ingredientes usando estratégia híbrida
     */
    async loadIngredients() {
        console.log('🔄 [IngredientsService] Carregando ingredientes...');

        try {
            // 1. Tentar carregar do cache local (IndexedDB)
            const cached = await this.getFromCache();
            if (cached && this.isCacheValid(cached)) {
                console.log('✅ [IngredientsService] Usando ingredientes do cache local');
                return cached.ingredients;
            }

            // 2. Tentar buscar da API (se online)
            try {
                const fromAPI = await this.fetchFromAPI();
                if (fromAPI && fromAPI.length > 0) {
                    console.log(`✅ [IngredientsService] ${fromAPI.length} ingredientes carregados da API`);
                    await this.saveToCache(fromAPI);
                    return fromAPI;
                }
            } catch (apiError) {
                console.warn('⚠️ [IngredientsService] API indisponível:', apiError.message);
            }

            // ✅ Fallback baseado no modo
            const isOfflineMode = window.APP_CONFIG?.appMode === 'OFFLINE';

            if (isOfflineMode && window.DEFAULT_INGREDIENTS && window.DEFAULT_INGREDIENTS.length > 0) {
                // MODO OFFLINE: usar DEFAULT_INGREDIENTS como fallback
                console.log('📦 [IngredientsService] Modo OFFLINE - usando ingredientes padrão (fallback)');
                const ingredients = window.DEFAULT_INGREDIENTS.map((ing, index) => ({
                    id: ing.id || `default-${index + 1}`,
                    name: ing.name,
                    unit: ing.unit,
                    category: ing.category,
                    unitCost: ing.unitCost || 0,
                    lossPercentage: ing.lossPercentage || 0
                }));

                // Salvar no cache para próxima vez
                await this.saveToCache(ingredients);
                return ingredients;
            }

            // MODO ONLINE: retornar vazio (eventState carregará do backend)
            console.error('❌ [IngredientsService] API PostgreSQL indisponível');
            if (!isOfflineMode) {
                console.error('   Modo ONLINE - ingredientes serão carregados do eventState/backend');
            }
            return [];

        } catch (error) {
            console.error('❌ [IngredientsService] Erro ao carregar ingredientes:', error);
            return [];
        }
    }

    /**
     * Busca ingredientes da API pública
     */
    async fetchFromAPI() {
        const url = `${this.API_URL}/api/public/ingredients`;

        console.log(`🌐 [IngredientsService] Buscando da API: ${url}`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success || !data.data) {
                throw new Error('Resposta inválida da API');
            }

            return data.data;

        } catch (error) {
            clearTimeout(timeout);

            if (error.name === 'AbortError') {
                throw new Error('Timeout ao buscar ingredientes da API');
            }

            throw error;
        }
    }

    /**
     * Busca ingredientes do cache local (IndexedDB)
     */
    async getFromCache() {
        try {
            if (!window.indexedDBStorage) {
                console.warn('⚠️ IndexedDB não disponível');
                return null;
            }

            const cached = await window.indexedDBStorage.getItem(this.CACHE_KEY);

            if (!cached) {
                return null;
            }

            return cached;

        } catch (error) {
            console.error('❌ Erro ao buscar cache:', error);
            return null;
        }
    }

    /**
     * Salva ingredientes no cache local
     */
    async saveToCache(ingredients) {
        try {
            if (!window.indexedDBStorage) {
                console.warn('⚠️ IndexedDB não disponível para salvar cache');
                return;
            }

            const cacheData = {
                ingredients: ingredients,
                version: '1.0',
                cachedAt: Date.now(),
                count: ingredients.length
            };

            await window.indexedDBStorage.setItem(this.CACHE_KEY, cacheData);
            console.log(`💾 [IngredientsService] ${ingredients.length} ingredientes salvos no cache`);

        } catch (error) {
            console.error('❌ Erro ao salvar cache:', error);
        }
    }

    /**
     * Verifica se o cache ainda é válido
     */
    isCacheValid(cached) {
        if (!cached || !cached.cachedAt) {
            return false;
        }

        const age = Date.now() - cached.cachedAt;
        const isValid = age < this.CACHE_DURATION;

        if (!isValid) {
            console.log('⏰ [IngredientsService] Cache expirado');
        }

        return isValid;
    }

    /**
     * Força atualização do cache buscando da API
     */
    async refreshCache() {
        console.log('🔄 [IngredientsService] Forçando atualização do cache...');

        try {
            const ingredients = await this.fetchFromAPI();

            if (ingredients && ingredients.length > 0) {
                await this.saveToCache(ingredients);
                console.log('✅ [IngredientsService] Cache atualizado com sucesso');
                return ingredients;
            }

            throw new Error('Nenhum ingrediente retornado da API');

        } catch (error) {
            console.error('❌ [IngredientsService] Erro ao atualizar cache:', error);
            throw error;
        }
    }

    /**
     * Limpa o cache de ingredientes
     */
    async clearCache() {
        try {
            if (!window.indexedDBStorage) {
                return;
            }

            await window.indexedDBStorage.removeItem(this.CACHE_KEY);
            await window.indexedDBStorage.removeItem(this.CACHE_VERSION_KEY);

            console.log('🗑️ [IngredientsService] Cache limpo');

        } catch (error) {
            console.error('❌ Erro ao limpar cache:', error);
        }
    }

    /**
     * Busca estatísticas da API
     */
    async getStats() {
        try {
            const url = `${this.API_URL}/api/public/ingredients/stats`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('❌ Erro ao buscar estatísticas:', error);
            return null;
        }
    }
}

// Exportar instância singleton
const ingredientsService = new IngredientsService();

// Disponibilizar globalmente
window.IngredientsService = IngredientsService;
window.ingredientsService = ingredientsService;

console.log('✅ IngredientsService inicializado');

export default ingredientsService;
