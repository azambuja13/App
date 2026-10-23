(function () {
'use strict';
/**
 * Alterar senha (out/2026)
 * Abre com window.openChangePassword(). Confirma com a senha atual ou, em
 * "Esqueci a senha atual", com o código de 6 dígitos enviado ao e-mail da conta.
 * API: POST /api/auth/change-password e POST /api/auth/change-password/code (logado).
 */
const h = React.createElement;
const { useState, useEffect } = React;

const CSS = `
#chpw-host .cp-bg{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:75;display:flex;align-items:flex-end;justify-content:center}
@media (min-width:768px){#chpw-host .cp-bg{align-items:center;padding:16px}}
#chpw-host .cp{background:#fff;width:100%;max-width:440px;max-height:92vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));font-family:system-ui,-apple-system,sans-serif;color:#111827}
@media (min-width:768px){#chpw-host .cp{border-radius:16px}}
#chpw-host .cp h2{font-size:19px;font-weight:800;margin:0 0 4px}
#chpw-host .cp .muted{color:#6b7280;font-size:13px;line-height:1.45}
#chpw-host .cp label{display:block;margin-top:12px;font-size:14px;font-weight:700}
#chpw-host .cp .pw{display:flex;gap:6px;margin-top:4px}
#chpw-host .cp input{flex:1;width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;font-size:16px}
#chpw-host .cp .eye{border:1px solid #d1d5db;border-radius:10px;padding:0 10px;display:flex;align-items:center;cursor:pointer;user-select:none;font-size:16px;background:#f9fafb}
#chpw-host .cp .rules{margin-top:6px;font-size:12px;line-height:1.6}
#chpw-host .cp .btn{display:inline-flex;align-items:center;justify-content:center;border-radius:10px;padding:11px 16px;font-weight:700;cursor:pointer;user-select:none;font-size:15px}
#chpw-host .cp .link{color:#c2410c;font-size:13px;font-weight:600;cursor:pointer;margin-top:8px;display:inline-block;text-decoration:underline}
`;

const regras = s => [
  [s.length >= 8, 'Pelo menos 8 caracteres'],
  [/[A-Z]/.test(s), 'Uma letra maiúscula'],
  [/[0-9]/.test(s), 'Um número']
];

async function post(path, body) {
  const api = window.PrecificacaoAPI && window.PrecificacaoAPI.api;
  if (!api || !localStorage.getItem('accessToken')) {
    return { ok: false, message: 'Entre na sua conta (com internet) para alterar a senha.' };
  }
  try {
    const r = await api.authFetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok && j.success !== false, message: j.message, data: j };
  } catch (e) {
    const semNet = !navigator.onLine || /fetch|network|internet/i.test(String(e && e.message));
    return { ok: false, message: semNet ? 'Sem conexão com a internet. Para alterar a senha é preciso estar on-line.' : 'Sua sessão expirou. Saia e entre de novo para alterar a senha.' };
  }
}

function PwInput({ value, onChange, placeholder, autoComplete, ariaLabel }) {
  const [ver, setVer] = useState(false);
  return h('div', { className: 'pw' },
    h('input', { type: ver ? 'text' : 'password', value, placeholder, autoComplete, 'aria-label': ariaLabel, onChange: e => onChange(e.target.value) }),
    h('div', { className: 'eye', role: 'button', title: ver ? 'Esconder' : 'Mostrar', onClick: () => setVer(!ver) }, ver ? '🙈' : '👁️'));
}

function ChangePassword({ onClose }) {
  const [modoCodigo, setModoCodigo] = useState(false);
  const [atual, setAtual] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nova, setNova] = useState('');
  const [conf, setConf] = useState('');
  const [msg, setMsg] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [feito, setFeito] = useState(false);

  useEffect(() => {
    const esc = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  const pedirCodigo = async () => {
    setEnviando(true); setMsg(null);
    const r = await post('/api/auth/change-password/code');
    setEnviando(false);
    if (r.ok) { setCodigoEnviado(true); setModoCodigo(true); }
    setMsg({ ok: r.ok, t: r.message || (r.ok ? 'Código enviado para o seu e-mail.' : 'Não foi possível enviar o código agora.') });
  };

  const salvar = async () => {
    setMsg(null);
    if (modoCodigo) {
      if (String(codigo).replace(/\D/g, '').length !== 6) return setMsg({ ok: false, t: 'Digite o código de 6 dígitos que chegou no seu e-mail.' });
    } else if (!atual) return setMsg({ ok: false, t: 'Digite a sua senha atual.' });
    const faltando = regras(nova).filter(x => !x[0]).map(x => x[1].toLowerCase());
    if (faltando.length) return setMsg({ ok: false, t: 'A nova senha precisa ter: ' + faltando.join(', ') + '.' });
    if (nova !== conf) return setMsg({ ok: false, t: 'A confirmação não é igual à nova senha.' });
    if (!modoCodigo && nova === atual) return setMsg({ ok: false, t: 'A nova senha precisa ser diferente da atual.' });

    setEnviando(true);
    const r = await post('/api/auth/change-password', modoCodigo ? { code: codigo, newPassword: nova } : { currentPassword: atual, newPassword: nova });
    setEnviando(false);
    if (!r.ok) return setMsg({ ok: false, t: r.message || 'Não foi possível alterar a senha agora.' });

    // Atualiza o acesso sem internet deste aparelho com a senha nova (só o hash fica guardado)
    try {
      const c = JSON.parse(localStorage.getItem('offline_credential') || 'null');
      if (c && Array.isArray(c.ids) && c.ids[0] && window.PasswordManager && window.PasswordManager.saveOfflineCredential) {
        await window.PasswordManager.saveOfflineCredential(c.ids[0], nova, c.user || null);
      }
    } catch (e) {}
    setFeito(true);
  };

  const conteudo = feito
    ? h('div', null,
        h('h2', null, '✅ Senha alterada'),
        h('p', { className: 'muted', style: { marginTop: 8 } }, 'Use a senha nova no próximo login, em todos os aparelhos.'),
        h('div', { className: 'btn', role: 'button', onClick: onClose, style: { background: '#ea580c', color: '#fff', width: '100%', boxSizing: 'border-box', marginTop: 16 } }, 'Fechar'))
    : h('div', null,
        h('h2', null, '🔑 Alterar senha'),
        h('p', { className: 'muted' }, modoCodigo
          ? 'Digite o código que enviamos para o e-mail da sua conta e escolha a senha nova.'
          : 'Confirme a senha atual e escolha a senha nova.'),
        modoCodigo
          ? h('div', null,
              h('label', null, 'Código do e-mail'),
              h('div', { className: 'pw' }, h('input', { type: 'text', inputMode: 'numeric', autoComplete: 'one-time-code', maxLength: 6, placeholder: '000000', 'aria-label': 'Código do e-mail', value: codigo, onChange: e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6)) })),
              h('span', { className: 'link', role: 'button', onClick: enviando ? undefined : pedirCodigo }, codigoEnviado ? 'Reenviar código' : 'Enviar código'),
              ' · ',
              h('span', { className: 'link', role: 'button', onClick: () => { setModoCodigo(false); setMsg(null); } }, 'Lembrei a senha atual'))
          : h('div', null,
              h('label', null, 'Senha atual'),
              h(PwInput, { value: atual, onChange: setAtual, autoComplete: 'current-password', ariaLabel: 'Senha atual' }),
              h('span', { className: 'link', role: 'button', onClick: enviando ? undefined : pedirCodigo }, 'Esqueci a senha atual')),
        h('label', null, 'Nova senha'),
        h(PwInput, { value: nova, onChange: setNova, autoComplete: 'new-password', ariaLabel: 'Nova senha' }),
        h('div', { className: 'rules' }, regras(nova).map(([ok, t]) => h('div', { key: t, style: { color: ok ? '#15803d' : '#6b7280' } }, (ok ? '✓ ' : '• ') + t))),
        h('label', null, 'Confirmar nova senha'),
        h(PwInput, { value: conf, onChange: setConf, autoComplete: 'new-password', ariaLabel: 'Confirmar nova senha' }),
        msg ? h('div', { role: 'status', style: { marginTop: 12, color: msg.ok ? '#15803d' : '#b91c1c', fontWeight: 600, fontSize: 14 } }, msg.t) : null,
        h('div', { style: { display: 'flex', gap: 8, marginTop: 16 } },
          h('div', { className: 'btn', role: 'button', onClick: onClose, style: { background: '#f3f4f6', flex: 1 } }, 'Cancelar'),
          h('div', { className: 'btn', role: 'button', onClick: enviando ? undefined : salvar, style: { background: '#ea580c', color: '#fff', flex: 2, opacity: enviando ? .6 : 1 } }, enviando ? 'Aguarde...' : 'Alterar senha')));

  return h('div', { className: 'cp-bg', onClick: e => { if (e.target === e.currentTarget) onClose(); } },
    h('div', { className: 'cp', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Alterar senha' }, conteudo));
}

function Host() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    window.openChangePassword = () => setOpen(true);
    return () => { if (window.openChangePassword) delete window.openChangePassword; };
  }, []);
  return open ? h(ChangePassword, { onClose: () => setOpen(false) }) : null;
}

function mount() {
  if (document.getElementById('chpw-host')) return;
  if (!document.getElementById('chpw-css')) { const st = document.createElement('style'); st.id = 'chpw-css'; st.textContent = CSS; document.head.appendChild(st); }
  const el = document.createElement('div'); el.id = 'chpw-host'; document.body.appendChild(el);
  if (ReactDOM.createRoot) ReactDOM.createRoot(el).render(h(Host)); else ReactDOM.render(h(Host), el);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
window.ChangePassword = ChangePassword;
})();
