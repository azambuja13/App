(function () {
'use strict';
/**
 * EscPos (Vendas, out/2026) — impressão direta na térmica, sem a janela de impressão.
 * Manda comandos ESC/POS (negrito, tamanho, alinhamento, avanço e corte) pela USB do computador:
 *   - 'serial': Web Serial (navigator.serial) — impressora serial, adaptador USB-serial ou USB com porta COM virtual;
 *   - 'usb':    WebUSB (navigator.usb) — impressora USB "classe impressora" (não aparece como porta serial).
 * Só no Chrome/Edge do computador (Safari e o app do iPhone não têm essas APIs): lá o OrderPrint imprime como
 * "Térmica 80/58 mm" pela janela de impressão.
 * A 1ª vez precisa de um toque em "Conectar impressora" (o navegador pede para escolher o aparelho); depois o navegador
 * lembra a permissão e imprime direto.
 *
 * window.EscPos = { suporte, conectar, conectada, esquecer, imprimir, pedido, teste, CMD, encode }
 */
const ESC = 0x1b, GS = 0x1d, LF = 0x0a;
const CMD = {
  iniciar: () => [ESC, 0x40],
  codepage: (n = 2) => [ESC, 0x74, n],                      // 2 = CP850 na maioria (Epson, Elgin, Bematech, genéricas)
  negrito: on => [ESC, 0x45, on ? 1 : 0],
  tamanho: (l = 1, a = 1) => [GS, 0x21, ((lim(l) - 1) << 4) | (lim(a) - 1)],
  alinhar: a => [ESC, 0x61, { esquerda: 0, centro: 1, direita: 2 }[a] || 0],
  avancar: (n = 1) => [ESC, 0x64, Math.max(0, Math.min(255, n | 0))],
  cortar: () => [GS, 0x56, 0x42, 0x00]                      // avança até a lâmina e corta (parcial)
};
function lim(n) { return Math.max(1, Math.min(8, Math.round(n) || 1)); }

// CP850 (0x80–0xFF): cobre á à â ã é ê í ó ô õ ú ü ç º ª °
const CP850 = 'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ðÐÊËÈıÍÎÏ┘┌█▄¦Ì▀ÓßÔÒõÕµþÞÚÛÙýÝ¯´­±‗¾¶§÷¸°¨·¹³²■ ';
const MAPA = (() => { const m = {}; for (let i = 0; i < 128; i++) m[CP850[i]] = 0x80 + i; return m; })();
const TROCA = { ' ': ' ', ' ': ' ', ' ': ' ', '–': '-', '—': '-', '“': '"', '”': '"', '‘': "'", '’': "'", '…': '...', '•': '*', '€': 'EUR', '✂': '-', '›': '>', '‹': '<' };
function encode(str) {
  const out = [];
  for (const ch of String(str == null ? '' : str)) {
    const c = ch.codePointAt(0);
    if (c >= 0x20 && c < 0x7f) { out.push(c); continue; }
    if (ch === '\n') { out.push(LF); continue; }
    if (TROCA[ch] != null) { for (const x of TROCA[ch]) out.push(x.charCodeAt(0)); continue; }
    if (MAPA[ch] != null) { out.push(MAPA[ch]); continue; }
    const semAcento = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (semAcento && semAcento.charCodeAt(0) < 0x7f) { out.push(semAcento.charCodeAt(0)); continue; }
    out.push(0x3f); // ?
  }
  return out;
}

// ---------- Montagem do pedido ----------
const brl = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\s/g, ' ');
const qtd = v => { const n = Number(v) || 0; return Number.isInteger(n) ? String(n) : n.toLocaleString('pt-BR', { maximumFractionDigits: 3 }); };
const TIPO = () => (window.OrderPrint && window.OrderPrint.TIPO) || { balcao: 'Balcão', mesa: 'Mesa', retirada: 'Retirada', delivery: 'Delivery', encomenda: 'Encomenda' };
const PAG = () => (window.OrderPrint && window.OrderPrint.PAG) || {};

function quebrar(txt, larg) {
  const out = []; let linha = '';
  String(txt || '').split(/\s+/).filter(Boolean).forEach(p => {
    while (p.length > larg) { if (linha) { out.push(linha); linha = ''; } out.push(p.slice(0, larg)); p = p.slice(larg); }
    if (!linha) linha = p; else if ((linha + ' ' + p).length <= larg) linha += ' ' + p; else { out.push(linha); linha = p; }
  });
  if (linha) out.push(linha);
  return out.length ? out : [''];
}
/** Texto à esquerda e valor à direita na mesma linha (o texto quebra se não couber) */
function esqDir(esq, dir, cols, recuo = '') {
  dir = String(dir || '');
  const linhas = quebrar(esq, Math.max(8, cols - dir.length - 1));
  return linhas.map((l, i) => {
    const t = (i ? recuo : '') + l;
    return i === linhas.length - 1 ? t + ' '.repeat(Math.max(1, cols - t.length - dir.length)) + dir : t;
  });
}

function Doc(cols) {
  const b = [];
  const api = {
    raw: arr => { b.push(...arr); return api; },
    linha: (txt = '', o = {}) => {
      b.push(...CMD.alinhar(o.alinhar || 'esquerda'), ...CMD.negrito(!!o.negrito), ...CMD.tamanho(o.l || 1, o.a || 1));
      b.push(...encode(txt), LF);
      if (o.negrito || o.l > 1 || o.a > 1) b.push(...CMD.negrito(false), ...CMD.tamanho(1, 1));
      return api;
    },
    // texto longo quebrado na largura (considera letra larga)
    paragrafo: (txt, o = {}) => {
      const r = o.recuo || '', larg = Math.floor(cols / (o.l || 1));
      const ls = quebrar(txt, larg); const out = [ls[0]];
      if (ls.length > 1) out.push(...quebrar(ls.slice(1).join(' '), larg - r.length).map(x => r + x));
      out.forEach(l => api.linha(l, o));
      return api;
    },
    traco: () => api.linha('-'.repeat(cols)),
    bytes: () => b
  };
  return api;
}

function cabecalho(d, p, cols) {
  const T = TIPO();
  const numero = p.number ? String(p.number).padStart(3, '0') : (p.provisorio || '-');
  const dt = new Date(p.createdAt || Date.now());
  d.linha((T[p.type] || 'Pedido') + (p.type === 'mesa' && p.tableLabel ? ' ' + p.tableLabel : ''), { alinhar: 'centro', negrito: true, a: 2 });
  d.linha(numero, { alinhar: 'centro', negrito: true, l: 3, a: 3 });
  d.linha(dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + (p.provisorio ? ' - sem internet' : ''), { alinhar: 'centro' });
  if (p.scheduledFor) {
    const s = new Date(p.scheduledFor);
    d.linha('Para: ' + s.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }) + ' ' + s.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), { alinhar: 'centro', negrito: true });
  }
  if (p.customerName || p.customerPhone || p.address) {
    d.traco();
    if (p.customerName) d.paragrafo(p.customerName, { negrito: true });
    if (p.customerPhone) d.linha(p.customerPhone);
    if (p.address) d.paragrafo(p.address);
  }
}
function viaCozinha(d, p, cols) {
  d.linha('VIA DA COZINHA', { alinhar: 'centro', negrito: true }); d.traco();
  cabecalho(d, p, cols); d.traco();
  (p.items || []).forEach(i => {
    d.paragrafo(qtd(i.quantity) + 'x ' + i.name, { negrito: true, a: 2 });
    if (i.notes) d.paragrafo('  >> ' + i.notes, { negrito: true, recuo: '     ' });
  });
  if (p.notes) { d.traco(); d.paragrafo('Obs.: ' + p.notes, { negrito: true }); }
  d.traco();
}
function viaCliente(d, p, cols, emp, rodape) {
  if (emp.nome) d.paragrafo(emp.nome, { alinhar: 'centro', negrito: true, l: cols >= 40 ? 2 : 1, a: 2 });
  if (emp.telefone) d.linha(emp.telefone, { alinhar: 'centro' });
  if (emp.endereco) d.paragrafo(emp.endereco, { alinhar: 'centro' });
  if (emp.nome || emp.telefone || emp.endereco) d.traco();
  cabecalho(d, p, cols); d.traco();
  (p.items || []).forEach(i => {
    esqDir(qtd(i.quantity) + 'x ' + i.name, brl(i.total), cols, '   ').forEach(l => d.linha(l));
    if (Number(i.quantity) !== 1) d.linha('   ' + brl(i.unitPrice) + ' cada');
    if (i.notes) d.paragrafo('   >> ' + i.notes, { recuo: '      ' });
  });
  d.traco();
  const L = (e, v, o) => esqDir(e, v, cols).forEach(l => d.linha(l, o || {}));
  L('Subtotal', brl(p.subtotal));
  if (Number(p.discount) > 0) L('Desconto', '- ' + brl(p.discount));
  if (Number(p.deliveryFee) > 0) L('Taxa de entrega', brl(p.deliveryFee));
  L('TOTAL', brl(p.total), { negrito: true, a: 2 });
  if (p.paymentMethod) d.linha((PAG()[p.paymentMethod] || p.paymentMethod) + (p.paid ? ' (pago)' : ' (a pagar)'));
  if (p.paymentMethod === 'dinheiro' && p.cashReceived != null) {
    L('Recebido', brl(p.cashReceived));
    L('Troco', brl(Math.max(0, Number(p.cashReceived) - Number(p.total))), { negrito: true });
  }
  if (p.notes) { d.traco(); d.paragrafo('Obs.: ' + p.notes); }
  d.traco();
  if (rodape) d.paragrafo(rodape, { alinhar: 'centro' });
  d.linha('Não é documento fiscal', { alinhar: 'centro' });
}

/** Bytes ESC/POS do pedido. o: { colunas: 48|42|32, vias: ['cozinha','cliente'], empresa, rodape, cortar, codepage } */
function pedido(p, o = {}) {
  const cols = o.colunas || 48;
  const vias = (o.vias && o.vias.length) ? o.vias : ['cliente'];
  const emp = o.empresa || {};
  const d = Doc(cols);
  vias.forEach(v => {
    d.raw(CMD.iniciar()).raw(CMD.codepage(o.codepage == null ? 2 : o.codepage));
    if (v === 'cozinha') viaCozinha(d, p, cols); else viaCliente(d, p, cols, emp, o.rodape);
    d.raw(CMD.avancar(o.cortar === false ? 6 : 4));
    if (o.cortar !== false) d.raw(CMD.cortar());
  });
  return new Uint8Array(d.bytes());
}

// ---------- Conexão ----------
function suporte() {
  const serial = typeof navigator !== 'undefined' && !!navigator.serial;
  const usb = typeof navigator !== 'undefined' && !!navigator.usb;
  return { serial, usb, algum: serial || usb };
}
const nomeUsb = d => [d.manufacturerName, d.productName].filter(Boolean).join(' ') || 'Impressora USB';
const nomeSerial = pt => { const i = pt.getInfo ? pt.getInfo() : {}; return i.usbVendorId ? `Porta USB ${i.usbVendorId.toString(16).padStart(4, '0')}:${(i.usbProductId || 0).toString(16).padStart(4, '0')}` : 'Porta serial'; };

/** Escolher a impressora (precisa de um toque do usuário). Devolve o nome do aparelho. */
async function conectar(transporte = 'serial') {
  const s = suporte();
  if (transporte === 'usb') {
    if (!s.usb) throw new Error('Este navegador não tem acesso à USB. Use o Chrome ou o Edge no computador.');
    const dev = await navigator.usb.requestDevice({ filters: [] });
    return nomeUsb(dev);
  }
  if (!s.serial) throw new Error('Este navegador não tem acesso à porta serial. Use o Chrome ou o Edge no computador.');
  const pt = await navigator.serial.requestPort({});
  return nomeSerial(pt);
}
/** Aparelho já liberado neste navegador (ou null) */
async function aparelho(transporte) {
  const s = suporte();
  try {
    if (transporte === 'usb') { if (!s.usb) return null; const l = await navigator.usb.getDevices(); return l[0] || null; }
    if (!s.serial) return null; const l = await navigator.serial.getPorts(); return l[0] || null;
  } catch (e) { return null; }
}
async function conectada(transporte = 'serial') {
  const a = await aparelho(transporte);
  return a ? (transporte === 'usb' ? nomeUsb(a) : nomeSerial(a)) : null;
}
async function esquecer(transporte = 'serial') {
  const a = await aparelho(transporte);
  if (a && a.forget) await a.forget();
}

async function enviarSerial(pt, bytes, baud) {
  const aberta = !!(pt.writable);
  if (!aberta) await pt.open({ baudRate: baud || 9600, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none' });
  const w = pt.writable.getWriter();
  try { await w.write(bytes); await w.ready; }
  finally { try { w.releaseLock(); } catch (e) {} if (!aberta) { try { await pt.close(); } catch (e) {} } }
}
async function enviarUsb(dev, bytes) {
  if (!dev.opened) await dev.open();
  if (!dev.configuration) await dev.selectConfiguration(1);
  // interface com saída "bulk" (de preferência a classe 7 = impressora)
  let alvo = null;
  for (const itf of dev.configuration.interfaces) {
    for (const alt of itf.alternates) {
      const ep = alt.endpoints.find(e => e.direction === 'out' && e.type === 'bulk');
      if (ep && (!alvo || alt.interfaceClass === 7)) alvo = { n: itf.interfaceNumber, alt: alt.alternateSetting, ep: ep.endpointNumber, classe: alt.interfaceClass };
    }
  }
  if (!alvo) throw new Error('A impressora USB não tem saída de dados reconhecida.');
  await dev.claimInterface(alvo.n);
  try {
    if (alvo.alt) await dev.selectAlternateInterface(alvo.n, alvo.alt);
    for (let i = 0; i < bytes.length; i += 16384) await dev.transferOut(alvo.ep, bytes.slice(i, i + 16384));
  } finally {
    try { await dev.releaseInterface(alvo.n); } catch (e) {}
    try { await dev.close(); } catch (e) {}
  }
}

/**
 * Envia bytes para a impressora. o: { transporte: 'serial'|'usb', baud, timeoutMs }
 * Sem aparelho liberado: tenta pedir (só funciona logo após um toque); senão erro com code 'SEM_IMPRESSORA'.
 */
async function imprimir(bytes, o = {}) {
  const tr = o.transporte || 'serial';
  const s = suporte();
  if (!(tr === 'usb' ? s.usb : s.serial)) { const e = new Error('Impressão direta só no Chrome ou Edge do computador.'); e.code = 'SEM_SUPORTE'; throw e; }
  let a = await aparelho(tr);
  if (!a) {
    try { await conectar(tr); a = await aparelho(tr); } catch (e) { /* sem toque do usuário ou cancelado */ }
    if (!a) { const e = new Error('Nenhuma impressora conectada. Em Vendas › Impressão, toque em "Conectar impressora".'); e.code = 'SEM_IMPRESSORA'; throw e; }
  }
  const envio = tr === 'usb' ? enviarUsb(a, bytes) : enviarSerial(a, bytes, o.baud);
  let t;
  try {
    await Promise.race([envio, new Promise((_, rej) => { t = setTimeout(() => rej(new Error('A impressora não respondeu. Confira se está ligada e com papel.')), o.timeoutMs || 15000); })]);
  } finally { clearTimeout(t); }
  return { bytes: bytes.length };
}

/** Recibo curto para testar a conexão */
function teste(o = {}) {
  const d = Doc(o.colunas || 48);
  d.raw(CMD.iniciar()).raw(CMD.codepage(o.codepage == null ? 2 : o.codepage));
  d.linha('TESTE DE IMPRESSÃO', { alinhar: 'centro', negrito: true, a: 2 });
  d.linha('Calculadora de Precificação', { alinhar: 'centro' }).traco();
  d.linha('Normal: ação, pão, café, R$ 12,50');
  d.linha('Negrito', { negrito: true });
  d.linha('Grande', { l: 2, a: 2 });
  d.traco().raw(CMD.avancar(4));
  if (o.cortar !== false) d.raw(CMD.cortar());
  return new Uint8Array(d.bytes());
}

window.EscPos = { suporte, conectar, conectada, esquecer, imprimir, pedido, teste, CMD, encode };
})();
