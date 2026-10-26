(function () {
'use strict';
/**
 * Estoque de insumos — fase 1 (out/2026), plano PREMIUM.
 * window.StockPage({ ingredients })          aba Estoque: saldos, mínimo, compra, perda/sobra/inventário, compra sugerida
 * window.EventStockPanel({ items, eventId, eventName })   na aba Itens: baixa do evento (só quando confirma), sobra/perda, desfazer
 * API: /api/stock (quantidades na unidade base do ingrediente: g, ml ou un).
 */
const h = React.createElement;
const { useState, useEffect, useMemo } = React;

const CSS = `
.stk{font-family:system-ui,-apple-system,sans-serif;color:#111827}
.stk .card{background:#fff;border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.08);padding:16px}
.stk .muted{color:#6b7280;font-size:13px}
.stk .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:10px;padding:9px 14px;font-weight:700;font-size:14px;cursor:pointer;user-select:none;border:1px solid transparent}
.stk .b-or{background:#ea580c;color:#fff}.stk .b-gr{background:#16a34a;color:#fff}.stk .b-wh{background:#fff;color:#374151;border-color:#d1d5db}.stk .b-red{background:#fff;color:#b91c1c;border-color:#fecaca}
.stk input,.stk select{border:1px solid #d1d5db;border-radius:9px;padding:8px 10px;font-size:15px;background:#fff;color:#111827;box-sizing:border-box}
.stk table{width:100%;border-collapse:collapse;font-size:14px}
.stk th{text-align:left;font-size:12px;color:#6b7280;font-weight:600;padding:8px 6px;border-bottom:1px solid #e5e7eb}
.stk td{padding:8px 6px;border-bottom:1px solid #f3f4f6;vertical-align:middle}
.stk .tag{display:inline-block;font-size:11px;font-weight:700;border-radius:999px;padding:2px 8px}
.stk .t-low{background:#fef3c7;color:#92400e}.stk .t-neg{background:#fee2e2;color:#991b1b}.stk .t-ok{background:#dcfce7;color:#166534}
.stk-bg{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:80;display:flex;align-items:flex-end;justify-content:center}
@media (min-width:768px){.stk-bg{align-items:center;padding:16px}}
.stk-modal{background:#fff;width:100%;max-width:720px;max-height:92vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom))}
@media (min-width:768px){.stk-modal{border-radius:16px}}
.stk-modal h3{font-size:18px;font-weight:800;margin:0 0 4px}
.stk .line{display:grid;grid-template-columns:minmax(0,2.2fr) 90px 92px minmax(0,1fr) 28px;gap:6px;align-items:center;margin-top:8px}
@media (max-width:560px){.stk .line{grid-template-columns:1fr 1fr;padding-bottom:10px;border-bottom:1px dashed #e5e7eb}.stk .line .full{grid-column:1 / -1}.stk .line.hdr{display:none}
.stk table{font-size:13px!important}.stk th,.stk td{padding:7px 4px!important;min-width:0!important;font-size:13px}.stk td:first-child{white-space:normal}.stk td input{width:62px!important}}
.stk .x{cursor:pointer;color:#9ca3af;font-size:20px;text-align:center}
`;
function injectCss() { if (document.getElementById('stk-css')) return; const st = document.createElement('style'); st.id = 'stk-css'; st.textContent = CSS; document.head.appendChild(st); }

const api = () => { const a = window.PrecificacaoAPI && window.PrecificacaoAPI.api; return a && typeof a.request === 'function' ? a : null; };
const req = (url, opt) => { const a = api(); if (!a) return Promise.reject(new Error('Sem conexão com o servidor')); return a.request(url, opt).then(r => (r && r.data !== undefined ? r.data : r)); };
const brl = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const n2 = (v, d = 2) => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: d });
const parseNum = v => { const t = String(v == null ? '' : v).trim().replace(/\./g, (m, i, s) => (/,/.test(s) ? '' : m)).replace(',', '.'); const n = parseFloat(t); return isFinite(n) ? n : NaN; };

// Tipo de unidade do ingrediente: 'un' (por unidade), 'L' (volume, base ml) ou 'kg' (peso, base g)
function tipo(ing) {
  const t = String((ing && ing.unitType) || '').toLowerCase(), u = String((ing && ing.unit) || '').toLowerCase();
  if (t === 'unit' || u === 'un' || u === 'unidade') return 'un';
  if (t === 'volume' || u === 'l' || u === 'ml' || u === 'litro' || u === 'litros') return 'L';
  return 'kg';
}
function fmtQtd(base, ing) {
  const tp = tipo(ing), v = Number(base) || 0;
  if (tp === 'un') return n2(v, 1) + ' un';
  const grande = tp === 'L' ? 'L' : 'kg', pequeno = tp === 'L' ? 'ml' : 'g';
  return Math.abs(v) >= 1000 ? n2(v / 1000, 2) + ' ' + grande : n2(v, 0) + ' ' + pequeno;
}
// Unidades que dá para digitar e o fator para a base (g/ml/un)
function unidades(ing) {
  const tp = tipo(ing);
  if (tp === 'un') { const emb = Number(ing && ing.unitSize) || 0; return [['un', 1]].concat(emb > 1 ? [[`emb. (${n2(emb, 0)} un)`, emb]] : []); }
  return tp === 'L' ? [['L', 1000], ['ml', 1]] : [['kg', 1000], ['g', 1]];
}
// Preço do cadastro por "unidade de preço": kg/L (peso/volume) ou embalagem (unidade)
function precoCadastro(ing) {
  const c = Number(ing && ing.costPerUnit) || 0, u = Number(ing && ing.unitSize) || 0;
  if (tipo(ing) === 'un') return { valor: c, rotulo: u > 1 ? `emb. de ${n2(u, 0)}` : 'un', base: u > 0 ? u : 1 };
  return { valor: u > 0 ? c / u * 1000 : c * 1000, rotulo: tipo(ing) === 'L' ? 'L' : 'kg', base: 1000 };
}
const temPremium = () => !!(window.ConfigHelper && window.ConfigHelper.hasFeatureAccess && window.ConfigHelper.hasFeatureAccess('stock'));
function mensagemErro(e) {
  const m = String((e && e.message) || e || '');
  if (e && e.statusCode === 402) return 'O estoque é do plano PREMIUM.';
  if (/stock_|does not exist|relation|P20/.test(m) || (e && e.statusCode === 500)) return 'O estoque ainda não está ativado no servidor (as tabelas não foram criadas). Avise o suporte.';
  return m || 'Não foi possível falar com o servidor.';
}

function Modal({ titulo, sub, onClose, children }) {
  useEffect(() => { const k = e => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  return h('div', { className: 'stk-bg stk', onClick: e => { if (e.target === e.currentTarget) onClose(); } },
    h('div', { className: 'stk-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 } },
        h('div', null, h('h3', null, titulo), sub ? h('div', { className: 'muted' }, sub) : null),
        h('div', { role: 'button', 'aria-label': 'Fechar', className: 'x', style: { fontSize: 28 }, onClick: onClose }, '×')),
      children));
}

// Linha de lançamento: ingrediente (busca por nome) + quantidade + unidade (+ valor pago)
function Linhas({ ingredients, linhas, setLinhas, comPreco, rotuloQtd }) {
  const porNome = useMemo(() => { const m = new Map(); (ingredients || []).forEach(i => m.set(String(i.name || '').toLowerCase().trim(), i)); return m; }, [ingredients]);
  const nomes = useMemo(() => (ingredients || []).map(i => i.name).filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR')), [ingredients]);
  const set = (k, campo, v) => setLinhas(ls => ls.map((l, i) => {
    if (i !== k) return l;
    const n = { ...l, [campo]: v };
    if (campo === 'nome') { const ing = porNome.get(String(v).toLowerCase().trim()); n.ingredientId = ing ? ing.id : ''; n.fator = ing ? unidades(ing)[0][1] : 1; }
    return n;
  }));
  return h('div', null,
    h('datalist', { id: 'stk-ings' }, nomes.map(n => h('option', { key: n, value: n }))),
    h('div', { className: 'line hdr muted', style: { marginTop: 4 } }, h('span', { className: 'full' }, 'Ingrediente'), h('span', null, rotuloQtd || 'Quantidade'), h('span', null, 'Unidade'), h('span', null, comPreco ? 'Valor pago (R$)' : ''), h('span')),
    linhas.map((l, k) => {
      const ing = (ingredients || []).find(i => i.id === l.ingredientId);
      return h('div', { className: 'line', key: k },
        h('input', { className: 'full', list: 'stk-ings', value: l.nome, placeholder: 'Comece a digitar...', 'aria-label': 'Ingrediente', onChange: e => set(k, 'nome', e.target.value), style: { borderColor: l.nome && !l.ingredientId ? '#f87171' : undefined } }),
        h('input', { inputMode: 'decimal', value: l.qtd, placeholder: rotuloQtd || 'Quantidade', 'aria-label': rotuloQtd || 'Quantidade', onChange: e => set(k, 'qtd', e.target.value) }),
        h('select', { value: l.fator, 'aria-label': 'Unidade', onChange: e => set(k, 'fator', Number(e.target.value)), disabled: !ing }, (ing ? unidades(ing) : [['—', 1]]).map(([r, f]) => h('option', { key: r, value: f }, r))),
        comPreco ? h('input', { inputMode: 'decimal', value: l.valor, placeholder: 'Valor pago (R$)', 'aria-label': 'Valor pago', onChange: e => set(k, 'valor', e.target.value) }) : h('span'),
        h('div', { className: 'x', role: 'button', 'aria-label': 'Remover linha', onClick: () => setLinhas(ls => ls.length > 1 ? ls.filter((_, i) => i !== k) : [linhaVazia()]) }, '×'));
    }),
    h('div', { role: 'button', className: 'btn b-wh', style: { marginTop: 10 }, onClick: () => setLinhas(ls => ls.concat([linhaVazia()])) }, '+ Linha'));
}
const linhaVazia = () => ({ nome: '', ingredientId: '', qtd: '', fator: 1, valor: '' });
function linhasValidas(linhas) {
  const ok = [], erros = [];
  linhas.forEach((l, i) => {
    if (!l.nome && !l.qtd) return;
    if (!l.ingredientId) { erros.push(`Linha ${i + 1}: escolha um ingrediente da lista`); return; }
    const q = parseNum(l.qtd);
    if (!(q >= 0) || !isFinite(q)) { erros.push(`Linha ${i + 1}: quantidade inválida`); return; }
    ok.push({ ...l, base: q * (Number(l.fator) || 1), valorNum: l.valor === '' ? null : parseNum(l.valor) });
  });
  return { ok, erros };
}

// ====================== Registrar compra ======================
function CompraDialog({ ingredients, inicial, onClose, onSaved }) {
  const [linhas, setLinhas] = useState(inicial && inicial.length ? inicial : [linhaVazia(), linhaVazia(), linhaVazia()]);
  const [obs, setObs] = useState('');
  const [msg, setMsg] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [precos, setPrecos] = useState(null); // etapa 2: atualizar preço do cadastro
  const salvar = async () => {
    const { ok, erros } = linhasValidas(linhas);
    const validos = ok.filter(l => l.base > 0);
    if (erros.length) return setMsg(erros.join(' · '));
    if (!validos.length) return setMsg('Preencha ao menos um ingrediente com a quantidade.');
    if (validos.some(l => l.valorNum != null && !(l.valorNum >= 0))) return setMsg('Valor pago inválido.');
    setSalvando(true); setMsg(null);
    try {
      await req('/api/stock/movements', { method: 'POST', body: JSON.stringify({ type: 'entrada', note: obs || null,
        items: validos.map(l => ({ ingredientId: l.ingredientId, quantity: l.base, unitCost: l.valorNum != null && l.valorNum > 0 ? l.valorNum / l.base : null })) }) });
      // Pergunta se atualiza o preço do cadastro (sugere o último pago)
      const mudou = validos.filter(l => l.valorNum > 0).map(l => {
        const ing = ingredients.find(i => i.id === l.ingredientId); const atual = precoCadastro(ing);
        const novo = l.valorNum / l.base * atual.base;
        return { ing, atual: atual.valor, novo: Math.round(novo * 100) / 100, rotulo: atual.rotulo, marcado: true };
      }).filter(x => x.ing && Math.abs(x.novo - x.atual) > Math.max(0.01, x.atual * 0.005));
      onSaved && onSaved();
      if (mudou.length) setPrecos(mudou); else onClose('Compra registrada.');
    } catch (e) { setMsg(mensagemErro(e)); }
    finally { setSalvando(false); }
  };
  const aplicarPrecos = async () => {
    const im = window.PrecificacaoAPI && window.PrecificacaoAPI.ingredientManager;
    setSalvando(true); setMsg(null);
    const falhas = [];
    let lista = (window.eventState && window.eventState.ingredientsDatabase) || ingredients;
    for (const p of precos.filter(x => x.marcado)) {
      const ing = p.ing, tp = tipo(ing);
      const novoIng = tp === 'un' ? { ...ing, costPerUnit: p.novo } : { ...ing, costPerUnit: p.novo, unitSize: 1000, unitCost: Math.round(p.novo / 1000 * 10000) / 10000 };
      try {
        if (!im || !im.updateIngredient) throw new Error('sem conexão');
        const r = await im.updateIngredient(ing.id, novoIng);
        if (r && r.success === false) throw new Error(r.message || 'falhou');
        lista = lista.map(i => i.id === ing.id ? { ...i, ...novoIng } : i);
      }
      catch (e) { falhas.push(ing.name); }
    }
    try { if (window.eventState && window.eventState.setIngredientsDatabase) window.eventState.setIngredientsDatabase(lista); } catch (e) {}
    setSalvando(false);
    onClose(falhas.length ? 'Compra registrada. Não consegui atualizar o preço de: ' + falhas.join(', ') : 'Compra registrada e preços atualizados.');
  };
  if (precos) {
    return h(Modal, { titulo: 'Atualizar o preço do cadastro?', sub: 'O preço do cadastro é o que entra nas propostas. Sugestão: o último preço pago.', onClose: () => onClose('Compra registrada (preços do cadastro mantidos).') },
      h('table', { style: { marginTop: 10 } },
        h('thead', null, h('tr', null, h('th', null, ''), h('th', null, 'Ingrediente'), h('th', null, 'No cadastro'), h('th', null, 'Último pago'))),
        h('tbody', null, precos.map((p, i) => h('tr', { key: p.ing.id },
          h('td', null, h('input', { type: 'checkbox', checked: p.marcado, 'aria-label': 'Atualizar ' + p.ing.name, onChange: e => setPrecos(ps => ps.map((x, j) => j === i ? { ...x, marcado: e.target.checked } : x)) })),
          h('td', null, p.ing.name), h('td', null, brl(p.atual) + '/' + p.rotulo), h('td', { style: { fontWeight: 700 } }, brl(p.novo) + '/' + p.rotulo))))),
      msg && h('div', { style: { color: '#b91c1c', marginTop: 10, fontWeight: 600 } }, msg),
      h('div', { style: { display: 'flex', gap: 8, marginTop: 16 } },
        h('div', { role: 'button', className: 'btn b-wh', style: { flex: 1 }, onClick: () => onClose('Compra registrada (preços do cadastro mantidos).') }, 'Manter os preços'),
        h('div', { role: 'button', className: 'btn b-or', style: { flex: 2, opacity: salvando ? .6 : 1 }, onClick: salvando ? undefined : aplicarPrecos }, salvando ? 'Atualizando...' : 'Atualizar os marcados')));
  }
  return h(Modal, { titulo: '🛒 Registrar compra', sub: 'O que chegou: quantidade e o valor total pago em cada linha (opcional).', onClose: () => onClose() },
    h(Linhas, { ingredients, linhas, setLinhas, comPreco: true }),
    h('input', { value: obs, onChange: e => setObs(e.target.value), placeholder: 'Observação (fornecedor, nota...)', 'aria-label': 'Observação', style: { width: '100%', marginTop: 12 } }),
    msg && h('div', { style: { color: '#b91c1c', marginTop: 10, fontWeight: 600 } }, msg),
    h('div', { style: { display: 'flex', gap: 8, marginTop: 16 } },
      h('div', { role: 'button', className: 'btn b-wh', style: { flex: 1 }, onClick: () => onClose() }, 'Cancelar'),
      h('div', { role: 'button', className: 'btn b-gr', style: { flex: 2, opacity: salvando ? .6 : 1 }, onClick: salvando ? undefined : salvar }, salvando ? 'Salvando...' : 'Registrar compra')));
}

// ====================== Perda / sobra / inventário ======================
const TIPOS_MOV = { perda: ['Perda', 'Venceu, estragou, caiu: sai do estoque.', 'Quantidade perdida'], sobra: ['Sobra', 'O que voltou de um evento: entra de novo no estoque.', 'Quantidade que voltou'], ajuste: ['Inventário', 'Contagem física: o saldo passa a ser o que você contou.', 'Quantidade contada'] };
function MovDialog({ ingredients, tipoInicial, evento, onClose, onSaved }) {
  const [tp, setTp] = useState(tipoInicial || 'perda');
  const [linhas, setLinhas] = useState([linhaVazia(), linhaVazia()]);
  const [obs, setObs] = useState('');
  const [msg, setMsg] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const salvar = async () => {
    const { ok, erros } = linhasValidas(linhas);
    const validos = ok.filter(l => tp === 'ajuste' ? l.base >= 0 : l.base > 0);
    if (erros.length) return setMsg(erros.join(' · '));
    if (!validos.length) return setMsg('Preencha ao menos um ingrediente com a quantidade.');
    setSalvando(true); setMsg(null);
    try {
      await req('/api/stock/movements', { method: 'POST', body: JSON.stringify({ type: tp, note: obs || null, eventId: evento ? evento.id : null, eventName: evento ? evento.name : null,
        items: validos.map(l => ({ ingredientId: l.ingredientId, quantity: l.base })) }) });
      onSaved && onSaved(); onClose(TIPOS_MOV[tp][0] + ' registrada.');
    } catch (e) { setMsg(mensagemErro(e)); } finally { setSalvando(false); }
  };
  return h(Modal, { titulo: (evento ? 'Depois do evento: ' : '') + TIPOS_MOV[tp][0], sub: TIPOS_MOV[tp][1] + (evento ? ' Evento: ' + evento.name : ''), onClose: () => onClose() },
    h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 } },
      Object.keys(TIPOS_MOV).filter(k => !evento || k !== 'ajuste').map(k => h('div', { key: k, role: 'button', className: 'btn ' + (k === tp ? 'b-or' : 'b-wh'), onClick: () => setTp(k) }, TIPOS_MOV[k][0]))),
    h(Linhas, { ingredients, linhas, setLinhas, comPreco: false, rotuloQtd: TIPOS_MOV[tp][2] }),
    h('input', { value: obs, onChange: e => setObs(e.target.value), placeholder: 'Observação', 'aria-label': 'Observação', style: { width: '100%', marginTop: 12 } }),
    msg && h('div', { style: { color: '#b91c1c', marginTop: 10, fontWeight: 600 } }, msg),
    h('div', { style: { display: 'flex', gap: 8, marginTop: 16 } },
      h('div', { role: 'button', className: 'btn b-wh', style: { flex: 1 }, onClick: () => onClose() }, 'Cancelar'),
      h('div', { role: 'button', className: 'btn b-or', style: { flex: 2, opacity: salvando ? .6 : 1 }, onClick: salvando ? undefined : salvar }, salvando ? 'Salvando...' : 'Registrar')));
}

// ====================== Compra sugerida ======================
const estagio = p => { const s = p.stage || ({ draft: 'quoting', sent: 'sent', accepted: 'won', rejected: 'lost' })[p.status] || 'quoting'; return s; };
const dataISO = v => { const s = String(v || ''); let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[0]; m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
/** Necessidade (base g/ml/un por ingrediente) de uma proposta aprovada, pelo cardápio dela */
async function necessidadeDaProposta(p, db) {
  const d = p.proposalData || p;
  const md = d.selectedMenuData || p.selectedMenuData || {};
  const pratos = (md.menuData && md.menuData.dishes) || md.dishes || [];
  const conv = parseInt(d.guests || p.guests) || 0;
  if (!pratos.length || !conv || !window.menuManager || !window.ShoppingListGenerator || !window.calculateItems) return null;
  const lista = await window.menuManager.generateIngredientsListFromDishes(pratos, conv);
  const itens = window.ShoppingListGenerator.processIngredientsToItems(lista, conv, db);
  const snap = d.pricingSnapshot || p.pricingSnapshot;
  const calc = window.calculateItems(itens, db, conv, { proteinSafetyPct: snap && snap.proteinSafetyPct != null ? snap.proteinSafetyPct : undefined });
  const out = new Map();
  calc.forEach(it => { if (!it.ingredientId || !(it.qtyToBuy > 0)) return; const ing = db.find(i => i.id === it.ingredientId); const base = tipo(ing || it) === 'un' ? it.qtyToBuy : it.qtyToBuy * 1000; out.set(it.ingredientId, (out.get(it.ingredientId) || 0) + base); });
  return out;
}
function PlanoDialog({ ingredients, saldos, onClose, onComprar }) {
  const [dias, setDias] = useState(15);
  const [res, setRes] = useState(null);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    let vivo = true; setRes(null); setErro('');
    (async () => {
      const pm = window.PrecificacaoAPI && window.PrecificacaoAPI.api;
      const r = await pm.getProposals(); const props = (r && r.data) || r || [];
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
      const ate = new Date(hoje.getTime() + dias * 864e5);
      const doPeriodo = props.filter(p => { if (estagio(p) !== 'won') return false; const dt = dataISO((p.proposalData && p.proposalData.eventDate) || p.eventDate); if (!dt) return false; const t = new Date(dt + 'T12:00:00'); return t >= hoje && t <= ate; });
      const total = new Map(), usadas = [], semCardapio = [];
      for (const p of doPeriodo) {
        const nec = await necessidadeDaProposta(p, ingredients);
        const nome = p.title || (p.proposalData && p.proposalData.proposalName) || 'Proposta';
        const dt = dataISO((p.proposalData && p.proposalData.eventDate) || p.eventDate);
        if (!nec) { semCardapio.push({ nome, dt }); continue; }
        usadas.push({ nome, dt }); nec.forEach((v, k) => total.set(k, (total.get(k) || 0) + v));
      }
      // Mínimo: entra também o que está abaixo do mínimo sem evento
      Object.values(saldos).forEach(s => { if ((s.minQuantity || 0) > 0 && !total.has(s.ingredientId)) total.set(s.ingredientId, 0); });
      const linhas = [];
      total.forEach((precisa, id) => {
        const ing = ingredients.find(i => i.id === id); if (!ing) return;
        const s = saldos[id] || { quantity: 0, minQuantity: 0 };
        const comprar = Math.max(0, precisa - (s.quantity || 0) + (s.minQuantity || 0));
        if (comprar > 0.0005) linhas.push({ ing, precisa, saldo: s.quantity || 0, minimo: s.minQuantity || 0, comprar });
      });
      linhas.sort((a, b) => String(a.ing.category || '').localeCompare(String(b.ing.category || ''), 'pt-BR') || a.ing.name.localeCompare(b.ing.name, 'pt-BR'));
      if (vivo) setRes({ linhas, usadas, semCardapio });
    })().catch(e => { if (vivo) setErro(mensagemErro(e)); });
    return () => { vivo = false; };
  }, [dias]);
  const textoLista = () => res ? ['Lista de compras (' + dias + ' dias)', ...res.linhas.map(l => `- ${l.ing.name}: ${fmtQtd(l.comprar, l.ing)}`)].join('\n') : '';
  const copiar = async () => { try { await navigator.clipboard.writeText(textoLista()); setCopiado(true); setTimeout(() => setCopiado(false), 1500); } catch (e) { alert('Não consegui copiar.'); } };
  return h(Modal, { titulo: '🧾 Compra sugerida', sub: 'Eventos fechados (proposta aprovada) do período, menos o que já tem no estoque, mais o estoque mínimo.', onClose },
    h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 } }, [7, 15, 30, 60].map(d => h('div', { key: d, role: 'button', className: 'btn ' + (d === dias ? 'b-or' : 'b-wh'), onClick: () => setDias(d) }, 'Próximos ' + d + ' dias'))),
    erro ? h('div', { style: { color: '#b91c1c', marginTop: 12 } }, erro) : !res ? h('div', { className: 'muted', style: { marginTop: 14 } }, 'Calculando...') :
    h('div', null,
      h('div', { className: 'muted', style: { marginTop: 12 } }, res.usadas.length ? 'Eventos: ' + res.usadas.map(u => u.nome + (u.dt ? ' (' + u.dt.split('-').reverse().join('/') + ')' : '')).join(' · ') : 'Nenhum evento fechado com cardápio no período.'),
      res.semCardapio.length ? h('div', { style: { fontSize: 13, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '6px 10px', marginTop: 8 } }, '⚠️ Sem cardápio na proposta (não entram na conta): ' + res.semCardapio.map(u => u.nome).join(', ')) : null,
      res.linhas.length ? h('div', { style: { overflowX: 'auto' } }, h('table', { style: { marginTop: 12 } },
        h('thead', null, h('tr', null, h('th', null, 'Ingrediente'), h('th', null, 'Precisa'), h('th', null, 'Estoque'), h('th', null, 'Comprar'))),
        h('tbody', null, res.linhas.map(l => h('tr', { key: l.ing.id }, h('td', null, l.ing.name), h('td', null, fmtQtd(l.precisa, l.ing), l.minimo ? h('div', { className: 'muted', style: { fontSize: 11 } }, '+ mín. ' + fmtQtd(l.minimo, l.ing)) : null), h('td', { style: { color: l.saldo < 0 ? '#b91c1c' : undefined } }, fmtQtd(l.saldo, l.ing)), h('td', { style: { fontWeight: 800 } }, fmtQtd(l.comprar, l.ing)))))))
        : h('div', { style: { marginTop: 14, fontWeight: 600, color: '#166534' } }, '✅ Nada a comprar: o estoque cobre o período.'),
      res.linhas.length ? h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 } },
        h('div', { role: 'button', className: 'btn b-wh', onClick: copiar }, copiado ? '✓ Copiado' : 'Copiar lista'),
        h('a', { className: 'btn b-wh', href: 'https://wa.me/?text=' + encodeURIComponent(textoLista()), target: '_blank', rel: 'noopener', style: { textDecoration: 'none' } }, 'Enviar pelo WhatsApp'),
        h('div', { role: 'button', className: 'btn b-gr', onClick: () => onComprar(res.linhas.map(l => { const us = unidades(l.ing); const f = us[0][1]; return { nome: l.ing.name, ingredientId: l.ing.id, qtd: String(Math.round(l.comprar / f * 1000) / 1000).replace('.', ','), fator: f, valor: '' }; })) }, 'Comprei: registrar a compra')) : null));
}

// ====================== Histórico de um ingrediente ======================
function HistoricoDialog({ ing, onClose }) {
  const [movs, setMovs] = useState(null);
  const [erro, setErro] = useState('');
  useEffect(() => { req('/api/stock/movements?ingredientId=' + encodeURIComponent(ing.id) + '&limit=100').then(setMovs).catch(e => setErro(mensagemErro(e))); }, []);
  const NOME = { entrada: 'Compra', saida: 'Baixa do evento', sobra: 'Sobra', perda: 'Perda', ajuste: 'Inventário', estorno: 'Baixa desfeita' };
  return h(Modal, { titulo: ing.name, sub: 'Movimentos do estoque (mais recentes primeiro)', onClose },
    erro ? h('div', { style: { color: '#b91c1c' } }, erro) : !movs ? h('div', { className: 'muted' }, 'Carregando...') : !movs.length ? h('div', { className: 'muted', style: { marginTop: 10 } }, 'Nenhum movimento ainda.') :
    h('table', { style: { marginTop: 10 } },
      h('thead', null, h('tr', null, h('th', null, 'Data'), h('th', null, 'Movimento'), h('th', null, 'Quantidade'), h('th', null, 'Saldo'), h('th', null, 'Preço'))),
      h('tbody', null, movs.map(m => h('tr', { key: m.id, style: { opacity: m.undone ? .5 : 1 } },
        h('td', null, new Date(m.createdAt).toLocaleDateString('pt-BR')),
        h('td', null, (NOME[m.type] || m.type) + (m.eventName ? ' · ' + m.eventName : '') + (m.undone ? ' (desfeita)' : '') + (m.note ? ' — ' + m.note : '')),
        h('td', { style: { color: m.quantity < 0 ? '#b91c1c' : '#166534', fontWeight: 600 } }, (m.quantity > 0 ? '+' : '') + fmtQtd(m.quantity, ing)),
        h('td', null, fmtQtd(m.balanceAfter, ing)),
        h('td', null, m.unitCost != null && m.type === 'entrada' ? brl(m.unitCost * precoCadastro(ing).base) + '/' + precoCadastro(ing).rotulo : ''))))));
}

// ====================== Aba Estoque ======================
function StockPage({ ingredients }) {
  injectCss();
  const db = useMemo(() => (ingredients || []).filter(i => i && i.id && i.isActive !== false), [ingredients]);
  const [saldos, setSaldos] = useState(null);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('estoque'); // estoque | baixo | todos
  const [dialogo, setDialogo] = useState(null);
  const [aviso, setAviso] = useState('');
  const carregar = () => req('/api/stock').then(l => { const m = {}; (l || []).forEach(s => { m[s.ingredientId] = s; }); setSaldos(m); setErro(''); }).catch(e => setErro(mensagemErro(e)));
  useEffect(() => { carregar(); }, []);
  const fechar = texto => { setDialogo(null); if (texto) { setAviso(texto); setTimeout(() => setAviso(''), 4000); } carregar(); };
  const salvarMinimo = async (ing, valor) => {
    const v = parseNum(valor); if (!(v >= 0)) return;
    const base = v * unidades(ing)[0][1];
    try { const s = await req('/api/stock/items/' + encodeURIComponent(ing.id), { method: 'PUT', body: JSON.stringify({ minQuantity: base }) }); setSaldos(m => ({ ...m, [ing.id]: s })); } catch (e) { alert(mensagemErro(e)); }
  };
  if (!temPremium()) return h('div', { className: 'stk card' }, h('h2', { style: { fontSize: 20, fontWeight: 800 } }, '📦 Estoque'), h('p', { className: 'muted' }, 'O controle de estoque de insumos é do plano PREMIUM.'));
  const s = saldos || {};
  const linhas = db.map(ing => ({ ing, st: s[ing.id] || null }))
    .filter(({ ing, st }) => {
      if (busca && !String(ing.name || '').toLowerCase().includes(busca.toLowerCase())) return false;
      if (busca || filtro === 'todos') return true;
      if (filtro === 'baixo') return st && (st.quantity < 0 || (st.minQuantity > 0 && st.quantity < st.minQuantity));
      return !!st;
    })
    .sort((a, b) => String(a.ing.category || '').localeCompare(String(b.ing.category || ''), 'pt-BR') || String(a.ing.name).localeCompare(String(b.ing.name), 'pt-BR'));
  const baixos = Object.values(s).filter(x => x.quantity < 0 || (x.minQuantity > 0 && x.quantity < x.minQuantity)).length;
  const valorTotal = Object.values(s).reduce((t, x) => t + Math.max(0, x.quantity) * (x.avgCost || 0), 0);
  return h('div', { className: 'stk' },
    h('div', { className: 'card' },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
        h('div', null, h('h2', { style: { fontSize: 22, fontWeight: 800, margin: 0 } }, '📦 Estoque de insumos'),
          h('div', { className: 'muted' }, saldos ? `${Object.keys(s).length} ingrediente(s) no estoque · valor estimado ${brl(valorTotal)}` + (baixos ? ` · ${baixos} abaixo do mínimo` : '') : 'Carregando...')),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
          h('div', { role: 'button', className: 'btn b-gr', onClick: () => setDialogo({ k: 'compra' }) }, '🛒 Registrar compra'),
          h('div', { role: 'button', className: 'btn b-wh', onClick: () => setDialogo({ k: 'mov', tipo: 'perda' }) }, 'Perda / sobra / inventário'),
          h('div', { role: 'button', className: 'btn b-or', onClick: () => setDialogo({ k: 'plano' }) }, '🧾 Compra sugerida'))),
      aviso && h('div', { role: 'status', style: { marginTop: 10, color: '#166534', fontWeight: 600 } }, '✅ ' + aviso),
      erro && h('div', { style: { marginTop: 10, color: '#b91c1c', fontWeight: 600 } }, '❌ ' + erro),
      h('div', { style: { display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' } },
        h('input', { value: busca, onChange: e => setBusca(e.target.value), placeholder: '🔍 Buscar ingrediente', 'aria-label': 'Buscar ingrediente', style: { flex: '1 1 200px' } }),
        h('select', { value: filtro, onChange: e => setFiltro(e.target.value), 'aria-label': 'Filtro' },
          h('option', { value: 'estoque' }, 'Com estoque'), h('option', { value: 'baixo' }, 'Abaixo do mínimo'), h('option', { value: 'todos' }, 'Todos os ingredientes'))),
      saldos && !linhas.length && h('div', { className: 'muted', style: { marginTop: 16 } }, filtro === 'estoque' && !busca ? 'Nenhum ingrediente no estoque ainda. Comece por "Registrar compra" ou por um inventário.' : 'Nada encontrado.'),
      linhas.length > 0 && h('div', { style: { overflowX: 'auto', marginTop: 10 } }, h('table', null,
        h('thead', null, h('tr', null, h('th', null, 'Ingrediente'), h('th', null, 'Saldo'), h('th', null, 'Mínimo'), h('th', null, 'Custo médio'), h('th', null, ''))),
        h('tbody', null, linhas.slice(0, 400).map(({ ing, st }) => {
          const q = st ? st.quantity : 0, min = st ? st.minQuantity : 0, f = unidades(ing)[0];
          const status = q < 0 ? h('span', { className: 'tag t-neg' }, 'negativo') : (min > 0 && q < min) ? h('span', { className: 'tag t-low' }, 'abaixo do mínimo') : st ? h('span', { className: 'tag t-ok' }, 'ok') : null;
          return h('tr', { key: ing.id },
            h('td', null, h('div', { role: 'button', style: { fontWeight: 600, cursor: 'pointer', color: '#9a3412' }, onClick: () => setDialogo({ k: 'hist', ing }) }, ing.name), h('div', { className: 'muted', style: { fontSize: 11 } }, ing.category || '')),
            h('td', { style: { fontWeight: 700, color: q < 0 ? '#b91c1c' : undefined } }, st ? fmtQtd(q, ing) : '—'),
            h('td', null, h('input', { key: ing.id + ':' + min, defaultValue: min ? String(Math.round(min / f[1] * 1000) / 1000).replace('.', ',') : '', placeholder: '0', inputMode: 'decimal', 'aria-label': 'Estoque mínimo de ' + ing.name, style: { width: 70, padding: '5px 7px', fontSize: 14 }, onBlur: e => { if (e.target.value !== (min ? String(Math.round(min / f[1] * 1000) / 1000).replace('.', ',') : '')) salvarMinimo(ing, e.target.value || '0'); } }), h('span', { className: 'muted', style: { marginLeft: 4 } }, f[0])),
            h('td', null, st && st.avgCost > 0 ? brl(st.avgCost * precoCadastro(ing).base) + '/' + precoCadastro(ing).rotulo : '—'),
            h('td', null, status));
        }))))),
    dialogo && dialogo.k === 'compra' && h(CompraDialog, { ingredients: db, inicial: dialogo.inicial, onClose: fechar, onSaved: carregar }),
    dialogo && dialogo.k === 'mov' && h(MovDialog, { ingredients: db, tipoInicial: dialogo.tipo, onClose: fechar, onSaved: carregar }),
    dialogo && dialogo.k === 'plano' && saldos && h(PlanoDialog, { ingredients: db, saldos: s, onClose: () => setDialogo(null), onComprar: inicial => setDialogo({ k: 'compra', inicial }) }),
    dialogo && dialogo.k === 'hist' && h(HistoricoDialog, { ing: dialogo.ing, onClose: () => setDialogo(null) }));
}

// ====================== Painel do evento (aba Itens) ======================
function EventStockPanel({ items, eventId, eventName, ingredients }) {
  injectCss();
  const [estado, setEstado] = useState(null); // { saldos, evento }
  const [erro, setErro] = useState('');
  const [dialogo, setDialogo] = useState(null);
  const [aviso, setAviso] = useState('');
  const db = useMemo(() => (ingredients || []).filter(i => i && i.id), [ingredients]);
  const carregar = () => {
    if (!eventId) { setEstado({ saldos: {}, evento: null }); return; }
    Promise.all([req('/api/stock'), req('/api/stock/events/' + encodeURIComponent(eventId))])
      .then(([l, ev]) => { const m = {}; (l || []).forEach(s => { m[s.ingredientId] = s; }); setEstado({ saldos: m, evento: ev }); setErro(''); })
      .catch(e => setErro(mensagemErro(e)));
  };
  useEffect(() => { if (temPremium()) carregar(); }, [eventId]);
  if (!temPremium()) return null;
  // Previsto: quantidade a comprar da lista do evento (já com perda, rendimento e margem das proteínas)
  const previsto = (items || []).filter(it => it && it.active !== false && it.ingredientId && it.qtyToBuy > 0).map(it => {
    const ing = db.find(i => i.id === it.ingredientId) || it;
    return { ing, ingredientId: it.ingredientId, base: tipo(ing) === 'un' ? it.qtyToBuy : it.qtyToBuy * 1000 };
  });
  const s = (estado && estado.saldos) || {};
  const falta = previsto.filter(p => (s[p.ingredientId] ? s[p.ingredientId].quantity : 0) < p.base - 0.0005).length;
  const ev = estado && estado.evento;
  const fechar = texto => { setDialogo(null); if (texto) { setAviso(texto); setTimeout(() => setAviso(''), 4000); } carregar(); };
  const desfazer = async () => {
    if (!confirm('Desfazer a baixa deste evento? As quantidades voltam para o estoque.')) return;
    try { await req('/api/stock/events/' + encodeURIComponent(eventId) + '/undo', { method: 'POST', body: '{}' }); fechar('Baixa desfeita.'); } catch (e) { alert(mensagemErro(e)); }
  };
  return h('div', { className: 'stk card', style: { borderLeft: '4px solid #ea580c' } },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
      h('div', null,
        h('div', { style: { fontWeight: 800, fontSize: 16 } }, '📦 Estoque deste evento'),
        h('div', { className: 'muted' }, erro ? erro : !estado ? 'Carregando...' : !eventId ? 'Salve o evento para poder dar baixa no estoque.'
          : ev && ev.consumed ? '✅ Baixa feita em ' + new Date(ev.consumedAt).toLocaleDateString('pt-BR') + '. Registre a sobra e a perda quando voltar.'
          : previsto.length ? (falta ? `⚠️ ${falta} de ${previsto.length} itens sem saldo suficiente no estoque.` : `✅ O estoque cobre os ${previsto.length} itens.`) : 'A lista de compras do evento está vazia.')),
      estado && eventId && !erro && h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
        ev && ev.consumed
          ? [h('div', { key: 's', role: 'button', className: 'btn b-wh', onClick: () => setDialogo({ k: 'mov' }) }, 'Registrar sobra / perda'),
             h('div', { key: 'd', role: 'button', className: 'btn b-red', onClick: desfazer }, 'Desfazer baixa')]
          : previsto.length ? h('div', { role: 'button', className: 'btn b-or', onClick: () => setDialogo({ k: 'baixa' }) }, 'Dar baixa no estoque') : null)),
    aviso && h('div', { role: 'status', style: { marginTop: 8, color: '#166534', fontWeight: 600 } }, '✅ ' + aviso),
    dialogo && dialogo.k === 'baixa' && h(BaixaDialog, { previsto, saldos: s, eventId, eventName, onClose: fechar }),
    dialogo && dialogo.k === 'mov' && h(MovDialog, { ingredients: db, tipoInicial: 'sobra', evento: { id: eventId, name: eventName || 'Evento' }, onClose: fechar }));
}

function BaixaDialog({ previsto, saldos, eventId, eventName, onClose }) {
  const [usado, setUsado] = useState(() => previsto.map(p => { const f = unidades(p.ing)[0][1]; return String(Math.round(p.base / f * 1000) / 1000).replace('.', ','); }));
  const [msg, setMsg] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const confirmar = async () => {
    const itens = [];
    for (let i = 0; i < previsto.length; i++) {
      const v = parseNum(usado[i]); if (!(v >= 0)) return setMsg('Quantidade inválida em ' + previsto[i].ing.name);
      if (v > 0) itens.push({ ingredientId: previsto[i].ingredientId, quantity: v * unidades(previsto[i].ing)[0][1] });
    }
    if (!itens.length) return setMsg('Nada para dar baixa.');
    setSalvando(true); setMsg(null);
    try { await req('/api/stock/events/' + encodeURIComponent(eventId) + '/consume', { method: 'POST', body: JSON.stringify({ eventName: eventName || 'Evento', items: itens }) }); onClose('Baixa feita no estoque.'); }
    catch (e) { setMsg(mensagemErro(e)); } finally { setSalvando(false); }
  };
  return h(Modal, { titulo: 'Dar baixa no estoque', sub: 'Confira o que saiu para o evento. O previsto é a lista de compras (com perda, rendimento e margem das proteínas). Ajuste o que for diferente.', onClose: () => onClose() },
    h('div', { style: { overflowX: 'auto' } }, h('table', { style: { marginTop: 10 } },
      h('thead', null, h('tr', null, h('th', null, 'Ingrediente'), h('th', null, 'Previsto'), h('th', null, 'Em estoque'), h('th', null, 'Saiu'))),
      h('tbody', null, previsto.map((p, i) => {
        const st = saldos[p.ingredientId]; const q = st ? st.quantity : 0; const u = unidades(p.ing)[0][0];
        return h('tr', { key: p.ingredientId + i },
          h('td', null, p.ing.name), h('td', null, fmtQtd(p.base, p.ing)),
          h('td', { style: { color: q < p.base ? '#b91c1c' : '#166534', fontWeight: 600 } }, fmtQtd(q, p.ing)),
          h('td', null, h('input', { value: usado[i], inputMode: 'decimal', 'aria-label': 'Saiu ' + p.ing.name, style: { width: 80, padding: '5px 7px', fontSize: 14 }, onChange: e => setUsado(us => us.map((x, j) => j === i ? e.target.value : x)) }), h('span', { className: 'muted', style: { marginLeft: 4 } }, u)));
      })))),
    h('div', { className: 'muted', style: { marginTop: 10 } }, 'Sem saldo suficiente? A baixa é feita assim mesmo e o saldo fica negativo, com aviso.'),
    msg && h('div', { style: { color: '#b91c1c', marginTop: 10, fontWeight: 600 } }, msg),
    h('div', { style: { display: 'flex', gap: 8, marginTop: 16 } },
      h('div', { role: 'button', className: 'btn b-wh', style: { flex: 1 }, onClick: () => onClose() }, 'Cancelar'),
      h('div', { role: 'button', className: 'btn b-or', style: { flex: 2, opacity: salvando ? .6 : 1 }, onClick: salvando ? undefined : confirmar }, salvando ? 'Salvando...' : 'Confirmar baixa')));
}

window.StockPage = StockPage;
window.EventStockPanel = EventStockPanel;
window.StockUtils = { tipo, fmtQtd, unidades, precoCadastro, necessidadeDaProposta };
})();
