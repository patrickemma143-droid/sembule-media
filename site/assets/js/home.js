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
    const title = hero.querySelector('[data-hero-headline]');
    const description = hero.querySelector('[data-hero-description]');
    const index = hero.querySelector('[data-hero-index]');
    const pause = hero.querySelector('[data-hero-pause]');
    let current = 0, paused = reduced.matches, holding = false, timer, swap;
    const heroSaveData = navigator.connection?.saveData === true;

    // Slide videos play only while their slide is showing; reduced motion and Save-Data keep the poster
    const syncVideos = (restart = false) => slides.forEach((slide, i) => {
      const video = slide.querySelector('video');
      if (!video) return;
      if (i === current && !reduced.matches && !heroSaveData && !document.hidden) {
        if (video.preload !== 'auto') video.preload = 'auto';
        if (restart) video.currentTime = 0; // each visit to the slide starts the clip from the top
        // The slide's clock starts once the clip is actually playing, not while it is still loading
        video.play().then(() => { slide.classList.add('has-video'); if (restart) schedule(); }).catch(() => {});
      } else {
        video.pause();
      }
    });

    // Vision-mixer parts: the camera name in the program readout and the running timecode
    const cam = hero.querySelector('[data-hero-cam]');
    const timecode = hero.querySelector('[data-hero-timecode]');
    const pauseLabel = pause.querySelector('[data-hero-pause-label]');

    // "Auto" is the mixer's auto-transition: lit while the stories advance by themselves
    const setPause = () => {
      // An "Auto" lamp button is pressed while running; a plain Pause button is pressed while paused
      pause.setAttribute('aria-pressed', String(pauseLabel ? !paused : paused));
      if (pauseLabel) pauseLabel.textContent = 'Auto'; else pause.textContent = paused ? 'Play' : 'Pause';
      pause.setAttribute('aria-label', paused ? 'Turn auto on: let the stories advance by themselves' : 'Turn auto off: stop the stories advancing');
    };
    // Gold tally on the tile that is on air (program), green on the one that comes next (preview)
    const setTally = () => {
      const next = (current + 1) % slides.length;
      markers.forEach((marker, i) => {
        marker.setAttribute('aria-current', String(i === current));
        marker.classList.toggle('is-pvw', i === next && !paused);
      });
      if (cam) cam.textContent = `CAM ${current + 1}`;
    };
    const schedule = () => {
      clearTimeout(timer);
      if (paused || holding || document.hidden) return;
      // A slide with a video stays up longer so the clip gets a proper run before the next photo
      const hasVideo = slides[current].querySelector('video') && !reduced.matches && !heroSaveData;
      timer = setTimeout(() => show((current + 1) % slides.length), hasVideo ? 12000 : 7000);
    };
    let cutTimer;
    const show = (target, { cut = false } = {}) => {
      if (target === current) return;
      current = target;
      // A pressed camera tile is a hard CUT; auto mode keeps the slow MIX
      clearTimeout(cutTimer);
      hero.classList.toggle('is-cut', cut);
      if (cut) cutTimer = setTimeout(() => hero.classList.remove('is-cut'), 400);
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === current);
        slide.setAttribute('aria-hidden', String(i !== current));
      });
      setTally();
      syncVideos(true);
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
    markers.forEach(marker => marker.addEventListener('click', () => show(Number(marker.dataset.heroGoto), { cut: true })));
    pause.addEventListener('click', () => { paused = !paused; setPause(); setTally(); schedule(); });

    // Camera tiles show the slide's own picture, so a photo changed by the OS or site.js shows here too
    const syncThumbs = () => markers.forEach(marker => {
      const img = slides[Number(marker.dataset.heroGoto)]?.querySelector('img');
      const thumb = marker.querySelector('.h-mv__thumb');
      const src = img && (img.currentSrc || img.src);
      if (thumb && src) thumb.style.setProperty('--thumb', `url("${src.replace(/"/g, '%22')}")`);
    });
    window.addEventListener('load', syncThumbs, { once: true });

    // Program timecode (hours:minutes:seconds:frames at 25 fps): how long this page has been on air.
    // Runs only while the hero is on screen and the tab is visible; reduced motion ticks once a second.
    if (timecode) {
      const startedAt = performance.now();
      const two = n => String(n).padStart(2, '0');
      const draw = () => {
        const ms = performance.now() - startedAt;
        const frames = reduced.matches ? 0 : Math.floor((ms % 1000) / 40);
        const s = Math.floor(ms / 1000);
        timecode.textContent = `${two(Math.floor(s / 3600))}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}:${two(frames)}`;
      };
      let raf = 0, tick = 0, heroVisible = true;
      const loop = () => { draw(); raf = requestAnimationFrame(loop); };
      const run = () => {
        cancelAnimationFrame(raf); clearInterval(tick);
        if (!heroVisible || document.hidden) return;
        if (reduced.matches) { draw(); tick = setInterval(draw, 1000); } else loop();
      };
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; run(); }).observe(hero);
      }
      document.addEventListener('visibilitychange', run);
      reduced.addEventListener?.('change', run);
      run();
    }
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

    // The slides own the hero copy: if anything else (the OS bridge) rewrites the headline,
    // eyebrow or description, put back the text of the slide on screen. The h1 uses
    // data-hero-headline rather than the bridge's data-hero-title hook, so the bridge writes once
    // and does not watch the element; with both watching they would overwrite each other forever.
    const fields = [[eyebrow, 'storyEyebrow'], [title, 'storyTitle'], [description, 'storyDescription']];
    let restores = 0, restoreWindow = 0;
    const restoreCopy = () => {
      if (copy.classList.contains('is-changing')) return;
      // Safety valve: if some other script keeps fighting back, give up rather than loop
      const now = Date.now();
      if (now - restoreWindow > 1000) { restoreWindow = now; restores = 0; }
      if (++restores > 6) return;
      const data = slides[current].dataset;
      fields.forEach(([el, key]) => { if (el && data[key] && el.textContent !== data[key]) el.textContent = data[key]; });
    };
    new MutationObserver(restoreCopy).observe(copy, { childList: true, characterData: true, subtree: true });
    restoreCopy();

    document.addEventListener('visibilitychange', () => syncVideos());
    reduced.addEventListener?.('change', () => syncVideos());
    setPause();
    setTally();
    syncVideos(true);
    schedule();
  }

  /* Showreel: plays by itself, muted, while it is on screen (browsers only autoplay muted video).
     Pause and Sound buttons sit on the frame; a pause by the visitor is respected, the reel does not
     restart itself. It stops when scrolled away. Reduced motion and Save-Data keep the click-to-play
     poster, so nothing downloads or moves until asked. */
  const reel = document.querySelector('[data-reel]');
  const reelSaveData = navigator.connection?.saveData === true;
  if (reel && reel.dataset.src && !reduced.matches && !reelSaveData && 'IntersectionObserver' in window) {
    const poster = reel.querySelector('img');
    const video = document.createElement('video');
    video.className = 'h-reel__video';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'none';
    video.setAttribute('aria-label', 'Sembule Media showreel');
    if (poster) video.poster = poster.currentSrc || poster.src;

    const controls = document.createElement('div');
    controls.className = 'h-reel__controls';
    controls.innerHTML = '<button class="h-reel__ctl" type="button" data-reel-toggle aria-pressed="false"><span class="h-reel__icon h-reel__icon--pause" aria-hidden="true"></span><span data-reel-toggle-label>Pause</span></button><button class="h-reel__ctl" type="button" data-reel-sound aria-pressed="false"><span class="h-reel__icon h-reel__icon--sound" aria-hidden="true"></span><span data-reel-sound-label>Sound on</span></button>';
    const toggle = controls.querySelector('[data-reel-toggle]');
    const toggleLabel = controls.querySelector('[data-reel-toggle-label]');
    const sound = controls.querySelector('[data-reel-sound]');
    const soundLabel = controls.querySelector('[data-reel-sound-label]');
    let started = false, userPaused = false, visible = false;

    const start = () => {
      if (started) return;
      started = true;
      video.src = reel.dataset.src;
      video.preload = 'auto';
      reel.replaceChildren(video, controls);
      reel.classList.add('is-playing');
    };
    const setToggle = () => {
      const paused = video.paused;
      toggle.setAttribute('aria-pressed', String(paused));
      toggleLabel.textContent = paused ? 'Play' : 'Pause';
      toggle.querySelector('.h-reel__icon').className = `h-reel__icon h-reel__icon--${paused ? 'play' : 'pause'}`;
      toggle.setAttribute('aria-label', paused ? 'Play the showreel' : 'Pause the showreel');
    };
    const setSound = () => {
      sound.setAttribute('aria-pressed', String(!video.muted));
      soundLabel.textContent = video.muted ? 'Sound on' : 'Mute';
      sound.querySelector('.h-reel__icon').className = `h-reel__icon h-reel__icon--${video.muted ? 'sound' : 'mute'}`;
      sound.setAttribute('aria-label', video.muted ? 'Turn the showreel sound on' : 'Mute the showreel');
    };
    toggle.addEventListener('click', () => {
      if (video.paused) { userPaused = false; video.play().catch(() => {}); }
      else { userPaused = true; video.pause(); }
    });
    sound.addEventListener('click', () => {
      video.muted = !video.muted;
      if (!video.muted && video.paused) { userPaused = false; video.play().catch(() => {}); }
      setSound();
    });
    video.addEventListener('play', setToggle);
    video.addEventListener('pause', setToggle);
    video.addEventListener('volumechange', setSound);
    // Clicking the picture itself pauses or plays, like any video player
    video.addEventListener('click', () => toggle.click());

    const sync = () => {
      if (visible && !document.hidden) {
        start();
        if (!userPaused) video.play().catch(() => {});
      } else if (started) {
        video.pause();
      }
    };
    new IntersectionObserver(([entry]) => { visible = entry.intersectionRatio >= 0.5; sync(); }, { threshold: [0, 0.5, 1] }).observe(reel);
    document.addEventListener('visibilitychange', sync);
    // Pressing the poster's play button before the reel has started: start it, with sound
    reel.querySelector('[data-reel-play]')?.addEventListener('click', () => {
      start(); userPaused = false; video.muted = false; video.play().catch(() => {}); setSound();
    });
    reel.dataset.autoplay = 'on';
    setToggle(); setSound();
  }
  if (reel && reel.dataset.autoplay !== 'on' && reel.querySelector('[data-reel-play]')) {
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
    // Open in the middle of the deck (data-flow-start) so there are cards on both sides at first glance
    let active = Math.min(cards.length - 1, Math.max(0, Number(flow.dataset.flowStart) || 0));
    let drag = null, moved = false, inView = false, videoTimer;
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
  /* Testimonials: stacked photo cards (the earlier homepage design) fed from the Sembule OS.
     Quotes come from published_content.home.testimonials, read through the same public, read-only view
     and publishable key the OS website bridge uses (never a service key). Until the OS publishes approved
     quotes, three clearly marked draft slides show. OS text is only ever set as text, never as HTML. */
  const showcase = document.querySelector('[data-testimonial-carousel]');
  if (showcase) {
    const OS_VIEW = 'https://stpawtberphnvhcxjmkj.supabase.co/rest/v1/sembule_website_public?id=eq.main&select=published_content';
    const OS_KEY = 'sb_publishable_RvlRBmtSxrtAXDsUKn91QQ_XwWZOpt_';
    const draft = 'Approved client words will appear here once they are published from the Sembule OS.';
    // Local photos that fill the stack when a quote has no image of its own
    const photos = ['./assets/work/work-conference-qa-640.jpg', './assets/work/work-wedding-640.jpg', './assets/work/about-crew-at-work-640.jpg', './assets/work/hero-live-stage-640.jpg', './assets/work/service-documentary-640.jpg', './assets/work/work-official-event-640.jpg'];
    let slides = [
      { name: 'Client name to confirm', role: 'Corporate event', quote: draft, image: photos[0] },
      { name: 'Client name to confirm', role: 'Wedding and celebration', quote: draft, image: photos[1] },
      { name: 'Client name to confirm', role: 'Livestream and sound', quote: draft, image: photos[2] }
    ];
    showcase.classList.add('is-draft');

    const layers = ['front', 'middle', 'back', 'incoming'].map(position => showcase.querySelector(`.testimonial-photo--${position} img`));
    const name = showcase.querySelector('[data-testimonial-name]');
    const role = showcase.querySelector('[data-testimonial-role]');
    const quote = showcase.querySelector('[data-testimonial-quote]');
    const count = showcase.querySelector('[data-testimonial-index]');
    const total = showcase.querySelector('[data-testimonial-total]');
    const copy = showcase.querySelector('[data-testimonial-copy]');
    const previous = showcase.querySelector('[data-testimonial-prev]');
    const following = showcase.querySelector('[data-testimonial-next]');
    let index = 0, busy = false, dragStart = null, moveTimer, realCount = slides.length;

    const pad = n => String(n).padStart(2, '0');
    const drawStack = () => layers.forEach((img, offset) => { img.src = slides[(index + offset) % slides.length].image; });
    const drawCopy = () => {
      const slide = slides[index];
      name.textContent = slide.name;
      role.textContent = slide.role;
      quote.textContent = slide.quote;
      count.textContent = pad((index % realCount) + 1);
      total.textContent = pad(realCount);
    };
    const move = direction => {
      if (busy || realCount < 2) return;
      busy = true; previous.disabled = following.disabled = true;
      showcase.classList.add(direction > 0 ? 'is-next' : 'is-previous');
      copy.classList.add('is-changing');
      clearTimeout(moveTimer);
      moveTimer = setTimeout(() => {
        index = (index + direction + slides.length) % slides.length;
        drawStack(); drawCopy();
        showcase.classList.remove('is-next', 'is-previous');
        copy.classList.remove('is-changing');
        previous.disabled = following.disabled = false; busy = false;
      }, reduced.matches ? 140 : 280);
    };

    drawStack(); drawCopy();
    previous.addEventListener('click', () => move(-1));
    following.addEventListener('click', () => move(1));
    showcase.addEventListener('keydown', event => {
      if (event.target.closest('button')) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
    });
    const visual = showcase.querySelector('[data-testimonial-visual]');
    visual.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      dragStart = { x: event.clientX, y: event.clientY };
      visual.setPointerCapture?.(event.pointerId);
    });
    visual.addEventListener('pointerup', event => {
      if (!dragStart) return;
      const dx = event.clientX - dragStart.x, dy = event.clientY - dragStart.y;
      dragStart = null;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.25) move(dx < 0 ? 1 : -1);
    });
    visual.addEventListener('pointercancel', () => { dragStart = null; });

    // Swap the drafts for the OS's approved quotes once they are published there
    const clean = value => (typeof value === 'string' ? value.trim() : '');
    const safeImage = value => (/^(https:\/\/|\.\/assets\/)/.test(clean(value)) ? clean(value) : '');
    fetch(OS_VIEW, { headers: { apikey: OS_KEY, Authorization: 'Bearer ' + OS_KEY, Accept: 'application/json' }, cache: 'no-store', credentials: 'omit' })
      .then(response => (response.ok ? response.json() : []))
      .then(rows => {
        const content = rows?.[0]?.published_content || {};
        const list = content.home?.testimonials || content.testimonials;
        if (!Array.isArray(list)) return;
        const approved = list.filter(item => clean(item?.quote) && clean(item?.name)).slice(0, 8).map((item, i) => ({
          quote: clean(item.quote),
          name: clean(item.name),
          role: [clean(item.role), clean(item.organisation || item.organization), clean(item.event)].filter(Boolean).join(' · '),
          image: safeImage(item.image) || photos[i % photos.length]
        }));
        if (!approved.length) return;
        // The stack shows three photos at once; repeat a short list so it always has enough layers
        slides = approved.length >= 3 ? approved : [...approved, ...approved, ...approved].slice(0, approved.length * Math.ceil(3 / approved.length));
        realCount = approved.length;
        index = 0;
        showcase.classList.remove('is-draft');
        showcase.classList.add('is-live');
        // One quote: nothing to step through
        showcase.querySelector('.testimonial-navigation').hidden = realCount < 2;
        drawStack(); drawCopy();
      })
      .catch(() => {});
  }
})();
