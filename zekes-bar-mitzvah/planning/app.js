// Countdown to the moment Zeke stands up: May 9, 2026 @ 10:30am PT
const TARGET = new Date('2026-05-09T10:30:00-07:00').getTime();

function pad(n) { return String(n).padStart(2, '0'); }

function tick() {
  const now = Date.now();
  const diff = TARGET - now;

  const el = {
    d: document.getElementById('cd-days'),
    h: document.getElementById('cd-hours'),
    m: document.getElementById('cd-mins'),
  };
  if (!el.d) return;

  if (diff <= 0) {
    el.d.textContent = '0';
    el.h.textContent = '0';
    el.m.textContent = '0';
    const t = document.querySelector('.cd-target');
    if (t) t.textContent = "Shabbat shalom — we're live.";
    return;
  }

  const secs = Math.floor(diff / 1000);
  const mins = Math.floor(secs / 60);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);

  el.d.textContent = days;
  el.h.textContent = pad(hrs % 24);
  el.m.textContent = pad(mins % 60);
}

tick();
setInterval(tick, 30 * 1000); // once every 30s is plenty

// Highlight current section in the top nav as you scroll
const navLinks = document.querySelectorAll('.nav-links a');
const navMap = new Map();
navLinks.forEach(a => {
  const id = a.getAttribute('href').replace('#', '');
  const sec = document.getElementById(id);
  if (sec) navMap.set(sec, a);
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navLinks.forEach(a => a.classList.remove('active'));
      const link = navMap.get(e.target);
      if (link) link.classList.add('active');
    }
  });
}, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });

navMap.forEach((_link, sec) => observer.observe(sec));
