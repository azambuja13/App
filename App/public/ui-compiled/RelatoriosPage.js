(function () {
'use strict';
/**
 * Relatórios (nov/2026, plano PREMIUM) — aba "📊 Relatórios".
 * window.RelatoriosPage({ onIr })   onIr(aba) troca a aba do app (finance, pipeline, stock)
 * window.ConferenciaPanel()         propostas aprovadas × financeiro (também no Financeiro → ✅ Recebimentos)
 * API: GET /api/reports/overview|events|clients|purchases?de&ate (AAAA-MM, até 12 meses),
 *      GET /api/finance/conferencia, POST /api/finance/conferencia/:id/recriar
 */
const h = React.createElement;
const { useState, useEffect, useMemo } = React;
const api = () => { const a = window.PrecificacaoAPI && window.PrecificacaoAPI.api; return a && typeof a.request === 'function' ? a : null; };
const req = (url, opt) => { const a = api(); if (!a) return Promise.reject(new Error('Sem conexão com o servidor')); return a.request(url, opt).then(r => (r && r.data !== undefined ? r.data : r)); };
const msgErro = e => (e && (e.message || e.error)) || 'Não foi possível carregar. Tente de novo.';
const brl = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0, minimumFractionDigits: 0 });
const brl2 = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const n0 = v => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const pct = v => (v == null ? '—' : n0(v) + '%');
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotMes = m => MES[+m.slice(5, 7) - 1] + '/' + m.slice(2, 4);
const fmtData = s => (s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '—');
const hojeMes = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }).slice(0, 7);
const somaMes = (m, n) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1)).toISOString().slice(0, 7);
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

const CSS = `
.rel{font-family:system-ui,-apple-system,sans-serif;color:#111827}
.rel .card{background:#fff;border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.08);padding:16px;margin-top:12px}
.rel .card h3{font-size:16px;font-weight:800;margin:0 0 4px}
.rel .muted{color:#6b7280;font-size:13px}
.rel .seg{display:flex;gap:6px;flex-wrap:wrap}
.rel .seg > div{border-radius:999px;font-weight:700;font-size:14px;cursor:pointer;border:1px solid #e5e7eb;background:#fff;color:#374151;padding:8px 13px;user-select:none;white-space:nowrap}
.rel .seg > div.on{background:#111827;border-color:#111827;color:#fff}
.rel .seg.min > div{font-size:13px;padding:5px 11px}
.rel .kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:10px}
.rel .kpi{border:1px solid #e5e7eb;border-radius:12px;padding:10px 12px;min-width:0}
.rel .kpi .t{font-size:12px;color:#6b7280;font-weight:600}
.rel .kpi b{display:block;font-size:20px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rel .kpi .s{font-size:12px;color:#6b7280;margin-top:2px}
.rel .up{color:#15803d;font-weight:700}.rel .down{color:#b91c1c;font-weight:700}
.rel table{width:100%;border-collapse:collapse;font-size:14px}
.rel th{font-size:12px;color:#6b7280;font-weight:700;text-align:right;padding:7px 8px;border-bottom:2px solid #e5e7eb;white-space:nowrap}
.rel td{padding:7px 8px;border-bottom:1px solid #f3f4f6;text-align:right;white-space:nowrap}
.rel th:first-child,.rel td:first-child{text-align:left;white-space:normal;min-width:150px;position:sticky;left:0;background:#fff;z-index:1}
.rel tr.tot td{font-weight:800;background:#f9fafb}.rel tr.tot td:first-child{background:#f9fafb}
.rel .tag{display:inline-block;font-size:11px;font-weight:700;border-radius:999px;padding:2px 8px;white-space:nowrap}
.rel .t-ok{background:#dcfce7;color:#166534}.rel .t-at{background:#fee2e2;color:#991b1b}.rel .t-ab{background:#fef9c3;color:#854d0e}.rel .t-cz{background:#f3f4f6;color:#374151}.rel .t-av{background:#ffedd5;color:#9a3412}
.rel .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:10px;padding:7px 12px;font-weight:700;font-size:13px;cursor:pointer;user-select:none;border:1px solid #d1d5db;background:#fff;color:#374151}
.rel .btn.gr{background:#16a34a;border-color:#16a34a;color:#fff}
.rel select,.rel input{border:1px solid #d1d5db;border-radius:9px;padding:7px 9px;font-size:14px;background:#fff;color:#111827}
.rel .alerta{display:flex;gap:10px;align-items:flex-start;border-radius:12px;padding:10px 12px;margin-top:8px;border:1px solid}
.rel .al-alto{background:#fef2f2;border-color:#fecaca}.rel .al-medio{background:#fffbeb;border-color:#fde68a}.rel .al-info{background:#eff6ff;border-color:#bfdbfe}
.rel .barra{height:12px;border-radius:4px;display:inline-block;vertical-align:middle}
.rel .eq{background:#f9fafb;border:1px dashed #d1d5db;border-radius:12px;padding:10px 12px;margin-top:10px;font-size:14px;line-height:1.6}
.fin .rel .card{box-shadow:none;padding:6px 0;margin-top:14px;border-radius:0}
@media (max-width:560px){.rel .kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.rel .kpi b{font-size:17px}.rel td,.rel th{padding:6px 5px;font-size:12.5px}.rel th:first-child,.rel td:first-child{min-width:120px}}
`;
function injectCss() { if (document.getElementById('rel-css')) return; const st = document.createElement('style'); st.id = 'rel-css'; st.textContent = CSS; document.head.appendChild(st); }

// ===== Pedaços comuns =====
const Var = ({ v, inverso }) => v == null ? null : h('span', { className: (inverso ? v <= 0 : v >= 0) ? 'up' : 'down', style: { fontSize: 12, marginLeft: 4 } }, (v >= 0 ? '▲ ' : '▼ ') + n0(Math.abs(v)) + '%');
function Kpi({ t, v, s, varPct, cor, inverso, testid }) {
  return h('div', { className: 'kpi', 'data-kpi': testid || t }, h('div', { className: 't' }, t), h('b', { style: cor ? { color: cor } : null }, v), (s || varPct != null) && h('div', { className: 's' }, s || '', h(Var, { v: varPct, inverso })));
}
function Card({ titulo, sub, acoes, children, testid }) {
  return h('div', { className: 'card', 'data-rel': testid },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' } },
      h('div', { style: { minWidth: 0 } }, h('h3', null, titulo), sub && h('div', { className: 'muted' }, sub)), acoes || null),
    children);
}
function csv(nome, cols, linhas) {
  const txt = '﻿' + [cols.map(c => c[0])].concat(linhas.map(l => cols.map(c => { const v = typeof c[1] === 'function' ? c[1](l) : l[c[1]]; return typeof v === 'number' ? String(v).replace('.', ',') : (v == null ? '' : String(v)); })))
    .map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\n');
  const f = new File([txt], nome + '.csv', { type: 'text/csv' });
  if (window.ShareFile && window.ShareFile.isNative && window.ShareFile.isNative() && window.ShareFile.saveFile) return window.ShareFile.saveFile(f);
  if (window.ShareFile && window.ShareFile.download) return window.ShareFile.download(f);
  const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const BotaoCsv = ({ nome, cols, linhas }) => linhas && linhas.length ? h('div', { role: 'button', className: 'btn', 'data-csv': nome, onClick: () => csv(nome, cols, linhas) }, '⬇️ CSV') : null;
/** Tabela: cols = [[titulo, campo|fn, fmt?]] */
function Tabela({ cols, linhas, total, vazio, max }) {
  const [todas, setTodas] = useState(false);
  if (!linhas || !linhas.length) return h('div', { className: 'muted', style: { marginTop: 10 } }, vazio || 'Nada no período.');
  const vis = !max || todas ? linhas : linhas.slice(0, max);
  const cel = (c, l) => { const v = typeof c[1] === 'function' ? c[1](l) : l[c[1]]; return c[2] ? c[2](v, l) : v; };
  return h('div', null,
    h('div', { style: { overflowX: 'auto', marginTop: 10 } }, h('table', null,
      h('thead', null, h('tr', null, cols.map(c => h('th', { key: c[0] }, c[0])))),
      h('tbody', null, vis.map((l, i) => h('tr', { key: l.id || i }, cols.map(c => h('td', { key: c[0] }, cel(c, l))))),
        total ? h('tr', { className: 'tot' }, cols.map((c, i) => h('td', { key: c[0] }, i === 0 ? 'Total' : (total[i] != null ? total[i] : '')))) : null))),
    max && linhas.length > max ? h('div', { role: 'button', className: 'btn', style: { marginTop: 8 }, onClick: () => setTodas(!todas) }, todas ? 'Mostrar menos' : `Ver todos (${linhas.length})`) : null);
}
function Barras({ itens, fmt }) {
  const max = Math.max(1, ...itens.map(i => Math.abs(i.valor)));
  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 } }, itens.map(i => h('div', { key: i.label },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 } }, h('span', { style: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, i.label), h('b', { style: { whiteSpace: 'nowrap' } }, (fmt || brl)(i.valor))),
    h('div', { style: { background: '#f3f4f6', borderRadius: 4, height: 10, marginTop: 3 } }, h('div', { style: { width: Math.max(1, Math.abs(i.valor) / max * 100) + '%', height: 10, borderRadius: 4, background: i.cor || '#f97316' } })))));
}
function Carregando({ erro }) { return erro ? h('div', { className: 'card', style: { color: '#b91c1c', fontWeight: 600 } }, '❌ ' + erro) : h('div', { className: 'card muted' }, 'Calculando...'); }
function useDados(url) {
  const [d, setD] = useState(null), [erro, setErro] = useState(''), [v, setV] = useState(0);
  useEffect(() => { let vivo = true; setD(null); setErro(''); req(url).then(r => vivo && setD(r)).catch(e => vivo && setErro(msgErro(e))); return () => { vivo = false; }; }, [url, v]);
  return [d, erro, () => setV(x => x + 1)];
}

// ===== Período =====
const PRESETS = [['mes', 'Este mês'], ['passado', 'Mês passado'], ['3m', '3 meses'], ['6m', '6 meses'], ['ano', 'Este ano'], ['12m', '12 meses'], ['anoPassado', 'Ano passado']];
function intervalo(k, de, ate) {
  const m = hojeMes(), y = m.slice(0, 4);
  if (k === 'mes') return [m, m];
  if (k === 'passado') return [somaMes(m, -1), somaMes(m, -1)];
  if (k === '3m') return [somaMes(m, -2), m];
  if (k === '6m') return [somaMes(m, -5), m];
  if (k === 'ano') return [y + '-01', m];
  if (k === 'anoPassado') return [(+y - 1) + '-01', (+y - 1) + '-12'];
  if (k === 'custom' && de && ate) return [de <= ate ? de : ate, de <= ate ? ate : de];
  return [somaMes(m, -11), m];
}
function Periodo({ p, setP }) {
  const [de, ate] = intervalo(p.k, p.de, p.ate);
  const meses = (+ate.slice(0, 4) - +de.slice(0, 4)) * 12 + (+ate.slice(5) - +de.slice(5)) + 1;
  return h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
    h('div', { className: 'seg min' }, PRESETS.map(([k, n]) => h('div', { key: k, className: p.k === k ? 'on' : '', role: 'button', 'data-periodo': k, onClick: () => setP({ k }) }, n)),
      h('div', { className: p.k === 'custom' ? 'on' : '', role: 'button', 'data-periodo': 'custom', onClick: () => setP({ k: 'custom', de, ate }) }, 'Escolher')),
    p.k === 'custom' && h('span', { style: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' } },
      h('input', { type: 'month', value: p.de || de, 'aria-label': 'De', onChange: e => setP({ ...p, de: e.target.value }) }), 'até',
      h('input', { type: 'month', value: p.ate || ate, 'aria-label': 'Até', onChange: e => setP({ ...p, ate: e.target.value }) }),
      meses > 12 ? h('span', { style: { color: '#b91c1c', fontSize: 13, fontWeight: 600 } }, 'Até 12 meses') : null),
    h('span', { className: 'muted' }, de === ate ? rotMes(de) : rotMes(de) + ' a ' + rotMes(ate)));
}

// ===================== Visão geral =====================
function VisaoGeral({ qs, irPara }) {
  const [d, erro] = useDados('/api/reports/overview?' + qs);
  if (!d) return h(Carregando, { erro });
  const a = d.atual, v = d.variacao || {};
  const ant = 'vs ' + (d.anteriorPeriodo.de === d.anteriorPeriodo.ate ? rotMes(d.anteriorPeriodo.de) : rotMes(d.anteriorPeriodo.de) + '–' + rotMes(d.anteriorPeriodo.ate));
  const maxMes = Math.max(1, ...d.porMes.map(m => m.total));
  return h('div', null,
    d.alertas.length ? h(Card, { titulo: '💡 Pontos de atenção', sub: 'O que pede uma decisão agora', testid: 'alertas' },
      d.alertas.map(al => h('div', { key: al.k, className: 'alerta al-' + al.nivel, 'data-alerta': al.k },
        h('div', { style: { fontSize: 18 } }, al.nivel === 'alto' ? '🔴' : al.nivel === 'medio' ? '🟡' : '🔵'),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { fontWeight: 700, fontSize: 14 } }, al.titulo, al.valor ? h('span', { style: { marginLeft: 6 } }, '· ' + brl(al.valor)) : null),
          al.texto && h('div', { className: 'muted', style: { marginTop: 2 } }, al.texto)),
        al.aba ? h('div', { role: 'button', className: 'btn', onClick: () => irPara(al.aba) }, 'Ver →') : null))) : null,
    h(Card, { titulo: '🧭 Resumo do período', sub: 'Eventos pela data do evento; vendas do PDV pela data do pedido. Setas comparam com o período anterior (' + ant + ').', testid: 'resumo' },
      h('div', { className: 'kpis' },
        h(Kpi, { t: 'Faturamento', v: brl(a.faturamento), s: 'eventos ' + brl(a.receitaEventos) + ' · PDV ' + brl(a.vendasPdv), varPct: v.faturamento, testid: 'faturamento' }),
        h(Kpi, { t: 'Lucro líquido (DRE)', v: d.lucro ? brl(d.lucro.valor) : '—', cor: d.lucro && d.lucro.valor < 0 ? '#b91c1c' : '#15803d', s: d.lucro && d.lucro.margemPct != null ? 'margem ' + pct(d.lucro.margemPct) : '' }),
        h(Kpi, { t: 'Margem dos eventos', v: pct(a.margemEventosPct), s: brl(a.margemEventos) + ' (receita − custo orçado)' }),
        h(Kpi, { t: 'Eventos realizados', v: n0(a.eventos), s: n0(a.convidados) + ' convidados', varPct: v.eventos }),
        h(Kpi, { t: 'Ticket médio por evento', v: brl(a.ticketEvento), s: brl(a.porConvidado) + ' por convidado', varPct: v.ticketEvento }),
        h(Kpi, { t: 'Taxa de aprovação', v: pct(a.taxaAprovacao), s: a.ganhas + ' fechadas · ' + a.perdidas + ' perdidas de ' + a.propostasCriadas + ' criadas' }),
        h(Kpi, { t: 'Vendas do PDV', v: brl(a.vendasPdv), s: a.pedidos + ' pedidos · ticket ' + brl(a.ticketPdv), varPct: v.vendasPdv }),
        h(Kpi, { t: 'Recebido', v: brl(a.recebido), cor: '#15803d', s: 'pago ' + brl(a.pago), varPct: v.recebido }))),
    h(Card, { titulo: '📈 Mês a mês', sub: 'Faturamento (laranja = eventos, azul = PDV) e margem (receita − custo orçado dos eventos − custo do PDV)', testid: 'meses',
      acoes: h(BotaoCsv, { nome: 'mes-a-mes', linhas: d.porMes, cols: [['Mês', 'mes'], ['Eventos', 'eventos'], ['PDV', 'vendas'], ['Faturamento', 'total'], ['Custo', 'custo'], ['Margem', 'margem'], ['Lucro líquido (DRE)', 'lucro'], ['Nº eventos', 'nEventos']] }) },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 } }, d.porMes.map(m => h('div', { key: m.mes, style: { display: 'grid', gridTemplateColumns: '58px 1fr auto', gap: 8, alignItems: 'center', fontSize: 13 } },
        h('b', null, rotMes(m.mes)),
        h('div', { style: { background: '#f3f4f6', borderRadius: 4, height: 14, display: 'flex', overflow: 'hidden' } },
          h('div', { title: 'Eventos ' + brl(m.eventos), style: { width: m.eventos / maxMes * 100 + '%', background: '#f97316' } }),
          h('div', { title: 'PDV ' + brl(m.vendas), style: { width: m.vendas / maxMes * 100 + '%', background: '#3b82f6' } })),
        h('span', { style: { whiteSpace: 'nowrap' } }, h('b', null, brl(m.total)), h('span', { className: m.margem >= 0 ? 'up' : 'down', style: { marginLeft: 6, fontSize: 12 } }, 'margem ' + brl(m.margem))))))),
    h(Card, { titulo: '📅 Próximos eventos fechados (60 dias)', testid: 'proximos' },
      h(Tabela, { linhas: d.proximos, vazio: 'Nenhum evento fechado nos próximos 60 dias.', cols: [['Evento', l => h('span', null, h('b', null, l.cliente || l.titulo), h('div', { className: 'muted' }, l.titulo))], ['Data', 'data', fmtData], ['Convidados', 'convidados', n0], ['Valor', 'valor', brl], ['Recebido', 'recebido', brl], ['A receber', 'aReceber', (x) => x > 0 ? h('span', { className: 'down' }, brl(x)) : '—']] })));
}

// ===================== Propostas × Financeiro =====================
const SIT = {
  recebido: ['✅ Recebido', 't-ok'], parcial: ['⏳ Parcial', 't-ab'], a_receber: ['⏳ A receber', 't-ab'], atrasado: ['⚠️ Atrasado', 't-at'],
  falta: ['⚠️ Faltam contas', 't-av'], excluida: ['🗑 Conta excluída', 't-av'], sem_conta: ['⚠️ Sem conta', 't-av'], fora: ['ℹ️ Fora do Financeiro', 't-cz']
};
function ConferenciaPanel() {
  injectCss();
  const [d, erro, recarregar] = useDados('/api/finance/conferencia');
  const [ano, setAno] = useState(() => lsGet('rel_conf_ano', 'todos'));
  const [filtro, setFiltro] = useState('todas');
  const [aviso, setAviso] = useState('');
  const anos = useMemo(() => d ? [...new Set(d.propostas.map(p => (p.evento || '').slice(0, 4)).filter(Boolean))].sort().reverse() : [], [d]);
  if (!d) return h('div', { className: 'rel' }, h(Carregando, { erro }));
  const doAno = d.propostas.filter(p => ano === 'todos' || (p.evento || '').slice(0, 4) === ano);
  const painel = doAno.filter(p => p.noPainel);
  const soma = (l, k) => l.reduce((s, p) => s + (p[k] || 0), 0);
  const fin = doAno.filter(p => p.noFinanceiro);
  const t = {
    nPainel: painel.length, valorPainel: soma(painel, 'valorPainel'), recebido: soma(fin, 'recebido'), aberto: soma(fin, 'aberto'),
    atrasado: soma(fin.filter(p => p.situacao === 'atrasado'), 'aberto'),
    semConta: soma(fin.filter(p => p.situacao === 'excluida' || p.situacao === 'sem_conta'), 'valor'), falta: soma(fin, 'diferenca'),
    fora: soma(doAno.filter(p => !p.noFinanceiro), 'valor'), difValor: soma(painel.filter(p => p.noFinanceiro), 'valorPainel') - soma(painel.filter(p => p.noFinanceiro), 'valor')
  };
  const lista = doAno.filter(p => filtro === 'todas' || (filtro === 'receber' ? ['a_receber', 'parcial', 'atrasado'].includes(p.situacao) : filtro === 'recebidas' ? p.situacao === 'recebido' : ['falta', 'excluida', 'sem_conta', 'fora'].includes(p.situacao)));
  const problemas = doAno.filter(p => ['falta', 'excluida', 'sem_conta', 'fora'].includes(p.situacao)).length;
  const recriar = async p => {
    try { await req('/api/finance/conferencia/' + p.id + '/recriar', { method: 'POST' }); setAviso('Conta a receber de "' + (p.cliente || p.titulo) + '" criada de novo.'); recarregar(); }
    catch (e) { alert(msgErro(e)); }
  };
  const meses = d.recebidosPorMes.filter(m => ano === 'todos' || m.mes.slice(0, 4) === ano);
  return h('div', { className: 'rel', 'data-testid': 'conferencia' },
    h(Card, { titulo: '✅ Propostas aprovadas × Financeiro', sub: 'Confere cada proposta aprovada com o que entrou no Financeiro. "Aprovadas" usa a mesma conta do quadro Minhas Propostas.',
      acoes: h('div', { className: 'seg min' }, [['todos', 'Tudo']].concat(anos.map(y => [y, y])).map(([k, n]) => h('div', { key: k, className: ano === k ? 'on' : '', role: 'button', 'data-ano': k, onClick: () => { setAno(k); lsSet('rel_conf_ano', k); } }, n))) },
      h('div', { className: 'kpis' },
        h(Kpi, { t: 'Aprovadas', v: brl(t.valorPainel), s: t.nPainel + ' proposta(s) — igual a Minhas Propostas', testid: 'aprovadas' }),
        h(Kpi, { t: 'Recebido', v: brl(t.recebido), cor: '#15803d', testid: 'recebido' }),
        h(Kpi, { t: 'A receber', v: brl(t.aberto), cor: t.atrasado > 0 ? '#b91c1c' : '#854d0e', s: t.atrasado > 0 ? brl(t.atrasado) + ' atrasado' : 'nada atrasado', testid: 'a-receber' }),
        h(Kpi, { t: 'Não está no Financeiro', v: brl(t.semConta + t.falta + t.fora), cor: t.semConta + t.falta + t.fora > 0 ? '#9a3412' : null, s: problemas ? problemas + ' proposta(s) para conferir' : 'tudo certo', testid: 'fora' })),
      h('div', { className: 'eq', 'data-testid': 'conta' },
        h('b', null, brl(t.valorPainel) + ' aprovadas'), ' = ', h('span', { className: 'up' }, brl(t.recebido) + ' recebido'), ' + ', brl(t.aberto) + ' a receber',
        t.semConta > 0 ? ' + ' + brl(t.semConta) + ' sem conta' : '', t.falta > 0 ? ' + ' + brl(t.falta) + ' faltando nas contas' : '',
        t.fora > 0 ? ' + ' + brl(t.fora) + ' fora do Financeiro' : '', Math.abs(t.difValor) >= 1 ? ' + ' + brl(t.difValor) + ' de diferença de valor' : '',
        t.fora > 0 ? h('div', { className: 'muted' }, 'Fora do Financeiro = aprovada, mas a etapa no Funil não está em "Fechado" (só entra no Financeiro quando está em Fechado).') : null),
      aviso && h('div', { role: 'status', style: { marginTop: 10, color: '#166534', fontWeight: 600 } }, '✅ ' + aviso),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' } },
        h('div', { className: 'seg min' }, [['todas', 'Todas'], ['receber', 'A receber'], ['recebidas', 'Recebidas'], ['conferir', 'Para conferir' + (problemas ? ' (' + problemas + ')' : '')]].map(([k, n]) => h('div', { key: k, className: filtro === k ? 'on' : '', role: 'button', 'data-filtro': k, onClick: () => setFiltro(k) }, n))),
        h(BotaoCsv, { nome: 'propostas-x-financeiro', linhas: lista, cols: [['Proposta', 'titulo'], ['Cliente', 'cliente'], ['Evento', 'evento'], ['Valor', 'valor'], ['Recebido', 'recebido'], ['A receber', 'aberto'], ['Situação', p => (SIT[p.situacao] || [p.situacao])[0]]] })),
      h(Tabela, { linhas: lista, vazio: 'Nenhuma proposta neste filtro.', max: 30,
        total: [null, null, brl(soma(lista, 'valor')), brl(soma(lista, 'recebido')), brl(soma(lista, 'aberto')), null],
        cols: [
          ['Proposta', p => h('span', { 'data-conf': p.id }, h('b', null, p.cliente || p.titulo), h('div', { className: 'muted' }, p.titulo))],
          ['Evento', 'evento', fmtData],
          ['Valor', 'valor', brl2],
          ['Recebido', p => p.recebido ? h('span', null, brl2(p.recebido), p.recebidoEm ? h('div', { className: 'muted' }, 'em ' + fmtData(p.recebidoEm)) : null) : '—'],
          ['A receber', p => p.aberto ? h('span', { className: p.atrasado ? 'down' : '' }, brl2(p.aberto)) : (p.diferenca ? h('span', { className: 'down' }, 'faltam ' + brl2(p.diferenca)) : '—')],
          ['Situação', p => h('span', null, h('span', { className: 'tag ' + (SIT[p.situacao] || ['', 't-cz'])[1] }, (SIT[p.situacao] || [p.situacao])[0]),
            p.situacao === 'excluida' || p.situacao === 'sem_conta' ? h('div', { role: 'button', className: 'btn gr', 'data-recriar': p.id, style: { marginLeft: 6, padding: '3px 9px' }, onClick: () => recriar(p) }, 'Criar conta') : null)]
        ] })),
    h(Card, { titulo: '💰 Recebimentos por mês', sub: 'Pela data em que o dinheiro entrou: eventos (contas das propostas), vendas (PDV e lançadas) e outros', testid: 'recebidos',
      acoes: h(BotaoCsv, { nome: 'recebimentos-por-mes', linhas: meses, cols: [['Mês', 'mes'], ['Eventos', 'eventos'], ['Vendas', 'vendas'], ['Outros', 'outros'], ['Total', 'total']] }) },
      h(Tabela, { linhas: meses, vazio: 'Nenhum recebimento registrado.', max: 12,
        total: [null, brl(soma(meses, 'eventos')), brl(soma(meses, 'vendas')), brl(soma(meses, 'outros')), brl(soma(meses, 'total'))],
        cols: [['Mês', 'mes', rotMes], ['Eventos', 'eventos', brl], ['Vendas', 'vendas', brl], ['Outros', 'outros', brl], ['Total', 'total', x => h('b', null, brl(x))]] })));
}

// ===================== Eventos e propostas =====================
function Eventos({ qs }) {
  const [d, erro] = useDados('/api/reports/events?' + qs);
  if (!d) return h(Carregando, { erro });
  const t = d.totais, f = d.funil;
  const semCusto = d.lista.filter(e => e.semCusto).length;
  return h('div', null,
    h(Card, { titulo: '🎉 Eventos realizados', sub: 'Propostas em "Fechado" com o evento no período. Custo = o que foi orçado na proposta (comida, apoio, mão de obra e transporte).', testid: 'eventos' },
      h('div', { className: 'kpis' },
        h(Kpi, { t: 'Eventos', v: n0(t.eventos), s: n0(t.convidados) + ' convidados' }),
        h(Kpi, { t: 'Receita', v: brl(t.receita), s: 'ticket ' + brl(t.ticket) }),
        h(Kpi, { t: 'Custo orçado', v: brl(t.custo) }),
        h(Kpi, { t: 'Margem', v: brl(t.margem), cor: t.margem >= 0 ? '#15803d' : '#b91c1c', s: pct(t.margemPct) }),
        h(Kpi, { t: 'Por convidado', v: brl(t.porConvidado) })),
      semCusto ? h('div', { className: 'muted', style: { marginTop: 8 } }, `⚠️ ${semCusto} evento(s) sem custo na proposta (propostas antigas): a margem deles aparece cheia.`) : null,
      h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: 8 } }, h(BotaoCsv, { nome: 'eventos', linhas: d.lista, cols: [['Data', 'data'], ['Cliente', 'cliente'], ['Proposta', 'titulo'], ['Convidados', 'convidados'], ['Valor', 'valor'], ['Comida', 'comida'], ['Apoio', 'apoio'], ['Mão de obra', 'maoDeObra'], ['Transporte', 'transporte'], ['Custo', 'custo'], ['Margem', 'margem'], ['Margem %', 'margemPct'], ['R$/convidado', 'porConvidado'], ['Recebido', 'recebido'], ['A receber', 'aReceber']] })),
      h(Tabela, { linhas: d.lista, max: 20, vazio: 'Nenhum evento fechado no período.',
        cols: [['Evento', e => h('span', null, h('b', null, e.cliente || e.titulo), h('div', { className: 'muted' }, fmtData(e.data) + ' · ' + n0(e.convidados) + ' conv.'))],
          ['Valor', 'valor', brl], ['Custo', 'custo', (x, e) => e.semCusto ? '—' : brl(x)], ['Margem', e => e.semCusto ? '—' : h('span', { className: e.margem >= 0 ? 'up' : 'down' }, brl(e.margem) + ' · ' + pct(e.margemPct))],
          ['R$/conv.', 'porConvidado', x => x == null ? '—' : brl2(x)], ['A receber', 'aReceber', x => x > 0 ? h('span', { className: 'down' }, brl(x)) : '✅']] })),
    d.porMes.length > 1 && h(Card, { titulo: '📆 Eventos por mês', testid: 'eventos-mes' },
      h(Tabela, { linhas: d.porMes, total: [null, n0(t.eventos), n0(t.convidados), brl(t.receita), brl(t.margem), pct(t.margemPct)],
        cols: [['Mês', 'mes', rotMes], ['Eventos', 'eventos', n0], ['Convidados', 'convidados', n0], ['Receita', 'receita', brl], ['Margem', 'margem', brl], ['Margem %', 'margemPct', pct]] })),
    h(Card, { titulo: '🎯 Propostas criadas no período', sub: 'Taxa de aprovação = fechadas ÷ (fechadas + perdidas)', testid: 'funil' },
      h('div', { className: 'kpis' },
        h(Kpi, { t: 'Criadas', v: n0(f.criadas), s: brl(f.valorCriado) }),
        h(Kpi, { t: 'Fechadas', v: n0(f.ganhas), cor: '#15803d', s: brl(f.valorGanho) }),
        h(Kpi, { t: 'Perdidas', v: n0(f.perdidas), cor: '#b91c1c', s: brl(f.valorPerdido) }),
        h(Kpi, { t: 'Em aberto', v: n0(f.abertas), s: brl(f.valorAberto) }),
        h(Kpi, { t: 'Taxa de aprovação', v: pct(f.taxaAprovacao) }),
        h(Kpi, { t: 'Tempo até fechar', v: f.diasParaFechar == null ? '—' : f.diasParaFechar + ' dias', s: 'da criação ao Fechado' })),
      f.motivosPerda.length ? h('div', { style: { marginTop: 12 } }, h('b', { style: { fontSize: 14 } }, 'Por que perdemos'),
        h(Barras, { itens: f.motivosPerda.map(m => ({ label: m.motivo + ' (' + m.n + ')', valor: m.valor, cor: '#ef4444' })) })) : null),
    d.porTamanho.length ? h(Card, { titulo: '👥 Resultado por tamanho de evento', sub: 'Onde a aprovação e a margem são melhores', testid: 'tamanho' },
      h(Tabela, { linhas: d.porTamanho, cols: [['Convidados', 'faixa'], ['Propostas', 'propostas', n0], ['Fechadas', 'ganhas', n0], ['Aprovação', 'taxaAprovacao', pct], ['Ticket', 'ticket', x => x == null ? '—' : brl(x)], ['Margem', 'margemPct', pct]] })) : null);
}

// ===================== Clientes e pratos =====================
function Clientes({ qs }) {
  const [d, erro] = useDados('/api/reports/clients?' + qs);
  if (!d) return h(Carregando, { erro });
  const t = d.totais;
  return h('div', null,
    h(Card, { titulo: '👥 Clientes', testid: 'clientes' },
      h('div', { className: 'kpis' },
        h(Kpi, { t: 'Compraram no período', v: n0(t.compraram) }), h(Kpi, { t: 'Clientes novos', v: n0(t.novos) }),
        h(Kpi, { t: 'Voltaram a fechar', v: n0(t.recorrentes), s: 'com 2 ou mais eventos (todo o histórico)' }), h(Kpi, { t: 'Cadastrados', v: n0(t.clientesAtivos) })),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 } }, h('b', { style: { fontSize: 14 } }, 'Quem mais comprou'),
        h(BotaoCsv, { nome: 'clientes', linhas: d.topClientes, cols: [['Cliente', 'nome'], ['Eventos', 'eventos'], ['Pedidos', 'pedidos'], ['Total', 'total'], ['% do total', 'pctTotal']] })),
      h(Tabela, { linhas: d.topClientes, vazio: 'Nenhuma venda no período.', cols: [['Cliente', 'nome'], ['Eventos', 'eventos', n0], ['Pedidos', 'pedidos', n0], ['Total', 'total', x => h('b', null, brl(x))], ['% do total', 'pctTotal', pct]] })),
    h(Card, { titulo: '📣 De onde vêm os clientes', sub: 'Clientes cadastrados no período, por origem, e quanto cada origem já fechou', testid: 'origens' },
      h(Tabela, { linhas: d.origens, vazio: 'Nenhum cliente novo no período.', cols: [['Origem', 'origem'], ['Novos', 'novos', n0], ['Com proposta', 'comProposta', n0], ['Fecharam', 'fechados', n0], ['Conversão', 'conversao', pct], ['Valor fechado', 'valorFechado', brl]] })),
    h(Card, { titulo: '🍖 Pratos mais usados nos eventos', sub: 'Nas propostas fechadas com evento no período', testid: 'pratos' },
      d.pratosPropostas.length ? h(Barras, { itens: d.pratosPropostas.map(p => ({ label: p.nome + ' · ' + n0(p.convidados) + ' conv.', valor: p.eventos })), fmt: v => n0(v) + ' evento(s)' }) : h('div', { className: 'muted', style: { marginTop: 8 } }, 'Nenhum prato nas propostas fechadas do período.')),
    h(Card, { titulo: '🧾 Mais vendidos no PDV', testid: 'pdv',
      acoes: h(BotaoCsv, { nome: 'mais-vendidos-pdv', linhas: d.maisVendidos, cols: [['Item', 'nome'], ['Quantidade', 'quantidade'], ['Receita', 'receita'], ['Custo', 'custo'], ['Margem %', 'margemPct']] }) },
      h(Tabela, { linhas: d.maisVendidos, vazio: 'Nenhum pedido no período.', cols: [['Item', 'nome'], ['Qtd', 'quantidade', n0], ['Receita', 'receita', brl], ['Custo', 'custo', x => x == null ? '—' : brl(x)], ['Margem', 'margemPct', x => x == null ? '—' : h('span', { className: x >= 55 ? 'up' : x < 40 ? 'down' : '' }, pct(x))]] })));
}

// ===================== Compras e estoque =====================
function Compras({ qs }) {
  const [d, erro] = useDados('/api/reports/purchases?' + qs);
  if (!d) return h(Carregando, { erro });
  const t = d.totais;
  return h('div', null,
    h(Card, { titulo: '🛒 Compras e estoque', sub: 'Compras registradas no Estoque (entradas) no período', testid: 'compras' },
      h('div', { className: 'kpis' },
        h(Kpi, { t: 'Compras', v: brl(t.compras), s: n0(t.nCompras) + ' compra(s)' }),
        h(Kpi, { t: 'Perdas', v: brl(t.perdas), cor: t.perdas > 0 ? '#b91c1c' : null }),
        h(Kpi, { t: 'Valor em estoque hoje', v: brl(t.estoque) }),
        h(Kpi, { t: 'Parado há 30 dias', v: brl(t.parado), cor: t.parado > 0 ? '#9a3412' : null, s: 'dinheiro parado na prateleira' }),
        h(Kpi, { t: 'Abaixo do mínimo', v: n0(t.abaixoMinimo) }))),
    h(Card, { titulo: '🚚 Por fornecedor', testid: 'fornecedores' },
      h(Tabela, { linhas: d.porFornecedor, vazio: 'Nenhuma compra no período.', cols: [['Fornecedor', 'fornecedor'], ['Compras', 'compras', n0], ['Valor', 'valor', brl], ['% do total', 'pctTotal', pct]] })),
    h(Card, { titulo: '🥩 Por insumo', sub: 'Preço por kg, litro ou unidade: médio, na primeira e na última compra do período', testid: 'insumos',
      acoes: h(BotaoCsv, { nome: 'compras-por-insumo', linhas: d.porInsumo, cols: [['Insumo', 'nome'], ['Quantidade', 'quantidade'], ['Unidade', 'unidade'], ['Valor', 'valor'], ['% do total', 'pctTotal'], ['Preço médio', 'precoMedio'], ['Preço início', 'precoInicio'], ['Preço fim', 'precoFim'], ['Variação %', 'variacao']] }) },
      h(Tabela, { linhas: d.porInsumo, max: 15, vazio: 'Nenhuma compra no período.',
        cols: [['Insumo', 'nome'], ['Qtd', i => n0(i.quantidade) + ' ' + i.unidade], ['Valor', 'valor', brl], ['%', 'pctTotal', pct], ['Preço médio', i => i.precoMedio == null ? '—' : brl2(i.precoMedio) + '/' + i.unidade],
          ['Variação', 'variacao', x => x == null || x === 0 ? '—' : h('span', { className: x > 0 ? 'down' : 'up' }, (x > 0 ? '+' : '') + n0(x) + '%')]] })),
    d.precoForaDoNormal && d.precoForaDoNormal.length ? h(Card, { titulo: '⚠️ Preço por kg fora do normal', testid: 'preco-fora',
      sub: 'Acima de R$ 1.000/kg ou abaixo de R$ 0,10/kg. Quase sempre é o preço de 1 kg gravado com tamanho de 1 g (ou preço por unidade num item por peso): o custo dos pratos com esses itens sai até 1000× maior. Corrija em Ingredientes (preço do kg e tamanho 1000 g) e recalcule os pratos.' },
      h(Tabela, { linhas: d.precoForaDoNormal, max: 15, cols: [['Ingrediente', i => h('span', null, i.nome, h('div', { className: 'muted' }, i.categoria))], ['Cadastro', i => brl2(i.preco) + ' por ' + n0(i.tamanho) + ' ' + i.unidade], ['Fica por kg/L', 'porKg', x => h('span', { className: 'down' }, brl(x))]] }),
      d.nPrecoForaDoNormal > d.precoForaDoNormal.length ? h('div', { className: 'muted', style: { marginTop: 6 } }, `… e mais ${d.nPrecoForaDoNormal - d.precoForaDoNormal.length}`) : null) : null,
    d.variacaoPrecos.length ? h(Card, { titulo: '📈 Preços que mudaram no cadastro', sub: 'Variação no período pelas mudanças de preço registradas; preço atual por kg, L ou unidade', testid: 'precos' },
      h(Tabela, { linhas: d.variacaoPrecos, cols: [['Ingrediente', 'nome'],
        ['Antes', (i) => i.de == null ? '—' : brl2(i.de) + '/' + i.unidade], ['Agora', (i) => i.para == null ? '—' : brl2(i.para) + '/' + i.unidade],
        ['Variação', (i) => i.suspeito ? h('span', { className: 'tag t-av', title: 'Variação grande demais: mudança de unidade ou erro de cadastro (kg × g)' }, '⚠️ confira o cadastro') : h('span', { className: i.variacao > 0 ? 'down' : 'up' }, (i.variacao > 0 ? '+' : '') + n0(i.variacao) + '%')]] })) : null,
    d.perdas.length ? h(Card, { titulo: '🗑 Perdas', testid: 'perdas' }, h(Barras, { itens: d.perdas.map(p => ({ label: p.nome, valor: p.valor, cor: '#ef4444' })) })) : null,
    d.parado.length ? h(Card, { titulo: '📦 Estoque parado', sub: 'Com saldo e sem nenhuma saída nos últimos 30 dias', testid: 'parado' }, h(Barras, { itens: d.parado.map(p => ({ label: p.nome, valor: p.valor, cor: '#f59e0b' })) })) : null,
    d.abaixoMinimo.length ? h(Card, { titulo: '⚠️ Abaixo do mínimo', testid: 'minimo' },
      h(Tabela, { linhas: d.abaixoMinimo, cols: [['Item', 'nome'], ['Saldo', i => n0(i.saldo) + ' ' + i.unidade], ['Mínimo', i => n0(i.minimo) + ' ' + i.unidade]] })) : null);
}

// ===================== Página =====================
const ABAS = [['visao', '🧭 Visão geral'], ['conferencia', '✅ Propostas × Financeiro'], ['eventos', '🎉 Eventos e propostas'], ['clientes', '👥 Clientes e pratos'], ['compras', '🛒 Compras e estoque']];
function RelatoriosPage({ onIr }) {
  injectCss();
  const [aba, setAbaS] = useState(() => lsGet('rel_aba', 'visao'));
  const setAba = a => { setAbaS(a); lsSet('rel_aba', a); try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {} };
  const [p, setPS] = useState(() => { try { return JSON.parse(lsGet('rel_periodo', '')) || { k: '6m' }; } catch (e) { return { k: '6m' }; } });
  const setP = v => { setPS(v); lsSet('rel_periodo', JSON.stringify(v)); };
  const [de, ate] = intervalo(p.k, p.de, p.ate);
  const meses = (+ate.slice(0, 4) - +de.slice(0, 4)) * 12 + (+ate.slice(5) - +de.slice(5)) + 1;
  const qs = new URLSearchParams({ de, ate: meses > 12 ? somaMes(de, 11) : ate }).toString();
  const irPara = k => {
    if (['conferencia', 'eventos', 'clientes', 'compras'].includes(k)) return setAba(k);
    const app = { financeiro: 'finance', funil: 'pipeline', estoque: 'stock' }[k];
    if (app && onIr) onIr(app);
  };
  return h('div', { className: 'rel', 'data-testid': 'relatorios' },
    h('div', { className: 'card', style: { marginTop: 0 } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
        h('h2', { style: { fontSize: 22, fontWeight: 800, margin: 0 } }, '📊 Relatórios'),
        aba !== 'conferencia' ? h(Periodo, { p, setP }) : h('span', { className: 'muted' }, 'Todo o histórico (filtre pelo ano do evento)')),
      h('div', { className: 'seg', style: { marginTop: 12 } }, ABAS.map(([k, n]) => h('div', { key: k, className: aba === k ? 'on' : '', role: 'button', 'data-relaba': k, onClick: () => setAba(k) }, n)))),
    aba === 'visao' ? h(VisaoGeral, { qs, irPara }) :
    aba === 'conferencia' ? h(ConferenciaPanel, null) :
    aba === 'eventos' ? h(Eventos, { qs }) :
    aba === 'clientes' ? h(Clientes, { qs }) :
    h(Compras, { qs }));
}

window.RelatoriosPage = RelatoriosPage;
window.ConferenciaPanel = ConferenciaPanel;
})();
