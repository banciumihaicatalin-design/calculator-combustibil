const CACHE_NAME = 'motorina-v1';
const resurse = [
  '/calculator-motorina/',
  '/calculator-motorina/index.html',
  '/calculator-motorina/app.js',
  '/calculator-motorina/manifest.json'
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
      // Returnează fișierul salvat local sau îl descarcă de pe internet
      return raspuns || fetch(eveniment.request);
    })
  );
});