/**
 * Continuar em outro aparelho o cardápio que está sendo montado — nov/2026.
 *
 * O cardápio em montagem (pratos escolhidos, itens, convidados, nome e data do evento, cliente) ficava só no aparelho.
 * Quem começava no celular e sentava no computador encontrava a tela vazia.
 *
 * Como funciona:
 * - quando a pessoa mexe no cardápio, este aparelho deixa uma cópia nas configurações da conta
 *   (emMontagem) e um resumo pequeno (emMontagemInfo: quando, de qual aparelho, quantos itens);
 * - o outro aparelho, ao abrir ou ao voltar para o app, lê só o resumo. Se for de outro aparelho e mais
 *   novo do que o que ele já viu, mostra um aviso com "Continuar aqui" e "Agora não";
 * - a cópia inteira só é baixada quando a pessoa toca em "Continuar aqui". Nada é trocado sozinho.
 * Só para o dono da conta: o cardápio que alguém da equipe está montando não aparece para os outros.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || window.ContinuarMontagem) return;
  const CAMPOS = ['guests', 'items', 'eventName', 'eventDate', 'eventLocation', 'clientData', 'monthsUntilEvent',
    'proteinSafetyPct', 'clientSupply', 'currentEventId', 'linkedMenuId', 'linkedMenuName'];
  const MAXIMO = 400 * 1024;      // cópia maior que isto não é enviada
  const CADA = 15000;             // confere se mudou a cada 15 s; envia quando a mudança ficou parada por um ciclo
  const guardado = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } return null; };
  const aparelho = () => { let id = guardado('aparelhoId'); if (!id) { id = 'a' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); guardado('aparelhoId', id); } return id || 'sem-id'; };
  const nomeDoAparelho = () => { const u = navigator.userAgent || ''; return /iPhone/.test(u) ? 'iPhone' : /iPad/.test(u) ? 'iPad' : /Android/.test(u) ? 'Android' : 'computador'; };
  const resumo = t => { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return String(h >>> 0); };
  const es = () => window.eventState;
  const api = () => window.PrecificacaoAPI && window.PrecificacaoAPI.api;
  const dono = () => !window.Equipe || !window.Equipe.souDono || window.Equipe.souDono();
  const logado = () => !!guardado('accessToken') && !!document.querySelector('[data-tab]');
  // os pratos do cardápio ficam no MenuManager (aba Cardápio); o resto, no estado do evento
  const pratosDoMenu = async () => { const m = window.menuManager; if (!m || !m.getMenu) return []; try { const l = await m.getMenu(); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
  const texto = async () => { const s = es(); if (!s) return null; const d = {}; CAMPOS.forEach(c => { d[c] = s[c] === undefined ? null : s[c]; }); d.menu = await pratosDoMenu(); try { return JSON.stringify(d); } catch (e) { return null; } };
  const conta = t => { try { const d = JSON.parse(t); return { pratos: (d.menu || []).length, itens: (d.items || []).length }; } catch (e) { return { pratos: 0, itens: 0 }; } };
  const config = r => (r && r.success && r.data && (r.data.settingsData || r.data)) || null;   // a API devolve { data: { settingsData } }

  let base = null;        // como estava quando o app abriu (ou depois de "Continuar aqui"): não é mudança desta sessão
  let enviado = null;     // último texto que este aparelho deixou na conta
  let visto = null;       // texto no ciclo anterior
  let deixei = false;     // este aparelho já deixou uma cópia nesta sessão

  async function gravar(parcial) {
    const a = api(); if (!a) return false;
    try { const r = await a.request('/api/user-settings', { method: 'PATCH', body: JSON.stringify({ partialSettings: parcial }) }); return !!(r && r.success); } catch (e) { return false; }
  }

  async function ciclo() {
    if (!logado() || !dono() || !es()) return;
    const t = await texto(); if (t === null) return;
    if (base === null) { base = t; visto = t; return; }
    const parado = t === visto; visto = t;
    if (t === base || t === enviado || !parado) return;         // nada mudou aqui nesta sessão, já foi, ou ainda mexendo
    const n = conta(t);
    if (n.pratos + n.itens === 0) {
      if (deixei) { if (await gravar({ emMontagem: null, emMontagemInfo: null })) { enviado = t; deixei = false; } }
      return;
    }
    if (t.length > MAXIMO) return;
    const s = es();
    const info = { quando: Date.now(), aparelho: aparelho(), nome: nomeDoAparelho(), pratos: n.pratos, itens: n.itens, evento: String(s.eventName || '').slice(0, 80), resumo: resumo(t) };
    if (await gravar({ emMontagem: { dados: JSON.parse(t) }, emMontagemInfo: info })) { enviado = t; deixei = true; guardado('emMontagemVisto', String(info.quando)); }
  }

  function ha(quando) {
    const m = Math.max(0, Math.round((Date.now() - quando) / 60000));
    if (m < 1) return 'agora há pouco'; if (m < 60) return `há ${m} min`;
    const h = Math.round(m / 60); if (h < 24) return `há ${h} h`;
    const d = Math.round(h / 24); return d === 1 ? 'ontem' : `há ${d} dias`;
  }
  function fechar() { const b = document.getElementById('continuar-montagem'); if (b) b.remove(); }

  function avisar(info, tem) {
    fechar();
    const plural = (q, um, varios) => `${q} ${q === 1 ? um : varios}`;
    const oQue = [info.pratos ? plural(info.pratos, 'prato', 'pratos') : '', info.itens ? plural(info.itens, 'item', 'itens') : ''].filter(Boolean).join(' e ');
    const b = document.createElement('div');
    b.id = 'continuar-montagem'; b.setAttribute('data-testid', 'continuar-montagem'); b.setAttribute('role', 'status');
    b.style.cssText = 'position:fixed;left:12px;right:12px;top:calc(env(safe-area-inset-top,0px) + 12px);z-index:9000;max-width:560px;margin:0 auto;' +
      'background:#fff;border:1px solid #fdba74;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.18);padding:14px 16px;font-size:14px;line-height:1.4;color:#1f2937';
    const linha = document.createElement('div');
    const forte = document.createElement('strong'); forte.textContent = `Cardápio em montagem no ${info.nome || 'outro aparelho'}`;
    linha.appendChild(forte);
    linha.appendChild(document.createTextNode(` — ${info.evento ? info.evento + ', ' : ''}${oQue}, ${ha(info.quando)}.`));
    b.appendChild(linha);
    if (tem) { const obs = document.createElement('div'); obs.style.cssText = 'color:#6b7280;font-size:13px;margin-top:2px'; obs.textContent = 'Continuar aqui troca o que está montado neste aparelho.'; b.appendChild(obs); }
    const erro = document.createElement('div'); erro.style.cssText = 'color:#b91c1c;font-size:13px;margin-top:4px;display:none'; erro.setAttribute('data-testid', 'cm-erro'); b.appendChild(erro);
    const botoes = document.createElement('div'); botoes.style.cssText = 'display:flex;gap:8px;margin-top:10px';
    const sim = document.createElement('button'); sim.textContent = 'Continuar aqui'; sim.setAttribute('data-testid', 'cm-continuar');
    sim.style.cssText = 'flex:1;background:#ea580c;color:#fff;border:0;border-radius:10px;padding:10px 12px;font-weight:600';
    const nao = document.createElement('button'); nao.textContent = 'Agora não'; nao.setAttribute('data-testid', 'cm-agora-nao');
    nao.style.cssText = 'background:#fff;color:#374151;border:1px solid #d1d5db;border-radius:10px;padding:10px 12px;font-weight:600';
    nao.onclick = () => { guardado('emMontagemVisto', String(info.quando)); fechar(); };
    sim.onclick = async () => {
      sim.disabled = true; sim.textContent = 'Trazendo…';
      try {
        const r = await api().request('/api/user-settings?sem=ingredientsDatabase');
        const cfg = config(r); const c = cfg && cfg.emMontagem && cfg.emMontagem.dados;
        if (!c || typeof c !== 'object') throw new Error('vazio');
        const s = es();
        if (Array.isArray(c.menu) && window.menuManager && window.menuManager.restoreMenu) await window.menuManager.restoreMenu(c.menu);
        CAMPOS.forEach(k => { const f = s['set' + k.charAt(0).toUpperCase() + k.slice(1)]; if (typeof f === 'function' && c[k] !== undefined) f(c[k]); });
        guardado('emMontagemVisto', String(info.quando));
        // o que acabou de chegar não é mudança deste aparelho: não reenviar
        setTimeout(async () => { const t = await texto(); base = t; visto = t; enviado = t; }, 600);
        fechar();
        if (typeof s.setActiveTab === 'function') s.setActiveTab('menu');
      } catch (e) {
        erro.textContent = 'Não consegui trazer o cardápio agora. Confira a conexão e tente de novo.'; erro.style.display = 'block';
        sim.disabled = false; sim.textContent = 'Continuar aqui';
      }
    };
    botoes.appendChild(sim); botoes.appendChild(nao); b.appendChild(botoes);
    document.body.appendChild(b);
  }

  async function olhar(dados) {
    if (!dados || !logado() || !dono()) return;
    const info = dados.emMontagemInfo;
    if (!info || typeof info !== 'object' || !info.quando || !((info.pratos || 0) + (info.itens || 0))) { fechar(); return; }
    if (info.aparelho === aparelho()) return;
    if (Number(guardado('emMontagemVisto') || 0) >= Number(info.quando)) return;
    const t = await texto(); if (t !== null && resumo(t) === info.resumo) return;      // já está igual neste aparelho
    const n = t === null ? { pratos: 0, itens: 0 } : conta(t);
    avisar(info, n.pratos + n.itens > 0);
  }

  async function olharNoServidor() {
    const a = api(); if (!a || !logado() || !dono()) return;
    try { const cfg = config(await a.request('/api/user-settings')); if (cfg) await olhar(cfg); } catch (e) { /* sem conexão */ }
  }

  // ao abrir e a cada volta ao app, o useEventState lê as configurações e avisa: é essa leitura que se usa aqui.
  // Se o aviso da abertura não chegar em 12 s (ou chegar antes de a tela estar pronta), este arquivo lê por conta própria.
  let abriu = false, pendente = null, olhou = false;
  const usar = dados => { if (!logado() || !es()) { pendente = dados; return; } olhou = true; pendente = null; olhar(dados).catch(() => {}); };
  const espera = setInterval(() => {
    if (!logado() || !es() || !api()) return;
    if (pendente) usar(pendente);
    if (!abriu) { abriu = true; setTimeout(() => { if (!olhou) olharNoServidor(); }, 12000); }
  }, 1000);
  setTimeout(() => clearInterval(espera), 10 * 60 * 1000);
  window.addEventListener('configuracoes-conferidas', e => { if (e && e.detail && e.detail.dados) usar(e.detail.dados); });
  setInterval(() => { ciclo().catch(() => {}); }, CADA);

  window.ContinuarMontagem = { ciclo, olhar, olharNoServidor, aparelho, _estado: () => ({ base: base && base.length, enviado: enviado && enviado.length, deixei }) };
})();
