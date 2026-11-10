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
    const heroSaveData = navigator.connection?.saveData === true;

    // Slide videos play only while their slide is showing; reduced motion and Save-Data keep the poster
    const syncVideos = () => slides.forEach((slide, i) => {
      const video = slide.querySelector('video');
      if (!video) return;
      if (i === current && !reduced.matches && !heroSaveData && !document.hidden) {
        if (video.preload === 'none') video.preload = 'auto';
        video.play().then(() => slide.classList.add('has-video')).catch(() => {});
      } else {
        video.pause();
      }
    });

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
      syncVideos();
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

    document.addEventListener('visibilitychange', syncVideos);
    reduced.addEventListener?.('change', syncVideos);
    setPause();
    syncVideos();
    schedule();
  }

  /* Showreel: load YouTube only when asked (keeps the page light on mobile data) */
  const reel = document.querySelector('[data-reel]');
  if (reel) {
    reel.querySelector('[data-reel-play]').addEventListener('click', () => {
      // A hosted MP4 (data-src) plays in a native player; otherwise fall back to the YouTube id
      if (reel.dataset.src) {
        const video = document.createElement('video');
        video.src = reel.dataset.src;
        video.controls = true;
        video.playsInline = true;
        video.autoplay = true;
        video.setAttribute('aria-label', 'Sembule Media showreel');
        const poster = reel.querySelector('img');
        if (poster) video.poster = poster.currentSrc || poster.src;
        reel.replaceChildren(video);
        video.play().catch(() => {});
        video.focus();
        return;
      }
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

  /* Work coverflow: arrows, keys, swipe and drag.
     The front card plays its YouTube clip (data-video) muted and looped while the section is on
     screen; the photograph stays underneath and shows again for side cards, reduced motion and Save-Data. */
  const flow = document.querySelector('[data-flow]');
  if (flow) {
    const stage = flow.querySelector('[data-flow-stage]');
    const cards = [...flow.querySelectorAll('[data-flow-card]')];
    const prev = flow.querySelector('[data-flow-prev]');
    const next = flow.querySelector('[data-flow-next]');
    const count = flow.querySelector('[data-flow-index]');
    let active = 0, drag = null, moved = false, inView = false, videoTimer;
    const saveData = navigator.connection?.saveData === true;

    const stopVideo = () => flow.querySelectorAll('.h-flow__video').forEach(frame => frame.remove());
    const playActive = () => {
      clearTimeout(videoTimer);
      const card = cards[active];
      const current = card.querySelector('.h-flow__video');
      flow.querySelectorAll('.h-flow__video').forEach(frame => { if (frame !== current) frame.remove(); });
      const id = card.dataset.video;
      const src = card.dataset.videoSrc;
      if (!(id || src) || !inView || reduced.matches || saveData || document.hidden) { stopVideo(); return; }
      if (current) return;
      // Wait for the card to settle at the front before loading the player
      videoTimer = setTimeout(() => {
        if (cards[active] !== card || card.querySelector('.h-flow__video')) return;
        if (src) {
          // Hosted portrait clip: muted, looped, inline; fades in once it is actually playing
          const video = document.createElement('video');
          video.className = 'h-flow__video h-flow__video--file';
          video.src = src;
          video.muted = true;
          video.loop = true;
          video.playsInline = true;
          video.autoplay = true;
          video.setAttribute('aria-hidden', 'true');
          video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true });
          card.querySelector('img').after(video);
          video.play().catch(() => video.remove());
          return;
        }
        const v = encodeURIComponent(id);
        const start = Number(card.dataset.videoStart) || 0;
        const frame = document.createElement('iframe');
        frame.className = 'h-flow__video';
        frame.src = `https://www.youtube-nocookie.com/embed/${v}?autoplay=1&mute=1&loop=1&playlist=${v}&controls=0&rel=0&playsinline=1&modestbranding=1&disablekb=1&iv_load_policy=3&start=${start}`;
        frame.title = `${card.querySelector('h3')?.textContent || 'Sembule Media'} video`;
        frame.allow = 'autoplay; encrypted-media; picture-in-picture';
        frame.tabIndex = -1;
        frame.setAttribute('aria-hidden', 'true');
        // YouTube shows its own poster for a moment; fade in once it has had time to start playing
        frame.addEventListener('load', () => setTimeout(() => frame.classList.add('is-playing'), 1200), { once: true });
        card.querySelector('img').after(frame);
      }, 650);
    };

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
      playActive();
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
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; playActive(); }, { threshold: .35 }).observe(stage);
    }
    document.addEventListener('visibilitychange', playActive);
    reduced.addEventListener?.('change', playActive);
    layout();
  }
})();
