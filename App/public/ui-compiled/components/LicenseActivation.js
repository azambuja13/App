(function() {
const {
  useState,
  useEffect,
  useMemo,
  useCallback
} = window.React || React;

/**
 * LicenseActivation - Tela de login (e-mail + senha)
 *
 * @param {Object} props
 * @param {string} props.appVersion - Versão do aplicativo
 * @param {string} props.email - E-mail digitado
 * @param {Function} props.onEmailChange - Callback para atualizar o e-mail
 * @param {string} props.licenseError - Mensagem de erro (se houver)
 * @param {Function} props.onActivate - Callback para fazer login
 * @param {boolean} props.needsPassword - Se precisa configurar senha
 * @returns {JSX.Element}
 */
function LicenseActivation({
  appVersion = '1.0.0',
  email = '',
  onEmailChange,
  licenseError = '',
  onActivate,
  needsPassword = true,
  codeMode = false,
  onRequestCode,
  onCancelCode
}) {
  const [code, setCode] = React.useState('');
  const [codeInfo, setCodeInfo] = React.useState('');
  const [sendingCode, setSendingCode] = React.useState(false);
  const enviarCodigo = async () => {
    if (!onRequestCode || sendingCode) return;
    setSendingCode(true);
    setCodeInfo('Enviando código...');
    try {
      const r = await onRequestCode(email.trim());
      setCodeInfo((r.ok ? '✅ ' : '⚠️ ') + r.message);
    } finally {
      setSendingCode(false);
    }
  };
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const handleSubmit = () => {
    if (!email.trim()) {
      alert('Por favor, insira seu e-mail');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      alert('Por favor, insira um e-mail válido');
      return;
    }
    if (codeMode && code.replace(/\D/g, '').length !== 6) {
      alert('Digite o código de 6 dígitos que enviamos para o seu e-mail');
      return;
    }
    if (needsPassword) {
      // Configurando senha pela primeira vez
      if (!password.trim()) {
        alert('Por favor, crie uma senha');
        return;
      }
      // Mesmas regras do servidor
      if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
        alert('A senha precisa ter pelo menos 8 caracteres, com uma letra MAIÚSCULA e um número.');
        return;
      }
      if (password !== confirmPassword) {
        alert('As senhas não coincidem');
        return;
      }
    } else {
      // Fazendo login com senha existente
      if (!password.trim()) {
        alert('Por favor, insira sua senha');
        return;
      }
    }
    onActivate(password, codeMode ? code.replace(/\D/g, '') : undefined);
  };
  const handleKeyPress = e => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-6"
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "calculator",
    className: "w-16 h-16 text-orange-600 mx-auto mb-4"
  }), /*#__PURE__*/React.createElement("h1", {
    className: "text-2xl font-bold text-gray-800 mb-2"
  }, "Calculadora de Precifica\xE7\xE3o"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600"
  }, "Eventos & Churrascos v", appVersion)), /*#__PURE__*/React.createElement("div", {
    className: "bg-orange-50 border-l-4 border-orange-600 p-4 mb-6"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-orange-900 mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "lock",
    className: "w-5 h-5"
  }), "Login"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-orange-800"
  }, "Entre com seu e-mail e senha para acessar o aplicativo.")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold text-gray-700 mb-2"
  }, "E-mail"), /*#__PURE__*/React.createElement("input", {
    type: "email",
    value: email,
    onChange: e => onEmailChange(e.target.value),
    placeholder: "seu@email.com",
    className: "w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent",
    onKeyPress: handleKeyPress
  })), codeMode && /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold text-gray-700"
  }, "C\xF3digo enviado para o seu e-mail"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    inputMode: "numeric",
    autoComplete: "one-time-code",
    maxLength: 7,
    value: code,
    onChange: e => setCode(e.target.value.replace(/[^\d ]/g, '')),
    placeholder: "000000",
    className: "w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500",
    onKeyPress: handleKeyPress
  }), codeInfo && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-blue-900"
  }, codeInfo), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-xs"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: enviarCodigo,
    disabled: sendingCode,
    className: "text-orange-600 font-medium disabled:opacity-50"
  }, "Reenviar c\xF3digo"), onCancelCode && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setCode('');
      setCodeInfo('');
      onCancelCode();
    },
    className: "text-gray-500 font-medium"
  }, "Voltar para o login"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold text-gray-700"
  }, codeMode ? 'Nova senha' : needsPassword ? 'Criar Senha' : 'Senha'), !needsPassword && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      if (!email.trim() || !/\S+@\S+\.\S+/.test(email.trim())) {
        alert('Digite primeiro o e-mail da sua conta');
        return;
      }
      if (confirm('Vamos enviar um código de 6 dígitos para ' + email.trim() + '.\n\nCom ele você cria uma nova senha.')) {
        setPassword('');
        setConfirmPassword('');
        setCode('');
        // Notifica o componente pai para mudar para "criar senha com código"
        if (window.resetPasswordMode) {
          window.resetPasswordMode();
        }
        enviarCodigo();
      }
    },
    className: "text-xs text-orange-600 hover:text-orange-700 font-medium"
  }, "Esqueci minha senha")), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("input", {
    type: showPassword ? "text" : "password",
    value: password,
    onChange: e => setPassword(e.target.value),
    placeholder: needsPassword ? "Mín. 8, com maiúscula e número" : "Digite sua senha",
    className: "w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent",
    onKeyPress: handleKeyPress
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowPassword(!showPassword),
    className: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
  }, showPassword ? '🙈' : '👁️'))), needsPassword && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold text-gray-700 mb-2"
  }, "Confirmar Senha"), /*#__PURE__*/React.createElement("input", {
    type: showPassword ? "text" : "password",
    value: confirmPassword,
    onChange: e => setConfirmPassword(e.target.value),
    placeholder: "Digite a senha novamente",
    className: "w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent",
    onKeyPress: handleKeyPress
  })), licenseError && /*#__PURE__*/React.createElement("div", {
    className: "bg-red-50 border-l-4 border-red-500 p-3 rounded"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-red-800 flex items-center gap-2"
  }, "\u26A0\uFE0F ", licenseError)), /*#__PURE__*/React.createElement("button", {
    onClick: handleSubmit,
    disabled: !email.trim() || !password.trim(),
    className: "w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
  }, "\uD83D\uDD13 ", codeMode ? 'Trocar senha e entrar' : needsPassword ? 'Criar Senha e Entrar' : 'Entrar'), licenseError && !(window.isNativeApp && window.isNativeApp()) && /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 flex items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full border-t border-gray-300"
  })), /*#__PURE__*/React.createElement("div", {
    className: "relative flex justify-center text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "px-2 bg-white text-gray-500"
  }, "ou"))), licenseError && !(window.isNativeApp && window.isNativeApp()) && /*#__PURE__*/React.createElement("button", {
    onClick: () => window.open('https://www.chefazambuja.com/precificacao/', '_blank'),
    className: "w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
  }, "\uD83D\uDED2 Comprar Licen\xE7a")), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 pt-6 border-t border-gray-200"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 text-center"
  }, "Ainda n\xE3o tem acesso ou n\xE3o encontra sua conta?"), /*#__PURE__*/React.createElement("a", {
    href: window.supportMailto ? window.supportMailto('Calculadora Precifica\xE7\xE3o - Acesso ao app') : 'mailto:rafael.oliveira.azambuja@gmail.com',
    className: "mt-2 flex items-center justify-center gap-2 text-sm font-semibold text-orange-600 hover:text-orange-700"
  }, "\u2709\uFE0F Fale com o suporte por e-mail"))));
}

// Expor no window para uso global
window.LicenseActivation = LicenseActivation;
})();
