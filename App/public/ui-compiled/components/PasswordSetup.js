(function() {
/**
 * PasswordSetup.jsx
 * Componente para configuração inicial de senha
 *
 * Permite que usuários de primeira vez cadastrem uma senha
 * Exibe validação e confirmação antes de salvar
 */

// Usar React do window global
// React hooks usados via React.useState, React.useEffect, etc.
/**
 * PasswordSetup Component
 *
 * @param {Object} props
 * @param {string} props.appVersion - Versão da aplicação
 * @param {function} props.onPasswordSet - Callback quando senha é definida com sucesso
 *
 * @example
 * <PasswordSetup
 *     appVersion="1.0.16"
 *     onPasswordSet={() => console.log('Senha definida!')}
 * />
 */
function PasswordSetup({
  appVersion = '1.0.0',
  onPasswordSet
}) {
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  /**
   * Valida os requisitos da senha
   */
  const validatePassword = pwd => {
    if (!pwd || pwd.length < 4) {
      return 'Senha deve ter no mínimo 4 caracteres';
    }
    return null;
  };

  /**
   * Manipula o cadastro da senha
   */
  const handleSetPassword = async () => {
    setError('');

    // Validar senha
    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Verificar confirmação
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    // Salvar senha usando IndexedDB com fallback
    setLoading(true);
    try {
      // Usar storage abstrato (IndexedDB ou localStorage)
      const storage = window.indexedDBStorage || {
        get: (key, defaultValue) => {
          try {
            const data = localStorage.getItem(key);
            if (data === null) return Promise.resolve(defaultValue);
            try {
              return Promise.resolve(JSON.parse(data));
            } catch {
              return Promise.resolve(data);
            }
          } catch (error) {
            return Promise.resolve(defaultValue);
          }
        },
        set: (key, value) => {
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
          return Promise.resolve();
        }
      };

      // Salvar senha
      await storage.set('appPassword', password);
      await storage.set('passwordSet', 'true');

      // Associar senha à licença atual (se houver)
      const currentLicenseKey = await storage.get('appLicenseKey', null);
      if (currentLicenseKey) {
        await storage.set('password_license_key', currentLicenseKey);
        console.log('🔗 Senha associada à licença:', currentLicenseKey.substring(0, 20) + '...');
      }

      // Chamar callback
      if (onPasswordSet) {
        setTimeout(() => {
          onPasswordSet();
          setLoading(false);
        }, 500);
      }
    } catch (err) {
      console.error('Erro ao salvar senha:', err);
      setError('Erro ao salvar senha. Tente novamente.');
      setLoading(false);
    }
  };

  /**
   * Manipula tecla Enter
   */
  const handleKeyPress = e => {
    if (e.key === 'Enter' && password && confirmPassword) {
      handleSetPassword();
    }
  };

  /**
   * Verifica se pode submeter
   */
  const canSubmit = password.length >= 4 && password === confirmPassword;
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl shadow-2xl w-full max-w-md p-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-100 p-4 rounded-full"
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "lock",
    className: "w-12 h-12 text-blue-600"
  }))), /*#__PURE__*/React.createElement("h1", {
    className: "text-3xl font-bold text-gray-900 mb-2"
  }, "Bem-vindo!"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600"
  }, "Configure sua senha de acesso"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500 mt-2"
  }, "Vers\xE3o ", appVersion)), /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement(Icon, {
    type: "file",
    className: "w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-blue-900"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold mb-1"
  }, "Primeira vez aqui?"), /*#__PURE__*/React.createElement("p", null, "Crie uma senha segura para proteger seus dados."), /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-xs"
  }, "\u2022 M\xEDnimo de 4 caracteres", /*#__PURE__*/React.createElement("br", null), "\u2022 Voc\xEA precisar\xE1 desta senha toda vez que acessar o app")))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Nova Senha"), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("input", {
    type: showPassword ? 'text' : 'password',
    value: password,
    onChange: e => {
      setPassword(e.target.value);
      setError('');
    },
    onKeyPress: handleKeyPress,
    className: "w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors",
    placeholder: "Digite sua senha",
    disabled: loading,
    autoFocus: true
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowPassword(!showPassword),
    className: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
  }, showPassword ? '👁️' : '👁️‍🗨️')), password && password.length < 4 && /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-sm text-orange-600"
  }, "Digite no m\xEDnimo 4 caracteres")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Confirmar Senha"), /*#__PURE__*/React.createElement("input", {
    type: showPassword ? 'text' : 'password',
    value: confirmPassword,
    onChange: e => {
      setConfirmPassword(e.target.value);
      setError('');
    },
    onKeyPress: handleKeyPress,
    className: "w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors",
    placeholder: "Digite a senha novamente",
    disabled: loading
  }), confirmPassword && password !== confirmPassword && /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-sm text-red-600"
  }, "As senhas n\xE3o coincidem"), confirmPassword && password === confirmPassword && password.length >= 4 && /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-sm text-green-600"
  }, "\u2713 Senhas coincidem")), error && /*#__PURE__*/React.createElement("div", {
    className: "bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
  }, error), /*#__PURE__*/React.createElement("button", {
    onClick: handleSetPassword,
    disabled: !canSubmit || loading,
    className: `w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${canSubmit && !loading ? 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl' : 'bg-gray-300 cursor-not-allowed'}`
  }, loading ? /*#__PURE__*/React.createElement("span", {
    className: "flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "animate-spin"
  }, "\u23F3"), "Configurando...") : 'Confirmar e Continuar')), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 pt-6 border-t border-gray-200"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-center text-gray-500"
  }, "\uD83D\uDD12 Sua senha \xE9 armazenada localmente de forma segura.", /*#__PURE__*/React.createElement("br", null), "N\xE3o compartilhe com ningu\xE9m."))));
}

// export default PasswordSetup;

// Expor ao window para uso com Babel
window.PasswordSetup = PasswordSetup;
})();
