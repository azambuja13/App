(function () {
'use strict';
/**
 * Regras de preço da empresa (out/2026)
 * - Configurações em user-settings → settingsData.pricing (PATCH, mescla).
 *   Sem login/nuvem: guarda no localStorage.
 * - Cálculo da proposta usado pelo ProposalBuilderSimple (e testável no Node).
 *
 * Conceitos:
 *   Markup  = quanto se soma ao custo:  preço = custo × (1 + markup%)
 *   Margem  = quanto do preço é lucro: margem = (preço − custo) ÷ preço
 *   CMV     = custo ÷ preço (food cost)
 *   Divisor = preço = custo direto ÷ (1 − impostos% − taxas% − custos fixos% − lucro%)
 */
const DEFAULTS = {
  taxesPct: 0,            // impostos sobre a venda (ex.: Simples Nacional)
  cardFeesPct: 0,         // taxas de cartão/maquininha/comissão
  fixedCostsPct: 0,       // custos fixos rateados (% do faturamento)
  targetProfitPct: 20,    // lucro desejado (% do preço) - usado no método do divisor
  serviceMarkupPct: 0,    // markup sobre apoio, mão de obra e transporte
  inflationMonthlyPct: 1, // correção mensal dos insumos até o evento
  defaultPricingMode: 'markup' // 'markup' | 'divisor'
};
const LS_KEY = 'precificacao_pricing_settings';
const num = (v, d = 0) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : d; };

function get() {
  let s = null;
  try { s = window.userSettings && window.userSettings.pricing; } catch (e) {}
  if (!s) { try { s = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) {} }
  const out = { ...DEFAULTS, ...(s || {}) };
  for (const k of Object.keys(DEFAULTS)) if (k !== 'defaultPricingMode') out[k] = num(out[k], DEFAULTS[k]);
  return out;
}

async function save(partial) {
  const novo = { ...get(), ...partial };
  try { localStorage.setItem(LS_KEY, JSON.stringify(novo)); } catch (e) {}
  try { window.userSettings = { ...(window.userSettings || {}), pricing: novo }; } catch (e) {}
  const token = (() => { try { return localStorage.getItem('accessToken'); } catch (e) { return null; } })();
  const base = window.APP_CONFIG && window.APP_CONFIG.backend && window.APP_CONFIG.backend.baseURL;
  if (token && base) {
    const r = await fetch(`${base}/api/user-settings`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ partialSettings: { pricing: novo } })
    });
    if (!r.ok) throw new Error('Não foi possível salvar na nuvem (HTTP ' + r.status + ')');
  }
  try { window.dispatchEvent(new CustomEvent('pricing-settings-updated', { detail: novo })); } catch (e) {}
  return novo;
}

/** Meses inteiros (arredondados para cima) de hoje até a data do evento (YYYY-MM-DD). */
function monthsUntil(dateStr, today) {
  if (!dateStr) return 0;
  const d = new Date(String(dateStr).slice(0, 10) + 'T12:00:00');
  if (isNaN(d)) return 0;
  const t = today ? new Date(today) : new Date();
  const days = (d - t) / 86400000;
  return days > 0 ? Math.ceil(days / 30.4375 - 1e-9) : 0;
}

/**
 * Calcula a proposta.
 * p = { perPersonCost, perPersonPrice, itemsCostPerPerson, guests,
 *       totalType: 'menu_price'|'menu_cost'|'items',
 *       supportCost, laborCost, transportCost,
 *       months, pricingMode: 'markup'|'divisor', extraPct, settings }
 */
function calcProposal(p) {
  const s = { ...DEFAULTS, ...(p.settings || {}) };
  const g = Math.max(0, num(p.guests));
  const months = Math.max(0, Math.round(num(p.months)));
  const infl = Math.pow(1 + num(s.inflationMonthlyPct) / 100, months);
  const mode = p.pricingMode === 'divisor' ? 'divisor' : 'markup';
  const type = p.totalType === 'items' ? 'items' : (p.totalType === 'menu_cost' ? 'menu_cost' : 'menu_price');

  // Comida: custo real (sempre) e preço (no markup, com o markup dos pratos)
  const perCost = type === 'items' ? num(p.itemsCostPerPerson) : num(p.perPersonCost);
  const foodCost = perCost * g * infl;
  const foodPriceBase = (mode === 'markup' && type === 'menu_price') ? num(p.perPersonPrice) * g * infl : foodCost;

  // Serviços: apoio corrige com a inflação (insumo); mão de obra e transporte não
  const support = num(p.supportCost) * infl;
  const labor = num(p.laborCost);
  const transport = num(p.transportCost);
  const services = support + labor + transport;
  const inflationAmount = (perCost * g + num(p.supportCost)) * (infl - 1);

  const directCost = foodCost + services;
  const pctSum = num(s.taxesPct) + num(s.cardFeesPct) + num(s.fixedCostsPct);
  let subtotal, divisorInvalid = false, servicesPrice = services;
  if (mode === 'divisor') {
    const denom = 1 - (pctSum + num(s.targetProfitPct)) / 100;
    if (denom <= 0.05) { divisorInvalid = true; subtotal = directCost; }
    else subtotal = directCost / denom;
  } else {
    servicesPrice = services * (1 + num(s.serviceMarkupPct) / 100);
    subtotal = foodPriceBase + servicesPrice;
  }
  const extraPct = num(p.extraPct);
  const finalTotal = subtotal * (1 + extraPct / 100);

  // Resultado estimado (descontando impostos, taxas e custos fixos sobre o preço)
  const salesDeductions = finalTotal * pctSum / 100;
  const profit = finalTotal - directCost - salesDeductions;
  const r2 = v => Math.round(v * 100) / 100;
  return {
    mode, type, guests: g, months, inflationFactor: infl,
    foodCost: r2(foodCost), foodPrice: r2(mode === 'markup' ? foodPriceBase : foodCost),
    support: r2(support), labor: r2(labor), transport: r2(transport),
    servicesPrice: r2(servicesPrice), inflationAmount: r2(inflationAmount),
    directCost: r2(directCost), subtotal: r2(subtotal), extraPct,
    finalTotal: r2(finalTotal), finalTotalRounded: Math.ceil(finalTotal - 1e-9),
    salesDeductions: r2(salesDeductions), profit: r2(profit),
    profitPct: finalTotal > 0 ? r2(profit / finalTotal * 100) : 0,
    markupOnCostPct: directCost > 0 ? r2((finalTotal / directCost - 1) * 100) : 0,
    cmvPct: finalTotal > 0 ? r2(foodCost / finalTotal * 100) : 0,
    pricePerPerson: g > 0 ? r2(finalTotal / g) : 0,
    divisorInvalid,
    doubleMargin: mode === 'markup' && type === 'menu_price' && extraPct > 0,
    noProfit: profit <= 0.009
  };
}

/** Indicadores de um preço a partir do custo (para a tela do prato). */
function indicators(cost, price) {
  cost = num(cost); price = num(price);
  if (!(cost > 0) || !(price > 0)) return null;
  return { markupPct: (price / cost - 1) * 100, marginPct: (price - cost) / price * 100, cmvPct: cost / price * 100 };
}

const api = { DEFAULTS, get, save, monthsUntil, calcProposal, indicators };
if (typeof window !== 'undefined') window.PricingRules = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
