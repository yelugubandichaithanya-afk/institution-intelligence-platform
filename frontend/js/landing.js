/* Landing page: hero word split, scroll-linked device tilt, statement highlight,
   horizontal module gallery, step progress and nav state. */
(() => {
  const reduced = Motion.reduced;
  const $ = (id) => document.getElementById(id);

  // Signed-in visitors go straight to the app
  if (Auth.session()) {
    document.querySelectorAll('#navCta, [data-cta]').forEach((a) => {
      a.textContent = 'Open app';
      a.href = 'search.html';
    });
  }

  // Split text into word spans for staggered / scroll-lit animation
  function splitWords(el, { indexVar } = {}) {
    let n = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const span = document.createElement('span');
            span.className = 'w';
            if (child.parentElement.classList.contains('accent')) span.classList.add('accent');
            if (indexVar) span.style.setProperty(indexVar, n);
            span.textContent = part;
            frag.append(span);
            n++;
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    walk(el);
    return [...el.querySelectorAll('.w')];
  }

  splitWords(document.querySelector('[data-split]'), { indexVar: '--wi' });
  const statementWords = splitWords($('statement'));

  // Gallery dots
  const cards = [...document.querySelectorAll('.module-card')];
  $('galleryDots').innerHTML = cards.map(() => '<i></i>').join('');
  const dots = [...$('galleryDots').children];

  const steps = [...document.querySelectorAll('.step')];

  // Stagger the compare demo cells
  [...$('cmpDemo').children].forEach((c, i) => c.style.setProperty('--ci', i));
  new IntersectionObserver(([e], obs) => {
    if (e.isIntersecting) { $('cmpDemo').classList.add('in'); obs.disconnect(); }
  }, { threshold: 0.3 }).observe($('cmpDemo'));

  if (reduced) {
    statementWords.forEach((w) => w.classList.add('lit'));
    steps.forEach((s) => s.classList.add('on'));
    $('steps').style.setProperty('--p', 1);
    return;
  }

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  // 0 when the section's top hits the viewport top, 1 when its bottom hits the viewport bottom
  const stickyProgress = (el) => {
    const r = el.getBoundingClientRect();
    return clamp(-r.top / (r.height - innerHeight));
  };

  const nav = $('nav'), bar = $('progressBar'), device = $('device');
  const statement = document.querySelector('.l-statement');
  const gallery = document.querySelector('.l-gallery');
  const track = $('galleryTrack');
  const stepsEl = $('steps');
  const narrow = matchMedia('(max-width: 833px)');

  function frame() {
    const doc = document.documentElement;
    const y = scrollY;
    bar.style.transform = `scaleX(${clamp(y / (doc.scrollHeight - innerHeight))})`;
    nav.classList.toggle('scrolled', y > 10);

    // Device: tilts flat and grows as it rises into view
    const dr = device.getBoundingClientRect();
    const dp = clamp(1 - (dr.top - 80) / (innerHeight * 0.75));
    device.style.transform = `rotateX(${(1 - dp) * 14}deg) scale(${0.92 + dp * 0.08}) translateY(${(1 - dp) * 30}px)`;

    // Statement: words light up in reading order
    const sp = stickyProgress(statement);
    const lit = Math.round(sp * 1.15 * statementWords.length);
    statementWords.forEach((w, i) => w.classList.toggle('lit', i < lit));

    // Gallery: vertical scroll drives horizontal travel
    if (!narrow.matches) {
      const gp = stickyProgress(gallery);
      const max = track.scrollWidth - innerWidth;
      track.style.transform = `translate3d(${-gp * Math.max(0, max)}px, 0, 0)`;
      const active = Math.min(cards.length - 1, Math.round(gp * (cards.length - 1)));
      dots.forEach((d, i) => d.classList.toggle('on', i === active));
    }

    // Steps: progress line fills as the section crosses the viewport
    const sr = stepsEl.getBoundingClientRect();
    const p = clamp((innerHeight * 0.8 - sr.top) / (innerHeight * 0.6));
    stepsEl.style.setProperty('--p', p.toFixed(3));
    steps.forEach((s, i) => s.classList.toggle('on', p >= i / (steps.length - 1) - 0.001));
  }

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; frame(); });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  frame();
})();
