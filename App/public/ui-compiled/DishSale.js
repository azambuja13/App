(function () {
'use strict';
/**
 * Venda do prato (Vendas, out/2026, PREMIUM) — a opção de vender fica no próprio prato.
 *   window.DishSaleBox({ dish, nome, categoria, precoSugerido, porPeso, custoPorcao, custoTotal, pesoTotal, onChange })
 *     quadro "🧾 Vender este prato" no formulário do prato (DishForm). Guarda o estado no pai via onChange.
 *   window.DishSale.salvar(dishId, estado, { name }) → depois de salvar o prato: cria/atualiza o item do
 *     cardápio de venda (/api/menu-items) ligado ao prato. Desmarcar = tira da venda (isActive false).
 *   window.DishSale.lista(force) → itens de venda (cache), usado na lista de pratos para a etiqueta "à venda".
 */
const h = React.createElement;
const { useState, useEffect } = React;
const api = () => { const a = window.PrecificacaoAPI && window.PrecificacaoAPI.api; return a && typeof a.request === 'function' ? a : null; };
const req = (url, opt) => { const a = api(); if (!a) return Promise.reject(new Error('Sem conexão com o servidor')); return a.request(url, opt).then(r => (r && r.data !== undefined ? r.data : r)); };
const temVendas = () => !!(window.ConfigHelper && window.ConfigHelper.hasFeatureAccess && window.ConfigHelper.hasFeatureAccess('sales'));
const brl = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const parseNum = v => { const t = String(v == null ? '' : v).trim().replace(/\./g, (m, i, s) => (/,/.test(s) ? '' : m)).replace(',', '.'); const n = parseFloat(t); return isFinite(n) ? n : NaN; };
const r2 = v => Math.round(Number(v) * 100) / 100;
const txt = v => String(r2(v)).replace('.', ',');
// Categoria do prato (código interno) → nome da categoria na venda
const CATS = { entrada: 'Entradas', principal: 'Pratos', acompanhamento: 'Acompanhamentos', sobremesa: 'Sobremesas', bebida: 'Bebidas', outro: 'Outros' };
const catVenda = c => { const k = String(c || '').trim(); if (!k) return 'Pratos'; return CATS[k.toLowerCase()] || (k.charAt(0).toUpperCase() + k.slice(1)); };
const avisar = () => { try { window.dispatchEvent(new CustomEvent('vnd-cardapio')); } catch (e) {} };

let cache = null;
function lista(force) {
  if (!temVendas()) return Promise.resolve([]);
  if (!cache || force) cache = req('/api/menu-items?all=1').then(l => l || []).catch(e => { cache = null; throw e; });
  return cache;
}
const doPrato = (l, dishId) => (l || []).filter(i => i.dishId && String(i.dishId) === String(dishId)).sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0))[0] || null;
function mensagem(e) {
  const m = String((e && e.message) || e || '');
  if (/sale_items|does not exist|relation|P20/.test(m) || (e && e.statusCode === 500)) return 'a venda ainda não está ativada no servidor.';
  return m || 'sem conexão com o servidor.';
}

function DishSaleBox({ dish, nome, categoria, precoSugerido, porPeso, custoPorcao, custoTotal, pesoTotal, onChange }) {
  const premium = temVendas();
  const [st, setSt] = useState({ carregado: false, erro: '', itemId: null, forSale: false, price: '', category: '', unit: porPeso ? 'kg' : 'porção', controlsStock: false, blockWithoutStock: false, mexeu: false, original: null });
  const mudar = patch => setSt(s => { const n = { ...s, ...patch, mexeu: true }; onChange && onChange(n); return n; });
  // Preço sugerido do prato na unidade de venda: porção = preço da porção; kg = preço de 100 g × 10
  const sugerido = un => { const p = Number(precoSugerido) || 0; if (!(p > 0)) return ''; return txt(porPeso ? (un === 'kg' ? p * 10 : p) : p); };
  useEffect(() => {
    if (!premium) return;
    if (!dish || !dish.id) { const n = { ...st, carregado: true, category: catVenda(categoria) }; setSt(n); onChange && onChange(n); return; }
    let vivo = true;
    lista(true).then(l => {
      if (!vivo) return;
      const it = doPrato(l, dish.id);
      const n = it
        ? { carregado: true, erro: '', itemId: it.id, forSale: !!it.isActive, price: txt(it.price), category: it.category || catVenda(categoria), unit: it.unit || 'porção', controlsStock: !!it.controlsStock, blockWithoutStock: !!it.blockWithoutStock, mexeu: false, original: it }
        : { ...st, carregado: true, erro: '', category: catVenda(categoria) };
      setSt(n); onChange && onChange(n);
    }).catch(e => { if (vivo) { const n = { ...st, carregado: true, erro: mensagem(e) }; setSt(n); onChange && onChange(n); } });
    return () => { vivo = false; };
  }, [dish && dish.id]);
  if (!premium) return h('div', { className: 'mb-6 p-3 rounded-lg border border-gray-200 text-sm text-gray-500' }, '🔒 Vender este prato no PDV (balcão, delivery e encomendas) é do plano PREMIUM.');
  const custoUn = st.unit === 'kg' ? (Number(pesoTotal) > 0 ? Number(custoTotal) / Number(pesoTotal) * 1000 : 0) : Number(custoPorcao) || 0;
  const preco = parseNum(st.price);
  const cmv = preco > 0 && custoUn > 0 ? custoUn / preco * 100 : null;
  const meta = Number(window.PricingRules && window.PricingRules.get().cmvTargetPct) || 30;
  const cor = cmv == null ? '#6b7280' : cmv <= meta ? '#15803d' : cmv <= meta + 5 ? '#b45309' : '#b91c1c';
  const lab = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginTop: 8, cursor: 'pointer' };
  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg';
  return h('div', { className: 'mb-6 p-4 rounded-lg', style: { border: '2px solid ' + (st.forSale ? '#fdba74' : '#e5e7eb'), background: st.forSale ? '#fff7ed' : '#fff' }, 'data-dish-sale': true },
    h('label', { style: { display: 'flex', alignItems: 'center', gap: 10, cursor: st.carregado && !st.erro ? 'pointer' : 'default' } },
      h('input', { type: 'checkbox', className: 'w-5 h-5', 'aria-label': 'Vender este prato', disabled: !st.carregado || !!st.erro, checked: st.forSale,
        onChange: e => {
          const on = e.target.checked;
          // Primeira vez: a unidade segue o modo do prato (por peso → kg; por porção → porção), lido agora (o prato carrega depois do quadro)
          const un = on && !st.itemId && !st.price ? (porPeso ? 'kg' : 'porção') : st.unit;
          mudar({ forSale: on, unit: un, price: on && !st.price ? sugerido(un) : st.price, category: !st.itemId && !st.mexeu ? catVenda(categoria) : (st.category || catVenda(categoria)) });
        } }),
      h('span', null, h('span', { style: { fontWeight: 700, fontSize: 16 } }, '🧾 Vender este prato'),
        h('span', { className: 'block text-xs text-gray-500' }, 'Aparece na aba Vendas para vender no balcão, mesa, delivery e encomenda. O custo vem desta ficha técnica.'))),
    !st.carregado ? h('p', { className: 'text-xs text-gray-500 mt-2' }, 'Carregando...') :
    st.erro ? h('p', { className: 'text-xs mt-2', style: { color: '#b91c1c' } }, 'Não deu para carregar a venda: ' + st.erro) :
    st.forSale && h('div', { style: { marginTop: 10 } },
      h('div', { className: 'grid grid-cols-2 gap-3' },
        h('div', null, h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Preço de venda (R$)'),
          h('input', { type: 'text', inputMode: 'decimal', 'aria-label': 'Preço de venda', value: st.price, onChange: e => mudar({ price: e.target.value.replace(/[^0-9.,]/g, '') }), className: inp, style: { fontWeight: 700 } })),
        h('div', null, h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Vendido por'),
          h('select', { 'aria-label': 'Vendido por', value: st.unit, className: inp, onChange: e => { const u = e.target.value; mudar({ unit: u, price: porPeso && (u === 'kg') !== (st.unit === 'kg') ? sugerido(u) || st.price : st.price }); } },
            h('option', { value: 'porção' }, 'porção'), h('option', { value: 'un' }, 'unidade'), h('option', { value: 'kg' }, 'kg')))),
      h('p', { className: 'text-xs mt-1', style: { color: cor } },
        custoUn > 0 ? `Custo ${brl(custoUn)}${st.unit === 'kg' ? '/kg' : ''}` + (cmv != null ? ` · CMV ${cmv.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}% (meta ${String(meta).replace('.', ',')}%)` : '') : 'Sem custo calculado ainda (adicione os ingredientes).',
        sugerido(st.unit) && sugerido(st.unit) !== st.price ? h('button', { type: 'button', onClick: () => mudar({ price: sugerido(st.unit) }), style: { marginLeft: 8, color: '#c2410c', fontWeight: 700, background: 'none', border: 0, cursor: 'pointer', padding: 0, minHeight: 0 } }, 'usar o preço sugerido (R$ ' + sugerido(st.unit) + ')') : null),
      h('div', { style: { marginTop: 8 } }, h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Categoria na venda'),
        h('input', { type: 'text', 'aria-label': 'Categoria na venda', value: st.category, maxLength: 60, onChange: e => mudar({ category: e.target.value }), placeholder: 'Ex.: Marmitas, Pratos, Sobremesas', className: inp })),
      h('label', { style: lab }, h('input', { type: 'checkbox', checked: st.controlsStock, onChange: e => mudar({ controlsStock: e.target.checked }) }),
        h('span', null, 'Controlar estoque de prontos ', h('span', { className: 'text-xs text-gray-500' }, '(marmitas, congelados, bolos: o saldo fica na aba Estoque → Pratos prontos e em Vendas → Estoque)'))),
      st.controlsStock && h('label', { style: lab }, h('input', { type: 'checkbox', checked: st.blockWithoutStock, onChange: e => mudar({ blockWithoutStock: e.target.checked }) }), 'Não deixar vender sem saldo')),
    st.carregado && !st.erro && !st.forSale && st.itemId ? h('p', { className: 'text-xs text-gray-500 mt-2' }, 'Fora da venda. Marque para voltar a vender (os pedidos antigos continuam).') : null);
}

/** Depois de salvar o prato. Devolve { ok } ou { erro }. */
async function salvar(dishId, st, { name } = {}) {
  if (!temVendas() || !st || !st.carregado || st.erro || !dishId) return { ok: true, nada: true };
  const nomeMudou = st.original && name && name.trim() && name.trim() !== st.original.name;
  if (!st.mexeu && !nomeMudou) return { ok: true, nada: true };
  if (!st.itemId && !st.forSale) return { ok: true, nada: true };
  const price = parseNum(st.price);
  if (st.forSale && !(price >= 0)) return { erro: 'informe o preço de venda.' };
  const dados = { name: (name || (st.original && st.original.name) || 'Prato').trim().slice(0, 120), category: (st.category || 'Pratos').trim(), unit: st.unit, controlsStock: !!st.controlsStock, blockWithoutStock: !!(st.controlsStock && st.blockWithoutStock) };
  try {
    if (st.itemId) await req('/api/menu-items/' + st.itemId, { method: 'PUT', body: JSON.stringify(st.forSale ? { ...dados, price: r2(price), isActive: true } : (st.mexeu ? { isActive: false } : { name: dados.name })) });
    else await req('/api/menu-items', { method: 'POST', body: JSON.stringify({ items: [{ ...dados, dishId: String(dishId), price: r2(price) }] }) });
    cache = null; avisar();
    return { ok: true };
  } catch (e) { return { erro: mensagem(e) }; }
}

/** Mapa dishId → item de venda ativo (para a etiqueta na lista de pratos) */
function useVendaDosPratos() {
  const [m, setM] = useState({});
  useEffect(() => {
    if (!temVendas()) return;
    const carregar = force => lista(force).then(l => { const x = {}; (l || []).forEach(i => { if (i.dishId && i.isActive) x[String(i.dishId)] = i; }); setM(x); }).catch(() => {});
    carregar(true);
    const f = () => carregar(true);
    window.addEventListener('vnd-cardapio', f);
    return () => window.removeEventListener('vnd-cardapio', f);
  }, []);
  return m;
}

window.DishSaleBox = DishSaleBox;
window.DishSale = { salvar, lista, useVendaDosPratos, doPrato };
})();
