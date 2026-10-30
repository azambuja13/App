(function () {
'use strict';
/**
 * OrderPrint (Vendas, out/2026) — impressão do pedido em qualquer impressora.
 * Formatos: '80' e '58' (térmica, mm), 'a4' e 'a5' (folha comum) e 'a4dupla' (padrão): uma folha A4 com a via do
 * cliente em cima e a via da empresa (comprovante de entrega, com assinatura) embaixo, separadas por um pontilhado.
 * Vias: 'cozinha' (número grande, itens e observações, sem preço) e 'cliente' (empresa, preços, pagamento,
 * "Não é documento fiscal"). Cada via numa página: na térmica, o corte fica entre elas.
 * Navegador: janela de impressão (ShareFile.printHtml). App do iPhone: PDF para compartilhar ou imprimir.
 *
 * OrderPrint.html(pedido, { formato, vias, empresa }) → HTML completo
 * OrderPrint.print(pedido, { formato, vias, empresa })
 * OrderPrint.config() / OrderPrint.saveConfig(parcial)   (formato, vias, imprimir ao finalizar, rodapé)
 * Formato 'escpos' (impressão direta na térmica pela USB, sem janela; utils/escpos.js): só no Chrome/Edge do computador.
 * Sem suporte (Safari, iPhone) ou com erro, imprime como térmica 80/58 mm pela janela de impressão.
 */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const qtd = v => { const n = Number(v) || 0; return Number.isInteger(n) ? String(n) : n.toLocaleString('pt-BR', { maximumFractionDigits: 3 }); };
const TIPO = { balcao: 'Balcão', mesa: 'Mesa', retirada: 'Retirada', delivery: 'Delivery', encomenda: 'Encomenda' };
const PAG = { dinheiro: 'Dinheiro', pix: 'PIX', credito: 'Cartão de crédito', debito: 'Cartão de débito', fiado: 'Fiado (a receber)', outro: 'Outro' };
const LS = 'vnd_impressao_v1';
const PADRAO = { formato: 'a4dupla', vias: ['cliente'], imprimirAoFinalizar: true, rodape: 'Obrigado pela preferência!' };
const ESCPOS = { transporte: 'serial', colunas: 48, baud: 9600, cortar: true, codepage: 2 };
// v2 (29/10/2026): o padrão passou a ser A4 com 2 vias. Configuração salva antes disso (sem v: 2) volta para o novo padrão
// de papel e vias, mantendo rodapé e "imprimir ao finalizar".
const VERSAO = 2;

function config() {
  let s = null;
  try { s = window.userSettings && window.userSettings.salesPrint; } catch (e) {}
  if (!s) { try { s = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) {} }
  if (s && s.v !== VERSAO) s = { imprimirAoFinalizar: s.imprimirAoFinalizar, rodape: s.rodape };
  const c = { ...PADRAO, ...(s || {}), v: VERSAO };
  if (!['a4dupla', '80', '58', 'a4', 'a5', 'escpos'].includes(c.formato)) c.formato = PADRAO.formato;
  c.escpos = { ...ESCPOS, ...((s && s.escpos) || {}) };
  if (!Array.isArray(c.vias) || (!c.vias.length && c.formato !== 'a4dupla')) c.vias = PADRAO.vias.slice();
  return c;
}
async function saveConfig(parcial) {
  const novo = { ...config(), ...parcial };
  try { localStorage.setItem(LS, JSON.stringify(novo)); } catch (e) {}
  try { window.userSettings = { ...(window.userSettings || {}), salesPrint: novo }; } catch (e) {}
  const api = window.PrecificacaoAPI && window.PrecificacaoAPI.api;
  if (api && typeof api.request === 'function') {
    try { await api.request('/api/user-settings', { method: 'PATCH', body: JSON.stringify({ partialSettings: { salesPrint: novo } }) }); } catch (e) { /* fica neste aparelho */ }
  }
  return novo;
}
function empresaAtual() {
  const p = (window.eventState && window.eventState.proposalData) || {};
  return { nome: p.companyName || '', telefone: p.companyPhone || '', endereco: p.companyAddress || '', logo: p.companyLogo || null };
}

function css(formato) {
  const termica = formato === '80' || formato === '58';
  const larg = formato === '58' ? '48mm' : '72mm';
  // Térmica: sem "size" (o rolo não tem altura fixa; o driver usa o papel configurado). Folha: A4/A5.
  const pagina = termica ? null : formato === 'a5' ? 'A5' : 'A4';
  const base = termica ? (formato === '58' ? 11 : 12.5) : 13;
  return `@page{${pagina ? 'size:' + pagina + ';' : ''}margin:${termica ? '2mm 3mm' : '12mm'}}
*{box-sizing:border-box}html,body{margin:0;padding:0}
body{font-family:'Helvetica Neue',Arial,sans-serif;color:#000;font-size:${base}px;line-height:1.3;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.via{width:${termica ? larg : '100%'};${termica ? '' : 'max-width:150mm;'}margin:0 auto;page-break-after:always;break-after:page}
.via:last-child{page-break-after:auto;break-after:auto}
.c{text-align:center}.b{font-weight:700}.m{font-size:${base - 1.5}px}
.num{font-size:${termica ? (formato === '58' ? 30 : 38) : 42}px;font-weight:800;line-height:1;margin:2px 0 4px}
.tipo{font-size:${base + 3}px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}
hr{border:0;border-top:1px dashed #000;margin:6px 0}
table{width:100%;border-collapse:collapse;font-size:inherit}td{vertical-align:top;padding:2px 0}
td.q{width:${termica ? '2.4em' : '3em'};font-weight:700}td.v{text-align:right;white-space:nowrap;padding-left:6px}
.obs{font-size:${base + 1}px;font-weight:700;padding-left:${termica ? '2.4em' : '3em'}}
.coz td{font-size:${base + 3}px}.coz .obs{font-size:${base + 2}px}
.tot td{padding:1px 0}.tot .grande td{font-size:${base + 3}px;font-weight:800}
.logo{max-height:${termica ? '18mm' : '22mm'};max-width:60%;display:block;margin:0 auto 4px;${termica ? 'filter:grayscale(1)' : ''}}
.fiscal{font-size:${base - 1}px;text-align:center;margin-top:6px}`;
}

function linhaData(p) {
  const d = new Date(p.createdAt || Date.now());
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function cabecalhoPedido(p) {
  const tipo = TIPO[p.type] || 'Pedido';
  const extra = p.type === 'mesa' && p.tableLabel ? ' ' + esc(p.tableLabel) : '';
  const numero = p.number ? String(p.number).padStart(3, '0') : (p.provisorio || '—');
  return `<div class="c"><div class="tipo">${esc(tipo)}${extra}</div><div class="num">${esc(numero)}</div>
    <div class="m">${esc(linhaData(p))}${p.provisorio ? ' · sem internet' : ''}</div>
    ${p.scheduledFor ? `<div class="b">Para: ${esc(new Date(p.scheduledFor).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }))} ${esc(new Date(p.scheduledFor).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))}</div>` : ''}</div>`;
}
function cliente(p) {
  const l = [];
  if (p.customerName) l.push(`<div class="b">${esc(p.customerName)}</div>`);
  if (p.customerPhone) l.push(`<div>${esc(p.customerPhone)}</div>`);
  if (p.address) l.push(`<div>${esc(p.address)}</div>`);
  return l.length ? '<hr>' + l.join('') : '';
}
function viaCozinha(p) {
  const itens = (p.items || []).map(i => `<tr><td class="q">${esc(qtd(i.quantity))}x</td><td>${esc(i.name)}</td></tr>` + (i.notes ? `<tr><td colspan="2" class="obs">» ${esc(i.notes)}</td></tr>` : '')).join('');
  return `<div class="via"><div class="c b">VIA DA COZINHA</div><hr>${cabecalhoPedido(p)}${cliente(p)}<hr>
    <table class="coz">${itens}</table>${p.notes ? `<hr><div class="b">Obs.: ${esc(p.notes)}</div>` : ''}<hr></div>`;
}
function viaCliente(p, emp, rodape) {
  const itens = (p.items || []).map(i => `<tr><td class="q">${esc(qtd(i.quantity))}x</td><td>${esc(i.name)}${Number(i.quantity) !== 1 ? `<div class="m">${esc(brl(i.unitPrice))} cada</div>` : ''}${i.notes ? `<div class="m">» ${esc(i.notes)}</div>` : ''}</td><td class="v">${esc(brl(i.total))}</td></tr>`).join('');
  const linhas = [];
  linhas.push(`<tr><td>Subtotal</td><td class="v">${esc(brl(p.subtotal))}</td></tr>`);
  if (Number(p.discount) > 0) linhas.push(`<tr><td>Desconto</td><td class="v">- ${esc(brl(p.discount))}</td></tr>`);
  if (Number(p.deliveryFee) > 0) linhas.push(`<tr><td>Taxa de entrega</td><td class="v">${esc(brl(p.deliveryFee))}</td></tr>`);
  linhas.push(`<tr class="grande"><td>TOTAL</td><td class="v">${esc(brl(p.total))}</td></tr>`);
  if (p.paymentMethod) linhas.push(`<tr><td>${esc(PAG[p.paymentMethod] || p.paymentMethod)}${p.paid ? ' (pago)' : ' (a pagar)'}</td><td class="v"></td></tr>`);
  if (p.paymentMethod === 'dinheiro' && p.cashReceived != null) {
    linhas.push(`<tr><td>Recebido</td><td class="v">${esc(brl(p.cashReceived))}</td></tr>`);
    linhas.push(`<tr><td class="b">Troco</td><td class="v b">${esc(brl(Math.max(0, Number(p.cashReceived) - Number(p.total))))}</td></tr>`);
  }
  const topo = [];
  if (emp.logo) topo.push(`<img class="logo" src="${esc(emp.logo)}" alt="">`);
  if (emp.nome) topo.push(`<div class="c b">${esc(emp.nome)}</div>`);
  if (emp.telefone) topo.push(`<div class="c m">${esc(emp.telefone)}</div>`);
  if (emp.endereco) topo.push(`<div class="c m">${esc(emp.endereco)}</div>`);
  return `<div class="via">${topo.join('')}${topo.length ? '<hr>' : ''}${cabecalhoPedido(p)}${cliente(p)}<hr>
    <table>${itens}</table><hr><table class="tot">${linhas.join('')}</table>${p.notes ? `<hr><div>Obs.: ${esc(p.notes)}</div>` : ''}
    <hr>${rodape ? `<div class="c">${esc(rodape)}</div>` : ''}<div class="fiscal">Não é documento fiscal</div></div>`;
}

// ====================== A4 com 2 vias (cliente + comprovante de entrega) ======================
// Tudo em mm: no iPhone o PDF é feito por imagem (html2canvas, 794 px = 210 mm) e cortado a cada 297 mm.
function cssDupla(nivel) {
  const f = nivel === 'c' ? 9.6 : 11.2;
  return `@page{size:A4;margin:15mm 10mm}
*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}
body{font-family:'Helvetica Neue',Arial,sans-serif;color:#111;font-size:${f}px;line-height:1.3;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.folha{width:210mm;height:297mm;overflow:hidden;page-break-after:always;break-after:page;position:relative}
.folha:last-child{page-break-after:auto;break-after:auto}
.folha.cheia{height:auto;min-height:297mm;overflow:visible}
.meia{height:148.5mm;padding:${nivel === 'c' ? '7mm 12mm 6mm' : '9mm 13mm 7mm'};display:flex;flex-direction:column;position:relative;overflow:hidden}
.cheia .meia{height:auto;min-height:297mm;padding:14mm 15mm}
.meia + .meia{border-top:0.35mm dashed #444}
.corte{position:absolute;top:146.3mm;left:0;right:0;z-index:2;text-align:center;font-size:9px;color:#444;line-height:1}
.corte span{background:#fff;padding:0 3mm}
.topo{display:flex;justify-content:space-between;gap:6mm;align-items:flex-start}
.emp{display:flex;gap:3mm;align-items:center;min-width:0}
.emp img{max-height:${nivel === 'c' ? 11 : 14}mm;max-width:28mm;object-fit:contain}
.emp b{font-size:${f + 3}px;display:block}.emp div{font-size:${f - 1}px;color:#333}
.ped{border:0.35mm solid #111;border-radius:2mm;padding:1.5mm 3mm;text-align:right;white-space:nowrap}
.ped .n{font-size:${nivel === 'c' ? 18 : 22}px;font-weight:800;line-height:1.05}
.ped .l{font-size:${f - 1.5}px;text-transform:uppercase;letter-spacing:.06em;color:#333}
.faixa{margin:2.5mm 0 2mm;padding:1mm 2mm;background:#111;color:#fff;font-weight:700;font-size:${f - 0.5}px;letter-spacing:.05em;text-transform:uppercase;display:flex;justify-content:space-between}
.cli{font-size:${f}px;margin-bottom:1.5mm}.cli b{font-weight:700}
table{width:100%;border-collapse:collapse;font-size:inherit}
th{font-size:${f - 1.5}px;text-transform:uppercase;color:#444;text-align:left;border-bottom:0.3mm solid #111;padding:${nivel === 'c' ? '0.6mm' : '1mm'} 1mm}
td{padding:${nivel === 'c' ? '0.6mm' : '1.1mm'} 1mm;border-bottom:0.2mm solid #ddd;vertical-align:top}
td.q{width:12mm;font-weight:700}td.v,th.v{text-align:right;white-space:nowrap;width:24mm}
.obs{font-size:${f - 1}px;color:#333}
.baixo{margin-top:auto;display:flex;justify-content:space-between;gap:6mm;align-items:flex-end;padding-top:2mm}
.tot{width:auto;min-width:62mm;flex:0 0 auto}.cheia .baixo{margin-top:5mm}.tot td{border:0;padding:0.3mm 1mm}.tot .g td{font-size:${f + 3}px;font-weight:800;border-top:0.3mm solid #111;padding-top:1mm}
.nota{font-size:${f - 1}px;color:#333;max-width:95mm}
.ass{display:grid;grid-template-columns:1.3fr 1.3fr 1fr;gap:5mm;margin-top:${nivel === 'c' ? 7 : 9}mm}
.ass div{border-top:0.3mm solid #111;padding-top:0.8mm;font-size:${f - 1.5}px;color:#333;text-align:center}
.dec{font-size:${f - 0.5}px;margin-top:2mm}
.fiscal{font-size:${f - 2}px;color:#555;text-align:center;margin-top:1.5mm}
.c{text-align:center}.b{font-weight:700}.m{font-size:10px}.tipo{font-size:16px;font-weight:800;text-transform:uppercase}hr{border:0;border-top:1px dashed #000;margin:3mm 0}
.coz{padding:14mm 15mm}
/* Impressão pelo navegador: margem de 15 mm + 6 mm de respiro + 2 vias de 116 mm (238 mm de 267 úteis).
   O Safari imprime uns 6–7% maior que o tamanho em mm (medido na prévia dele): com essa folga as 2 vias cabem
   numa folha e o pontilhado fica perto do meio (no Chrome, ~1 cm acima do meio). Nenhuma via é quebrada no meio. */
@media print{
.folha{width:auto;height:auto;overflow:visible;padding-top:6mm}
.folha.cheia{padding-top:0}
.folha.cheia{min-height:0}
.meia{height:116mm;padding:${nivel === 'c' ? '3mm 3mm 2mm' : '4mm 3mm 3mm'};break-inside:avoid;page-break-inside:avoid}
.cheia .meia{height:auto;min-height:0;padding:0}
.corte{top:119.6mm}
.coz{padding:0}
}.coz .num{font-size:40px;font-weight:800}.coz td{font-size:15px}.coz .obs{font-size:14px;font-weight:700;color:#000}`;
}
function viaMeia(p, emp, rodape, tipo) {
  const numero = p.number ? String(p.number).padStart(3, '0') : (p.provisorio || '—');
  const tp = (TIPO[p.type] || 'Pedido') + (p.type === 'mesa' && p.tableLabel ? ' ' + p.tableLabel : '');
  const empHtml = `<div class="emp">${emp.logo ? `<img src="${esc(emp.logo)}" alt="">` : ''}<div>${emp.nome ? `<b>${esc(emp.nome)}</b>` : ''}${emp.telefone ? `<div>${esc(emp.telefone)}</div>` : ''}${emp.endereco ? `<div>${esc(emp.endereco)}</div>` : ''}</div></div>`;
  const cli = [];
  if (p.customerName) cli.push(`<b>${esc(p.customerName)}</b>`);
  if (p.customerPhone) cli.push(esc(p.customerPhone));
  if (p.address) cli.push(esc(p.address));
  if (p.scheduledFor) cli.push('<b>Para: ' + esc(new Date(p.scheduledFor).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })) + ' ' + esc(new Date(p.scheduledFor).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })) + '</b>');
  const itens = (p.items || []).map(i => `<tr><td class="q">${esc(qtd(i.quantity))}x</td><td>${esc(i.name)}${i.notes ? `<div class="obs">» ${esc(i.notes)}</div>` : ''}</td><td class="v">${esc(brl(i.unitPrice))}</td><td class="v">${esc(brl(i.total))}</td></tr>`).join('');
  const t = [`<tr><td>Subtotal</td><td class="v">${esc(brl(p.subtotal))}</td></tr>`];
  if (Number(p.discount) > 0) t.push(`<tr><td>Desconto</td><td class="v">- ${esc(brl(p.discount))}</td></tr>`);
  if (Number(p.deliveryFee) > 0) t.push(`<tr><td>Taxa de entrega</td><td class="v">${esc(brl(p.deliveryFee))}</td></tr>`);
  t.push(`<tr class="g"><td>TOTAL</td><td class="v">${esc(brl(p.total))}</td></tr>`);
  if (p.paymentMethod) t.push(`<tr><td colspan="2">${esc(PAG[p.paymentMethod] || p.paymentMethod)} · ${p.paid ? 'pago' : 'a pagar'}</td></tr>`);
  if (p.paymentMethod === 'dinheiro' && p.cashReceived != null) t.push(`<tr><td>Recebido / troco</td><td class="v">${esc(brl(p.cashReceived))} / ${esc(brl(Math.max(0, Number(p.cashReceived) - Number(p.total))))}</td></tr>`);
  const empresa = tipo === 'empresa';
  const esquerda = empresa
    ? `<div style="flex:1 1 auto;min-width:0">${p.notes ? `<div class="nota">Obs.: ${esc(p.notes)}</div>` : ''}<div class="dec">Declaro que recebi os itens deste pedido.</div>
        <div class="ass"><div>Nome legível</div><div>Assinatura</div><div>Data e hora</div></div></div>`
    : `<div class="nota">${p.notes ? `Obs.: ${esc(p.notes)}<br>` : ''}${rodape ? esc(rodape) : ''}</div>`;
  return `<div class="meia">
    <div class="topo">${empHtml}<div class="ped"><div class="l">Pedido</div><div class="n">${esc(numero)}</div><div class="l">${esc(tp)} · ${esc(linhaData(p))}${p.provisorio ? ' · sem internet' : ''}</div></div></div>
    <div class="faixa"><span>${empresa ? 'Via da empresa · comprovante de entrega' : 'Via do cliente'}</span><span>${esc(p.paid ? 'Pago' : 'A pagar')}</span></div>
    ${cli.length ? `<div class="cli">Cliente: ${cli.join(' · ')}</div>` : ''}
    <table><thead><tr><th>Qtd.</th><th>Item</th><th class="v">Unit.</th><th class="v">Total</th></tr></thead><tbody>${itens}</tbody></table>
    <div class="baixo">${esquerda}<table class="tot">${t.join('')}</table></div>
    <div class="fiscal">Não é documento fiscal</div></div>`;
}
const LIM_N = 5, LIM_C = 8;
function htmlDupla(p, emp, rodape, comCozinha, forcar) {
  // Quantas linhas cabem em meia folha (medido): LIM_N no tamanho normal, LIM_C no compacto; mais que isso, uma via por folha
  const linhas = (p.items || []).reduce((t, i) => t + 1 + (i.notes ? 0.6 : 0), 0) + (p.notes ? 0.6 : 0);
  const nivel = forcar || (linhas <= LIM_N ? 'n' : linhas <= LIM_C ? 'c' : 'g');
  const folhas = nivel === 'g'
    ? `<div class="folha cheia">${viaMeia(p, emp, rodape, 'cliente')}</div><div class="folha cheia">${viaMeia(p, emp, rodape, 'empresa')}</div>`
    : `<div class="folha">${viaMeia(p, emp, rodape, 'cliente')}${viaMeia(p, emp, rodape, 'empresa')}<div class="corte"><span>✂ recorte aqui</span></div></div>`;
  const coz = comCozinha ? `<div class="folha cheia"><div class="coz">${viaCozinha(p).replace('<div class="via">', '<div>')}</div></div>` : '';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Pedido ${esc(p.number || p.provisorio || '')}</title><style>${cssDupla(nivel === 'g' ? 'n' : nivel)}</style></head><body>${folhas}${coz}</body></html>`;
}

function html(p, opts) {
  const c = config();
  let formato = (opts && opts.formato) || c.formato;
  if (formato === 'escpos') formato = (((opts && opts.escpos) || c.escpos).colunas || 48) <= 32 ? '58' : '80';
  const vias = (opts && opts.vias) || c.vias;
  const emp = (opts && opts.empresa) || empresaAtual();
  if (formato === 'a4dupla') return htmlDupla(p, emp, c.rodape, (vias || []).includes('cozinha'), opts && opts.nivel);
  const corpo = vias.map(v => v === 'cozinha' ? viaCozinha(p) : viaCliente(p, emp, c.rodape)).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Pedido ${esc(p.number || p.provisorio || '')}</title><style>${css(formato)}</style></head><body>${corpo}</body></html>`;
}
// Impressão direta (ESC/POS). Erro ou navegador sem suporte: janela de impressão como térmica do mesmo tamanho.
async function printEscPos(p, opts) {
  const c = config();
  const e = { ...c.escpos, ...((opts && opts.escpos) || {}) };
  const vias = (opts && opts.vias) || c.vias;
  const termica = e.colunas <= 32 ? '58' : '80';
  const EP = window.EscPos;
  if (!EP || !EP.suporte()[e.transporte === 'usb' ? 'usb' : 'serial']) return printHtml(p, { ...(opts || {}), formato: termica, vias });
  try {
    const bytes = EP.pedido(p, { colunas: e.colunas, vias, empresa: (opts && opts.empresa) || empresaAtual(), rodape: c.rodape, cortar: e.cortar, codepage: e.codepage });
    await EP.imprimir(bytes, { transporte: e.transporte, baud: e.baud });
  } catch (err) {
    console.warn('[OrderPrint] impressão direta falhou:', err && err.message);
    if (window.confirm(`Não foi possível imprimir direto na térmica.\n\n${err && err.message ? err.message : ''}\n\nAbrir a janela de impressão?`)) {
      return printHtml(p, { ...(opts || {}), formato: termica, vias });
    }
  }
}
function print(p, opts) {
  const formato = (opts && opts.formato) || config().formato;
  if (formato === 'escpos') return printEscPos(p, opts);
  return printHtml(p, opts);
}
function printHtml(p, opts) {
  const doc = html(p, opts);
  const nome = 'pedido-' + String(p.number || p.provisorio || 'novo').replace(/[^\w-]/g, '') + '.pdf';
  if (window.ShareFile && window.ShareFile.printHtml) return window.ShareFile.printHtml(doc, { fileName: nome });
  const w = window.open('', '_blank'); if (w) { w.document.write(doc.replace('</body>', '<script>window.onload=function(){window.print()}<\/script></body>')); w.document.close(); }
  return Promise.resolve();
}

window.OrderPrint = { html, print, config, saveConfig, TIPO, PAG };
})();
