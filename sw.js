const CACHE_NAME = 'combustibil-v1';
const resurse = [
  '/calculator-combustibil/',
  '/calculator-combustibil/index.html',
  '/calculator-combustibil/app.js',
  '/calculator-combustibil/manifest.json'
];

self.addEventListener('install', (eveniment) => {
  eveniment.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(resurse);
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
