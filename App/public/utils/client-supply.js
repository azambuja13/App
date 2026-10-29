(function () {
'use strict';
/**
 * Insumos do cliente (out/2026) — evento em que o cliente compra parte (ou todos) os insumos e a empresa
 * cobra mão de obra, apoio, transporte e uma taxa de preparo por convidado.
 *
 * Configuração (no evento: state.clientSupply; na proposta: formData.clientSupply):
 *   { enabled, categories: ['Proteínas', …], items: ['picanha', …] (nomes normalizados), prepFeePerGuest }
 * Itens de apoio que o cliente traz: flag `clientProvides` no próprio item de apoio (só vale com enabled).
 *
 * window.ClientSupply = { normalizar, ativo, ingrediente, apoio, categoria, norm, taxa, filtrarApoio,
 *                         listaDoEvento, listaDaProposta, resumoTexto }
 */
const num = (v, d = 0) => { const n = parseFloat(v); return isFinite(n) ? n : d; };
const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
function categoria(c) {
  try { if (window.normalizeCategory) return window.normalizeCategory(c || 'Outros'); } catch (e) {}
  return c || 'Outros';
}
function normalizar(cs) {
  cs = cs || {};
  const arr = v => (Array.isArray(v) ? v : []).filter(x => x != null && String(x).trim() !== '');
  return {
    enabled: !!cs.enabled,
    categories: [...new Set(arr(cs.categories).map(categoria))],
    items: [...new Set(arr(cs.items).map(norm))],
    prepFeePerGuest: Math.max(0, num(cs.prepFeePerGuest))
  };
}
/** Algo muda no preço? (ligado e com algum item, categoria ou taxa) */
function ativo(cs, support) {
  const c = normalizar(cs);
  if (!c.enabled) return false;
  return c.categories.length > 0 || c.items.length > 0 || c.prepFeePerGuest > 0 || (support || []).some(i => i && i.clientProvides);
}
/** O cliente compra este ingrediente? (pela categoria inteira ou pelo item) */
function ingrediente(nome, cat, cs) {
  const c = cs && cs.__n ? cs : normalizar(cs);
  if (!c.enabled) return false;
  return c.categories.includes(categoria(cat)) || c.items.includes(norm(nome));
}
/** O cliente traz este item de apoio? */
function apoio(item, cs) { return !!(item && item.clientProvides && normalizar(cs).enabled); }
/** Apoio que a empresa paga (sem o que o cliente traz) */
function filtrarApoio(support, cs) { const on = normalizar(cs).enabled; return (support || []).filter(i => !(on && i && i.clientProvides)); }
/** Taxa de preparo do evento (R$ por convidado × convidados) */
function taxa(cs, guests) { const c = normalizar(cs); return c.enabled ? Math.round(c.prepFeePerGuest * Math.max(0, num(guests)) * 100) / 100 : 0; }

const nomeItem = it => it.name || (it.ingredient && (it.ingredient.nome || it.ingredient.name)) || 'Sem nome';
const unTipo = it => it.unitType === 'unit' || it.unit === 'un';
// Para o cliente: "kg/L" e "g/ml" viram a unidade certa (líquido em L/ml, o resto em kg/g)
const qtdTexto = it => {
  const t = it.qtyRoundedLabel || (unTipo(it) ? `${Math.ceil(num(it.qtyInKgL))} un` : `${(Math.round(num(it.qtyInKgL) * 100) / 100).toLocaleString('pt-BR')} kg/L`);
  const liq = String(it.unitType || '').toLowerCase() === 'volume' || /^(l|ml|litro)/i.test(String(it.unit || ''));
  return String(t).replace(/kg\/L/g, liq ? 'L' : 'kg').replace(/g\/ml/g, liq ? 'ml' : 'g');
};
/** Lista do que o cliente compra, a partir dos itens calculados do evento (itemsCalculated) e do apoio */
function listaDoEvento(itemsCalculated, support, cs) {
  const c = normalizar(cs); c.__n = true;
  const itens = (itemsCalculated || []).filter(it => it && it.active !== false && ingrediente(nomeItem(it), it.category, c))
    .map(it => ({ name: nomeItem(it), category: categoria(it.category), qty: qtdTexto(it), cost: Math.round(num(it.total) * 100) / 100 }))
    .sort((a, b) => a.category.localeCompare(b.category, 'pt-BR') || a.name.localeCompare(b.name, 'pt-BR'));
  const apoioL = (support || []).filter(i => i && i.active !== false && apoio(i, c))
    .map(i => {
      let qty = '';
      try { if (window.SupportRules && window.SupportRules.describe) qty = window.SupportRules.describe(i, {}).buyText; } catch (e) {}
      if (!qty) qty = num(i.quantity) ? `${num(i.quantity)} ${i.unit || 'un'}` : '';
      return { name: i.name, qty, cost: Math.round(num(i.total != null ? i.total : num(i.cost) * num(i.quantity)) * 100) / 100 };
    });
  return { itens, apoio: apoioL, custoItens: itens.reduce((t, i) => t + i.cost, 0), custoApoio: apoioL.reduce((t, i) => t + i.cost, 0) };
}
/** Mesma lista para uma proposta (cardápio salvo × convidados da proposta), sem depender do evento aberto */
async function listaDaProposta(fd, db) {
  const md = (fd && fd.selectedMenuData) || {};
  const pratos = (md.menuData && md.menuData.dishes) || md.dishes || [];
  const conv = parseInt(fd && fd.guests) || 0;
  if (!pratos.length || !conv || !window.menuManager || !window.ShoppingListGenerator || !window.calculateItems) return null;
  const lista = await window.menuManager.generateIngredientsListFromDishes(pratos, conv);
  const itens = window.ShoppingListGenerator.processIngredientsToItems(lista, conv, db || []);
  const pct = fd.proteinSafetyPct != null && fd.proteinSafetyPct !== '' ? fd.proteinSafetyPct : (fd.pricingSnapshot && fd.pricingSnapshot.proteinSafetyPct);
  const calc = window.calculateItems(itens, db || [], conv, { proteinSafetyPct: pct != null ? pct : undefined });
  return listaDoEvento(calc, [], fd.clientSupply).itens;
}
/** Categorias e itens presentes (para as caixinhas de escolha) */
function opcoes(itemsCalculated) {
  const m = new Map();
  (itemsCalculated || []).forEach(it => {
    if (!it || it.active === false) return;
    const cat = categoria(it.category); if (!m.has(cat)) m.set(cat, []);
    const n = nomeItem(it); if (!m.get(cat).some(x => norm(x.name) === norm(n))) m.get(cat).push({ name: n, qty: qtdTexto(it), cost: num(it.total) });
  });
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR')).map(([cat, itens]) => ({ cat, itens: itens.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')) }));
}
/** Opções a partir dos pratos (proposta sem evento aberto): categorias e ingredientes dos pratos */
function opcoesDosPratos(pratos, db) {
  const m = new Map();
  (pratos || []).forEach(d => {
    if (!d || d.active === false) return;
    ((d.dishIngredients || d.ingredients) || []).forEach(ing => {
      const n = ing.ingredientName || ing.name; if (!n) return;
      const cat = categoria(window.PricingRules && window.PricingRules.dishIngredientCategory ? window.PricingRules.dishIngredientCategory(ing, db) : (ing.category || 'Outros'));
      if (!m.has(cat)) m.set(cat, []);
      if (!m.get(cat).some(x => norm(x.name) === norm(n))) m.get(cat).push({ name: n });
    });
  });
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR')).map(([cat, itens]) => ({ cat, itens: itens.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')) }));
}
/** HTML da lista para o cliente (imprimir / PDF) */
function htmlLista(titulo, lista, extra) {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const porCat = {};
  (lista.itens || []).forEach(i => { (porCat[i.category] = porCat[i.category] || []).push(i); });
  const blocos = Object.keys(porCat).map(c => `<h3>${esc(c)}</h3><table>${porCat[c].map(i => `<tr><td class="ck"></td><td>${esc(i.name)}</td><td class="q">${esc(i.qty)}</td></tr>`).join('')}</table>`).join('');
  const ap = (lista.apoio || []).length ? `<h3>Apoio</h3><table>${lista.apoio.map(i => `<tr><td class="ck"></td><td>${esc(i.name)}</td><td class="q">${esc(i.qty)}</td></tr>`).join('')}</table>` : '';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>
@page{size:A4;margin:14mm}body{font-family:Arial,sans-serif;color:#111;font-size:13px;margin:0}h1{font-size:20px;margin:0 0 4px;border-bottom:3px solid #f97316;padding-bottom:6px}
.sub{color:#555;margin-bottom:10px}h3{background:#fff7ed;color:#9a3412;padding:5px 8px;margin:14px 0 4px;font-size:14px}table{width:100%;border-collapse:collapse;font-size:inherit}
td{padding:5px 6px;border-bottom:1px solid #e5e7eb}td.q{text-align:right;font-weight:700;white-space:nowrap}td.ck{width:16px}td.ck:before{content:'';display:inline-block;width:12px;height:12px;border:1.5px solid #9ca3af}
.rod{margin-top:18px;color:#777;font-size:11px}</style></head><body><h1>${esc(titulo)}</h1>${extra ? `<div class="sub">${esc(extra)}</div>` : ''}${blocos}${ap}
<div class="rod">Quantidades para comprar já com a perda no preparo. Gerado pela Calculadora de Precificação.</div></body></html>`;
}

window.ClientSupply = { normalizar, ativo, ingrediente, apoio, filtrarApoio, taxa, categoria, norm, listaDoEvento, listaDaProposta, opcoes, opcoesDosPratos, htmlLista };
})();
