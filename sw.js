/* Service worker — Patrimoine Famille */
const VERSION = 'pf-v1.4.2';
const COQUILLE = ['/', '/index.html', '/styles.css', '/app.js', '/config.js', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];
const CDN = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(COQUILLE).then(() => Promise.all(CDN.map(u => c.add(u).catch(() => {}))))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.hostname.endsWith('supabase.co')) return;           // données : toujours en ligne
  if (r.mode === 'navigate') {                                                    // pages : réseau puis cache
    e.respondWith(fetch(r).then(res => { caches.open(VERSION).then(c => c.put('/index.html', res.clone())); return res; }).catch(() => caches.match('/index.html')));
    return;
  }
  e.respondWith(caches.match(r).then(hit => {                                      // fichiers : cache puis mise à jour
    const net = fetch(r).then(res => { if (res.ok && (u.origin === location.origin || CDN.includes(r.url) || u.hostname.includes('fonts.g'))) caches.open(VERSION).then(c => c.put(r, res.clone())); return res; }).catch(() => hit);
    return hit || net;
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow('/')));
});
