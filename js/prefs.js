// The visitor's choices, kept in their own browser and shared by every page.
// `answered` is set once the visitor has said what they own or chosen to skip; `other` is an
// "I have something else" choice; `sheet` and `sheetopts` belong to the printable sheet, and
// `pagesset` is set once the family has chosen one page or two on purpose.
export const DEFAULTS = { kid: '', nug: '#4f7cb8', nug2: '', chk: '#9db08a', setup: '', answered: '', other: '', sheet: '', sheetopts: '', pagesset: '' };

// Plainly named couch colours to pick from; none of them is a maker's colour name.
export const SWATCHES = [['Blue', '#4f7cb8'], ['Navy', '#2b3f6b'], ['Teal', '#2f8f8a'], ['Green', '#5f9a5a'], ['Sage', '#9db08a'], ['Yellow', '#e9b441'],
  ['Red', '#c9504a'], ['Pink', '#e3a0b4'], ['Purple', '#8a6fc0'], ['Grey', '#9aa0a8'], ['Cream', '#e6d9be'], ['Charcoal', '#4a4d55']];
export const colorName = hex => (SWATCHES.find(s => s[1] === String(hex).toLowerCase()) || ['Custom'])[0];

// `store` is anything with getItem/setItem; a missing or blocked store falls back to defaults.
export function createPrefs(store) {
  const get = k => { try { return store.getItem('cc-' + k) ?? DEFAULTS[k]; } catch { return DEFAULTS[k]; } };
  const set = (k, v) => { try { store.setItem('cc-' + k, v); } catch { /* choices just won't persist */ } };
  // the second couch takes the first couch's colour until it is given its own
  const colors = () => ({ nug: get('nug'), nug2: get('nug2') || get('nug'), chk: get('chk') });
  return { get, set, colors };
}

export const browserPrefs = () => createPrefs({
  getItem: k => globalThis.localStorage.getItem(k),
  setItem: (k, v) => globalThis.localStorage.setItem(k, v),
});
