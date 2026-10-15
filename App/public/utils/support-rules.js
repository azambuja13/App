(function () {
'use strict';
/**
 * Apoio & Logística automático (out/2026)
 *
 * Cada item de apoio pode ter uma REGRA de quantidade:
 *   manual    → a pessoa digita a quantidade (comportamento antigo)
 *   perGuest  → fator × convidados          (ex.: 4 guardanapos por convidado)
 *   perGroup  → fator a cada N convidados   (ex.: 1 churrasqueiro a cada 30 convidados;
 *               arredonda o grupo para cima: 100 convidados → 4 grupos de 30)
 *   perMeatKg → fator × kg de carne          (ex.: 1 kg de carvão por kg de carne)
 *   perHour   → fator × horas de evento      (ex.: 2 kg de gelo por hora)
 *   fixed     → fator por evento             (ex.: 2 rolos de papel alumínio)
 *
 * E uma EMBALAGEM de compra:
 *   packSize > 1 → "vem em pacote com N unidades"; o custo (cost) é o PREÇO DO PACOTE
 *                  e a quantidade (quantity) vira o nº de pacotes, arredondado para cima.
 *   sem pacote   → o custo é por unidade (como antes).
 *
 * O total continua sendo cost × quantity (o cálculo do evento não muda).
 * Itens antigos não têm regra → ficam "manual" e não mudam nada.
 * Se a pessoa digitar a quantidade de um item automático, ele vira manual
 * (qtyOverride) até tocar em "voltar ao automático".
 *
 * Kits: listas prontas por tipo de evento. Os kits padrão vêm daqui; os kits
 * da pessoa ficam em user-settings → settingsData.supportKits.
 */
const num = (v, d = 0) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : d; };
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const RULES = {
  manual:    { label: 'Quantidade manual',    short: 'manual' },
  perGuest:  { label: 'Por convidado',        short: 'por convidado' },
  perGroup:  { label: 'A cada X convidados',  short: 'a cada X convidados' },
  perMeatKg: { label: 'Por kg de carne',      short: 'por kg de carne' },
  perHour:   { label: 'Por hora de evento',   short: 'por hora' },
  fixed:     { label: 'Fixo por evento',      short: 'por evento' }
};

function isAuto(item) {
  return !!(item && item.rule && item.rule !== 'manual' && RULES[item.rule]);
}

function hasPack(item) {
  const p = num(item && item.packSize, 0);
  return p > 0 && p !== 1;
}

/** Base do cálculo a partir do estado do evento */
function baseFrom({ guests, itemsCalculated, labor } = {}) {
  // kg de carne = proteínas por peso da lista de compras (quantidade bruta a comprar)
  let meatKg = 0;
  (itemsCalculated || []).forEach(it => {
    if (!it || it.active === false) return;
    if (it.unitType === 'unit' || String(it.unit || '').toLowerCase() === 'un') return;
    if (String(it.category || '') !== 'Proteínas') return;
    meatKg += num(it.qtyInKgL, 0);
  });
  // horas de evento = maior jornada da mão de obra
  let hours = num(labor && labor.hours, 0);
  if (labor && Array.isArray(labor.team)) labor.team.forEach(r => { hours = Math.max(hours, num(r.hours, 0)); });
  return { guests: num(guests, 0), meatKg: Math.round(meatKg * 100) / 100, hours };
}

/** Quantas unidades o evento precisa (null = item manual) */
function neededUnits(item, base) {
  if (!isAuto(item)) return null;
  const f = num(item.factor, 0);
  const b = base || {};
  switch (item.rule) {
    case 'perGuest': return f * num(b.guests, 0);
    case 'perGroup': {
      const g = num(item.groupSize, 0);
      return g > 0 ? f * Math.max(0, Math.ceil(num(b.guests, 0) / g - 1e-9)) : 0;
    }
    case 'perMeatKg': return f * num(b.meatKg, 0);
    case 'perHour': return f * num(b.hours, 0);
    case 'fixed': return f;
    default: return null;
  }
}

/** Quantidade que entra no custo (nº de pacotes ou de unidades). null = manual */
function computeQuantity(item, base) {
  const need = neededUnits(item, base);
  if (need == null) return null;
  if (need <= 0) return 0;
  if (hasPack(item)) return Math.ceil(need / num(item.packSize, 1) - 1e-9);
  const u = norm(item.unit || 'un');
  if (u === 'un' || u === 'unid' || u === 'unidade' || u === 'unidades' || u === '') return Math.ceil(need - 1e-9);
  return Math.ceil(need * 10 - 1e-9) / 10;
}

const fmtN = n => (Math.round(n * 100) / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const brl = n => 'R$ ' + num(n, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// "rolo" → "rolos" quando for mais de 1 (abreviações como un, kg, g, l, ml ficam iguais)
function plural(u, n) {
  const x = String(u || '');
  if (!(n > 1) || x.length <= 2 || /^(un|unid|kg|g|ml|l|lt|cx|pct|m)$/i.test(x) || /s$/i.test(x)) return x;
  return /[aeiou]$/i.test(x) ? x + 's' : (/r$|z$/i.test(x) ? x + 'es' : x);
}

/** Textos para a tela */
function describe(item, base) {
  const unitRaw = item.unit || 'un';
  const unit = unitRaw;
  const packLabel = item.packLabel || 'pacote';
  const out = { auto: isAuto(item), override: !!item.qtyOverride, need: null, ruleText: '', buyText: '', priceText: '' };
  out.priceText = hasPack(item)
    ? `${brl(item.cost)} / ${packLabel} de ${fmtN(num(item.packSize))} ${plural(unit, num(item.packSize))}`
    : `${brl(item.cost)} / ${unit}`;
  const q = num(item.quantity, 0);
  if (out.auto) {
    const need = neededUnits(item, base);
    out.need = need;
    const f = fmtN(num(item.factor, 0));
    const b = base || {};
    const fn = num(item.factor, 0);
    const g = num(item.groupSize, 0);
    out.ruleText = item.rule === 'perGroup' ? (g > 0
        ? `${f} ${plural(unit, fn)} a cada ${fmtN(g)} convidados (${fmtN(num(b.guests))} convidados) = ${fmtN(need)} ${plural(unit, need)}`
        : 'Informe a cada quantos convidados')
      : item.rule === 'perGuest' ? `${f} ${plural(unit, fn)} por convidado × ${fmtN(num(b.guests))} = ${fmtN(need)} ${plural(unit, need)}`
      : item.rule === 'perMeatKg' ? `${f} ${plural(unit, fn)} por kg de carne × ${fmtN(num(b.meatKg))} kg = ${fmtN(need)} ${plural(unit, need)}`
      : item.rule === 'perHour' ? `${f} ${plural(unit, fn)} por hora × ${fmtN(num(b.hours))} h = ${fmtN(need)} ${plural(unit, need)}`
      : `${f} ${plural(unit, fn)} por evento`;
  }
  out.buyText = hasPack(item)
    ? `${fmtN(q)} ${plural(packLabel, q) || packLabel} de ${fmtN(num(item.packSize))} ${plural(unit, num(item.packSize))}`
    : `${fmtN(q)} ${plural(unit, q)}`;
  return out;
}

/** Recalcula as quantidades dos itens automáticos. Devolve a MESMA lista se nada mudou. */
function applyRules(support, base) {
  if (!Array.isArray(support)) return support;
  let mudou = false;
  const out = support.map(it => {
    if (!isAuto(it) || it.qtyOverride) return it;
    const q = computeQuantity(it, base);
    if (q == null || Math.abs(num(it.quantity, 0) - q) < 1e-9) return it;
    mudou = true;
    return { ...it, quantity: q };
  });
  return mudou ? out : support;
}

// ---------------------------------------------------------------------------
// Kits
// ---------------------------------------------------------------------------
const K = (name, rule, factor, unit, packSize, packLabel) => ({ name, rule, factor, unit, packSize: packSize || 0, packLabel: packLabel || '' });
const DEFAULT_KITS = [
  { id: 'padrao-churrasco', name: 'Churrasco completo', builtin: true, items: [
    K('Carvão', 'perMeatKg', 1, 'kg', 5, 'saco'),
    K('Lenha', 'fixed', 1, 'feixe'),
    K('Acendedor / álcool', 'fixed', 1, 'un'),
    K('Papel alumínio', 'fixed', 2, 'rolo'),
    K('Guardanapos', 'perGuest', 4, 'un', 50, 'pacote'),
    K('Pratos', 'perGuest', 1.5, 'un', 10, 'pacote'),
    K('Talheres', 'perGuest', 1.5, 'un', 50, 'pacote'),
    K('Copos', 'perGuest', 3, 'un', 100, 'pacote'),
    K('Gelo', 'perGuest', 0.5, 'kg', 5, 'saco')
  ] },
  { id: 'padrao-coquetel', name: 'Coquetel / finger food', builtin: true, items: [
    K('Guardanapos', 'perGuest', 6, 'un', 50, 'pacote'),
    K('Pratos', 'perGuest', 2, 'un', 10, 'pacote'),
    K('Copos', 'perGuest', 4, 'un', 100, 'pacote'),
    K('Palitos', 'perGuest', 5, 'un', 100, 'pacote'),
    K('Gelo', 'perGuest', 0.5, 'kg', 5, 'saco')
  ] },
  { id: 'padrao-servico', name: 'Só serviço de churrasqueiro', builtin: true, items: [
    K('Carvão', 'perMeatKg', 1, 'kg', 5, 'saco'),
    K('Acendedor / álcool', 'fixed', 1, 'un'),
    K('Papel alumínio', 'fixed', 1, 'rolo'),
    K('Luvas descartáveis', 'fixed', 1, 'pacote')
  ] }
];
const LS_KITS = 'precificacao_support_kits';

function userKits() {
  let k = null;
  try { k = window.userSettings && window.userSettings.supportKits; } catch (e) {}
  if (!Array.isArray(k)) { try { k = JSON.parse(localStorage.getItem(LS_KITS) || 'null'); } catch (e) {} }
  return Array.isArray(k) ? k.filter(x => x && x.name && Array.isArray(x.items)) : [];
}

function getKits() {
  return [...userKits(), ...DEFAULT_KITS];
}

async function saveUserKits(kits) {
  const lista = (kits || []).map(k => ({ id: k.id, name: k.name, items: k.items }));
  const token = (() => { try { return localStorage.getItem('accessToken'); } catch (e) { return null; } })();
  const api = window.PrecificacaoAPI && window.PrecificacaoAPI.api;
  if (token && api && typeof api.request === 'function') {
    try {
      await api.request('/api/user-settings', { method: 'PATCH', body: JSON.stringify({ partialSettings: { supportKits: lista } }) });
    } catch (e) {
      throw new Error('Não foi possível salvar o kit na nuvem. Confira a internet e tente de novo. (' + (e.message || 'erro') + ')');
    }
  }
  try { localStorage.setItem(LS_KITS, JSON.stringify(lista)); } catch (e) {}
  try { window.userSettings = { ...(window.userSettings || {}), supportKits: lista }; } catch (e) {}
  return lista;
}

/** Monta um kit a partir da lista atual (só itens marcados) */
function kitFromSupport(name, support) {
  return {
    id: 'kit-' + Date.now(),
    name: String(name || '').trim(),
    items: (support || []).filter(i => i.active).map(i => ({
      name: i.name,
      rule: i.rule || 'manual',
      factor: isAuto(i) ? num(i.factor, 0) : 0,
      groupSize: num(i.groupSize, 0),
      quantity: isAuto(i) ? 0 : num(i.quantity, 0),
      unit: i.unit || 'un',
      packSize: num(i.packSize, 0),
      packLabel: i.packLabel || '',
      cost: num(i.cost, 0)
    }))
  };
}

/**
 * Aplica um kit: a lista passa a ser a do kit. O preço vem do item de mesmo nome
 * que já existe (preço mais recente da pessoa); os itens que não estão no kit
 * ficam na lista, desmarcados (nada se perde).
 */
function applyKit(kit, support, base) {
  const atuais = Array.isArray(support) ? support : [];
  const usados = new Set();
  // Mesmo nome, ou nome que começa com o do kit ("Carvão (saco 5kg)" ↔ "Carvão")
  const acha = nome => {
    const n = norm(nome);
    const livres = atuais.filter(i => !usados.has(i));
    return livres.find(i => norm(i.name) === n)
      || livres.find(i => { const m = norm(i.name); return m.startsWith(n) && /^[^a-z0-9]/.test(m.slice(n.length)); })
      || null;
  };
  const t = Date.now();
  const novos = (kit && kit.items || []).map((k, idx) => {
    const ex = acha(k.name);
    if (ex) usados.add(ex);
    const item = {
      id: ex ? ex.id : t + idx + 1,
      name: ex ? ex.name : k.name,
      rule: k.rule || 'manual',
      factor: num(k.factor, 0),
      groupSize: num(k.groupSize, 0),
      unit: k.unit || (ex && ex.unit) || 'un',
      packSize: num(k.packSize, 0),
      packLabel: k.packLabel || '',
      cost: 0,
      quantity: num(k.quantity, 0),
      qtyOverride: false,
      active: true
    };
    // Preço: o mais recente da pessoa; senão o do kit.
    // Item no formato novo (tem unidade): converte para a embalagem do kit.
    // Item antigo (sem unidade): não dá para saber se o preço era do pacote ou da
    // unidade → mantém o valor como está (a pessoa confere; a tela avisa).
    let cost = num(k.cost, 0);
    if (ex && num(ex.cost, 0) > 0) {
      if (ex.unit || ex.rule) {
        const precoUnit = hasPack(ex) ? num(ex.cost) / num(ex.packSize, 1) : num(ex.cost);
        cost = Math.round((hasPack(item) ? precoUnit * num(item.packSize, 1) : precoUnit) * 100) / 100;
      } else {
        cost = num(ex.cost);
        if (hasPack(item)) item.priceCheck = true; // "confira o preço" até a pessoa editar
      }
    }
    item.cost = cost;
    const q = computeQuantity(item, base);
    if (q != null) item.quantity = q;
    return item;
  });
  const resto = atuais.filter(i => !usados.has(i)).map(i => ({ ...i, active: false }));
  return [...novos, ...resto];
}

const api = { RULES, isAuto, hasPack, baseFrom, neededUnits, computeQuantity, describe, applyRules, DEFAULT_KITS, getKits, userKits, saveUserKits, kitFromSupport, applyKit, LS_KITS };
if (typeof window !== 'undefined') window.SupportRules = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
