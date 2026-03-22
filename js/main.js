/* ============================================================
   QUANTUM NOTES — MAIN.JS
   Navigation, reading progress, sidebar, section tracking
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Reading Progress Bar ── */
  const bar = document.querySelector('.reading-progress-bar');
  if (bar) {
    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (docHeight > 0 ? (scrollTop / docHeight) * 100 : 0) + '%';
    });
  }

  /* ── Active sidebar link ── */
  const sections = document.querySelectorAll('.section[id]');
  const sideLinks = document.querySelectorAll('.sidebar-nav a');

  if (sideLinks.length && sections.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          sideLinks.forEach(a => {
            a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
          });
        }
      });
    }, { rootMargin: '-10% 0px -80% 0px' });
    sections.forEach(s => observer.observe(s));
  }

  /* ── Smooth reveal on scroll ── */
  const reveals = document.querySelectorAll('.callout, .viz-container, .math-block, .key-result');
  if ('IntersectionObserver' in window) {
    const revObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('fade-in');
          revObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.05 });
    reveals.forEach(el => revObs.observe(el));
  }

  /* ── MathJax re-typeset on tab change ── */
  document.querySelectorAll('.step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.MathJax) MathJax.typesetPromise();
    });
  });

});
