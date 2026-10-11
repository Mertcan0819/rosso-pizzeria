/* ==========================================================================
   ROSSO — Pizzeria Napoletana
   ========================================================================== */

// İşletme bilgileri: gerçek numarayla değiştirin
const CONFIG = {
  whatsapp: '905000000000',
  // Gün: [açılış, kapanış] dakika cinsinden (1440'tan büyükse gece yarısından sonra)
  hours: { 0: [720, 1380], 1: [720, 1380], 2: [720, 1380], 3: [720, 1380], 4: [720, 1380], 5: [720, 1470], 6: [720, 1470] },
};

const html = document.documentElement;
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const hasGsap = !!(window.gsap && window.ScrollTrigger);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (!hasGsap) {
  html.classList.remove('js');
  html.classList.add('no-gsap');
}

/* ---------- Yardımcılar ---------- */
const money = n => '₺' + n.toLocaleString('tr-TR');

let toastTimer;
function toast(msg) {
  const el = $('.toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

function splitWords(el) {
  const walk = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span');
          w.className = 'w';
          const wi = document.createElement('span');
          wi.className = 'wi';
          wi.textContent = part;
          w.appendChild(wi);
          frag.appendChild(w);
        });
        node.replaceChild(frag, n);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') {
        walk(n);
      }
    });
  };
  walk(el);
  return $$('.wi', el);
}

/* ---------- Açık / kapalı durumu ---------- */
function isOpenNow() {
  const now = new Date();
  const m = now.getHours() * 60 + now.getMinutes();
  const today = CONFIG.hours[now.getDay()];
  const prev = CONFIG.hours[(now.getDay() + 6) % 7];
  if (today && m >= today[0] && m < today[1]) return true;
  if (prev && prev[1] > 1440 && m < prev[1] - 1440) return true;
  return false;
}
const open = isOpenNow();
$$('[data-status]').forEach(el => {
  el.classList.toggle('open', open);
  $('em', el).textContent = open ? 'Şu an açık' : 'Şu an kapalı';
});
$$('[data-hours] li').forEach(li => li.classList.toggle('today', +li.dataset.day === new Date().getDay()));
$$('[data-year]').forEach(el => (el.textContent = new Date().getFullYear()));
$$('[data-wa-link]').forEach(a => (a.href = `https://wa.me/${CONFIG.whatsapp}`));

/* ---------- Yumuşak kaydırma ---------- */
let lenis = null;
if (hasGsap && window.Lenis && !reduceMotion) {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
const stopScroll = () => (lenis ? lenis.stop() : (document.body.style.overflow = 'hidden'));
const startScroll = () => (lenis ? lenis.start() : (document.body.style.overflow = ''));
function scrollToEl(el, offset = -100) {
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.6 });
  else window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + offset, behavior: 'smooth' });
}

/* ---------- Mobil menü ---------- */
$('.menu-toggle')?.addEventListener('click', () => {
  const isOpen = html.classList.toggle('menu-open');
  isOpen ? stopScroll() : startScroll();
});

/* ---------- Sepet ---------- */
const CART_KEY = 'rosso-cart';
let cart = [];
try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { cart = []; }
const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} };

function renderCart() {
  const list = $('.cd-items');
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const total = cart.reduce((s, i) => s + i.qty * i.price, 0);
  $$('.cart-count').forEach(el => { el.textContent = count; el.classList.toggle('has', count > 0); });
  $$('[data-cart-total]').forEach(el => (el.textContent = money(total)));
  if (!list) return;
  list.innerHTML = cart.length
    ? cart.map(i => `
      <div class="cd-item" data-id="${i.id}">
        <h4>${i.name}</h4>
        <span class="cd-price">${money(i.price * i.qty)}</span>
        <div class="cd-qty"><button data-q="-1" aria-label="Azalt">−</button><span>${i.qty}</span><button data-q="1" aria-label="Artır">+</button></div>
        <button class="cd-remove">Kaldır</button>
      </div>`).join('')
    : `<div class="cd-empty"><p class="h-3">Sepetiniz boş</p><p>Menüden bir pizza seçerek başlayın.</p></div>`;
  const checkout = $('[data-cart-checkout]');
  if (checkout) {
    const lines = cart.map(i => `• ${i.qty} x ${i.name} — ${money(i.price * i.qty)}`).join('\n');
    const msg = `Merhaba ROSSO, sipariş vermek istiyorum:\n\n${lines}\n\nToplam: ${money(total)}\n\nAdres: `;
    checkout.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
  }
}

function flyToCart(from) {
  const target = $('.cart-btn');
  if (!hasGsap || !target || reduceMotion) return;
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const dot = document.createElement('div');
  dot.className = 'fly-dot';
  document.body.appendChild(dot);
  gsap.set(dot, { x: a.left + a.width / 2, y: a.top + a.height / 2 });
  gsap.timeline({ onComplete: () => dot.remove() })
    .to(dot, { x: b.left + b.width / 2, duration: 0.8, ease: 'power1.inOut' }, 0)
    .to(dot, { y: b.top + b.height / 2, duration: 0.8, ease: 'back.in(2.2)' }, 0)
    .to(dot, { scale: 0.4, duration: 0.2 }, 0.6);
}

document.addEventListener('click', e => {
  const add = e.target.closest('[data-add]');
  if (add) {
    const { id, name, price } = add.dataset;
    const found = cart.find(i => i.id === id);
    found ? found.qty++ : cart.push({ id, name, price: +price, qty: 1 });
    saveCart();
    flyToCart(add);
    setTimeout(() => {
      renderCart();
      $$('.cart-count').forEach(el => { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); });
    }, hasGsap ? 750 : 0);
    add.classList.remove('added'); void add.offsetWidth; add.classList.add('added');
    toast(`${name} sepete eklendi`);
    return;
  }
  if (e.target.closest('[data-cart-open]')) {
    html.classList.remove('menu-open');
    html.classList.add('cart-open');
    stopScroll();
    return;
  }
  if (e.target.closest('[data-cart-close]')) {
    html.classList.remove('cart-open');
    startScroll();
    return;
  }
  const item = e.target.closest('.cd-item');
  if (item) {
    const entry = cart.find(i => i.id === item.dataset.id);
    const q = e.target.closest('[data-q]');
    if (q) entry.qty += +q.dataset.q;
    if (e.target.closest('.cd-remove') || entry.qty <= 0) cart = cart.filter(i => i !== entry);
    saveCart();
    renderCart();
  }
  if (e.target.closest('[data-cart-checkout]') && !cart.length) {
    e.preventDefault();
    toast('Sepetiniz boş — önce menüden bir şey ekleyin');
  }
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (html.classList.contains('cart-open')) { html.classList.remove('cart-open'); startScroll(); }
  if (html.classList.contains('menu-open')) { html.classList.remove('menu-open'); startScroll(); }
});
renderCart();

/* ---------- Bülten ---------- */
$$('[data-newsletter]').forEach(form => form.addEventListener('submit', e => {
  e.preventDefault();
  toast('Teşekkürler! Bültenimize katıldınız.');
  form.reset();
}));

/* ---------- SSS ---------- */
$$('.faq-item').forEach(item => {
  const a = $('.faq-a', item);
  $('.faq-q', item).addEventListener('click', () => {
    const isOpen = item.classList.toggle('open');
    a.style.height = isOpen ? a.scrollHeight + 'px' : '0px';
    if (hasGsap) setTimeout(() => ScrollTrigger.refresh(), 650);
  });
});

/* ---------- Rezervasyon formu ---------- */
const rForm = $('[data-reserve]');
if (rForm) {
  const date = $('#r-date');
  const today = new Date();
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  date.min = iso(today);
  date.value = iso(today);
  $('#r-time').value = '20:00';

  let guests = 2;
  $$('[data-guests]', rForm).forEach(b => b.addEventListener('click', () => {
    $$('[data-guests]', rForm).forEach(x => x.classList.remove('is-active'));
    b.classList.add('is-active');
    guests = +b.dataset.guests;
  }));

  const card = rForm.closest('.r-card');
  const success = $('.r-success', card);

  rForm.addEventListener('submit', e => {
    e.preventDefault();
    const f = rForm.elements;
    const checks = [
      [f.name, f.name.value.trim().length >= 2],
      [f.phone, f.phone.value.replace(/\D/g, '').length >= 10],
      [f.date, !!f.date.value],
    ];
    checks.forEach(([el, ok]) => el.closest('.field').classList.toggle('error', !ok));
    if (checks.some(([, ok]) => !ok)) return;

    const d = new Date(f.date.value + 'T00:00');
    const dateText = d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
    const guestText = guests === 8 ? '8+ kişi' : `${guests} kişi`;
    const summary = `${dateText}, saat ${f.time.value} · ${guestText} · ${f.area.value}`;
    const msg = `Merhaba ROSSO, rezervasyon yapmak istiyorum.\n\nAd: ${f.name.value.trim()}\nTelefon: ${f.phone.value.trim()}\nTarih: ${dateText}\nSaat: ${f.time.value}\nKişi: ${guestText}\nTercih: ${f.area.value}` + (f.note.value.trim() ? `\nNot: ${f.note.value.trim()}` : '');

    $('[data-r-name]', card).textContent = f.name.value.trim().split(' ')[0];
    $('[data-r-summary]', card).textContent = `${summary}. Talebinizi göndermek için aşağıdaki butona dokunun.`;
    $('[data-r-wa]', card).href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
    success.classList.add('show');
  });
  $$('input, textarea', rForm).forEach(el => el.addEventListener('input', () => el.closest('.field').classList.remove('error')));
  $('[data-r-reset]', card).addEventListener('click', () => {
    success.classList.remove('show');
    rForm.reset();
    date.value = iso(today);
    $('#r-time').value = '20:00';
  });
}

/* ---------- Yorum slaytı ---------- */
const tWrap = $('[data-testimonials]');
if (tWrap) {
  const slides = $$('.t-slide', tWrap);
  const bars = $$('.t-bars i', tWrap);
  let idx = 0, timer;
  const show = i => {
    idx = (i + slides.length) % slides.length;
    slides.forEach((s, j) => s.classList.toggle('is-active', j === idx));
    bars.forEach((b, j) => { b.classList.remove('is-active', 'is-done'); if (j < idx) b.classList.add('is-done'); });
    void tWrap.offsetWidth;
    bars[idx].classList.add('is-active');
    if (hasGsap) gsap.fromTo($('blockquote', slides[idx]), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out' });
    clearTimeout(timer);
    timer = setTimeout(() => show(idx + 1), 7000);
  };
  $('[data-t-prev]', tWrap).addEventListener('click', () => show(idx - 1));
  $('[data-t-next]', tWrap).addEventListener('click', () => show(idx + 1));
  show(0);
}

/* ==========================================================================
   Parçacık sistemi: buhar (dönen pizzanın üzerinde)
   ========================================================================== */
function makeSprite(r, g, b) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const grad = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.4, `rgba(${r},${g},${b},.45)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = grad;
  x.fillRect(0, 0, 64, 64);
  return c;
}
const STEAM_SPRITE = makeSprite(255, 248, 240);

class Particles {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.parts = [];
    this.t = 0;
    this.scale = Math.min(devicePixelRatio, 2);
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas);
    new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (this.visible && !this.raf) this.loop();
    }).observe(canvas);
  }
  resize() {
    this.w = this.c.clientWidth;
    this.h = this.c.clientHeight;
    this.c.width = Math.max(1, this.w * this.scale);
    this.c.height = Math.max(1, this.h * this.scale);
    this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
  }
  spawn() {
    const { w, h } = this;
    if (Math.random() < 0.25) this.parts.push({
      x: w * (0.3 + Math.random() * 0.4), y: h,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -(0.35 + Math.random() * 0.45),
      s: 20 + Math.random() * 25,
      life: 1, decay: 0.0035 + Math.random() * 0.003,
      seed: Math.random() * 100,
    });
  }
  loop() {
    if (!this.visible) { this.raf = null; return; }
    this.raf = requestAnimationFrame(() => this.loop());
    const { ctx, w, h } = this;
    this.t++;
    this.spawn();
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';

    for (const p of this.parts) {
      const sway = Math.sin(this.t * 0.03 + p.seed);
      p.life -= p.decay;
      p.x += p.vx + sway * 0.3;
      p.y += p.vy;
      p.s += 0.35;
      ctx.globalAlpha = Math.sin(Math.max(0, p.life) * Math.PI) * 0.07;
      ctx.drawImage(STEAM_SPRITE, p.x - p.s, p.y - p.s, p.s * 2, p.s * 2);
    }
    this.parts = this.parts.filter(p => p.life > 0 && p.y > -60);
  }
}

if (!reduceMotion) {
  $$('canvas[data-steam]').forEach(c => new Particles(c));
}

/* ==========================================================================
   GSAP animasyonları
   ========================================================================== */
if (hasGsap) {
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Hero hazırlığı ---------- */
  const heroWords = $$('[data-hero-split] .line').flatMap(splitWords);
  gsap.set(heroWords, { yPercent: 115 });
  gsap.set('.hero-anim', { opacity: 0, y: 30 });
  gsap.set('.hero-media', { clipPath: 'inset(0% 42% 0% 42%)' });

  function intro() {
    const tl = gsap.timeline();
    tl.to('.hero-media', { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.7, ease: 'expo.inOut' }, 0)
      .from('.page-hero .ph-media', { scale: 1.25, duration: 2.4, ease: 'expo.out' }, 0)
      .to(heroWords, { yPercent: 0, duration: 1.4, stagger: 0.07, ease: 'expo.out' }, 0.35)
      .to('.hero-anim', { opacity: 1, y: 0, duration: 1.2, stagger: 0.12, ease: 'expo.out' }, 0.75)
      .from('.header-inner > *', { y: -30, opacity: 0, duration: 1, stagger: 0.08, ease: 'expo.out' }, 0.3);
    startScroll();
    if (location.hash) setTimeout(() => scrollToEl($(location.hash), -150), 400);
  }

  /* ---------- Yükleme ekranı / sayfa geçişi ---------- */
  let visited = false;
  try { visited = !!sessionStorage.getItem('rosso-visited'); sessionStorage.setItem('rosso-visited', '1'); } catch (e) {}
  stopScroll();

  if (!visited) {
    gsap.set('.t-layer', { scaleY: 0 });
    const imgs = $$('img:not([loading="lazy"])');
    const prog = { v: 0 };
    const countEl = $('.loader-count');
    const lineEl = $('.loader-line i');
    const loaded = () => imgs.filter(i => i.complete).length / Math.max(imgs.length, 1);

    gsap.timeline()
      .to('.loader-logo span', { y: 0, duration: 1.2, stagger: 0.08, ease: 'expo.out' })
      .to('.loader-sub', { opacity: 1, duration: 1 }, 0.5);

    const start = performance.now();
    const tick = () => {
      const target = Math.max(loaded(), Math.min((performance.now() - start) / 4000, 1));
      prog.v += (target - prog.v) * 0.08;
      const minTimeOk = performance.now() - start > 1700;
      if (prog.v > 0.995 && minTimeOk) prog.v = 1;
      countEl.textContent = Math.round(prog.v * 100);
      gsap.set(lineEl, { scaleX: prog.v });
      if (prog.v < 1) return requestAnimationFrame(tick);
      gsap.timeline({ onComplete: () => $('.loader').remove() })
        .to('.loader-inner, .loader-count', { opacity: 0, y: -30, duration: 0.6, ease: 'power2.in' })
        .to('.loader', { yPercent: -100, duration: 1.2, ease: 'expo.inOut' })
        .add(intro, '-=0.7');
    };
    requestAnimationFrame(tick);
  } else {
    $('.loader')?.remove();
    gsap.timeline()
      .to('.t-black', { scaleY: 0, transformOrigin: 'top', duration: 0.9, ease: 'expo.inOut' })
      .to('.t-red', { scaleY: 0, transformOrigin: 'top', duration: 0.9, ease: 'expo.inOut' }, 0.12)
      .add(intro, 0.45);
  }

  // Sayfalar arası geçiş perdesi
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    const href = a.getAttribute('href');
    if (/^(#|mailto:|tel:|https?:)/.test(href)) {
      if (href.startsWith('#') && href.length > 1) { e.preventDefault(); scrollToEl($(href), -150); }
      return;
    }
    const url = new URL(href, location.href);
    if (url.pathname === location.pathname && url.hash) {
      e.preventDefault();
      html.classList.remove('menu-open');
      startScroll();
      scrollToEl($(url.hash), -150);
      return;
    }
    e.preventDefault();
    gsap.timeline({ onComplete: () => (location.href = href) })
      .set('.t-layer', { transformOrigin: 'bottom' })
      .to('.t-red', { scaleY: 1, duration: 0.7, ease: 'expo.inOut' })
      .to('.t-black', { scaleY: 1, duration: 0.7, ease: 'expo.inOut' }, 0.1);
  });
  window.addEventListener('pageshow', e => { if (e.persisted) gsap.set('.t-layer', { scaleY: 0 }); });

  /* ---------- Header ---------- */
  const header = $('.header');
  let lastY = 0;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: () => {
      const y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 40);
      const hide = y > lastY && y > 400 && !html.classList.contains('menu-open');
      header.classList.toggle('is-hidden', hide);
      document.body.classList.toggle('header-hidden', hide);
      lastY = y;
    },
  });

  /* ---------- İmleç ve manyetik butonlar ---------- */
  if (finePointer && !reduceMotion) {
    const dot = $('.cursor'), ring = $('.cursor-ring'), label = $('.cursor-ring span');
    const dx = gsap.quickTo(dot, 'x', { duration: 0.1 }), dy = gsap.quickTo(dot, 'y', { duration: 0.1 });
    const rx = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3' });
    window.addEventListener('mousemove', e => {
      document.body.classList.add('cursor-ready');
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
    });
    document.addEventListener('mouseover', e => {
      const lab = e.target.closest('[data-cursor]');
      document.body.classList.toggle('cursor-label', !!lab);
      if (lab) label.textContent = lab.dataset.cursor;
      document.body.classList.toggle('cursor-hover', !lab && !!e.target.closest('a, button, input, select, textarea, .menu-item'));
    });
    document.addEventListener('mouseleave', () => document.body.classList.remove('cursor-ready'));

    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.18, y: (e.clientY - r.top - r.height / 2) * 0.2, duration: 0.6, ease: 'power3' });
      });
      el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, .4)' }));
    });
  }

  /* ---------- Kaydırınca beliren öğeler ---------- */
  $$('[data-split]').forEach(el => {
    const words = splitWords(el);
    gsap.from(words, {
      yPercent: 115, duration: 1.3, stagger: 0.06, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  ScrollTrigger.batch('[data-fade]', {
    start: 'top 90%', once: true,
    onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: 1.3, stagger: 0.1, ease: 'expo.out' }),
  });
  ScrollTrigger.batch('[data-stagger] > *', {
    start: 'top 92%', once: true,
    onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: 1.2, stagger: 0.09, ease: 'expo.out' }),
  });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%', once: true,
    onEnter: b => {
      gsap.to(b, { clipPath: 'inset(0% 0 0 0)', duration: 1.6, stagger: 0.12, ease: 'expo.inOut' });
      gsap.from(b.map(el => $('img', el)), { scale: 1.35, duration: 2.2, stagger: 0.12, ease: 'expo.out' });
    },
  });

  // Kelime kelime dolan manifesto
  $$('[data-fill]').forEach(el => {
    gsap.to(splitWords(el), {
      opacity: 1, stagger: 0.1, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true },
    });
  });

  /* ---------- Paralaks ---------- */
  $$('[data-speed]').forEach(el => {
    const s = parseFloat(el.dataset.speed);
    const isFloating = el.classList.contains('mf-img');
    gsap.fromTo(isFloating ? el : $('img', el),
      isFloating ? { y: s * 300 } : { yPercent: -s * 50 },
      { ...(isFloating ? { y: -s * 300 } : { yPercent: s * 50 }), ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  $$('[data-parallax-bg]').forEach(el => {
    const inHero = el.closest('.page-hero');
    gsap.fromTo(el, { yPercent: inHero ? 0 : -8 }, {
      yPercent: inHero ? 18 : 8, ease: 'none',
      scrollTrigger: { trigger: el.parentElement, start: inHero ? 'top top' : 'top bottom', end: 'bottom top', scrub: true },
    });
  });
  if ($('.hero')) {
    gsap.to('.hero-content', {
      yPercent: -18, opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });
  }

  /* ---------- Dönen pizza ve açıklamalar ---------- */
  if ($('.anatomy')) {
    gsap.fromTo('.disk', { rotation: -60, scale: 0.85 }, {
      rotation: 140, scale: 1, ease: 'none',
      scrollTrigger: { trigger: '.anatomy', start: 'top bottom', end: 'bottom top', scrub: 1 },
    });
    $$('[data-callout]').forEach((c, i) => {
      const path = $('path', c);
      const len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      gsap.timeline({ scrollTrigger: { trigger: '.anatomy-stage', start: 'top 65%' } })
        .from(c, { opacity: 0, x: i % 2 ? 40 : -40, duration: 1.2, ease: 'expo.out' }, i * 0.15)
        .to(path, { strokeDashoffset: 0, duration: 1.4, ease: 'expo.inOut' }, i * 0.15 + 0.3);
    });
  }

  /* ---------- Yatay kayan imza pizzalar ---------- */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const track = $('.sig-track');
    if (!track) return;
    const dist = () => track.scrollWidth - window.innerWidth;
    gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: '.sig-pin', start: 'center center', end: () => '+=' + dist(),
        pin: true, scrub: 1, invalidateOnRefresh: true,
        onUpdate: self => gsap.set('.sig-progress i', { scaleX: self.progress }),
      },
    });
  });

  /* ---------- Süreç adımları ---------- */
  const pmImgs = $$('.pm-img');
  if (pmImgs.length) {
    let current = 0, z = 1;
    gsap.set(pmImgs[0], { clipPath: 'inset(0% 0 0 0)', zIndex: z });
    gsap.set($('img', pmImgs[0]), { scale: 1 });
    const counter = $('.pm-current span');
    const steps = $$('.p-step');
    steps[0].classList.add('is-active');
    const activate = i => {
      if (i === current) return;
      current = i;
      steps.forEach((s, j) => s.classList.toggle('is-active', j === i));
      const img = pmImgs[i];
      gsap.set(img, { zIndex: ++z, clipPath: 'inset(100% 0 0 0)' });
      gsap.to(img, { clipPath: 'inset(0% 0 0 0)', duration: 1.2, ease: 'expo.inOut' });
      gsap.fromTo($('img', img), { scale: 1.3 }, { scale: 1, duration: 1.8, ease: 'expo.out' });
      gsap.fromTo(counter, { yPercent: 100 }, { yPercent: 0, duration: 0.8, ease: 'expo.out', onStart: () => (counter.textContent = String(i + 1).padStart(2, '0')) });
    };
    steps.forEach((s, i) => ScrollTrigger.create({
      trigger: s, start: 'top 55%', end: 'bottom 55%',
      onEnter: () => activate(i), onEnterBack: () => activate(i),
    }));
  }

  /* ---------- Sayaçlar ---------- */
  $$('[data-count]').forEach(el => {
    const obj = { v: 0 };
    gsap.to(obj, {
      v: +el.dataset.count, duration: 2.4, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => (el.textContent = Math.round(obj.v).toLocaleString('tr-TR')),
    });
  });

  /* ---------- Zaman çizelgesi ---------- */
  if ($('.tl-line i')) {
    gsap.to('.tl-line i', {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: '.timeline', start: 'top 60%', end: 'bottom 60%', scrub: true },
    });
  }

  /* ---------- Menü sayfası ---------- */
  const tabs = $$('.mn-inner a');
  if (tabs.length) {
    tabs.forEach(tab => {
      const sec = $(tab.getAttribute('href'));
      ScrollTrigger.create({
        trigger: sec, start: 'top 50%', end: 'bottom 50%',
        onToggle: self => {
          if (!self.isActive) return;
          tabs.forEach(t => t.classList.toggle('is-active', t === tab));
          const bar = tab.parentElement;
          bar.scrollTo({ left: tab.offsetLeft - bar.clientWidth / 2 + tab.clientWidth / 2, behavior: 'smooth' });
        },
      });
    });
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
} else {
  // GSAP yüklenemezse: temel davranışlar
  $$('.mn-inner a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); scrollToEl($(a.getAttribute('href')), -150); }));
}
