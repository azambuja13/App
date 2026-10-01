import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { CostsSummary } from './CostsSummary.jsx';
describe('CostsSummary', () => {
  const mockCategoryStats = {
    'Proteínas': {
      total: 1500,
      items: 5,
      active: 4
    },
    'Vegetais': {
      total: 300,
      items: 2,
      active: 2
    },
    'Fora da Churrasqueira': {
      total: 200,
      items: 2,
      active: 1
    }
  };
  test('renderiza título corretamente', () => {
    render(/*#__PURE__*/React.createElement(CostsSummary, {
      categoryStats: {},
      supportCost: 0,
      laborCost: 0,
      transportCost: 0,
      subtotal: 0,
      totalCost: 0,
      pricePerPerson: 0,
      guests: 0
    }));
    expect(screen.getByText('Resumo Financeiro')).toBeInTheDocument();
  });
  test('renderiza categorias com estatísticas', () => {
    render(/*#__PURE__*/React.createElement(CostsSummary, {
      categoryStats: mockCategoryStats,
      supportCost: 500,
      laborCost: 1000,
      transportCost: 200,
      subtotal: 3700,
      totalCost: 3700,
      pricePerPerson: 37,
      guests: 100
    }));

    // Verificar se as categorias estão presentes
    expect(screen.getByText(/Proteínas \(4\/5\)/)).toBeInTheDocument();
    expect(screen.getByText(/Vegetais \(2\/2\)/)).toBeInTheDocument();
    expect(screen.getByText(/Fora da Churrasqueira \(1\/2\)/)).toBeInTheDocument();
  });
  test('renderiza custos de apoio e mão de obra', () => {
    render(/*#__PURE__*/React.createElement(CostsSummary, {
      categoryStats: {},
      supportCost: 500,
      laborCost: 1000,
      transportCost: 0,
      subtotal: 1500,
      totalCost: 1500,
      pricePerPerson: 15,
      guests: 100
    }));
    expect(screen.getByText('Apoio & Logística')).toBeInTheDocument();
    expect(screen.getByText('👷 Mão de Obra')).toBeInTheDocument();
  });
  test('renderiza transporte apenas quando custo > 0', () => {
    const {
      rerender
    } = render(/*#__PURE__*/React.createElement(CostsSummary, {
      categoryStats: {},
      supportCost: 0,
      laborCost: 0,
      transportCost: 0,
      subtotal: 0,
      totalCost: 0,
      pricePerPerson: 0,
      guests: 0
    }));

    // Não deve mostrar transporte quando é 0
    expect(screen.queryByText('🚗 Transporte')).not.toBeInTheDocument();

    // Deve mostrar transporte quando > 0
    rerender(/*#__PURE__*/React.createElement(CostsSummary, {
      categoryStats: {},
      supportCost: 0,
      laborCost: 0,
      transportCost: 200,
      subtotal: 200,
      totalCost: 200,
      pricePerPerson: 2,
      guests: 100
    }));
    expect(screen.getByText('🚗 Transporte')).toBeInTheDocument();
  });
  test('renderiza subtotal corretamente', () => {
    render(/*#__PURE__*/React.createElement(CostsSummary, {
      categoryStats: {},
      supportCost: 500,
      laborCost: 1000,
      transportCost: 200,
      subtotal: 1700,
      totalCost: 1717,
      pricePerPerson: 17.17,
      guests: 100
    }));
    expect(screen.getByText('Subtotal:')).toBeInTheDocument();
    expect(screen.getByText('R$ 1.700,00')).toBeInTheDocument();
  });
  test('renderiza total geral com destaque', () => {
    render(/*#__PURE__*/React.createElement(CostsSummary, {
      categoryStats: {},
      supportCost: 0,
      laborCost: 0,
      transportCost: 0,
      subtotal: 5000,
      totalCost: 5050,
      pricePerPerson: 50.50,
      guests: 100
    }));
    expect(screen.getByText('TOTAL GERAL')).toBeInTheDocument();
    expect(screen.getByText('R$ 5.050,00')).toBeInTheDocument();
  });
  test('renderiza preço por pessoa', () => {
    render(/*#__PURE__*/React.createElement(CostsSummary, {
      categoryStats: {},
      supportCost: 0,
      laborCost: 0,
      transportCost: 0,
      subtotal: 5000,
      totalCost: 5000,
      pricePerPerson: 50,
      guests: 100
    }));
    expect(screen.getByText('POR PESSOA')).toBeInTheDocument();
    expect(screen.getByText('R$ 50,00')).toBeInTheDocument();
    expect(screen.getByText('para 100 convidados')).toBeInTheDocument();
  });
  test('formata valores monetários corretamente', () => {
    render(/*#__PURE__*/React.createElement(CostsSummary, {
      categoryStats: {
        'Proteínas': {
          total: 1234.56,
          items: 1,
          active: 1
        }
      },
      supportCost: 789.12,
      laborCost: 3456.78,
      transportCost: 123.45,
      subtotal: 5603.91,
      totalCost: 5659.95,
      pricePerPerson: 56.60,
      guests: 100
    }));

    // Verificar formatação brasileira (R$ X.XXX,XX)
    expect(screen.getByText('R$ 1.234,56')).toBeInTheDocument();
    expect(screen.getByText('R$ 789,12')).toBeInTheDocument();
    expect(screen.getByText('R$ 3.456,78')).toBeInTheDocument();
    expect(screen.getByText('R$ 123,45')).toBeInTheDocument();
  });
  test('renderiza com valores zerados sem erros', () => {
    render(/*#__PURE__*/React.createElement(CostsSummary, {
      categoryStats: {},
      supportCost: 0,
      laborCost: 0,
      transportCost: 0,
      subtotal: 0,
      totalCost: 0,
      pricePerPerson: 0,
      guests: 0
    }));
    expect(screen.getByText('R$ 0,00')).toBeInTheDocument();
    expect(screen.getByText('para 0 convidados')).toBeInTheDocument();
  });
  test('renderiza múltiplas categorias corretamente', () => {
    render(/*#__PURE__*/React.createElement(CostsSummary, {
      categoryStats: mockCategoryStats,
      supportCost: 0,
      laborCost: 0,
      transportCost: 0,
      subtotal: 2000,
      totalCost: 2000,
      pricePerPerson: 20,
      guests: 100
    }));

    // Todas as categorias devem estar presentes
    const categories = screen.getAllByText(/\(\d+\/\d+\)/);
    expect(categories.length).toBe(3);
  });
  test('aplica classes CSS corretas para destaque visual', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(CostsSummary, {
      categoryStats: {},
      supportCost: 0,
      laborCost: 0,
      transportCost: 0,
      subtotal: 1000,
      totalCost: 1000,
      pricePerPerson: 10,
      guests: 100
    }));

    // Verificar se há gradiente no card de total
    const gradientCard = container.querySelector('.bg-gradient-to-br.from-orange-600');
    expect(gradientCard).toBeInTheDocument();
  });
  test('usa props padrão quando não fornecidas', () => {
    render(/*#__PURE__*/React.createElement(CostsSummary, null));

    // Deve renderizar sem erros com valores padrão
    expect(screen.getByText('Resumo Financeiro')).toBeInTheDocument();
    expect(screen.getByText('R$ 0,00')).toBeInTheDocument();
  });
});

// Expor ao window para uso com Babel
window.CostsSummary.test = CostsSummary.test;