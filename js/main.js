// Carta digital Tencha Matcheria
// Fotos y GIFs: productos/<categoria>/<producto>/foto.jpg y animacion.gif (o animacion.mp4)

const state = { cats: [], items: [], current: -1, list: [] };
const $ = (id) => document.getElementById(id);
const fmt = (n) => '$' + Number(n || 0).toLocaleString('es-CL');
const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

// Bloque de nombre estilo post: Español grande / subtítulo / kanji
const nameBlock = (es, sub, jp) =>
  `<div class="name-es">${esc(es)}</div>${sub ? `<div class="name-sub">${esc(sub)}</div>` : ''}${jp ? `<div class="name-jp jp">${esc(jp)}</div>` : ''}`;

// Normaliza texto (sin tildes ni mayúsculas) para comparar nombres
const norm = (s = '') => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Caché en memoria de imágenes y videos de productos para reproducción instantánea
const imgCache = new Map();
const videoCache = new Map();

function createVideoElement(url) {
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
  return v;
}

function preloadVideo(url) {
  if (!url) return null;
  if (videoCache.has(url)) return videoCache.get(url);
  const v = createVideoElement(url);
  const entry = { url, video: v, ready: false, failed: false };
  const markReady = () => {
    entry.ready = true;
    entry.failed = false;
  };
  v.addEventListener('loadeddata', markReady);
  v.addEventListener('canplay', markReady);
  v.addEventListener('error', () => {
    entry.failed = true;
  });
  v.load();
  videoCache.set(url, entry);
  return entry;
}

function preloadItemMedia(item, includeVideo = false) {
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
  if (includeVideo && item.hasVideo && item.videoUrl) {
    preloadVideo(item.videoUrl);
  }
}

// Carga una imagen sin texto placeholder (prioriza WebP ultraligero y cae a JPG o a la foto del producto del menú)
function mediaImg(src, item, alt, highPriority = false) {
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
  img.alt = alt || item.nombre || '';
  img.decoding = 'async';
  img.loading = 'eager';
  if (highPriority) img.fetchPriority = 'high';

  const cached = candidates.map((u) => imgCache.get(u)).find((im) => im && im.complete && im.naturalWidth > 0);
  if (cached) {
    img.src = cached.src;
    wrap.appendChild(img);
    return wrap;
  }

  let idx = 0;
  img.onload = () => {
    imgCache.set(img.src, img);
  };
  img.onerror = () => {
    idx += 1;
    if (idx < candidates.length) img.src = candidates[idx];
  };
  if (candidates.length) img.src = candidates[0];
  wrap.appendChild(img);
  return wrap;
}

// ---------- Disponibilidad y Temperatura ----------
function isItemAvailable(item) {
  if (!item) return false;
  if (item.disponible === false) return false;
  if (typeof item.disponible === 'string') {
    const s = item.disponible.toLowerCase().trim();
    if (s === 'apagado' || s === 'off' || s === 'no' || s === 'falso' || s === 'false') return false;
  }
  return true;
}

function syncItemTags(item) {
  if (item.temperatura) {
    const t = String(item.temperatura).toLowerCase().trim();
    if (t === 'ambos' || t === 'ambas' || (t.includes('frio') && t.includes('caliente'))) item.tags = ['frio', 'caliente'];
    else if (t === 'frio' || t === 'frío') item.tags = ['frio'];
    else if (t === 'caliente') item.tags = ['caliente'];
    else if (t === 'ninguna' || t === 'ninguno' || t === '-') item.tags = [];
  }
}

// ---------- Carrusel (productos/recomendados o data/menu.json) ----------
function parseFolderMeta(rawCarpeta = '', catCarpeta = '') {
  let raw = String(rawCarpeta || '').trim();
  let forceVideo = null;
  if (raw.endsWith('#video')) {
    forceVideo = true;
    raw = raw.slice(0, -6);
  } else if (raw.endsWith('#novideo')) {
    forceVideo = false;
    raw = raw.slice(0, -8);
  }
  const isRemote = /^https?:\/\//i.test(raw);
  if (isRemote) {
    const base = raw.endsWith('/') ? raw : raw + '/';
    const parts = base.replace(/\/+$/, '').split('/');
    const slug = parts[parts.length - 1] || '';
    const fallbackBase = catCarpeta && slug ? `productos/${catCarpeta}/${slug}/` : undefined;
    return { base, fallbackBase, slug, forceVideo };
  }
  const clean = raw.replace(/^\/+|\/+$/g, '');
  if (clean.startsWith('productos/')) {
    const base = clean + '/';
    return { base, fallbackBase: undefined, slug: clean.split('/').pop() || clean, forceVideo };
  }
  const base = catCarpeta ? `productos/${catCarpeta}/${clean}/` : `${clean}/`;
  const fallbackBase = catCarpeta && clean
    ? `https://bkubdcfhgivgmckblsyt.supabase.co/storage/v1/object/public/media/productos/${catCarpeta}/${clean}/`
    : undefined;
  return { base, fallbackBase, slug: clean, forceVideo };
}

function resolveRecVideo(rec, base, match, forceVideo = null) {
  if (forceVideo === false) return { hasVideo: false, videoUrl: '' };
  if (forceVideo === true && base) return { hasVideo: true, videoUrl: base + 'animacion.mp4' };
  if (base && base.includes('recomendados/1')) {
    return { hasVideo: true, videoUrl: base + 'animacion.mp4' };
  }
  if (rec && rec.tiene_video && base && !base.includes('recomendados/')) {
    return { hasVideo: true, videoUrl: base + 'animacion.mp4' };
  }
  if (base && (base.includes('01-matcha-puro/') || base.includes('02-creaciones-de-matcha/'))) {
    return { hasVideo: true, videoUrl: base + 'animacion.mp4' };
  }
  if (match && match.hasVideo && match.videoUrl) {
    return { hasVideo: true, videoUrl: match.videoUrl };
  }
  if (rec && rec.tiene_video && base) {
    return { hasVideo: true, videoUrl: base + 'animacion.mp4' };
  }
  return { hasVideo: false, videoUrl: '' };
}

async function loadRecomendados(jsonRecomendados) {
  if (Array.isArray(jsonRecomendados) && jsonRecomendados.length > 0) {
    const list = [];
    jsonRecomendados.forEach((rec, idx) => {
      if (!isItemAvailable(rec)) return;
      syncItemTags(rec);
      const parsed = parseFolderMeta(rec.carpeta || `productos/recomendados/${idx + 1}`, '');
      const base = parsed.base;
      const target = norm(rec.nombre);
      const match = state.items.find((it) => norm(it.nombre) === target);
      const vInfo = resolveRecVideo(rec, base, match, parsed.forceVideo);
      list.push({
        ...rec,
        nombre: rec.nombre,
        precio: rec.precio,
        descripcion: rec.descripcion || '',
        tags: rec.tags || [],
        base,
        fallbackBase: match ? match.base : parsed.fallbackBase,
        hasVideo: vInfo.hasVideo,
        videoUrl: vInfo.videoUrl
      });
    });
    if (list.length > 0) return list;
  }

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
      const vInfo = resolveRecVideo(info, base, match);
      if (match) {
        list.push({
          ...match,
          nombre: info.nombre || match.nombre,
          precio: info.precio ? parseInt(info.precio.replace(/\D/g, ''), 10) : match.precio,
          descripcion: info.descripcion || match.descripcion,
          base,
          fallbackBase: match.base,
          hasVideo: vInfo.hasVideo,
          videoUrl: vInfo.videoUrl
        });
      } else {
        list.push({
          nombre: query,
          precio: parseInt((info.precio || '0').replace(/\D/g, ''), 10),
          descripcion: info.descripcion || '',
          tags: [],
          base,
          hasVideo: vInfo.hasVideo,
          videoUrl: vInfo.videoUrl
        });
      }
    } catch (e) { /* carpeta vacía */ }
  }
  return list;
}

function renderCarousel(list) {
  const car = $('carousel'), dots = $('carouselDots');
  car.innerHTML = '';
  dots.innerHTML = '';
  if (!list || list.length === 0) return;
  // Precarga en memoria los videos de los recomendados para que al abrir el globo aparezcan al instante
  list.forEach((it) => preloadItemMedia(it, true));
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
  grid.innerHTML = '';
  state.cats.forEach((c) => {
    if (!c.items || c.items.length === 0) return;
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
  bar.innerHTML = '';
  wrap.innerHTML = '';
  state.cats.forEach((c) => {
    if (!c.items || c.items.length === 0) return;
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.dataset.cat = c.id;
    chip.textContent = c.nombre;
    chip.onclick = () => goToCategory(c.id);
    bar.appendChild(chip);

    const sec = document.createElement('section');
    sec.className = 'menu-cat';
    sec.id = 'sec-' + c.id;
    sec.innerHTML = `<h2 class="menu-cat-head">${nameBlock(c.nombre, '', c.jp)}</h2>${c.intro ? `<p class="intro">${esc(c.intro)}</p>` : ''}<div class="item-grid"></div>`;
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
  const makePhoto = () => mediaImg((bases[0] || '') + 'foto.webp', item, item.nombre, true);

  if (item.hasVideo) {
    const videoUrl = item.videoUrl || (item.base + 'animacion.mp4');
    const entry = preloadVideo(videoUrl);

    const mountVideo = () => {
      const v = (entry.video.parentNode && entry.video.closest('.exiting'))
        ? createVideoElement(videoUrl)
        : entry.video;
      v.currentTime = 0;
      v.addEventListener('error', () => {
        if (slide.isConnected) slide.replaceChildren(makePhoto());
      }, { once: true });
      slide.replaceChildren(v);
      const p = v.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          if (slide.isConnected) slide.replaceChildren(makePhoto());
        });
      }
    };

    if (entry && !entry.failed && (entry.ready || entry.video.readyState >= 2)) {
      mountVideo();
      return slide;
    }

    // Si el video tarda en cargar o falla, abre la foto de inmediato sin ningún texto
    slide.appendChild(makePhoto());
    if (entry && !entry.failed) {
      const onReady = () => {
        entry.video.removeEventListener('canplay', onReady);
        entry.video.removeEventListener('loadeddata', onReady);
        if (slide.isConnected && !entry.failed) mountVideo();
      };
      entry.video.addEventListener('canplay', onReady, { once: true });
      entry.video.addEventListener('loadeddata', onReady, { once: true });
    }
    return slide;
  }

  slide.appendChild(makePhoto());
  return slide;
}

function fillPopupCard(card, item) {
  const mediaBox = card.querySelector('.popup-media');
  mediaBox.replaceChildren(buildSlideMedia(item));
  const tagNames = { frio: '❄ Frío', caliente: '🔥 Caliente' };
  card.querySelector('.popup-tags').innerHTML = (item.tags || []).map((t) => `<span class="tag">${tagNames[t] || esc(t)}</span>`).join('');
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
    ? `<small>Unidad <b>${fmt(item.precio)}</b></small>` + v.map((x) => `<small>${esc(x.nombre)} <b>${fmt(x.precio)}</b></small>`).join('')
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

  // Precarga inmediata de fotos y videos del producto actual, el siguiente y el anterior (y 2 más adelante/atrás)
  const n = list.length;
  if (n > 0) {
    preloadItemMedia(item, true);
    preloadItemMedia(list[(idx + 1) % n], true);
    preloadItemMedia(list[(idx - 1 + n) % n], true);
    preloadItemMedia(list[(idx + 2) % n], true);
    preloadItemMedia(list[(idx - 2 + n) % n], true);
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

  if (!dlg.open) {
    state.savedScrollY = window.scrollY;
    document.documentElement.classList.add('lock');
    dlg.showModal();
    window.scrollTo(0, state.savedScrollY);
  }
}

function navigate(step) {
  const n = state.list.length;
  openItem((state.current + step + n) % n, state.list, step);
}

function initPopup() {
  const dlg = $('productPopup');
  // Bloquea el scroll de la página detrás del popup y conserva la posición exacta al cerrar
  dlg.addEventListener('close', () => {
    const y = state.savedScrollY ?? window.scrollY;
    document.documentElement.classList.remove('lock');
    window.scrollTo(0, y);
    requestAnimationFrame(() => window.scrollTo(0, y));
  });
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

const SUPABASE_URL = 'https://bkubdcfhgivgmckblsyt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_5SF5J8y_r1KWJTU1aT_43w_VEKhdiqS';

async function fetchMenuData() {
  try {
    const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` };
    const [catsRes, prodsRes, recsRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/categorias?select=*&order=orden.asc`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/productos?select=*&order=orden.asc`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/recomendados?select=*&order=orden.asc`, { headers })
    ]);
    if (!catsRes.ok || !prodsRes.ok || !recsRes.ok) throw new Error('Supabase fetch failed');
    const [cats, prods, recs] = await Promise.all([catsRes.json(), prodsRes.json(), recsRes.json()]);

    const categories = cats.map((c) => ({
      ...c,
      items: prods.filter((p) => p.categoria_id === c.id)
    }));

    return {
      categorias: categories,
      recomendados: recs
    };
  } catch (err) {
    console.warn('Usando data/menu.json local por:', err.message);
    const res = await fetch('data/menu.json?v=' + Date.now(), { cache: 'no-store' });
    return await res.json();
  }
}

// ---------- Init ----------
async function init() {
  const data = await fetchMenuData();
  state.items = [];
  state.cats = (data.categorias || []).map((c) => {
    const hasCatVideo = c.id === 'matcha-puro' || c.id === 'mezclas' || c.carpeta === '01-matcha-puro' || c.carpeta === '02-creaciones-de-matcha';
    const activeItems = (c.items || []).filter((item) => {
      syncItemTags(item);
      return isItemAvailable(item);
    });
    activeItems.forEach((item) => {
      const parsed = parseFolderMeta(item.carpeta, c.carpeta);
      item.key = c.id + '/' + parsed.slug;
      item.base = parsed.base;
      item.fallbackBase = parsed.fallbackBase;
      item.hasVideo = parsed.forceVideo !== null ? parsed.forceVideo : Boolean(item.tiene_video || hasCatVideo);
      if (item.hasVideo) item.videoUrl = item.base + 'animacion.mp4';
      state.items.push(item);
      preloadItemMedia(item, true);
    });
    return { ...c, items: activeItems };
  });

  const recList = await loadRecomendados(data.recomendados);
  const hero = $('heroCarousel');
  if (hero) hero.style.display = recList.length > 0 ? '' : 'none';
  renderCarousel(recList);
  renderCategories();
  renderMenu();
  initPopup();
  $('brandLink').onclick = (e) => {
    e.preventDefault();
    const dlg = $('productPopup');
    if (dlg.open) dlg.close();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    history.replaceState(null, '', location.pathname + location.search);
  };
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
