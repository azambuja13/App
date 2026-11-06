(function () {
'use strict';
/**
 * Fornecedores (nov/2026, plano PREMIUM) — fase 1 do Financeiro.
 * Aba Estoque → "🚚 Fornecedores": cadastro, preço de cada ingrediente por fornecedor, comparação
 * (mais barato / preferido) e "usar no cadastro". A compra no estoque diz de qual fornecedor veio
 * (o preço pago vira o preço atual dele) e a compra sugerida sai separada por fornecedor, com pedido no WhatsApp.
 * API: /api/suppliers (preços em R$ por g, ml ou un; aqui a tela mostra por kg, L ou un).
 * window.SuppliersPage({ ingredients })      aba
 * window.SupplierUtils                       usado por StockPage.js (compra e compra sugerida)
 */
const h = React.createElement;
const { useState, useEffect, useMemo } = React;

const api = () => { const a = window.PrecificacaoAPI && window.PrecificacaoAPI.api; return a && typeof a.request === 'function' ? a : null; };
const req = (url, opt) => { const a = api(); if (!a) return Promise.reject(new Error('Sem conexão com o servidor')); return a.request(url, opt).then(r => (r && r.data !== undefined ? r.data : r)); };
const brl = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const n2 = (v, d = 2) => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: d });
const parseNum = v => { const t = String(v == null ? '' : v).trim().replace(/\s|R\$/g, ''); if (!t) return NaN; const s = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t; const n = parseFloat(s); return isFinite(n) ? n : NaN; };
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const fmtData = d => { try { return new Date(d).toLocaleDateString('pt-BR'); } catch (e) { return ''; } };
const msgErro = e => (e && (e.message || e.error)) || 'Não foi possível concluir. Tente de novo.';

/** kg | L | un */
function tipoIng(ing) {
  const t = String((ing && ing.unitType) || '').toLowerCase(), u = String((ing && ing.unit) || '').toLowerCase();
  if (t === 'unit' || u === 'un' || u === 'unidade') return 'un';
  if (t === 'volume' || u === 'l' || u === 'ml' || u === 'litro' || u === 'litros') return 'L';
  return 'kg';
}
/** Fator da unidade de preço para a base (g/ml/un) */
const fatorPreco = ing => (tipoIng(ing) === 'un' ? 1 : 1000);
const precoTela = (unitCost, ing) => (Number(unitCost) || 0) * fatorPreco(ing);
/** Preço do cadastro do ingrediente por kg/L/un */
function precoCadastro(ing) {
  const c = Number(ing && ing.costPerUnit) || 0, u = Number(ing && ing.unitSize) || 0;
  if (tipoIng(ing) === 'un') return u > 0 ? c / u : c;
  return u > 0 ? c / u * 1000 : c * 1000;
}
/** WhatsApp: só dígitos, com 55 na frente quando é número do Brasil sem DDI */
function waNumero(tel) {
  let d = String(tel || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length <= 11) d = '55' + d;
  return d;
}
const waLink = (tel, texto) => 'https://wa.me/' + waNumero(tel) + '?text=' + encodeURIComponent(texto || '');

/** Melhor preço por ingrediente: o preferido; se não houver, o mais barato */
function melhorPorIngrediente(precos) {
  const m = new Map();
  (precos || []).forEach(p => {
    const a = m.get(p.ingredientId);
    if (!a || (p.preferred && !a.preferred) || (p.preferred === a.preferred && p.unitCost < a.unitCost)) m.set(p.ingredientId, p);
  });
  return m;
}
let cachePrecos = null;
async function carregarPrecos(forcar) {
  if (!forcar && cachePrecos && Date.now() - cachePrecos.t < 60000) return cachePrecos.lista;
  const lista = await req('/api/suppliers/prices');
  cachePrecos = { t: Date.now(), lista: Array.isArray(lista) ? lista : [] };
  return cachePrecos.lista;
}
let cacheForn = null;
async function carregarFornecedores(forcar) {
  if (!forcar && cacheForn && Date.now() - cacheForn.t < 60000) return cacheForn.lista;
  const lista = await req('/api/suppliers');
  cacheForn = { t: Date.now(), lista: Array.isArray(lista) ? lista : [] };
  return cacheForn.lista;
}
const limparCache = () => { cachePrecos = null; cacheForn = null; try { window.dispatchEvent(new CustomEvent('suppliers-changed')); } catch (e) {} };

/** Atualiza o preço do cadastro do ingrediente a partir de R$ por kg/L/un */
async function usarNoCadastro(ing, porUnidadeTela) {
  const im = window.PrecificacaoAPI && window.PrecificacaoAPI.ingredientManager;
  if (!im || !im.updateIngredient) throw new Error('Sem conexão com o servidor');
  const tp = tipoIng(ing), v = Math.round(porUnidadeTela * 100) / 100;
  let novo;
  if (tp === 'un') { const u = Number(ing.unitSize) || 0; novo = u > 1 ? { ...ing, costPerUnit: Math.round(porUnidadeTela * u * 100) / 100 } : { ...ing, costPerUnit: v }; }
  else novo = { ...ing, costPerUnit: v, unitSize: 1000, unitCost: Math.round(v / 1000 * 10000) / 10000 };
  const r = await im.updateIngredient(ing.id, novo);
  if (r && r.success === false) throw new Error(r.message || 'Não foi possível atualizar');
  try {
    const es = window.eventState;
    if (es && es.setIngredientsDatabase && Array.isArray(es.ingredientsDatabase)) es.setIngredientsDatabase(es.ingredientsDatabase.map(i => i.id === ing.id ? { ...i, ...novo } : i));
  } catch (e) {}
  return novo;
}

// ====================== Modal ======================
function Modal({ titulo, sub, onClose, children, largo }) {
  useEffect(() => { const k = e => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  return h('div', { className: 'stk-bg stk', onClick: e => { if (e.target === e.currentTarget) onClose(); } },
    h('div', { className: 'stk-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo, style: largo ? { maxWidth: 900 } : undefined },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 } },
        h('div', null, h('h3', null, titulo), sub ? h('div', { className: 'muted' }, sub) : null),
        h('div', { role: 'button', 'aria-label': 'Fechar', className: 'x', style: { fontSize: 28 }, onClick: onClose }, '×')),
      children));
}

// ====================== Cadastro do fornecedor ======================
const CAMPOS = [
  ['name', 'Nome *', 'Ex.: Açougue Boi Bom', 'full'],
  ['contactName', 'Contato', 'Nome de quem atende'],
  ['whatsapp', 'WhatsApp', '(34) 99999-0000'],
  ['phone', 'Telefone', ''],
  ['email', 'E-mail', ''],
  ['document', 'CNPJ / CPF', ''],
  ['paymentTerms', 'Pagamento', 'Ex.: À vista, boleto 28 dias'],
  ['deliveryDays', 'Entrega', 'Ex.: seg, qua e sex'],
  ['minOrder', 'Pedido mínimo (R$)', ''],
  ['address', 'Endereço', '', 'full'],
  ['notes', 'Observações', '', 'full']
];
function FornecedorDialog({ fornecedor, ingredients, onClose }) {
  const [f, setF] = useState(() => { const o = {}; CAMPOS.forEach(([k]) => { o[k] = fornecedor && fornecedor[k] != null ? (k === 'minOrder' ? String(fornecedor[k]).replace('.', ',') : String(fornecedor[k])) : ''; }); return o; });
  const [id, setId] = useState(fornecedor ? fornecedor.id : null);
  const [itens, setItens] = useState([]);
  const [novo, setNovo] = useState({ nome: '', preco: '' });
  const [msg, setMsg] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const ingAtivos = useMemo(() => (ingredients || []).filter(i => i && i.id && i.isActive !== false), [ingredients]);
  const porNome = useMemo(() => { const m = new Map(); ingAtivos.forEach(i => m.set(norm(i.name), i)); return m; }, [ingAtivos]);
  const porId = useMemo(() => new Map(ingAtivos.map(i => [i.id, i])), [ingAtivos]);
  useEffect(() => { if (id) req('/api/suppliers/' + id).then(s => setItens((s && s.ingredients) || [])).catch(e => setMsg({ erro: true, t: msgErro(e) })); }, [id]);

  const salvar = async () => {
    if (!f.name.trim()) return setMsg({ erro: true, t: 'Informe o nome do fornecedor.' });
    const corpo = { ...f, minOrder: f.minOrder === '' ? null : f.minOrder };
    setSalvando(true); setMsg(null);
    try {
      const s = id ? await req('/api/suppliers/' + id, { method: 'PUT', body: JSON.stringify(corpo) }) : await req('/api/suppliers', { method: 'POST', body: JSON.stringify(corpo) });
      setId(s.id); limparCache();
      setMsg({ t: id ? 'Salvo.' : 'Fornecedor criado. Agora adicione os ingredientes e preços abaixo.' });
    } catch (e) { setMsg({ erro: true, t: msgErro(e) }); }
    finally { setSalvando(false); }
  };
  const gravarItem = async (ingredientId, campos) => {
    const ing = porId.get(ingredientId);
    const atual = itens.find(x => x.ingredientId === ingredientId) || {};
    const corpo = { unitCost: atual.unitCost, packSize: atual.packSize, code: atual.code, preferred: atual.preferred, notes: atual.notes, ...campos };
    try {
      const l = await req('/api/suppliers/' + id + '/ingredients/' + ingredientId, { method: 'PUT', body: JSON.stringify(corpo) });
      setItens(ls => { const outros = ls.filter(x => x.ingredientId !== ingredientId); return outros.concat([{ ...l, ingredientName: (ing && ing.name) || l.ingredientName }]).sort((a, b) => String(a.ingredientName).localeCompare(String(b.ingredientName), 'pt-BR')); });
      limparCache(); setMsg(null);
    } catch (e) { setMsg({ erro: true, t: msgErro(e) }); }
  };
  const adicionar = async () => {
    const ing = porNome.get(norm(novo.nome));
    if (!ing) return setMsg({ erro: true, t: 'Escolha um ingrediente da lista.' });
    const p = parseNum(novo.preco);
    if (!(p >= 0)) return setMsg({ erro: true, t: 'Informe o preço.' });
    await gravarItem(ing.id, { unitCost: p / fatorPreco(ing) });
    setNovo({ nome: '', preco: '' });
  };
  const remover = async ingredientId => {
    try { await req('/api/suppliers/' + id + '/ingredients/' + ingredientId, { method: 'DELETE' }); setItens(ls => ls.filter(x => x.ingredientId !== ingredientId)); limparCache(); }
    catch (e) { setMsg({ erro: true, t: msgErro(e) }); }
  };
  const set = (k, v) => setF(o => ({ ...o, [k]: v }));
  return h(Modal, { titulo: id ? '🚚 ' + (f.name || 'Fornecedor') : '🚚 Novo fornecedor', sub: 'Dados de contato e os preços dos ingredientes que ele vende.', onClose: () => onClose(), largo: true },
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 8, marginTop: 10 } },
      CAMPOS.map(([k, rot, ph, full]) => h('label', { key: k, style: { display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12, color: '#4b5563', gridColumn: full ? '1 / -1' : undefined } }, rot,
        k === 'notes' ? h('textarea', { value: f[k], placeholder: ph, rows: 2, onChange: e => set(k, e.target.value), style: { border: '1px solid #d1d5db', borderRadius: 9, padding: '8px 10px', fontSize: 15 } })
          : h('input', { value: f[k], placeholder: ph, inputMode: k === 'minOrder' ? 'decimal' : k === 'whatsapp' || k === 'phone' ? 'tel' : undefined, 'data-f': k, onChange: e => set(k, e.target.value) })))),
    h('div', { style: { display: 'flex', gap: 8, marginTop: 12 } },
      h('div', { role: 'button', className: 'btn b-gr', 'data-testid': 'sup-salvar', style: { opacity: salvando ? .6 : 1 }, onClick: salvando ? undefined : salvar }, salvando ? 'Salvando...' : (id ? 'Salvar dados' : 'Criar fornecedor')),
      id && f.whatsapp ? h('a', { className: 'btn b-wh', href: waLink(f.whatsapp, 'Olá!'), target: '_blank', rel: 'noopener', style: { textDecoration: 'none' } }, '📲 WhatsApp') : null),
    msg && h('div', { role: 'status', style: { marginTop: 10, fontWeight: 600, color: msg.erro ? '#b91c1c' : '#166534' } }, msg.t),
    id ? h('div', { style: { marginTop: 18 } },
      h('div', { style: { fontWeight: 800, fontSize: 16 } }, '🥕 Ingredientes e preços'),
      h('div', { className: 'muted' }, 'Preço por kg, L ou unidade. Ao registrar uma compra deste fornecedor no estoque, o preço pago atualiza sozinho.'),
      h('datalist', { id: 'sup-ings' }, ingAtivos.map(i => h('option', { key: i.id, value: i.name }))),
      h('div', { style: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' } },
        h('input', { list: 'sup-ings', value: novo.nome, placeholder: 'Ingrediente', 'aria-label': 'Ingrediente', 'data-f': 'novo-ing', onChange: e => setNovo(o => ({ ...o, nome: e.target.value })), style: { flex: '2 1 200px' } }),
        h('input', { value: novo.preco, inputMode: 'decimal', placeholder: (() => { const ing = porNome.get(norm(novo.nome)); return 'Preço por ' + (ing ? tipoIng(ing) : 'kg/L/un'); })(), 'aria-label': 'Preço', 'data-f': 'novo-preco', onChange: e => setNovo(o => ({ ...o, preco: e.target.value })), onKeyDown: e => { if (e.key === 'Enter') adicionar(); }, style: { flex: '1 1 120px' } }),
        h('div', { role: 'button', className: 'btn b-or', 'data-testid': 'sup-add-ing', onClick: adicionar }, '+ Adicionar')),
      itens.length ? h('div', { style: { overflowX: 'auto', marginTop: 10 } }, h('table', null,
        h('thead', null, h('tr', null, h('th', null, 'Ingrediente'), h('th', null, 'Preço'), h('th', null, 'No cadastro'), h('th', null, 'Última compra'), h('th', null, 'Preferido'), h('th', null, ''))),
        h('tbody', null, itens.map(l => {
          const ing = porId.get(l.ingredientId) || { unitType: l.unitType, unit: l.unit, name: l.ingredientName };
          const tp = tipoIng(ing), cad = porId.get(l.ingredientId) ? precoCadastro(ing) : null, preco = precoTela(l.unitCost, ing);
          const txt = (Number(preco) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
          return h('tr', { key: l.ingredientId, 'data-ing': l.ingredientName },
            h('td', { style: { fontWeight: 600 } }, l.ingredientName),
            h('td', null, h('input', { key: l.ingredientId + ':' + l.unitCost, defaultValue: txt, inputMode: 'decimal', 'aria-label': 'Preço de ' + l.ingredientName, style: { width: 90, padding: '5px 7px', fontSize: 14 },
              onBlur: e => { const v = parseNum(e.target.value); if (v >= 0 && e.target.value !== txt) gravarItem(l.ingredientId, { unitCost: v / fatorPreco(ing) }); } }), h('span', { className: 'muted', style: { marginLeft: 4 } }, '/' + tp)),
            h('td', { className: 'muted' }, cad != null ? brl(cad) + '/' + tp : '—'),
            h('td', { className: 'muted' }, l.lastUnitCost != null ? brl(precoTela(l.lastUnitCost, ing)) + ' em ' + fmtData(l.lastPurchaseAt) : '—'),
            h('td', null, h('input', { type: 'checkbox', checked: !!l.preferred, 'aria-label': 'Preferido para ' + l.ingredientName, title: 'Fornecedor preferido deste ingrediente (vai na compra sugerida)', onChange: e => gravarItem(l.ingredientId, { preferred: e.target.checked }) })),
            h('td', null, h('span', { className: 'x', role: 'button', 'aria-label': 'Tirar ' + l.ingredientName, onClick: () => remover(l.ingredientId) }, '×')));
        })))) : h('div', { className: 'muted', style: { marginTop: 10 } }, 'Nenhum ingrediente ainda.')) : null,
    h('div', { style: { display: 'flex', gap: 8, marginTop: 18 } },
      h('div', { role: 'button', className: 'btn b-wh', style: { flex: 1 }, onClick: () => onClose(id ? 'ok' : null) }, 'Fechar')));
}

// ====================== Comparar preços ======================
function CompararDialog({ ingredients, fornecedores, onClose }) {
  const [precos, setPrecos] = useState(null);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [aviso, setAviso] = useState('');
  const [cad, setCad] = useState({}); // preços do cadastro atualizados nesta tela
  useEffect(() => { carregarPrecos(true).then(setPrecos).catch(e => setErro(msgErro(e))); }, []);
  const porId = useMemo(() => new Map((ingredients || []).map(i => [i.id, i])), [ingredients]);
  const nomeForn = useMemo(() => new Map((fornecedores || []).map(s => [s.id, s.name])), [fornecedores]);
  const grupos = useMemo(() => {
    const m = new Map();
    (precos || []).forEach(p => { const ing = porId.get(p.ingredientId); if (!ing) return; if (!m.has(p.ingredientId)) m.set(p.ingredientId, { ing, lista: [] }); m.get(p.ingredientId).lista.push(p); });
    return [...m.values()].filter(g => !busca || norm(g.ing.name).includes(norm(busca)))
      .map(g => ({ ...g, lista: g.lista.slice().sort((a, b) => a.unitCost - b.unitCost) }))
      .sort((a, b) => a.ing.name.localeCompare(b.ing.name, 'pt-BR'));
  }, [precos, porId, busca]);
  const usar = async (ing, valor) => {
    try { await usarNoCadastro({ ...ing, ...(cad[ing.id] || {}) }, valor); setCad(c => ({ ...c, [ing.id]: { porTela: valor } })); setAviso(`${ing.name}: cadastro atualizado para ${brl(valor)}/${tipoIng(ing)}.`); }
    catch (e) { setAviso('❌ ' + msgErro(e)); }
  };
  return h(Modal, { titulo: '⚖️ Comparar preços', sub: 'Preço de cada ingrediente em cada fornecedor. O mais barato fica em verde; ⭐ é o preferido.', onClose, largo: true },
    h('input', { value: busca, onChange: e => setBusca(e.target.value), placeholder: '🔍 Buscar ingrediente', 'aria-label': 'Buscar ingrediente', style: { width: '100%', marginTop: 10 } }),
    aviso && h('div', { role: 'status', style: { marginTop: 8, fontWeight: 600, color: aviso.startsWith('❌') ? '#b91c1c' : '#166534' } }, aviso),
    erro ? h('div', { style: { color: '#b91c1c', marginTop: 10 } }, erro) : !precos ? h('div', { className: 'muted', style: { marginTop: 10 } }, 'Carregando...') :
    !grupos.length ? h('div', { className: 'muted', style: { marginTop: 10 } }, 'Nenhum preço cadastrado ainda. Abra um fornecedor e adicione os ingredientes que ele vende.') :
    h('div', { style: { marginTop: 10 } }, grupos.map(g => {
      const tp = tipoIng(g.ing), cadastro = cad[g.ing.id] ? cad[g.ing.id].porTela : precoCadastro(g.ing);
      const menor = g.lista[0];
      return h('div', { key: g.ing.id, 'data-ing': g.ing.name, style: { borderBottom: '1px solid #f3f4f6', padding: '10px 0' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' } },
          h('div', null, h('b', null, g.ing.name), h('span', { className: 'muted', style: { marginLeft: 6, fontSize: 12 } }, g.ing.category || '')),
          h('span', { className: 'muted' }, 'No cadastro: ' + brl(cadastro) + '/' + tp)),
        g.lista.map(p => {
          const v = precoTela(p.unitCost, g.ing), barato = p === menor && g.lista.length > 1;
          const dif = cadastro > 0 ? (v / cadastro - 1) * 100 : 0;
          return h('div', { key: p.supplierId, style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', padding: '4px 0 4px 10px' } },
            h('div', { style: { minWidth: 0 } },
              h('span', { style: { fontWeight: barato ? 800 : 500, color: barato ? '#15803d' : undefined } }, (p.preferred ? '⭐ ' : '') + (nomeForn.get(p.supplierId) || p.supplierName || 'Fornecedor') + ': ' + brl(v) + '/' + tp),
              Math.abs(dif) >= 0.5 ? h('span', { className: 'muted', style: { fontSize: 12, marginLeft: 6 } }, (dif > 0 ? '+' : '') + n2(dif, 1) + '% do cadastro') : null),
            Math.abs(v - cadastro) >= 0.01 ? h('span', { role: 'button', className: 'btn b-wh b-sm', 'data-testid': 'usar-cadastro', onClick: () => usar(g.ing, v) }, 'Usar no cadastro') : h('span', { className: 'tag t-ok' }, 'igual ao cadastro'));
        }));
    })));
}

// ====================== Aba ======================
function SuppliersPage({ ingredients }) {
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [dialogo, setDialogo] = useState(null);
  const carregar = () => carregarFornecedores(true).then(l => { setLista(l); setErro(''); }).catch(e => setErro(msgErro(e)));
  useEffect(() => { carregar(); }, []);
  const excluir = async s => {
    if (!confirm(`Excluir o fornecedor "${s.name}"? As compras antigas continuam com o nome dele.`)) return;
    try { await req('/api/suppliers/' + s.id, { method: 'DELETE' }); limparCache(); carregar(); } catch (e) { alert(msgErro(e)); }
  };
  const filtrados = (lista || []).filter(s => !busca || norm(s.name + ' ' + (s.contactName || '')).includes(norm(busca)));
  return h('div', { className: 'card', 'data-testid': 'sup-page' },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
      h('div', null, h('h2', { style: { fontSize: 22, fontWeight: 800, margin: 0 } }, '🚚 Fornecedores'),
        h('div', { className: 'muted' }, lista ? `${lista.length} fornecedor(es) · preços por ingrediente, compra e pedido pelo WhatsApp` : 'Carregando...')),
      h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
        h('div', { role: 'button', className: 'btn b-gr', 'data-testid': 'sup-novo', onClick: () => setDialogo({ k: 'forn' }) }, '+ Novo fornecedor'),
        h('div', { role: 'button', className: 'btn b-or', 'data-testid': 'sup-comparar', onClick: () => setDialogo({ k: 'comparar' }) }, '⚖️ Comparar preços'))),
    erro && h('div', { style: { marginTop: 10, color: '#b91c1c', fontWeight: 600 } }, '❌ ' + erro),
    lista && lista.length > 5 && h('input', { value: busca, onChange: e => setBusca(e.target.value), placeholder: '🔍 Buscar fornecedor', 'aria-label': 'Buscar fornecedor', style: { width: '100%', marginTop: 12 } }),
    lista && !lista.length && h('div', { className: 'aviso a-azul', style: { marginTop: 14 } },
      h('b', null, 'Como funciona'),
      h('div', null, '1. Cadastre o fornecedor e os ingredientes que ele vende, com o preço.'),
      h('div', null, '2. Em "Comparar preços" veja quem está mais barato e atualize o cadastro com um toque.'),
      h('div', null, '3. Em "Registrar compra" escolha o fornecedor: o preço pago atualiza sozinho.'),
      h('div', null, '4. A "Compra sugerida" sai separada por fornecedor, com o pedido pronto para o WhatsApp.')),
    filtrados.length > 0 && h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 10, marginTop: 14 } },
      filtrados.map(s => h('div', { key: s.id, 'data-sup': s.name, style: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 } },
        h('div', { role: 'button', style: { fontWeight: 800, fontSize: 16, cursor: 'pointer', color: '#9a3412' }, onClick: () => setDialogo({ k: 'forn', s }) }, s.name),
        h('div', { className: 'muted' }, [s.contactName, s.paymentTerms, s.deliveryDays ? 'entrega ' + s.deliveryDays : null].filter(Boolean).join(' · ') || '—'),
        h('div', { className: 'muted', style: { marginTop: 2 } }, (s.ingredientsCount || 0) + ' ingrediente(s)' + (s.minOrder ? ' · mínimo ' + brl(s.minOrder) : '')),
        h('div', { style: { display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' } },
          h('div', { role: 'button', className: 'btn b-wh b-sm', onClick: () => setDialogo({ k: 'forn', s }) }, '✏️ Abrir'),
          s.whatsapp ? h('a', { className: 'btn b-wh b-sm', href: waLink(s.whatsapp, 'Olá!'), target: '_blank', rel: 'noopener', style: { textDecoration: 'none' } }, '📲 WhatsApp') : null,
          h('div', { role: 'button', className: 'btn b-red b-sm', onClick: () => excluir(s) }, 'Excluir'))))),
    dialogo && dialogo.k === 'forn' && h(FornecedorDialog, { fornecedor: dialogo.s, ingredients, onClose: () => { setDialogo(null); carregar(); } }),
    dialogo && dialogo.k === 'comparar' && h(CompararDialog, { ingredients, fornecedores: lista, onClose: () => setDialogo(null) }));
}

window.SuppliersPage = SuppliersPage;
window.SupplierUtils = { carregarPrecos, carregarFornecedores, melhorPorIngrediente, precoTela, tipoIng, waLink, waNumero, limparCache, req };
})();
