/* ============================================================
   FUEGO FATUO — main.js
   Módulos: cursor, partículas, scroll reveal, navegación, rotador
   ============================================================ */

/* ── 1. CUSTOM CURSOR ─────────────────────────────────────── */
(function initCursor() {
  const cursor = document.getElementById('cursor');
  const ring   = document.getElementById('cursorRing');
  if (!cursor || !ring) return;

  let mx = 0, my = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cursor.style.left = mx + 'px';
    cursor.style.top  = my + 'px';
  });

  function trackRing() {
    rx += (mx - rx) * 0.13;
    ry += (my - ry) * 0.13;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(trackRing);
  }
  trackRing();

  const hoverTargets = 'a, button, .service-card, .portfolio-item, .testimonial, .social-contact-card, .social-btn, .brujo-tag, .float-wsp';
  document.querySelectorAll(hoverTargets).forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('hovering');
      ring.classList.add('hovering');
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('hovering');
      ring.classList.remove('hovering');
    });
  });
})();

/* ── 2. EMBER PARTICLES ───────────────────────────────────── */
(function initParticles() {
  const container = document.getElementById('particles');
  if (!container) return;

  const TOTAL = 40;
  const COLORS = ['var(--ember)', 'var(--blaze)', 'var(--amber)', 'var(--gold)'];

  for (let i = 0; i < TOTAL; i++) {
    const p    = document.createElement('div');
    const size = Math.random() * 2.5 + 1;
    const col  = COLORS[Math.floor(Math.random() * COLORS.length)];

    p.classList.add('particle');
    p.style.cssText = `
      left:              ${Math.random() * 100}%;
      width:             ${size}px;
      height:            ${size}px;
      background:        ${col};
      --drift:           ${(Math.random() - 0.5) * 120}px;
      animation-duration:${9 + Math.random() * 16}s;
      animation-delay:   ${Math.random() * 18}s;
      box-shadow:        0 0 ${size * 3}px ${col};
    `;
    container.appendChild(p);
  }
})();

/* ── 3. SCROLL REVEAL ─────────────────────────────────────── */
(function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  els.forEach(el => observer.observe(el));
})();

/* ── 4. NAVIGATION ────────────────────────────────────────── */
(function initNavigation() {
  const nav       = document.getElementById('mainNav');
  const hamburger = document.getElementById('navHamburger');
  const drawer    = document.getElementById('navDrawer');
  const overlay   = document.getElementById('navOverlay');

  // Scroll state
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 80);
    });
  }

  // Mobile drawer
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

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });
})();

/* ── 5. PORTFOLIO — IMÁGENES / VIDEOS ────────────────────── */
(function initPortfolioMedia() {

  const lightbox  = document.getElementById('pfLightbox');
  const closeBtn  = document.getElementById('pfClose');
  const lbImg     = document.getElementById('pfLbImg');
  const lbVideo   = document.getElementById('pfLbVideo');
  const lbCaption = document.getElementById('pfLbCaption');

  /* ── Inicializar cada ítem ─────────────────────────────── */
  document.querySelectorAll('.portfolio-item').forEach(item => {
    const imgSrc   = (item.dataset.img   || '').trim();
    const videoSrc = (item.dataset.video || '').trim();
    const bgEl     = item.querySelector('.portfolio-bg');
    const videoEl  = item.querySelector('.portfolio-video');
    const badgeVid = item.querySelector('.portfolio-media-badge--video');
    const badgeImg = item.querySelector('.portfolio-media-badge--image');

    if (videoSrc) {
      /* ── VIDEO ── reproducir en hover, mostrar badge */
      item.classList.add('has-video');
      videoEl.src = videoSrc;

      item.addEventListener('mouseenter', () => videoEl.play().catch(() => {}));
      item.addEventListener('mouseleave', () => { videoEl.pause(); videoEl.currentTime = 0; });

      /* Clic → lightbox con video */
      item.addEventListener('click', () => openLightbox('video', videoSrc, item));

    } else if (imgSrc) {
      /* ── IMAGEN ── aplicar como background del .portfolio-bg */
      item.classList.add('has-image');
      if (bgEl) {
        bgEl.style.backgroundImage    = `url('${imgSrc}')`;
        bgEl.style.backgroundSize     = 'cover';
        bgEl.style.backgroundPosition = 'center';
      }

      /* Ocultar badge de video, mostrar el de imagen si existe */
      if (badgeVid) badgeVid.style.display = 'none';
      if (badgeImg) badgeImg.style.display = 'inline-block';

      /* Clic → lightbox con imagen */
      item.addEventListener('click', () => openLightbox('image', imgSrc, item));

    } else {
      /* Sin media: ocultar ambos badges */
      if (badgeVid) badgeVid.style.display = 'none';
      if (badgeImg) badgeImg.style.display = 'none';
    }
  });

  /* ── Lightbox helpers ──────────────────────────────────── */
  function openLightbox(type, src, item) {
    const title = item.querySelector('.portfolio-title')?.textContent || '';
    const cat   = item.querySelector('.portfolio-cat')?.textContent   || '';

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
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    lbVideo.pause();
    lbVideo.src = '';
    lbImg.src   = '';
    document.body.style.overflow = '';
  }

  closeBtn?.addEventListener('click', closeLightbox);
  lightbox?.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

})();

/* ── 6. ROTADOR DE INTENCIONES (Sección Contacto) ────────── */
(function initRotator() {
  const el = document.getElementById('rotatorText');
  if (!el) return;

  const phrases = [
    'protección?',
    'un ritual?',
    'una lectura?',
    'un amarre?',
    'mentoría?',
    'un sigilo?',
    'guía oscura?',
    'poder real?',
  ];

  let idx = 0;

  function nextPhrase() {
    // Salida
    el.classList.remove('anim-in');
    el.classList.add('anim-out');

    setTimeout(() => {
      idx = (idx + 1) % phrases.length;
      el.textContent = phrases[idx];
      el.classList.remove('anim-out');
      el.classList.add('anim-in');
    }, 420);
  }

  setInterval(nextPhrase, 10010);
})();