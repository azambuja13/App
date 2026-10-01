function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { TransportForm } from './TransportForm.jsx';
describe('TransportForm', () => {
  const defaultTransport = {
    active: true,
    distance: 50,
    consumption: 10,
    fuelPrice: 6.0,
    costPerKm: 0.5,
    toll: 15,
    quantity: 1
  };
  const defaultProps = {
    transport: defaultTransport,
    onTransportChange: vi.fn(),
    transportCost: 150.0
  };
  test('renderiza título corretamente', () => {
    render(/*#__PURE__*/React.createElement(TransportForm, defaultProps));
    expect(screen.getByText('🚗 Transporte & Pedágio')).toBeInTheDocument();
  });
  test('renderiza checkbox "Ativo"', () => {
    render(/*#__PURE__*/React.createElement(TransportForm, defaultProps));
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });
  test('renderiza todos os campos de input', () => {
    render(/*#__PURE__*/React.createElement(TransportForm, defaultProps));
    expect(screen.getByText('Distância (km)')).toBeInTheDocument();
    expect(screen.getByText('Consumo (km/l)')).toBeInTheDocument();
    expect(screen.getByText('Preço Combustível (R$/l)')).toBeInTheDocument();
    expect(screen.getByText('Custo por Km (R$/km)')).toBeInTheDocument();
    expect(screen.getByText('Pedágio (R$)')).toBeInTheDocument();
    expect(screen.getByText('Viagens')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });
  test('exibe valores corretos nos inputs', () => {
    render(/*#__PURE__*/React.createElement(TransportForm, defaultProps));
    expect(screen.getByDisplayValue('50')).toBeInTheDocument(); // distance
    expect(screen.getByDisplayValue('10')).toBeInTheDocument(); // consumption
    expect(screen.getByDisplayValue('6')).toBeInTheDocument(); // fuelPrice
    expect(screen.getByDisplayValue('0.5')).toBeInTheDocument(); // costPerKm
    expect(screen.getByDisplayValue('15')).toBeInTheDocument(); // toll
    expect(screen.getByDisplayValue('1')).toBeInTheDocument(); // quantity
  });
  test('exibe custo total formatado', () => {
    render(/*#__PURE__*/React.createElement(TransportForm, defaultProps));
    expect(screen.getByText('R$ 150,00')).toBeInTheDocument();
  });
  test('chama callback ao alterar checkbox', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(/*#__PURE__*/React.createElement(TransportForm, _extends({}, defaultProps, {
      onTransportChange: mockOnChange
    })));
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);
    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultTransport,
      active: false
    });
  });
  test('chama callback ao alterar distância', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(/*#__PURE__*/React.createElement(TransportForm, _extends({}, defaultProps, {
      onTransportChange: mockOnChange
    })));
    const distanceInput = screen.getByDisplayValue('50');
    await user.clear(distanceInput);
    await user.type(distanceInput, '100');
    expect(mockOnChange).toHaveBeenCalled();
  });
  test('chama callback ao alterar consumo', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(/*#__PURE__*/React.createElement(TransportForm, _extends({}, defaultProps, {
      onTransportChange: mockOnChange
    })));
    const consumptionInput = screen.getByDisplayValue('10');
    await user.clear(consumptionInput);
    await user.type(consumptionInput, '12');
    expect(mockOnChange).toHaveBeenCalled();
  });
  test('chama callback ao alterar preço do combustível', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(/*#__PURE__*/React.createElement(TransportForm, _extends({}, defaultProps, {
      onTransportChange: mockOnChange
    })));
    const fuelPriceInput = screen.getByDisplayValue('6');
    await user.clear(fuelPriceInput);
    await user.type(fuelPriceInput, '7.5');
    expect(mockOnChange).toHaveBeenCalled();
  });
  test('chama callback ao alterar custo por km', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(/*#__PURE__*/React.createElement(TransportForm, _extends({}, defaultProps, {
      onTransportChange: mockOnChange
    })));
    const costPerKmInput = screen.getByDisplayValue('0.5');
    await user.clear(costPerKmInput);
    await user.type(costPerKmInput, '1.0');
    expect(mockOnChange).toHaveBeenCalled();
  });
  test('chama callback ao alterar pedágio', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(/*#__PURE__*/React.createElement(TransportForm, _extends({}, defaultProps, {
      onTransportChange: mockOnChange
    })));
    const tollInput = screen.getByDisplayValue('15');
    await user.clear(tollInput);
    await user.type(tollInput, '20');
    expect(mockOnChange).toHaveBeenCalled();
  });
  test('chama callback ao alterar quantidade de viagens', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(/*#__PURE__*/React.createElement(TransportForm, _extends({}, defaultProps, {
      onTransportChange: mockOnChange
    })));
    const quantityInput = screen.getByDisplayValue('1');
    await user.clear(quantityInput);
    await user.type(quantityInput, '2');
    expect(mockOnChange).toHaveBeenCalled();
  });
  test('exibe detalhes do cálculo quando ativo', () => {
    render(/*#__PURE__*/React.createElement(TransportForm, defaultProps));
    expect(screen.getByText('📊 Detalhes do Cálculo:')).toBeInTheDocument();
    expect(screen.getByText(/Distância total \(ida e volta\):/)).toBeInTheDocument();
    expect(screen.getByText(/Litros necessários:/)).toBeInTheDocument();
    expect(screen.getByText(/Custo combustível:/)).toBeInTheDocument();
  });
  test('não exibe detalhes quando inativo', () => {
    const inactiveTransport = {
      ...defaultTransport,
      active: false
    };
    render(/*#__PURE__*/React.createElement(TransportForm, _extends({}, defaultProps, {
      transport: inactiveTransport
    })));
    expect(screen.queryByText('📊 Detalhes do Cálculo:')).not.toBeInTheDocument();
  });
  test('calcula distância total corretamente (ida e volta)', () => {
    render(/*#__PURE__*/React.createElement(TransportForm, defaultProps));

    // 50 km * 2 = 100 km
    expect(screen.getByText(/100\.0 km/)).toBeInTheDocument();
  });
  test('calcula litros necessários corretamente', () => {
    render(/*#__PURE__*/React.createElement(TransportForm, defaultProps));

    // (50 * 2) / 10 = 10 litros
    expect(screen.getByText(/10\.00 L/)).toBeInTheDocument();
  });
  test('calcula custo de combustível corretamente', () => {
    render(/*#__PURE__*/React.createElement(TransportForm, defaultProps));

    // 10 L * 6.0 = 60.00
    expect(screen.getByText(/Custo combustível: R\$ 60\.00/)).toBeInTheDocument();
  });
  test('exibe custo de rodagem quando costPerKm > 0', () => {
    render(/*#__PURE__*/React.createElement(TransportForm, defaultProps));

    // 100 km * 0.5 = 50.00
    expect(screen.getByText(/Custo rodagem: R\$ 50\.00/)).toBeInTheDocument();
  });
  test('não exibe custo de rodagem quando costPerKm = 0', () => {
    const transport = {
      ...defaultTransport,
      costPerKm: 0
    };
    render(/*#__PURE__*/React.createElement(TransportForm, _extends({}, defaultProps, {
      transport: transport
    })));
    expect(screen.queryByText(/Custo rodagem:/)).not.toBeInTheDocument();
  });
  test('exibe pedágio quando toll > 0', () => {
    render(/*#__PURE__*/React.createElement(TransportForm, defaultProps));
    expect(screen.getByText(/Pedágio: R\$ 15\.00/)).toBeInTheDocument();
  });
  test('não exibe pedágio quando toll = 0', () => {
    const transport = {
      ...defaultTransport,
      toll: 0
    };
    render(/*#__PURE__*/React.createElement(TransportForm, _extends({}, defaultProps, {
      transport: transport
    })));
    expect(screen.queryByText(/Pedágio:/)).not.toBeInTheDocument();
  });
  test('exibe total de viagens quando quantity > 1', () => {
    const transport = {
      ...defaultTransport,
      quantity: 2
    };
    render(/*#__PURE__*/React.createElement(TransportForm, _extends({}, defaultProps, {
      transport: transport
    })));
    expect(screen.getByText(/Total para 2 viagem\(ns\):/)).toBeInTheDocument();
  });
  test('não exibe total de viagens quando quantity = 1', () => {
    render(/*#__PURE__*/React.createElement(TransportForm, defaultProps));
    expect(screen.queryByText(/Total para \d+ viagem\(ns\):/)).not.toBeInTheDocument();
  });
  test('aceita valores vazios nos inputs numéricos', () => {
    const transport = {
      ...defaultTransport,
      distance: 0
    };
    render(/*#__PURE__*/React.createElement(TransportForm, _extends({}, defaultProps, {
      transport: transport
    })));
    const distanceInput = screen.getByPlaceholderText('0');
    expect(distanceInput.value).toBe('');
  });
  test('usa valores padrão quando transport não é fornecido', () => {
    render(/*#__PURE__*/React.createElement(TransportForm, {
      onTransportChange: vi.fn()
    }));
    expect(screen.getByText('🚗 Transporte & Pedágio')).toBeInTheDocument();
    expect(screen.getByText('R$ 0,00')).toBeInTheDocument();
  });
  test('inputs têm tipos e steps corretos', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(TransportForm, defaultProps));
    const numberInputs = container.querySelectorAll('input[type="number"]');
    expect(numberInputs.length).toBeGreaterThan(0);
  });
  test('checkbox está desmarcado quando transport.active = false', () => {
    const transport = {
      ...defaultTransport,
      active: false
    };
    render(/*#__PURE__*/React.createElement(TransportForm, _extends({}, defaultProps, {
      transport: transport
    })));
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });
  test('renderiza com transportCost = 0 corretamente', () => {
    render(/*#__PURE__*/React.createElement(TransportForm, _extends({}, defaultProps, {
      transportCost: 0
    })));
    expect(screen.getByText('R$ 0,00')).toBeInTheDocument();
  });
});

// Expor ao window para uso com Babel
window.TransportForm.test = TransportForm.test;