/**
 * Sinal por PIX (nov/2026) — todos os planos.
 *
 * 1. PixSinal.Painel — bloco em "Dados da Empresa": a chave PIX do chef (tipo, chave, nome e cidade).
 *    Fica em user-settings (`pix`). PixSinal.salvarPainel() é chamado pelo "Salvar" dos Dados da Empresa.
 * 2. PixSinal.Campo — campo "Sinal" dentro da proposta (% do total ou valor). Em proposta nova já vem com a
 *    primeira etapa da forma de pagamento ("30% no fechamento…"). Vai no JSON da proposta: signal { tipo, valor }.
 * 3. PixSinal.abrir({ proposal }) — janela com o QR e o "copia e cola" do sinal, envio pelo WhatsApp e o
 *    "Marcar como recebido" (no Premium/Vitalício o recebimento entra no Financeiro).
 *
 * O dinheiro cai direto na conta do chef. O sistema não recebe nem confere pagamento: quem confirma é o chef.
 * API: GET /api/proposals/:id/sinal · POST e DELETE /api/proposals/:id/sinal/recebido · /api/user-settings
 */
(function () {
'use strict';
var api = function () { return window.PrecificacaoAPI && window.PrecificacaoAPI.api; };
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
var brl = function (v) { return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
var TIPOS = [['cpf', 'CPF'], ['cnpj', 'CNPJ'], ['telefone', 'Celular'], ['email', 'E-mail'], ['aleatoria', 'Chave aleatória']];
var EXEMPLO = { cpf: '000.000.000-00', cnpj: '00.000.000/0000-00', telefone: '(00) 00000-0000', email: 'voce@exemplo.com', aleatoria: '00000000-0000-0000-0000-000000000000' };

/** Mesma conferência do servidor (utils/pix.js): diz se a chave serve para o tipo */
function chaveOk(tipo, chave) {
  var c = String(chave || '').trim(), d = c.replace(/\D/g, '');
  if (!c) return false;
  if (tipo === 'cpf') return d.length === 11;
  if (tipo === 'cnpj') return d.length === 14;
  if (tipo === 'telefone') { if (d.length >= 12 && d.indexOf('55') === 0) d = d.slice(2); return d.length === 10 || d.length === 11; }
  if (tipo === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);
  if (tipo === 'aleatoria') return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c);
  return false;
}

// ---------------------------------------------------------------- 1. Dados da Empresa
var painelAtual = null;
function Painel() {
  var R = window.React, h = R.createElement;
  var st = R.useState({ carregando: true }), s = st[0], setS = st[1];
  var fm = R.useState({ tipo: 'cpf', chave: '', nome: '', cidade: '' }), f = fm[0], setF = fm[1];
  var mexeu = R.useRef(false), fRef = R.useRef(f); fRef.current = f;

  R.useEffect(function () {
    var vivo = true;
    if (!api()) { setS({ fora: true }); return; }
    api().request('/api/user-settings', { method: 'GET', timeoutMs: 20000 }).then(function (r) {
      if (!vivo) return;
      var p = (r && r.data && r.data.settingsData && r.data.settingsData.pix) || {};
      setF({ tipo: p.tipo || 'cpf', chave: p.chave || '', nome: p.nome || '', cidade: p.cidade || '' });
      setS({});
    }).catch(function () { if (vivo) setS({ fora: true }); });
    return function () { vivo = false; };
  }, []);

  var salvar = function (op) {
    op = op || {};
    if (op.soSeMexeu && !mexeu.current) return Promise.resolve(null);
    var v = fRef.current;
    var limpo = { tipo: v.tipo, chave: String(v.chave || '').trim(), nome: String(v.nome || '').trim().slice(0, 60), cidade: String(v.cidade || '').trim().slice(0, 40) };
    if (limpo.chave && !chaveOk(limpo.tipo, limpo.chave)) {
      var e1 = new Error('Chave PIX: confira a chave. Ela não combina com o tipo "' + (TIPOS.filter(function (t) { return t[0] === limpo.tipo; })[0] || ['', ''])[1] + '".');
      setS({ erro: e1.message }); return Promise.reject(e1);
    }
    if (limpo.chave && !limpo.cidade) { var e2 = new Error('Chave PIX: informe a cidade da conta.'); setS({ erro: e2.message }); return Promise.reject(e2); }
    setS({ salvando: true });
    return api().request('/api/user-settings', { method: 'PATCH', body: JSON.stringify({ partialSettings: { pix: limpo.chave ? limpo : null } }) }).then(function () {
      mexeu.current = false; setS({ ok: limpo.chave ? 'Chave PIX salva.' : 'Chave PIX removida.' }); return limpo;
    }).catch(function (e) { setS({ erro: (e && e.message) || 'Não foi possível salvar a chave PIX.' }); throw e; });
  };
  R.useEffect(function () {
    var eu = { salvar: salvar }; painelAtual = eu;
    return function () { if (painelAtual === eu) painelAtual = null; };
  });

  if (s.carregando || s.fora) return null;
  var campo = function (k) { return function (e) { mexeu.current = true; var val = e.target.value; setF(function (a) { var n = Object.assign({}, a); n[k] = val; return n; }); setS({}); }; };
  var cls = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500';
  var rot = function (t, para) { return h('label', { className: 'block text-sm font-medium text-gray-700 mb-1', htmlFor: para }, t); };

  return h('div', { 'data-testid': 'pix-painel', className: 'rounded-lg p-3 space-y-3', style: { background: '#ecfdf5', border: '1px solid #a7f3d0' } },
    h('div', null,
      h('p', { className: 'font-semibold text-gray-900 text-sm' }, '💠 PIX para receber o sinal'),
      h('p', { className: 'text-xs text-gray-600' }, 'Com a sua chave, cada proposta ganha um QR e um "copia e cola" do sinal. O dinheiro cai direto na sua conta.')),
    h('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-3' },
      h('div', null, rot('Tipo de chave', 'pix-tipo'),
        h('select', { id: 'pix-tipo', value: f.tipo, onChange: campo('tipo'), className: cls, 'data-testid': 'pix-tipo' }, TIPOS.map(function (t) { return h('option', { key: t[0], value: t[0] }, t[1]); }))),
      h('div', { className: 'sm:col-span-2' }, rot('Chave PIX', 'pix-chave'),
        h('input', { id: 'pix-chave', type: f.tipo === 'email' ? 'email' : 'text', value: f.chave, onChange: campo('chave'), className: cls, placeholder: EXEMPLO[f.tipo], autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false, maxLength: 80, 'data-testid': 'pix-chave' }))),
    h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
      h('div', null, rot('Nome que aparece para quem paga', 'pix-nome'),
        h('input', { id: 'pix-nome', type: 'text', value: f.nome, onChange: campo('nome'), className: cls, placeholder: 'Vazio = nome da empresa', maxLength: 60, 'data-testid': 'pix-nome' })),
      h('div', null, rot('Cidade da conta', 'pix-cidade'),
        h('input', { id: 'pix-cidade', type: 'text', value: f.cidade, onChange: campo('cidade'), className: cls, placeholder: 'Ex.: Uberlândia', maxLength: 40, 'data-testid': 'pix-cidade' }))),
    f.chave && !chaveOk(f.tipo, f.chave) ? h('p', { className: 'text-xs', style: { color: '#b45309' }, 'data-testid': 'pix-aviso' }, 'Essa chave não combina com o tipo escolhido.') : null,
    s.erro ? h('p', { className: 'text-xs', style: { color: '#b91c1c' }, role: 'alert', 'data-testid': 'pix-erro' }, s.erro) : null,
    s.ok ? h('p', { className: 'text-xs', style: { color: '#047857' }, 'data-testid': 'pix-ok' }, s.ok) : null,
    h('p', { className: 'text-xs text-gray-500' }, 'Salva junto com os Dados da Empresa. Antes de enviar a um cliente, teste o QR com um valor pequeno no seu banco.'));
}
function salvarPainel() { return painelAtual ? painelAtual.salvar({ soSeMexeu: true }) : Promise.resolve(null); }

// ---------------------------------------------------------------- 2. Campo "Sinal" da proposta
/** Primeira etapa da forma de pagamento escrita como "30% no fechamento, 70%…" (ou null) */
function primeiraEtapa(texto) {
  try { var et = window.ProposalModern && window.ProposalModern.payment && window.ProposalModern.payment(texto, 100); return et && et[0] && et[0].pct > 0 && et[0].pct < 100 ? et[0].pct : null; } catch (e) { return null; }
}
function valorDoSinal(sinal, total) {
  var t = Number(total), n = sinal ? Number(sinal.valor) : 0;
  if (!sinal || !(t > 0) || !(n > 0)) return 0;
  return Math.round((sinal.tipo === 'pct' ? t * Math.min(n, 100) / 100 : Math.min(n, t)) * 100) / 100;
}
/** props: sinal (undefined = proposta nova, ainda não mexido), onChange(sinal|null), paymentMethod, total */
function Campo(props) {
  var R = window.React, h = R.createElement;
  var s = props.sinal, sug = primeiraEtapa(props.paymentMethod);
  // proposta nova (ou sinal ainda automático): acompanha a primeira etapa da forma de pagamento
  R.useEffect(function () {
    var automatico = s === undefined || (s && s.auto);
    if (!automatico) return;
    var atual = s && s.auto ? s.valor : null;
    if (sug && sug !== atual) props.onChange({ tipo: 'pct', valor: sug, auto: true });
    else if (!sug && s && s.auto) props.onChange(null);
  }, [sug, s === undefined, s && s.auto]);
  var tipo = s && s.tipo === 'valor' ? 'valor' : 'pct';
  var txt = s && s.valor ? String(s.valor) : '';
  var muda = function (t, v) { var n = parseFloat(String(v).replace(',', '.')); props.onChange(n > 0 ? { tipo: t, valor: n } : null); };
  var total = Number(props.total) || 0, valor = valorDoSinal(s, total);
  var cls = 'px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent';
  return h('div', { 'data-testid': 'sinal-campo' },
    h('label', { className: 'block text-sm font-medium text-gray-700 mb-1', htmlFor: 'sinal-valor' }, '💠 Sinal por PIX'),
    h('div', { className: 'flex gap-2 items-center flex-wrap' },
      h('select', { value: tipo, onChange: function (e) { muda(e.target.value, txt); }, className: cls, 'aria-label': 'Tipo do sinal', 'data-testid': 'sinal-tipo' },
        h('option', { value: 'pct' }, '% do total'), h('option', { value: 'valor' }, 'Valor em R$')),
      h('input', { id: 'sinal-valor', type: 'number', inputMode: 'decimal', min: '0', step: tipo === 'pct' ? '1' : '0.01', value: txt, placeholder: tipo === 'pct' ? 'Ex.: 30' : 'Ex.: 1500',
        onChange: function (e) { muda(tipo, e.target.value); }, className: cls, style: { width: 130 }, 'data-testid': 'sinal-valor' }),
      valor > 0 ? h('span', { className: 'text-sm text-gray-700', 'data-testid': 'sinal-calc' }, '= ' + brl(valor) + (tipo === 'pct' ? '' : ' (' + Math.round(valor / total * 100) + '%)')) : null,
      !s && sug ? h('button', { type: 'button', className: 'text-xs text-orange-700 underline', 'data-testid': 'sinal-sugestao', onClick: function () { props.onChange({ tipo: 'pct', valor: sug }); } }, 'Usar ' + sug + '% (da forma de pagamento)') : null),
    h('p', { className: 'text-xs text-gray-500 mt-1' }, s ? 'Depois de salvar, o botão "PIX do sinal" da proposta mostra o QR e o "copia e cola".' : 'Vazio = proposta sem sinal.'));
}

// ---------------------------------------------------------------- 3. Janela do PIX do sinal
function copiar(texto, botao) {
  var feito = function () { if (!botao) return; var a = botao.getAttribute('data-rotulo') || botao.textContent; botao.setAttribute('data-rotulo', a); botao.textContent = '✓ Copiado'; setTimeout(function () { botao.textContent = a; }, 1600); };
  var antigo = function () {
    try { var t = document.createElement('textarea'); t.value = texto; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(t); t.select(); t.setSelectionRange(0, texto.length); document.execCommand('copy'); t.remove(); feito(); }
    catch (e) { alert('Não foi possível copiar. Selecione o código e copie.'); }
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(feito, antigo); else antigo();
}
function foneWa(f) { var d = String(f || '').replace(/\D/g, ''); if (d.length === 10 || d.length === 11) d = '55' + d; return d.length >= 12 ? d : ''; }
function dataBR(d) { try { return new Date(d).toLocaleDateString('pt-BR'); } catch (e) { return ''; } }
function hojeISO() { var h = new Date(); return h.getFullYear() + '-' + ('0' + (h.getMonth() + 1)).slice(-2) + '-' + ('0' + h.getDate()).slice(-2); }

var CSS = '#px-ov{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:99990;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom));-webkit-overflow-scrolling:touch}' +
  '#px-ov .px-cx{background:#fff;border-radius:16px;max-width:460px;width:100%;margin:auto;padding:20px;box-shadow:0 20px 50px rgba(0,0,0,.25);font-size:15px;color:#1f2937}' +
  '#px-ov h2{margin:0;font-size:19px;line-height:1.25}#px-ov .px-sub{color:#6b7280;font-size:13px;margin:2px 0 14px}' +
  '#px-ov .px-topo{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}' +
  '#px-ov .px-x{border:0;background:#f3f4f6;border-radius:10px;width:36px;height:36px;font-size:18px;cursor:pointer;flex:none}' +
  '#px-ov .px-valor{font-size:30px;font-weight:800;color:#047857;font-variant-numeric:tabular-nums}' +
  '#px-ov .px-qr{width:220px;max-width:70%;margin:12px auto;border:1px solid #e5e7eb;border-radius:12px;padding:6px;background:#fff}#px-ov .px-qr svg{display:block;width:100%;height:auto}' +
  '#px-ov textarea{width:100%;border:1px solid #d1d5db;border-radius:10px;padding:10px;font:12px/1.4 ui-monospace,Menlo,monospace;resize:none;color:#374151;background:#f9fafb;word-break:break-all}' +
  '#px-ov .px-b{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:12px 14px;border-radius:10px;border:0;font-weight:700;font-size:15px;cursor:pointer;font-family:inherit;text-decoration:none;margin-top:8px}' +
  '#px-ov .px-pri{background:#047857;color:#fff}#px-ov .px-wa{background:#128c4a;color:#fff}#px-ov .px-sec{background:#fff;color:#374151;border:1px solid #d1d5db}#px-ov .px-b[disabled]{opacity:.6;cursor:default}' +
  '#px-ov .px-cx2{border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-top:14px}#px-ov .px-ok{background:#ecfdf5;border-color:#a7f3d0}#px-ov .px-av{background:#fffbeb;border-color:#fde68a}' +
  '#px-ov .px-lin{display:flex;gap:8px;margin-top:8px}#px-ov .px-lin label{flex:1;font-size:12px;color:#4b5563}#px-ov .px-lin input{width:100%;margin-top:2px;padding:9px;border:1px solid #d1d5db;border-radius:8px;font:inherit;font-size:16px}' +
  '#px-ov .px-erro{color:#b91c1c;font-size:13px;margin-top:8px}#px-ov .px-nota{color:#6b7280;font-size:12px;margin-top:10px}#px-ov .px-centro{text-align:center}';

function fechar() { var o = document.getElementById('px-ov'); if (o) o.remove(); document.removeEventListener('keydown', esc27); }
function esc27(e) { if (e.key === 'Escape') fechar(); }

function abrir(op) {
  var proposal = (op && op.proposal) || {};
  if (!api() || !proposal.id) return;
  fechar();
  if (!document.getElementById('px-css')) { var st = document.createElement('style'); st.id = 'px-css'; st.textContent = CSS; document.head.appendChild(st); }
  var ov = document.createElement('div'); ov.id = 'px-ov'; // o role="dialog" fica na caixa: no celular o CSS geral limita [role=dialog] a 85vh
  ov.addEventListener('click', function (e) { if (e.target === ov) fechar(); });
  document.addEventListener('keydown', esc27);
  document.body.appendChild(ov);
  var topo = '<div class="px-topo"><div><h2>💠 PIX do sinal</h2><div class="px-sub">' + esc(proposal.title || proposal.clientName || 'Proposta') + '</div></div><button class="px-x" id="px-fechar" aria-label="Fechar">✕</button></div>';
  var pintar = function (miolo) { ov.innerHTML = '<div class="px-cx" role="dialog" aria-modal="true" aria-label="PIX do sinal" data-testid="px-janela">' + topo + miolo + '</div>'; ov.querySelector('#px-fechar').onclick = fechar; };
  var falha = function (e) { pintar('<p class="px-erro" role="alert">' + esc((e && e.message) || 'Não foi possível carregar o PIX do sinal.') + '</p>'); };

  var mostrar = function (d) {
    if (!d.configurado) return pintar('<div class="px-cx2 px-av" data-testid="px-sem-chave"><b>Falta a sua chave PIX.</b><br>Abra <b>Configurações → Dados da Empresa</b>, preencha "PIX para receber o sinal" e salve.</div>');
    var rec = d.recebido;
    var estado = rec
      ? '<div class="px-cx2 px-ok" data-testid="px-recebido"><b>✓ Sinal recebido: ' + esc(brl(rec.valor)) + '</b> em ' + esc(dataBR(rec.em)) + '.' + (d.financeiro ? ' Está no Financeiro como recebido.' : '') +
        '<button class="px-b px-sec" id="px-desfazer">Desfazer</button></div>'
      : (d.avisadoEm ? '<div class="px-cx2 px-av" data-testid="px-avisado"><b>O cliente avisou que pagou</b> em ' + esc(dataBR(d.avisadoEm)) + '. Confira no seu banco e confirme abaixo.</div>' : '');
    if (d.cancelado) return pintar('<div class="px-cx2 px-av" data-testid="px-cancelado"><b>Evento cancelado.</b><br>Não há mais sinal a receber por esta proposta.</div>' + (rec ? '<div class="px-cx2 px-ok"><b>Sinal recebido antes do cancelamento: ' + esc(brl(rec.valor)) + '</b> em ' + esc(dataBR(rec.em)) + '.</div>' : ''));
    if (!d.temSinal && !rec) return pintar('<div class="px-cx2 px-av" data-testid="px-sem-sinal"><b>Esta proposta está sem sinal.</b><br>Abra a proposta em <b>Editar</b>, preencha o campo "Sinal por PIX" e salve.</div>' + estado);
    var wa = foneWa(proposal.clientPhone || (proposal.client && proposal.client.phone));
    var nome = String(proposal.clientName || (proposal.client && proposal.client.name) || '').trim().split(/\s+/)[0];
    var msg = 'Olá' + (nome ? ', ' + nome : '') + '! Segue o PIX do sinal de ' + brl(d.valor) + ' para confirmar a data do seu evento.\n\nFavorecido: ' + d.favorecido + '\n\nPIX copia e cola:\n' + d.copiaECola;
    var codigo = d.copiaECola ? '<div class="px-centro"><div class="px-valor" data-testid="px-valor">' + esc(brl(d.valor)) + '</div>' +
      '<div class="px-sub" style="margin:0">' + (d.sinal && d.sinal.tipo === 'pct' ? esc(String(d.sinal.valor).replace('.', ',')) + '% de ' : 'de ') + esc(brl(d.valorTotal)) + ' · resta ' + esc(brl(d.restante)) + '</div>' +
      '<div class="px-qr" data-testid="px-qr">' + d.qrSvg + '</div>' +
      '<div class="px-sub" style="margin:0 0 8px">Favorecido: <b>' + esc(d.favorecido) + '</b> · chave ' + esc(d.chave) + '</div></div>' +
      '<textarea id="px-codigo" rows="4" readonly aria-label="PIX copia e cola" data-testid="px-codigo">' + esc(d.copiaECola) + '</textarea>' +
      '<button class="px-b px-pri" id="px-copiar" data-testid="px-copiar">Copiar o código</button>' +
      '<a class="px-b px-wa" id="px-wa" data-testid="px-wa" target="_blank" rel="noopener" href="https://wa.me/' + wa + '?text=' + encodeURIComponent(msg) + '">Enviar pelo WhatsApp</a>' : '';
    var confirmar = rec ? '' : '<div class="px-cx2" data-testid="px-confirmar"><b>O PIX caiu na sua conta?</b>' +
      '<div class="px-lin"><label>Valor recebido (R$)<input id="px-v" type="number" inputmode="decimal" min="0" step="0.01" value="' + (d.valor > 0 ? d.valor.toFixed(2) : '') + '"></label>' +
      '<label>Data<input id="px-d" type="date" max="' + hojeISO() + '" value="' + hojeISO() + '"></label></div>' +
      '<button class="px-b px-sec" id="px-recebi" data-testid="px-recebi">✓ Marcar como recebido</button><div class="px-erro" id="px-erro" role="alert" style="display:none"></div>' +
      '<div class="px-nota">' + (d.financeiro ? 'Entra no Financeiro como recebido e o restante fica a receber.' : 'Fica registrado na proposta.') + '</div></div>';
    pintar(codigo + estado + confirmar + '<div class="px-nota">O dinheiro cai direto na sua conta. O sistema não confere o pagamento: confirme sempre pelo extrato do banco.</div>');
    var q = function (id) { return ov.querySelector(id); };
    if (q('#px-copiar')) q('#px-copiar').onclick = function () { copiar(d.copiaECola, q('#px-copiar')); };
    var enviar = function (metodo, corpo, botao) {
      botao.disabled = true;
      api().request('/api/proposals/' + encodeURIComponent(proposal.id) + '/sinal/recebido', { method: metodo, body: corpo ? JSON.stringify(corpo) : undefined })
        .then(function () { try { window.dispatchEvent(new CustomEvent('pix-sinal-mudou', { detail: { proposalId: proposal.id } })); } catch (e) { /* ignore */ } return carregar(); })
        .catch(function (e) { botao.disabled = false; var er = q('#px-erro'); if (er) { er.textContent = (e && e.message) || 'Não foi possível concluir.'; er.style.display = 'block'; } else alert((e && e.message) || 'Não foi possível concluir.'); });
    };
    if (q('#px-recebi')) q('#px-recebi').onclick = function () { enviar('POST', { valor: q('#px-v').value, data: q('#px-d').value }, q('#px-recebi')); };
    if (q('#px-desfazer')) q('#px-desfazer').onclick = function () { enviar('DELETE', null, q('#px-desfazer')); };
  };
  var carregar = function () {
    return api().request('/api/proposals/' + encodeURIComponent(proposal.id) + '/sinal', { method: 'GET', noDedupe: true, timeoutMs: 20000 }).then(function (r) { mostrar((r && r.data) || {}); });
  };
  pintar('<p class="px-sub" data-testid="px-carregando">Carregando…</p>');
  carregar().catch(falha);
}

window.PixSinal = { Painel: Painel, salvarPainel: salvarPainel, Campo: Campo, abrir: abrir, valorDoSinal: valorDoSinal, chaveOk: chaveOk };
})();
