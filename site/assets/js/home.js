// Sembule Media homepage: hero stories, showreel, work coverflow, header state.
// Story text is read from each slide's data-story-* attributes at the moment it is shown,
// so values written later by site.js (site-content.json) or the OS bridge are respected.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  /* Header: glass once the page scrolls */
  const header = document.querySelector('.site-header');
  if (header) {
    const sync = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
    sync();
    window.addEventListener('scroll', sync, { passive: true });
  }

  /* Hero stories: crossfade, numbered markers, pause control */
  const hero = document.querySelector('[data-hero-stage]');
  if (hero) {
    const slides = [...hero.querySelectorAll('[data-hero-slide]')];
    const markers = [...hero.querySelectorAll('[data-hero-goto]')];
    const copy = hero.querySelector('[data-hero-copy]');
    const eyebrow = hero.querySelector('[data-hero-eyebrow]');
    const title = hero.querySelector('[data-hero-title]');
    const description = hero.querySelector('[data-hero-description]');
    const index = hero.querySelector('[data-hero-index]');
    const pause = hero.querySelector('[data-hero-pause]');
    let current = 0, paused = reduced.matches, holding = false, timer, swap;

    const setPause = () => {
      pause.setAttribute('aria-pressed', String(paused));
      pause.textContent = paused ? 'Play' : 'Pause';
      pause.setAttribute('aria-label', paused ? 'Play the hero stories' : 'Pause the hero stories');
    };
    const schedule = () => {
      clearTimeout(timer);
      if (paused || holding || document.hidden) return;
      timer = setTimeout(() => show((current + 1) % slides.length), 7000);
    };
    const show = target => {
      if (target === current) return;
      current = target;
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === current);
        slide.setAttribute('aria-hidden', String(i !== current));
      });
      markers.forEach((marker, i) => marker.setAttribute('aria-current', String(i === current)));
      if (index) index.textContent = String(current + 1).padStart(2, '0');
      const next = slides[current].querySelector('img');
      if (next && next.loading === 'lazy') next.loading = 'eager';
      copy.classList.add('is-changing');
      clearTimeout(swap);
      swap = setTimeout(() => {
        const data = slides[current].dataset;
        eyebrow.textContent = data.storyEyebrow || '';
        title.textContent = data.storyTitle || '';
        description.textContent = data.storyDescription || '';
        copy.classList.remove('is-changing');
      }, reduced.matches ? 0 : 260);
      schedule();
    };

    slides.forEach((slide, i) => slide.setAttribute('aria-hidden', String(i !== 0)));
    markers.forEach(marker => marker.addEventListener('click', () => show(Number(marker.dataset.heroGoto))));
    pause.addEventListener('click', () => { paused = !paused; setPause(); schedule(); });
    hero.addEventListener('pointerenter', () => { holding = true; schedule(); });
    hero.addEventListener('pointerleave', () => { holding = false; schedule(); });
    hero.addEventListener('focusin', () => { holding = true; schedule(); });
    hero.addEventListener('focusout', event => { if (!hero.contains(event.relatedTarget)) { holding = false; schedule(); } });
    document.addEventListener('visibilitychange', schedule);
    reduced.addEventListener?.('change', event => { if (event.matches) { paused = true; setPause(); } schedule(); });

    // Swipe between stories on touch screens
    let start = null;
    hero.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' || event.target.closest('a,button')) return;
      start = { x: event.clientX, y: event.clientY };
    });
    hero.addEventListener('pointerup', event => {
      if (!start) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      start = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) show((current + (dx < 0 ? 1 : slides.length - 1)) % slides.length);
    });

    setPause();
    schedule();
  }

  /* Showreel: load YouTube only when asked (keeps the page light on mobile data) */
  const reel = document.querySelector('[data-reel]');
  if (reel) {
    reel.querySelector('[data-reel-play]').addEventListener('click', () => {
      const id = reel.dataset.video;
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&playsinline=1&autoplay=1`;
      frame.title = 'Sembule Media showreel';
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      reel.replaceChildren(frame);
      frame.focus();
    });
  }

  /* Work coverflow: arrows, keys, swipe and drag; no autoplay */
  const flow = document.querySelector('[data-flow]');
  if (flow) {
    const stage = flow.querySelector('[data-flow-stage]');
    const cards = [...flow.querySelectorAll('[data-flow-card]')];
    const prev = flow.querySelector('[data-flow-prev]');
    const next = flow.querySelector('[data-flow-next]');
    const count = flow.querySelector('[data-flow-index]');
    let active = 0, drag = null, moved = false;

    const layout = () => {
      const width = cards[0].offsetWidth; // layout width, unaffected by the scale transform
      const near = width * .74, far = width * .42;
      cards.forEach((card, i) => {
        const o = i - active, a = Math.abs(o), sign = Math.sign(o);
        const x = sign * (near * Math.min(a, 1) + far * Math.max(0, a - 1));
        card.style.setProperty('--x', `${x}px`);
        card.style.setProperty('--s', String(1 - .14 * Math.min(a, 3)));
        card.style.zIndex = String(20 - a);
        card.style.filter = a ? `brightness(${Math.max(.3, 1 - .28 * a)}) saturate(.7)` : '';
        card.style.opacity = a > 3 ? '0' : '1';
        card.style.pointerEvents = a > 3 ? 'none' : '';
        card.classList.toggle('is-active', a === 0);
        card.setAttribute('aria-hidden', String(a !== 0));
      });
      count.textContent = String(active + 1).padStart(2, '0');
      prev.disabled = active === 0;
      next.disabled = active === cards.length - 1;
    };
    const go = target => { active = Math.max(0, Math.min(cards.length - 1, target)); layout(); };

    prev.addEventListener('click', () => go(active - 1));
    next.addEventListener('click', () => go(active + 1));
    stage.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight') { event.preventDefault(); go(active + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); go(active - 1); }
    });
    cards.forEach((card, i) => card.addEventListener('click', () => { if (!moved && i !== active) go(i); }));
    stage.addEventListener('pointerdown', event => { drag = { x: event.clientX, y: event.clientY }; moved = false; });
    stage.addEventListener('pointermove', event => { if (drag && Math.abs(event.clientX - drag.x) > 8) moved = true; });
    stage.addEventListener('pointerup', event => {
      if (!drag) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      drag = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(active + (dx < 0 ? 1 : -1));
      setTimeout(() => { moved = false; }, 0);
    });
    stage.addEventListener('pointercancel', () => { drag = null; });
    window.addEventListener('resize', layout);
    layout();
  }
})();
