(function () {
'use strict';
/**
 * Equipe (nov/2026, PREMIUM)
 * - window.Equipe: quem está usando (dono ou pessoa da equipe, pelo token) e o que o perfil pode ver.
 *   Esconde as abas que o perfil não usa (CSS por [data-tab]) e avisa o App ('equipe-changed').
 * - window.openEquipe(): o dono adiciona, muda o perfil, desativa e remove pessoas.
 * A API é quem bloqueia de verdade (402 ROLE_FORBIDDEN); aqui é só para não mostrar o que não dá para usar.
 */
const h = React.createElement;

// Mesma tabela da API (src/utils/teamRoles.js); a API manda a versão atual em /api/team/me
const PERFIS = {
  gerente: { label: 'Gerente', areas: { clientes: 'rw', propostas: 'rw', eventos: 'rw', cardapios: 'rw', catalogo: 'rw', estoque: 'rw', vendas: 'rw', financeiro: 'rw', relatorios: 'rw', empresa: 'rw' } },
  comercial: { label: 'Comercial', areas: { clientes: 'rw', propostas: 'rw', eventos: 'rw', cardapios: 'rw', catalogo: 'r', empresa: 'r' } },
  cozinha: { label: 'Cozinha', areas: { eventos: 'r', propostas: 'r', cardapios: 'rw', catalogo: 'rw', estoque: 'rw', vendas: 'rw', empresa: 'r' } },
  financeiro: { label: 'Financeiro', areas: { financeiro: 'rw', relatorios: 'r', propostas: 'r', clientes: 'r', eventos: 'r', cardapios: 'r', catalogo: 'r', estoque: 'r', vendas: 'r', empresa: 'r' } }
};
// Aba do app → área
const ABA_AREA = {
  items: 'eventos', support: 'eventos', events: 'eventos', calendar: 'eventos',
  menu: 'cardapios', 'saved-menus': 'cardapios', dishes: 'catalogo', ingredients: 'catalogo',
  clients: 'clientes', pipeline: 'clientes', proposals: 'propostas',
  finance: 'financeiro', reports: 'relatorios', sales: 'vendas', stock: 'estoque',
  whatsapp: 'empresa!' // ! = precisa poder alterar
};
const ORDEM = ['proposals', 'pipeline', 'clients', 'events', 'calendar', 'items', 'menu', 'saved-menus', 'dishes', 'ingredients', 'stock', 'sales', 'finance', 'reports'];

function tokenInfo() {
  try {
    const t = localStorage.getItem('accessToken');
    if (!t) return null;
    const p = JSON.parse(decodeURIComponent(escape(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));
    return p && p.mid ? { id: p.mid, name: p.mname || '', role: p.role } : null;
  } catch (e) { return null; }
}

let atual = null;     // { id, name, role, label, areas } ou null (dono)
let chaveCss = '';

function membro() {
  const t = tokenInfo();
  if (!t) { atual = null; return null; }
  if (!atual || atual.id !== t.id || atual.role !== t.role) {
    const p = PERFIS[t.role] || { label: t.role, areas: {} };
    atual = { id: t.id, name: t.name, role: t.role, label: p.label, areas: { ...p.areas } };
  }
  return atual;
}

function podeVer(aba) {
  const m = membro();
  if (!m || !aba || aba === 'config') return true;
  const a = ABA_AREA[aba];
  if (!a) return true;
  if (a.endsWith('!')) return m.areas[a.slice(0, -1)] === 'rw';
  return !!m.areas[a];
}
function podeAlterar(area) { const m = membro(); return !m || m.areas[area] === 'rw'; }
function primeiraAba() { return ORDEM.find(podeVer) || 'config'; }

function aplicarCss() {
  const m = membro();
  const escondidas = m ? Object.keys(ABA_AREA).filter(a => !podeVer(a)) : [];
  const chave = escondidas.join(',');
  if (chave === chaveCss) return;
  chaveCss = chave;
  let st = document.getElementById('equipe-css');
  if (!st) { st = document.createElement('style'); st.id = 'equipe-css'; document.head.appendChild(st); }
  st.textContent = escondidas.map(a => `[data-tab="${a}"]`).join(',') + (escondidas.length ? '{display:none!important}' : '');
  window.dispatchEvent(new CustomEvent('equipe-changed'));
}

async function atualizar() {
  const api = window.PrecificacaoAPI && window.PrecificacaoAPI.api;
  if (!tokenInfo() || !api || typeof api.request !== 'function') { aplicarCss(); return; }
  try {
    const r = await api.request('/api/team/me', { noDedupe: true });
    const m = r && r.data && r.data.member;
    if (m) atual = { id: m.id, name: m.name, role: m.role, label: m.label, areas: m.areas || {} };
  } catch (e) { /* sem internet: fica a tabela local */ }
  aplicarCss();
}

window.Equipe = {
  PERFIS, membro, podeVer, podeAlterar, primeiraAba, atualizar,
  souDono: () => !membro(),
  rotulo: () => { const m = membro(); return m ? `${m.name || 'Equipe'} · ${m.label}` : ''; }
};
aplicarCss();
setTimeout(atualizar, 1500);
// O token muda ao entrar/sair e a cada renovação
window.addEventListener('storage', e => { if (e.key === 'accessToken') { atual = null; aplicarCss(); } });
setInterval(aplicarCss, 5000);

// ------------------------------------------------------------------ janela do dono
const CSS = `
#equipe-host .eq-bg{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:75;display:flex;align-items:flex-end;justify-content:center}
@media (min-width:768px){#equipe-host .eq-bg{align-items:center;padding:16px}}
#equipe-host .eq{background:#fff;width:100%;max-width:620px;max-height:92vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));font-family:system-ui,-apple-system,sans-serif;color:#111827}
@media (min-width:768px){#equipe-host .eq{border-radius:16px}}
#equipe-host h2{font-size:19px;font-weight:800;margin:0}
#equipe-host .muted{color:#6b7280;font-size:13px;line-height:1.45}
#equipe-host input,#equipe-host select{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;font-size:16px;background:#fff}
#equipe-host .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer;user-select:none;font-size:14px;border:1px solid transparent}
#equipe-host .pri{background:#ea580c;color:#fff}
#equipe-host .sec{background:#fff;color:#374151;border-color:#d1d5db}
#equipe-host .pessoa{border:1px solid #e5e7eb;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px}
#equipe-host .chip{display:inline-block;font-size:12px;font-weight:700;padding:2px 8px;border-radius:9999px}
`;

const fmtData = d => d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'nunca';

function EquipeDialog({ onClose }) {
  const [dados, setDados] = React.useState(null);
  const [erro, setErro] = React.useState('');
  const [novo, setNovo] = React.useState({ name: '', email: '', role: 'comercial' });
  const [salvando, setSalvando] = React.useState(false);
  const api = () => window.PrecificacaoAPI && window.PrecificacaoAPI.api;

  const carregar = async () => {
    try { const r = await api().request('/api/team', { noDedupe: true }); setDados(r.data); setErro(''); }
    catch (e) { setErro(e.message || 'Não foi possível carregar a equipe'); }
  };
  React.useEffect(() => { carregar(); }, []);

  const acao = async (fn, msgOk) => {
    setSalvando(true); setErro('');
    try { await fn(); await carregar(); if (msgOk) alert(msgOk); }
    catch (e) { setErro(e.message || 'Não deu certo. Tente de novo.'); }
    finally { setSalvando(false); }
  };
  const adicionar = () => acao(async () => {
    const r = await api().request('/api/team', { method: 'POST', body: JSON.stringify(novo) });
    setNovo({ name: '', email: '', role: novo.role });
    alert(r.data.conviteEnviado
      ? `✅ ${r.data.name} foi adicionado(a). Enviamos um e-mail com o passo a passo para o primeiro acesso.`
      : `✅ ${r.data.name} foi adicionado(a). O e-mail de convite não saiu: avise a pessoa para abrir o app, digitar ${r.data.email} e criar a senha com o código que chega por e-mail.`);
  });
  const mudar = (m, campos) => acao(() => api().request('/api/team/' + m.id, { method: 'PUT', body: JSON.stringify(campos) }));
  const convite = m => acao(() => api().request('/api/team/' + m.id + '/convite', { method: 'POST' }), '📧 Convite reenviado para ' + m.email);
  const remover = m => { if (confirm(`Remover ${m.name} da equipe? A pessoa deixa de entrar na conta na hora.`)) acao(() => api().request('/api/team/' + m.id, { method: 'DELETE' })); };

  const roles = dados ? dados.roles : PERFIS;
  const lista = dados ? dados.membros : [];
  const cheio = dados && lista.length >= dados.limite;

  return h('div', { className: 'eq-bg', onClick: onClose },
    h('div', { className: 'eq', onClick: e => e.stopPropagation() },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } },
        h('h2', null, '👥 Equipe'),
        h('div', { role: 'button', onClick: onClose, style: { fontSize: 26, lineHeight: 1, padding: '4px 10px', cursor: 'pointer', color: '#6b7280' } }, '×')),
      h('p', { className: 'muted', style: { margin: '4px 0 14px' } }, 'Cada pessoa entra com o próprio e-mail e senha e trabalha nos dados desta conta. O perfil define o que ela vê e altera. Só você mexe na equipe e no plano.'),
      erro && h('div', { style: { fontSize: 13, color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 10px', marginBottom: 10 } }, '❌ ' + erro),
      !dados ? h('div', { className: 'muted', style: { padding: 20, textAlign: 'center' } }, erro ? '' : 'Carregando...') :
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
        lista.length === 0 && h('div', { className: 'muted', style: { background: '#f9fafb', borderRadius: 10, padding: 12 } }, 'Ninguém na equipe ainda.'),
        lista.map(m => h('div', { key: m.id, className: 'pessoa', style: { opacity: m.isActive ? 1 : .6 } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' } },
            h('div', { style: { minWidth: 0 } },
              h('div', { style: { fontWeight: 800 } }, m.name, !m.isActive && h('span', { className: 'chip', style: { background: '#f3f4f6', color: '#6b7280', marginLeft: 6 } }, 'desativado')),
              h('div', { className: 'muted', style: { overflowWrap: 'anywhere' } }, m.email),
              h('div', { className: 'muted' }, m.passwordSet ? 'Último acesso: ' + fmtData(m.lastLoginAt) : '⏳ Ainda não criou a senha')),
            h('select', { value: m.role, disabled: salvando, onChange: e => mudar(m, { role: e.target.value }), style: { width: 150, fontSize: 14 } },
              Object.entries(roles).map(([k, v]) => h('option', { key: k, value: k }, v.label)))),
          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
            !m.passwordSet && m.isActive && h('div', { className: 'btn sec', onClick: () => convite(m) }, '📧 Reenviar convite'),
            h('div', { className: 'btn sec', onClick: () => mudar(m, { isActive: !m.isActive }) }, m.isActive ? '⏸️ Desativar' : '▶️ Reativar'),
            h('div', { className: 'btn sec', style: { color: '#b91c1c' }, onClick: () => remover(m) }, '🗑️ Remover')))),
        h('div', { style: { borderTop: '1px solid #e5e7eb', paddingTop: 12, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 8 } },
          h('div', { style: { fontWeight: 800 } }, 'Adicionar pessoa'),
          cheio ? h('div', { className: 'muted' }, `Limite de ${dados.limite} pessoas atingido.`) : h(React.Fragment, null,
            h('input', { placeholder: 'Nome', value: novo.name, onChange: e => setNovo({ ...novo, name: e.target.value }) }),
            h('input', { placeholder: 'E-mail da pessoa', type: 'email', autoCapitalize: 'none', value: novo.email, onChange: e => setNovo({ ...novo, email: e.target.value }) }),
            h('select', { value: novo.role, onChange: e => setNovo({ ...novo, role: e.target.value }) },
              Object.entries(roles).map(([k, v]) => h('option', { key: k, value: k }, v.label + (v.descricao ? ' — ' + v.descricao : '')))),
            h('div', { className: 'btn pri', onClick: salvando ? undefined : adicionar, style: { opacity: salvando ? .6 : 1 } }, salvando ? 'Salvando...' : '➕ Adicionar e enviar convite')),
          h('p', { className: 'muted', style: { margin: 0 } }, 'O e-mail da pessoa não pode ter conta própria na Calculadora.')))));
}

function Host() {
  const [aberto, setAberto] = React.useState(false);
  React.useEffect(() => {
    window.openEquipe = () => {
      if (!window.Equipe.souDono()) { alert('Só o dono da conta mexe na equipe.'); return; }
      if (window.ConfigHelper && typeof window.ConfigHelper.hasFeatureAccess === 'function' && !window.ConfigHelper.hasFeatureAccess('team')) {
        alert('👥 Equipe é do plano PREMIUM.'); return;
      }
      setAberto(true);
    };
  }, []);
  return aberto ? h(EquipeDialog, { onClose: () => setAberto(false) }) : null;
}

function montar() {
  if (document.getElementById('equipe-host')) return;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'equipe-host'; document.body.appendChild(el);
  if (ReactDOM.createRoot) ReactDOM.createRoot(el).render(h(Host)); else ReactDOM.render(h(Host), el);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
