(function () {
'use strict';
/**
 * Atualizar pratos nos cardápios (out/2026)
 *
 * O cardápio do evento (aba Cardápio) e os cardápios salvos (aba Salvos) guardam uma cópia de cada prato
 * (nome, custo, ingredientes, rendimento, margem). Ao editar o prato, essas cópias ficavam velhas.
 * Aqui buscamos cada prato de novo e trocamos a cópia, mantendo as porções por pessoa de cada cardápio.
 *
 * window.MenuRefresh = { atualizarCardapioAtual, atualizarSalvos, atualizarItens, itemDoPrato, textoResumo }
 */
const num = (v, d = 0) => { const n = parseFloat(v); return isFinite(n) ? n : d; };

/** Busca o prato completo (com ingredientes). null = prato excluído. Erro de rede/sem internet = exceção. */
async function buscarPrato(id) {
  const api = window.PrecificacaoAPI && window.PrecificacaoAPI.api;
  if (api && api.getDish) {
    try {
      const r = await api.getDish(id);
      return (r && r.data) || r || null;
    } catch (e) {
      if (e && (e.statusCode === 404 || /n[ãa]o encontrad/i.test(String(e.message || '')))) return null;
      throw e;
    }
  }
  const dm = (window.ManagerHelper && window.ManagerHelper.getDishManager && window.ManagerHelper.getDishManager()) || window.dishManager;
  if (dm && dm.getById) return (await dm.getById(id)) || null;
  throw new Error('Pratos indisponíveis');
}

function custoPorPessoa(it) {
  const custo = num(it.dishCost), sv = num(it.servings, 1) || 1, peso = num(it.totalWeight), pp = num(it.portionsPerPerson, 1);
  const porPorcao = it.useWeightCalculation || (sv > 0 && peso === 0);
  const c = porPorcao ? (sv > 0 ? custo / sv : custo) * pp : (peso > 0 ? custo / peso : custo) * pp * 100;
  const m = num(it.profitMargin);
  return { dishCostPerPerson: c, dishPricePerPerson: m > 0 ? c * (1 + m / 100) : c };
}

/** Cópia dos ingredientes para cardápio salvo: valores do prato (perda/rendimento da receita) + dados do cadastro */
function ingredienteSalvo(ing, cadastro) {
  const nome = ing.ingredientName || ing.name || '';
  let f = null;
  if (ing.ingredientId) f = cadastro.find(i => i.id === ing.ingredientId) || null;
  if (!f && nome) f = cadastro.find(i => String(i.name || i.ingredientName || '').toLowerCase() === nome.toLowerCase()) || null;
  const lp = num(ing.lossPercentage) > 0 ? num(ing.lossPercentage) : (num(ing.loss) > 0 ? (num(ing.loss) < 1 ? num(ing.loss) * 100 : num(ing.loss)) : 0);
  return {
    quantity: num(ing.quantity), unit: ing.unit, ingredientId: ing.ingredientId, ingredientName: nome,
    name: (f && f.name) || nome,
    category: (f && f.category) || ing.category || 'Sem Categoria',
    unitType: (f && f.unitType) || ing.unitType || 'weight',
    costPerUnit: (f && (f.costPerUnit || f.price)) || 0,
    unitSize: (f && f.unitSize) || 1000,
    unitCost: num(ing.unitCost), unit_cost: (f && (f.unit_cost || f.unitCost)) || num(ing.unitCost),
    lossPercentage: lp, yieldMultiplier: num(ing.yieldMultiplier, 1) || 1,
    isDiscarded: !!ing.isDiscarded
  };
}

/** Item de cardápio com os dados atuais do prato (porções por pessoa e id do item ficam) */
function itemDoPrato(item, prato, formato, cadastro) {
  const ings = prato.ingredients || [];
  const novo = {
    ...item,
    dishName: prato.name || item.dishName,
    dishCategory: prato.category || item.dishCategory,
    dishCost: num(prato.totalCost),
    servings: num(prato.servings, 1) || 1,
    totalWeight: num(prato.totalWeight),
    useWeightCalculation: !!prato.useWeightCalculation,
    profitMargin: num(prato.profitMargin),
    suggestedPrice: num(prato.suggestedPrice),
    dishIngredients: formato === 'salvo' ? ings.map(i => ingredienteSalvo(i, cadastro || [])) : ings
  };
  if ('dishType' in item || formato !== 'salvo') novo.dishType = novo.dishCategory;
  if ('dishServings' in item || formato !== 'salvo') novo.dishServings = novo.servings;
  if (formato !== 'salvo' || 'dishCostPerPerson' in item) Object.assign(novo, custoPorPessoa(novo));
  return novo;
}

// O que conta como "mudou" (para avisar quais pratos mudaram)
const assinaturaIngs = l => (l || []).map(i => [i.ingredientId || i.ingredientName || i.name, num(i.quantity), i.unit,
  Math.round(num(i.lossPercentage) * 100), Math.round(num(i.yieldMultiplier, 1) * 1000), !!i.isDiscarded].join(':')).sort().join('|');
function mudou(a, b) {
  return a.dishName !== b.dishName || (a.dishCategory || '') !== (b.dishCategory || '') ||
    Math.abs(num(a.dishCost) - num(b.dishCost)) > 0.005 || num(a.servings, 1) !== num(b.servings, 1) ||
    Math.abs(num(a.totalWeight) - num(b.totalWeight)) >= 0.5 || !!a.useWeightCalculation !== !!b.useWeightCalculation ||
    Math.abs(num(a.profitMargin) - num(b.profitMargin)) > 0.001 || Math.abs(num(a.suggestedPrice) - num(b.suggestedPrice)) > 0.005 ||
    assinaturaIngs(a.dishIngredients) !== assinaturaIngs(b.dishIngredients);
}

/**
 * Atualiza uma lista de itens de cardápio.
 * @returns {{ itens, mudaram: string[], excluidos: string[], iguais: number }}
 */
async function atualizarItens(itens, { formato = 'atual', cache = new Map(), cadastro } = {}) {
  const out = [], mudaram = [], excluidos = [];
  let iguais = 0;
  for (const it of itens || []) {
    if (!it || !it.dishId) { out.push(it); continue; }
    if (!cache.has(it.dishId)) cache.set(it.dishId, await buscarPrato(it.dishId));
    const prato = cache.get(it.dishId);
    if (!prato) { excluidos.push(it.dishName || 'Prato'); out.push(it); continue; }
    const novo = itemDoPrato(it, prato, formato, cadastro);
    if (mudou(it, novo)) { novo.updatedAt = new Date().toISOString(); mudaram.push(novo.dishName); out.push(novo); }
    else { iguais++; out.push(it); }
  }
  return { itens: out, mudaram, excluidos, iguais };
}

function semInternet() { return typeof navigator !== 'undefined' && navigator.onLine === false; }

/** Cardápio do evento (aba Cardápio) */
async function atualizarCardapioAtual() {
  if (semInternet()) throw new Error('Sem internet. Conecte-se para buscar os pratos atualizados.');
  const mm = window.menuManager;
  const menu = await mm.getMenu();
  const r = await atualizarItens(menu, { formato: 'atual' });
  if (r.mudaram.length) await mm.restoreMenu(r.itens);
  return r;
}

function gerenciadorSalvos() {
  return (window.ManagerHelper && window.ManagerHelper.getSavedMenusManager && window.ManagerHelper.getSavedMenusManager()) ||
    (window.PrecificacaoAPI && window.PrecificacaoAPI.savedMenusManager) || window.savedMenusManager;
}
const pratosDoSalvo = m => (m.menuData && Array.isArray(m.menuData.dishes)) ? m.menuData.dishes : (m.dishes || []);

/**
 * Cardápios salvos (aba Salvos). ids = só esses (senão todos).
 * @returns {{ cardapios: [{ id, name, mudaram, excluidos }], atualizados, emDia, excluidos: string[], erros: string[] }}
 */
async function atualizarSalvos(ids) {
  if (semInternet()) throw new Error('Sem internet. Conecte-se para buscar os pratos atualizados.');
  const man = gerenciadorSalvos();
  if (!man) throw new Error('Cardápios salvos indisponíveis');
  let menus = await man.getAll();
  if (ids && ids.length) menus = menus.filter(m => ids.includes(m.id));
  const cadastro = (window.eventState && window.eventState.ingredientsDatabase) || [];
  const cache = new Map();
  const res = { cardapios: [], atualizados: 0, emDia: 0, excluidos: [], erros: [] };
  for (const m of menus) {
    const r = await atualizarItens(pratosDoSalvo(m), { formato: 'salvo', cache, cadastro });
    r.excluidos.forEach(n => { if (!res.excluidos.includes(n)) res.excluidos.push(n); });
    if (!r.mudaram.length) { res.emDia++; continue; }
    const base = m.menuData && typeof m.menuData === 'object' ? m.menuData : { eventType: m.eventType || null };
    const corpo = { name: m.name, description: m.description, menuData: { ...base, dishes: r.itens } };
    try {
      const out = man.updateMenu ? await man.updateMenu(m.id, corpo)
        : await man.saveItem({ ...m, eventType: base.eventType, dishes: r.itens });
      if (out && out.success === false) throw new Error(out.message || 'erro');
      res.atualizados++;
      res.cardapios.push({ id: m.id, name: m.name, mudaram: r.mudaram, excluidos: r.excluidos });
    } catch (e) {
      res.erros.push(m.name + (e && e.message ? ` (${e.message})` : ''));
    }
  }
  return res;
}

const lista = (arr, max = 6) => arr.length <= max ? arr.join(', ') : arr.slice(0, max).join(', ') + ` e mais ${arr.length - max}`;
function textoResumo(r, tipo) {
  const linhas = [];
  if (tipo === 'atual') {
    if (r.mudaram.length) linhas.push(`✅ ${r.mudaram.length} prato(s) atualizado(s): ${lista(r.mudaram)}.`);
    else linhas.push('✅ Os pratos do cardápio já estavam atualizados.');
  } else {
    if (r.atualizados) linhas.push(`✅ ${r.atualizados} cardápio(s) atualizado(s): ${lista(r.cardapios.map(c => c.name))}.`);
    if (r.emDia) linhas.push(`${r.atualizados ? '' : '✅ '}${r.emDia} cardápio(s) já estava(m) em dia.`);
    if (!r.atualizados && !r.emDia && !r.erros.length) linhas.push('Nenhum cardápio salvo.');
    if (r.erros.length) linhas.push(`❌ Não foi possível salvar: ${lista(r.erros)}.`);
  }
  if (r.excluidos.length) linhas.push(`⚠️ Prato(s) excluído(s) do cadastro, mantido(s) como estava(m): ${lista(r.excluidos)}.`);
  linhas.push('As porções por pessoa foram mantidas.');
  return linhas.join('\n\n');
}

window.MenuRefresh = { atualizarCardapioAtual, atualizarSalvos, atualizarItens, itemDoPrato, textoResumo };
})();
