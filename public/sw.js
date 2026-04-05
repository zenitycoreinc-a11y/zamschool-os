const STATIC_CACHE = "zamschool-static-v1";
const ROUTE_CACHE = "zamschool-routes-v1";
const API_CACHE = "zamschool-api-v1";
const OFFLINE_FALLBACK_URL = "/offline";

const CORE_PAGE_URLS = [
  "/app/dashboard",
  "/app/admin/users",
  "/app/admin/fees",
  "/app/admin/finance",
  "/app/announcements",
];

const CORE_API_URLS = [
  "/api/admin/users",
  "/api/admin/classes",
  "/api/admin/subjects",
  "/api/admin/finance",
  "/api/admin/payments",
  "/api/admin/announcements",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(ROUTE_CACHE).then((cache) => cache.addAll([OFFLINE_FALLBACK_URL]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (isCoreApiPath(url.pathname)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  if (isStaticAssetRequest(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
  }
});

async function handleNavigationRequest(request) {
  const url = new URL(request.url);

  try {
    const response = await fetch(request);

    if (response.ok && isCorePagePath(url.pathname)) {
      const cache = await caches.open(ROUTE_CACHE);
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    if (isCorePagePath(url.pathname)) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    const fallback = await caches.match(OFFLINE_FALLBACK_URL);
    return fallback || Response.error();
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    return Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        void cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cachedResponse || networkPromise || Response.error();
}

function isCorePagePath(pathname) {
  return CORE_PAGE_URLS.includes(pathname);
}

function isCoreApiPath(pathname) {
  return CORE_API_URLS.includes(pathname);
}

function isStaticAssetRequest(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".woff2")
  );
}
