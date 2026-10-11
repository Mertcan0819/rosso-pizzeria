// ---------- Yükleme ekranı ----------
document.body.classList.add('loading');
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loader').classList.add('hide');
    document.body.classList.remove('loading');
    document.body.classList.add('ready');
  }, 1200);
});

// ---------- Navigasyon ----------
const nav = document.getElementById('nav');
const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');

burger.addEventListener('click', () => {
  burger.classList.toggle('open');
  navLinks.classList.toggle('open');
});
navLinks.querySelectorAll('a').forEach(link =>
  link.addEventListener('click', () => {
    burger.classList.remove('open');
    navLinks.classList.remove('open');
  })
);

// ---------- Scroll efektleri ----------
const parallaxEls = document.querySelectorAll('[data-parallax]');
const stepsSection = document.getElementById('nasil');
const stepsProgress = document.getElementById('stepsProgress');

function onScroll() {
  const y = window.scrollY;
  nav.classList.toggle('scrolled', y > 50);

  parallaxEls.forEach(el => {
    el.style.transform = `translateX(${y * el.dataset.parallax}px)`;
  });

  // Süreç çizgisi, bölüm kaydırıldıkça dolar
  const rect = stepsSection.getBoundingClientRect();
  const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height * 0.3);
  stepsProgress.style.width = `${Math.min(Math.max(progress, 0), 1) * 100}%`;
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ---------- Görünür olunca animasyon ----------
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('visible');
    // Giriş gecikmesi bittikten sonra hover efektlerini geciktirmesin
    setTimeout(() => { entry.target.style.transitionDelay = ''; }, 1500);
    const num = entry.target.querySelector('[data-count]');
    if (num) countUp(num);
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach((el, i) => {
  // Aynı satırdaki kartlar sırayla gelsin
  if (el.classList.contains('card')) el.style.transitionDelay = `${(i % 3) * 0.12}s`;
  if (el.classList.contains('step')) el.style.transitionDelay = `${[...el.parentNode.children].indexOf(el) * 0.1}s`;
  revealObserver.observe(el);
});

function countUp(el) {
  const target = +el.dataset.count;
  const duration = 1800;
  const start = performance.now();
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(target * eased);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ---------- İmleç ışığı ----------
const glow = document.getElementById('cursorGlow');
window.addEventListener('mousemove', e => {
  glow.style.left = `${e.clientX}px`;
  glow.style.top = `${e.clientY}px`;
});

// ---------- Kart 3D eğim + ışık ----------
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    card.style.setProperty('--mx', `${x * 100}%`);
    card.style.setProperty('--my', `${y * 100}%`);
    card.style.transform = `perspective(800px) rotateX(${(0.5 - y) * 10}deg) rotateY(${(x - 0.5) * 10}deg) translateY(-6px)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

// ---------- Menü filtreleri ----------
document.querySelectorAll('.filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelector('.filter.active').classList.remove('active');
    btn.classList.add('active');
    const f = btn.dataset.filter;
    document.querySelectorAll('.card').forEach(card => {
      const show = f === 'all' || card.dataset.cat === f;
      card.classList.toggle('hidden', !show);
      if (show) {
        card.classList.remove('visible');
        requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('visible')));
      }
    });
  });
});

// ---------- Sepete ekle ----------
const toast = document.getElementById('toast');
let toastTimer;
document.querySelectorAll('.add').forEach(btn => {
  btn.addEventListener('click', () => {
    const name = btn.closest('.card').querySelector('h3').textContent;
    btn.classList.remove('pop');
    void btn.offsetWidth;
    btn.classList.add('pop');
    toast.textContent = `${name} sepete eklendi 🍕`;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  });
});

// ---------- Yorum slider ----------
const slides = document.getElementById('slides');
const dotsNav = document.getElementById('dotsNav');
const slideCount = slides.children.length;
let current = 0;

for (let i = 0; i < slideCount; i++) {
  const dot = document.createElement('button');
  dot.setAttribute('aria-label', `Yorum ${i + 1}`);
  dot.addEventListener('click', () => { goTo(i); restartAuto(); });
  dotsNav.appendChild(dot);
}
function goTo(i) {
  current = i;
  slides.style.transform = `translateX(-${i * 100}%)`;
  dotsNav.querySelectorAll('button').forEach((d, j) => d.classList.toggle('active', j === i));
}
let auto = setInterval(() => goTo((current + 1) % slideCount), 5000);
function restartAuto() {
  clearInterval(auto);
  auto = setInterval(() => goTo((current + 1) % slideCount), 5000);
}
goTo(0);

// ---------- Kıvılcım (ember) parçacıkları ----------
const canvas = document.getElementById('embers');
const ctx = canvas.getContext('2d');
let embers = [];

function resize() {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
window.addEventListener('resize', resize);
resize();

function makeEmber() {
  return {
    x: Math.random() * window.innerWidth,
    y: window.innerHeight + 10,
    r: Math.random() * 2.2 + 0.6,
    vy: Math.random() * 0.8 + 0.4,
    vx: (Math.random() - 0.5) * 0.4,
    life: 1,
    decay: Math.random() * 0.003 + 0.0015,
    wobble: Math.random() * Math.PI * 2,
  };
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const maxEmbers = window.innerWidth < 760 ? 35 : 70;

function animate() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  if (embers.length < maxEmbers && Math.random() < 0.3) embers.push(makeEmber());

  embers.forEach(e => {
    e.wobble += 0.03;
    e.x += e.vx + Math.sin(e.wobble) * 0.3;
    e.y -= e.vy;
    e.life -= e.decay;

    const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 4);
    g.addColorStop(0, `rgba(255, 180, 80, ${e.life})`);
    g.addColorStop(0.4, `rgba(227, 38, 31, ${e.life * 0.6})`);
    g.addColorStop(1, 'rgba(227, 38, 31, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r * 4, 0, Math.PI * 2);
    ctx.fill();
  });
  embers = embers.filter(e => e.life > 0 && e.y > -20);
  requestAnimationFrame(animate);
}
if (!reduceMotion) animate();
