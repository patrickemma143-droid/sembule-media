// Drift hero: eleven studio objects that glide between three layouts (Scatter / Align / Cluster).
// Each object (and the header) sits at top:0 left:0 and is placed only by translate(x, y) rotate(r), where
// x and y are percentages of the desk. Positions are fixed per mode, so a CSS transform transition with a
// power3.inOut curve does the morph; no measuring. Objects nearest the middle of the list move first.
// Resizing re-places everything at once. Reduced motion: layouts snap with no morph.
// Loaded after home.js: on the first visit the desk opens from a tight cluster into Scatter as the intro film wipes away.
(() => {
  const root = document.querySelector('[data-drift]');
  if (!root) return;
  const desk = root.querySelector('[data-drift-desk]');
  const header = root.querySelector('[data-drift-header]');
  const items = [...root.querySelectorAll('[data-drift-item]')];
  const buttons = [...root.querySelectorAll('[data-drift-mode]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  const DURATION = 1250;
  const EASE = 'cubic-bezier(0.65, 0, 0.35, 1)'; // about power3.inOut
  const STAGGER = 110;                           // ms, centre-out spread

  // x, y in % of the desk; rotation in degrees. Same order as the objects in the markup.
  const LAYOUTS = {
    scatter: {
      player: [-2.5, -2.5, -15], mark: [20, 15, 5], lens: [72.5, 5, 0], cursor: [72.5, 75, 0],
      call: [80, 60, 15], folder: [90, 50, 5], mic: [2.5, 45, -10], mixer: [9.5, 55, 15],
      paper: [5, 15, 10], pass: [-2.5, 65, -35], photo: [65, 20, -5]
    },
    align: {
      player: [76.5, -5, 0], mark: [64.5, 6, 0], lens: [0, 47.5, 0], cursor: [63.5, 23, 0],
      call: [34.5, 59, 0], folder: [24.5, 33, 0], mic: [-6, 3.5, 0], mixer: [82.5, 66, 0],
      paper: [9, -3.5, 0], pass: [60, 65.5, 0], photo: [36.5, 5.5, 0]
    },
    cluster: {
      player: [45, 0.5, 20], mark: [65, 70, 25], lens: [27.5, 15, 10], cursor: [75, 35, 0],
      call: [30, 57.5, 10], folder: [25, 40, 10], mic: [30, 7.5, 30], mixer: [50, 50, -5],
      paper: [10, 10, -30], pass: [16.5, 50, -20], photo: [57.5, 20, 10]
    }
  };
  const HEADER = {
    scatter: { x: 50, y: 47.5, center: true },
    align: { x: 70, y: 37.5, center: false },
    cluster: { x: 50, y: 47.5, center: true }
  };

  const mid = (items.length - 1) / 2;
  const delays = items.map((_, i) => (Math.abs(i - mid) / (mid || 1)) * STAGGER);
  let mode = 'scatter';

  const place = (el, x, y, r, animate, delay) => {
    el.style.transition = animate ? `transform ${DURATION}ms ${EASE} ${Math.round(delay)}ms` : 'none';
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${r}deg)`;
  };

  function layout(next, animate) {
    const w = desk.offsetWidth;
    const h = desk.offsetHeight;
    // On narrow screens the header always stays centred: offset left it would run off the edge
    const hc = w < 760 ? { ...HEADER[next], x: 50, center: true } : HEADER[next];
    header.classList.toggle('is-left', !hc.center);
    const hx = (hc.x / 100) * w - (hc.center ? header.offsetWidth / 2 : 0);
    const hy = (hc.y / 100) * h - (hc.center ? header.offsetHeight / 2 : 0);
    place(header, hx, hy, 0, animate, STAGGER);
    items.forEach((el, i) => {
      const [x, y, r] = LAYOUTS[next][el.dataset.driftItem];
      place(el, (x / 100) * w, (y / 100) * h, r, animate, delays[i]);
    });
  }

  function setMode(next, { animate = !reduced.matches } = {}) {
    if (!LAYOUTS[next]) return;
    mode = next;
    layout(next, animate);
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.driftMode === next)));
  }

  buttons.forEach(b => b.addEventListener('click', () => { if (b.dataset.driftMode !== mode) setMode(b.dataset.driftMode); }));

  // Resize: re-place the current layout at once
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => layout(mode, false), 120);
  });
  // The brand font changes the header's size once it has loaded
  document.fonts?.ready.then(() => layout(mode, false));

  // Start: a tight cluster, then drift out into Scatter once the page is on show (after the intro film)
  layout('cluster', false);
  mode = 'cluster';
  root.classList.add('is-ready');
  buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.driftMode === 'scatter')));
  const opening = window.sembuleIntro || Promise.resolve();
  opening.then(() => requestAnimationFrame(() => requestAnimationFrame(() => setMode('scatter'))));
})();
