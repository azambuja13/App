(function () {
'use strict';
/**
 * Agenda (nov/2026) — salvar o evento de uma proposta fechada no calendário.
 *
 *   - App do iPhone: abre a tela nativa "Novo evento" do Calendário (plugin Agenda, EventKitUI).
 *     Não pede permissão: o usuário confere e toca em "Adicionar".
 *   - Navegador (Mac, PC, iPhone no Safari): baixa um arquivo .ics, que abre no Calendário
 *     da Apple, no Outlook etc.
 *   - Google Agenda: abre a tela de novo evento do Google já preenchida (em qualquer aparelho).
 *
 * API:
 *   Agenda.abrir({ proposal, aprovada })  → janela com as opções (aprovada: veio do "Aprovar")
 *   Agenda.aoAprovar(proposal)            → igual, mas respeita "Não perguntar ao aprovar"
 *   Agenda.evento(proposal)               → { titulo, data, inicio, duracaoH, local, notas, uid }
 *   Agenda.googleUrl(ev) · Agenda.ics(ev)
 */

var CHAVE_PADRAO = 'agenda_padrao_v1';     // { inicio, duracaoH } usados da última vez
var CHAVE_PERGUNTAR = 'agenda_ao_aprovar_v1'; // '0' = não abrir sozinho ao aprovar

function ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function gravar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function padrao() { try { return JSON.parse(ler(CHAVE_PADRAO) || '{}') || {}; } catch (e) { return {}; } }

var pad = function (n) { return String(n).padStart(2, '0'); };
var brl = function (v) { return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };

// "2026-12-10", ISO ou "10/12/2026" -> "2026-12-10" (sem mexer no fuso, para não mudar o dia)
function diaDe(v) {
  if (!v) return '';
  var s = String(v).trim();
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  var br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return br[3] + '-' + br[2] + '-' + br[1];
  return '';
}
function horaDe(v) {
  var m = String(v || '').match(/(\d{1,2})[:hH](\d{2})?/);
  if (!m) return '';
  var h = Number(m[1]), mi = Number(m[2] || 0);
  return h < 24 && mi < 60 ? pad(h) + ':' + pad(mi) : '';
}

function campo(p, k) {
  var d = (p && p.proposalData) || {};
  return (p && p[k] != null && p[k] !== '') ? p[k] : d[k];
}

function evento(p) {
  p = p || {};
  var cliente = campo(p, 'clientName') || (p.client && p.client.name) || '';
  var nome = p.proposalName || p.title || 'Evento';
  var titulo = cliente && nome.toLowerCase().indexOf(String(cliente).toLowerCase()) === -1 ? nome + ' – ' + cliente : nome;
  var tel = campo(p, 'clientPhone') || (p.client && p.client.phone) || '';
  var pratos = (p.dishes || []).map(function (d) { return d && (d.dishName || d.name); }).filter(Boolean);
  var notas = [
    cliente && 'Cliente: ' + cliente,
    tel && 'Telefone: ' + tel,
    p.guests && 'Convidados: ' + p.guests,
    Number(p.finalTotal) > 0 && 'Valor: ' + brl(p.finalTotal),
    p.proposalNumber && 'Proposta nº ' + p.proposalNumber,
    pratos.length && 'Cardápio: ' + pratos.slice(0, 15).join(', ') + (pratos.length > 15 ? ' e mais ' + (pratos.length - 15) : ''),
    '',
    'Salvo pela Calculadora de Precificação'
  ].filter(function (x) { return x !== false && x !== null && x !== undefined && x !== 0; }).join('\n');
  var pd = padrao();
  var dur = Number(String(campo(p, 'eventDuration') || '').replace(',', '.'));
  return {
    uid: 'proposta-' + (p.id || Date.now()) + '@chefazambuja.com',
    titulo: titulo,
    data: diaDe(p.eventDate || campo(p, 'eventDate')),
    inicio: horaDe(campo(p, 'serviceStartTime')) || pd.inicio || '',
    duracaoH: dur > 0 && dur <= 48 ? dur : (Number(pd.duracaoH) > 0 ? Number(pd.duracaoH) : 5),
    local: campo(p, 'eventLocation') || '',
    notas: notas
  };
}

// ---------- datas ----------
function compacto(dia) { return dia.replace(/-/g, ''); }
function somaDias(dia, n) {
  var a = dia.split('-').map(Number);
  var d = new Date(a[0], a[1] - 1, a[2] + n, 12);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
// início e fim no horário local: ["20261210T190000", "20261211T000000"]
function periodo(ev) {
  var a = ev.data.split('-').map(Number), hm = ev.inicio.split(':').map(Number);
  var ini = new Date(a[0], a[1] - 1, a[2], hm[0], hm[1], 0);
  var fim = new Date(ini.getTime() + Math.max(0.25, Number(ev.duracaoH) || 5) * 3600000);
  var f = function (d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00'; };
  return [f(ini), f(fim)];
}

// ---------- Google Agenda ----------
function googleUrl(ev) {
  var datas = ev.inicio ? periodo(ev).join('/') : compacto(ev.data) + '/' + compacto(somaDias(ev.data, 1));
  var q = 'action=TEMPLATE&text=' + encodeURIComponent(ev.titulo) + '&dates=' + datas +
    '&details=' + encodeURIComponent(ev.notas || '') + (ev.local ? '&location=' + encodeURIComponent(ev.local) : '');
  try { var tz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (ev.inicio && tz) q += '&ctz=' + encodeURIComponent(tz); } catch (e) {}
  return 'https://calendar.google.com/calendar/render?' + q;
}

// ---------- .ics (Calendário da Apple, Outlook) ----------
function esc(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
// linhas de no máximo 75 bytes (regra do formato), sem cortar acentos no meio
function dobrar(linha) {
  var enc = new TextEncoder(), out = [], atual = '', bytes = 0;
  Array.from(linha).forEach(function (ch) {
    var b = enc.encode(ch).length;
    if (bytes + b > (out.length ? 74 : 75)) { out.push(atual); atual = ''; bytes = 0; }
    atual += ch; bytes += b;
  });
  out.push(atual);
  return out.join('\r\n ');
}
function ics(ev) {
  var agora = new Date();
  var stamp = agora.getUTCFullYear() + pad(agora.getUTCMonth() + 1) + pad(agora.getUTCDate()) + 'T' + pad(agora.getUTCHours()) + pad(agora.getUTCMinutes()) + pad(agora.getUTCSeconds()) + 'Z';
  var quando;
  if (ev.inicio) { var p = periodo(ev); quando = ['DTSTART:' + p[0], 'DTEND:' + p[1]]; }
  else quando = ['DTSTART;VALUE=DATE:' + compacto(ev.data), 'DTEND;VALUE=DATE:' + compacto(somaDias(ev.data, 1))];
  var linhas = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Chef Azambuja//Calculadora de Precificacao//PT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', 'UID:' + ev.uid, 'DTSTAMP:' + stamp
  ].concat(quando, [
    'SUMMARY:' + esc(ev.titulo),
    ev.local ? 'LOCATION:' + esc(ev.local) : null,
    ev.notas ? 'DESCRIPTION:' + esc(ev.notas) : null,
    // lembrete: dia inteiro → 9h da véspera; com horário → 1 dia antes
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(ev.titulo), 'TRIGGER:' + (ev.inicio ? '-P1D' : '-PT15H'), 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ]).filter(Boolean);
  return linhas.map(dobrar).join('\r\n') + '\r\n';
}

function nomeArquivo(ev) {
  var base = (ev.titulo || 'evento').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'evento';
  return base + '-' + ev.data + '.ics';
}

function pluginNativo() {
  try {
    var C = window.Capacitor;
    if (!C || typeof C.isNativePlatform !== 'function' || !C.isNativePlatform()) return null;
    if (typeof C.isPluginAvailable === 'function' && !C.isPluginAvailable('Agenda')) return null;
    return (C.Plugins && C.Plugins.Agenda) || null;
  } catch (e) { return null; }
}
function ehNativo() { try { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); } catch (e) { return false; } }
function ehApple() { return /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent || ''); }

// Calendário do aparelho: nativo no app; .ics no navegador
function salvarApple(ev) {
  var P = pluginNativo();
  if (P) {
    return P.adicionar({
      titulo: ev.titulo, data: ev.data, inicio: ev.inicio || '',
      duracaoMin: Math.round((Number(ev.duracaoH) || 5) * 60),
      local: ev.local || '', notas: ev.notas || '',
      alertaMin: ev.inicio ? 1440 : 900
    }).then(function (r) { return { ok: true, salvo: !!(r && r.salvo), nativo: true }; });
  }
  var file = new File([ics(ev)], nomeArquivo(ev), { type: 'text/calendar' });
  if (ehNativo() && window.ShareFile) {
    // app antigo, sem o plugin: manda o .ics para a folha de compartilhamento
    return window.ShareFile.shareFile(file).then(function () { return { ok: true, arquivo: true }; });
  }
  var url = URL.createObjectURL(file);
  var a = document.createElement('a');
  a.href = url; a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  return Promise.resolve({ ok: true, arquivo: true });
}

// ---------- janela ----------
var CSS = '' +
  '#agenda-ov{position:fixed;inset:0;z-index:99998;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px;font-family:-apple-system,system-ui,"Segoe UI",sans-serif}' +
  '#agenda-ov .ag-box{background:#fff;border-radius:16px;padding:18px;max-width:420px;width:100%;max-height:calc(100vh - 32px);overflow:auto;box-shadow:0 20px 50px rgba(0,0,0,.3)}' +
  '#agenda-ov h3{margin:0 0 2px;font-size:17px;font-weight:800;color:#0f172a}' +
  '#agenda-ov .ag-sub{margin:0 0 6px;font-size:14px;color:#475569}' +
  '#agenda-ov label{display:block;font-size:12px;font-weight:700;color:#334155;margin:8px 0 3px}' +
  '#agenda-ov input[type=text],#agenda-ov input[type=date],#agenda-ov input[type=time],#agenda-ov input[type=number]{width:100%;box-sizing:border-box;padding:8px 10px;min-height:42px;border:1px solid #cbd5e1;border-radius:10px;font-size:16px;color:#0f172a;background:#fff}' +
  '#agenda-ov .ag-lin{display:flex;gap:10px}#agenda-ov .ag-lin>div{flex:1;min-width:0}' +
  '#agenda-ov .ag-chk{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:#334155;margin:0;cursor:pointer}'
  + '#agenda-ov .ag-lin>.ag-chkc{flex:0 0 auto;display:flex;align-items:flex-end;padding-bottom:10px}' +
  '#agenda-ov .ag-chk input{width:20px;height:20px}' +
  '#agenda-ov .ag-av{margin-top:10px;padding:8px 10px;border-radius:10px;background:#fef3c7;color:#92400e;font-size:13px}' +
  '#agenda-ov .ag-ok{margin-top:10px;padding:8px 10px;border-radius:10px;background:#dcfce7;color:#166534;font-size:13px;font-weight:600}' +
  '#agenda-ov .ag-btns{display:flex;flex-direction:column;gap:8px;margin-top:14px}' +
  '#agenda-ov .ag-b{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;box-sizing:border-box;text-align:center;padding:12px;border:0;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;text-decoration:none}' +
  '#agenda-ov .ag-apple{background:#111827;color:#fff}#agenda-ov .ag-google{background:#1a73e8;color:#fff}' +
  '#agenda-ov .ag-fechar{background:#f1f5f9;color:#334155;font-weight:600}' +
  '#agenda-ov .ag-b[aria-disabled=true]{opacity:.45;pointer-events:none}' +
  '#agenda-ov .ag-nao{font-size:12px;font-weight:500;color:#64748b;margin-top:12px}';

function abrir(opts) {
  opts = opts || {};
  var ev = evento(opts.proposal);
  var velho = document.getElementById('agenda-ov'); if (velho) velho.remove();
  if (!document.getElementById('agenda-css')) {
    var st = document.createElement('style'); st.id = 'agenda-css'; st.textContent = CSS; document.head.appendChild(st);
  }
  var ua = navigator.userAgent || '';
  var nomeApple = ehNativo() || /iPhone|iPod/.test(ua) ? 'Calendário do iPhone' : /iPad/.test(ua) ? 'Calendário do iPad' : (ehApple() ? 'Calendário do Mac (.ics)' : 'Outlook / Apple (.ics)');
  var ov = document.createElement('div');
  ov.id = 'agenda-ov';
  ov.setAttribute('data-testid', 'agenda');
  ov.innerHTML =
    '<div class="ag-box" role="dialog" aria-modal="true" aria-labelledby="ag-tit">' +
      '<h3 id="ag-tit">' + (opts.aprovada ? '✅ Proposta aprovada!' : '📅 Salvar na agenda') + '</h3>' +
      '<p class="ag-sub">' + (opts.aprovada ? 'Quer salvar a data do evento na sua agenda?' : 'Confira os dados e escolha a agenda.') + '</p>' +
      '<label for="ag-titulo">Título</label><input type="text" id="ag-titulo">' +
      '<div class="ag-lin"><div><label for="ag-data">Data do evento</label><input type="date" id="ag-data"></div>' +
        '<div class="ag-chkc"><label class="ag-chk"><input type="checkbox" id="ag-dia"> Dia inteiro</label></div></div>' +
      '<div class="ag-lin" id="ag-horas"><div><label for="ag-ini">Início</label><input type="time" id="ag-ini"></div>' +
        '<div><label for="ag-dur">Duração (horas)</label><input type="number" id="ag-dur" min="0.5" max="48" step="0.5" inputmode="decimal"></div></div>' +
      '<label for="ag-local">Local</label><input type="text" id="ag-local" placeholder="Endereço do evento">' +
      '<div class="ag-av" id="ag-av" hidden>Informe a data do evento para salvar na agenda.</div>' +
      '<div class="ag-ok" id="ag-msg" hidden></div>' +
      '<div class="ag-btns">' +
        '<button type="button" class="ag-b ag-apple" data-a="apple">🍎 ' + nomeApple + '</button>' +
        '<a class="ag-b ag-google" data-a="google" target="_blank" rel="noopener">📆 Google Agenda</a>' +
        '<button type="button" class="ag-b ag-fechar" data-a="fechar">' + (opts.aprovada ? 'Agora não' : 'Fechar') + '</button>' +
      '</div>' +
      (opts.aprovada || ler(CHAVE_PERGUNTAR) === '0' ? '<label class="ag-chk ag-nao"><input type="checkbox" id="ag-nao"> Não perguntar quando eu aprovar uma proposta</label>' : '') +
    '</div>';
  var $ = function (id) { return ov.querySelector('#' + id); };
  $('ag-titulo').value = ev.titulo;
  $('ag-data').value = ev.data;
  $('ag-ini').value = ev.inicio || '19:00';
  $('ag-dur').value = String(ev.duracaoH);
  $('ag-dia').checked = !ev.inicio;
  $('ag-local').value = ev.local;
  if ($('ag-nao')) $('ag-nao').checked = ler(CHAVE_PERGUNTAR) === '0';

  var atual = function () {
    return {
      uid: ev.uid, notas: ev.notas,
      titulo: $('ag-titulo').value.trim() || ev.titulo,
      data: $('ag-data').value,
      inicio: $('ag-dia').checked ? '' : horaDe($('ag-ini').value),
      duracaoH: Number(String($('ag-dur').value).replace(',', '.')) || 5,
      local: $('ag-local').value.trim()
    };
  };
  var google = ov.querySelector('[data-a=google]');
  var apple = ov.querySelector('[data-a=apple]');
  var atualizar = function () {
    var e = atual(), ok = !!e.data;
    $('ag-horas').style.display = $('ag-dia').checked ? 'none' : '';
    $('ag-av').hidden = ok;
    google.setAttribute('aria-disabled', ok ? 'false' : 'true');
    apple.setAttribute('aria-disabled', ok ? 'false' : 'true');
    if (ok) google.href = googleUrl(e); else google.removeAttribute('href');
  };
  var lembrar = function () {
    var e = atual();
    if (e.inicio) gravar(CHAVE_PADRAO, JSON.stringify({ inicio: e.inicio, duracaoH: e.duracaoH }));
  };
  var aviso = function (t) { var m = $('ag-msg'); m.textContent = t; m.hidden = false; };
  var fechar = function () { ov.remove(); document.removeEventListener('keydown', tecla); };
  var tecla = function (e) { if (e.key === 'Escape') fechar(); };

  ov.addEventListener('input', atualizar);
  ov.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'ag-nao') gravar(CHAVE_PERGUNTAR, e.target.checked ? '0' : '1');
    atualizar();
  });
  ov.addEventListener('click', function (e) {
    if (e.target === ov) { fechar(); return; }
    var alvo = e.target.closest && e.target.closest('[data-a]');
    var a = alvo && alvo.getAttribute('data-a');
    if (a === 'fechar') { fechar(); return; }
    if (a === 'google') {
      if (!atual().data) { e.preventDefault(); return; }
      lembrar();
      aviso('Abrindo o Google Agenda… confira e toque em "Salvar".');
      return; // o link abre sozinho (nova aba / Safari)
    }
    if (a === 'apple') {
      var ev2 = atual();
      if (!ev2.data) return;
      lembrar();
      salvarApple(ev2).then(function (r) {
        if (r.nativo) { if (r.salvo) { aviso('✅ Evento salvo no Calendário.'); setTimeout(fechar, 1200); } }
        else aviso(ehNativo() ? 'Escolha o Calendário na lista (ou "Salvar em Arquivos" e abra o arquivo).' : 'Arquivo .ics baixado: abra-o para adicionar ao Calendário.');
      }).catch(function (err) {
        alert('Não foi possível abrir o Calendário: ' + ((err && err.message) || err));
      });
    }
  });
  document.addEventListener('keydown', tecla);
  document.body.appendChild(ov);
  atualizar();
  return ov;
}

function aoAprovar(proposal) {
  if (ler(CHAVE_PERGUNTAR) === '0') return null;
  return abrir({ proposal: proposal, aprovada: true });
}

window.Agenda = { abrir: abrir, aoAprovar: aoAprovar, evento: evento, googleUrl: googleUrl, ics: ics, salvarApple: salvarApple };
})();
