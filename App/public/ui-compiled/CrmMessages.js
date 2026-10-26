(function () {
'use strict';
/**
 * CRM etapa 3 - Mensagens prontas para WhatsApp
 * window.CRM.openMessage({ clientId?, client?, proposal?, template?, taskKind? }) abre a janela.
 * O texto sai do modelo (editável pelo usuário) com as variáveis preenchidas e abre o WhatsApp (wa.me).
 * O host se monta sozinho no <body>, não precisa estar no App.
 */
const h = React.createElement;

const TEMPLATE_BY_TASK = { stale: 'followup', post_event: 'avaliacao', recontact: 'recontato', lead: 'primeiro_contato' };

// ===== Modelos da Meta (out/2026) =====
// Fora das 24 h a Meta só entrega modelo aprovado. Cada mensagem pronta pode ser ligada a um
// modelo (user-settings → whatsappMetaTemplates[chave] = { name, language, named, header, body,
// buttons, bodyText }). header/body: [{ v: variável do modelo, app: variável do app }].
const META = { lista: null, erro: '', vinculos: null };
function apiReq() { const a = window.PrecificacaoAPI && window.PrecificacaoAPI.api; return a && typeof a.request === 'function' ? a : null; }
async function carregarModelosMeta(force) {
  if (META.lista && !force) return META.lista;
  const a = apiReq(); if (!a) throw new Error('Sem conexão com o servidor');
  const r = await a.request('/api/company/whatsapp/templates');
  META.lista = ((r && r.data) || []).filter(t => String(t.status || '').toUpperCase() === 'APPROVED');
  return META.lista;
}
async function carregarVinculos(force) {
  if (META.vinculos && !force) return META.vinculos;
  const a = apiReq(); if (!a) return {};
  try { const r = await a.request('/api/user-settings'); META.vinculos = (r && r.data && r.data.settingsData && r.data.settingsData.whatsappMetaTemplates) || {}; }
  catch (e) { META.vinculos = META.vinculos || {}; }
  return META.vinculos;
}
async function salvarVinculos(mapa) {
  const a = apiReq(); if (!a) throw new Error('Sem conexão com o servidor');
  await a.request('/api/user-settings', { method: 'PATCH', body: JSON.stringify({ partialSettings: { whatsappMetaTemplates: mapa } }) });
  META.vinculos = mapa;
}
const semAcento = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// Palpite da variável do app pelo nome da variável do modelo ({{cliente}}, {{data_evento}}...)
function palpitePorNome(v) {
  const k = semAcento(v);
  if (/primeiro/.test(k)) return 'primeiro_nome';
  if (/empresa|buffet|chef|negocio|loja/.test(k)) return 'empresa';
  if (/link|avalia|google|url/.test(k)) return 'link_avaliacao';
  if (/convid|pessoa|guest/.test(k)) return 'convidados';
  if (/valor|preco|total|price/.test(k)) return 'valor';
  if (/data|dia|date/.test(k)) return 'data';
  if (/evento|festa|event/.test(k)) return 'evento';
  if (/client|nome|name/.test(k)) return 'cliente';
  return null;
}
// Liga as variáveis do modelo às do app: por nome; senão na ordem em que aparecem na mensagem pronta
function sugerirVinculo(tpl, corpoApp) {
  const C = window.CRM;
  const ordemApp = []; String(corpoApp || '').replace(/\{(\w+)\}/g, (m, k) => { if (C.TEMPLATE_VARS.includes(k) && !ordemApp.includes(k)) ordemApp.push(k); return m; });
  const usados = [];
  const textoTudo = ((tpl.header && tpl.header.text) || '') + '\n' + ((tpl.body && tpl.body.text) || '');
  // Pelas palavras antes da variável no texto do modelo ("Olá {{1}}", "Abraço, {{3}}", "no dia {{2}}")
  const peloContexto = v => {
    const i = textoTudo.indexOf('{{' + v + '}}'); if (i < 0) return null;
    const antes = semAcento(textoTudo.slice(Math.max(0, i - 30), i)).trim();
    if (/(ola|oi|bom dia|boa tarde|boa noite|prezad[oa]|querid[oa]|car[oa])[,!.\s]*$/.test(antes)) return 'primeiro_nome';
    if (/(abraco|abracos|att|atenciosamente|equipe|aqui e|sou o|sou a)[,:.!\s]*$/.test(antes)) return 'empresa';
    if (/(valor|total|r\$)( de)?[:\s]*$/.test(antes)) return 'valor';
    if (/(dia|data)( do evento)?[:\s]*$/.test(antes)) return 'data';
    if (/(evento|festa|proposta (do|da|de|para))[:\s]*$/.test(antes)) return 'evento';
    if (/(para|com)$/.test(antes) && /^\}\}\s*(convidados|pessoas)/.test(textoTudo.slice(i + v.length + 2, i + v.length + 20).replace(/^\}\}/, '}}'))) return 'convidados';
    return null;
  };
  let i = 0;
  const prox = () => { while (i < ordemApp.length && usados.includes(ordemApp[i])) i++; return ordemApp[i++] || ['empresa', 'data', 'valor', 'evento', 'convidados', 'cliente'].find(a => !usados.includes(a)) || 'cliente'; };
  const liga = v => { const app = tpl.named ? (palpitePorNome(v) || 'cliente') : (peloContexto(v) || prox()); usados.push(app); return { v, app }; };
  return {
    name: tpl.name, language: tpl.language, named: !!tpl.named, bodyText: (tpl.body && tpl.body.text) || '',
    header: ((tpl.header && tpl.header.vars) || []).map(liga),
    body: ((tpl.body && tpl.body.vars) || []).map(liga),
    buttons: (tpl.buttons || []).filter(b => b.vars && b.vars.length).map(b => ({ index: b.index, app: 'link_avaliacao' }))
  };
}
// Modelo da Meta com nome parecido com o da mensagem pronta
function modeloParecido(lista, t) {
  const tokens = x => semAcento(x).split(/[^a-z0-9]+/).filter(w => w.length > 2 && !['de', 'da', 'do', 'para', 'com'].includes(w));
  const alvo = tokens(t.key + ' ' + t.title);
  let melhor = null, nota = 0;
  (lista || []).forEach(m => { const n = tokens(m.name).filter(w => alvo.some(a => a.startsWith(w.slice(0, 5)) || w.startsWith(a.slice(0, 5)))).length; if (n > nota) { nota = n; melhor = m; } });
  return melhor;
}
function parametrosDoVinculo(vinc, valores) {
  const val = app => (valores && valores[app] != null ? String(valores[app]) : '');
  const p = x => vinc.named ? { name: x.v, text: val(x.app) } : { text: val(x.app) };
  return { header: (vinc.header || []).map(p), body: (vinc.body || []).map(p), buttons: (vinc.buttons || []).map(b => ({ index: b.index, text: val(b.app) })) };
}

function companyName() {
  try {
    const cm = window.companyManager || (window.PrecificacaoAPI && window.PrecificacaoAPI.companyManager);
    const d = cm && typeof cm.getCompanyData === 'function' ? cm.getCompanyData() : null;
    return (d && (d.name || d.companyName)) || '';
  } catch (e) { return ''; }
}

function varsFor(client, proposal, reviewLink) {
  const C = window.CRM;
  const p = proposal || {};
  const dados = p.proposalData || {};
  const nome = (client && client.name) || p.clientName || dados.clientName || '';
  const data = p.eventDate || dados.eventDate;
  const conv = p.guests || dados.guests;
  const valor = Number(p.finalTotal || dados.finalTotal) || 0;
  return {
    cliente: nome,
    primeiro_nome: nome.split(/\s+/)[0] || '',
    evento: p.title || p.proposalName || dados.proposalName || '',
    data: data ? C.fmtDate(data) : '',
    convidados: conv ? String(conv) : '',
    valor: valor ? C.brl(valor) : '',
    empresa: companyName(),
    link_avaliacao: reviewLink || ''
  };
}

function MessageDialog({ ctx, onClose }) {
  const C = window.CRM;
  C.injectCss();
  const [dados, setDados] = React.useState(null);         // { templates, reviewLink }
  const [cliente, setCliente] = React.useState(ctx.client || null);
  const [propostaId, setPropostaId] = React.useState(ctx.proposal ? ctx.proposal.id : '');
  const [chave, setChave] = React.useState(ctx.template || TEMPLATE_BY_TASK[ctx.taskKind] || '');
  const [texto, setTexto] = React.useState('');
  const [editando, setEditando] = React.useState(false);
  const [copiado, setCopiado] = React.useState(false);
  // Envio direto pelo número da empresa (Cloud API), se o WhatsApp estiver configurado
  const waOk = s => !!(s && s.whatsappEnabled && (s.hasAccessToken || s.whatsappAccessToken) && s.whatsappPhoneNumberId);
  const [erroEnvio, setErroEnvio] = React.useState('');
  const [apiPronta, setApiPronta] = React.useState(() => waOk(window.whatsappSettings));
  const [enviando, setEnviando] = React.useState(false);

  const [vinculos, setVinculos] = React.useState(META.vinculos || {});
  React.useEffect(() => { C.templatesStore.load().then(setDados); carregarVinculos().then(v => setVinculos({ ...v })); }, []);
  React.useEffect(() => {
    const api = window.PrecificacaoAPI && window.PrecificacaoAPI.api;
    if (!api || typeof api.request !== 'function') return;
    api.request('/api/company/whatsapp').then(r => { if (r && r.data) { window.whatsappSettings = r.data; setApiPronta(waOk(r.data)); } }).catch(() => {});
  }, []);
  React.useEffect(() => {
    const id = ctx.clientId || (ctx.proposal && ctx.proposal.clientId);
    if (!id || (cliente && Array.isArray(cliente.proposals))) return;
    const api = C.api(); if (!api || typeof api.getClient !== 'function') return;
    api.getClient(id).then(r => { if (r && r.data) setCliente(r.data); }).catch(() => {});
  }, []);
  React.useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const propostas = (cliente && Array.isArray(cliente.proposals) ? cliente.proposals : []).filter(p => p.status !== 'deleted');
  // Negócio padrão: o da tela, senão o aberto mais recente, senão o primeiro
  React.useEffect(() => {
    if (propostaId || !propostas.length) return;
    const aberto = propostas.find(p => ['quoting', 'sent'].includes(C.stageOfProposal(p))) || propostas[0];
    setPropostaId(aberto.id);
  }, [propostas.length]);
  const proposta = (ctx.proposal && ctx.proposal.id === propostaId) ? ctx.proposal : (propostas.find(p => p.id === propostaId) || ctx.proposal || null);

  const templates = dados ? dados.templates : [];
  // Sem link de avaliação, o pós-evento usa o agradecimento simples
  React.useEffect(() => {
    if (!dados) return;
    if (!chave || !templates.find(t => t.key === chave)) setChave((templates[0] || {}).key || '');
    else if (chave === 'avaliacao' && !dados.reviewLink && ctx.taskKind === 'post_event') setChave('agradecimento');
  }, [dados]);
  const modelo = templates.find(t => t.key === chave);
  React.useEffect(() => {
    setErroEnvio('');
    if (!modelo) return;
    setTexto(C.fillTemplate(modelo.body, varsFor(cliente, proposta, dados && dados.reviewLink)));
  }, [chave, propostaId, cliente, dados]);

  const telefone = (cliente && cliente.phone) || (proposta && (proposta.clientPhone || (proposta.proposalData || {}).clientPhone)) || '';
  const wa = C.waLink(telefone);
  const href = wa ? wa + '?text=' + encodeURIComponent(texto) : null;
  const clienteId = (cliente && cliente.id) || ctx.clientId || (proposta && proposta.clientId) || null;

  const registrar = () => {
    // Fica na linha do tempo do cliente (CRM, plano Premium)
    if (!clienteId || !C.hasCrm()) return;
    const api = C.api(); if (!api || typeof api.addClientActivity !== 'function') return;
    api.addClientActivity(clienteId, { type: 'whatsapp', content: (modelo ? modelo.title + ': ' : '') + texto.slice(0, 1500) })
      .then(() => window.dispatchEvent(new CustomEvent('crm-updated'))).catch(() => {});
  };
  const enviarDireto = async () => {
    const api = window.PrecificacaoAPI && window.PrecificacaoAPI.api;
    if (!api || !telefone || !texto.trim()) return;
    setErroEnvio('');
    setEnviando(true);
    const vinc = vinculos && vinculos[chave];
    try {
      if (vinc && vinc.name) {
        // Mensagem ligada a um modelo aprovado: manda sempre o modelo (a Meta entrega mesmo fora das 24 h).
        // O texto livre fora das 24 h é aceito pela API mas NÃO é entregue (a falha só chega depois, por webhook).
        const prm = parametrosDoVinculo(vinc, varsFor(cliente, proposta, dados && dados.reviewLink));
        await api.request('/api/company/whatsapp/send-template', { method: 'POST', body: JSON.stringify({ to: telefone, name: vinc.name, language: vinc.language, ...prm }) });
        registrar();
        alert('✅ Enviado pelo modelo da Meta "' + vinc.name + '" (vai o texto aprovado do modelo, com os dados do cliente).');
        onClose();
      } else {
        await api.request('/api/company/whatsapp/send-text', { method: 'POST', body: JSON.stringify({ to: telefone, text: texto }) });
        registrar();
        alert('✅ Mensagem aceita pela Meta.\n\nAtenção: texto livre só é ENTREGUE se o cliente falou com você nas últimas 24 h. Para chegar sempre, ligue esta mensagem a um modelo da Meta em "✏️ Editar modelos".');
        onClose();
      }
    } catch (e) {
      const msg = String((e && e.message) || e);
      if (/131047/.test(msg)) setErroEnvio('O cliente não falou com você nas últimas 24 h e esta mensagem não está ligada a um modelo da Meta. Ligue em "✏️ Editar modelos" ou use "Abrir no app".');
      else setErroEnvio(msg); // Não abre o app sozinho (o navegador bloqueia depois da espera)
    } finally { setEnviando(false); }
  };
  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 1800); }
    catch (e) { alert('Não foi possível copiar. Selecione o texto e copie manualmente.'); }
  };

  const chip = (ativo) => ({ fontSize: 13, padding: '6px 10px', borderRadius: 9999, cursor: 'pointer', border: `1px solid ${ativo ? '#16a34a' : '#d1d5db'}`, background: ativo ? '#f0fdf4' : '#fff', color: ativo ? '#15803d' : '#374151', fontWeight: ativo ? 700 : 500 });

  return h('div', { className: 'crm-modal-bg', style: { zIndex: 70 }, onClick: onClose },
    h('div', { className: 'crm-modal', style: { maxWidth: 560 }, onClick: e => e.stopPropagation() },
      h('div', { style: { position: 'sticky', top: 0, background: '#fff', zIndex: 2, padding: '14px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } },
        h('div', { style: { minWidth: 0 } },
          h('div', { className: 'crm-muted' }, editando ? 'Modelos de mensagem' : 'Mensagem pronta para WhatsApp'),
          h('div', { className: 'crm-break', style: { fontSize: 18, fontWeight: 800, color: '#111827' } }, editando ? 'Editar modelos' : (varsFor(cliente, proposta).cliente || 'Cliente'))),
        h('div', { role: 'button', 'aria-label': 'Fechar', onClick: onClose, style: { fontSize: 26, lineHeight: 1, padding: '4px 10px', cursor: 'pointer', color: '#6b7280' } }, '×')),
      !dados ? h('div', { className: 'crm-muted', style: { padding: 24, textAlign: 'center' } }, 'Carregando...') :
      editando ? h(TemplateEditor, { dados, onSaved: d => { setDados(d); }, onVinculos: v => setVinculos({ ...v }), onBack: () => setEditando(false) }) :
      h('div', { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12 } },
        propostas.length > 1 && h('div', null,
          h('div', { className: 'crm-muted', style: { marginBottom: 4 } }, 'Negócio'),
          h('select', { className: 'crm-select', value: propostaId, onChange: e => setPropostaId(e.target.value), style: { fontSize: 14 } },
            propostas.map(p => h('option', { key: p.id, value: p.id }, (p.title || 'Proposta') + ' · ' + C.STAGE[C.stageOfProposal(p)].label)))),
        h('div', null,
          h('div', { className: 'crm-muted', style: { marginBottom: 6 } }, 'Modelo'),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
            templates.map(t => h('div', { key: t.key, role: 'button', onClick: () => setChave(t.key), style: chip(t.key === chave) }, t.title)))),
        h('textarea', { value: texto, onChange: e => setTexto(e.target.value), rows: 6, className: 'crm-input', style: { fontSize: 15, lineHeight: 1.45 } }),
        !wa && h('div', { style: { fontSize: 13, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 10px' } }, 'Este cliente não tem telefone cadastrado. Copie o texto ou cadastre o telefone na aba Clientes.'),
        erroEnvio && h('div', { style: { fontSize: 13, color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 10px' } }, '❌ ' + erroEnvio + (/Abrir no/.test(erroEnvio) ? '' : ' Use "Abrir no app" para enviar pelo seu WhatsApp.')),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
          wa && apiPronta && h('button', { onClick: enviarDireto, disabled: enviando, className: 'crm-btn', style: { background: '#16a34a', color: '#fff', flex: '1 1 200px', opacity: enviando ? .6 : 1 } }, enviando ? 'Enviando...' : '📤 Enviar pelo WhatsApp'),
          href && h('a', { href, target: '_blank', rel: 'noopener', onClick: registrar, className: 'crm-btn', style: apiPronta ? { background: '#fff', color: '#15803d', border: '1px solid #86efac', flex: '1 1 160px' } : { background: '#16a34a', color: '#fff', flex: '1 1 200px' } }, apiPronta ? '💬 Abrir no app' : '💬 Abrir no WhatsApp'),
          h('button', { onClick: copiar, className: 'crm-btn', style: { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', flex: '0 0 auto' } }, copiado ? '✓ Copiado' : 'Copiar texto')),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
          h('div', { className: 'crm-muted' }, (apiPronta && wa ? (vinculos && vinculos[chave] && vinculos[chave].name
              ? 'Envio direto: vai o modelo aprovado "' + vinculos[chave].name + '" (chega mesmo fora das 24 h). '
              : 'Envio direto sem modelo: só chega se o cliente falou com você nas últimas 24 h. ') : '') + (C.hasCrm() && clienteId ? 'O envio fica registrado na linha do tempo do cliente.' : '')),
          h('div', { role: 'button', onClick: () => setEditando(true), style: { fontSize: 13, color: '#c2410c', cursor: 'pointer', fontWeight: 600 } }, '✏️ Editar modelos')))));
}

function TemplateEditor({ dados, onSaved, onBack, onVinculos }) {
  const C = window.CRM;
  const [lista, setLista] = React.useState(dados.templates.map(t => ({ ...t })));
  const [link, setLink] = React.useState(dados.reviewLink || '');
  const [salvando, setSalvando] = React.useState(null);
  // Modelos da Meta ligados às mensagens prontas
  const [meta, setMeta] = React.useState(META.lista);
  const [metaErro, setMetaErro] = React.useState('');
  const [vinc, setVinc] = React.useState({ ...(META.vinculos || {}) });
  const [vincSujo, setVincSujo] = React.useState(false);
  React.useEffect(() => {
    carregarVinculos().then(v => { if (!vincSujo) setVinc({ ...v }); });
    carregarModelosMeta().then(setMeta).catch(e => setMetaErro(String((e && e.message) || e)));
  }, []);
  const setV = (key, v) => { setVinc(m => { const n = { ...m }; if (v) n[key] = v; else delete n[key]; return n; }); setVincSujo(true); };
  const escolherModelo = (t, valor) => {
    if (!valor) return setV(t.key, null);
    const [nome, idioma] = valor.split('|');
    const tpl = (meta || []).find(m => m.name === nome && m.language === idioma);
    if (tpl) setV(t.key, sugerirVinculo(tpl, t.body));
  };
  const ligarPelosNomes = () => {
    let n = 0;
    const novo = { ...vinc };
    lista.forEach(t => { if (t.key === 'new' || novo[t.key]) return; const m = modeloParecido(meta, t); if (m) { novo[t.key] = sugerirVinculo(m, t.body); n++; } });
    setVinc(novo); if (n) setVincSujo(true);
    alert(n ? n + ' mensagem(ns) ligada(s) pelo nome. Confira as variáveis e toque em "Salvar ligações".' : 'Não achei modelos com nome parecido. Escolha o modelo em cada mensagem.');
  };
  const salvarLigacoes = async () => {
    setSalvando('_meta');
    try { await salvarVinculos(vinc); setVincSujo(false); onVinculos && onVinculos(vinc); }
    catch (e) { alert('Não foi possível salvar: ' + (e && e.message ? e.message : 'erro')); }
    finally { setSalvando(null); }
  };
  const blocoMeta = t => {
    if (t.key === 'new') return null;
    const v = vinc[t.key];
    const opcoes = meta || [];
    const atual = v ? v.name + '|' + v.language : '';
    const temNaLista = !v || opcoes.some(m => m.name === v.name && m.language === v.language);
    const linhaVar = (x, i, grupo) => h('div', { key: grupo + i, style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 } },
      h('span', { style: { fontFamily: 'monospace', minWidth: 90, color: '#374151' } }, grupo === 'buttons' ? 'botão (link)' : '{{' + x.v + '}}' + (grupo === 'header' ? ' (título)' : '')),
      h('span', null, '→'),
      h('select', { className: 'crm-select', style: { flex: 1 }, value: x.app, onChange: e => {
        const n = { ...v, [grupo]: v[grupo].map((y, j) => j === i ? { ...y, app: e.target.value } : y) }; setV(t.key, n);
      } }, C.TEMPLATE_VARS.map(a => h('option', { key: a, value: a }, '{' + a + '}'))));
    return h('div', { style: { marginTop: 4, padding: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6 } },
      h('div', { style: { fontSize: 12, fontWeight: 700, color: '#166534' } }, '📲 Modelo da Meta (fora das 24 h)'),
      h('select', { className: 'crm-select', value: atual, 'aria-label': 'Modelo da Meta para ' + t.title, onChange: e => escolherModelo(t, e.target.value) },
        h('option', { value: '' }, '— nenhum (fora das 24 h, use "Abrir no app") —'),
        !temNaLista && h('option', { value: atual }, v.name + ' (' + v.language + ')'),
        opcoes.map(m => h('option', { key: m.name + m.language, value: m.name + '|' + m.language }, m.name + ' · ' + m.language + ' · ' + String(m.category || '').toLowerCase()))),
      v && v.bodyText && h('div', { className: 'crm-break', style: { fontSize: 12, color: '#4b5563', whiteSpace: 'pre-wrap', background: '#fff', borderRadius: 6, padding: '6px 8px', border: '1px solid #e5e7eb' } }, v.bodyText),
      v && (v.header || []).map((x, i) => linhaVar(x, i, 'header')),
      v && (v.body || []).map((x, i) => linhaVar(x, i, 'body')),
      v && (v.buttons || []).map((x, i) => linhaVar(x, i, 'buttons')));
  };
  const recarregar = async () => { const d = await C.templatesStore.load(true); setLista(d.templates.map(t => ({ ...t }))); setLink(d.reviewLink || ''); onSaved(d); };
  const set = (key, campo, v) => setLista(l => l.map(t => t.key === key ? { ...t, [campo]: v, _dirty: true } : t));
  const salvar = async t => {
    setSalvando(t.key);
    try { await C.api().saveMessageTemplate(t.key, { title: t.title, body: t.body }); await recarregar(); }
    catch (e) { alert('Não foi possível salvar: ' + (e && e.message ? e.message : 'erro')); }
    finally { setSalvando(null); }
  };
  const restaurar = async t => {
    if (!confirm(t.isDefault ? 'Voltar este modelo ao texto original?' : 'Apagar este modelo?')) return;
    try { await C.api().deleteMessageTemplate(t.key); await recarregar(); } catch (e) { alert('Não foi possível: ' + (e && e.message ? e.message : 'erro')); }
  };
  const novo = () => setLista(l => l.concat([{ key: 'new', title: '', body: '', isDefault: false, _dirty: true }]));
  const salvarLink = async () => {
    setSalvando('_link');
    try { await C.api().saveReviewLink(link.trim()); await recarregar(); }
    catch (e) { alert('Não foi possível salvar: ' + (e && e.message ? e.message : 'erro')); }
    finally { setSalvando(null); }
  };
  const vars = C.TEMPLATE_VARS.map(v => '{' + v + '}').join('  ');
  return h('div', { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12 } },
    h('div', { role: 'button', onClick: onBack, style: { fontSize: 13, color: '#c2410c', cursor: 'pointer', fontWeight: 600 } }, '← Voltar para a mensagem'),
    h('div', { style: { fontSize: 13, color: '#374151', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px' } },
      h('div', { style: { fontWeight: 700, marginBottom: 2 } }, 'Variáveis que o app preenche sozinho:'),
      h('div', { className: 'crm-break', style: { fontFamily: 'monospace', fontSize: 12 } }, vars)),
    h('div', { style: { padding: 12, border: '1px solid #e5e7eb', borderRadius: 10 } },
      h('div', { style: { fontWeight: 700, fontSize: 14, marginBottom: 4 } }, '⭐ Link de avaliação do Google (opcional)'),
      h('div', { className: 'crm-muted', style: { marginBottom: 6 } }, 'Usado no modelo de agradecimento e avaliação, no lugar de {link_avaliacao}.'),
      h('div', { style: { display: 'flex', gap: 8 } },
        h('input', { className: 'crm-input', value: link, onChange: e => setLink(e.target.value), placeholder: 'https://g.page/r/...', style: { flex: 1 } }),
        h('button', { onClick: salvarLink, disabled: salvando === '_link', className: 'crm-btn', style: { background: '#ea580c', color: '#fff' } }, salvando === '_link' ? '...' : 'Salvar'))),
    h('div', { style: { padding: 12, border: '1px solid #bbf7d0', background: '#f0fdf4', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 6 } },
      h('div', { style: { fontWeight: 700, fontSize: 14 } }, '📲 Modelos da Meta (para enviar fora das 24 h)'),
      h('div', { className: 'crm-muted' }, 'Mensagem ligada a um modelo: o "Enviar pelo WhatsApp" manda o modelo aprovado, com as variáveis preenchidas, e ele chega mesmo para quem não falou com você nas últimas 24 h. Sem modelo, vai o texto livre, que só é entregue dentro das 24 h.'),
      metaErro ? h('div', { style: { fontSize: 13, color: '#991b1b' } }, '❌ ' + metaErro)
        : h('div', { className: 'crm-muted' }, meta ? meta.length + ' modelo(s) aprovado(s) na Meta' : 'Carregando modelos da Meta...'),
      h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
        meta && meta.length > 0 && h('button', { onClick: ligarPelosNomes, className: 'crm-btn', style: { background: '#fff', color: '#15803d', border: '1px solid #86efac', fontSize: 13 } }, 'Ligar pelos nomes'),
        h('button', { onClick: salvarLigacoes, disabled: !vincSujo || salvando === '_meta', className: 'crm-btn', style: { background: '#16a34a', color: '#fff', fontSize: 13, opacity: vincSujo ? 1 : 0.45 } }, salvando === '_meta' ? 'Salvando...' : 'Salvar ligações'))),
    lista.map((t, i) => h('div', { key: t.key + i, style: { padding: 12, border: '1px solid #e5e7eb', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 6 } },
      h('input', { className: 'crm-input', value: t.title, onChange: e => set(t.key, 'title', e.target.value), placeholder: 'Nome do modelo', style: { fontWeight: 700 } }),
      h('textarea', { className: 'crm-input', value: t.body, onChange: e => set(t.key, 'body', e.target.value), rows: 4, placeholder: 'Texto da mensagem. Ex.: Olá, {primeiro_nome}!' }),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } },
        h('div', { className: 'crm-muted' }, t.isDefault ? (t.edited ? 'Modelo padrão (editado)' : 'Modelo padrão') : 'Modelo próprio'),
        h('div', { style: { display: 'flex', gap: 8 } },
          (t.edited || (!t.isDefault && t.key !== 'new')) && h('button', { onClick: () => restaurar(t), className: 'crm-btn', style: { background: '#fff', color: '#6b7280', border: '1px solid #d1d5db', fontSize: 13 } }, t.isDefault ? 'Restaurar' : 'Apagar'),
          h('button', { onClick: () => salvar(t), disabled: !t._dirty || salvando === t.key || !t.title.trim() || !t.body.trim(), className: 'crm-btn',
            style: { background: '#16a34a', color: '#fff', fontSize: 13, opacity: (!t._dirty || !t.title.trim() || !t.body.trim()) ? 0.45 : 1 } }, salvando === t.key ? 'Salvando...' : 'Salvar'))),
      blocoMeta(t))),
    vincSujo && h('button', { onClick: salvarLigacoes, disabled: salvando === '_meta', className: 'crm-btn', style: { background: '#16a34a', color: '#fff', position: 'sticky', bottom: 8 } }, salvando === '_meta' ? 'Salvando...' : '💾 Salvar ligações com a Meta'),
    !lista.some(t => t.key === 'new') && h('button', { onClick: novo, className: 'crm-btn', style: { background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' } }, '+ Novo modelo'));
}

function MessageHost() {
  const [ctx, setCtx] = React.useState(null);
  React.useEffect(() => {
    const abrir = e => setCtx({ ...(e.detail || {}), _k: Date.now() });
    window.addEventListener('open-crm-message', abrir);
    return () => window.removeEventListener('open-crm-message', abrir);
  }, []);
  if (!ctx || !window.CRM) return null;
  return h(MessageDialog, { key: ctx._k, ctx, onClose: () => setCtx(null) });
}

window.CrmMessageDialog = MessageDialog;
// Monta o host uma vez, fora da árvore do App
function montar() {
  if (document.getElementById('crm-message-host')) return;
  const el = document.createElement('div'); el.id = 'crm-message-host'; document.body.appendChild(el);
  if (ReactDOM.createRoot) ReactDOM.createRoot(el).render(h(MessageHost)); else ReactDOM.render(h(MessageHost), el);
}
if (document.body) montar(); else document.addEventListener('DOMContentLoaded', montar);
})();
