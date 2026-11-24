/**
 * Perda e rendimento: a conta, num lugar só — nov/2026.
 *
 * A mesma conta estava escrita em 23 pontos (calculator, MenuManager, MenuManager-standalone, ItemsList,
 * DishForm, IngredientsDatabase e menu-refresh). Mudar uma regra pedia achar e mexer em todos, e bastava esquecer um para duas
 * telas mostrarem custos diferentes. Agora cada ponto chama estas funções. Os resultados são os mesmos de
 * antes, número por número (conferido numa grade de valores e nas telas).
 * A API tem o par deste arquivo em src/utils/perdaRendimento.js, conferido contra os mesmos valores
 * (tests/perda-rendimento.mjs, no repositório da API). Mudou aqui, mude lá.
 *
 * Os dois campos que existem nos dados:
 *   lossPercentage  perda em PORCENTO (20 = 20%; 0,5 = 0,5%)
 *   loss            perda em FRAÇÃO   (0,2 = 20%). Campo antigo; valor de 1 para cima é lido como porcento.
 * Rendimento (yieldMultiplier): quanto o ingrediente rende depois de pronto (arroz 3, carne 1). Vazio ou 0 = 1.
 *
 * Duas direções:
 *   pesoPronto      do que entra na receita para o que chega ao prato:  bruto × (1 − perda) × rendimento
 *   brutoPelaPerda  do que precisa chegar para o que tem de ser comprado: líquido ÷ (1 − perda)
 *   brutoPeloRendimento                                                  : quantidade ÷ rendimento
 */
(function (raiz) {
  'use strict';

  /** Perda em porcento a partir dos dois campos. O porcento manda; a fração só vale quando ele está vazio. */
  function perdaEmPorcento(lossPercentage, loss) {
    var p = parseFloat(lossPercentage);
    if (p > 0) return p;
    var d = parseFloat(loss);
    return d > 0 ? (d < 1 ? d * 100 : d) : 0;
  }

  /** Perda em fração a partir do campo "loss" de um item (1 ou mais é lido como porcento). */
  function perdaEmFracao(loss) {
    var l = loss || 0;
    return l >= 1 ? l / 100 : l;
  }

  /** De porcento para fração (20 → 0,2), para gravar o campo "loss" junto do lossPercentage. */
  function porcentoParaFracao(perdaPorcento) {
    return perdaPorcento / 100;
  }

  /** Rendimento como número; vazio, zero ou texto que não é número vale 1. */
  function rendimento(y) {
    return parseFloat(y) || 1;
  }

  /** 1 − perda%, o quanto sobra depois da perda. */
  function sobraDaPerda(perdaPorcento) {
    return 1 - (perdaPorcento / 100);
  }

  /** Peso (ou quantidade) que chega ao prato: bruto × (1 − perda%) × rendimento. */
  function pesoPronto(bruto, perdaPorcento, rend) {
    return bruto * sobraDaPerda(perdaPorcento) * rend;
  }

  /** Quanto comprar para sobrar "liquido" depois da perda (fração). Fração fora de 0–1 não altera. */
  function brutoPelaPerda(liquido, perdaFracao) {
    return perdaFracao > 0 && perdaFracao < 1 ? liquido / (1 - perdaFracao) : liquido;
  }

  /** Quanto precisa cru para render "quantidade" pronta. Rendimento que não é maior que zero não altera. */
  function brutoPeloRendimento(quantidade, rend) {
    return rend > 0 ? quantidade / rend : quantidade;
  }

  var api = { perdaEmPorcento: perdaEmPorcento, perdaEmFracao: perdaEmFracao, porcentoParaFracao: porcentoParaFracao, rendimento: rendimento, sobraDaPerda: sobraDaPerda,
    pesoPronto: pesoPronto, brutoPelaPerda: brutoPelaPerda, brutoPeloRendimento: brutoPeloRendimento };
  raiz.PerdaRendimento = api;
})(typeof window !== 'undefined' ? window : globalThis);
