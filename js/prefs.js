// The visitor's choices, kept in their own browser and shared by every page.
const DEFAULTS = { kid: '', nug: '#3f86d6', nug2: '', chk: '#f4b63a', setup: '' };

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
