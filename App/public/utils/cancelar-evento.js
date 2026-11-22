/**
 * Cancelar evento já fechado (nov/2026) — todos os planos.
 *
 * CancelarEvento.abrir({ proposal }) abre a janela: motivo, data e o que fazer com o que já foi recebido
 * (reter tudo, devolver tudo ou devolver uma parte). No Premium/Vitalício a devolução entra no Financeiro
 * como conta a pagar e a conta a receber em aberto some.
 * CancelarEvento.cancelada(proposal) diz se a proposta é um evento cancelado (para o selo do cartão).
 *
 * A proposta cancelada fica na etapa "Perdido" com o motivo começando por "Cancelado", mas não conta como
 * venda perdida nos relatórios. Para desfazer: voltar a proposta para "Fechado" no Funil.
 * API: GET /api/proposals/:id/cancelamento · POST /api/proposals/:id/cancelar
 */
(function () {
'use strict';
var api = function () { return window.PrecificacaoAPI && window.PrecificacaoAPI.api; };
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
var brl = function (v) { return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
var hojeISO = function () { var h = new Date(); return h.getFullYear() + '-' + ('0' + (h.getMonth() + 1)).slice(-2) + '-' + ('0' + h.getDate()).slice(-2); };
var dataBR = function (d) { try { return new Date(d).toLocaleDateString('pt-BR'); } catch (e) { return ''; } };
var MOTIVOS = ['Cliente desistiu do evento', 'Mudança de data sem acordo', 'Falta de pagamento', 'Motivo de saúde ou luto', 'Cancelado pela empresa'];

function cancelada(p) {
  if (!p) return false;
  var perdida = p.stage ? p.stage === 'lost' : p.status === 'rejected';
  return !!perdida && /^cancelado(\b|:)/i.test(String(p.lostReason || '').trim());
}
function fechada(p) { return !!p && p.status !== 'deleted' && (p.stage ? p.stage === 'won' : (p.status === 'accepted' || p.status === 'paid')); }

var CSS = '#ce-ov{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:99990;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom))}' +
  '#ce-ov .ce-cx{background:#fff;border-radius:16px;max-width:480px;width:100%;margin:auto;padding:20px;box-shadow:0 20px 50px rgba(0,0,0,.25);font-size:15px;color:#1f2937}' +
  '#ce-ov h2{margin:0;font-size:19px;line-height:1.25}#ce-ov .ce-sub{color:#6b7280;font-size:13px;margin:2px 0 12px}' +
  '#ce-ov .ce-topo{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}' +
  '#ce-ov .ce-x{border:0;background:#f3f4f6;border-radius:10px;width:36px;height:36px;font-size:18px;cursor:pointer;flex:none}' +
  '#ce-ov label{display:block;font-size:13px;font-weight:600;color:#374151;margin:12px 0 4px}' +
  '#ce-ov input[type=text],#ce-ov input[type=date],#ce-ov input[type=number],#ce-ov select{width:100%;box-sizing:border-box;padding:10px;border:1px solid #d1d5db;border-radius:10px;font:inherit;font-size:16px;background:#fff;color:#111827}' +
  '#ce-ov .ce-cx2{border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-top:14px}#ce-ov .ce-av{background:#fffbeb;border-color:#fde68a}#ce-ov .ce-ok{background:#ecfdf5;border-color:#a7f3d0}#ce-ov .ce-ver{background:#fef2f2;border-color:#fecaca;color:#991b1b}' +
  '#ce-ov .ce-op{display:flex;gap:8px;align-items:flex-start;font-weight:400;font-size:15px;margin:8px 0 0;cursor:pointer}#ce-ov .ce-op input{width:18px;height:18px;margin-top:2px;flex:none}' +
  '#ce-ov .ce-lin{display:flex;gap:8px}#ce-ov .ce-lin>div{flex:1}' +
  '#ce-ov .ce-b{display:flex;align-items:center;justify-content:center;width:100%;padding:12px 14px;border-radius:10px;border:0;font-weight:700;font-size:15px;cursor:pointer;font-family:inherit;margin-top:14px}' +
  '#ce-ov .ce-per{background:#b91c1c;color:#fff}#ce-ov .ce-sec{background:#fff;color:#374151;border:1px solid #d1d5db;margin-top:8px}#ce-ov .ce-b[disabled]{opacity:.6;cursor:default}' +
  '#ce-ov .ce-erro{color:#b91c1c;font-size:13px;margin-top:10px}#ce-ov .ce-nota{color:#6b7280;font-size:12px;margin-top:10px}#ce-ov ul{margin:6px 0 0;padding-left:20px;list-style:disc}#ce-ov li{margin:2px 0}';

function fechar() { var o = document.getElementById('ce-ov'); if (o) o.remove(); document.removeEventListener('keydown', esc27); }
function esc27(e) { if (e.key === 'Escape') fechar(); }

/** Atualiza a lista de propostas e o funil depois de cancelar */
function avisarTelas(proposal, motivo) {
  var campos = { stage: 'lost', status: 'rejected', lostReason: 'Cancelado: ' + motivo };
  try { if (window.CRM && window.CRM.patchProposalCache) window.CRM.patchProposalCache(proposal.id, campos); } catch (e) { /* ignore */ }
  var pm = window.PrecificacaoAPI && window.PrecificacaoAPI.proposalManager;
  var depois = function () { try { window.dispatchEvent(new CustomEvent('proposalSaved', { detail: { proposalId: proposal.id, cancelada: true } })); } catch (e) { /* ignore */ } };
  if (pm && typeof pm.loadProposals === 'function') Promise.resolve().then(function () { return pm.loadProposals(); }).then(depois, depois); else depois();
}

function abrir(op) {
  var proposal = (op && op.proposal) || {};
  if (!api() || !proposal.id) return;
  fechar();
  if (!document.getElementById('ce-css')) { var st = document.createElement('style'); st.id = 'ce-css'; st.textContent = CSS; document.head.appendChild(st); }
  var ov = document.createElement('div'); ov.id = 'ce-ov';
  ov.addEventListener('click', function (e) { if (e.target === ov) fechar(); });
  document.addEventListener('keydown', esc27);
  document.body.appendChild(ov);
  var topo = '<div class="ce-topo"><div><h2>🚫 Cancelar evento</h2><div class="ce-sub">' + esc(proposal.title || proposal.clientName || 'Proposta') + '</div></div><button class="ce-x" id="ce-fechar" aria-label="Fechar">✕</button></div>';
  var pintar = function (miolo) { ov.innerHTML = '<div class="ce-cx" role="dialog" aria-modal="true" aria-label="Cancelar evento" data-testid="ce-janela">' + topo + miolo + '</div>'; ov.querySelector('#ce-fechar').onclick = fechar; };
  var q = function (s) { return ov.querySelector(s); };

  var formulario = function (d) {
    if (d.cancelada) return pintar('<div class="ce-cx2 ce-ver" data-testid="ce-ja"><b>Este evento já está cancelado</b>' + (d.canceladaEm ? ' desde ' + esc(dataBR(d.canceladaEm)) : '') + '.' + (d.motivo ? '<br>Motivo: ' + esc(d.motivo) : '') + '</div><div class="ce-nota">Para desfazer, volte a proposta para "Fechado" no Funil.</div>');
    if (!d.fechada) return pintar('<div class="ce-cx2 ce-av" data-testid="ce-aberta">Só dá para cancelar um evento já fechado. Uma proposta em aberto vai para "Perdido" no Funil.</div>');
    var temRecebido = d.recebido > 0;
    var efeitos = ['A proposta sai de "Fechado" e fica como <b>Cancelado</b> (não conta como venda perdida).'];
    if (d.financeiro && d.aReceberAutomatico > 0) efeitos.push('A conta a receber de <b>' + esc(brl(d.aReceberAutomatico)) + '</b> sai do Financeiro.');
    if (d.contratoAssinado) efeitos.push('O contrato assinado fica guardado, e a página do cliente passa a mostrar <b>Contrato cancelado</b>.');
    if (d.contratosPendentes > 0) efeitos.push('O contrato que ainda esperava assinatura deixa de valer.');
    efeitos.push('O PIX do sinal some das páginas do cliente.');
    if (d.contasManuaisAbertas > 0) efeitos.push('<b>Atenção:</b> ' + d.contasManuaisAbertas + ' conta(s) a receber lançada(s) à mão (' + esc(brl(d.valorManuaisAbertas)) + ') continuam em aberto. Confira no Financeiro.');
    var recebido = temRecebido ? '<div class="ce-cx2" data-testid="ce-recebido"><b>Já recebido: ' + esc(brl(d.recebido)) + '</b>' +
      '<label class="ce-op"><input type="radio" name="ce-dev" value="reter" checked><span>Reter tudo (fica como receita do cancelamento)</span></label>' +
      '<label class="ce-op"><input type="radio" name="ce-dev" value="tudo"><span>Devolver tudo ao cliente</span></label>' +
      '<label class="ce-op"><input type="radio" name="ce-dev" value="parte"><span>Devolver uma parte</span></label>' +
      '<div id="ce-dev-campos" style="display:none"><div class="ce-lin"><div><label for="ce-valor">Valor a devolver (R$)</label><input id="ce-valor" type="number" inputmode="decimal" min="0" step="0.01" max="' + d.recebido + '"></div>' +
      '<div><label for="ce-quando">Devolver até</label><input id="ce-quando" type="date" value="' + hojeISO() + '"></div></div>' +
      '<div class="ce-nota" id="ce-resumo"></div></div>' +
      '<div class="ce-nota">' + (d.financeiro ? 'A devolução entra no Financeiro como conta a pagar; você marca como paga quando transferir.' : 'O valor combinado fica registrado na proposta.') + '</div></div>' : '';
    pintar('<label for="ce-motivo-sel">Motivo</label><select id="ce-motivo-sel" data-testid="ce-motivo-sel">' + MOTIVOS.map(function (m) { return '<option>' + esc(m) + '</option>'; }).join('') + '<option value="">Outro (escrever)</option></select>' +
      '<input id="ce-motivo" type="text" maxlength="200" placeholder="Escreva o motivo" style="display:none;margin-top:8px" data-testid="ce-motivo" aria-label="Motivo do cancelamento">' +
      '<label for="ce-data">Data do cancelamento</label><input id="ce-data" type="date" max="' + hojeISO() + '" value="' + hojeISO() + '" data-testid="ce-data">' +
      recebido +
      '<div class="ce-cx2 ce-av" data-testid="ce-efeitos"><b>O que acontece</b><ul><li>' + efeitos.join('</li><li>') + '</li></ul></div>' +
      '<div class="ce-erro" id="ce-erro" role="alert" style="display:none"></div>' +
      '<button class="ce-b ce-per" id="ce-confirmar" data-testid="ce-confirmar">Cancelar o evento</button>' +
      '<button class="ce-b ce-sec" id="ce-voltar">Voltar sem cancelar</button>' +
      '<div class="ce-nota">Para desfazer depois, volte a proposta para "Fechado" no Funil.</div>');
    q('#ce-voltar').onclick = fechar;
    q('#ce-motivo-sel').onchange = function () { q('#ce-motivo').style.display = this.value ? 'none' : 'block'; if (!this.value) q('#ce-motivo').focus(); };
    var modo = function () { var r = ov.querySelector('input[name="ce-dev"]:checked'); return r ? r.value : 'reter'; };
    var resumo = function () {
      if (!temRecebido) return;
      var er0 = q('#ce-erro'); if (er0) er0.style.display = 'none';
      var m = modo(), campos = q('#ce-dev-campos'); campos.style.display = m === 'reter' ? 'none' : 'block';
      if (m === 'tudo') { q('#ce-valor').value = Number(d.recebido).toFixed(2); q('#ce-valor').readOnly = true; } else q('#ce-valor').readOnly = false;
      var v = m === 'reter' ? 0 : (parseFloat(String(q('#ce-valor').value).replace(',', '.')) || 0);
      q('#ce-resumo').textContent = 'Devolve ' + brl(v) + ' · fica retido ' + brl(Math.max(0, d.recebido - v));
    };
    if (temRecebido) { Array.prototype.forEach.call(ov.querySelectorAll('input[name="ce-dev"]'), function (r) { r.onchange = resumo; }); q('#ce-valor').oninput = resumo; }
    q('#ce-confirmar').onclick = function () {
      var er = q('#ce-erro'), falha = function (m) { er.textContent = m; er.style.display = 'block'; q('#ce-confirmar').disabled = false; q('#ce-confirmar').textContent = 'Cancelar o evento'; };
      er.style.display = 'none';
      var motivo = (q('#ce-motivo-sel').value || q('#ce-motivo').value || '').trim();
      if (!motivo) return falha('Escreva o motivo do cancelamento.');
      var m = modo(), devolver = !temRecebido || m === 'reter' ? 0 : (m === 'tudo' ? d.recebido : (parseFloat(String(q('#ce-valor').value).replace(',', '.')) || 0));
      if (m === 'parte' && !(devolver > 0)) return falha('Informe o valor a devolver.');
      if (devolver > d.recebido + 0.005) return falha('A devolução não pode ser maior que o recebido (' + brl(d.recebido) + ').');
      q('#ce-confirmar').disabled = true; q('#ce-confirmar').textContent = 'Cancelando…';
      api().request('/api/proposals/' + encodeURIComponent(proposal.id) + '/cancelar', { method: 'POST', body: JSON.stringify({ motivo: motivo, data: q('#ce-data').value, devolver: devolver, dataDevolucao: devolver > 0 ? q('#ce-quando').value : undefined }) })
        .then(function (r) {
          var x = (r && r.data) || {};
          pintar('<div class="ce-cx2 ce-ok" data-testid="ce-feito"><b>Evento cancelado.</b>' +
            (d.recebido > 0 ? '<br>Retido: <b>' + esc(brl(x.retido)) + '</b> · a devolver: <b>' + esc(brl(x.devolver)) + '</b>' + (x.devolucaoNoFinanceiro ? ' (lançado no Financeiro como conta a pagar)' : '') : '') + '</div>' +
            '<button class="ce-b ce-sec" id="ce-ok">Fechar</button>');
          q('#ce-ok').onclick = fechar;
          avisarTelas(proposal, motivo);
        }).catch(function (e) { falha((e && e.message) || 'Não foi possível cancelar agora. Tente de novo.'); });
    };
  };
  pintar('<p class="ce-sub" data-testid="ce-carregando">Carregando…</p>');
  api().request('/api/proposals/' + encodeURIComponent(proposal.id) + '/cancelamento', { method: 'GET', noDedupe: true, timeoutMs: 20000 })
    .then(function (r) { formulario((r && r.data) || {}); })
    .catch(function (e) { pintar('<p class="ce-erro" role="alert">' + esc((e && e.message) || 'Não foi possível carregar.') + '</p>'); });
}

window.CancelarEvento = { abrir: abrir, cancelada: cancelada, fechada: fechada };
})();
