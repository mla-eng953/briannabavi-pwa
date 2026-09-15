/* Brian Nabavi — service worker
   Precache app shell + runtime caching. Bump VERSION on every deploy. */
'use strict';

var VERSION = 'bn-v1.0.0';
var PRECACHE = VERSION + '-shell';
var RUNTIME_IMG = VERSION + '-img';

var SHELL = [
  './',
  './index.html',
  './offline.html',
  './manifest.webmanifest',
  './assets/css/main.css',
  './assets/js/main.js',
  './assets/fonts/cormorantgaramond-var.woff2',
  './assets/fonts/cormorantgaramond-italic-var.woff2',
  './assets/fonts/oswald-var.woff2',
  './assets/fonts/ibmplexmono-400.woff2',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/favicon-32.png',
  './assets/img/hero-main.jpg',
  './assets/img/about-portrait.jpg',
  './assets/img/feature-about.jpg',
  './assets/img/feature-coaching.jpg',
  './assets/img/feature-podcast.jpg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(PRECACHE).then(function (cache) { return cache.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== PRECACHE && key !== RUNTIME_IMG) return caches.delete(key);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (event) {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // let the network handle cross-origin (Shopify, Apple)

  // Documents: network-first, fall back to cache, then offline page.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(PRECACHE).then(function (cache) { cache.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (cached) {
          return cached || caches.match('./index.html').then(function (home) {
            return home || caches.match('./offline.html');
          });
        });
      })
    );
    return;
  }

  // Images: cache-first with runtime fill.
  if (req.destination === 'image') {
    event.respondWith(
      caches.match(req).then(function (cached) {
        if (cached) return cached;
        return fetch(req).then(function (res) {
          if (res.ok) {
            var copy = res.clone();
            caches.open(RUNTIME_IMG).then(function (cache) { cache.put(req, copy); });
          }
          return res;
        });
      })
    );
    return;
  }

  // Everything else same-origin (css/js/fonts): stale-while-revalidate.
  event.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res.ok) {
          var copy = res.clone();
          caches.open(PRECACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});
