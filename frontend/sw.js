const CACHE='bk-rm-v4';
const ASSETS=['./login.html','./css/style.css','./js/supabase.js','./js/auth.js','./js/utils.js','./js/db.js','./js/app.js','./assets/logo.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k!==CACHE).map(k => caches.delete(k)))));
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('./login.html'))));
});
