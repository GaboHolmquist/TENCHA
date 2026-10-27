// Carta digital Tencha Matcheria
// Fotos y GIFs: productos/<categoria>/<producto>/foto.jpg y animacion.gif (o animacion.mp4)

const state = { cats: [], items: [], current: -1, list: [] };
const $ = (id) => document.getElementById(id);
const fmt = (n) => '$' + n.toLocaleString('es-CL');

// Bloque de nombre estilo post: Español grande / subtítulo / kanji
const nameBlock = (es, sub, jp) =>
  `<div class="name-es">${es}</div>${sub ? `<div class="name-sub">${sub}</div>` : ''}${jp ? `<div class="name-jp jp">${jp}</div>` : ''}`;

// Normaliza texto (sin tildes ni mayúsculas) para comparar nombres
const norm = (s = '') => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Caché en memoria de imágenes y del video de recomendado 1 para que se abra de forma inmediata
const imgCache = new Map();
const videoCache = new Map();

function preloadVideo(url) {
  if (videoCache.has(url)) return;
  const v = document.createElement('video');
  Object.assign(v, {
    autoplay: true,
    loop: true,
    muted: true,
    playsInline: true,
    preload: 'auto',
    className: 'media-fill'
  });
  v.setAttribute('muted', '');
  v.setAttribute('playsinline', '');
  v.src = url;
  v.load();
  videoCache.set(url, v);
}

function preloadItemMedia(item) {
  if (!item) return;
  const bases = [item.base, item.fallbackBase].filter(Boolean);
  bases.forEach((b) => {
    const url = b + 'foto.webp';
    if (!imgCache.has(url)) {
      const im = new Image();
      im.decoding = 'async';
      im.src = url;
      imgCache.set(url, im);
    }
  });
}

// Carga una imagen (prioriza WebP ultraligero y cae a JPG o a la foto del producto del menú)
function mediaImg(src, item, alt, highPriority = false) {
  const ph = `<div class="ph"><span>抹</span></div>`;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'width:100%;height:100%';
  const bases = [item.base, item.fallbackBase].filter(Boolean);
  const candidates = [];
  bases.forEach((b) => {
    candidates.push(b + 'foto.webp');
    candidates.push(b + 'foto.jpg');
  });
  const img = new Image();
  img.className = 'media-fill';
  img.draggable = false;
  img.alt = alt || item.nombre;
  img.decoding = 'async';
  img.loading = 'eager';
  if (highPriority) img.fetchPriority = 'high';

  // Si ya está en caché y cargada, la inserta directo sin pasar por el placeholder del kanji
  const cached = candidates.map((u) => imgCache.get(u)).find((im) => im && im.complete && im.naturalWidth > 0);
  if (cached) {
    img.src = cached.src;
    wrap.appendChild(img);
    return wrap;
  }

  wrap.innerHTML = ph;
  let idx = 0;
  img.onload = () => {
    imgCache.set(img.src, img);
    wrap.innerHTML = '';
    wrap.appendChild(img);
  };
  img.onerror = () => {
    idx += 1;
    if (idx < candidates.length) img.src = candidates[idx];
  };
  if (candidates.length) img.src = candidates[0];
  return wrap;
}

// ---------- Carrusel (productos/recomendados/1, 2, 3) ----------
async function loadRecomendados() {
  const list = [];
  for (const n of [1, 2, 3]) {
    const base = `productos/recomendados/${n}/`;
    try {
      const res = await fetch(base + 'info.txt', { cache: 'no-store' });
      if (!res.ok) continue;
      const raw = (await res.text()).trim();
      if (!raw) continue;
      const info = {};
      raw.split(/\r?\n/).forEach((line) => {
        const i = line.indexOf('=');
        if (i > 0) info[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
      });
      // Permite escribir solo el nombre del producto o "nombre=..."
      const query = info.nombre || raw.split(/\r?\n/)[0].trim();
      if (!query) continue;
      const target = norm(query);
      const match = state.items.find((it) => norm(it.nombre) === target || norm(it.carpeta.replace(/^\d+-/, '').replace(/-/g, ' ')) === target);
      if (match) {
        list.push({
          ...match,
          nombre: info.nombre || match.nombre,
          precio: info.precio ? parseInt(info.precio.replace(/\D/g, ''), 10) : match.precio,
          descripcion: info.descripcion || match.descripcion,
          base,
          fallbackBase: match.base
        });
      } else {
        list.push({
          nombre: query,
          precio: parseInt((info.precio || '0').replace(/\D/g, ''), 10),
          descripcion: info.descripcion || '',
          tags: [],
          base
        });
      }
    } catch (e) { /* carpeta vacía */ }
  }
  return list;
}

function renderCarousel(list) {
  const car = $('carousel'), dots = $('carouselDots');
  // Precarga en memoria únicamente el video del recomendado 1 para que al abrir el globo aparezca directo el video sin pasar por la imagen
  if (list[0]) {
    list[0].hasVideo = true;
    preloadVideo(list[0].base + 'animacion.mp4');
  }
  list.forEach((item, idx) => {
    const s = document.createElement('div');
    s.className = 'slide';
    s.appendChild(mediaImg(item.base + 'foto.webp', item, item.nombre, idx === 0));
    s.insertAdjacentHTML('beforeend', `<div class="overlay-top">${nameBlock(item.nombre)}</div><div class="overlay-price">${fmt(item.precio)}</div>`);
    s.onclick = () => openItem(idx, list);
    car.appendChild(s);
    const d = document.createElement('button');
    d.className = 'dot' + (idx === 0 ? ' active' : '');
    d.setAttribute('aria-label', 'Destacado ' + (idx + 1));
    d.onclick = () => car.scrollTo({ left: car.clientWidth * idx, behavior: 'smooth' });
    dots.appendChild(d);
  });
  const update = () => {
    const i = Math.round(car.scrollLeft / car.clientWidth);
    [...dots.children].forEach((d, k) => d.classList.toggle('active', k === i));
  };
  car.addEventListener('scroll', () => requestAnimationFrame(update));
  let paused = false;
  car.addEventListener('pointerdown', () => (paused = true));
  setInterval(() => {
    if (paused || document.hidden || !list.length) return;
    const i = (Math.round(car.scrollLeft / car.clientWidth) + 1) % list.length;
    car.scrollTo({ left: car.clientWidth * i, behavior: 'smooth' });
  }, 4500);
}

// ---------- Categorías (tiritas horizontales 21:9 con texto a la izquierda e imagen a la derecha) ----------
function renderCategories() {
  const grid = $('catGrid');
  state.cats.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'cat-card glass';
    b.id = 'cat-' + c.id;

    // Fondo de imagen del lado derecho: busca primero en categorias/<carpeta>/foto.webp o .jpg y cae al primer producto de la categoría
    const mediaWrap = document.createElement('div');
    mediaWrap.className = 'cat-media';
    const firstItem = c.items[0];
    const catBase = `categorias/${c.carpeta}/`;
    const candidates = [catBase + 'foto.webp', catBase + 'foto.jpg'];
    if (firstItem) {
      candidates.push(firstItem.base + 'foto.webp', firstItem.base + 'foto.jpg');
    }
    const img = new Image();
    img.className = 'media-fill';
    img.alt = c.nombre;
    img.decoding = 'async';
    img.loading = 'eager';
    let idx = 0;
    img.onload = () => mediaWrap.appendChild(img);
    img.onerror = () => {
      idx += 1;
      if (idx < candidates.length) img.src = candidates[idx];
    };
    img.src = candidates[0];

    b.appendChild(mediaWrap);
    b.insertAdjacentHTML('beforeend', `<div class="cat-info">${nameBlock(c.nombre, '', c.jp)}<div class="name-sub">${c.items.length} productos</div></div>`);
    b.onclick = () => goToCategory(c.id);
    grid.appendChild(b);
  });
}

function goToCategory(id) {
  const list = $('menuList');
  if (list.hidden) {
    list.hidden = false;
    // Muestra de inmediato todas las tarjetas para que las imágenes ya precargadas se vean al instante
    document.querySelectorAll('.item-card').forEach((c) => c.classList.add('visible'));
  }
  requestAnimationFrame(() => $('sec-' + id).scrollIntoView({ behavior: 'smooth', block: 'start' }));
  history.replaceState(null, '', '#' + id);
}

// ---------- Lista completa ----------
function renderMenu() {
  const bar = $('catBar'), wrap = $('menuSections');
  state.cats.forEach((c) => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.dataset.cat = c.id;
    chip.textContent = c.nombre;
    chip.onclick = () => goToCategory(c.id);
    bar.appendChild(chip);

    const sec = document.createElement('section');
    sec.className = 'menu-cat';
    sec.id = 'sec-' + c.id;
    sec.innerHTML = `<h2 class="menu-cat-head">${nameBlock(c.nombre, '', c.jp)}</h2>${c.intro ? `<p class="intro">${c.intro}</p>` : ''}<div class="item-grid"></div>`;
    const g = sec.querySelector('.item-grid');
    c.items.forEach((item) => {
      const card = document.createElement('button');
      card.className = 'item-card glass';
      card.id = 'item-' + c.id + '-' + item.carpeta;
      const icons = (item.tags || []).map((t) => (t === 'frio' ? '❄' : t === 'caliente' ? '🔥' : '')).filter(Boolean).join(' ');
      card.appendChild(mediaImg(item.base + 'foto.jpg', item));
      card.insertAdjacentHTML('beforeend', `<div class="overlay-top">${nameBlock(item.nombre, item.sub, item.jp)}</div><div class="overlay-price">${fmt(item.precio)}</div>${icons ? `<div class="overlay-icons">${icons}</div>` : ''}`);
      card.onclick = () => openItem(state.items.indexOf(item));
      g.appendChild(card);
    });
    wrap.appendChild(sec);
  });

  // Resalta el chip de la categoría visible
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const id = e.target.id.replace('sec-', '');
      document.querySelectorAll('.chip').forEach((ch) => {
        const on = ch.dataset.cat === id;
        ch.classList.toggle('active', on);
        if (on) ch.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      });
    });
  }, { rootMargin: '-140px 0px -60% 0px' });
  document.querySelectorAll('.menu-cat').forEach((s) => io.observe(s));
}

function initReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('.item-card').forEach((c) => io.observe(c));
}

// ---------- Popup ----------
function buildSlideMedia(item) {
  const slide = document.createElement('div');
  slide.className = 'popup-slide';
  const bases = [item.base, item.fallbackBase].filter(Boolean);

  // Si es el recomendado 1 con video precargado, inserta directamente el video sin mostrar antes la foto
  if (item.hasVideo) {
    const videoUrl = item.base + 'animacion.mp4';
    const cachedVideo = videoCache.get(videoUrl);
    if (cachedVideo) {
      cachedVideo.currentTime = 0;
      slide.appendChild(cachedVideo);
      cachedVideo.play().catch(() => {});
      return slide;
    }
  }

  slide.appendChild(mediaImg(bases[0] + 'foto.webp', item, item.nombre, true));
  return slide;
}

function fillPopupCard(card, item) {
  const mediaBox = card.querySelector('.popup-media');
  mediaBox.replaceChildren(buildSlideMedia(item));
  const tagNames = { frio: '❄ Frío', caliente: '🔥 Caliente' };
  card.querySelector('.popup-tags').innerHTML = (item.tags || []).map((t) => `<span class="tag">${tagNames[t] || t}</span>`).join('');
  card.querySelector('.popup-head').innerHTML = nameBlock(item.nombre, item.sub, item.jp);
  const desc = card.querySelector('.popup-desc'), more = card.querySelector('.popup-more'), body = card.querySelector('.popup-body');
  desc.textContent = item.descripcion || '';
  desc.classList.remove('open');
  body.scrollTop = 0;
  more.textContent = 'Leer más';
  more.onclick = () => {
    const open = desc.classList.toggle('open');
    more.textContent = open ? 'Leer menos' : 'Leer más';
  };
  requestAnimationFrame(() => { more.hidden = desc.scrollHeight <= desc.clientHeight + 1; });
  card.querySelector('.popup-variants').innerHTML = '';
  const v = item.variantes || [];
  card.querySelector('.popup-price').innerHTML = v.length
    ? `<small>Unidad <b>${fmt(item.precio)}</b></small>` + v.map((x) => `<small>${x.nombre} <b>${fmt(x.precio)}</b></small>`).join('')
    : fmt(item.precio);
}

function wirePopupCardButtons(card, dlg) {
  card.querySelector('.popup-close').onclick = () => dlg.close();
  const flash = (btn) => { btn.classList.remove('flash'); void btn.offsetWidth; btn.classList.add('flash'); };
  const [prevBtn, nextBtn] = card.querySelectorAll('.popup-nav button');
  prevBtn.onclick = (e) => { flash(e.currentTarget); navigate(-1); };
  nextBtn.onclick = (e) => { flash(e.currentTarget); navigate(1); };
}

function openItem(idx, list = state.items, dir = 0) {
  const item = list[idx];
  if (!item) return;
  state.current = idx;
  state.list = list;

  // Precarga inmediata del producto actual, el siguiente y el anterior (y 2 más adelante/atrás)
  const n = list.length;
  if (n > 0) {
    preloadItemMedia(item);
    preloadItemMedia(list[(idx + 1) % n]);
    preloadItemMedia(list[(idx - 1 + n) % n]);
    preloadItemMedia(list[(idx + 2) % n]);
    preloadItemMedia(list[(idx - 2 + n) % n]);
  }

  const dlg = $('productPopup');
  const currentCard = dlg.querySelector('.popup-card:not(.exiting)');

  if (dir !== 0 && currentCard && dlg.open) {
    const nextCard = currentCard.cloneNode(true);
    nextCard.id = '';
    fillPopupCard(nextCard, item);
    wirePopupCardButtons(nextCard, dlg);
    nextCard.classList.remove('exit-to-left', 'exit-to-right', 'enter-from-left', 'enter-from-right');
    nextCard.classList.add(dir > 0 ? 'enter-from-right' : 'enter-from-left');
    dlg.appendChild(nextCard);
    void nextCard.offsetWidth; // fuerza reflow
    currentCard.classList.add('exiting', dir > 0 ? 'exit-to-left' : 'exit-to-right');
    nextCard.classList.remove('enter-from-right', 'enter-from-left');
    setTimeout(() => { if (currentCard.parentNode === dlg) currentCard.remove(); }, 340);
  } else {
    fillPopupCard(currentCard, item);
    wirePopupCardButtons(currentCard, dlg);
  }

  if (!dlg.open) { dlg.showModal(); document.documentElement.classList.add('lock'); }
}

function navigate(step) {
  const n = state.list.length;
  openItem((state.current + step + n) % n, state.list, step);
}

function initPopup() {
  const dlg = $('productPopup');
  // Bloquea el scroll de la página detrás del popup
  dlg.addEventListener('close', () => document.documentElement.classList.remove('lock'));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  document.addEventListener('keydown', (e) => {
    if (!dlg.open) return;
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
  });
  let x0 = null, y0 = null;
  dlg.addEventListener('touchstart', (e) => {
    x0 = e.touches[0].clientX;
    y0 = e.touches[0].clientY;
  }, { passive: true });
  dlg.addEventListener('touchend', (e) => {
    if (x0 === null || y0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 55) {
      dlg.close();
    } else if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      navigate(dx < 0 ? 1 : -1);
    }
    x0 = null;
    y0 = null;
  });
}

// ---------- Init ----------
async function init() {
  const res = await fetch('data/menu.json');
  const data = await res.json();
  state.cats = data.categorias;
  state.cats.forEach((c) => c.items.forEach((item) => {
    item.key = c.id + '/' + item.carpeta;
    item.base = `productos/${c.carpeta}/${item.carpeta}/`;
    state.items.push(item);
    preloadItemMedia(item);
  }));
  renderCarousel(await loadRecomendados());
  renderCategories();
  renderMenu();
  initPopup();
  $('brandLink').onclick = (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const hash = location.hash.slice(1);
  if (hash && state.cats.some((c) => c.id === hash)) goToCategory(hash);
  initHeavyScroll();

  // Bloquea clic derecho / pulsación larga y arrastrar imágenes o videos
  document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('img, video, .slide, .cat-card, .item-card, .popup')) e.preventDefault();
  });
  document.addEventListener('dragstart', (e) => e.preventDefault());
}

// ---------- Scroll con 5% de fricción (sin rebotes) ----------
function initHeavyScroll() {
  const SPEED = 0.95;      // 5% de fricción al deslizar (95% de velocidad 1:1)
  const FRICTION = 0.95;   // 5% de desaceleración por cuadro al soltar
  let lastY = 0, lastT = 0, vel = 0, raf = 0, touching = false, horiz = null;
  const dlg = $('productPopup');

  const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  const glide = () => {
    if (touching || Math.abs(vel) < 0.25) { raf = 0; return; }
    window.scrollTo(0, Math.min(maxScroll(), Math.max(0, window.scrollY + vel)));
    vel *= FRICTION;
    raf = requestAnimationFrame(glide);
  };

  let xStart = 0, yStart = 0;
  window.addEventListener('touchstart', (e) => {
    if (dlg.open || e.touches.length !== 1) return;
    cancelAnimationFrame(raf);
    raf = 0;
    vel = 0;
    touching = true;
    horiz = null;
    xStart = e.touches[0].clientX;
    yStart = lastY = e.touches[0].clientY;
    lastT = performance.now();
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!touching || dlg.open || e.touches.length !== 1) return;
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    if (horiz === null && (Math.abs(x - xStart) > 6 || Math.abs(y - yStart) > 6)) {
      const inHScroll = e.target.closest('#carousel, #catBar');
      horiz = inHScroll && Math.abs(x - xStart) > Math.abs(y - yStart);
    }
    if (horiz) return;
    e.preventDefault();
    const now = performance.now();
    const dt = Math.max(8, now - lastT);
    const dy = (lastY - y) * SPEED;
    window.scrollTo(0, Math.min(maxScroll(), Math.max(0, window.scrollY + dy)));
    const instVel = (dy / dt) * 16.6;
    vel = vel * 0.3 + instVel * 0.7;
    lastY = y;
    lastT = now;
  }, { passive: false });

  const endTouch = () => {
    if (!touching) return;
    touching = false;
    if (!horiz && Math.abs(vel) >= 0.4) raf = requestAnimationFrame(glide);
  };
  window.addEventListener('touchend', endTouch, { passive: true });
  window.addEventListener('touchcancel', endTouch, { passive: true });
}

init();
