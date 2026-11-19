// Portfolio hero: cards travelling round a wide oval SVG path (plain JS, no dependencies).
// Options are read from data attributes on [data-orbit], so the component can be reused anywhere:
//   data-path, data-viewbox ("0 0 1120 720"), data-speed (% of the loop per second), data-direction
//   ("normal" | "reverse"), data-repeat, data-drag-sensitivity, data-drag-decay, data-hover-slowdown,
//   data-scroll (on/off), data-z-range, data-show-path.
// The path is mapped onto the stage edge to edge (it stretches with the screen), and each card is
// placed with a transform at its point on the path, so cards keep their own size on every screen.
// Continuous travel; drag in either direction (horizontal and vertical both count) with inertia after
// release; hover slows everything to about 16% with a spring; page scroll speeds it up and turns it with
// the scroll direction (capped). Rolling z-index by progress. Reduced motion: no automatic travel
// (dragging still works). Off screen or in a hidden tab, the loop sleeps.
(() => {
  const root = document.querySelector('[data-orbit]');
  if (!root) return;
  const stage = root.querySelector('[data-orbit-stage]');
  const pathEl = root.querySelector('[data-orbit-path]');
  const template = [...root.querySelectorAll('[data-orbit-card]')];
  if (!stage || !pathEl || !template.length) return;

  const num = (v, d) => (v === undefined || v === '' || isNaN(+v) ? d : +v);
  const opt = {
    speed: num(root.dataset.speed, 3.5),
    dir: root.dataset.direction === 'reverse' ? -1 : 1,
    repeat: Math.max(1, num(root.dataset.repeat, 1)),
    dragSensitivity: num(root.dataset.dragSensitivity, 0.2),
    dragDecay: num(root.dataset.dragDecay, 0.96),
    hoverSlowdown: num(root.dataset.hoverSlowdown, 0.16),
    scroll: root.dataset.scroll !== 'off',
    zRange: num(root.dataset.zRange, 10)
  };
  if (root.dataset.path) pathEl.setAttribute('d', root.dataset.path);
  const vb = (root.dataset.viewbox || '0 0 1120 720').split(/[ ,]+/).map(Number);
  const VBW = vb[2] || 1120, VBH = vb[3] || 720;
  if (root.dataset.showPath === 'on') root.classList.add('show-path');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  // Repeat the set (copies are hidden from assistive tech)
  const cards = [...template];
  for (let c = 1; c < opt.repeat; c++) template.forEach(card => {
    const copy = card.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    stage.appendChild(copy);
    cards.push(copy);
  });

  // A lookup table of points along the path, in viewBox units
  const SAMPLES = 720;
  const total = pathEl.getTotalLength();
  const lut = Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const p = pathEl.getPointAtLength((total * i) / SAMPLES);
    return [p.x, p.y];
  });
  const pointAt = pct => {
    const f = ((pct % 100) + 100) % 100 / 100 * SAMPLES;
    const i = Math.floor(f), t = f - i;
    const a = lut[i], b = lut[Math.min(SAMPLES, i + 1)];
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };

  let W = 0, H = 0;
  const measure = () => { W = stage.clientWidth; H = stage.clientHeight; };
  measure();
  new ResizeObserver(() => { measure(); refreshShown(); }).observe(stage);

  let offset = 0;
  let dirSign = opt.dir;
  let hoverTarget = 1, hoverNow = 1, hoverVel = 0;
  let dragging = false, dragSpeed = 0, last = null;
  let scrollVel = 0, scrollSmooth = 0, lastScrollY = window.scrollY, lastScrollT = performance.now();

  // Only the cards on show share the loop (phones hide every other one in CSS)
  let shown = cards;
  const refreshShown = () => { shown = cards.filter(c => c.offsetParent !== null); };
  function render() {
    const n = shown.length || 1;
    shown.forEach((card, i) => {
      const p = ((offset + (i * 100) / n) % 100 + 100) % 100;
      const [x, y] = pointAt(p);
      card.style.transform = `translate3d(${(x / VBW * W).toFixed(1)}px, ${(y / VBH * H).toFixed(1)}px, 0)`;
      card.style.zIndex = String(1 + Math.floor((p / 100) * opt.zRange));
    });
  }

  // Scroll velocity (px/s), sampled from the page; smoothed with a spring below
  window.addEventListener('scroll', () => {
    const now = performance.now();
    const dt = Math.max(8, now - lastScrollT);
    scrollVel = ((window.scrollY - lastScrollY) / dt) * 1000;
    lastScrollY = window.scrollY; lastScrollT = now;
  }, { passive: true });

  let running = false, lastT = 0, onScreen = true;
  function frame(t) {
    if (!running) return;
    const dt = Math.min(64, t - (lastT || t)) / 1000;
    lastT = t;
    // Springs: hover factor and scroll speed (critically damped-ish)
    const k = 1 - Math.pow(1 - 0.18, dt * 60);
    hoverVel += (hoverTarget - hoverNow) * 0.12; hoverVel *= 0.6; hoverNow += hoverVel;
    scrollSmooth += (scrollVel - scrollSmooth) * k;
    scrollVel *= Math.pow(0.85, dt * 60);       // the raw reading fades once scrolling stops

    if (!dragging) {
      if (Math.abs(dragSpeed) > 0.01) {
        offset += dragSpeed * dt;
        dragSpeed *= Math.pow(opt.dragDecay, dt * 60);
      } else if (!reduced.matches) {
        const s = opt.scroll ? Math.max(-3, Math.min(3, scrollSmooth / 1000)) : 0;   // capped
        if (opt.scroll && Math.abs(s) > 0.02) dirSign = s > 0 ? 1 : -1;
        const boost = opt.scroll ? 1 + Math.min(5, Math.abs(s) * 5) : 1;
        offset += dirSign * opt.speed * dt * hoverNow * boost;
      }
    }
    render();
    requestAnimationFrame(frame);
  }
  const start = () => { if (!running && onScreen && !document.hidden) { running = true; lastT = 0; requestAnimationFrame(frame); } };
  const stop = () => { running = false; };

  // Hover: slow everything while the pointer is over a card
  cards.forEach(card => {
    card.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hoverTarget = opt.hoverSlowdown; });
    card.addEventListener('pointerleave', () => { hoverTarget = 1; });
  });

  // Drag anywhere on the hero; both axes count, the stronger one decides the sign
  root.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    dragging = true; dragSpeed = 0;
    last = { x: e.clientX, y: e.clientY, t: performance.now() };
    root.classList.add('is-dragging');
    root.setPointerCapture(e.pointerId);
  });
  root.addEventListener('pointermove', e => {
    if (!dragging || !last) return;
    const now = performance.now();
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    const dist = Math.hypot(dx, dy);
    const lead = Math.abs(dx) >= Math.abs(dy) ? dx : -dy;
    const step = Math.sign(lead || 1) * dist * opt.dragSensitivity * 0.5;   // % of the loop
    const dt = Math.max(8, now - last.t);
    offset += step;
    dragSpeed = (step / dt) * 1000;
    if (Math.abs(step) > 0.001) dirSign = Math.sign(step);
    last = { x: e.clientX, y: e.clientY, t: now };
    render();
  });
  const endDrag = e => {
    if (!dragging) return;
    dragging = false; last = null;
    root.classList.remove('is-dragging');
    if (root.hasPointerCapture?.(e.pointerId)) root.releasePointerCapture(e.pointerId);
  };
  root.addEventListener('pointerup', endDrag);
  root.addEventListener('pointercancel', endDrag);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; onScreen ? start() : stop(); }).observe(root);
  }
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  refreshShown();
  render();
  root.classList.add('is-ready');
  start();
})();
