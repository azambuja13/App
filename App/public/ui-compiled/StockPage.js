(function () {
'use strict';
/**
 * Estoque de insumos (plano PREMIUM).
 * Fase 1 (out/2026): saldos, mínimo, compra, perda/sobra, baixa do evento (só quando confirma), compra sugerida.
 * Fase 2 (out/2026):
 *   - validade: a compra/sobra pode ter validade (vira lote); a saída tira primeiro o que vence antes;
 *     aviso do que vence em até 7 dias e do que venceu (com "lançar como perda");
 *   - apoio: itens de apoio marcados "Controlar no estoque" (aba Apoio) entram no saldo, na compra
 *     sugerida e na baixa do evento (chave = nome normalizado, igual à API);
 *   - inventário guiado: lista para contar e lançar os ajustes de uma vez;
 *   - sem internet: compra, baixa, sobra, perda e inventário ficam numa fila no aparelho (com clientId)
 *     e são enviados sozinhos quando a conexão volta, sem lançar duas vezes.
 * window.StockPage({ ingredients, support, base })   aba Estoque
 * window.EventStockPanel({ items, eventId, eventName, ingredients, support, base })   topo da aba Itens
 * API: /api/stock (ingredientes em g, ml ou un; apoio na unidade do item).
 */
const h = React.createElement;
const { useState, useEffect, useMemo, useRef } = React;
/** Aviso que some sozinho (um novo aviso cancela o tempo do anterior) */
function useAviso() {
  const [aviso, setA] = useState('');
  const t = useRef(null);
  const mostrar = texto => { if (t.current) clearTimeout(t.current); setA(texto || ''); if (texto) t.current = setTimeout(() => setA(''), 6000); };
  useEffect(() => () => { if (t.current) clearTimeout(t.current); }, []);
  return [aviso, mostrar];
}

const CSS = `
.stk{font-family:system-ui,-apple-system,sans-serif;color:#111827}
.stk .card{background:#fff;border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.08);padding:16px}
.stk .muted{color:#6b7280;font-size:13px}
.stk .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:10px;padding:9px 14px;font-weight:700;font-size:14px;cursor:pointer;user-select:none;border:1px solid transparent}
.stk .b-or{background:#ea580c;color:#fff}.stk .b-gr{background:#16a34a;color:#fff}.stk .b-wh{background:#fff;color:#374151;border-color:#d1d5db}.stk .b-red{background:#fff;color:#b91c1c;border-color:#fecaca}
.stk .b-sm{padding:5px 10px;font-size:13px;border-radius:8px}
.stk input,.stk select{border:1px solid #d1d5db;border-radius:9px;padding:8px 10px;font-size:15px;background:#fff;color:#111827;box-sizing:border-box;min-width:0}
.stk table{width:100%;border-collapse:collapse;font-size:14px}
.stk th{text-align:left;font-size:12px;color:#6b7280;font-weight:600;padding:8px 6px;border-bottom:1px solid #e5e7eb}
.stk td{padding:8px 6px;border-bottom:1px solid #f3f4f6;vertical-align:middle}
.stk .tag{display:inline-block;font-size:11px;font-weight:700;border-radius:999px;padding:2px 8px;white-space:nowrap}
.stk .t-low{background:#fef3c7;color:#92400e}.stk .t-neg{background:#fee2e2;color:#991b1b}.stk .t-ok{background:#dcfce7;color:#166534}.stk .t-sup{background:#ecfdf5;color:#047857}
.stk .t-exp{background:#ffedd5;color:#9a3412}.stk .t-venc{background:#fee2e2;color:#991b1b}
.stk .aviso{border-radius:10px;padding:10px 12px;font-size:14px;margin-top:10px}
.stk .a-azul{background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a}.stk .a-ama{background:#fffbeb;border:1px solid #fde68a;color:#92400e}.stk .a-ver{background:#fef2f2;border:1px solid #fecaca;color:#991b1b}
.stk-bg{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:80;display:flex;align-items:flex-end;justify-content:center}
@media (min-width:768px){.stk-bg{align-items:center;padding:16px}}
.stk-modal{background:#fff;width:100%;max-width:760px;max-height:92vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom))}
@media (min-width:768px){.stk-modal{border-radius:16px}}
.stk-modal h3{font-size:18px;font-weight:800;margin:0 0 4px}
.stk .line{display:grid;gap:6px;align-items:center;margin-top:8px}
.stk .x{cursor:pointer;color:#9ca3af;font-size:20px;text-align:center}
@media (max-width:560px){.stk .line{grid-template-columns:1fr 1fr!important;padding-bottom:10px;border-bottom:1px dashed #e5e7eb}.stk .line .full{grid-column:1 / -1}.stk .line.hdr{display:none}
.stk table{font-size:13px!important}.stk th,.stk td{padding:7px 4px!important;min-width:0!important;font-size:13px}.stk td:first-child{white-space:normal}.stk td input{width:62px!important}}
`;
function injectCss() { if (document.getElementById('stk-css')) return; const st = document.createElement('style'); st.id = 'stk-css'; st.textContent = CSS; document.head.appendChild(st); }

// ====================== API e fila sem internet ======================
const api = () => { const a = window.PrecificacaoAPI && window.PrecificacaoAPI.api; return a && typeof a.request === 'function' ? a : null; };
const req = (url, opt) => { const a = api(); if (!a) return Promise.reject(Object.assign(new Error('Sem conexão com o servidor'), { offline: true })); return a.request(url, opt).then(r => (r && r.data !== undefined ? r.data : r)); };
const brl = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const n2 = (v, d = 2) => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: d });
const parseNum = v => { const t = String(v == null ? '' : v).trim().replace(/\./g, (m, i, s) => (/,/.test(s) ? '' : m)).replace(',', '.'); const n = parseFloat(t); return isFinite(n) ? n : NaN; };
const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const LS_FILA = 'stk_fila_v1', LS_FALHAS = 'stk_falhas_v1', LS_SALDOS = 'stk_saldos_v1';
const uuid = () => { try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {} return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); };
const semInternet = e => !!(e && (e.offline || e.__network || e.__timeout || (!e.statusCode && typeof navigator !== 'undefined' && navigator.onLine === false)));
const fila = () => lsGet(LS_FILA, []);
const avisarFila = () => { try { window.dispatchEvent(new CustomEvent('stk-fila')); } catch (e) {} };

/** POST com clientId. Sem internet: guarda na fila e devolve { queued: true }. */
async function enviar(url, body, rotulo) {
  const b = { ...body, clientId: body.clientId || uuid() };
  try { return await req(url, { method: 'POST', body: JSON.stringify(b) }); }
  catch (e) {
    if (!semInternet(e)) throw e;
    lsSet(LS_FILA, fila().concat([{ id: b.clientId, url, body: b, rotulo: rotulo || 'Lançamento', at: Date.now() }]));
    avisarFila();
    return { queued: true };
  }
}
let sincronizando = false;
/** Envia a fila na ordem. Erro do servidor (ex.: baixa repetida): tira da fila e mostra o aviso. */
async function sincronizar() {
  if (sincronizando || !fila().length || !api()) return;
  sincronizando = true;
  try {
    for (const it of fila()) {
      try { await req(it.url, { method: 'POST', body: JSON.stringify(it.body) }); }
      catch (e) {
        if (semInternet(e)) break;
        lsSet(LS_FALHAS, lsGet(LS_FALHAS, []).concat([{ rotulo: it.rotulo, msg: mensagemErro(e), at: Date.now() }]).slice(-20));
      }
      lsSet(LS_FILA, fila().filter(x => x.id !== it.id));
    }
  } finally { sincronizando = false; avisarFila(); }
}
if (!window.__stkSync) {
  window.__stkSync = true;
  window.addEventListener('online', () => sincronizar());
  setInterval(() => { if (fila().length) sincronizar(); }, 60000);
  setTimeout(() => sincronizar(), 8000);
}
function useFila() {
  const [st, setSt] = useState(() => ({ fila: fila(), falhas: lsGet(LS_FALHAS, []) }));
  useEffect(() => { const f = () => setSt({ fila: fila(), falhas: lsGet(LS_FALHAS, []) }); window.addEventListener('stk-fila', f); return () => window.removeEventListener('stk-fila', f); }, []);
  return st;
}

// ====================== Itens: ingredientes e apoio ======================
/** Chave do apoio: igual à da API (nome sem acento, minúsculo, espaços simples) */
const supportKey = nome => String(nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 120);
const chaveSaldo = s => (s.ingredientId ? 'i:' + s.ingredientId : 's:' + s.supportKey);
const chaveItem = i => (i.ingredientId ? 'i:' + i.ingredientId : 's:' + supportKey(i.supportKey || i.supportName));
const numx = (v, d = 0) => { const n = parseNum(v); return isFinite(n) ? n : d; };
const temPack = it => numx(it && it.packSize) > 1;

// Tipo de unidade do ingrediente: 'un' (por unidade), 'L' (volume, base ml) ou 'kg' (peso, base g)
function tipoIng(ing) {
  const t = String((ing && ing.unitType) || '').toLowerCase(), u = String((ing && ing.unit) || '').toLowerCase();
  if (t === 'unit' || u === 'un' || u === 'unidade') return 'un';
  if (t === 'volume' || u === 'l' || u === 'ml' || u === 'litro' || u === 'litros') return 'L';
  return 'kg';
}
/** Lista do que pode ter estoque: ingredientes + apoio marcado (+ apoio que já tem saldo) */
function montarCatalogo(ingredients, support, lista) {
  const out = [], vistos = new Set();
  (ingredients || []).forEach(ing => { if (ing && ing.id && ing.isActive !== false) out.push({ k: 'i:' + ing.id, kind: 'ing', id: ing.id, name: ing.name || '', category: ing.category || '', ing }); });
  (support || []).forEach(it => {
    if (!it || !it.stockControlled || !String(it.name || '').trim()) return;
    const key = supportKey(it.name); if (vistos.has(key)) return; vistos.add(key);
    out.push({ k: 's:' + key, kind: 'sup', key, name: String(it.name).trim(), category: 'Apoio', unit: it.unit || 'un', packSize: numx(it.packSize), packLabel: it.packLabel || 'pacote', cost: numx(it.cost), item: it });
  });
  (lista || []).forEach(s => {
    if (!s || !s.supportKey || vistos.has(s.supportKey)) return; vistos.add(s.supportKey);
    out.push({ k: 's:' + s.supportKey, kind: 'sup', key: s.supportKey, name: s.supportName || s.supportKey, category: 'Apoio', unit: s.unit || 'un', packSize: 0, packLabel: 'pacote', cost: 0, fora: true });
  });
  return out;
}
const tipo = e => (e && e.kind === 'sup' ? 'sup' : tipoIng(e && (e.ing || e)));
function fmtQtd(base, e) {
  const v = Number(base) || 0;
  if (e && e.kind === 'sup') return n2(v, 2) + ' ' + (e.unit || 'un');
  const tp = tipo(e);
  if (tp === 'un') return n2(v, 1) + ' un';
  const grande = tp === 'L' ? 'L' : 'kg', pequeno = tp === 'L' ? 'ml' : 'g';
  return Math.abs(v) >= 1000 ? n2(v / 1000, 2) + ' ' + grande : n2(v, 0) + ' ' + pequeno;
}
// Unidades que dá para digitar e o fator para a base (g/ml/un ou a unidade do apoio)
function unidades(e) {
  if (e && e.kind === 'sup') return [[e.unit || 'un', 1]].concat(e.packSize > 1 ? [[`${e.packLabel || 'pacote'} (${n2(e.packSize, 0)} ${e.unit || 'un'})`, e.packSize]] : []);
  const ing = e && (e.ing || e), tp = tipoIng(ing);
  if (tp === 'un') { const emb = Number(ing && ing.unitSize) || 0; return [['un', 1]].concat(emb > 1 ? [[`emb. (${n2(emb, 0)} un)`, emb]] : []); }
  return tp === 'L' ? [['L', 1000], ['ml', 1]] : [['kg', 1000], ['g', 1]];
}
// Preço do cadastro por "unidade de preço": kg/L, embalagem ou unidade do apoio
function precoCadastro(e) {
  if (e && e.kind === 'sup') return e.packSize > 1 ? { valor: e.cost, rotulo: e.packLabel || 'pacote', base: e.packSize } : { valor: e.cost, rotulo: e.unit || 'un', base: 1 };
  const ing = e && (e.ing || e);
  const c = Number(ing && ing.costPerUnit) || 0, u = Number(ing && ing.unitSize) || 0;
  if (tipoIng(ing) === 'un') return { valor: c, rotulo: u > 1 ? `emb. de ${n2(u, 0)}` : 'un', base: u > 0 ? u : 1 };
  return { valor: u > 0 ? c / u * 1000 : c * 1000, rotulo: tipoIng(ing) === 'L' ? 'L' : 'kg', base: 1000 };
}
const refBody = e => (e.kind === 'sup' ? { supportKey: e.key, supportName: e.name, unit: e.unit } : { ingredientId: e.id });
const nomeLista = e => (e.kind === 'sup' ? e.name + ' (apoio)' : e.name);
/** Quanto do apoio o evento usa (na unidade do item): regra automática ou a quantidade digitada */
function apoioNecessario(it, base) {
  const R = window.SupportRules;
  if (R && R.isAuto(it) && !it.qtyOverride) { const n = R.neededUnits(it, base); return n == null ? 0 : n; }
  return numx(it.quantity) * (temPack(it) ? numx(it.packSize) : 1);
}

const temPremium = () => !!(window.ConfigHelper && window.ConfigHelper.hasFeatureAccess && window.ConfigHelper.hasFeatureAccess('stock'));
function mensagemErro(e) {
  const m = String((e && e.message) || e || '');
  if (e && e.statusCode === 402) return 'O estoque é do plano PREMIUM.';
  if (/stock_|does not exist|relation|P20/.test(m) || (e && e.statusCode === 500)) return 'O estoque ainda não está ativado no servidor (as tabelas não foram criadas). Avise o suporte.';
  return m || 'Não foi possível falar com o servidor.';
}

// ====================== Saldos (com o que está na fila) ======================
function mapaDe(lista) { const m = {}; (lista || []).forEach(s => { m[chaveSaldo(s)] = { ...s, lots: s.lots || [] }; }); return m; }
/** Aplica à vista os lançamentos que ainda estão na fila (sem internet) */
function aplicarFila(mapa, itensFila) {
  if (!itensFila || !itensFila.length) return mapa;
  const m = {}; Object.keys(mapa).forEach(k => { m[k] = { ...mapa[k] }; });
  itensFila.forEach(f => {
    const b = f.body || {};
    const tp = /\/consume$/.test(f.url) ? 'saida' : /\/movements$/.test(f.url) ? b.type : null;
    if (!tp) return;
    (b.items || []).forEach(i => {
      const k = chaveItem(i), q = Number(i.quantity) || 0;
      const s = m[k] || (m[k] = { ingredientId: i.ingredientId || null, supportKey: i.ingredientId ? null : supportKey(i.supportKey || i.supportName), supportName: i.supportName, unit: i.unit, quantity: 0, minQuantity: 0, avgCost: 0, lots: [] });
      s.quantity = tp === 'ajuste' ? q : s.quantity + (tp === 'entrada' || tp === 'sobra' ? q : -q);
      s.pendente = true;
    });
  });
  return m;
}

// ====================== Validade ======================
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const diasAte = iso => Math.round((Date.parse(iso + 'T12:00:00') - Date.parse(hojeISO() + 'T12:00:00')) / 864e5);
const fmtData = iso => (iso ? iso.split('-').reverse().join('/') : '');
const DIAS_AVISO = 7;
function vencimentos(saldos, catalogo) {
  const porK = new Map(catalogo.map(e => [e.k, e]));
  const out = [];
  Object.entries(saldos).forEach(([k, s]) => (s.lots || []).forEach(l => {
    if (!(l.quantity > 0) || !l.expiresAt) return;
    const d = diasAte(l.expiresAt); if (d > DIAS_AVISO) return;
    const e = porK.get(k); if (e) out.push({ e, lot: l, dias: d });
  }));
  return out.sort((a, b) => a.dias - b.dias || a.e.name.localeCompare(b.e.name, 'pt-BR'));
}
const textoVence = d => (d < 0 ? `venceu há ${-d} dia${d === -1 ? '' : 's'}` : d === 0 ? 'vence hoje' : d === 1 ? 'vence amanhã' : `vence em ${d} dias`);

function Modal({ titulo, sub, onClose, children }) {
  useEffect(() => { const k = e => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  return h('div', { className: 'stk-bg stk', onClick: e => { if (e.target === e.currentTarget) onClose(); } },
    h('div', { className: 'stk-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 } },
        h('div', null, h('h3', null, titulo), sub ? h('div', { className: 'muted' }, sub) : null),
        h('div', { role: 'button', 'aria-label': 'Fechar', className: 'x', style: { fontSize: 28 }, onClick: onClose }, '×')),
      children));
}

// ====================== Linhas de lançamento ======================
const linhaVazia = () => ({ nome: '', k: '', qtd: '', fator: 1, valor: '', validade: '' });
function Linhas({ catalogo, linhas, setLinhas, comPreco, comValidade, rotuloQtd }) {
  const porNome = useMemo(() => { const m = new Map(); catalogo.forEach(e => { m.set(nomeLista(e).toLowerCase().trim(), e); if (!m.has(e.name.toLowerCase().trim())) m.set(e.name.toLowerCase().trim(), e); }); return m; }, [catalogo]);
  const porK = useMemo(() => new Map(catalogo.map(e => [e.k, e])), [catalogo]);
  const nomes = useMemo(() => catalogo.map(nomeLista).filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR')), [catalogo]);
  const colunas = 'minmax(0,2.2fr) 84px 128px' + (comPreco ? ' minmax(0,1fr)' : '') + (comValidade ? ' 142px' : '') + ' 28px';
  const set = (k, campo, v) => setLinhas(ls => ls.map((l, i) => {
    if (i !== k) return l;
    const n = { ...l, [campo]: v };
    if (campo === 'nome') { const e = porNome.get(String(v).toLowerCase().trim()); n.k = e ? e.k : ''; n.fator = e ? unidades(e)[0][1] : 1; }
    return n;
  }));
  return h('div', null,
    h('datalist', { id: 'stk-ings' }, nomes.map(n => h('option', { key: n, value: n }))),
    h('div', { className: 'line hdr muted', style: { marginTop: 4, gridTemplateColumns: colunas } }, h('span', null, 'Ingrediente ou apoio'), h('span', null, rotuloQtd || 'Quantidade'), h('span', null, 'Unidade'),
      comPreco ? h('span', null, 'Valor pago (R$)') : null, comValidade ? h('span', null, 'Validade (opcional)') : null, h('span')),
    linhas.map((l, k) => {
      const e = porK.get(l.k);
      return h('div', { className: 'line', key: k, style: { gridTemplateColumns: colunas } },
        h('input', { className: 'full', list: 'stk-ings', value: l.nome, placeholder: 'Comece a digitar...', 'aria-label': 'Ingrediente', onChange: ev => set(k, 'nome', ev.target.value), style: { borderColor: l.nome && !l.k ? '#f87171' : undefined } }),
        h('input', { inputMode: 'decimal', value: l.qtd, placeholder: rotuloQtd || 'Quantidade', 'aria-label': rotuloQtd || 'Quantidade', onChange: ev => set(k, 'qtd', ev.target.value) }),
        h('select', { value: l.fator, 'aria-label': 'Unidade', onChange: ev => set(k, 'fator', Number(ev.target.value)), disabled: !e }, (e ? unidades(e) : [['—', 1]]).map(([r, f]) => h('option', { key: r, value: f }, r))),
        comPreco ? h('input', { inputMode: 'decimal', value: l.valor, placeholder: 'Valor pago (R$)', 'aria-label': 'Valor pago', onChange: ev => set(k, 'valor', ev.target.value) }) : null,
        comValidade ? h('input', { type: 'date', value: l.validade || '', 'aria-label': 'Validade', title: 'Validade (opcional)', onChange: ev => set(k, 'validade', ev.target.value) }) : null,
        h('div', { className: 'x', role: 'button', 'aria-label': 'Remover linha', onClick: () => setLinhas(ls => ls.length > 1 ? ls.filter((_, i) => i !== k) : [linhaVazia()]) }, '×'));
    }),
    h('div', { role: 'button', className: 'btn b-wh', style: { marginTop: 10 }, onClick: () => setLinhas(ls => ls.concat([linhaVazia()])) }, '+ Linha'));
}
function linhasValidas(linhas, catalogo) {
  const porK = new Map(catalogo.map(e => [e.k, e]));
  const ok = [], erros = [];
  linhas.forEach((l, i) => {
    if (!l.nome && !l.qtd) return;
    const e = porK.get(l.k);
    if (!e) { erros.push(`Linha ${i + 1}: escolha um item da lista`); return; }
    const q = parseNum(l.qtd);
    if (!(q >= 0) || !isFinite(q)) { erros.push(`Linha ${i + 1}: quantidade inválida`); return; }
    ok.push({ ...l, e, base: q * (Number(l.fator) || 1), valorNum: l.valor === '' ? null : parseNum(l.valor) });
  });
  return { ok, erros };
}
const MSG_FILA = 'Sem internet: o lançamento ficou guardado neste aparelho e será enviado sozinho quando a conexão voltar.';

// ====================== Registrar compra ======================
function CompraDialog({ catalogo, inicial, onClose, onSaved }) {
  const [linhas, setLinhas] = useState(inicial && inicial.length ? inicial : [linhaVazia(), linhaVazia(), linhaVazia()]);
  const [obs, setObs] = useState('');
  const [msg, setMsg] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [precos, setPrecos] = useState(null); // etapa 2: atualizar preço do cadastro (ingredientes)
  const salvar = async () => {
    const { ok, erros } = linhasValidas(linhas, catalogo);
    const validos = ok.filter(l => l.base > 0);
    if (erros.length) return setMsg(erros.join(' · '));
    if (!validos.length) return setMsg('Preencha ao menos um item com a quantidade.');
    if (validos.some(l => l.valorNum != null && !(l.valorNum >= 0))) return setMsg('Valor pago inválido.');
    setSalvando(true); setMsg(null);
    try {
      const r = await enviar('/api/stock/movements', { type: 'entrada', note: obs || null,
        items: validos.map(l => ({ ...refBody(l.e), quantity: l.base, unitCost: l.valorNum != null && l.valorNum > 0 ? l.valorNum / l.base : null, expiresAt: l.validade || null })) }, `Compra (${validos.length} ${validos.length === 1 ? 'item' : 'itens'})`);
      onSaved && onSaved();
      if (r && r.queued) return onClose(MSG_FILA);
      // Pergunta se atualiza o preço do cadastro dos ingredientes (sugere o último pago)
      const mudou = validos.filter(l => l.valorNum > 0 && l.e.kind === 'ing').map(l => {
        const atual = precoCadastro(l.e);
        const novo = l.valorNum / l.base * atual.base;
        return { e: l.e, atual: atual.valor, novo: Math.round(novo * 100) / 100, rotulo: atual.rotulo, marcado: true };
      }).filter(x => Math.abs(x.novo - x.atual) > Math.max(0.01, x.atual * 0.005));
      if (mudou.length) setPrecos(mudou); else onClose('Compra registrada.');
    } catch (e) { setMsg(mensagemErro(e)); }
    finally { setSalvando(false); }
  };
  const aplicarPrecos = async () => {
    const im = window.PrecificacaoAPI && window.PrecificacaoAPI.ingredientManager;
    setSalvando(true); setMsg(null);
    const falhas = [];
    let lista = (window.eventState && window.eventState.ingredientsDatabase) || catalogo.filter(e => e.kind === 'ing').map(e => e.ing);
    for (const p of precos.filter(x => x.marcado)) {
      const ing = p.e.ing, tp = tipoIng(ing);
      const novoIng = tp === 'un' ? { ...ing, costPerUnit: p.novo } : { ...ing, costPerUnit: p.novo, unitSize: 1000, unitCost: Math.round(p.novo / 1000 * 10000) / 10000 };
      try {
        if (!im || !im.updateIngredient) throw new Error('sem conexão');
        const r = await im.updateIngredient(ing.id, novoIng);
        if (r && r.success === false) throw new Error(r.message || 'falhou');
        lista = lista.map(i => i.id === ing.id ? { ...i, ...novoIng } : i);
      } catch (e) { falhas.push(ing.name); }
    }
    try { if (window.eventState && window.eventState.setIngredientsDatabase) window.eventState.setIngredientsDatabase(lista); } catch (e) {}
    setSalvando(false);
    onClose(falhas.length ? 'Compra registrada. Não consegui atualizar o preço de: ' + falhas.join(', ') : 'Compra registrada e preços atualizados.');
  };
  if (precos) {
    return h(Modal, { titulo: 'Atualizar o preço do cadastro?', sub: 'O preço do cadastro é o que entra nas propostas. Sugestão: o último preço pago.', onClose: () => onClose('Compra registrada (preços do cadastro mantidos).') },
      h('table', { style: { marginTop: 10 } },
        h('thead', null, h('tr', null, h('th', null, ''), h('th', null, 'Ingrediente'), h('th', null, 'No cadastro'), h('th', null, 'Último pago'))),
        h('tbody', null, precos.map((p, i) => h('tr', { key: p.e.k },
          h('td', null, h('input', { type: 'checkbox', checked: p.marcado, 'aria-label': 'Atualizar ' + p.e.name, onChange: ev => setPrecos(ps => ps.map((x, j) => j === i ? { ...x, marcado: ev.target.checked } : x)) })),
          h('td', null, p.e.name), h('td', null, brl(p.atual) + '/' + p.rotulo), h('td', { style: { fontWeight: 700 } }, brl(p.novo) + '/' + p.rotulo))))),
      msg && h('div', { style: { color: '#b91c1c', marginTop: 10, fontWeight: 600 } }, msg),
      h('div', { style: { display: 'flex', gap: 8, marginTop: 16 } },
        h('div', { role: 'button', className: 'btn b-wh', style: { flex: 1 }, onClick: () => onClose('Compra registrada (preços do cadastro mantidos).') }, 'Manter os preços'),
        h('div', { role: 'button', className: 'btn b-or', style: { flex: 2, opacity: salvando ? .6 : 1 }, onClick: salvando ? undefined : aplicarPrecos }, salvando ? 'Atualizando...' : 'Atualizar os marcados')));
  }
  return h(Modal, { titulo: '🛒 Registrar compra', sub: 'O que chegou: quantidade, o valor total pago (opcional) e a validade (opcional, para avisar antes de vencer).', onClose: () => onClose() },
    h(Linhas, { catalogo, linhas, setLinhas, comPreco: true, comValidade: true }),
    h('input', { value: obs, onChange: e => setObs(e.target.value), placeholder: 'Observação (fornecedor, nota...)', 'aria-label': 'Observação', style: { width: '100%', marginTop: 12 } }),
    msg && h('div', { style: { color: '#b91c1c', marginTop: 10, fontWeight: 600 } }, msg),
    h('div', { style: { display: 'flex', gap: 8, marginTop: 16 } },
      h('div', { role: 'button', className: 'btn b-wh', style: { flex: 1 }, onClick: () => onClose() }, 'Cancelar'),
      h('div', { role: 'button', className: 'btn b-gr', style: { flex: 2, opacity: salvando ? .6 : 1 }, onClick: salvando ? undefined : salvar }, salvando ? 'Salvando...' : 'Registrar compra')));
}

// ====================== Perda / sobra ======================
const TIPOS_MOV = { perda: ['Perda', 'Venceu, estragou, caiu: sai do estoque (primeiro do que vence antes).', 'Quantidade perdida'], sobra: ['Sobra', 'O que voltou de um evento: entra de novo no estoque.', 'Quantidade que voltou'] };
function MovDialog({ catalogo, tipoInicial, evento, onClose, onSaved }) {
  const [tp, setTp] = useState(TIPOS_MOV[tipoInicial] ? tipoInicial : 'perda');
  const [linhas, setLinhas] = useState([linhaVazia(), linhaVazia()]);
  const [obs, setObs] = useState('');
  const [msg, setMsg] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const salvar = async () => {
    const { ok, erros } = linhasValidas(linhas, catalogo);
    const validos = ok.filter(l => l.base > 0);
    if (erros.length) return setMsg(erros.join(' · '));
    if (!validos.length) return setMsg('Preencha ao menos um item com a quantidade.');
    setSalvando(true); setMsg(null);
    try {
      const r = await enviar('/api/stock/movements', { type: tp, note: obs || null, eventId: evento ? evento.id : null, eventName: evento ? evento.name : null,
        items: validos.map(l => ({ ...refBody(l.e), quantity: l.base, expiresAt: tp === 'sobra' ? (l.validade || null) : null })) }, TIPOS_MOV[tp][0] + (evento ? ' · ' + evento.name : ''));
      onSaved && onSaved(); onClose(r && r.queued ? MSG_FILA : TIPOS_MOV[tp][0] + ' registrada.');
    } catch (e) { setMsg(mensagemErro(e)); } finally { setSalvando(false); }
  };
  return h(Modal, { titulo: (evento ? 'Depois do evento: ' : '') + TIPOS_MOV[tp][0], sub: TIPOS_MOV[tp][1] + (evento ? ' Evento: ' + evento.name : ''), onClose: () => onClose() },
    h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 } },
      Object.keys(TIPOS_MOV).map(k => h('div', { key: k, role: 'button', className: 'btn ' + (k === tp ? 'b-or' : 'b-wh'), onClick: () => setTp(k) }, TIPOS_MOV[k][0]))),
    h(Linhas, { catalogo, linhas, setLinhas, comPreco: false, comValidade: tp === 'sobra', rotuloQtd: TIPOS_MOV[tp][2] }),
    h('input', { value: obs, onChange: e => setObs(e.target.value), placeholder: 'Observação', 'aria-label': 'Observação', style: { width: '100%', marginTop: 12 } }),
    msg && h('div', { style: { color: '#b91c1c', marginTop: 10, fontWeight: 600 } }, msg),
    h('div', { style: { display: 'flex', gap: 8, marginTop: 16 } },
      h('div', { role: 'button', className: 'btn b-wh', style: { flex: 1 }, onClick: () => onClose() }, 'Cancelar'),
      h('div', { role: 'button', className: 'btn b-or', style: { flex: 2, opacity: salvando ? .6 : 1 }, onClick: salvando ? undefined : salvar }, salvando ? 'Salvando...' : 'Registrar')));
}

// ====================== Inventário guiado ======================
function InventarioDialog({ catalogo, saldos, onClose }) {
  const [filtro, setFiltro] = useState('estoque');
  const [busca, setBusca] = useState('');
  const [contado, setContado] = useState({});
  const [msg, setMsg] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const cats = useMemo(() => [...new Set(catalogo.map(e => e.category || 'Outros'))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [catalogo]);
  const lista = catalogo.filter(e => {
    if (busca && !e.name.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtro === 'estoque') return !!saldos[e.k];
    if (filtro === 'todos') return true;
    return (e.category || 'Outros') === filtro;
  }).sort((a, b) => String(a.category).localeCompare(String(b.category), 'pt-BR') || a.name.localeCompare(b.name, 'pt-BR'));
  const preenchidos = Object.entries(contado).filter(([, v]) => String(v).trim() !== '');
  const porK = new Map(catalogo.map(e => [e.k, e]));
  const diffs = preenchidos.map(([k, v]) => { const e = porK.get(k); const f = unidades(e)[0][1]; const base = parseNum(v) * f; const s = saldos[k] ? saldos[k].quantity : 0; return { e, base, dif: base - s }; });
  const invalido = diffs.some(d => !(d.base >= 0));
  const comDif = diffs.filter(d => Math.abs(d.dif) > 0.0005).length;
  const confirmar = async () => {
    if (!diffs.length) return setMsg('Digite o que contou em pelo menos um item.');
    if (invalido) return setMsg('Há quantidade inválida.');
    if (!confirm(`Registrar o inventário de ${diffs.length} ${diffs.length === 1 ? 'item' : 'itens'}? ${comDif} com diferença. O saldo passa a ser o que você contou.`)) return;
    setSalvando(true); setMsg(null);
    try {
      const r = await enviar('/api/stock/movements', { type: 'ajuste', note: 'Inventário', items: diffs.map(d => ({ ...refBody(d.e), quantity: d.base })) }, `Inventário (${diffs.length} ${diffs.length === 1 ? 'item' : 'itens'})`);
      onClose(r && r.queued ? MSG_FILA : `Inventário registrado: ${diffs.length} ${diffs.length === 1 ? 'item' : 'itens'}, ${comDif} com diferença.`);
    } catch (e) { setMsg(mensagemErro(e)); } finally { setSalvando(false); }
  };
  return h(Modal, { titulo: '📋 Inventário', sub: 'Conte o que tem e digite ao lado. Só os itens preenchidos mudam: o saldo passa a ser o contado.', onClose: () => onClose() },
    h('div', { style: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' } },
      h('select', { value: filtro, onChange: e => setFiltro(e.target.value), 'aria-label': 'O que contar' },
        h('option', { value: 'estoque' }, 'Itens com estoque'), h('option', { value: 'todos' }, 'Todos'), cats.map(c => h('option', { key: c, value: c }, c))),
      h('input', { value: busca, onChange: e => setBusca(e.target.value), placeholder: '🔍 Buscar', 'aria-label': 'Buscar', style: { flex: '1 1 160px' } })),
    !lista.length ? h('div', { className: 'muted', style: { marginTop: 14 } }, filtro === 'estoque' ? 'Nenhum item com estoque ainda. Escolha "Todos" para contar pela primeira vez.' : 'Nada encontrado.') :
    h('div', { style: { overflowX: 'auto', marginTop: 8 } }, h('table', null,
      h('thead', null, h('tr', null, h('th', null, 'Item'), h('th', null, 'No sistema'), h('th', null, 'Contei'), h('th', null, 'Diferença'))),
      h('tbody', null, lista.slice(0, 400).map(e => {
        const s = saldos[e.k], u = unidades(e)[0], v = contado[e.k] == null ? '' : contado[e.k];
        const base = v === '' ? null : parseNum(v) * u[1];
        const dif = base == null || !(base >= 0) ? null : base - (s ? s.quantity : 0);
        return h('tr', { key: e.k },
          h('td', null, h('div', { style: { fontWeight: 600 } }, e.name), h('div', { className: 'muted', style: { fontSize: 11 } }, e.category || '')),
          h('td', null, s ? fmtQtd(s.quantity, e) : '—'),
          h('td', null, h('input', { value: v, inputMode: 'decimal', placeholder: '—', 'aria-label': 'Contei ' + e.name, style: { width: 80, padding: '5px 7px', fontSize: 14 }, onChange: ev => setContado(c => ({ ...c, [e.k]: ev.target.value })) }), h('span', { className: 'muted', style: { marginLeft: 4 } }, u[0])),
          h('td', { style: { fontWeight: 700, color: dif == null ? undefined : dif < -0.0005 ? '#b91c1c' : dif > 0.0005 ? '#166534' : '#6b7280' } }, dif == null ? '' : Math.abs(dif) <= 0.0005 ? 'igual' : (dif > 0 ? '+' : '') + fmtQtd(dif, e)));
      })))),
    msg && h('div', { style: { color: '#b91c1c', marginTop: 10, fontWeight: 600 } }, msg),
    h('div', { className: 'muted', style: { marginTop: 10 } }, `${diffs.length} contado(s) · ${comDif} com diferença`),
    h('div', { style: { display: 'flex', gap: 8, marginTop: 12 } },
      h('div', { role: 'button', className: 'btn b-wh', style: { flex: 1 }, onClick: () => onClose() }, 'Cancelar'),
      h('div', { role: 'button', className: 'btn b-or', style: { flex: 2, opacity: salvando ? .6 : 1 }, onClick: salvando ? undefined : confirmar }, salvando ? 'Salvando...' : 'Registrar inventário')));
}

// ====================== Compra sugerida ======================
const estagio = p => p.stage || ({ draft: 'quoting', sent: 'sent', accepted: 'won', rejected: 'lost' })[p.status] || 'quoting';
const dataISO = v => { const s = String(v || ''); let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[0]; m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
/** Necessidade de uma proposta aprovada, pelo cardápio dela: Map(k → base), + apoio marcado */
async function necessidadeDaProposta(p, db, support, horas) {
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
  let meatKg = 0;
  calc.forEach(it => {
    if (!it.ingredientId || !(it.qtyToBuy > 0)) return;
    const ing = db.find(i => i.id === it.ingredientId);
    const un = tipoIng(ing || it) === 'un';
    out.set('i:' + it.ingredientId, (out.get('i:' + it.ingredientId) || 0) + (un ? it.qtyToBuy : it.qtyToBuy * 1000));
    if (!un && String(it.category || '') === 'Proteínas') meatKg += Number(it.qtyInKgL) || 0;
  });
  // Apoio controlado no estoque: pela regra de cada item, com os convidados e a carne desta proposta
  (support || []).forEach(it => {
    if (!it || !it.stockControlled || !String(it.name || '').trim()) return;
    const n = apoioNecessario(it, { guests: conv, meatKg: Math.round(meatKg * 100) / 100, hours: horas || 0 });
    if (n > 0) { const k = 's:' + supportKey(it.name); out.set(k, (out.get(k) || 0) + n); }
  });
  return out;
}
function PlanoDialog({ catalogo, saldos, support, base, onClose, onComprar }) {
  const [dias, setDias] = useState(15);
  const [res, setRes] = useState(null);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);
  const db = useMemo(() => catalogo.filter(e => e.kind === 'ing').map(e => e.ing), [catalogo]);
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
        const nec = await necessidadeDaProposta(p, db, support, base && base.hours);
        const nome = p.title || (p.proposalData && p.proposalData.proposalName) || 'Proposta';
        const dt = dataISO((p.proposalData && p.proposalData.eventDate) || p.eventDate);
        if (!nec) { semCardapio.push({ nome, dt }); continue; }
        usadas.push({ nome, dt }); nec.forEach((v, k) => total.set(k, (total.get(k) || 0) + v));
      }
      // Mínimo: entra também o que está abaixo do mínimo sem evento
      Object.entries(saldos).forEach(([k, s]) => { if ((s.minQuantity || 0) > 0 && !total.has(k)) total.set(k, 0); });
      const porK = new Map(catalogo.map(e => [e.k, e]));
      const linhas = [];
      total.forEach((precisa, k) => {
        const e = porK.get(k); if (!e) return;
        const s = saldos[k] || { quantity: 0, minQuantity: 0 };
        const comprar = Math.max(0, precisa - (s.quantity || 0) + (s.minQuantity || 0));
        if (comprar > 0.0005) linhas.push({ e, precisa, saldo: s.quantity || 0, minimo: s.minQuantity || 0, comprar });
      });
      linhas.sort((a, b) => String(a.e.category || '').localeCompare(String(b.e.category || ''), 'pt-BR') || a.e.name.localeCompare(b.e.name, 'pt-BR'));
      if (vivo) setRes({ linhas, usadas, semCardapio });
    })().catch(e => { if (vivo) setErro(mensagemErro(e)); });
    return () => { vivo = false; };
  }, [dias]);
  const textoLista = () => res ? ['Lista de compras (' + dias + ' dias)', ...res.linhas.map(l => `- ${l.e.name}: ${fmtQtd(l.comprar, l.e)}`)].join('\n') : '';
  const copiar = async () => { try { await navigator.clipboard.writeText(textoLista()); setCopiado(true); setTimeout(() => setCopiado(false), 1500); } catch (e) { alert('Não consegui copiar.'); } };
  const temApoio = (support || []).some(i => i && i.stockControlled);
  return h(Modal, { titulo: '🧾 Compra sugerida', sub: 'Eventos fechados (proposta aprovada) do período, menos o que já tem no estoque, mais o estoque mínimo.' + (temApoio ? ' O apoio controlado entra pela regra de cada item.' : ''), onClose },
    h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 } }, [7, 15, 30, 60].map(d => h('div', { key: d, role: 'button', className: 'btn ' + (d === dias ? 'b-or' : 'b-wh'), onClick: () => setDias(d) }, 'Próximos ' + d + ' dias'))),
    erro ? h('div', { style: { color: '#b91c1c', marginTop: 12 } }, erro) : !res ? h('div', { className: 'muted', style: { marginTop: 14 } }, 'Calculando...') :
    h('div', null,
      h('div', { className: 'muted', style: { marginTop: 12 } }, res.usadas.length ? 'Eventos: ' + res.usadas.map(u => u.nome + (u.dt ? ' (' + fmtData(u.dt) + ')' : '')).join(' · ') : 'Nenhum evento fechado com cardápio no período.'),
      res.semCardapio.length ? h('div', { className: 'aviso a-ama' }, '⚠️ Sem cardápio na proposta (não entram na conta): ' + res.semCardapio.map(u => u.nome).join(', ')) : null,
      res.linhas.length ? h('div', { style: { overflowX: 'auto' } }, h('table', { style: { marginTop: 12 } },
        h('thead', null, h('tr', null, h('th', null, 'Item'), h('th', null, 'Precisa'), h('th', null, 'Estoque'), h('th', null, 'Comprar'))),
        h('tbody', null, res.linhas.map(l => h('tr', { key: l.e.k },
          h('td', null, l.e.name, l.e.kind === 'sup' ? h('span', { className: 'tag t-sup', style: { marginLeft: 6 } }, 'apoio') : null),
          h('td', null, fmtQtd(l.precisa, l.e), l.minimo ? h('div', { className: 'muted', style: { fontSize: 11 } }, '+ mín. ' + fmtQtd(l.minimo, l.e)) : null),
          h('td', { style: { color: l.saldo < 0 ? '#b91c1c' : undefined } }, fmtQtd(l.saldo, l.e)),
          h('td', { style: { fontWeight: 800 } }, fmtQtd(l.comprar, l.e)))))))
        : h('div', { style: { marginTop: 14, fontWeight: 600, color: '#166534' } }, '✅ Nada a comprar: o estoque cobre o período.'),
      res.linhas.length ? h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 } },
        h('div', { role: 'button', className: 'btn b-wh', onClick: copiar }, copiado ? '✓ Copiado' : 'Copiar lista'),
        h('a', { className: 'btn b-wh', href: 'https://wa.me/?text=' + encodeURIComponent(textoLista()), target: '_blank', rel: 'noopener', style: { textDecoration: 'none' } }, 'Enviar pelo WhatsApp'),
        h('div', { role: 'button', className: 'btn b-gr', onClick: () => onComprar(res.linhas.map(l => { const f = unidades(l.e)[0][1]; return { nome: nomeLista(l.e), k: l.e.k, qtd: String(Math.round(l.comprar / f * 1000) / 1000).replace('.', ','), fator: f, valor: '', validade: '' }; })) }, 'Comprei: registrar a compra')) : null));
}

// ====================== Histórico de um item ======================
function HistoricoDialog({ e, onClose }) {
  const [movs, setMovs] = useState(null);
  const [erro, setErro] = useState('');
  useEffect(() => {
    const q = e.kind === 'sup' ? 'supportKey=' + encodeURIComponent(e.key) : 'ingredientId=' + encodeURIComponent(e.id);
    req('/api/stock/movements?' + q + '&limit=100').then(setMovs).catch(err => setErro(mensagemErro(err)));
  }, []);
  const NOME = { entrada: 'Compra', saida: 'Baixa do evento', sobra: 'Sobra', perda: 'Perda', ajuste: 'Inventário', estorno: 'Baixa desfeita' };
  const pc = precoCadastro(e);
  return h(Modal, { titulo: e.name, sub: 'Movimentos do estoque (mais recentes primeiro)', onClose },
    erro ? h('div', { style: { color: '#b91c1c' } }, erro) : !movs ? h('div', { className: 'muted' }, 'Carregando...') : !movs.length ? h('div', { className: 'muted', style: { marginTop: 10 } }, 'Nenhum movimento ainda.') :
    h('div', { style: { overflowX: 'auto' } }, h('table', { style: { marginTop: 10 } },
      h('thead', null, h('tr', null, h('th', null, 'Data'), h('th', null, 'Movimento'), h('th', null, 'Quantidade'), h('th', null, 'Saldo'), h('th', null, 'Preço'))),
      h('tbody', null, movs.map(m => h('tr', { key: m.id, style: { opacity: m.undone ? .5 : 1 } },
        h('td', null, new Date(m.createdAt).toLocaleDateString('pt-BR')),
        h('td', null, (NOME[m.type] || m.type) + (m.eventName ? ' · ' + m.eventName : '') + (m.undone ? ' (desfeita)' : '') + (m.expiresAt ? ' · validade ' + fmtData(m.expiresAt) : '') + (m.note ? ' — ' + m.note : '')),
        h('td', { style: { color: m.quantity < 0 ? '#b91c1c' : '#166534', fontWeight: 600 } }, (m.quantity > 0 ? '+' : '') + fmtQtd(m.quantity, e)),
        h('td', null, fmtQtd(m.balanceAfter, e)),
        h('td', null, m.unitCost != null && m.type === 'entrada' ? brl(m.unitCost * pc.base) + '/' + pc.rotulo : '')))))));
}

// ====================== Avisos: fila, falhas, sem internet ======================
function AvisosFila({ fila: f, falhas, offlineDesde }) {
  const [enviando, setEnviando] = useState(false);
  return h(React.Fragment, null,
    offlineDesde ? h('div', { className: 'aviso a-azul' }, `📴 Sem internet: mostrando os saldos de ${new Date(offlineDesde).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}.`) : null,
    f.length ? h('div', { className: 'aviso a-azul', 'data-testid': 'stk-fila', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
      h('span', null, `📶 ${f.length} lançamento${f.length === 1 ? '' : 's'} esperando internet (${f.map(x => x.rotulo).join(', ')}). Os saldos já ${f.length === 1 ? 'o' : 'os'} mostram; o envio é automático.`),
      h('div', { role: 'button', className: 'btn b-wh b-sm', onClick: async () => { setEnviando(true); await sincronizar(); setEnviando(false); } }, enviando ? 'Enviando...' : 'Enviar agora')) : null,
    falhas.length ? h('div', { className: 'aviso a-ver' },
      h('div', { style: { fontWeight: 700 } }, 'Não deu para enviar (o servidor recusou):'),
      falhas.map((x, i) => h('div', { key: i }, `• ${x.rotulo}: ${x.msg}`)),
      h('div', { role: 'button', className: 'btn b-wh b-sm', style: { marginTop: 6 }, onClick: () => { lsSet(LS_FALHAS, []); avisarFila(); } }, 'Entendi')) : null);
}
/** Carrega os saldos (guarda uma cópia para usar sem internet) */
function useSaldos(ativo) {
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');
  const [offlineDesde, setOfflineDesde] = useState(null);
  const carregar = () => req('/api/stock').then(l => { lsSet(LS_SALDOS, { at: Date.now(), list: l || [] }); setLista(l || []); setErro(''); setOfflineDesde(null); })
    .catch(e => {
      const c = lsGet(LS_SALDOS, null);
      if (semInternet(e) && c) { setLista(c.list || []); setOfflineDesde(c.at); setErro(''); }
      else setErro(mensagemErro(e));
    });
  useEffect(() => { if (ativo) { carregar(); sincronizar(); } }, [ativo]);
  return { lista, erro, offlineDesde, carregar };
}

// ====================== Aba Estoque ======================
function StockPage({ ingredients, support, base }) {
  injectCss();
  const premium = temPremium();
  const { lista, erro, offlineDesde, carregar } = useSaldos(premium);
  const { fila: f, falhas } = useFila();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('estoque'); // estoque | baixo | vencendo | apoio | todos
  const [dialogo, setDialogo] = useState(null);
  const [aviso, mostrarAviso] = useAviso();
  const [nFila, setNFila] = useState(f.length);
  useEffect(() => { if (nFila > 0 && f.length === 0) carregar(); setNFila(f.length); }, [f.length]);
  const catalogo = useMemo(() => montarCatalogo(ingredients, support, lista), [ingredients, support, lista]);
  const saldos = useMemo(() => aplicarFila(mapaDe(lista), f), [lista, f]);
  const fechar = texto => { setDialogo(null); if (texto) mostrarAviso(texto); carregar(); };
  const salvarMinimo = async (e, valor) => {
    const v = parseNum(valor); if (!(v >= 0)) return;
    const baseMin = v * unidades(e)[0][1];
    try {
      const s = e.kind === 'sup'
        ? await req('/api/stock/support/' + encodeURIComponent(e.key), { method: 'PUT', body: JSON.stringify({ minQuantity: baseMin, supportName: e.name, unit: e.unit }) })
        : await req('/api/stock/items/' + encodeURIComponent(e.id), { method: 'PUT', body: JSON.stringify({ minQuantity: baseMin }) });
      carregar(); return s;
    } catch (err) { alert(semInternet(err) ? 'Sem internet: o estoque mínimo só pode ser alterado com conexão.' : mensagemErro(err)); }
  };
  const perdaVencido = async v => {
    if (!confirm(`Lançar ${fmtQtd(v.lot.quantity, v.e)} de ${v.e.name} (validade ${fmtData(v.lot.expiresAt)}) como perda?`)) return;
    try { const r = await enviar('/api/stock/movements', { type: 'perda', note: 'Vencido (validade ' + fmtData(v.lot.expiresAt) + ')', items: [{ ...refBody(v.e), quantity: v.lot.quantity, lotId: v.lot.id }] }, 'Perda · ' + v.e.name); fechar(r && r.queued ? MSG_FILA : 'Perda registrada.'); }
    catch (err) { alert(mensagemErro(err)); }
  };
  if (!premium) return h('div', { className: 'stk card' }, h('h2', { style: { fontSize: 20, fontWeight: 800 } }, '📦 Estoque'), h('p', { className: 'muted' }, 'O controle de estoque de insumos é do plano PREMIUM.'));
  const s = saldos;
  const venc = vencimentos(s, catalogo);
  const vencidos = venc.filter(v => v.dias < 0), aVencer = venc.filter(v => v.dias >= 0);
  const vencPorK = new Map(); venc.forEach(v => { if (!vencPorK.has(v.e.k)) vencPorK.set(v.e.k, v); });
  const linhas = catalogo.map(e => ({ e, st: s[e.k] || null }))
    .filter(({ e, st }) => {
      if (busca && !String(e.name || '').toLowerCase().includes(busca.toLowerCase())) return false;
      if (busca || filtro === 'todos') return true;
      if (filtro === 'baixo') return st && (st.quantity < 0 || (st.minQuantity > 0 && st.quantity < st.minQuantity));
      if (filtro === 'vencendo') return vencPorK.has(e.k);
      if (filtro === 'apoio') return e.kind === 'sup';
      return !!st;
    })
    .sort((a, b) => String(a.e.category || '').localeCompare(String(b.e.category || ''), 'pt-BR') || String(a.e.name).localeCompare(String(b.e.name), 'pt-BR'));
  const baixos = Object.values(s).filter(x => x.quantity < 0 || (x.minQuantity > 0 && x.quantity < x.minQuantity)).length;
  const valorTotal = Object.values(s).reduce((t, x) => t + Math.max(0, x.quantity) * (x.avgCost || 0), 0);
  const temApoio = catalogo.some(e => e.kind === 'sup');
  return h('div', { className: 'stk' },
    h('div', { className: 'card' },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
        h('div', null, h('h2', { style: { fontSize: 22, fontWeight: 800, margin: 0 } }, '📦 Estoque de insumos'),
          h('div', { className: 'muted' }, lista ? `${Object.keys(s).length} item(ns) no estoque · valor estimado ${brl(valorTotal)}` + (baixos ? ` · ${baixos} abaixo do mínimo` : '') : 'Carregando...')),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
          h('div', { role: 'button', className: 'btn b-gr', onClick: () => setDialogo({ k: 'compra' }) }, '🛒 Registrar compra'),
          h('div', { role: 'button', className: 'btn b-wh', onClick: () => setDialogo({ k: 'mov', tipo: 'perda' }) }, 'Perda / sobra'),
          h('div', { role: 'button', className: 'btn b-wh', onClick: () => setDialogo({ k: 'inv' }) }, '📋 Inventário'),
          h('div', { role: 'button', className: 'btn b-or', onClick: () => setDialogo({ k: 'plano' }) }, '🧾 Compra sugerida'))),
      aviso && h('div', { role: 'status', style: { marginTop: 10, color: '#166534', fontWeight: 600 } }, '✅ ' + aviso),
      erro && h('div', { style: { marginTop: 10, color: '#b91c1c', fontWeight: 600 } }, '❌ ' + erro),
      h(AvisosFila, { fila: f, falhas, offlineDesde }),
      venc.length ? h('div', { className: 'aviso ' + (vencidos.length ? 'a-ver' : 'a-ama'), 'data-testid': 'stk-validade' },
        h('div', { style: { fontWeight: 700, marginBottom: 4 } }, '⏰ Validade' + (vencidos.length ? ` · ${vencidos.length} vencido(s)` : '') + (aVencer.length ? ` · ${aVencer.length} vence(m) em até ${DIAS_AVISO} dias` : '')),
        venc.slice(0, 12).map(v => h('div', { key: v.lot.id, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '3px 0', flexWrap: 'wrap' } },
          h('span', null, h('b', null, v.e.name), ` — ${fmtQtd(v.lot.quantity, v.e)} ${textoVence(v.dias)} (${fmtData(v.lot.expiresAt)})`),
          v.dias < 0 ? h('div', { role: 'button', className: 'btn b-red b-sm', onClick: () => perdaVencido(v) }, 'Lançar como perda') : null))) : null,
      !temApoio && h('div', { className: 'muted', style: { marginTop: 10 } }, '💡 Para controlar carvão, copos, gás e outros itens de apoio, marque "Controlar no estoque" no item, na aba Apoio.'),
      h('div', { style: { display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' } },
        h('input', { value: busca, onChange: e => setBusca(e.target.value), placeholder: '🔍 Buscar item', 'aria-label': 'Buscar item', style: { flex: '1 1 200px' } }),
        h('select', { value: filtro, onChange: e => setFiltro(e.target.value), 'aria-label': 'Filtro' },
          h('option', { value: 'estoque' }, 'Com estoque'), h('option', { value: 'baixo' }, 'Abaixo do mínimo'), h('option', { value: 'vencendo' }, 'Vencendo ou vencidos'),
          h('option', { value: 'apoio' }, 'Só apoio'), h('option', { value: 'todos' }, 'Todos os itens'))),
      lista && !linhas.length && h('div', { className: 'muted', style: { marginTop: 16 } }, filtro === 'estoque' && !busca ? 'Nenhum item no estoque ainda. Comece por "Registrar compra" ou pelo inventário.' : 'Nada encontrado.'),
      linhas.length > 0 && h('div', { style: { overflowX: 'auto', marginTop: 10 } }, h('table', null,
        h('thead', null, h('tr', null, h('th', null, 'Item'), h('th', null, 'Saldo'), h('th', null, 'Mínimo'), h('th', null, 'Custo médio'), h('th', null, ''))),
        h('tbody', null, linhas.slice(0, 400).map(({ e, st }) => {
          const q = st ? st.quantity : 0, min = st ? st.minQuantity : 0, u = unidades(e)[0];
          const minTxt = min ? String(Math.round(min / u[1] * 1000) / 1000).replace('.', ',') : '';
          const v = vencPorK.get(e.k);
          const status = q < 0 ? h('span', { className: 'tag t-neg' }, 'negativo') : (min > 0 && q < min) ? h('span', { className: 'tag t-low' }, 'abaixo do mínimo') : st ? h('span', { className: 'tag t-ok' }, 'ok') : null;
          const pc = precoCadastro(e);
          return h('tr', { key: e.k },
            h('td', null, h('div', { role: 'button', style: { fontWeight: 600, cursor: 'pointer', color: '#9a3412' }, onClick: () => setDialogo({ k: 'hist', e }) }, e.name),
              h('div', { className: 'muted', style: { fontSize: 11 } }, e.category || '', st && st.pendente ? ' · aguardando envio' : '')),
            h('td', { style: { fontWeight: 700, color: q < 0 ? '#b91c1c' : undefined } }, st ? fmtQtd(q, e) : '—'),
            h('td', null, h('input', { key: e.k + ':' + min, defaultValue: minTxt, placeholder: '0', inputMode: 'decimal', 'aria-label': 'Estoque mínimo de ' + e.name, style: { width: 70, padding: '5px 7px', fontSize: 14 }, onBlur: ev => { if (ev.target.value !== minTxt) salvarMinimo(e, ev.target.value || '0'); } }), h('span', { className: 'muted', style: { marginLeft: 4 } }, u[0])),
            h('td', null, st && st.avgCost > 0 ? brl(st.avgCost * pc.base) + '/' + pc.rotulo : '—'),
            h('td', null, h('div', { style: { display: 'flex', gap: 4, flexWrap: 'wrap' } }, status,
              v ? h('span', { className: 'tag ' + (v.dias < 0 ? 't-venc' : 't-exp'), title: 'Validade ' + fmtData(v.lot.expiresAt) }, v.dias < 0 ? 'vencido' : textoVence(v.dias)) : null,
              e.kind === 'sup' ? h('span', { className: 'tag t-sup' }, 'apoio') : null)));
        }))))),
    dialogo && dialogo.k === 'compra' && h(CompraDialog, { catalogo, inicial: dialogo.inicial, onClose: fechar, onSaved: carregar }),
    dialogo && dialogo.k === 'mov' && h(MovDialog, { catalogo, tipoInicial: dialogo.tipo, onClose: fechar, onSaved: carregar }),
    dialogo && dialogo.k === 'inv' && h(InventarioDialog, { catalogo, saldos: s, onClose: fechar }),
    dialogo && dialogo.k === 'plano' && lista && h(PlanoDialog, { catalogo, saldos: s, support, base, onClose: () => setDialogo(null), onComprar: inicial => setDialogo({ k: 'compra', inicial }) }),
    dialogo && dialogo.k === 'hist' && h(HistoricoDialog, { e: dialogo.e, onClose: () => setDialogo(null) }));
}

// ====================== Painel do evento (aba Itens) ======================
function EventStockPanel({ items, eventId, eventName, ingredients, support, base }) {
  injectCss();
  const premium = temPremium();
  const { lista, erro, offlineDesde, carregar } = useSaldos(premium);
  const { fila: f } = useFila();
  const [evento, setEvento] = useState(null);
  const [dialogo, setDialogo] = useState(null);
  const [aviso, mostrarAviso] = useAviso();
  const catalogo = useMemo(() => montarCatalogo(ingredients, support, lista), [ingredients, support, lista]);
  const carregarEvento = () => {
    if (!eventId) { setEvento(null); return; }
    req('/api/stock/events/' + encodeURIComponent(eventId)).then(setEvento).catch(() => setEvento({ consumed: false, semConexao: true }));
  };
  useEffect(() => { if (premium) carregarEvento(); }, [eventId]);
  const [nFila, setNFila] = useState(f.length);
  useEffect(() => { if (nFila > 0 && f.length === 0) { carregar(); carregarEvento(); } setNFila(f.length); }, [f.length]);
  if (!premium) return null;
  const porK = new Map(catalogo.map(e => [e.k, e]));
  // Previsto: lista de compras do evento (já com perda, rendimento e margem das proteínas) + apoio controlado
  const previsto = [];
  (items || []).forEach(it => {
    if (!it || it.active === false || !it.ingredientId || !(it.qtyToBuy > 0)) return;
    const e = porK.get('i:' + it.ingredientId) || { k: 'i:' + it.ingredientId, kind: 'ing', id: it.ingredientId, name: it.name || 'Ingrediente', ing: it };
    previsto.push({ e, base: tipo(e) === 'un' ? it.qtyToBuy : it.qtyToBuy * 1000 });
  });
  (support || []).forEach(it => {
    if (!it || !it.stockControlled || it.active === false || !String(it.name || '').trim()) return;
    const e = porK.get('s:' + supportKey(it.name)); if (!e) return;
    const n = apoioNecessario(it, base || {});
    if (n > 0) previsto.push({ e, base: n });
  });
  const s = aplicarFila(mapaDe(lista), f);
  const falta = previsto.filter(p => (s[p.e.k] ? s[p.e.k].quantity : 0) < p.base - 0.0005).length;
  // Baixa/desfazer deste evento ainda na fila (sem internet)
  const naFila = eventId ? f.filter(x => x.url.indexOf('/api/stock/events/' + encodeURIComponent(eventId) + '/') === 0) : [];
  const ultimo = naFila.length ? naFila[naFila.length - 1] : null;
  const consumido = ultimo ? /\/consume$/.test(ultimo.url) : !!(evento && evento.consumed);
  const fechar = texto => { setDialogo(null); if (texto) mostrarAviso(texto); carregar(); carregarEvento(); };
  const desfazer = async () => {
    if (!confirm('Desfazer a baixa deste evento? As quantidades voltam para o estoque.')) return;
    try { const r = await enviar('/api/stock/events/' + encodeURIComponent(eventId) + '/undo', {}, 'Desfazer baixa · ' + (eventName || 'Evento')); fechar(r && r.queued ? MSG_FILA : 'Baixa desfeita.'); } catch (e) { alert(mensagemErro(e)); }
  };
  const status = erro ? erro : !lista ? 'Carregando...' : !eventId ? 'Salve o evento para poder dar baixa no estoque.'
    : consumido ? (ultimo ? '📶 Baixa feita sem internet: será enviada quando a conexão voltar.' : '✅ Baixa feita em ' + new Date(evento.consumedAt).toLocaleDateString('pt-BR') + '. Registre a sobra e a perda quando voltar.')
    : previsto.length ? (falta ? `⚠️ ${falta} de ${previsto.length} itens sem saldo suficiente no estoque.` : `✅ O estoque cobre os ${previsto.length} itens.`) : 'A lista de compras do evento está vazia.';
  return h('div', { className: 'stk card', style: { borderLeft: '4px solid #ea580c' } },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
      h('div', null,
        h('div', { style: { fontWeight: 800, fontSize: 16 } }, '📦 Estoque deste evento'),
        h('div', { className: 'muted' }, status, offlineDesde ? ' (sem internet: saldos guardados)' : '')),
      lista && eventId && !erro && h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
        consumido
          ? [h('div', { key: 's', role: 'button', className: 'btn b-wh', onClick: () => setDialogo({ k: 'mov' }) }, 'Registrar sobra / perda'),
             h('div', { key: 'd', role: 'button', className: 'btn b-red', onClick: desfazer }, 'Desfazer baixa')]
          : previsto.length ? h('div', { role: 'button', className: 'btn b-or', onClick: () => setDialogo({ k: 'baixa' }) }, 'Dar baixa no estoque') : null)),
    aviso && h('div', { role: 'status', style: { marginTop: 8, color: '#166534', fontWeight: 600 } }, '✅ ' + aviso),
    dialogo && dialogo.k === 'baixa' && h(BaixaDialog, { previsto, saldos: s, eventId, eventName, onClose: fechar }),
    dialogo && dialogo.k === 'mov' && h(MovDialog, { catalogo, tipoInicial: 'sobra', evento: { id: eventId, name: eventName || 'Evento' }, onClose: fechar }));
}

function BaixaDialog({ previsto, saldos, eventId, eventName, onClose }) {
  const [usado, setUsado] = useState(() => previsto.map(p => { const f = unidades(p.e)[0][1]; return String(Math.round(p.base / f * 1000) / 1000).replace('.', ','); }));
  const [msg, setMsg] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const confirmar = async () => {
    const itens = [];
    for (let i = 0; i < previsto.length; i++) {
      const v = parseNum(usado[i]); if (!(v >= 0)) return setMsg('Quantidade inválida em ' + previsto[i].e.name);
      if (v > 0) itens.push({ ...refBody(previsto[i].e), quantity: v * unidades(previsto[i].e)[0][1] });
    }
    if (!itens.length) return setMsg('Nada para dar baixa.');
    setSalvando(true); setMsg(null);
    try {
      const r = await enviar('/api/stock/events/' + encodeURIComponent(eventId) + '/consume', { eventName: eventName || 'Evento', items: itens }, 'Baixa · ' + (eventName || 'Evento'));
      onClose(r && r.queued ? MSG_FILA : 'Baixa feita no estoque.');
    } catch (e) { setMsg(mensagemErro(e)); } finally { setSalvando(false); }
  };
  return h(Modal, { titulo: 'Dar baixa no estoque', sub: 'Confira o que saiu para o evento. O previsto é a lista de compras (com perda, rendimento e margem das proteínas) e o apoio controlado. Ajuste o que for diferente.', onClose: () => onClose() },
    h('div', { style: { overflowX: 'auto' } }, h('table', { style: { marginTop: 10 } },
      h('thead', null, h('tr', null, h('th', null, 'Item'), h('th', null, 'Previsto'), h('th', null, 'Em estoque'), h('th', null, 'Saiu'))),
      h('tbody', null, previsto.map((p, i) => {
        const st = saldos[p.e.k]; const q = st ? st.quantity : 0; const u = unidades(p.e)[0][0];
        return h('tr', { key: p.e.k + i },
          h('td', null, p.e.name, p.e.kind === 'sup' ? h('span', { className: 'tag t-sup', style: { marginLeft: 6 } }, 'apoio') : null), h('td', null, fmtQtd(p.base, p.e)),
          h('td', { style: { color: q < p.base ? '#b91c1c' : '#166534', fontWeight: 600 } }, fmtQtd(q, p.e)),
          h('td', null, h('input', { value: usado[i], inputMode: 'decimal', 'aria-label': 'Saiu ' + p.e.name, style: { width: 80, padding: '5px 7px', fontSize: 14 }, onChange: e => setUsado(us => us.map((x, j) => j === i ? e.target.value : x)) }), h('span', { className: 'muted', style: { marginLeft: 4 } }, u)));
      })))),
    h('div', { className: 'muted', style: { marginTop: 10 } }, 'Sai primeiro o que vence antes. Sem saldo suficiente, a baixa é feita assim mesmo e o saldo fica negativo, com aviso.'),
    msg && h('div', { style: { color: '#b91c1c', marginTop: 10, fontWeight: 600 } }, msg),
    h('div', { style: { display: 'flex', gap: 8, marginTop: 16 } },
      h('div', { role: 'button', className: 'btn b-wh', style: { flex: 1 }, onClick: () => onClose() }, 'Cancelar'),
      h('div', { role: 'button', className: 'btn b-or', style: { flex: 2, opacity: salvando ? .6 : 1 }, onClick: salvando ? undefined : confirmar }, salvando ? 'Salvando...' : 'Confirmar baixa')));
}

window.StockPage = StockPage;
window.EventStockPanel = EventStockPanel;
window.StockUtils = { supportKey, tipo, fmtQtd, unidades, precoCadastro, necessidadeDaProposta, aplicarFila, montarCatalogo, apoioNecessario, fila, sincronizar, enviar };
})();
