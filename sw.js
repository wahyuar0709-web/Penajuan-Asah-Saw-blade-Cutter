// Service Worker: halaman tetap bisa dibuka offline. POST (kirim data) tidak pernah di-cache.
// Strategi: NETWORK-FIRST untuk semua file milik app (index.html, manifest, icon, dst) -> update
// otomatis tanpa hapus cache. Cache hanya dipakai saat offline. Font: cache-first (jarang berubah).
var V = 'pa-v18';
var SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(V)
      .then(function (cache) {
        // cache:'reload' = lewati cache HTTP browser/GitHub Pages (max-age 10 menit) agar tidak menyimpan versi basi
        return Promise.all(SHELL.map(function (u) {
          // best-effort: gagal unduh satu file TIDAK boleh membatalkan instalasi SW baru (dulu bisa membuat HP macet di versi lama)
          return fetch(new Request(u, { cache: 'reload' })).then(function (r) { if (r.ok) return cache.put(u, r); }).catch(function () {});
        }));
      })
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
      .then(pindahkanHalamanLama)
  );
});

/* Halaman lama (kode lama tidak tahu cara memperbarui diri) tidak menjawab ping -> dimuat ulang paksa
   supaya langsung dapat versi baru. Halaman baru menjawab ping dan memperbarui dirinya sendiri
   (menunggu form kosong / menyimpan draft). Halaman yang beku di latar belakang juga ikut dimuat ulang. */
function hidup(client) {
  return new Promise(function (resolve) {
    var ch = new MessageChannel();
    var t = setTimeout(function () { resolve(false); }, 1500);
    ch.port1.onmessage = function () { clearTimeout(t); resolve(true); };
    try { client.postMessage({ type: 'pa-ping' }, [ch.port2]); } catch (err) { clearTimeout(t); resolve(false); }
  });
}
function pindahkanHalamanLama() {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: false }).then(function (list) {
    return Promise.all(list.map(function (c) {
      return hidup(c).then(function (ok) {
        if (!ok && 'navigate' in c) return c.navigate(c.url).catch(function () {});
      });
    }));
  }).catch(function () {});
}

function networkFirst(request, fallbackKey) {
  return fetch(request, { cache: 'no-store' }).then(function (response) {
    if (response && response.ok) {
      var copy = response.clone();
      caches.open(V).then(function (cache) { cache.put(fallbackKey || request, copy); });
    }
    return response;
  }).catch(function () {
    return caches.match(fallbackKey || request).then(function (hit) { return hit || caches.match('./index.html'); });
  });
}

self.addEventListener('fetch', function (e) {
  var request = e.request;
  if (request.method !== 'GET') return;

  var url = new URL(request.url);
  if (url.hostname === 'script.google.com' || url.hostname.endsWith('googleusercontent.com') || url.hostname === 'nominatim.openstreetmap.org') return;

  // Halaman utama: selalu coba jaringan dulu, simpan sebagai ./index.html untuk offline
  if (request.mode === 'navigate') {
    e.respondWith(networkFirst(request, './index.html'));
    return;
  }

  // File milik app sendiri (manifest, icon, index.html hasil fetch cek-versi): network-first juga
  if (url.origin === self.location.origin) {
    e.respondWith(networkFirst(request));
    return;
  }

  // Font & aset pihak ketiga: cache-first
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
