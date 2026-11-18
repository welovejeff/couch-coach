// Piece sizes and placement helpers. Units are inches.
// Axes: x runs down-right on screen, y runs down-left, z is up.
//
// A solid is a 2D profile pushed along one axis: { profile, hole?, axis, o, len, smooth? }.
// A placed piece is one physical piece of foam: { type, couch, solids }.
// A build's `pieces` is an ordered list of placed pieces.

export const R = 16.5, PUCK_R = 10.875;
const TRI = [[0, 0], [15, 0], [7.5, 13.5]];
const circle = r => Array.from({ length: 36 }, (_, i) => [r * Math.cos(i * Math.PI / 18), r * Math.sin(i * Math.PI / 18)]);

export const PIECE_NAMES = { base: 'Base', cushion: 'Cushion', triangle: 'Triangle pillow', pad: 'Round pad', hoop: 'Hoop', puck: 'Puck' };
const ROLES = { base: 'base', cushion: 'cush', triangle: 'tri', pad: 'pad', hoop: 'hoop', puck: 'puck' };

/* ---------- solids ---------- */
export const box = (x, y, z, w, d, h) => ({ profile: [[0, 0], [w, 0], [w, d], [0, d]], axis: 'z', o: [x, y, z], len: h });

// A 33-wide slab leaning from (a0, z0) to (a1, z1). along 'x' slopes along x and spans y from `at`;
// along 'y' slopes along y and spans x from `at`. `side` picks which way the thickness goes.
export function lean(along, a0, z0, a1, z1, at, thick, side = 1) {
  const l = Math.hypot(a1 - a0, z1 - z0), nx = -(z1 - z0) / l * side * thick, nz = (a1 - a0) / l * side * thick;
  const profile = [[a0, z0], [a1, z1], [a1 + nx, z1 + nz], [a0 + nx, z0 + nz]];
  return { profile, axis: along === 'x' ? 'y' : 'x', o: along === 'x' ? [0, at, 0] : [at, 0, 0], len: 33 };
}

/* ---------- placed pieces ---------- */
const piece = (type, ...solids) => ({ type, couch: 1, solids });
export const base = (...solids) => piece('base', ...solids);
export const cushion = (...solids) => piece('cushion', ...solids);

export const baseFlat = (x, y, z, along) => base(along === 'x' ? box(x, y, z, 66, 33, 5.5) : box(x, y, z, 33, 66, 5.5));
export const baseFolded = (x, y, z) => base(box(x, y, z, 33, 33, 5.5), box(x, y, z + 5.5, 33, 33, 5.5));
// standing on its long edge, bent into a corner at (x, y)
export const baseCorner = (x, y) => base(box(x, y - 5.5, 0, 33, 5.5, 33), box(x - 5.5, y, 0, 5.5, 33, 33));
// an A-frame 33 long along x, feet 36 apart starting at y
export const baseTent = (x, y) => base(lean('y', y, 0, y + 18, 27.66, x, 5.5, 1), lean('y', y + 36, 0, y + 18, 27.66, x, 5.5, -1));

export const cushFlat = (x, y, z, along) => cushion(along === 'x' ? box(x, y, z, 66, 33, 3.25) : box(x, y, z, 33, 66, 3.25));
export const cushFolded = (x, y, z) => cushion(box(x, y, z, 33, 33, 3.25), box(x, y, z + 3.25, 33, 33, 3.25));

// triangle pillow: a tent running along x or y, or stood on end ('z')
export const tri = (x, y, z, axis) => piece('triangle', { profile: TRI, axis, o: [x, y, z], len: 33 });
export const puck = (cx, cy, z) => piece('puck', { profile: circle(PUCK_R), axis: 'z', o: [cx, cy, z], len: 5.5, smooth: true });
export const pad = (cx, cy, z) => piece('pad', { profile: circle(R), axis: 'z', o: [cx, cy, z], len: 3.25, smooth: true });
export const hoop = (cx, cy, z) => piece('hoop', { profile: circle(R), hole: circle(PUCK_R), axis: 'z', o: [cx, cy, z], len: 11, smooth: true });
// hoop stood on its rim, hole facing along x; x is its back face, z is what it sits on
export const hoopUp = (x, cy, z) => piece('hoop', { profile: circle(R), hole: circle(PUCK_R), axis: 'x', o: [x, cy, z + R], len: 11, smooth: true });
// puck stood on its rim as a wheel, facing along y
export const wheel = (cx, y) => piece('puck', { profile: circle(PUCK_R), axis: 'y', o: [cx, y, PUCK_R], len: 5.5, smooth: true });
// the round add-on assembled: hoop, two pucks inside, pad on top
export const ottoman = (cx, cy, z) => [hoop(cx, cy, z), puck(cx, cy, z), puck(cx, cy, z + 5.5), pad(cx, cy, z + 11)];

// mark pieces as belonging to the second couch
export const second = (...pieces) => pieces.flat().map(p => ({ ...p, couch: 2 }));

/* ---------- build to solids ---------- */
export const piecesOf = build => build.pieces.flat();

// Every solid of a build, tagged with the index of its placed piece and its colour role.
export function solidsOf(build) {
  return piecesOf(build).flatMap((p, i) => p.solids.map(s => ({ ...s, piece: i, role: ROLES[p.type] + (p.couch === 2 ? '2' : '') })));
}
