import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { ItemsList } from './ItemsList.jsx';
describe('ItemsList', () => {
  const mockGroupedItems = {
    'Proteínas': [{
      id: 1,
      name: 'Picanha',
      qtyPerPerson: 100,
      qtyToBuy: 10000,
      qtyInKgL: 10,
      total: 700,
      active: true,
      category: 'Proteínas'
    }, {
      id: 2,
      name: 'Frango',
      qtyPerPerson: 150,
      qtyToBuy: 15000,
      qtyInKgL: 15,
      total: 300,
      active: true,
      category: 'Proteínas'
    }],
    'Vegetais': [{
      id: 3,
      name: 'Mandioca',
      qtyPerPerson: 120,
      qtyToBuy: 12000,
      qtyInKgL: 12,
      total: 108,
      active: false,
      category: 'Vegetais'
    }]
  };
  const mockCategoryStats = {
    'Proteínas': {
      total: 1000,
      items: 2,
      active: 2
    },
    'Vegetais': {
      total: 108,
      items: 1,
      active: 0
    }
  };
  test('renderiza título corretamente', () => {
    render(/*#__PURE__*/React.createElement(ItemsList, {
      groupedItems: {},
      categoryStats: {},
      onUpdateItem: vi.fn(),
      onDeleteItem: vi.fn()
    }));
    expect(screen.getByText('Itens do Evento')).toBeInTheDocument();
  });
  test('renderiza categorias corretamente', () => {
    render(/*#__PURE__*/React.createElement(ItemsList, {
      groupedItems: mockGroupedItems,
      categoryStats: mockCategoryStats,
      onUpdateItem: vi.fn(),
      onDeleteItem: vi.fn()
    }));
    expect(screen.getByText('Proteínas')).toBeInTheDocument();
    expect(screen.getByText('Vegetais')).toBeInTheDocument();
  });
  test('renderiza itens dentro das categorias', () => {
    render(/*#__PURE__*/React.createElement(ItemsList, {
      groupedItems: mockGroupedItems,
      categoryStats: mockCategoryStats,
      onUpdateItem: vi.fn(),
      onDeleteItem: vi.fn()
    }));
    expect(screen.getByText('Picanha')).toBeInTheDocument();
    expect(screen.getByText('Frango')).toBeInTheDocument();
    expect(screen.getByText('Mandioca')).toBeInTheDocument();
  });
  test('exibe total de gramas por pessoa na categoria', () => {
    render(/*#__PURE__*/React.createElement(ItemsList, {
      groupedItems: mockGroupedItems,
      categoryStats: mockCategoryStats,
      onUpdateItem: vi.fn(),
      onDeleteItem: vi.fn()
    }));

    // Proteínas: 100 + 150 = 250g
    expect(screen.getByText('250g')).toBeInTheDocument();
    // Vegetais: item inativo, não soma = 0g
    expect(screen.getByText('0g')).toBeInTheDocument();
  });
  test('exibe custo total da categoria', () => {
    render(/*#__PURE__*/React.createElement(ItemsList, {
      groupedItems: mockGroupedItems,
      categoryStats: mockCategoryStats,
      onUpdateItem: vi.fn(),
      onDeleteItem: vi.fn()
    }));
    expect(screen.getByText('R$ 1.000,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 108,00')).toBeInTheDocument();
  });
  test('chama onUpdateItem ao alterar checkbox', async () => {
    const user = userEvent.setup();
    const mockOnUpdateItem = vi.fn();
    render(/*#__PURE__*/React.createElement(ItemsList, {
      groupedItems: mockGroupedItems,
      categoryStats: mockCategoryStats,
      onUpdateItem: mockOnUpdateItem,
      onDeleteItem: vi.fn()
    }));

    // Clicar no checkbox da Mandioca (que está inativo)
    const checkboxes = screen.getAllByRole('checkbox');
    const mandocaCheckbox = checkboxes[2]; // Terceiro checkbox

    await user.click(mandocaCheckbox);
    expect(mockOnUpdateItem).toHaveBeenCalledWith(3, 'active', true);
  });
  test('chama onUpdateItem ao alterar quantidade por pessoa', async () => {
    const user = userEvent.setup();
    const mockOnUpdateItem = vi.fn();
    render(/*#__PURE__*/React.createElement(ItemsList, {
      groupedItems: mockGroupedItems,
      categoryStats: mockCategoryStats,
      onUpdateItem: mockOnUpdateItem,
      onDeleteItem: vi.fn()
    }));
    const inputs = screen.getAllByPlaceholderText('0');
    await user.clear(inputs[0]);
    await user.type(inputs[0], '200');
    expect(mockOnUpdateItem).toHaveBeenCalled();
  });
  test('chama onDeleteItem ao clicar em excluir', async () => {
    const user = userEvent.setup();
    const mockOnDeleteItem = vi.fn();
    render(/*#__PURE__*/React.createElement(ItemsList, {
      groupedItems: mockGroupedItems,
      categoryStats: mockCategoryStats,
      onUpdateItem: vi.fn(),
      onDeleteItem: mockOnDeleteItem
    }));
    const deleteButtons = screen.getAllByRole('button', {
      name: /excluir/i
    });
    await user.click(deleteButtons[0]);
    expect(mockOnDeleteItem).toHaveBeenCalledWith(1);
  });
  test('aplica opacidade em itens inativos', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(ItemsList, {
      groupedItems: mockGroupedItems,
      categoryStats: mockCategoryStats,
      onUpdateItem: vi.fn(),
      onDeleteItem: vi.fn()
    }));
    const rows = container.querySelectorAll('tbody tr');
    // Terceira linha (Mandioca) deve ter opacity-40
    expect(rows[2].className).toContain('opacity-40');
  });
  test('renderiza valores calculados corretamente', () => {
    render(/*#__PURE__*/React.createElement(ItemsList, {
      groupedItems: mockGroupedItems,
      categoryStats: mockCategoryStats,
      onUpdateItem: vi.fn(),
      onDeleteItem: vi.fn()
    }));

    // Verificar quantidade a comprar
    expect(screen.getByText('10000')).toBeInTheDocument();
    expect(screen.getByText('15000')).toBeInTheDocument();

    // Verificar Kg/L (Math.ceil)
    expect(screen.getAllByText('10').length).toBeGreaterThan(0);
    expect(screen.getAllByText('15').length).toBeGreaterThan(0);
  });
  test('exibe campos de input para quantidade por pessoa', () => {
    render(/*#__PURE__*/React.createElement(ItemsList, {
      groupedItems: mockGroupedItems,
      categoryStats: mockCategoryStats,
      onUpdateItem: vi.fn(),
      onDeleteItem: vi.fn()
    }));
    const inputs = screen.getAllByPlaceholderText('0');
    expect(inputs.length).toBe(3); // 3 itens
  });
  test('formata valores monetários corretamente', () => {
    render(/*#__PURE__*/React.createElement(ItemsList, {
      groupedItems: mockGroupedItems,
      categoryStats: mockCategoryStats,
      onUpdateItem: vi.fn(),
      onDeleteItem: vi.fn()
    }));

    // Verificar formatação BRL
    expect(screen.getByText('R$ 700,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 300,00')).toBeInTheDocument();
  });
  test('renderiza sem itens corretamente', () => {
    render(/*#__PURE__*/React.createElement(ItemsList, {
      groupedItems: {},
      categoryStats: {},
      onUpdateItem: vi.fn(),
      onDeleteItem: vi.fn()
    }));
    expect(screen.getByText('Itens do Evento')).toBeInTheDocument();
    // Não deve haver categorias
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
  test('alterna cores de fundo das linhas (zebra striping)', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(ItemsList, {
      groupedItems: mockGroupedItems,
      categoryStats: mockCategoryStats,
      onUpdateItem: vi.fn(),
      onDeleteItem: vi.fn()
    }));
    const rows = container.querySelectorAll('tbody tr');
    // Primeira linha deve ter bg-white
    expect(rows[0].className).toContain('bg-white');
    // Segunda linha deve ter bg-gray-50
    expect(rows[1].className).toContain('bg-gray-50');
  });
  test('exibe todas as colunas da tabela', () => {
    render(/*#__PURE__*/React.createElement(ItemsList, {
      groupedItems: mockGroupedItems,
      categoryStats: mockCategoryStats,
      onUpdateItem: vi.fn(),
      onDeleteItem: vi.fn()
    }));
    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.getByText('Item')).toBeInTheDocument();
    expect(screen.getByText('g/Pessoa')).toBeInTheDocument();
    expect(screen.getByText('Comprar (g)')).toBeInTheDocument();
    expect(screen.getByText('Kg/L')).toBeInTheDocument();
    expect(screen.getByText('Total (R$)')).toBeInTheDocument();
  });
  test('mantém checkboxes sincronizados com estado active', () => {
    render(/*#__PURE__*/React.createElement(ItemsList, {
      groupedItems: mockGroupedItems,
      categoryStats: mockCategoryStats,
      onUpdateItem: vi.fn(),
      onDeleteItem: vi.fn()
    }));
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked(); // Picanha (active: true)
    expect(checkboxes[1]).toBeChecked(); // Frango (active: true)
    expect(checkboxes[2]).not.toBeChecked(); // Mandioca (active: false)
  });
});

// Expor ao window para uso com Babel
window.ItemsList.test = ItemsList.test;