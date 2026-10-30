/* Service worker: la app y los datos funcionan sin internet; los mosaicos del mapa se guardan al verlos */
const VERSION = 'v35';
const SHELL = 'shell-' + VERSION;
const TILES = 'tiles-v1';
const ASSETS = [
  './', 'index.html', 'css/app.css', 'js/app.js', 'js/map.js', 'js/kml.js', 'js/db.js', 'js/vector.js', 'js/geo.js', 'js/excel.js', 'js/config.js', 'js/cloud.js',
  'lib/jszip.min.js', 'data/seed.json', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'
];
const TILE_HOSTS = /(basemaps\.cartocdn\.com|arcgisonline\.com|tile\.openstreetmap\.org)$/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('shell-') && k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

let putCount = 0;
async function trimTiles(cache) {
  const keys = await cache.keys();
  if (keys.length > 9000) for (const k of keys.slice(0, keys.length - 8000)) await cache.delete(k);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.pathname.indexOf('/mapa/') >= 0) return; // archivo grande de mapa: lo lee la app por partes

  if (TILE_HOSTS.test(url.hostname)) {
    e.respondWith((async () => {
      const cache = await caches.open(TILES);
      const hit = await cache.match(req.url, { ignoreVary: true });
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res && res.ok) { cache.put(req.url, res.clone()); if (++putCount % 150 === 0) trimTiles(cache); }
        return res;
      } catch (err) { return Response.error(); }
    })());
    return;
  }

  if (url.origin === location.origin) {
    // Primero lo guardado (rápido y sin internet); se actualiza en segundo plano
    e.respondWith((async () => {
      const cache = await caches.open(SHELL);
      const hit = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
      if (hit) { e.waitUntil(net); return hit; }
      const res = await net;
      if (res) return res;
      if (req.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
      return Response.error();
    })());
  }
});
