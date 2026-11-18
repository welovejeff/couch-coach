// The build library. Each build is an ordered list of placed pieces; the order is the order
// a grown-up would put them down, which the 3D step-through follows.
import {
  base, cushion, box, lean, baseFlat, baseFolded, baseCorner, baseTent, cushFlat, cushFolded,
  tri, puck, pad, hoop, hoopUp, wheel, ottoman, second,
} from './pieces.js';

const build = (id, name, theme, pieces, stickers = []) => ({ id, name, theme, pieces, stickers });

export const BUILDS = [
  build('race-car', 'Race Car', 'go', [
    baseFlat(0, 0, 0, 'x'), cushFlat(0, 0, 5.5, 'x'),
    tri(0, 0, 8.75, 'y'), tri(51, 0, 8.75, 'y'),
    wheel(14, 33), wheel(52, 33),
    hoop(82.5, 16.5, 0), pad(82.5, 16.5, 11),
  ], [[-6, 16, 30, '🏁', 20]]),
  build('castle', 'Castle', 'fort', [
    baseCorner(0, 0),
    hoopUp(33, 16.5, 0), cushFlat(44, 0, 0, 'x'),
    tri(-5.5, 33, 0, 'z'), tri(29, 33, 0, 'z'),
    pad(16.5, 16.5, 0), puck(13, 13, 3.25), puck(13, 13, 8.75),
  ], [[2, 40, 44, '🚩', 16], [36.5, 40, 44, '🚩', 16]]),
  build('big-slide', 'Big Slide', 'climb', [
    baseFolded(0, 0, 0),
    cushion(box(0, 0, 11, 33, 33, 3.25), lean('x', 33, 11, 64.1, 0, 0, 3.25, 1)),
    hoop(16.5, 49.5, 0), puck(16.5, 49.5, 0), pad(16.5, 49.5, 11), puck(16.5, 78, 0),
    tri(33, -15, 0, 'x'), tri(66, 0, 0, 'y'),
  ], [[92, 16, 12, '💨', 16]]),
  build('pirate-ship', 'Pirate Ship', 'go', [
    baseFlat(0, 0, 0, 'x'), tri(66, 0, 0, 'y'), tri(-15, 0, 0, 'y'),
    hoopUp(8, 16.5, 5.5), puck(42, 16.5, 5.5),
    cushFlat(33, 33, 0, 'y'), pad(49.5, 115.5, 0), puck(49.5, 115.5, 3.25),
  ], [[49.5, 115.5, 20, '💎', 16], [14, 16.5, 50, '🏴‍☠️', 18]]),
  build('secret-hideout', 'Secret Hideout', 'fort', [
    baseTent(0, 0),
    cushFlat(-20, 1.5, 0, 'x'), hoopUp(33, 18, 3.25),
    tri(0, -20, 0, 'x'), tri(0, 41, 0, 'x'),
    puck(60, 18, 0), puck(84, 18, 0), pad(113, 18, 0),
  ], [[16, 18, 44, '🤫', 16]]),
  build('mountain-climb', 'Mountain Climb', 'climb', [
    baseFlat(0, 0, 0, 'x'), cushFolded(16.5, 0, 5.5),
    tri(0, 0, 5.5, 'y'), tri(51, 0, 5.5, 'y'),
    pad(33, 16.5, 12), puck(33, 16.5, 15.25), puck(33, 16.5, 20.75),
    hoop(33, 53, 0),
  ], [[33, 16.5, 38, '🚩', 16]]),
  build('choo-choo-train', 'Choo-Choo Train', 'go', [
    cushFolded(0, 0, 0), pad(16.5, 16.5, 6.5),
    hoop(53.5, 16.5, 0),
    baseFolded(74, 0, 0), tri(74, 0, 11, 'y'), puck(96, 16.5, 11), puck(96, 16.5, 16.5),
    tri(107, 0, 0, 'y'),
  ], [[96, 16.5, 36, '💨', 18]]),
  build('clubhouse', 'Clubhouse', 'fort', [
    baseCorner(0, 0), tri(12.5, 14, 0, 'z'),
    cushFolded(-5.5, -5.5, 33), tri(-5.5, 3.5, 39.5, 'x'),
    hoop(52, 10, 0), pad(52, 10, 11), puck(24, 50, 0), puck(54, 46, 0),
  ], [[11, 11, 62, '🏠', 16]]),
  build('hot-lava-course', 'Hot Lava Course', 'climb', [
    tri(0, 0, 0, 'y'), puck(30, 16.5, 0), puck(56, 16.5, 0), pad(86, 16.5, 0),
    baseFlat(69.5, 38, 0, 'y'),
    hoopUp(52, 87.5, 0), tri(30, 71, 0, 'y'), cushFolded(-8, 71, 0),
  ], [[8, 87, 22, '🏁', 20], [50, 50, 6, '🌋', 18]]),
  build('airplane', 'Airplane', 'go', [
    baseFlat(0, 0, 0, 'x'), puck(36.5, -10.875, 0), puck(36.5, 43.875, 0),
    cushFlat(20, -16.5, 5.5, 'y'),
    hoop(36.5, 16.5, 8.75), tri(0, 0, 5.5, 'y'), tri(66, 0, 0, 'y'),
    pad(100, 16.5, 0),
  ], [[100, 16.5, 30, '☁️', 20]]),
  build('royal-throne', 'Royal Throne', 'fort', [
    baseCorner(0, 0), ottoman(16.5, 16.5, 0),
    tri(0, 33, 0, 'x'), tri(33, 0, 0, 'y'),
    cushFlat(48, 0, 0, 'x'),
  ], [[16.5, 16.5, 30, '👑', 18]]),
  build('big-jump', 'Big Jump', 'climb', [
    ottoman(16.5, 16.5, 0),
    baseFlat(36, 0, 0, 'x'), cushFlat(36, 0, 5.5, 'x'),
    tri(102, 0, 0, 'y'), tri(52, -15, 0, 'x'),
  ], [[62, 16.5, 30, '💥', 20]]),
];

export const buildById = id => BUILDS.find(b => b.id === id);
