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
  needsPassword = true
}) {
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
    if (needsPassword) {
      // Configurando senha pela primeira vez
      if (!password.trim()) {
        alert('Por favor, crie uma senha');
        return;
      }
      if (password.length < 4) {
        alert('A senha deve ter no mínimo 4 caracteres');
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
    onActivate(password);
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
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold text-gray-700"
  }, needsPassword ? 'Criar Senha' : 'Senha'), !needsPassword && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      if (confirm('Deseja resetar a senha desta licença?\n\nVocê precisará criar uma nova senha.')) {
        // Força o modo de criação de senha
        setPassword('');
        setConfirmPassword('');
        // Notifica o componente pai para mudar needsPassword
        if (window.resetPasswordMode) {
          window.resetPasswordMode();
        }
      }
    },
    className: "text-xs text-orange-600 hover:text-orange-700 font-medium"
  }, "Esqueci minha senha")), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("input", {
    type: showPassword ? "text" : "password",
    value: password,
    onChange: e => setPassword(e.target.value),
    placeholder: needsPassword ? "Crie uma senha (mín. 4 caracteres)" : "Digite sua senha",
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
  }, "\uD83D\uDD13 ", needsPassword ? 'Criar Senha e Entrar' : 'Entrar'), licenseError && !(window.isNativeApp && window.isNativeApp()) && /*#__PURE__*/React.createElement("div", {
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
    onClick: () => window.open('https://precificacao-vendas-production.up.railway.app', '_blank'),
    className: "w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
  }, "\uD83D\uDED2 Comprar Licen\xE7a")), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 pt-6 border-t border-gray-200"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 text-center"
  }, "N\xE3o encontra sua conta? Entre em contato com o suporte."))));
}

// Expor no window para uso global
window.LicenseActivation = LicenseActivation;
})();
