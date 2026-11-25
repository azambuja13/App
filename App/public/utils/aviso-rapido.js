/**
 * Aviso rápido — nov/2026.
 *
 * Para confirmar que algo deu certo sem parar a pessoa. Antes o app abria a caixa do navegador
 * ("app.chefazambuja.com diz… OK"), que trava a tela até tocar em OK: para pôr 8 pratos no cardápio eram
 * 8 toques a mais. Este aviso aparece embaixo, some sozinho e pode trazer um botão (ex.: "Ver cardápio").
 * Um aviso novo troca o anterior. Erro continua na caixa do navegador: erro precisa ser lido.
 *
 * Uso: window.AvisoRapido.mostrar('Texto', { acao: { rotulo: 'Ver cardápio', aoTocar: fn }, ms: 4000 })
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || window.AvisoRapido) return;
  var relogio = null;
  function estilo() {
    if (document.getElementById('aviso-rapido-css')) return;
    var st = document.createElement('style'); st.id = 'aviso-rapido-css';
    st.textContent =
      '#aviso-rapido{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9500;display:flex;align-items:center;gap:12px;' +
      'max-width:min(560px,calc(100vw - 24px));background:#1f2937;color:#fff;border-radius:12px;padding:12px 14px;font-size:15px;line-height:1.35;' +
      'box-shadow:0 10px 30px rgba(0,0,0,.28);animation:aviso-rapido-sobe .18s ease-out}' +
      '@media (max-width:1023px){#aviso-rapido{bottom:calc(96px + env(safe-area-inset-bottom,0px));width:calc(100vw - 24px)}}' +
      '#aviso-rapido .ar-texto{flex:1;min-width:0;overflow-wrap:anywhere;white-space:pre-line}' +
      '#aviso-rapido .ar-acao{flex:0 0 auto;background:#ea580c!important;color:#fff!important;border:0!important;border-radius:9px!important;padding:8px 12px!important;min-height:36px!important;font-size:14px!important;font-weight:600!important;white-space:nowrap}' +
      '#aviso-rapido .ar-fechar{flex:0 0 auto;background:none!important;color:#d1d5db!important;border:0!important;padding:4px 6px!important;min-height:32px!important;font-size:18px!important;line-height:1!important}' +
      '@keyframes aviso-rapido-sobe{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}' +
      '@media (prefers-reduced-motion:reduce){#aviso-rapido{animation:none}}';
    document.head.appendChild(st);
  }
  function fechar() { if (relogio) { clearTimeout(relogio); relogio = null; } var e = document.getElementById('aviso-rapido'); if (e) e.remove(); }
  function mostrar(texto, opc) {
    opc = opc || {};
    estilo(); fechar();
    var e = document.createElement('div'); e.id = 'aviso-rapido'; e.setAttribute('role', 'status'); e.setAttribute('aria-live', 'polite'); e.setAttribute('data-testid', 'aviso-rapido');
    var t = document.createElement('span'); t.className = 'ar-texto'; t.textContent = String(texto || ''); e.appendChild(t);
    if (opc.acao && opc.acao.rotulo && typeof opc.acao.aoTocar === 'function') {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'ar-acao'; b.setAttribute('data-testid', 'aviso-rapido-acao'); b.textContent = opc.acao.rotulo;
      b.onclick = function () { fechar(); try { opc.acao.aoTocar(); } catch (err) { console.error(err); } };
      e.appendChild(b);
    }
    var x = document.createElement('button'); x.type = 'button'; x.className = 'ar-fechar'; x.setAttribute('aria-label', 'Fechar aviso'); x.textContent = '×'; x.onclick = fechar; e.appendChild(x);
    document.body.appendChild(e);
    var ms = opc.ms || (opc.acao ? 5000 : 3500);
    var arma = function () { relogio = setTimeout(fechar, ms); };
    // com o mouse em cima (ou o dedo no botão), não some
    e.addEventListener('mouseenter', function () { if (relogio) { clearTimeout(relogio); relogio = null; } });
    e.addEventListener('mouseleave', arma);
    arma();
    return e;
  }
  /**
   * Para as mensagens de "deu certo" que antes usavam a caixa do navegador: mostra o aviso que some sozinho,
   * por um tempo proporcional ao tamanho do texto. Texto que pede atenção (⚠ ou "Atenção") continua na caixa.
   */
  function sucesso(texto) {
    var t = String(texto == null ? '' : texto);
    if (/\u26A0|Aten\u00E7\u00E3o|ATEN\u00C7\u00C3O/.test(t)) { window.alert(t); return; }
    t = t.replace(/^\u2705\s*/, '\u2713 ').replace(/\n{2,}/g, '\n');
    mostrar(t, { ms: Math.max(3500, Math.min(10000, 2500 + t.length * 45)) });
  }
  window.AvisoRapido = { mostrar: mostrar, fechar: fechar, sucesso: sucesso };
  window.avisarSucesso = sucesso;
})();
