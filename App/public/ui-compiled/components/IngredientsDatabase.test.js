function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { IngredientsDatabase } from './IngredientsDatabase.jsx';
describe('IngredientsDatabase', () => {
  const mockGroupedIngredients = {
    'Proteínas': [{
      id: 1,
      name: 'Picanha',
      category: 'Proteínas',
      loss: 0.1,
      costPerUnit: 70,
      unitSize: 1000
    }, {
      id: 2,
      name: 'Frango',
      category: 'Proteínas',
      loss: 0.1,
      costPerUnit: 20,
      unitSize: 1000
    }],
    'Vegetais': [{
      id: 3,
      name: 'Mandioca',
      category: 'Vegetais',
      loss: 0,
      costPerUnit: 9,
      unitSize: 1000
    }]
  };
  const mockIngredientsInUse = new Set([1]); // Picanha está em uso

  const defaultProps = {
    groupedIngredients: mockGroupedIngredients,
    ingredientsInUse: mockIngredientsInUse,
    newIngredient: {
      name: '',
      category: 'Proteínas',
      loss: 0,
      costPerUnit: 0,
      unitSize: 0
    },
    onNewIngredientChange: vi.fn(),
    onAddIngredient: vi.fn(),
    editingIngredient: null,
    onStartEditing: vi.fn(),
    onEditingChange: vi.fn(),
    onSaveEditing: vi.fn(),
    onCancelEditing: vi.fn(),
    onDeleteIngredient: vi.fn(),
    onAddToEvent: vi.fn()
  };
  test('renderiza título corretamente', () => {
    render(/*#__PURE__*/React.createElement(IngredientsDatabase, defaultProps));
    expect(screen.getByText('Cadastro de Ingredientes')).toBeInTheDocument();
  });
  test('renderiza formulário de novo ingrediente', () => {
    render(/*#__PURE__*/React.createElement(IngredientsDatabase, defaultProps));
    expect(screen.getByText('Novo Ingrediente')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ex: Picanha')).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: /adicionar ingrediente/i
    })).toBeInTheDocument();
  });
  test('renderiza categorias corretamente', () => {
    render(/*#__PURE__*/React.createElement(IngredientsDatabase, defaultProps));
    expect(screen.getByText('Proteínas')).toBeInTheDocument();
    expect(screen.getByText('Vegetais')).toBeInTheDocument();
    expect(screen.getByText('2 ingredientes')).toBeInTheDocument();
    expect(screen.getByText('1 ingredientes')).toBeInTheDocument();
  });
  test('renderiza ingredientes na tabela', () => {
    render(/*#__PURE__*/React.createElement(IngredientsDatabase, defaultProps));
    expect(screen.getByText('Picanha')).toBeInTheDocument();
    expect(screen.getByText('Frango')).toBeInTheDocument();
    expect(screen.getByText('Mandioca')).toBeInTheDocument();
  });
  test('exibe indicador "Em Uso" para ingrediente em uso', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(IngredientsDatabase, defaultProps));
    const inUseIcons = container.querySelectorAll('.bg-green-100');
    expect(inUseIcons.length).toBeGreaterThan(0); // Picanha está em uso
  });
  test('chama callback ao alterar campo do novo ingrediente', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(/*#__PURE__*/React.createElement(IngredientsDatabase, _extends({}, defaultProps, {
      onNewIngredientChange: mockOnChange
    })));
    const nameInput = screen.getByPlaceholderText('Ex: Picanha');
    await user.type(nameInput, 'Costela');
    expect(mockOnChange).toHaveBeenCalled();
  });
  test('chama callback ao adicionar ingrediente', async () => {
    const user = userEvent.setup();
    const mockOnAdd = vi.fn();
    render(/*#__PURE__*/React.createElement(IngredientsDatabase, _extends({}, defaultProps, {
      onAddIngredient: mockOnAdd
    })));
    const addButton = screen.getByRole('button', {
      name: /adicionar ingrediente/i
    });
    await user.click(addButton);
    expect(mockOnAdd).toHaveBeenCalled();
  });
  test('exibe botões de ação para cada ingrediente', () => {
    render(/*#__PURE__*/React.createElement(IngredientsDatabase, defaultProps));

    // Cada ingrediente tem 3 botões: Editar, Adicionar ao Evento, Excluir
    const editButtons = screen.getAllByTitle('Editar');
    const addButtons = screen.getAllByTitle('Adicionar ao Evento');
    const deleteButtons = screen.getAllByTitle('Excluir');
    expect(editButtons.length).toBe(3); // 3 ingredientes
    expect(addButtons.length).toBe(3);
    expect(deleteButtons.length).toBe(3);
  });
  test('chama callback ao iniciar edição', async () => {
    const user = userEvent.setup();
    const mockOnStartEditing = vi.fn();
    render(/*#__PURE__*/React.createElement(IngredientsDatabase, _extends({}, defaultProps, {
      onStartEditing: mockOnStartEditing
    })));
    const editButtons = screen.getAllByTitle('Editar');
    await user.click(editButtons[0]);
    expect(mockOnStartEditing).toHaveBeenCalled();
  });
  test('chama callback ao adicionar ao evento', async () => {
    const user = userEvent.setup();
    const mockOnAddToEvent = vi.fn();
    render(/*#__PURE__*/React.createElement(IngredientsDatabase, _extends({}, defaultProps, {
      onAddToEvent: mockOnAddToEvent
    })));
    const addButtons = screen.getAllByTitle('Adicionar ao Evento');
    await user.click(addButtons[0]);
    expect(mockOnAddToEvent).toHaveBeenCalledWith(1); // ID da Picanha
  });
  test('chama callback ao excluir ingrediente', async () => {
    const user = userEvent.setup();
    const mockOnDelete = vi.fn();
    render(/*#__PURE__*/React.createElement(IngredientsDatabase, _extends({}, defaultProps, {
      onDeleteIngredient: mockOnDelete
    })));
    const deleteButtons = screen.getAllByTitle('Excluir');
    await user.click(deleteButtons[0]);
    expect(mockOnDelete).toHaveBeenCalledWith(1);
  });
  test('exibe modo de edição quando editingIngredient está definido', () => {
    const editingIngredient = {
      id: 1,
      name: 'Picanha',
      loss: 0.1,
      costPerUnit: 70,
      unitSize: 1000
    };
    render(/*#__PURE__*/React.createElement(IngredientsDatabase, _extends({}, defaultProps, {
      editingIngredient: editingIngredient
    })));
    expect(screen.getByRole('button', {
      name: /salvar/i
    })).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: /cancelar/i
    })).toBeInTheDocument();
  });
  test('chama callback ao salvar edição', async () => {
    const user = userEvent.setup();
    const mockOnSave = vi.fn();
    const editingIngredient = {
      id: 1,
      name: 'Picanha',
      loss: 0.1,
      costPerUnit: 70,
      unitSize: 1000
    };
    render(/*#__PURE__*/React.createElement(IngredientsDatabase, _extends({}, defaultProps, {
      editingIngredient: editingIngredient,
      onSaveEditing: mockOnSave
    })));
    const saveButton = screen.getByRole('button', {
      name: /salvar/i
    });
    await user.click(saveButton);
    expect(mockOnSave).toHaveBeenCalled();
  });
  test('chama callback ao cancelar edição', async () => {
    const user = userEvent.setup();
    const mockOnCancel = vi.fn();
    const editingIngredient = {
      id: 1,
      name: 'Picanha',
      loss: 0.1,
      costPerUnit: 70,
      unitSize: 1000
    };
    render(/*#__PURE__*/React.createElement(IngredientsDatabase, _extends({}, defaultProps, {
      editingIngredient: editingIngredient,
      onCancelEditing: mockOnCancel
    })));
    const cancelButton = screen.getByRole('button', {
      name: /cancelar/i
    });
    await user.click(cancelButton);
    expect(mockOnCancel).toHaveBeenCalled();
  });
  test('calcula custo por grama/ml corretamente', () => {
    render(/*#__PURE__*/React.createElement(IngredientsDatabase, defaultProps));

    // Picanha: R$ 70 / (1000g - 100g perda) = R$ 0.0778/g
    expect(screen.getByText('R$ 0.0778')).toBeInTheDocument();

    // Frango: R$ 20 / (1000g - 100g perda) = R$ 0.0222/g
    expect(screen.getByText('R$ 0.0222')).toBeInTheDocument();

    // Mandioca: R$ 9 / 1000g = R$ 0.0090/g
    expect(screen.getByText('R$ 0.0090')).toBeInTheDocument();
  });
  test('exibe perda como porcentagem', () => {
    render(/*#__PURE__*/React.createElement(IngredientsDatabase, defaultProps));

    // Perda de 10% deve aparecer como "10%"
    const percentages = screen.getAllByText('10%');
    expect(percentages.length).toBeGreaterThanOrEqual(2); // Picanha e Frango
  });
  test('renderiza select com categorias corretas', () => {
    render(/*#__PURE__*/React.createElement(IngredientsDatabase, defaultProps));
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    const options = Array.from(select.querySelectorAll('option')).map(opt => opt.textContent);
    expect(options).toContain('Proteínas');
    expect(options).toContain('Vegetais');
    expect(options).toContain('Fora da Churrasqueira');
    expect(options).toContain('Bebidas');
    expect(options).toContain('Sobremesas');
  });
  test('exibe todas as colunas da tabela', () => {
    render(/*#__PURE__*/React.createElement(IngredientsDatabase, defaultProps));
    expect(screen.getByText('Em Uso')).toBeInTheDocument();
    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getByText('Perda %')).toBeInTheDocument();
    expect(screen.getByText('Custo/Un (R$)')).toBeInTheDocument();
    expect(screen.getByText('Tam. Un. (g/ml)')).toBeInTheDocument();
    expect(screen.getByText('R$/g ou ml')).toBeInTheDocument();
    expect(screen.getByText('Ações')).toBeInTheDocument();
  });
  test('renderiza sem ingredientes corretamente', () => {
    render(/*#__PURE__*/React.createElement(IngredientsDatabase, _extends({}, defaultProps, {
      groupedIngredients: {}
    })));
    expect(screen.getByText('Cadastro de Ingredientes')).toBeInTheDocument();
    expect(screen.getByText('Novo Ingrediente')).toBeInTheDocument();
    // Não deve haver categorias
    expect(screen.queryByText('Proteínas')).not.toBeInTheDocument();
  });
});

// Expor ao window para uso com Babel
window.IngredientsDatabase.test = IngredientsDatabase.test;