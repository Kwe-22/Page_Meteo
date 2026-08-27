/* ================================================================
   Service Worker — Météo Pêche PWA
   Cache la coquille (HTML + manifest) pour un démarrage rapide.
   Les données météo/marées sont toujours récupérées en live.
   ================================================================ */
const CACHE_NAME = 'meteo-peche-v1';
const SHELL = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

/* — Installation : mise en cache de la coquille ————————————————— */
self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

/* — Activation : suppression des anciens caches ————————————————— */
self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* — Fetch : réseau d'abord, cache en fallback ———————————————————
   Les API externes (open-meteo, api-maree.fr, windy…) passent
   toujours par le réseau. Seuls les fichiers de la coquille
   ont un fallback cache. */
self.addEventListener('fetch', evt => {
  const url = new URL(evt.request.url);

  // Requêtes cross-origin (APIs, Windy…) → réseau uniquement
  if (url.origin !== self.location.origin) return;

  evt.respondWith(
    fetch(evt.request)
      .then(response => {
        // Mettre à jour le cache avec la réponse fraîche
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(evt.request, clone));
        return response;
      })
      .catch(() => caches.match(evt.request))
  );
});
