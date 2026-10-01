function UnitConverter({ onConvert, defaultUnit = 'kg' }) {
  const { useState } = React;
  const [packagePrice, setPackagePrice] = useState('');
  const [packageSize, setPackageSize] = useState('');
  const [packageUnit, setPackageUnit] = useState('g');
  const [targetUnit, setTargetUnit] = useState(defaultUnit || 'kg');
  const [result, setResult] = useState(null);
  const [showConverter, setShowConverter] = useState(true);

  const conversionRates = {
    // Peso
    'g_kg': 1000,
    'kg_g': 1/1000,
    // Volume
    'ml_L': 1000,
    'L_ml': 1/1000,
    // Quantidade
    'un_dz': 12,
    'dz_un': 1/12
  };

  const calculate = () => {
    const price = parseFloat(packagePrice.replace(',', '.'));
    const size = parseFloat(packageSize.replace(',', '.'));

    if (!price || !size || price <= 0 || size <= 0) {
      alert('Preencha preço e quantidade com valores válidos');
      return;
    }

    let pricePerUnit = 0;
    const conversionKey = `${packageUnit}_${targetUnit}`;

    if (packageUnit === targetUnit) {
      // Mesma unidade
      pricePerUnit = price / size;
    } else if (conversionRates[conversionKey]) {
      // Conversão direta
      pricePerUnit = (price / size) * conversionRates[conversionKey];
    } else {
      alert(`Conversão de ${packageUnit} para ${targetUnit} não suportada`);
      return;
    }

    setResult({
      value: pricePerUnit,
      unit: targetUnit,
      calculation: `R$ ${price.toFixed(2)} ÷ ${size} ${packageUnit} × ${conversionRates[conversionKey] || 1} = R$ ${pricePerUnit.toFixed(4)}/${targetUnit}`
    });

    // Chamar callback se fornecido
    if (onConvert) {
      onConvert(pricePerUnit);
    }
  };

  const clear = () => {
    setPackagePrice('');
    setPackageSize('');
    setResult(null);
  };

  const getCompatibleUnits = (unit) => {
    if (['g', 'kg'].includes(unit)) return ['g', 'kg'];
    if (['ml', 'L'].includes(unit)) return ['ml', 'L'];
    if (['un', 'dz'].includes(unit)) return ['un', 'dz'];
    return [unit];
  };

  // Versão minimizada (quando fechado)
  if (!showConverter) {
    return React.createElement('button', {
      onClick: () => setShowConverter(true),
      className: 'w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:shadow-lg transition flex items-center justify-center gap-2 sticky top-4'
    },
      '🧮 Abrir Calculadora de Conversão'
    );
  }

  return React.createElement('div', {
    className: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-3 h-fit sticky top-4'
  },
    // Header com botão de fechar
    React.createElement('div', { className: 'mb-2 flex items-center justify-between' },
      React.createElement('h4', { className: 'font-semibold text-blue-800 flex items-center gap-2 text-sm' },
        '🧮 Calculadora de Conversão'
      ),
      React.createElement('button', {
        onClick: () => setShowConverter(false),
        className: 'text-gray-500 hover:text-gray-700 transition'
      }, '✕')
    ),

    React.createElement('p', { className: 'text-xs text-gray-600 mb-2' },
      'Comprou uma embalagem? Calcule o preço unitário automaticamente.'
    ),

    // Form
    React.createElement('div', { className: 'space-y-2 mb-2' },
      // Preço da embalagem
      React.createElement('div', {},
        React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-1' },
          'Preço da embalagem (R$)'
        ),
        React.createElement('input', {
          type: 'text',
          value: packagePrice,
          onChange: (e) => setPackagePrice(e.target.value),
          placeholder: 'Ex: 12,50',
          className: 'w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm'
        })
      ),

      // Quantidade na embalagem
      React.createElement('div', {},
        React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-1' },
          'Quantidade na embalagem'
        ),
        React.createElement('div', { className: 'flex gap-2' },
          React.createElement('input', {
            type: 'text',
            value: packageSize,
            onChange: (e) => setPackageSize(e.target.value),
            placeholder: 'Ex: 500',
            className: 'flex-1 px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm'
          }),
          React.createElement('select', {
            value: packageUnit,
            onChange: (e) => {
              setPackageUnit(e.target.value);
              // Ajustar targetUnit para ser compatível
              const compatibleUnits = getCompatibleUnits(e.target.value);
              if (!compatibleUnits.includes(targetUnit)) {
                setTargetUnit(compatibleUnits[compatibleUnits.length - 1]);
              }
            },
            className: 'px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm'
          },
            React.createElement('option', { value: 'g' }, 'g'),
            React.createElement('option', { value: 'kg' }, 'kg'),
            React.createElement('option', { value: 'ml' }, 'ml'),
            React.createElement('option', { value: 'L' }, 'L'),
            React.createElement('option', { value: 'un' }, 'un'),
            React.createElement('option', { value: 'dz' }, 'dz')
          )
        )
      )
    ),

    // Target unit selector
    React.createElement('div', { className: 'mb-2' },
      React.createElement('label', { className: 'block text-xs font-medium text-gray-700 mb-1' },
        'Converter para'
      ),
      React.createElement('select', {
        value: targetUnit,
        onChange: (e) => setTargetUnit(e.target.value),
        className: 'w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm'
      },
        getCompatibleUnits(packageUnit).map(unit =>
          React.createElement('option', { key: unit, value: unit }, unit)
        )
      )
    ),

    // Buttons
    React.createElement('div', { className: 'flex gap-2' },
      React.createElement('button', {
        type: 'button',
        onClick: calculate,
        className: 'flex-1 bg-blue-600 text-white font-semibold py-1.5 px-3 rounded-lg hover:bg-blue-700 transition text-sm'
      }, 'Calcular'),
      result && React.createElement('button', {
        type: 'button',
        onClick: clear,
        className: 'px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm'
      }, 'Limpar')
    ),

    // Result
    result && React.createElement('div', { className: 'mt-3 bg-white rounded-lg p-3 border-2 border-green-500' },
      React.createElement('p', { className: 'text-xs text-gray-600 mb-1' }, 'Preço unitário:'),
      React.createElement('p', { className: 'text-xl font-bold text-green-600 mb-1' },
        `R$ ${result.value.toFixed(4)}/${result.unit}`
      ),
      React.createElement('p', { className: 'text-xs text-gray-500 font-mono' },
        result.calculation
      ),
      onConvert && React.createElement('p', { className: 'text-xs text-blue-600 mt-2' },
        '✓ Valor aplicado ao campo acima'
      )
    ),

    // Exemplos
    !result && React.createElement('div', { className: 'mt-2 p-2 bg-white rounded-lg' },
      React.createElement('p', { className: 'text-xs font-semibold text-gray-700 mb-2' }, 'Exemplos:'),
      React.createElement('div', { className: 'space-y-1 text-xs text-gray-600' },
        React.createElement('p', {}, '• Pacote 500g por R$ 12,00 = R$ 24,00/kg'),
        React.createElement('p', {}, '• Garrafa 2L por R$ 8,50 = R$ 4,25/L'),
        React.createElement('p', {}, '• Caixa 12un por R$ 36,00 = R$ 3,00/un')
      )
    )
  );
}

window.UnitConverter = UnitConverter;
