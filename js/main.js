/* ============================================================
   QUANTUM NOTES — MAIN.JS
   Navigation, reading progress, sidebar, section tracking
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  /* ── Mobile sidebar drawer + stable demo layout ── */
  const nav = document.querySelector('.nav');
  const sidebar = document.querySelector('.sidebar');
  const navLinks = document.querySelector('.nav-links');
  let sidebarToggle = null;
  let backdrop = null;

  function buildStableVizFrame(container) {
    if (container.querySelector('.viz-mobile-viewport')) return;

    const viewport = document.createElement('div');
    viewport.className = 'viz-mobile-viewport';

    const stage = document.createElement('div');
    stage.className = 'viz-mobile-stage';

    while (container.firstChild) {
      stage.appendChild(container.firstChild);
    }

    viewport.appendChild(stage);
    container.appendChild(viewport);

    const syncScale = () => {
      if (window.innerWidth > 900) {
        viewport.style.height = '';
        stage.style.width = '';
        stage.style.transform = '';
        return;
      }

      stage.style.width = '';
      stage.style.transform = '';
      viewport.style.height = '';

      const naturalWidth = Math.max(stage.scrollWidth, 480);
      const naturalHeight = stage.scrollHeight;
      const availableWidth = viewport.clientWidth;
      const scale = naturalWidth > 0 ? Math.min(1, availableWidth / naturalWidth) : 1;

      stage.style.width = `${naturalWidth}px`;
      stage.style.transform = `scale(${scale})`;
      viewport.style.height = `${Math.ceil(naturalHeight * scale)}px`;
    };

    const ro = new ResizeObserver(syncScale);
    ro.observe(container);
    window.addEventListener('resize', syncScale, { passive: true });
    syncScale();
  }

  document.querySelectorAll('.viz-container').forEach((container) => {
    const hasLargeCanvas = Array.from(container.querySelectorAll('canvas')).some((canvas) => {
      const declaredWidth = parseInt(canvas.getAttribute('width') || '0', 10);
      const inlineWidth = canvas.getAttribute('style') || '';
      const rect = canvas.getBoundingClientRect();
      const isResponsiveCanvas = inlineWidth.includes('width: 100%') || inlineWidth.includes('width:100%');
      if (declaredWidth >= 420 || isResponsiveCanvas) {
        canvas.classList.add('stable-viz-canvas');
        return true;
      }
      return rect.width >= 420;
    });

    const hasWideLayout = Boolean(
      container.querySelector(
        '[style*="grid-template-columns"], [style*="display:flex"], svg, .grover-controls'
      )
    );

    if (hasLargeCanvas || hasWideLayout) {
      container.setAttribute('data-stable-layout', 'true');
      buildStableVizFrame(container);
    }
  });

  if (nav && sidebar) {
    sidebar.id ||= 'page-sidebar';
    const pageTitle = document.querySelector('.hero-title')?.textContent?.replace(/\s+/g, ' ').trim();
    const pageSubtitle = document.querySelector('.hero-subtitle')?.textContent
      ?.replace(/\s+/g, ' ')
      .trim();
    const weekLinksHtml = Array.from(document.querySelectorAll('.nav-links a'))
      .map(
        (link) => `
          <a href="${link.getAttribute('href')}" class="sidebar-week-link ${link.className}">
            <span class="week-dot"></span>
            <span>${link.textContent.trim()}</span>
          </a>
        `
      )
      .join('');
    const sidebarInner = sidebar.querySelector('.sidebar-inner');

    if (sidebarInner && !sidebarInner.querySelector('.sidebar-mobile-header')) {
      const mobileHeader = document.createElement('div');
      mobileHeader.className = 'sidebar-mobile-header';
      mobileHeader.innerHTML = `
        <span class="sidebar-mobile-kicker">Navigate</span>
        <div class="sidebar-mobile-title">${pageTitle || 'Contents'}</div>
        ${pageSubtitle ? `<div class="sidebar-mobile-subtitle">${pageSubtitle}</div>` : ''}
      `;
      sidebarInner.prepend(mobileHeader);

      if (weekLinksHtml) {
        const weekLinks = document.createElement('div');
        weekLinks.className = 'sidebar-week-links';
        weekLinks.innerHTML = weekLinksHtml;
        mobileHeader.insertAdjacentElement('afterend', weekLinks);
      }
    }

    sidebarToggle = document.createElement('button');
    sidebarToggle.type = 'button';
    sidebarToggle.className = 'nav-sidebar-toggle';
    sidebarToggle.setAttribute('aria-label', 'Open page contents');
    sidebarToggle.setAttribute('aria-controls', sidebar.id);
    sidebarToggle.setAttribute('aria-expanded', 'false');
    sidebarToggle.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
        <path d="M4 7h16M4 12h16M4 17h16"></path>
      </svg>
      <span class="nav-sidebar-toggle-label">Topics</span>
    `;

    backdrop = document.createElement('div');
    backdrop.className = 'mobile-sidebar-backdrop';
    backdrop.hidden = true;
    document.body.appendChild(backdrop);

    nav.insertBefore(sidebarToggle, navLinks || null);

    const closeSidebar = () => {
      sidebar.classList.remove('mobile-open');
      document.body.classList.remove('sidebar-open');
      sidebarToggle.setAttribute('aria-expanded', 'false');
      if (backdrop) {
        backdrop.classList.remove('visible');
        backdrop.hidden = true;
      }
    };

    const openSidebar = () => {
      sidebar.classList.add('mobile-open');
      document.body.classList.add('sidebar-open');
      sidebarToggle.setAttribute('aria-expanded', 'true');
      if (backdrop) {
        backdrop.hidden = false;
        window.requestAnimationFrame(() => backdrop.classList.add('visible'));
      }
    };

    sidebarToggle.addEventListener('click', () => {
      const isOpen = sidebar.classList.contains('mobile-open');
      if (isOpen) closeSidebar();
      else openSidebar();
    });

    backdrop.addEventListener('click', closeSidebar);
    sidebar.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeSidebar));
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && sidebar.classList.contains('mobile-open')) closeSidebar();
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) closeSidebar();
    });
  }

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
