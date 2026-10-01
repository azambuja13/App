function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { LicenseActivation } from './LicenseActivation.jsx';
describe('LicenseActivation', () => {
  const defaultProps = {
    appVersion: '1.0.0',
    licenseKey: '',
    onLicenseKeyChange: vi.fn(),
    licenseError: '',
    onActivate: vi.fn()
  };
  test('renderiza título corretamente', () => {
    render(/*#__PURE__*/React.createElement(LicenseActivation, defaultProps));
    expect(screen.getByText('Calculadora de Precificação')).toBeInTheDocument();
  });
  test('exibe versão do app', () => {
    render(/*#__PURE__*/React.createElement(LicenseActivation, _extends({}, defaultProps, {
      appVersion: "2.5.3"
    })));
    expect(screen.getByText('Eventos & Churrascos v2.5.3')).toBeInTheDocument();
  });
  test('renderiza seção de ativação de licença', () => {
    render(/*#__PURE__*/React.createElement(LicenseActivation, defaultProps));
    expect(screen.getByText('Ativação de Licença')).toBeInTheDocument();
    expect(screen.getByText('Insira sua chave de licença para ativar o aplicativo.')).toBeInTheDocument();
  });
  test('renderiza input de chave de licença', () => {
    render(/*#__PURE__*/React.createElement(LicenseActivation, defaultProps));
    const input = screen.getByPlaceholderText('CLIENTE-emailbase64-20261231-hash...');
    expect(input).toBeInTheDocument();
  });
  test('exibe valor da licenseKey no input', () => {
    render(/*#__PURE__*/React.createElement(LicenseActivation, _extends({}, defaultProps, {
      licenseKey: "TEST-KEY-123"
    })));
    expect(screen.getByDisplayValue('TEST-KEY-123')).toBeInTheDocument();
  });
  test('chama onLicenseKeyChange ao digitar', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(/*#__PURE__*/React.createElement(LicenseActivation, _extends({}, defaultProps, {
      onLicenseKeyChange: mockOnChange
    })));
    const input = screen.getByPlaceholderText('CLIENTE-emailbase64-20261231-hash...');
    await user.type(input, 'ABC');
    expect(mockOnChange).toHaveBeenCalledTimes(3); // Uma vez para cada letra
  });
  test('renderiza botão "Ativar Licença"', () => {
    render(/*#__PURE__*/React.createElement(LicenseActivation, defaultProps));
    expect(screen.getByText('Ativar Licença')).toBeInTheDocument();
  });
  test('botão está desabilitado quando licenseKey está vazio', () => {
    render(/*#__PURE__*/React.createElement(LicenseActivation, _extends({}, defaultProps, {
      licenseKey: ""
    })));
    const button = screen.getByText('Ativar Licença');
    expect(button).toBeDisabled();
  });
  test('botão está desabilitado quando licenseKey tem apenas espaços', () => {
    render(/*#__PURE__*/React.createElement(LicenseActivation, _extends({}, defaultProps, {
      licenseKey: "   "
    })));
    const button = screen.getByText('Ativar Licença');
    expect(button).toBeDisabled();
  });
  test('botão está habilitado quando licenseKey tem conteúdo', () => {
    render(/*#__PURE__*/React.createElement(LicenseActivation, _extends({}, defaultProps, {
      licenseKey: "VALID-KEY"
    })));
    const button = screen.getByText('Ativar Licença');
    expect(button).not.toBeDisabled();
  });
  test('chama onActivate ao clicar no botão', async () => {
    const user = userEvent.setup();
    const mockOnActivate = vi.fn();
    render(/*#__PURE__*/React.createElement(LicenseActivation, _extends({}, defaultProps, {
      licenseKey: "VALID-KEY",
      onActivate: mockOnActivate
    })));
    const button = screen.getByText('Ativar Licença');
    await user.click(button);
    expect(mockOnActivate).toHaveBeenCalledTimes(1);
  });
  test('chama onActivate ao pressionar Enter no input', async () => {
    const user = userEvent.setup();
    const mockOnActivate = vi.fn();
    render(/*#__PURE__*/React.createElement(LicenseActivation, _extends({}, defaultProps, {
      licenseKey: "VALID-KEY",
      onActivate: mockOnActivate
    })));
    const input = screen.getByPlaceholderText('CLIENTE-emailbase64-20261231-hash...');
    await user.type(input, '{Enter}');
    expect(mockOnActivate).toHaveBeenCalledTimes(1);
  });
  test('não chama onActivate ao pressionar Enter com licenseKey vazio', async () => {
    const user = userEvent.setup();
    const mockOnActivate = vi.fn();
    render(/*#__PURE__*/React.createElement(LicenseActivation, _extends({}, defaultProps, {
      licenseKey: "",
      onActivate: mockOnActivate
    })));
    const input = screen.getByPlaceholderText('CLIENTE-emailbase64-20261231-hash...');
    await user.type(input, '{Enter}');
    expect(mockOnActivate).not.toHaveBeenCalled();
  });
  test('não exibe mensagem de erro quando licenseError está vazio', () => {
    render(/*#__PURE__*/React.createElement(LicenseActivation, _extends({}, defaultProps, {
      licenseError: ""
    })));
    expect(screen.queryByText(/Chave de licença inválida/)).not.toBeInTheDocument();
  });
  test('exibe mensagem de erro quando licenseError é fornecido', () => {
    render(/*#__PURE__*/React.createElement(LicenseActivation, _extends({}, defaultProps, {
      licenseError: "Chave de licen\xE7a inv\xE1lida"
    })));
    expect(screen.getByText('Chave de licença inválida')).toBeInTheDocument();
  });
  test('exibe erro de licença revogada', () => {
    render(/*#__PURE__*/React.createElement(LicenseActivation, _extends({}, defaultProps, {
      licenseError: "\u26D4 Licen\xE7a REVOGADA pelo administrador. Entre em contato com o suporte."
    })));
    expect(screen.getByText(/Licença REVOGADA/)).toBeInTheDocument();
  });
  test('exibe erro de licença já ativa em outro dispositivo', () => {
    render(/*#__PURE__*/React.createElement(LicenseActivation, _extends({}, defaultProps, {
      licenseError: "\u26D4 Esta licen\xE7a j\xE1 est\xE1 ativa em outro dispositivo!"
    })));
    expect(screen.getByText(/já está ativa em outro dispositivo/)).toBeInTheDocument();
  });
  test('exibe erro de formato inválido', () => {
    render(/*#__PURE__*/React.createElement(LicenseActivation, _extends({}, defaultProps, {
      licenseError: "Formato de chave inv\xE1lido"
    })));
    expect(screen.getByText('Formato de chave inválido')).toBeInTheDocument();
  });
  test('exibe erro de licença expirada', () => {
    render(/*#__PURE__*/React.createElement(LicenseActivation, _extends({}, defaultProps, {
      licenseError: "Licen\xE7a expirada em 25/12/2024"
    })));
    expect(screen.getByText(/Licença expirada em/)).toBeInTheDocument();
  });
  test('renderiza ícone de calculadora', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(LicenseActivation, defaultProps));
    // Icon component renderiza um elemento com classe específica
    expect(container.querySelector('.w-16.h-16.text-orange-600')).toBeInTheDocument();
  });
  test('renderiza ícone de lock na info box', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(LicenseActivation, defaultProps));
    expect(container.querySelector('.w-5.h-5')).toBeInTheDocument();
  });
  test('renderiza mensagem de contato no footer', () => {
    render(/*#__PURE__*/React.createElement(LicenseActivation, defaultProps));
    expect(screen.getByText('Entre em contato com o fornecedor para obter sua chave de licença.')).toBeInTheDocument();
  });
  test('aplica classes de gradiente no background', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(LicenseActivation, defaultProps));
    const background = container.querySelector('.bg-gradient-to-br.from-orange-600.to-red-600');
    expect(background).toBeInTheDocument();
  });
  test('input tem classe font-mono para chave de licença', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(LicenseActivation, defaultProps));
    const input = container.querySelector('.font-mono');
    expect(input).toBeInTheDocument();
  });
  test('erro é exibido com borda vermelha', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(LicenseActivation, _extends({}, defaultProps, {
      licenseError: "Erro de teste"
    })));
    const errorBox = container.querySelector('.border-red-500');
    expect(errorBox).toBeInTheDocument();
  });
  test('info box tem borda laranja', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(LicenseActivation, defaultProps));
    const infoBox = container.querySelector('.border-orange-600');
    expect(infoBox).toBeInTheDocument();
  });
  test('botão tem estilo de hover', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(LicenseActivation, _extends({}, defaultProps, {
      licenseKey: "VALID"
    })));
    const button = container.querySelector('.hover\\:bg-orange-700');
    expect(button).toBeInTheDocument();
  });
  test('usa valores padrão quando props não são fornecidas', () => {
    render(/*#__PURE__*/React.createElement(LicenseActivation, {
      onLicenseKeyChange: vi.fn(),
      onActivate: vi.fn()
    }));
    expect(screen.getByText('Eventos & Churrascos v1.0.0')).toBeInTheDocument();
  });
  test('label do input é visível', () => {
    render(/*#__PURE__*/React.createElement(LicenseActivation, defaultProps));
    expect(screen.getByText('Chave de Licença')).toBeInTheDocument();
  });
  test('fullscreen layout com min-h-screen', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(LicenseActivation, defaultProps));
    expect(container.querySelector('.min-h-screen')).toBeInTheDocument();
  });
  test('card centralizado com flex items-center justify-center', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(LicenseActivation, defaultProps));
    const wrapper = container.querySelector('.flex.items-center.justify-center');
    expect(wrapper).toBeInTheDocument();
  });
  test('card tem max-w-md', () => {
    const {
      container
    } = render(/*#__PURE__*/React.createElement(LicenseActivation, defaultProps));
    const card = container.querySelector('.max-w-md');
    expect(card).toBeInTheDocument();
  });
  test('placeholder do input é descritivo', () => {
    render(/*#__PURE__*/React.createElement(LicenseActivation, defaultProps));
    const input = screen.getByPlaceholderText('CLIENTE-emailbase64-20261231-hash...');
    expect(input).toHaveAttribute('placeholder', 'CLIENTE-emailbase64-20261231-hash...');
  });
});

// Expor ao window para uso com Babel
window.LicenseActivation.test = LicenseActivation.test;