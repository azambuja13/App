(function () {
'use strict';
/**
 * Insumos do cliente no evento (aba Itens) — window.ClientSupplyPanel
 * props: value (state.clientSupply), onChange(novo), itemsCalculated, support, guests, costs
 * O que o cliente compra sai do custo e do preço; entra a taxa de preparo por convidado (utils/client-supply.js).
 */
const h = React.createElement;
const { useState } = React;
const brl = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const parseNum = v => { const n = parseFloat(String(v == null ? '' : v).replace(/\./g, (m, i, s) => (/,/.test(s) ? '' : m)).replace(',', '.')); return isFinite(n) ? n : NaN; };

function ClientSupplyPanel({ value, onChange, itemsCalculated, support, guests, costs }) {
  const CS = window.ClientSupply;
  const [aberto, setAberto] = useState({});
  const [taxaTxt, setTaxaTxt] = useState(null);
  if (!CS) return null;
  const v = CS.normalizar(value);
  const set = patch => onChange({ ...v, ...patch });
  const opcoes = CS.opcoes(itemsCalculated);
  const lista = CS.listaDoEvento(itemsCalculated, support, value);
  const nApoio = (support || []).filter(i => i && i.active && i.clientProvides).length;
  const togCat = cat => set({ categories: v.categories.includes(cat) ? v.categories.filter(c => c !== cat) : v.categories.concat([cat]) });
  const togItem = nome => { const n = CS.norm(nome); set({ items: v.items.includes(n) ? v.items.filter(x => x !== n) : v.items.concat([n]) }); };
  const imprimir = () => {
    const html = CS.htmlLista('Lista de compras do cliente', lista, `${guests || 0} convidados · itens que o cliente compra para o evento`);
    if (window.ShareFile) window.ShareFile.printHtml(html, { fileName: 'lista-do-cliente.pdf' });
  };
  const caixa = { border: '2px solid ' + (v.enabled ? '#fdba74' : '#e5e7eb'), background: v.enabled ? '#fff7ed' : '#fff', borderRadius: 14, padding: 16 };
  const chk = { width: 20, height: 20, flexShrink: 0 };
  return h('div', { style: caixa, 'data-client-supply': true },
    h('label', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' } },
      h('input', { type: 'checkbox', style: { ...chk, marginTop: 3 }, checked: v.enabled, 'aria-label': 'O cliente fornece insumos', onChange: e => set({ enabled: e.target.checked }) }),
      h('span', null,
        h('span', { style: { fontWeight: 800, fontSize: 17, color: '#111827' } }, '🧺 O cliente fornece insumos neste evento'),
        h('span', { style: { display: 'block', fontSize: 13, color: '#6b7280', marginTop: 2 } }, 'Marque o que o cliente compra: sai do custo e do preço. Você cobra mão de obra, apoio, transporte e a taxa de preparo.'))),
    v.enabled && h('div', { style: { marginTop: 14 } },
      h('div', { style: { display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' } },
        h('div', null,
          h('div', { style: { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 } }, 'Taxa de preparo por convidado (R$)'),
          h('input', { type: 'text', inputMode: 'decimal', 'aria-label': 'Taxa de preparo por convidado', placeholder: '0,00',
            value: taxaTxt != null ? taxaTxt : (v.prepFeePerGuest ? String(v.prepFeePerGuest).replace('.', ',') : ''),
            onChange: e => setTaxaTxt(e.target.value.replace(/[^0-9.,]/g, '')),
            onBlur: () => { if (taxaTxt == null) return; const n = parseNum(taxaTxt); set({ prepFeePerGuest: n > 0 ? Math.round(n * 100) / 100 : 0 }); setTaxaTxt(null); },
            style: { width: 140, padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15, fontWeight: 700 } })),
        h('div', { style: { fontSize: 14, color: '#374151', paddingBottom: 8 } }, v.prepFeePerGuest > 0 ? `= ${brl(CS.taxa(value, guests))} para ${guests || 0} convidados` : 'Opcional: o seu trabalho de preparo, cobrado por pessoa.')),
      h('div', { style: { fontSize: 13, fontWeight: 700, color: '#374151', margin: '14px 0 6px' } }, 'O que o cliente compra'),
      !opcoes.length ? h('div', { style: { fontSize: 14, color: '#6b7280' } }, 'Monte o cardápio e gere a lista de compras para escolher os itens.') :
      opcoes.map(({ cat, itens }) => {
        const todaCat = v.categories.includes(cat);
        const marcados = itens.filter(i => todaCat || v.items.includes(CS.norm(i.name))).length;
        return h('div', { key: cat, style: { background: '#fff', border: '1px solid #fed7aa', borderRadius: 10, padding: '8px 10px', marginBottom: 6 } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } },
            h('label', { style: { display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontWeight: 700, color: '#111827' } },
              h('input', { type: 'checkbox', style: chk, checked: todaCat, 'aria-label': 'Cliente compra ' + cat, onChange: () => togCat(cat) }),
              cat, h('span', { style: { fontWeight: 400, color: '#6b7280', fontSize: 13 } }, todaCat ? '(todos)' : marcados ? `(${marcados} de ${itens.length})` : `(${itens.length} itens)`)),
            h('button', { type: 'button', onClick: () => setAberto(a => ({ ...a, [cat]: !a[cat] })), style: { background: 'none', border: 0, color: '#c2410c', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: '2px 4px', minHeight: 0 } }, aberto[cat] ? 'fechar' : 'escolher itens')),
          aberto[cat] && h('div', { style: { marginTop: 6, paddingLeft: 28 } }, itens.map(i => h('label', { key: i.name, style: { display: 'flex', gap: 8, alignItems: 'center', padding: '3px 0', fontSize: 14, color: todaCat ? '#9ca3af' : '#374151', cursor: todaCat ? 'default' : 'pointer' } },
            h('input', { type: 'checkbox', style: { width: 18, height: 18 }, disabled: todaCat, checked: todaCat || v.items.includes(CS.norm(i.name)), 'aria-label': 'Cliente compra ' + i.name, onChange: () => togItem(i.name) }),
            h('span', { style: { flex: 1 } }, i.name), h('span', { style: { color: '#6b7280', fontSize: 13, whiteSpace: 'nowrap' } }, i.qty)))));
      }),
      h('div', { style: { fontSize: 13, color: '#6b7280', marginTop: 8 } }, nApoio
        ? `🧺 ${nApoio} item(ns) de apoio o cliente traz (marcados na aba Apoio).`
        : '🧺 Itens de apoio que o cliente traz (carvão, gelo, descartáveis): marque "O cliente traz" no item, na aba Apoio.'),
      h('div', { style: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', marginTop: 12, fontSize: 14, color: '#374151' }, 'data-client-supply-resumo': true },
        h('div', null, 'O cliente compra ', h('b', null, `${lista.itens.length} ingrediente(s)`), lista.apoio.length ? h('span', null, ' e ', h('b', null, `${lista.apoio.length} item(ns) de apoio`)) : null,
          ': ', h('b', null, brl(lista.custoItens + lista.custoApoio)), ' saem do custo do evento.'),
        costs && costs.clientMenuPrice > 0 ? h('div', null, 'No preço dos pratos, sai ', h('b', null, brl(costs.clientMenuPrice)), ' (essa parte do cardápio com a sua margem).') : null,
        h('div', null, 'Taxa de preparo: ', h('b', null, brl(CS.taxa(value, guests))), '.')),
      (lista.itens.length || lista.apoio.length) ? h('button', { type: 'button', onClick: imprimir, style: { marginTop: 10, background: '#ea580c', color: '#fff', border: 0, borderRadius: 10, padding: '10px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 14 } }, '📋 Lista de compras do cliente') : null));
}

/** Mesma escolha na proposta (window.ClientSupplyProposalBox): categorias e itens dos pratos do cardápio escolhido.
 *  props: value, onChange, pratos, db, guests, lista ({ itens, apoio } calculada pelo builder), clientCost (R$ que saiu) */
function ClientSupplyProposalBox({ value, onChange, pratos, db, guests, lista, clientCost }) {
  const CS = window.ClientSupply;
  const [aberto, setAberto] = useState({});
  const [taxaTxt, setTaxaTxt] = useState(null);
  if (!CS) return null;
  const v = CS.normalizar(value);
  const set = patch => onChange({ ...v, ...patch });
  const opcoes = CS.opcoesDosPratos(pratos, db);
  const togCat = cat => set({ categories: v.categories.includes(cat) ? v.categories.filter(c => c !== cat) : v.categories.concat([cat]) });
  const togItem = nome => { const n = CS.norm(nome); set({ items: v.items.includes(n) ? v.items.filter(x => x !== n) : v.items.concat([n]) }); };
  const chk = { width: 18, height: 18, flexShrink: 0 };
  const itensL = (lista && lista.itens) || [], apoioL = (lista && lista.apoio) || [];
  return h('div', { 'data-client-supply-proposta': true, style: { border: '2px solid ' + (v.enabled ? '#fdba74' : '#e5e7eb'), background: v.enabled ? '#fff7ed' : '#fff', borderRadius: 12, padding: 12, marginBottom: 12 } },
    h('label', { style: { display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' } },
      h('input', { type: 'checkbox', style: { ...chk, marginTop: 2 }, checked: v.enabled, 'aria-label': 'O cliente fornece insumos', onChange: e => set({ enabled: e.target.checked }) }),
      h('span', null, h('b', { style: { fontSize: 15 } }, '🧺 O cliente fornece insumos'),
        h('span', { style: { display: 'block', fontSize: 12, color: '#6b7280' } }, 'O que ele compra sai do preço; entra a taxa de preparo. A proposta mostra a lista do que o cliente precisa comprar.'))),
    v.enabled && h('div', { style: { marginTop: 10 } },
      h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' } },
        h('span', { style: { fontSize: 13, fontWeight: 600 } }, 'Taxa de preparo por convidado (R$)'),
        h('input', { type: 'text', inputMode: 'decimal', 'aria-label': 'Taxa de preparo por convidado', placeholder: '0,00',
          value: taxaTxt != null ? taxaTxt : (v.prepFeePerGuest ? String(v.prepFeePerGuest).replace('.', ',') : ''),
          onChange: e => setTaxaTxt(e.target.value.replace(/[^0-9.,]/g, '')),
          onBlur: () => { if (taxaTxt == null) return; const n = parseNum(taxaTxt); set({ prepFeePerGuest: n > 0 ? Math.round(n * 100) / 100 : 0 }); setTaxaTxt(null); },
          style: { width: 110, padding: '6px 8px', border: '1px solid #fdba74', borderRadius: 8, fontWeight: 700 } }),
        v.prepFeePerGuest > 0 ? h('span', { style: { fontSize: 13, color: '#374151' } }, `= ${brl(CS.taxa(value, guests))}`) : null),
      !opcoes.length ? h('div', { style: { fontSize: 13, color: '#6b7280', marginTop: 8 } }, 'Escolha o cardápio para marcar o que o cliente compra.') :
      h('div', { style: { marginTop: 8 } }, opcoes.map(({ cat, itens }) => {
        const todaCat = v.categories.includes(cat);
        const marcados = itens.filter(i => todaCat || v.items.includes(CS.norm(i.name))).length;
        return h('div', { key: cat, style: { background: '#fff', border: '1px solid #fed7aa', borderRadius: 8, padding: '6px 8px', marginBottom: 4 } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 } },
            h('label', { style: { display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer', fontWeight: 600, fontSize: 14 } },
              h('input', { type: 'checkbox', style: chk, checked: todaCat, 'aria-label': 'Cliente compra ' + cat, onChange: () => togCat(cat) }),
              cat, h('span', { style: { fontWeight: 400, color: '#6b7280', fontSize: 12 } }, todaCat ? '(todos)' : marcados ? `(${marcados} de ${itens.length})` : `(${itens.length})`)),
            h('button', { type: 'button', onClick: () => setAberto(a => ({ ...a, [cat]: !a[cat] })), style: { background: 'none', border: 0, color: '#c2410c', fontWeight: 600, cursor: 'pointer', fontSize: 12, padding: '2px 4px', minHeight: 0 } }, aberto[cat] ? 'fechar' : 'escolher itens')),
          aberto[cat] && h('div', { style: { paddingLeft: 24, marginTop: 4 } }, itens.map(i => h('label', { key: i.name, style: { display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, padding: '2px 0', color: todaCat ? '#9ca3af' : '#374151' } },
            h('input', { type: 'checkbox', style: { width: 16, height: 16 }, disabled: todaCat, checked: todaCat || v.items.includes(CS.norm(i.name)), 'aria-label': 'Cliente compra ' + i.name, onChange: () => togItem(i.name) }), i.name))));
      })),
      h('div', { style: { fontSize: 13, color: '#374151', marginTop: 8 } },
        itensL.length || apoioL.length
          ? h('span', null, 'Na proposta: ', h('b', null, `${itensL.length} ingrediente(s)`), apoioL.length ? ` e ${apoioL.length} item(ns) de apoio` : '', ' para o cliente comprar', clientCost > 0 ? h('span', null, ' · ', h('b', null, brl(clientCost)), ' fora do preço') : null, '.')
          : 'Nenhum item marcado: só a taxa de preparo muda o preço.'),
      apoioL.length ? null : h('div', { style: { fontSize: 12, color: '#6b7280', marginTop: 4 } }, 'Apoio que o cliente traz vem do evento (aba Apoio) ao puxar os dados do evento.')));
}

/** Seção da proposta (pré-visualização): "Insumos por conta do cliente" — window.ClientSupplySection({ proposal }) */
function ClientSupplySection({ proposal }) {
  const l = proposal && proposal.clientSupplyList;
  const itens = (l && Array.isArray(l.itens)) ? l.itens : [], apoio = (l && Array.isArray(l.apoio)) ? l.apoio : [];
  if (!itens.length && !apoio.length) return null;
  const grupos = {}, ordem = [];
  itens.forEach(i => { const c = i.category || 'Outros'; if (!grupos[c]) { grupos[c] = []; ordem.push(c); } grupos[c].push(i); });
  if (apoio.length) { grupos.Apoio = apoio; ordem.push('Apoio'); }
  const g = parseInt(proposal.guests) || 0;
  return h('div', { className: 'mb-8', 'data-client-supply-section': true, style: { breakInside: 'avoid' } },
    h('h2', { className: 'text-2xl font-bold text-gray-800 mb-4 border-b-2 border-orange-500 pb-2' }, '\uD83E\uDDFA INSUMOS POR CONTA DO CLIENTE'),
    h('p', { className: 'text-gray-600 mb-4' }, 'Neste evento, você compra os itens abaixo e entrega até a véspera.' + (g ? ` As quantidades já consideram a perda no preparo para ${g} convidados.` : '')),
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 } }, ordem.map(c => h('div', { key: c, style: { border: '1px solid #fed7aa', borderRadius: 10, padding: '10px 12px', background: '#fffaf5', breakInside: 'avoid' } },
      h('div', { style: { fontWeight: 700, color: '#c2410c', marginBottom: 6, textTransform: 'uppercase', fontSize: 13, letterSpacing: '.04em' } }, c),
      grupos[c].map((i, k) => h('div', { key: k, style: { display: 'flex', justifyContent: 'space-between', gap: 10, padding: '4px 0', borderBottom: '1px dashed #fde3c8', fontSize: 14, color: '#374151' } },
        h('span', null, '\u25A1 ', i.name), h('b', { style: { whiteSpace: 'nowrap' } }, i.qty || '')))))));
}

window.ClientSupplyPanel = ClientSupplyPanel;
window.ClientSupplySection = ClientSupplySection;
window.ClientSupplyProposalBox = ClientSupplyProposalBox;
})();
