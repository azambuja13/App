/**
 * PasswordSetup.test.jsx
 * Testes para o componente PasswordSetup
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordSetup } from './PasswordSetup';
describe('PasswordSetup', () => {
  let mockOnPasswordSet;
  beforeEach(() => {
    mockOnPasswordSet = vi.fn();
    localStorage.clear();
  });
  it('deve renderizar corretamente', () => {
    render(/*#__PURE__*/React.createElement(PasswordSetup, {
      appVersion: "1.0.0",
      onPasswordSet: mockOnPasswordSet
    }));
    expect(screen.getByText('Bem-vindo!')).toBeInTheDocument();
    expect(screen.getByText('Configure sua senha de acesso')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Digite sua senha')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Digite a senha novamente')).toBeInTheDocument();
  });
  it('deve mostrar erro quando senha tem menos de 4 caracteres', async () => {
    const user = userEvent.setup();
    render(/*#__PURE__*/React.createElement(PasswordSetup, {
      appVersion: "1.0.0",
      onPasswordSet: mockOnPasswordSet
    }));
    const passwordInput = screen.getByPlaceholderText('Digite sua senha');
    await user.type(passwordInput, '123');
    expect(screen.getByText('Digite no mínimo 4 caracteres')).toBeInTheDocument();
  });
  it('deve mostrar erro quando senhas não coincidem', async () => {
    const user = userEvent.setup();
    render(/*#__PURE__*/React.createElement(PasswordSetup, {
      appVersion: "1.0.0",
      onPasswordSet: mockOnPasswordSet
    }));
    const passwordInput = screen.getByPlaceholderText('Digite sua senha');
    const confirmInput = screen.getByPlaceholderText('Digite a senha novamente');
    await user.type(passwordInput, '1234');
    await user.type(confirmInput, '5678');
    expect(screen.getByText('As senhas não coincidem')).toBeInTheDocument();
  });
  it('deve mostrar mensagem de sucesso quando senhas coincidem', async () => {
    const user = userEvent.setup();
    render(/*#__PURE__*/React.createElement(PasswordSetup, {
      appVersion: "1.0.0",
      onPasswordSet: mockOnPasswordSet
    }));
    const passwordInput = screen.getByPlaceholderText('Digite sua senha');
    const confirmInput = screen.getByPlaceholderText('Digite a senha novamente');
    await user.type(passwordInput, '1234');
    await user.type(confirmInput, '1234');
    expect(screen.getByText('✓ Senhas coincidem')).toBeInTheDocument();
  });
  it('deve desabilitar botão quando senhas não são válidas', () => {
    render(/*#__PURE__*/React.createElement(PasswordSetup, {
      appVersion: "1.0.0",
      onPasswordSet: mockOnPasswordSet
    }));
    const button = screen.getByRole('button', {
      name: /Confirmar e Continuar/i
    });
    expect(button).toBeDisabled();
  });
  it('deve habilitar botão quando senhas são válidas', async () => {
    const user = userEvent.setup();
    render(/*#__PURE__*/React.createElement(PasswordSetup, {
      appVersion: "1.0.0",
      onPasswordSet: mockOnPasswordSet
    }));
    const passwordInput = screen.getByPlaceholderText('Digite sua senha');
    const confirmInput = screen.getByPlaceholderText('Digite a senha novamente');
    await user.type(passwordInput, '1234');
    await user.type(confirmInput, '1234');
    const button = screen.getByRole('button', {
      name: /Confirmar e Continuar/i
    });
    expect(button).toBeEnabled();
  });
  it('deve salvar senha no localStorage ao confirmar', async () => {
    const user = userEvent.setup();
    render(/*#__PURE__*/React.createElement(PasswordSetup, {
      appVersion: "1.0.0",
      onPasswordSet: mockOnPasswordSet
    }));
    const passwordInput = screen.getByPlaceholderText('Digite sua senha');
    const confirmInput = screen.getByPlaceholderText('Digite a senha novamente');
    const button = screen.getByRole('button', {
      name: /Confirmar e Continuar/i
    });
    await user.type(passwordInput, '1234');
    await user.type(confirmInput, '1234');
    await user.click(button);

    // Aguardar callback
    await vi.waitFor(() => {
      expect(localStorage.getItem('appPassword')).toBe('1234');
      expect(localStorage.getItem('passwordSet')).toBe('true');
      expect(mockOnPasswordSet).toHaveBeenCalled();
    });
  });
  it('deve alternar visibilidade da senha', async () => {
    const user = userEvent.setup();
    render(/*#__PURE__*/React.createElement(PasswordSetup, {
      appVersion: "1.0.0",
      onPasswordSet: mockOnPasswordSet
    }));
    const passwordInput = screen.getByPlaceholderText('Digite sua senha');
    const toggleButton = screen.getAllByRole('button')[0]; // Primeiro botão (toggle)

    expect(passwordInput).toHaveAttribute('type', 'password');
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
  it('deve submeter com Enter', async () => {
    const user = userEvent.setup();
    render(/*#__PURE__*/React.createElement(PasswordSetup, {
      appVersion: "1.0.0",
      onPasswordSet: mockOnPasswordSet
    }));
    const passwordInput = screen.getByPlaceholderText('Digite sua senha');
    const confirmInput = screen.getByPlaceholderText('Digite a senha novamente');
    await user.type(passwordInput, '1234');
    await user.type(confirmInput, '1234{Enter}');
    await vi.waitFor(() => {
      expect(mockOnPasswordSet).toHaveBeenCalled();
    });
  });
  it('deve exibir versão do app', () => {
    render(/*#__PURE__*/React.createElement(PasswordSetup, {
      appVersion: "2.5.3",
      onPasswordSet: mockOnPasswordSet
    }));
    expect(screen.getByText('Versão 2.5.3')).toBeInTheDocument();
  });
});

// Expor ao window para uso com Babel
window.PasswordSetup.test = PasswordSetup.test;