const STATIC_CACHE = "lifetalk-static-v20260423-githubpwa-62";
const SENSEVOICE_CACHE = "lifetalk-sensevoice-v20260423-githubpwa-62";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./pwa-icon.svg",
  "./pwa-icon-192.png",
  "./pwa-icon-512.png",
];

const isSameOrigin = (requestUrl) => {
  try {
    return new URL(requestUrl).origin === self.location.origin;
  } catch {
    return false;
  }
};

const isSenseVoiceRequest = (requestUrl) => {
  try {
    const url = new URL(requestUrl);
    return url.origin === self.location.origin && url.pathname.includes("/vendor/sensevoice/");
  } catch {
    return false;
  }
};

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.all(
        STATIC_ASSETS.map((asset) =>
          cache.add(asset).catch(() => null),
        ),
      ),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key === STATIC_CACHE || key === SENSEVOICE_CACHE) return null;
            return caches.delete(key);
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!request || request.method !== "GET" || !isSameOrigin(request.url)) return;

  if (isSenseVoiceRequest(request.url)) {
    event.respondWith(
      caches.open(SENSEVOICE_CACHE).then(async (cache) => {
        const cached = await cache.match(request, { ignoreSearch: true });
        if (cached) return cached;
        const response = await fetch(request);
        if (response && response.ok) {
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, response.clone()).catch(() => {}));
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(STATIC_CACHE);
          return (
            (await cache.match(request, { ignoreSearch: true })) ||
            (await cache.match("./index.html"))
          );
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const targetCache = request.destination === "document" ? STATIC_CACHE : STATIC_CACHE;
            caches.open(targetCache).then((cache) => cache.put(request, response.clone()).catch(() => {}));
          }
          return response;
        })
        .catch(() => cached);
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  const notification = event?.notification;
  const data = notification?.data && typeof notification.data === "object" ? notification.data : {};
  const roleId = String(data.roleId || "").trim();
  const targetUrl = String(data.targetUrl || "./").trim() || "./";
  notification?.close?.();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windowClients) => {
      const normalizedTargetOrigin = (() => {
        try {
          return new URL(targetUrl, self.location.origin).origin;
        } catch {
          return self.location.origin;
        }
      })();
      const matchedClient =
        windowClients.find((client) => {
          try {
            return new URL(client.url).origin === normalizedTargetOrigin;
          } catch {
            return true;
          }
        }) || windowClients[0];

      if (matchedClient) {
        try {
          await matchedClient.focus();
        } catch (error) {
          void error;
        }
        try {
          matchedClient.postMessage({
            type: "lifetalk-notification-click",
            roleId,
            targetUrl,
          });
        } catch (error) {
          void error;
        }
        return;
      }

      if (clients.openWindow) {
        await clients.openWindow(targetUrl);
      }
    }),
  );
});
