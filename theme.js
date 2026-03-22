/* ═══════════════════════════════════════════════
   I2QC — Shared Theme & Sidebar JavaScript
   ═══════════════════════════════════════════════ */

(function() {
  'use strict';

  // ── Theme Management ──────────────────────────
  const STORAGE_KEY = 'i2qc-theme';

  function getPreferredTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    updateThemeIcon(theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  }

  function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  }

  // Apply theme immediately to prevent flash
  applyTheme(getPreferredTheme());

  // ── Sidebar Management (Week pages) ───────────
  function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const toggle = document.getElementById('sidebar-toggle-btn');
    if (!sidebar || !toggle) return;

    function openSidebar() {
      sidebar.classList.add('open');
      if (overlay) {
        overlay.style.display = 'block';
        requestAnimationFrame(() => overlay.classList.add('visible'));
      }
      document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
      sidebar.classList.remove('open');
      if (overlay) {
        overlay.classList.remove('visible');
        setTimeout(() => { overlay.style.display = 'none'; }, 300);
      }
      document.body.style.overflow = '';
    }

    toggle.addEventListener('click', () => {
      if (sidebar.classList.contains('open')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });

    if (overlay) {
      overlay.addEventListener('click', closeSidebar);
    }

    // Close sidebar when a link is clicked (mobile)
    sidebar.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 900) {
          closeSidebar();
        }
      });
    });

    // Close sidebar on window resize if desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) {
        closeSidebar();
      }
    });
  }

  // ── Sidebar scroll highlight ─────────────────
  function initScrollHighlight() {
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('nav#sidebar a');
    if (!sections.length || !navLinks.length) return;

    window.addEventListener('scroll', () => {
      let cur = '';
      sections.forEach(s => {
        if (window.scrollY >= s.offsetTop - 100) cur = s.id;
      });
      navLinks.forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === '#' + cur);
      });
    });
  }

  // ── Init on DOM ready ────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    // Attach theme toggle
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', toggleTheme);
      updateThemeIcon(getPreferredTheme());
    }

    // Init sidebar
    initSidebar();
    initScrollHighlight();
  });

  // Listen for system theme change
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      applyTheme(e.matches ? 'light' : 'dark');
    }
  });

})();
