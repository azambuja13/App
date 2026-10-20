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
  cmvTargetPct: 30,       // CMV desejado dos pratos (custo ÷ preço) — meta das cores e do botão "usar meta"
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
  const token = (() => { try { return localStorage.getItem('accessToken'); } catch (e) { return null; } })();
  const api = window.PrecificacaoAPI && window.PrecificacaoAPI.api;
  if (token && api && typeof api.request === 'function') {
    // Pelo cliente da API: renova o login sozinho se o token tiver vencido
    try {
      await api.request('/api/user-settings', { method: 'PATCH', body: JSON.stringify({ partialSettings: { pricing: novo } }) });
    } catch (e) {
      throw new Error('Não foi possível salvar na nuvem. Confira a internet e tente de novo. (' + (e.message || 'erro') + ')');
    }
  }
  // Só aplica depois de salvar na nuvem (sem login: só neste aparelho)
  try { localStorage.setItem(LS_KEY, JSON.stringify(novo)); } catch (e) {}
  try { window.userSettings = { ...(window.userSettings || {}), pricing: novo }; } catch (e) {}
  try { window.dispatchEvent(new CustomEvent('pricing-settings-updated', { detail: novo })); } catch (e) {}
  return novo;
}

/** Meses inteiros (arredondados) de hoje até a data do evento (YYYY-MM-DD). */
function monthsUntil(dateStr, today) {
  if (!dateStr) return 0;
  const d = new Date(String(dateStr).slice(0, 10) + 'T12:00:00');
  if (isNaN(d)) return 0;
  const t = today ? new Date(today) : new Date();
  const days = (d - t) / 86400000;
  // Meses arredondados (evento em até ~15 dias = 0; 20 dias = 1; 50 dias = 2)
  return days > 0 ? Math.max(0, Math.round(days / 30.4375)) : 0;
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
  // Correção mostrada = o que ela realmente somou no preço. No markup com preço do cardápio a correção
  // incide sobre o PREÇO dos pratos (e o apoio também leva o markup de serviços); antes mostrava só sobre o custo.
  const foodBaseNoInfl = (mode === 'markup' && type === 'menu_price') ? num(p.perPersonPrice) * g : perCost * g;
  const supportFactor = mode === 'markup' ? (1 + num(s.serviceMarkupPct) / 100) : 1;
  const inflationAmount = (foodBaseNoInfl + num(p.supportCost) * supportFactor) * (infl - 1);

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
    finalTotal: r2(finalTotal), finalTotalRounded: Math.ceil(r2(finalTotal) - 1e-9),
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

/**
 * Total do evento como o Resumo/Dados do evento mostram, com as mesmas regras da proposta:
 * comida e apoio corrigidos até o evento; no modo markup os serviços (apoio, mão de obra,
 * transporte) levam o markup de serviços; arredondado para cima em reais (igual à proposta).
 * food = comida (itens, custo do cardápio ou preço do cardápio) para todos os convidados.
 */
function eventTotal(food, support, labor, transport, mult, settings) {
  const s = settings || get();
  const m = num(mult, 1) > 0 ? num(mult, 1) : 1;
  const smk = s.defaultPricingMode === 'divisor' ? 0 : num(s.serviceMarkupPct);
  const services = (num(support) * m + num(labor) + num(transport)) * (1 + smk / 100);
  const total = num(food) * m + services;
  return Math.ceil(Math.round(total * 100) / 100 - 1e-9);
}

/** Valor por pessoa como no PDF da proposta (centavos arredondados). */
function perPerson(total, guests) {
  const g = Math.max(0, num(guests));
  return g > 0 ? Math.round(num(total) * 100 / g) / 100 : 0;
}

/** Indicadores de um preço a partir do custo (para a tela do prato). */
function indicators(cost, price) {
  cost = num(cost); price = num(price);
  if (!(cost > 0) || !(price > 0)) return null;
  return { markupPct: (price / cost - 1) * 100, marginPct: (price - cost) / price * 100, cmvPct: cost / price * 100 };
}

// ===== CMV (custo da mercadoria vendida = custo ÷ preço) =====
// Relação com o markup: CMV = 1 ÷ (1 + markup) → markup 233,3% = CMV 30%
function markupFromCmv(cmvPct) { cmvPct = num(cmvPct); return cmvPct > 0 ? (100 / cmvPct - 1) * 100 : 0; }
function cmvFromMarkup(markupPct) { markupPct = num(markupPct); return markupPct > -100 ? 100 / (1 + markupPct / 100) : 0; }
/** Nível do CMV em relação à meta: ok (≤ meta), atencao (até meta + 5 pontos), alto (acima) */
function cmvStatus(cmvPct, targetPct) {
  const meta = num(targetPct, get().cmvTargetPct) || 30;
  const v = Math.round(num(cmvPct) * 10) / 10; // 30,02% (preço arredondado em centavos) conta como 30%
  if (!(v > 0)) return null;
  if (v <= meta) return { nivel: 'ok', cor: '#15803d', fundo: '#dcfce7', rotulo: 'dentro da meta', meta };
  if (v <= meta + 5) return { nivel: 'atencao', cor: '#a16207', fundo: '#fef9c3', rotulo: 'um pouco acima da meta', meta };
  return { nivel: 'alto', cor: '#b91c1c', fundo: '#fee2e2', rotulo: 'acima da meta', meta };
}
/** CMV de um prato salvo: custo e preço na mesma base (por porção ou por 100 g, como o preço sugerido) */
function dishCmv(dish) {
  if (!dish) return null;
  const custoTotal = num(dish.totalCost);
  const preco = num(dish.sellingPrice) || num(dish.suggestedPrice);
  if (!(custoTotal > 0) || !(preco > 0)) return null;
  const servings = num(dish.servings);
  const peso = num(dish.totalWeight);
  let custo;
  if (dish.useWeightCalculation) custo = servings > 0 ? custoTotal / servings : 0;
  else custo = peso > 0 ? custoTotal / peso * 100 : 0;
  if (!(custo > 0)) return null;
  return { custo, preco, cmvPct: custo / preco * 100, base: dish.useWeightCalculation ? 'porção' : '100 g' };
}

const api = { DEFAULTS, get, save, monthsUntil, calcProposal, indicators, eventTotal, perPerson, markupFromCmv, cmvFromMarkup, cmvStatus, dishCmv };
if (typeof window !== 'undefined') window.PricingRules = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
