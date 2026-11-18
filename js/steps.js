// The step-through: one step per physical piece, in the order the build lists them.
// No browser dependency, so it can be tested in Node.
import { piecesOf, solidsOf, PIECE_NAMES } from './pieces.js';
import { untestedLabel } from './setups.js';

// A folded base is two solids but one piece, so it is one step.
export function stepsOf(build) {
  const solids = solidsOf(build);
  return piecesOf(build).map((p, i) => ({ label: PIECE_NAMES[p.type], solids: solids.filter(s => s.piece === i) }));
}

// n counts from 1; 0 means the whole build is shown.
export const captionFor = (steps, n) => n === 0 ? `All ${steps.length} pieces` : `Step ${n} of ${steps.length}: ${steps[n - 1].label}`;
export const nextStep = (steps, n) => Math.min(steps.length, n + 1);
export const prevStep = n => Math.max(1, n - 1);

// What the build page needs to show for a build id, or a not-found state.
export function pageModel(builds, id) {
  const build = builds.find(b => b.id === id);
  if (!build) return { found: false };
  return { found: true, build, name: build.name, label: untestedLabel(build), steps: stepsOf(build) };
}
