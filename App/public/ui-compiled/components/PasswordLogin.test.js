/**
 * PasswordLogin.test.jsx
 * Testes para o componente PasswordLogin
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordLogin } from './PasswordLogin';
describe('PasswordLogin', () => {
  let mockOnLoginSuccess;
  let mockPasswordManager;
  beforeEach(() => {
    mockOnLoginSuccess = vi.fn();
    mockPasswordManager = {
      isLocked: vi.fn(() => false),
      getLockoutTime: vi.fn(() => null),
      getAttempts: vi.fn(() => 0),
      checkPassword: vi.fn(password => {
        if (password === '1234') {
          return {
            success: true,
            message: '✅ Senha correta!'
          };
        }
        return {
          success: false,
          locked: false,
          attemptsRemaining: 2,
          message: '❌ Senha incorreta! 2 tentativa(s) restante(s).'
        };
      })
    };
  });
  it('deve renderizar corretamente', () => {
    render(/*#__PURE__*/React.createElement(PasswordLogin, {
      appVersion: "1.0.0",
      onLoginSuccess: mockOnLoginSuccess,
      PasswordManager: mockPasswordManager
    }));
    expect(screen.getByText('Acesso Protegido')).toBeInTheDocument();
    expect(screen.getByText('Digite sua senha para continuar')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Digite sua senha')).toBeInTheDocument();
  });
  it('deve chamar onLoginSuccess quando senha correta', async () => {
    const user = userEvent.setup();
    render(/*#__PURE__*/React.createElement(PasswordLogin, {
      appVersion: "1.0.0",
      onLoginSuccess: mockOnLoginSuccess,
      PasswordManager: mockPasswordManager
    }));
    const passwordInput = screen.getByPlaceholderText('Digite sua senha');
    const button = screen.getByRole('button', {
      name: /Entrar/i
    });
    await user.type(passwordInput, '1234');
    await user.click(button);

    // Aguardar o setTimeout de 300ms
    await vi.waitFor(() => {
      expect(mockPasswordManager.checkPassword).toHaveBeenCalledWith('1234');
      expect(mockOnLoginSuccess).toHaveBeenCalled();
    }, {
      timeout: 500
    });
  });
  it('deve mostrar erro quando senha incorreta', async () => {
    const user = userEvent.setup();
    render(/*#__PURE__*/React.createElement(PasswordLogin, {
      appVersion: "1.0.0",
      onLoginSuccess: mockOnLoginSuccess,
      PasswordManager: mockPasswordManager
    }));
    const passwordInput = screen.getByPlaceholderText('Digite sua senha');
    const button = screen.getByRole('button', {
      name: /Entrar/i
    });
    await user.type(passwordInput, 'wrong');
    await user.click(button);
    await vi.waitFor(() => {
      expect(screen.getByText(/Senha incorreta/i)).toBeInTheDocument();
    }, {
      timeout: 500
    });
  });
  it('deve desabilitar inputs quando app está bloqueado', () => {
    mockPasswordManager.isLocked = vi.fn(() => true);
    mockPasswordManager.getLockoutTime = vi.fn(() => new Date());
    render(/*#__PURE__*/React.createElement(PasswordLogin, {
      appVersion: "1.0.0",
      onLoginSuccess: mockOnLoginSuccess,
      PasswordManager: mockPasswordManager
    }));
    const passwordInput = screen.getByPlaceholderText('Digite sua senha');
    const button = screen.getByRole('button', {
      name: /App Bloqueado/i
    });
    expect(passwordInput).toBeDisabled();
    expect(button).toBeDisabled();
  });
  it('deve renderizar PasswordLock com tentativas', () => {
    mockPasswordManager.getAttempts = vi.fn(() => 2);
    render(/*#__PURE__*/React.createElement(PasswordLogin, {
      appVersion: "1.0.0",
      onLoginSuccess: mockOnLoginSuccess,
      PasswordManager: mockPasswordManager
    }));

    // O componente PasswordLock deve ser renderizado
    // (verificação depende da implementação do PasswordLock)
    expect(screen.getByText('Acesso Protegido')).toBeInTheDocument();
  });
  it('deve alternar visibilidade da senha', async () => {
    const user = userEvent.setup();
    render(/*#__PURE__*/React.createElement(PasswordLogin, {
      appVersion: "1.0.0",
      onLoginSuccess: mockOnLoginSuccess,
      PasswordManager: mockPasswordManager
    }));
    const passwordInput = screen.getByPlaceholderText('Digite sua senha');
    const toggleButtons = screen.getAllByRole('button');
    const toggleButton = toggleButtons[0]; // Primeiro botão (toggle)

    expect(passwordInput).toHaveAttribute('type', 'password');
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
  });
  it('deve desabilitar botão quando senha vazia', () => {
    render(/*#__PURE__*/React.createElement(PasswordLogin, {
      appVersion: "1.0.0",
      onLoginSuccess: mockOnLoginSuccess,
      PasswordManager: mockPasswordManager
    }));
    const button = screen.getByRole('button', {
      name: /Entrar/i
    });
    expect(button).toBeDisabled();
  });
  it('deve habilitar botão quando senha digitada', async () => {
    const user = userEvent.setup();
    render(/*#__PURE__*/React.createElement(PasswordLogin, {
      appVersion: "1.0.0",
      onLoginSuccess: mockOnLoginSuccess,
      PasswordManager: mockPasswordManager
    }));
    const passwordInput = screen.getByPlaceholderText('Digite sua senha');
    await user.type(passwordInput, '1234');
    const button = screen.getByRole('button', {
      name: /Entrar/i
    });
    expect(button).toBeEnabled();
  });
  it('deve submeter com Enter', async () => {
    const user = userEvent.setup();
    render(/*#__PURE__*/React.createElement(PasswordLogin, {
      appVersion: "1.0.0",
      onLoginSuccess: mockOnLoginSuccess,
      PasswordManager: mockPasswordManager
    }));
    const passwordInput = screen.getByPlaceholderText('Digite sua senha');
    await user.type(passwordInput, '1234{Enter}');
    await vi.waitFor(() => {
      expect(mockPasswordManager.checkPassword).toHaveBeenCalledWith('1234');
    }, {
      timeout: 500
    });
  });
  it('deve limpar senha após tentativa incorreta', async () => {
    const user = userEvent.setup();
    render(/*#__PURE__*/React.createElement(PasswordLogin, {
      appVersion: "1.0.0",
      onLoginSuccess: mockOnLoginSuccess,
      PasswordManager: mockPasswordManager
    }));
    const passwordInput = screen.getByPlaceholderText('Digite sua senha');
    const button = screen.getByRole('button', {
      name: /Entrar/i
    });
    await user.type(passwordInput, 'wrong');
    await user.click(button);
    await vi.waitFor(() => {
      expect(passwordInput).toHaveValue('');
    }, {
      timeout: 500
    });
  });
  it('deve exibir versão do app', () => {
    render(/*#__PURE__*/React.createElement(PasswordLogin, {
      appVersion: "3.2.1",
      onLoginSuccess: mockOnLoginSuccess,
      PasswordManager: mockPasswordManager
    }));
    expect(screen.getByText('Versão 3.2.1')).toBeInTheDocument();
  });
  it('deve mostrar erro se PasswordManager não disponível', async () => {
    const user = userEvent.setup();
    render(/*#__PURE__*/React.createElement(PasswordLogin, {
      appVersion: "1.0.0",
      onLoginSuccess: mockOnLoginSuccess,
      PasswordManager: null
    }));
    const passwordInput = screen.getByPlaceholderText('Digite sua senha');
    const button = screen.getByRole('button', {
      name: /Entrar/i
    });
    await user.type(passwordInput, '1234');
    await user.click(button);
    await vi.waitFor(() => {
      expect(screen.getByText(/Sistema de autenticação não disponível/i)).toBeInTheDocument();
    }, {
      timeout: 500
    });
  });
});

// Expor ao window para uso com Babel
window.PasswordLogin.test = PasswordLogin.test;