(function () {
'use strict';
/**
 * Vendas (out/2026, plano PREMIUM) — window.VendasPage()
 *   Vender (PDV) · Pedidos · Itens à venda · Estoque (prontos) · Resumo
 *   Prato à venda: marcado no próprio prato (DishSale.js, quadro "Vender este prato" no DishForm).
 * API: /api/menu-items, /api/orders, /api/stock (itens de venda com saldo usam o motor do estoque).
 * Sem internet: pedido, produção, perda e inventário vão para a fila do estoque (StockUtils.enviar, clientId)
 * e saem sozinhos quando a conexão volta; o pedido imprime na hora com número provisório.
 * Impressão: window.OrderPrint (80/58 mm, A4/A5; via da cozinha e do cliente).
 */
const h = React.createElement;
const { useState, useEffect, useMemo, useRef } = React;

const CSS = `
.vnd{font-family:system-ui,-apple-system,sans-serif;color:#111827}
.vnd .card{background:#fff;border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.08);padding:16px}
.vnd .muted{color:#6b7280;font-size:13px}
.vnd .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:10px;padding:9px 14px;font-weight:700;font-size:14px;cursor:pointer;user-select:none;border:1px solid transparent;background:none;font-family:inherit}
.vnd .b-or{background:#ea580c;color:#fff}.vnd .b-gr{background:#16a34a;color:#fff}.vnd .b-wh{background:#fff;color:#374151;border-color:#d1d5db}.vnd .b-red{background:#fff;color:#b91c1c;border-color:#fecaca}.vnd .b-dk{background:#1f2937;color:#fff}
.vnd .b-sm{padding:6px 10px;font-size:13px;border-radius:8px}
.vnd .btn[disabled]{opacity:.5;cursor:not-allowed}
.vnd input,.vnd select,.vnd textarea{border:1px solid #d1d5db;border-radius:9px;padding:8px 10px;font-size:15px;background:#fff;color:#111827;box-sizing:border-box;min-width:0;font-family:inherit}
.vnd table{width:100%;border-collapse:collapse;font-size:14px}
.vnd th{text-align:left;font-size:12px;color:#6b7280;font-weight:600;padding:8px 6px;border-bottom:1px solid #e5e7eb}
.vnd td{padding:8px 6px;border-bottom:1px solid #f3f4f6;vertical-align:middle}
.vnd .tag{display:inline-block;font-size:11px;font-weight:700;border-radius:999px;padding:2px 8px;white-space:nowrap}
.vnd .t-ok{background:#dcfce7;color:#166534}.vnd .t-low{background:#fef3c7;color:#92400e}.vnd .t-neg{background:#fee2e2;color:#991b1b}.vnd .t-cinza{background:#f3f4f6;color:#374151}.vnd .t-azul{background:#dbeafe;color:#1e40af}.vnd .t-roxo{background:#ede9fe;color:#5b21b6}
.vnd .abas{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;margin-bottom:12px}
.vnd .aba{padding:9px 14px;border-radius:999px;font-weight:700;font-size:14px;cursor:pointer;white-space:nowrap;border:1px solid #e5e7eb;background:#fff;color:#374151}
.vnd .aba.on{background:#111827;color:#fff;border-color:#111827}
.vnd .chips{display:flex;gap:6px;flex-wrap:wrap}
.vnd .chip{padding:7px 12px;border-radius:999px;font-weight:600;font-size:13px;cursor:pointer;border:1px solid #d1d5db;background:#fff;color:#374151}
.vnd .chip.on{background:#ea580c;color:#fff;border-color:#ea580c}
.vnd .pdv{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:16px;align-items:start}
.vnd .grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-top:12px}
.vnd .prod{border:1px solid #e5e7eb;border-radius:12px;padding:12px;background:#fff;text-align:left;cursor:pointer;min-height:92px;display:flex;flex-direction:column;justify-content:space-between;gap:6px;font-family:inherit;color:#111827}
.vnd .prod:hover{border-color:#ea580c}
.vnd .prod:active{transform:scale(.98)}
.vnd .prod.off{opacity:.45;cursor:not-allowed}
.vnd .prod .nome{font-weight:700;font-size:15px;line-height:1.2}
.vnd .prod .preco{font-weight:800;color:#c2410c;font-size:15px}
.vnd .prod .qt{position:relative}
.vnd .badge{background:#ea580c;color:#fff;border-radius:999px;font-size:12px;font-weight:800;padding:1px 7px;margin-left:6px}
.vnd .carrinho{position:sticky;top:12px}
.vnd .linha{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #f3f4f6}
.vnd .qtd{display:flex;align-items:center;gap:4px}
.vnd .qtd button{width:30px;height:30px;border-radius:8px;border:1px solid #d1d5db;background:#fff;font-size:18px;font-weight:700;cursor:pointer;color:#111827}
.vnd .total{display:flex;justify-content:space-between;align-items:baseline;font-weight:800;font-size:20px;margin-top:10px}
.vnd .barra{display:none}
.vnd label.f{display:block;font-size:12px;font-weight:600;color:#4b5563;margin:8px 0 4px}
.vnd .duas{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.vnd .pedido{border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-top:10px;background:#fff}
.vnd .pedido .topo{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;flex-wrap:wrap}
.vnd .pedido .n{font-size:22px;font-weight:800}
.vnd .stat{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.vnd .stat > div{background:#f9fafb;border-radius:12px;padding:12px}
.vnd .stat b{display:block;font-size:22px;font-weight:800;margin-top:2px}
.vnd .aviso{border-radius:10px;padding:10px 12px;font-size:14px;margin-top:10px}
.vnd .a-azul{background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a}.vnd .a-ama{background:#fffbeb;border:1px solid #fde68a;color:#92400e}.vnd .a-ver{background:#fef2f2;border:1px solid #fecaca;color:#991b1b}.vnd .a-ok{background:#f0fdf4;border:1px solid #bbf7d0;color:#166534}
.vnd-bg{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:80;display:flex;align-items:flex-end;justify-content:center}
@media (min-width:768px){.vnd-bg{align-items:center;padding:16px}}
.vnd-modal{background:#fff;width:100%;max-width:640px;max-height:92vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom))}
@media (min-width:768px){.vnd-modal{border-radius:16px}}
.vnd-modal h3{font-size:18px;font-weight:800;margin:0 0 4px}
.vnd .x{cursor:pointer;color:#9ca3af;font-size:26px;line-height:1;background:none;border:0}
@media (max-width:900px){.vnd .pdv{grid-template-columns:1fr}.vnd .pdv .carrinho{display:none}
.vnd .barra{display:flex;position:fixed;left:8px;right:8px;bottom:calc(112px + env(safe-area-inset-bottom));z-index:45;background:#111827;color:#fff;border-radius:14px;padding:12px 14px;justify-content:space-between;align-items:center;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,.25);cursor:pointer}}
/* o CSS global do celular força 48px e padding em todo botão: aqui o tamanho é o do componente */
.vnd .chip,.vnd .aba{min-height:40px !important;padding:8px 13px !important;font-size:14px !important}
.vnd .btn{min-height:42px !important;padding:9px 14px !important;font-size:14px !important}
.vnd .btn.b-sm{min-height:36px !important;padding:6px 10px !important;font-size:13px !important}
.vnd .qtd button{min-height:36px !important;width:36px !important;height:36px !important;padding:0 !important;font-size:18px !important}
.vnd .x{min-height:32px !important;padding:0 6px !important}
.vnd .lnk{min-height:0 !important;padding:2px 0 !important;font-size:13px !important;font-weight:inherit}
.vnd .prod{padding:12px !important;min-height:92px !important;font-size:15px !important}
@media (max-width:560px){.vnd .grade{grid-template-columns:repeat(2,minmax(0,1fr))}.vnd table{font-size:13px}.vnd th,.vnd td{padding:7px 4px}.vnd td input{width:64px}}
`;
function injectCss() { if (document.getElementById('vnd-css')) return; const st = document.createElement('style'); st.id = 'vnd-css'; st.textContent = CSS; document.head.appendChild(st); }

// ====================== utilidades ======================
const api = () => { const a = window.PrecificacaoAPI && window.PrecificacaoAPI.api; return a && typeof a.request === 'function' ? a : null; };
const req = (url, opt) => { const a = api(); if (!a) return Promise.reject(Object.assign(new Error('Sem conexão com o servidor'), { offline: true })); return a.request(url, opt).then(r => (r && r.data !== undefined ? r.data : r)); };
const brl = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const n2 = (v, d = 2) => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: d });
const parseNum = v => { const t = String(v == null ? '' : v).trim().replace(/\./g, (m, i, s) => (/,/.test(s) ? '' : m)).replace(',', '.'); const n = parseFloat(t); return isFinite(n) ? n : NaN; };
const r2 = v => Math.round(Number(v) * 100) / 100;
const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const semInternet = e => !!(e && (e.offline || e.__network || e.__timeout || (!e.statusCode && typeof navigator !== 'undefined' && navigator.onLine === false)));
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const somaDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const diasAte = iso => Math.round((Date.parse(iso + 'T12:00:00') - Date.parse(hojeISO() + 'T12:00:00')) / 864e5);
const fmtData = iso => (iso ? iso.split('-').reverse().join('/') : '');
const hora = d => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const temPremium = () => !!(window.ConfigHelper && window.ConfigHelper.hasFeatureAccess && window.ConfigHelper.hasFeatureAccess('sales'));
const SU = () => window.StockUtils || null;
async function enviar(url, body, rotulo) {
  if (SU() && SU().enviar) return SU().enviar(url, body, rotulo);
  return req(url, { method: 'POST', body: JSON.stringify(body) });
}
const filaAgora = () => (SU() && SU().fila ? SU().fila() : []);
function mensagemErro(e) {
  const m = String((e && e.message) || e || '');
  if (e && e.statusCode === 402) return 'Vendas é do plano PREMIUM.';
  if (/sale_items|orders|order_items|does not exist|relation|P20/.test(m) || (e && e.statusCode === 500)) return 'Vendas ainda não está ativado no servidor (as tabelas não foram criadas). Avise o suporte.';
  return m || 'Não foi possível falar com o servidor.';
}
const TIPOS = [['balcao', 'Balcão'], ['mesa', 'Mesa'], ['retirada', 'Retirada'], ['delivery', 'Delivery'], ['encomenda', 'Encomenda']];
const PAGS = [['dinheiro', 'Dinheiro'], ['pix', 'PIX'], ['credito', 'Crédito'], ['debito', 'Débito'], ['fiado', 'Fiado']];
const STATUS = { novo: ['Novo', 't-azul'], preparo: ['Em preparo', 't-low'], pronto: ['Pronto', 't-ok'], entregue: ['Entregue', 't-cinza'], cancelado: ['Cancelado', 't-neg'] };
const PROXIMO = { novo: 'preparo', preparo: 'pronto', pronto: 'entregue' };
const ACAO = { preparo: 'Em preparo', pronto: 'Pronto', entregue: 'Entregue' };
const UNIDADES = [['un', 'unidade'], ['porção', 'porção'], ['kg', 'kg']];

function useFila() {
  const [f, setF] = useState(filaAgora());
  useEffect(() => { const up = () => setF(filaAgora()); window.addEventListener('stk-fila', up); return () => window.removeEventListener('stk-fila', up); }, []);
  return f;
}
function useAviso() {
  const [aviso, setA] = useState(null);
  const t = useRef(null);
  const mostrar = (texto, tipo) => { if (t.current) clearTimeout(t.current); setA(texto ? { texto, tipo: tipo || 'ok' } : null); if (texto) t.current = setTimeout(() => setA(null), 6000); };
  useEffect(() => () => { if (t.current) clearTimeout(t.current); }, []);
  return [aviso, mostrar];
}
const Aviso = ({ aviso }) => aviso ? h('div', { role: 'status', className: 'aviso ' + (aviso.tipo === 'erro' ? 'a-ver' : aviso.tipo === 'info' ? 'a-azul' : 'a-ok') }, aviso.texto) : null;

function Modal({ titulo, sub, onClose, children, largura }) {
  useEffect(() => { const k = e => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  return h('div', { className: 'vnd-bg vnd', onClick: e => { if (e.target === e.currentTarget) onClose(); } },
    h('div', { className: 'vnd-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo, style: largura ? { maxWidth: largura } : undefined },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 } },
        h('div', null, h('h3', null, titulo), sub ? h('div', { className: 'muted' }, sub) : null),
        h('button', { type: 'button', 'aria-label': 'Fechar', className: 'x', onClick: onClose }, '×')),
      children));
}

// ====================== dados: cardápio ======================
const LS_CARD = 'vnd_cardapio_v1';
function useCardapio(ativo) {
  const [itens, setItens] = useState(() => lsGet(LS_CARD, null));
  const [erro, setErro] = useState('');
  const carregar = () => req('/api/menu-items?all=1').then(l => { lsSet(LS_CARD, l || []); setItens(l || []); setErro(''); })
    .catch(e => { if (semInternet(e) && lsGet(LS_CARD, null)) { setItens(lsGet(LS_CARD, [])); setErro(''); } else setErro(mensagemErro(e)); });
  useEffect(() => { if (ativo) carregar(); }, [ativo]);
  return { itens, erro, carregar };
}
/** Saldo de cada item de venda com a fila (sem internet) aplicada */
function saldosComFila(itens, fila) {
  const m = {};
  (itens || []).forEach(i => { if (i.controlsStock) m[i.id] = i.stock ? i.stock.quantity : 0; });
  (fila || []).forEach(f => {
    const b = f.body || {};
    if (/\/api\/orders$/.test(f.url)) {
      const futuro = b.type === 'encomenda' || (b.scheduledFor && String(b.scheduledFor).slice(0, 10) > hojeISO());
      if (futuro) return;
      (b.items || []).forEach(i => { if (i.saleItemId && m[i.saleItemId] != null) m[i.saleItemId] -= Number(i.quantity) || 0; });
    } else if (/\/api\/stock\/movements$/.test(f.url)) {
      (b.items || []).forEach(i => {
        if (!i.saleItemId || m[i.saleItemId] == null) return;
        const q = Number(i.quantity) || 0;
        m[i.saleItemId] = b.type === 'ajuste' ? q : m[i.saleItemId] + (b.type === 'perda' ? -q : q);
      });
    }
  });
  return m;
}

// ====================== Impressão: configurações ======================
function ImpressaoDialog({ onClose }) {
  const OP = window.OrderPrint;
  const [c, setC] = useState(OP ? OP.config() : {});
  const [salvando, setSalvando] = useState(false);
  const via = v => (c.vias || []).includes(v);
  const togVia = v => setC(x => ({ ...x, vias: via(v) ? x.vias.filter(y => y !== v) : (x.vias || []).concat([v]) }));
  const teste = () => OP.print({ number: 1, type: 'balcao', createdAt: new Date().toISOString(), customerName: 'Cliente TESTE',
    items: [{ name: 'Marmita de strogonoff', quantity: 2, unitPrice: 25, total: 50, notes: 'sem cebola' }, { name: 'Refrigerante lata', quantity: 1, unitPrice: 6, total: 6 }],
    subtotal: 56, discount: 0, deliveryFee: 0, total: 56, paymentMethod: 'dinheiro', paid: true, cashReceived: 100 }, { formato: c.formato, vias: c.vias });
  const salvar = async () => { if (c.formato !== 'a4dupla' && !(c.vias || []).length) return alert('Escolha ao menos uma via.'); setSalvando(true); await OP.saveConfig(c); setSalvando(false); onClose('Configuração de impressão salva.'); };
  const FORM = [['a4dupla', 'A4 · 2 vias (cliente + recebimento)'], ['80', 'Térmica 80 mm'], ['58', 'Térmica 58 mm'], ['a4', 'Folha A4'], ['a5', 'Folha A5']];
  const dupla = c.formato === 'a4dupla';
  return h(Modal, { titulo: '🖨️ Impressão do pedido', sub: 'Funciona com qualquer impressora instalada no aparelho: térmica ou comum. No iPhone, o pedido vira PDF para imprimir ou compartilhar.', onClose: () => onClose() },
    h('label', { className: 'f' }, 'Tamanho do papel'),
    h('div', { className: 'chips' }, FORM.map(([k, t]) => h('button', { key: k, type: 'button', className: 'chip' + (c.formato === k ? ' on' : ''), onClick: () => setC(x => ({ ...x, formato: k })) }, t))),
    h('label', { className: 'f' }, 'Vias'),
    dupla ? h('div', { className: 'aviso a-azul', style: { marginTop: 4 } }, 'Uma folha A4 dividida por um pontilhado: em cima a via do cliente; embaixo a via da empresa, com "Declaro que recebi os itens deste pedido", nome, assinatura e data. Pedido com muitos itens sai em duas folhas.') : null,
    h('label', { style: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 } }, h('input', { type: 'checkbox', checked: via('cozinha'), onChange: () => togVia('cozinha') }), dupla ? 'Via da cozinha em outra folha (sem preços)' : 'Via da cozinha (sem preços, observações em destaque)'),
    !dupla && h('label', { style: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 } }, h('input', { type: 'checkbox', checked: via('cliente'), onChange: () => togVia('cliente') }), 'Via do cliente (com preços e pagamento)'),
    h('label', { style: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 } }, h('input', { type: 'checkbox', checked: !!c.imprimirAoFinalizar, onChange: e => setC(x => ({ ...x, imprimirAoFinalizar: e.target.checked })) }), 'Imprimir sozinho ao finalizar o pedido'),
    h('label', { className: 'f' }, 'Rodapé da via do cliente'),
    h('input', { value: c.rodape || '', onChange: e => setC(x => ({ ...x, rodape: e.target.value })), style: { width: '100%' }, maxLength: 120, 'aria-label': 'Rodapé' }),
    h('div', { className: 'muted', style: { marginTop: 8 } }, 'Logo, nome, telefone e endereço vêm dos Dados da Empresa. A via do cliente sempre traz "Não é documento fiscal".'),
    h('div', { style: { display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' } },
      h('button', { type: 'button', className: 'btn b-wh', onClick: teste }, 'Imprimir teste'),
      h('div', { style: { flex: 1 } }),
      h('button', { type: 'button', className: 'btn b-wh', onClick: () => onClose() }, 'Cancelar'),
      h('button', { type: 'button', className: 'btn b-or', onClick: salvar, disabled: salvando }, salvando ? 'Salvando...' : 'Salvar')));
}

// ====================== PDV ======================
const pedidoVazio = () => ({ itens: [], type: 'balcao', tableLabel: '', customerName: '', customerPhone: '', address: '', scheduledFor: '', discount: '', deliveryFee: '', paymentMethod: 'dinheiro', paid: true, cashReceived: '', notes: '' });
function totais(p) {
  const subtotal = r2(p.itens.reduce((t, l) => t + r2(l.price * l.quantity), 0));
  const desc = Math.max(0, parseNum(p.discount) || 0), taxa = p.type === 'delivery' ? Math.max(0, parseNum(p.deliveryFee) || 0) : 0;
  const total = Math.max(0, r2(subtotal - desc + taxa));
  const rec = parseNum(p.cashReceived);
  return { subtotal, desc: r2(desc), taxa: r2(taxa), total, troco: p.paymentMethod === 'dinheiro' && rec > 0 ? Math.max(0, r2(rec - total)) : null };
}
function Carrinho({ pedido, setPedido, finalizar, salvando, compacto }) {
  const t = totais(pedido);
  const set = (k, v) => setPedido(p => ({ ...p, [k]: v }));
  const setLinha = (i, patch) => setPedido(p => ({ ...p, itens: p.itens.map((l, j) => j === i ? { ...l, ...patch } : l).filter(l => l.quantity > 0) }));
  const [obsAberta, setObsAberta] = useState(null);
  const precisaNome = ['retirada', 'delivery', 'encomenda'].includes(pedido.type);
  return h('div', null,
    !pedido.itens.length ? h('div', { className: 'muted', style: { padding: '18px 0', textAlign: 'center' } }, 'Toque nos itens para montar o pedido.') :
    pedido.itens.map((l, i) => h('div', { key: l.key, className: 'linha' },
      h('div', { style: { minWidth: 0 } },
        h('div', { style: { fontWeight: 700 } }, l.name),
        h('div', { className: 'muted' }, brl(l.price) + (l.unit === 'kg' ? '/kg' : '') + ' · ' + brl(l.price * l.quantity)),
        obsAberta === i
          ? h('input', { autoFocus: true, value: l.notes || '', placeholder: 'Ex.: sem cebola', 'aria-label': 'Observação de ' + l.name, style: { width: '100%', marginTop: 4, padding: '6px 8px', fontSize: 14 }, onChange: e => setLinha(i, { notes: e.target.value }), onBlur: () => setObsAberta(null), onKeyDown: e => { if (e.key === 'Enter') setObsAberta(null); } })
          : h('button', { type: 'button', className: 'muted lnk', style: { background: 'none', border: 0, padding: 0, cursor: 'pointer', color: l.notes ? '#c2410c' : '#6b7280', fontWeight: l.notes ? 700 : 400, textAlign: 'left' }, onClick: () => setObsAberta(i) }, l.notes ? '» ' + l.notes : '+ observação')),
      l.unit === 'kg'
        ? h('input', { inputMode: 'decimal', value: l.qtdTexto != null ? l.qtdTexto : String(l.quantity).replace('.', ','), 'aria-label': 'Quilos de ' + l.name, style: { width: 70 }, onChange: e => { const v = parseNum(e.target.value); setPedido(p => ({ ...p, itens: p.itens.map((x, j) => j === i ? { ...x, qtdTexto: e.target.value, quantity: v > 0 ? v : x.quantity } : x) })); } })
        : h('div', { className: 'qtd' },
            h('button', { type: 'button', 'aria-label': 'Menos ' + l.name, onClick: () => setLinha(i, { quantity: l.quantity - 1 }) }, '−'),
            h('b', { style: { minWidth: 22, textAlign: 'center' } }, n2(l.quantity, 3)),
            h('button', { type: 'button', 'aria-label': 'Mais ' + l.name, onClick: () => setLinha(i, { quantity: l.quantity + 1 }) }, '+')),
      h('button', { type: 'button', className: 'x', style: { fontSize: 20 }, 'aria-label': 'Tirar ' + l.name, onClick: () => setPedido(p => ({ ...p, itens: p.itens.filter((_, j) => j !== i) })) }, '×'))),
    h('label', { className: 'f' }, 'Tipo'),
    h('div', { className: 'chips' }, TIPOS.map(([k, n]) => h('button', { key: k, type: 'button', className: 'chip' + (pedido.type === k ? ' on' : ''), onClick: () => set('type', k) }, n))),
    pedido.type === 'mesa' && h('input', { value: pedido.tableLabel, onChange: e => set('tableLabel', e.target.value), placeholder: 'Número da mesa', 'aria-label': 'Mesa', style: { width: '100%', marginTop: 8 } }),
    (precisaNome || pedido.type === 'balcao' || pedido.type === 'mesa') && h('div', { className: 'duas', style: { marginTop: 8 } },
      h('input', { value: pedido.customerName, onChange: e => set('customerName', e.target.value), placeholder: precisaNome ? 'Nome do cliente' : 'Nome (opcional)', 'aria-label': 'Nome do cliente' }),
      h('input', { value: pedido.customerPhone, onChange: e => set('customerPhone', e.target.value), placeholder: 'Telefone', inputMode: 'tel', 'aria-label': 'Telefone do cliente' })),
    pedido.type === 'delivery' && h('input', { value: pedido.address, onChange: e => set('address', e.target.value), placeholder: 'Endereço de entrega', 'aria-label': 'Endereço', style: { width: '100%', marginTop: 8 } }),
    pedido.type === 'encomenda' && h('div', null, h('label', { className: 'f' }, 'Para quando'), h('input', { type: 'datetime-local', value: pedido.scheduledFor, onChange: e => set('scheduledFor', e.target.value), 'aria-label': 'Data e hora da encomenda', style: { width: '100%' } })),
    h('div', { className: 'duas', style: { marginTop: 8 } },
      h('input', { value: pedido.discount, onChange: e => set('discount', e.target.value), placeholder: 'Desconto (R$)', inputMode: 'decimal', 'aria-label': 'Desconto' }),
      pedido.type === 'delivery' ? h('input', { value: pedido.deliveryFee, onChange: e => set('deliveryFee', e.target.value), placeholder: 'Taxa de entrega (R$)', inputMode: 'decimal', 'aria-label': 'Taxa de entrega' }) : h('span')),
    h('label', { className: 'f' }, 'Pagamento'),
    h('div', { className: 'chips' }, PAGS.map(([k, n]) => h('button', { key: k, type: 'button', className: 'chip' + (pedido.paymentMethod === k ? ' on' : ''), onClick: () => setPedido(p => ({ ...p, paymentMethod: k, paid: k === 'fiado' ? false : p.paid })) }, n))),
    pedido.paymentMethod === 'dinheiro' && h('div', { className: 'duas', style: { marginTop: 8, alignItems: 'center' } },
      h('input', { value: pedido.cashReceived, onChange: e => set('cashReceived', e.target.value), placeholder: 'Recebido (R$)', inputMode: 'decimal', 'aria-label': 'Valor recebido' }),
      h('div', { style: { fontWeight: 700 } }, t.troco != null ? 'Troco: ' + brl(t.troco) : '')),
    h('label', { style: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 } }, h('input', { type: 'checkbox', checked: !!pedido.paid, onChange: e => set('paid', e.target.checked) }), 'Já está pago'),
    h('input', { value: pedido.notes, onChange: e => set('notes', e.target.value), placeholder: 'Observação do pedido', 'aria-label': 'Observação do pedido', style: { width: '100%', marginTop: 8 } }),
    h('div', { style: { marginTop: 10 } },
      t.desc > 0 || t.taxa > 0 ? h('div', { className: 'muted' }, 'Subtotal ' + brl(t.subtotal) + (t.desc > 0 ? ' − desconto ' + brl(t.desc) : '') + (t.taxa > 0 ? ' + entrega ' + brl(t.taxa) : '')) : null,
      h('div', { className: 'total' }, h('span', null, 'Total'), h('span', null, brl(t.total)))),
    h('button', { type: 'button', className: 'btn b-or', style: { width: '100%', marginTop: 12, padding: '14px', fontSize: 16 }, disabled: salvando || !pedido.itens.length, onClick: finalizar },
      salvando ? 'Registrando...' : ((window.OrderPrint && window.OrderPrint.config().imprimirAoFinalizar) ? 'Finalizar e imprimir' : 'Finalizar pedido')),
    pedido.itens.length ? h('button', { type: 'button', className: 'btn b-wh', style: { width: '100%', marginTop: 8 }, onClick: () => { if (confirm('Limpar o pedido?')) setPedido(pedidoVazio()); } }, 'Limpar') : null);
}

function PDV({ itens, saldos, pedido, setPedido, onFeito, mostrarAviso }) {
  const [cat, setCat] = useState('Todos');
  const [busca, setBusca] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [avulso, setAvulso] = useState(null);
  const ativos = (itens || []).filter(i => i.isActive);
  const cats = ['Todos'].concat([...new Set(ativos.map(i => i.category || 'Outros'))]);
  const lista = ativos.filter(i => (cat === 'Todos' || (i.category || 'Outros') === cat) && (!busca || i.name.toLowerCase().includes(busca.toLowerCase())));
  const noCarrinho = id => pedido.itens.filter(l => l.saleItemId === id).reduce((t, l) => t + l.quantity, 0);
  const add = it => setPedido(p => {
    const i = p.itens.findIndex(l => l.saleItemId === it.id && !l.notes);
    if (i >= 0 && it.unit !== 'kg') return { ...p, itens: p.itens.map((l, j) => j === i ? { ...l, quantity: l.quantity + 1 } : l) };
    return { ...p, itens: p.itens.concat([{ key: Date.now() + Math.random(), saleItemId: it.id, name: it.name, price: it.price, unit: it.unit, quantity: 1, notes: '', unitCost: it.unitCost }]) };
  });
  const finalizar = async () => {
    const t = totais(pedido);
    if (!pedido.itens.length) return;
    if (['retirada', 'delivery', 'encomenda'].includes(pedido.type) && !pedido.customerName.trim()) return mostrarAviso('Informe o nome do cliente.', 'erro');
    if (pedido.type === 'encomenda' && !pedido.scheduledFor) return mostrarAviso('Informe a data da encomenda.', 'erro');
    // Item que bloqueia sem saldo
    const falta = pedido.itens.filter(l => { const it = l.saleItemId && ativos.find(x => x.id === l.saleItemId); return it && it.controlsStock && it.blockWithoutStock && pedido.type !== 'encomenda' && (saldos[it.id] || 0) < noCarrinho(it.id); });
    if (falta.length) return mostrarAviso('Sem saldo: ' + [...new Set(falta.map(l => l.name))].join(', ') + '.', 'erro');
    const body = {
      type: pedido.type, tableLabel: pedido.tableLabel || null, customerName: pedido.customerName || null, customerPhone: pedido.customerPhone || null,
      address: pedido.type === 'delivery' ? pedido.address || null : null,
      scheduledFor: pedido.type === 'encomenda' && pedido.scheduledFor ? new Date(pedido.scheduledFor).toISOString() : null,
      items: pedido.itens.map(l => ({ saleItemId: l.saleItemId || null, name: l.name, quantity: l.quantity, unitPrice: l.price, notes: l.notes || null })),
      discount: t.desc, deliveryFee: t.taxa, paymentMethod: pedido.paymentMethod, paid: !!pedido.paid,
      cashReceived: pedido.paymentMethod === 'dinheiro' && parseNum(pedido.cashReceived) > 0 ? parseNum(pedido.cashReceived) : null, notes: pedido.notes || null,
      clientId: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
    };
    const cfg = window.OrderPrint ? window.OrderPrint.config() : { imprimirAoFinalizar: false };
    setSalvando(true);
    try {
      const r = await enviar('/api/orders', body, 'Pedido de ' + brl(t.total));
      let paraImprimir = r;
      if (r && r.queued) {
        paraImprimir = { ...body, provisorio: 'P-' + body.clientId.slice(-4).toUpperCase(), createdAt: new Date().toISOString(), subtotal: t.subtotal, total: t.total,
          items: pedido.itens.map(l => ({ name: l.name, quantity: l.quantity, unitPrice: l.price, total: r2(l.price * l.quantity), notes: l.notes || null })) };
        mostrarAviso('Sem internet: pedido ' + paraImprimir.provisorio + ' guardado neste aparelho. Ele é enviado sozinho quando a conexão voltar.', 'info');
      } else mostrarAviso('Pedido ' + String(r.number).padStart(3, '0') + ' registrado: ' + brl(r.total) + (r.change ? ' · troco ' + brl(r.change) : '') + '.');
      setPedido(pedidoVazio()); setAberto(false);
      if (cfg.imprimirAoFinalizar && window.OrderPrint) window.OrderPrint.print(paraImprimir);
      onFeito && onFeito();
    } catch (e) { mostrarAviso(mensagemErro(e), 'erro'); }
    finally { setSalvando(false); }
  };
  const qtdItens = pedido.itens.reduce((t, l) => t + (l.unit === 'kg' ? 1 : l.quantity), 0);
  const carrinho = h(Carrinho, { pedido, setPedido, finalizar, salvando });
  return h('div', { className: 'pdv' },
    h('div', null,
      h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
        h('input', { value: busca, onChange: e => setBusca(e.target.value), placeholder: '🔍 Buscar item', 'aria-label': 'Buscar item', style: { flex: '1 1 180px' } }),
        h('button', { type: 'button', className: 'btn b-wh', onClick: () => setAvulso({ nome: '', preco: '' }) }, '+ Item avulso')),
      h('div', { className: 'chips', style: { marginTop: 10 } }, cats.map(c => h('button', { key: c, type: 'button', className: 'chip' + (cat === c ? ' on' : ''), onClick: () => setCat(c) }, c))),
      !ativos.length ? h('div', { className: 'aviso a-azul' }, 'Nada à venda ainda. Pratos: abra o prato na aba Pratos e marque "Vender este prato". Bebidas e revenda: "Itens à venda" → "+ Produto de revenda".') :
      h('div', { className: 'grade' }, lista.map(it => {
        const saldo = it.controlsStock ? (saldos[it.id] || 0) - noCarrinho(it.id) : null;
        const bloqueado = it.controlsStock && it.blockWithoutStock && saldo <= 0 && pedido.type !== 'encomenda';
        const qc = noCarrinho(it.id);
        return h('button', { key: it.id, type: 'button', className: 'prod' + (bloqueado ? ' off' : ''), disabled: bloqueado, onClick: () => add(it), 'aria-label': `${it.name}, ${brl(it.price)}` },
          h('div', { className: 'nome' }, it.name, qc ? h('span', { className: 'badge' }, n2(qc, 3)) : null),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' } },
            h('span', { className: 'preco' }, brl(it.price) + (it.unit === 'kg' ? '/kg' : '')),
            it.controlsStock ? h('span', { className: 'tag ' + (saldo <= 0 ? 't-neg' : saldo <= 3 ? 't-low' : 't-ok') }, saldo <= 0 ? (bloqueado ? 'esgotado' : 'sem saldo') : n2(saldo, 2) + (it.unit === 'kg' ? ' kg' : '')) : null));
      }))),
    h('div', { className: 'card carrinho' }, h('div', { style: { fontWeight: 800, fontSize: 17, marginBottom: 4 } }, '🧾 Pedido'), carrinho),
    h('div', { className: 'barra', role: 'button', tabIndex: 0, onClick: () => setAberto(true) }, h('span', null, qtdItens ? `Ver pedido (${n2(qtdItens, 0)})` : 'Pedido vazio'), h('span', null, brl(totais(pedido).total))),
    aberto && h(Modal, { titulo: '🧾 Pedido', onClose: () => setAberto(false) }, carrinho),
    avulso && h(Modal, { titulo: 'Item avulso', sub: 'Algo fora do cardápio (taxa, item do dia). Não mexe no estoque.', onClose: () => setAvulso(null) },
      h('label', { className: 'f' }, 'Descrição'), h('input', { value: avulso.nome, onChange: e => setAvulso(a => ({ ...a, nome: e.target.value })), style: { width: '100%' }, autoFocus: true, 'aria-label': 'Descrição' }),
      h('label', { className: 'f' }, 'Preço (R$)'), h('input', { value: avulso.preco, onChange: e => setAvulso(a => ({ ...a, preco: e.target.value })), inputMode: 'decimal', style: { width: '100%' }, 'aria-label': 'Preço' }),
      h('div', { style: { display: 'flex', gap: 8, marginTop: 14 } },
        h('button', { type: 'button', className: 'btn b-wh', style: { flex: 1 }, onClick: () => setAvulso(null) }, 'Cancelar'),
        h('button', { type: 'button', className: 'btn b-or', style: { flex: 2 }, onClick: () => { const p = parseNum(avulso.preco); if (!avulso.nome.trim() || !(p >= 0)) return alert('Informe a descrição e o preço.'); setPedido(x => ({ ...x, itens: x.itens.concat([{ key: Date.now(), saleItemId: null, name: avulso.nome.trim(), price: r2(p), unit: 'un', quantity: 1, notes: '' }]) })); setAvulso(null); } }, 'Adicionar'))));
}

// ====================== Pedidos ======================
function Pedidos({ fila, mostrarAviso, onMudou }) {
  const [dia, setDia] = useState(hojeISO());
  const [modo, setModo] = useState('dia'); // dia | encomendas
  const [filtro, setFiltro] = useState('abertos');
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');
  const carregar = () => {
    const url = modo === 'encomendas' ? '/api/orders?upcoming=1' : '/api/orders?date=' + dia;
    req(url).then(l => { setLista(l || []); setErro(''); lsSet('vnd_pedidos_' + (modo === 'encomendas' ? 'enc' : dia), l || []); })
      .catch(e => { const c = lsGet('vnd_pedidos_' + (modo === 'encomendas' ? 'enc' : dia), null); if (semInternet(e) && c) { setLista(c); setErro('Sem internet: mostrando a última lista guardada.'); } else setErro(mensagemErro(e)); });
  };
  useEffect(() => { setLista(null); carregar(); const t = setInterval(carregar, 30000); return () => clearInterval(t); }, [dia, modo]);
  useEffect(() => { carregar(); }, [fila.length]);
  const mudar = async (p, body, msg) => {
    try { await req('/api/orders/' + p.id, { method: 'PATCH', body: JSON.stringify(body) }); mostrarAviso(msg); carregar(); onMudou && onMudou(); }
    catch (e) { mostrarAviso(semInternet(e) ? 'Sem internet: mudar o pedido precisa de conexão.' : mensagemErro(e), 'erro'); }
  };
  const cancelar = async p => {
    if (!confirm(`Cancelar o pedido ${String(p.number).padStart(3, '0')}? O que saiu do estoque volta.`)) return;
    try { await req('/api/orders/' + p.id + '/cancel', { method: 'POST', body: '{}' }); mostrarAviso('Pedido cancelado.'); carregar(); onMudou && onMudou(); }
    catch (e) { mostrarAviso(semInternet(e) ? 'Sem internet: cancelar precisa de conexão.' : mensagemErro(e), 'erro'); }
  };
  const pendentes = fila.filter(f => /\/api\/orders$/.test(f.url));
  const vis = (lista || []).filter(p => filtro === 'todos' ? true : filtro === 'abertos' ? !['entregue', 'cancelado'].includes(p.status) : p.status === filtro);
  const abertos = (lista || []).filter(p => !['entregue', 'cancelado'].includes(p.status)).length;
  return h('div', null,
    h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
      h('div', { className: 'chips' },
        h('button', { type: 'button', className: 'chip' + (modo === 'dia' ? ' on' : ''), onClick: () => setModo('dia') }, 'Pedidos do dia'),
        h('button', { type: 'button', className: 'chip' + (modo === 'encomendas' ? ' on' : ''), onClick: () => setModo('encomendas') }, 'Encomendas')),
      modo === 'dia' && h('input', { type: 'date', value: dia, onChange: e => setDia(e.target.value || hojeISO()), 'aria-label': 'Dia' }),
      h('select', { value: filtro, onChange: e => setFiltro(e.target.value), 'aria-label': 'Filtro' },
        h('option', { value: 'abertos' }, `Em aberto (${abertos})`), h('option', { value: 'todos' }, 'Todos'),
        Object.keys(STATUS).map(k => h('option', { key: k, value: k }, STATUS[k][0])))),
    erro && h('div', { className: 'aviso a-azul' }, erro),
    pendentes.length ? h('div', { className: 'aviso a-azul' }, `📶 ${pendentes.length} pedido(s) feito(s) sem internet, esperando envio: ${pendentes.map(f => f.rotulo).join(', ')}.`) : null,
    !lista ? h('div', { className: 'muted', style: { marginTop: 14 } }, 'Carregando...') :
    !vis.length ? h('div', { className: 'muted', style: { marginTop: 14 } }, modo === 'encomendas' ? 'Nenhuma encomenda futura em aberto.' : 'Nenhum pedido aqui.') :
    vis.map(p => h('div', { key: p.id, className: 'pedido', 'data-pedido': p.number },
      h('div', { className: 'topo' },
        h('div', null,
          h('span', { className: 'n' }, String(p.number).padStart(3, '0')), ' ',
          h('span', { className: 'tag ' + STATUS[p.status][1], style: { verticalAlign: 4 } }, STATUS[p.status][0]), ' ',
          h('span', { className: 'tag t-roxo', style: { verticalAlign: 4 } }, (TIPOS.find(t => t[0] === p.type) || [0, p.type])[1] + (p.tableLabel ? ' ' + p.tableLabel : '')),
          h('div', { className: 'muted' }, hora(p.createdAt) + (p.scheduledFor ? ' · para ' + new Date(p.scheduledFor).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '') + (p.customerName ? ' · ' + p.customerName : '') + (p.customerPhone ? ' · ' + p.customerPhone : ''))),
        h('div', { style: { textAlign: 'right' } },
          h('div', { style: { fontWeight: 800, fontSize: 18 } }, brl(p.total)),
          h('div', { className: 'muted' }, (PAGS.find(x => x[0] === p.paymentMethod) || [0, 'sem forma'])[1] + ' · ' + (p.paid ? 'pago' : 'a receber')))),
      h('div', { style: { marginTop: 6, fontSize: 14 } }, p.items.map(i => n2(i.quantity, 3) + 'x ' + i.name + (i.notes ? ' (' + i.notes + ')' : '')).join(' · ')),
      p.address ? h('div', { className: 'muted' }, '📍 ' + p.address) : null,
      p.status !== 'cancelado' && h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 } },
        PROXIMO[p.status] && h('button', { type: 'button', className: 'btn b-dk b-sm', onClick: () => mudar(p, { status: PROXIMO[p.status] }, `Pedido ${String(p.number).padStart(3, '0')}: ${ACAO[PROXIMO[p.status]].toLowerCase()}.`) }, '→ ' + ACAO[PROXIMO[p.status]]),
        h('button', { type: 'button', className: 'btn b-wh b-sm', onClick: () => window.OrderPrint && window.OrderPrint.print(p) }, '🖨️ Imprimir'),
        !p.paid && h('button', { type: 'button', className: 'btn b-wh b-sm', onClick: () => mudar(p, { paid: true }, 'Pagamento registrado.') }, 'Marcar pago'),
        h('button', { type: 'button', className: 'btn b-red b-sm', onClick: () => cancelar(p) }, 'Cancelar')))));
}

// ====================== Cardápio de venda ======================
const metaCmv = () => Number(window.PricingRules && window.PricingRules.get().cmvTargetPct) || 30;
function margemTxt(it) {
  if (!(it.price > 0) || it.unitCost == null) return null;
  const cmv = it.unitCost / it.price * 100;
  return { cmv, txt: 'custo ' + brl(it.unitCost) + ' · CMV ' + n2(cmv, 0) + '%' };
}
function ProdutoDialog({ onClose }) {
  const [f, setF] = useState({ name: '', category: 'Bebidas', price: '', cost: '', unit: 'un', controlsStock: true, blockWithoutStock: false });
  const [salvando, setSalvando] = useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const salvar = async () => {
    const price = parseNum(f.price), cost = f.cost === '' ? null : parseNum(f.cost);
    if (!f.name.trim() || !(price >= 0)) return alert('Informe o nome e o preço.');
    setSalvando(true);
    try { await req('/api/menu-items', { method: 'POST', body: JSON.stringify({ items: [{ ...f, name: f.name.trim(), price, cost: cost >= 0 ? cost : null }] }) }); onClose(f.name.trim() + ' no cardápio de venda.'); }
    catch (e) { alert(mensagemErro(e)); setSalvando(false); }
  };
  return h(Modal, { titulo: 'Novo produto', sub: 'Produto de revenda (bebida, sobremesa comprada) ou item sem ficha técnica.', onClose: () => onClose() },
    h('label', { className: 'f' }, 'Nome'), h('input', { value: f.name, onChange: e => set('name', e.target.value), style: { width: '100%' }, autoFocus: true, 'aria-label': 'Nome' }),
    h('div', { className: 'duas' },
      h('div', null, h('label', { className: 'f' }, 'Categoria'), h('input', { value: f.category, onChange: e => set('category', e.target.value), style: { width: '100%' }, 'aria-label': 'Categoria' })),
      h('div', null, h('label', { className: 'f' }, 'Vendido por'), h('select', { value: f.unit, onChange: e => set('unit', e.target.value), style: { width: '100%' }, 'aria-label': 'Unidade' }, UNIDADES.map(([k, n]) => h('option', { key: k, value: k }, n))))),
    h('div', { className: 'duas' },
      h('div', null, h('label', { className: 'f' }, 'Preço de venda (R$)'), h('input', { value: f.price, onChange: e => set('price', e.target.value), inputMode: 'decimal', style: { width: '100%' }, 'aria-label': 'Preço' })),
      h('div', null, h('label', { className: 'f' }, 'Custo (R$, opcional)'), h('input', { value: f.cost, onChange: e => set('cost', e.target.value), inputMode: 'decimal', style: { width: '100%' }, 'aria-label': 'Custo' }))),
    h('label', { style: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 } }, h('input', { type: 'checkbox', checked: f.controlsStock, onChange: e => set('controlsStock', e.target.checked) }), 'Controlar estoque'),
    f.controlsStock && h('label', { style: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 } }, h('input', { type: 'checkbox', checked: f.blockWithoutStock, onChange: e => set('blockWithoutStock', e.target.checked) }), 'Não deixar vender sem saldo'),
    h('div', { style: { display: 'flex', gap: 8, marginTop: 16 } },
      h('button', { type: 'button', className: 'btn b-wh', style: { flex: 1 }, onClick: () => onClose() }, 'Cancelar'),
      h('button', { type: 'button', className: 'btn b-or', style: { flex: 2 }, disabled: salvando, onClick: salvar }, salvando ? 'Salvando...' : 'Salvar')));
}
function Cardapio({ itens, recarregar, mostrarAviso }) {
  const [dialogo, setDialogo] = useState(null);
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const salvar = async (it, patch) => {
    try { await req('/api/menu-items/' + it.id, { method: 'PUT', body: JSON.stringify(patch) }); recarregar(); }
    catch (e) { mostrarAviso(semInternet(e) ? 'Sem internet: o cardápio só muda com conexão.' : mensagemErro(e), 'erro'); }
  };
  const fechar = t => { setDialogo(null); if (t) mostrarAviso(t); recarregar(); };
  const lista = (itens || []).filter(i => mostrarInativos || i.isActive).slice().sort((a, b) => String(a.category).localeCompare(String(b.category), 'pt-BR') || a.name.localeCompare(b.name, 'pt-BR'));
  return h('div', null,
    h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
      h('button', { type: 'button', className: 'btn b-or', onClick: () => setDialogo('produto') }, '+ Produto de revenda'),
      h('label', { style: { display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto', fontSize: 14 } }, h('input', { type: 'checkbox', checked: mostrarInativos, onChange: e => setMostrarInativos(e.target.checked) }), 'Mostrar os tirados do cardápio')),
    h('div', { className: 'aviso a-azul' }, '🍽️ Para vender um prato, abra o prato na aba Pratos e marque "Vender este prato" (preço, categoria e estoque ficam lá). Aqui entram os produtos de revenda, como bebidas, e você ajusta preço e estoque de tudo que está à venda.'),
    !lista.length ? null :
    h('div', { style: { overflowX: 'auto', marginTop: 10 } }, h('table', null,
      h('thead', null, h('tr', null, h('th', null, 'Item'), h('th', null, 'Preço'), h('th', null, 'Estoque'), h('th', null, ''))),
      h('tbody', null, lista.map(it => {
        const m = margemTxt(it);
        return h('tr', { key: it.id, style: { opacity: it.isActive ? 1 : .5 } },
          h('td', null,
            h('input', { key: 'n' + it.id + it.name, defaultValue: it.name, 'aria-label': 'Nome', style: { width: '100%', maxWidth: 260, fontWeight: 600 }, onBlur: e => { const v = e.target.value.trim(); if (v && v !== it.name) salvar(it, { name: v }); } }),
            h('div', { style: { display: 'flex', gap: 6, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' } },
              h('input', { key: 'c' + it.id + it.category, defaultValue: it.category, 'aria-label': 'Categoria', style: { width: 120, padding: '4px 8px', fontSize: 13 }, onBlur: e => { const v = e.target.value.trim(); if (v !== it.category) salvar(it, { category: v }); } }),
              h('span', { className: 'muted', style: { fontSize: 12 } }, it.dishId ? 'prato (ficha técnica)' : 'revenda'),
              m ? h('span', { className: 'tag ' + (m.cmv <= metaCmv() ? 't-ok' : m.cmv <= metaCmv() + 5 ? 't-low' : 't-neg') }, m.txt) : null)),
          h('td', null,
            h('input', { key: 'p' + it.id + it.price, defaultValue: String(it.price).replace('.', ','), inputMode: 'decimal', 'aria-label': 'Preço de ' + it.name, style: { width: 80 }, onBlur: e => { const v = parseNum(e.target.value); if (v >= 0 && v !== it.price) salvar(it, { price: v }); } }),
            h('select', { value: it.unit, 'aria-label': 'Unidade', style: { marginLeft: 4, padding: '6px' }, onChange: e => salvar(it, { unit: e.target.value }) }, UNIDADES.map(([k, n]) => h('option', { key: k, value: k }, n))),
            !it.dishId && h('div', { style: { marginTop: 4 } }, h('input', { key: 'k' + it.id + it.cost, defaultValue: it.cost != null ? String(it.cost).replace('.', ',') : '', placeholder: 'custo', inputMode: 'decimal', 'aria-label': 'Custo de ' + it.name, style: { width: 80, padding: '4px 8px', fontSize: 13 }, onBlur: e => { const v = e.target.value === '' ? null : parseNum(e.target.value); if ((v == null || v >= 0) && v !== it.cost) salvar(it, { cost: v }); } }))),
          h('td', null,
            h('label', { style: { display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 } }, h('input', { type: 'checkbox', checked: it.controlsStock, onChange: e => salvar(it, { controlsStock: e.target.checked }) }), 'controla'),
            it.controlsStock && h('label', { style: { display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, marginTop: 4 } }, h('input', { type: 'checkbox', checked: it.blockWithoutStock, onChange: e => salvar(it, { blockWithoutStock: e.target.checked }) }), 'bloqueia sem saldo')),
          h('td', null, it.isActive
            ? h('button', { type: 'button', className: 'btn b-red b-sm', onClick: () => { if (confirm(`Tirar ${it.name} do cardápio de venda? Os pedidos antigos continuam.`)) salvar(it, { isActive: false }); } }, 'Tirar')
            : h('button', { type: 'button', className: 'btn b-wh b-sm', onClick: () => salvar(it, { isActive: true }) }, 'Voltar')));
      })))),
    dialogo === 'produto' && h(ProdutoDialog, { onClose: fechar }));
}

// ====================== Prontos (estoque de prontos) ======================
function LancarDialog({ tipo, itens, saldos, inicial, onClose }) {
  const NOMES = { producao: ['Produzi / chegou', 'O que ficou pronto (ou a revenda que chegou). A validade é opcional e avisa antes de vencer.', 'Quantidade'], perda: ['Perda', 'Venceu, estragou, não vendeu: sai do estoque (primeiro o que vence antes).', 'Quantidade perdida'], ajuste: ['Inventário', 'Conte o que tem: o saldo passa a ser o contado. Só os itens preenchidos mudam.', 'Contei'] };
  const controlados = itens.filter(i => i.isActive && i.controlsStock);
  const [q, setQ] = useState(() => inicial || {});
  const [val, setVal] = useState({});
  const [custo, setCusto] = useState({});
  const [salvando, setSalvando] = useState(false);
  const salvar = async () => {
    const linhas = controlados.filter(i => String(q[i.id] || '').trim() !== '').map(i => ({ it: i, v: parseNum(q[i.id]) }));
    if (!linhas.length) return alert('Preencha ao menos um item.');
    if (linhas.some(l => !(tipo === 'ajuste' ? l.v >= 0 : l.v > 0))) return alert('Há quantidade inválida.');
    setSalvando(true);
    try {
      const grupos = tipo === 'producao' ? [['producao', linhas.filter(l => l.it.dishId)], ['entrada', linhas.filter(l => !l.it.dishId)]] : [[tipo, linhas]];
      let fila = false;
      for (const [t, ls] of grupos) {
        if (!ls.length) continue;
        const r = await enviar('/api/stock/movements', { type: t, note: t === 'ajuste' ? 'Inventário de prontos' : null, items: ls.map(l => ({ saleItemId: l.it.id, quantity: l.v,
          expiresAt: t !== 'perda' && t !== 'ajuste' ? (val[l.it.id] || null) : null,
          unitCost: t === 'entrada' && custo[l.it.id] ? (parseNum(custo[l.it.id]) || null) : (t === 'producao' && l.it.unitCost != null ? l.it.unitCost : null) })) }, NOMES[tipo][0] + ' (' + ls.length + ' itens)');
        if (r && r.queued) fila = true;
      }
      onClose(fila ? 'Sem internet: lançamento guardado neste aparelho, enviado sozinho quando a conexão voltar.' : NOMES[tipo][0] + ' registrado.');
    } catch (e) { alert(mensagemErro(e)); setSalvando(false); }
  };
  return h(Modal, { titulo: NOMES[tipo][0], sub: NOMES[tipo][1], onClose: () => onClose() },
    !controlados.length ? h('div', { className: 'aviso a-azul' }, 'Nenhum item controla estoque. Marque "Controlar estoque de prontos" no prato (aba Pratos) ou "controla" em Itens à venda.') :
    h('div', { style: { overflowX: 'auto' } }, h('table', null,
      h('thead', null, h('tr', null, h('th', null, 'Item'), h('th', null, 'Saldo'), h('th', null, NOMES[tipo][2]), tipo === 'producao' ? h('th', null, 'Validade') : null)),
      h('tbody', null, controlados.map(i => h('tr', { key: i.id },
        h('td', null, i.name, h('div', { className: 'muted', style: { fontSize: 11 } }, i.category)),
        h('td', null, n2(saldos[i.id] || 0, 3)),
        h('td', null, h('input', { value: q[i.id] || '', inputMode: 'decimal', placeholder: '—', 'aria-label': NOMES[tipo][2] + ' ' + i.name, style: { width: 72 }, onChange: e => setQ(x => ({ ...x, [i.id]: e.target.value })) }),
          tipo === 'producao' && !i.dishId ? h('input', { value: custo[i.id] || '', inputMode: 'decimal', placeholder: 'custo un.', 'aria-label': 'Custo de ' + i.name, style: { width: 72, marginLeft: 4 }, onChange: e => setCusto(x => ({ ...x, [i.id]: e.target.value })) }) : null),
        tipo === 'producao' ? h('td', null, h('input', { type: 'date', value: val[i.id] || '', 'aria-label': 'Validade de ' + i.name, onChange: e => setVal(x => ({ ...x, [i.id]: e.target.value })) })) : null))))),
    h('div', { style: { display: 'flex', gap: 8, marginTop: 14 } },
      h('button', { type: 'button', className: 'btn b-wh', style: { flex: 1 }, onClick: () => onClose() }, 'Cancelar'),
      h('button', { type: 'button', className: 'btn b-or', style: { flex: 2 }, disabled: salvando || !controlados.length, onClick: salvar }, salvando ? 'Salvando...' : 'Registrar')));
}
function Prontos({ itens, saldos, recarregar, mostrarAviso }) {
  const [dialogo, setDialogo] = useState(null);
  const [plano, setPlano] = useState(null);
  const [dias, setDias] = useState(7);
  useEffect(() => { req('/api/orders/production?days=' + dias).then(setPlano).catch(() => setPlano([])); }, [dias, itens]);
  const controlados = (itens || []).filter(i => i.isActive && i.controlsStock);
  const fechar = t => { setDialogo(null); if (t) mostrarAviso(t, /Sem internet/.test(t) ? 'info' : 'ok'); recarregar(); };
  const salvarMin = async (it, v) => {
    const n = parseNum(v); if (!(n >= 0)) return;
    try { await req('/api/stock/sale/' + it.id, { method: 'PUT', body: JSON.stringify({ minQuantity: n }) }); recarregar(); }
    catch (e) { mostrarAviso(semInternet(e) ? 'Sem internet: o mínimo só muda com conexão.' : mensagemErro(e), 'erro'); }
  };
  const venc = [];
  controlados.forEach(i => ((i.stock && i.stock.lots) || []).forEach(l => { if (l.expiresAt && diasAte(l.expiresAt) <= 1) venc.push({ i, l, d: diasAte(l.expiresAt) }); }));
  const perdaLote = async v => {
    if (!confirm(`Lançar ${n2(v.l.quantity, 3)} de ${v.i.name} (validade ${fmtData(v.l.expiresAt)}) como perda?`)) return;
    try { const r = await enviar('/api/stock/movements', { type: 'perda', note: 'Vencido (validade ' + fmtData(v.l.expiresAt) + ')', items: [{ saleItemId: v.i.id, quantity: v.l.quantity, lotId: v.l.id }] }, 'Perda · ' + v.i.name); fechar(r && r.queued ? 'Sem internet: perda guardada, enviada quando a conexão voltar.' : 'Perda registrada.'); }
    catch (e) { mostrarAviso(mensagemErro(e), 'erro'); }
  };
  const sugestao = {}; (plano || []).forEach(p => { if (p.produce > 0) sugestao[p.saleItemId] = String(p.produce).replace('.', ','); });
  return h('div', null,
    h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
      h('button', { type: 'button', className: 'btn b-gr', onClick: () => setDialogo({ t: 'producao' }) }, '🍲 Produzi / chegou'),
      h('button', { type: 'button', className: 'btn b-wh', onClick: () => setDialogo({ t: 'perda' }) }, 'Perda'),
      h('button', { type: 'button', className: 'btn b-wh', onClick: () => setDialogo({ t: 'ajuste' }) }, '📋 Inventário')),
    venc.length ? h('div', { className: 'aviso a-ver' }, h('b', null, '⏰ Validade'), venc.map(v => h('div', { key: v.l.id, style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 } },
      h('span', null, `${v.i.name}: ${n2(v.l.quantity, 3)} ${v.d < 0 ? 'venceu em ' + fmtData(v.l.expiresAt) : v.d === 0 ? 'vence hoje' : 'vence amanhã'}`),
      v.d < 0 ? h('button', { type: 'button', className: 'btn b-red b-sm', onClick: () => perdaLote(v) }, 'Lançar como perda') : null))) : null,
    !controlados.length ? h('div', { className: 'aviso a-azul' }, 'Nenhum item controla estoque. No prato (aba Pratos), marque "Controlar estoque de prontos" (marmitas, congelados); nas bebidas, marque "controla" em Itens à venda.') :
    h('div', { style: { overflowX: 'auto', marginTop: 12 } }, h('table', null,
      h('thead', null, h('tr', null, h('th', null, 'Item'), h('th', null, 'Saldo'), h('th', null, 'Mínimo'), h('th', null, 'Validade'))),
      h('tbody', null, controlados.map(i => {
        const s = saldos[i.id] || 0, min = i.stock ? i.stock.minQuantity : 0, lots = (i.stock && i.stock.lots) || [];
        return h('tr', { key: i.id },
          h('td', null, h('b', null, i.name), h('div', { className: 'muted', style: { fontSize: 11 } }, i.category, i.blockWithoutStock ? ' · bloqueia sem saldo' : '')),
          h('td', null, h('span', { className: 'tag ' + (s <= 0 ? 't-neg' : min > 0 && s < min ? 't-low' : 't-ok') }, n2(s, 3) + (i.unit === 'kg' ? ' kg' : ''))),
          h('td', null, h('input', { key: i.id + ':' + min, defaultValue: min ? String(min).replace('.', ',') : '', placeholder: '0', inputMode: 'decimal', 'aria-label': 'Mínimo de ' + i.name, style: { width: 64 }, onBlur: e => { if (parseNum(e.target.value || '0') !== min) salvarMin(i, e.target.value || '0'); } })),
          h('td', null, lots.length ? lots.slice(0, 2).map(l => h('div', { key: l.id, className: 'muted', style: { color: diasAte(l.expiresAt) < 0 ? '#b91c1c' : undefined } }, n2(l.quantity, 3) + ' até ' + fmtData(l.expiresAt))) : h('span', { className: 'muted' }, '—')));
      })))),
    h('div', { className: 'card', style: { marginTop: 12, boxShadow: 'none', border: '1px solid #e5e7eb' } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
        h('b', null, '🧮 Produção sugerida'),
        h('div', { className: 'chips' }, [1, 3, 7, 15].map(d => h('button', { key: d, type: 'button', className: 'chip' + (dias === d ? ' on' : ''), onClick: () => setDias(d) }, d === 1 ? 'amanhã' : d + ' dias')))),
      h('div', { className: 'muted', style: { marginTop: 4 } }, 'Encomendas do período + estoque mínimo − saldo.'),
      !plano ? h('div', { className: 'muted', style: { marginTop: 8 } }, 'Calculando...') : !plano.length ? h('div', { className: 'muted', style: { marginTop: 8 } }, 'Nada a produzir: o saldo cobre as encomendas e o mínimo.') :
      h('div', null, h('table', { style: { marginTop: 8 } },
        h('thead', null, h('tr', null, h('th', null, 'Item'), h('th', null, 'Encomendas'), h('th', null, 'Saldo'), h('th', null, 'Mínimo'), h('th', null, 'Produzir'))),
        h('tbody', null, plano.map(p => h('tr', { key: p.saleItemId }, h('td', null, p.name), h('td', null, n2(p.orders, 3)), h('td', { style: { color: p.stock < 0 ? '#b91c1c' : undefined } }, n2(p.stock, 3)), h('td', null, n2(p.minimum, 3)), h('td', { style: { fontWeight: 800 } }, n2(p.produce, 3)))))),
        Object.keys(sugestao).length ? h('button', { type: 'button', className: 'btn b-gr b-sm', style: { marginTop: 8 }, onClick: () => setDialogo({ t: 'producao', inicial: sugestao }) }, 'Produzi isso: lançar') : null)),
    dialogo && h(LancarDialog, { tipo: dialogo.t, itens: itens || [], saldos, inicial: dialogo.inicial, onClose: fechar }));
}

// ====================== Resumo ======================
function Resumo() {
  const [per, setPer] = useState('hoje');
  const [r, setR] = useState(null);
  const [erro, setErro] = useState('');
  const hoje = hojeISO();
  const PER = { hoje: ['Hoje', hoje, hoje], ontem: ['Ontem', somaDias(hoje, -1), somaDias(hoje, -1)], d7: ['7 dias', somaDias(hoje, -6), hoje], mes: ['Este mês', hoje.slice(0, 8) + '01', hoje] };
  useEffect(() => { setR(null); setErro(''); const [, de, ate] = PER[per]; req(`/api/orders/report?from=${de}&to=${ate}`).then(setR).catch(e => setErro(mensagemErro(e))); }, [per]);
  const margem = r && r.total > 0 ? r.grossProfit / r.total * 100 : 0;
  return h('div', null,
    h('div', { className: 'chips' }, Object.keys(PER).map(k => h('button', { key: k, type: 'button', className: 'chip' + (per === k ? ' on' : ''), onClick: () => setPer(k) }, PER[k][0]))),
    erro ? h('div', { className: 'aviso a-ver' }, erro) : !r ? h('div', { className: 'muted', style: { marginTop: 12 } }, 'Calculando...') :
    h('div', null,
      h('div', { className: 'stat', style: { marginTop: 12 } },
        h('div', null, h('span', { className: 'muted' }, 'Vendas'), h('b', null, brl(r.total))),
        h('div', null, h('span', { className: 'muted' }, 'Pedidos'), h('b', null, r.orders), r.canceled ? h('span', { className: 'muted' }, r.canceled + ' cancelado(s)') : null),
        h('div', null, h('span', { className: 'muted' }, 'Ticket médio'), h('b', null, brl(r.averageTicket))),
        h('div', null, h('span', { className: 'muted' }, 'Lucro bruto'), h('b', null, brl(r.grossProfit)), h('span', { className: 'muted' }, n2(margem, 1) + '% · vendas − custo dos itens')),
        h('div', null, h('span', { className: 'muted' }, 'A receber'), h('b', { style: { color: r.unpaid > 0 ? '#b45309' : undefined } }, brl(r.unpaid)))),
      h('h4', { style: { margin: '18px 0 6px', fontWeight: 800 } }, 'Por forma de pagamento'),
      h('table', null, h('thead', null, h('tr', null, h('th', null, 'Forma'), h('th', null, 'Pedidos'), h('th', null, 'Total'), h('th', null, 'A receber'))),
        h('tbody', null, Object.entries(r.byPayment).map(([k, v]) => h('tr', { key: k }, h('td', null, (PAGS.find(p => p[0] === k) || [0, k === 'sem' ? 'Sem forma' : k])[1]), h('td', null, v.pedidos), h('td', null, brl(v.total)), h('td', null, v.aReceber ? brl(v.aReceber) : '—'))))),
      h('h4', { style: { margin: '18px 0 6px', fontWeight: 800 } }, 'Por item'),
      !r.byItem.length ? h('div', { className: 'muted' }, 'Nenhuma venda no período.') :
      h('div', { style: { overflowX: 'auto' } }, h('table', null, h('thead', null, h('tr', null, h('th', null, 'Item'), h('th', null, 'Qtd.'), h('th', null, 'Vendas'), h('th', null, 'Custo'), h('th', null, 'Lucro'))),
        h('tbody', null, r.byItem.map((i, k) => h('tr', { key: k }, h('td', null, i.name), h('td', null, n2(i.quantity, 3)), h('td', null, brl(i.total)), h('td', null, i.semCusto && !i.cost ? '—' : brl(i.cost)), h('td', { style: { fontWeight: 700 } }, i.semCusto && !i.cost ? '—' : brl(i.total - i.cost)))))))));
}

// ====================== Página ======================
const ABAS = [['vender', '🛒 Vender'], ['pedidos', '🧾 Pedidos'], ['cardapio', '📖 Itens à venda'], ['prontos', '📦 Estoque'], ['resumo', '📊 Resumo']];
function VendasPage() {
  injectCss();
  const premium = temPremium();
  const [aba, setAbaS] = useState(() => { try { return localStorage.getItem('vnd_aba') || 'vender'; } catch (e) { return 'vender'; } });
  const setAba = a => { setAbaS(a); try { localStorage.setItem('vnd_aba', a); } catch (e) {} };
  const { itens, erro, carregar } = useCardapio(premium);
  const fila = useFila();
  const [pedido, setPedido] = useState(pedidoVazio());
  const [aviso, mostrarAviso] = useAviso();
  const [impressao, setImpressao] = useState(false);
  const [nFila, setNFila] = useState(fila.length);
  useEffect(() => { if (nFila > 0 && fila.length < nFila) carregar(); setNFila(fila.length); }, [fila.length]);
  const saldos = useMemo(() => saldosComFila(itens, fila), [itens, fila]);
  const falhas = useMemo(() => lsGet('stk_falhas_v1', []), [fila]);
  if (!premium) return h('div', { className: 'vnd card' }, h('h2', { style: { fontSize: 20, fontWeight: 800 } }, '🧾 Vendas'), h('p', { className: 'muted' }, 'A venda de pratos (PDV, pedidos, impressão e estoque de prontos) é do plano PREMIUM.'));
  return h('div', { className: 'vnd' },
    h('div', { className: 'card' },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 } },
        h('div', null, h('h2', { style: { fontSize: 22, fontWeight: 800, margin: 0 } }, '🧾 Vendas'),
          h('div', { className: 'muted' }, 'Venda no balcão, pedidos, encomendas e o estoque dos pratos prontos.')),
        h('button', { type: 'button', className: 'btn b-wh', onClick: () => setImpressao(true) }, '🖨️ Impressão')),
      h('div', { className: 'abas', role: 'tablist' }, ABAS.map(([k, n]) => h('button', { key: k, type: 'button', role: 'tab', 'aria-selected': aba === k, className: 'aba' + (aba === k ? ' on' : ''), onClick: () => setAba(k) }, n))),
      erro && h('div', { className: 'aviso a-ver' }, erro),
      h(Aviso, { aviso }),
      fila.length && aba !== 'pedidos' ? h('div', { className: 'aviso a-azul', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
        h('span', null, `📶 ${fila.length} lançamento(s) esperando internet. O envio é automático.`),
        h('button', { type: 'button', className: 'btn b-wh b-sm', onClick: () => SU() && SU().sincronizar && SU().sincronizar() }, 'Enviar agora')) : null,
      falhas.length ? h('div', { className: 'aviso a-ver' },
        h('div', { style: { fontWeight: 700 } }, 'Não deu para enviar (o servidor recusou):'),
        falhas.map((x, i) => h('div', { key: i }, '• ' + x.rotulo + ': ' + x.msg)),
        h('button', { type: 'button', className: 'btn b-wh b-sm', style: { marginTop: 6 }, onClick: () => { lsSet('stk_falhas_v1', []); try { window.dispatchEvent(new CustomEvent('stk-fila')); } catch (e) {} } }, 'Entendi')) : null,
      h('div', { style: { marginTop: 12 } },
        aba === 'vender' && h(PDV, { itens, saldos, pedido, setPedido, onFeito: carregar, mostrarAviso }),
        aba === 'pedidos' && h(Pedidos, { fila, mostrarAviso, onMudou: carregar }),
        aba === 'cardapio' && h(Cardapio, { itens, recarregar: carregar, mostrarAviso }),
        aba === 'prontos' && h(Prontos, { itens, saldos, recarregar: carregar, mostrarAviso }),
        aba === 'resumo' && h(Resumo, null))),
    impressao && h(ImpressaoDialog, { onClose: t => { setImpressao(false); if (t) mostrarAviso(t); } }));
}

/** Estoque dos pratos prontos e da revenda, também na aba Estoque (StockPage → "Pratos prontos e revenda") */
function VendasProntos() {
  injectCss();
  const premium = temPremium();
  const { itens, erro, carregar } = useCardapio(premium);
  const fila = useFila();
  const [aviso, mostrarAviso] = useAviso();
  const saldos = useMemo(() => saldosComFila(itens, fila), [itens, fila]);
  if (!premium) return null;
  return h('div', { className: 'vnd' }, h('div', { className: 'card' },
    h('h2', { style: { fontSize: 22, fontWeight: 800, margin: 0 } }, '🍲 Estoque dos pratos prontos e revenda'),
    h('div', { className: 'muted' }, 'Pratos com "Vender este prato" e "Controlar estoque de prontos" marcados (no próprio prato) e produtos de revenda. A venda dá baixa sozinha.'),
    erro && h('div', { className: 'aviso a-ver' }, erro),
    h(Aviso, { aviso }),
    h('div', { style: { marginTop: 12 } }, h(Prontos, { itens, saldos, recarregar: carregar, mostrarAviso }))));
}

window.VendasPage = VendasPage;
window.VendasProntos = VendasProntos;
window.VendasUtils = { totais, saldosComFila, pedidoVazio };
})();
