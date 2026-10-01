(function() {
/**
 * ===================================================================
 * PDF BUTTON - Botão de PDF com Controle de Plano
 * ===================================================================
 * Componente que controla acesso à funcionalidade de PDF baseado no plano
 *
 * Regras:
 * - OFFLINE: Botão desabilitado, mostra modal de upgrade ao clicar
 * - STANDARD/PREMIUM: Botão habilitado, executa ação normalmente
 */

const {
  UpgradeModal
} = window;

/**
 * Botão de PDF com controle de plano
 *
 * @param {Object} props
 * @param {Function} props.onClick - Callback ao clicar (só executado se plano permitir)
 * @param {string} props.label - Texto do botão (padrão: "🖨️ Imprimir")
 * @param {string} props.className - Classes CSS adicionais
 * @param {boolean} props.disabled - Se o botão está desabilitado (além do controle de plano)
 * @param {string} props.featureName - Nome da feature para mensagem personalizada
 * @returns {JSX.Element}
 */
function PDFButton({
  onClick,
  label = "🖨️ Imprimir",
  className = "",
  disabled = false,
  featureName = "Geração de PDF"
}) {
  const {
    useState
  } = React;
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Verificar plano atual
  const currentPlan = window.ConfigHelper?.getCurrentPlan?.() || 'offline';
  const canUsePDF = window.ConfigHelper?.hasFeatureAccess?.('pdfExport') || false;

  // Log para debug
  console.log('[PDFButton] currentPlan:', currentPlan, 'canUsePDF:', canUsePDF);
  const handleClick = e => {
    e.preventDefault();
    e.stopPropagation();

    // Se não pode usar PDF, mostrar modal de upgrade
    if (!canUsePDF) {
      console.log('[PDFButton] Acesso negado - mostrando modal de upgrade');
      setShowUpgradeModal(true);
      return;
    }

    // Se pode usar, executar ação
    if (onClick) {
      console.log('[PDFButton] Acesso permitido - executando ação');
      onClick(e);
    }
  };

  // Classes base do botão
  const baseClasses = "flex items-center gap-2 px-6 py-2 rounded-lg transition-colors font-medium shadow-md";

  // Classes condicionais baseadas no plano
  const conditionalClasses = !canUsePDF ? "bg-gray-400 text-white cursor-pointer hover:bg-gray-500" // Cinza mas clicável para mostrar modal
  : "bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-700 hover:to-red-700";
  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "";
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    onClick: handleClick,
    disabled: disabled,
    className: `${baseClasses} ${conditionalClasses} ${disabledClasses} ${className}`,
    title: !canUsePDF ? "Recurso disponível nos planos STANDARD e PREMIUM" : "Imprimir ou gerar PDF"
  }, !canUsePDF && /*#__PURE__*/React.createElement("svg", {
    className: "w-5 h-5",
    fill: "currentColor",
    viewBox: "0 0 20 20"
  }, /*#__PURE__*/React.createElement("path", {
    fillRule: "evenodd",
    d: "M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z",
    clipRule: "evenodd"
  })), canUsePDF && /*#__PURE__*/React.createElement("svg", {
    className: "w-5 h-5",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
  })), label, !canUsePDF && /*#__PURE__*/React.createElement("span", {
    className: "ml-1 text-xs bg-white bg-opacity-20 px-2 py-0.5 rounded"
  }, "STANDARD+")), showUpgradeModal && UpgradeModal && /*#__PURE__*/React.createElement(UpgradeModal, {
    isOpen: showUpgradeModal,
    onClose: () => setShowUpgradeModal(false),
    currentPlan: currentPlan,
    highlightPlan: "standard" // Destacar STANDARD pois é o plano mínimo para PDF
    ,
    reason: `Para usar ${featureName}, você precisa de um plano STANDARD ou PREMIUM`
  }));
}

// Expor ao window para uso global
window.PDFButton = PDFButton;
})();
