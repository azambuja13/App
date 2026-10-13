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
            field('Horas trabalhadas', h('input', { type: 'number', min: 0, step: 0.5, placeholder: '10', className: inp,
              value: labor.hours === 0 ? '' : labor.hours, onChange: e => onLaborChange({ ...labor, hours: e.target.value === '' ? 0 : parseFloat(e.target.value) }) })),
            field('Valor/hora (R$)', h('input', { type: 'number', min: 0, step: 0.01, placeholder: '50', className: inp,
              value: labor.rate === 0 ? '' : labor.rate, onChange: e => onLaborChange({ ...labor, rate: e.target.value === '' ? 0 : parseFloat(e.target.value) }) }))),
          h('p', { className: 'text-xs text-gray-500 mt-3' }, 'C\xE1lculo simples: horas \xD7 valor/hora. Para v\xE1rias pessoas e fun\xE7\xF5es (churrasqueiro, gar\xE7om, copeira), monte a equipe.'),
          h('div', { role: 'button', onClick: montarEquipe, className: 'mt-3 inline-block px-4 py-2 rounded-lg bg-orange-600 text-white font-semibold cursor-pointer' }, '👥 Montar equipe'))
      : h('div', null,
          team.map(r => h('div', { key: r.id, className: 'border border-gray-200 rounded-lg p-3 mb-3' },
            h('div', { className: 'grid grid-cols-2 md:grid-cols-6 gap-2 items-end' },
              h('div', { className: 'col-span-2' }, field('Fun\xE7\xE3o', h('input', { type: 'text', placeholder: 'Ex.: Gar\xE7om', className: inp, value: r.role, onChange: e => upd(r.id, 'role', e.target.value) }))),
              field('Pessoas', h('input', { type: 'number', min: 0, step: 1, className: inp, value: r.people, onChange: e => upd(r.id, 'people', e.target.value) })),
              field('Horas', h('input', { type: 'number', min: 0, step: 0.5, className: inp, value: r.hours, onChange: e => upd(r.id, 'hours', e.target.value) })),
              field('R$/hora', h('input', { type: 'number', min: 0, step: 0.01, className: inp, value: r.rate, onChange: e => upd(r.id, 'rate', e.target.value) })),
              field('Encargos %', h('input', { type: 'number', min: 0, step: 1, className: inp, value: r.chargesPct, onChange: e => upd(r.id, 'chargesPct', e.target.value) }))),
            h('div', { className: 'flex justify-between items-center mt-2 text-sm' },
              h('span', { className: 'text-gray-600' }, `${num(r.people)} \xD7 ${num(r.hours)}h \xD7 ${brl(num(r.rate))}` + (num(r.chargesPct) ? ` + ${num(r.chargesPct)}%` : '') + ' = ', h('b', null, brl(rowCost(r)))),
              h('span', { role: 'button', onClick: () => del(r.id), className: 'text-red-600 cursor-pointer font-semibold' }, 'Remover')))),
          h('div', { role: 'button', onClick: add, className: 'inline-block px-4 py-2 rounded-lg border-2 border-orange-300 text-orange-700 font-semibold cursor-pointer' }, '+ Adicionar fun\xE7\xE3o'),
          h('p', { className: 'text-xs text-gray-500 mt-2' }, 'Encargos: INSS, vale-transporte, alimenta\xE7\xE3o etc. Para di\xE1ria, use 1 hora e o valor da di\xE1ria em R$/hora.')));
});

window.LaborForm = LaborForm;
window.laborRowCost = rowCost;
})();
