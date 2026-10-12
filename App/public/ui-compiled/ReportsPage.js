(function () {
'use strict';
/**
 * CRM etapa 3 - Relatórios (plano PREMIUM). Aberto pelo botão "Relatórios" do Funil.
 * Dados: GET /api/crm/reports?from&to
 */
const h = React.createElement;
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const pad = n => String(n).padStart(2, '0');
const key = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const PERIODOS = [
  { id: '30', label: 'Últimos 30 dias', range: () => { const t = new Date(); return [key(new Date(t.getTime() - 29 * 86400000)), key(t)]; } },
  { id: '90', label: 'Últimos 3 meses', range: () => { const t = new Date(); return [key(new Date(t.getFullYear(), t.getMonth() - 2, 1)), key(t)]; } },
  { id: '180', label: 'Últimos 6 meses', range: () => { const t = new Date(); return [key(new Date(t.getFullYear(), t.getMonth() - 5, 1)), key(t)]; } },
  { id: 'ano', label: 'Este ano', range: () => { const t = new Date(); return [`${t.getFullYear()}-01-01`, key(t)]; } },
  { id: '12', label: 'Últimos 12 meses', range: () => { const t = new Date(); return [key(new Date(t.getFullYear(), t.getMonth() - 11, 1)), key(t)]; } }
];

function Card({ titulo, valor, sub, cor }) {
  return h('div', { style: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, minWidth: 0 } },
    h('div', { className: 'crm-muted', style: { fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 } }, titulo),
    h('div', { style: { fontSize: 'clamp(16px, 4.4vw, 22px)', fontWeight: 800, color: cor || '#111827', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, valor),
    sub && h('div', { className: 'crm-muted', style: { marginTop: 2 } }, sub));
}

function Barras({ itens, cor, fmt }) {
  const max = Math.max(1, ...itens.map(i => i.valor));
  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
    itens.map(i => h('div', { key: i.label },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, color: '#374151' } },
        h('span', { style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 } }, i.label),
        h('b', { style: { whiteSpace: 'nowrap', flexShrink: 0 } }, fmt ? fmt(i.valor) : i.valor)),
      h('div', { style: { height: 10, background: '#f3f4f6', borderRadius: 6, marginTop: 4, overflow: 'hidden' } },
        h('div', { style: { width: `${Math.max(2, (i.valor / max) * 100)}%`, height: '100%', background: cor, borderRadius: 6 } })),
      i.extra ? h('div', { className: 'crm-muted', style: { marginTop: 3 } }, i.extra) : null)));
}

function Bloco({ titulo, children, vazio }) {
  return h('div', { className: 'rounded-xl shadow-lg', style: { background: '#fff', padding: 16 } },
    h('div', { style: { fontWeight: 800, color: '#111827', marginBottom: 12 } }, titulo),
    vazio ? h('div', { className: 'crm-muted', style: { textAlign: 'center', padding: 12 } }, vazio) : children);
}

function CrmReports({ onBack }) {
  const C = window.CRM;
  C.injectCss();
  const [periodo, setPeriodo] = React.useState(() => { try { return localStorage.getItem('crm_reports_period') || '180'; } catch (e) { return '180'; } });
  const [dados, setDados] = React.useState(null);
  const [erro, setErro] = React.useState(null);

  React.useEffect(() => {
    try { localStorage.setItem('crm_reports_period', periodo); } catch (e) {}
    const p = PERIODOS.find(x => x.id === periodo) || PERIODOS[2];
    const [from, to] = p.range();
    setDados(null); setErro(null);
    const api = C.api();
    if (!api || typeof api.getCrmReports !== 'function') { setErro('Indisponível'); return; }
    api.getCrmReports({ from, to }).then(r => setDados(r && r.data)).catch(e => setErro(e && e.message ? e.message : 'Erro ao carregar'));
  }, [periodo]);

  const r = dados && dados.resumo;
  const pct = v => v == null ? '—' : Math.round(v * 100) + '%';
  const origemLabel = o => o === 'none' ? 'Sem origem' : (C.SOURCE[o] ? C.SOURCE[o].icon + ' ' + C.SOURCE[o].label : o);
  const mesLabel = m => { const [y, mo] = m.split('-'); return MESES[Number(mo) - 1] + '/' + y.slice(2); };

  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
    h('div', { className: 'rounded-xl shadow-lg', style: { background: '#fff', padding: 16 } },
      h('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 } },
        h('div', null,
          h('div', { role: 'button', onClick: onBack, style: { fontSize: 13, color: '#c2410c', cursor: 'pointer', fontWeight: 600, marginBottom: 4 } }, '← Voltar para o funil'),
          h('h2', { style: { fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 } }, '📊 Relatórios'),
          h('div', { className: 'crm-muted', style: { fontSize: 13 } }, 'Negócios criados no período. Faturamento pela data do evento.')),
        h('select', { value: periodo, onChange: e => setPeriodo(e.target.value), className: 'crm-select', style: { width: 'auto', fontSize: 14 } },
          PERIODOS.map(p => h('option', { key: p.id, value: p.id }, p.label))))),
    erro ? h('div', { style: { color: '#b91c1c', padding: 12 } }, erro) :
    !r ? h('div', { className: 'crm-muted', style: { textAlign: 'center', padding: 24 } }, 'Carregando relatórios...') :
    h(React.Fragment, null,
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 10 } },
        h(Card, { titulo: 'Taxa de fechamento', valor: pct(r.taxaFechamento), sub: `${r.ganhos} fechado${r.ganhos === 1 ? '' : 's'} de ${r.ganhos + r.perdidos} decidido${r.ganhos + r.perdidos === 1 ? '' : 's'}`, cor: '#15803d' }),
        h(Card, { titulo: 'Ticket médio', valor: r.ticketMedio == null ? '—' : C.brl(r.ticketMedio), sub: 'dos negócios fechados' }),
        h(Card, { titulo: 'Valor fechado', valor: C.brl(r.valorFechado), sub: `${r.negocios} negócio${r.negocios === 1 ? '' : 's'} no período` }),
        h(Card, { titulo: 'Em aberto', valor: C.brl(r.valorAberto), sub: `${r.abertos} negócio${r.abertos === 1 ? '' : 's'}`, cor: '#6d28d9' }),
        h(Card, { titulo: 'Tempo até fechar', valor: r.diasAteFechar == null ? '—' : Math.round(r.diasAteFechar) + ' dias', sub: 'média, da proposta ao fechado' }),
        h(Card, { titulo: 'Novos contatos', valor: String(r.novosContatos), sub: 'cadastrados no período' })),
      h(Bloco, { titulo: '💰 Faturamento por mês', vazio: dados.faturamentoPorMes.every(m => !m.valor) ? 'Nenhum evento fechado no período.' : null },
        h(Barras, { cor: 'linear-gradient(90deg,#f97316,#dc2626)', fmt: C.brl,
          itens: dados.faturamentoPorMes.map(m => ({ label: mesLabel(m.mes), valor: m.valor, extra: m.eventos ? `${m.eventos} evento${m.eventos > 1 ? 's' : ''}` : '' })) })),
      h(Bloco, { titulo: '📣 Vendas por origem', vazio: dados.porOrigem.length ? null : 'Sem dados no período. Preencha a origem dos contatos na ficha do cliente.' },
        h(Barras, { cor: '#2563eb',
          itens: dados.porOrigem.map(o => ({ label: origemLabel(o.origem), valor: o.negocios, extra: `${o.ganhos} fechado${o.ganhos === 1 ? '' : 's'} · ${C.brl(o.valor)}${o.contatos ? ' · ' + o.contatos + ' contato' + (o.contatos > 1 ? 's' : '') : ''}` })) }),
        h('div', { className: 'crm-muted', style: { marginTop: 8 } }, 'Barra = negócios criados. Propostas antigas, de antes do CRM, aparecem como "Sem origem".')),
      h(Bloco, { titulo: '✖ Motivos de perda', vazio: dados.motivosPerda.length ? null : 'Nenhuma perda no período.' },
        h(Barras, { cor: '#dc2626', itens: dados.motivosPerda.map(m => ({ label: m.motivo, valor: m.total })) }))));
}

window.CrmReports = CrmReports;
})();
