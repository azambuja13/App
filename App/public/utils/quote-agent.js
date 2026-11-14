(function () {
'use strict';
/**
 * Agente de orçamento (nov/2026) — vendido à parte, em créditos (só Premium e Vitalício).
 *
 * O chef escreve o pedido; a API (POST /api/agent/quote, 1 crédito) devolve o PLANO: evento, cliente,
 * cardápio escolhido entre os pratos cadastrados, quantidades por pessoa e o que falta cadastrar.
 * Aqui o chef confere, escolhe o cliente da lista dele (ou cadastra) e ajusta as quantidades.
 * "Criar evento e proposta" manda o plano para o App-Full (evento 'agent-proposal'), que cria o EVENTO
 * (cliente, dados, cardápio e lista de compras), salva e abre a proposta nova a partir dele. O construtor
 * calcula o preço com as regras do chef (apoio, mão de obra e transporte vêm do evento) e salva como RASCUNHO.
 * O App-Full responde com o evento 'agent-proposal-result' { ok, message }.
 *
 * API: QuoteAgent.abrir() · QuoteAgent.disponivel() · QuoteAgent.menuDe(pratos) (cardápio no formato do app)
 */
var SUPORTE_WA = '5534996895592';
var api = function () { return window.PrecificacaoAPI && window.PrecificacaoAPI.api; };
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
var brl = function (v) { return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
// "1.250,00" → 1250; "1,5" → 1.5; "1.250" (milhar) → 1250
var num = function (v) {
  var t = String(v == null ? '' : v).replace(/[^\d,.]/g, ''); if (!t) return 0;
  var n = t.indexOf(',') >= 0 ? parseFloat(t.replace(/\./g, '').replace(',', '.')) : parseFloat(t.replace(/\.(?=\d{3}(\D|$))/g, ''));
  return isFinite(n) ? n : 0;
};

function disponivel() {
  try { return !!(api() && window.CRM && window.CRM.hasCrm && window.CRM.hasCrm()); } catch (e) { return false; }
}

// ---------- cardápio no formato do app (mesma conta do MenuManager.addDishToMenu / getStatistics) ----------
function porPorcao(d) { var s = Number(d.servings) || 1, w = Number(d.totalWeight) || 0; return !!d.useWeightCalculation || (s > 0 && w === 0); }
function itemDoPrato(dish, porcoes) {
  var custo = Number(dish.totalCost) || 0, serv = Number(dish.servings) || 1, peso = Number(dish.totalWeight) || 0, margem = Number(dish.profitMargin) || 0;
  var cpp = porPorcao(dish) ? (serv > 0 ? custo / serv : custo) * porcoes : (peso > 0 ? custo / peso : custo) * porcoes * 100;
  var agora = new Date().toISOString();
  return {
    id: 'menu_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
    dishId: dish.id, dishName: dish.name, dishCategory: dish.category, dishType: dish.category,
    dishCost: custo, profitMargin: margem, suggestedPrice: Number(dish.suggestedPrice) || 0,
    dishCostPerPerson: cpp, dishPricePerPerson: margem > 0 ? cpp * (1 + margem / 100) : cpp,
    dishIngredients: dish.ingredients || [], servings: serv, dishServings: serv, totalWeight: peso,
    portionsPerPerson: porcoes, useWeightCalculation: !!dish.useWeightCalculation, active: true, addedAt: agora, updatedAt: agora
  };
}
/** pratos = [{ dish (completo, com ingredientes), portionsPerPerson }] → cardápio como um "cardápio salvo" */
function menuDe(pratos, nome) {
  var itens = pratos.map(function (p) { return itemDoPrato(p.dish, Number(p.portionsPerPerson) || 0); });
  var prot = { cost: 0, price: 0 };
  try { if (window.PricingRules && window.PricingRules.menuProteinBase) prot = window.PricingRules.menuProteinBase(itens, (window.eventState && window.eventState.ingredientsDatabase) || []); } catch (e) {}
  var stats = {
    totalDishes: itens.length,
    totalCost: itens.reduce(function (t, i) { return t + i.dishCostPerPerson; }, 0),
    totalPrice: itens.reduce(function (t, i) { return t + i.dishPricePerPerson; }, 0),
    proteinCost: prot.cost, proteinPrice: prot.price
  };
  return { id: 'agent-menu', name: nome || 'Cardápio do orçamento', description: '', menuData: { dishes: itens, eventType: 'custom' }, dishes: itens, stats: stats };
}

// ---------- janela ----------
var CSS = '' +
  '#qa-ov{position:fixed;inset:0;z-index:99990;background:rgba(15,23,42,.6);display:flex;align-items:center;justify-content:center;padding:12px;font-family:-apple-system,system-ui,"Segoe UI",sans-serif}' +
  '#qa-ov .qa-box{background:#fff;border-radius:16px;width:100%;max-width:560px;max-height:calc(100vh - 24px);overflow:auto;box-shadow:0 20px 50px rgba(0,0,0,.35)}' +
  '#qa-ov .qa-top{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 18px 10px;position:sticky;top:0;background:#fff;border-bottom:1px solid #f1f5f9;z-index:1}' +
  '#qa-ov h3{margin:0;font-size:18px;font-weight:800;color:#0f172a}' +
  '#qa-ov .qa-cred{font-size:12px;font-weight:700;color:#7c2d12;background:#ffedd5;border-radius:999px;padding:3px 10px;white-space:nowrap}' +
  '#qa-ov .qa-x{background:none;border:0;font-size:26px;line-height:1;color:#94a3b8;cursor:pointer;padding:0 4px}' +
  '#qa-ov .qa-corpo{padding:14px 18px 18px}' +
  '#qa-ov p{margin:0 0 10px;font-size:14px;color:#475569}' +
  '#qa-ov label{display:block;font-size:12px;font-weight:700;color:#334155;margin:10px 0 4px}' +
  '#qa-ov input[type=text],#qa-ov input[type=date],#qa-ov input[type=number],#qa-ov input[type=tel],#qa-ov textarea{width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid #cbd5e1;border-radius:10px;font-size:16px;color:#0f172a;background:#fff;font-family:inherit}' +
  '#qa-ov textarea{min-height:120px;resize:vertical}' +
  '#qa-ov .qa-g{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
  '#qa-ov .qa-b{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;box-sizing:border-box;padding:12px;border:0;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;text-decoration:none}' +
  '#qa-ov .qa-pri{background:linear-gradient(90deg,#ea580c,#dc2626);color:#fff}#qa-ov .qa-sec{background:#f1f5f9;color:#334155;font-weight:600}' +
  '#qa-ov .qa-b[disabled]{opacity:.5;cursor:not-allowed}' +
  '#qa-ov .qa-ex{font-size:12px;color:#64748b;margin-top:6px}#qa-ov .qa-ex span{display:inline-block;background:#f1f5f9;border-radius:999px;padding:3px 9px;margin:3px 4px 0 0;cursor:pointer}' +
  '#qa-ov .qa-msg{border-radius:10px;padding:9px 11px;font-size:13px;margin:10px 0}' +
  '#qa-ov .qa-erro{background:#fee2e2;color:#991b1b}#qa-ov .qa-info{background:#eff6ff;color:#1e3a8a}#qa-ov .qa-av{background:#fef3c7;color:#92400e}' +
  '#qa-ov .qa-sec-t{font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:.02em;margin:16px 0 6px}' +
  '#qa-ov .qa-it{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f1f5f9}' +
  '#qa-ov .qa-it .n{flex:1;min-width:0;font-size:14px;font-weight:600;color:#0f172a}#qa-ov .qa-it .n small{display:block;font-weight:400;color:#64748b;font-size:12px}' +
  '#qa-ov .qa-it input{width:74px;padding:6px 8px;text-align:right}#qa-ov .qa-it .u{font-size:12px;color:#64748b;width:44px}' +
  '#qa-ov .qa-it .rm{background:none;border:0;color:#94a3b8;font-size:18px;cursor:pointer;padding:4px}' +
  '#qa-ov .qa-mini{border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:8px;padding:5px 9px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap}' +
  '#qa-ov .qa-mini.c{border-color:#ea580c;color:#c2410c}' +
  '#qa-ov .qa-tot{display:flex;justify-content:space-between;font-weight:700;color:#0f172a;padding:10px 0 0;font-size:14px}' +
  '#qa-ov .qa-gira{width:34px;height:34px;border:4px solid #fed7aa;border-top-color:#ea580c;border-radius:50%;animation:qa-g .8s linear infinite;margin:26px auto 14px}@keyframes qa-g{to{transform:rotate(360deg)}}' +
  '#qa-ov ul{margin:0;padding-left:18px;font-size:13px;color:#475569}';

var EXEMPLOS = [
  'Churrasco para 120 pessoas no dia 20/12, com picanha, costela e linguiça, arroz, farofa e vinagrete',
  'Casamento para 200 convidados em março, jantar completo com entrada, prato principal e sobremesa',
  'Confraternização de empresa, 60 pessoas, sexta que vem à noite, em Uberlândia'
];

var estado = null; // { credits, plan, itens:[{dish, mode, quantity}], faltando:[...] }

function fechar() { var o = document.getElementById('qa-ov'); if (o) o.remove(); document.removeEventListener('keydown', tecla); estado = null; }
function tecla(e) { if (e.key === 'Escape') fechar(); }
function casca(titulo) {
  var o = document.getElementById('qa-ov');
  if (!o) {
    if (!document.getElementById('qa-css')) { var st = document.createElement('style'); st.id = 'qa-css'; st.textContent = CSS; document.head.appendChild(st); }
    o = document.createElement('div'); o.id = 'qa-ov'; o.setAttribute('data-testid', 'agente');
    o.innerHTML = '<div class="qa-box" role="dialog" aria-modal="true" aria-labelledby="qa-tit"><div class="qa-top"><h3 id="qa-tit"></h3><span style="display:flex;align-items:center;gap:8px"><span class="qa-cred" data-testid="agente-creditos"></span><button type="button" class="qa-x" aria-label="Fechar">×</button></span></div><div class="qa-corpo"></div></div>';
    o.addEventListener('click', function (e) { if (e.target === o || (e.target.classList && e.target.classList.contains('qa-x'))) fechar(); });
    document.addEventListener('keydown', tecla);
    document.body.appendChild(o);
  }
  o.querySelector('#qa-tit').textContent = titulo;
  var c = o.querySelector('.qa-cred');
  var n = estado && estado.credits, livre = !!(estado && estado.unlimited);
  c.textContent = livre ? 'Créditos ilimitados' : (n == null ? '' : (n === 1 ? '1 crédito' : n + ' créditos'));
  c.style.display = !livre && n == null ? 'none' : '';
  return o.querySelector('.qa-corpo');
}
function linkComprar() {
  return 'https://wa.me/' + SUPORTE_WA + '?text=' + encodeURIComponent('Olá! Quero comprar créditos do agente de orçamento da Calculadora de Precificação.');
}

function telaPedido(textoInicial, erro) {
  var c = casca('🤖 Orçamento com IA');
  var semCredito = !estado.unlimited && estado.credits === 0;
  c.innerHTML =
    '<p>Descreva o pedido do cliente como você falaria. O agente monta o cardápio com os <b>seus pratos e custos</b> e deixa a proposta pronta como rascunho.</p>' +
    (estado.trial ? '<div class="qa-msg qa-info">Você ganhou ' + estado.trial + ' orçamentos de cortesia para experimentar.</div>' : '') +
    (erro ? '<div class="qa-msg qa-erro" data-testid="agente-erro">' + esc(erro) + '</div>' : '') +
    (semCredito ? '<div class="qa-msg qa-av" data-testid="agente-sem-credito">Os seus créditos acabaram. Cada orçamento usa 1 crédito.</div>' : '') +
    '<label for="qa-txt">Pedido</label><textarea id="qa-txt" maxlength="3000" placeholder="Ex.: ' + esc(EXEMPLOS[0]) + '"></textarea>' +
    '<div class="qa-ex">Exemplos: ' + EXEMPLOS.map(function (e, i) { return '<span data-ex="' + i + '">' + esc(e.slice(0, 38)) + '…</span>'; }).join('') + '</div>' +
    '<div style="display:flex;flex-direction:column;gap:8px;margin-top:14px">' +
      (semCredito ? '<a class="qa-b qa-pri" data-testid="agente-comprar" target="_blank" rel="noopener" href="' + linkComprar() + '">Comprar créditos pelo WhatsApp</a>'
                  : '<button type="button" class="qa-b qa-pri" id="qa-go" data-testid="agente-montar">' + (estado.unlimited ? 'Montar orçamento' : 'Montar orçamento (1 crédito)') + '</button>') +
      '<button type="button" class="qa-b qa-sec" id="qa-fechar">Fechar</button></div>';
  var txt = c.querySelector('#qa-txt');
  txt.value = textoInicial || '';
  c.querySelectorAll('[data-ex]').forEach(function (s) { s.onclick = function () { txt.value = EXEMPLOS[Number(s.getAttribute('data-ex'))]; txt.focus(); }; });
  c.querySelector('#qa-fechar').onclick = fechar;
  var go = c.querySelector('#qa-go');
  if (go) go.onclick = function () {
    var t = txt.value.trim();
    if (t.length < 8) { telaPedido(t, 'Descreva o pedido: tipo de evento, número de convidados e o que servir.'); return; }
    montar(t);
  };
  if (!semCredito) setTimeout(function () { txt.focus(); }, 50);
}

function telaEspera(msg) {
  var c = casca('🤖 Orçamento com IA');
  c.innerHTML = '<div class="qa-gira"></div><p style="text-align:center" data-testid="agente-espera">' + esc(msg) + '</p>';
}

function montar(texto) {
  telaEspera('Montando o orçamento com os seus pratos… leva alguns segundos.');
  api().request('/api/agent/quote', { method: 'POST', timeoutMs: 120000, body: JSON.stringify({ text: texto }) }).then(function (r) {
    if (!estado) return;
    var d = (r && r.data) || {};
    estado.credits = d.credits; estado.unlimited = !!d.unlimited; estado.trial = 0; estado.texto = texto; estado.plan = d.plan;
    return Promise.all([carregarPratos(d.plan.menu), carregarClientes(), carregarCadastro()]).then(function (r2) {
      if (!estado) return;
      estado.itens = r2[0]; estado.clientes = r2[1]; estado.cadastro = r2[2]; estado.campos = null; estado.buscaPrato = '';
      estado.faltando = (d.plan.missing || []).map(function (m) { return { name: m.name, category: m.category }; });
      telaRevisao();
    });
  }).catch(function (e) {
    if (!estado) return;
    if (e && e.code === 'NO_CREDITS') estado.credits = 0;
    telaPedido(texto, (e && e.message) || 'Não foi possível montar o orçamento. Tente de novo.');
  });
}

// pratos completos (com ingredientes) para o cálculo de custo e da parte de proteína
function carregarPratos(menu) {
  return Promise.all((menu || []).map(function (m) {
    return api().getDish(m.dishId).then(function (r) {
      var dish = (r && r.data) || r;
      // quantidade na unidade do app: porções por pessoa (no prato por peso, 1 porção = 100 g)
      return dish && dish.id ? { dish: dish, portions: Number(m.portionsPerPerson) > 0 ? Number(m.portionsPerPerson) : 1, reason: m.reason } : null;
    }).catch(function () { return null; });
  })).then(function (l) { return l.filter(Boolean); });
}
// ---------- clientes do chef ----------
function gerenteClientes() { return (window.ManagerHelper && window.ManagerHelper.getClientManager && window.ManagerHelper.getClientManager()) || (window.PrecificacaoAPI && window.PrecificacaoAPI.clientManager) || null; }
function carregarClientes() {
  var cm = gerenteClientes();
  if (!cm || !cm.getAllClients) return Promise.resolve([]);
  return cm.getAllClients().then(function (l) {
    return (l || []).filter(function (c) { return c && c.id && c.name; }).slice().sort(function (a, b) { return String(a.name).localeCompare(String(b.name), 'pt-BR'); });
  }).catch(function () { return []; });
}
var norm = function (s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); };
var digitos = function (s) { return String(s || '').replace(/\D/g, ''); };
/** Cliente da lista que bate com o que o agente leu no pedido (nome igual ou mesmo telefone) */
function acharCliente(lista, nome, telefone) {
  var n = norm(nome), t = digitos(telefone).slice(-8);
  if (t.length === 8) { var porTel = lista.filter(function (c) { return digitos(c.phone).slice(-8) === t; }); if (porTel.length === 1) return porTel[0]; }
  if (n) { var porNome = lista.filter(function (c) { return norm(c.name) === n; }); if (porNome.length === 1) return porNome[0]; }
  return null;
}

// lista dos pratos cadastrados (nome e categoria), para o chef acrescentar pratos na revisão
function carregarCadastro() {
  var a = api();
  var p = a.getDishSummary ? a.getDishSummary().catch(function () { return a.getDishes(); }) : a.getDishes();
  return p.then(function (r) {
    var l = (r && (r.data || r.dishes)) || (Array.isArray(r) ? r : []);
    return l.filter(function (d) { return d && d.id && d.name && d.isActive !== false; }).map(function (d) { return { id: d.id, name: d.name, category: d.category || '' }; })
      .sort(function (x, y) { return String(x.name).localeCompare(String(y.name), 'pt-BR'); });
  }).catch(function () { return []; });
}
function porcoesDe(it) { return Number(it.portions) || 0; }
function custoPorPessoa() { return estado.itens.reduce(function (t, it) { return t + itemDoPrato(it.dish, porcoesDe(it)).dishCostPerPerson; }, 0); }

function telaRevisao(aviso) {
  var p = estado.plan, ev = p.event || {}, cli = p.client || {};
  var c = casca('Confira o orçamento');
  var clientes = estado.clientes || [];
  var campos = estado.campos;
  if (!campos) {
    var achado = acharCliente(clientes, cli.name, cli.phone);
    campos = { nome: p.proposalName || '', clienteId: achado ? String(achado.id) : (cli.name || !clientes.length ? '__novo' : ''), cliente: cli.name || '', telefone: cli.phone || '',
      convidados: ev.guests || '', data: ev.date || '', local: ev.location || '', busca: '' };
  }
  estado.campos = campos;
  c.innerHTML =
    (aviso ? '<div class="qa-msg qa-erro" data-testid="agente-erro">' + esc(aviso) + '</div>' : '') +
    '<label for="qa-nome">Nome do evento e da proposta</label><input type="text" id="qa-nome" data-c="nome">' +
    '<label for="qa-clisel">Cliente *</label>' +
    (clientes.length > 12 ? '<input type="text" id="qa-clibusca" data-c="busca" placeholder="Buscar na sua lista de clientes…" style="margin-bottom:6px" aria-label="Buscar cliente">' : '') +
    '<select id="qa-clisel" data-testid="agente-cliente" style="width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid #cbd5e1;border-radius:10px;font-size:16px;background:#fff;color:#0f172a"></select>' +
    '<div class="qa-g" id="qa-novo" style="margin-top:2px"><div><label for="qa-cli">Nome do cliente novo</label><input type="text" id="qa-cli" data-c="cliente" placeholder="Nome do cliente"></div>' +
      '<div><label for="qa-tel">WhatsApp</label><input type="tel" id="qa-tel" data-c="telefone" placeholder="(00) 00000-0000"></div></div>' +
    '<div class="qa-g"><div><label for="qa-conv">Convidados *</label><input type="number" id="qa-conv" data-c="convidados" min="1" inputmode="numeric"></div>' +
      '<div><label for="qa-data">Data do evento</label><input type="date" id="qa-data" data-c="data"></div></div>' +
    '<label for="qa-local">Local</label><input type="text" id="qa-local" data-c="local" placeholder="Endereço do evento">' +
    '<div class="qa-sec-t">Cardápio (porções por pessoa)</div>' +
    '<p style="font-size:12px;margin-bottom:2px">Só pratos do seu cadastro, com a quantidade padrão (1 porção por pessoa). Ajuste aqui ou depois, no cardápio do evento.</p><div id="qa-itens"></div>' +
    '<div class="qa-tot"><span>Custo da comida por pessoa</span><span id="qa-custo" data-testid="agente-custo"></span></div>' +
    '<div id="qa-falta"></div>' +
    '<div class="qa-msg qa-info" style="margin-top:12px">Apoio, mão de obra e transporte entram pelo evento, com os seus itens e valores de sempre (aba Apoio). Ajuste por lá se precisar.</div>' +
    (p.assumptions && p.assumptions.length ? '<div class="qa-sec-t">O que o agente assumiu</div><ul data-testid="agente-premissas">' + p.assumptions.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' : '') +
    (p.observations ? '<div class="qa-msg qa-info" style="margin-top:12px"><b>Vai para as observações da proposta:</b> ' + esc(p.observations) + '</div>' : '') +
    '<div style="display:flex;flex-direction:column;gap:8px;margin-top:16px">' +
      '<button type="button" class="qa-b qa-pri" id="qa-criar" data-testid="agente-criar">Criar evento e proposta</button>' +
      '<button type="button" class="qa-b qa-sec" id="qa-voltar">Voltar ao pedido</button></div>' +
    '<p style="font-size:12px;margin-top:10px">O agente cria o evento (aba Eventos) com a lista de compras e a proposta em rascunho. O preço é calculado com as suas regras; você confere e ajusta antes de enviar.</p>';
  c.querySelectorAll('[data-c]').forEach(function (i) { var k = i.getAttribute('data-c'); i.value = campos[k]; i.oninput = function () { campos[k] = i.value; }; });
  // lista de clientes do chef (com busca quando é grande) + "cadastrar novo"
  var sel = c.querySelector('#qa-clisel'), novo = c.querySelector('#qa-novo'), busca = c.querySelector('#qa-clibusca');
  var opcoes = function () {
    var q = norm(campos.busca);
    var lista = q ? clientes.filter(function (x) { return norm(x.name).indexOf(q) >= 0 || (digitos(q).length >= 4 && digitos(x.phone).indexOf(digitos(q)) >= 0) || String(x.id) === campos.clienteId; }) : clientes;
    sel.innerHTML = '<option value="">Selecione o cliente…</option>' +
      lista.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.name) + (x.phone ? ' · ' + esc(x.phone) : '') + '</option>'; }).join('') +
      '<option value="__novo">➕ Cadastrar novo cliente</option>';
    sel.value = campos.clienteId;
    if (sel.value !== campos.clienteId) { campos.clienteId = ''; sel.value = ''; }
    novo.style.display = campos.clienteId === '__novo' ? '' : 'none';
  };
  sel.onchange = function () { campos.clienteId = sel.value; novo.style.display = sel.value === '__novo' ? '' : 'none'; };
  if (busca) busca.addEventListener('input', opcoes);
  opcoes();
  c.querySelector('#qa-voltar').onclick = function () { telaPedido(estado.texto); };
  c.querySelector('#qa-criar').onclick = criarProposta;
  desenharItens(); desenharFaltando();
}

function desenharItens() {
  var box = document.getElementById('qa-itens'); if (!box) return;
  box.innerHTML = estado.itens.length ? '' : '<div class="qa-msg qa-av">Nenhum prato no cardápio. Crie os pratos que faltam ou volte ao pedido.</div>';
  estado.itens.forEach(function (it, i) {
    var l = document.createElement('div'); l.className = 'qa-it'; l.setAttribute('data-testid', 'agente-item');
    l.innerHTML = '<div class="n">' + esc(it.dish.name) + '<small>' + esc(it.dish.category || '') + (it.reason ? ' · ' + esc(it.reason) : '') + '</small></div>' +
      '<input type="number" min="0" step="0.5" inputmode="decimal" aria-label="Porções por pessoa de ' + esc(it.dish.name) + '"><span class="u">' + (porPorcao(it.dish) ? 'porção' : '× 100 g') + '</span>' +
      '<button type="button" class="rm" aria-label="Tirar ' + esc(it.dish.name) + '">✕</button>';
    var inp = l.querySelector('input'); inp.value = it.portions;
    inp.oninput = function () { it.portions = Math.max(0, Number(inp.value) || 0); atualizarCusto(); };
    l.querySelector('.rm').onclick = function () { estado.itens.splice(i, 1); desenharItens(); };
    box.appendChild(l);
  });
  desenharAdicionar(box);
  atualizarCusto();
}
// "Adicionar prato cadastrado": o chef escolhe na lista de pratos dele (entra com a quantidade padrão, 1 porção)
function desenharAdicionar(box) {
  var cad = estado.cadastro || [];
  if (!cad.length) return;
  var usados = {}; estado.itens.forEach(function (it) { usados[it.dish.id] = 1; });
  var q = norm(estado.buscaPrato);
  var livres = cad.filter(function (d) { return !usados[d.id] && (!q || norm(d.name).indexOf(q) >= 0 || norm(d.category).indexOf(q) >= 0); });
  var l = document.createElement('div'); l.style.cssText = 'padding:10px 0 2px';
  l.innerHTML = (cad.length > 12 ? '<input type="text" id="qa-pbusca" placeholder="Buscar nos seus pratos…" aria-label="Buscar prato" style="margin-bottom:6px">' : '') +
    '<select id="qa-padd" data-testid="agente-add-prato" style="width:100%;box-sizing:border-box;padding:9px 11px;border:1px dashed #94a3b8;border-radius:10px;font-size:15px;background:#fff;color:#0f172a">' +
    '<option value="">➕ Adicionar prato cadastrado…</option>' + livres.map(function (d) { return '<option value="' + esc(d.id) + '">' + esc(d.name) + (d.category ? ' · ' + esc(d.category) : '') + '</option>'; }).join('') + '</select>' +
    '<div id="qa-padd-msg" style="font-size:12px;color:#b91c1c"></div>';
  box.appendChild(l);
  var b = l.querySelector('#qa-pbusca'), sel = l.querySelector('#qa-padd');
  if (b) {
    b.value = estado.buscaPrato || '';
    b.oninput = function () { estado.buscaPrato = b.value; var pos = b.selectionStart; desenharItens(); var n = document.getElementById('qa-pbusca'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } };
  }
  sel.onchange = function () {
    var id = sel.value; if (!id) return;
    sel.disabled = true;
    api().getDish(id).then(function (r) {
      if (!estado) return;
      var dish = (r && r.data) || r;
      if (!dish || !dish.id) throw new Error('Prato não encontrado');
      estado.itens.push({ dish: dish, portions: 1, reason: null }); estado.buscaPrato = '';
      desenharItens();
    }).catch(function (e) { sel.disabled = false; sel.value = ''; var m = document.getElementById('qa-padd-msg'); if (m) m.textContent = 'Não foi possível adicionar: ' + ((e && e.message) || 'erro'); });
  };
}
function atualizarCusto() { var e = document.getElementById('qa-custo'); if (e) e.textContent = brl(custoPorPessoa()); }

function desenharFaltando() {
  var box = document.getElementById('qa-falta'); if (!box) return;
  if (!estado.faltando.length) { box.innerHTML = ''; return; }
  box.innerHTML = '<div class="qa-sec-t">Pedido e não cadastrado</div><div class="qa-msg qa-av">Estes itens não estão nos seus pratos. Escolha um prato cadastrado na lista acima, crie o prato (receita e custo <b>estimados</b>, para conferir depois em Pratos) ou deixe de fora.</div>';
  estado.faltando.forEach(function (f, i) {
    var l = document.createElement('div'); l.className = 'qa-it'; l.setAttribute('data-testid', 'agente-falta');
    l.innerHTML = '<div class="n">' + esc(f.name) + '<small>' + esc(f.category) + (f.erro ? ' · <span style="color:#b91c1c">' + esc(f.erro) + '</span>' : '') + '</small></div>' +
      (f.criando ? '<span class="u" style="width:auto">criando…</span>' : '<button type="button" class="qa-mini c" data-a="criar">Criar prato</button><button type="button" class="qa-mini" data-a="fora">Deixar de fora</button>');
    var bc = l.querySelector('[data-a=criar]'), bf = l.querySelector('[data-a=fora]');
    if (bf) bf.onclick = function () { estado.faltando.splice(i, 1); desenharFaltando(); };
    if (bc) bc.onclick = function () {
      if (!confirm('Criar o prato "' + f.name + '" com receita e custo estimados pela IA?\n\nO custo é uma estimativa: confira a ficha técnica em Pratos antes de enviar a proposta.')) return;
      f.criando = true; f.erro = null; desenharFaltando();
      criarPrato(f).then(function (dish) {
        if (!estado) return;
        estado.faltando.splice(estado.faltando.indexOf(f), 1);
        estado.itens.push({ dish: dish, portions: 1, reason: 'criado agora: confira a receita e o custo em Pratos' });
        desenharItens(); desenharFaltando();
      }).catch(function (e) { if (!estado) return; f.criando = false; f.erro = (e && e.message) || 'não foi possível criar'; desenharFaltando(); });
    };
    box.appendChild(l);
  });
}
function criarPrato(f) {
  return api().request('/api/recipes/create-from-name', { method: 'POST', timeoutMs: 120000, body: JSON.stringify({ dishName: f.name, category: f.category }) }).then(function (r) {
    if (!r || !r.success || !r.data || !r.data.dishId) throw new Error((r && (r.error || r.message)) || 'Erro ao criar o prato');
    try { var dm = window.PrecificacaoAPI.dishManager; if (dm) { dm.cacheTime = null; dm.dishes = []; } } catch (e) {}
    return api().getDish(r.data.dishId).then(function (x) { var d = (x && x.data) || x; if (!d || !d.id) throw new Error('Prato criado, mas não encontrado'); return d; });
  });
}

function criarProposta() {
  var c = estado.campos, conv = parseInt(c.convidados, 10) || 0;
  var itens = estado.itens.filter(function (it) { return porcoesDe(it) > 0; });
  var nome = (c.nome || '').trim();
  if (!nome) { telaRevisao('Dê um nome para o evento.'); return; }
  if (!c.clienteId) { telaRevisao('Selecione o cliente na sua lista ou cadastre um novo.'); return; }
  if (c.clienteId === '__novo' && (c.cliente || '').trim().length < 2) { telaRevisao('Informe o nome do cliente novo.'); return; }
  if (!(conv > 0)) { telaRevisao('Informe o número de convidados.'); return; }
  if (!itens.length) { telaRevisao('O cardápio está vazio: deixe pelo menos um prato com quantidade.'); return; }
  if (estado.faltando.some(function (f) { return f.criando; })) { telaRevisao('Espere terminar de criar os pratos.'); return; }
  if (estado.faltando.length && !confirm('Ainda há ' + estado.faltando.length + ' item(ns) pedido(s) e não cadastrado(s). Criar o evento sem eles?')) return;
  var p = estado.plan;
  telaEspera('Criando o evento e a proposta…');
  obterCliente(c).then(function (cliente) {
    if (!estado) return;
    var menu = menuDe(itens.map(function (it) { return { dish: it.dish, portionsPerPerson: porcoesDe(it) }; }), nome);
    estado.aguardando = true;
    window.dispatchEvent(new CustomEvent('agent-proposal', { detail: {
      client: cliente, eventName: nome, proposalName: nome, guests: conv, eventDate: c.data || '', eventLocation: (c.local || '').trim(),
      menuItems: menu.dishes, observations: p.observations || '',
      serviceStartTime: (p.event && p.event.startTime) || '', eventDuration: (p.event && p.event.durationHours) || ''
    } }));
    // se o app não responder (versão antiga), não deixa a janela presa
    setTimeout(function () { if (estado && estado.aguardando) { estado.aguardando = false; telaRevisao('O app não respondeu. Atualize a página e tente de novo.'); } }, 45000);
  }).catch(function (e) { if (estado) telaRevisao((e && e.message) || 'Não foi possível cadastrar o cliente.'); });
}
// cliente escolhido na lista ou cadastrado agora
function obterCliente(c) {
  if (c.clienteId !== '__novo') {
    var achado = (estado.clientes || []).filter(function (x) { return String(x.id) === String(c.clienteId); })[0];
    return achado ? Promise.resolve(achado) : Promise.reject(new Error('Cliente não encontrado. Selecione de novo.'));
  }
  var cm = gerenteClientes();
  if (!cm || !cm.saveClient) return Promise.reject(new Error('Não foi possível cadastrar o cliente agora.'));
  return cm.saveClient({ name: c.cliente.trim(), phone: (c.telefone || '').trim() || null }).then(function (r) {
    var novo = r && (r.data || r.client);
    if (!r || r.success === false || !novo || !novo.id) throw new Error((r && r.message) || 'Não foi possível cadastrar o cliente.');
    estado.clientes = (estado.clientes || []).concat([novo]); c.clienteId = String(novo.id);
    try { window.dispatchEvent(new CustomEvent('crm-updated')); } catch (e) {}
    return novo;
  });
}
window.addEventListener('agent-proposal-result', function (e) {
  if (!estado || !estado.aguardando) return;
  estado.aguardando = false;
  var d = (e && e.detail) || {};
  if (d.ok) fechar(); else telaRevisao(d.message || 'Não foi possível criar o evento.');
});

function abrir() {
  if (!api()) { alert('Entre na sua conta para usar o agente de orçamento.'); return; }
  estado = { credits: null, trial: 0 };
  telaEspera('Abrindo o agente…');
  api().request('/api/agent/quote/status', { method: 'GET', timeoutMs: 20000 }).then(function (r) {
    if (!estado) return;
    var d = (r && r.data) || {};
    estado.unlimited = !!d.unlimited; estado.credits = d.unlimited ? null : (Number(d.credits) || 0); estado.trial = Number(d.trialGranted) || 0;
    telaPedido('');
  }).catch(function (e) {
    if (!estado) return;
    var c = casca('🤖 Orçamento com IA');
    var premium = e && (e.code === 'PREMIUM_REQUIRED' || e.statusCode === 402);
    c.innerHTML = '<div class="qa-msg qa-av" data-testid="agente-indisponivel">' + esc(premium ? 'O agente de orçamento é um adicional dos planos Premium e Vitalício.' : ((e && e.message) || 'O agente não está disponível agora. Tente de novo em instantes.')) + '</div>' +
      '<button type="button" class="qa-b qa-sec" id="qa-fechar">Fechar</button>';
    c.querySelector('#qa-fechar').onclick = fechar;
  });
}

window.QuoteAgent = { abrir: abrir, disponivel: disponivel, menuDe: menuDe, itemDoPrato: itemDoPrato };
})();
