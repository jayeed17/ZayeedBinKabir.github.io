(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* reveal on scroll, staggered per group */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      e.target.querySelectorAll?.('.count').forEach(countUp);
      if (e.target.matches('.count')) countUp(e.target);
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach((el) => {
    const sibs = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
    el.style.setProperty('--d', `${Math.min(sibs.indexOf(el), 6) * 0.07}s`);
    io.observe(el);
  });

  /* number counters */
  function countUp(el) {
    if (el.dataset.done) return;
    el.dataset.done = 1;
    const to = parseFloat(el.dataset.to);
    const dec = +(el.dataset.dec || 0);
    if (reduce) return;
    const t0 = performance.now();
    const dur = 1400;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const v = to * (1 - Math.pow(1 - k, 3));
      el.textContent = v.toFixed(dec);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* typed role line */
  const typed = document.querySelector('.typed');
  if (typed && !reduce) {
    const words = typed.dataset.words.split('|');
    let w = 0, i = words[0].length, del = true;
    const step = () => {
      const word = words[w];
      i += del ? -1 : 1;
      typed.textContent = word.slice(0, i);
      let wait = del ? 28 : 55;
      if (!del && i === word.length) { del = true; wait = 2200; }
      else if (del && i === 0) { del = false; w = (w + 1) % words.length; wait = 300; }
      setTimeout(step, wait);
    };
    setTimeout(step, 2600);
  }

  /* scroll progress, nav hide/show, active link */
  const nav = document.querySelector('.nav');
  const links = [...document.querySelectorAll('.nav ul a')].filter((a) => a.getAttribute('href').startsWith('#'));
  const sections = links.map((a) => document.querySelector(a.getAttribute('href')));
  const bar = document.querySelector('.progress');
  let lastY = 0;
  const onScroll = () => {
    const y = scrollY;
    const max = root.scrollHeight - innerHeight;
    root.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
    if (bar) bar.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
    if (nav) nav.classList.toggle('hide', y > lastY && y > 400);
    lastY = y;
    let current = -1;
    sections.forEach((s, idx) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.4) current = idx; });
    links.forEach((a, idx) => a.classList.toggle('on', idx === current));
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* cursor spotlight */
  if (finePointer && !reduce) {
    const spot = document.querySelector('.spotlight');
    addEventListener('pointermove', (e) => {
      spot.style.setProperty('--mx', `${e.clientX}px`);
      spot.style.setProperty('--my', `${e.clientY}px`);
    }, { passive: true });
  }

  /* 3D tilt + inner light */
  if (finePointer && !reduce) {
    document.querySelectorAll('.tilt').forEach((el) => {
      const max = el.classList.contains('portrait') ? 8 : 5;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.style.transform = `rotateX(${(0.5 - y) * max}deg) rotateY(${(x - 0.5) * max}deg) translateZ(0)`;
        el.style.setProperty('--lx', `${x * 100}%`);
        el.style.setProperty('--ly', `${y * 100}%`);
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    /* magnetic buttons */
    document.querySelectorAll('.magnetic').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  /* project filters */
  const chips = document.querySelectorAll('.chip');
  const cards = document.querySelectorAll('.bento .card');
  chips.forEach((chip) => chip.addEventListener('click', () => {
    const f = chip.dataset.filter;
    chips.forEach((c) => { c.classList.toggle('active', c === chip); c.setAttribute('aria-pressed', c === chip); });
    cards.forEach((card) => {
      const show = f === 'all' || card.dataset.cat === f;
      card.classList.toggle('hidden', !show);
      ['span-2', 'span-3'].forEach((k) => card.classList.toggle(k, f === 'all' && card.dataset.span === k));
      if (show) card.classList.add('in');
    });
  }));
  cards.forEach((c) => { c.dataset.span = c.classList.contains('span-3') ? 'span-3' : c.classList.contains('span-2') ? 'span-2' : ''; });

  /* copy email */
  document.querySelectorAll('.copy').forEach((btn) => btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      btn.classList.add('copied');
      setTimeout(() => btn.classList.remove('copied'), 1800);
    } catch { location.href = `mailto:${btn.dataset.copy}`; }
  }));

  /* lightbox for trip photos */
  const box = document.querySelector('.lightbox');
  if (box) {
    document.body.appendChild(box);
    const img = box.querySelector('img');
    const cap = box.querySelector('figcaption');
    const shots = [...document.querySelectorAll('.gallery a')];
    let at = 0;
    const show = (i) => {
      at = (i + shots.length) % shots.length;
      img.src = shots[at].href;
      img.alt = shots[at].querySelector('img').alt;
      cap.textContent = shots[at].dataset.caption || '';
      box.hidden = false;
      document.body.style.overflow = 'hidden';
    };
    const close = () => { box.hidden = true; document.body.style.overflow = ''; };
    shots.forEach((a, i) => a.addEventListener('click', (e) => { e.preventDefault(); show(i); }));
    box.querySelector('.lb-close').addEventListener('click', close);
    box.querySelector('.lb-prev').addEventListener('click', () => show(at - 1));
    box.querySelector('.lb-next').addEventListener('click', () => show(at + 1));
    box.addEventListener('click', (e) => { if (e.target === box) close(); });
    addEventListener('keydown', (e) => {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(at - 1);
      if (e.key === 'ArrowRight') show(at + 1);
    });
  }

  /* NYC clock */
  const clock = document.querySelector('.clock');
  const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });
  const tickClock = () => { if (clock) clock.textContent = fmt.format(new Date()); };
  tickClock();
  setInterval(tickClock, 30000);
})();
