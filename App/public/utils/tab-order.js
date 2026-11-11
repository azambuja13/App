(function () {
/**
 * Ordem das abas do menu (barra de baixo no celular e barra de abas no computador).
 * - Ordem padrão pelo fluxo de trabalho (comercial e dinheiro em cima; cozinha e cadastros embaixo).
 * - Cada usuário pode mudar: TabOrder.abrir() mostra a lista para arrastar (ou usar as setas).
 *   Também abre segurando o dedo ~0,6 s na barra de baixo, e pelo botão "⇅" da barra do computador
 *   e "Reordenar o menu" em Empresa.
 * - Salva neste aparelho (localStorage) e na conta (user-settings.tabOrder).
 * - Só usa CSS (order / grid) sobre os botões com [data-tab]; o perfil da equipe continua escondendo abas por CSS.
 */
const h = React.createElement;
const { useState, useEffect, useRef } = React;
const LS = 'ui_ordem_abas_v1';
const ABAS = [
  ['calendar', '📆', 'Agenda'], ['pipeline', '🎯', 'Funil'], ['clients', '👥', 'Clientes'], ['proposals', '📄', 'Propostas'],
  ['events', '📅', 'Eventos'], ['sales', '🧾', 'Vendas'], ['finance', '💰', 'Financeiro'], ['reports', '📊', 'Relatórios'],
  ['ingredients', '🥕', 'Ingredientes'], ['dishes', '🍽️', 'Pratos'], ['menu', '📋', 'Cardápio'], ['saved-menus', '💾', 'Salvos'],
  ['items', '🧺', 'Itens'], ['support', '🛟', 'Apoio'], ['stock', '📦', 'Estoque'], ['config', '🏢', 'Empresa']
];
const PADRAO = ABAS.map(a => a[0]);
const INFO = Object.fromEntries(ABAS.map(a => [a[0], a]));

function normalizar(lista) {
  const ok = [];
  (Array.isArray(lista) ? lista : []).forEach(t => { if (PADRAO.includes(t) && !ok.includes(t)) ok.push(t); });
  PADRAO.forEach(t => { if (!ok.includes(t)) ok.push(t); });
  return ok;
}
function ordem() {
  let l = null;
  try { l = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) {}
  if (!l) { try { l = window.userSettings && window.userSettings.tabOrder; } catch (e) {} }
  return normalizar(l);
}
function aplicar(lista) {
  const o = normalizar(lista || ordem());
  let st = document.getElementById('tab-order-css');
  if (!st) { st = document.createElement('style'); st.id = 'tab-order-css'; document.head.appendChild(st); }
  const regras = o.map((t, i) => `.abas-desktop>[data-tab="${t}"],.abas-mobile [data-tab="${t}"]{order:${i + 1}}`).join('');
  st.textContent = regras +
    '.abas-desktop>.abas-reordenar{order:999}' +
    '@media (max-width:1023px){.abas-mobile{display:grid!important;grid-template-columns:repeat(8,minmax(0,1fr));row-gap:2px;padding:4px 2px}' +
    '.abas-mobile>div{display:contents!important}.abas-mobile [data-tab]{min-width:0}}';
}
async function salvar(lista) {
  const o = normalizar(lista);
  try { localStorage.setItem(LS, JSON.stringify(o)); } catch (e) {}
  try { window.userSettings = { ...(window.userSettings || {}), tabOrder: o }; } catch (e) {}
  aplicar(o);
  const api = window.PrecificacaoAPI && window.PrecificacaoAPI.api;
  if (api && typeof api.request === 'function') {
    try { await api.request('/api/user-settings', { method: 'PATCH', body: JSON.stringify({ partialSettings: { tabOrder: o } }) }); } catch (e) { /* fica neste aparelho */ }
  }
  return o;
}
async function restaurar() {
  try { localStorage.removeItem(LS); } catch (e) {}
  return salvar(PADRAO.slice());
}

// ---------- Janela para reordenar ----------
const CSS = `
.to-bg{position:fixed;inset:0;background:rgba(17,24,39,.45);z-index:10000;display:flex;align-items:flex-end;justify-content:center}
@media (min-width:640px){.to-bg{align-items:center}}
.to{background:#fff;width:100%;max-width:440px;max-height:92vh;display:flex;flex-direction:column;border-radius:18px 18px 0 0;box-shadow:0 20px 50px rgba(0,0,0,.25);font-family:inherit}
@media (min-width:640px){.to{border-radius:18px}}
.to-hd{padding:16px 18px 8px}.to-hd b{font-size:18px;color:#111827}.to-hd p{margin:4px 0 0;font-size:13px;color:#6b7280}
.to-ls{overflow-y:auto;padding:4px 12px 8px;flex:1;touch-action:none}
.to-sep{font-size:11px;font-weight:700;color:#9a3412;text-transform:uppercase;letter-spacing:.05em;padding:8px 6px 4px}
.to-it{display:flex;align-items:center;gap:10px;padding:8px 8px;margin:3px 0;border:1px solid #e5e7eb;border-radius:12px;background:#fff;user-select:none;-webkit-user-select:none}
.to-it.arr{border-color:#ea580c;box-shadow:0 6px 16px rgba(234,88,12,.25);background:#fff7ed}
.to-pg{cursor:grab;color:#9ca3af;font-size:20px;padding:4px 6px;touch-action:none;line-height:1}
.to-nm{flex:1;font-weight:600;color:#111827;font-size:15px}
.to-bt{width:34px;height:34px;border-radius:10px;border:1px solid #e5e7eb;background:#f9fafb;font-size:16px;color:#374151;cursor:pointer}
.to-bt:disabled{opacity:.35;cursor:default}
.to-ft{display:flex;gap:8px;padding:12px 16px calc(12px + env(safe-area-inset-bottom));border-top:1px solid #f3f4f6}
.to-ft button{border:0;border-radius:12px;padding:12px 10px;font-weight:700;font-size:14px;cursor:pointer}
`;

function Reordenar({ onClose }) {
  const [lista, setLista] = useState(ordem());
  const [arrastando, setArrastando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const ref = useRef(null);
  const mover = (i, d) => setLista(l => { const j = i + d; if (j < 0 || j >= l.length) return l; const n = l.slice(); [n[i], n[j]] = [n[j], n[i]]; return n; });

  // Arrastar pelo ⠿ (dedo ou mouse)
  const inicio = (e, t) => {
    e.preventDefault();
    setArrastando(t);
    const mv = ev => {
      const y = ev.clientY;
      const itens = [...(ref.current ? ref.current.querySelectorAll('[data-it]') : [])];
      let alvo = itens.length - 1;
      for (let k = 0; k < itens.length; k++) { const r = itens[k].getBoundingClientRect(); if (y < r.top + r.height / 2) { alvo = k; break; } }
      setLista(l => { const de = l.indexOf(t); if (de < 0 || de === alvo) return l; const n = l.slice(); n.splice(de, 1); n.splice(alvo, 0, t); return n; });
      // rolar a lista perto das bordas
      const box = ref.current && ref.current.getBoundingClientRect();
      if (box) { if (y < box.top + 30) ref.current.scrollTop -= 12; else if (y > box.bottom - 30) ref.current.scrollTop += 12; }
    };
    const fim = () => { setArrastando(null); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', fim); window.removeEventListener('pointercancel', fim); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', fim); window.addEventListener('pointercancel', fim);
  };

  const ok = async () => { setSalvando(true); await salvar(lista); setSalvando(false); onClose(); };
  const padrao = () => setLista(PADRAO.slice());

  return h('div', { className: 'to-bg', onClick: e => { if (e.target === e.currentTarget) onClose(); } },
    h('div', { className: 'to', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Reordenar o menu', 'data-testid': 'reordenar' },
      h('div', { className: 'to-hd' }, h('b', null, '⇅ Ordem do menu'),
        h('p', null, 'Arraste pelo ⠿ ou use as setas. No celular, as 8 primeiras ficam na linha de cima.')),
      h('div', { className: 'to-ls', ref },
        lista.flatMap((t, i) => [
          i === 0 ? h('div', { key: 's1', className: 'to-sep' }, 'Linha de cima') : null,
          i === 8 ? h('div', { key: 's2', className: 'to-sep' }, 'Linha de baixo') : null,
          h('div', { key: t, 'data-it': t, className: 'to-it' + (arrastando === t ? ' arr' : '') },
            h('span', { className: 'to-pg', onPointerDown: e => inicio(e, t), 'aria-hidden': 'true', title: 'Arrastar' }, '⠿'),
            h('span', { style: { fontSize: 18 } }, INFO[t][1]),
            h('span', { className: 'to-nm' }, INFO[t][2]),
            h('button', { type: 'button', className: 'to-bt', disabled: i === 0, onClick: () => mover(i, -1), 'aria-label': 'Subir ' + INFO[t][2] }, '↑'),
            h('button', { type: 'button', className: 'to-bt', disabled: i === lista.length - 1, onClick: () => mover(i, 1), 'aria-label': 'Descer ' + INFO[t][2] }, '↓'))
        ].filter(Boolean))),
      h('div', { className: 'to-ft' },
        h('button', { type: 'button', onClick: padrao, style: { background: '#f3f4f6', color: '#374151' } }, 'Padrão'),
        h('div', { style: { flex: 1 } }),
        h('button', { type: 'button', onClick: onClose, style: { background: '#f3f4f6', color: '#374151' } }, 'Cancelar'),
        h('button', { type: 'button', onClick: ok, disabled: salvando, style: { background: '#ea580c', color: '#fff', minWidth: 96 }, 'data-testid': 'reordenar-salvar' }, salvando ? 'Salvando...' : 'Salvar'))));
}

function Host() {
  const [open, setOpen] = useState(false);
  useEffect(() => { window.__abrirReordenar = () => setOpen(true); return () => { delete window.__abrirReordenar; }; }, []);
  return open ? h(Reordenar, { onClose: () => setOpen(false) }) : null;
}
function abrir() { if (window.__abrirReordenar) window.__abrirReordenar(); }

// Segurar ~0,6 s na barra de baixo abre a janela (e não troca de aba)
function toqueLongo() {
  let timer = null, x0 = 0, y0 = 0, disparou = false;
  document.addEventListener('pointerdown', e => {
    const nav = e.target && e.target.closest && e.target.closest('.mobile-bottom-nav');
    if (!nav) return;
    x0 = e.clientX; y0 = e.clientY; disparou = false;
    clearTimeout(timer);
    timer = setTimeout(() => { disparou = true; try { navigator.vibrate && navigator.vibrate(15); } catch (er) {} abrir(); }, 600);
  }, true);
  const cancelar = () => clearTimeout(timer);
  document.addEventListener('pointerup', cancelar, true);
  document.addEventListener('pointercancel', cancelar, true);
  document.addEventListener('pointermove', e => { if (Math.abs(e.clientX - x0) > 10 || Math.abs(e.clientY - y0) > 10) cancelar(); }, true);
  document.addEventListener('click', e => { if (disparou && e.target.closest && e.target.closest('.mobile-bottom-nav')) { e.preventDefault(); e.stopPropagation(); disparou = false; } }, true);
  document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('.mobile-bottom-nav')) e.preventDefault(); }, true);
}

function mount() {
  aplicar();
  if (!document.getElementById('to-css')) { const st = document.createElement('style'); st.id = 'to-css'; st.textContent = CSS; document.head.appendChild(st); }
  if (!document.getElementById('to-host')) {
    const el = document.createElement('div'); el.id = 'to-host'; document.body.appendChild(el);
    if (ReactDOM.createRoot) ReactDOM.createRoot(el).render(h(Host)); else ReactDOM.render(h(Host), el);
  }
  toqueLongo();
  // As configurações da conta chegam depois do login: reaplica se este aparelho ainda não tem ordem própria
  [2000, 6000, 15000].forEach(ms => setTimeout(() => aplicar(), ms));
}

window.TabOrder = { PADRAO, ABAS, ordem, aplicar, salvar, restaurar, abrir, normalizar };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
