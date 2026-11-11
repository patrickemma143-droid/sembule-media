// Show day: a running order in four steps (Services page).
// Ported from the taste skill's "pinned-chapters" moment, standalone for this site.
// Wide screens (1024px and up, 640px tall or more): the section holds on screen for one screen of scroll,
// the step in hand opens its text and the one frame on the right crossfades to that step's picture.
// Phones, short screens, reduced motion and no script: static rows, every step with its own picture.
(() => {
  const root = document.querySelector('[data-showday]');
  if (!root) return;
  const steps = [...root.querySelectorAll('.sd-step')];
  const frame = root.querySelector('.sd-frame');
  const counter = root.querySelector('[data-showday-step]');
  const figures = steps.map(step => step.querySelector('.sd-step__visual'));
  if (steps.length < 2 || !frame || figures.some(f => !f)) return;
  const homes = figures.map(f => f.parentElement);
  // Each step's text in a span of its own, so a closed step can collapse to nothing (dark.css)
  steps.forEach(step => {
    const text = step.querySelector('.sd-step__text');
    if (!text || text.querySelector('.sd-in')) return;
    const inner = document.createElement('span');
    inner.className = 'sd-in';
    while (text.firstChild) inner.append(text.firstChild);
    text.append(inner);
  });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const wide = matchMedia('(min-width: 1024px)');
  const fits = () => !reduced.matches && wide.matches && innerHeight >= 640;
  const pad = n => String(n).padStart(2, '0');

  let live = false, current = -1, raf = 0, near = true;

  const show = i => {
    if (i === current) return;
    current = i;
    steps.forEach((step, n) => step.classList.toggle('is-on', n === i));
    figures.forEach((fig, n) => { fig.classList.toggle('is-on', n === i); fig.classList.toggle('is-past', n < i); });
    if (counter) counter.textContent = `${pad(i + 1)} / ${pad(steps.length)}`;
  };
  // 0 when the section's top reaches the top of the screen, 1 when its bottom reaches the bottom
  const tick = () => {
    raf = 0;
    if (!live || !near) return;
    const r = root.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
    show(Math.min(steps.length - 1, Math.floor(p * steps.length)));
  };
  const request = () => { if (!raf) raf = requestAnimationFrame(tick); };

  const go = () => {
    if (live) return;
    live = true;
    root.classList.add('is-live');
    figures.forEach(fig => frame.append(fig));
    show(0); // step one open before the first scroll tick
    addEventListener('scroll', request, { passive: true });
    request();
  };
  const rest = () => {
    if (!live) return;
    live = false;
    root.classList.remove('is-live');
    removeEventListener('scroll', request);
    figures.forEach((fig, n) => { homes[n].append(fig); fig.classList.remove('is-on', 'is-past'); });
    steps.forEach(step => step.classList.remove('is-on'));
    current = -1;
  };
  const sync = () => (fits() ? go() : rest());

  // Only follow the scroll while the section is near the screen
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { near = entry.isIntersecting; if (near) request(); }, { rootMargin: '25% 0px' }).observe(root);
  }
  let resizeTimer = 0;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { sync(); request(); }, 120); });
  reduced.addEventListener?.('change', sync);
  wide.addEventListener?.('change', sync);
  sync();
})();
