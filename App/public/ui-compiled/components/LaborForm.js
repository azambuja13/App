(function() {
/**
 * LaborForm - Mão de obra por equipe (out/2026)
 *
 * labor = { hours, rate, team: [{ id, role, people, hours, rate, chargesPct }] }
 * - Com equipe: custo = Σ pessoas × horas × valor/hora × (1 + encargos%)
 * - Sem equipe (dados antigos): custo = horas × valor/hora
 */
const h = React.createElement;
const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const rowCost = r => num(r.people) * num(r.hours) * num(r.rate) * (1 + num(r.chargesPct) / 100);
const brl = v => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg';

// Campo numérico que aceita vírgula e não apaga o "0" enquanto digita (ex.: 0,80)
const parseDec = v => {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  let s = String(v == null ? '' : v).trim().replace(/\s/g, '');
  if (!s) return 0;
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
};
function DecInput({ value, onValue, className, placeholder, ariaLabel }) {
  const show = v => (v === 0 || v === '' || v == null ? '' : String(v).replace('.', ','));
  const [txt, setTxt] = React.useState(show(value));
  const foco = React.useRef(false);
  React.useEffect(() => { if (!foco.current) setTxt(show(value)); }, [value]);
  return React.createElement('input', {
    type: 'text', inputMode: 'decimal', value: txt, placeholder, className, 'aria-label': ariaLabel,
    onFocus: () => { foco.current = true; },
    onBlur: () => { foco.current = false; setTxt(show(value)); },
    onChange: e => { setTxt(e.target.value); onValue(parseDec(e.target.value)); }
  });
}

const LaborForm = React.memo(function LaborForm({ labor = { hours: 0, rate: 0 }, onLaborChange, laborCost = 0 }) {
  const team = Array.isArray(labor.team) ? labor.team : [];
  const setTeam = t => onLaborChange({ ...labor, team: t });
  const upd = (id, k, v) => setTeam(team.map(r => r.id === id ? { ...r, [k]: k === 'role' ? v : (v === '' ? '' : num(v)) } : r));
  const add = () => setTeam([...team, { id: Date.now() + Math.random(), role: '', people: 1, hours: 8, rate: 0, chargesPct: 0 }]);
  const del = id => setTeam(team.filter(r => r.id !== id));
  const montarEquipe = () => setTeam([{ id: Date.now(), role: 'Equipe', people: 1, hours: num(labor.hours) || 8, rate: num(labor.rate), chargesPct: 0 }]);
  const field = (label, el) => h('label', { className: 'block' }, h('span', { className: 'block text-xs font-medium text-gray-600 mb-1' }, label), el);

  return h('div', { className: 'bg-white rounded-xl shadow-lg p-6' },
    h('div', { className: 'flex items-center justify-between gap-3 mb-4 flex-wrap' },
      h('h3', { className: 'text-xl font-bold text-gray-800' }, '👷 M\xE3o de Obra'),
      h('div', { className: 'px-3 py-1 rounded-lg bg-green-50 font-bold text-green-900' }, 'Total: ', brl(laborCost))),
    team.length === 0
      ? h('div', null,
          h('div', { className: 'grid grid-cols-2 gap-4' },
            field('Horas trabalhadas', h(DecInput, { placeholder: '10', className: inp, value: labor.hours, onValue: v => onLaborChange({ ...labor, hours: v }) })),
            field('Valor/hora (R$)', h(DecInput, { placeholder: '50', className: inp, value: labor.rate, onValue: v => onLaborChange({ ...labor, rate: v }) }))),
          h('p', { className: 'text-xs text-gray-500 mt-3' }, 'C\xE1lculo simples: horas \xD7 valor/hora. Para v\xE1rias pessoas e fun\xE7\xF5es (churrasqueiro, gar\xE7om, copeira), monte a equipe.'),
          h('div', { role: 'button', onClick: montarEquipe, className: 'mt-3 inline-block px-4 py-2 rounded-lg bg-orange-600 text-white font-semibold cursor-pointer' }, '👥 Montar equipe'))
      : h('div', null,
          team.map(r => h('div', { key: r.id, className: 'border border-gray-200 rounded-lg p-3 mb-3' },
            h('div', { className: 'grid grid-cols-2 md:grid-cols-6 gap-2 items-end' },
              h('div', { className: 'col-span-2' }, field('Fun\xE7\xE3o', h('input', { type: 'text', placeholder: 'Ex.: Gar\xE7om', className: inp, value: r.role, onChange: e => upd(r.id, 'role', e.target.value) }))),
              field('Pessoas', h(DecInput, { className: inp, value: r.people, onValue: v => upd(r.id, 'people', v) })),
              field('Horas', h(DecInput, { className: inp, value: r.hours, onValue: v => upd(r.id, 'hours', v) })),
              field('R$/hora', h(DecInput, { className: inp, value: r.rate, onValue: v => upd(r.id, 'rate', v) })),
              field('Encargos %', h(DecInput, { className: inp, value: r.chargesPct, onValue: v => upd(r.id, 'chargesPct', v) }))),
            h('div', { className: 'flex justify-between items-center mt-2 text-sm' },
              h('span', { className: 'text-gray-600' }, `${num(r.people)} \xD7 ${num(r.hours)}h \xD7 ${brl(num(r.rate))}` + (num(r.chargesPct) ? ` + ${num(r.chargesPct)}%` : '') + ' = ', h('b', null, brl(rowCost(r)))),
              h('span', { role: 'button', onClick: () => del(r.id), className: 'text-red-600 cursor-pointer font-semibold' }, 'Remover')))),
          h('div', { role: 'button', onClick: add, className: 'inline-block px-4 py-2 rounded-lg border-2 border-orange-300 text-orange-700 font-semibold cursor-pointer' }, '+ Adicionar fun\xE7\xE3o'),
          h('p', { className: 'text-xs text-gray-500 mt-2' }, 'Encargos: INSS, vale-transporte, alimenta\xE7\xE3o etc. Para di\xE1ria, use 1 hora e o valor da di\xE1ria em R$/hora.')));
});

window.LaborForm = LaborForm;
window.laborRowCost = rowCost;
})();
