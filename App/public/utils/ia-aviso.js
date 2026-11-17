/**
 * Aviso e permissão antes de usar os agentes de IA (nov/2026).
 * Os agentes mandam para o nosso servidor e para um serviço de IA de terceiros (Anthropic) o texto que o
 * usuário escreve e alguns dados do cadastro. Antes do primeiro uso de cada agente o app explica o que
 * é enviado e pede o "Concordo" (guardado neste aparelho). Uma linha fixa na tela lembra do envio.
 *
 * No app do iPhone (Capacitor) não há compra nem link de compra de créditos: IAAviso.nativo().
 *
 * API: IAAviso.aceito(tipo) · IAAviso.aceitar(tipo) · IAAviso.html(tipo) · IAAviso.nota(tipo) · IAAviso.nativo()
 *      tipo = 'orcamento' | 'divulgacao'
 */
(function () {
'use strict';
var CHAVE = 'ia_aviso_v1';
var POLITICA = 'https://www.chefazambuja.com/privacy-policy.html';
var TEXTOS = {
  orcamento: {
    para: 'montar o orçamento',
    dados: 'o texto que você escrever e a lista dos seus pratos (nome, categoria e custo)',
    extra: 'Se você escrever o nome ou o telefone de um cliente no pedido, esse dado também é enviado.'
  },
  divulgacao: {
    para: 'escrever a divulgação',
    dados: 'o texto que você escrever, o nome, a cidade e a história da sua empresa e os nomes dos seus pratos',
    extra: 'Evite escrever dados de clientes no pedido.'
  }
};
function ler() { try { var c = JSON.parse(localStorage.getItem(CHAVE) || 'null'); return c && typeof c === 'object' ? c : null; } catch (e) { return null; } }
function aceito(tipo) { var c = ler(); return !!(c && c[tipo]); }
function aceitar(tipo) { try { var c = ler() || {}; c[tipo] = new Date().toISOString(); localStorage.setItem(CHAVE, JSON.stringify(c)); } catch (e) {} }
function nativo() { try { return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()); } catch (e) { return false; } }
function html(tipo) {
  var t = TEXTOS[tipo] || TEXTOS.orcamento;
  return '<div data-testid="ia-aviso">' +
    '<p><b>Antes de começar: este recurso usa inteligência artificial de terceiros.</b></p>' +
    '<p>Para ' + t.para + ', o app envia ao nosso servidor e a um serviço de IA (Anthropic, empresa dos EUA) ' + t.dados + '. ' + t.extra + '</p>' +
    '<p>Esses dados são usados só para gerar a resposta. Nada é publicado nem enviado a clientes sem você mandar. ' +
    '<a href="' + POLITICA + '" target="_blank" rel="noopener" style="color:#c2410c;font-weight:600">Política de Privacidade</a></p></div>';
}
function nota(tipo) {
  var t = TEXTOS[tipo] || TEXTOS.orcamento;
  return '🔒 Para ' + t.para + ', o que você escrever aqui e os dados do cadastro usados são enviados a um serviço de IA (Anthropic).';
}
window.IAAviso = { aceito: aceito, aceitar: aceitar, nativo: nativo, html: html, nota: nota };
})();
