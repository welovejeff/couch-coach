// Small helpers shared by the pages.

export const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Wraps a redraw so that many calls in one frame, as when a colour picker is dragged, draw once.
export function oncePerFrame(draw) {
  let queued = 0;
  return () => { queued ||= requestAnimationFrame(() => { queued = 0; draw(); }); };
}
