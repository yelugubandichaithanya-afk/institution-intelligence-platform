/*
 * Shared motion layer — custom cursor, scroll reveals, chart draw-in, count-up,
 * magnetic buttons. Everything is skipped when the user prefers reduced motion.
 * Content rendered later (search results, profiles) is picked up automatically.
 */
const Motion = (() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;
  if (!reduced) root.classList.add('motion');

  const REVEAL = [
    '[data-reveal]', '.card', '.inst-card', '.kpi', '.panel', '.flag', '.variance', '.timeline',
    '.section-head', '.picker', '.empty', '.source-layer', '.cmp-table tbody tr', '.risk-list li',
  ].join(', ');
  const DRAW = '.chart, .hbars, .donut-wrap';

  // ------------------------------------------------------------ count-up
  function formatCount(el, value) {
    const dec = Number(el.dataset.decimals || 0);
    const num = value.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return `${el.dataset.prefix || ''}${num}${el.dataset.suffix || ''}`;
  }
  function countUp(el) {
    const end = parseFloat(el.dataset.count);
    if (reduced) { el.textContent = formatCount(el, end); return; }
    const duration = Number(el.dataset.duration || 1400);
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      el.textContent = formatCount(el, end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ------------------------------------------------------------ reveal / draw on scroll
  const io = reduced ? null : new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('in');
      if (el.dataset.count != null) countUp(el);
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });

  function scan(scope = document) {
    scope.querySelectorAll(`${REVEAL}, ${DRAW}, [data-count]`).forEach((el) => {
      if (el.dataset.motion) return;
      el.dataset.motion = '1';
      if (reduced) {
        el.classList.add('in');
        if (el.dataset.count != null) countUp(el);
        return;
      }
      // Stagger siblings that reveal together (capped so long lists stay snappy)
      if (el.parentElement && !el.style.getPropertyValue('--d')) {
        const sibs = [...el.parentElement.children].filter((c) => c.matches(REVEAL));
        const i = sibs.indexOf(el);
        if (i > 0) el.style.setProperty('--d', `${Math.min(i, 8) * 70}ms`);
      }
      io.observe(el);
    });
  }

  // ------------------------------------------------------------ custom cursor
  function initCursor() {
    if (reduced || !finePointer) return;
    const dot = document.createElement('div');
    const ring = document.createElement('div');
    dot.className = 'cursor-dot';
    ring.className = 'cursor-ring';
    dot.setAttribute('aria-hidden', 'true');
    ring.setAttribute('aria-hidden', 'true');
    document.body.append(dot, ring);
    root.classList.add('has-cursor');

    let x = -100, y = -100, rx = x, ry = y, visible = false;
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY;
      if (!visible) { visible = true; rx = x; ry = y; root.classList.add('cursor-on'); }
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }, { passive: true });

    (function follow() {
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      requestAnimationFrame(follow);
    })();

    const INTERACTIVE = 'a, button, [role="button"], label, select, summary, .inst-card, .chip, .ev, .module-card';
    const TEXT = 'input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]), textarea';
    addEventListener('pointerover', (e) => {
      const t = e.target instanceof Element ? e.target : null;
      root.classList.toggle('cursor-hover', !!t?.closest(INTERACTIVE));
      root.classList.toggle('cursor-text', !!t?.closest(TEXT));
      root.classList.toggle('cursor-dark', !!t?.closest('.tile-dark, .topbar, .auth-brand, .device'));
    }, { passive: true });
    addEventListener('pointerdown', () => root.classList.add('cursor-down'));
    addEventListener('pointerup', () => root.classList.remove('cursor-down'));
    document.addEventListener('mouseleave', () => { root.classList.remove('cursor-on'); visible = false; });
  }

  // ------------------------------------------------------------ magnetic buttons
  function initMagnetic() {
    if (reduced || !finePointer) return;
    document.addEventListener('pointermove', (e) => {
      const el = e.target instanceof Element ? e.target.closest('.btn, [data-magnetic]') : null;
      document.querySelectorAll('.is-magnet').forEach((m) => {
        if (m !== el) { m.classList.remove('is-magnet'); m.style.translate = ''; }
      });
      if (!el || el.disabled) return;
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      el.classList.add('is-magnet');
      el.style.translate = `${(dx * 8).toFixed(1)}px ${(dy * 6).toFixed(1)}px`;
    }, { passive: true });
  }

  // ------------------------------------------------------------ boot
  function boot() {
    scan();
    initCursor();
    initMagnetic();
    if (!reduced) {
      // Pick up content rendered after load (results, profiles, comparisons)
      let queued = false;
      new MutationObserver(() => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; scan(); });
      }).observe(document.body, { childList: true, subtree: true });
    }
    requestAnimationFrame(() => root.classList.add('page-ready'));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  return { scan, countUp, reduced };
})();
