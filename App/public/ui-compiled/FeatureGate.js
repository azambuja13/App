(function() {
/**
 * ===================================================================
 * FEATURE GATE - Componente de Bloqueio de Features
 * ===================================================================
 * Controla acesso a features premium baseado no plano do usuário
 * Exibe bloqueio visual com opção de upgrade
 */

// React hooks usados via React.useState, React.useEffect, etc.
/**
 * Componente FeatureGate
 * Envolve features premium e controla acesso
 *
 * @param {Object} props
 * @param {string} props.featureName - Nome da feature (dishes, multipleProposals, analytics, etc.)
 * @param {string} props.requiredPlan - Plano necessário (offline, standard, premium)
 * @param {ReactNode} props.children - Conteúdo a ser bloqueado/liberado
 * @param {string} props.fallbackUI - Tipo de UI quando bloqueado (blur, overlay, placeholder)
 * @param {Function} props.onUpgradeClick - Callback quando usuário clica em upgrade
 */
function FeatureGate({
  featureName,
  requiredPlan = 'premium',
  children,
  fallbackUI = 'overlay',
  onUpgradeClick
}) {
  const [hasAccess, setHasAccess] = React.useState(false);
  const [currentPlan, setCurrentPlan] = React.useState('offline');
  const [showUpgradePrompt, setShowUpgradePrompt] = React.useState(false);
  React.useEffect(() => {
    // Verificar acesso à feature
    const checkAccess = () => {
      const ConfigHelper = window.ConfigHelper;
      if (!ConfigHelper) {
        console.warn('ConfigHelper não encontrado');
        return;
      }
      const plan = ConfigHelper.getCurrentPlan();
      setCurrentPlan(plan);

      // Verificar se tem acesso
      const access = ConfigHelper.hasFeatureAccess(featureName);
      setHasAccess(access);
      console.log(`[FeatureGate] Feature: ${featureName}, Plan: ${plan}, Access: ${access}`);
    };
    checkAccess();

    // Listener para mudanças de plano
    window.addEventListener('plan-changed', checkAccess);
    return () => window.removeEventListener('plan-changed', checkAccess);
  }, [featureName]);

  // Se tem acesso, renderiza o conteúdo normalmente
  if (hasAccess) {
    return /*#__PURE__*/React.createElement(React.Fragment, null, children);
  }

  // Mapa de features para nomes amigáveis
  const featureNames = {
    dishes: 'Cadastro de Pratos',
    multipleProposals: 'Múltiplas Propostas',
    analytics: 'Analytics e Relatórios',
    pdfExport: 'Exportação em PDF',
    cloudSync: 'Sincronização na Nuvem',
    teamAccess: 'Acesso em Equipe'
  };
  const featureDisplayName = featureNames[featureName] || 'Este recurso';

  // Mensagens personalizadas por plano
  const getUpgradeMessage = () => {
    if (currentPlan === 'offline') {
      return {
        title: '🔒 Recurso disponível no plano STANDARD',
        description: `${featureDisplayName} está disponível a partir do plano STANDARD.`,
        plans: [{
          name: 'STANDARD',
          price: 'R$ 49/mês',
          features: ['Nuvem', '1 PDF por evento', 'Multi-dispositivo']
        }, {
          name: 'PREMIUM',
          price: 'R$ 79/mês',
          features: ['Tudo do STANDARD', 'Pratos ilimitados', 'Múltiplas propostas']
        }]
      };
    } else if (currentPlan === 'standard') {
      return {
        title: '⭐ Recurso Premium',
        description: `${featureDisplayName} é exclusivo do plano PREMIUM.`,
        plans: [{
          name: 'PREMIUM',
          price: 'R$ 79/mês',
          features: ['Pratos ilimitados', 'Múltiplas propostas', 'Analytics avançado']
        }]
      };
    }
    return null;
  };
  const upgradeMessage = getUpgradeMessage();

  // Handler de clique no bloqueio
  const handleBlockClick = e => {
    e.preventDefault();
    e.stopPropagation();
    setShowUpgradePrompt(true);
  };
  const handleUpgradeClick = () => {
    setShowUpgradePrompt(false);
    if (onUpgradeClick) {
      onUpgradeClick(featureName, currentPlan);
    }
  };

  // Renderização baseada no tipo de fallback
  const renderFallback = () => {
    switch (fallbackUI) {
      case 'blur':
        // Conteúdo embaçado com overlay de clique
        return /*#__PURE__*/React.createElement("div", {
          className: "relative"
        }, /*#__PURE__*/React.createElement("div", {
          className: "filter blur-sm pointer-events-none select-none opacity-50"
        }, children), /*#__PURE__*/React.createElement("div", {
          className: "absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-40 cursor-pointer hover:bg-opacity-50 transition-all",
          onClick: handleBlockClick
        }, /*#__PURE__*/React.createElement("div", {
          className: "bg-white rounded-lg px-6 py-4 shadow-xl text-center"
        }, /*#__PURE__*/React.createElement("svg", {
          className: "w-12 h-12 mx-auto mb-2 text-yellow-500",
          fill: "none",
          stroke: "currentColor",
          viewBox: "0 0 24 24"
        }, /*#__PURE__*/React.createElement("path", {
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeWidth: 2,
          d: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        })), /*#__PURE__*/React.createElement("p", {
          className: "text-gray-700 font-medium"
        }, featureDisplayName), /*#__PURE__*/React.createElement("p", {
          className: "text-sm text-gray-500"
        }, "Dispon\xEDvel no plano ", requiredPlan.toUpperCase()))));
      case 'placeholder':
        // Placeholder no lugar do conteúdo
        return /*#__PURE__*/React.createElement("div", {
          className: "border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all",
          onClick: handleBlockClick
        }, /*#__PURE__*/React.createElement("svg", {
          className: "w-16 h-16 mx-auto mb-4 text-gray-400",
          fill: "none",
          stroke: "currentColor",
          viewBox: "0 0 24 24"
        }, /*#__PURE__*/React.createElement("path", {
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeWidth: 2,
          d: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        })), /*#__PURE__*/React.createElement("h3", {
          className: "text-lg font-semibold text-gray-700 mb-2"
        }, featureDisplayName, " \uD83D\uDD12"), /*#__PURE__*/React.createElement("p", {
          className: "text-gray-500 mb-4"
        }, "Dispon\xEDvel no plano ", requiredPlan.toUpperCase()), /*#__PURE__*/React.createElement("button", {
          className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        }, "Ver Planos"));
      case 'overlay':
      default:
        // Overlay transparente sobre o conteúdo
        return /*#__PURE__*/React.createElement("div", {
          className: "relative"
        }, /*#__PURE__*/React.createElement("div", {
          className: "pointer-events-none select-none opacity-60"
        }, children), /*#__PURE__*/React.createElement("div", {
          className: "absolute inset-0 flex items-center justify-center cursor-pointer group",
          onClick: handleBlockClick
        }, /*#__PURE__*/React.createElement("div", {
          className: "bg-white rounded-lg px-6 py-3 shadow-lg border-2 border-yellow-400 group-hover:scale-105 transition-transform"
        }, /*#__PURE__*/React.createElement("div", {
          className: "flex items-center space-x-3"
        }, /*#__PURE__*/React.createElement("svg", {
          className: "w-6 h-6 text-yellow-500",
          fill: "none",
          stroke: "currentColor",
          viewBox: "0 0 24 24"
        }, /*#__PURE__*/React.createElement("path", {
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeWidth: 2,
          d: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
          className: "font-semibold text-gray-800"
        }, "Recurso ", requiredPlan.toUpperCase()), /*#__PURE__*/React.createElement("p", {
          className: "text-sm text-gray-600"
        }, "Clique para fazer upgrade"))))));
    }
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, renderFallback(), showUpgradePrompt && upgradeMessage && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-t-xl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold"
  }, upgradeMessage.title), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowUpgradePrompt(false),
    className: "text-white hover:text-gray-200"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-6 h-6",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M6 18L18 6M6 6l12 12"
  })))), /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-blue-100"
  }, upgradeMessage.description)), /*#__PURE__*/React.createElement("div", {
    className: "p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid gap-4"
  }, upgradeMessage.plans.map((plan, index) => /*#__PURE__*/React.createElement("div", {
    key: index,
    className: "border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-lg transition-all"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold text-gray-800"
  }, plan.name), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold text-blue-600"
  }, plan.price)), plan.name === 'PREMIUM' && /*#__PURE__*/React.createElement("span", {
    className: "bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-semibold"
  }, "Recomendado")), /*#__PURE__*/React.createElement("ul", {
    className: "space-y-2 mb-4"
  }, plan.features.map((feature, idx) => /*#__PURE__*/React.createElement("li", {
    key: idx,
    className: "flex items-center text-gray-700"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-5 h-5 text-green-500 mr-2",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M5 13l4 4L19 7"
  })), feature))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      // Abrir landing page de vendas em nova aba
      window.open('https://precificacao-vendas-production.up.railway.app', '_blank');
      setShowUpgradePrompt(false);
    },
    className: "w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
  }, "Comprar Plano ", plan.name))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 px-6 py-4 rounded-b-xl border-t"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 text-center"
  }, "\u2728 Teste gr\xE1tis por 7 dias \u2022 Cancele quando quiser \u2022 Suporte priorit\xE1rio")))));
}

/**
 * Hook personalizado para verificar acesso a features
 * Uso:
 * const { hasAccess, currentPlan } = useFeatureAccess('dishes');
 */
function useFeatureAccess(featureName) {
  const [hasAccess, setHasAccess] = React.useState(false);
  const [currentPlan, setCurrentPlan] = React.useState('offline');
  React.useEffect(() => {
    const checkAccess = () => {
      const ConfigHelper = window.ConfigHelper;
      if (!ConfigHelper) return;
      const plan = ConfigHelper.getCurrentPlan();
      setCurrentPlan(plan);
      const access = ConfigHelper.hasFeatureAccess(featureName);
      setHasAccess(access);
    };
    checkAccess();
    window.addEventListener('plan-changed', checkAccess);
    return () => window.removeEventListener('plan-changed', checkAccess);
  }, [featureName]);
  return {
    hasAccess,
    currentPlan
  };
}

/**
 * Componente de Badge de Plano
 * Exibe badge visual do plano atual
 */
function PlanBadge({
  className = ''
}) {
  const [plan, setPlan] = React.useState('offline');
  React.useEffect(() => {
    const updatePlan = () => {
      const ConfigHelper = window.ConfigHelper;
      if (!ConfigHelper) return;
      const currentPlan = ConfigHelper.getCurrentPlan();
      setPlan(currentPlan);
    };
    updatePlan();
    window.addEventListener('plan-changed', updatePlan);
    return () => window.removeEventListener('plan-changed', updatePlan);
  }, []);
  const badgeStyles = {
    offline: 'bg-gray-500 text-white',
    standard: 'bg-blue-500 text-white',
    premium: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
  };
  const badgeLabels = {
    offline: 'OFFLINE',
    standard: 'STANDARD',
    premium: '⭐ PREMIUM'
  };
  return /*#__PURE__*/React.createElement("span", {
    className: `px-3 py-1 rounded-full text-xs font-bold ${badgeStyles[plan]} ${className}`
  }, badgeLabels[plan]);
}

// Expor para window (browser global)
window.FeatureGate = FeatureGate;
window.useFeatureAccess = useFeatureAccess;
window.PlanBadge = PlanBadge;
})();
