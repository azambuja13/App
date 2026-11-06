(function () {
'use strict';
/**
 * Contratos e link rastreado da proposta (nov/2026, PREMIUM)
 *   window.openPropostaLink({ proposal })  link /p/<token>: avisa quando o cliente abre
 *   window.openContrato({ proposal })      contrato a partir da proposta, assinado pelo link /c/<token>
 *   window.PropostaLinks.resumo()          { proposalId: { views, firstViewedAt, lastViewedAt } } para a lista
 * O host se monta sozinho no <body>.
 */
const h = React.createElement;

const CSS = `
#contr-host .ct-bg{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:72;display:flex;align-items:flex-end;justify-content:center}
@media (min-width:768px){#contr-host .ct-bg{align-items:center;padding:16px}}
#contr-host .ct{background:#fff;width:100%;max-width:680px;max-height:92vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));font-family:system-ui,-apple-system,sans-serif;color:#111827}
@media (min-width:768px){#contr-host .ct{border-radius:16px}}
#contr-host h2{font-size:19px;font-weight:800;margin:0}
#contr-host .muted{color:#6b7280;font-size:13px;line-height:1.45}
#contr-host input,#contr-host textarea{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;font-size:15px;background:#fff;font-family:inherit}
#contr-host textarea{font-family:Georgia,'Times New Roman',serif;line-height:1.55;font-size:15px}
#contr-host .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer;user-select:none;font-size:14px;border:1px solid transparent;text-decoration:none}
#contr-host .pri{background:#ea580c;color:#fff}
#contr-host .ok{background:#16a34a;color:#fff}
#contr-host .sec{background:#fff;color:#374151;border-color:#d1d5db}
#contr-host .box{border:1px solid #e5e7eb;border-radius:12px;padding:12px}
#contr-host .url{font-family:ui-monospace,Menlo,monospace;font-size:13px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;overflow-wrap:anywhere}
#contr-host .chip{display:inline-block;font-size:12px;font-weight:700;padding:2px 8px;border-radius:9999px}
#contr-host .var{font-size:12px;padding:3px 8px;border-radius:9999px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;cursor:pointer}
`;

const api = () => window.PrecificacaoAPI && window.PrecificacaoAPI.api;
const fmt = d => d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
function haQuanto(d) {
  if (!d) return '';
  const min = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return 'há ' + min + ' min';
  const hrs = Math.round(min / 60);
  if (hrs < 24) return 'há ' + hrs + ' h';
  const dias = Math.round(hrs / 24);
  return dias === 1 ? 'ontem' : 'há ' + dias + ' dias';
}
const dadosProp = p => ({ ...(p && p.proposalData || {}), ...(p || {}) });
function waHref(p, texto) {
  const tel = dadosProp(p).clientPhone || '';
  let d = String(tel).replace(/\D/g, '');
  if (!d) return null;
  if (d.length <= 11) d = '55' + d;
  return 'https://wa.me/' + d + '?text=' + encodeURIComponent(texto);
}
const primeiroNome = p => String(dadosProp(p).clientName || '').trim().split(/\s+/)[0] || '';
async function copiar(t) {
  try { await navigator.clipboard.writeText(t); return true; }
  catch (e) { window.prompt('Copie o link:', t); return false; }
}
function premium(feature, nome) {
  const C = window.ConfigHelper;
  if (C && typeof C.hasFeatureAccess === 'function' && !C.hasFeatureAccess(feature)) { alert(nome + ' é do plano PREMIUM.'); return false; }
  return true;
}

// ------------------------------------------------------------ resumo para a lista
const PropostaLinks = {
  _cache: null, _at: 0, _p: null,
  async resumo(force) {
    if (!force && this._cache && Date.now() - this._at < 60000) return this._cache;
    if (this._p) return this._p;
    const a = api(); if (!a) return {};
    this._p = a.request('/api/proposals/links/resumo', { noDedupe: true })
      .then(r => { this._cache = (r && r.data) || {}; this._at = Date.now(); return this._cache; })
      .catch(() => this._cache || {})
      .finally(() => { this._p = null; });
    return this._p;
  },
  texto(info) {
    if (!info) return null;
    if (!info.views) return '🔗 Link enviado · ainda não abriu';
    return `👁️ Abriu ${info.views}x · ${haQuanto(info.lastViewedAt)}`;
  }
};
window.PropostaLinks = PropostaLinks;

// ------------------------------------------------------------ envio direto (WhatsApp da empresa)
// Com o WhatsApp da empresa configurado (Cloud API), manda sem abrir o app: pelo modelo aprovado
// na Meta (chega sempre) ou, enquanto ele não é aprovado, como texto (só chega nas 24 h).
const WA = { pronto: null, p: null };
function whatsappPronto() {
  if (WA.pronto !== null) return Promise.resolve(WA.pronto);
  if (WA.p) return WA.p;
  const a = api(); if (!a) return Promise.resolve(false);
  WA.p = a.request('/api/company/whatsapp', { noDedupe: true })
    .then(r => { const d = (r && r.data) || {}; WA.pronto = !!(d.whatsappEnabled && (d.hasAccessToken || d.whatsappAccessToken) && d.whatsappPhoneNumberId); return WA.pronto; })
    .catch(() => false).finally(() => { WA.p = null; });
  return WA.p;
}
function EnvioDireto({ proposal, endpoint, hrefApp, onEnviado }) {
  const [pronto, setPronto] = React.useState(WA.pronto);
  const [tel, setTel] = React.useState(dadosProp(proposal).clientPhone || '');
  const [enviando, setEnviando] = React.useState(false);
  const [res, setRes] = React.useState(null);
  React.useEffect(() => { whatsappPronto().then(setPronto); }, []);
  const enviar = async () => {
    setEnviando(true); setRes(null);
    try {
      const r = await api().request(endpoint, { method: 'POST', body: JSON.stringify({ phone: tel }) });
      setRes({ ok: true, d: r.data }); if (onEnviado) onEnviado(r.data);
    } catch (e) { setRes({ ok: false, msg: e.message || 'Não foi possível enviar' }); }
    finally { setEnviando(false); }
  };
  const semTel = String(tel).trim() !== '' && String(tel).replace(/\D/g, '').length < 10; // vazio: a API usa o telefone da proposta/cliente
  if (pronto === null) return h('div', { className: 'muted' }, 'Conferindo o WhatsApp da empresa...');
  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
    pronto && h(React.Fragment, null,
      h('input', { value: tel, onChange: e => setTel(e.target.value), placeholder: 'WhatsApp do cliente com DDD', inputMode: 'tel' }),
      h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
        h('div', { className: 'btn ok', onClick: enviando || semTel ? undefined : enviar, style: { flex: '1 1 220px', opacity: enviando || semTel ? .6 : 1 } }, enviando ? 'Enviando...' : '📤 Enviar pelo WhatsApp'),
        hrefApp && h('a', { className: 'btn sec', href: hrefApp, target: '_blank', rel: 'noopener' }, '💬 Abrir no app'))),
    !pronto && hrefApp && h('a', { className: 'btn ok', href: hrefApp, target: '_blank', rel: 'noopener' }, '💬 Enviar no WhatsApp'),
    !pronto && h('div', { className: 'muted' }, 'Para enviar sem abrir o app, configure o WhatsApp da empresa em Configurações → 📱 WhatsApp.'),
    res && (res.ok
      ? h('div', { style: { fontSize: 13, borderRadius: 8, padding: '8px 10px', ...(res.d.via === 'modelo' ? { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' } : { background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }) } },
          res.d.via === 'modelo' ? '✅ Enviado pelo WhatsApp da empresa (modelo aprovado: chega mesmo sem conversa aberta).' : '✅ Enviado. ' + (res.d.aviso || ''))
      : h('div', { style: { fontSize: 13, color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 10px' } }, '❌ ' + res.msg + (/24 h|131047/.test(res.msg) ? ' Use "Abrir no app".' : ''))));
}

// ------------------------------------------------------------ link rastreado
function LinkDialog({ proposal, onClose }) {
  const [link, setLink] = React.useState(null);
  const [erro, setErro] = React.useState('');
  const [copiado, setCopiado] = React.useState(false);
  const carregar = async () => {
    try {
      const r = await api().request('/api/proposals/' + proposal.id + '/link', { method: 'POST' });
      const d = await api().request('/api/proposals/' + proposal.id + '/link', { noDedupe: true });
      setLink({ ...r.data, ...(d && d.data || {}) });
      PropostaLinks.resumo(true);
    } catch (e) { setErro(e.message || 'Não foi possível gerar o link'); }
  };
  React.useEffect(() => { carregar(); }, []);
  const titulo = dadosProp(proposal).proposalName || proposal.title || 'Proposta';
  const msg = link ? `Olá${primeiroNome(proposal) ? ', ' + primeiroNome(proposal) : ''}! Segue a proposta "${titulo}" para você conferir: ${link.url}` : '';
  const wa = link ? waHref(proposal, msg) : null;
  const desligar = async () => {
    if (!confirm('Desligar este link? Quem tiver o link não consegue mais abrir a proposta. Você pode gerar um novo depois.')) return;
    try { await api().request('/api/proposals/' + proposal.id + '/link', { method: 'DELETE' }); PropostaLinks.resumo(true); onClose(); }
    catch (e) { setErro(e.message); }
  };
  return h('div', { className: 'ct-bg', onClick: onClose },
    h('div', { className: 'ct', style: { maxWidth: 560 }, onClick: e => e.stopPropagation() },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        h('h2', null, '🔗 Link da proposta'),
        h('div', { role: 'button', onClick: onClose, style: { fontSize: 26, lineHeight: 1, padding: '4px 10px', cursor: 'pointer', color: '#6b7280' } }, '×')),
      h('p', { className: 'muted', style: { margin: '4px 0 12px' } }, 'Mande este link em vez do PDF: você recebe um e-mail quando o cliente abrir e vê aqui quantas vezes ele voltou. A prévia do WhatsApp não conta como abertura.'),
      erro && h('div', { style: { fontSize: 13, color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 10px' } }, '❌ ' + erro),
      !link ? (!erro && h('div', { className: 'muted', style: { padding: 20, textAlign: 'center' } }, 'Gerando o link...')) :
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        h('div', { className: 'url' }, link.url),
        h(EnvioDireto, { proposal, endpoint: '/api/proposals/' + proposal.id + '/link/whatsapp', hrefApp: wa, onEnviado: () => { PropostaLinks.resumo(true); window.dispatchEvent(new CustomEvent('crm-updated')); } }),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
          h('div', { className: 'btn sec', onClick: async () => { await copiar(link.url); setCopiado(true); setTimeout(() => setCopiado(false), 1800); } }, copiado ? '✓ Copiado' : 'Copiar link'),
          h('a', { className: 'btn sec', href: link.url + '?v=0', target: '_blank', rel: 'noopener' }, 'Abrir')),
        h('div', { className: 'box' },
          h('div', { style: { fontWeight: 800, marginBottom: 4 } }, link.views ? `👁️ Aberta ${link.views} ${link.views === 1 ? 'vez' : 'vezes'}` : '⏳ Ainda não foi aberta'),
          link.views ? h('div', { className: 'muted' }, 'Primeira: ' + fmt(link.firstViewedAt) + ' · Última: ' + fmt(link.lastViewedAt) + ' (' + haQuanto(link.lastViewedAt) + ')') : null,
          (link.visitas || []).length > 0 && h('div', { style: { marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 } },
            link.visitas.slice(0, 8).map((v, i) => h('div', { key: i, className: 'muted' }, fmt(v.at) + ' · ' + v.aparelho + (v.kind === 'pdf' ? ' · PDF' : ''))))),
        h('div', { className: 'muted' }, 'O botão "Abrir" daqui não conta como abertura do cliente.'),
        h('div', { role: 'button', onClick: desligar, style: { fontSize: 13, color: '#b91c1c', cursor: 'pointer', fontWeight: 600 } }, 'Desligar este link'))));
}

// ------------------------------------------------------------ contrato
const STATUS = {
  sent: { label: 'Aguardando assinatura', cor: '#fef3c7', txt: '#92400e' },
  signed: { label: '✅ Assinado', cor: '#dcfce7', txt: '#166534' },
  cancelled: { label: 'Cancelado', cor: '#f3f4f6', txt: '#6b7280' }
};

function ModeloEditor({ onBack }) {
  const [m, setM] = React.useState(null);
  const [texto, setTexto] = React.useState('');
  const [erro, setErro] = React.useState('');
  const [salvando, setSalvando] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => { api().request('/api/contracts/modelo', { noDedupe: true }).then(r => { setM(r.data); setTexto(r.data.texto); }).catch(e => setErro(e.message)); }, []);
  const inserir = k => {
    const el = ref.current; const tag = '{' + k + '}';
    if (!el) { setTexto(t => t + tag); return; }
    const a = el.selectionStart, b = el.selectionEnd;
    setTexto(t => t.slice(0, a) + tag + t.slice(b));
    setTimeout(() => { el.focus(); el.selectionStart = el.selectionEnd = a + tag.length; }, 0);
  };
  const salvar = async (t) => {
    setSalvando(true); setErro('');
    try { const r = await api().request('/api/contracts/modelo', { method: 'PUT', body: JSON.stringify({ texto: t }) }); setM(r.data); setTexto(r.data.texto); alert('✅ Modelo salvo. Vale para os próximos contratos.'); }
    catch (e) { setErro(e.message); } finally { setSalvando(false); }
  };
  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
    h('div', { className: 'muted' }, 'Modelo usado em todos os contratos novos. Toque numa variável para colocar no texto; ela é trocada pelos dados da proposta.'),
    erro && h('div', { style: { fontSize: 13, color: '#991b1b' } }, '❌ ' + erro),
    !m ? h('div', { className: 'muted' }, 'Carregando...') : h(React.Fragment, null,
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } }, m.variaveis.map(v => h('span', { key: v.chave, className: 'var', title: v.descricao, onClick: () => inserir(v.chave) }, '{' + v.chave + '}'))),
      h('textarea', { ref, value: texto, onChange: e => setTexto(e.target.value), rows: 16 }),
      h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
        h('div', { className: 'btn pri', onClick: salvando ? undefined : () => salvar(texto) }, salvando ? 'Salvando...' : 'Salvar modelo'),
        !m.padrao && h('div', { className: 'btn sec', onClick: () => { if (confirm('Voltar ao modelo padrão? O seu texto será apagado.')) salvar(''); } }, 'Voltar ao padrão'),
        h('div', { className: 'btn sec', onClick: onBack }, '← Voltar'))),
    h('p', { className: 'muted', style: { margin: 0 } }, 'O modelo padrão é uma sugestão. Revise com o seu advogado antes de usar.'));
}

function ContratoDialog({ proposal, onClose }) {
  const [lista, setLista] = React.useState(null);
  const [erro, setErro] = React.useState('');
  const [modo, setModo] = React.useState('ver'); // ver | novo | modelo | editar
  const [rasc, setRasc] = React.useState(null);
  const [salvando, setSalvando] = React.useState(false);
  const [copiado, setCopiado] = React.useState(false);

  const carregar = async () => {
    try {
      const r = await api().request('/api/contracts?proposalId=' + encodeURIComponent(proposal.id), { noDedupe: true });
      setLista(r.data || []);
      if (!(r.data || []).some(c => c.status !== 'cancelled')) await novo();
    } catch (e) { setErro(e.message || 'Não foi possível carregar o contrato'); }
  };
  const novo = async () => {
    setErro('');
    try { const r = await api().request('/api/contracts/rascunho?proposalId=' + encodeURIComponent(proposal.id), { noDedupe: true }); setRasc(r.data); setModo('novo'); }
    catch (e) { setErro(e.message); }
  };
  React.useEffect(() => { carregar(); }, []);

  const atual = (lista || []).find(c => c.status !== 'cancelled');
  const criar = async () => {
    if (/_{6,}/.test(rasc.content) && !confirm('Tem campos em branco (________) no contrato. Criar assim mesmo? O cliente vai ver os espaços vazios.')) return;
    setSalvando(true); setErro('');
    try { await api().request('/api/contracts', { method: 'POST', body: JSON.stringify({ proposalId: proposal.id, title: rasc.title, content: rasc.content }) }); setModo('ver'); await carregar(); }
    catch (e) { setErro(e.message); } finally { setSalvando(false); }
  };
  const editar = async () => {
    try { const r = await api().request('/api/contracts/' + atual.id, { noDedupe: true }); setRasc({ title: r.data.title, content: r.data.content, id: r.data.id }); setModo('editar'); }
    catch (e) { setErro(e.message); }
  };
  const salvarEdicao = async () => {
    setSalvando(true); setErro('');
    try { await api().request('/api/contracts/' + rasc.id, { method: 'PUT', body: JSON.stringify({ title: rasc.title, content: rasc.content }) }); setModo('ver'); await carregar(); }
    catch (e) { setErro(e.message); } finally { setSalvando(false); }
  };
  const cancelar = async () => {
    if (!confirm('Cancelar este contrato? O link para de funcionar.')) return;
    try { await api().request('/api/contracts/' + atual.id + '/cancelar', { method: 'POST' }); await carregar(); } catch (e) { setErro(e.message); }
  };
  const documento = () => {
    const a = api(); const tk = localStorage.getItem('accessToken');
    window.open((a.baseURL || '') + '/api/contracts/' + atual.id + '/documento?token=' + encodeURIComponent(tk || ''), '_blank');
  };

  const msg = atual ? `Olá${primeiroNome(proposal) ? ', ' + primeiroNome(proposal) : ''}! Segue o contrato do seu evento para conferir e assinar pelo celular: ${atual.url}` : '';
  const wa = atual && atual.status === 'sent' ? waHref(proposal, msg) : null;
  const st = atual ? (STATUS[atual.status] || STATUS.sent) : null;

  return h('div', { className: 'ct-bg', onClick: onClose },
    h('div', { className: 'ct', onClick: e => e.stopPropagation() },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } },
        h('div', null, h('div', { className: 'muted' }, dadosProp(proposal).proposalName || proposal.title || 'Proposta'), h('h2', null, modo === 'modelo' ? '📝 Modelo do contrato' : '📝 Contrato')),
        h('div', { role: 'button', onClick: onClose, style: { fontSize: 26, lineHeight: 1, padding: '4px 10px', cursor: 'pointer', color: '#6b7280' } }, '×')),
      erro && h('div', { style: { fontSize: 13, color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 10px', marginTop: 10 } }, '❌ ' + erro),
      h('div', { style: { marginTop: 12 } },
        modo === 'modelo' ? h(ModeloEditor, { onBack: () => { novo(); } }) :
        (modo === 'novo' || modo === 'editar') && rasc ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          h('div', { className: 'muted' }, modo === 'novo' ? 'Confira e ajuste o texto. Os dados vieram da proposta. Ao criar, você recebe o link para o cliente assinar.' : 'Editando o contrato enviado. O cliente verá o texto novo ao abrir o link.'),
          h('input', { value: rasc.title, onChange: e => setRasc({ ...rasc, title: e.target.value }) }),
          h('textarea', { value: rasc.content, onChange: e => setRasc({ ...rasc, content: e.target.value }), rows: 18 }),
          h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
            h('div', { className: 'btn pri', onClick: salvando ? undefined : (modo === 'novo' ? criar : salvarEdicao), style: { opacity: salvando ? .6 : 1 } }, salvando ? 'Salvando...' : (modo === 'novo' ? '✍️ Criar contrato e gerar link' : 'Salvar')),
            modo === 'novo' && h('div', { className: 'btn sec', onClick: () => setModo('modelo') }, '⚙️ Editar modelo'),
            (modo === 'editar' || atual) && h('div', { className: 'btn sec', onClick: () => setModo('ver') }, 'Voltar'))) :
        !lista ? h('div', { className: 'muted', style: { padding: 20, textAlign: 'center' } }, 'Carregando...') :
        atual ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
          h('div', { className: 'box' },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
              h('div', { style: { fontWeight: 800 } }, atual.title),
              h('span', { className: 'chip', style: { background: st.cor, color: st.txt } }, st.label)),
            atual.status === 'signed'
              ? h('div', { className: 'muted', style: { marginTop: 6 } }, `Assinado por ${atual.signerName} em ${fmt(atual.signedAt)}. A proposta foi marcada como aprovada.`)
              : h('div', { className: 'muted', style: { marginTop: 6 } }, atual.views ? `O cliente abriu ${atual.views} ${atual.views === 1 ? 'vez' : 'vezes'} (primeira em ${fmt(atual.viewedAt)}).` : 'O cliente ainda não abriu.')),
          atual.status === 'sent' && h('div', { className: 'url' }, atual.url),
          atual.status === 'sent' && h(EnvioDireto, { proposal, endpoint: '/api/contracts/' + atual.id + '/whatsapp', hrefApp: wa, onEnviado: () => window.dispatchEvent(new CustomEvent('crm-updated')) }),
          h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
            atual.status === 'sent' && h('div', { className: 'btn sec', onClick: async () => { await copiar(atual.url); setCopiado(true); setTimeout(() => setCopiado(false), 1800); } }, copiado ? '✓ Copiado' : 'Copiar link'),
            h('div', { className: 'btn sec', onClick: documento }, atual.status === 'signed' ? '📄 Ver / imprimir assinado' : 'Ver como o cliente'),
            atual.status === 'sent' && h('div', { className: 'btn sec', onClick: editar }, '✏️ Editar texto')),
          atual.status === 'sent' && h('div', { role: 'button', onClick: cancelar, style: { fontSize: 13, color: '#b91c1c', cursor: 'pointer', fontWeight: 600 } }, 'Cancelar contrato'),
          atual.status === 'signed' && h('p', { className: 'muted', style: { margin: 0 } }, 'Assinatura eletrônica com nome, CPF/CNPJ, desenho da assinatura, data, IP, aparelho e código de verificação do texto.')) :
        h('div', { className: 'muted' }, 'Preparando o contrato...'),
        modo === 'ver' && (lista || []).some(c => c.status === 'cancelled') && !atual && h('div', { className: 'btn pri', onClick: novo, style: { marginTop: 10 } }, 'Criar novo contrato'))));
}

// ------------------------------------------------------------ host
function Host() {
  const [aberto, setAberto] = React.useState(null); // { tipo, proposal }
  React.useEffect(() => {
    window.openPropostaLink = ({ proposal }) => { if (proposal && proposal.id && premium('proposalLink', '🔗 O link rastreado da proposta')) setAberto({ tipo: 'link', proposal }); };
    window.openContrato = ({ proposal }) => { if (proposal && proposal.id && premium('contracts', '📝 Contrato com assinatura')) setAberto({ tipo: 'contrato', proposal }); };
  }, []);
  if (!aberto) return null;
  const fechar = () => { setAberto(null); window.dispatchEvent(new CustomEvent('propostas-links-changed')); };
  return aberto.tipo === 'link' ? h(LinkDialog, { proposal: aberto.proposal, onClose: fechar }) : h(ContratoDialog, { proposal: aberto.proposal, onClose: fechar });
}
function montar() {
  if (document.getElementById('contr-host')) return;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'contr-host'; document.body.appendChild(el);
  if (ReactDOM.createRoot) ReactDOM.createRoot(el).render(h(Host)); else ReactDOM.render(h(Host), el);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
