// Selected work accordion (homepage). One panel open at a time: picking a closed panel opens it and closes
// the open one in the same move (CSS does the motion). The gold arrow opens the next panel, wrapping round.
// Closed panels are whole-panel buttons; open panels hold the words, the project card and the arrow,
// and closed panels' contents are inert so the keyboard only reaches what can be seen.
// A panel with a clip (data-wk-video) plays it muted while it is open and on screen, never with
// reduced motion or Save-Data.
(() => {
  const root = document.querySelector('[data-wk]');
  if (!root) return;
  const panels = [...root.querySelectorAll('[data-wk-panel]')];
  if (!panels.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = navigator.connection?.saveData;
  let active = Math.max(0, panels.findIndex(p => p.classList.contains('is-active')));
  let onScreen = false;

  function syncVideo() {
    panels.forEach((panel, i) => {
      const video = panel.querySelector('[data-wk-video]');
      if (!video) return;
      const run = i === active && onScreen && !document.hidden && !reduced.matches && !saveData;
      if (run) {
        if (!video.getAttribute('src')) video.src = video.dataset.src;
        video.play()?.then(() => panel.classList.add('is-playing')).catch(() => {});
      } else {
        video.pause();
        panel.classList.remove('is-playing');
      }
    });
  }

  function open(index, { focus = false } = {}) {
    active = ((index % panels.length) + panels.length) % panels.length;
    panels.forEach((panel, i) => {
      const on = i === active;
      panel.classList.toggle('is-active', on);
      panel.querySelector('.wk-panel__open').inert = !on;
      const pick = panel.querySelector('.wk-panel__pick');
      pick.inert = on;
      pick.setAttribute('aria-expanded', String(on));
    });
    syncVideo();
    // After the arrow moves us on, keep the keyboard on the new panel's arrow
    if (focus) setTimeout(() => panels[active].querySelector('.wk-panel__next')?.focus({ preventScroll: true }), 300);
  }

  panels.forEach((panel, i) => {
    panel.querySelector('.wk-panel__pick').addEventListener('click', () => open(i));
    panel.querySelector('.wk-panel__next')?.addEventListener('click', event => {
      event.stopPropagation();
      open(i + 1, { focus: true });
    });
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; syncVideo(); }, { threshold: 0.25 }).observe(root);
  } else { onScreen = true; }
  document.addEventListener('visibilitychange', syncVideo);
  reduced.addEventListener?.('change', syncVideo);

  open(active);
})();
