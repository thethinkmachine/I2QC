/* ============================================================
   QUANTUM NOTES — MAIN.JS
   Navigation, reading progress, sidebar, section tracking
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  /* ── Reading Progress Bar ── */
  const bar = document.querySelector('.reading-progress-bar');
  if (bar) {
    let ticking = false;
    let docHeight = document.documentElement.scrollHeight - window.innerHeight;

    window.addEventListener('resize', () => {
      docHeight = document.documentElement.scrollHeight - window.innerHeight;
    }, { passive: true });

    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const scrollTop = window.scrollY;
            if (docHeight <= 0) docHeight = document.documentElement.scrollHeight - window.innerHeight;
            bar.style.width = (docHeight > 0 ? (scrollTop / docHeight) * 100 : 0) + '%';
            ticking = false;
          });
          ticking = true;
        }
      },
      { passive: true }
    );
  }

  /* ── Active sidebar link ── */
  const sections = document.querySelectorAll('.section[id]');
  const sideLinks = document.querySelectorAll('.sidebar-nav a');

  if (sideLinks.length && sections.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            sideLinks.forEach((a) => {
              a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
            });
          }
        });
      },
      { rootMargin: '-10% 0px -80% 0px' }
    );
    sections.forEach((s) => observer.observe(s));
  }

  /* ── Smooth reveal on scroll ── */
  const reveals = document.querySelectorAll('.callout, .viz-container, .math-block, .key-result');
  if ('IntersectionObserver' in window) {
    const revObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('fade-in');
            revObs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.05 }
    );
    reveals.forEach((el) => revObs.observe(el));
  }

  /* ── MathJax re-typeset on tab change ── */
  document.querySelectorAll('.step-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (window.MathJax) MathJax.typesetPromise();
    });
  });

  /* ── Interactive Tooltips (Math & Text) ── */
  const tooltipEl = document.createElement('div');
  tooltipEl.className = 'ui-tooltip';
  document.body.appendChild(tooltipEl);

  document.querySelectorAll('.has-tooltip').forEach((el) => {
    el.addEventListener('mouseenter', (e) => {
      const text = el.getAttribute('data-tooltip');
      if (!text) return;
      tooltipEl.innerHTML = text;

      // Need width for positioning
      tooltipEl.style.display = 'block';

      const rect = el.getBoundingClientRect();
      const tooltipRect = tooltipEl.getBoundingClientRect();

      let top = rect.bottom + window.scrollY + 8;
      let left = rect.left + window.scrollX + rect.width / 2 - tooltipRect.width / 2;

      if (left < 10) left = 10;
      if (left + tooltipRect.width > document.body.clientWidth - 10) {
        left = document.body.clientWidth - tooltipRect.width - 10;
      }

      tooltipEl.style.top = `${top}px`;
      tooltipEl.style.left = `${left}px`;
      tooltipEl.classList.add('visible');
    });

    el.addEventListener('mouseleave', () => {
      tooltipEl.classList.remove('visible');
    });
  });

  /* ── Micro-Quizzes ── */
  document.querySelectorAll('.micro-quiz').forEach((quiz) => {
    const options = quiz.querySelectorAll('.mq-option');
    const feedback = quiz.querySelector('.mq-feedback');

    options.forEach((opt) => {
      opt.addEventListener('click', () => {
        if (quiz.classList.contains('answered')) return;
        quiz.classList.add('answered');

        const isCorrect = opt.hasAttribute('data-correct');
        opt.classList.add(isCorrect ? 'correct' : 'incorrect');

        if (!isCorrect) {
          const correctOpt = quiz.querySelector('.mq-option[data-correct]');
          if (correctOpt) correctOpt.classList.add('correct');
        }

        if (feedback) {
          feedback.classList.add('visible');
          if (window.MathJax) MathJax.typesetPromise([feedback]);
        }
      });
    });
  });

  /* ── Scrollytelling Interactor ── */
  const scrollySteps = document.querySelectorAll('.scrolly-step');
  if (scrollySteps.length && 'IntersectionObserver' in window) {
    const scrollyObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const container = e.target.closest('.scrolly-text');
            if (container) {
              container
                .querySelectorAll('.scrolly-step')
                .forEach((s) => s.classList.remove('active'));
            }
            e.target.classList.add('active');

            const stepIndex = e.target.getAttribute('data-step');
            const targetId = e.target.closest('.scrolly-container').getAttribute('data-sync');
            if (stepIndex && targetId) {
              window.dispatchEvent(
                new CustomEvent('scrolly-step', {
                  detail: { targetId, step: parseInt(stepIndex) },
                })
              );
            }
          }
        });
      },
      { rootMargin: '-40% 0px -40% 0px' }
    );
    scrollySteps.forEach((s) => scrollyObs.observe(s));
  }
});
