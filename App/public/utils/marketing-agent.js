/**
 * Divulgação (nov/2026): Instagram, WhatsApp e página de orçamento — para o chef aparecer e receber mais pedidos.
 *
 * 1. MarketingAgent.Painel — bloco dentro de "Dados da Empresa": conta do Instagram, WhatsApp de atendimento,
 *    cidade e a página de orçamento (o "link da bio": o pedido cai no Funil com a origem marcada).
 * 2. MarketingAgent.abrir() — agente de divulgação: o chef diz o que quer divulgar e recebe a legenda do
 *    Instagram com hashtags, a mensagem do WhatsApp, os stories, o roteiro de Reel e a foto sugerida.
 *    Usa os MESMOS créditos do agente de orçamento (1 divulgação = 1 crédito). Só Premium e Vitalício.
 *    O sistema não publica nada: o chef revisa, copia e compartilha.
 *
 * API: /api/marketing/profile (GET, PUT) · /api/agent/content (POST) · /api/agent/quote/status (saldo)
 */
(function () {
'use strict';
var SUPORTE_WA = '5534996895592';
var GUARDA = 'mk_ultima_v1';
var api = function () { return window.PrecificacaoAPI && window.PrecificacaoAPI.api; };
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };

function disponivel() {
  try { return !!(api() && window.CRM && window.CRM.hasCrm && window.CRM.hasCrm()); } catch (e) { return false; }
}

function copiar(texto, botao) {
  var feito = function () {
    if (!botao) return;
    var antes = botao.getAttribute('data-rotulo') || botao.textContent;
    botao.setAttribute('data-rotulo', antes); botao.textContent = '✓ Copiado';
    setTimeout(function () { botao.textContent = antes; }, 1600);
  };
  var antigo = function () {
    try {
      var t = document.createElement('textarea'); t.value = texto; t.setAttribute('readonly', '');
      t.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(t); t.select(); t.setSelectionRange(0, texto.length);
      document.execCommand('copy'); t.remove(); feito();
    } catch (e) { alert('Não foi possível copiar. Selecione o texto e copie.'); }
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(feito, antigo); else antigo();
}

// =====================================================================================================
// Bloco de "Dados da Empresa"
// =====================================================================================================
var painelAtual = null; // { salvar } do painel montado, para o botão "Salvar Dados da Empresa" salvar junto

function Painel() {
  var R = window.React, h = R.createElement;
  var st = R.useState({ carregando: true }), s = st[0], setS = st[1];
  var fm = R.useState({ instagram: '', whatsapp: '', city: '', bioEnabled: false, bioSlug: '', bioHeadline: '', bioText: '' }), f = fm[0], setF = fm[1];
  var mexeu = R.useRef(false), fRef = R.useRef(f); fRef.current = f;

  var aplicar = function (d) {
    mexeu.current = false;
    setF({ instagram: d.instagram ? '@' + d.instagram : '', whatsapp: d.whatsappDisplay || '', city: d.city || '', bioEnabled: !!d.bioEnabled, bioSlug: d.bioSlug || '', bioHeadline: d.bioHeadline || '', bioText: d.bioText || '' });
  };
  R.useEffect(function () {
    var vivo = true;
    if (!api()) { setS({ fora: true }); return; }
    api().request('/api/marketing/profile', { method: 'GET', timeoutMs: 20000 }).then(function (r) {
      if (!vivo) return; var d = (r && r.data) || {}; aplicar(d); setS({ perfil: d });
    }).catch(function () { if (vivo) setS({ fora: true }); });
    return function () { vivo = false; };
  }, []);

  var salvar = function (op) {
    op = op || {};
    if (op.soSeMexeu && !mexeu.current) return Promise.resolve(null);
    var v = fRef.current;
    setS(function (a) { return Object.assign({}, a, { salvando: true, erro: null, ok: null }); });
    return api().request('/api/marketing/profile', { method: 'PUT', timeoutMs: 20000, body: JSON.stringify(v) }).then(function (r) {
      var d = (r && r.data) || {}; aplicar(d);
      setS({ perfil: d, ok: 'Divulgação salva.' });
      return d;
    }).catch(function (e) {
      setS(function (a) { return Object.assign({}, a, { salvando: false, erro: (e && e.message) || 'Não foi possível salvar.' }); });
      if (op.soSeMexeu) throw e;
      return null;
    });
  };
  R.useEffect(function () {
    var eu = { salvar: salvar }; painelAtual = eu;
    return function () { if (painelAtual === eu) painelAtual = null; };
  });

  if (s.carregando || s.fora || !s.perfil) return null; // sem conexão ou ainda não ativado nesta conta: não mostra o bloco
  var p = s.perfil;
  var campo = function (k) { return function (e) { mexeu.current = true; var val = e.target.type === 'checkbox' ? e.target.checked : e.target.value; setF(function (a) { var n = Object.assign({}, a); n[k] = val; return n; }); setS(function (a) { return a.ok || a.erro ? Object.assign({}, a, { ok: null, erro: null }) : a; }); }; };
  var cls = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500';
  var rot = function (t) { return h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, t); };
  var base = String(p.bioBase || '').replace(/^https?:\/\//, '');

  return h('div', { 'data-testid': 'mk-painel', className: 'rounded-lg p-3 space-y-3', style: { background: '#fff7ed', border: '1px solid #fed7aa' } },
    h('div', null,
      h('p', { className: 'font-semibold text-gray-900 text-sm' }, '📣 Divulgação'),
      h('p', { className: 'text-xs text-gray-600' }, 'Instagram e WhatsApp que aparecem nas suas divulgações e na página de orçamento.')),
    h('div', null, rot('Instagram da empresa'),
      h('input', { type: 'text', value: f.instagram, onChange: campo('instagram'), className: cls, placeholder: '@seubuffet', autoCapitalize: 'none', autoCorrect: 'off', 'data-testid': 'mk-ig' })),
    h('div', null, rot('WhatsApp de atendimento'),
      h('input', { type: 'tel', value: f.whatsapp, onChange: campo('whatsapp'), className: cls, placeholder: '(00) 00000-0000', 'data-testid': 'mk-wa' }),
      !f.whatsapp && p.suggestions && p.suggestions.whatsapp ? h('button', { type: 'button', className: 'text-xs text-orange-700 underline mt-1', 'data-testid': 'mk-wa-sug', onClick: function () { mexeu.current = true; setF(function (a) { return Object.assign({}, a, { whatsapp: p.suggestions.whatsapp }); }); } }, 'Usar o telefone da empresa: ' + p.suggestions.whatsapp) : null),
    h('div', null, rot('Cidade ou região que atende'),
      h('input', { type: 'text', value: f.city, onChange: campo('city'), className: cls, placeholder: 'Ex.: Uberlândia e região', maxLength: 80, 'data-testid': 'mk-cidade' })),
    p.premium ? h('div', { className: 'pt-2', style: { borderTop: '1px solid #fed7aa' } },
      h('label', { className: 'flex items-start gap-2 text-sm font-medium text-gray-800', style: { cursor: 'pointer' } },
        h('input', { type: 'checkbox', checked: f.bioEnabled, onChange: campo('bioEnabled'), style: { width: 18, height: 18, marginTop: 2 }, 'data-testid': 'mk-bio' }),
        h('span', null, 'Página de orçamento (link da bio)',
          h('span', { className: 'block text-xs font-normal text-gray-600' }, 'Uma página com o nome da empresa e um formulário. O pedido cai no Funil como Novo contato, com a origem Instagram ou WhatsApp.'))),
      f.bioEnabled ? h('div', { className: 'space-y-3 mt-3' },
        h('div', null, rot('Endereço da página'),
          h('div', { className: 'text-xs text-gray-500 mb-1', style: { wordBreak: 'break-all' } }, base),
          h('input', { type: 'text', value: f.bioSlug, onChange: campo('bioSlug'), className: cls, placeholder: (p.suggestions && p.suggestions.slug) || 'nome-da-empresa', maxLength: 40, autoCapitalize: 'none', autoCorrect: 'off', 'data-testid': 'mk-slug' })),
        h('div', null, rot('Título da página'),
          h('input', { type: 'text', value: f.bioHeadline, onChange: campo('bioHeadline'), className: cls, placeholder: 'Peça seu orçamento', maxLength: 90, 'data-testid': 'mk-titulo' })),
        h('div', null, rot('Texto da página'),
          h('textarea', { value: f.bioText, onChange: campo('bioText'), className: cls, rows: 3, maxLength: 600, placeholder: 'Ex.: Churrasco e buffet completo para casamentos, aniversários e empresas.', 'data-testid': 'mk-texto' }))) : null,
      p.bioUrl && f.bioEnabled ? h('div', { className: 'rounded-lg p-2 mt-3', style: { background: '#fff', border: '1px solid #fdba74' }, 'data-testid': 'mk-link-caixa' },
        h('div', { className: 'text-xs text-gray-600' }, 'Cole este link na bio do Instagram:'),
        h('div', { className: 'text-sm font-semibold text-gray-900', style: { wordBreak: 'break-all' }, 'data-testid': 'mk-link' }, p.bioUrl),
        h('div', { className: 'flex gap-2 mt-2' },
          h('button', { type: 'button', className: 'flex-1 text-sm font-semibold rounded-lg py-2', style: { background: '#ea580c', color: '#fff' }, 'data-testid': 'mk-link-copiar', onClick: function (e) { copiar(p.bioUrl, e.currentTarget); } }, 'Copiar link'),
          h('a', { href: p.bioUrl, target: '_blank', rel: 'noopener', className: 'flex-1 text-sm font-semibold rounded-lg py-2', style: { background: '#fff', color: '#334155', border: '1px solid #cbd5e1', textDecoration: 'none', textAlign: 'center', display: 'block' } }, 'Abrir'))) : null)
      : h('p', { className: 'text-xs text-gray-600', 'data-testid': 'mk-so-premium' }, 'A página de orçamento (link da bio) e o agente de divulgação fazem parte dos planos Premium e Vitalício.'),
    s.erro ? h('div', { className: 'text-sm rounded-lg p-2', style: { background: '#fee2e2', color: '#991b1b' }, role: 'alert', 'data-testid': 'mk-erro' }, s.erro) : null,
    s.ok ? h('div', { className: 'text-sm rounded-lg p-2', style: { background: '#dcfce7', color: '#166534' }, role: 'status', 'data-testid': 'mk-ok' }, s.ok) : null,
    h('button', { type: 'button', disabled: !!s.salvando, onClick: function () { salvar(); }, className: 'w-full text-sm font-semibold rounded-lg py-2', style: { background: '#fff', color: '#c2410c', border: '1px solid #ea580c', opacity: s.salvando ? .6 : 1 }, 'data-testid': 'mk-salvar' }, s.salvando ? 'Salvando…' : 'Salvar divulgação'),
    p.premium ? h('button', { type: 'button', onClick: function () { abrir(); }, className: 'w-full text-sm font-semibold rounded-lg py-2', style: { background: 'linear-gradient(90deg,#ea580c,#dc2626)', color: '#fff' }, 'data-testid': 'mk-criar' }, '📣 Criar divulgação com IA') : null);
}

/** Chamado pelo botão "Salvar Dados da Empresa": salva a divulgação junto, se o chef mexeu nela */
function salvarPainel() { return painelAtual ? painelAtual.salvar({ soSeMexeu: true }) : Promise.resolve(null); }

// =====================================================================================================
// Agente de divulgação (janela)
// =====================================================================================================
var CSS = '' +
  '#mk-ov{position:fixed;inset:0;z-index:99990;background:rgba(15,23,42,.6);display:flex;align-items:center;justify-content:center;padding:12px;font-family:-apple-system,system-ui,"Segoe UI",sans-serif}' +
  '#mk-ov .mk-box{background:#fff;border-radius:16px;width:100%;max-width:600px;max-height:calc(100vh - 24px);overflow:auto;box-shadow:0 20px 50px rgba(0,0,0,.35)}' +
  '#mk-ov .mk-top{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 18px 10px;position:sticky;top:0;background:#fff;border-bottom:1px solid #f1f5f9;z-index:1}' +
  '#mk-ov h3{margin:0;font-size:18px;font-weight:800;color:#0f172a}' +
  '#mk-ov .mk-cred{font-size:12px;font-weight:700;color:#7c2d12;background:#ffedd5;border-radius:999px;padding:3px 10px;white-space:nowrap}' +
  '#mk-ov .mk-x{background:none;border:0;font-size:26px;line-height:1;color:#94a3b8;cursor:pointer;padding:0 4px}' +
  '#mk-ov .mk-corpo{padding:14px 18px 18px}' +
  '#mk-ov p{margin:0 0 10px;font-size:14px;color:#475569}' +
  '#mk-ov label{display:block;font-size:12px;font-weight:700;color:#334155;margin:10px 0 4px}' +
  '#mk-ov textarea{width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid #cbd5e1;border-radius:10px;font-size:16px;line-height:1.45;color:#0f172a;background:#fff;font-family:inherit;resize:vertical}' +
  '#mk-ov .mk-b{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;box-sizing:border-box;padding:12px;border:0;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;text-decoration:none;font-family:inherit}' +
  '#mk-ov .mk-pri{background:linear-gradient(90deg,#ea580c,#dc2626);color:#fff}#mk-ov .mk-sec{background:#f1f5f9;color:#334155;font-weight:600}' +
  '#mk-ov .mk-b[disabled]{opacity:.5;cursor:not-allowed}' +
  '#mk-ov .mk-ex{font-size:12px;color:#64748b;margin-top:6px}#mk-ov .mk-ex span{display:inline-block;background:#f1f5f9;border-radius:999px;padding:4px 10px;margin:4px 4px 0 0;cursor:pointer}' +
  '#mk-ov .mk-tons{display:flex;gap:6px;flex-wrap:wrap}#mk-ov .mk-tons button{flex:1 1 0;min-width:96px;border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:10px;padding:9px 6px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}' +
  '#mk-ov .mk-tons button[aria-pressed=true]{border-color:#ea580c;background:#fff7ed;color:#c2410c}' +
  '#mk-ov .mk-msg{border-radius:10px;padding:9px 11px;font-size:13px;margin:10px 0}' +
  '#mk-ov .mk-erro{background:#fee2e2;color:#991b1b}#mk-ov .mk-info{background:#eff6ff;color:#1e3a8a}#mk-ov .mk-av{background:#fef3c7;color:#92400e}' +
  '#mk-ov .mk-cart{border:1px solid #e2e8f0;border-radius:14px;padding:12px;margin:12px 0}' +
  '#mk-ov .mk-cart h4{margin:0 0 2px;font-size:15px;font-weight:800;color:#0f172a}' +
  '#mk-ov .mk-cart .mk-dica{font-size:12px;color:#64748b;margin:0 0 8px}' +
  '#mk-ov .mk-acoes{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}' +
  '#mk-ov .mk-mini{flex:1 1 0;min-width:120px;display:flex;align-items:center;justify-content:center;border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:10px;padding:10px 8px;font-size:14px;font-weight:700;line-height:1.25;text-align:center;cursor:pointer;text-decoration:none;font-family:inherit;box-sizing:border-box}' +
  '#mk-ov .mk-mini.c{border-color:#ea580c;background:#ea580c;color:#fff}#mk-ov .mk-mini.w{border-color:#128c4a;background:#128c4a;color:#fff}' +
  '#mk-ov .mk-cont{font-size:12px;color:#64748b;text-align:right;margin-top:3px;font-variant-numeric:tabular-nums}' +
  '#mk-ov ol,#mk-ov ul{margin:0;padding-left:20px;font-size:14px;color:#334155}#mk-ov li{margin:4px 0}#mk-ov li small{display:block;color:#64748b}' +
  '#mk-ov .mk-gira{width:34px;height:34px;border:4px solid #fed7aa;border-top-color:#ea580c;border-radius:50%;animation:mk-g .8s linear infinite;margin:26px auto 14px}@keyframes mk-g{to{transform:rotate(360deg)}}';

var EXEMPLOS = [
  'Agenda aberta para confraternizações de fim de ano',
  'Churrasco completo para casamentos, com equipe e montagem',
  'Buffet para aniversários em casa, de 30 a 80 pessoas',
  'Prato novo no cardápio'
];
var TONS = [['descontraido', 'Descontraído'], ['elegante', 'Elegante'], ['direto', 'Direto']];
var TITULO = '📣 Divulgação com IA';
var estado = null; // { credits, unlimited, trial, perfil, texto, tone, content }

function guardada() { try { var g = JSON.parse(localStorage.getItem(GUARDA) || 'null'); return g && g.content ? g : null; } catch (e) { return null; } }
function guardar() { try { localStorage.setItem(GUARDA, JSON.stringify({ content: estado.content, texto: estado.texto, tone: estado.tone, quando: Date.now() })); } catch (e) {} }

function fechar() { var o = document.getElementById('mk-ov'); if (o) o.remove(); document.removeEventListener('keydown', tecla); estado = null; }
function tecla(e) { if (e.key === 'Escape') fechar(); }
function casca() {
  var o = document.getElementById('mk-ov');
  if (!o) {
    if (!document.getElementById('mk-css')) { var st = document.createElement('style'); st.id = 'mk-css'; st.textContent = CSS; document.head.appendChild(st); }
    o = document.createElement('div'); o.id = 'mk-ov'; o.setAttribute('data-testid', 'mk-janela');
    o.innerHTML = '<div class="mk-box" role="dialog" aria-modal="true" aria-labelledby="mk-tit"><div class="mk-top"><h3 id="mk-tit"></h3><span style="display:flex;align-items:center;gap:8px"><span class="mk-cred" data-testid="mk-creditos"></span><button type="button" class="mk-x" aria-label="Fechar">×</button></span></div><div class="mk-corpo"></div></div>';
    o.addEventListener('click', function (e) { if (e.target === o || (e.target.classList && e.target.classList.contains('mk-x'))) fechar(); });
    document.addEventListener('keydown', tecla);
    document.body.appendChild(o);
  }
  o.querySelector('#mk-tit').textContent = TITULO;
  var c = o.querySelector('.mk-cred');
  var n = estado && estado.credits, livre = !!(estado && estado.unlimited);
  c.textContent = livre ? 'Créditos ilimitados' : (n == null ? '' : (n === 1 ? '1 crédito' : n + ' créditos'));
  c.style.display = !livre && n == null ? 'none' : '';
  var box = o.querySelector('.mk-box'); if (box) box.scrollTop = 0;
  return o.querySelector('.mk-corpo');
}
function linkComprar() {
  return 'https://wa.me/' + SUPORTE_WA + '?text=' + encodeURIComponent('Olá! Quero comprar créditos de IA da Calculadora de Precificação.');
}

function telaPedido(erro) {
  var c = casca();
  var semCredito = !estado.unlimited && estado.credits === 0;
  var p = estado.perfil || {};
  var semContato = !p.instagram && !p.whatsapp;
  var ultima = guardada();
  c.innerHTML =
    '<p>Diga o que você quer divulgar. O agente escreve a <b>legenda do Instagram</b>, a <b>mensagem do WhatsApp</b>, os stories e um roteiro de Reel, com o contato da sua empresa. Você revisa, copia e publica.</p>' +
    (estado.trial ? '<div class="mk-msg mk-info">Você ganhou ' + estado.trial + ' créditos de cortesia para experimentar.</div>' : '') +
    (erro ? '<div class="mk-msg mk-erro" role="alert" data-testid="mk-erro-agente">' + esc(erro) + '</div>' : '') +
    (semContato ? '<div class="mk-msg mk-av" data-testid="mk-sem-contato">Cadastre o Instagram e o WhatsApp em <b>Dados da Empresa → Divulgação</b> para o contato sair nos textos.</div>' : '') +
    (semCredito ? '<div class="mk-msg mk-av" data-testid="mk-sem-credito">Os seus créditos acabaram. Cada divulgação usa 1 crédito, o mesmo do agente de orçamento.</div>' : '') +
    '<label for="mk-txt">O que você quer divulgar?</label><textarea id="mk-txt" data-testid="mk-txt" maxlength="2000" rows="4" placeholder="Ex.: ' + esc(EXEMPLOS[0]) + '"></textarea>' +
    '<div class="mk-ex">Ideias: ' + EXEMPLOS.map(function (e, i) { return '<span data-ex="' + i + '">' + esc(e) + '</span>'; }).join('') + '</div>' +
    '<label>Tom do texto</label><div class="mk-tons" role="group" aria-label="Tom do texto">' + TONS.map(function (t) { return '<button type="button" data-tom="' + t[0] + '" aria-pressed="' + (estado.tone === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' +
    '<div style="display:flex;flex-direction:column;gap:8px;margin-top:16px">' +
      (semCredito ? '<a class="mk-b mk-pri" data-testid="mk-comprar" target="_blank" rel="noopener" href="' + linkComprar() + '">Comprar créditos pelo WhatsApp</a>'
                  : '<button type="button" class="mk-b mk-pri" id="mk-go" data-testid="mk-go">' + (estado.unlimited ? 'Criar divulgação' : 'Criar divulgação (1 crédito)') + '</button>') +
      (ultima ? '<button type="button" class="mk-b mk-sec" id="mk-ult" data-testid="mk-ultima">Ver a última divulgação</button>' : '') +
      '<button type="button" class="mk-b mk-sec" id="mk-fechar">Fechar</button></div>';
  var txt = c.querySelector('#mk-txt');
  txt.value = estado.texto || '';
  c.querySelectorAll('[data-ex]').forEach(function (s) { s.onclick = function () { txt.value = EXEMPLOS[Number(s.getAttribute('data-ex'))]; txt.focus(); }; });
  c.querySelectorAll('[data-tom]').forEach(function (b) { b.onclick = function () { estado.tone = b.getAttribute('data-tom'); c.querySelectorAll('[data-tom]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); }; });
  c.querySelector('#mk-fechar').onclick = fechar;
  var u = c.querySelector('#mk-ult');
  if (u) u.onclick = function () { estado.content = ultima.content; estado.texto = ultima.texto || ''; estado.tone = ultima.tone || estado.tone; telaResultado(); };
  var go = c.querySelector('#mk-go');
  if (go) go.onclick = function () {
    estado.texto = txt.value.trim();
    if (estado.texto.length < 8) { telaPedido('Diga o que você quer divulgar: o serviço, o tipo de evento ou a novidade.'); return; }
    montar();
  };
}

function telaEspera(msg) {
  var c = casca();
  c.innerHTML = '<div class="mk-gira"></div><p style="text-align:center" role="status" data-testid="mk-espera">' + esc(msg) + '</p>';
}

function montar() {
  telaEspera('Escrevendo a sua divulgação… leva alguns segundos.');
  api().request('/api/agent/content', { method: 'POST', timeoutMs: 120000, body: JSON.stringify({ text: estado.texto, tone: estado.tone }) }).then(function (r) {
    if (!estado) return;
    var d = (r && r.data) || {};
    estado.unlimited = !!d.unlimited; estado.credits = d.unlimited ? null : (Number(d.credits) || 0); estado.trial = 0;
    estado.content = d.content; guardar();
    telaResultado();
  }).catch(function (e) {
    if (!estado) return;
    if (e && e.code === 'NO_CREDITS') estado.credits = 0;
    telaPedido((e && e.message) || 'O agente não respondeu. Tente de novo.');
  });
}

function telaResultado() {
  var c = casca();
  var d = estado.content || {}, ig = d.instagram || {}, wa = d.whatsapp || {}, ct = d.contact || {};
  var podeCompartilhar = typeof navigator.share === 'function';
  var semCredito = !estado.unlimited && estado.credits === 0;
  c.innerHTML =
    '<p data-testid="mk-res-titulo"><b>' + esc(d.title || 'Divulgação') + '</b> · revise, ajuste o que quiser e publique. O sistema não posta nada por você.</p>' +
    (d.check && d.check.length ? '<div class="mk-msg mk-av" data-testid="mk-conferir"><b>Antes de publicar, confira:</b><ul>' + d.check.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' : '') +
    '<div class="mk-cart"><h4>Instagram · legenda do post</h4><p class="mk-dica">Com a chamada para orçamento e as hashtags no fim.</p>' +
      '<textarea id="mk-ig" data-testid="mk-res-ig" rows="11" aria-label="Legenda do Instagram"></textarea><div class="mk-cont" id="mk-ig-n"></div>' +
      '<div class="mk-acoes"><button type="button" class="mk-mini c" id="mk-ig-c" data-testid="mk-copiar-ig">Copiar legenda</button>' +
      (podeCompartilhar ? '<button type="button" class="mk-mini" id="mk-ig-s">Compartilhar</button>' : '') +
      (ct.instagramUrl ? '<a class="mk-mini" target="_blank" rel="noopener" href="' + esc(ct.instagramUrl) + '">Abrir o Instagram</a>' : '') + '</div></div>' +
    '<div class="mk-cart"><h4>WhatsApp · mensagem</h4><p class="mk-dica">Para o status, a lista de transmissão ou clientes que já falaram com você.</p>' +
      '<textarea id="mk-wa" data-testid="mk-res-wa" rows="6" aria-label="Mensagem do WhatsApp"></textarea>' +
      '<div class="mk-acoes"><button type="button" class="mk-mini c" id="mk-wa-c" data-testid="mk-copiar-wa">Copiar mensagem</button>' +
      '<a class="mk-mini w" id="mk-wa-e" data-testid="mk-enviar-wa" target="_blank" rel="noopener" href="#">Enviar no WhatsApp</a></div></div>' +
    (d.stories && d.stories.length ? '<div class="mk-cart"><h4>Stories · uma frase por tela</h4><ol data-testid="mk-res-stories">' + d.stories.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' +
      '<div class="mk-acoes"><button type="button" class="mk-mini" id="mk-st-c">Copiar stories</button></div></div>' : '') +
    (d.reel && d.reel.length ? '<div class="mk-cart"><h4>Reel · roteiro de 15 a 30 segundos</h4><ol data-testid="mk-res-reel">' + d.reel.map(function (x) { return '<li>' + esc(x.scene) + (x.onScreen ? '<small>Texto na tela: ' + esc(x.onScreen) + '</small>' : '') + '</li>'; }).join('') + '</ol>' +
      '<div class="mk-acoes"><button type="button" class="mk-mini" id="mk-re-c">Copiar roteiro</button></div></div>' : '') +
    (d.photo ? '<div class="mk-cart"><h4>Foto ou vídeo para o post</h4><p style="margin:0" data-testid="mk-res-foto">' + esc(d.photo) + '</p></div>' : '') +
    (ct.bioUrl ? '' : '<div class="mk-msg mk-info" data-testid="mk-dica-bio">Quer receber os pedidos direto no Funil? Ligue a <b>página de orçamento</b> em Dados da Empresa → Divulgação e ponha o link na bio do Instagram.</div>') +
    '<div style="display:flex;flex-direction:column;gap:8px;margin-top:14px">' +
      (semCredito ? '<a class="mk-b mk-pri" data-testid="mk-comprar" target="_blank" rel="noopener" href="' + linkComprar() + '">Comprar créditos pelo WhatsApp</a>'
                  : '<button type="button" class="mk-b mk-pri" id="mk-outra" data-testid="mk-outra">' + (estado.unlimited ? 'Criar outra versão' : 'Criar outra versão (1 crédito)') + '</button>') +
      '<button type="button" class="mk-b mk-sec" id="mk-nova" data-testid="mk-nova">Nova divulgação</button>' +
      '<button type="button" class="mk-b mk-sec" id="mk-fechar">Fechar</button></div>';

  var tIg = c.querySelector('#mk-ig'), tWa = c.querySelector('#mk-wa'), nIg = c.querySelector('#mk-ig-n'), eWa = c.querySelector('#mk-wa-e');
  tIg.value = ig.full || ''; tWa.value = wa.full || '';
  var contar = function () { var n = tIg.value.length; nIg.textContent = n + ' de 2200 caracteres'; nIg.style.color = n > 2200 ? '#b91c1c' : ''; };
  var linkWa = function () { eWa.href = 'https://wa.me/?text=' + encodeURIComponent(tWa.value); };
  var manter = function () { ig.full = tIg.value; wa.full = tWa.value; guardar(); };
  tIg.oninput = function () { contar(); manter(); }; tWa.oninput = function () { linkWa(); manter(); };
  contar(); linkWa();
  c.querySelector('#mk-ig-c').onclick = function (e) { copiar(tIg.value, e.currentTarget); };
  c.querySelector('#mk-wa-c').onclick = function (e) { copiar(tWa.value, e.currentTarget); };
  var sh = c.querySelector('#mk-ig-s'); if (sh) sh.onclick = function () { try { navigator.share({ text: tIg.value }).catch(function () {}); } catch (e) {} };
  var st = c.querySelector('#mk-st-c'); if (st) st.onclick = function (e) { copiar(d.stories.join('\n'), e.currentTarget); };
  var re = c.querySelector('#mk-re-c'); if (re) re.onclick = function (e) { copiar(d.reel.map(function (x, i) { return (i + 1) + '. ' + x.scene + (x.onScreen ? '\n   Texto na tela: ' + x.onScreen : ''); }).join('\n'), e.currentTarget); };
  var outra = c.querySelector('#mk-outra'); if (outra) outra.onclick = function () { if (!estado.texto) { telaPedido(); return; } montar(); };
  c.querySelector('#mk-nova').onclick = function () { estado.texto = ''; telaPedido(); };
  c.querySelector('#mk-fechar').onclick = fechar;
}

function abrir() {
  if (!api()) { alert('Entre na sua conta para usar o agente de divulgação.'); return; }
  estado = { credits: null, trial: 0, tone: 'descontraido', texto: '' };
  telaEspera('Abrindo o agente…');
  var perfil = api().request('/api/marketing/profile', { method: 'GET', timeoutMs: 20000 }).then(function (r) { return (r && r.data) || {}; }).catch(function () { return {}; });
  Promise.all([api().request('/api/agent/quote/status', { method: 'GET', timeoutMs: 20000 }), perfil]).then(function (rs) {
    if (!estado) return;
    var d = (rs[0] && rs[0].data) || {};
    estado.unlimited = !!d.unlimited; estado.credits = d.unlimited ? null : (Number(d.credits) || 0); estado.trial = Number(d.trialGranted) || 0;
    estado.perfil = rs[1];
    telaPedido();
  }).catch(function (e) {
    if (!estado) return;
    var c = casca();
    var premium = e && (e.code === 'PREMIUM_REQUIRED' || e.statusCode === 402);
    c.innerHTML = '<div class="mk-msg mk-av" data-testid="mk-indisponivel">' + esc(premium ? 'O agente de divulgação é um adicional dos planos Premium e Vitalício.' : ((e && e.message) || 'O agente não está disponível agora. Tente de novo em instantes.')) + '</div>' +
      '<button type="button" class="mk-b mk-sec" id="mk-fechar">Fechar</button>';
    c.querySelector('#mk-fechar').onclick = fechar;
  });
}

window.MarketingAgent = { abrir: abrir, disponivel: disponivel, Painel: Painel, salvarPainel: salvarPainel };
})();
