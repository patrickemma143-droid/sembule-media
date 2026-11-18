// What we do: four service cards on a pinned, full-screen stage (GSAP ScrollTrigger, self-hosted).
// Scroll position drives everything: the next card rises from below tilted about 8 degrees, straightens and
// settles in the centre while the current one lifts away, turns slightly the other way, shrinks and fades.
// Raw scroll progress is eased towards with a gentle, frame-rate independent interpolation.
// Loaded before home.js, so this pin is created before the "Streamed live" pin further down the page.
// Reduced motion or no GSAP: the section stays a plain, readable grid (see what-we-do.css).
(() => {
  const section = document.querySelector('[data-wwd]');
  if (!section || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const stage = section.querySelector('[data-wwd-stage]');
  const cards = [...section.querySelectorAll('[data-wwd-card]')];
  const words = [...section.querySelectorAll('[data-wwd-word]')];
  const current = section.querySelector('[data-wwd-current]');
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  const last = cards.length - 1;

  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
    section.classList.add('is-live');
    let target = 0;
    let shown = 0;
    let settled = false;

    const render = () => {
      const scene = shown * last;
      stage.style.setProperty('--progress', shown.toFixed(4));
      cards.forEach((card, i) => {
        const delta = i - scene;
        const c = clamp(delta, -1.4, 1.65);
        const y = c < 0 ? c * 160 : c * 127;                 // % of the card's own height
        const rotation = c < 0 ? c * 7 : c * 8.5;            // leaving: turns back a little; coming: tilted ~8deg
        const scale = c < 0 ? 1 - Math.min(-c, 1) * 0.085 : 1 - Math.min(c, 1) * 0.055;
        const opacity = delta < -0.82 ? clamp((delta + 1.16) / 0.34, 0, 1)
          : delta > 1.16 ? clamp((1.55 - delta) / 0.39, 0, 1) : 1;
        card.style.transform = `translate3d(-50%, calc(-50% + ${y.toFixed(3)}%), 0) rotate(${rotation.toFixed(3)}deg) scale(${scale.toFixed(4)})`;
        card.style.opacity = opacity.toFixed(3);
        card.style.zIndex = String(50 - Math.round(Math.abs(delta) * 10) + i);
        card.setAttribute('aria-hidden', String(Math.abs(delta) > 0.5));
      });
      words.forEach((word, i) => {
        const dir = i === 1 ? 1 : -1;
        word.style.transform = `translate3d(${(scene * (4.5 + i * 1.4) * dir).toFixed(2)}px, ${(-scene * (5 + i * 3)).toFixed(2)}px, 0)`;
      });
      if (current) current.textContent = String(Math.round(scene) + 1).padStart(2, '0');
    };

    // Ease the shown progress towards the scroll position; idle once it has caught up
    const tick = (time, deltaMs) => {
      if (settled) return;
      const k = 1 - Math.pow(1 - 0.12, (deltaMs || 16.7) / 16.7);
      shown += (target - shown) * k;
      if (Math.abs(target - shown) < 0.0001) { shown = target; settled = true; }
      render();
    };
    gsap.ticker.add(tick);

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => '+=' + Math.round(window.innerHeight * 3.3),  // about 430vh in all with the stage itself
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: self => { target = self.progress; settled = false; }
    });
    target = shown = trigger.progress;
    render();

    return () => {
      gsap.ticker.remove(tick);
      trigger.kill();
      section.classList.remove('is-live');
      stage.style.removeProperty('--progress');
      cards.forEach(card => { card.style.transform = card.style.opacity = card.style.zIndex = ''; card.removeAttribute('aria-hidden'); });
      words.forEach(word => { word.style.transform = ''; });
      if (current) current.textContent = '01';
    };
  });
})();
