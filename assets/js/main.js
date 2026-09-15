/* ═══════════════════════════════════════════════════════════
   BRIAN NABAVI — interactions, tick nav, form, PWA wiring
   Vanilla JS, no dependencies.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Header morph: transparent → solid past 50% of first viewport ── */
  var header = document.getElementById('site-header');
  var morphPoint = function () { return window.innerHeight * 0.5; };
  var onScrollHeader = function () {
    header.classList.toggle('is-solid', window.scrollY > morphPoint());
  };
  onScrollHeader();
  window.addEventListener('scroll', onScrollHeader, { passive: true });

  /* ── Full-screen nav overlay ── */
  var toggle = document.getElementById('nav-toggle');
  var overlay = document.getElementById('nav-overlay');
  var setOverlay = function (open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    overlay.setAttribute('aria-hidden', String(!open));
    overlay.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', function () {
    setOverlay(toggle.getAttribute('aria-expanded') !== 'true');
  });
  overlay.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOverlay(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) setOverlay(false);
  });

  /* ── Build tick navigation from [data-tick] sections ── */
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-tick]'));
  var tickNav = document.getElementById('tick-nav');
  var ticks = sections.map(function (sec) {
    var a = document.createElement('a');
    a.className = 'tick';
    a.href = '#' + sec.id;
    a.dataset.label = sec.getAttribute('data-tick');
    a.setAttribute('aria-label', 'Jump to ' + sec.getAttribute('data-tick'));
    tickNav.appendChild(a);
    return a;
  });

  /* ── Active-section tracking (tick nav) ── */
  if ('IntersectionObserver' in window) {
    var activeTick = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var i = sections.indexOf(entry.target);
          ticks.forEach(function (t, j) { t.classList.toggle('is-active', i === j); });
        }
      });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    sections.forEach(function (s) { activeTick.observe(s); });
  }

  /* ── Reveal-on-scroll (once) ── */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          revealIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { revealIO.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ── Manifesto stagger ── */
  var stack = document.getElementById('manifesto-stack');
  if (stack) {
    if ('IntersectionObserver' in window && !reduceMotion) {
      var stackIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            stack.classList.add('in');
            stackIO.disconnect();
          }
        });
      }, { threshold: 0.35 });
      stackIO.observe(stack);
    } else {
      stack.classList.add('in');
    }
  }

  /* ── Application form: validate → mailto (static hosting) ──
     FORMSPREE SWAP: point the <form> action at your Formspree endpoint,
     keep method="POST", and delete the buildMailto() call below. */
  var form = document.getElementById('apply-form');
  var success = document.getElementById('form-success');
  // TODO: replace with Brian's preferred inbox.
  var APPLY_EMAIL = 'brian@briannabavi.com';

  var fields = {
    name:    { el: document.getElementById('f-name'),    err: document.getElementById('err-name'),
               test: function (v) { return v.trim().length >= 2 || 'NAME REQUIRED'; } },
    email:   { el: document.getElementById('f-email'),   err: document.getElementById('err-email'),
               test: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'VALID EMAIL REQUIRED'; } },
    goal:    { el: document.getElementById('f-goal'),    err: document.getElementById('err-goal'),
               test: function (v) { return !!v || 'CHOOSE ONE'; } },
    message: { el: document.getElementById('f-message'), err: document.getElementById('err-message'),
               test: function (v) { return v.trim().length >= 10 || 'TELL ME A LITTLE MORE (10+ CHARACTERS)'; } }
  };

  var validateField = function (key) {
    var f = fields[key];
    var result = f.test(f.el.value);
    var wrap = f.el.closest('.field');
    if (result === true) {
      wrap.classList.remove('is-invalid');
      f.err.textContent = '';
      f.el.removeAttribute('aria-invalid');
      return true;
    }
    wrap.classList.add('is-invalid');
    f.err.textContent = result;
    f.el.setAttribute('aria-invalid', 'true');
    return false;
  };

  Object.keys(fields).forEach(function (key) {
    fields[key].el.addEventListener('blur', function () { validateField(key); });
    fields[key].el.addEventListener('input', function () {
      if (fields[key].el.closest('.field').classList.contains('is-invalid')) validateField(key);
    });
  });

  var buildMailto = function () {
    var subject = 'Coaching application — ' + fields.name.el.value.trim();
    var body = [
      'Name: ' + fields.name.el.value.trim(),
      'Email: ' + fields.email.el.value.trim(),
      'Phone: ' + (document.getElementById('f-phone').value.trim() || '—'),
      'Building: ' + fields.goal.el.value,
      '',
      fields.message.el.value.trim()
    ].join('\n');
    return 'mailto:' + APPLY_EMAIL +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
  };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = Object.keys(fields).map(validateField).every(Boolean);
    if (!ok) {
      var firstBad = form.querySelector('.is-invalid input, .is-invalid select, .is-invalid textarea');
      if (firstBad) firstBad.focus();
      return;
    }
    window.location.href = buildMailto();
    success.hidden = false;
  });

  /* ── PWA: install prompt ── */
  var installBtn = document.getElementById('install-btn');
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
  });
  installBtn.addEventListener('click', function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.finally(function () {
      deferredPrompt = null;
      installBtn.hidden = true;
    });
  });
  window.addEventListener('appinstalled', function () {
    installBtn.hidden = true;
    deferredPrompt = null;
  });

  /* ── Service worker: register + update toast ── */
  if ('serviceWorker' in navigator) {
    var toast = document.getElementById('sw-toast');
    var reloadBtn = document.getElementById('sw-reload');
    var refreshing = false;

    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
    reloadBtn.addEventListener('click', function () {
      navigator.serviceWorker.getRegistration().then(function (reg) {
        if (reg && reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
        else window.location.reload();
      });
    });

    // Only treat a new worker as an "update" when this page was already
    // controlled at load time — never nag on the first-ever visit.
    var hadController = !!navigator.serviceWorker.controller;

    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        if (!hadController) return;
        reg.addEventListener('updatefound', function () {
          var worker = reg.installing;
          if (!worker) return;
          worker.addEventListener('statechange', function () {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              toast.hidden = false;
            }
          });
        });
      }).catch(function () { /* offline-first still works via HTTP cache */ });
    });
  }
})();
