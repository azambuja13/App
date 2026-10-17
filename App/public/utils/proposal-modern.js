(function () {
'use strict';
/**
 * Modelo "Moderno" da proposta (out/2026).
 * Mesmo código na web (utils/proposal-modern.js) e na API
 * (src/services/proposalModernTemplate.js): a tela, a impressão e o PDF
 * do servidor saem iguais. Gera HTML puro (sem Tailwind) com estilos
 * próprios prefixados com "pm-".
 *
 * render(proposal, opts)
 *   proposal: proposta "desempacotada" (campos de proposalData no nível principal)
 *   opts.logo        logo da empresa (data:image… ou https)
 *   opts.clientName  nome do cliente (opcional, sobrepõe proposal.clientName)
 *   opts.img(src)    devolve o src seguro (ou '' para descartar)
 *   opts.fontCss     CSS @font-face (Lora e Inter)
 */
var PM_MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function pmEsc(v) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function pmBrl(v) {
  var n = Number(v) || 0;
  return 'R$ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function pmDate(d, longo) {
  if (!d) return '';
  var s = String(d);
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  var dt = m ? { y: +m[1], mo: +m[2], d: +m[3] } : null;
  if (!dt) {
    var x = new Date(s);
    if (isNaN(x)) return '';
    dt = { y: x.getFullYear(), mo: x.getMonth() + 1, d: x.getDate() };
  }
  if (longo) return dt.d + ' de ' + PM_MESES[dt.mo - 1] + ' de ' + dt.y;
  return String(dt.d).padStart(2, '0') + '/' + String(dt.mo).padStart(2, '0') + '/' + dt.y;
}
function pmCat(c) {
  var k = String(c || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (/entrad|petisc|aperitiv|finger/.test(k)) return 'entrada';
  if (/acompanh|guarni/.test(k)) return 'acompanhamento';
  if (/sobremes|doce/.test(k)) return 'sobremesa';
  if (/princip/.test(k)) return 'principal';
  return c ? String(c) : 'outros';
}
var PM_CATS = [['entrada', 'Entradas', 'entrada', 'entradas'], ['principal', 'Principais', 'prato principal', 'pratos principais'],
  ['acompanhamento', 'Acompanhamentos', 'acompanhamento', 'acompanhamentos'], ['sobremesa', 'Sobremesas', 'sobremesa', 'sobremesas']];

function pmDishes(p) {
  var m = p && p.selectedMenuData;
  if (!m) return [];
  var a = Array.isArray(m.dishes) ? m.dishes : [];
  var b = m.menuData && Array.isArray(m.menuData.dishes) ? m.menuData.dishes : [];
  return (b.length > a.length ? b : a).filter(function (d) { return d && d.active !== false; });
}

// "20% no fechamento, 30% um mês antes e 50% um dia antes" → etapas
function pmPayment(text, total) {
  var t = String(text || '');
  var re = /(\d{1,3}(?:[.,]\d+)?)\s*%\s*([^,;%]*?)(?=\s*(?:,|;|\be\s+\d|\+|$))/gi;
  var out = [], m, soma = 0;
  while ((m = re.exec(t))) {
    var pct = parseFloat(m[1].replace(',', '.'));
    var desc = m[2].replace(/^\s*(d[oae]s?\s+)?/i, '').replace(/\s+/g, ' ').trim();
    if (!(pct > 0)) continue;
    soma += pct;
    out.push({ pct: pct, desc: desc ? desc.charAt(0).toUpperCase() + desc.slice(1) : '', valor: total * pct / 100 });
  }
  return Math.abs(soma - 100) < 0.01 && out.length >= 2 ? out : null;
}

// Observações: linhas com "-" ou "•" viram "o que está incluso"; o resto fica como observação
function pmIncluded(p) {
  var itens = Array.isArray(p.includedItems) ? p.includedItems.filter(Boolean).map(String) : [];
  var resto = [];
  String(p.observations || '').split(/\r?\n/).forEach(function (l) {
    var s = l.trim();
    if (!s) return;
    var m = s.match(/^[-•*✓]\s*(.+)$/);
    if (m) itens.push(m[1].trim());
    else if (!/^(est[aá] incluso|incluso|inclui)\s*:?\s*$/i.test(s)) resto.push(s);
  });
  return { itens: itens, obs: resto.join('\n') };
}

function pmRender(p, opts) {
  opts = opts || {};
  var img = opts.img || function (s) { return s || ''; };
  var esc = pmEsc;
  var guests = parseInt(p.guests, 10) || 0;
  var total = Math.ceil(Number(p.finalTotal) || 0);
  var pp = guests > 0 ? Math.round(total * 100 / guests) / 100 : 0;
  var cliente = opts.clientName || p.clientName || 'Cliente';
  var empresa = p.companyName || 'Proposta';
  var logo = img(opts.logo || p.companyLogo || '');
  var dishes = pmDishes(p);
  var comFoto = p.includeDishPhotos !== false;
  var fotoPrato = function (d) { var f = d.photos && d.photos[0]; return comFoto && f ? img(f.photoData || f.data || f.url || '') : ''; };
  var fotoSobre = img(p.companyPhoto1 || '');
  var fotoCapa = img(p.companyPhoto2 || '') || img(p.companyPhoto3 || '') || (dishes.map(fotoPrato).filter(Boolean)[0] || '');
  var inc = pmIncluded(p);
  var etapas = pmPayment(p.paymentMethod, total);
  var formas = [];
  if (p.acceptPix) formas.push('Pix');
  if (p.acceptCard) formas.push('Cartão');
  if (p.acceptCash) formas.push('Dinheiro');
  if (p.acceptTransfer) formas.push('Transferência');
  var contato = [];
  if (p.showCompanyPhone !== false && p.companyPhone) contato.push(esc(p.companyPhone));
  if (p.showCompanyEmail !== false && p.companyEmail) contato.push(esc(p.companyEmail));
  if (p.showCompanyAddress !== false && p.companyAddress) contato.push(esc(p.companyAddress));
  var emitida = pmDate(p.createdAt || new Date().toISOString());
  var pagina = 1;
  var rodape = function () {
    pagina++;
    return '<div class="pm-foot">' + (logo ? '<img src="' + logo + '" alt="">' : '') + '<span>' + esc(empresa) + (contato.length ? ' · ' + contato.join(' · ') : '') + '</span><b>' + String(pagina).padStart(2, '0') + '</b></div>';
  };

  // Agrupar pratos
  var grupos = {}, ordem = [];
  dishes.forEach(function (d) {
    var c = pmCat(d.dishType || d.dishCategory || d.type);
    if (!grupos[c]) { grupos[c] = []; ordem.push(c); }
    grupos[c].push(d);
  });
  var cats = PM_CATS.filter(function (c) { return grupos[c[0]]; }).map(function (c) { return { k: c[0], t: c[1], s: c[2], pl: c[3] }; });
  ordem.forEach(function (k) { if (!PM_CATS.some(function (c) { return c[0] === k; })) cats.push({ k: k, t: k.charAt(0).toUpperCase() + k.slice(1), s: 'item', pl: 'itens' }); });
  var nome = function (d) { return d.dishName || d.name || (d.dish && d.dish.name) || 'Prato'; };
  var menuHtml = cats.map(function (c) {
    var lis = grupos[c.k].map(function (d) {
      var f = fotoPrato(d);
      var desc = d.dishDescription || d.description || '';
      return '<li><span class="pm-dot"></span><span class="pm-dn">' + esc(nome(d)) + (desc ? '<small>' + esc(desc) + '</small>' : '') + '</span>' + (f ? '<img class="pm-th" src="' + f + '" alt="">' : '') + '</li>';
    }).join('');
    return '<section class="pm-cat"><h3><span>' + esc(c.t) + '</span><em>' + grupos[c.k].length + '</em></h3><ul>' + lis + '</ul></section>';
  }).join('');
  var resumoMenu = cats.map(function (c) {
    var n = grupos[c.k].length;
    return '<li><span class="pm-ck">•</span>' + n + ' ' + esc(n === 1 ? c.s : c.pl) + '</li>';
  }).join('');

  var chips = [];
  if (p.eventDate) chips.push(pmDate(p.eventDate, true));
  if (p.eventLocation) chips.push(esc(p.eventLocation));
  if (guests) chips.push(guests + ' convidados');
  if (dishes.length) chips.push(dishes.length + ' pratos');

  // Sobre mim
  var mostra = function (flag, txt) { return p[flag] !== false && txt && String(txt).trim(); };
  var hist = mostra('showCompanyHistory', p.companyHistory);
  var vals = [['Missão', mostra('showCompanyMission', p.companyMission)], ['Visão', mostra('showCompanyVision', p.companyVision)], ['Valores', mostra('showCompanyValues', p.companyValues)]].filter(function (v) { return v[1]; });
  var frase = mostra('showCompanyMotivation', p.companyMotivation);
  var temSobre = hist || vals.length || frase || fotoSobre;
  // Junta quebras de linha "manuais" (linha que não termina em . ! ? :) e mantém os parágrafos reais
  var paragrafos = function (t) {
    var out = [], atual = '';
    String(t).split(/\r?\n/).forEach(function (l) {
      l = l.trim();
      if (!l) { if (atual) { out.push(atual); atual = ''; } return; }
      atual = atual ? atual + ' ' + l : l;
      if (/[.!?:;"”)]$/.test(l)) { out.push(atual); atual = ''; }
    });
    if (atual) out.push(atual);
    return out.map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('');
  };

  var css = (opts.fontCss || '') + '\n' + PM_CSS;
  var html = '<div class="pm-doc">' + '<style>' + css + '</style>';

  // 1. Capa
  html += '<div class="pm-pg pm-cover' + (fotoCapa ? '' : ' pm-nophoto') + '">' +
    (fotoCapa ? '<div class="pm-hero"><img src="' + fotoCapa + '" alt=""></div>' : '') +
    (logo ? '<div class="pm-logo"><img src="' + logo + '" alt=""></div>' : '') +
    '<div class="pm-cbody"><div class="pm-kicker">Proposta gastronômica</div>' +
    '<h1>Para ' + esc(cliente) + '</h1>' +
    (p.proposalName && !/^proposta\s*-/i.test(p.proposalName) ? '<div class="pm-sub">' + esc(p.proposalName) + '</div>' : '<div class="pm-sub">Preparada por ' + esc(empresa) + '</div>') +
    (chips.length ? '<div class="pm-chips">' + chips.map(function (c) { return '<span>' + c + '</span>'; }).join('') + '</div>' : '') + '</div>' +
    '<div class="pm-sign"><div>Preparada por<b>' + esc(empresa) + '</b></div><div class="pm-r">' + (p.validityDays ? 'Válida por ' + esc(p.validityDays) + ' dias<br>' : '') + 'Emitida em ' + emitida + '</div></div></div>';

  // 2. Resumo
  var primeiro = String(cliente).split(' ')[0];
  html += '<div class="pm-pg"><div class="pm-main"><div class="pm-kicker">Seu evento em resumo</div><h2>Olá, ' + esc(primeiro) + '!</h2>' +
    '<p class="pm-lead">Preparei esta proposta especialmente para você. Aqui estão o cardápio, o que está incluso, o investimento e as formas de pagamento. Qualquer dúvida, estou à disposição.</p>' +
    '<div class="pm-stats">' +
    '<div class="pm-stat"><small>Data</small><b>' + (pmDate(p.eventDate) || 'A definir') + '</b></div>' +
    '<div class="pm-stat"><small>Local</small><b>' + (esc(p.eventLocation) || 'A definir') + '</b></div>' +
    '<div class="pm-stat"><small>Convidados</small><b>' + (guests ? guests + ' pessoas' : 'A definir') + '</b></div></div>' +
    (p.eventDuration || p.serviceStartTime ? '<div class="pm-stats">' + (p.serviceStartTime ? '<div class="pm-stat"><small>Início</small><b>' + esc(p.serviceStartTime) + '</b></div>' : '') + (p.eventDuration ? '<div class="pm-stat"><small>Duração</small><b>' + esc(p.eventDuration) + ' horas</b></div>' : '') + '</div>' : '') +
    (total > 0 ? '<div class="pm-price"><div><small>Investimento total</small><div class="pm-v">' + pmBrl(total) + '</div></div>' + (guests ? '<div class="pm-pp">por pessoa<b>' + pmBrl(pp) + '</b></div>' : '') + '</div>' : '') +
    '<div class="pm-two">' +
    (inc.itens.length ? '<div class="pm-box"><h4>O que está incluso</h4><ul>' + inc.itens.map(function (i) { return '<li><span class="pm-ck">✓</span>' + esc(i) + '</li>'; }).join('') + '</ul></div>' : '') +
    (cats.length ? '<div class="pm-box"><h4>Cardápio</h4><ul>' + resumoMenu + '</ul></div>' : '') +
    '</div></div>' + rodape() + '</div>';

  // 3. Sobre mim
  if (temSobre) {
    html += '<div class="pm-pg"><div class="pm-main"><div class="pm-kicker">Quem prepara</div><h2>Sobre mim</h2>' +
      '<div class="pm-about' + (fotoSobre ? '' : ' pm-nofoto') + '">' +
      (fotoSobre ? '<div class="pm-ph"><img src="' + fotoSobre + '" alt=""></div>' : '') +
      '<div>' + (hist ? paragrafos(hist) : '') + '</div></div>' +
      (vals.length ? '<div class="pm-vals" style="grid-template-columns:repeat(' + vals.length + ',1fr)">' + vals.map(function (v) { return '<div class="pm-val"><h4>' + v[0] + '</h4>' + paragrafos(v[1]) + '</div>'; }).join('') + '</div>' : '') +
      (frase ? '<div class="pm-quote">“' + esc(String(frase).trim()) + '”</div>' : '') +
      '</div>' + rodape() + '</div>';
  }

  // 4. Menu
  if (dishes.length) {
    var tituloMenu = p.selectedMenuData && p.selectedMenuData.name && !/card[aá]pio do evento/i.test(p.selectedMenuData.name) ? p.selectedMenuData.name : '';
    html += '<div class="pm-pg"><div class="pm-main"><div class="pm-kicker">Cardápio do evento</div><h2>Menu' + (tituloMenu ? ' <span class="pm-mn">· ' + esc(tituloMenu) + '</span>' : '') + '</h2>' +
      (p.selectedMenuData && p.selectedMenuData.description ? '<p class="pm-lead">' + esc(p.selectedMenuData.description) + '</p>' : '') +
      '<div class="pm-menu' + (dishes.length <= 6 ? ' pm-one' : '') + '">' + menuHtml + '</div>' +
      (guests ? '<p class="pm-note">Porções calculadas para ' + guests + ' convidados.</p>' : '') +
      '</div>' + rodape() + '</div>';
  }

  // 5. Investimento e condições
  var passos = ['Aprovar a proposta'];
  if (etapas) passos.push('Pagar ' + String(etapas[0].pct).replace('.', ',') + '% para reservar a data');
  passos.push('Alinhar os detalhes finais do evento');
  html += '<div class="pm-pg"><div class="pm-main"><div class="pm-kicker">Investimento</div><h2>Valores e condições</h2>' +
    (total > 0 ? '<div class="pm-price"><div><small>Total' + (guests ? ' para ' + guests + ' convidados' : '') + '</small><div class="pm-v">' + pmBrl(total) + '</div></div>' + (guests ? '<div class="pm-pp">por pessoa<b>' + pmBrl(pp) + '</b></div>' : '') + '</div>' : '') +
    (etapas ? '<div class="pm-kicker">Forma de pagamento</div><div class="pm-steps" style="grid-template-columns:repeat(' + Math.min(etapas.length, 4) + ',1fr)">' + etapas.map(function (e) {
      return '<div class="pm-step"><div class="pm-pct">' + String(e.pct).replace('.', ',') + '%</div><div class="pm-sv">' + pmBrl(e.valor) + '</div><div class="pm-sl">' + esc(e.desc) + '</div></div>';
    }).join('') + '</div>' : (p.paymentMethod ? '<div class="pm-box pm-mb"><h4>Forma de pagamento</h4><p class="pm-txt">' + esc(p.paymentMethod) + '</p></div>' : '')) +
    (formas.length ? '<div class="pm-pay">' + formas.map(function (f) { return '<span>' + f + '</span>'; }).join('') + '</div>' : '') +
    '<div class="pm-two"><div class="pm-box"><h4>Próximos passos</h4><ul>' + passos.map(function (s, i) { return '<li><span class="pm-num">' + (i + 1) + '</span>' + esc(s) + '</li>'; }).join('') + '</ul></div>' +
    '<div class="pm-box"><h4>Validade</h4><ul>' + (p.validityDays ? '<li>Proposta válida por ' + esc(p.validityDays) + ' dias</li>' : '') + '<li>Emitida em ' + emitida + '</li>' + (p.minConfirmationDays ? '<li>Confirmação mínima: ' + esc(p.minConfirmationDays) + ' dias antes</li>' : '') + '</ul></div></div>' +
    (inc.obs ? '<div class="pm-box pm-mt"><h4>Observações</h4><p class="pm-txt">' + esc(inc.obs).replace(/\n/g, '<br>') + '</p></div>' : '') +
    '<div class="pm-signs"><div>' + esc(cliente) + '</div><div>' + esc(empresa) + '</div></div>' +
    '</div>' + rodape() + '</div>';

  html += '</div>';
  return html;
}

var PM_CSS = [
  '.pm-doc{--ink:#1c1917;--mut:#78716c;--line:#e7e5e4;--bg:#faf7f2;--acc:#ea580c;--acc2:#9a3412;--soft:#fff1e6;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink);-webkit-print-color-adjust:exact;print-color-adjust:exact;background:var(--bg);width:210mm;margin:0 auto;text-align:left;line-height:1.4}',
  '.pm-doc *{box-sizing:border-box;margin:0;padding:0}',
  '.pm-pg{width:210mm;min-height:296.5mm;position:relative;background:var(--bg);padding:18mm 18mm 0;display:flex;flex-direction:column;break-after:page;page-break-after:always;overflow:hidden}',
  '.pm-pg:last-child{break-after:auto;page-break-after:auto}',
  '.pm-main{flex:1}',
  '.pm-kicker{font-size:9pt;letter-spacing:.22em;text-transform:uppercase;color:var(--acc);font-weight:700}',
  '.pm-doc h2{font-family:Lora,Georgia,serif;font-size:30pt;font-weight:600;line-height:1.1;margin:6px 0 14px;color:var(--ink)}',
  '.pm-mn{font-size:16pt;color:var(--mut)}',
  '.pm-foot{display:flex;align-items:center;gap:10px;font-size:8pt;color:var(--mut);border-top:1px solid var(--line);padding:7px 0 9mm;margin-top:14px}',
  '.pm-foot img{width:18px;height:18px;border-radius:50%;object-fit:cover}',
  '.pm-foot b{margin-left:auto;color:var(--ink)}',
  '.pm-cover{padding:0;background:#141210;color:#fff;display:block}',
  '.pm-hero{height:168mm;position:relative;overflow:hidden}',
  '.pm-hero img{width:100%;height:100%;object-fit:cover;object-position:center;display:block}',
  '.pm-hero:after{content:"";position:absolute;left:0;right:0;top:0;bottom:0;background:linear-gradient(180deg,rgba(20,18,16,.15) 0%,rgba(20,18,16,.55) 60%,#141210 100%)}',
  '.pm-logo{position:absolute;top:16mm;left:18mm;width:64px;height:64px;border-radius:50%;background:#fff;padding:4px;z-index:2}',
  '.pm-logo img{width:100%;height:100%;border-radius:50%;object-fit:cover}',
  '.pm-nophoto .pm-logo{position:relative;top:auto;left:auto;width:120px;height:120px;margin:40mm 18mm 0}',
  '.pm-cbody{padding:0 18mm;margin-top:-28mm;position:relative;z-index:2}',
  '.pm-nophoto .pm-cbody{margin-top:14mm}',
  '.pm-cover h1{font-family:Lora,Georgia,serif;font-weight:600;font-size:40pt;line-height:1.05;margin:10px 0 6px;color:#fff}',
  '.pm-sub{color:#d6d3d1;font-size:12pt}',
  '.pm-chips{display:flex;gap:8px;margin-top:18px;flex-wrap:wrap}',
  '.pm-chips span{border:1px solid rgba(255,255,255,.28);border-radius:999px;padding:7px 14px;font-size:10pt;color:#fff}',
  '.pm-sign{position:absolute;left:18mm;right:18mm;bottom:14mm;display:flex;justify-content:space-between;align-items:flex-end;font-size:9pt;color:#a8a29e}',
  '.pm-sign b{display:block;color:#fff;font-family:Lora,Georgia,serif;font-size:14pt;font-weight:600}',
  '.pm-r{text-align:right}',
  '.pm-lead{font-size:11.5pt;line-height:1.6;color:#44403c;max-width:150mm;margin-bottom:4px}',
  '.pm-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0 0}',
  '.pm-stat{background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px 14px}',
  '.pm-stat small{display:block;font-size:8pt;letter-spacing:.14em;text-transform:uppercase;color:var(--mut)}',
  '.pm-stat b{font-size:14pt;font-weight:600}',
  '.pm-price{background:var(--ink);color:#fff;border-radius:18px;padding:18px 22px;display:flex;justify-content:space-between;align-items:center;margin:16px 0 18px}',
  '.pm-price small{color:#d6d3d1;font-size:9pt;letter-spacing:.14em;text-transform:uppercase}',
  '.pm-v{font-family:Lora,Georgia,serif;font-size:30pt;font-weight:600;color:#fdba74}',
  '.pm-pp{text-align:right;color:#d6d3d1;font-size:10pt}',
  '.pm-pp b{display:block;color:#fff;font-size:15pt}',
  '.pm-two{display:grid;grid-template-columns:1fr 1fr;gap:14px}',
  '.pm-box{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 16px;break-inside:avoid}',
  '.pm-box h4{font-size:9pt;letter-spacing:.16em;text-transform:uppercase;color:var(--acc);margin-bottom:8px}',
  '.pm-box ul{list-style:none}',
  '.pm-box li{font-size:10.5pt;padding:5px 0;border-bottom:1px dashed var(--line);display:flex;gap:8px}',
  '.pm-box li:last-child{border-bottom:none}',
  '.pm-box ol{list-style:decimal outside;padding-left:0;margin-left:18px;font-size:10.5pt;line-height:1.9;color:#44403c}',
  '.pm-txt{font-size:10.5pt;line-height:1.6;color:#44403c}',
  '.pm-mt{margin-top:14px}.pm-mb{margin-bottom:14px}',
  '.pm-ck{color:var(--acc);font-weight:700}',
  '.pm-num{flex-shrink:0;width:18px;height:18px;border-radius:50%;background:var(--acc);color:#fff;font-size:8.5pt;font-weight:700;display:inline-flex;align-items:center;justify-content:center;margin-top:1px}',
  '.pm-about{display:grid;grid-template-columns:62mm 1fr;gap:14px;align-items:start}',
  '.pm-about.pm-nofoto{grid-template-columns:1fr}',
  '.pm-ph{height:80mm;border-radius:16px;overflow:hidden}',
  '.pm-ph img{width:100%;height:100%;object-fit:cover;object-position:center top;display:block}',
  '.pm-about p{font-size:10.5pt;line-height:1.6;color:#44403c;margin-bottom:8px}',
  '.pm-vals{display:grid;gap:10px;margin-top:14px}',
  '.pm-val{background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px;font-size:9.5pt;line-height:1.5;color:#44403c;break-inside:avoid}',
  '.pm-val p{margin-bottom:4px}',
  '.pm-val h4{font-family:Lora,Georgia,serif;font-size:13pt;font-weight:600;color:var(--ink);margin-bottom:6px}',
  '.pm-quote{margin-top:16px;border-left:3px solid var(--acc);padding:6px 0 6px 14px;font-family:Lora,Georgia,serif;font-style:italic;font-weight:500;font-size:17pt;color:var(--acc2)}',
  '.pm-menu{columns:2;column-gap:12mm;margin-top:4px}',
  '.pm-menu.pm-one{columns:1;max-width:120mm}',
  '.pm-cat{break-inside:avoid;margin-bottom:14px}',
  '.pm-cat h3{display:flex;align-items:baseline;justify-content:space-between;border-bottom:1.5px solid var(--ink);padding-bottom:5px;margin-bottom:6px;font-size:9.5pt;letter-spacing:.2em;text-transform:uppercase;font-weight:700}',
  '.pm-cat h3 em{font-style:normal;color:var(--mut);font-size:8.5pt;letter-spacing:0;font-weight:600}',
  '.pm-cat ul{list-style:none}',
  '.pm-cat li{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px dotted #d6d3d1;font-size:11pt;break-inside:avoid}',
  '.pm-dot{width:7px;height:7px;border-radius:50%;background:var(--acc);flex-shrink:0}',
  '.pm-dn{flex:1}',
  '.pm-dn small{display:block;font-size:8.5pt;color:var(--mut);font-style:italic;margin-top:2px}',
  '.pm-th{width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0}',
  '.pm-note{margin-top:10px;font-size:9pt;color:var(--mut)}',
  '.pm-steps{display:grid;gap:10px;margin:10px 0 14px}',
  '.pm-step{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;border-top:4px solid var(--acc)}',
  '.pm-pct{font-size:9pt;font-weight:700;color:var(--acc);letter-spacing:.1em}',
  '.pm-sv{font-family:Lora,Georgia,serif;font-size:17pt;font-weight:600;margin:4px 0}',
  '.pm-sl{font-size:10pt;font-weight:600}',
  '.pm-pay{display:flex;gap:8px;margin:0 0 16px;flex-wrap:wrap}',
  '.pm-pay span{background:var(--soft);color:var(--acc2);border-radius:999px;padding:6px 12px;font-size:9.5pt;font-weight:600}',
  '.pm-signs{display:grid;grid-template-columns:1fr 1fr;gap:16mm;margin-top:20mm}',
  '.pm-signs div{border-top:1px solid var(--ink);padding-top:6px;font-size:9pt;color:var(--mut)}',
  '@media print{.pm-doc{zoom:1!important;margin:0}}'
].join('\n');

if (typeof window !== 'undefined') window.ProposalModern = { render: pmRender, payment: pmPayment, included: pmIncluded };
})();
