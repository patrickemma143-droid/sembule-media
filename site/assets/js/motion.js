// Sembule Media: scroll motion across the site (step 4), GSAP + ScrollTrigger + SplitText, self-hosted.
// Loaded last on every page, after any pins (home.js, showday.js) are created, so trigger positions are right.
//  - Section headings rise line by line out of a mask as they come into view.
//  - Photos in cards are revealed by a wipe from below while they settle from a slight zoom.
//  - Ledes, cards and rows ease up in small groups as they arrive.
//  - The showreel frame grows to full size as it scrolls in (scrubbed).
// Everything runs once, only with full motion; reduced motion or no GSAP leaves the page as it is.
(() => {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(SplitText);

  // Parts that already have their own motion are left alone
  const skip = el => el.closest('.h-hero, .page-hero--film, .showday, .h-streams__viewport, .h-flow__stage, .h-lightbox, dialog, [data-no-motion]');
  const pick = sel => [...document.querySelectorAll(sel)].filter(el => !skip(el));

  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    // 1. Headings: lines rise out of a mask. Split at the moment of entry, so text written by the
    //    Sembule OS bridge after load is what gets split.
    const headings = pick([
      'main .h-head h2', 'main .h-streams__head h2', 'main .h-cta h2', 'main .rider__head h2',
      'main .section-heading h2', 'main .about-story h2', 'main .coverage-band h2', 'main .statement h2',
      'main .quote-inner h2', 'main .service-callout h2', 'main .page-hero h1:not(.d-enter)', 'main .contact-aside h2', 'main .contact-form h2'
    ].join(','));
    headings.forEach(h => {
      ScrollTrigger.create({
        trigger: h, start: 'top 92%', once: true,
        onEnter: () => {
          if (!window.SplitText) { gsap.from(h, { y: 30, opacity: 0, duration: 0.9, ease: 'expo.out' }); return; }
          const split = SplitText.create(h, { type: 'lines', mask: 'lines', linesClass: 'm-line' });
          gsap.from(split.lines, {
            yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.08,
            // Back to plain text, so resizes stay clean. If the OS bridge rewrote the heading during the
            // animation, its lines are already gone: then leave its text alone (a revert would undo it).
            onComplete: () => { if (split.lines[0]?.isConnected) split.revert(); }
          });
        }
      });
    });

    // 2. Photos: a wipe from below while the picture settles from a slight zoom
    const frames = pick('main .h-card__media, main .service-row-media, main .portfolio-photo, main .about-image, main .h-about__media, main .team-card__avatar');
    frames.forEach(frame => gsap.set(frame, { clipPath: 'inset(100% 0% 0% 0%)' }));
    ScrollTrigger.batch(frames, {
      start: 'top 90%', once: true,
      onEnter: batch => {
        gsap.to(batch, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.15, ease: 'expo.inOut', stagger: 0.1, clearProps: 'clipPath' });
        batch.forEach(frame => {
          const img = frame.querySelector('img');
          if (img) gsap.fromTo(img, { scale: 1.18 }, { scale: 1, duration: 1.6, ease: 'expo.out', clearProps: 'transform' });
        });
      }
    });

    // 3. Ledes, cards and rows: ease up in small groups
    const items = pick([
      'main .h-head__lede', 'main .h-eyebrow', 'main .eyebrow', 'main .h-also', 'main .h-card__body', 'main .h-facts li',
      'main .service-row > div:not(.service-row-media)', 'main .service-row-index', 'main .portfolio-item h2', 'main .portfolio-item > p', 'main .team-card__body',
      'main .h-flow__bar', 'main .testimonial-showcase', 'main .client-marquees', 'main .rider__sheet', 'main .sd-steps',
      'main .contact-form', 'main .contact-detail', 'main .contact-map', 'main .about-value', 'main .service-callout > div',
      'main .h-events__foot', 'main .h-streams__side', 'main .portfolio-filters', 'main .legal-content > *', 'main .h-actions'
    ].join(','));
    gsap.set(items, { opacity: 0, y: 34 });
    ScrollTrigger.batch(items, {
      start: 'top 92%', once: true, interval: 0.1, batchMax: 6,
      onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: 0.95, ease: 'expo.out', stagger: 0.08, overwrite: true, clearProps: 'transform' })
    });

    // 4. Showreel frame: grows from 86% to full size as it scrolls into the middle of the screen
    const reel = document.querySelector('.h-reel__frame');
    if (reel) {
      gsap.fromTo(reel, { scale: 0.86, borderRadius: 48 }, {
        scale: 1, borderRadius: 28, ease: 'none',
        scrollTrigger: { trigger: reel, start: 'top 95%', end: 'center 55%', scrub: 0.8 }
      });
    }

    return () => { gsap.set(items, { clearProps: 'all' }); gsap.set(frames, { clearProps: 'clipPath' }); };
  });

  // ---------- Finishing touches (step 5): desktop with a mouse and full motion only ----------
  const desk = '(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

  // Smooth scrolling (Lenis), driven by GSAP's clock so ScrollTrigger pins and scrubs stay in step.
  // It stops while a full-screen viewer is open, and in-page links glide to their target.
  mm.add(desk, () => {
    if (!window.Lenis) return;
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 1, anchors: { offset: -90 } });
    window.sembuleLenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const raf = time => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    const syncLenis = () => {
      const cls = document.documentElement.classList;
      (cls.contains('has-lightbox') || cls.contains('intro-on')) ? lenis.stop() : lenis.start();
    };
    const watchViewers = new MutationObserver(syncLenis);
    syncLenis(); // the intro may already be on
    watchViewers.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => { watchViewers.disconnect(); gsap.ticker.remove(raf); lenis.destroy(); window.sembuleLenis = null; };
  });

  // Cursor label: a small pill that follows the pointer over things that play or open
  mm.add(desk, () => {
    const targets = [
      ['[data-stream-play]', 'Watch live'],
      ['.h-flow__card.is-active', 'View'],
      ['.h-reel__frame', 'Play'],
      ['.portfolio-photo', 'View'],
      ['.h-card__media', 'Explore']
    ];
    const label = document.createElement('div');
    label.className = 'm-cursor';
    label.setAttribute('aria-hidden', 'true');
    label.innerHTML = '<span class="m-cursor__dot"></span><span class="m-cursor__text"></span>';
    document.body.append(label);
    const text = label.querySelector('.m-cursor__text');
    const xTo = gsap.quickTo(label, 'x', { duration: 0.35, ease: 'power3.out' });
    const yTo = gsap.quickTo(label, 'y', { duration: 0.35, ease: 'power3.out' });
    let shown = false;
    const onMove = event => {
      xTo(event.clientX); yTo(event.clientY);
      const hit = targets.find(([sel]) => event.target.closest?.(sel));
      // The showreel says Pause while it is playing
      let word = hit?.[1];
      if (hit && hit[0] === '.h-reel__frame') {
        const v = document.querySelector('.h-reel__frame video');
        word = v && !v.paused ? 'Pause' : 'Play';
      }
      if (word) { text.textContent = word; if (!shown) { shown = true; gsap.to(label, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2)' }); } }
      else if (shown) { shown = false; gsap.to(label, { scale: 0.4, opacity: 0, duration: 0.2 }); }
    };
    gsap.set(label, { xPercent: -50, yPercent: -50, scale: 0.4, opacity: 0 });
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { window.removeEventListener('pointermove', onMove); label.remove(); };
  });

  // Magnetic buttons: they lean a little towards the pointer and spring back when it leaves
  mm.add(desk, () => {
    const buttons = [...document.querySelectorAll('.h-btn, main .button, .h-round, .h-pill, .main-nav .button, .testimonial-arrow, .h-lightbox__nav')];
    const off = buttons.map(btn => {
      const xTo = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3.out' });
      const yTo = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3.out' });
      const move = event => {
        const r = btn.getBoundingClientRect();
        xTo((event.clientX - (r.left + r.width / 2)) * 0.28);
        yTo((event.clientY - (r.top + r.height / 2)) * 0.32);
      };
      const leave = () => { gsap.to(btn, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)', overwrite: true }); };
      btn.addEventListener('pointermove', move);
      btn.addEventListener('pointerleave', leave);
      return () => { btn.removeEventListener('pointermove', move); btn.removeEventListener('pointerleave', leave); gsap.set(btn, { clearProps: 'transform' }); };
    });
    return () => off.forEach(fn => fn());
  });

  // Positions depend on images and the brand font
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
})();
