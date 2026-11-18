// The build library. Each build is an ordered list of placed pieces; the order is the order
// a grown-up would put them down, which the 3D step-through follows.
import {
  base, cushion, box, lean, baseFlat, baseFolded, baseCorner, baseTent, cushFlat, cushFolded,
  tri, puck, pad, hoop, hoopUp, wheel, ottoman, second,
} from './pieces.js';

// Builds the owner has tried with a real child. Every other build is labelled as not yet kid-tested.
const TESTED = new Set([]);

const build = (id, name, theme, setup, pieces, stickers = []) => ({ id, name, theme, setup, tested: TESTED.has(id), pieces, stickers });

export const BUILDS = [
  /* ---------- one play couch + round add-on ---------- */
  build('race-car', 'Race Car', 'go', 'couch-addon', [
    baseFlat(0, 0, 0, 'x'), cushFlat(0, 0, 5.5, 'x'),
    tri(0, 0, 8.75, 'y'), tri(51, 0, 8.75, 'y'),
    wheel(14, 33), wheel(52, 33),
    hoop(82.5, 16.5, 0), pad(82.5, 16.5, 11),
  ], [[-6, 16, 30, '🏁', 20]]),
  build('castle', 'Castle', 'fort', 'couch-addon', [
    baseCorner(0, 0),
    hoopUp(33, 16.5, 0), cushFlat(44, 0, 0, 'x'),
    tri(-5.5, 33, 0, 'z'), tri(29, 33, 0, 'z'),
    pad(16.5, 16.5, 0), puck(13, 13, 3.25), puck(13, 13, 8.75),
  ], [[2, 40, 44, '🚩', 16], [36.5, 40, 44, '🚩', 16]]),
  build('big-slide', 'Big Slide', 'climb', 'couch-addon', [
    baseFolded(0, 0, 0),
    cushion(box(0, 0, 11, 33, 33, 3.25), lean('x', 33, 11, 64.1, 0, 0, 3.25, 1)),
    hoop(16.5, 49.5, 0), puck(16.5, 49.5, 0), pad(16.5, 49.5, 11), puck(16.5, 78, 0),
    tri(33, -15, 0, 'x'), tri(66, 0, 0, 'y'),
  ], [[92, 16, 12, '💨', 16]]),
  build('pirate-ship', 'Pirate Ship', 'go', 'couch-addon', [
    baseFlat(0, 0, 0, 'x'), tri(66, 0, 0, 'y'), tri(-15, 0, 0, 'y'),
    hoopUp(8, 16.5, 5.5), puck(42, 16.5, 5.5),
    cushFlat(33, 33, 0, 'y'), pad(49.5, 115.5, 0), puck(49.5, 115.5, 3.25),
  ], [[49.5, 115.5, 20, '💎', 16], [14, 16.5, 50, '🏴‍☠️', 18]]),
  build('secret-hideout', 'Secret Hideout', 'fort', 'couch-addon', [
    baseTent(0, 0),
    cushFlat(-20, 1.5, 0, 'x'), hoopUp(33, 18, 3.25),
    tri(0, -20, 0, 'x'), tri(0, 41, 0, 'x'),
    puck(60, 18, 0), puck(84, 18, 0), pad(113, 18, 0),
  ], [[16, 18, 44, '🤫', 16]]),
  build('mountain-climb', 'Mountain Climb', 'climb', 'couch-addon', [
    baseFlat(0, 0, 0, 'x'), cushFolded(16.5, 0, 5.5),
    tri(0, 0, 5.5, 'y'), tri(51, 0, 5.5, 'y'),
    pad(33, 16.5, 12), puck(33, 16.5, 15.25), puck(33, 16.5, 20.75),
    hoop(33, 53, 0),
  ], [[33, 16.5, 38, '🚩', 16]]),
  build('choo-choo-train', 'Choo-Choo Train', 'go', 'couch-addon', [
    cushFolded(0, 0, 0), pad(16.5, 16.5, 6.5),
    hoop(53.5, 16.5, 0),
    baseFolded(74, 0, 0), tri(74, 0, 11, 'y'), puck(96, 16.5, 11), puck(96, 16.5, 16.5),
    tri(107, 0, 0, 'y'),
  ], [[96, 16.5, 36, '💨', 18]]),
  build('clubhouse', 'Clubhouse', 'fort', 'couch-addon', [
    baseCorner(0, 0), tri(12.5, 14, 0, 'z'),
    cushFolded(-5.5, -5.5, 33), tri(-5.5, 3.5, 39.5, 'x'),
    hoop(52, 10, 0), pad(52, 10, 11), puck(24, 50, 0), puck(54, 46, 0),
  ], [[11, 11, 62, '🏠', 16]]),
  build('hot-lava-course', 'Hot Lava Course', 'climb', 'couch-addon', [
    tri(0, 0, 0, 'y'), puck(30, 16.5, 0), puck(56, 16.5, 0), pad(86, 16.5, 0),
    baseFlat(69.5, 38, 0, 'y'),
    hoopUp(52, 87.5, 0), tri(30, 71, 0, 'y'), cushFolded(-8, 71, 0),
  ], [[8, 87, 22, '🏁', 20], [50, 50, 6, '🌋', 18]]),
  build('airplane', 'Airplane', 'go', 'couch-addon', [
    baseFlat(0, 0, 0, 'x'), puck(36.5, -10.875, 0), puck(36.5, 43.875, 0),
    cushFlat(20, -16.5, 5.5, 'y'),
    hoop(36.5, 16.5, 8.75), tri(0, 0, 5.5, 'y'), tri(66, 0, 0, 'y'),
    pad(100, 16.5, 0),
  ], [[100, 16.5, 30, '☁️', 20]]),
  build('royal-throne', 'Royal Throne', 'fort', 'couch-addon', [
    baseCorner(0, 0), ottoman(16.5, 16.5, 0),
    tri(0, 33, 0, 'x'), tri(33, 0, 0, 'y'),
    cushFlat(48, 0, 0, 'x'),
  ], [[16.5, 16.5, 30, '👑', 18]]),
  build('big-jump', 'Big Jump', 'climb', 'couch-addon', [
    ottoman(16.5, 16.5, 0),
    baseFlat(36, 0, 0, 'x'), cushFlat(36, 0, 5.5, 'x'),
    tri(102, 0, 0, 'y'), tri(52, -15, 0, 'x'),
  ], [[62, 16.5, 30, '💥', 20]]),

  /* ---------- one play couch ---------- */
  build('speed-boat', 'Speed Boat', 'go', 'couch', [
    baseFlat(0, 0, 0, 'x'), cushFlat(0, 0, 5.5, 'x'),
    tri(0, 0, 8.75, 'y'), tri(66, 0, 0, 'y'),
  ], [[80, 16, 22, '🌊', 18]]),
  build('fire-truck', 'Fire Truck', 'go', 'couch', [
    baseFlat(0, 0, 0, 'x'), cushFolded(33, 0, 5.5),
    tri(0, 0, 5.5, 'x'), tri(0, 18, 5.5, 'x'),
  ], [[50, 16, 26, '🚒', 18]]),
  build('bobsled', 'Bobsled', 'go', 'couch', [
    baseFlat(0, 0, 0, 'x'), cushFlat(0, 0, 5.5, 'x'),
    tri(16, -15, 0, 'x'), tri(16, 33, 0, 'x'),
  ], [[-8, 16, 22, '❄️', 18]]),
  build('dump-truck', 'Dump Truck', 'go', 'couch', [
    baseFlat(0, 0, 0, 'x'), tri(0, 0, 5.5, 'y'),
    cushion(box(33, 0, 5.5, 33, 33, 3.25), lean('x', 33, 5.5, 2.9, 19, 0, 3.25, -1)),
    tri(66, 0, 0, 'y'),
  ], [[10, 16, 40, '🪨', 16]]),
  build('camping-tent', 'Camping Tent', 'fort', 'couch', [
    baseTent(0, 0), cushFlat(-16, 1.5, 0, 'x'),
    tri(0, -20, 0, 'x'), tri(0, 41, 0, 'x'),
  ], [[16, 18, 44, '⛺', 16]]),
  build('castle-keep', 'Castle Keep', 'fort', 'couch', [
    baseCorner(0, 0), cushFolded(0, 0, 0),
    tri(-5.5, 33, 0, 'z'), tri(33, -5.5, 0, 'z'),
  ], [[2, 40, 44, '🚩', 16], [40, 2, 44, '🚩', 16]]),
  build('puppet-stage', 'Puppet Stage', 'fort', 'couch', [
    base(box(0, 0, 0, 66, 5.5, 33)),
    tri(0, -15, 0, 'x'), tri(33, -15, 0, 'x'),
    cushFlat(0, 5.5, 0, 'x'),
  ], [[33, 3, 46, '🎭', 18]]),
  build('story-couch', 'Story Couch', 'fort', 'couch', [
    baseFlat(0, 0, 0, 'x'), cushFlat(0, 0, 5.5, 'x'),
    tri(0, 0, 8.75, 'x'), tri(33, 0, 8.75, 'x'),
  ], [[40, 24, 22, '📚', 16]]),
  build('little-slide', 'Little Slide', 'climb', 'couch', [
    baseFolded(0, 0, 0),
    cushion(box(0, 0, 11, 33, 33, 3.25), lean('x', 33, 11, 64.1, 0, 0, 3.25, 1)),
    tri(-15, 0, 0, 'y'), tri(33, -15, 0, 'x'),
  ], [[72, 16, 10, '💨', 16]]),
  build('ridge-walk', 'Ridge Walk', 'climb', 'couch', [
    baseFlat(0, 0, 0, 'x'),
    tri(0, 9, 5.5, 'x'), tri(33, 9, 5.5, 'x'),
    cushFlat(0, 33, 0, 'x'),
  ], [[70, 16, 26, '🤸', 16]]),
  build('up-and-over', 'Up and Over', 'climb', 'couch', [
    baseFolded(0, 0, 0),
    cushion(lean('x', -31.1, 0, 0, 11, 0, 3.25, 1), box(0, 0, 11, 33, 33, 3.25)),
    tri(33, 0, 0, 'y'), tri(48, 0, 0, 'y'),
  ], [[16, 16, 26, '⛰️', 16]]),
  build('launch-pad', 'Launch Pad', 'climb', 'couch', [
    baseFolded(0, 0, 0), cushFlat(36, 0, 0, 'x'),
    tri(102, 0, 0, 'y'), tri(52, -15, 0, 'x'),
  ], [[66, 16.5, 22, '💥', 20]]),

  /* ---------- two play couches ---------- */
  build('big-rig', 'Big Rig', 'go', 'two-couch', [
    baseFlat(0, 0, 0, 'x'), second(baseFlat(66, 0, 0, 'x')),
    cushFlat(0, 0, 5.5, 'x'), tri(8, 0, 8.75, 'x'), tri(8, 18, 8.75, 'x'),
    second(cushFolded(99, 0, 5.5), tri(84, 0, 5.5, 'y'), tri(132, 0, 0, 'y')),
  ], [[116, 16, 28, '🚛', 18]]),
  build('double-decker-bus', 'Double-Decker Bus', 'go', 'two-couch', [
    baseFlat(0, 0, 0, 'x'), cushFlat(0, 0, 5.5, 'x'),
    second(baseFlat(0, 0, 8.75, 'x'), cushFlat(0, 0, 14.25, 'x')),
    tri(0, 0, 17.5, 'y'), tri(51, 0, 17.5, 'y'),
    second(tri(-15, 0, 0, 'y'), tri(66, 0, 0, 'y')),
  ], [[33, 16, 34, '🚌', 18]]),
  build('catamaran', 'Catamaran', 'go', 'two-couch', [
    baseFlat(0, 0, 0, 'x'), second(baseFlat(0, 48, 0, 'x')),
    cushFlat(16.5, 7.5, 5.5, 'y'), second(cushFolded(16.5, 24, 8.75)),
    tri(66, 0, 0, 'y'), tri(-15, 0, 0, 'y'),
    second(tri(66, 48, 0, 'y'), tri(-15, 48, 0, 'y')),
  ], [[33, 40, 30, '⛵', 18]]),
  build('long-train', 'Long Train', 'go', 'two-couch', [
    cushFolded(0, 0, 0), second(baseFolded(37, 0, 0)), second(cushFolded(74, 0, 0)), baseFolded(111, 0, 0),
    tri(111, 0, 11, 'y'), tri(144, 0, 0, 'y'),
    second(tri(37, 0, 11, 'y'), tri(0, 0, 6.5, 'y')),
  ], [[136, 16.5, 30, '💨', 18]]),
  build('big-castle', 'Big Castle', 'fort', 'two-couch', [
    baseCorner(0, 0), second(base(box(33, -5.5, 0, 33, 5.5, 33), box(66, -5.5, 0, 33, 5.5, 33))),
    cushFlat(0, 0, 0, 'x'), second(cushFlat(33, 33, 0, 'x')),
    tri(-5.5, 33, 0, 'z'), tri(99, -5.5, 0, 'z'),
    second(tri(18, 66, 0, 'x'), tri(66, 66, 0, 'x')),
  ], [[2, 40, 44, '🚩', 16], [106, 2, 44, '🚩', 16]]),
  build('tunnel-tent', 'Tunnel Tent', 'fort', 'two-couch', [
    baseTent(0, 0), second(baseTent(33, 0)),
    cushFlat(-16, 1.5, 0, 'x'), second(cushFlat(50, 1.5, 0, 'x')),
    tri(0, -20, 0, 'x'), tri(0, 41, 0, 'x'),
    second(tri(33, -20, 0, 'x'), tri(33, 41, 0, 'x')),
  ], [[33, 18, 44, '🔦', 16]]),
  build('tree-house', 'Tree House', 'fort', 'two-couch', [
    baseCorner(0, 0), tri(12.5, 14, 0, 'z'),
    cushFolded(-5.5, -5.5, 33), tri(-5.5, 3.5, 39.5, 'x'),
    second(baseFolded(40, 0, 0), cushFlat(40, 36, 0, 'x'), tri(40, 0, 11, 'y'), tri(58, 0, 11, 'y')),
  ], [[11, 11, 62, '🌳', 16]]),
  build('maze', 'Maze', 'fort', 'two-couch', [
    baseCorner(0, 0), second(baseCorner(70, 45)),
    cushFlat(0, 0, 0, 'y'), second(cushFlat(70, 45, 0, 'x')),
    tri(36, 20, 0, 'y'), tri(0, 70, 0, 'x'),
    second(tri(40, 60, 0, 'y'), tri(100, 82, 0, 'x')),
  ], [[60, 30, 12, '❓', 18]]),
  build('mega-slide', 'Mega Slide', 'climb', 'two-couch', [
    second(baseFolded(-33, 0, 0)), baseFolded(0, 0, 0), second(cushFolded(0, 0, 11)),
    cushion(lean('x', 33, 17.5, 61, 0, 0, 3.25, 1), box(61, 0, 0, 33, 33, 3.25)),
    tri(33, -15, 0, 'x'), tri(94, 0, 0, 'y'),
    second(tri(-48, 0, 0, 'y'), tri(-33, -15, 0, 'x')),
  ], [[100, 16, 16, '💨', 16]]),
  build('big-mountain', 'Big Mountain', 'climb', 'two-couch', [
    baseFlat(0, 0, 0, 'x'), second(baseFolded(16.5, 0, 5.5)), cushFolded(16.5, 0, 16.5),
    tri(0, 0, 5.5, 'y'), tri(51, 0, 5.5, 'y'),
    second(cushFlat(0, 33, 0, 'x'), tri(-15, 0, 0, 'y'), tri(66, 0, 0, 'y')),
  ], [[33, 16.5, 36, '🚩', 16]]),
  build('obstacle-course', 'Obstacle Course', 'climb', 'two-couch', [
    tri(0, 0, 0, 'y'), baseFlat(20, 0, 0, 'x'), tri(92, 0, 0, 'y'),
    cushFlat(84, 38, 0, 'y'),
    second(baseTent(42, 69.5), tri(20, 71, 0, 'y'), cushFolded(-18, 71, 0), tri(112, 0, 0, 'y')),
  ], [[-2, 87, 22, '🏁', 20]]),
  build('super-jump', 'Super Jump', 'climb', 'two-couch', [
    baseFolded(0, 0, 0),
    second(baseFlat(36, 0, 0, 'x')), cushFlat(36, 0, 5.5, 'x'), second(cushFlat(36, 0, 8.75, 'x')),
    tri(102, 0, 0, 'y'), tri(52, -15, 0, 'x'),
    second(tri(36, 33, 0, 'x'), tri(69, 33, 0, 'x')),
  ], [[62, 16.5, 34, '💥', 20]]),
];

export const buildById = id => BUILDS.find(b => b.id === id);
