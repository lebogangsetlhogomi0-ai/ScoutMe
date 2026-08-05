importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAdDUv8nApCkZgZJas-XgxqI5Cm20qr2vw",
  authDomain: "scoutme-10.firebaseapp.com",
  projectId: "scoutme-10",
  storageBucket: "scoutme-10.firebasestorage.app",
  messagingSenderId: "1000343432088",
  appId: "1:1000343432088:web:18cddf91845cc0718dd9ed",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "ScoutMe";
  const body = payload.notification?.body || "";
  self.registration.showNotification(title, {
    body,
    icon: '/scoutme_logo.png',
    badge: '/icon-192.png',
    data: payload.data || {},
    vibrate: [200, 100, 200],
  });
});

// ─── PWA Cache (preserved from original sw.js) ───────────────────────────────

const CACHE_NAME = "scoutme-cache-v5";
const STATIC_ASSETS = ["/manifest.json", "/icon-512.png", "/icon-192.png", "/scoutme_logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(cacheNames.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  // For HTML navigation requests — always network first, fall back to cached /index.html
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // For JS/CSS/app files — network first, update cache, fall back to cache
  if (url.origin === self.location.origin && (url.pathname.endsWith(".js") || url.pathname.endsWith(".css"))) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // For static assets (images, icons) — cache first
  if (STATIC_ASSETS.some(a => url.pathname === a) || url.pathname.match(/\.(png|jpg|svg|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }
});
