(function () {
'use strict';
/**
 * CRM - Ficha do cliente (modal global)
 * Abre com window.openClientDetail(clientId) de qualquer tela.
 * Mostra contato, atalhos (WhatsApp, ligar, e-mail), negócios e a linha do tempo.
 */
const h = React.createElement;

function descreverAtividade(a) {
  const C = window.CRM;
  const meta = a.meta || {};
  if (a.type === 'stage_change') {
    const de = C.STAGE[meta.from] ? C.STAGE[meta.from].label : (meta.from || '—');
    const para = C.STAGE[meta.to] ? C.STAGE[meta.to].label : (meta.to || '—');
    return { icon: '🔀', titulo: `${meta.title ? meta.title + ': ' : ''}${de} → ${para}`, texto: a.content ? 'Motivo: ' + a.content : null };
  }
  if (a.type === 'proposal_created') return { icon: '📄', titulo: 'Proposta criada' + (meta.title ? ': ' + meta.title : ''), texto: null };
  if (a.type === 'task_done') return { icon: '✅', titulo: 'Tarefa concluída', texto: a.content };
  const t = C.ACTIVITY[a.type] || { icon: '•', label: a.type };
  return { icon: t.icon, titulo: t.label, texto: a.content };
}

function ClientDetail({ clientId, onClose }) {
  const C = window.CRM;
  C.injectCss();
  const [cliente, setCliente] = React.useState(null);
  const [atividades, setAtividades] = React.useState([]);
  const [erro, setErro] = React.useState(null);
  const [tipo, setTipo] = React.useState('note');
  const [texto, setTexto] = React.useState('');
  const [salvando, setSalvando] = React.useState(false);
  const [previewId, setPreviewId] = React.useState(null);
  const [perda, setPerda] = React.useState(false);

  const carregar = React.useCallback(async () => {
    const api = C.api();
    if (!api) return;
    try {
      const [rc, ra] = await Promise.all([api.getClient(clientId), api.getClientActivities(clientId).catch(() => null)]);
      setCliente((rc && rc.data) || null);
      setAtividades((ra && ra.data) || []);
      setErro(null);
    } catch (e) {
      setErro(e && e.message ? e.message : 'Erro ao carregar');
    }
  }, [clientId]);

  React.useEffect(() => { carregar(); }, [carregar]);
  React.useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const salvarNota = async () => {
    if (!texto.trim()) return;
    setSalvando(true);
    try {
      await C.api().addClientActivity(clientId, { type: tipo, content: texto.trim() });
      setTexto('');
      await carregar();
      C.notifyChanged();
    } catch (e) {
      alert('Não foi possível salvar: ' + (e && e.message ? e.message : 'erro'));
    } finally {
      setSalvando(false);
    }
  };

  const apagarNota = async a => {
    if (!confirm('Apagar esta anotação?')) return;
    try { await C.api().deleteClientActivity(clientId, a.id); await carregar(); }
    catch (e) { alert('Não foi possível apagar: ' + (e && e.message ? e.message : 'erro')); }
  };

  // Origem e etiquetas: salvam na hora
  const salvarOrigemEtiquetas = async (source, tags) => {
    setCliente(c => ({ ...c, source: source || null, tags }));
    try {
      await C.api().updateClient(clientId, { source: source || null, tags });
      const cm = window.PrecificacaoAPI && window.PrecificacaoAPI.clientManager;
      const local = cm && Array.isArray(cm.clients) ? cm.clients.find(x => x.id === clientId) : null;
      if (local) Object.assign(local, { source: source || null, tags });
      window.dispatchEvent(new CustomEvent('crm-updated'));
    } catch (e) {
      alert('Não foi possível salvar: ' + (e && e.message ? e.message : 'erro'));
      carregar();
    }
  };

  const mudarEtapaContato = async (stage, motivo) => {
    try { await C.api().updateClientStage(clientId, stage, motivo); await carregar(); C.notifyChanged(); }
    catch (e) { alert('Não foi possível mudar a etapa: ' + (e && e.message ? e.message : 'erro')); }
  };

  const propostas = (cliente && Array.isArray(cliente.proposals) ? cliente.proposals : []).filter(p => p.status !== 'deleted');
  const wa = cliente && C.waLink(cliente.phone);
  const atalho = (href, label, cor, externo) => href && h('a', {
    href, target: externo ? '_blank' : undefined, rel: externo ? 'noopener' : undefined,
    className: 'crm-btn', style: { background: cor, color: '#fff', flex: '1 1 0', minWidth: 0 }
  }, label);

  return h('div', { className: 'crm-modal-bg', onClick: onClose },
    h('div', { className: 'crm-modal', onClick: e => e.stopPropagation() },
      // Cabeçalho
      h('div', { style: { position: 'sticky', top: 0, background: '#fff', zIndex: 2, padding: '14px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } },
        h('div', { style: { minWidth: 0 } },
          h('div', { className: 'crm-muted' }, 'Ficha do cliente'),
          h('div', { className: 'crm-break', style: { fontSize: 20, fontWeight: 800, color: '#111827' } }, cliente ? cliente.name : '...')),
        h('div', { role: 'button', 'aria-label': 'Fechar', onClick: onClose, style: { fontSize: 26, lineHeight: 1, padding: '4px 10px', cursor: 'pointer', color: '#6b7280' } }, '×')),

      erro ? h('div', { style: { padding: 16, color: '#b91c1c' } }, erro) :
      !cliente ? h('div', { className: 'crm-muted', style: { padding: 24, textAlign: 'center' } }, 'Carregando...') :
      h('div', { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 16 } },
        // Contato
        h('div', null,
          cliente.phone && h('div', { style: { fontSize: 14, color: '#374151' } }, '📞 ' + (window.formatPhoneDisplay ? window.formatPhoneDisplay(cliente.phone) : cliente.phone)),
          cliente.email && h('div', { className: 'crm-break', style: { fontSize: 14, color: '#374151', marginTop: 2 } }, '✉️ ' + cliente.email),
          cliente.address && h('div', { className: 'crm-break', style: { fontSize: 14, color: '#374151', marginTop: 2 } }, '📍 ' + cliente.address),
          cliente.notes && h('div', { className: 'crm-break', style: { fontSize: 13, color: '#6b7280', marginTop: 6, whiteSpace: 'pre-wrap' } }, cliente.notes),
          (wa || cliente.phone || cliente.email) && h('div', { style: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' } },
            atalho(wa, '💬 WhatsApp', '#16a34a', true),
            atalho(cliente.phone ? 'tel:' + String(cliente.phone).replace(/[^\d+]/g, '') : null, '📞 Ligar', '#2563eb', false),
            atalho(cliente.email ? 'mailto:' + cliente.email : null, '✉️ E-mail', '#6b7280', false))),

        // Origem e etiquetas
        window.CrmSourceTags && h(window.CrmSourceTags, { source: cliente.source || '', tags: cliente.tags || [], onChange: salvarOrigemEtiquetas }),

        // Tarefas do cliente
        window.CrmTasksPanel && h('div', { style: { padding: 12, borderRadius: 10, border: '1px solid #e5e7eb' } }, h(window.CrmTasksPanel, { clientId })),

        // Negócios
        h('div', null,
          h('div', { style: { fontWeight: 800, color: '#111827', marginBottom: 8 } }, '💼 Negócios'),
          propostas.length === 0
            ? h('div', { style: { padding: 12, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' } },
                h('div', { style: { fontSize: 14, color: '#334155' } },
                  'Ainda sem proposta. Etapa: ',
                  h('b', { style: { color: (C.STAGE[cliente.stage === 'lost' ? 'lost' : 'new']).color } }, C.STAGE[cliente.stage === 'lost' ? 'lost' : 'new'].label),
                  cliente.stage === 'lost' && cliente.lostReason ? ` (${cliente.lostReason})` : ''),
                h('div', { className: 'crm-muted', style: { marginTop: 4 } }, 'Para orçar, crie uma proposta na aba Propostas escolhendo este cliente.'),
                h('div', { style: { marginTop: 8 } },
                  cliente.stage === 'lost'
                    ? h('button', { onClick: () => mudarEtapaContato('new'), className: 'crm-btn', style: { background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' } }, '↩︎ Voltar para Novo contato')
                    : h('button', { onClick: () => setPerda(true), className: 'crm-btn', style: { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' } }, '✖ Marcar como perdido')))
            : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                propostas.map(p => {
                  const st = C.STAGE[C.stageOfProposal(p)];
                  const dados = p.proposalData || {};
                  const data = dados.eventDate || p.eventDate;
                  const valor = Number(dados.finalTotal || p.finalTotal) || 0;
                  return h('div', { key: p.id, style: { padding: 10, borderRadius: 10, border: `1px solid ${st.border}`, background: st.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } },
                    h('div', { style: { minWidth: 0 } },
                      h('div', { className: 'crm-break', style: { fontWeight: 700, fontSize: 14, color: '#111827' } }, p.title || dados.proposalName || 'Proposta'),
                      h('div', { className: 'crm-muted' },
                        h('span', { className: 'crm-chip', style: { background: '#fff', color: st.color, border: `1px solid ${st.border}`, marginRight: 6 } }, st.label),
                        [data && '📅 ' + C.fmtDate(data), valor ? C.brl(valor) : null].filter(Boolean).join('  ·  ')),
                      p.lostReason && h('div', { style: { fontSize: 12, color: '#b91c1c', marginTop: 2 } }, '✖ ' + p.lostReason)),
                    window.ProposalPreview && h('button', { onClick: () => setPreviewId(p.id), className: 'crm-btn', style: { background: '#fff', color: '#c2410c', border: '1px solid #fed7aa', flexShrink: 0 } }, 'Ver'));
                }),
                h('div', { className: 'crm-muted' }, 'Para mudar a etapa, use o menu "Mover para…" no Funil.'))),

        // Linha do tempo
        h('div', null,
          h('div', { style: { fontWeight: 800, color: '#111827', marginBottom: 8 } }, '🕑 Linha do tempo'),
          h('div', { style: { padding: 12, borderRadius: 10, border: '1px solid #e5e7eb', background: '#f9fafb' } },
            h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 } },
              C.ACTIVITY_TYPES.map(t => h('div', {
                key: t.id, role: 'button', onClick: () => setTipo(t.id),
                style: { fontSize: 13, padding: '6px 10px', borderRadius: 9999, cursor: 'pointer', border: `1px solid ${tipo === t.id ? '#ea580c' : '#d1d5db'}`, background: tipo === t.id ? '#fff7ed' : '#fff', color: tipo === t.id ? '#c2410c' : '#374151', fontWeight: tipo === t.id ? 700 : 500 }
              }, t.icon + ' ' + t.label))),
            h('textarea', {
              value: texto, onChange: e => setTexto(e.target.value), rows: 3, className: 'crm-input',
              placeholder: tipo === 'call' ? 'Ex.: ligou pedindo desconto de 10%' : tipo === 'visit' ? 'Ex.: visita ao salão, cozinha pequena' : 'O que foi conversado?'
            }),
            h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: 8 } },
              h('button', { onClick: salvarNota, disabled: salvando || !texto.trim(), className: 'crm-btn', style: { background: '#ea580c', color: '#fff', opacity: (salvando || !texto.trim()) ? 0.5 : 1 } }, salvando ? 'Salvando...' : 'Salvar anotação'))),
          h('div', { style: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 } },
            atividades.length === 0
              ? h('div', { className: 'crm-muted', style: { textAlign: 'center', padding: 12 } }, 'Nenhum registro ainda. As mudanças de etapa e as propostas criadas entram aqui sozinhas.')
              : atividades.map(a => {
                  const d = descreverAtividade(a);
                  const manual = !!C.ACTIVITY[a.type];
                  return h('div', { key: a.id, style: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 10, border: '1px solid #f3f4f6', background: manual ? '#fff' : '#fafafa' } },
                    h('div', { style: { fontSize: 18, lineHeight: '22px' } }, d.icon),
                    h('div', { style: { flex: 1, minWidth: 0 } },
                      h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8 } },
                        h('span', { className: 'crm-break', style: { fontWeight: 700, fontSize: 13, color: '#111827' } }, d.titulo),
                        h('span', { className: 'crm-muted', style: { whiteSpace: 'nowrap' } }, C.fmtDateTime(a.createdAt))),
                      d.texto && h('div', { className: 'crm-break', style: { fontSize: 14, color: '#374151', whiteSpace: 'pre-wrap', marginTop: 2 } }, d.texto),
                      manual && h('div', { role: 'button', onClick: () => apagarNota(a), style: { fontSize: 12, color: '#9ca3af', marginTop: 4, cursor: 'pointer', display: 'inline-block' } }, 'apagar')));
                })))),

      perda && h(window.CrmLostDialog, {
        item: { title: cliente ? cliente.name : '' },
        onCancel: () => setPerda(false),
        onConfirm: motivo => { setPerda(false); mudarEtapaContato('lost', motivo); }
      }),
      window.ProposalPreview && h(window.ProposalPreview, {
        proposalId: previewId, isOpen: previewId !== null,
        onClose: () => setPreviewId(null),
        onDelete: () => { setPreviewId(null); carregar(); C.notifyChanged(); }
      })));
}

/** Host montado uma vez no App: escuta window.openClientDetail(id) */
function ClientDetailHost() {
  const [clientId, setClientId] = React.useState(null);
  React.useEffect(() => {
    const abrir = e => setClientId(e.detail && e.detail.clientId);
    window.addEventListener('open-client-detail', abrir);
    return () => window.removeEventListener('open-client-detail', abrir);
  }, []);
  if (!clientId || !window.CRM) return null;
  const fechar = () => setClientId(null);
  // CRM é exclusivo do plano PREMIUM
  const temAcesso = !window.ConfigHelper || typeof window.ConfigHelper.hasFeatureAccess !== 'function' || window.ConfigHelper.hasFeatureAccess('crm');
  if (!temAcesso && window.FeatureGate) {
    window.CRM.injectCss();
    return h('div', { className: 'crm-modal-bg', onClick: fechar },
      h('div', { className: 'crm-modal crm-small', style: { padding: 16 }, onClick: e => e.stopPropagation() },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
          h('b', null, 'Ficha do cliente'),
          h('div', { role: 'button', 'aria-label': 'Fechar', onClick: fechar, style: { fontSize: 26, lineHeight: 1, padding: '4px 10px', cursor: 'pointer', color: '#6b7280' } }, '×')),
        h(window.FeatureGate, { featureName: 'crm', requiredPlan: 'premium' }, null)));
  }
  return h(ClientDetail, { key: clientId, clientId, onClose: fechar });
}

window.ClientDetail = ClientDetail;
window.ClientDetailHost = ClientDetailHost;
})();
