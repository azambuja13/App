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
  const [settings, setSettings] = useState({
    whatsappEnabled: false,
    whatsappAccessToken: '',
    whatsappPhoneNumberId: '',
    whatsappBusinessAccountId: '',
    whatsappPhoneNumber: ''
  });
  const [tpl, setTpl] = useState(() => {
    const t = window.userSettings && window.userSettings.whatsappTemplate;
    return { name: (t && t.name) || '', language: (t && t.language) || 'pt_BR' };
  });
  const [testInfo, setTestInfo] = useState(null);
  const apiURL = () => window.APP_CONFIG?.backend?.baseURL || 'https://precificacao-api-production.up.railway.app';
  const configurado = !!(settings.whatsappEnabled && settings.whatsappAccessToken && settings.whatsappPhoneNumberId);

  // Carregar configurações ao montar
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      console.log('🔍 [WhatsApp] Iniciando loadSettings...');

      // Mostra o cache na hora, mas sempre confere no servidor (o cache pode estar velho depois de salvar)
      if (window.whatsappSettings) {
        console.log('⚡ [WhatsApp] Usando dados pré-carregados da Phase 2');
        setSettings({
          whatsappEnabled: window.whatsappSettings.whatsappEnabled || false,
          whatsappAccessToken: window.whatsappSettings.whatsappAccessToken || '',
          whatsappPhoneNumberId: window.whatsappSettings.whatsappPhoneNumberId || '',
          whatsappBusinessAccountId: window.whatsappSettings.whatsappBusinessAccountId || '',
          whatsappPhoneNumber: window.whatsappSettings.whatsappPhoneNumber || ''
        });
      }

      // Fallback: carregar via HTTP se não estiver em cache
      const API_URL = window.APP_CONFIG?.backend?.baseURL || 'https://precificacao-api-production.up.railway.app';
      const token = localStorage.getItem('accessToken');

      console.log('🔍 [WhatsApp] Carregando do servidor');
      const url = `${API_URL}/api/company/whatsapp`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao carregar configurações (${response.status})`);
      }

      const data = await response.json();
      if (data.success && data.data) {
        window.whatsappSettings = data.data;  // Armazenar em cache
        setSettings({
          whatsappEnabled: data.data.whatsappEnabled || false,
          whatsappAccessToken: data.data.whatsappAccessToken || '',
          whatsappPhoneNumberId: data.data.whatsappPhoneNumberId || '',
          whatsappBusinessAccountId: data.data.whatsappBusinessAccountId || '',
          whatsappPhoneNumber: data.data.whatsappPhoneNumber || ''
        });
        console.log('✅ [WhatsApp] Settings carregadas via HTTP');
      }
    } catch (error) {
      console.error('❌ [WhatsApp] Erro ao carregar configurações:', error);
      console.error('Continuando com configurações vazias...');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const API_URL = window.APP_CONFIG?.backend?.baseURL || 'https://precificacao-api-production.up.railway.app';
      const token = localStorage.getItem('accessToken');

      const toSave = {
        ...settings,
        whatsappAccessToken: String(settings.whatsappAccessToken || '').trim(),
        whatsappPhoneNumberId: String(settings.whatsappPhoneNumberId || '').trim(),
        whatsappBusinessAccountId: String(settings.whatsappBusinessAccountId || '').trim()
      };
      // Preencheu token e ID mas esqueceu de marcar "Habilitar": habilita
      if (!toSave.whatsappEnabled && toSave.whatsappAccessToken && toSave.whatsappPhoneNumberId) toSave.whatsappEnabled = true;
      if (toSave.whatsappEnabled && (!toSave.whatsappAccessToken || !toSave.whatsappPhoneNumberId)) {
        alert('Access Token e Phone Number ID são obrigatórios para habilitar WhatsApp');
        return;
      }

      const response = await fetch(`${API_URL}/api/company/whatsapp`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(toSave)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Erro ao salvar configurações');
      }
      window.whatsappSettings = { ...(window.whatsappSettings || {}), ...toSave, ...(data.data || {}) };
      setSettings(prev => ({ ...prev, ...toSave }));

      // Modelo aprovado (opcional) fica nas configurações do usuário
      const whatsappTemplate = { name: String(tpl.name || '').trim(), language: String(tpl.language || 'pt_BR').trim() || 'pt_BR' };
      const r2 = await fetch(`${API_URL}/api/user-settings`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ partialSettings: { whatsappTemplate } })
      });
      if (r2.ok) { try { window.userSettings = { ...(window.userSettings || {}), whatsappTemplate }; } catch (e) {} }

      alert('✅ Configurações WhatsApp salvas!' + (toSave.whatsappEnabled ? '\n\nAgora toque em "Testar conexão" para conferir com a Meta.' : ''));
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
      const API_URL = window.APP_CONFIG?.backend?.baseURL || 'https://precificacao-api-production.up.railway.app';
      const token = localStorage.getItem('accessToken');

      if (!settings.whatsappEnabled) {
        alert('WhatsApp não está habilitado. Preencha, salve e depois teste.');
        return;
      }

      const response = await fetch(`${API_URL}/api/company/whatsapp/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testPhoneNumber: settings.whatsappPhoneNumber
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Erro ao testar conexão');
      }

      setTestInfo({ ok: true, ...data.data });
    } catch (error) {
      console.error('Erro ao testar:', error);
      setTestInfo({ ok: false, message: error.message });
    } finally {
      setTesting(false);
    }
  };

  const handleInputChange = (field, value) => {
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
    onChange: e => handleInputChange('whatsappAccessToken', e.target.value),
    placeholder: "EAAhiBYqqoQgBP...",
    className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent",
    disabled: !settings.whatsappEnabled
  }), settings.whatsappAccessToken && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-1"
  }, "Token salvo (", settings.whatsappAccessToken.substring(0, 20), "...)")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
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
  }, "(opcional)")), /*#__PURE__*/React.createElement("input", {
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
      React.createElement('input', { type: 'text', value: tpl.name, placeholder: 'proposta_pdf', onChange: e => setTpl(t => ({ ...t, name: e.target.value })),
        className: 'px-4 py-2 border border-gray-300 rounded-lg', style: { flex: '2 1 180px' } }),
      React.createElement('input', { type: 'text', value: tpl.language, placeholder: 'pt_BR', onChange: e => setTpl(t => ({ ...t, language: e.target.value })),
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
