(function() {
/**
 * ===================================================================
 * UPGRADE MODAL - Modal de Upgrade de Plano
 * ===================================================================
 * Modal completo para apresentar planos e processar upgrade
 */

// React hooks usados via React.useState, React.useEffect, etc.
/**
 * Componente UpgradeModal
 * Modal de upgrade com comparação de planos
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Se o modal está aberto
 * @param {Function} props.onClose - Callback ao fechar
 * @param {string} props.currentPlan - Plano atual do usuário
 * @param {string} props.highlightPlan - Plano a destacar (opcional)
 * @param {string} props.reason - Motivo do upgrade (feature bloqueada, etc.)
 */
function UpgradeModal({
  isOpen = false,
  onClose,
  currentPlan = 'offline',
  highlightPlan = 'premium',
  reason = null
}) {
  const [selectedPlan, setSelectedPlan] = React.useState(highlightPlan);
  const [billingCycle, setBillingCycle] = React.useState('monthly'); // monthly, yearly

  // Fechar modal com ESC
  React.useEffect(() => {
    const handleEsc = e => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);
  if (!isOpen) return null;

  // Configuração dos planos
  const plans = [{
    id: 'offline',
    name: 'OFFLINE',
    price: {
      monthly: 19.90,
      yearly: 199.00
    },
    badge: null,
    features: [{
      text: '💾 Armazenamento local (localStorage)',
      included: true
    }, {
      text: '🖥️ Uso em 1 máquina',
      included: true
    }, {
      text: '📊 Cálculos básicos',
      included: true
    }, {
      text: '🍽️ Cadastro de pratos',
      included: true
    }, {
      text: '📄 Exportação PDF',
      included: false
    }, {
      text: '☁️ Sincronização nuvem',
      included: false
    }, {
      text: '📋 Múltiplas propostas',
      included: false
    }, {
      text: '📈 Analytics',
      included: false
    }],
    buttonText: currentPlan === 'offline' ? 'Plano Atual' : 'Fazer Downgrade',
    buttonDisabled: currentPlan === 'offline'
  }, {
    id: 'standard',
    name: 'STANDARD',
    price: {
      monthly: 49.90,
      yearly: 499.00
    },
    badge: 'Mais Popular',
    badgeColor: 'bg-blue-500',
    features: [{
      text: '✅ Tudo do OFFLINE',
      included: true
    }, {
      text: '☁️ PostgreSQL (nuvem)',
      included: true
    }, {
      text: '📱 Multi-dispositivo',
      included: true
    }, {
      text: '📄 1 PDF por evento',
      included: true
    }, {
      text: '🔄 Sincronização automática',
      included: true
    }, {
      text: '🍽️ Cadastro de pratos',
      included: true
    }, {
      text: '📋 Múltiplas propostas',
      included: false
    }, {
      text: '📈 Analytics avançado',
      included: false
    }],
    buttonText: currentPlan === 'standard' ? 'Plano Atual' : 'Escolher STANDARD',
    buttonDisabled: currentPlan === 'standard'
  }, {
    id: 'premium',
    name: 'PREMIUM',
    price: {
      monthly: 69.90,
      yearly: 699.00
    },
    badge: '⭐ Recomendado',
    badgeColor: 'bg-gradient-to-r from-yellow-400 to-orange-500',
    features: [{
      text: '✅ Tudo do STANDARD',
      included: true
    }, {
      text: '🍽️ Pratos ilimitados',
      included: true
    }, {
      text: '🧑‍🍳 Ingredientes personalizados',
      included: true
    }, {
      text: '📋 Múltiplas propostas por evento',
      included: true
    }, {
      text: '📊 Comparação de propostas',
      included: true
    }, {
      text: '📈 Dashboard com analytics',
      included: true
    }, {
      text: '💼 Relatórios financeiros',
      included: true
    }, {
      text: '🎯 Suporte prioritário',
      included: true
    }],
    buttonText: currentPlan === 'premium' ? 'Plano Atual' : 'Escolher PREMIUM',
    buttonDisabled: currentPlan === 'premium',
    highlight: true
  }];

  // Calcular desconto anual
  const getAnnualDiscount = plan => {
    const monthlyYearly = plan.price.monthly * 12;
    const yearlyPrice = plan.price.yearly;
    const discount = (monthlyYearly - yearlyPrice) / monthlyYearly * 100;
    return Math.round(discount);
  };

  // Handler de upgrade
  const handleUpgrade = planId => {
    if (planId === currentPlan) return;

    // Emitir evento de upgrade
    const upgradeEvent = new CustomEvent('upgrade-requested', {
      detail: {
        from: currentPlan,
        to: planId,
        billingCycle: billingCycle,
        reason: reason
      }
    });
    window.dispatchEvent(upgradeEvent);

    // Aqui você integraria com o sistema de pagamento
    console.log('Upgrade solicitado:', {
      from: currentPlan,
      to: planId,
      billingCycle: billingCycle
    });

    // Fechar modal
    onClose();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sticky top-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-6 py-6 rounded-t-2xl z-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-bold mb-2"
  }, reason ? 'Desbloqueie este Recurso' : 'Escolha seu Plano'), reason && /*#__PURE__*/React.createElement("p", {
    className: "text-blue-100"
  }, "Este recurso est\xE1 dispon\xEDvel nos planos pagos"), !reason && /*#__PURE__*/React.createElement("p", {
    className: "text-blue-100"
  }, "Escolha o plano ideal para o seu neg\xF3cio")), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "text-white hover:text-gray-200 transition-colors p-2"
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
  })))), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 flex items-center justify-center space-x-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setBillingCycle('monthly'),
    className: `px-6 py-2 rounded-lg font-semibold transition-all ${billingCycle === 'monthly' ? 'bg-white text-blue-600' : 'bg-blue-500 bg-opacity-30 text-white hover:bg-opacity-50'}`
  }, "Mensal"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setBillingCycle('yearly'),
    className: `px-6 py-2 rounded-lg font-semibold transition-all relative ${billingCycle === 'yearly' ? 'bg-white text-blue-600' : 'bg-blue-500 bg-opacity-30 text-white hover:bg-opacity-50'}`
  }, "Anual", /*#__PURE__*/React.createElement("span", {
    className: "absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full font-bold"
  }, "-17%")))), /*#__PURE__*/React.createElement("div", {
    className: "p-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid md:grid-cols-3 gap-6"
  }, plans.map(plan => {
    const isHighlighted = plan.id === highlightPlan || plan.highlight;
    const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
    const priceLabel = billingCycle === 'monthly' ? '/mês' : '/ano';
    return /*#__PURE__*/React.createElement("div", {
      key: plan.id,
      className: `rounded-xl border-2 p-6 transition-all ${isHighlighted ? 'border-blue-500 shadow-xl scale-105 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'}`
    }, plan.badge && /*#__PURE__*/React.createElement("div", {
      className: "mb-4"
    }, /*#__PURE__*/React.createElement("span", {
      className: `${plan.badgeColor || 'bg-gray-500'} text-white px-3 py-1 rounded-full text-xs font-bold`
    }, plan.badge)), /*#__PURE__*/React.createElement("h3", {
      className: "text-2xl font-bold text-gray-800 mb-2"
    }, plan.name), /*#__PURE__*/React.createElement("div", {
      className: "mb-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-baseline"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-4xl font-bold text-gray-900"
    }, "R$ ", price.toFixed(2).replace('.', ',')), /*#__PURE__*/React.createElement("span", {
      className: "text-gray-600 ml-2"
    }, priceLabel)), billingCycle === 'yearly' && /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-green-600 font-semibold mt-1"
    }, "Economize ", getAnnualDiscount(plan), "% no plano anual")), /*#__PURE__*/React.createElement("ul", {
      className: "space-y-3 mb-6"
    }, plan.features.map((feature, idx) => /*#__PURE__*/React.createElement("li", {
      key: idx,
      className: "flex items-start"
    }, feature.included ? /*#__PURE__*/React.createElement("svg", {
      className: "w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0",
      fill: "none",
      stroke: "currentColor",
      viewBox: "0 0 24 24"
    }, /*#__PURE__*/React.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      strokeWidth: 2,
      d: "M5 13l4 4L19 7"
    })) : /*#__PURE__*/React.createElement("svg", {
      className: "w-5 h-5 text-gray-300 mr-2 mt-0.5 flex-shrink-0",
      fill: "none",
      stroke: "currentColor",
      viewBox: "0 0 24 24"
    }, /*#__PURE__*/React.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      strokeWidth: 2,
      d: "M6 18L18 6M6 6l12 12"
    })), /*#__PURE__*/React.createElement("span", {
      className: feature.included ? 'text-gray-700' : 'text-gray-400 line-through'
    }, feature.text)))), /*#__PURE__*/React.createElement("button", {
      onClick: () => handleUpgrade(plan.id),
      disabled: plan.buttonDisabled,
      className: `w-full py-3 px-6 rounded-lg font-bold transition-all ${plan.buttonDisabled ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : isHighlighted ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:scale-105' : 'bg-blue-600 text-white hover:bg-blue-700'}`
    }, plan.buttonText));
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-8 bg-green-50 border border-green-200 rounded-lg p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-6 h-6 text-green-600 mr-3 mt-0.5",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-green-900 mb-1"
  }, "\u2728 Teste gr\xE1tis por 7 dias"), /*#__PURE__*/React.createElement("p", {
    className: "text-green-700 text-sm"
  }, "Experimente todos os recursos sem compromisso. Cancele quando quiser, sem taxas.")))), /*#__PURE__*/React.createElement("div", {
    className: "mt-8 grid md:grid-cols-2 gap-6"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-gray-800 mb-2 flex items-center"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-5 h-5 text-blue-600 mr-2",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
  })), "Posso mudar de plano depois?"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 text-sm"
  }, "Sim! Voc\xEA pode fazer upgrade ou downgrade a qualquer momento. O valor \xE9 ajustado proporcionalmente.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-gray-800 mb-2 flex items-center"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-5 h-5 text-blue-600 mr-2",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
  })), "Quais formas de pagamento?"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 text-sm"
  }, "Aceitamos cart\xE3o de cr\xE9dito, PIX e boleto. Pagamento 100% seguro via Mercado Pago.")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 px-6 py-4 rounded-b-2xl border-t flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, "\uD83D\uDCB3 Pagamento seguro \u2022 \uD83D\uDD12 Seus dados protegidos \u2022 \uD83D\uDCDE Suporte via WhatsApp"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "text-gray-600 hover:text-gray-800 font-semibold text-sm"
  }, "Fechar"))));
}

// export default UpgradeModal;

// Expor para window (browser global)
window.UpgradeModal = UpgradeModal;
})();
