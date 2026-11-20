// The brand's drawings: the mark (slab, triangle pillow, hoop), the wordmark and the three theme
// shapes. Everything is inline SVG coloured by the variables in css/brand.css.
import { THEMES } from './setups.js';
import { esc } from './html.js';

const DEFS = `<svg class="cc-defs" aria-hidden="true" focusable="false"><defs>
  <symbol id="cc-mark" viewBox="0 0 64 64">
    <rect x="5" y="41" width="54" height="15" rx="6" fill="var(--m-slab)"/>
    <polygon points="11,35 11,15 33,35" fill="var(--m-wedge)" stroke="var(--m-wedge)" stroke-width="6" stroke-linejoin="round"/>
    <circle cx="46.5" cy="26" r="8.5" fill="none" stroke="var(--m-hoop)" stroke-width="7"/>
  </symbol>
  <g>
    <path class="cc-gl" id="cc-c" d="M35.3 7.1A20 20 0 1 0 35.3 32.9"/>
    <path class="cc-gl" id="cc-o" d="M0 20A20 20 0 1 0 40 20A20 20 0 1 0 0 20Z"/>
    <path class="cc-gl" id="cc-u" d="M0 0V20A20 20 0 0 0 40 20M40 0V40"/>
    <path class="cc-gl" id="cc-a" d="M0 20A20 20 0 1 0 40 20A20 20 0 1 0 0 20ZM40 0V40"/>
    <path class="cc-gl" id="cc-h" d="M0 -24V40M0 20A20 20 0 0 1 40 20V40"/>
  </g>
  <g id="cc-couch"><use href="#cc-c"/><use href="#cc-o" x="50"/><use href="#cc-u" x="110"/><use href="#cc-c" x="170"/><use href="#cc-h" x="220"/></g>
  <g id="cc-coach"><use href="#cc-c"/><use href="#cc-o" x="50"/><use href="#cc-a" x="110"/><use href="#cc-c" x="170"/><use href="#cc-h" x="220"/></g>
  <symbol id="cc-lockup" viewBox="0 0 686 92">
    <use href="#cc-mark" x="0" y="0" width="92.8" height="92.8"/>
    <g transform="translate(119 36)"><use href="#cc-couch"/><use href="#cc-coach" x="300"/></g>
  </symbol>
  <symbol id="cc-go" viewBox="0 0 20 20"><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="4.5"/></symbol>
  <symbol id="cc-fort" viewBox="0 0 20 20"><rect x="1.5" y="5.5" width="17" height="9.5" rx="3.2" fill="currentColor"/></symbol>
  <symbol id="cc-climb" viewBox="0 0 20 20"><polygon points="4.5,15.5 4.5,5.5 16,15.5" fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></symbol>
  <symbol id="cc-star" viewBox="0 0 24 24"><polygon points="12,2.6 14.8,8.7 21.4,9.4 16.5,13.9 17.9,20.5 12,17.1 6.1,20.5 7.5,13.9 2.6,9.4 9.2,8.7" fill="#fff" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></symbol>
</defs></svg>`;

// Call once per page before using any of the drawings below.
export function installBrand() {
  if (!document.querySelector('.cc-defs')) document.body.insertAdjacentHTML('afterbegin', DEFS);
}

export const mark = (cls = '') => `<svg class="cc-mark ${cls}" viewBox="2 8 60 52" aria-hidden="true"><use href="#cc-mark" width="64" height="64"/></svg>`;
export const lockup = () => `<svg class="cc-lockup" viewBox="0 0 686 92" role="img" aria-label="Couch Coach"><use href="#cc-lockup"/></svg>`;
export const star = () => `<svg class="cc-star" viewBox="0 0 24 24" aria-hidden="true"><use href="#cc-star"/></svg>`;

// A theme's shape, coloured for that theme. It always sits beside the theme's name in words.
export const themeIcon = theme => `<svg class="cc-ic ${theme}" viewBox="0 0 20 20" aria-hidden="true"><use href="#cc-${theme}"/></svg>`;
export const themeLabel = theme => `<span class="theme-label ${theme}">${themeIcon(theme)}${esc(THEMES[theme])}</span>`;

// The top bar every page shares. `current` is 'gallery', 'build' or 'sheet'.
export function mountHeader(el, current) {
  installBrand();
  el.className = 'top';
  el.innerHTML = `<a class="brand" href="index.html"${current === 'gallery' ? ' aria-current="page"' : ''}>${lockup()}</a>
    ${current === 'sheet' ? '<a class="pill" href="index.html">All builds</a>' : '<a class="pill" href="sheet.html">Print a sheet</a>'}`;
}

// Wording that must read the same on every page.
export const COPY = {
  strap: 'Build ideas for your play couch',
  fits: 'Fits the Nugget couch and its round Chunk add-on. Not affiliated with their maker.',
  untested: 'Not yet kid-tested',
  untestedWhy: 'Not yet kid-tested means we drew this build but have not made it with a child. Check it is steady before anyone climbs on, and stay close the first time.',
  private: 'Saved in this browser only. Nothing is sent anywhere.',
};
