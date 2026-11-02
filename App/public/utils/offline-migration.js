/**
 * Dados deste computador → conta na nuvem (nov/2026)
 *
 * Quem usava o plano Offline guardava tudo no navegador (IndexedDB "precificacao_db" e localStorage).
 * Ao passar para Standard/Premium/Vitalício, o bloqueador de IndexedDB escondia esses dados e a
 * migração antiga só lia o localStorage (e apagava tudo se um único item subisse).
 *
 * Regras daqui:
 * - NUNCA apaga nada do aparelho. A cópia local continua lá depois do envio.
 * - Lê o IndexedDB "cru" (window.__rawIndexedDB), sem passar pelo bloqueador.
 * - Não duplica: compara pelo nome (sem acento/maiúscula) com o que já está na conta.
 * - Ingredientes primeiro; os pratos passam a apontar para os ingredientes da conta.
 * - Empresa e configurações: só preenche o que está vazio na conta.
 * - Só marca "migrado" quando não houve nenhuma falha; senão tenta de novo no próximo login.
 * - Dados de OUTRA conta neste aparelho não são enviados nem baixados.
 * - Troca de conta: antes de limpar, guarda uma cópia em "precificacao_resguardo" (só a própria
 *   conta dona consegue ver/baixar/enviar essa cópia depois).
 *
 * Painel: OfflineMigration.abrirPainel() (Configurações → "💾 Dados deste computador").
 * Carregar depois de config/indexeddb-blocker.js e antes de api-client.js.
 */
(function () {
  'use strict';

  var KV = { pratos: 'precificacao_pratos', cardapios: 'precificacao_saved_menus', clientes: 'precificacao_clients',
    propostas: 'precificacao_propostas', eventos: 'saved_events', ingredientes: 'ingredients_database',
    templates: 'custom_templates' };
  var EMPRESA_LS = ['name', 'phone', 'email', 'address', 'history', 'logo', 'mission', 'vision', 'values', 'motivation', 'photo1', 'photo2', 'photo3'];
  var OK_KEY = 'offline_migration_ok';
  var REL_KEY = 'offline_migration_report';
  var RESG_DB = 'precificacao_resguardo';

  function rawIDB() { return window.__rawIndexedDB || window.indexedDB; }
  function norm(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }
  function digitos(s) { return String(s || '').replace(/\D/g, ''); }
  function lsJSON(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function emailDaChave(chave) {
    try {
      var p = String(chave || '').split('-');
      if (p.length < 4) return '';
      var e = atob(p[1]);
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e.toLowerCase().trim() : '';
    } catch (e) { return ''; }
  }
  function emailsDe(valores) {
    var out = [];
    (valores || []).forEach(function (v) {
      if (!v) return;
      var s = String(v).toLowerCase().trim();
      var e = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : emailDaChave(v);
      if (e && out.indexOf(e) < 0) out.push(e);
    });
    return out;
  }
  function emailAtual() {
    var cands = [];
    try {
      var t = localStorage.getItem('accessToken');
      if (t) { var p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); cands.push(p.email); }
    } catch (e) { }
    cands.push(localStorage.getItem('licensedEmail'), localStorage.getItem('appLicenseKey'));
    return emailsDe(cands)[0] || '';
  }
  function hash(str) { // djb2 (só para saber se os dados mudaram desde o último envio)
    var h = 5381; for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36) + '.' + str.length;
  }
  // Une listas sem repetir (pelo id; sem id, pelo conteúdo)
  function unir() {
    var vistos = {}, out = [];
    for (var i = 0; i < arguments.length; i++) {
      arr(arguments[i]).forEach(function (it) {
        if (!it || typeof it !== 'object') return;
        var k = it.id != null && it.id !== '' ? 'id:' + it.id : 'js:' + JSON.stringify(it).slice(0, 400);
        if (vistos[k]) return;
        vistos[k] = 1; out.push(it);
      });
    }
    return out;
  }

  // ---------------------------------------------------------------- IndexedDB (sem criar banco novo)
  function abrir(nome) {
    return new Promise(function (res) {
      var idb = rawIDB();
      if (!idb) return res(null);
      var criado = false, fim = false;
      var done = function (v) { if (!fim) { fim = true; res(v); } };
      setTimeout(function () { done(null); }, 4000);
      try {
        var r = idb.open(nome);
        r.onupgradeneeded = function (ev) {
          if (ev.oldVersion === 0) { criado = true; try { r.transaction.abort(); } catch (e) { } }
        };
        r.onsuccess = function () { if (criado) { try { r.result.close(); } catch (e) { } return done(null); } done(r.result); };
        r.onerror = function (e) { try { e.preventDefault(); } catch (x) { } done(null); };
        r.onblocked = function () { done(null); };
      } catch (e) { done(null); }
    });
  }
  function lerTudo(db, store) {
    return new Promise(function (res) {
      try {
        if (!db || !db.objectStoreNames.contains(store)) return res([]);
        var q = db.transaction(store, 'readonly').objectStore(store).getAll();
        q.onsuccess = function () { res(q.result || []); };
        q.onerror = function () { res([]); };
      } catch (e) { res([]); }
    });
  }

  // ---------------------------------------------------------------- Coletar
  async function coletar(opts) {
    opts = opts || {};
    var kv = {}, ap = {}, eventosIDB = [];
    var db = await abrir('precificacao_db');
    if (db) {
      (await lerTudo(db, 'keyValueStore')).forEach(function (r) { if (r && r.key) kv[r.key] = r.value; });
      (await lerTudo(db, 'appData')).forEach(function (r) { if (r && r.key) ap[r.key] = r.data; });
      eventosIDB = await lerTudo(db, 'events');
      try { db.close(); } catch (e) { }
    }

    var atual = emailAtual();
    var donosIDB = emailsDe([kv.licensedEmail, kv.appLicenseKey, kv.password_license_key]);
    var idbDeOutraConta = !!(atual && donosIDB.length && donosIDB.indexOf(atual) < 0);
    // (opts.todos: cópia de resguardo antes da limpeza por troca de conta — guarda tudo, com os donos anotados)
    if (idbDeOutraConta && !opts.todos) { kv = {}; ap = {}; eventosIDB = []; }

    // backup da migração antiga (2025): só no painel; no automático poderia recriar o que a pessoa já apagou
    var bk = opts.semBackupAntigo ? {} : (lsJSON('backup_before_migration') || {});
    var estado = kv.precificacao_event_data || ap.precificacao_event_data || lsJSON('precificacao_event_data') || null;
    if (estado && typeof estado === 'string') { try { estado = JSON.parse(estado); } catch (e) { estado = null; } }

    var empresaObj = kv.precificacao_company_data || lsJSON('precificacao_company_data') || bk.companyData || {};
    if (typeof empresaObj === 'string') { try { empresaObj = JSON.parse(empresaObj); } catch (e) { empresaObj = {}; } }
    var empresa = {};
    EMPRESA_LS.forEach(function (f) {
      var cap = 'company' + f.charAt(0).toUpperCase() + f.slice(1);
      var v = empresaObj[cap] || empresaObj[f] || localStorage.getItem('company_' + f) || (estado && estado.proposalData && estado.proposalData[cap]) || '';
      if (v) empresa[f] = v;
    });

    var dados = {
      ingredientes: unir(kv[KV.ingredientes], estado && estado.ingredientsDatabase, lsJSON(KV.ingredientes), bk.ingredients),
      pratos: unir(kv[KV.pratos], lsJSON(KV.pratos), bk.dishes),
      cardapios: unir(kv[KV.cardapios], lsJSON(KV.cardapios), bk.savedMenus),
      clientes: unir(kv[KV.clientes], lsJSON(KV.clientes), bk.clients),
      propostas: unir(kv[KV.propostas], lsJSON(KV.propostas), bk.proposals),
      eventos: unir(eventosIDB, kv[KV.eventos], lsJSON(KV.eventos), bk.events),
      templates: unir(kv[KV.templates], lsJSON(KV.templates), bk.customTemplates),
      empresa: empresa,
      configuracoes: estado ? { support: arr(estado.support), labor: estado.labor || null, transport: estado.transport || null } : null
    };
    var contagem = {
      ingredientes: dados.ingredientes.length, pratos: dados.pratos.length, cardapios: dados.cardapios.length,
      clientes: dados.clientes.length, propostas: dados.propostas.length, eventos: dados.eventos.length,
      templates: dados.templates.length, empresa: Object.keys(empresa).length,
      apoio: dados.configuracoes ? dados.configuracoes.support.length : 0
    };
    var total = 0; for (var k in contagem) total += contagem[k];
    // Sinal de que o aparelho foi usado no plano Offline (para rodar sozinho no login).
    // Só o IndexedDB conta: Standard/Premium nunca gravam pratos/clientes/eventos lá (bloqueador).
    var usouOffline = !!(String(kv.appLicenseKey || '').indexOf('-OFF-') > 0 || kv.licenseType === 'OFF' ||
      eventosIDB.length || arr(kv[KV.pratos]).length || arr(kv[KV.clientes]).length || arr(kv[KV.propostas]).length ||
      arr(kv[KV.cardapios]).length);

    var json = JSON.stringify(dados);
    return {
      formato: 'precificacao-backup', versao: 1, coletadoEm: new Date().toISOString(), origem: location.host,
      conta: atual || (donosIDB[0] || ''), donos: donosIDB, idbDeOutraConta: idbDeOutraConta,
      usouOffline: usouOffline, total: total, contagem: contagem, impressao: hash(json), dados: dados
    };
  }

  function temDados(c) { return !!(c && c.total > 0); }

  // ---------------------------------------------------------------- Backup em arquivo
  function nomeArquivo() { return 'backup-precificacao-' + new Date().toISOString().slice(0, 10) + '.json'; }
  async function baixarBackup(c) {
    c = c || await coletar();
    var file = new File([JSON.stringify(c, null, 1)], nomeArquivo(), { type: 'application/json' });
    if (window.ShareFile && window.ShareFile.isNative && window.ShareFile.isNative() && window.ShareFile.saveFile) return window.ShareFile.saveFile(file);
    if (window.ShareFile && window.ShareFile.download) return window.ShareFile.download(file);
    var a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
  }
  function lerArquivo(file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var c = JSON.parse(fr.result);
          if (!c || !c.dados) throw new Error('Arquivo não é um backup da Calculadora');
          var t = 0; for (var k in (c.contagem || {})) t += c.contagem[k] || 0;
          c.total = c.total || t; c.impressao = c.impressao || hash(JSON.stringify(c.dados));
          res(c);
        } catch (e) { rej(e); }
      };
      fr.onerror = function () { rej(fr.error); };
      fr.readAsText(file);
    });
  }

  // ---------------------------------------------------------------- Envio para a conta
  function api() { return (window.PrecificacaoAPI && window.PrecificacaoAPI.api) || window.api; }
  function lista(r) { return arr(r && (r.data || r.items)); }
  async function emLotes(itens, n, fn) {
    var i = 0;
    async function trabalhador() { while (i < itens.length) { var k = i++; await fn(itens[k], k); } }
    var ws = []; for (var w = 0; w < Math.min(n, itens.length); w++) ws.push(trabalhador());
    await Promise.all(ws);
  }
  function erroMsg(e) { return String((e && (e.message || e.error)) || e || 'erro').slice(0, 160); }
  function perda(ing) {
    var v = parseFloat(ing.lossPercentage != null && ing.lossPercentage !== '' ? ing.lossPercentage : (ing.loss != null ? ing.loss : ing.perdaPercentual));
    if (!(v > 0)) return 0;
    if (v < 1) v = v * 100; // dado antigo em decimal (0,2 = 20%)
    return Math.min(Math.round(v * 100) / 100, 100);
  }
  function campoIngrediente(ing) {
    var o = {
      name: String(ing.name || ing.nome || 'Ingrediente').trim(),
      category: ing.category || ing.categoria || 'Outros',
      unit: ing.unit || ing.unidade || 'g',
      unitType: ing.unitType || ing.tipoUnidade || 'weight',
      lossPercentage: perda(ing),
      yieldMultiplier: parseFloat(ing.yieldMultiplier) > 0 ? parseFloat(ing.yieldMultiplier) : 1
    };
    var cpu = parseFloat(ing.costPerUnit != null ? ing.costPerUnit : ing.cost);
    var us = parseFloat(ing.unitSize);
    var uc = parseFloat(ing.unitCost != null ? ing.unitCost : (ing.price != null ? ing.price : ing.preco));
    if (cpu > 0) o.costPerUnit = cpu;
    if (us > 0) o.unitSize = us;
    if (uc > 0) o.unitCost = uc;
    return o;
  }

  /**
   * Envia os dados coletados (ou de um arquivo) para a conta logada.
   * opcoes.precos = true → ingredientes que já existem na conta recebem o preço/perda deste computador.
   * opcoes.progresso(texto) → aviso de andamento.
   */
  async function migrar(c, opcoes) {
    opcoes = opcoes || {};
    var A = api();
    if (!A || !localStorage.getItem('accessToken')) throw new Error('Entre na sua conta (com internet) para enviar os dados.');
    var d = c.dados || {};
    var rel = { em: new Date().toISOString(), conta: emailAtual(), criados: {}, jaExistiam: {}, atualizados: {}, falhas: [] };
    function conta(tipo, campo) { rel[campo][tipo] = (rel[campo][tipo] || 0) + 1; }
    function falha(tipo, nome, e) { rel.falhas.push({ tipo: tipo, nome: String(nome || '').slice(0, 80), erro: erroMsg(e) }); }
    function aviso(t) { try { opcoes.progresso && opcoes.progresso(t); } catch (e) { } }

    // 1) Ingredientes
    var ingPorNome = {}, ingIdMap = {};
    if (arr(d.ingredientes).length) {
      aviso('Ingredientes…');
      var back = lista(await A.getIngredients());
      back.forEach(function (b) { ingPorNome[norm(b.name)] = b; });
      var novos = [], vistos = {};
      for (var i = 0; i < d.ingredientes.length; i++) {
        var ing = d.ingredientes[i], n = norm(ing.name || ing.nome);
        if (!n) continue;
        var b = ingPorNome[n];
        if (b) {
          if (ing.id != null) ingIdMap[ing.id] = b.id;
          if (opcoes.precos) {
            var f = campoIngrediente(ing);
            var mudou = (f.costPerUnit && Math.abs((parseFloat(b.costPerUnit) || 0) - f.costPerUnit) > 0.004) ||
              Math.abs((parseFloat(b.lossPercentage) || 0) - f.lossPercentage) > 0.004;
            if (mudou) {
              try {
                await A.updateIngredient(b.id, { costPerUnit: f.costPerUnit, unitSize: f.unitSize, unitCost: f.costPerUnit ? undefined : f.unitCost, lossPercentage: f.lossPercentage, yieldMultiplier: f.yieldMultiplier });
                conta('ingredientes', 'atualizados');
              } catch (e) { falha('ingrediente', ing.name, e); }
            } else conta('ingredientes', 'jaExistiam');
          } else conta('ingredientes', 'jaExistiam');
        } else if (!vistos[n]) { vistos[n] = 1; novos.push(ing); }
      }
      for (var p = 0; p < novos.length; p += 100) {
        var lote = novos.slice(p, p + 100);
        aviso('Ingredientes ' + Math.min(p + 100, novos.length) + '/' + novos.length + '…');
        try {
          await A.request('/api/ingredients/import-bulk', { method: 'POST', body: JSON.stringify({ ingredients: lote.map(campoIngrediente) }), timeoutMs: 120000 });
        } catch (e) { /* conferido abaixo, um a um */ }
      }
      if (novos.length) {
        var depois = lista(await A.getIngredients());
        depois.forEach(function (b) { ingPorNome[norm(b.name)] = b; });
        // O que não entrou no lote: tenta um a um; o que ainda falhar vai para o relatório
        await emLotes(novos.filter(function (g) { return !ingPorNome[norm(g.name || g.nome)]; }), 4, async function (g) {
          try {
            var r = await A.createIngredient(campoIngrediente(g), true);
            if (r && r.data) ingPorNome[norm(r.data.name)] = r.data;
          } catch (e) { falha('ingrediente', g.name || g.nome, e); }
        });
        novos.forEach(function (g) {
          var b2 = ingPorNome[norm(g.name || g.nome)];
          if (b2) { conta('ingredientes', 'criados'); if (g.id != null) ingIdMap[g.id] = b2.id; }
        });
      }
    }
    function ingId(item) {
      var k = item.ingredientId != null ? item.ingredientId : item.id;
      if (k != null && ingIdMap[k]) return ingIdMap[k];
      var b = ingPorNome[norm(item.ingredientName || item.name || item.nome)];
      return b ? b.id : null;
    }

    // 2) Clientes
    var cliIdMap = {};
    if (arr(d.clientes).length) {
      aviso('Clientes…');
      var bc = lista(await A.getClients());
      var chaveCli = function (x) { return norm(x.name || x.clientName) + '|' + (digitos(x.phone || x.clientPhone).slice(-8) || norm(x.email || x.clientEmail)); };
      var cliPorChave = {}; bc.forEach(function (x) { cliPorChave[chaveCli(x)] = x; });
      await emLotes(d.clientes, 4, async function (x) {
        var nome = x.name || x.clientName;
        if (!nome) return;
        var ex = cliPorChave[chaveCli(x)];
        if (ex) { cliIdMap[x.id] = ex.id; conta('clientes', 'jaExistiam'); return; }
        try {
          var r = await A.createClient({ name: nome, email: x.email || x.clientEmail || '', phone: x.phone || x.clientPhone || '',
            address: x.address || x.clientAddress || '', notes: x.notes || x.observations || x.obs || '' });
          if (r && r.data) { cliIdMap[x.id] = r.data.id; cliPorChave[chaveCli(x)] = r.data; }
          conta('clientes', 'criados');
        } catch (e) { falha('cliente', nome, e); }
      });
    }

    // 3) Pratos
    var pratoIdMap = {}, pratoPorNome = {}, pratoLocal = {};
    arr(d.pratos).forEach(function (x) { if (x && x.id != null) pratoLocal[x.id] = x; });
    if (arr(d.pratos).length) {
      aviso('Pratos…');
      var bp = lista(await A.getDishes());
      bp.forEach(function (x) { pratoPorNome[norm(x.name)] = x; });
      await emLotes(d.pratos, 3, async function (x) {
        if (!x.name) return;
        var ex = pratoPorNome[norm(x.name)];
        if (ex) { pratoIdMap[x.id] = ex.id; conta('pratos', 'jaExistiam'); return; }
        try {
          var fotos = arr(x.photos).map(function (f, i) { var s = typeof f === 'string' ? f : (f && (f.photoData || f.data || f.url)); return s ? { photoData: s, photoOrder: i } : null; }).filter(Boolean);
          var r = await A.createDish({
            name: x.name, category: x.category || 'Outros', description: x.description || '', observations: x.observations || '',
            technicalSheet: x.technicalSheet || '', servings: parseInt(x.servings, 10) || 1, isFavorite: !!x.isFavorite,
            useWeightCalculation: !!x.useWeightCalculation, profitMargin: x.profitMargin, suggestedPrice: x.suggestedPrice,
            photos: fotos,
            ingredients: arr(x.ingredients).map(function (it) {
              return { ingredientId: ingId(it), ingredientName: it.ingredientName || it.name || it.nome || 'Ingrediente',
                quantity: parseFloat(it.quantity != null ? it.quantity : it.quantidade) || 0, unit: it.unit || it.unidade || 'g',
                unitType: it.unitType || 'weight', unitCost: parseFloat(it.unitCost) || 0, lossPercentage: perda(it),
                yieldMultiplier: parseFloat(it.yieldMultiplier) > 0 ? parseFloat(it.yieldMultiplier) : 1, isDiscarded: !!it.isDiscarded };
            })
          });
          if (r && r.data) { pratoIdMap[x.id] = r.data.id; pratoPorNome[norm(x.name)] = r.data; }
          conta('pratos', 'criados');
        } catch (e) { falha('prato', x.name, e); }
      });
    }
    // Troca os ids dos pratos do computador pelos da conta. Se um prato do computador não subiu,
    // devolve null: o cardápio espera (não pode ir apontando para um prato que não existe na conta).
    function trocarIdsPratos(lst) {
      var faltou = false;
      var out = arr(lst).map(function (it) {
        if (!it || typeof it !== 'object') return it;
        var o = Object.assign({}, it);
        ['id', 'dishId'].forEach(function (k) {
          if (o[k] == null || !pratoLocal[o[k]]) return; // não é prato do computador (ex.: prato padrão da conta)
          var novo = pratoIdMap[o[k]] || (pratoPorNome[norm(pratoLocal[o[k]].name)] || {}).id;
          if (novo) o[k] = novo; else faltou = true;
        });
        return o;
      });
      return faltou ? null : out;
    }

    // 4) Cardápios
    if (arr(d.cardapios).length) {
      aviso('Cardápios…');
      var bm = lista(await A.getSavedMenus());
      var menuPorNome = {}; bm.forEach(function (x) { menuPorNome[norm(x.name)] = 1; });
      await emLotes(d.cardapios, 3, async function (x) {
        if (!x.name) return;
        if (menuPorNome[norm(x.name)]) { conta('cardapios', 'jaExistiam'); return; }
        try {
          var md = x.menuData && typeof x.menuData === 'object' ? Object.assign({}, x.menuData) : { eventType: x.eventType || 'outro', dishes: x.dishes || [] };
          md.dishes = trocarIdsPratos(md.dishes);
          if (!md.dishes) { falha('cardápio', x.name, 'aguardando prato que não subiu'); return; }
          if (x.isFavorite) md.isFavorite = true;
          await A.createSavedMenu({ name: x.name, description: x.description || '', menuData: md });
          menuPorNome[norm(x.name)] = 1;
          conta('cardapios', 'criados');
        } catch (e) { falha('cardápio', x.name, e); }
      });
    }

    // 5) Propostas
    if (arr(d.propostas).length) {
      aviso('Propostas…');
      var bpr = lista(await A.getProposals());
      var chaveProp = function (x) { var pd = x.proposalData || x; return norm(x.title || pd.proposalName || pd.title || pd.eventName || pd.name) + '|' + String(pd.eventDate || x.createdAt || '').slice(0, 10); };
      var propPorChave = {}; bpr.forEach(function (x) { propPorChave[chaveProp(x)] = 1; });
      await emLotes(d.propostas, 3, async function (x) {
        var pd = Object.assign({}, x.proposalData && typeof x.proposalData === 'object' ? x.proposalData : x);
        var titulo = x.title || pd.proposalName || pd.title || pd.eventName || pd.name || 'Proposta';
        if (propPorChave[chaveProp(x)]) { conta('propostas', 'jaExistiam'); return; }
        var cid = x.clientId != null ? (cliIdMap[x.clientId] || null) : null;
        delete pd.id; if ('clientId' in pd) pd.clientId = cid;
        try {
          await A.createProposal({ title: titulo, description: x.description || '', proposalData: pd, status: x.status || 'draft', clientId: cid });
          propPorChave[chaveProp(x)] = 1;
          conta('propostas', 'criados');
        } catch (e) { falha('proposta', titulo, e); }
      });
    }

    // 6) Eventos
    if (arr(d.eventos).length) {
      aviso('Eventos…');
      var be = lista(await A.getEvents());
      var evIds = {}, evChave = {};
      var chaveEv = function (x) { var s = x.stateData || x; return norm(x.name || s.name || s.nomeEvento || s.eventName) + '|' + String(x.eventDate || s.date || s.dataEvento || s.eventDate || '').slice(0, 10); };
      be.forEach(function (x) { evIds[x.id] = 1; evChave[chaveEv(x)] = 1; });
      await emLotes(d.eventos, 3, async function (x) {
        if ((x.id && evIds[x.id]) || evChave[chaveEv(x)]) { conta('eventos', 'jaExistiam'); return; }
        var ev = {
          name: x.name || x.nomeEvento || x.eventName || 'Evento',
          eventDate: x.date || x.dataEvento || x.eventDate || null,
          location: x.location || x.local || x.eventLocation || '',
          guests: parseInt(x.numeroConvidados || x.guests || (x.data && x.data.guests) || 0, 10) || 0,
          monthsUntilEvent: parseInt(x.mesesAteEvento || x.monthsUntilEvent || (x.data && x.data.monthsUntilEvent) || 0, 10) || 0,
          stateData: x
        };
        try {
          try { await A.createEvent(Object.assign({ id: x.id || undefined }, ev)); }
          catch (e1) { if (!x.id) throw e1; await A.createEvent(ev); } // id em uso: cria com id novo
          evChave[chaveEv(x)] = 1;
          conta('eventos', 'criados');
        } catch (e) { falha('evento', ev.name, e); }
      });
    }

    // 7) Empresa: só os campos vazios na conta
    var emp = d.empresa || {};
    if (Object.keys(emp).length) {
      aviso('Dados da empresa…');
      try {
        var be2 = (await A.getCompany() || {}).data || {};
        var falta = {};
        Object.keys(emp).forEach(function (f) { if (emp[f] && !be2[f]) falta[f] = emp[f]; });
        if (Object.keys(falta).length) { await A.updateCompany(falta); conta('empresa', 'criados'); } else conta('empresa', 'jaExistiam');
      } catch (e) { falha('empresa', 'Dados da empresa', e); }
    }

    // 8) Itens de apoio, mão de obra e transporte: só se a conta ainda não tem
    var cf = d.configuracoes;
    if (cf && (arr(cf.support).length || cf.labor || cf.transport)) {
      try {
        var us = ((await A.request('/api/user-settings')) || {}).data || {};
        var sd = us.settingsData || {};
        var parcial = {};
        if (arr(cf.support).length && !arr(sd.support).length) parcial.support = cf.support;
        if (cf.labor && !sd.labor) parcial.labor = cf.labor;
        if (cf.transport && !sd.transport) parcial.transport = cf.transport;
        if (Object.keys(parcial).length) {
          await A.request('/api/user-settings', { method: 'PATCH', body: JSON.stringify({ partialSettings: parcial }) });
          conta('configuracoes', 'criados');
        } else conta('configuracoes', 'jaExistiam');
      } catch (e) { falha('configurações', 'Itens de apoio / mão de obra / transporte', e); }
    }
    if (arr(d.templates).length) rel.naoEnviados = { templates: d.templates.length }; // ficam no aparelho e no arquivo de backup

    rel.ok = rel.falhas.length === 0;
    try { localStorage.setItem(REL_KEY, JSON.stringify(rel).slice(0, 20000)); } catch (e) { }
    if (rel.ok && c.impressao) { try { localStorage.setItem(OK_KEY, c.impressao); } catch (e) { } }
    return rel;
  }

  // ---------------------------------------------------------------- Automático (no login)
  async function automatico() {
    // Já subiu tudo uma vez neste navegador: não repete sozinho (recriaria o que a pessoa apagou na nuvem).
    // Envio de novo, só pelo painel.
    if (localStorage.getItem(OK_KEY)) return { jaEnviado: true };
    var c = await coletar({ semBackupAntigo: true });
    if (!temDados(c)) return { vazio: true };
    if (!c.usouOffline) return { ignorado: true, motivo: 'sem sinal de uso offline' }; // fica para o painel (manual)
    var rel = await migrar(c, {});
    rel.automatico = true;
    var mostrar = function () { avisoTela(rel); };
    if (document.readyState === 'complete') setTimeout(mostrar, 1500); else window.addEventListener('load', function () { setTimeout(mostrar, 1500); });
    return rel;
  }

  // ---------------------------------------------------------------- Resguardo (antes de limpar por troca de conta)
  function abrirResguardo() {
    return new Promise(function (res) {
      try {
        var r = rawIDB().open(RESG_DB, 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('copias', { keyPath: 'id' }); };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { res(null); };
      } catch (e) { res(null); }
    });
  }
  async function guardarResguardo(motivo, identificadores) {
    try {
      var c = await coletar({ todos: true });
      if (!temDados(c)) return false;
      c.donos = emailsDe([].concat(identificadores || [], c.donos || []));
      var db = await abrirResguardo(); if (!db) return false;
      var todos = await lerTudo(db, 'copias');
      await new Promise(function (res) {
        var tx = db.transaction('copias', 'readwrite'), st = tx.objectStore('copias');
        // até 5 cópias por dono (apaga só as cópias de resguardo mais antigas, nunca os dados do app)
        var meus = todos.filter(function (x) { return (x.donos || []).join() === c.donos.join(); }).sort(function (a, b) { return a.id - b.id; });
        while (meus.length >= 5) st.delete(meus.shift().id);
        st.put({ id: Date.now(), motivo: motivo || '', donos: c.donos, criadoEm: c.coletadoEm, contagem: c.contagem, copia: c });
        tx.oncomplete = res; tx.onerror = res; tx.onabort = res;
      });
      try { db.close(); } catch (e) { }
      return true;
    } catch (e) { console.warn('⚠️ [Resguardo] não foi possível guardar a cópia:', e); return false; }
  }
  async function resguardosDaConta() {
    var email = emailAtual(); if (!email) return [];
    var db = await abrir(RESG_DB); if (!db) return [];
    var t = await lerTudo(db, 'copias'); try { db.close(); } catch (e) { }
    return t.filter(function (x) { return (x.donos || []).indexOf(email) >= 0; }).sort(function (a, b) { return b.id - a.id; });
  }

  // ---------------------------------------------------------------- Tela
  var NOMES = { ingredientes: 'ingredientes', pratos: 'pratos', cardapios: 'cardápios', clientes: 'clientes', propostas: 'propostas',
    eventos: 'eventos', templates: 'modelos', empresa: 'dados da empresa', apoio: 'itens de apoio', configuracoes: 'configurações' };
  var SING = { ingredientes: 'ingrediente', pratos: 'prato', cardapios: 'cardápio', clientes: 'cliente', propostas: 'proposta',
    eventos: 'evento', templates: 'modelo', empresa: 'dado da empresa', apoio: 'item de apoio', configuracoes: 'configuração' };
  function resumo(cont) {
    var p = []; for (var k in cont) if (cont[k]) p.push(cont[k] + ' ' + ((cont[k] === 1 ? SING[k] : NOMES[k]) || k)); return p.join(', ') || 'nada';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function textoRelatorio(rel) {
    var h = '<div><b>✅ Enviados:</b> ' + esc(resumo(rel.criados)) + '</div>';
    if (Object.keys(rel.atualizados).length) h += '<div><b>🔄 Atualizados:</b> ' + esc(resumo(rel.atualizados)) + '</div>';
    if (Object.keys(rel.jaExistiam).length) h += '<div style="color:#64748b"><b>Já estavam na conta:</b> ' + esc(resumo(rel.jaExistiam)) + '</div>';
    if (rel.falhas.length) {
      h += '<div style="color:#b91c1c;margin-top:6px"><b>⚠️ Não foram (' + rel.falhas.length + '):</b> ' +
        esc(rel.falhas.slice(0, 8).map(function (f) { return f.tipo + ' "' + f.nome + '"'; }).join(', ')) + (rel.falhas.length > 8 ? '…' : '') +
        '<br>Eles continuam neste computador. Tente de novo ou baixe o backup e envie ao suporte.</div>';
    }
    return h;
  }
  function avisoTela(rel) {
    if (!rel || (!Object.keys(rel.criados).length && !rel.falhas.length && !Object.keys(rel.atualizados).length)) return;
    var old = document.getElementById('om-aviso'); if (old) old.remove();
    var d = document.createElement('div');
    d.id = 'om-aviso';
    d.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:84px;z-index:99998;max-width:440px;width:calc(100% - 32px);background:#fff;border:2px solid ' + (rel.ok ? '#16a34a' : '#f59e0b') + ';border-radius:14px;padding:14px 16px;box-shadow:0 10px 30px rgba(0,0,0,.2);font:14px/1.45 -apple-system,system-ui,sans-serif;color:#1e293b';
    d.innerHTML = '<div style="font-weight:700;margin-bottom:6px">💾 Dados deste computador ' + (rel.ok ? 'enviados para a sua conta' : 'enviados em parte') + '</div>' +
      textoRelatorio(rel) + '<div style="margin-top:10px;display:flex;gap:8px"><button data-a="v" style="flex:1;padding:8px;border:0;border-radius:8px;background:#ea580c;color:#fff;font-weight:600">Ver detalhes</button>' +
      '<button data-a="f" style="padding:8px 14px;border:0;border-radius:8px;background:#f1f5f9;color:#334155">Fechar</button></div>';
    d.addEventListener('click', function (e) {
      var a = e.target && e.target.getAttribute('data-a');
      if (a === 'v') { d.remove(); abrirPainel(); } else if (a === 'f') d.remove();
    });
    document.body.appendChild(d);
  }

  async function abrirPainel() {
    var old = document.getElementById('om-painel'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'om-painel';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px;font:14px/1.45 -apple-system,system-ui,sans-serif';
    ov.innerHTML = '<div style="background:#fff;color:#1e293b;border-radius:16px;max-width:520px;width:100%;max-height:90vh;overflow:auto;padding:20px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-size:18px;font-weight:700">💾 Dados deste computador</div>' +
      '<button data-a="x" style="border:0;background:none;font-size:22px;color:#64748b;cursor:pointer" aria-label="Fechar">×</button></div>' +
      '<p style="color:#475569;margin:0 0 12px">O que ficou guardado neste navegador (por exemplo, do plano Offline). Nada aqui é apagado.</p>' +
      '<div data-r="local" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:12px">Lendo…</div>' +
      '<label data-r="optp" style="display:none;align-items:center;gap:8px;margin:0 0 10px"><input type="checkbox" data-r="precos"> Usar os preços deste computador nos ingredientes com o mesmo nome</label>' +
      '<div style="display:grid;gap:8px">' +
      '<button data-a="b" style="padding:11px;border:2px solid #cbd5e1;border-radius:10px;background:#fff;font-weight:600;cursor:pointer">⬇️ Baixar backup (arquivo)</button>' +
      '<button data-a="e" style="display:none;padding:11px;border:0;border-radius:10px;background:#ea580c;color:#fff;font-weight:600;cursor:pointer">☁️ Enviar para minha conta</button>' +
      '<button data-a="i" style="display:none;padding:11px;border:2px solid #cbd5e1;border-radius:10px;background:#fff;font-weight:600;cursor:pointer">📂 Importar backup (arquivo) para minha conta</button>' +
      '<input type="file" accept=".json,application/json" data-r="arq" style="display:none"></div>' +
      '<div data-r="resg" style="margin-top:12px"></div>' +
      '<div data-r="st" style="margin-top:12px"></div></div>';
    document.body.appendChild(ov);
    var $ = function (s) { return ov.querySelector('[data-r="' + s + '"]'); };
    var btn = function (a) { return ov.querySelector('[data-a="' + a + '"]'); };
    var logado = !!localStorage.getItem('accessToken') && !!api() && !!(window.ConfigHelper && window.ConfigHelper.isCloudMode && window.ConfigHelper.isCloudMode());
    var ocupado = false, c = null;
    function status(h) { $('st').innerHTML = h; }
    async function enviar(dados, rotulo) {
      if (ocupado) return; ocupado = true;
      status('⏳ Enviando ' + esc(rotulo) + '… <span data-r="pg"></span>');
      try {
        var rel = await migrar(dados, { precos: $('precos').checked, progresso: function (t) { var p = $('pg'); if (p) p.textContent = t; } });
        status('<div style="border:2px solid ' + (rel.ok ? '#16a34a' : '#f59e0b') + ';border-radius:10px;padding:10px">' + textoRelatorio(rel) +
          '<div style="margin-top:6px;color:#475569">Recarregue a página (Cmd+Option+R) para ver tudo.</div></div>');
      } catch (e) { status('<div style="color:#b91c1c">❌ ' + esc(erroMsg(e)) + '</div>'); }
      ocupado = false;
    }
    ov.addEventListener('click', function (e) {
      if (e.target === ov) return ov.remove();
      var a = e.target && e.target.getAttribute && e.target.getAttribute('data-a');
      if (a === 'x') ov.remove();
      else if (a === 'b') baixarBackup(c);
      else if (a === 'e' && c) enviar(c, 'os dados deste computador');
      else if (a === 'i') $('arq').click();
      else if (a === 'rb' || a === 're') {
        var id = Number(e.target.getAttribute('data-id'));
        resguardosDaConta().then(function (l) {
          var x = l.filter(function (y) { return y.id === id; })[0]; if (!x) return;
          if (a === 'rb') baixarBackup(x.copia); else enviar(x.copia, 'a cópia guardada');
        });
      }
    });
    $('arq').addEventListener('change', function () {
      var f = this.files && this.files[0]; this.value = '';
      if (!f) return;
      lerArquivo(f).then(function (dados) {
        if (dados.conta && emailAtual() && dados.conta !== emailAtual() &&
          !confirm('Este backup é da conta ' + dados.conta + '. Enviar mesmo assim para ' + emailAtual() + '?')) return;
        enviar(dados, 'o backup ' + f.name + ' (' + resumo(dados.contagem || {}) + ')');
      }).catch(function (e) { status('<div style="color:#b91c1c">❌ ' + esc(erroMsg(e)) + '</div>'); });
    });

    try { c = await coletar(); } catch (e) { c = null; }
    var info = !c || !temDados(c) ? 'Nenhum dado guardado neste navegador.' : '<b>Guardado aqui:</b> ' + esc(resumo(c.contagem));
    if (c && c.idbDeOutraConta) info += '<div style="color:#92400e;margin-top:6px">Há dados de outra conta neste computador: eles não aparecem aqui.</div>';
    var rel = lsJSON(REL_KEY);
    if (rel && rel.em) info += '<div style="color:#64748b;margin-top:6px">Último envio: ' + new Date(rel.em).toLocaleString('pt-BR') + (rel.ok ? ' ✅' : ' (com ' + rel.falhas.length + ' pendência(s))') + '</div>';
    $('local').innerHTML = info;
    if (!c || !temDados(c)) btn('b').style.display = 'none';
    if (logado) {
      btn('i').style.display = 'block';
      if (c && temDados(c)) { btn('e').style.display = 'block'; $('optp').style.display = 'flex'; }
      var rs = await resguardosDaConta();
      if (rs.length) {
        $('resg').innerHTML = '<div style="font-weight:600;margin-bottom:6px">Cópias guardadas na troca de conta</div>' + rs.map(function (x) {
          return '<div style="border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;margin-bottom:6px">' + new Date(x.id).toLocaleString('pt-BR') + ' · ' + esc(resumo(x.contagem || {})) +
            '<div style="display:flex;gap:6px;margin-top:6px"><button data-a="rb" data-id="' + x.id + '" style="flex:1;padding:6px;border:1px solid #cbd5e1;border-radius:8px;background:#fff">⬇️ Baixar</button>' +
            '<button data-a="re" data-id="' + x.id + '" style="flex:1;padding:6px;border:0;border-radius:8px;background:#ea580c;color:#fff">☁️ Enviar</button></div></div>';
        }).join('');
      }
    } else {
      status('<div style="color:#475569">Para enviar à nuvem, entre com uma conta Standard, Premium ou Vitalícia. O backup pode ser baixado em qualquer plano.</div>');
    }
  }

  window.OfflineMigration = {
    coletar: coletar, temDados: temDados, baixarBackup: baixarBackup, lerArquivo: lerArquivo, migrar: migrar,
    automatico: automatico, guardarResguardo: guardarResguardo, resguardosDaConta: resguardosDaConta,
    abrirPainel: abrirPainel, emailsDe: emailsDe, _norm: norm
  };
  window.openOfflineData = abrirPainel;
})();
