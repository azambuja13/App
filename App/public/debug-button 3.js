/**
 * BOTÃO DE DEBUG - Adiciona botão flutuante para debug
 * Carregue este arquivo no index.html para ter um botão de debug sempre disponível
 */

(function() {
    // Aguardar DOM carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        // Criar botão flutuante
        const button = document.createElement('button');
        button.innerHTML = '🔍 DEBUG';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 999999;
            padding: 15px 25px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 50px;
            font-weight: bold;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
        `;

        button.onmouseover = () => {
            button.style.transform = 'scale(1.05)';
            button.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
        };

        button.onmouseout = () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
        };

        button.onclick = runDebug;

        document.body.appendChild(button);
        console.log('✅ Botão de debug adicionado! Clique no botão "🔍 DEBUG" no canto inferior direito.');
    }

    function runDebug() {
        console.clear();
        console.log('%c🔍 DEBUG COMPLETO', 'font-size: 20px; font-weight: bold; color: #667eea; padding: 10px; background: #f0f0f0;');
        console.log('Executado em:', new Date().toLocaleString());
        console.log('');

        // 1. Verificar window.eventState
        console.log('%c📦 1. window.eventState', 'font-size: 16px; font-weight: bold; color: #764ba2;');
        if (!window.eventState) {
            console.error('❌ NÃO ENCONTRADO! Faça Hard Reload (Cmd+Shift+R)');
            alert('❌ window.eventState não encontrado!\n\nFaça Hard Reload: Cmd+Shift+R');
            return;
        }

        console.log('✅ ENCONTRADO!');
        console.log('Guests:', window.eventState.guests);
        console.log('Items:', window.eventState.items?.length);
        console.log('Ingredientes:', window.eventState.ingredientsDatabase?.length);
        console.log('');

        // 2. Verificar Ingredientes
        console.log('%c📋 2. Ingredientes', 'font-size: 16px; font-weight: bold; color: #764ba2;');
        const ingredients = window.eventState.ingredientsDatabase || [];
        console.log('Total:', ingredients.length);

        const comPreco = ingredients.filter(ing => ing.costPerUnit || ing.cost);
        console.log(`💰 COM preço: ${comPreco.length} de ${ingredients.length}`);

        if (comPreco.length === 0) {
            console.error('❌ PROBLEMA: NENHUM INGREDIENTE TEM PREÇO!');
            console.log('Isso explica por que os cálculos estão zerados.');
        }

        // Mostrar ingredientes do evento
        const relevantes = ['Pão de Hambúrguer', 'Hambúrguer do Chef', 'Creme Cheddar', 'Maionese de Bacon'];
        const found = ingredients.filter(ing => relevantes.includes(ing.name));

        console.log('Ingredientes do evento atual:');
        console.table(found.map(ing => ({
            nome: ing.name,
            id: ing.id,
            costPerUnit: ing.costPerUnit || 'UNDEFINED',
            cost: ing.cost || 'UNDEFINED',
            unitSize: ing.unitSize,
            unit: ing.unit,
            temPreco: !!(ing.costPerUnit || ing.cost) ? '✅' : '❌'
        })));
        console.log('');

        // 3. Verificar Items
        console.log('%c📌 3. Items do Evento', 'font-size: 16px; font-weight: bold; color: #764ba2;');
        const items = window.eventState.items || [];
        console.log('Total:', items.length);

        console.table(items.map(item => ({
            nome: item.name,
            ativo: item.active ? '✅' : '❌',
            ingredientId: item.ingredientId,
            qtyPerPerson: item.qtyPerPerson,
            unit: item.unit,
            qtyToBuy: item.qtyToBuy || 'NÃO CALC',
            total: (item.total || 0).toFixed(2)
        })));
        console.log('');

        // 4. Testar Cálculo
        console.log('%c🧮 4. Teste de Cálculo', 'font-size: 16px; font-weight: bold; color: #764ba2;');
        if (typeof window.calculateItems !== 'function') {
            console.error('❌ window.calculateItems NÃO ENCONTRADO!');
        } else {
            console.log('✅ window.calculateItems disponível');

            const calculated = window.calculateItems(items, ingredients, window.eventState.guests);

            console.log('Items calculados:', calculated.length);
            console.table(calculated.map(item => ({
                nome: item.name,
                qtyToBuy: (item.qtyToBuy || 0).toFixed(2),
                qtyInKgL: (item.qtyInKgL || 0).toFixed(2),
                costPerUnit: (item.costPerUnit || 0).toFixed(4),
                total: (item.total || 0).toFixed(2),
                status: item.total > 0 ? '✅' : '❌ R$ 0,00'
            })));
        }
        console.log('');

        // 5. Verificar Costs
        console.log('%c💰 5. Costs do App', 'font-size: 16px; font-weight: bold; color: #764ba2;');
        if (!window.costs) {
            console.error('❌ window.costs NÃO ENCONTRADO!');
        } else {
            console.log('✅ ENCONTRADO!');
            console.log({
                itemsCalculated: window.costs.itemsCalculated?.length,
                totalCost: window.costs.totalCost,
                pricePerPerson: window.costs.pricePerPerson,
                ingredientsCost: window.costs.ingredientsCost
            });
        }
        console.log('');

        // Diagnóstico Final
        console.log('%c🎯 DIAGNÓSTICO', 'font-size: 18px; font-weight: bold; color: #e74c3c; padding: 10px; background: #fff3cd;');

        if (comPreco.length === 0) {
            console.log('%c❌ PROBLEMA IDENTIFICADO: Ingredientes sem preço!', 'font-size: 14px; font-weight: bold; color: #e74c3c;');
            console.log('SOLUÇÃO:');
            console.log('1. Ir em "Banco de Ingredientes"');
            console.log('2. Editar cada ingrediente');
            console.log('3. Definir "Custo por Unidade"');
            console.log('4. Salvar');
            alert('❌ PROBLEMA ENCONTRADO!\n\nNenhum ingrediente tem preço definido!\n\nVá em "Banco de Ingredientes" e defina os preços.');
        } else if (items.every(item => (item.total || 0) === 0)) {
            console.log('%c⚠️ Items calculados mas total = 0', 'font-size: 14px; font-weight: bold; color: #f39c12;');
            console.log('Verifique se os ingredientes DOS ITEMS DO EVENTO têm preço.');
        } else {
            console.log('%c✅ Cálculos parecem estar funcionando!', 'font-size: 14px; font-weight: bold; color: #27ae60;');
        }

        console.log('');
        console.log('%c✅ DEBUG FINALIZADO!', 'font-size: 16px; font-weight: bold; color: #27ae60;');
        console.log('Copie todos os logs acima e envie para análise.');
    }
})();
