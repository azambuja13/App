(function () {
'use strict';
/**
 * CRM - Tarefas e lembretes (etapa 2)
 * window.CrmTasksPanel  - lista Atrasadas / Hoje / Próximas / Sem data, com "Nova tarefa"
 * window.CrmTaskBadge   - contador (atrasadas + hoje) para a aba do Funil
 * Lembretes só dentro do app.
 */
const h = React.createElement;
const GRUPOS = [
  { id: 'overdue', label: 'Atrasadas', color: '#b91c1c' },
  { id: 'today', label: 'Hoje', color: '#c2410c' },
  { id: 'next', label: 'Próximas', color: '#1d4ed8' },
  { id: 'nodate', label: 'Sem data', color: '#6b7280' }
];

function useTasks(clientId) {
  const C = window.CRM;
  const [lista, setLista] = React.useState(clientId ? [] : C.tasksStore.list);
  const [carregado, setCarregado] = React.useState(clientId ? false : C.tasksStore.loaded);
  const carregar = React.useCallback(async (force) => {
    if (!C.hasCrm()) return;
    if (clientId) {
      try {
        const r = await C.api().getTasks({ status: 'open', clientId });
        setLista((r && r.data) || []);
      } catch (e) { /* mantém */ }
      setCarregado(true);
    } else {
      await C.tasksStore.refresh(force);
      setLista(C.tasksStore.list); setCarregado(true);
    }
  }, [clientId]);
  React.useEffect(() => {
    carregar(false);
    const unsub = clientId ? null : C.tasksStore.subscribe(l => setLista(l));
    const onUpd = () => carregar(true);
    window.addEventListener('crm-tasks-updated', onUpd);
    if (clientId) window.addEventListener('crm-updated', onUpd);
    return () => {
      if (unsub) unsub();
      window.removeEventListener('crm-tasks-updated', onUpd);
      if (clientId) window.removeEventListener('crm-updated', onUpd);
    };
  }, [carregar]);
  return [lista, carregado, carregar];
}

function avisarMudanca() {
  window.CRM.tasksStore.refresh(true);
  window.dispatchEvent(new CustomEvent('crm-tasks-updated'));
}

function CrmTaskForm({ clientId, onDone, onCancel }) {
  const C = window.CRM;
  const [titulo, setTitulo] = React.useState('');
  const [data, setData] = React.useState(C.todayKey());
  const [cliente, setCliente] = React.useState(clientId || '');
  const [clientes, setClientes] = React.useState(null);
  const [salvando, setSalvando] = React.useState(false);
  React.useEffect(() => {
    if (clientId) return;
    const cm = window.PrecificacaoAPI && window.PrecificacaoAPI.clientManager;
    if (cm && Array.isArray(cm.clients) && cm.clients.length) { setClientes(cm.clients); return; }
    C.api().getClients().then(r => setClientes((r && r.data) || [])).catch(() => setClientes([]));
  }, [clientId]);
  const salvar = async () => {
    if (!titulo.trim()) return;
    setSalvando(true);
    try {
      await C.api().createTask({ title: titulo.trim(), dueAt: data || null, clientId: cliente || null });
      avisarMudanca();
      onDone && onDone();
    } catch (e) {
      alert('Não foi possível criar a tarefa: ' + (e && e.message ? e.message : 'erro'));
    } finally { setSalvando(false); }
  };
  return h('div', { style: { padding: 10, borderRadius: 10, border: '1px solid #fed7aa', background: '#fff7ed', display: 'flex', flexDirection: 'column', gap: 8 } },
    h('input', { type: 'text', value: titulo, onChange: e => setTitulo(e.target.value), placeholder: 'Ex.: ligar para confirmar a degustação', className: 'crm-input', autoFocus: true,
      onKeyDown: e => { if (e.key === 'Enter') salvar(); } }),
    h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
      h('input', { type: 'date', value: data, onChange: e => setData(e.target.value), className: 'crm-input', style: { flex: '1 1 140px' } }),
      !clientId && h('select', { value: cliente, onChange: e => setCliente(e.target.value), className: 'crm-select', style: { flex: '2 1 180px', fontSize: 14 } },
        h('option', { value: '' }, clientes === null ? 'Carregando clientes...' : 'Sem cliente'),
        (clientes || []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name))).map(c => h('option', { key: c.id, value: c.id }, c.name)))),
    h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } },
      h('button', { onClick: onCancel, className: 'crm-btn', style: { background: '#f3f4f6', color: '#374151' } }, 'Cancelar'),
      h('button', { onClick: salvar, disabled: salvando || !titulo.trim(), className: 'crm-btn', style: { background: '#ea580c', color: '#fff', opacity: (salvando || !titulo.trim()) ? 0.5 : 1 } }, salvando ? 'Salvando...' : 'Criar tarefa')));
}

function CrmTaskItem({ t, mostrarCliente }) {
  const C = window.CRM;
  const [ocupado, setOcupado] = React.useState(false);
  const grupo = C.taskGroup(t);
  const concluir = async () => {
    setOcupado(true);
    try { await C.api().updateTask(t.id, { done: true }); avisarMudanca(); window.dispatchEvent(new CustomEvent('crm-updated')); }
    catch (e) { alert('Não foi possível concluir: ' + (e && e.message ? e.message : 'erro')); setOcupado(false); }
  };
  const apagar = async () => {
    if (!confirm('Apagar esta tarefa?')) return;
    try { await C.api().deleteTask(t.id); avisarMudanca(); } catch (e) { alert('Não foi possível apagar: ' + (e && e.message ? e.message : 'erro')); }
  };
  const k = C.taskDueKey(t);
  return h('div', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', opacity: ocupado ? 0.5 : 1 } },
    h('div', { role: 'button', 'aria-label': 'Concluir', onClick: ocupado ? undefined : concluir, title: 'Concluir',
      style: { width: 22, height: 22, flexShrink: 0, borderRadius: 6, border: '2px solid #9ca3af', cursor: 'pointer', marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', fontWeight: 800 } }, ocupado ? '✓' : ''),
    h('div', { style: { flex: 1, minWidth: 0 } },
      h('div', { className: 'crm-break', style: { fontSize: 14, color: '#111827', fontWeight: 600 } }, (t.auto ? '⏰ ' : '') + t.title),
      h('div', { className: 'crm-muted', style: { marginTop: 2 } },
        [k ? h('span', { key: 'd', style: { color: grupo === 'overdue' ? '#b91c1c' : grupo === 'today' ? '#c2410c' : '#6b7280', fontWeight: grupo === 'overdue' || grupo === 'today' ? 700 : 400 } }, (grupo === 'today' ? 'Hoje' : C.fmtDate(k))) : null,
         mostrarCliente && t.client ? h('span', { key: 'c', role: 'button', onClick: () => window.openClientDetail && window.openClientDetail(t.client.id), style: { cursor: 'pointer', textDecoration: 'underline' } }, '👤 ' + t.client.name) : null
        ].filter(Boolean).reduce((acc, el, i) => i ? acc.concat([' · ', el]) : [el], []))),
    h('div', { role: 'button', 'aria-label': 'Apagar', onClick: apagar, style: { fontSize: 18, color: '#9ca3af', cursor: 'pointer', padding: '0 4px', lineHeight: 1 } }, '×'));
}

function CrmTasksPanel({ clientId, collapsible }) {
  const C = window.CRM;
  C.injectCss();
  const [lista, carregado] = useTasks(clientId);
  const [novo, setNovo] = React.useState(false);
  const cont = { overdue: 0, today: 0 };
  lista.forEach(t => { const g = C.taskGroup(t); if (g === 'overdue') cont.overdue++; else if (g === 'today') cont.today++; });
  const [aberto, setAberto] = React.useState(!collapsible);
  React.useEffect(() => { if (collapsible && (cont.overdue + cont.today) > 0) setAberto(true); }, [carregado]);
  if (!C.hasCrm()) return null;

  const porGrupo = {}; GRUPOS.forEach(g => { porGrupo[g.id] = []; });
  lista.forEach(t => porGrupo[C.taskGroup(t)].push(t));

  const resumo = [cont.overdue ? `${cont.overdue} atrasada${cont.overdue > 1 ? 's' : ''}` : null, cont.today ? `${cont.today} para hoje` : null].filter(Boolean).join(' · ') || (lista.length ? `${lista.length} aberta${lista.length > 1 ? 's' : ''}` : 'nenhuma pendente');

  return h('div', { className: clientId ? '' : 'rounded-xl shadow-lg', style: clientId ? {} : { background: '#fff', padding: 14, marginBottom: 16 } },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
      h('div', { role: collapsible ? 'button' : undefined, onClick: collapsible ? () => setAberto(!aberto) : undefined, style: { cursor: collapsible ? 'pointer' : 'default', minWidth: 0 } },
        h('span', { style: { fontWeight: 800, color: '#111827', fontSize: clientId ? 15 : 17 } }, (collapsible ? (aberto ? '▾ ' : '▸ ') : '') + '✅ Tarefas'),
        h('span', { style: { marginLeft: 8, fontSize: 13, color: cont.overdue ? '#b91c1c' : '#6b7280', fontWeight: cont.overdue ? 700 : 500 } }, resumo)),
      (aberto || clientId) && !novo && h('button', { onClick: () => setNovo(true), className: 'crm-btn', style: { background: '#fff', color: '#c2410c', border: '1px solid #fed7aa' } }, '+ Nova tarefa')),
    (aberto || clientId) && h('div', { style: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 } },
      novo && h(CrmTaskForm, { clientId, onDone: () => setNovo(false), onCancel: () => setNovo(false) }),
      !carregado ? h('div', { className: 'crm-muted' }, 'Carregando...') :
      lista.length === 0 && !novo ? h('div', { className: 'crm-muted' }, clientId ? 'Nenhuma tarefa para este cliente.' : 'Nenhuma tarefa pendente. Propostas enviadas há 3 dias sem resposta viram tarefa de retorno sozinhas (⏰).') :
      GRUPOS.filter(g => porGrupo[g.id].length).map(g => h('div', { key: g.id },
        h('div', { style: { fontSize: 12, fontWeight: 800, color: g.color, textTransform: 'uppercase', margin: '4px 0' } }, `${g.label} (${porGrupo[g.id].length})`),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } }, porGrupo[g.id].map(t => h(CrmTaskItem, { key: t.id, t, mostrarCliente: !clientId })))))));
}

/** Contador vermelho (atrasadas + hoje) para colocar na aba do Funil */
function CrmTaskBadge() {
  const C = window.CRM;
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    if (!C || !C.hasCrm()) return;
    const atualizar = () => { const c = C.tasksStore.counts(); setN(c.overdue + c.today); };
    const unsub = C.tasksStore.subscribe(atualizar);
    atualizar();
    // espera o backend ficar pronto e carrega uma vez
    const t = setInterval(() => { if (C.api() && window.PrecificacaoAPI && window.PrecificacaoAPI.proposalManager) { clearInterval(t); C.tasksStore.refresh(false); } }, 2000);
    const onPlan = () => C.tasksStore.refresh(true);
    window.addEventListener('plan-changed', onPlan);
    return () => { unsub(); clearInterval(t); window.removeEventListener('plan-changed', onPlan); };
  }, []);
  if (!n) return null;
  return h('span', { style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9999, background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 800, marginLeft: 4, lineHeight: 1 } }, n > 99 ? '99+' : n);
}

window.CrmTasksPanel = CrmTasksPanel;
window.CrmTaskBadge = CrmTaskBadge;
window.CrmTaskItem = CrmTaskItem;
})();
