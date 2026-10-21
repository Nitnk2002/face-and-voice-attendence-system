/* Landing page JS — Apni Kaksha */

// ── Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
});

// ── Mobile nav toggle
const toggle = document.getElementById('nav-toggle');
const navLinks = document.getElementById('nav-links');
if (toggle && navLinks) {
  toggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
  // Close on link click
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => navLinks.classList.remove('open'));
  });
}

// ── Scroll reveal animation
const revealEls = document.querySelectorAll(
  '.feature-card, .step, .tech-chip, .section-header'
);
revealEls.forEach(el => el.classList.add('reveal'));

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 60);
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 }
);
revealEls.forEach(el => observer.observe(el));

// ── Hero mockup: animate progress bar on load
window.addEventListener('load', () => {
  const fill = document.querySelector('.progress-fill');
  if (fill) {
    fill.style.width = '0%';
    setTimeout(() => { fill.style.width = '50%'; }, 600);
  }

  // Cycle student statuses
  const rows = document.querySelectorAll('.student-row');
  let idx = 2; // start at 'scanning' row
  setInterval(() => {
    if (rows[idx]) {
      rows[idx].classList.remove('scanning');
      rows[idx].classList.add('present');
      const badge = rows[idx].querySelector('[class^="badge-"]');
      if (badge) { badge.className = 'badge-present'; badge.textContent = 'Present ✓'; }
    }
    idx++;
    const fill2 = document.querySelector('.progress-fill');
    if (fill2) {
      const pct = Math.min(((idx - 1) / rows.length) * 100, 100);
      fill2.style.width = pct + '%';
      document.querySelector('.footer-count').textContent =
        `${idx - 1}/${rows.length} marked`;
    }
  }, 2500);
});

// ── Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
