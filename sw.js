// Service Worker: halaman & font tetap bisa dibuka offline. POST (kirim data) tidak pernah di-cache.
var V = 'pa-v1', SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg'];
self.addEventListener('install', function(e){ e.waitUntil(caches.open(V).then(function(c){ return c.addAll(SHELL); }).then(function(){ return self.skipWaiting(); })); });
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k !== V; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  var r = e.request;
  if(r.method !== 'GET') return;
  var u = new URL(r.url);
  if(u.hostname === 'script.google.com' || u.hostname.endsWith('googleusercontent.com') || u.hostname === 'nominatim.openstreetmap.org') return;
  // network-first untuk halaman (dapat update), cache-first untuk font
  if(r.mode === 'navigate'){
    e.respondWith(fetch(r).then(function(res){ var cp = res.clone(); caches.open(V).then(function(c){ c.put('./index.html', cp); }); return res; })
      .catch(function(){ return caches.match('./index.html'); }));
    return;
  }
  e.respondWith(caches.match(r).then(function(hit){
    return hit || fetch(r).then(function(res){ if(res.ok){ var cp = res.clone(); caches.open(V).then(function(c){ c.put(r, cp); }); } return res; });
  }));
});
