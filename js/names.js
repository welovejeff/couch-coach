// The children a sheet is for. A household can have several, so the saved name is a list:
// stored under the `kid` choice as names joined by commas ("Cole,Thomas").
import { esc } from './html.js';

export const MAX_KIDS = 4, NAME_LENGTH = 14;

// The names as typed, one per field, keeping empty fields so the editor can show them.
export const nameFields = stored => { const f = String(stored || '').split(',').slice(0, MAX_KIDS).map(n => n.slice(0, NAME_LENGTH)); return f.length ? f : ['']; };
// The names to print: trimmed, with empty ones dropped.
export const kidNames = stored => nameFields(stored).map(n => n.trim()).filter(Boolean);
export const joinNames = fields => fields.map(n => n.replace(/,/g, ' ')).join(',');

// "Cole", "Cole and Thomas", "Cole, Thomas and Ada".
export const nameList = stored => { const n = kidNames(stored); return n.length < 2 ? n.join('') : `${n.slice(0, -1).join(', ')} and ${n.at(-1)}`; };
// Whose it is: "Cole and Thomas’s". Empty when no name was given.
export const owners = stored => { const l = nameList(stored); return l ? `${l}’s` : ''; };

// The name editor: one field per child and a button to add another. It saves to prefs as you
// type and calls onChange. `id` keeps field ids unique when two editors are on one page.
export function mountNames(el, { prefs, onChange = () => {}, id = 'kid' }) {
  let fields = nameFields(prefs.get('kid'));
  const save = () => { prefs.set('kid', joinNames(fields)); onChange(); };
  function render(focus = -1) {
    el.innerHTML = `<div class="names">${fields.map((n, i) => `<div class="name-row">
        <input type="text" id="${id}-${i}" data-i="${i}" maxlength="${NAME_LENGTH}" value="${esc(n)}" placeholder="${i ? 'Another name' : 'e.g. Max'}" autocomplete="off" aria-label="${i ? `Child ${i + 1}'s name` : "Child's name"}">
        ${fields.length > 1 ? `<button type="button" class="name-x" data-drop="${i}" aria-label="Remove ${esc(n.trim() || `child ${i + 1}`)}">×</button>` : ''}</div>`).join('')}
      ${fields.length < MAX_KIDS ? '<button type="button" class="chip name-add" data-add-name>+ Add another child</button>' : ''}</div>`;
    if (focus >= 0) el.querySelector(`[data-i="${focus}"]`)?.focus();
  }
  el.addEventListener('input', e => { const i = e.target.dataset.i; if (i == null) return; fields[+i] = e.target.value; save(); });
  el.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if ('addName' in t.dataset) { fields.push(''); render(fields.length - 1); }
    else if (t.dataset.drop) { fields.splice(+t.dataset.drop, 1); if (!fields.length) fields = ['']; render(); save(); }
  });
  render();
  return {
    // another editor on the page changed the names: catch up, unless this one is being typed in
    refresh() { if (!el.contains(document.activeElement)) { fields = nameFields(prefs.get('kid')); render(); } },
  };
}
