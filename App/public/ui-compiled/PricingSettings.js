(function () {
'use strict';
/**
 * Custos da empresa para o preço (out/2026)
 * Abre com window.openPricingSettings(). Guarda em user-settings (pricing) via window.PricingRules.save().
 * Usa estilos próprios (inline): o output.css não tem todas as classes do Tailwind.
 */
const h = React.createElement;
const { useState, useEffect } = React;

const CSS = `
#pricing-host .ps-bg{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:70;display:flex;align-items:flex-end;justify-content:center}
@media (min-width:768px){#pricing-host .ps-bg{align-items:center;padding:16px}}
#pricing-host .ps{background:#fff;width:100%;max-width:620px;max-height:92vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom));font-family:system-ui,-apple-system,sans-serif;color:#111827}
@media (min-width:768px){#pricing-host .ps{border-radius:16px}}
#pricing-host .ps h2{font-size:19px;font-weight:800;margin:0}
#pricing-host .ps .muted{color:#6b7280;font-size:13px;line-height:1.45}
#pricing-host .ps .fld{display:block;margin-top:12px}
#pricing-host .ps .fld b{display:block;font-size:14px}
#pricing-host .ps .row{display:flex;gap:8px;align-items:center;margin-top:4px}
#pricing-host .ps input{width:110px;padding:9px 10px;border:1px solid #d1d5db;border-radius:10px;font-size:16px}
#pricing-host .ps .box{background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:12px;margin-top:14px;font-size:14px}
#pricing-host .ps .btn{display:inline-flex;align-items:center;justify-content:center;border-radius:10px;padding:11px 16px;font-weight:700;cursor:pointer;user-select:none;font-size:15px}
#pricing-host .ps .seg{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
#pricing-host .ps .seg > div{flex:1 1 180px;border:2px solid #e5e7eb;border-radius:10px;padding:8px 10px;cursor:pointer;font-size:13px}
#pricing-host .ps .seg > div.on{border-color:#ea580c;background:#fff7ed}
#pricing-host .ps .calc{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px}
#pricing-host .ps .calc label{display:flex;flex-direction:column;gap:4px;flex:1 1 160px}
#pricing-host .ps .calc input{width:100%;box-sizing:border-box}
#pricing-host .ps .how{background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:10px 12px;margin-top:10px;font-size:13px;line-height:1.5;color:#1e3a8a}
#pricing-host .ps .how > div > div{margin-top:3px}
`;

const FIELDS = [
  ['taxesPct', 'Impostos sobre a venda (%)', 'Alíquota efetiva que você paga sobre cada venda (ex.: Simples Nacional). Pergunte ao seu contador; em geral fica entre 4% e 15%.'],
  ['cardFeesPct', 'Taxas de cartão, maquininha e comissões (%)', 'Média do que fica com a maquininha, o banco ou quem indicou (ex.: 3%). Se recebe quase tudo por Pix, use um valor baixo.'],
  ['fixedCostsPct', 'Custos fixos (% do faturamento)', 'Quanto do faturamento vai para as contas que existem mesmo sem evento: aluguel, gás, energia, contador, veículo, pró-labore… Use a calculadora abaixo.'],
  ['targetProfitPct', 'Lucro desejado (% do preço)', 'Quanto do preço deve sobrar limpo no modo "Custos da empresa". Ex.: 20% = em uma proposta de R$ 10.000, sobram R$ 2.000.'],
  ['serviceMarkupPct', 'Markup sobre serviços (%)', 'Só no modo "Markup": quanto somar sobre apoio, mão de obra e transporte. Ex.: 10% → R$ 1.000 de serviços entram como R$ 1.100. Use 0 para repassar pelo custo.'],
  ['inflationMonthlyPct', 'Correção mensal dos insumos até o evento (%)', 'Para eventos daqui a alguns meses: corrige comida e apoio por mês até a data do evento. Ex.: 1% ao mês, evento em 6 meses ≈ +6,2%.'],
  ['cmvTargetPct', 'CMV desejado dos pratos (%)', 'Quanto do preço de cada prato pode ser custo de ingredientes (CMV = custo ÷ preço). Em buffet/eventos costuma ficar entre 25% e 35%. Os pratos mostram verde até a meta, amarelo até 5 pontos acima e vermelho acima disso; no cadastro, o botão "Usar meta" calcula o preço por ela.'],
  ['proteinSafetyPct', 'Margem de segurança das proteínas (%)', 'Carne a mais para não faltar: os ingredientes da categoria Proteínas saem esse % a mais na lista de compras e no custo (depois da perda). Ex.: 15% → 48 kg viram 55,2 kg. Cada evento pode usar outro valor em Dados do Evento. Use 0 para desligar.']
];

// ====== Ajustar todos os pratos ao CMV desejado (out/2026) ======
const brlA = x => (Number(x) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pctA = x => (Number(x) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
async function atualizarDepoisDoAjuste() {
  // pratos e cardápios salvos guardados no aparelho: buscar de novo; cardápio do evento: cópia nova dos pratos
  try { const dm = window.PrecificacaoAPI && window.PrecificacaoAPI.dishManager; if (dm && dm.loadDishes) { dm.cacheTime = null; await dm.loadDishes(true); } } catch (e) {}
  try { const sm = window.PrecificacaoAPI && window.PrecificacaoAPI.savedMenusManager; if (sm) { sm.menus = []; if (sm.loadMenus) await sm.loadMenus(); } } catch (e) {}
  try { if (window.MenuRefresh) await window.MenuRefresh.atualizarCardapioAtual(); } catch (e) {}
  try { window.dispatchEvent(new CustomEvent('dishes-prices-updated')); window.dispatchEvent(new Event('menu-updated')); } catch (e) {}
}
function CmvAjuste({ cmv, salvoCmv }) {
  const P = window.PricingRules;
  const api = window.PrecificacaoAPI && window.PrecificacaoAPI.api;
  const [prev, setPrev] = useState(null);      // resposta da prévia
  const [scope, setScope] = useState('above');
  const [estado, setEstado] = useState('');     // '', 'carregando', 'aplicando'
  const [msg, setMsg] = useState(null);
  const valido = cmv >= 9.1 && cmv < 100;
  if (!api || !api.applyDishCmv) return null;
  const previa = async () => {
    setMsg(null);
    if (!valido) { setMsg({ ok: false, t: 'Informe um CMV entre 9,1% e 99%.' }); return; }
    setEstado('carregando');
    try { const r = await api.applyDishCmv({ cmvPct: cmv, scope: 'all', dryRun: true }); setPrev(r.data || r); setScope('above'); }
    catch (e) { setMsg({ ok: false, t: 'Não foi possível calcular: ' + (e.message || 'erro') }); }
    finally { setEstado(''); }
  };
  const lista = prev ? prev.changes.filter(c => scope === 'all' || c.situacao !== 'abaixo') : [];
  const aplicar = async () => {
    if (!lista.length) return;
    setEstado('aplicando'); setMsg(null);
    try {
      if (Math.abs(cmv - salvoCmv) > 0.001) await P.save({ cmvTargetPct: cmv }); // a meta usada passa a ser a meta salva
      const r = await api.applyDishCmv({ cmvPct: cmv, scope });
      const d = r.data || r;
      await atualizarDepoisDoAjuste();
      setPrev(null);
      setMsg({ ok: true, t: `✅ ${d.applied} prato(s) ajustado(s) para CMV ${pctA(d.cmvPct)} (markup ${pctA(d.markupPct)}).` + (d.menusUpdated ? ` ${d.menusUpdated} cardápio(s) salvo(s) atualizado(s).` : '') + ' O cardápio do evento aberto também foi atualizado.' });
    } catch (e) { setMsg({ ok: false, t: 'Não foi possível ajustar: ' + (e.message || 'erro') }); }
    finally { setEstado(''); }
  };
  const c = prev ? prev.counts : null;
  const nAcima = prev ? prev.changes.filter(x => x.situacao !== 'abaixo').length : 0;
  const nTodos = prev ? prev.changes.length : 0;
  return h('div', { className: 'box', 'data-cmv-ajuste': 1, style: { background: '#f0fdf4', borderColor: '#bbf7d0' } },
    !prev && h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' } },
      h('div', { className: 'btn', role: 'button', 'data-testid': 'cmv-ajustar', onClick: estado ? undefined : previa, style: { background: '#15803d', color: '#fff', opacity: estado ? .6 : 1 } },
        estado === 'carregando' ? 'Calculando...' : '🎯 Ajustar todos os pratos a ' + pctA(cmv)),
      h('div', { className: 'muted', style: { flex: '1 1 200px' } }, 'Recalcula o preço sugerido de cada prato para esta meta. Antes de mudar, mostra quais pratos mudam e quanto.')),
    prev && h('div', null,
      h('b', null, `CMV ${pctA(prev.cmvPct)} = markup ${pctA(prev.markupPct)}`),
      h('div', { className: 'muted', style: { marginTop: 2 } }, `${prev.total} prato(s): ${c.acima} acima da meta, ${c.abaixo} abaixo, ${c.semPreco} sem preço, ${c.iguais} já na meta` + (c.semCusto ? `, ${c.semCusto} sem custo (ficam como estão)` : '') + '.'),
      h('div', { className: 'seg' },
        h('div', { className: scope === 'above' ? 'on' : '', role: 'button', 'data-scope': 'above', onClick: () => setScope('above') },
          h('b', null, `Só os acima da meta (${nAcima})`), h('div', { className: 'muted' }, 'O preço sobe até a meta. Os pratos com margem melhor que a meta ficam como estão.')),
        h('div', { className: scope === 'all' ? 'on' : '', role: 'button', 'data-scope': 'all', onClick: () => setScope('all') },
          h('b', null, `Todos (${nTodos})`), h('div', { className: 'muted' }, c.abaixo ? `Inclui os ${c.abaixo} abaixo da meta: esses ficam mais baratos.` : 'Todos os pratos com custo vão para a meta.'))),
      !lista.length ? h('div', { className: 'muted', style: { marginTop: 8 } }, 'Nenhum prato para mudar nesta opção.') :
      h('div', { style: { marginTop: 8, maxHeight: 220, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff' } },
        lista.map(x => h('div', { key: x.id, style: { display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 10px', borderBottom: '1px solid #f3f4f6', fontSize: 13 } },
          h('div', { style: { minWidth: 0 } }, h('div', { style: { fontWeight: 600 } }, x.name), h('div', { className: 'muted', style: { fontSize: 12 } }, (x.oldCmv != null ? 'CMV ' + pctA(x.oldCmv) : 'sem preço') + ' · custo ' + brlA(x.base) + '/' + x.unit)),
          h('div', { style: { whiteSpace: 'nowrap', textAlign: 'right' } },
            x.oldPrice ? h('span', { className: 'muted', style: { textDecoration: 'line-through', marginRight: 6 } }, brlA(x.oldPrice)) : null,
            h('b', { style: { color: x.oldPrice && x.newPrice < x.oldPrice ? '#b45309' : '#15803d' } }, brlA(x.newPrice)))))),
      h('div', { className: 'muted', style: { marginTop: 6 } }, 'Os cardápios salvos e o cardápio do evento aberto também recebem os preços novos (as porções ficam). Propostas já salvas não mudam.'),
      h('div', { style: { display: 'flex', gap: 8, marginTop: 10 } },
        h('div', { className: 'btn', role: 'button', onClick: () => setPrev(null), style: { background: '#f3f4f6', flex: 1 } }, 'Cancelar'),
        h('div', { className: 'btn', role: 'button', 'data-testid': 'cmv-aplicar', onClick: estado || !lista.length ? undefined : aplicar, style: { background: '#15803d', color: '#fff', flex: 2, opacity: estado || !lista.length ? .5 : 1 } },
          estado === 'aplicando' ? 'Ajustando...' : `Ajustar ${lista.length} prato(s)`))),
    msg ? h('div', { style: { marginTop: 8, color: msg.ok ? '#15803d' : '#b91c1c', fontWeight: 600, fontSize: 13 } }, msg.t) : null);
}

function PricingSettings({ onClose }) {
  const P = window.PricingRules;
  const [v, setV] = useState(() => { const g = P.get(); const o = { ...g }; for (const [k] of FIELDS) o[k] = String(g[k]).replace('.', ','); return o; });
  const [fixosMes, setFixosMes] = useState('');
  const [fatMes, setFatMes] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const set = (k, val) => setV(prev => ({ ...prev, [k]: val }));
  // Aceita vírgula (6,5) e ponto de milhar em reais (10.000)
  const n = x => { let t = String(x == null ? '' : x).trim(); if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, ''); const r = parseFloat(t.replace(',', '.')); return isFinite(r) ? r : 0; };

  const soma = n(v.taxesPct) + n(v.cardFeesPct) + n(v.fixedCostsPct) + n(v.targetProfitPct);
  const exemplo = soma < 95 ? 10000 / (1 - soma / 100) : null;
  const brl = x => 'R$ ' + x.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const calcFixos = n(fatMes) > 0 ? (n(fixosMes) / n(fatMes) * 100) : null;

  const salvar = async () => {
    setSaving(true); setMsg(null);
    try {
      const data = {};
      for (const [k] of FIELDS) data[k] = Math.min(100, Math.max(0, n(v[k])));
      if (data.taxesPct + data.cardFeesPct + data.fixedCostsPct + data.targetProfitPct >= 95) { setMsg({ ok: false, t: 'Impostos + taxas + custos fixos + lucro passam de 95%. Revise os valores.' }); setSaving(false); return; }
      data.defaultPricingMode = v.defaultPricingMode === 'divisor' ? 'divisor' : 'markup';
      await P.save(data);
      setMsg({ ok: true, t: 'Salvo! As próximas propostas já usam esses valores.' });
      setTimeout(onClose, 900);
    } catch (e) {
      setMsg({ ok: false, t: e.message || 'Erro ao salvar' });
    } finally { setSaving(false); }
  };

  return h('div', { className: 'ps-bg', onClick: e => { if (e.target === e.currentTarget) onClose(); } },
    h('div', { className: 'ps', role: 'dialog', 'aria-label': 'Custos da empresa' },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 } },
        h('div', null,
          h('div', { className: 'muted' }, 'Regras de preço'),
          h('h2', null, '📊 Custos da empresa')),
        h('div', { role: 'button', 'aria-label': 'Fechar', onClick: onClose, style: { fontSize: 22, cursor: 'pointer', padding: '0 6px' } }, '✕')),
      h('div', { className: 'how' },
        h('b', null, 'Como funciona'),
        h('div', { style: { marginTop: 4 } },
          h('div', null, '1. Preencha uma vez. Vale para todas as propostas novas (cada proposta guarda os valores do dia em que foi salva).'),
          h('div', null, '2. ', h('b', null, 'Modo Markup:'), ' o preço vem do markup dos pratos. Estes números servem para mostrar o ', h('b', null, 'lucro de verdade'), ' de cada proposta.'),
          h('div', null, '3. ', h('b', null, 'Modo Custos da empresa:'), ' o app calcula o preço para pagar impostos, taxas e custos fixos e ainda sobrar o lucro desejado.'))),
      FIELDS.map(([k, label, help]) => h(React.Fragment, { key: k }, h('label', { className: 'fld' },
        h('b', null, label),
        h('div', { className: 'row' },
          h('input', { type: 'text', inputMode: 'decimal', value: v[k], onChange: e => set(k, e.target.value.replace(/[^0-9.,]/g, '')), onBlur: () => set(k, String(Math.min(100, Math.max(0, n(v[k])))).replace('.', ',')) }),
          h('span', { className: 'muted' }, '%')),
        h('div', { className: 'muted', style: { marginTop: 3 } }, help),
        k === 'fixedCostsPct' ? h('div', { className: 'box', style: { background: '#f9fafb', borderColor: '#e5e7eb' } },
          h('b', null, 'Calculadora de custos fixos'),
          h('div', { className: 'muted', style: { marginTop: 2 } }, 'Valores do mês inteiro, em reais. Ex.: R$ 10.000 de custos fixos ÷ R$ 80.000 de faturamento = 12,5%.'),
          h('div', { className: 'calc' },
            h('label', null, h('span', { className: 'muted' }, 'Custos fixos do mês (R$)'),
              h('input', { type: 'text', inputMode: 'decimal', placeholder: '10.000', value: fixosMes, onChange: e => setFixosMes(e.target.value.replace(/[^0-9.,]/g, '')) })),
            h('label', null, h('span', { className: 'muted' }, 'Faturamento médio do mês (R$)'),
              h('input', { type: 'text', inputMode: 'decimal', placeholder: '80.000', value: fatMes, onChange: e => setFatMes(e.target.value.replace(/[^0-9.,]/g, '')) }))),
          calcFixos == null ? null
            : calcFixos > 60
              ? h('div', { style: { marginTop: 8, color: '#b91c1c', fontSize: 13 } }, '⚠️ Deu ' + calcFixos.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '% — os custos fixos estão maiores que o faturamento ou quase isso. Confira: o faturamento é o total vendido no mês em R$ (ex.: 80000), não a quantidade de eventos.')
              : h('div', { className: 'row', style: { marginTop: 8 } },
                  h('span', null, '= ', h('span', { style: { fontWeight: 800 } }, calcFixos.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'), ' do faturamento'),
                  h('div', { className: 'btn', role: 'button', style: { background: '#ea580c', color: '#fff', padding: '6px 10px', fontSize: 13 }, onClick: () => set('fixedCostsPct', String(Math.round(calcFixos * 10) / 10).replace('.', ',')) }, 'Usar este valor'))) : null),
        k === 'cmvTargetPct' ? h(CmvAjuste, { cmv: n(v.cmvTargetPct), salvoCmv: Number(P.get().cmvTargetPct) || 30 }) : null)),
      h('div', { className: 'fld' },
        h('b', null, 'Como calcular o preço das propostas novas'),
        h('div', { className: 'seg' },
          h('div', { className: v.defaultPricingMode !== 'divisor' ? 'on' : '', role: 'button', onClick: () => set('defaultPricingMode', 'markup') },
            h('b', null, 'Markup'), h('div', { className: 'muted' }, 'Markup de cada prato + markup de serviços')),
          h('div', { className: v.defaultPricingMode === 'divisor' ? 'on' : '', role: 'button', onClick: () => set('defaultPricingMode', 'divisor') },
            h('b', null, 'Custos da empresa'), h('div', { className: 'muted' }, 'Preço = custo ÷ (1 − impostos − taxas − fixos − lucro)')))),
      h('div', { className: 'box' },
        h('b', null, 'Exemplo com os seus números'),
        exemplo != null
          ? h('div', null, 'Evento com custo direto de ', h('b', null, brl(10000)), ' no modo Custos da empresa → preço ', h('b', null, brl(exemplo)),
              h('div', { className: 'muted' }, `10.000 ÷ (1 − ${soma.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%). Desse preço: ${brl(exemplo * (n(v.taxesPct) + n(v.cardFeesPct)) / 100)} de impostos e taxas, ${brl(exemplo * n(v.fixedCostsPct) / 100)} para custos fixos e ${brl(exemplo * n(v.targetProfitPct) / 100)} de lucro.`),
              (() => { const ded = n(v.taxesPct) + n(v.cardFeesPct) + n(v.fixedCostsPct); const lucro = 15000 - 10000 - 15000 * ded / 100;
                return h('div', { style: { marginTop: 8 } }, 'No modo Markup, se esse evento sair por ', h('b', null, brl(15000)), ', sobram ', h('b', { style: { color: lucro > 0 ? '#15803d' : '#b91c1c' } }, brl(lucro)), ' de lucro (' + (lucro / 150).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%) depois de ' + ded.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '% de impostos, taxas e custos fixos.'); })())
          : h('div', { style: { color: '#b91c1c' } }, 'A soma passou de 95%. Revise os percentuais.')),
      msg ? h('div', { style: { marginTop: 12, color: msg.ok ? '#15803d' : '#b91c1c', fontWeight: 600 } }, msg.t) : null,
      h('div', { style: { display: 'flex', gap: 8, marginTop: 16 } },
        h('div', { className: 'btn', role: 'button', onClick: onClose, style: { background: '#f3f4f6', flex: 1 } }, 'Cancelar'),
        h('div', { className: 'btn', role: 'button', onClick: saving ? undefined : salvar, style: { background: '#ea580c', color: '#fff', flex: 2, opacity: saving ? .6 : 1 } }, saving ? 'Salvando...' : 'Salvar'))));
}

function Host() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    window.openPricingSettings = () => setOpen(true);
    return () => { if (window.openPricingSettings) delete window.openPricingSettings; };
  }, []);
  return open ? h(PricingSettings, { onClose: () => setOpen(false) }) : null;
}

function mount() {
  if (document.getElementById('pricing-host') || !window.PricingRules) return;
  if (!document.getElementById('pricing-css')) { const st = document.createElement('style'); st.id = 'pricing-css'; st.textContent = CSS; document.head.appendChild(st); }
  const el = document.createElement('div'); el.id = 'pricing-host'; document.body.appendChild(el);
  if (ReactDOM.createRoot) ReactDOM.createRoot(el).render(h(Host)); else ReactDOM.render(h(Host), el);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
window.PricingSettings = PricingSettings;
})();
