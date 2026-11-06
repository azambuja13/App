(function () {
'use strict';
/**
 * DRE (nov/2026, plano PREMIUM) — fase 3 do Financeiro. Sub-aba "📊 DRE" da FinanceiroPage.
 * window.DREPanel({ mes })  — mês selecionado no topo do Financeiro (AAAA-MM)
 * API: GET /api/finance/dre?de&ate&cmv(estimado|lancado)&deducoes(auto|lancado|estimado)
 */
const h = React.createElement;
const { useState, useEffect } = React;
const api = () => { const a = window.PrecificacaoAPI && window.PrecificacaoAPI.api; return a && typeof a.request === 'function' ? a : null; };
const req = url => { const a = api(); if (!a) return Promise.reject(new Error('Sem conexão com o servidor')); return a.request(url).then(r => (r && r.data !== undefined ? r.data : r)); };
const brl = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0, minimumFractionDigits: 0 });
const brl2 = v => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = v => (v == null ? '' : (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%');
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotMes = m => MES[+m.slice(5, 7) - 1] + '/' + m.slice(2, 4);
const somaMes = (m, n) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1)).toISOString().slice(0, 7);
const msgErro = e => (e && (e.message || e.error)) || 'Não foi possível concluir. Tente de novo.';

const CSS = `
.dre table{width:100%;border-collapse:collapse;font-size:14px}
.dre th{font-size:12px;color:#6b7280;font-weight:700;text-align:right;padding:7px 8px;border-bottom:2px solid #e5e7eb;white-space:nowrap}
.dre th:first-child{text-align:left}
.dre td{padding:6px 8px;border-bottom:1px solid #f3f4f6;text-align:right;white-space:nowrap}
.dre td:first-child{text-align:left;white-space:normal;min-width:180px}
.dre tr.item td{color:#4b5563;font-size:13px}.dre tr.item td:first-child{padding-left:22px}
.dre tr.subtotal td{font-weight:700}
.dre tr.total td{font-weight:800;background:#f9fafb}
.dre tr.resultado td{font-weight:900;font-size:15px;background:#ecfdf5;border-top:2px solid #10b981}
.dre .neg{color:#b91c1c}.dre .pos{color:#15803d}
.dre .pc{display:block;font-size:11px;color:#9ca3af;font-weight:500}
.dre .est{font-size:10px;font-weight:700;color:#92400e;background:#fef3c7;border-radius:999px;padding:1px 6px;margin-left:4px}
.dre td:first-child,.dre th:first-child{position:sticky;left:0;z-index:1;background:#fff}
.dre tr.total td:first-child{background:#f9fafb}.dre tr.resultado td:first-child{background:#ecfdf5}
@media (max-width:560px){.dre td:first-child{min-width:140px}.dre td,.dre th{padding:6px 5px;font-size:12.5px}}
`;
function injectCss() { if (document.getElementById('dre-css')) return; const st = document.createElement('style'); st.id = 'dre-css'; st.textContent = CSS; document.head.appendChild(st); }

function DREPanel({ mes }) {
  injectCss();
  const [n, setN] = useState(() => { try { return Number(localStorage.getItem('dre_meses')) || 1; } catch (e) { return 1; } });
  const [cmv, setCmv] = useState(() => { try { return localStorage.getItem('dre_cmv') || 'estimado'; } catch (e) { return 'estimado'; } });
  const [d, setD] = useState(null);
  const [erro, setErro] = useState('');
  const guardar = (k, v) => { try { localStorage.setItem(k, String(v)); } catch (e) {} };
  useEffect(() => {
    setD(null); setErro('');
    req('/api/finance/dre?' + new URLSearchParams({ de: somaMes(mes, -(n - 1)), ate: mes, cmv }))
      .then(setD).catch(e => setErro(msgErro(e)));
  }, [mes, n, cmv]);
  const csv = () => {
    if (!d) return;
    const linhas = [['Linha', ...d.meses, ...(d.meses.length > 1 ? ['Total'] : [])]].concat(d.linhas.map(l => [l.nome, ...l.valores.map(brl2), ...(d.meses.length > 1 ? [brl2(l.total)] : [])]));
    const txt = '﻿' + linhas.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\n');
    const f = new File([txt], `DRE-${d.meses[0]}${d.meses.length > 1 ? '_a_' + d.meses[d.meses.length - 1] : ''}.csv`, { type: 'text/csv' });
    if (window.ShareFile && window.ShareFile.isNative && window.ShareFile.isNative() && window.ShareFile.saveFile) return window.ShareFile.saveFile(f);
    if (window.ShareFile && window.ShareFile.download) return window.ShareFile.download(f);
  };
  const seg = (atual, set, chave, ops) => h('div', { className: 'seg' }, ops.map(([k, r]) => h('div', { key: k, className: atual === k ? 'on' : '', role: 'button', 'data-dre': chave + '-' + k, onClick: () => { set(k); guardar(chave === 'n' ? 'dre_meses' : 'dre_cmv', k); } }, r)));
  const varios = d && d.meses.length > 1;
  const liq = d && d.linhas.find(l => l.k === 'liquido');
  const rb = d && d.linhas.find(l => l.k === 'receita_bruta');
  const estimou = d && d.linhas.some(l => l.estimado && l.estimado.some(Boolean));
  return h('div', { className: 'dre', 'data-testid': 'dre' },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
      seg(n, setN, 'n', [[1, 'Mês'], [3, '3 meses'], [6, '6 meses'], [12, '12 meses']]),
      h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' } },
        h('span', { className: 'muted' }, 'Custo da comida:'),
        seg(cmv, setCmv, 'cmv', [['estimado', 'Pelos eventos e pedidos'], ['lancado', 'Pelas compras lançadas']]),
        d ? h('div', { role: 'button', className: 'btn b-wh b-sm', 'data-testid': 'dre-csv', onClick: csv }, '⬇️ CSV') : null)),
    erro ? h('div', { style: { color: '#b91c1c', marginTop: 12, fontWeight: 600 } }, '❌ ' + erro) : !d ? h('div', { className: 'muted', style: { marginTop: 12 } }, 'Calculando...') :
    h('div', null,
      liq && rb ? h('div', { className: 'kpis' },
        h('div', { className: 'kpi' }, h('span', { className: 'muted' }, 'Receita bruta'), h('b', null, brl(rb.total))),
        h('div', { className: 'kpi' }, h('span', { className: 'muted' }, 'Lucro líquido'), h('b', { className: liq.total >= 0 ? 'pos' : 'neg' }, brl(liq.total))),
        h('div', { className: 'kpi' }, h('span', { className: 'muted' }, 'Margem líquida'), h('b', { className: liq.total >= 0 ? 'pos' : 'neg' }, rb.total > 0 ? pct(liq.total / rb.total * 100) : '—'))) : null,
      h('div', { style: { overflowX: 'auto', marginTop: 12 } }, h('table', null,
        h('thead', null, h('tr', null, h('th', null, ''), d.meses.map(m => h('th', { key: m }, rotMes(m))), varios ? h('th', null, 'Total') : null)),
        h('tbody', null, d.linhas.map(l => h('tr', { key: l.k, className: l.nivel, 'data-linha': l.k },
          h('td', null, l.nome, l.estimado && l.estimado.some(Boolean) ? h('span', { className: 'est', title: 'Sem lançamento no mês: estimado pelos % de Custos da empresa' }, 'estimado') : null),
          l.valores.map((v, i) => h('td', { key: i, className: v < 0 ? 'neg' : (l.nivel !== 'item' && v > 0 ? '' : '') }, v ? brl(v) : '—', l.nivel !== 'item' && l.pct[i] != null && v ? h('span', { className: 'pc' }, pct(l.pct[i])) : null)),
          varios ? h('td', { className: l.total < 0 ? 'neg' : '' }, l.total ? brl(l.total) : '—') : null))))),
      h('div', { className: 'muted', style: { marginTop: 12, lineHeight: 1.6 } },
        h('div', null, '📌 Por competência: eventos na data do evento, pedidos na data do pedido, contas na data de competência.'),
        cmv === 'estimado'
          ? h('div', null, 'Custo da comida, apoio, mão de obra e transporte vêm das propostas fechadas (o que foi orçado) e o custo dos pedidos do PDV. Compras de insumos lançadas no período: ', h('b', null, brl(d.informativo.comprasInsumos.reduce((s, v) => s + v, 0))), ' (para comparar).')
          : h('div', null, 'Custo da comida = compras de insumos e embalagens lançadas; mão de obra e transporte = pagamentos lançados nessas categorias.'),
        estimou ? h('div', null, 'Impostos e taxas sem lançamento no mês foram estimados com ' + pct(d.informativo.pctDeducoesEstimadas) + ' da receita (Custos da empresa).') : null,
        d.informativo.investimentos.some(v => v) ? h('div', null, '🔧 Compra de equipamentos no período: ', h('b', null, brl(d.informativo.investimentos.reduce((s, v) => s + v, 0))), ' — não entra no resultado; entra aos poucos pela depreciação.') : null,
        !d.informativo.equipamentos ? h('div', null, '💡 Cadastre os equipamentos em Configurações → Depreciação de equipamentos para a depreciação entrar no DRE.') : null)));
}

window.DREPanel = DREPanel;
})();
