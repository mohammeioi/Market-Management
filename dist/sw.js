const CACHE_NAME = 'pos-system-v2';
const urlsToCache = [
  '/',
  '/manifest.json'
];

// Install
self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate - clean old caches
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.filter(function (cacheName) {
          return cacheName !== CACHE_NAME;
        }).map(function (cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - Network first, fallback to cache
self.addEventListener('fetch', function (event) {
  event.respondWith(
    fetch(event.request)
      .catch(function () {
        return caches.match(event.request);
      })
  );
});

// Push notification received
self.addEventListener('push', function (event) {
  let data = { title: '🔔 طلب جديد!', body: 'تم استلام طلب جديد' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'تم استلام طلب جديد',
    icon: '/app-icon.png',
    badge: '/app-icon.png',
    vibrate: [200, 100, 200],
    tag: 'new-order',
    renotify: true,
    data: data,
    actions: [
      { action: 'open', title: 'فتح الطلبات' },
      { action: 'close', title: 'إغلاق' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '🔔 طلب جديد!', options)
  );
});

// Notification click
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        // If a window is already open, focus it
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if ('focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});