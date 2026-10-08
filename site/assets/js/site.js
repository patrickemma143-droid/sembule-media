(async () => {
  const contentMeta = document.querySelector('meta[name="sembule-site-content"]');
  let siteContent = null;
  if (contentMeta?.content) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    try {
      const response = await fetch(contentMeta.content, { cache: 'no-store', signal: controller.signal });
      if (response.ok) {
        const candidate = await response.json();
        if (candidate && candidate.schemaVersion === 1) siteContent = candidate;
      }
    } catch {
      // Keep the HTML copy as the working fallback when content storage is unavailable.
    } finally {
      clearTimeout(timeout);
    }
  }
  window.SEMBULE_SITE_CONTENT = siteContent;

  const readContent = path => path.split('.').reduce((value, key) => value?.[key], siteContent);
  const publicUrl = value => {
    if (typeof value !== 'string' || !value.trim() || value.trim().startsWith('//')) return null;
    try {
      const parsed = new URL(value, window.location.href);
      return parsed.protocol === 'https:' || parsed.origin === window.location.origin ? value : null;
    } catch {
      return null;
    }
  };
  document.querySelectorAll('[data-cms-text]').forEach(node => {
    const value = readContent(node.dataset.cmsText);
    if (typeof value === 'string' || typeof value === 'number') node.textContent = String(value);
  });
  document.querySelectorAll('[data-cms-href]').forEach(node => {
    const value = publicUrl(readContent(node.dataset.cmsHref));
    if (value) node.setAttribute('href', value);
  });
  document.querySelectorAll('[data-cms-src]').forEach(node => {
    const value = publicUrl(readContent(node.dataset.cmsSrc));
    if (value) node.setAttribute('src', value);
  });
  document.querySelectorAll('[data-cms-alt]').forEach(node => {
    const value = readContent(node.dataset.cmsAlt);
    if (typeof value === 'string') node.setAttribute('alt', value);
  });
  const configuredHeroSlides = siteContent?.home?.hero?.slides;
  if (Array.isArray(configuredHeroSlides)) {
    document.querySelectorAll('[data-hero-slide]').forEach((slide, index) => {
      const story = configuredHeroSlides[index];
      if (!story || typeof story !== 'object') return;
      if (typeof story.eyebrow === 'string') slide.dataset.storyEyebrow = story.eyebrow;
      if (typeof story.title === 'string') slide.dataset.storyTitle = story.title;
      if (typeof story.description === 'string') slide.dataset.storyDescription = story.description;
      const image = slide.querySelector('img');
      const imageUrl = publicUrl(story.image);
      if (image && imageUrl) image.src = imageUrl;
      if (image && typeof story.imageAlt === 'string') image.alt = story.imageAlt;
      const marker = document.querySelector(`[data-hero-goto="${index}"]`);
      if (marker && typeof story.title === 'string') marker.setAttribute('aria-label', `Show story ${index + 1}: ${story.title}`);
    });
  }
  window.SEMBULE_HERO_VIDEO_URL = publicUrl(siteContent?.home?.hero?.videoUrl);

  const toggle = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-main-nav]');
  if (toggle && nav) {
    const closeMenu = () => {
      document.body.classList.remove('menu-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
    };
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('menu-open', open);
    });
    nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', () => { if (window.innerWidth > 760) closeMenu(); });
  }

  document.querySelectorAll('[data-year]').forEach(node => { node.textContent = String(new Date().getFullYear()); });

  const partnerBand = document.querySelector('[data-partner-band]');
  if (partnerBand) {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const rows = [...partnerBand.querySelectorAll('[data-client-marquee]')];
    const pauseButton = partnerBand.querySelector('[data-client-marquee-toggle]');
    let paused = reducedMotion.matches;
    rows.forEach(row => {
      const track = row.querySelector('.client-logo-track');
      const repeat = row.querySelector('.client-logo-set').cloneNode(true);
      repeat.classList.add('client-logo-set--repeat');
      repeat.setAttribute('aria-hidden', 'true');
      repeat.removeAttribute('aria-label');
      repeat.querySelectorAll('img').forEach(image => { image.alt = ''; });
      repeat.setAttribute('inert', '');
      track.append(repeat);
      if (!reducedMotion.matches) row.classList.add('is-ready');
    });
    const syncPausedState = () => {
      partnerBand.classList.toggle('is-paused', paused);
      pauseButton.setAttribute('aria-pressed', String(paused));
      pauseButton.setAttribute('aria-label', paused ? 'Resume client and partner logo movement' : 'Pause client and partner logo movement');
      pauseButton.textContent = paused ? 'Resume logos' : 'Pause logos';
    };
    pauseButton.hidden = reducedMotion.matches;
    pauseButton.addEventListener('click', () => { paused = !paused; syncPausedState(); });
    reducedMotion.addEventListener?.('change', event => {
      paused = event.matches;
      pauseButton.hidden = event.matches;
      rows.forEach(row => row.classList.toggle('is-ready', !event.matches));
      syncPausedState();
    });
    syncPausedState();
  }

  const hero = document.querySelector('[data-hero-carousel]');
  if (hero) {
    const stories = [...hero.querySelectorAll('[data-hero-slide]')].map(slide => ({
      eyebrow: slide.dataset.storyEyebrow || '',
      title: slide.dataset.storyTitle || '',
      description: slide.dataset.storyDescription || ''
    }));
    const track = hero.querySelector('.hero-slides');
    const slides = [...hero.querySelectorAll('[data-hero-slide]')];
    const markers = [...hero.querySelectorAll('[data-hero-goto]')];
    const eyebrow = hero.querySelector('[data-hero-eyebrow]');
    const title = hero.querySelector('[data-hero-title]');
    const description = hero.querySelector('[data-hero-description]');
    const copy = hero.querySelector('[data-hero-copy]');
    const video = hero.querySelector('[data-hero-video]');
    const play = hero.querySelector('[data-hero-play]');
    const pauseButton = hero.querySelector('[data-hero-pause]');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let current = 0, paused = reducedMotion.matches, pointerInside = false, focusInside = false;
    let timer, copyTimer, scrollTimer, wheelResetTimer, wheelUnlockTimer, wheelTotal = 0, wheelLocked = false, pointerStart = null, draggingMouse = false;
    const videoEmbed = window.SEMBULE_HERO_VIDEO_URL || 'https://www.youtube-nocookie.com/embed/rktDjkqMZaY?rel=0&playsinline=1&controls=1&autoplay=1';
    const stopVideo = () => { video.removeAttribute('src'); play.hidden = false; };
    const setPausedState = () => {
      pauseButton.setAttribute('aria-pressed', String(paused));
      pauseButton.textContent = paused ? 'Play' : 'Pause';
      pauseButton.setAttribute('aria-label', paused ? 'Resume hero slides' : 'Pause hero slides');
    };
    const stride = () => slides[0].getBoundingClientRect().width + (parseFloat(getComputedStyle(track).gap) || 0);
    const schedule = () => {
      clearTimeout(timer);
      if (paused || pointerInside || focusInside || document.hidden || current === slides.length - 1) return;
      timer = setTimeout(() => show(current + 1), 6800);
    };
    const show = target => {
      const destination = Math.max(0, Math.min(slides.length - 1, target));
      if (destination === current) return;
      clearTimeout(timer);
      track.scrollTo({ left: destination * stride(), behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    };
    const settle = () => {
      const next = Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / stride())));
      if (next !== current) {
        if (current === slides.length - 1) stopVideo();
        current = next;
        markers.forEach((marker, index) => marker.setAttribute('aria-current', String(index === current)));
        slides.forEach((slide, index) => {
          slide.setAttribute('aria-hidden', String(index !== current));
          if (index === current) slide.removeAttribute('inert'); else slide.setAttribute('inert', '');
        });
        copy.classList.add('is-changing');
        clearTimeout(copyTimer);
        copyTimer = setTimeout(() => {
          eyebrow.textContent = stories[current].eyebrow;
          title.textContent = stories[current].title;
          description.textContent = stories[current].description;
          copy.classList.remove('is-changing');
        }, 160);
      }
      schedule();
    };
    slides.forEach((slide, index) => {
      slide.setAttribute('aria-hidden', String(index !== 0));
      if (index !== 0) slide.setAttribute('inert', '');
    });
    markers.forEach(marker => marker.addEventListener('click', () => show(Number(marker.dataset.heroGoto))));
    pauseButton.addEventListener('click', () => { paused = !paused; setPausedState(); schedule(); });
    play.addEventListener('click', () => { video.src = videoEmbed; play.hidden = true; });
    track.addEventListener('scroll', () => { clearTimeout(scrollTimer); scrollTimer = setTimeout(settle, 120); }, { passive: true });
    track.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight') { event.preventDefault(); show(current + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); show(current - 1); }
    });
    hero.addEventListener('wheel', event => {
      const horizontal = event.shiftKey ? event.deltaY : event.deltaX;
      if (!horizontal || (!event.shiftKey && Math.abs(horizontal) < Math.abs(event.deltaY) * .8)) return;
      event.preventDefault();
      if (wheelLocked) return;
      wheelTotal += horizontal;
      clearTimeout(wheelResetTimer);
      if (Math.abs(wheelTotal) >= 24) {
        const direction = wheelTotal > 0 ? 1 : -1;
        wheelTotal = 0; wheelLocked = true; show(current + direction);
        wheelUnlockTimer = setTimeout(() => { wheelLocked = false; }, 540);
      } else wheelResetTimer = setTimeout(() => { wheelTotal = 0; }, 140);
    }, { passive: false });
    hero.addEventListener('pointerdown', event => {
      if (event.target.closest?.('a,button,iframe') || (event.pointerType === 'mouse' && event.button !== 0)) return;
      pointerStart = { x: event.clientX, y: event.clientY, left: track.scrollLeft };
      draggingMouse = event.pointerType === 'mouse';
      if (draggingMouse) track.classList.add('is-dragging');
      hero.setPointerCapture?.(event.pointerId);
    });
    hero.addEventListener('pointermove', event => { if (draggingMouse && pointerStart) track.scrollLeft = pointerStart.left - (event.clientX - pointerStart.x); });
    hero.addEventListener('pointerup', event => {
      if (!pointerStart) return;
      const dx = event.clientX - pointerStart.x, dy = event.clientY - pointerStart.y;
      if (!draggingMouse && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) show(current + (dx < 0 ? 1 : -1));
      pointerStart = null; draggingMouse = false; track.classList.remove('is-dragging');
    });
    hero.addEventListener('pointercancel', () => { pointerStart = null; draggingMouse = false; track.classList.remove('is-dragging'); });
    hero.addEventListener('pointerenter', () => { pointerInside = true; schedule(); });
    hero.addEventListener('pointerleave', () => { pointerInside = false; schedule(); });
    hero.addEventListener('focusin', () => { focusInside = true; schedule(); });
    hero.addEventListener('focusout', event => { if (!hero.contains(event.relatedTarget)) { focusInside = false; schedule(); } });
    document.addEventListener('visibilitychange', schedule);
    window.addEventListener('resize', () => track.scrollTo({ left: current * stride(), behavior: 'auto' }));
    reducedMotion.addEventListener?.('change', event => { if (event.matches) { paused = true; setPausedState(); } schedule(); });
    setPausedState(); schedule();
  }

  const workCarousel = document.querySelector('[data-work-carousel]');
  if (workCarousel) {
    const track = workCarousel.querySelector('[data-work-track]');
    const slides = [...workCarousel.querySelectorAll('[data-work-slide]')];
    const previous = workCarousel.querySelector('[data-work-prev]');
    const next = workCarousel.querySelector('[data-work-next]');
    const pauseButton = workCarousel.querySelector('[data-work-pause]');
    const count = workCarousel.querySelector('[data-work-current]');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let paused = reducedMotion.matches, pointerInside = false, focusInside = false;
    let timer, scrollTimer;
    const activeIndex = () => {
      const left = track.getBoundingClientRect().left;
      return slides.reduce((best, slide, index) => {
        const distance = Math.abs(slide.getBoundingClientRect().left - left);
        return distance < best.distance ? { index, distance } : best;
      }, { index: 0, distance: Infinity }).index;
    };
    const maxIndex = () => {
      const maxLeft = track.scrollWidth - track.clientWidth;
      const firstOffset = slides[0].offsetLeft;
      let last = 0;
      slides.forEach((slide, index) => {
        if (slide.offsetLeft - firstOffset <= maxLeft + 1) last = index;
      });
      return Math.max(0, last);
    };
    const update = () => {
      const index = activeIndex();
      count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
      previous.disabled = index === 0;
      next.disabled = index >= maxIndex();
      schedule();
    };
    const setPaused = () => {
      pauseButton.setAttribute('aria-pressed', String(paused));
      pauseButton.textContent = paused ? 'Play' : 'Pause';
      pauseButton.setAttribute('aria-label', paused ? 'Resume selected work slideshow' : 'Pause selected work slideshow');
    };
    const go = target => {
      const destination = Math.max(0, Math.min(maxIndex(), target));
      const left = track.scrollLeft + slides[destination].getBoundingClientRect().left - track.getBoundingClientRect().left;
      track.scrollTo({ left, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    };
    const schedule = () => {
      clearTimeout(timer);
      if (paused || pointerInside || focusInside || document.hidden || activeIndex() >= maxIndex()) return;
      timer = setTimeout(() => go(activeIndex() + 1), 7200);
    };
    previous.addEventListener('click', () => go(activeIndex() - 1));
    next.addEventListener('click', () => go(activeIndex() + 1));
    pauseButton.addEventListener('click', () => { paused = !paused; setPaused(); schedule(); });
    track.addEventListener('scroll', () => { clearTimeout(scrollTimer); scrollTimer = setTimeout(update, 140); }, { passive: true });
    track.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight') { event.preventDefault(); go(activeIndex() + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); go(activeIndex() - 1); }
    });
    workCarousel.addEventListener('pointerenter', () => { pointerInside = true; schedule(); });
    workCarousel.addEventListener('pointerleave', () => { pointerInside = false; schedule(); });
    workCarousel.addEventListener('focusin', () => { focusInside = true; schedule(); });
    workCarousel.addEventListener('focusout', event => { if (!workCarousel.contains(event.relatedTarget)) { focusInside = false; schedule(); } });
    document.addEventListener('visibilitychange', schedule);
    window.addEventListener('resize', update);
    reducedMotion.addEventListener?.('change', event => { if (event.matches) paused = true; setPaused(); schedule(); });
    setPaused(); update();
  }

  const testimonial = document.querySelector('[data-testimonial-carousel]');
  if (testimonial) {
    const slides = [
      { name: 'Client name to confirm', role: 'Corporate event · client role and organization to confirm', quote: 'Approved corporate event testimonial copy will appear here.', image: 'https://i0.wp.com/sembulemedia.com/wp-content/uploads/2022/04/DSC_6029-2-scaled.jpg?fit=1200%2C800&ssl=1' },
      { name: 'Client name to confirm', role: 'Wedding / celebration · client name to confirm', quote: 'Approved wedding client testimonial copy will appear here.', image: 'https://i0.wp.com/sembulemedia.com/wp-content/uploads/2022/04/msg680180638-10205.jpg?resize=580%2C435&ssl=1' },
      { name: 'Client name to confirm', role: 'Documentary · client role and organization to confirm', quote: 'Approved documentary testimonial copy will appear here.', image: 'https://i0.wp.com/sembulemedia.com/wp-content/uploads/2022/04/msg680180638-10213-Copy.jpg?resize=580%2C435&ssl=1' }
    ];
    const photos = {
      front: testimonial.querySelector('.testimonial-photo--front img'),
      middle: testimonial.querySelector('.testimonial-photo--middle img'),
      back: testimonial.querySelector('.testimonial-photo--back img'),
      incoming: testimonial.querySelector('.testimonial-photo--incoming img')
    };
    const name = testimonial.querySelector('[data-testimonial-name]'), role = testimonial.querySelector('[data-testimonial-role]');
    const quote = testimonial.querySelector('[data-testimonial-quote]'), copy = testimonial.querySelector('[data-testimonial-copy]');
    const previous = testimonial.querySelector('[data-testimonial-prev]'), following = testimonial.querySelector('[data-testimonial-next]');
    let index = 0, busy = false, dragStart = null, moveTimer;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const drawStack = () => Object.entries(photos).forEach(([position, img], offset) => { img.src = slides[(index + offset) % slides.length].image; });
    const drawCopy = () => { name.textContent = slides[index].name; role.textContent = slides[index].role; quote.textContent = slides[index].quote; };
    const move = direction => {
      if (busy) return;
      busy = true; previous.disabled = following.disabled = true;
      testimonial.classList.add(direction > 0 ? 'is-next' : 'is-previous'); copy.classList.add('is-changing');
      clearTimeout(moveTimer);
      moveTimer = setTimeout(() => {
        index = (index + direction + slides.length) % slides.length;
        drawStack(); drawCopy(); testimonial.classList.remove('is-next', 'is-previous'); copy.classList.remove('is-changing');
        previous.disabled = following.disabled = false; busy = false;
      }, reducedMotion.matches ? 140 : 280);
    };
    drawStack(); drawCopy();
    previous.addEventListener('click', () => move(-1)); following.addEventListener('click', () => move(1));
    testimonial.addEventListener('keydown', event => {
      if (event.target.closest('button')) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
    });
    const visual = testimonial.querySelector('[data-testimonial-visual]');
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
  }

  const filterButtons = [...document.querySelectorAll('[data-filter]')];
  const portfolioItems = [...document.querySelectorAll('[data-category]')];
  if (filterButtons.length && portfolioItems.length) {
    filterButtons.forEach(button => button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      filterButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      portfolioItems.forEach(item => { item.hidden = filter !== 'all' && !item.dataset.category.split(' ').includes(filter); });
    }));
  }

  const form = document.querySelector('[data-enquiry-form]');
  if (form) {
    form.addEventListener('submit', event => {
      event.preventDefault();
      const status = form.querySelector('[data-form-status]');
      if (!form.reportValidity()) return;
      if (form.elements.website.value.trim()) {
        if (status) status.textContent = 'Thank you. Your message is ready.';
        return;
      }
      const data = new FormData(form);
      const fields = [
        ['Name', data.get('name')], ['Phone', data.get('phone')], ['Email', data.get('email')],
        ['Service', data.get('service')], ['Event date', data.get('event_date')],
        ['Venue', data.get('venue')], ['Audience size', data.get('audience_size')],
        ['Budget range', data.get('budget')], ['Project details', data.get('message')]
      ].filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`);
      const url = `https://wa.me/256774345634?text=${encodeURIComponent(`Hello Sembule Media, I would like to plan a production.\n\n${fields.join('\n')}`)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      if (status) status.textContent = 'WhatsApp opened with your enquiry. Review and send it there.';
    });
  }
})();
