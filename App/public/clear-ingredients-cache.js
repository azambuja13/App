/**
 * SCRIPT PARA LIMPAR CACHE DE INGREDIENTES
 *
 * Execute este script no console do navegador (F12) quando os ingredientes
 * não estiverem atualizados após mudanças no banco de dados.
 *
 * Como usar:
 * 1. Abra o console (F12)
 * 2. Cole todo o código abaixo
 * 3. Pressione Enter
 * 4. A página recarregará automaticamente com dados atualizados
 */

(async function clearIngredientsCache() {
    console.log('🧹 Limpando cache de ingredientes...');

    try {
        // 1. Limpar cache do IndexedDB
        if (window.indexedDBStorage) {
            await window.indexedDBStorage.removeItem('ingredientes-database');
            await window.indexedDBStorage.removeItem('ingredientes-version');
            console.log('✅ Cache do IndexedDB limpo');
        }

        // 2. Limpar cache do IngredientsService
        if (window.ingredientsService) {
            window.ingredientsService.ingredients = [];
            console.log('✅ Cache do IngredientsService limpo');
        }

        // 3. Limpar cache do IngredientManager (api-client)
        if (window.PrecificacaoAPI && window.PrecificacaoAPI.ingredientManager) {
            window.PrecificacaoAPI.ingredientManager.ingredients = [];
            window.PrecificacaoAPI.ingredientManager.initialized = false;
            console.log('✅ Cache do IngredientManager limpo');
        }

        // 4. Limpar localStorage se houver
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('ingrediente')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        if (keysToRemove.length > 0) {
            console.log(`✅ ${keysToRemove.length} chaves do localStorage limpas`);
        }

        console.log('🎉 Cache limpo com sucesso! Recarregando página...');

        // 5. Recarregar página
        setTimeout(() => {
            window.location.reload();
        }, 1000);

    } catch (error) {
        console.error('❌ Erro ao limpar cache:', error);
        alert('Erro ao limpar cache. Tente fazer Hard Refresh (Ctrl+Shift+R)');
    }
})();
