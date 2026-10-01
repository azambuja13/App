function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { SupportList } from './SupportList.jsx';
describe('SupportList', () => {
  const mockSupportItems = [{
    id: 1,
    name: 'Carvão',
    cost: 50,
    quantity: 10,
    total: 500,
    active: true
  }, {
    id: 2,
    name: 'Gelo',
    cost: 20,
    quantity: 5,
    total: 100,
    active: true
  }, {
    id: 3,
    name: 'Descartáveis',
    cost: 150,
    quantity: 1,
    total: 150,
    active: false
  }];
  const defaultProps = {
    supportItems: mockSupportItems,
    onUpdateItem: vi.fn(),
    onDeleteItem: vi.fn(),
    newSupport: {
      name: '',
      cost: 0,
      quantity: 1
    },
    onNewSupportChange: vi.fn(),
    onAddSupport: vi.fn()
  };
  test('renderiza título corretamente', () => {
    render(/*#__PURE__*/React.createElement(SupportList, defaultProps));
    expect(screen.getByText('Apoio & Logística')).toBeInTheDocument();
  });
  test('renderiza formulário de novo item', () => {
    render(/*#__PURE__*/React.createElement(SupportList, defaultProps));
    expect(screen.getByText('Novo Item de Apoio')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ex: Equipamento de Som')).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: /adicionar item de apoio/i
    })).toBeInTheDocument();
  });
  test('renderiza todos os itens na tabela', () => {
    render(/*#__PURE__*/React.createElement(SupportList, defaultProps));
    expect(screen.getByDisplayValue('Carvão')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Gelo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Descartáveis')).toBeInTheDocument();
  });
  test('exibe cabeçalhos da tabela corretamente', () => {
    render(/*#__PURE__*/React.createElement(SupportList, defaultProps));
    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.getByText('Item')).toBeInTheDocument();
    expect(screen.getByText('Custo (R$)')).toBeInTheDocument();
    expect(screen.getByText('Qtd')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Ações')).toBeInTheDocument();
  });
  test('exibe totais calculados corretamente', () => {
    render(/*#__PURE__*/React.createElement(SupportList, defaultProps));
    expect(screen.getByText('R$ 500,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 100,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 150,00')).toBeInTheDocument();
  });
  test('chama callback ao alterar campo do novo item', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(/*#__PURE__*/React.createElement(SupportList, _extends({}, defaultProps, {
      onNewSupportChange: mockOnChange
    })));
    const nameInput = screen.getByPlaceholderText('Ex: Equipamento de Som');
    await user.type(nameInput, 'Mesa');
    expect(mockOnChange).toHaveBeenCalled();
  });
  test('chama callback ao adicionar item', async () => {
    const user = userEvent.setup();
    const mockOnAdd = vi.fn();
    render(/*#__PURE__*/React.createElement(SupportList, _extends({}, defaultProps, {
      onAddSupport: mockOnAdd
    })));
    const addButton = screen.getByRole('button', {
      name: /adicionar item de apoio/i
    });
    await user.click(addButton);
    expect(mockOnAdd).toHaveBeenCalled();
  });
  test('chama callback ao alterar checkbox', async () => {
    const user = userEvent.setup();
    const mockOnUpdate = vi.fn();
    render(/*#__PURE__*/React.createElement(SupportList, _extends({}, defaultProps, {
      onUpdateItem: mockOnUpdate
    })));
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[2]); // Descartáveis (inativo)

    expect(mockOnUpdate).toHaveBeenCalledWith(3, 'active', true);
  });
  test('chama callback ao alterar nome do item', async () => {
    const user = userEvent.setup();
    const mockOnUpdate = vi.fn();
    render(/*#__PURE__*/React.createElement(SupportList, _extends({}, defaultProps, {
      onUpdateItem: mockOnUpdate
    })));
    const nameInput = screen.getByDisplayValue('Carvão');
    await user.clear(nameInput);
    await user.type(nameInput, 'Carvão Premium');
    expect(mockOnUpdate).toHaveBeenCalled();
  });
  test('chama callback ao alterar custo', async () => {
    const user = userEvent.setup();
    const mockOnUpdate = vi.fn();
    render(/*#__PURE__*/React.createElement(SupportList, _extends({}, defaultProps, {
      onUpdateItem: mockOnUpdate
    })));
    const costInputs = screen.getAllByDisplayValue('50');
    await user.clear(costInputs[0]);
    await user.type(costInputs[0], '60');
    expect(mockOnUpdate).toHaveBeenCalled();
  });
  test('chama callback ao alterar quantidade', async () => {
    const user = userEvent.setup();
    const mockOnUpdate = vi.fn();
    render(/*#__PURE__*/React.createElement(SupportList, _extends({}, defaultProps, {
      onUpdateItem: mockOnUpdate
    })));
    const qtyInputs = screen.getAllByDisplayValue('10');
    await user.clear(qtyInputs[0]);
    await user.type(qtyInputs[0], '15');
    expect(mockOnUpdate).toHaveBeenCalled();
  });
  test('chama callback ao excluir item', async () => {
    const user = userEvent.setup();
    const mockOnDelete = vi.fn();
    render(/*#__PURE__*/React.createElement(SupportList, _extends({}, defaultProps, {
      onDeleteItem: mockOnDelete
    })));
    const deleteButtons = screen.getAllByTitle('Excluir');
    await user.click(deleteButtons[0]);
    expect(mockOnDelete).toHaveBeenCalledWith(1);
  });
  test('aplica opacidade em itens inativos', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(SupportList, defaultProps));
    const rows = container.querySelectorAll('tbody tr');
    // Terceira linha (Descartáveis) deve ter opacity-40
    expect(rows[2].className).toContain('opacity-40');
  });
  test('alterna cores de fundo das linhas', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(SupportList, defaultProps));
    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0].className).toContain('bg-white');
    expect(rows[1].className).toContain('bg-gray-50');
    expect(rows[2].className).toContain('bg-white');
  });
  test('mantém checkboxes sincronizados com estado active', () => {
    render(/*#__PURE__*/React.createElement(SupportList, defaultProps));
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked(); // Carvão (active: true)
    expect(checkboxes[1]).toBeChecked(); // Gelo (active: true)
    expect(checkboxes[2]).not.toBeChecked(); // Descartáveis (active: false)
  });
  test('renderiza sem itens corretamente', () => {
    render(/*#__PURE__*/React.createElement(SupportList, _extends({}, defaultProps, {
      supportItems: []
    })));
    expect(screen.getByText('Apoio & Logística')).toBeInTheDocument();
    expect(screen.getByText('Novo Item de Apoio')).toBeInTheDocument();
    // Tabela vazia - não deve haver linhas
    const {
      container
    } = render(/*#__PURE__*/React.createElement(SupportList, _extends({}, defaultProps, {
      supportItems: []
    })));
    expect(container.querySelectorAll('tbody tr').length).toBe(0);
  });
  test('exibe botão de excluir para cada item', () => {
    render(/*#__PURE__*/React.createElement(SupportList, defaultProps));
    const deleteButtons = screen.getAllByTitle('Excluir');
    expect(deleteButtons.length).toBe(3); // 3 itens
  });
  test('inputs de edição têm tipos corretos', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(SupportList, defaultProps));
    const numberInputs = container.querySelectorAll('input[type="number"]');
    expect(numberInputs.length).toBeGreaterThan(0); // Custo e Quantidade
  });
  test('campos do formulário têm valores padrão corretos', () => {
    render(/*#__PURE__*/React.createElement(SupportList, _extends({}, defaultProps, {
      newSupport: {
        name: 'Teste',
        cost: 100,
        quantity: 2
      }
    })));
    expect(screen.getByDisplayValue('Teste')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
  });
});

// Expor ao window para uso com Babel
window.SupportList.test = SupportList.test;