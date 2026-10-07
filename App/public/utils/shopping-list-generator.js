/**
 * Gerador de Lista de Compras - Utilitário compartilhado
 * Usado por MenuPage.js e SavedMenusList.js
 */

/**
 * Processa lista de ingredientes e cria itens para o evento
 * @param {Array} ingredientsList - Lista de ingredientes consolidada (do MenuManager)
 * @param {number} guests - Número de convidados
 * @param {Array} allIngredients - Array de ingredientes do PostgreSQL
 * @returns {Array} Array de itens para adicionar ao evento
 */
export function processIngredientsToItems(ingredientsList, guests, allIngredients) {
    const newItems = [];

    ingredientsList.forEach(ing => {
            // ✅ IMPORTANTE: A quantidade na receita do prato é a quantidade PREPARADA/LÍQUIDA
            // A perda/rendimento DEVE ser aplicada INVERSAMENTE na lista de compras
            // para calcular a quantidade CRUA a comprar
            //
            // Exemplo: Prato com 1000g de costela preparada (ingrediente tem 50% perda)
            //          Para obter 1000g preparado, preciso comprar: 1000g ÷ (1 - 0.5) = 2000g cru
            //
            // Rendimento: Ingrediente que rende 150% (1.5x)
            //          Para obter 150g preparado, preciso comprar: 150g ÷ 1.5 = 100g cru

            const totalQuantity = ing.totalQuantity; // Quantidade preparada da receita
            const qtyPerPerson = totalQuantity / guests;

            // ✅ FIX: Usar perda/rendimento que vêm CONSOLIDADOS do MenuManager
            // (que já calculou a média ponderada se o ingrediente aparece em múltiplos pratos)
            // NÃO buscar do banco, pois podem ter mudado desde que os pratos foram criados
            const lossPercentage = ing.lossPercentage || 0;
            const yieldMultiplier = ing.yieldMultiplier || 1;

            console.log(`🔍 [ShoppingListGenerator] ${ing.ingredientName}:`, {
                total_receita_preparada: totalQuantity.toFixed(2) + ing.unit,
                por_pessoa_preparado: qtyPerPerson.toFixed(2) + ing.unit,
                convidados: guests,
                perda: lossPercentage + '%',
                rendimento: yieldMultiplier + 'x',
                obs: 'Perda/rendimento serão aplicados INVERSAMENTE na lista de compras'
            });

            const newItem = {
                id: Date.now() + Math.random(),
                name: ing.ingredientName,
                ingredientId: ing.ingredientId,
                qtyPerPerson: qtyPerPerson, // Quantidade preparada por pessoa
                unit: ing.unit,
                unitType: ing.unitType,
                loss: lossPercentage, // ✅ Aplicar perda inversamente (preprado → cru)
                yieldMultiplier: yieldMultiplier, // ✅ Aplicar rendimento inversamente
                active: true
            };
            console.log('📦 [ShoppingListGenerator] Item criado:', newItem);
            newItems.push(newItem);
        });

    return newItems;
}

// Expor no window para uso em componentes não-módulo
if (typeof window !== 'undefined') {
    window.ShoppingListGenerator = {
        processIngredientsToItems
    };
}
