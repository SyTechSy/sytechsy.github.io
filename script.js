
const easeOutExpo = t => 1 - Math.pow(1 - t, 4);
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function tween(from, to, duration, onUpdate, ease = easeOutCubic) {
  if (prefersReducedMotion() || duration <= 0 || from === to) { onUpdate(to); return () => {}; }
  let frame;
  const start = performance.now();
  const tick = now => {
    const p = Math.min((now - start) / duration, 1);
    onUpdate(from + (to - from) * ease(p));
    if (p < 1) frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

function initHeroEntrance() {
  const items = document.querySelectorAll("[data-hero-item]");
  if (prefersReducedMotion()) { items.forEach(el => el.classList.add("is-visible")); return; }
  items.forEach((el, i) => {
    const delay = parseInt(el.dataset.heroDelay || i * 80);
    setTimeout(() => el.classList.add("is-visible"), delay + 120);
  });
}

function initScrollReveal() {
  if (prefersReducedMotion()) { document.querySelectorAll(".reveal").forEach(el => el.classList.add("is-visible")); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const delay = parseInt(entry.target.dataset.revealDelay || 0);
      setTimeout(() => entry.target.classList.add("is-visible"), delay);
      io.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  document.querySelectorAll(".reveal").forEach(el => io.observe(el));
}

function initStaggerGroups() {
  if (prefersReducedMotion()) { document.querySelectorAll("[data-stagger-child]").forEach(el => el.classList.add("is-visible")); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const parent = entry.target;
      const children = parent.querySelectorAll("[data-stagger-child]");
      children.forEach((child, i) => {
        const base = parseInt(parent.dataset.staggerBase || 0);
        const step = parseInt(parent.dataset.staggerStep || 70);
        setTimeout(() => child.classList.add("is-visible"), base + i * step);
      });
      io.unobserve(parent);
    });
  }, { threshold: 0.08 });
  document.querySelectorAll("[data-stagger]").forEach(el => io.observe(el));
}

function initCounters() {
  const counters = document.querySelectorAll("[data-count]");
  if (!counters.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseFloat(el.dataset.count);
      const dur = prefersReducedMotion() ? 0 : 1400;
      tween(0, target, dur, val => { el.textContent = Math.round(val).toLocaleString("fr-FR"); }, easeOutExpo);
      io.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(el => io.observe(el));
}

function initNavScroll() {
  const nav = document.querySelector("[data-nav]");
  if (!nav) return;
  let lastY = 0, ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      nav.classList.toggle("nav--scrolled", y > 60);
      if (!prefersReducedMotion()) nav.classList.toggle("nav--hidden", y > lastY && y > 120);
      lastY = y; ticking = false;
    });
  }, { passive: true });
}

function initActiveNav() {
  const links = document.querySelectorAll("[data-nav-link]");
  if (!links.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(l => l.classList.remove("nav-link--active"));
      const a = document.querySelector("[data-nav-link][href='#" + entry.target.id + "']");
      if (a) a.classList.add("nav-link--active");
    });
  }, { threshold: 0.4 });
  document.querySelectorAll("section[id]").forEach(s => io.observe(s));
}

function initCursorSpotlight() {
  const hero = document.querySelector("[data-hero-spotlight]");
  if (!hero || prefersReducedMotion()) return;
  const spot = document.createElement("div");
  spot.className = "cursor-spotlight";
  hero.appendChild(spot);
  let mx = 0, my = 0, cx = 0, cy = 0;
  hero.addEventListener("mousemove", e => {
    const r = hero.getBoundingClientRect();
    mx = e.clientX - r.left; my = e.clientY - r.top;
  });
  const lerp = (a, b, t) => a + (b - a) * t;
  const follow = () => {
    cx = lerp(cx, mx, 0.07); cy = lerp(cy, my, 0.07);
    spot.style.transform = "translate(" + cx + "px, " + cy + "px) translate(-50%, -50%)";
    requestAnimationFrame(follow);
  };
  requestAnimationFrame(follow);
}

function initCardTilt() {
  if (prefersReducedMotion() || window.innerWidth < 768) return;
  document.querySelectorAll("[data-tilt]").forEach(card => {
    card.addEventListener("mousemove", e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = "perspective(600px) rotateY(" + (x * 7) + "deg) rotateX(" + (-y * 5) + "deg) scale(1.02)";
    });
    card.addEventListener("mouseleave", () => { card.style.transform = ""; });
  });
}

function initTimeline() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      io.unobserve(entry.target);
    });
  }, { threshold: 0.2 });
  document.querySelectorAll("[data-timeline-item]").forEach(el => io.observe(el));
}

function initTypewriter() {
  const el = document.querySelector("[data-typewriter]");
  if (!el) return;
  const text = el.dataset.typewriter || "";
  if (prefersReducedMotion()) { el.textContent = text; return; }
  el.textContent = "";
  let i = 0;
  const delay = parseInt(el.dataset.typewriterDelay || 1200);
  setTimeout(() => {
    const iv = setInterval(() => { el.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(iv); }, 40);
  }, delay);
}

function initSmoothScroll() {
  document.querySelectorAll("a[href^='#']").forEach(a => {
    a.addEventListener("click", e => {
      const target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
    });
  });
}

function filterProjects(category, btn) {
  const tabs = btn.closest("[data-filter-tabs]").querySelectorAll("button");
  tabs.forEach(t => { t.className = "px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"; });
  btn.className = "px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white shadow-sm transition-all";
  document.querySelectorAll(".project-card").forEach((card, i) => {
    const cat = card.getAttribute("data-category") || "";
    const show = category === "all" || cat.includes(category);
    if (show) {
      card.style.display = "flex";
      if (!prefersReducedMotion()) {
        card.style.opacity = "0"; card.style.translate = "0 16px";
        setTimeout(() => { card.style.opacity = "1"; card.style.translate = "none"; }, i * 50);
      }
    } else { card.style.display = "none"; }
  });
}

function initMobileNav() {
  const burger = document.querySelector("[data-burger]");
  const menu = document.querySelector("[data-mobile-menu]");
  if (!burger || !menu) return;
  burger.addEventListener("click", () => {
    const open = menu.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", open);
  });
  menu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
    menu.classList.remove("is-open"); burger.setAttribute("aria-expanded", "false");
  }));
}

function initFloatingBadges() {
  const badges = document.querySelectorAll("[data-float]");
  if (!badges.length || prefersReducedMotion()) return;
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    badges.forEach(b => {
      const offset = parseFloat(b.dataset.floatOffset || 0);
      b.style.transform = "translateY(" + Math.sin(y * 0.003 + offset) * 8 + "px)";
    });
  }, { passive: true });
}

function initContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;
  form.addEventListener("submit", e => {
    e.preventDefault();
    const btn = document.getElementById("submit-btn");
    btn.disabled = true;
    btn.innerHTML = "<span>Envoi en cours&hellip;</span>";
    setTimeout(() => {
      btn.innerHTML = "<span class='material-symbols-outlined text-[18px]'>check_circle</span><span>Message transmis &#x2713;</span>";
      btn.classList.remove("bg-emerald-600"); btn.classList.add("bg-slate-900");
    }, 1200);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initHeroEntrance();
  initScrollReveal();
  initStaggerGroups();
  initCounters();
  initNavScroll();
  initActiveNav();
  initCursorSpotlight();
  initCardTilt();
  initTimeline();
  initTypewriter();
  initSmoothScroll();
  initMobileNav();
  initFloatingBadges();
  initContactForm();
});

window.filterProjects = filterProjects;
