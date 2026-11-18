// The build page: one build in 3D, with a step-through of how the pieces go together.
import { BUILDS } from './builds.js';
import { pageModel, captionFor, nextStep, prevStep } from './steps.js';
import { createViewer } from './viewer3d.js';
import { drawBuild, palette } from './flat.js';
import { browserPrefs } from './prefs.js';

export async function initBuildPage() {
  const $ = id => document.getElementById(id), prefs = browserPrefs();
  const model = pageModel(BUILDS, new URLSearchParams(location.search).get('b'));
  if (!model.found) {
    $('name').textContent = 'Build not found';
    $('stage').innerHTML = '<p class="note">That build is not in the library. <a href="index.html">See all builds</a></p>';
    $('steps').hidden = $('hint').hidden = true;
    return;
  }
  document.title = `${model.name} · Couch Coach`;
  $('name').textContent = model.name;
  $('label').textContent = model.label;

  let viewer;
  try {
    viewer = await createViewer($('view'), model.build, prefs.colors());
  } catch {
    // no 3D in this browser: show the flat drawing instead
    $('stage').innerHTML = `<div class="note">${drawBuild(model.build, palette(prefs.colors()))}</div>`;
    $('steps').hidden = true;
    $('hint').innerHTML = 'The 3D view is not available in this browser, so this is the flat picture. <a href="index.html">See all builds</a>';
    return;
  }
  $('loading').remove();

  let n = 0;
  const show = () => {
    viewer.showThrough(n);
    $('caption').textContent = captionFor(model.steps, n);
    $('back').disabled = n <= 1;
    $('next').disabled = n === model.steps.length;
  };
  $('next').addEventListener('click', () => { n = nextStep(model.steps, n); show(); });
  $('back').addEventListener('click', () => { n = prevStep(n); show(); });
  $('all').addEventListener('click', () => { n = 0; show(); });
  show();
}
