(function () {
'use strict';
/**
 * CRM - Funil de vendas (aba "Funil")
 * Cards = propostas (negócios) + contatos ainda sem proposta ("Novo contato").
 * Mudar de etapa: menu "Mover para…" (celular e computador) ou arrastar (computador).
 */
const h = React.createElement;

function PipelinePage() {
  const C = window.CRM;
  C.injectCss();
  const [items, setItems] = React.useState([]);
  const [carregando, setCarregando] = React.useState(true);
  const [busca, setBusca] = React.useState('');
  const [todosPerdidos, setTodosPerdidos] = React.useState(false);
  const [perda, setPerda] = React.useState(null);        // { item } aguardando motivo
  const [novoContato, setNovoContato] = React.useState(false);
  const [previewId, setPreviewId] = React.useState(null);
  const [arrastando, setArrastando] = React.useState(null);
  // Ordenação dos cards: 'dias' (mais tempo parado primeiro) ou 'evento' (data do evento mais próxima primeiro)
  const [ordem, setOrdemState] = React.useState(() => {
    try { return localStorage.getItem('crm_pipeline_sort') || 'dias'; } catch (e) { return 'dias'; }
  });
  const setOrdem = v => { setOrdemState(v); try { localStorage.setItem('crm_pipeline_sort', v); } catch (e) {} };

  const carregandoRef = React.useRef(false);
  const carregar = React.useCallback(async () => {
    const api = C.api();
    if (!api || carregandoRef.current) return;   // evita requisições duplicadas
    carregandoRef.current = true;
    try {
      const [rp, rc] = await Promise.all([
        api.getProposals().catch(() => null),
        api.getClients().catch(() => null)
      ]);
      const propostas = ((rp && (rp.data || rp.proposals)) || []).filter(p => p && p.id && p.status !== 'deleted');
      const clientes = ((rc && (rc.data || rc.clients)) || []).filter(c => c && c.id);
      const nomeCliente = {};
      clientes.forEach(c => { nomeCliente[c.id] = c.name; });

      const negocios = propostas.map(p => ({
        kind: 'proposal', key: 'p-' + p.id, id: p.id,
        stage: C.stageOfProposal(p),
        title: p.clientName || (p.client && p.client.name) || nomeCliente[p.clientId] || p.proposalName || p.title || 'Proposta',
        subtitle: p.proposalName || p.title || '',
        clientId: p.clientId || null,
        date: p.eventDate, guests: p.guests, value: Number(p.finalTotal) || 0,
        since: p.stageChangedAt || p.updatedAt || p.createdAt,
        lostReason: p.lostReason, status: p.status
      }));
      const contatos = clientes
        .filter(c => !(Array.isArray(c.proposals) && c.proposals.some(p => p.status !== 'deleted')))
        .map(c => ({
          kind: 'client', key: 'c-' + c.id, id: c.id,
          stage: c.stage === 'lost' ? 'lost' : 'new',
          title: c.name, subtitle: c.phone || c.email || '',
          clientId: c.id, value: 0,
          since: c.updatedAt || c.createdAt, lostReason: c.lostReason
        }));
      setItems([...negocios, ...contatos]);
    } catch (e) {
      console.warn('⚠️ [Funil] Erro ao carregar:', e && e.message);
    } finally {
      carregandoRef.current = false;
      setCarregando(false);
    }
  }, []);

  React.useEffect(() => {
    const pronto = () => !!(C.api() && window.PrecificacaoAPI && window.PrecificacaoAPI.proposalManager);
    if (pronto()) carregar();
    const montadoEm = Date.now();
    // ao abrir a aba ela já carrega na montagem; o evento de troca de aba só recarrega depois
    const onTab = e => { if (e.detail === 'pipeline' && Date.now() - montadoEm > 2000) carregar(); };
    window.addEventListener('crm-updated', carregar);
    window.addEventListener('backend-phase2-complete', carregar);
    window.addEventListener('tab-changed', onTab);
    // Backend ainda inicializando: espera ficar pronto e carrega uma vez só
    const t = pronto() ? null : setInterval(() => { if (pronto()) { clearInterval(t); carregar(); } }, 1500);
    const t2 = setTimeout(() => { clearInterval(t); setCarregando(false); }, 20000);
    return () => {
      window.removeEventListener('crm-updated', carregar);
      window.removeEventListener('backend-phase2-complete', carregar);
      window.removeEventListener('tab-changed', onTab);
      clearInterval(t); clearTimeout(t2);
    };
  }, [carregar]);

  const permitido = (item, stage) => item.kind === 'client' ? C.CLIENT_STAGES.includes(stage) : C.PROPOSAL_STAGES.includes(stage);

  const aplicar = async (item, stage, motivo) => {
    const api = C.api();
    const antes = items;
    setItems(list => list.map(x => x.key === item.key ? { ...x, stage, since: new Date().toISOString(), lostReason: stage === 'lost' ? motivo : null } : x));
    try {
      if (item.kind === 'proposal') {
        const r = await api.updateProposalStage(item.id, stage, motivo);
        const d = (r && r.data) || {};
        C.patchProposalCache(item.id, { stage, status: d.status || C.STAGE_TO_STATUS[stage], lostReason: stage === 'lost' ? motivo : null });
      } else {
        await api.updateClientStage(item.id, stage, motivo);
      }
      C.notifyChanged();
    } catch (e) {
      setItems(antes);
      alert('Não foi possível mudar a etapa: ' + (e && e.message ? e.message : 'erro'));
    }
  };

  const mover = (item, stage) => {
    if (!stage || stage === item.stage || !permitido(item, stage)) return;
    if (stage === 'lost') { setPerda({ item }); return; }
    aplicar(item, stage, null);
  };

  const abrir = item => {
    if (item.clientId && window.openClientDetail) window.openClientDetail(item.clientId);
    else if (item.kind === 'proposal' && window.ProposalPreview) setPreviewId(item.id);
  };

  // Filtros
  const termo = busca.trim().toLowerCase();
  const limitePerdidos = Date.now() - 60 * 86400000;
  const visiveis = items.filter(it => {
    if (termo && !(`${it.title} ${it.subtitle}`.toLowerCase().includes(termo))) return false;
    if (it.stage === 'lost' && !todosPerdidos) {
      const t = new Date(it.since).getTime();
      if (!isNaN(t) && t < limitePerdidos) return false;
    }
    return true;
  });
  const porEtapa = {};
  C.STAGES.forEach(s => { porEtapa[s.id] = []; });
  visiveis.forEach(it => { (porEtapa[it.stage] || porEtapa.quoting).push(it); });
  const tempo = v => { const t = new Date(v).getTime(); return isNaN(t) ? null : t; };
  const dataEvento = it => { const k = C.dateKey(it.date); return k ? tempo(k + 'T12:00:00') : null; };
  const porDias = (a, b) => (tempo(a.since) ?? Infinity) - (tempo(b.since) ?? Infinity);
  const porEvento = (a, b) => {
    const da = dataEvento(a), db = dataEvento(b);
    if (da === null && db === null) return porDias(a, b);
    if (da === null) return 1;   // sem data vai pro fim
    if (db === null) return -1;
    return da - db || porDias(a, b);
  };
  Object.values(porEtapa).forEach(l => l.sort(ordem === 'evento' ? porEvento : porDias));

  const abertos = items.filter(it => ['quoting', 'sent'].includes(it.stage));
  const valorAberto = abertos.reduce((s, it) => s + it.value, 0);
  const mesAtual = new Date().toISOString().slice(0, 7);
  const fechadosMes = items.filter(it => it.stage === 'won' && String(it.since || '').slice(0, 7) === mesAtual);
  const valorFechadoMes = fechadosMes.reduce((s, it) => s + it.value, 0);

  const card = it => {
    const st = C.STAGE[it.stage];
    const dias = C.daysSince(it.since);
    const parado = it.stage === 'sent' && dias !== null && dias >= 3;
    const opcoes = (it.kind === 'client' ? C.CLIENT_STAGES : C.PROPOSAL_STAGES);
    return h('div', {
      key: it.key, className: 'crm-card',
      draggable: true,
      onDragStart: e => { setArrastando(it); try { e.dataTransfer.setData('text/plain', it.key); e.dataTransfer.effectAllowed = 'move'; } catch (er) {} },
      onDragEnd: () => setArrastando(null),
      onClick: () => abrir(it)
    },
      h('div', { style: { fontWeight: 700, color: '#111827', fontSize: 14, lineHeight: 1.3, overflowWrap: 'break-word' } }, it.title),
      it.value > 0 && h('div', { style: { fontWeight: 700, color: '#15803d', fontSize: 13, marginTop: 2 } }, C.brl(it.value)),
      it.subtitle && it.subtitle !== it.title && h('div', { className: 'crm-muted crm-break', style: { marginTop: 2 } }, it.subtitle),
      (it.date || it.guests) && h('div', { className: 'crm-muted', style: { marginTop: 4 } },
        [it.date && '📅 ' + C.fmtDate(it.date), it.guests ? '👥 ' + it.guests : null].filter(Boolean).join('  ·  ')),
      it.stage === 'lost' && it.lostReason && h('div', { style: { marginTop: 4, fontSize: 12, color: '#b91c1c' } }, '✖ ' + it.lostReason),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, gap: 6 } },
        h('span', { style: { fontSize: 11, color: parado ? '#c2410c' : '#9ca3af', fontWeight: parado ? 700 : 400 } },
          dias === null ? '' : (dias === 0 ? 'hoje nesta etapa' : `${dias} dia${dias > 1 ? 's' : ''} nesta etapa`) + (parado ? ' ⏰' : '')),
        it.kind === 'client' && h('span', { className: 'crm-chip', style: { background: '#f1f5f9', color: '#475569' } }, 'sem proposta')),
      h('select', {
        className: 'crm-select', style: { marginTop: 8 }, value: '',
        onClick: e => e.stopPropagation(),
        onChange: e => { e.stopPropagation(); mover(it, e.target.value); }
      },
        h('option', { value: '' }, 'Mover para…'),
        opcoes.filter(s => s !== it.stage).map(s => h('option', { key: s, value: s }, C.STAGE[s].label))));
  };

  const coluna = st => {
    const lista = porEtapa[st.id] || [];
    const soma = lista.reduce((s, it) => s + it.value, 0);
    const podeSoltar = arrastando && arrastando.stage !== st.id && permitido(arrastando, st.id);
    return h('div', {
      key: st.id, className: 'crm-col',
      style: { background: st.bg, border: `2px ${podeSoltar ? 'dashed' : 'solid'} ${podeSoltar ? st.color : st.border}` },
      onDragOver: e => { if (podeSoltar) { e.preventDefault(); } },
      onDrop: e => { e.preventDefault(); if (arrastando && podeSoltar) mover(arrastando, st.id); setArrastando(null); }
    },
      h('div', { style: { padding: '10px 12px', borderBottom: `1px solid ${st.border}` } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          h('span', { style: { fontWeight: 800, color: st.color, fontSize: 14 } }, st.label),
          h('span', { className: 'crm-chip', style: { background: '#fff', color: st.color, border: `1px solid ${st.border}` } }, lista.length)),
        soma > 0 && h('div', { style: { fontSize: 12, color: st.color, marginTop: 2, fontWeight: 600 } }, C.brl(soma))),
      h('div', { style: { padding: 8, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 } },
        lista.length === 0
          ? h('div', { className: 'crm-muted', style: { textAlign: 'center', padding: '16px 4px' } }, st.id === 'new' ? 'Contatos sem proposta aparecem aqui' : 'Nada nesta etapa')
          : lista.map(card)));
  };

  return h('div', null,
    // Cabeçalho
    h('div', { className: 'rounded-xl shadow-lg', style: { background: '#fff', padding: 16, marginBottom: 16 } },
      h('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 } },
        h('div', null,
          h('h2', { style: { fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 } }, '🎯 Funil de Vendas'),
          h('div', { className: 'crm-muted', style: { fontSize: 13 } },
            `Em aberto: ${abertos.length} negócio${abertos.length === 1 ? '' : 's'} · ${C.brl(valorAberto)}   |   Fechado no mês: ${C.brl(valorFechadoMes)}`)),
        h('button', {
          onClick: () => setNovoContato(true),
          className: 'crm-btn', style: { background: '#ea580c', color: '#fff' }
        }, '+ Novo contato')),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 12 } },
        h('input', {
          type: 'text', value: busca, onChange: e => setBusca(e.target.value),
          placeholder: '🔍 Buscar cliente ou proposta', className: 'crm-input', style: { flex: '1 1 220px' }
        }),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flex: '0 1 auto' } },
          h('span', { style: { fontSize: 13, color: '#4b5563', whiteSpace: 'nowrap' } }, 'Ordenar:'),
          h('select', { value: ordem, onChange: e => setOrdem(e.target.value), className: 'crm-select', style: { width: 'auto', fontSize: 14 } },
            h('option', { value: 'dias' }, 'Dias nesta etapa'),
            h('option', { value: 'evento' }, 'Data do evento'))),
        h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#4b5563', margin: 0, fontWeight: 500 } },
          h('input', { type: 'checkbox', checked: todosPerdidos, onChange: e => setTodosPerdidos(e.target.checked) }),
          'Mostrar perdidos antigos'))),

    carregando && items.length === 0
      ? h('div', { className: 'crm-muted', style: { textAlign: 'center', padding: 24 } }, 'Carregando funil...')
      : h('div', { className: 'crm-board' }, C.STAGES.map(coluna)),

    h('div', { className: 'crm-muted', style: { marginTop: 8 } },
      'Toque no card para abrir a ficha do cliente. ⏰ = proposta parada há 3 dias ou mais. No computador, dá pra arrastar os cards entre as colunas.'),

    perda && h(window.CrmLostDialog, {
      item: perda.item,
      onCancel: () => setPerda(null),
      onConfirm: motivo => { const it = perda.item; setPerda(null); aplicar(it, 'lost', motivo); }
    }),
    novoContato && h(window.CrmNewContactDialog, {
      onClose: () => setNovoContato(false),
      onCreated: () => { setNovoContato(false); carregar(); }
    }),
    window.ProposalPreview && h(window.ProposalPreview, {
      proposalId: previewId, isOpen: previewId !== null,
      onClose: () => setPreviewId(null),
      onDelete: () => { setPreviewId(null); carregar(); }
    }));
}

/** Pergunta o motivo da perda */
function CrmLostDialog({ item, onCancel, onConfirm }) {
  const C = window.CRM;
  const [motivo, setMotivo] = React.useState(C.LOST_REASONS[0]);
  const [detalhe, setDetalhe] = React.useState('');
  const texto = motivo === 'Outro' ? (detalhe.trim() || 'Outro') : (detalhe.trim() ? `${motivo} - ${detalhe.trim()}` : motivo);
  return h('div', { className: 'crm-modal-bg', onClick: onCancel },
    h('div', { className: 'crm-modal crm-small', style: { padding: 20 }, onClick: e => e.stopPropagation() },
      h('h3', { style: { fontSize: 18, fontWeight: 800, margin: '0 0 4px' } }, 'Marcar como perdido'),
      h('div', { className: 'crm-muted', style: { marginBottom: 12 } }, item.title),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
        C.LOST_REASONS.map(r => h('div', {
          key: r, role: 'button', onClick: () => setMotivo(r),
          style: { padding: '10px 12px', borderRadius: 8, cursor: 'pointer', border: `2px solid ${motivo === r ? '#b91c1c' : '#e5e7eb'}`, background: motivo === r ? '#fef2f2' : '#fff', fontWeight: motivo === r ? 700 : 500 }
        }, r))),
      h('textarea', {
        value: detalhe, onChange: e => setDetalhe(e.target.value), rows: 2,
        placeholder: motivo === 'Outro' ? 'Qual o motivo?' : 'Detalhe (opcional)',
        className: 'crm-input', style: { marginTop: 10 }
      }),
      h('div', { style: { display: 'flex', gap: 8, marginTop: 14 } },
        h('button', { onClick: onCancel, className: 'crm-btn', style: { flex: 1, background: '#f3f4f6', color: '#374151' } }, 'Cancelar'),
        h('button', { onClick: () => onConfirm(texto), className: 'crm-btn', style: { flex: 1, background: '#b91c1c', color: '#fff' } }, 'Confirmar'))));
}

/** Cadastro rápido de contato (entra em "Novo contato") */
function CrmNewContactDialog({ onClose, onCreated }) {
  const C = window.CRM;
  const [f, setF] = React.useState({ name: '', phone: '', email: '', note: '' });
  const [salvando, setSalvando] = React.useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const salvar = async () => {
    if (!f.name.trim()) { alert('Informe o nome do contato'); return; }
    setSalvando(true);
    try {
      const api = C.api();
      const r = await api.createClient({ name: f.name.trim(), phone: f.phone.trim() || null, email: f.email.trim() || null });
      const novo = r && r.data;
      if (novo && novo.id && f.note.trim()) {
        await api.addClientActivity(novo.id, { type: 'note', content: f.note.trim() }).catch(() => {});
      }
      // Lista de clientes do app (aba Clientes) passa a incluir o novo contato
      const cm = window.PrecificacaoAPI && window.PrecificacaoAPI.clientManager;
      if (cm && Array.isArray(cm.clients) && novo) cm.clients.push(novo);
      C.notifyChanged();
      onCreated(novo);
    } catch (e) {
      alert('Não foi possível salvar: ' + (e && e.message ? e.message : 'erro'));
    } finally {
      setSalvando(false);
    }
  };
  const campo = (k, label, type, ph) => h('div', { style: { marginBottom: 10 } },
    h('div', { style: { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 } }, label),
    h('input', { type, value: f[k], onChange: e => set(k, e.target.value), placeholder: ph, className: 'crm-input' }));
  return h('div', { className: 'crm-modal-bg', onClick: onClose },
    h('div', { className: 'crm-modal crm-small', style: { padding: 20 }, onClick: e => e.stopPropagation() },
      h('h3', { style: { fontSize: 18, fontWeight: 800, margin: '0 0 12px' } }, '+ Novo contato'),
      campo('name', 'Nome *', 'text', 'Ex.: Mariana Souza'),
      campo('phone', 'Telefone / WhatsApp', 'tel', '(34) 99999-0000'),
      campo('email', 'E-mail', 'email', 'nome@email.com'),
      h('div', { style: { marginBottom: 10 } },
        h('div', { style: { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 } }, 'Primeira anotação'),
        h('textarea', { value: f.note, onChange: e => set('note', e.target.value), rows: 3, placeholder: 'Ex.: casamento em março, ~150 convidados, viu no Instagram', className: 'crm-input' })),
      h('div', { style: { display: 'flex', gap: 8, marginTop: 6 } },
        h('button', { onClick: onClose, className: 'crm-btn', style: { flex: 1, background: '#f3f4f6', color: '#374151' } }, 'Cancelar'),
        h('button', { onClick: salvar, disabled: salvando, className: 'crm-btn', style: { flex: 1, background: '#ea580c', color: '#fff', opacity: salvando ? 0.6 : 1 } }, salvando ? 'Salvando...' : 'Salvar'))));
}

window.PipelinePage = PipelinePage;
window.CrmLostDialog = CrmLostDialog;
window.CrmNewContactDialog = CrmNewContactDialog;
})();
