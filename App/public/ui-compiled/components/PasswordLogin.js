(function() {
/**
 * PasswordLogin.jsx
 * Componente para login com senha
 *
 * Permite que usuários retornando façam login com senha cadastrada
 * Integra com PasswordManager para validação e bloqueio
 */

// Usar React e componentes do window global
// React hooks usados via React.useState, React.useEffect, etc.
const {
  PasswordLock
} = window;

/**
 * PasswordLogin Component
 *
 * @param {Object} props
 * @param {string} props.appVersion - Versão da aplicação
 * @param {function} props.onLoginSuccess - Callback quando login bem-sucedido
 * @param {Object} props.PasswordManager - Instância do PasswordManager
 *
 * @example
 * <PasswordLogin
 *     appVersion="1.0.16"
 *     onLoginSuccess={() => console.log('Login bem-sucedido!')}
 *     PasswordManager={PasswordManager}
 * />
 */
function PasswordLogin({
  appVersion = '1.0.0',
  onLoginSuccess,
  PasswordManager
}) {
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [isLocked, setIsLocked] = React.useState(false);
  const [lockoutTime, setLockoutTime] = React.useState(null);
  const [passwordAttempts, setPasswordAttempts] = React.useState(0);
  const [savedLicense, setSavedLicense] = React.useState(null);
  const [licensedTo, setLicensedTo] = React.useState('');

  /**
   * Verifica status de bloqueio e carrega licença salva ao montar
   */
  React.useEffect(() => {
    if (PasswordManager) {
      (async () => {
        const locked = await PasswordManager.isLocked();
        setIsLocked(locked);
        if (locked) {
          const time = await PasswordManager.getLockoutTime();
          setLockoutTime(time);
        }
        const attempts = await PasswordManager.getAttempts();
        setPasswordAttempts(attempts);

        // Carregar licença salva do IndexedDB
        if (window.indexedDBStorage) {
          try {
            const licenseKey = await window.indexedDBStorage.get('appLicenseKey', null);
            const clientName = await window.indexedDBStorage.get('licensedTo', '');
            if (licenseKey) {
              setSavedLicense(licenseKey);
              setLicensedTo(clientName);
              console.log('📋 Licença carregada para login:', licenseKey.substring(0, 20) + '...');
            }
          } catch (error) {
            console.error('Erro ao carregar licença salva:', error);
          }
        }
      })();
    }
  }, [PasswordManager]);

  /**
   * Timer para atualizar tempo de bloqueio
   */
  React.useEffect(() => {
    if (!isLocked) return;
    const interval = setInterval(async () => {
      if (PasswordManager) {
        const stillLocked = await PasswordManager.isLocked();
        if (!stillLocked) {
          setIsLocked(false);
          setLockoutTime(null);
          setPasswordAttempts(0);
          setError('');
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isLocked, PasswordManager]);

  /**
   * Manipula tentativa de login
   */
  const handleLogin = async () => {
    if (!password.trim()) {
      setError('Por favor, digite sua senha');
      return;
    }
    if (!PasswordManager) {
      setError('Sistema de autenticação não disponível');
      return;
    }
    setLoading(true);
    setError('');

    // Simular pequeno delay para melhor UX
    setTimeout(async () => {
      const result = await PasswordManager.checkPassword(password);
      if (result.success) {
        // Login bem-sucedido
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } else if (result.locked) {
        // App bloqueado
        setIsLocked(true);
        const time = await PasswordManager.getLockoutTime();
        setLockoutTime(time);
        setError(result.message);
        setPassword('');
      } else {
        // Senha incorreta
        const attempts = await PasswordManager.getAttempts();
        setPasswordAttempts(attempts);
        setError(result.message);
        setPassword('');
      }
      setLoading(false);
    }, 300);
  };

  /**
   * Manipula tecla Enter
   */
  const handleKeyPress = e => {
    if (e.key === 'Enter' && password && !isLocked) {
      handleLogin();
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl shadow-2xl w-full max-w-md p-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-orange-100 p-4 rounded-full"
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "lock",
    className: "w-12 h-12 text-orange-600"
  }))), /*#__PURE__*/React.createElement("h1", {
    className: "text-3xl font-bold text-gray-900 mb-2"
  }, "Acesso Protegido"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600"
  }, "Digite sua senha para continuar"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500 mt-2"
  }, "Vers\xE3o ", appVersion)), savedLicense && /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-green-50 border-2 border-green-200 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-green-100 p-2 rounded-lg"
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "check",
    className: "w-5 h-5 text-green-600"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-green-900 text-sm mb-1"
  }, "Licen\xE7a Ativa"), licensedTo && /*#__PURE__*/React.createElement("p", {
    className: "text-green-700 text-sm font-medium mb-1"
  }, licensedTo), /*#__PURE__*/React.createElement("p", {
    className: "text-green-600 text-xs font-mono break-all"
  }, savedLicense))))), /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement(PasswordLock, {
    isLocked: isLocked,
    lockoutTime: lockoutTime,
    passwordAttempts: passwordAttempts
  })), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Senha"), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("input", {
    type: showPassword ? 'text' : 'password',
    value: password,
    onChange: e => {
      setPassword(e.target.value);
      setError('');
    },
    onKeyPress: handleKeyPress,
    className: "w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed",
    placeholder: "Digite sua senha",
    disabled: loading || isLocked,
    autoFocus: !isLocked
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowPassword(!showPassword),
    className: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50",
    disabled: isLocked
  }, showPassword ? '👁️' : '👁️‍🗨️'))), error && /*#__PURE__*/React.createElement("div", {
    className: `border px-4 py-3 rounded-lg text-sm ${isLocked ? 'bg-red-50 border-red-200 text-red-700' : 'bg-orange-50 border-orange-200 text-orange-700'}`
  }, error), /*#__PURE__*/React.createElement("button", {
    onClick: handleLogin,
    disabled: !password || loading || isLocked,
    className: `w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${password && !loading && !isLocked ? 'bg-orange-600 hover:bg-orange-700 shadow-lg hover:shadow-xl' : 'bg-gray-300 cursor-not-allowed'}`
  }, loading ? /*#__PURE__*/React.createElement("span", {
    className: "flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "animate-spin"
  }, "\u23F3"), "Verificando...") : isLocked ? '🔒 App Bloqueado' : 'Entrar')), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 pt-6 border-t border-gray-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 text-sm text-gray-600"
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "file",
    className: "w-5 h-5 flex-shrink-0 mt-0.5"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold mb-1"
  }, "Seguran\xE7a:"), /*#__PURE__*/React.createElement("ul", {
    className: "text-xs space-y-1"
  }, /*#__PURE__*/React.createElement("li", null, "\u2022 M\xE1ximo de 3 tentativas de senha"), /*#__PURE__*/React.createElement("li", null, "\u2022 Bloqueio autom\xE1tico por 15 minutos ap\xF3s exceder"), /*#__PURE__*/React.createElement("li", null, "\u2022 Seus dados est\xE3o protegidos localmente")))))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-center text-gray-400"
  }, "\uD83D\uDD12 Aplica\xE7\xE3o protegida por senha"))));
}

// export default PasswordLogin;

// Expor ao window para uso com Babel
window.PasswordLogin = PasswordLogin;
})();
