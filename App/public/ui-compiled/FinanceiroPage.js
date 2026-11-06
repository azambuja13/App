(function () {
'use strict';
/**
 * Financeiro (nov/2026, plano PREMIUM) — fase 2: contas a pagar e a receber, contas fixas e fluxo de caixa.
 * window.FinanceiroPage()   aba "💰 Financeiro"
 * window.FinanceUtils       usado pelo Estoque (compra → conta a pagar)
 * API: /api/finance (ver docs/rotas.md da API). Proposta fechada vira conta a receber sozinha;
 * pedidos "fiado" do PDV aparecem a receber; pedidos pagos entram no fluxo de caixa.
 */
const h = React.createElement;
const { useState, useEffect, useMemo, useCallback } = React;

const api = () => { const a = window.PrecificacaoAPI && window.PrecificacaoAPI.api; return a && typeof a.request === 'function' ? a : null; };
const req = (url, opt) => { const a = api(); if (!a) return Promise.reject(new Error('Sem conexão com o servidor')); return a.request(url, opt).then(r => (r && r.data !== undefined ? r.data : r)); };
const brl = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const parseNum = v => { const t = String(v == null ? '' : v).trim().replace(/\s|R\$/g, ''); if (!t) return NaN; const s = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t; const n = parseFloat(s); return isFinite(n) ? n : NaN; };
const txtNum = v => (v == null || v === '' ? '' : (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const msgErro = e => (e && (e.message || e.error)) || 'Não foi possível concluir. Tente de novo.';
const hojeISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const fmtData = s => (s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '');
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const nomeMes = m => MESES[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4);
const somaMes = (m, n) => { const d = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1)); return d.toISOString().slice(0, 7); };
const fimMes = m => { const d = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)); return d.toISOString().slice(0, 10); };
const PAG = { dinheiro: 'Dinheiro', pix: 'PIX', credito: 'Crédito', debito: 'Débito', boleto: 'Boleto', transferencia: 'Transferência', outro: 'Outro' };
const ORIGEM = { proposta: '📄 proposta', compra: '🛒 compra', recorrente: '🔁 fixa', pedido: '🧾 pedido' };

const CSS = `
.fin{font-family:system-ui,-apple-system,sans-serif;color:#111827}
.fin .card{background:#fff;border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.08);padding:16px}
.fin .muted{color:#6b7280;font-size:13px}
.fin .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:10px;padding:9px 14px;font-weight:700;font-size:14px;cursor:pointer;user-select:none;border:1px solid transparent;text-decoration:none}
.fin .b-or{background:#ea580c;color:#fff}.fin .b-gr{background:#16a34a;color:#fff}.fin .b-wh{background:#fff;color:#374151;border-color:#d1d5db}.fin .b-red{background:#fff;color:#b91c1c;border-color:#fecaca}.fin .b-dk{background:#111827;color:#fff}
.fin .b-sm{padding:5px 10px;font-size:13px;border-radius:8px}
.fin input,.fin select,.fin textarea{border:1px solid #d1d5db;border-radius:9px;padding:8px 10px;font-size:15px;background:#fff;color:#111827;box-sizing:border-box;min-width:0}
.fin .tag{display:inline-block;font-size:11px;font-weight:700;border-radius:999px;padding:2px 8px;white-space:nowrap}
.fin .t-pago{background:#dcfce7;color:#166534}.fin .t-atrasado{background:#fee2e2;color:#991b1b}.fin .t-pendente{background:#fef9c3;color:#854d0e}.fin .t-org{background:#f3f4f6;color:#374151}
.fin .kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(135px,1fr));gap:8px;margin-top:12px}
.fin .kpi{border:1px solid #e5e7eb;border-radius:12px;padding:10px 12px}
.fin .kpi b{display:block;font-size:19px;margin-top:2px}
.fin .seg{display:flex;gap:6px;flex-wrap:wrap}
.fin .seg > div{border-radius:999px;font-weight:700;font-size:14px;cursor:pointer;border:1px solid #e5e7eb;background:#fff;color:#374151;padding:8px 13px;user-select:none}
.fin .seg > div.on{background:#111827;border-color:#111827;color:#fff}
.fin .row{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f3f4f6;flex-wrap:wrap}
.fin .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}
.fin .grid label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:#4b5563}
.fin .grid label.full{grid-column:1 / -1}
.fin table{width:100%;border-collapse:collapse;font-size:14px}
.fin th{text-align:left;font-size:12px;color:#6b7280;font-weight:600;padding:7px 6px;border-bottom:1px solid #e5e7eb}
.fin td{padding:7px 6px;border-bottom:1px solid #f3f4f6}
.fin-bg{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:80;display:flex;align-items:flex-end;justify-content:center}
@media (min-width:768px){.fin-bg{align-items:center;padding:16px}}
.fin-modal{background:#fff;width:100%;max-width:640px;max-height:92vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom));box-sizing:border-box}
@media (min-width:768px){.fin-modal{border-radius:16px}}
.fin-modal h3{font-size:18px;font-weight:800;margin:0 0 4px}
.fin .x{cursor:pointer;color:#9ca3af;font-size:28px;line-height:1}
.fin .barra{height:10px;border-radius:5px;display:inline-block;vertical-align:middle}
@media (max-width:560px){.fin .esconde-cel{display:none}.fin .kpi b{font-size:16px}.fin .kpi{padding:8px 10px}}
`;
function injectCss() { if (document.getElementById('fin-css')) return; const st = document.createElement('style'); st.id = 'fin-css'; st.textContent = CSS; document.head.appendChild(st); }

let catCache = null;
function useCategorias() {
  const [c, setC] = useState(catCache);
  useEffect(() => { if (!catCache) req('/api/finance/categories').then(r => { catCache = r; setC(r); }).catch(() => {}); }, []);
  return c || { categorias: [], pagamentos: Object.keys(PAG) };
}
function useListaSimples(url) {
  const [l, setL] = useState([]);
  useEffect(() => { req(url).then(r => setL(Array.isArray(r) ? r : [])).catch(() => {}); }, [url]);
  return l;
}
const temPremium = () => !!(window.ConfigHelper && window.ConfigHelper.hasFeatureAccess && window.ConfigHelper.hasFeatureAccess('finance'));

function Modal({ titulo, sub, onClose, children }) {
  useEffect(() => { const k = e => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  return h('div', { className: 'fin-bg fin', onClick: e => { if (e.target === e.currentTarget) onClose(); } },
    h('div', { className: 'fin-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 } },
        h('div', null, h('h3', null, titulo), sub ? h('div', { className: 'muted' }, sub) : null),
        h('div', { role: 'button', 'aria-label': 'Fechar', className: 'x', onClick: onClose }, '×')),
      children));
}

// ====================== Lançamento (novo / editar) ======================
function LancamentoDialog({ inicial, onClose }) {
  const cats = useCategorias();
  const fornecedores = useListaSimples('/api/suppliers');
  const clientes = useListaSimples('/api/clients?lite=1');
  const editando = !!(inicial && inicial.id);
  const [f, setF] = useState(() => ({
    type: (inicial && inicial.type) || 'pagar', description: (inicial && inicial.description) || '', category: (inicial && inicial.category) || '',
    amount: inicial && inicial.amount ? txtNum(inicial.amount) : '', dueDate: (inicial && inicial.dueDate) || hojeISO(), competenceDate: (inicial && inicial.competenceDate) || '',
    installments: '1', paid: false, paidAt: hojeISO(), paymentMethod: (inicial && inicial.paymentMethod) || '',
    supplierId: (inicial && inicial.supplierId) || '', clientId: (inicial && inicial.clientId) || '', notes: (inicial && inicial.notes) || ''
  }));
  const [msg, setMsg] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const set = (k, v) => setF(o => ({ ...o, [k]: v }));
  const lista = cats.categorias.filter(c => c.tipo === f.type);
  useEffect(() => { if (lista.length && !lista.some(c => c.k === f.category)) set('category', lista[0].k); }, [f.type, cats]);
  const salvar = async () => {
    const v = parseNum(f.amount);
    if (!f.description.trim()) return setMsg('Escreva a descrição.');
    if (!(v > 0)) return setMsg('Informe o valor.');
    const corpo = { type: f.type, description: f.description, category: f.category, amount: v, dueDate: f.dueDate, competenceDate: f.competenceDate || f.dueDate,
      paymentMethod: f.paymentMethod || null, supplierId: f.type === 'pagar' ? (f.supplierId || null) : null, clientId: f.type === 'receber' ? (f.clientId || null) : null, notes: f.notes };
    setSalvando(true); setMsg(null);
    try {
      if (editando) await req('/api/finance/entries/' + inicial.id, { method: 'PUT', body: JSON.stringify(corpo) });
      else await req('/api/finance/entries', { method: 'POST', body: JSON.stringify({ ...corpo, installments: parseInt(f.installments, 10) || 1, paid: f.paid, paidAt: f.paid ? f.paidAt : null }) });
      onClose(editando ? 'Lançamento salvo.' : 'Lançamento criado.');
    } catch (e) { setMsg(msgErro(e)); }
    finally { setSalvando(false); }
  };
  const parcelas = parseInt(f.installments, 10) || 1, valor = parseNum(f.amount);
  return h(Modal, { titulo: editando ? '✏️ Editar lançamento' : '➕ Novo lançamento', onClose: () => onClose() },
    !editando && h('div', { className: 'seg', style: { marginTop: 10 } },
      [['pagar', '💸 A pagar'], ['receber', '💰 A receber']].map(([k, n]) => h('div', { key: k, className: f.type === k ? 'on' : '', role: 'button', 'data-tipo': k, onClick: () => set('type', k) }, n))),
    h('div', { className: 'grid', style: { marginTop: 12 } },
      h('label', { className: 'full' }, 'Descrição *', h('input', { value: f.description, 'data-f': 'description', placeholder: f.type === 'pagar' ? 'Ex.: Conta de luz, compra no atacadão' : 'Ex.: Sinal do casamento', onChange: e => set('description', e.target.value) })),
      h('label', null, 'Categoria', h('select', { value: f.category, 'data-f': 'category', onChange: e => set('category', e.target.value) }, lista.map(c => h('option', { key: c.k, value: c.k }, c.nome)))),
      h('label', null, 'Valor (R$) *', h('input', { value: f.amount, inputMode: 'decimal', 'data-f': 'amount', placeholder: '0,00', onChange: e => set('amount', e.target.value) })),
      h('label', null, parcelas > 1 ? '1º vencimento' : 'Vencimento', h('input', { type: 'date', value: f.dueDate, 'data-f': 'dueDate', onChange: e => set('dueDate', e.target.value) })),
      h('label', { title: 'Data do fato (evento, compra, mês da conta). É a data que entra no DRE.' }, 'Competência (opcional)', h('input', { type: 'date', value: f.competenceDate, onChange: e => set('competenceDate', e.target.value) })),
      !editando && h('label', null, 'Parcelas', h('select', { value: f.installments, 'data-f': 'installments', onChange: e => set('installments', e.target.value) }, Array.from({ length: 24 }, (_, i) => h('option', { key: i, value: String(i + 1) }, i === 0 ? 'À vista' : (i + 1) + 'x' + (valor > 0 ? ' de ' + brl(valor / (i + 1)) : ''))))),
      h('label', null, 'Forma de pagamento', h('select', { value: f.paymentMethod, onChange: e => set('paymentMethod', e.target.value) }, h('option', { value: '' }, '—'), cats.pagamentos.map(k => h('option', { key: k, value: k }, PAG[k] || k)))),
      f.type === 'pagar' ? h('label', null, 'Fornecedor', h('select', { value: f.supplierId, onChange: e => set('supplierId', e.target.value) }, h('option', { value: '' }, '—'), fornecedores.map(s => h('option', { key: s.id, value: s.id }, s.name))))
        : h('label', null, 'Cliente', h('select', { value: f.clientId, onChange: e => set('clientId', e.target.value) }, h('option', { value: '' }, '—'), clientes.map(c => h('option', { key: c.id, value: c.id }, c.name)))),
      h('label', { className: 'full' }, 'Observação', h('input', { value: f.notes, onChange: e => set('notes', e.target.value) }))),
    !editando && h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 14 } },
      h('input', { type: 'checkbox', checked: f.paid, 'data-f': 'paid', onChange: e => set('paid', e.target.checked) }), parcelas > 1 ? 'A 1ª parcela já foi paga em' : 'Já foi pago em',
      h('input', { type: 'date', value: f.paidAt, disabled: !f.paid, onChange: e => set('paidAt', e.target.value), style: { width: 160 } })),
    msg && h('div', { style: { color: '#b91c1c', marginTop: 10, fontWeight: 600 } }, msg),
    h('div', { style: { display: 'flex', gap: 8, marginTop: 16 } },
      h('div', { role: 'button', className: 'btn b-wh', style: { flex: 1 }, onClick: () => onClose() }, 'Cancelar'),
      h('div', { role: 'button', className: 'btn b-gr', 'data-testid': 'fin-salvar', style: { flex: 2, opacity: salvando ? .6 : 1 }, onClick: salvando ? undefined : salvar }, salvando ? 'Salvando...' : 'Salvar')));
}

// ====================== Pagar / receber ======================
function PagarDialog({ e, onClose }) {
  const cats = useCategorias();
  const [data, setData] = useState(hojeISO());
  const [valor, setValor] = useState(txtNum(e.amount));
  const [forma, setForma] = useState(e.paymentMethod || 'pix');
  const [msg, setMsg] = useState(null);
  const ok = async () => {
    const v = parseNum(valor);
    if (!(v >= 0)) return setMsg('Valor inválido.');
    try {
      if (e.virtual) await req('/api/orders/' + e.orderId, { method: 'PATCH', body: JSON.stringify({ paid: true, paymentMethod: ['dinheiro', 'pix', 'credito', 'debito'].includes(forma) ? forma : 'outro' }) });
      else await req('/api/finance/entries/' + e.id + '/pay', { method: 'POST', body: JSON.stringify({ paidAt: data, paidAmount: v, paymentMethod: forma }) });
      onClose(e.type === 'receber' ? 'Recebimento registrado.' : 'Pagamento registrado.');
    } catch (err) { setMsg(msgErro(err)); }
  };
  return h(Modal, { titulo: e.type === 'receber' ? '💰 Registrar recebimento' : '💸 Registrar pagamento', sub: e.description + ' · ' + brl(e.amount), onClose: () => onClose() },
    h('div', { className: 'grid', style: { marginTop: 12 } },
      !e.virtual && h('label', null, 'Data', h('input', { type: 'date', value: data, onChange: ev => setData(ev.target.value) })),
      !e.virtual && h('label', null, 'Valor (R$)', h('input', { value: valor, inputMode: 'decimal', onChange: ev => setValor(ev.target.value) })),
      !e.virtual && e.dueDate && dataNoVencimento(e) !== data ? h('div', { className: 'full', style: { gridColumn: '1 / -1' } },
        h('span', { role: 'button', 'data-testid': 'fin-no-venc', onClick: () => setData(dataNoVencimento(e)), style: { border: '1px solid #86efac', background: '#f0fdf4', color: '#166534', borderRadius: 999, padding: '4px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-block' } },
          '📅 ' + (e.origin === 'proposta' ? 'No dia do evento' : 'No vencimento') + ' (' + fmtData(dataNoVencimento(e)) + ')')) : null,
      h('label', null, 'Forma', h('select', { value: forma, onChange: ev => setForma(ev.target.value) }, (e.virtual ? ['dinheiro', 'pix', 'credito', 'debito', 'outro'] : cats.pagamentos).map(k => h('option', { key: k, value: k }, PAG[k] || k))))),
    e.virtual && h('div', { className: 'muted', style: { marginTop: 8 } }, 'O pedido fica marcado como pago e entra no caixa na data do pedido.'),
    msg && h('div', { style: { color: '#b91c1c', marginTop: 10, fontWeight: 600 } }, msg),
    h('div', { style: { display: 'flex', gap: 8, marginTop: 16 } },
      h('div', { role: 'button', className: 'btn b-wh', style: { flex: 1 }, onClick: () => onClose() }, 'Cancelar'),
      h('div', { role: 'button', className: 'btn b-gr', 'data-testid': 'fin-confirmar-pag', style: { flex: 2 }, onClick: ok }, 'Confirmar')));
}

// ====================== Receber / pagar vários de uma vez (nov/2026) ======================
// Data no vencimento (proposta = dia do evento); se ainda não venceu, entra hoje
const dataNoVencimento = e => { const v = String(e.dueDate || '').slice(0, 10), hj = hojeISO(); return v && v < hj ? v : hj; };
const nomeBaixa = (itens, n) => { const r = itens.every(e => e.type === 'receber'), p = itens.every(e => e.type === 'pagar'); return r ? (n === 1 ? 'recebimento' : 'recebimentos') : p ? (n === 1 ? 'pagamento' : 'pagamentos') : (n === 1 ? 'baixa' : 'baixas'); };
function LoteDialog({ itens, onClose }) {
  const cats = useCategorias();
  const [modo, setModo] = useState('venc');
  const [data, setData] = useState(hojeISO());
  const [forma, setForma] = useState('pix');
  const [prog, setProg] = useState(null);
  const [msg, setMsg] = useState(null);
  const total = itens.reduce((t, e) => t + (e.type === 'receber' ? 1 : -1) * (Number(e.amount) || 0), 0);
  const ok = async () => {
    if (modo === 'data' && !data) return setMsg('Escolha a data.');
    let feitos = 0; const falhas = [];
    for (let i = 0; i < itens.length; i++) {
      const e = itens[i]; setProg(i + 1);
      try {
        if (e.virtual) await req('/api/orders/' + e.orderId, { method: 'PATCH', body: JSON.stringify({ paid: true, paymentMethod: ['dinheiro', 'pix', 'credito', 'debito'].includes(forma) ? forma : 'outro' }) });
        else await req('/api/finance/entries/' + e.id + '/pay', { method: 'POST', body: JSON.stringify({ paidAt: modo === 'venc' ? dataNoVencimento(e) : data, paymentMethod: forma }) });
        feitos++;
      } catch (err) { falhas.push(e.description + ': ' + msgErro(err)); }
    }
    setProg(null);
    if (falhas.length) { setMsg(`${feitos} registrado(s). Não deu certo em ${falhas.length}: ` + falhas.slice(0, 3).join(' · ')); if (feitos) setTimeout(() => onClose(`${feitos} ${nomeBaixa(itens, feitos)} registrado(s).`), 2500); return; }
    onClose(`${feitos} ${nomeBaixa(itens, feitos)} registrado(s).`);
  };
  const radio = (k, txt) => h('label', { style: { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14, cursor: 'pointer', marginTop: 8 } },
    h('input', { type: 'radio', name: 'lote-modo', checked: modo === k, 'data-lote-modo': k, onChange: () => setModo(k), style: { marginTop: 3 } }), txt);
  return h(Modal, { titulo: '✅ Registrar ' + itens.length + ' ' + nomeBaixa(itens, itens.length), sub: 'Total ' + brl(Math.abs(total)) + (total < 0 ? ' a pagar' : ' a receber'), onClose: () => (prog ? null : onClose()) },
    h('div', { style: { marginTop: 8 } },
      h('b', { style: { fontSize: 14 } }, 'Data'),
      radio('venc', h('span', null, 'No vencimento de cada um ', h('span', { className: 'muted' }, '(proposta = dia do evento; o que ainda não venceu entra com a data de hoje)'))),
      radio('data', h('span', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } }, 'Todos na mesma data:',
        h('input', { type: 'date', value: data, 'data-testid': 'lote-data', onChange: ev => { setData(ev.target.value); setModo('data'); }, style: { width: 160 } })))),
    h('div', { className: 'grid', style: { marginTop: 12 } },
      h('label', null, 'Forma', h('select', { value: forma, onChange: ev => setForma(ev.target.value) }, cats.pagamentos.map(k => h('option', { key: k, value: k }, PAG[k] || k))))),
    h('div', { style: { marginTop: 12, maxHeight: 220, overflowY: 'auto', border: '1px solid #f3f4f6', borderRadius: 10, padding: '4px 10px' } },
      itens.map(e => h('div', { key: e.id, style: { display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, padding: '5px 0', borderBottom: '1px solid #f9fafb' } },
        h('span', { style: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, e.description),
        h('span', { style: { whiteSpace: 'nowrap', color: '#4b5563' } }, (e.virtual ? 'data do pedido' : fmtData(modo === 'venc' ? dataNoVencimento(e) : data)) + ' · ' + brl(e.amount))))),
    itens.some(e => e.virtual) && h('div', { className: 'muted', style: { marginTop: 8 } }, 'Pedidos do PDV ficam pagos na data do pedido.'),
    msg && h('div', { style: { color: '#b91c1c', marginTop: 10, fontWeight: 600 } }, msg),
    h('div', { style: { display: 'flex', gap: 8, marginTop: 16 } },
      h('div', { role: 'button', className: 'btn b-wh', style: { flex: 1, opacity: prog ? .5 : 1 }, onClick: () => (prog ? null : onClose()) }, 'Cancelar'),
      h('div', { role: 'button', className: 'btn b-gr', 'data-testid': 'lote-confirmar', style: { flex: 2, opacity: prog ? .6 : 1 }, onClick: prog ? undefined : ok }, prog ? `Registrando ${prog} de ${itens.length}...` : 'Confirmar')));
}

// ====================== Dividir (sinal + restante, parcelas) ======================
function DividirDialog({ e, onClose }) {
  const [partes, setPartes] = useState(() => {
    const sinal = Math.round(e.amount * 30) / 100;
    return [{ amount: txtNum(sinal), dueDate: hojeISO(), description: 'Sinal — ' + e.description.replace(/^Evento: /, '') }, { amount: txtNum(e.amount - sinal), dueDate: e.dueDate, description: 'Restante — ' + e.description.replace(/^Evento: /, '') }];
  });
  const [msg, setMsg] = useState(null);
  const soma = partes.reduce((s, p) => s + (parseNum(p.amount) || 0), 0);
  const dif = Math.round((e.amount - soma) * 100) / 100;
  const set = (i, k, v) => setPartes(ps => ps.map((p, j) => j === i ? { ...p, [k]: v } : p));
  const ok = async () => {
    if (Math.abs(dif) > 0.009) return setMsg('A soma das partes tem que dar ' + brl(e.amount) + '.');
    try { await req('/api/finance/entries/' + e.id + '/split', { method: 'POST', body: JSON.stringify({ partes: partes.map(p => ({ amount: parseNum(p.amount), dueDate: p.dueDate, description: p.description })) }) }); onClose('Lançamento dividido em ' + partes.length + ' partes.'); }
    catch (err) { setMsg(msgErro(err)); }
  };
  return h(Modal, { titulo: '✂️ Dividir', sub: e.description + ' · ' + brl(e.amount) + ' — ex.: sinal na assinatura e o restante no dia do evento.', onClose: () => onClose() },
    partes.map((p, i) => h('div', { key: i, style: { display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr) 150px 24px', gap: 6, marginTop: 8, alignItems: 'center' } },
      h('input', { value: p.description, 'aria-label': 'Descrição da parte ' + (i + 1), onChange: ev => set(i, 'description', ev.target.value) }),
      h('input', { value: p.amount, inputMode: 'decimal', 'aria-label': 'Valor da parte ' + (i + 1), onChange: ev => set(i, 'amount', ev.target.value) }),
      h('input', { type: 'date', value: p.dueDate, 'aria-label': 'Vencimento da parte ' + (i + 1), onChange: ev => set(i, 'dueDate', ev.target.value) }),
      partes.length > 2 ? h('span', { className: 'x', style: { fontSize: 20 }, role: 'button', onClick: () => setPartes(ps => ps.filter((_, j) => j !== i)) }, '×') : h('span'))),
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 8 } },
      h('div', { role: 'button', className: 'btn b-wh b-sm', onClick: () => setPartes(ps => ps.concat([{ amount: txtNum(Math.max(dif, 0)), dueDate: e.dueDate, description: e.description }])) }, '+ Parte'),
      h('span', { style: { fontWeight: 700, color: Math.abs(dif) > 0.009 ? '#b91c1c' : '#15803d' } }, Math.abs(dif) > 0.009 ? (dif > 0 ? 'Faltam ' : 'Sobram ') + brl(Math.abs(dif)) : '✓ Soma confere')),
    msg && h('div', { style: { color: '#b91c1c', marginTop: 10, fontWeight: 600 } }, msg),
    h('div', { style: { display: 'flex', gap: 8, marginTop: 16 } },
      h('div', { role: 'button', className: 'btn b-wh', style: { flex: 1 }, onClick: () => onClose() }, 'Cancelar'),
      h('div', { role: 'button', className: 'btn b-gr', 'data-testid': 'fin-dividir-ok', style: { flex: 2 }, onClick: ok }, 'Dividir')));
}

// ====================== Contas ======================
function Contas({ mes, recarregar, versao }) {
  const [tipo, setTipo] = useState('todos');
  const [status, setStatus] = useState('abertos');
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');
  const [dialogo, setDialogo] = useState(null);
  const [aviso, setAviso] = useState('');
  const [lote, setLote] = useState(null); // null = desligado; senão Set dos ids marcados
  const carregar = useCallback(() => {
    const qs = new URLSearchParams({ from: mes + '-01', to: fimMes(mes), status, ...(tipo !== 'todos' ? { type: tipo } : {}) });
    setLista(null);
    req('/api/finance/entries?' + qs).then(l => { setLista(Array.isArray(l) ? l : []); setErro(''); }).catch(e => setErro(msgErro(e)));
  }, [mes, tipo, status]);
  useEffect(() => { carregar(); }, [carregar, versao]);
  const fechar = t => { setDialogo(null); if (t) { setLote(null); setAviso(t); setTimeout(() => setAviso(''), 5000); carregar(); recarregar(); } };
  // Conta automática repetida da mesma proposta (erro já corrigido no servidor: some sozinha). Não receber.
  const repetidas = useMemo(() => {
    const vistos = new Set(), out = new Set();
    (lista || []).filter(e => e.origin === 'proposta' && e.autoSync && e.proposalId && e.status !== 'pago')
      .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')) || String(a.id).localeCompare(String(b.id)))
      .forEach(e => { if (vistos.has(e.proposalId)) out.add(e.id); else vistos.add(e.proposalId); });
    return out;
  }, [lista]);
  const abertas = (lista || []).filter(e => e.status !== 'pago' && !repetidas.has(e.id));
  const marcadas = lote ? abertas.filter(e => lote.has(e.id)) : [];
  const marcar = (ids, v) => setLote(prev => { const n = new Set(prev || []); ids.forEach(id => (v ? n.add(id) : n.delete(id))); return n; });
  const desfazer = async e => { try { await req('/api/finance/entries/' + e.id + '/unpay', { method: 'POST' }); fechar('Pagamento desfeito.'); } catch (err) { alert(msgErro(err)); } };
  const excluir = async e => {
    if (!confirm(`Excluir "${e.description}" (${brl(e.amount)})?` + (e.origin === 'proposta' ? '\nEla não volta a ser criada pela proposta.' : ''))) return;
    try { await req('/api/finance/entries/' + e.id, { method: 'DELETE' }); fechar('Lançamento excluído.'); } catch (err) { alert(msgErro(err)); }
  };
  const tot = (lista || []).reduce((t, e) => { const v = e.status === 'pago' ? (e.paidAmount ?? e.amount) : e.amount; t[e.type] += v; return t; }, { pagar: 0, receber: 0 });
  return h('div', null,
    h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
      h('div', { className: 'seg' }, [['todos', 'Todas'], ['pagar', '💸 A pagar'], ['receber', '💰 A receber']].map(([k, n]) => h('div', { key: k, className: tipo === k ? 'on' : '', role: 'button', 'data-ftipo': k, onClick: () => setTipo(k) }, n))),
      h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
        h('select', { value: status, 'aria-label': 'Situação', 'data-testid': 'fin-status', onChange: e => setStatus(e.target.value) },
          h('option', { value: 'abertos' }, 'Em aberto (com atrasados)'), h('option', { value: 'todos' }, 'Todas do mês'), h('option', { value: 'pago' }, 'Pagas no mês'), h('option', { value: 'atrasado' }, 'Atrasadas')),
        abertas.length > 1 ? h('div', { role: 'button', className: 'btn b-wh', 'data-testid': 'fin-lote', onClick: () => setLote(lote ? null : new Set()) }, lote ? 'Cancelar seleção' : '☑️ Vários de uma vez') : null,
        h('div', { role: 'button', className: 'btn b-gr', 'data-testid': 'fin-novo', onClick: () => setDialogo({ k: 'novo' }) }, '+ Lançamento'))),
    lote && h('div', { 'data-testid': 'lote-barra', style: { marginTop: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
      h('b', { style: { fontSize: 14 } }, marcadas.length + ' marcado(s)' + (marcadas.length ? ' · ' + brl(marcadas.reduce((t, e) => t + (Number(e.amount) || 0), 0)) : '')),
      h('div', { role: 'button', className: 'btn b-wh b-sm', 'data-testid': 'lote-atrasados', onClick: () => marcar(abertas.filter(e => e.status === 'atrasado').map(e => e.id), true) }, 'Marcar atrasados'),
      h('div', { role: 'button', className: 'btn b-wh b-sm', onClick: () => marcar(abertas.map(e => e.id), true) }, 'Marcar todos'),
      marcadas.length ? h('div', { role: 'button', className: 'btn b-wh b-sm', onClick: () => setLote(new Set()) }, 'Desmarcar') : null,
      h('div', { role: 'button', className: 'btn b-gr b-sm', 'data-testid': 'lote-registrar', style: { marginLeft: 'auto', opacity: marcadas.length ? 1 : .5 }, onClick: () => marcadas.length && setDialogo({ k: 'lote', itens: marcadas }) }, 'Registrar →')),
    aviso && h('div', { role: 'status', style: { marginTop: 10, color: '#166534', fontWeight: 600 } }, '✅ ' + aviso),
    erro ? h('div', { style: { color: '#b91c1c', marginTop: 12, fontWeight: 600 } }, '❌ ' + erro) : !lista ? h('div', { className: 'muted', style: { marginTop: 12 } }, 'Carregando...') :
    !lista.length ? h('div', { className: 'muted', style: { marginTop: 14 } }, status === 'abertos' ? 'Nada em aberto. 🎉' : 'Nenhum lançamento.') :
    h('div', { style: { marginTop: 8 } },
      h('div', { className: 'muted', style: { margin: '6px 0' } }, `${lista.length} lançamento(s)` + (tipo !== 'receber' ? ` · a pagar ${brl(tot.pagar)}` : '') + (tipo !== 'pagar' ? ` · a receber ${brl(tot.receber)}` : '')),
      lista.map(e => h('div', { key: e.id, className: 'row', 'data-lanc': e.description },
        lote && e.status !== 'pago' && !repetidas.has(e.id) ? h('input', { type: 'checkbox', 'aria-label': 'Marcar ' + e.description, 'data-lote': e.id, checked: lote.has(e.id), onChange: ev => marcar([e.id], ev.target.checked), style: { width: 20, height: 20, flex: '0 0 auto' } }) : null,
        h('div', { style: { minWidth: 0, flex: '1 1 240px' } },
          h('div', { style: { fontWeight: 700 } }, (e.type === 'receber' ? '💰 ' : '💸 ') + e.description,
            repetidas.has(e.id) ? h('span', { className: 'tag t-atrasado', 'data-testid': 'fin-repetida', style: { marginLeft: 6 }, title: 'Conta repetida da mesma proposta (erro já corrigido). Some sozinha depois da atualização — não precisa receber.' }, 'repetida') : null),
          h('div', { className: 'muted' }, [e.categoryName, e.supplierName, e.clientName, e.paymentMethod && e.status === 'pago' ? PAG[e.paymentMethod] : null].filter(Boolean).join(' · '),
            e.origin && ORIGEM[e.origin] ? h('span', { className: 'tag t-org', style: { marginLeft: 6 } }, ORIGEM[e.origin]) : null)),
        h('div', { style: { textAlign: 'right', minWidth: 120 } },
          h('div', { style: { fontWeight: 800, color: e.type === 'receber' ? '#15803d' : '#b91c1c' } }, (e.type === 'receber' ? '+ ' : '− ') + brl(e.status === 'pago' ? (e.paidAmount ?? e.amount) : e.amount)),
          h('div', { className: 'muted', style: { fontSize: 12 } }, e.status === 'pago' ? 'pago em ' + fmtData(e.paidAt) : 'vence ' + fmtData(e.dueDate)),
          h('span', { className: 'tag t-' + e.status }, e.status === 'pago' ? (e.type === 'receber' ? 'recebido' : 'pago') : e.status === 'atrasado' ? 'atrasado' : 'em aberto')),
        h('div', { style: { display: 'flex', gap: 4, flexWrap: 'wrap' } },
          e.status !== 'pago' && repetidas.has(e.id) ? null
          : e.status !== 'pago' ? h('div', { role: 'button', className: 'btn b-gr b-sm', 'data-acao': 'pagar', onClick: () => setDialogo({ k: 'pagar', e }) }, e.type === 'receber' ? 'Receber' : 'Pagar')
            : h('div', { role: 'button', className: 'btn b-wh b-sm', onClick: () => desfazer(e) }, 'Desfazer'),
          !e.virtual && e.status !== 'pago' ? h('div', { role: 'button', className: 'btn b-wh b-sm', title: 'Dividir em partes (sinal + restante)', 'data-acao': 'dividir', onClick: () => setDialogo({ k: 'dividir', e }) }, '✂️') : null,
          !e.virtual ? h('div', { role: 'button', className: 'btn b-wh b-sm', title: 'Editar', onClick: () => setDialogo({ k: 'editar', e }) }, '✏️') : null,
          !e.virtual ? h('div', { role: 'button', className: 'btn b-red b-sm', title: 'Excluir', onClick: () => excluir(e) }, '🗑') : null)))),
    dialogo && (dialogo.k === 'novo' || dialogo.k === 'editar') && h(LancamentoDialog, { inicial: dialogo.e, onClose: fechar }),
    dialogo && dialogo.k === 'pagar' && h(PagarDialog, { e: dialogo.e, onClose: fechar }),
    dialogo && dialogo.k === 'lote' && h(LoteDialog, { itens: dialogo.itens, onClose: fechar }),
    dialogo && dialogo.k === 'dividir' && h(DividirDialog, { e: dialogo.e, onClose: fechar }));
}

// ====================== Fluxo de caixa ======================
function Fluxo({ mes, versao }) {
  const [d, setD] = useState(null);
  const [erro, setErro] = useState('');
  const [cfg, setCfg] = useState(null);
  const carregar = () => req('/api/finance/cashflow?' + new URLSearchParams({ from: mes + '-01', to: fimMes(mes) })).then(r => { setD(r); setErro(''); }).catch(e => setErro(msgErro(e)));
  useEffect(() => { setD(null); carregar(); }, [mes, versao]);
  const salvarSaldo = async () => {
    const v = parseNum(cfg.valor);
    try { await req('/api/finance/settings', { method: 'PUT', body: JSON.stringify({ openingBalance: cfg.valor === '' ? null : v, openingDate: cfg.data }) }); setCfg(null); carregar(); }
    catch (e) { alert(msgErro(e)); }
  };
  if (erro) return h('div', { style: { color: '#b91c1c', fontWeight: 600 } }, '❌ ' + erro);
  if (!d) return h('div', { className: 'muted' }, 'Carregando...');
  const comMov = d.dias.filter(x => x.entra || x.sai || x.entraPrev || x.saiPrev);
  const max = Math.max(1, ...comMov.map(x => Math.max(x.entra + x.entraPrev, x.sai + x.saiPrev)));
  const t = d.totais, hoje = hojeISO();
  const ult = d.dias[d.dias.length - 1];
  return h('div', null,
    h('div', { className: 'kpis' },
      h('div', { className: 'kpi' }, h('span', { className: 'muted' }, 'Entrou'), h('b', { style: { color: '#15803d' } }, brl(t.entra)), t.vendasPdv ? h('span', { className: 'muted', style: { fontSize: 12 } }, brl(t.vendasPdv) + ' de vendas do PDV') : null),
      h('div', { className: 'kpi' }, h('span', { className: 'muted' }, 'Saiu'), h('b', { style: { color: '#b91c1c' } }, brl(t.sai))),
      h('div', { className: 'kpi' }, h('span', { className: 'muted' }, 'Ainda vai entrar'), h('b', null, brl(t.entraPrev))),
      h('div', { className: 'kpi' }, h('span', { className: 'muted' }, 'Ainda vai sair'), h('b', null, brl(t.saiPrev))),
      h('div', { className: 'kpi' }, h('span', { className: 'muted' }, 'Resultado do mês'), h('b', { style: { color: t.entra - t.sai >= 0 ? '#15803d' : '#b91c1c' } }, brl(t.entra - t.sai))),
      ult && ult.saldoPrevisto != null ? h('div', { className: 'kpi' }, h('span', { className: 'muted' }, 'Saldo previsto no fim do mês'), h('b', null, brl(ult.saldoPrevisto))) : null),
    h('div', { className: 'muted', style: { marginTop: 10 } },
      d.saldoInicial != null ? `Saldo inicial: ${brl(d.saldoInicial)} em ${fmtData(d.saldoInicialData)}. ` : 'Sem saldo inicial: o saldo do caixa não aparece. ',
      h('span', { role: 'button', style: { color: '#c2410c', fontWeight: 700, cursor: 'pointer' }, 'data-testid': 'fin-saldo-ini', onClick: () => setCfg({ valor: d.saldoInicial != null ? txtNum(d.saldoInicial) : '', data: d.saldoInicialData || hoje }) }, d.saldoInicial != null ? 'Alterar' : 'Informar o saldo inicial')),
    cfg && h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 8, padding: 10, background: '#f9fafb', borderRadius: 10 } },
      h('label', { style: { display: 'flex', flexDirection: 'column', fontSize: 12, gap: 3 } }, 'Quanto tinha no caixa/banco (R$)', h('input', { value: cfg.valor, inputMode: 'decimal', 'data-f': 'saldo', onChange: e => setCfg(c => ({ ...c, valor: e.target.value })) })),
      h('label', { style: { display: 'flex', flexDirection: 'column', fontSize: 12, gap: 3 } }, 'No início do dia', h('input', { type: 'date', value: cfg.data, onChange: e => setCfg(c => ({ ...c, data: e.target.value })) })),
      h('div', { role: 'button', className: 'btn b-gr b-sm', 'data-testid': 'fin-saldo-ok', onClick: salvarSaldo }, 'Salvar'),
      h('div', { role: 'button', className: 'btn b-wh b-sm', onClick: () => setCfg(null) }, 'Cancelar')),
    !comMov.length ? h('div', { className: 'muted', style: { marginTop: 14 } }, 'Nenhuma entrada ou saída neste mês.') :
    h('div', { style: { overflowX: 'auto', marginTop: 12 } }, h('table', { 'data-testid': 'fin-fluxo' },
      h('thead', null, h('tr', null, h('th', null, 'Dia'), h('th', null, 'Entradas'), h('th', null, 'Saídas'), h('th', { className: 'esconde-cel' }, ''), d.saldoInicial != null ? h('th', null, 'Saldo') : null)),
      h('tbody', null, comMov.map(x => {
        const fut = x.dia > hoje;
        return h('tr', { key: x.dia, style: { background: x.dia === hoje ? '#fff7ed' : undefined } },
          h('td', { style: { whiteSpace: 'nowrap', fontWeight: x.dia === hoje ? 800 : 500 } }, fmtData(x.dia).slice(0, 5) + (x.dia === hoje ? ' (hoje)' : '')),
          h('td', { style: { color: '#15803d' } }, x.entra ? brl(x.entra) : '', x.entraPrev ? h('div', { className: 'muted', style: { fontSize: 12 } }, 'previsto ' + brl(x.entraPrev)) : null),
          h('td', { style: { color: '#b91c1c' } }, x.sai ? brl(x.sai) : '', x.saiPrev ? h('div', { className: 'muted', style: { fontSize: 12 } }, 'previsto ' + brl(x.saiPrev)) : null),
          h('td', { className: 'esconde-cel', style: { width: '30%' } },
            h('div', null, h('span', { className: 'barra', style: { width: ((x.entra + x.entraPrev) / max * 100) + '%', background: fut ? '#bbf7d0' : '#22c55e' } })),
            h('div', null, h('span', { className: 'barra', style: { width: ((x.sai + x.saiPrev) / max * 100) + '%', background: fut ? '#fecaca' : '#ef4444' } }))),
          d.saldoInicial != null ? h('td', { style: { fontWeight: 700, color: (fut ? x.saldoPrevisto : x.saldo) < 0 ? '#b91c1c' : undefined } }, x.saldo == null ? '' : brl(fut ? x.saldoPrevisto : x.saldo), fut && x.saldo != null ? h('div', { className: 'muted', style: { fontSize: 11 } }, 'previsto') : null) : null);
      })))));
}

// ====================== Contas fixas ======================
function RecorrenteDialog({ inicial, onClose }) {
  const cats = useCategorias();
  const fornecedores = useListaSimples('/api/suppliers');
  const editando = !!(inicial && inicial.id);
  const [f, setF] = useState(() => ({ type: (inicial && inicial.type) || 'pagar', description: (inicial && inicial.description) || '', category: (inicial && inicial.category) || '',
    amount: inicial ? txtNum(inicial.amount) : '', dayOfMonth: inicial ? String(inicial.dayOfMonth) : '10', startMonth: (inicial && inicial.startMonth) || hojeISO().slice(0, 7),
    endMonth: (inicial && inicial.endMonth) || '', supplierId: (inicial && inicial.supplierId) || '', paymentMethod: (inicial && inicial.paymentMethod) || '' }));
  const [msg, setMsg] = useState(null);
  const set = (k, v) => setF(o => ({ ...o, [k]: v }));
  const lista = cats.categorias.filter(c => c.tipo === f.type && c.k !== 'eventos');
  // Conta fixa: o mais comum primeiro (aluguel / outras receitas)
  useEffect(() => { if (lista.length && !lista.some(c => c.k === f.category)) { const pref = lista.find(c => c.k === (f.type === 'pagar' ? 'aluguel' : 'outras_receitas')); set('category', (pref || lista[0]).k); } }, [f.type, cats]);
  const salvar = async () => {
    const v = parseNum(f.amount);
    if (!f.description.trim()) return setMsg('Escreva a descrição.');
    if (!(v > 0)) return setMsg('Informe o valor.');
    const corpo = { ...f, amount: v, dayOfMonth: parseInt(f.dayOfMonth, 10), endMonth: f.endMonth || null, supplierId: f.supplierId || null, paymentMethod: f.paymentMethod || null };
    try {
      if (editando) await req('/api/finance/recurrences/' + inicial.id, { method: 'PUT', body: JSON.stringify(corpo) });
      else await req('/api/finance/recurrences', { method: 'POST', body: JSON.stringify(corpo) });
      onClose(editando ? 'Conta fixa salva (vale para os meses ainda não pagos).' : 'Conta fixa criada.');
    } catch (e) { setMsg(msgErro(e)); }
  };
  return h(Modal, { titulo: editando ? '✏️ Conta fixa' : '🔁 Nova conta fixa', sub: 'Todo mês entra um lançamento sozinho (até 12 meses à frente).', onClose: () => onClose() },
    !editando && h('div', { className: 'seg', style: { marginTop: 10 } }, [['pagar', '💸 Despesa'], ['receber', '💰 Receita']].map(([k, n]) => h('div', { key: k, className: f.type === k ? 'on' : '', role: 'button', onClick: () => set('type', k) }, n))),
    h('div', { className: 'grid', style: { marginTop: 12 } },
      h('label', { className: 'full' }, 'Descrição *', h('input', { value: f.description, 'data-f': 'rdesc', placeholder: 'Ex.: Aluguel da cozinha', onChange: e => set('description', e.target.value) })),
      h('label', null, 'Categoria', h('select', { value: f.category, onChange: e => set('category', e.target.value) }, lista.map(c => h('option', { key: c.k, value: c.k }, c.nome)))),
      h('label', null, 'Valor por mês (R$) *', h('input', { value: f.amount, inputMode: 'decimal', 'data-f': 'rvalor', onChange: e => set('amount', e.target.value) })),
      h('label', null, 'Vence todo dia', h('select', { value: f.dayOfMonth, 'data-f': 'rdia', onChange: e => set('dayOfMonth', e.target.value) }, Array.from({ length: 31 }, (_, i) => h('option', { key: i, value: String(i + 1) }, String(i + 1) + (i === 30 ? ' (ou o último dia)' : ''))))),
      h('label', null, 'A partir de', h('input', { type: 'month', value: f.startMonth, onChange: e => set('startMonth', e.target.value) })),
      h('label', null, 'Até (opcional)', h('input', { type: 'month', value: f.endMonth, onChange: e => set('endMonth', e.target.value) })),
      h('label', null, 'Forma de pagamento', h('select', { value: f.paymentMethod, onChange: e => set('paymentMethod', e.target.value) }, h('option', { value: '' }, '—'), cats.pagamentos.map(k => h('option', { key: k, value: k }, PAG[k] || k)))),
      f.type === 'pagar' && h('label', null, 'Fornecedor', h('select', { value: f.supplierId, onChange: e => set('supplierId', e.target.value) }, h('option', { value: '' }, '—'), fornecedores.map(s => h('option', { key: s.id, value: s.id }, s.name))))),
    msg && h('div', { style: { color: '#b91c1c', marginTop: 10, fontWeight: 600 } }, msg),
    h('div', { style: { display: 'flex', gap: 8, marginTop: 16 } },
      h('div', { role: 'button', className: 'btn b-wh', style: { flex: 1 }, onClick: () => onClose() }, 'Cancelar'),
      h('div', { role: 'button', className: 'btn b-gr', 'data-testid': 'fin-rsalvar', style: { flex: 2 }, onClick: salvar }, 'Salvar')));
}
function Fixas({ recarregar }) {
  const [lista, setLista] = useState(null);
  const [dialogo, setDialogo] = useState(null);
  const carregar = () => req('/api/finance/recurrences').then(setLista).catch(() => setLista([]));
  useEffect(() => { carregar(); }, []);
  const fechar = t => { setDialogo(null); if (t) { carregar(); recarregar(); } };
  const excluir = async r => { if (!confirm(`Excluir a conta fixa "${r.description}"? Os meses já pagos ficam; os em aberto de hoje em diante saem.`)) return; try { await req('/api/finance/recurrences/' + r.id, { method: 'DELETE' }); fechar('ok'); } catch (e) { alert(msgErro(e)); } };
  const ativar = async (r, v) => { try { await req('/api/finance/recurrences/' + r.id, { method: 'PUT', body: JSON.stringify({ isActive: v }) }); fechar('ok'); } catch (e) { alert(msgErro(e)); } };
  const totalMes = (lista || []).filter(r => r.isActive && r.type === 'pagar').reduce((s, r) => s + r.amount, 0);
  return h('div', null,
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
      h('div', { className: 'muted' }, lista ? `${lista.length} conta(s) fixa(s) · ${brl(totalMes)} de despesas por mês` : 'Carregando...'),
      h('div', { role: 'button', className: 'btn b-gr', 'data-testid': 'fin-rnova', onClick: () => setDialogo({}) }, '+ Conta fixa')),
    lista && !lista.length && h('div', { className: 'muted', style: { marginTop: 12 } }, 'Aluguel, contador, internet, sistema, pró-labore… cadastre uma vez e todo mês entra em "Contas" sozinho.'),
    (lista || []).map(r => h('div', { key: r.id, className: 'row', style: { opacity: r.isActive ? 1 : .55 }, 'data-rec': r.description },
      h('div', { style: { minWidth: 0, flex: '1 1 240px' } }, h('div', { style: { fontWeight: 700 } }, (r.type === 'receber' ? '💰 ' : '💸 ') + r.description),
        h('div', { className: 'muted' }, [r.categoryName, 'todo dia ' + r.dayOfMonth, r.supplierName, 'desde ' + r.startMonth.slice(5) + '/' + r.startMonth.slice(0, 4), r.endMonth ? 'até ' + r.endMonth.slice(5) + '/' + r.endMonth.slice(0, 4) : null, r.isActive ? null : 'pausada'].filter(Boolean).join(' · '))),
      h('b', null, brl(r.amount) + '/mês'),
      h('div', { style: { display: 'flex', gap: 4 } },
        h('div', { role: 'button', className: 'btn b-wh b-sm', onClick: () => setDialogo({ r }) }, '✏️'),
        h('div', { role: 'button', className: 'btn b-wh b-sm', onClick: () => ativar(r, !r.isActive) }, r.isActive ? 'Pausar' : 'Retomar'),
        h('div', { role: 'button', className: 'btn b-red b-sm', onClick: () => excluir(r) }, '🗑')))),
    dialogo && h(RecorrenteDialog, { inicial: dialogo.r, onClose: fechar }));
}

// ====================== Página ======================
function FinanceiroPage() {
  injectCss();
  const [mes, setMes] = useState(hojeISO().slice(0, 7));
  const [aba, setAbaS] = useState(() => { try { return localStorage.getItem('fin_aba') || 'contas'; } catch (e) { return 'contas'; } });
  const setAba = a => { setAbaS(a); try { localStorage.setItem('fin_aba', a); } catch (e) {} };
  const [res, setRes] = useState(null);
  const [erro, setErro] = useState('');
  const [versao, setVersao] = useState(0);
  const recarregar = () => setVersao(v => v + 1);
  useEffect(() => { req('/api/finance/summary?month=' + mes).then(r => { setRes(r); setErro(''); }).catch(e => setErro(msgErro(e))); }, [mes, versao]);
  if (!temPremium()) return h('div', { className: 'fin card' }, h('h2', { style: { fontSize: 20, fontWeight: 800 } }, '💰 Financeiro'), h('p', { className: 'muted' }, 'O financeiro é do plano PREMIUM.'));
  const atr = res && res.atrasados;
  const abas = [['contas', '📋 Contas']].concat(window.ConferenciaPanel ? [['receb', '✅ Recebimentos']] : [], [['fluxo', '📈 Fluxo de caixa'], ['fixas', '🔁 Contas fixas']], window.DREPanel ? [['dre', '📊 DRE']] : []);
  return h('div', { className: 'fin' },
    h('div', { className: 'card' },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
        h('h2', { style: { fontSize: 22, fontWeight: 800, margin: 0 } }, '💰 Financeiro'),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
          h('div', { role: 'button', className: 'btn b-wh b-sm', 'aria-label': 'Mês anterior', onClick: () => setMes(m => somaMes(m, -1)) }, '‹'),
          h('b', { style: { minWidth: 140, textAlign: 'center', textTransform: 'capitalize' }, 'data-testid': 'fin-mes' }, nomeMes(mes)),
          h('div', { role: 'button', className: 'btn b-wh b-sm', 'aria-label': 'Próximo mês', onClick: () => setMes(m => somaMes(m, 1)) }, '›'),
          mes !== hojeISO().slice(0, 7) ? h('div', { role: 'button', className: 'btn b-wh b-sm', onClick: () => setMes(hojeISO().slice(0, 7)) }, 'Hoje') : null)),
      erro ? h('div', { style: { marginTop: 10, color: '#b91c1c', fontWeight: 600 } }, '❌ ' + erro) : !res ? h('div', { className: 'muted', style: { marginTop: 10 } }, 'Carregando...') :
      h('div', null,
        (atr.pagar.n || atr.receber.n) ? h('div', { style: { marginTop: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 10, padding: '8px 12px', fontSize: 14 } },
          '⚠️ Atrasados: ' + [atr.pagar.n ? `${atr.pagar.n} a pagar (${brl(atr.pagar.valor)})` : null, atr.receber.n ? `${atr.receber.n} a receber (${brl(atr.receber.valor)})` : null].filter(Boolean).join(' · ')) : null,
        h('div', { className: 'kpis', 'data-testid': 'fin-kpis' },
          h('div', { className: 'kpi' }, h('span', { className: 'muted' }, 'A receber no mês'), h('b', { style: { color: '#15803d' } }, brl(res.aReceber.valor)), h('span', { className: 'muted', style: { fontSize: 12 } }, res.aReceber.n + ' conta(s)' + (res.fiado.n ? ` · fiado ${brl(res.fiado.valor)}` : ''))),
          h('div', { className: 'kpi' }, h('span', { className: 'muted' }, 'A pagar no mês'), h('b', { style: { color: '#b91c1c' } }, brl(res.aPagar.valor)), h('span', { className: 'muted', style: { fontSize: 12 } }, res.aPagar.n + ' conta(s)')),
          h('div', { className: 'kpi' }, h('span', { className: 'muted' }, 'Recebido'), h('b', null, brl(res.recebido.valor)), res.recebido.vendasPdv ? h('span', { className: 'muted', style: { fontSize: 12 } }, 'inclui ' + brl(res.recebido.vendasPdv) + ' do PDV') : null),
          h('div', { className: 'kpi' }, h('span', { className: 'muted' }, 'Pago'), h('b', null, brl(res.pago.valor))),
          h('div', { className: 'kpi' }, h('span', { className: 'muted' }, 'Saldo do mês'), h('b', { style: { color: res.saldoMes >= 0 ? '#15803d' : '#b91c1c' } }, brl(res.saldoMes)))))),
    h('div', { className: 'seg', style: { margin: '12px 0' } }, abas.map(([k, n]) => h('div', { key: k, className: aba === k ? 'on' : '', role: 'button', 'data-aba': k, onClick: () => setAba(k) }, n))),
    h('div', { className: 'card' },
      aba === 'contas' ? h(Contas, { mes, recarregar, versao }) :
      aba === 'fluxo' ? h(Fluxo, { mes, versao }) :
      aba === 'fixas' ? h(Fixas, { recarregar }) :
      aba === 'dre' && window.DREPanel ? h(window.DREPanel, { mes }) :
      aba === 'receb' && window.ConferenciaPanel ? h(window.ConferenciaPanel, { key: versao }) : null));
}

/** Estoque: compra registrada → conta a pagar (ou paga) do fornecedor */
async function lancarCompra({ batchId, total, supplierId, supplierName, dueDate, pago, paymentMethod, itens }) {
  return req('/api/finance/entries', { method: 'POST', body: JSON.stringify({
    type: 'pagar', category: 'insumos', amount: Math.round(total * 100) / 100, dueDate: dueDate || hojeISO(), competenceDate: hojeISO(),
    description: 'Compra' + (supplierName ? ' — ' + supplierName : '') + (itens ? ` (${itens} ${itens === 1 ? 'item' : 'itens'})` : ''),
    supplierId: supplierId || null, stockBatchId: batchId || null, paid: !!pago, paidAt: pago ? hojeISO() : null, paymentMethod: paymentMethod || null
  }) });
}

window.FinanceiroPage = FinanceiroPage;
window.FinanceUtils = { lancarCompra, temPremium, hojeISO };
})();
