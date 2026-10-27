import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initMotion(): () => void {
  const journey = document.querySelector<HTMLElement>('.journey');
  const stage = document.querySelector<HTMLElement>('.journey-stage');
  if (!journey || !stage) return () => {};
  const chapters = Array.from(stage.querySelectorAll<HTMLElement>('.chapter'));
  const controls = stage.querySelector<HTMLElement>('.journey-controls');
  const next = stage.querySelector<HTMLButtonElement>('.next-chapter');
  const status = stage.querySelector<HTMLElement>('.chapter-status');
  const dots = Array.from(stage.querySelectorAll<HTMLAnchorElement>('.chapter-dots a'));
  const menu = document.querySelector<HTMLDetailsElement>('.chapter-menu');
  const media = gsap.matchMedia();
  let disposed = false;

  media.add('(prefers-reduced-motion: no-preference) and (min-height: 560px)', () => {
    journey.classList.add('is-live');
    journey.classList.remove('is-rest');
    document.documentElement.classList.add('journey-active');
    if (controls) controls.hidden = false;
    let current = -1;
    let navigation: gsap.core.Tween | undefined;
    const setCurrent = (index: number) => {
      if (index === current) return;
      current = index;
      chapters.forEach((chapter, i) => { chapter.inert = i !== index; });
      dots.forEach((dot, i) => i === index ? dot.setAttribute('aria-current', 'step') : dot.removeAttribute('aria-current'));
      if (status) status.textContent = dots[index]?.getAttribute('aria-label') ?? '';
      if (next) next.textContent = index === chapters.length - 1 ? 'К началу' : 'Дальше';
    };
    gsap.set(chapters.slice(1), { autoAlpha: 0 });
    gsap.set(chapters.slice(1).flatMap(chapter => Array.from(chapter.querySelectorAll('.chapter-copy > *'))), { autoAlpha: 0 });
    setCurrent(0);
    const timeline = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: journey,
        pin: stage,
        start: 'top top',
        end: () => `+=${(chapters.length - 1) * window.innerHeight * 1.15}`,
        scrub: .65,
        invalidateOnRefresh: true,
        onRefresh: self => setCurrent(Math.min(chapters.length - 1, Math.round(self.progress * (chapters.length - 1)))),
      },
      onUpdate: () => setCurrent(Math.min(chapters.length - 1, Math.round(timeline.time()))),
    });
    chapters.forEach((chapter, i) => {
      timeline.addLabel(chapter.id, i);
      if (i === 0) return;
      const previous = chapters[i - 1];
      const at = i - .78;
      timeline.to(previous.querySelector('.chapter-copy'), { y: -36, duration: .25 }, at)
        .to(previous.querySelectorAll('.chapter-copy > *'), { autoAlpha: 0, duration: .25 }, at)
        .to(previous.querySelector('.chapter-art'), { xPercent: -7, scale: 1.045, opacity: 0, duration: .6 }, at)
        .to(previous, { autoAlpha: 0, duration: .45 }, at + .2)
        .fromTo(chapter, { autoAlpha: 0 }, { autoAlpha: 1, duration: .45, immediateRender: false }, at + .2)
        .fromTo(chapter.querySelector('.chapter-art'), { xPercent: 10, scale: 1.08, opacity: 0 }, { xPercent: 0, scale: 1, opacity: 1, duration: .65, ease: 'power2.out', immediateRender: false }, at + .05)
        .fromTo(chapter.querySelectorAll('.chapter-copy > *'), { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .3, stagger: .045, ease: 'power2.out', immediateRender: false }, at + .34);
    });
    timeline.to({}, { duration: .01 }, chapters.length - 1 - .01);
    const go = (index: number, focus = false) => {
      const trigger = timeline.scrollTrigger;
      if (!trigger) return;
      navigation?.kill();
      const target = Math.max(0, Math.min(chapters.length - 1, index));
      const position = trigger.start + target / (chapters.length - 1) * (trigger.end - trigger.start);
      const scroll = { value: window.scrollY };
      navigation = gsap.to(scroll, {
        value: position, duration: .9, ease: 'power2.inOut',
        onUpdate: () => window.scrollTo(0, scroll.value),
        onComplete: () => {
          history.replaceState(null, '', `#${chapters[target].id}`);
          if (focus) {
            const heading = chapters[target].querySelector<HTMLElement>('h1, h2');
            heading?.setAttribute('tabindex', '-1');
            heading?.focus({ preventScroll: true });
          }
        },
      });
    };
    const onAnchor = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!anchor || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const index = chapters.findIndex(chapter => `#${chapter.id}` === anchor.hash);
      if (index < 0) return;
      event.preventDefault();
      if (menu) menu.open = false;
      go(index, event.detail === 0);
    };
    const onNext = () => go(current === chapters.length - 1 ? 0 : current + 1);
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || menu?.open) return;
      if ((event.target as Element).closest('a, button, input, textarea, select, summary')) return;
      const destinations: Record<string, number> = { ArrowDown: current + 1, PageDown: current + 1, ArrowUp: current - 1, PageUp: current - 1, Home: 0, End: chapters.length - 1 };
      if (event.key in destinations) { event.preventDefault(); go(destinations[event.key]); }
    };
    const stopNavigation = () => navigation?.kill();
    const onMenuKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && menu?.open) { menu.open = false; menu.querySelector('summary')?.focus(); } };
    document.addEventListener('click', onAnchor);
    document.addEventListener('keydown', onKey);
    document.addEventListener('keydown', onMenuKey);
    window.addEventListener('wheel', stopNavigation, { passive: true });
    window.addEventListener('touchstart', stopNavigation, { passive: true });
    next?.addEventListener('click', onNext);
    const hashIndex = chapters.findIndex(chapter => `#${chapter.id}` === location.hash);
    if (hashIndex > 0) requestAnimationFrame(() => {
      const trigger = timeline.scrollTrigger;
      if (trigger) {
        const progress = hashIndex / (chapters.length - 1);
        window.scrollTo(0, trigger.start + progress * (trigger.end - trigger.start));
        ScrollTrigger.update();
        trigger.getTween()?.progress(1);
        timeline.progress(progress);
        setCurrent(hashIndex);
      }
    });
    return () => {
      navigation?.kill();
      journey.classList.remove('is-live');
      journey.classList.add('is-rest');
      document.documentElement.classList.remove('journey-active');
      chapters.forEach(chapter => { chapter.inert = false; });
      if (controls) controls.hidden = true;
      document.removeEventListener('click', onAnchor);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('keydown', onMenuKey);
      window.removeEventListener('wheel', stopNavigation);
      window.removeEventListener('touchstart', stopNavigation);
      next?.removeEventListener('click', onNext);
    };
  }, journey);
  const refresh = () => { if (!disposed) ScrollTrigger.refresh(); };
  void Promise.all([
    document.fonts.ready,
    ...Array.from(journey.querySelectorAll('img')).map(img => img.decode().catch(() => {})),
  ]).then(refresh);
  const cleanup = () => { disposed = true; media.revert(); };
  document.addEventListener('astro:before-swap', cleanup, { once: true });
  if (import.meta.hot) import.meta.hot.dispose(cleanup);
  return cleanup;
}
