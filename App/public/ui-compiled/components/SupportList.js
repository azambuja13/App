(function() {
/**
 * SupportList - Apoio & Logística (out/2026: quantidade automática, embalagem e kits)
 *
 * @param {Object} props
 * @param {Array} props.supportItems - Itens de apoio (com total)
 * @param {Object} props.base - { guests, meatKg, hours } base do cálculo automático
 * @param {Function} props.onUpdateItem - (id, field, value)
 * @param {Function} props.onDeleteItem - (id)
 * @param {Object} props.newSupport / onNewSupportChange / onAddSupport - novo item
 * @param {Object|null} props.editingSupport / onStartEditing / onEditingChange / onSaveEditing / onCancelEditing
 * @param {Function} props.onApplyKit - (kit)
 * @param {Function} props.onSaveKit - (nome) => Promise
 * @param {Function} props.onDeleteKit - (kitId) => Promise
 * @param {Function} props.onResetAuto - (id) volta o item para o automático
 */
const R = () => window.SupportRules;
const num = (v, d = 0) => {
  // Aceita número ou texto pt-BR: "1.250,00" → 1250; "1,5" → 1.5; "1.250" (milhar) → 1250; "1.5" → 1.5
  if (typeof v === 'number') return isFinite(v) ? v : d;
  let s = String(v == null ? '' : v).trim().replace(/\s|R\$/g, '');
  if (!s) return d;
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  return isFinite(n) ? n : d;
};
const brl = n => 'R$ ' + num(n, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Cores inline (o CSS pré-compilado não tem as classes teal/amber)
const C = {
  tealBg: { background: '#f0fdfa', border: '1px solid #99f6e4', color: '#134e4a' },
  tealTxt: { color: '#115e59' },
  amberTxt: { color: '#92400e' },
  chipAuto: { background: '#ccfbf1', color: '#115e59' },
  chipMao: { background: '#fef3c7', color: '#92400e' },
  chipManual: { background: '#e5e7eb', color: '#374151' },
  chipSemPreco: { background: '#fee2e2', color: '#991b1b' },
  btnTeal: { background: '#0d9488', color: '#fff' },
  btnTealOutline: { background: '#fff', border: '2px solid #0d9488', color: '#0f766e' }
};
const fmtN = n => (Math.round(num(n) * 100) / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

// Campo numérico que aceita vírgula (teclado do iPhone) sem "pular" enquanto digita
function NumField({ value, onChange, placeholder, className, id, ariaLabel, money }) {
  const h = React.createElement;
  const show = v => (v === 0 || v == null ? '' : money ? num(v).toFixed(2).replace('.', ',') : String(v).replace('.', ','));
  const [txt, setTxt] = React.useState(show(value));
  const foco = React.useRef(false);
  React.useEffect(() => {
    if (!foco.current) setTxt(show(value));
  }, [value]);
  return h('input', {
    id, type: 'text', inputMode: 'decimal', value: txt, placeholder, 'aria-label': ariaLabel,
    className: className || 'w-full px-3 py-2 border border-gray-300 rounded-lg',
    onFocus: () => { foco.current = true; },
    onBlur: () => { foco.current = false; setTxt(show(value)); },
    onChange: e => { setTxt(e.target.value); onChange(num(e.target.value, 0)); }
  });
}

const RULE_SUFFIX = {
  perGuest: 'por convidado',
  perGroup: 'por grupo',
  perMeatKg: 'por kg de carne',
  perHour: 'por hora de evento',
  fixed: 'por evento'
};

// Formulário de item (novo ou edição) com regra e embalagem
function ItemEditor({ item, onChange, base, onSave, onCancel, saveLabel }) {
  const h = React.createElement;
  const rules = R().RULES;
  const set = patch => onChange({ ...item, ...patch });
  const rule = item.rule && rules[item.rule] ? item.rule : 'manual';
  const auto = rule !== 'manual';
  const temPacote = num(item.packSize, 0) > 1;
  const unit = item.unit || 'un';
  const packLabel = item.packLabel || 'pacote';
  const qAuto = auto ? R().computeQuantity({ ...item, rule }, base) : null;
  const qFinal = auto && !item.qtyOverride ? qAuto : num(item.quantity, 0);
  const lbl = t => h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1' }, t);
  const d = R().describe({ ...item, rule, quantity: qFinal }, base);
  const grid2 = { className: 'grid gap-3', style: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } };

  return h('div', { className: 'space-y-3', 'data-support-editor': '1' },
    h('div', null, lbl('Item'),
      h('input', { type: 'text', value: item.name || '', placeholder: 'Ex.: Guardanapos', 'aria-label': 'Nome do item',
        onChange: e => set({ name: e.target.value }), className: 'w-full px-3 py-2 border border-gray-300 rounded-lg' })),
    h('div', null, lbl('Como calcular a quantidade'),
      h('select', { value: rule, 'aria-label': 'Regra', className: 'w-full px-3 py-2 border border-gray-300 rounded-lg bg-white',
        onChange: e => set(e.target.value === 'perGroup' && !(num(item.factor, 0) > 0)
          ? { rule: e.target.value, qtyOverride: false, factor: 1 }
          : { rule: e.target.value, qtyOverride: false }) },
        Object.keys(rules).map(k => h('option', { key: k, value: k }, rules[k].label)))),
    rule === 'perGroup' && h('div', grid2,
      h('div', null, lbl('Quantidade'),
        h(NumField, { value: num(item.factor, 0), onChange: v => set({ factor: v }), placeholder: '1', ariaLabel: 'Fator' })),
      h('div', null, lbl('A cada quantos convidados'),
        h(NumField, { value: num(item.groupSize, 0), onChange: v => set({ groupSize: v }), placeholder: 'Ex.: 30', ariaLabel: 'Convidados por grupo' }))),
    h('div', grid2,
      rule === 'perGroup' ? null : auto
        ? h('div', null, lbl(`Quantidade ${RULE_SUFFIX[rule]}`),
            h(NumField, { value: num(item.factor, 0), onChange: v => set({ factor: v }), placeholder: 'Ex.: 4', ariaLabel: 'Fator' }))
        : h('div', null, lbl(temPacote ? `Quantos ${packLabel}s` : `Quantidade (${unit})`),
            h(NumField, { value: num(item.quantity, 0), onChange: v => set({ quantity: v }), placeholder: '1', ariaLabel: 'Quantidade' })),
      h('div', null, lbl('Unidade'),
        h('input', { type: 'text', value: item.unit == null ? 'un' : item.unit, placeholder: 'un, kg, rolo…', 'aria-label': 'Unidade',
          onChange: e => set({ unit: e.target.value }), className: 'w-full px-3 py-2 border border-gray-300 rounded-lg' }))),
    h('label', { className: 'flex items-center gap-2 text-sm text-gray-700' },
      h('input', { type: 'checkbox', checked: temPacote, className: 'w-5 h-5', 'aria-label': 'Compro em embalagem',
        onChange: e => set(e.target.checked ? { packSize: 10, packLabel: item.packLabel || 'pacote' } : { packSize: 0 }) }),
      'Compro em embalagem (pacote, saco, caixa…)'),
    temPacote && h('div', grid2,
      h('div', null, lbl('Nome da embalagem'),
        h('input', { type: 'text', value: item.packLabel == null ? 'pacote' : item.packLabel, placeholder: 'pacote', 'aria-label': 'Nome da embalagem',
          onChange: e => set({ packLabel: e.target.value }), className: 'w-full px-3 py-2 border border-gray-300 rounded-lg' })),
      h('div', null, lbl(`Cada ${packLabel} tem (${unit})`),
        h(NumField, { value: num(item.packSize, 0), onChange: v => set({ packSize: v }), placeholder: '50', ariaLabel: 'Tamanho da embalagem' }))),
    h('div', grid2,
      h('div', null, lbl(temPacote ? `Preço do ${packLabel} (R$)` : `Preço por ${unit} (R$)`),
        h(NumField, { value: num(item.cost, 0), onChange: v => set({ cost: v }), placeholder: '0,00', ariaLabel: 'Preço', money: true })),
      auto ? h('div', null, lbl('Ajustar à mão (opcional)'),
        h(NumField, { value: item.qtyOverride ? num(item.quantity, 0) : 0,
          placeholder: `auto: ${fmtN(qAuto || 0)}`, ariaLabel: 'Ajuste manual',
          onChange: v => set(v > 0 ? { quantity: v, qtyOverride: true } : { qtyOverride: false }) })) : h('div')),
    h('div', { className: 'rounded-lg px-3 py-2 text-sm', style: C.tealBg, 'data-support-preview': '1' },
      auto && h('div', null, d.ruleText),
      h('div', null, 'Quantidade: ', h('b', null, d.buyText), ' → ', h('b', null, brl(num(item.cost, 0) * qFinal)))),
    h('label', { className: 'flex items-center gap-2 text-sm text-gray-700' },
      h('input', { type: 'checkbox', checked: item.active !== false, className: 'w-5 h-5',
        onChange: e => set({ active: e.target.checked }) }), 'Usar neste evento'),
    h('div', { className: 'flex gap-2' },
      h('button', { onClick: onSave, className: 'flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold' }, saveLabel || 'Salvar'),
      h('button', { onClick: onCancel, className: 'flex-1 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm font-semibold' }, 'Cancelar')));
}

const SupportList = React.memo(function SupportList({
  supportItems = [],
  base = { guests: 0, meatKg: 0, hours: 0 },
  onUpdateItem,
  onDeleteItem,
  newSupport = { name: '', cost: 0, quantity: 1 },
  onNewSupportChange,
  onAddSupport,
  editingSupport = null,
  onStartEditing,
  onEditingChange,
  onSaveEditing,
  onCancelEditing,
  onApplyKit,
  onSaveKit,
  onDeleteKit,
  onResetAuto
}) {
  const h = React.createElement;
  const { useState } = React;
  const [showNewForm, setShowNewForm] = useState(false);
  const [showKits, setShowKits] = useState(false);
  const [nomeKit, setNomeKit] = useState('');
  const [salvandoKit, setSalvandoKit] = useState(false);
  const [, forcar] = useState(0);
  if (!R()) return h('div', { className: 'p-4' }, 'Carregando…');

  const ativos = supportItems.filter(i => i.active);
  const total = ativos.reduce((s, i) => s + (i.total || 0), 0);
  const usaCarne = ativos.some(i => R().isAuto(i) && i.rule === 'perMeatKg' && !i.qtyOverride);
  const usaHora = ativos.some(i => R().isAuto(i) && i.rule === 'perHour' && !i.qtyOverride);
  const kits = R().getKits();
  const card = 'bg-white rounded-xl shadow-lg';
  const chip = (txt, st) => h('span', { className: 'inline-block text-xs font-semibold rounded-full', style: { padding: '1px 8px', ...st } }, txt);

  const linha = (item, idx) => {
    if (editingSupport && editingSupport.id === item.id) {
      return h('div', { key: item.id, className: 'px-4 py-4 border-b border-gray-100 bg-orange-50' },
        h(ItemEditor, { item: editingSupport, onChange: onEditingChange, base, onSave: onSaveEditing, onCancel: onCancelEditing }));
    }
    const d = R().describe(item, base);
    return h('div', { key: item.id, 'data-support-item': item.name,
      className: `px-4 py-3 border-b border-gray-100 ${!item.active ? 'opacity-50' : ''} ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}` },
      h('div', { className: 'flex items-start gap-3' },
        h('input', { type: 'checkbox', checked: !!item.active, 'aria-label': 'Usar ' + item.name,
          onChange: e => onUpdateItem(item.id, 'active', e.target.checked),
          className: 'w-5 h-5 mt-1 text-orange-600 rounded cursor-pointer' }),
        h('div', { className: 'flex-1 min-w-0' },
          h('div', { className: 'flex items-start justify-between gap-2' },
            h('div', { className: 'flex flex-wrap items-center gap-2 min-w-0' },
              h('span', { className: 'font-semibold text-gray-800', style: { overflowWrap: 'break-word' } }, item.name),
              d.auto && !d.override && chip('automático', C.chipAuto),
              d.auto && d.override && chip('ajustado à mão', C.chipMao),
              !d.auto && chip('manual', C.chipManual),
              item.active && !(num(item.cost) > 0) && chip('sem preço', C.chipSemPreco),
              item.active && num(item.cost) > 0 && item.priceCheck && chip('confira o preço', C.chipMao)),
            h('span', { className: 'font-bold text-orange-600 whitespace-nowrap' }, brl(item.total))),
          d.auto && !d.override && h('div', { className: 'text-xs mt-1', style: C.tealTxt }, d.ruleText),
          d.auto && d.override && h('div', { className: 'text-xs mt-1', style: C.amberTxt },
            'Automático seria ', fmtN(R().computeQuantity(item, base)), '. ',
            h('button', { onClick: () => onResetAuto && onResetAuto(item.id), className: 'underline font-semibold' }, '↺ voltar ao automático')),
          h('div', { className: 'flex items-end justify-between gap-2' },
            h('div', { className: 'text-sm text-gray-600 mt-1 min-w-0' }, 'Quantidade: ', h('b', null, d.buyText), ' · ', d.priceText),
            h('div', { className: 'flex no-print', style: { flexShrink: 0 } },
              h('button', { onClick: () => onStartEditing(item), className: 'text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50', title: 'Editar' },
                h(Icon, { type: 'edit', className: 'w-5 h-5' })),
              h('button', { onClick: () => onDeleteItem(item.id), className: 'text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50', title: 'Excluir' },
                h(Icon, { type: 'trash', className: 'w-5 h-5' })))))));
  };

  const salvarKit = async () => {
    const n = nomeKit.trim();
    if (!n) { alert('Dê um nome ao kit (ex.: Casamento 150 pessoas).'); return; }
    if (!ativos.length) { alert('Marque os itens que entram no kit.'); return; }
    setSalvandoKit(true);
    try { await onSaveKit(n); setNomeKit(''); forcar(x => x + 1); alert('✅ Kit "' + n + '" salvo.'); }
    catch (e) { alert(e.message || 'Não foi possível salvar o kit.'); }
    finally { setSalvandoKit(false); }
  };

  return h('div', { className: 'space-y-4' },
    // Cabeçalho
    h('div', { className: 'flex flex-wrap items-center justify-between gap-3' },
      h('h2', { className: 'text-2xl font-bold text-gray-800' }, 'Apoio & Logística'),
      h('div', { className: 'flex gap-2 no-print' },
        h('button', { onClick: () => { setShowKits(!showKits); setShowNewForm(false); },
          className: 'flex items-center gap-2 px-4 py-2 rounded-lg font-semibold', style: C.btnTealOutline },
          showKits ? 'Fechar kits' : '🧰 Kits'),
        h('button', { onClick: () => { setShowNewForm(!showNewForm); setShowKits(false); },
          className: 'flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:shadow-lg transition' },
          h(Icon, { type: 'plus', className: 'w-5 h-5' }), showNewForm ? 'Fechar' : 'Novo item'))),

    // Base do cálculo
    h('div', { className: 'rounded-xl px-4 py-3 text-sm', style: C.tealBg, 'data-support-base': '1' },
      h('div', { className: 'font-semibold mb-1' }, 'As quantidades automáticas usam:'),
      h('div', { className: 'flex flex-wrap', style: { columnGap: 16, rowGap: 4 } },
        h('span', null, '👥 ', h('b', null, fmtN(base.guests)), ' convidados'),
        h('span', null, '🥩 ', h('b', null, fmtN(base.meatKg)), ' kg de carne'),
        h('span', null, '⏱️ ', h('b', null, fmtN(base.hours)), ' h de evento')),
      usaCarne && !(base.meatKg > 0) && h('div', { className: 'mt-2', style: C.amberTxt },
        '⚠️ Sem carne na lista de compras. Gere a lista pelo cardápio (aba Cardápio → Gerar lista de compras) para calcular o carvão.'),
      usaHora && !(base.hours > 0) && h('div', { className: 'mt-2', style: C.amberTxt },
        '⚠️ Informe as horas na Mão de obra (abaixo) para calcular os itens por hora.'),
      h('div', { className: 'mt-1 text-xs', style: C.tealTxt }, 'Carne = proteínas por peso da lista de compras. Horas = maior jornada da mão de obra.')),

    // Kits
    showKits && h('div', { className: `${card} p-4 space-y-3 no-print`, 'data-support-kits': '1' },
      h('div', null,
        h('h3', { className: 'text-lg font-bold text-gray-800' }, 'Kits de apoio'),
        h('p', { className: 'text-sm text-gray-600' }, 'Escolha um kit para montar a lista deste evento. Os preços que você já tem são mantidos; itens fora do kit ficam desmarcados.')),
      h('div', { className: 'grid gap-2', style: { gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' } },
        kits.map(k => h('div', { key: k.id, 'data-kit': k.name, className: 'border border-gray-200 rounded-lg p-3 flex flex-col gap-2' },
          h('div', { className: 'font-semibold text-gray-800' }, k.name, k.builtin ? h('span', { className: 'ml-2 text-xs text-gray-500 font-normal' }, '(sugestão)') : null),
          h('div', { className: 'text-xs text-gray-600' }, k.items.map(i => i.name).join(', ')),
          h('div', { className: 'flex gap-2 mt-auto' },
            h('button', { onClick: () => {
                if (confirm(`Aplicar o kit "${k.name}"?\n\nA lista passa a ter os itens do kit, com as quantidades calculadas para este evento. Confira os preços marcados.`)) { onApplyKit(k); setShowKits(false); }
              }, className: 'flex-1 px-3 py-2 rounded-lg text-sm font-semibold', style: C.btnTeal }, 'Aplicar'),
            !k.builtin && onDeleteKit && h('button', { onClick: async () => {
                if (!confirm(`Excluir o kit "${k.name}"?`)) return;
                try { await onDeleteKit(k.id); forcar(x => x + 1); } catch (e) { alert(e.message || 'Erro ao excluir'); }
              }, className: 'px-3 py-2 rounded-lg text-sm', style: { border: '1px solid #fca5a5', color: '#b91c1c' } }, 'Excluir'))))),
      h('div', { className: 'border-t border-gray-200 pt-3' },
        h('div', { className: 'text-sm font-semibold text-gray-700 mb-1' }, 'Salvar a lista atual como kit'),
        h('div', { className: 'flex gap-2' },
          h('input', { type: 'text', value: nomeKit, onChange: e => setNomeKit(e.target.value), placeholder: 'Ex.: Casamento', 'aria-label': 'Nome do kit',
            className: 'flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg' }),
          h('button', { onClick: salvarKit, disabled: salvandoKit,
            className: 'px-4 py-2 bg-green-600 text-white rounded-lg font-semibold disabled:opacity-50' }, salvandoKit ? 'Salvando…' : 'Salvar kit')),
        h('p', { className: 'text-xs text-gray-500 mt-1' }, 'Entram os itens marcados, com regra, embalagem e preço.'))),

    // Novo item
    showNewForm && h('div', { className: `${card} p-4 no-print` },
      h('h3', { className: 'text-lg font-bold text-gray-800 mb-3' }, 'Novo item de apoio'),
      h(ItemEditor, { item: { active: true, unit: 'un', rule: 'manual', ...newSupport }, onChange: onNewSupportChange, base,
        saveLabel: 'Adicionar', onSave: () => { if (onAddSupport() !== false) setShowNewForm(false); }, onCancel: () => setShowNewForm(false) })),

    // Lista
    h('div', { className: `${card} overflow-hidden` },
      h('div', { className: 'bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-3 font-semibold' },
        'Itens de apoio (', ativos.length, ' de ', supportItems.length, ' em uso)'),
      supportItems.length === 0 && h('div', { className: 'px-4 py-6 text-center text-gray-500' }, 'Nenhum item. Use 🧰 Kits ou + Novo item.'),
      supportItems.map(linha),
      h('div', { className: 'flex justify-between items-center gap-3 px-4 py-3 bg-gray-100 border-t-2 border-gray-300' },
        h('span', { className: 'font-bold text-gray-800' }, 'Total Apoio & Logística',
          base.guests > 0 ? h('span', { className: 'block text-xs font-normal text-gray-600' }, brl(total / base.guests), ' por convidado') : null),
        h('span', { className: 'font-bold text-orange-700 text-lg whitespace-nowrap', 'data-support-total': '1' }, brl(total)))));
});

// Expor ao window para uso com Babel
window.SupportList = SupportList;
})();
