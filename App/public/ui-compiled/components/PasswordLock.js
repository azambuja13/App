(function() {
/**
 * PasswordLock - Componente de aviso de bloqueio/tentativas de senha
 *
 * @param {Object} props
 * @param {boolean} props.isLocked - Se o app está bloqueado
 * @param {Date} props.lockoutTime - Data/hora do início do bloqueio
 * @param {number} props.passwordAttempts - Número de tentativas de senha falhas
 * @returns {JSX.Element|null}
 */
function PasswordLock({
  isLocked = false,
  lockoutTime = null,
  passwordAttempts = 0
}) {
  // Calcula minutos restantes de bloqueio
  const getMinutesRemaining = () => {
    if (!lockoutTime) return 0;
    const now = new Date();
    return Math.ceil(15 - (now - lockoutTime) / 1000 / 60);
  };

  // Calcula tentativas restantes
  const getAttemptsRemaining = () => {
    return 3 - passwordAttempts;
  };

  // Se bloqueado, mostra aviso vermelho
  if (isLocked && lockoutTime) {
    return /*#__PURE__*/React.createElement("div", {
      className: "w-full p-3 bg-red-100 border border-red-300 text-red-800 rounded-lg text-center text-sm font-semibold"
    }, "\uD83D\uDD12 App Bloqueado por ", getMinutesRemaining(), " min");
  }

  // Se não bloqueado mas já houve tentativas, mostra aviso laranja
  if (!isLocked && passwordAttempts > 0) {
    return /*#__PURE__*/React.createElement("div", {
      className: "w-full p-3 bg-orange-100 border border-orange-300 text-orange-800 rounded-lg text-center text-xs"
    }, "\u26A0\uFE0F ", getAttemptsRemaining(), " tentativa(s) restante(s)");
  }

  // Não mostra nada se não há avisos
  return null;
}

// Expor ao window para uso com Babel
window.PasswordLock = PasswordLock;
})();
