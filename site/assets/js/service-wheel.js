// Service wheel (Services page): the list rolls on its green glass panel while the photo cards change.
// Plain JS, no dependencies. Every 4 s it moves to the next service; it holds while the pointer or keyboard
// focus is inside it, while it is off screen or the tab is hidden, and never runs with reduced motion.
// Click a service (or use the arrow keys) to jump to it. Non-active cards are inert, so only the
// visible card's link can take focus. Changes the visitor makes are announced to screen readers.
(() => {
  const root = document.querySelector('[data-svc-wheel]');
  if (!root) return;
  const chips = [...root.querySelectorAll('[data-svc-chip]')];
  const cards = [...root.querySelectorAll('[data-svc-card]')];
  const ambients = [...root.querySelectorAll('[data-svc-ambient]')];
  const status = root.querySelector('[data-svc-status]');
  const n = chips.length;
  if (!n || cards.length !== n) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const INTERVAL = 4000;

  let current = 0;
  let ambientLayer = 0;
  const lastD = chips.map(() => 0);
  // Distance of item i from the current one, wrapped into [-n/2, n/2)
  const wrapped = i => { let d = (i - current) % n; if (d < -n / 2) d += n; if (d >= n / 2) d -= n; return d; };

  function render() {
    chips.forEach((chip, i) => {
      const d = wrapped(i);
      // A chip that wraps from one end of the list to the other jumps instead of sliding across
      const jump = Math.abs(d - lastD[i]) > n / 2;
      chip.classList.toggle('is-wrapping', jump);
      chip.style.setProperty('--d', d);
      chip.style.opacity = String(Math.max(0, 1 - Math.abs(d) * 0.25));
      chip.classList.toggle('is-active', d === 0);
      chip.setAttribute('aria-pressed', String(d === 0));
      lastD[i] = d;
      if (jump) requestAnimationFrame(() => requestAnimationFrame(() => chip.classList.remove('is-wrapping')));
    });
    cards.forEach((card, i) => {
      const d = wrapped(i);
      const active = d === 0, prev = d === -1, next = d === 1;
      const x = active ? 0 : prev ? -100 : next ? 100 : 0;
      const scale = active ? 1 : prev || next ? 0.85 : 0.7;
      const rot = prev ? -3 : next ? 3 : 0;
      card.style.transform = `translateX(${x}px) scale(${scale}) rotate(${rot}deg)`;
      card.style.opacity = active ? '1' : prev || next ? '0.4' : '0';
      card.style.zIndex = active ? '20' : prev || next ? '10' : '0';
      card.classList.toggle('is-active', active);
      card.setAttribute('aria-hidden', String(!active));
      card.inert = !active;
    });
    // The stage is lit by a blurred copy of the current photo; two layers cross-fade
    const src = cards[current].querySelector('img')?.currentSrc || cards[current].querySelector('img')?.src;
    if (src && ambients.length === 2) {
      ambientLayer = 1 - ambientLayer;
      ambients[ambientLayer].style.backgroundImage = `url("${src}")`;
      ambients[ambientLayer].classList.add('is-on');
      ambients[1 - ambientLayer].classList.remove('is-on');
    }
  }

  function go(index, { announce = false } = {}) {
    current = ((index % n) + n) % n;
    render();
    if (announce && status) status.textContent = `Showing ${current + 1} of ${n}: ${(chips[current].querySelector(".svc-chip__long") || chips[current]).textContent.trim()}`;
    schedule();
  }

  // Autoplay, held while the visitor is inside it, it is off screen, the tab is hidden, or motion is reduced
  let hovering = false, focused = false, onScreen = false, timer = 0;
  function schedule() {
    clearTimeout(timer);
    if (hovering || focused || !onScreen || document.hidden || reduced.matches) return;
    timer = setTimeout(() => go(current + 1), INTERVAL);
  }

  chips.forEach((chip, i) => chip.addEventListener('click', () => go(i, { announce: true })));
  root.addEventListener('keydown', event => {
    if (!event.target.closest('[data-svc-chip]')) return;
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    go(current + step, { announce: true });
    chips[current].focus({ preventScroll: true });
  });
  root.addEventListener('pointerenter', () => { hovering = true; schedule(); });
  root.addEventListener('pointerleave', () => { hovering = false; schedule(); });
  root.addEventListener('focusin', () => { focused = true; schedule(); });
  root.addEventListener('focusout', event => { if (!root.contains(event.relatedTarget)) { focused = false; schedule(); } });
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener?.('change', schedule);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; schedule(); }, { threshold: 0.35 }).observe(root);
  } else { onScreen = true; }

  root.classList.add('is-ready');
  render();
  schedule();
})();
