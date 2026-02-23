const CACHE_NAME = 'combustibil-v2'; // Modifici versiunea aici (v3, v4) la fiecare actualizare
const resurse = [
  '/calculator-combustibil/',
  '/calculator-combustibil/index.html',
  '/calculator-combustibil/app.js',
  '/calculator-combustibil/manifest.json'
];

self.addEventListener('install', (eveniment) => {
  self.skipWaiting(); // Forțează instalarea imediată
  eveniment.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(resurse);
    })
  );
});

self.addEventListener('activate', (eveniment) => {
  eveniment.waitUntil(
    caches.keys().then((numeCacheUri) => {
      return Promise.all(
        numeCacheUri.map((nume) => {
          if (nume !== CACHE_NAME) {
            return caches.delete(nume); // Șterge versiunile vechi
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (eveniment) => {
  eveniment.respondWith(
    caches.match(eveniment.request).then((raspuns) => {
      return raspuns || fetch(eveniment.request);
    })
  );
});
