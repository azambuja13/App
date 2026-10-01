/**
 * Testes para o componente Icon
 */

import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Icon } from './Icon.jsx';
import React from 'react';
describe('Icon Component', () => {
  test('renderiza ícone calculator', () => {
    render(/*#__PURE__*/React.createElement(Icon, {
      type: "calculator"
    }));
    const icon = screen.getByRole('img');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('aria-label', 'calculator icon');
  });
  test('renderiza ícone users', () => {
    render(/*#__PURE__*/React.createElement(Icon, {
      type: "users"
    }));
    const icon = screen.getByRole('img');
    expect(icon).toHaveAttribute('aria-label', 'users icon');
  });
  test('aplica className customizada', () => {
    render(/*#__PURE__*/React.createElement(Icon, {
      type: "dollar",
      className: "w-8 h-8 text-green-500"
    }));
    const icon = screen.getByRole('img');
    expect(icon).toHaveClass('w-8', 'h-8', 'text-green-500');
  });
  test('usa className padrão quando não fornecida', () => {
    render(/*#__PURE__*/React.createElement(Icon, {
      type: "plus"
    }));
    const icon = screen.getByRole('img');
    expect(icon).toHaveClass('w-6', 'h-6');
  });
  test('retorna null para tipo inválido', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(Icon, {
      type: "invalid-type"
    }));
    expect(container.firstChild).toBeNull();
  });
  test('renderiza todos os tipos de ícones disponíveis', () => {
    const iconTypes = ['calculator', 'users', 'dollar', 'package', 'plus', 'trash', 'edit', 'download', 'upload', 'file', 'lock', 'database', 'settings', 'trending'];
    iconTypes.forEach(type => {
      const {
        unmount
      } = render(/*#__PURE__*/React.createElement(Icon, {
        type: type
      }));
      const icon = screen.getByRole('img');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('aria-label', `${type} icon`);
      unmount();
    });
  });
});

// Expor ao window para uso com Babel
window.Icon.test = Icon.test;