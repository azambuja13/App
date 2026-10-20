(function () {
'use strict';
/**
 * Ficha técnica do prato (out/2026)
 * - Navegador: abre janela de impressão (ou iframe, se o pop-up for bloqueado)
 * - App do iPhone (WKWebView não imprime nem abre janela): gera PDF com jsPDF
 *   e abre a folha de compartilhamento do iOS (Imprimir / Salvar / WhatsApp).
 *   Compartilha só o arquivo: com "title" o iOS salva também um .txt
 * - Custo para N convidados (usado no card do prato)
 */

var CATS = { entrada: 'Entrada', principal: 'Principal', acompanhamento: 'Acompanhamento', sobremesa: 'Sobremesa', bebida: 'Bebida' };
var MIL = ['kg', 'l', 'lt', 'litro', 'litros'];

function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
function brl(v) { return 'R$ ' + num(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtN(v, max) { return num(v).toLocaleString('pt-BR', { maximumFractionDigits: max == null ? 3 : max }); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function peso(g) { g = num(g); return g >= 1000 ? fmtN(g / 1000, 2) + ' kg' : fmtN(g, 0) + ' g'; }

// Mesma conta do cadastro: kg/L viram g/ml; custo = quantidade × custo unitário (perda só reduz o peso final)
function linhas(dish) {
  return (dish.ingredients || []).map(function (i) {
    var u = String(i.unit || 'g').trim();
    var ul = u.toLowerCase();
    var q = num(i.quantity);
    var uc = num(i.unitCost);
    var base = MIL.indexOf(ul) >= 0 ? q * 1000 : q;
    var custoUnit;
    if (ul === 'g' || ul === 'kg') custoUnit = brl(uc * 1000) + '/kg';
    else if (ul === 'ml' || MIL.indexOf(ul) >= 0) custoUnit = brl(uc * 1000) + '/L';
    else custoUnit = brl(uc) + '/' + u;
    return {
      nome: i.ingredientName || i.name || (i.ingredient && i.ingredient.name) || 'Ingrediente',
      qtd: fmtN(q) + ' ' + u,
      custoUnit: custoUnit,
      total: base * uc,
      descartado: !!i.isDiscarded,
      perda: num(i.lossPercentage)
    };
  });
}

/**
 * Custo do prato para N convidados.
 * porções por pessoa = do cardápio (se o prato estiver nele) ou 1.
 * Prato por porção (useWeightCalculation ou sem peso): custo/porções × porções × convidados
 * Prato por peso: porção = 100 g
 */
function paraConvidados(dish, guests, porcoesPorPessoa) {
  guests = parseInt(guests, 10) || 0;
  var pp = num(porcoesPorPessoa) > 0 ? num(porcoesPorPessoa) : 1;
  var custo = num(dish.totalCost);
  var servings = num(dish.servings);
  var totalWeight = num(dish.totalWeight);
  if (guests <= 0 || custo <= 0) return null;
  var porPorcao = dish.useWeightCalculation || (servings > 0 && totalWeight === 0);
  var receitas, porPessoa;
  if (porPorcao) {
    var s = servings > 0 ? servings : 1;
    porPessoa = custo / s * pp;
    receitas = guests * pp / s;
  } else {
    var g = pp * 100;
    porPessoa = totalWeight > 0 ? custo / totalWeight * g : custo;
    receitas = totalWeight > 0 ? guests * g / totalWeight : guests;
  }
  return { guests: guests, porcoes: pp, porPorcao: !!porPorcao, porPessoa: porPessoa, total: porPessoa * guests, receitas: receitas };
}

// CMV do prato (custo ÷ preço sugerido) e a meta de Custos da empresa
function precoCmv(dish) {
  var P = window.PricingRules;
  var c = P && P.dishCmv ? P.dishCmv(dish) : null;
  if (!c) return null;
  var st = P.cmvStatus(c.cmvPct);
  return { preco: c.preco, base: c.base, texto: fmtN(c.cmvPct, 1) + '%' + (st ? ' (meta ' + fmtN(st.meta, 1) + '%)' : '') };
}

function html(dish) {
  var ls = linhas(dish);
  var soma = ls.reduce(function (a, l) { return a + l.total; }, 0);
  var custo = num(dish.totalCost) || soma;
  var servings = num(dish.servings);
  var info = [
    ['Categoria', CATS[dish.category] || dish.category || '—'],
    ['Ingredientes', ls.length + (ls.length === 1 ? ' ingrediente' : ' ingredientes')],
    ['Custo total', brl(custo)],
    ['Peso total', peso(dish.totalWeight)]
  ];
  if (servings > 0) { info.push(['Rendimento', fmtN(servings) + (servings === 1 ? ' porção' : ' porções')]); info.push(['Custo por porção', brl(custo / servings)]); }
  var cmv = precoCmv(dish);
  if (cmv) { info.push(['Preço sugerido (por ' + cmv.base + ')', brl(cmv.preco)]); info.push(['CMV (custo ÷ preço)', cmv.texto]); }
  var agora = new Date();
  return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>Ficha Técnica - ' + esc(dish.name) + '</title><style>' +
    '*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;padding:14mm;line-height:1.5;color:#333;background:#fff}' +
    '.hd{text-align:center;border-bottom:3px solid #2563eb;padding-bottom:12px;margin-bottom:18px}.hd h1{font-size:26px;color:#1e40af;margin-bottom:4px}' +
    '.hd .sub{font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:1px}.sec{margin-bottom:18px}' +
    '.st{font-size:15px;font-weight:bold;color:#1e40af;background:#eff6ff;padding:7px 12px;border-left:4px solid #2563eb;margin-bottom:10px}' +
    '.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.it{padding:9px;background:#f8fafc;border-radius:4px;border:1px solid #e2e8f0}' +
    '.lb{font-size:11px;color:#64748b;text-transform:uppercase;margin-bottom:3px}.vl{font-size:15px;font-weight:bold;color:#1e293b}' +
    'table{width:100%;border-collapse:collapse}th{background:#1e40af;color:#fff;padding:8px;text-align:left;font-size:12px}' +
    'td{padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:13px}tr:nth-child(even) td{background:#f8fafc}tfoot td{font-weight:bold;background:#eff6ff!important}' +
    '.r{text-align:right}.c{text-align:center}.tag{font-size:10px;color:#92400e;background:#fef3c7;border-radius:3px;padding:1px 4px;margin-left:4px}' +
    '.box{background:#fef3c7;border:2px solid #fbbf24;border-radius:6px;padding:14px;white-space:pre-wrap;color:#78350f;line-height:1.7}' +
    '.obs{padding:10px;background:#f8fafc;border-radius:4px;color:#475569;white-space:pre-wrap}' +
    '.ft{margin-top:26px;padding-top:12px;border-top:2px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8}' +
    '*{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{size:A4;margin:10mm}@media print{body{padding:0}.sec{break-inside:avoid}tr{break-inside:avoid}}' +
    '</style></head><body>' +
    '<div class="hd"><h1>' + esc(dish.name) + '</h1><div class="sub">Ficha Técnica de Produção</div></div>' +
    '<div class="sec"><div class="st">Informações gerais</div><div class="grid">' +
    info.map(function (x) { return '<div class="it"><div class="lb">' + x[0] + '</div><div class="vl">' + esc(x[1]) + '</div></div>'; }).join('') + '</div>' +
    (dish.description ? '<p style="color:#475569;font-style:italic;margin-top:10px">"' + esc(dish.description) + '"</p>' : '') + '</div>' +
    '<div class="sec" style="break-inside:auto"><div class="st">Ingredientes</div><table><thead><tr><th style="width:42%">Ingrediente</th><th class="c" style="width:18%">Quantidade</th><th class="r" style="width:20%">Custo unit.</th><th class="r" style="width:20%">Custo</th></tr></thead><tbody>' +
    (ls.length ? ls.map(function (l) {
      return '<tr><td><strong>' + esc(l.nome) + '</strong>' + (l.perda > 0 ? '<span class="tag">perda ' + fmtN(l.perda, 1) + '%</span>' : '') + (l.descartado ? '<span class="tag">descartado</span>' : '') + '</td><td class="c">' + esc(l.qtd) + '</td><td class="r">' + esc(l.custoUnit) + '</td><td class="r"><strong>' + brl(l.total) + '</strong></td></tr>';
    }).join('') : '<tr><td colspan="4" class="c" style="color:#94a3b8">Nenhum ingrediente cadastrado</td></tr>') +
    '</tbody>' + (ls.length ? '<tfoot><tr><td colspan="3">Total</td><td class="r">' + brl(soma) + '</td></tr></tfoot>' : '') + '</table></div>' +
    (dish.technicalSheet ? '<div class="sec" style="break-inside:auto"><div class="st">Modo de preparo</div><div class="box">' + esc(dish.technicalSheet) + '</div></div>' : '') +
    (dish.observations ? '<div class="sec"><div class="st">Observações</div><div class="obs">' + esc(dish.observations) + '</div></div>' : '') +
    '<div class="ft">Ficha técnica gerada em ' + agora.toLocaleDateString('pt-BR') + ' às ' + agora.toLocaleTimeString('pt-BR') + '</div>' +
    '</body></html>';
}

// ---------- PDF (jsPDF, sem depender de impressão do navegador) ----------
function pdf(dish) {
  var J = window.jspdf && window.jspdf.jsPDF;
  if (!J) throw new Error('jsPDF não carregado');
  var doc = new J({ unit: 'mm', format: 'a4' });
  var W = 210, M = 14, Y = 16, LW = W - 2 * M, H = 297, BOT = H - 16;
  var azul = [30, 64, 175], cinza = [100, 116, 139], tinta = [30, 41, 59];
  var limpa = function (s) { return String(s == null ? '' : s).replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').replace(/[≈]/g, '~'); };
  var nova = function () { doc.addPage(); Y = 16; };
  var cabe = function (h) { if (Y + h > BOT) nova(); };
  var titulo = function (t) {
    cabe(14);
    doc.setFillColor(239, 246, 255); doc.rect(M, Y, LW, 8, 'F');
    doc.setFillColor(37, 99, 235); doc.rect(M, Y, 1.2, 8, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(azul[0], azul[1], azul[2]);
    doc.text(t, M + 4, Y + 5.5); Y += 11;
  };
  var ls = linhas(dish);
  var soma = ls.reduce(function (a, l) { return a + l.total; }, 0);
  var custo = num(dish.totalCost) || soma;
  var servings = num(dish.servings);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(azul[0], azul[1], azul[2]);
  var nomeL = doc.splitTextToSize(limpa(dish.name || 'Prato'), LW);
  doc.text(nomeL, W / 2, Y, { align: 'center' }); Y += nomeL.length * 7;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(cinza[0], cinza[1], cinza[2]);
  doc.text('FICHA TÉCNICA DE PRODUÇÃO', W / 2, Y, { align: 'center' }); Y += 3;
  doc.setDrawColor(37, 99, 235); doc.setLineWidth(0.8); doc.line(M, Y, W - M, Y); Y += 7;

  titulo('Informações gerais');
  var info = [
    ['CATEGORIA', CATS[dish.category] || dish.category || '—'],
    ['INGREDIENTES', String(ls.length)],
    ['CUSTO TOTAL', brl(custo)],
    ['PESO TOTAL', peso(dish.totalWeight)]
  ];
  if (servings > 0) { info.push(['RENDIMENTO', fmtN(servings) + (servings === 1 ? ' porção' : ' porções')]); info.push(['CUSTO POR PORÇÃO', brl(custo / servings)]); }
  var cmvP = precoCmv(dish);
  if (cmvP) { info.push(['PREÇO SUGERIDO (POR ' + cmvP.base.toUpperCase() + ')', brl(cmvP.preco)]); info.push(['CMV (CUSTO ÷ PREÇO)', cmvP.texto]); }
  var bw = (LW - 4) / 2, bh = 13;
  info.forEach(function (x, k) {
    var col = k % 2, x0 = M + col * (bw + 4);
    if (col === 0) cabe(bh + 3);
    doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2);
    doc.roundedRect(x0, Y, bw, bh, 1.2, 1.2, 'FD');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(cinza[0], cinza[1], cinza[2]); doc.text(x[0], x0 + 3, Y + 4.5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(tinta[0], tinta[1], tinta[2]); doc.text(limpa(x[1]), x0 + 3, Y + 10);
    if (col === 1 || k === info.length - 1) Y += bh + 3;
  });
  if (dish.description) {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(9.5); doc.setTextColor(71, 85, 105);
    var dl = doc.splitTextToSize('"' + limpa(dish.description) + '"', LW);
    cabe(dl.length * 4.5); doc.text(dl, M, Y + 2); Y += dl.length * 4.5 + 3;
  }
  Y += 3;

  titulo('Ingredientes');
  var cx = [M, M + LW * 0.46, M + LW * 0.78, W - M]; // nome | qtd (centro) | unit (dir) | total (dir)
  var head = function () {
    doc.setFillColor(30, 64, 175); doc.rect(M, Y, LW, 7, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
    doc.text('Ingrediente', M + 2, Y + 4.8);
    doc.text('Quantidade', M + LW * 0.38, Y + 4.8, { align: 'center' });
    doc.text('Custo unit.', cx[2] - 2, Y + 4.8, { align: 'right' });
    doc.text('Custo', cx[3] - 2, Y + 4.8, { align: 'right' });
    Y += 7;
  };
  head();
  ls.forEach(function (l, k) {
    var extra = (l.perda > 0 ? ' (perda ' + fmtN(l.perda, 1) + '%)' : '') + (l.descartado ? ' (descartado)' : '');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    var nl = doc.splitTextToSize(limpa(l.nome) + extra, LW * 0.30);
    var rh = Math.max(6.5, nl.length * 4 + 2.5);
    if (Y + rh > BOT) { nova(); head(); }
    if (k % 2) { doc.setFillColor(248, 250, 252); doc.rect(M, Y, LW, rh, 'F'); }
    doc.setTextColor(tinta[0], tinta[1], tinta[2]); doc.text(nl, M + 2, Y + 4.3);
    doc.setFont('helvetica', 'normal');
    doc.text(limpa(l.qtd), M + LW * 0.38, Y + 4.3, { align: 'center' });
    doc.text(limpa(l.custoUnit), cx[2] - 2, Y + 4.3, { align: 'right' });
    doc.setFont('helvetica', 'bold'); doc.text(brl(l.total), cx[3] - 2, Y + 4.3, { align: 'right' });
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2); doc.line(M, Y + rh, W - M, Y + rh);
    Y += rh;
  });
  if (!ls.length) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(148, 163, 184); doc.text('Nenhum ingrediente cadastrado', W / 2, Y + 5, { align: 'center' }); Y += 8; }
  else {
    cabe(8); doc.setFillColor(239, 246, 255); doc.rect(M, Y, LW, 7, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(azul[0], azul[1], azul[2]);
    doc.text('Total', M + 2, Y + 4.8); doc.text(brl(soma), cx[3] - 2, Y + 4.8, { align: 'right' }); Y += 7;
  }
  Y += 6;

  var bloco = function (t, txt, cor) {
    titulo(t);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(cor[0], cor[1], cor[2]);
    var tl = doc.splitTextToSize(limpa(txt), LW - 6);
    tl.forEach(function (ln) { cabe(5); doc.text(ln, M + 3, Y + 3.5); Y += 4.6; });
    Y += 5;
  };
  if (dish.technicalSheet) bloco('Modo de preparo', dish.technicalSheet, [120, 53, 15]);
  if (dish.observations) bloco('Observações', dish.observations, [71, 85, 105]);

  var agora = new Date();
  var n = doc.getNumberOfPages();
  for (var p = 1; p <= n; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
    doc.text('Ficha técnica gerada em ' + agora.toLocaleDateString('pt-BR') + ' às ' + agora.toLocaleTimeString('pt-BR').slice(0, 5) + (n > 1 ? '  ·  ' + p + '/' + n : ''), W / 2, H - 8, { align: 'center' });
  }
  return doc.output('blob');
}

function slug(s) { return String(s || 'prato').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 50) || 'prato'; }

function isNative() { return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()); }

// Botão com toque novo do usuário (navigator.share exige gesto recente)
function overlayCompartilhar(file) {
  var old = document.getElementById('dish-sheet-share'); if (old) old.remove();
  var ov = document.createElement('div');
  ov.id = 'dish-sheet-share';
  ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px';
  ov.innerHTML = '<div style="background:#fff;border-radius:16px;padding:22px;max-width:340px;width:100%;text-align:center;font-family:-apple-system,system-ui,sans-serif">' +
    '<div style="font-size:17px;font-weight:700;margin-bottom:6px;color:#1e293b">Ficha técnica pronta</div>' +
    '<div style="font-size:14px;color:#64748b;margin-bottom:16px">Toque para imprimir, salvar ou enviar.</div>' +
    '<button data-a="s" style="width:100%;padding:12px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-size:16px;font-weight:600;margin-bottom:8px">Imprimir / Compartilhar</button>' +
    '<button data-a="c" style="width:100%;padding:10px;border:0;border-radius:10px;background:#f1f5f9;color:#334155;font-size:15px">Fechar</button></div>';
  ov.addEventListener('click', function (e) {
    var a = e.target && e.target.getAttribute && e.target.getAttribute('data-a');
    if (e.target === ov || a === 'c') { ov.remove(); return; }
    if (a === 's') {
      navigator.share({ files: [file] }).then(function () { ov.remove(); }).catch(function (err) {
        if (err && err.name === 'AbortError') { ov.remove(); return; }
        alert('Não foi possível abrir o compartilhamento: ' + (err && err.message || err));
      });
    }
  });
  document.body.appendChild(ov);
}

function compartilharPDF(dish) {
  var blob = pdf(dish);
  var file = new File([blob], 'ficha-' + slug(dish.name) + '.pdf', { type: 'application/pdf' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    return navigator.share({ files: [file] }).catch(function (err) {
      if (err && err.name === 'AbortError') return;
      overlayCompartilhar(file); // gesto expirou → pede um toque novo
    });
  }
  // Sem Web Share: baixa o arquivo
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a'); a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
}

function imprimirNavegador(dish, janela) {
  var h = html(dish).replace('</body>', '<script>window.onload=function(){setTimeout(function(){window.print()},150)}<\/script></body>');
  if (janela && !janela.closed) {
    janela.document.open(); janela.document.write(h); janela.document.close();
    return;
  }
  // Pop-up bloqueado → imprime por um iframe escondido
  var fr = document.createElement('iframe');
  fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(fr);
  var d = fr.contentWindow.document;
  d.open(); d.write(html(dish)); d.close();
  setTimeout(function () {
    try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { console.error(e); }
    setTimeout(function () { fr.remove(); }, 60000);
  }, 300);
}

async function completo(dish) {
  if (dish && dish.ingredients && dish.ingredients.length) return dish;
  try {
    var api = window.PrecificacaoAPI && window.PrecificacaoAPI.api;
    if (api && dish && dish.id) { var r = await api.getDish(dish.id); var d = r && (r.data || r); if (d && d.ingredients) return d; }
  } catch (e) { console.warn('[DishSheet] não carregou ingredientes:', e && e.message); }
  return dish;
}

/** Ponto de entrada: chamar direto no clique */
function print(dish) {
  if (!dish) return Promise.resolve();
  if (isNative()) {
    var temIng = dish.ingredients && dish.ingredients.length;
    if (temIng) { try { return Promise.resolve(compartilharPDF(dish)); } catch (e) { return Promise.reject(e); } }
    return completo(dish).then(compartilharPDF);
  }
  // Abre a janela já no clique (evita bloqueio de pop-up) e preenche depois
  var janela = null;
  try { janela = window.open('', '_blank'); } catch (e) { janela = null; }
  if (janela) { try { janela.document.write('<p style="font-family:sans-serif;padding:20px">Gerando ficha técnica…</p>'); } catch (e) { /* ignore */ } }
  return completo(dish).then(function (d) { imprimirNavegador(d, janela); });
}

window.DishSheet = { print: print, html: html, pdf: pdf, linhas: linhas, paraConvidados: paraConvidados };
})();
