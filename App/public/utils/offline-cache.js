/**
 * Modo offline (out/2026)
 * - Guarda a última resposta de cada consulta (GET) da API neste aparelho (IndexedDB próprio).
 * - Sem internet: o api-client devolve a última cópia guardada; salvar avisa que precisa de internet.
 * - Faixa no topo da tela enquanto estiver sem internet.
 * Carregar depois de config/app-config.js e antes de api-client.js.
 */
(function () {
  'use strict';
  var DB = 'precificacao_offline', STORE = 'get';
  var idb = window.__rawIndexedDB || window.indexedDB;
  var dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise(function (res, rej) {
      try {
        var r = idb.open(DB, 1);
        r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
        r.onsuccess = function () {
          var db = r.result;
          // Outra aba/versão precisa atualizar o banco: fecha esta conexão para não travar
          db.onversionchange = function () { try { db.close(); } catch (e) {} dbp = null; };
          db.onclose = function () { dbp = null; };
          res(db);
        };
        r.onerror = function () { rej(r.error); };
      } catch (e) { rej(e); }
    });
    dbp.catch(function () { dbp = null; });
    return dbp;
  }
  function userKey() {
    try {
      var t = localStorage.getItem('accessToken');
      var p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return String(p.id || p.userId || p.sub || p.email || 'anon');
    } catch (e) { return 'anon'; }
  }
  function key(endpoint) { return userKey() + '|' + endpoint; }
  function put(endpoint, data) {
    return open().then(function (db) {
      var tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ data: data, at: Date.now() }, key(endpoint));
    }).catch(function () {});
  }
  function get(endpoint) {
    return open().then(function (db) {
      return new Promise(function (res) {
        var rq = db.transaction(STORE).objectStore(STORE).get(key(endpoint));
        rq.onsuccess = function () { res(rq.result || null); };
        rq.onerror = function () { res(null); };
      });
    }).catch(function () { return null; });
  }
  function isNetworkError(e) {
    if (!e || e.statusCode) return false;
    if (e.__network || e.name === 'AbortError') return true;
    return e.name === 'TypeError' && /Failed to fetch|Load failed|NetworkError|network connection|internet/i.test(String(e.message || ''));
  }
  // Apaga a cópia e o acesso offline deste aparelho (troca de conta / sair)
  function clearCache() {
    var p = dbp; dbp = null;
    try { if (p) p.then(function (db) { try { db.close(); } catch (e) {} }).catch(function () {}); } catch (e) {}
    try { idb.deleteDatabase(DB); } catch (e) {}
  }
  function clearAll() {
    try { localStorage.removeItem('offline_credential'); } catch (e) {}
    clearCache();
  }

  var offline = false;
  var servedFromCache = false, cacheAt = null;
  function markServedFromCache(at) { servedFromCache = true; if (at && (!cacheAt || at < cacheAt)) cacheAt = at; }
  function fmt(at) { try { var d = new Date(at); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  // Conexão voltou depois de usar a cópia: atualiza a tela para não editar dados antigos
  function avisoVoltou() {
    var el = document.getElementById('offline-banner');
    if (!el) return;
    el.style.background = '#166534';
    el.innerHTML = '';
    el.appendChild(document.createTextNode('✅ A internet voltou. '));
    var b = document.createElement('span');
    b.textContent = 'Toque aqui para atualizar os dados';
    b.style.cssText = 'text-decoration:underline;cursor:pointer';
    b.setAttribute('role', 'button');
    b.onclick = function () { location.reload(); };
    el.appendChild(b);
    el.style.display = 'block';
    try { document.body.style.marginTop = el.offsetHeight + 'px'; } catch (e) {}
  }
  function banner() {
    var el = document.getElementById('offline-banner');
    if (!offline) { if (el) el.style.display = 'none'; if (document.body) document.body.style.marginTop = ''; return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'offline-banner';
      el.setAttribute('role', 'status');
      el.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:9999;background:#92400e;color:#fff;font:600 13px/1.35 system-ui,-apple-system,sans-serif;text-align:center;padding:calc(6px + env(safe-area-inset-top)) 12px 6px';
      (document.body || document.documentElement).appendChild(el);
    }
    el.style.background = '#92400e';
    el.textContent = '📴 Sem internet: mostrando os dados salvos neste aparelho' + (cacheAt ? ' (de ' + fmt(cacheAt) + ')' : '') + '. Para salvar alterações, conecte-se.';
    el.style.display = 'block';
    // Empurra a tela para baixo da faixa
    try { document.body.style.marginTop = el.offsetHeight + 'px'; } catch (e) {}
  }
  function setOffline(v) {
    v = !!v;
    if (offline === v) return;
    offline = v;
    window.__appOffline = v;
    if (!v && servedFromCache) {
      // Mostra "a internet voltou" uma vez e zera a marca (próxima queda começa do zero)
      servedFromCache = false; cacheAt = null;
      if (document.body) avisoVoltou();
      try { window.dispatchEvent(new CustomEvent('app-offline-changed', { detail: v })); } catch (e) {}
      return;
    }
    if (document.body) banner(); else document.addEventListener('DOMContentLoaded', banner);
    try { window.dispatchEvent(new CustomEvent('app-offline-changed', { detail: v })); } catch (e) {}
  }
  window.addEventListener('offline', function () { setOffline(true); });
  window.addEventListener('online', function () { setOffline(false); });
  if (navigator.onLine === false) setOffline(true);

  window.OfflineCache = { put: put, get: get, isNetworkError: isNetworkError, setOffline: setOffline, markServedFromCache: markServedFromCache, clearAll: clearAll, clearCache: clearCache, isOffline: function () { return offline; } };
})();
