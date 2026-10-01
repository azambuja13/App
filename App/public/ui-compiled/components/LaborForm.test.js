function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { LaborForm } from './LaborForm.jsx';
describe('LaborForm', () => {
  const defaultLabor = {
    hours: 10,
    hourlyRate: 500
  };
  const defaultProps = {
    labor: defaultLabor,
    onLaborChange: vi.fn(),
    laborCost: 5000.0
  };
  test('renderiza título corretamente', () => {
    render(/*#__PURE__*/React.createElement(LaborForm, defaultProps));
    expect(screen.getByText('👷 Mão de Obra')).toBeInTheDocument();
  });
  test('renderiza todos os campos', () => {
    render(/*#__PURE__*/React.createElement(LaborForm, defaultProps));
    expect(screen.getByText('Horas Trabalhadas')).toBeInTheDocument();
    expect(screen.getByText('Valor/Hora (R$)')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });
  test('exibe valores corretos nos inputs', () => {
    render(/*#__PURE__*/React.createElement(LaborForm, defaultProps));
    expect(screen.getByDisplayValue('10')).toBeInTheDocument(); // hours
    expect(screen.getByDisplayValue('500')).toBeInTheDocument(); // hourlyRate
  });
  test('exibe custo total formatado', () => {
    render(/*#__PURE__*/React.createElement(LaborForm, defaultProps));
    expect(screen.getByText('R$ 5000,00')).toBeInTheDocument();
  });
  test('chama callback ao alterar horas', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(/*#__PURE__*/React.createElement(LaborForm, _extends({}, defaultProps, {
      onLaborChange: mockOnChange
    })));
    const hoursInput = screen.getByDisplayValue('10');
    await user.clear(hoursInput);
    await user.type(hoursInput, '15');
    expect(mockOnChange).toHaveBeenCalled();
  });
  test('chama callback ao alterar valor/hora', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(/*#__PURE__*/React.createElement(LaborForm, _extends({}, defaultProps, {
      onLaborChange: mockOnChange
    })));
    const hourlyRateInput = screen.getByDisplayValue('500');
    await user.clear(hourlyRateInput);
    await user.type(hourlyRateInput, '600');
    expect(mockOnChange).toHaveBeenCalled();
  });
  test('exibe painel de detalhes do cálculo', () => {
    render(/*#__PURE__*/React.createElement(LaborForm, defaultProps));
    expect(screen.getByText('📊 Detalhes do Cálculo:')).toBeInTheDocument();
    expect(screen.getByText('• Horas: 10h')).toBeInTheDocument();
    expect(screen.getByText('• Valor/Hora: R$ 500,00')).toBeInTheDocument();
    expect(screen.getByText('• Total Mão de Obra: R$ 5000,00')).toBeInTheDocument();
  });
  test('exibe detalhes com valores zerados corretamente', () => {
    const labor = {
      hours: 0,
      hourlyRate: 0
    };
    render(/*#__PURE__*/React.createElement(LaborForm, _extends({}, defaultProps, {
      labor: labor,
      laborCost: 0
    })));
    expect(screen.getByText('• Horas: 0h')).toBeInTheDocument();
    expect(screen.getByText('• Valor/Hora: R$ 0,00')).toBeInTheDocument();
    expect(screen.getByText('• Total Mão de Obra: R$ 0,00')).toBeInTheDocument();
  });
  test('aceita valores decimais para horas (0.5)', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(/*#__PURE__*/React.createElement(LaborForm, _extends({}, defaultProps, {
      onLaborChange: mockOnChange
    })));
    const hoursInput = screen.getByDisplayValue('10');
    await user.clear(hoursInput);
    await user.type(hoursInput, '8.5');
    expect(mockOnChange).toHaveBeenCalled();
  });
  test('aceita valores decimais para valor/hora', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(/*#__PURE__*/React.createElement(LaborForm, _extends({}, defaultProps, {
      onLaborChange: mockOnChange
    })));
    const hourlyRateInput = screen.getByDisplayValue('500');
    await user.clear(hourlyRateInput);
    await user.type(hourlyRateInput, '550.50');
    expect(mockOnChange).toHaveBeenCalled();
  });
  test('aceita valores vazios nos inputs', () => {
    const labor = {
      hours: 0,
      hourlyRate: 0
    };
    render(/*#__PURE__*/React.createElement(LaborForm, _extends({}, defaultProps, {
      labor: labor
    })));
    const hoursInput = screen.getByPlaceholderText('10');
    const hourlyRateInput = screen.getByPlaceholderText('500');
    expect(hoursInput.value).toBe('');
    expect(hourlyRateInput.value).toBe('');
  });
  test('usa valores padrão quando labor não é fornecido', () => {
    render(/*#__PURE__*/React.createElement(LaborForm, {
      onLaborChange: vi.fn()
    }));
    expect(screen.getByText('👷 Mão de Obra')).toBeInTheDocument();
    expect(screen.getByText('R$ 0,00')).toBeInTheDocument();
  });
  test('inputs têm atributos corretos (type, step, min)', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(LaborForm, defaultProps));
    const numberInputs = container.querySelectorAll('input[type="number"]');
    expect(numberInputs.length).toBe(2); // hours e hourlyRate

    const hoursInput = screen.getByDisplayValue('10');
    expect(hoursInput).toHaveAttribute('step', '0.5');
    expect(hoursInput).toHaveAttribute('min', '0');
    const hourlyRateInput = screen.getByDisplayValue('500');
    expect(hourlyRateInput).toHaveAttribute('step', '0.01');
    expect(hourlyRateInput).toHaveAttribute('min', '0');
  });
  test('campo Total é readonly (não editável)', () => {
    render(/*#__PURE__*/React.createElement(LaborForm, defaultProps));

    // O Total é um div, não um input
    const totalDiv = screen.getByText('R$ 5000,00').parentElement;
    expect(totalDiv).toHaveClass('bg-green-50');
    expect(totalDiv.tagName).toBe('DIV');
  });
  test('renderiza com laborCost muito alto', () => {
    render(/*#__PURE__*/React.createElement(LaborForm, _extends({}, defaultProps, {
      laborCost: 999999.99
    })));
    expect(screen.getByText('R$ 999999,99')).toBeInTheDocument();
    expect(screen.getByText('• Total Mão de Obra: R$ 999999,99')).toBeInTheDocument();
  });
  test('renderiza com valores fracionários', () => {
    const labor = {
      hours: 8.5,
      hourlyRate: 550.75
    };
    const laborCost = 8.5 * 550.75;
    render(/*#__PURE__*/React.createElement(LaborForm, _extends({}, defaultProps, {
      labor: labor,
      laborCost: laborCost
    })));
    expect(screen.getByDisplayValue('8.5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('550.75')).toBeInTheDocument();
  });
  test('mantém consistência visual com estilos green-50', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(LaborForm, defaultProps));
    const greenElements = container.querySelectorAll('.bg-green-50');
    expect(greenElements.length).toBeGreaterThan(0); // Total e detalhes
  });
  test('exibe placeholder correto quando campos estão vazios', () => {
    const labor = {
      hours: 0,
      hourlyRate: 0
    };
    render(/*#__PURE__*/React.createElement(LaborForm, _extends({}, defaultProps, {
      labor: labor
    })));
    expect(screen.getByPlaceholderText('10')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('500')).toBeInTheDocument();
  });
  test('painel de detalhes sempre visível (não condicional)', () => {
    render(/*#__PURE__*/React.createElement(LaborForm, defaultProps));

    // Diferente de TransportForm, o painel de detalhes está sempre visível
    expect(screen.getByText('📊 Detalhes do Cálculo:')).toBeInTheDocument();
  });
});

// Expor ao window para uso com Babel
window.LaborForm.test = LaborForm.test;