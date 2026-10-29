(function () {
'use strict';
/**
 * ShareFile (out/2026) — imprimir / salvar arquivos no navegador e no app do iPhone.
 *
 * O app do iPhone (Capacitor/WKWebView) não tem window.print(), não abre janela nova
 * e não baixa arquivos (<a download>). Nele:
 *   - impressão vira PDF (html2canvas + jsPDF, já carregados no index.html)
 *   - o arquivo vai para a folha de compartilhamento do iOS (Imprimir / Salvar em Arquivos / WhatsApp)
 * Compartilha SÓ o arquivo: com "title"/"text" o iOS salva também um .txt.
 * Se o gesto do toque expirar (PDF demorou), mostra um botão para o usuário tocar de novo.
 *
 * API:
 *   ShareFile.isNative()
 *   ShareFile.saveFile(file)                 → iPhone: compartilhar · navegador: baixar
 *   ShareFile.shareFile(file)                → compartilhar (ou baixar se não houver Web Share)
 *   ShareFile.printHtml(html, { fileName })  → navegador: janela de impressão (iframe se pop-up bloqueado)
 *                                              iPhone: PDF + compartilhar. Chamar direto no clique.
 *   ShareFile.elementToPdfFile(el, fileName, { ignore })  → File (PDF) de um elemento da página
 *   ShareFile.htmlToPdfFile(html, fileName)  → File (PDF) de um HTML completo
 */

function isNative() {
  return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
}

function download(file) {
  var url = URL.createObjectURL(file);
  var a = document.createElement('a');
  a.href = url; a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
}

function overlay(file) {
  var old = document.getElementById('share-file-overlay'); if (old) old.remove();
  var ov = document.createElement('div');
  ov.id = 'share-file-overlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px';
  ov.innerHTML = '<div style="background:#fff;border-radius:16px;padding:22px;max-width:340px;width:100%;text-align:center;font-family:-apple-system,system-ui,sans-serif">' +
    '<div style="font-size:17px;font-weight:700;margin-bottom:6px;color:#1e293b">Arquivo pronto</div>' +
    '<div style="font-size:14px;color:#64748b;margin-bottom:16px;word-break:break-all"></div>' +
    '<button data-a="s" style="width:100%;padding:12px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-size:16px;font-weight:600;margin-bottom:8px">Imprimir / Compartilhar</button>' +
    '<button data-a="c" style="width:100%;padding:10px;border:0;border-radius:10px;background:#f1f5f9;color:#334155;font-size:15px">Fechar</button></div>';
  ov.querySelector('div > div:nth-child(2)').textContent = file.name;
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

function shareFile(file) {
  if (navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
    return navigator.share({ files: [file] }).catch(function (err) {
      if (err && err.name === 'AbortError') return;
      overlay(file); // gesto expirou → pede um toque novo
    });
  }
  download(file);
  return Promise.resolve();
}

function saveFile(file) {
  return isNative() ? shareFile(file) : (download(file), Promise.resolve());
}

// ---------- PDF a partir de canvas / elemento / HTML ----------
function canvasToPdfBlob(canvas) {
  var J = window.jspdf && window.jspdf.jsPDF;
  if (!J) throw new Error('jsPDF não carregado');
  var doc = new J({ unit: 'mm', format: 'a4' });
  var W = 210, H = 297;
  var pxPorMm = canvas.width / W;
  var alturaPagPx = Math.floor(H * pxPorMm);
  var y = 0, primeira = true;
  while (y < canvas.height) {
    var h = Math.min(alturaPagPx, canvas.height - y);
    if (!primeira && h < pxPorMm * 3) break; // sobra de arredondamento (menos de 3 mm): não cria página em branco
    var c = document.createElement('canvas');
    c.width = canvas.width; c.height = h;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    if (!primeira) doc.addPage();
    doc.addImage(c.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, W, h / pxPorMm);
    primeira = false;
    y += h;
  }
  return doc.output('blob');
}

function escala(w, h) {
  // iOS limita o canvas a ~16,7 milhões de pixels
  var s = 2;
  while (s > 0.6 && w * s * h * s > 15000000) s -= 0.2;
  return s;
}

function esperarImagens(doc) {
  var imgs = Array.prototype.slice.call(doc.images || []);
  return Promise.all(imgs.map(function (im) {
    if (im.complete) return null;
    return new Promise(function (r) { im.onload = im.onerror = r; setTimeout(r, 4000); });
  }));
}

function elementToPdfFile(el, fileName, opts) {
  opts = opts || {};
  if (typeof window.html2canvas !== 'function') return Promise.reject(new Error('html2canvas não carregado'));
  var ignore = opts.ignore || function (n) { return n.classList && (n.classList.contains('print:hidden') || n.classList.contains('no-print')); };
  return esperarImagens(el.ownerDocument).then(function () {
    var w = el.scrollWidth, h = el.scrollHeight;
    return window.html2canvas(el, { scale: escala(w, h), useCORS: true, backgroundColor: '#ffffff', ignoreElements: ignore, windowWidth: Math.max(w, 794) });
  }).then(function (canvas) {
    return new File([canvasToPdfBlob(canvas)], fileName || 'documento.pdf', { type: 'application/pdf' });
  });
}

function htmlToPdfFile(html, fileName) {
  return new Promise(function (resolve, reject) {
    var fr = document.createElement('iframe');
    fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;background:#fff';
    document.body.appendChild(fr);
    var d = fr.contentWindow.document;
    // sem scripts de impressão automática
    d.open(); d.write(String(html).replace(/<script[\s\S]*?<\/script>/gi, '')); d.close();
    setTimeout(function () {
      elementToPdfFile(d.body, fileName).then(function (f) { fr.remove(); resolve(f); }, function (e) { fr.remove(); reject(e); });
    }, 300);
  });
}

function printHtml(html, opts) {
  opts = opts || {};
  if (isNative()) {
    return htmlToPdfFile(html, opts.fileName || 'documento.pdf').then(shareFile);
  }
  var comPrint = String(html).replace(/<\/body>/i, '<script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></body>');
  var w = null;
  try { w = window.open('', '_blank'); } catch (e) { w = null; }
  if (w && !w.closed) {
    w.document.open(); w.document.write(comPrint); w.document.close();
    try { w.focus(); } catch (e) { /* ignore */ }
    return Promise.resolve();
  }
  // Pop-up bloqueado → iframe escondido
  var fr = document.createElement('iframe');
  fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(fr);
  var d = fr.contentWindow.document;
  d.open(); d.write(String(html).replace(/<script[\s\S]*?<\/script>/gi, '')); d.close();
  return new Promise(function (r) {
    setTimeout(function () {
      try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { console.error(e); }
      setTimeout(function () { fr.remove(); }, 60000);
      r();
    }, 400);
  });
}

window.ShareFile = {
  isNative: isNative, saveFile: saveFile, shareFile: shareFile, download: download,
  printHtml: printHtml, elementToPdfFile: elementToPdfFile, htmlToPdfFile: htmlToPdfFile
};
})();
