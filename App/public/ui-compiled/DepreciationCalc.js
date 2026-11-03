(function () {
'use strict';
/**
 * Depreciação de equipamentos (nov/2026). Não muda o preço sozinho; o custo por evento de cada
 * equipamento pode ir para o Apoio do evento ("➕ Usar no Apoio", regra fixa 1 por evento).
 * Abre com window.openDepreciation() (Dados da Empresa → "🧮 Depreciação de equipamentos").
 * Método linear: (valor de compra − valor de revenda no fim) ÷ vida útil em meses.
 * Guarda a lista em user-settings → settingsData.equipamentos (PATCH, mescla).
 * Sem login/nuvem: só neste aparelho (localStorage).
 */
const h = React.createElement;
const { useState, useEffect } = React;
const LS_KEY = 'precificacao_equipamentos';

// Vida útil de referência (Receita Federal, IN RFB 1.700/2017, Anexo III)
const TIPOS = [
  ['cozinha', 'Equipamento de cozinha (fogão, forno, freezer…)', 10],
  ['churrasco', 'Churrasqueira, defumador, parrilla', 10],
  ['veiculo', 'Veículo (carro, van, utilitário)', 5],
  ['moveis', 'Móveis e utensílios (mesas, louças, réchauds…)', 10],
  ['informatica', 'Computador, celular, maquininha', 5],
  ['outro', 'Outro', 5]
];
const vidaPadrao = t => (TIPOS.find(x => x[0] === t) || TIPOS[TIPOS.length - 1])[2];

const CSS = `
#deprec-host .dp-bg{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:70;display:flex;align-items:flex-end;justify-content:center}
@media (min-width:768px){#deprec-host .dp-bg{align-items:center;padding:16px}}
#deprec-host .dp{background:#fff;width:100%;max-width:720px;max-height:92vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom));font-family:system-ui,-apple-system,sans-serif;color:#111827;box-sizing:border-box}
@media (min-width:768px){#deprec-host .dp{border-radius:16px}}
#deprec-host .dp h2{font-size:19px;font-weight:800;margin:0}
#deprec-host .dp .muted{color:#6b7280;font-size:13px;line-height:1.45}
#deprec-host .dp .how{background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:10px 12px;margin-top:10px;font-size:13px;line-height:1.5;color:#1e3a8a}
#deprec-host .dp .item{border:1px solid #e5e7eb;border-radius:12px;padding:10px 12px;margin-top:10px}
#deprec-host .dp .grid{display:flex;flex-wrap:wrap;gap:8px}
#deprec-host .dp .grid label{display:flex;flex-direction:column;gap:3px;flex:1 1 140px;font-size:12px;color:#4b5563;min-width:0}
#deprec-host .dp .grid label.w{flex-basis:100%}
#deprec-host .dp input,#deprec-host .dp select{width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #d1d5db;border-radius:10px;font-size:16px;background:#fff;color:#111827}
#deprec-host .dp .res{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px;font-size:13px}
#deprec-host .dp .res b{color:#111827}
#deprec-host .dp .tag{display:inline-block;font-size:11px;font-weight:700;border-radius:999px;padding:2px 8px}
#deprec-host .dp .btn{display:inline-flex;align-items:center;justify-content:center;border-radius:10px;padding:11px 16px;font-weight:700;cursor:pointer;user-select:none;font-size:15px}
#deprec-host .dp .tot{background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:12px;margin-top:14px}
#deprec-host .dp .tot .k{display:flex;flex-wrap:wrap;gap:10px}
#deprec-host .dp .tot .k > div{flex:1 1 140px;background:#fff;border-radius:10px;padding:8px 10px}
#deprec-host .dp .tot .k b{display:block;font-size:17px}
`;

// Aceita vírgula (6,5) e ponto de milhar (10.000)
const n = x => { let t = String(x == null ? '' : x).trim(); if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, ''); const r = parseFloat(t.replace(',', '.')); return isFinite(r) ? r : 0; };
const brl = x => 'R$ ' + (x || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const txt = x => (x === '' || x == null) ? '' : String(x).replace('.', ',');
const mesAtual = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const novoId = () => 'eq' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const novoItem = () => ({ id: novoId(), nome: '', tipo: 'cozinha', valor: '', residual: '', vidaAnos: '10', compra: '', usos: '' });

/** Conta de um equipamento (método linear). hoje = 'AAAA-MM' (para testes).
 *  usosPadrao = eventos por mês quando o item não tem os próprios usos. */
function calcular(it, hoje, usosPadrao) {
  const valor = n(it.valor), residual = Math.min(n(it.residual), valor), anos = n(it.vidaAnos);
  const vidaMeses = Math.round(anos * 12);
  if (!(valor > 0) || !(vidaMeses > 0)) return null;
  const mensal = (valor - residual) / vidaMeses;
  let meses = null;
  if (/^\d{4}-\d{2}$/.test(it.compra || '')) {
    const [ay, am] = (hoje || mesAtual()).split('-').map(Number), [cy, cm] = it.compra.split('-').map(Number);
    meses = Math.max(0, (ay - cy) * 12 + (am - cm));
  }
  const usados = meses == null ? null : Math.min(meses, vidaMeses);
  const usos = n(it.usos) > 0 ? n(it.usos) : (n(usosPadrao) > 0 ? n(usosPadrao) : 0);
  const acumulada = usados == null ? null : mensal * usados;
  return {
    valor, residual, vidaMeses, mensal, anual: mensal * 12, taxaAno: anos > 0 ? 100 / anos : 0,
    usos, porEvento: usos > 0 ? Math.round(mensal / usos * 100) / 100 : null,
    meses, acumulada, valorAtual: acumulada == null ? null : valor - acumulada,
    restantes: usados == null ? null : vidaMeses - usados,
    quitado: usados != null && usados >= vidaMeses
  };
}

function totais(itens, hoje, usosPadrao) {
  const t = { valor: 0, mensal: 0, anual: 0, valorAtual: 0, temAtual: false, ativos: 0, quitados: 0 };
  itens.forEach(it => {
    const c = calcular(it, hoje, usosPadrao); if (!c) return;
    t.valor += c.valor;
    if (c.quitado) t.quitados++; else { t.ativos++; t.mensal += c.mensal; t.anual += c.anual; }
    t.valorAtual += c.valorAtual == null ? c.valor : c.valorAtual;
    if (c.valorAtual != null) t.temAtual = true;
  });
  return t;
}

function carregarLocal() {
  try { const s = window.userSettings && window.userSettings.equipamentos; if (s) return s; } catch (e) {}
  try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { return null; }
}

async function salvar(dados) {
  const token = (() => { try { return localStorage.getItem('accessToken'); } catch (e) { return null; } })();
  const api = window.PrecificacaoAPI && window.PrecificacaoAPI.api;
  if (token && api && typeof api.request === 'function') {
    try {
      await api.request('/api/user-settings', { method: 'PATCH', body: JSON.stringify({ partialSettings: { equipamentos: dados } }) });
    } catch (e) {
      throw new Error('Não foi possível salvar na nuvem. Confira a internet e tente de novo. (' + (e.message || 'erro') + ')');
    }
  }
  try { localStorage.setItem(LS_KEY, JSON.stringify(dados)); } catch (e) {}
  try { window.userSettings = { ...(window.userSettings || {}), equipamentos: dados }; } catch (e) {}
}

function Item({ it, onChange, onRemove, usosPadrao, onApoio }) {
  const c = calcular(it, null, usosPadrao);
  const set = (k, v) => onChange({ ...it, [k]: v });
  return h('div', { className: 'item', 'data-testid': 'dep-item' },
    h('div', { className: 'grid' },
      h('label', { className: 'w' }, 'Equipamento',
        h('input', { value: it.nome, placeholder: 'Ex.: Defumador 200 L', onChange: e => set('nome', e.target.value), 'data-f': 'nome' })),
      h('label', null, 'Tipo',
        h('select', { value: it.tipo, 'data-f': 'tipo', onChange: e => onChange({ ...it, tipo: e.target.value, vidaAnos: String(vidaPadrao(e.target.value)) }) },
          TIPOS.map(([k, l]) => h('option', { key: k, value: k }, l)))),
      h('label', null, 'Valor de compra (R$)',
        h('input', { inputMode: 'decimal', value: it.valor, placeholder: '0,00', onChange: e => set('valor', e.target.value), 'data-f': 'valor' })),
      h('label', null, 'Revenda no fim (R$)',
        h('input', { inputMode: 'decimal', value: it.residual, placeholder: '0,00', onChange: e => set('residual', e.target.value), 'data-f': 'residual' })),
      h('label', null, 'Vida útil (anos)',
        h('input', { inputMode: 'decimal', value: it.vidaAnos, onChange: e => set('vidaAnos', e.target.value), 'data-f': 'vidaAnos' })),
      h('label', null, 'Comprado em (mês/ano)',
        h('input', { type: 'month', value: it.compra || '', max: mesAtual(), onChange: e => set('compra', e.target.value), 'data-f': 'compra' })),
      h('label', null, 'Usos por mês (eventos)',
        h('input', { inputMode: 'numeric', value: it.usos || '', placeholder: n(usosPadrao) > 0 ? txt(n(usosPadrao)) + ' (padrão)' : 'ex.: 4', onChange: e => set('usos', e.target.value), 'data-f': 'usos' }))),
    c ? h('div', { className: 'res' },
      h('span', null, 'Por mês: ', h('b', { 'data-r': 'mensal' }, brl(c.mensal))),
      c.porEvento != null && !c.quitado ? h('span', null, 'Por evento: ', h('b', { 'data-r': 'porEvento', style: { color: '#c2410c' } }, brl(c.porEvento))) : null,
      h('span', null, 'Por ano: ', h('b', null, brl(c.anual)), ' (' + c.taxaAno.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '% a.a.)'),
      c.valorAtual != null ? h('span', null, 'Vale hoje: ', h('b', { 'data-r': 'atual' }, brl(c.valorAtual))) : null,
      c.quitado ? h('span', { className: 'tag', style: { background: '#dcfce7', color: '#166534' } }, '✓ Já depreciado')
        : c.restantes != null ? h('span', { className: 'muted' }, 'Faltam ' + c.restantes + ' ' + (c.restantes === 1 ? 'mês' : 'meses')) : null)
      : h('div', { className: 'muted', style: { marginTop: 6 } }, 'Preencha o valor de compra e a vida útil.'),
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 8 } },
      c && c.porEvento != null && !c.quitado
        ? h('div', { className: 'btn', role: 'button', 'data-testid': 'dep-apoio', onClick: () => onApoio(it, c), style: { background: '#fff7ed', color: '#c2410c', border: '1px solid #fdba74', padding: '7px 12px', fontSize: 13 } }, '➕ Usar no Apoio (' + brl(c.porEvento) + '/evento)')
        : h('span', { className: 'muted', style: { fontSize: 12 } }, c && !c.quitado ? 'Informe os usos por mês para ver o custo por evento.' : ''),
      h('span', { role: 'button', onClick: onRemove, style: { color: '#b91c1c', fontSize: 13, cursor: 'pointer' } }, 'Remover')));
}

function DepreciationCalc({ onClose }) {
  const ini = carregarLocal();
  const [itens, setItens] = useState(() => (ini && Array.isArray(ini.itens) && ini.itens.length) ? ini.itens : [novoItem()]);
  const [eventosMes, setEventosMes] = useState(() => (ini && ini.eventosMes) ? txt(ini.eventosMes) : '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  // Abriu antes das configurações chegarem da nuvem: busca a lista salva
  useEffect(() => {
    if (ini) return;
    const api = window.PrecificacaoAPI && window.PrecificacaoAPI.api;
    if (!api || !localStorage.getItem('accessToken')) return;
    api.request('/api/user-settings').then(r => {
      const s = r && r.data && r.data.settingsData && r.data.settingsData.equipamentos;
      if (s && Array.isArray(s.itens) && s.itens.length) { setItens(s.itens); if (s.eventosMes) setEventosMes(txt(s.eventosMes)); }
    }).catch(() => {});
  }, []);

  const ev = n(eventosMes);
  const t = totais(itens, null, ev);
  const mudar = (i, novo) => setItens(l => l.map((x, k) => k === i ? novo : x));
  const remover = i => setItens(l => l.length > 1 ? l.filter((_, k) => k !== i) : [novoItem()]);
  // Coloca (ou atualiza) o custo por evento no Apoio do evento aberto
  const usarNoApoio = (it, c) => {
    const nome = 'Depreciação: ' + (it.nome.trim() || 'equipamento');
    if (typeof window.__upsertSupportItem !== 'function') { setMsg({ ok: false, t: 'Abra a tela de precificação de um evento para usar no Apoio.' }); return; }
    const r = window.__upsertSupportItem({ name: nome, cost: c.porEvento, quantity: 1, rule: 'fixed', factor: 1, unit: 'evento' });
    setMsg({ ok: true, t: (r === 'updated' ? 'Atualizado no Apoio: ' : 'Adicionado ao Apoio: ') + nome + ' — ' + brl(c.porEvento) + ' por evento.' });
  };

  const onSalvar = async () => {
    setSaving(true); setMsg(null);
    try {
      const limpos = itens.filter(x => x.nome.trim() || n(x.valor) > 0)
        .map(x => ({ id: x.id, nome: x.nome.trim(), tipo: x.tipo, valor: txt(n(x.valor)), residual: x.residual === '' ? '' : txt(n(x.residual)), vidaAnos: txt(n(x.vidaAnos)), compra: x.compra || '', usos: n(x.usos) > 0 ? txt(n(x.usos)) : '' }));
      await salvar({ itens: limpos, eventosMes: ev > 0 ? ev : null, atualizadoEm: new Date().toISOString() });
      setMsg({ ok: true, t: 'Salvo!' });
    } catch (e) { setMsg({ ok: false, t: e.message || 'Erro ao salvar' }); }
    finally { setSaving(false); }
  };

  return h('div', { className: 'dp-bg', onClick: e => { if (e.target === e.currentTarget) onClose(); } },
    h('div', { className: 'dp', role: 'dialog', 'aria-label': 'Depreciação de equipamentos' },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 } },
        h('div', null, h('div', { className: 'muted' }, 'Dados da empresa'), h('h2', null, '🧮 Depreciação de equipamentos')),
        h('div', { role: 'button', 'aria-label': 'Fechar', onClick: onClose, style: { fontSize: 22, cursor: 'pointer', padding: '0 6px' } }, '✕')),
      h('div', { className: 'how' },
        h('b', null, 'Como funciona'),
        h('div', { style: { marginTop: 4 } }, 'Quanto cada equipamento perde de valor por mês com o uso e o tempo (método linear): (valor de compra − valor de revenda no fim) ÷ vida útil em meses. A vida útil já vem com a referência da Receita Federal; mude se o seu equipamento dura mais ou menos.'),
        h('div', { style: { marginTop: 4 } }, 'Não muda o preço sozinho. Para cobrar o desgaste de um equipamento (ex.: o pit), informe quantos eventos ele faz por mês e toque em ', h('b', null, '➕ Usar no Apoio'), ': o custo por evento entra no Apoio do evento aberto.')),
      itens.map((it, i) => h(Item, { key: it.id, it, usosPadrao: ev, onApoio: usarNoApoio, onChange: novo => mudar(i, novo), onRemove: () => remover(i) })),
      h('div', { className: 'btn', role: 'button', 'data-testid': 'dep-add', onClick: () => setItens(l => [...l, novoItem()]), style: { background: '#f3f4f6', width: '100%', marginTop: 10, boxSizing: 'border-box' } }, '+ Adicionar equipamento'),
      h('div', { className: 'tot', 'data-testid': 'dep-total' },
        h('div', { className: 'k' },
          h('div', null, h('span', { className: 'muted' }, 'Depreciação por mês'), h('b', { 'data-r': 'tmensal' }, brl(t.mensal))),
          h('div', null, h('span', { className: 'muted' }, 'Por ano'), h('b', null, brl(t.anual))),
          h('div', null, h('span', { className: 'muted' }, 'Pago nos equipamentos'), h('b', null, brl(t.valor))),
          t.temAtual ? h('div', null, h('span', { className: 'muted' }, 'Valem hoje (aprox.)'), h('b', null, brl(t.valorAtual))) : null),
        t.quitados ? h('div', { className: 'muted', style: { marginTop: 8 } }, t.quitados + (t.quitados === 1 ? ' equipamento já está totalmente depreciado e não entra' : ' equipamentos já estão totalmente depreciados e não entram') + ' na conta do mês.') : null,
        h('div', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 14 } },
          h('span', null, 'Eventos por mês (padrão):'),
          h('input', { inputMode: 'numeric', value: eventosMes, placeholder: 'ex.: 6', onChange: e => setEventosMes(e.target.value), style: { width: 90 }, 'data-f': 'eventosMes' }),
          ev > 0 && t.mensal > 0 ? h('span', null, '≈ ', h('b', { 'data-r': 'totalPorEvento' }, brl(t.mensal / ev)), ' de desgaste de tudo por evento') : null),
        t.mensal > 0 ? h('div', { className: 'muted', style: { marginTop: 8 } }, 'Dica: guardar ' + brl(t.mensal) + ' por mês forma o caixa para trocar os equipamentos quando chegarem ao fim da vida útil.') : null),
      msg ? h('div', { style: { marginTop: 12, color: msg.ok ? '#15803d' : '#b91c1c', fontWeight: 600 } }, msg.t) : null,
      h('div', { style: { display: 'flex', gap: 8, marginTop: 16 } },
        h('div', { className: 'btn', role: 'button', onClick: onClose, style: { background: '#f3f4f6', flex: 1 } }, 'Fechar'),
        h('div', { className: 'btn', role: 'button', 'data-testid': 'dep-salvar', onClick: saving ? undefined : onSalvar, style: { background: '#ea580c', color: '#fff', flex: 2, opacity: saving ? .6 : 1 } }, saving ? 'Salvando...' : 'Salvar lista'))));
}

function Host() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    window.openDepreciation = () => setOpen(true);
    return () => { if (window.openDepreciation) delete window.openDepreciation; };
  }, []);
  return open ? h(DepreciationCalc, { onClose: () => setOpen(false) }) : null;
}

function mount() {
  if (document.getElementById('deprec-host')) return;
  if (!document.getElementById('deprec-css')) { const st = document.createElement('style'); st.id = 'deprec-css'; st.textContent = CSS; document.head.appendChild(st); }
  const el = document.createElement('div'); el.id = 'deprec-host'; document.body.appendChild(el);
  if (ReactDOM.createRoot) ReactDOM.createRoot(el).render(h(Host)); else ReactDOM.render(h(Host), el);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
window.Depreciacao = { calcular, totais, LS_KEY };
})();
