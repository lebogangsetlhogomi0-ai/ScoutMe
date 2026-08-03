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

const CACHE_NAME = "scoutme-cache-v3";
const ASSETS_TO_CACHE = ["/", "/index.html", "/manifest.json", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((fetchResponse) => {
        if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== "basic") return fetchResponse;
        const responseToCache = fetchResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        return fetchResponse;
      }).catch(() => {});
    })
  );
});
