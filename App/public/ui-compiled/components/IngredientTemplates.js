(function() {
/**
 * IngredientTemplates - Modal com templates rápidos de ingredientes
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Se o modal está aberto
 * @param {Function} props.onClose - Callback para fechar o modal
 * @param {Function} props.onSelectTemplate - Callback ao selecionar template (array de ingredientes)
 * @returns {JSX.Element}
 */
function IngredientTemplates({ isOpen, onClose, onSelectTemplate }) {
  const { useState } = React;
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Templates pré-definidos
  const templates = {
    'cafe-manha': {
      name: '☕ Café da Manhã',
      description: 'Itens típicos de café da manhã',
      icon: '☕',
      color: 'from-yellow-500 to-orange-500',
      ingredients: [
        { name: 'Pão Francês', category: 'Carboidratos', unitType: 'unit', costPerUnit: 0.50, unitSize: 1, loss: 0 },
        { name: 'Manteiga', category: 'Gorduras', unitType: 'weight', costPerUnit: 15.00, unitSize: 500, loss: 0 },
        { name: 'Café em Pó', category: 'Bebidas', unitType: 'weight', costPerUnit: 12.00, unitSize: 500, loss: 0 },
        { name: 'Leite Integral', category: 'Laticínios', unitType: 'volume', costPerUnit: 4.50, unitSize: 1000, loss: 0 },
        { name: 'Açúcar', category: 'Carboidratos', unitType: 'weight', costPerUnit: 3.00, unitSize: 1000, loss: 0 },
        { name: 'Queijo Minas', category: 'Laticínios', unitType: 'weight', costPerUnit: 25.00, unitSize: 500, loss: 0 },
        { name: 'Presunto', category: 'Proteínas', unitType: 'weight', costPerUnit: 18.00, unitSize: 200, loss: 0 },
        { name: 'Suco de Laranja', category: 'Bebidas', unitType: 'volume', costPerUnit: 8.00, unitSize: 1000, loss: 0 }
      ]
    },
    'churrasco': {
      name: '🥩 Churrasco',
      description: 'Carnes e acompanhamentos para churrasco',
      icon: '🥩',
      color: 'from-red-500 to-rose-500',
      ingredients: [
        { name: 'Picanha', category: 'Proteínas', unitType: 'weight', costPerUnit: 80.00, unitSize: 1000, loss: 0.10 },
        { name: 'Maminha', category: 'Proteínas', unitType: 'weight', costPerUnit: 55.00, unitSize: 1000, loss: 0.10 },
        { name: 'Costela Bovina', category: 'Proteínas', unitType: 'weight', costPerUnit: 35.00, unitSize: 1000, loss: 0.15 },
        { name: 'Linguiça Toscana', category: 'Proteínas', unitType: 'weight', costPerUnit: 22.00, unitSize: 1000, loss: 0.05 },
        { name: 'Coração de Frango', category: 'Proteínas', unitType: 'weight', costPerUnit: 18.00, unitSize: 1000, loss: 0.05 },
        { name: 'Sal Grosso', category: 'Temperos', unitType: 'weight', costPerUnit: 3.00, unitSize: 1000, loss: 0 },
        { name: 'Carvão', category: 'Outros', unitType: 'weight', costPerUnit: 15.00, unitSize: 3000, loss: 0 },
        { name: 'Pão de Alho', category: 'Carboidratos', unitType: 'unit', costPerUnit: 8.00, unitSize: 1, loss: 0 },
        { name: 'Farofa Pronta', category: 'Carboidratos', unitType: 'weight', costPerUnit: 12.00, unitSize: 500, loss: 0 },
        { name: 'Vinagrete', category: 'Vegetais', unitType: 'weight', costPerUnit: 8.00, unitSize: 500, loss: 0 }
      ]
    },
    'festa-infantil': {
      name: '🎈 Festa Infantil',
      description: 'Salgados, doces e bebidas para festa infantil',
      icon: '🎈',
      color: 'from-pink-500 to-fuchsia-500',
      ingredients: [
        { name: 'Coxinha', category: 'Proteínas', unitType: 'unit', costPerUnit: 2.50, unitSize: 1, loss: 0 },
        { name: 'Bolinha de Queijo', category: 'Laticínios', unitType: 'unit', costPerUnit: 2.00, unitSize: 1, loss: 0 },
        { name: 'Risoles', category: 'Proteínas', unitType: 'unit', costPerUnit: 2.50, unitSize: 1, loss: 0 },
        { name: 'Refrigerante 2L', category: 'Bebidas', unitType: 'volume', costPerUnit: 7.00, unitSize: 2000, loss: 0 },
        { name: 'Suco de Caixinha', category: 'Bebidas', unitType: 'volume', costPerUnit: 5.00, unitSize: 1000, loss: 0 },
        { name: 'Brigadeiro', category: 'Sobremesas', unitType: 'unit', costPerUnit: 1.50, unitSize: 1, loss: 0 },
        { name: 'Beijinho', category: 'Sobremesas', unitType: 'unit', costPerUnit: 1.50, unitSize: 1, loss: 0 },
        { name: 'Pipoca Doce', category: 'Sobremesas', unitType: 'weight', costPerUnit: 15.00, unitSize: 500, loss: 0 },
        { name: 'Bolo de Aniversário', category: 'Sobremesas', unitType: 'weight', costPerUnit: 60.00, unitSize: 2000, loss: 0 }
      ]
    },
    'almoco-executivo': {
      name: '🍱 Almoço Executivo',
      description: 'Pratos básicos para almoço executivo',
      icon: '🍱',
      color: 'from-emerald-500 to-green-500',
      ingredients: [
        { name: 'Arroz Branco', category: 'Carboidratos', unitType: 'weight', costPerUnit: 5.00, unitSize: 1000, loss: 0 },
        { name: 'Feijão Preto', category: 'Proteínas', unitType: 'weight', costPerUnit: 8.00, unitSize: 1000, loss: 0 },
        { name: 'Filé de Frango', category: 'Proteínas', unitType: 'weight', costPerUnit: 18.00, unitSize: 1000, loss: 0.10 },
        { name: 'Carne Moída', category: 'Proteínas', unitType: 'weight', costPerUnit: 22.00, unitSize: 1000, loss: 0.10 },
        { name: 'Batata', category: 'Vegetais', unitType: 'weight', costPerUnit: 4.00, unitSize: 1000, loss: 0.15 },
        { name: 'Alface', category: 'Vegetais', unitType: 'weight', costPerUnit: 3.00, unitSize: 300, loss: 0.20 },
        { name: 'Tomate', category: 'Vegetais', unitType: 'weight', costPerUnit: 5.00, unitSize: 1000, loss: 0.10 },
        { name: 'Cenoura', category: 'Vegetais', unitType: 'weight', costPerUnit: 3.50, unitSize: 1000, loss: 0.15 },
        { name: 'Óleo de Soja', category: 'Gorduras', unitType: 'volume', costPerUnit: 8.00, unitSize: 900, loss: 0 },
        { name: 'Sal Refinado', category: 'Temperos', unitType: 'weight', costPerUnit: 2.00, unitSize: 1000, loss: 0 }
      ]
    },
    'jantar-fino': {
      name: '🍽️ Jantar Fino',
      description: 'Ingredientes premium para jantar sofisticado',
      icon: '🍽️',
      color: 'from-violet-500 to-purple-500',
      ingredients: [
        { name: 'Salmão', category: 'Proteínas', unitType: 'weight', costPerUnit: 65.00, unitSize: 1000, loss: 0.05 },
        { name: 'Camarão', category: 'Proteínas', unitType: 'weight', costPerUnit: 80.00, unitSize: 1000, loss: 0.10 },
        { name: 'Filé Mignon', category: 'Proteínas', unitType: 'weight', costPerUnit: 90.00, unitSize: 1000, loss: 0.08 },
        { name: 'Aspargos', category: 'Vegetais', unitType: 'weight', costPerUnit: 35.00, unitSize: 500, loss: 0.10 },
        { name: 'Cogumelo Paris', category: 'Vegetais', unitType: 'weight', costPerUnit: 25.00, unitSize: 400, loss: 0.05 },
        { name: 'Vinho Branco (culinária)', category: 'Bebidas', unitType: 'volume', costPerUnit: 20.00, unitSize: 750, loss: 0 },
        { name: 'Azeite Extra Virgem', category: 'Gorduras', unitType: 'volume', costPerUnit: 30.00, unitSize: 500, loss: 0 },
        { name: 'Queijo Parmesão', category: 'Laticínios', unitType: 'weight', costPerUnit: 80.00, unitSize: 500, loss: 0 },
        { name: 'Creme de Leite', category: 'Laticínios', unitType: 'volume', costPerUnit: 4.00, unitSize: 300, loss: 0 }
      ]
    },
    'bebidas': {
      name: '🍹 Bebidas',
      description: 'Bebidas diversas para eventos',
      icon: '🍹',
      color: 'from-sky-500 to-blue-500',
      ingredients: [
        { name: 'Água Mineral 500ml', category: 'Bebidas', unitType: 'volume', costPerUnit: 2.00, unitSize: 500, loss: 0 },
        { name: 'Refrigerante 2L', category: 'Bebidas', unitType: 'volume', costPerUnit: 7.00, unitSize: 2000, loss: 0 },
        { name: 'Cerveja Lata 350ml', category: 'Bebidas', unitType: 'volume', costPerUnit: 3.50, unitSize: 350, loss: 0 },
        { name: 'Suco Natural', category: 'Bebidas', unitType: 'volume', costPerUnit: 12.00, unitSize: 1000, loss: 0 },
        { name: 'Café Coado', category: 'Bebidas', unitType: 'volume', costPerUnit: 8.00, unitSize: 1000, loss: 0 },
        { name: 'Chá Gelado', category: 'Bebidas', unitType: 'volume', costPerUnit: 6.00, unitSize: 1000, loss: 0 }
      ]
    }
  };

  if (!isOpen) return null;

  const handleSelectTemplate = (templateKey) => {
    const template = templates[templateKey];
    if (!template) return;

    // Confirmar antes de adicionar
    if (confirm(`Adicionar ${template.ingredients.length} ingredientes do template "${template.name}"?`)) {
      onSelectTemplate(template.ingredients);
      onClose();
    }
  };

  return React.createElement('div', {
    className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4',
    onClick: onClose
  },
    React.createElement('div', {
      className: 'bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto',
      onClick: (e) => e.stopPropagation()
    },
      // Header
      React.createElement('div', {
        className: 'sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl flex items-center justify-between'
      },
        React.createElement('div', {},
          React.createElement('h2', { className: 'text-2xl font-bold flex items-center gap-3' },
            '📋 Templates Rápidos de Ingredientes'
          ),
          React.createElement('p', { className: 'text-blue-100 text-sm mt-1' },
            'Adicione múltiplos ingredientes de uma vez'
          )
        ),
        React.createElement('button', {
          onClick: onClose,
          className: 'text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition'
        }, '✕')
      ),

      // Content
      React.createElement('div', { className: 'p-6' },
        React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' },
          Object.entries(templates).map(([key, template]) =>
            React.createElement('button', {
              key: key,
              onClick: () => handleSelectTemplate(key),
              className: `bg-gradient-to-br ${template.color} text-white rounded-xl p-6 hover:shadow-xl transition-all transform hover:scale-105 text-left`
            },
              React.createElement('div', { className: 'text-4xl mb-3' }, template.icon),
              React.createElement('h3', { className: 'text-xl font-bold mb-2' }, template.name),
              React.createElement('p', { className: 'text-sm opacity-90 mb-3' }, template.description),
              React.createElement('div', { className: 'bg-white bg-opacity-20 rounded-lg px-3 py-2 text-sm font-semibold' },
                `${template.ingredients.length} ingredientes`
              )
            )
          )
        )
      ),

      // Footer
      React.createElement('div', {
        className: 'sticky bottom-0 bg-gray-50 p-4 rounded-b-2xl border-t border-gray-200 flex justify-end'
      },
        React.createElement('button', {
          onClick: onClose,
          className: 'px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold'
        }, 'Fechar')
      )
    )
  );
}

window.IngredientTemplates = IngredientTemplates;
})();
