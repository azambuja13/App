(function() {
/**
 * ===================================================================
 * WHATSAPP SETTINGS PAGE
 * ===================================================================
 * Página para configuração das credenciais WhatsApp Business (Meta Cloud API)
 *
 * Permite cada empresa configurar:
 * - Access Token Meta
 * - Phone Number ID
 * - Business Account ID
 * - Número do WhatsApp
 */

function WhatsAppSettings() {
  const { useState, useEffect } = React;

  const [loading, setLoading] = useState(false);  // Iniciar como false para renderização instantânea
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  // O servidor não devolve o Access Token: só se existe (hasAccessToken) e o final (accessTokenHint).
  // O campo do token fica vazio; em branco = manter o token salvo.
  const [settings, setSettings] = useState({
    whatsappEnabled: false,
    whatsappAccessToken: '',
    whatsappPhoneNumberId: '',
    whatsappBusinessAccountId: '',
    whatsappPhoneNumber: '',
    hasAccessToken: false,
    accessTokenHint: null
  });
  const [mexeuHabilitar, setMexeuHabilitar] = useState(false);
  const [tpl, setTpl] = useState(() => {
    const t = window.userSettings && window.userSettings.whatsappTemplate;
    return { name: (t && t.name) || '', language: (t && t.language) || 'pt_BR' };
  });
  const [tplMexido, setTplMexido] = useState(false);
  const [testInfo, setTestInfo] = useState(null);
  const api = () => window.PrecificacaoAPI && window.PrecificacaoAPI.api;
  const temToken = !!(settings.hasAccessToken || String(settings.whatsappAccessToken || '').trim());
  const configurado = !!(settings.whatsappEnabled && temToken && settings.whatsappPhoneNumberId);

  const aplicar = d => setSettings(prev => ({
    ...prev,
    whatsappEnabled: !!d.whatsappEnabled,
    whatsappAccessToken: '',
    whatsappPhoneNumberId: d.whatsappPhoneNumberId || '',
    whatsappBusinessAccountId: d.whatsappBusinessAccountId || '',
    whatsappPhoneNumber: d.whatsappPhoneNumber || '',
    hasAccessToken: !!d.hasAccessToken,
    accessTokenHint: d.accessTokenHint || null
  }));

  // Carregar configurações ao montar
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      if (window.whatsappSettings) aplicar(window.whatsappSettings); // mostra na hora; confere no servidor abaixo
      const a = api();
      if (!a) return;
      const r = await a.request('/api/company/whatsapp');
      if (r && r.data) { window.whatsappSettings = r.data; aplicar(r.data); }
      // Modelo aprovado: sempre do servidor (evita apagar o modelo salvando antes de carregar)
      try {
        const us = await a.request('/api/user-settings');
        const t = us && us.data && us.data.settingsData && us.data.settingsData.whatsappTemplate;
        if (t && !tplMexido) setTpl({ name: t.name || '', language: t.language || 'pt_BR' });
      } catch (e) {}
    } catch (error) {
      console.error('❌ [WhatsApp] Erro ao carregar configurações:', error && error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const a = api();
      if (!a) throw new Error('Aguarde o app terminar de carregar e tente de novo.');
      const novoToken = String(settings.whatsappAccessToken || '').trim();
      const toSave = {
        whatsappEnabled: settings.whatsappEnabled,
        whatsappAccessToken: novoToken, // vazio = manter o salvo
        whatsappPhoneNumberId: String(settings.whatsappPhoneNumberId || '').trim(),
        whatsappBusinessAccountId: String(settings.whatsappBusinessAccountId || '').trim(),
        whatsappPhoneNumber: settings.whatsappPhoneNumber || ''
      };
      const tokenOk = !!(novoToken || settings.hasAccessToken);
      // Preencheu tudo mas não marcou "Habilitar" (e não desmarcou de propósito): habilita
      if (!toSave.whatsappEnabled && !mexeuHabilitar && tokenOk && toSave.whatsappPhoneNumberId) toSave.whatsappEnabled = true;
      if (toSave.whatsappEnabled && (!tokenOk || !toSave.whatsappPhoneNumberId)) {
        alert('Access Token e Phone Number ID são obrigatórios para habilitar WhatsApp');
        return;
      }

      const data = await a.request('/api/company/whatsapp', { method: 'PUT', body: JSON.stringify(toSave) });
      if (data && data.data) { window.whatsappSettings = data.data; aplicar(data.data); }

      // Modelo aprovado (opcional): só grava se foi alterado
      let avisoModelo = '';
      if (tplMexido) {
        const whatsappTemplate = { name: String(tpl.name || '').trim(), language: String(tpl.language || 'pt_BR').trim() || 'pt_BR' };
        try {
          await a.request('/api/user-settings', { method: 'PATCH', body: JSON.stringify({ partialSettings: { whatsappTemplate } }) });
          try { window.userSettings = { ...(window.userSettings || {}), whatsappTemplate }; } catch (e) {}
          setTplMexido(false);
        } catch (e) {
          avisoModelo = '\n\n⚠️ O modelo aprovado não foi salvo: ' + (e.message || 'erro');
        }
      }

      alert((toSave.whatsappEnabled ? '✅ Configurações WhatsApp salvas!\n\nAgora toque em "Testar conexão" para conferir com a Meta.' : '✅ Envio pelo WhatsApp desligado.') + avisoModelo);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert(`Erro ao salvar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      if (!configurado) {
        alert('WhatsApp não está habilitado. Preencha, salve e depois teste.');
        return;
      }
      const a = api();
      const data = await a.request('/api/company/whatsapp/test', { method: 'POST', body: JSON.stringify({ testPhoneNumber: settings.whatsappPhoneNumber }) });
      setTestInfo({ ok: true, ...(data.data || {}) });
    } catch (error) {
      console.error('Erro ao testar:', error);
      setTestInfo({ ok: false, message: error.message });
    } finally {
      setTesting(false);
    }
  };

  const handleInputChange = (field, value) => {
    if (field === 'whatsappEnabled') setMexeuHabilitar(true);
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-center h-screen"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-xl text-gray-600"
    }, "Carregando..."));
  }

  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-lg p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-6"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-bold text-gray-800"
  }, "\uD83D\uDCF1 WhatsApp Business"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 mt-1"
  }, "Configure suas credenciais Meta Cloud API para enviar propostas via WhatsApp"))), React.createElement('div', {
    style: { borderRadius: 10, padding: '10px 12px', marginBottom: 16, fontSize: 14, fontWeight: 600,
      background: configurado ? '#f0fdf4' : '#fef2f2', color: configurado ? '#166534' : '#991b1b', border: '1px solid ' + (configurado ? '#bbf7d0' : '#fecaca') }
  }, configurado ? '✅ Configurado: o botão "Enviar WhatsApp" da proposta usa este número.' : '⚠️ Não configurado: marque "Habilitar", preencha o Access Token e o Phone Number ID e salve.'),
  testInfo ? React.createElement('div', {
    style: { borderRadius: 10, padding: '10px 12px', marginBottom: 16, fontSize: 13, background: testInfo.ok ? '#eff6ff' : '#fef2f2', color: testInfo.ok ? '#1e3a8a' : '#991b1b', border: '1px solid ' + (testInfo.ok ? '#bfdbfe' : '#fecaca') }
  }, testInfo.ok
    ? React.createElement('div', null, React.createElement('b', null, '✅ Conexão com a Meta OK'),
        React.createElement('div', null, 'Número: ', testInfo.displayPhoneNumber || '—', testInfo.verifiedName ? ' · ' + testInfo.verifiedName : ''),
        testInfo.qualityRating ? React.createElement('div', null, 'Qualidade: ', testInfo.qualityRating) : null,
        React.createElement('div', { style: { marginTop: 4 } }, testInfo.template ? 'Modelo aprovado: ' + testInfo.template.name + ' (' + testInfo.template.language + ')' : 'Sem modelo aprovado: só entrega para quem falou com você nas últimas 24 h.'))
    : React.createElement('div', null, React.createElement('b', null, '❌ Não conectou: '), testInfo.message)) : null, /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("label", {
    className: "flex items-center space-x-3 cursor-pointer"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: settings.whatsappEnabled,
    onChange: e => handleInputChange('whatsappEnabled', e.target.checked),
    className: "w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-lg font-medium text-gray-900"
  }, "Habilitar envio via WhatsApp"))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Access Token *", /*#__PURE__*/React.createElement("span", {
    className: "text-gray-500 font-normal ml-2"
  }, "(Meta Business API)")), /*#__PURE__*/React.createElement("input", {
    type: "password",
    value: settings.whatsappAccessToken,
    autoComplete: 'off',
    onChange: e => handleInputChange('whatsappAccessToken', e.target.value),
    placeholder: settings.hasAccessToken ? "Token salvo — em branco para manter" : "EAAhiBYqqoQgBP...",
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent",
    disabled: !settings.whatsappEnabled
  }), settings.hasAccessToken && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-1"
  }, "Token salvo (", settings.accessTokenHint || '…', "). Deixe em branco para manter; cole outro para trocar.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Phone Number ID *"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: settings.whatsappPhoneNumberId,
    onChange: e => handleInputChange('whatsappPhoneNumberId', e.target.value),
    placeholder: "123456789012345",
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent",
    disabled: !settings.whatsappEnabled
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "WhatsApp Business Account ID", /*#__PURE__*/React.createElement("span", {
    className: "text-gray-500 font-normal ml-2"
  }, "(necess\xE1rio para usar o modelo aprovado)")), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: settings.whatsappBusinessAccountId,
    onChange: e => handleInputChange('whatsappBusinessAccountId', e.target.value),
    placeholder: "123456789012345",
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent",
    disabled: !settings.whatsappEnabled
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "N\xFAmero do WhatsApp", /*#__PURE__*/React.createElement("span", {
    className: "text-gray-500 font-normal ml-2"
  }, "(formato: 34 99999-9999)")), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: settings.whatsappPhoneNumber,
    onChange: e => handleInputChange('whatsappPhoneNumber', e.target.value),
    placeholder: "(34) 99999-9999",
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent",
    disabled: !settings.whatsappEnabled
  })), React.createElement('div', { style: { borderTop: '1px solid #e5e7eb', paddingTop: 14 } },
    React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Modelo aprovado pela Meta (opcional, recomendado)'),
    React.createElement('p', { className: 'text-xs text-gray-500 mb-2' }, 'Sem modelo, o WhatsApp só entrega a proposta para clientes que mandaram mensagem para você nas últimas 24 h. Com um modelo aprovado, entrega para qualquer cliente.'),
    React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
      React.createElement('input', { type: 'text', value: tpl.name, placeholder: 'proposta_pdf', onChange: e => { setTplMexido(true); setTpl(t => ({ ...t, name: e.target.value })); },
        className: 'px-4 py-2 border border-gray-300 rounded-lg', style: { flex: '2 1 180px' } }),
      React.createElement('input', { type: 'text', value: tpl.language, placeholder: 'pt_BR', onChange: e => { setTplMexido(true); setTpl(t => ({ ...t, language: e.target.value })); },
        className: 'px-4 py-2 border border-gray-300 rounded-lg', style: { flex: '1 1 90px' } })),
    React.createElement('details', { style: { marginTop: 8, fontSize: 13, color: '#374151' } },
      React.createElement('summary', { style: { cursor: 'pointer', fontWeight: 600 } }, 'Como criar o modelo'),
      React.createElement('ol', { style: { margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.6 } },
        React.createElement('li', null, 'No WhatsApp Manager (business.facebook.com), vá em Modelos de mensagem > Criar modelo.'),
        React.createElement('li', null, 'Categoria: Utilidade. Nome: proposta_pdf. Idioma: Português (BR).'),
        React.createElement('li', null, 'Cabeçalho: Documento.'),
        React.createElement('li', null, 'Corpo, com exatamente 2 variáveis: "Olá {{1}}! A {{2}} preparou a sua proposta. Confira o PDF anexo e fale com a gente se tiver dúvidas."'),
        React.createElement('li', null, 'Envie para análise. Depois de aprovado, escreva o nome aqui (proposta_pdf, pt_BR) e salve.')))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 border-l-4 border-blue-500 p-4 mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-shrink-0"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "h-5 w-5 text-blue-500 mt-0.5",
    fill: "currentColor",
    viewBox: "0 0 20 20"
  }, /*#__PURE__*/React.createElement("path", {
    fillRule: "evenodd",
    d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z",
    clipRule: "evenodd"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "ml-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-sm font-medium text-blue-800"
  }, "Como obter suas credenciais Meta?"), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 text-sm text-blue-700"
  }, /*#__PURE__*/React.createElement("ol", {
    className: "list-decimal list-inside space-y-1"
  }, /*#__PURE__*/React.createElement("li", null, "Acesse ", /*#__PURE__*/React.createElement("a", {
    href: "https://business.facebook.com/settings/",
    target: "_blank",
    rel: "noopener noreferrer",
    className: "underline font-medium"
  }, "Meta Business Suite")), /*#__PURE__*/React.createElement("li", null, "V\xE1 em ", /*#__PURE__*/React.createElement("strong", null, "Sistema > Contas do WhatsApp")), /*#__PURE__*/React.createElement("li", null, "Selecione seu aplicativo WhatsApp Business"), /*#__PURE__*/React.createElement("li", null, "Copie o ", /*#__PURE__*/React.createElement("strong", null, "Access Token"), " e ", /*#__PURE__*/React.createElement("strong", null, "Phone Number ID")), /*#__PURE__*/React.createElement("li", null, "Cole aqui e salve")))))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleSave,
    disabled: saving,
    className: "px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
  }, saving ? 'Salvando...' : '💾 Salvar Configurações'), /*#__PURE__*/React.createElement("button", {
    onClick: handleTest,
    disabled: testing || !configurado,
    className: "px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
  }, testing ? 'Testando...' : '🧪 Testar Conexão')));
}

// Expor para window
window.WhatsAppSettings = WhatsAppSettings;
})();
