// Service Worker: halaman & font tetap bisa dibuka offline. POST (kirim data) tidak pernah di-cache.
var V = 'pa-v8';
var SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(V)
      .then(function (cache) { return cache.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (key) { return key !== V; }).map(function (key) { return caches.delete(key); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var request = e.request;
  if (request.method !== 'GET') return;

  var url = new URL(request.url);
  if (url.hostname === 'script.google.com' || url.hostname.endsWith('googleusercontent.com') || url.hostname === 'nominatim.openstreetmap.org') return;

  // Network-first untuk halaman agar update tersedia; cache-first untuk aset lain/font.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request, { cache: 'no-store' }).then(function (response) {
        var copy = response.clone();
        caches.open(V).then(function (cache) { cache.put('./index.html', copy); });
        return response;
      }).catch(function () {
        return caches.match('./index.html');
      })
    );
    return;
  }

  e.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response.ok) {
          var copy = response.clone();
          caches.open(V).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      });
    })
  );
});
