/**
 * Primeiros passos — nov/2026.
 *
 * A conta nova caía na Agenda, com 16 abas e nenhuma indicação de por onde começar. Este roteiro mostra
 * os cinco passos até a primeira proposta enviada e marca sozinho o que a conta já fez (o servidor
 * devolve só contagens). Tocar num passo abre a aba certa. Some quando tudo está feito ou quando a
 * pessoa toca em "Não mostrar mais". Conta que já fez tudo nunca vê nada.
 * Só para o dono da conta.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || window.PrimeirosPassos) return;
  const CHAVE = 'primeirosPassos';        // neste aparelho: 'feito' | 'fechado' | 'recolhido'
  const PASSOS = [
    { id: 'empresa', aba: 'config', titulo: 'Preencha os dados da empresa', dica: 'Nome, telefone e logo aparecem na proposta.', feito: d => !!d.empresa },
    { id: 'prato', aba: 'dishes', titulo: 'Cadastre um prato', dica: 'Com os ingredientes, o sistema calcula o custo.', feito: d => d.pratos > 0 },
    { id: 'cardapio', aba: 'menu', titulo: 'Monte e salve um cardápio', dica: 'Escolha os pratos e toque em salvar.', feito: d => d.cardapios > 0 },
    { id: 'proposta', aba: 'proposals', titulo: 'Crie uma proposta', dica: 'Use o cardápio salvo e os dados do cliente.', feito: d => d.propostas > 0 },
    { id: 'enviar', aba: 'proposals', titulo: 'Envie a proposta ao cliente', dica: 'Por WhatsApp, link ou PDF.', feito: d => d.enviadas > 0 }
  ];
  const guardado = (v) => { try { if (v === undefined) return localStorage.getItem(CHAVE); localStorage.setItem(CHAVE, v); } catch (e) { /* sem armazenamento */ } return null; };
  const api = () => window.PrecificacaoAPI && window.PrecificacaoAPI.api;
  const dono = () => !window.Equipe || !window.Equipe.souDono || window.Equipe.souDono();
  const logado = () => { try { return !!localStorage.getItem('accessToken') && !!document.querySelector('[data-tab]'); } catch (e) { return false; } };
  const celular = () => window.matchMedia && window.matchMedia('(max-width: 1023px)').matches;
  let dados = null, aberto = false, ultima = 0, buscando = false;

  function estilo() {
    if (document.getElementById('pp-css')) return;
    const st = document.createElement('style'); st.id = 'pp-css';
    st.textContent =
      '#primeiros-passos{position:fixed;right:16px;bottom:16px;z-index:39;font-size:14px;line-height:1.35;color:#1f2937;max-width:340px}' +
      '@media (max-width:1023px){#primeiros-passos{right:10px;left:10px;bottom:calc(86px + env(safe-area-inset-bottom,0px));max-width:none}}' +
      '#primeiros-passos .pp-pilula{display:flex;align-items:center;gap:8px;margin-left:auto;background:#ea580c;color:#fff;border:0;border-radius:999px;padding:10px 16px;font-weight:600;box-shadow:0 6px 18px rgba(0,0,0,.2);min-height:44px}' +
      '#primeiros-passos .pp-caixa{background:#fff;border:1px solid #fed7aa;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.18);padding:14px 14px 10px}' +
      '#primeiros-passos .pp-topo{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}' +
      '#primeiros-passos .pp-barra{height:6px;background:#ffedd5;border-radius:999px;overflow:hidden;margin-bottom:8px}' +
      '#primeiros-passos .pp-barra>div{height:100%;background:#ea580c}' +
      '#primeiros-passos .pp-passo{display:flex;align-items:flex-start;gap:10px;width:100%;text-align:left;background:none;border:0;border-radius:10px;padding:8px 6px!important;min-height:44px!important;font-size:14px!important;font-weight:400!important;color:inherit}' +
      '#primeiros-passos .pp-passo:hover{background:#fff7ed}' +
      '#primeiros-passos .pp-marca{flex:0 0 22px;height:22px;border-radius:50%;border:2px solid #fdba74;display:flex;align-items:center;justify-content:center;font-size:13px;color:#fff;margin-top:1px}' +
      '#primeiros-passos .pp-feito .pp-marca{background:#16a34a;border-color:#16a34a}' +
      '#primeiros-passos .pp-feito .pp-titulo{color:#6b7280;text-decoration:line-through}' +
      '#primeiros-passos .pp-titulo{font-weight:600}' +
      '#primeiros-passos .pp-dica{color:#6b7280;font-size:13px}' +
      '#primeiros-passos .pp-rodape{display:flex;justify-content:space-between;margin-top:4px}' +
      '#primeiros-passos .pp-link{background:none;border:0;color:#6b7280;font-size:13px!important;font-weight:400!important;padding:8px 6px!important;min-height:36px!important;text-decoration:underline}';
    document.head.appendChild(st);
  }
  function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; }
  function tirar() { const r = document.getElementById('primeiros-passos'); if (r) r.remove(); }

  function desenhar() {
    if (!dados) return;
    const feitos = PASSOS.filter(p => p.feito(dados)).length;
    if (feitos === PASSOS.length) { guardado('feito'); tirar(); return; }
    estilo();
    let raiz = document.getElementById('primeiros-passos');
    if (!raiz) { raiz = el('div'); raiz.id = 'primeiros-passos'; raiz.setAttribute('data-testid', 'primeiros-passos'); document.body.appendChild(raiz); }
    raiz.textContent = '';
    if (!aberto) {
      const b = el('button', 'pp-pilula', `Primeiros passos · ${feitos} de ${PASSOS.length}`);
      b.setAttribute('data-testid', 'pp-abrir'); b.setAttribute('aria-expanded', 'false');
      b.onclick = () => { aberto = true; desenhar(); };
      raiz.appendChild(b); return;
    }
    const caixa = el('div', 'pp-caixa'); caixa.setAttribute('role', 'region'); caixa.setAttribute('aria-label', 'Primeiros passos');
    const topo = el('div', 'pp-topo'); topo.appendChild(el('strong', '', `Primeiros passos · ${feitos} de ${PASSOS.length}`));
    const rec = el('button', 'pp-link', 'Recolher'); rec.setAttribute('data-testid', 'pp-recolher'); rec.onclick = () => { aberto = false; guardado('recolhido'); desenhar(); };
    topo.appendChild(rec); caixa.appendChild(topo);
    const barra = el('div', 'pp-barra'); const cheio = el('div'); cheio.style.width = Math.round(feitos / PASSOS.length * 100) + '%'; barra.appendChild(cheio); caixa.appendChild(barra);
    const proximo = PASSOS.find(p => !p.feito(dados));
    PASSOS.forEach(p => {
      const ok = p.feito(dados);
      const b = el('button', 'pp-passo' + (ok ? ' pp-feito' : '')); b.setAttribute('data-testid', 'pp-' + p.id); b.setAttribute('data-feito', ok ? '1' : '0');
      b.appendChild(el('span', 'pp-marca', ok ? '✓' : ''));
      const t = el('span'); t.appendChild(el('div', 'pp-titulo', p.titulo)); if (!ok && p === proximo) t.appendChild(el('div', 'pp-dica', p.dica));
      b.appendChild(t);
      b.onclick = () => { const s = window.eventState; if (s && typeof s.setActiveTab === 'function') s.setActiveTab(p.aba); if (celular()) { aberto = false; desenhar(); } };
      caixa.appendChild(b);
    });
    const rod = el('div', 'pp-rodape'); const nao = el('button', 'pp-link', 'Não mostrar mais'); nao.setAttribute('data-testid', 'pp-fechar');
    nao.onclick = () => { guardado('fechado'); tirar(); };
    rod.appendChild(nao); caixa.appendChild(rod);
    raiz.appendChild(caixa);
  }

  async function conferir(forcar) {
    const g = guardado();
    if (g === 'feito' || g === 'fechado') { tirar(); return; }
    if (!logado() || !dono()) { tirar(); return; }
    if (buscando || (!forcar && Date.now() - ultima < 20000)) return;
    const a = api(); if (!a) return;
    buscando = true; ultima = Date.now();
    try {
      const r = await a.request('/api/user-settings/primeiros-passos', { noDedupe: true, semCopiaOffline: true });
      if (r && r.success && r.data) {
        const primeira = dados === null; dados = r.data;
        // na primeira vez neste aparelho abre sozinho; depois fica recolhido até a pessoa tocar
        if (primeira && g !== 'recolhido' && !celular()) aberto = true;
        desenhar();
      }
    } catch (e) { /* API antiga (sem a rota) ou sem conexão: não mostra nada */ } finally { buscando = false; }
  }

  let pronto = false;
  setInterval(() => {
    const g = guardado();
    if (g === 'feito' || g === 'fechado') return;
    if (!logado()) { if (document.getElementById('primeiros-passos')) { tirar(); dados = null; aberto = false; pronto = false; } return; }
    if (!pronto) { pronto = true; setTimeout(() => conferir(true), 2500); }
  }, 1500);
  // a cada troca de aba, confere de novo (no máximo a cada 20 s): o passo recém-feito aparece marcado
  window.addEventListener('tab-changed', () => { if (pronto) setTimeout(() => conferir(false), 800); });
  window.PrimeirosPassos = { conferir: () => conferir(true), _dados: () => dados };
})();
