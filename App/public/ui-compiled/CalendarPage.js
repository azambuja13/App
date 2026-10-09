(function () {
'use strict';
/**
 * Agenda de Eventos - aba inicial
 * Calendário mensal com as datas fechadas (propostas aprovadas) e as datas
 * em negociação (propostas enviadas). Fonte: propostas do backend.
 */
const h = React.createElement;
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const FECHADA = ['accepted', 'approved'];
const NEGOCIACAO = ['sent'];

const pad = n => String(n).padStart(2, '0');
const keyOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
// "2026-12-10" ou ISO -> "2026-12-10" (sem converter fuso, pra não mudar o dia)
const dateKey = v => {
  if (!v) return null;
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
};
const brlCurto = v => { const n = Number(v) || 0; return (typeof window !== 'undefined' && window.innerWidth < 640 && n >= 10000) ? 'R$ ' + (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil' : brl(n); };
const brl = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDia = k => { const [y, m, d] = k.split('-'); return `${d}/${m}/${y}`; };
const nomeProposta = p => p.proposalName || p.title || 'Proposta';
const tipo = p => FECHADA.includes(p.status) ? 'fechada' : NEGOCIACAO.includes(p.status) ? 'negociacao' : null;

const CAL_CSS = `
/* Classes usadas pela Agenda que não existem no styles/output.css compilado */
.grid-cols-7{grid-template-columns:repeat(7,minmax(0,1fr))}
.w-2{width:.5rem}.h-2{height:.5rem}
.cal-tit{font-size:10px;line-height:1.2;font-weight:600;text-transform:uppercase;opacity:.8}
@media (min-width:768px){.cal-tit{font-size:12px;letter-spacing:.025em}}
.cal-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.5rem}.cal-cards>:nth-child(3){grid-column:span 2}
.cal-val{font-size:1.05rem;line-height:1.4rem;font-weight:700;margin-top:.25rem;overflow-wrap:anywhere}
@media (min-width:768px){.cal-cards{gap:1rem;grid-template-columns:repeat(3,minmax(0,1fr))}.cal-cards>:nth-child(3){grid-column:auto}.cal-val{font-size:1.5rem;line-height:2rem}}
.min-h-\\[52px\\]{min-height:52px}.min-w-\\[140px\\]{min-width:140px}
.text-\\[11px\\]{font-size:11px;line-height:1.3}
.gap-0\\.5{gap:2px}.py-1\\.5{padding-top:.375rem;padding-bottom:.375rem}
.w-9{width:2.25rem}.h-9{height:2.25rem}
.shrink-0{flex-shrink:0}.break-words{overflow-wrap:break-word}.align-top{vertical-align:top}
.opacity-70{opacity:.7}.opacity-80{opacity:.8}
.ring-2.ring-orange-500{box-shadow:0 0 0 2px #f97316}
.bg-amber-50{background-color:#fffbeb}.bg-amber-100{background-color:#fef3c7}.bg-amber-200{background-color:#fde68a}
.bg-amber-400{background-color:#fbbf24}.bg-amber-500{background-color:#f59e0b}
.border-amber-200{border-color:#fde68a}.border-amber-300{border-color:#fcd34d}
.text-amber-700{color:#b45309}.text-amber-800{color:#92400e}.text-amber-900{color:#78350f}
.hover\\:bg-orange-100:hover{background-color:#ffedd5}
@media (min-width:1024px){.lg\\:inline{display:inline}}
@media (min-width:768px){
 .md\\:gap-4{gap:1rem}.md\\:gap-6{gap:1.5rem}.md\\:min-h-\\[84px\\]{min-height:84px}
 .md\\:p-1\\.5{padding:.375rem}.md\\:p-4{padding:1rem}.md\\:p-6{padding:1.5rem}
 .md\\:space-y-6>:not([hidden])~:not([hidden]){margin-top:1.5rem}
 .md\\:text-2xl{font-size:1.5rem;line-height:2rem}.md\\:text-sm{font-size:.875rem;line-height:1.25rem}.md\\:text-xs{font-size:.75rem;line-height:1rem}
}
`;
function injectCss() {
  if (document.getElementById('calendar-page-css')) return;
  const st = document.createElement('style');
  st.id = 'calendar-page-css';
  st.textContent = CAL_CSS;
  document.head.appendChild(st);
}
function CalendarPage() {
  injectCss();
  const hoje = new Date();
  const hojeKey = keyOf(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const [ano, setAno] = React.useState(hoje.getFullYear());
  const [mes, setMes] = React.useState(hoje.getMonth());
  const [propostas, setPropostas] = React.useState([]);
  const [carregando, setCarregando] = React.useState(true);
  const [diaSel, setDiaSel] = React.useState(hojeKey);
  const [previewId, setPreviewId] = React.useState(null);

  const carregar = React.useCallback(async () => {
    const pm = window.PrecificacaoAPI?.proposalManager;
    if (!pm) return;
    try {
      // Buscar direto do servidor (pega mudanças feitas em outro aparelho);
      // se falhar, usa o que já está carregado no app
      let todas = null;
      try {
        const r = await pm.api.getProposals();
        todas = (r && (r.data || r.proposals)) || null;
      } catch (e) { todas = null; }
      if (!Array.isArray(todas)) todas = await pm.getAll(true);
      setPropostas((todas || []).filter(p => p && p.id && p.status !== 'deleted'));
    } catch (e) {
      console.warn('⚠️ [Agenda] Erro ao carregar propostas:', e && e.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  React.useEffect(() => {
    carregar();
    const onTab = e => { if (e.detail === 'calendar') carregar(); };
    window.addEventListener('backend-phase2-complete', carregar);
    window.addEventListener('proposalSaved', carregar);
    window.addEventListener('tab-changed', onTab);
    // Backend ainda inicializando: tentar de novo por alguns segundos
    const t = setInterval(() => { if (window.PrecificacaoAPI?.proposalManager) { carregar(); clearInterval(t); } }, 1500);
    const t2 = setTimeout(() => { clearInterval(t); setCarregando(false); }, 20000);
    return () => {
      window.removeEventListener('backend-phase2-complete', carregar);
      window.removeEventListener('proposalSaved', carregar);
      window.removeEventListener('tab-changed', onTab);
      clearInterval(t); clearTimeout(t2);
    };
  }, [carregar]);

  // Agrupar propostas por dia
  const porDia = React.useMemo(() => {
    const mapa = {};
    propostas.forEach(p => {
      const t = tipo(p);
      const k = dateKey(p.eventDate);
      if (!t || !k) return;
      (mapa[k] = mapa[k] || []).push({ ...p, _tipo: t });
    });
    Object.values(mapa).forEach(l => l.sort((a, b) => (a._tipo === 'fechada' ? -1 : 1) - (b._tipo === 'fechada' ? -1 : 1)));
    return mapa;
  }, [propostas]);

  const prefixoMes = `${ano}-${pad(mes + 1)}`;
  const doMes = Object.keys(porDia).filter(k => k.startsWith(prefixoMes)).flatMap(k => porDia[k]);
  const fechadasMes = doMes.filter(p => p._tipo === 'fechada');
  const negociacaoMes = doMes.filter(p => p._tipo === 'negociacao');
  const faturamentoMes = fechadasMes.reduce((s, p) => s + (Number(p.finalTotal) || 0), 0);
  const semData = propostas.filter(p => tipo(p) === 'fechada' && !dateKey(p.eventDate)).length;
  const proximas = Object.keys(porDia).filter(k => k >= hojeKey).sort()
    .flatMap(k => porDia[k].filter(p => p._tipo === 'fechada').map(p => ({ ...p, _dia: k }))).slice(0, 8);

  const mudarMes = delta => {
    let m = mes + delta, a = ano;
    if (m < 0) { m = 11; a--; } else if (m > 11) { m = 0; a++; }
    setMes(m); setAno(a);
  };
  const irHoje = () => { setAno(hoje.getFullYear()); setMes(hoje.getMonth()); setDiaSel(hojeKey); };

  // Montar grade do mês
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const celulas = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d);
  while (celulas.length % 7) celulas.push(null);

  const card = (titulo, valor, cor, sub) => h('div', { className: `rounded-xl p-3 md:p-4 border ${cor}` },
    h('div', { className: 'cal-tit' }, titulo),
    h('div', { className: 'cal-val' }, valor),
    sub && h('div', { className: 'text-[11px] opacity-70 mt-0.5' }, sub));

  const badge = t => t === 'fechada'
    ? h('span', { className: 'inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-800' }, 'Fechada')
    : h('span', { className: 'inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800' }, 'Em negociação');

  const itemProposta = (p, mostrarData) => h('div', { key: p.id + (p._dia || ''), className: 'flex items-start justify-between gap-3 p-3 rounded-lg border border-gray-200 bg-white' },
    h('div', { className: 'min-w-0 flex-1' },
      h('div', { className: 'flex flex-wrap items-center gap-2 mb-1' },
        mostrarData && h('span', { className: 'text-xs font-bold text-gray-700' }, '📅 ' + fmtDia(p._dia)),
        badge(p._tipo)),
      h('div', { className: 'font-semibold text-gray-900 break-words' }, nomeProposta(p)),
      h('div', { className: 'text-xs text-gray-600 mt-0.5 break-words' },
        [p.clientName && '👤 ' + p.clientName, p.guests ? '👥 ' + p.guests + ' convidados' : null, p.eventLocation && '📍 ' + p.eventLocation].filter(Boolean).join('  ·  ')),
      p.finalTotal ? h('div', { className: 'text-sm font-bold text-green-700 mt-1' }, brl(p.finalTotal)) : null),
    window.ProposalPreview && h('button', {
      onClick: () => setPreviewId(p.id),
      className: 'shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
    }, 'Ver'));

  const listaDia = porDia[diaSel] || [];
  const fechadasDia = listaDia.filter(p => p._tipo === 'fechada').length;

  return h('div', { className: 'space-y-4 md:space-y-6' },
    // Cabeçalho
    h('div', { className: 'bg-white rounded-xl shadow-lg p-4 md:p-6' },
      h('div', { className: 'flex flex-wrap items-center justify-between gap-3 mb-4' },
        h('div', null,
          h('h2', { className: 'text-xl md:text-2xl font-bold text-gray-900' }, '📆 Agenda de Eventos'),
          h('p', { className: 'text-xs md:text-sm text-gray-600' }, 'Datas fechadas (propostas aprovadas) e em negociação (propostas enviadas)')),
        h('div', { className: 'flex items-center gap-2 w-full sm:w-auto' },
          h('button', { onClick: () => mudarMes(-1), className: 'w-9 h-9 rounded-lg border border-gray-300 hover:bg-gray-100 font-bold', 'aria-label': 'Mês anterior' }, '‹'),
          h('div', { className: 'flex-1 min-w-0 text-center font-bold text-gray-900 whitespace-nowrap', style: { overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 15 } }, `${window.innerWidth < 480 ? MESES[mes].slice(0, 3) : MESES[mes]} ${ano}`),
          h('button', { onClick: () => mudarMes(1), className: 'w-9 h-9 rounded-lg border border-gray-300 hover:bg-gray-100 font-bold', 'aria-label': 'Próximo mês' }, '›'),
          h('button', { onClick: irHoje, className: 'px-3 h-9 rounded-lg bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700' }, 'Hoje'))),
      h('div', { className: 'cal-cards' },
        card('Fechadas', fechadasMes.length, 'bg-green-50 border-green-200 text-green-900', 'neste mês'),
        card('Em negociação', negociacaoMes.length, 'bg-amber-50 border-amber-200 text-amber-900', 'neste mês'),
        card('Faturamento', brl(faturamentoMes), 'bg-blue-50 border-blue-200 text-blue-900', 'fechado no mês'))),

    // Calendário + detalhe do dia
    h('div', { className: 'grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6' },
      h('div', { className: 'lg:col-span-2 bg-white rounded-xl shadow-lg p-2 md:p-4' },
        h('div', { className: 'grid grid-cols-7 gap-1 mb-1' },
          DIAS.map(d => h('div', { key: d, className: 'text-center text-[11px] md:text-xs font-bold text-gray-500 py-1' }, d))),
        h('div', { className: 'grid grid-cols-7 gap-1' },
          celulas.map((d, i) => {
            if (!d) return h('div', { key: 'v' + i, className: 'min-h-[52px] md:min-h-[84px]' });
            const k = keyOf(ano, mes, d);
            const lista = porDia[k] || [];
            const fech = lista.filter(p => p._tipo === 'fechada');
            const neg = lista.filter(p => p._tipo === 'negociacao');
            const conflito = fech.length > 0 && neg.length > 0;
            const sel = k === diaSel;
            const passado = k < hojeKey;
            // (sem a classe bg-white: no celular o mobile-optimizations.css força padding em .bg-white)
            const fundo = fech.length ? 'bg-green-50 border-green-400' : neg.length ? 'bg-amber-50 border-amber-300' : 'border-gray-200';
            // div (não button): o CSS do celular aplica padding/largura mínima em todos os botões
            return h('div', {
              key: k, role: 'button', tabIndex: 0, onClick: () => setDiaSel(k),
              onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDiaSel(k); } },
              style: { display: 'flex', flexDirection: 'column', alignItems: 'stretch', width: '100%', minWidth: 0, boxSizing: 'border-box', cursor: 'pointer', padding: '4px 5px', backgroundColor: (fech.length || neg.length) ? undefined : '#fff', overflow: 'hidden', boxShadow: sel ? '0 0 0 2px #f97316' : undefined },
              className: `min-h-[52px] md:min-h-[84px] rounded-lg border p-1 md:p-1.5 text-left align-top flex flex-col transition hover:shadow ${fundo} ${sel ? 'ring-2 ring-orange-500' : ''} ${passado && !lista.length ? 'opacity-60' : ''}`
            },
              h('div', { className: 'flex items-center justify-between', style: { width: '100%' } },
                h('span', { className: `text-xs md:text-sm font-bold ${k === hojeKey ? 'bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : 'text-gray-800'}` }, d),
                conflito && h('span', { title: 'Proposta enviada para uma data já fechada', className: 'hidden lg:inline text-[11px]' }, '⚠️')),
              // Celular: bolinhas | Computador: nomes
              lista.length > 0 && h('div', { className: 'flex gap-0.5 mt-auto lg:hidden flex-wrap', style: { width: '100%', paddingTop: 4 } },
                fech.slice(0, 3).map((p, j) => h('span', { key: 'f' + j, style: { display: 'inline-block', width: 7, height: 7, borderRadius: 9999, flexShrink: 0 }, className: 'w-2 h-2 rounded-full bg-green-600' })),
                neg.slice(0, 3).map((p, j) => h('span', { key: 'n' + j, style: { display: 'inline-block', width: 7, height: 7, borderRadius: 9999, flexShrink: 0 }, className: 'w-2 h-2 rounded-full bg-amber-500' })),
                conflito && h('span', { key: 'c', style: { display: 'inline-block', width: 7, height: 7, borderRadius: 9999, flexShrink: 0 }, className: 'w-2 h-2 rounded-full bg-red-600' })),
              h('div', { className: 'hidden lg:flex flex-col gap-0.5 mt-1 min-w-0', style: { width: '100%' } },
                lista.slice(0, 2).map((p, j) => h('span', {
                  key: j, className: `truncate text-[10px] px-1 rounded ${p._tipo === 'fechada' ? 'bg-green-600 text-white' : 'bg-amber-200 text-amber-900'}`
                }, p.clientName || nomeProposta(p))),
                lista.length > 2 && h('span', { className: 'text-[10px] text-gray-500' }, `+${lista.length - 2}`)));
          })),
        h('div', { className: 'flex flex-wrap gap-4 mt-3 px-1 text-xs text-gray-600' },
          h('span', { className: 'flex items-center gap-1.5' }, h('span', { className: 'w-3 h-3 rounded bg-green-500' }), 'Fechada'),
          h('span', { className: 'flex items-center gap-1.5' }, h('span', { className: 'w-3 h-3 rounded bg-amber-400' }), 'Em negociação'),
          h('span', { className: 'flex items-center gap-1.5' }, h('span', { className: 'w-3 h-3 rounded bg-red-600 lg:hidden' }), h('span', { className: 'hidden lg:inline' }, '⚠️'), 'Enviada para data já fechada'))),

      h('div', { className: 'bg-white rounded-xl shadow-lg p-4' },
        h('h3', { className: 'font-bold text-gray-900 mb-1' }, fmtDia(diaSel)),
        h('p', { className: 'text-xs text-gray-600 mb-3' },
          listaDia.length === 0 ? 'Data livre - nenhum evento fechado ou em negociação.'
            : fechadasDia ? `Data fechada (${fechadasDia} evento${fechadasDia > 1 ? 's' : ''})` : 'Em negociação'),
        h('div', { className: 'space-y-2' }, listaDia.map(p => itemProposta(p, false))))),

    // Próximos eventos fechados
    h('div', { className: 'bg-white rounded-xl shadow-lg p-4 md:p-6' },
      h('h3', { className: 'font-bold text-gray-900 mb-3' }, '✅ Próximos eventos fechados'),
      carregando && propostas.length === 0 ? h('p', { className: 'text-sm text-gray-500' }, 'Carregando...')
        : proximas.length === 0 ? h('p', { className: 'text-sm text-gray-500' }, 'Nenhum evento fechado daqui pra frente. Quando uma proposta for marcada como "Aprovada" na aba Propostas, a data aparece aqui.')
        : h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' }, proximas.map(p => itemProposta(p, true))),
      semData > 0 && h('p', { className: 'text-xs text-amber-700 mt-3' }, `⚠️ ${semData} proposta${semData > 1 ? 's' : ''} aprovada${semData > 1 ? 's' : ''} sem data do evento - edite a proposta para informar a data.`)),

    window.ProposalPreview && h(window.ProposalPreview, {
      proposalId: previewId,
      isOpen: previewId !== null,
      onClose: () => setPreviewId(null),
      onDelete: () => { setPreviewId(null); carregar(); }
    }));
}

window.CalendarPage = CalendarPage;
})();
