// Drift hero: eleven studio objects that glide between three layouts (Scatter / Align / Cluster).
// Each object (and the header) sits at top:0 left:0 and is placed only by translate(x, y) rotate(r), where
// x and y are percentages of the desk. Positions are fixed per mode, so a CSS transform transition with a
// power3.inOut curve does the morph. The header leads; objects follow in a wave from the desk's centre.
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
  const STAGGER = 180;                           // ms, total spread of the centre-out wave

  // x, y in % of the desk; rotation in degrees. Same order as the objects in the markup.
  const LAYOUTS = {
    // Wide screens: two mirrored columns that keep inside the desk. Each side has a large card high up,
    // a pair low down (one at the edge, one leaning in toward the headline) and a small piece tucked
    // between the large card and the headline; the pointer sits between the words and the buttons.
    scatter: {
      paper: [5, 14, -5],      folder: [24, 17, -8],   player: [16.8, 52, 5],  pass: [3.5, 55, -9],
      photo: [78.4, 14, 5],    mark: [70, 18, 8],      call: [68, 51, -5],     mixer: [85.3, 55, 9],
      cursor: [61, 72, -6]
    },
    // Phones keep the looser layout that fits a tall, narrow screen
    // Phones: a calm first screen. What we do and the switcher photo above the headline, the platform
    // panel and the player below it, the ON AIR light between them; the other objects are hidden in CSS.
    scatterPhone: {
      paper: [3, 9, -4], photo: [57, 11, 5], call: [3, 69, -5], player: [61, 69, 5], folder: [42.9, 73.5, 0],
      mark: [0, 0, 0], cursor: [0, 0, 0], pass: [0, 0, 0], mixer: [0, 0, 0]
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

  let mode = 'scatter';
  let lastSwitch = -Infinity;

  // The wave: objects nearest the middle of the desk (where they sit now) move first, and the gaps
  // between starts shrink as it spreads outward, so the group reads as one gesture, not a queue.
  const waveDelays = () => {
    const w = desk.offsetWidth, h = desk.offsetHeight;
    const dist = items.map(el => {
      const r = el.getBoundingClientRect(), d = desk.getBoundingClientRect();
      return Math.hypot(r.left + r.width / 2 - d.left - w / 2, r.top + r.height / 2 - d.top - h / 2);
    });
    const order = dist.map((d, i) => [d, i]).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
    const out = new Array(items.length);
    order.forEach((itemIndex, rank) => {
      const t = rank / Math.max(1, items.length - 1);
      out[itemIndex] = STAGGER * (1 - Math.pow(1 - t, 2)); // ease-out on the delays
    });
    return out;
  };

  const place = (el, x, y, r, animate, delay) => {
    el.style.transition = animate ? `transform ${DURATION}ms ${EASE} ${Math.round(delay)}ms` : 'none';
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${r}deg)`;
  };

  function layout(next, animate) {
    const w = desk.offsetWidth;
    const h = desk.offsetHeight;
    // A switch made while the last one is still moving re-targets everything at once: no second wait
    const now = performance.now();
    const midFlight = now - lastSwitch < DURATION + STAGGER;
    const delays = animate && !midFlight ? waveDelays() : items.map(() => 0);
    if (animate) lastSwitch = now;
    // On narrow screens the header always stays centred: offset left it would run off the edge
    // and sits a little lower, below the What we do card
    const hc = w < 760 ? { ...HEADER[next], x: 50, y: 51, center: true } : HEADER[next];
    header.classList.toggle('is-left', !hc.center);
    const hx = (hc.x / 100) * w - (hc.center ? header.offsetWidth / 2 : 0);
    const hy = (hc.y / 100) * h - (hc.center ? header.offsetHeight / 2 : 0);
    place(header, hx, hy, 0, animate, 0); // the header is the lead: it moves first
    // Wide screens: the objects scale with the desk (smaller on short laptop screens) so they never
    // crowd the edges; phones keep the scale set in drift.css
    if (w >= 760) root.style.setProperty('--k', Math.max(0.62, Math.min(0.85, h / 860, w / 1650)).toFixed(3));
    else root.style.removeProperty('--k');
    const set = w < 760 && next === 'scatter' ? LAYOUTS.scatterPhone : LAYOUTS[next];
    items.forEach((el, i) => {
      const [x, y, r] = set[el.dataset.driftItem];
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
  opening.then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
    root.classList.add('is-on');   // header entrance, together with the desk opening out
    setMode('scatter');
  })));

  // The background film behind the desk gets its source only when it will play: the small file on
  // phones, none at all with reduced motion or Save-Data (its still image stays).
  const saveData = navigator.connection?.saveData;
  const bg = root.querySelector('[data-drift-bg]');
  if (bg && !reduced.matches && !saveData) {
    bg.src = matchMedia('(max-width: 900px)').matches ? bg.dataset.srcSmall : bg.dataset.srcLarge;
  }

  // The clips (background film, control room on the photo card, switcher close-up on the mixer card):
  // muted loops, only while the hero is on screen, never with reduced motion or Save-Data (posters stay).
  const videos = [...root.querySelectorAll('[data-drift-video], [data-drift-bg]')].filter(v => v.getAttribute('src') || v.src);
  if (videos.length) {
    let onScreen = false;
    const sync = () => {
      const run = onScreen && !document.hidden && !reduced.matches && !saveData;
      videos.forEach(video => { if (run && video.offsetParent !== null) { video.play()?.catch(() => {}); } else { video.pause(); } });
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; sync(); }, { threshold: 0.1 }).observe(root);
    } else { onScreen = true; sync(); }
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener?.('change', sync);
  }
})();
