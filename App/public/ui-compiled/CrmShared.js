(function () {
'use strict';
/**
 * CRM - definições compartilhadas (funil e ficha do cliente)
 */
const STAGES = [
  { id: 'new', label: 'Novo contato', short: 'Novo', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
  { id: 'quoting', label: 'Orçamento', short: 'Orçamento', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'sent', label: 'Proposta enviada', short: 'Enviada', color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
  { id: 'won', label: 'Fechado', short: 'Fechado', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  { id: 'lost', label: 'Perdido', short: 'Perdido', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' }
];
const STAGE = Object.fromEntries(STAGES.map(s => [s.id, s]));
// 'negotiation' existiu na primeira versão: agora conta como "Proposta enviada"
STAGE.negotiation = STAGE.sent;
const STATUS_TO_STAGE = { draft: 'quoting', sent: 'sent', accepted: 'won', rejected: 'lost' };
const STAGE_TO_STATUS = { quoting: 'draft', sent: 'sent', negotiation: 'sent', won: 'accepted', lost: 'rejected' };
const PROPOSAL_STAGES = ['quoting', 'sent', 'won', 'lost'];
const CLIENT_STAGES = ['new', 'lost'];
const LOST_REASONS = ['Preço', 'Data ocupada', 'Fechou com outro fornecedor', 'Desistiu do evento', 'Sem resposta', 'Outro'];
const ACTIVITY_TYPES = [
  { id: 'note', label: 'Anotação', icon: '📝' },
  { id: 'call', label: 'Ligação', icon: '📞' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { id: 'meeting', label: 'Reunião', icon: '🤝' },
  { id: 'visit', label: 'Visita', icon: '📍' },
  { id: 'email', label: 'E-mail', icon: '✉️' }
];
const ACTIVITY = Object.fromEntries(ACTIVITY_TYPES.map(a => [a.id, a]));
const SOURCES = [
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'whatsapp_business', label: 'WhatsApp Business', icon: '💼' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' }
];
const SOURCE = Object.fromEntries(SOURCES.map(s => [s.id, s]));
const TAGS = ['Casamento', 'Corporativo', 'Aniversário', 'Recorrente', 'VIP'];

// CRM é do plano PREMIUM
const hasCrm = () => {
  try { return !window.ConfigHelper || typeof window.ConfigHelper.hasFeatureAccess !== 'function' || window.ConfigHelper.hasFeatureAccess('crm'); }
  catch (e) { return false; }
};

// Datas das tarefas
const pad2 = n => String(n).padStart(2, '0');
const localKey = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const todayKey = () => localKey(new Date());
const taskDueKey = t => { if (!t || !t.dueAt) return null; const d = new Date(t.dueAt); return isNaN(d) ? null : localKey(d); };
const taskGroup = t => { const k = taskDueKey(t); if (!k) return 'nodate'; const h = todayKey(); return k < h ? 'overdue' : (k === h ? 'today' : 'next'); };

// Tarefas abertas compartilhadas (painel, contador da aba e Agenda) - uma requisição só
const tasksStore = {
  list: [], loaded: false, _p: null, _t: 0, _subs: new Set(),
  subscribe(fn) { this._subs.add(fn); return () => this._subs.delete(fn); },
  _emit() { this._subs.forEach(fn => { try { fn(this.list); } catch (e) {} }); },
  async refresh(force) {
    if (!hasCrm()) return this.list;
    const a = api && api();
    if (!a || typeof a.getTasks !== 'function') return this.list;
    if (this._p) return this._p;
    if (!force && this.loaded && Date.now() - this._t < 15000) return this.list;
    this._p = a.getTasks({ status: 'open' }).then(r => {
      this.list = (r && r.data) || []; this.loaded = true; this._t = Date.now(); this._emit(); return this.list;
    }).catch(() => this.list).finally(() => { this._p = null; });
    return this._p;
  },
  counts() { let overdue = 0, today = 0; this.list.forEach(t => { const g = taskGroup(t); if (g === 'overdue') overdue++; else if (g === 'today') today++; }); return { overdue, today }; }
};

const stageOfProposal = p => { const s = p.stage || STATUS_TO_STAGE[p.status] || 'quoting'; return s === 'negotiation' ? 'sent' : s; };
const brl = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateKey = v => {
  if (!v) return null;
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/); if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
};
const fmtDate = v => { const k = dateKey(v); if (!k) return ''; const [y, mo, d] = k.split('-'); return `${d}/${mo}/${y}`; };
const fmtDateTime = v => {
  if (!v) return '';
  const d = new Date(v); if (isNaN(d)) return '';
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};
const daysSince = v => { if (!v) return null; const d = new Date(v); if (isNaN(d)) return null; return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000)); };
const waLink = phone => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  return 'https://wa.me/' + (digits.length <= 11 ? '55' + digits : digits);
};
const api = () => window.PrecificacaoAPI && window.PrecificacaoAPI.api;

// Mantém o cache de propostas do app coerente depois de mudar a etapa
function patchProposalCache(proposalId, fields) {
  const pm = window.PrecificacaoAPI && window.PrecificacaoAPI.proposalManager;
  if (!pm || !Array.isArray(pm.proposals)) return;
  const p = pm.proposals.find(x => x.id === proposalId);
  if (p) Object.assign(p, fields);
}
function notifyChanged() {
  tasksStore.refresh(true);
  window.dispatchEvent(new CustomEvent('crm-updated'));
  window.dispatchEvent(new CustomEvent('proposalSaved'));
}

// Classes que não existem no styles/output.css compilado + layout do funil
const CSS = `
.crm-board{display:flex;gap:12px;overflow-x:auto;padding-bottom:10px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
.crm-col{flex:0 0 82%;max-width:320px;scroll-snap-align:start;border-radius:12px;display:flex;flex-direction:column;min-height:200px}
@media (min-width:640px){.crm-col{flex:0 0 250px}}

.crm-card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:10px;box-shadow:0 1px 2px rgba(0,0,0,.05);cursor:pointer}
.crm-card:hover{box-shadow:0 4px 10px rgba(0,0,0,.08)}
.crm-select{width:100%;font-size:13px;border:1px solid #d1d5db;border-radius:8px;padding:6px 8px;background:#fff;color:#374151}
.crm-chip{display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:9999px;white-space:nowrap}
.crm-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:60;display:flex;align-items:flex-end;justify-content:center}
@media (min-width:768px){.crm-modal-bg{align-items:center;padding:16px}}
.crm-modal{background:#fff;width:100%;max-width:720px;max-height:92vh;overflow-y:auto;border-radius:16px 16px 0 0;padding-bottom:env(safe-area-inset-bottom)}
@media (min-width:768px){.crm-modal{border-radius:16px}}
.crm-small{max-width:440px}
.crm-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:8px;font-weight:600;font-size:14px;padding:8px 12px;border:1px solid transparent;cursor:pointer;text-decoration:none}
.crm-input{width:100%;border:1px solid #d1d5db;border-radius:8px;padding:8px 10px;font-size:14px;box-sizing:border-box}
.crm-muted{color:#6b7280;font-size:12px}
.crm-break{overflow-wrap:anywhere}
`;
function injectCss() {
  if (document.getElementById('crm-shared-css')) return;
  const st = document.createElement('style'); st.id = 'crm-shared-css'; st.textContent = CSS;
  document.head.appendChild(st);
}

window.CRM = {
  STAGES, STAGE, STATUS_TO_STAGE, STAGE_TO_STATUS, PROPOSAL_STAGES, CLIENT_STAGES, LOST_REASONS,
  ACTIVITY_TYPES, ACTIVITY, SOURCES, SOURCE, TAGS, hasCrm, todayKey, taskDueKey, taskGroup, tasksStore,
  stageOfProposal, brl, dateKey, fmtDate, fmtDateTime, daysSince, waLink, api,
  patchProposalCache, notifyChanged, injectCss
};
window.openClientDetail = function (clientId) {
  if (!clientId) return;
  window.dispatchEvent(new CustomEvent('open-client-detail', { detail: { clientId } }));
};
})();
