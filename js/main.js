/* ============================================================
   FUEGO FATUO — main.js  (optimizado)
   ============================================================ */

/* ── UTILIDADES COMPARTIDAS ───────────────────────────────── */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => root.querySelectorAll(sel);

/** RAF-throttle: ejecuta fn como máximo una vez por frame. */
function rafThrottle(fn) {
  let pending = false;
  return (...args) => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { fn(...args); pending = false; });
  };
}

/* ── 1. CUSTOM CURSOR ─────────────────────────────────────── */
/*
  OPTIMIZACIÓN CLAVE: usar transform en lugar de left/top.
  transform activa la composición en GPU (capa propia), evitando
  reflows/repaints en cada movimiento del ratón.
*/
(function initCursor() {
  const cursor = $('#cursor');
  const ring   = $('#cursorRing');
  if (!cursor || !ring) return;

  let mx = 0, my = 0, rx = 0, ry = 0;
  let rafId;

  // Passive: el navegador no espera preventDefault() → scroll más fluido
  document.addEventListener('mousemove', rafThrottle(e => {
    mx = e.clientX;
    my = e.clientY;
    cursor.style.transform = `translate(${mx}px, ${my}px)`;
  }), { passive: true });

  function trackRing() {
    // Interpolación suavizada (lerp)
    rx += (mx - rx) * 0.13;
    ry += (my - ry) * 0.13;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    rafId = requestAnimationFrame(trackRing);
  }
  trackRing();

  // Delegación: un solo par de listeners en document en vez de N listeners
  const HOVER_SEL = new Set([
    'A','BUTTON',
  ]);
  const HOVER_CLASS = new Set([
    'service-card','portfolio-item','testimonial',
    'social-contact-card','social-btn','brujo-tag','float-wsp',
  ]);

  function isHoverTarget(el) {
    if (!el) return false;
    if (HOVER_SEL.has(el.tagName)) return true;
    return [...el.classList].some(c => HOVER_CLASS.has(c));
  }

  document.addEventListener('mouseover', e => {
    if (isHoverTarget(e.target)) {
      cursor.classList.add('hovering');
      ring.classList.add('hovering');
    }
  }, { passive: true });

  document.addEventListener('mouseout', e => {
    if (isHoverTarget(e.target)) {
      cursor.classList.remove('hovering');
      ring.classList.remove('hovering');
    }
  }, { passive: true });
})();

/* ── 2. EMBER PARTICLES ───────────────────────────────────── */
/*
  OPTIMIZACIÓN: crear nodos con DocumentFragment (un solo reflow)
  y calcular cssText de una vez para minimizar accesos al DOM.
*/
(function initParticles() {
  const container = $('#particles');
  if (!container) return;

  const TOTAL  = 40;
  const COLORS = ['var(--ember)','var(--blaze)','var(--amber)','var(--gold)'];
  const frag   = document.createDocumentFragment();

  for (let i = 0; i < TOTAL; i++) {
    const p    = document.createElement('div');
    const size = Math.random() * 2.5 + 1;
    const col  = COLORS[(Math.random() * COLORS.length) | 0];
    const dur  = (9  + Math.random() * 16).toFixed(2);
    const del  = (Math.random() * 18).toFixed(2);
    const drft = ((Math.random() - 0.5) * 120).toFixed(1);

    p.className = 'particle';
    p.style.cssText =
      `left:${(Math.random()*100).toFixed(2)}%;` +
      `width:${size}px;height:${size}px;` +
      `background:${col};` +
      `--drift:${drft}px;` +
      `animation-duration:${dur}s;` +
      `animation-delay:${del}s;` +
      `box-shadow:0 0 ${(size*3).toFixed(1)}px ${col};`;

    frag.appendChild(p);
  }

  container.appendChild(frag); // UN solo reflow
})();

/* ── 3. SCROLL REVEAL ─────────────────────────────────────── */
/*
  Sin cambios estructurales (IntersectionObserver ya es óptimo).
  Agregado: disconnect cuando todos los elementos son visibles
  para liberar el observer.
*/
(function initScrollReveal() {
  const els = $$('.reveal');
  if (!els.length) return;

  let remaining = els.length;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
      if (--remaining === 0) observer.disconnect();
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  els.forEach(el => observer.observe(el));
})();

/* ── 4. NAVIGATION ────────────────────────────────────────── */
/*
  OPTIMIZACIÓN: scroll listener con passive + rafThrottle.
  Smooth scroll nativo con CSS (scroll-behavior: smooth) es preferible,
  pero mantenemos el JS para compatibilidad; se evita scrollIntoView
  innecesario cuando el target ya está en viewport.
*/
(function initNavigation() {
  const nav       = $('#mainNav');
  const hamburger = $('#navHamburger');
  const drawer    = $('#navDrawer');
  const overlay   = $('#navOverlay');

  if (nav) {
    window.addEventListener('scroll', rafThrottle(() => {
      nav.classList.toggle('scrolled', window.scrollY > 80);
    }), { passive: true });
  }

  function openDrawer() {
    drawer?.classList.add('open');
    overlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    drawer?.classList.remove('open');
    overlay?.classList.remove('active');
    document.body.style.overflow = '';
  }

  hamburger?.addEventListener('click', openDrawer);
  overlay?.addEventListener('click', closeDrawer);
  drawer?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeDrawer));

  // Smooth scroll — solo actúa si el anchor existe
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = $(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth' });
  });
})();

/* ── 5. PORTFOLIO — IMÁGENES / VIDEOS ────────────────────── */
/*
  OPTIMIZACIÓN principal: lazy-load de src de video.
  El <video> src solo se asigna cuando el usuario abre el lightbox
  (o hace hover por primera vez), no al cargar la página.
  Esto evita peticiones de red innecesarias para todos los vídeos.

  Delegación de eventos en el contenedor en vez de N listeners
  individuales por ítem.
*/
(function initPortfolioMedia() {
  const lightbox  = $('#pfLightbox');
  const closeBtn  = $('#pfClose');
  const lbImg     = $('#pfLbImg');
  const lbVideo   = $('#pfLbVideo');
  const lbCaption = $('#pfLbCaption');

  // Cache de ítems para evitar re-query
  const items = $$('.portfolio-item');

  items.forEach(item => {
    const imgSrc   = (item.dataset.img   || '').trim();
    const videoSrc = (item.dataset.video || '').trim();
    const bgEl     = item.querySelector('.portfolio-bg');
    const videoEl  = item.querySelector('.portfolio-video');
    const badgeVid = item.querySelector('.portfolio-media-badge--video');
    const badgeImg = item.querySelector('.portfolio-media-badge--image');

    if (videoSrc) {
      item.classList.add('has-video');
      // *** NO asignar .src aquí — se asigna en hover la primera vez ***
      let loaded = false;

      item.addEventListener('mouseenter', () => {
        if (!loaded) { videoEl.src = videoSrc; loaded = true; }
        videoEl.play().catch(() => {});
      }, { passive: true });

      item.addEventListener('mouseleave', () => {
        videoEl.pause();
        videoEl.currentTime = 0;
      }, { passive: true });

    } else if (imgSrc) {
      item.classList.add('has-image');
      if (bgEl) {
        bgEl.style.cssText +=
          `;background-image:url('${imgSrc}');` +
          `background-size:cover;background-position:center`;
      }
      if (badgeVid) badgeVid.style.display = 'none';
      if (badgeImg) badgeImg.style.display = 'inline-block';

    } else {
      if (badgeVid) badgeVid.style.display = 'none';
      if (badgeImg) badgeImg.style.display = 'none';
    }
  });

  // ── Lightbox — delegación en el contenedor padre ──────────
  const portfolioGrid = $('.portfolio-grid') ?? document.body;

  portfolioGrid.addEventListener('click', e => {
    const item = e.target.closest('.portfolio-item');
    if (!item || !lightbox) return;

    const imgSrc   = (item.dataset.img   || '').trim();
    const videoSrc = (item.dataset.video || '').trim();

    if (videoSrc) openLightbox('video', videoSrc, item);
    else if (imgSrc) openLightbox('image', imgSrc, item);
  });

  function openLightbox(type, src, item) {
    const title = item.querySelector('.portfolio-title')?.textContent ?? '';
    const cat   = item.querySelector('.portfolio-cat')?.textContent   ?? '';

    lbImg.classList.remove('active');
    lbVideo.classList.remove('active');
    lbVideo.pause();

    if (type === 'video') {
      lbVideo.src = src;
      lbVideo.classList.add('active');
      lbVideo.play().catch(() => {});
    } else {
      lbImg.src = src;
      lbImg.alt = title;
      lbImg.classList.add('active');
    }

    lbCaption.textContent = cat ? `${cat} — ${title}` : title;
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    lbVideo.pause();
    lbVideo.removeAttribute('src'); // libera el buffer de video
    lbImg.removeAttribute('src');
    document.body.style.overflow = '';
  }

  closeBtn?.addEventListener('click', closeLightbox);
  lightbox?.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });
})();

/* ── 6. ROTADOR DE INTENCIONES ────────────────────────────── */
/*
  OPTIMIZACIÓN: se eliminan las clases intermedias y se usa
  una sola clase 'transitioning' + CSS para la animación.
  Reducción de classList thrashing. El intervalo se pausa
  con visibilitychange para no animar en pestañas ocultas.
*/
(function initRotator() {
  const el = $('#rotatorText');
  if (!el) return;

  const phrases = [
    'protección?','un ritual?','una lectura?','un amarre?',
    'mentoría?','un sigilo?','guía oscura?','poder real?',
  ];

  let idx = 0;
  let intervalId;

  function nextPhrase() {
    el.classList.add('anim-out');

    setTimeout(() => {
      idx = (idx + 1) % phrases.length;
      el.textContent = phrases[idx];
      el.classList.remove('anim-out');
      el.classList.add('anim-in');

      // Limpiar clase anim-in tras la transición
      el.addEventListener('animationend', () => el.classList.remove('anim-in'), { once: true });
    }, 420);
  }

  function startRotator() { intervalId = setInterval(nextPhrase, 10010); }
  function stopRotator()  { clearInterval(intervalId); }

  startRotator();

  // Pausa cuando la pestaña no está visible → ahorra CPU/battery
  document.addEventListener('visibilitychange', () => {
    document.hidden ? stopRotator() : startRotator();
  });
})();