// sw.js – Service Worker für QUESTSYSTEM
const CACHE = 'questsystem-v1';
const ASSETS = [
  './',
  './index.html',
  './map.html',
  './module.html',
  './modules.html',
  './styles.css',
  './map.js',
  './module.js',
  './modules.js',
  './nav.js',
  './MODULES/modules.json',
  './404.html'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
