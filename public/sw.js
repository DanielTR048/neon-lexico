/* Only registered by the production build. All paths are relative to its scope. */
const CACHE_PREFIX = 'neon-lexico-offline-';
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const ROOT = new URL('./', self.location.href);
const ASSET = /\.(?:js|css|woff2?|ttf|otf|png|svg|webp|ico|webmanifest)(?:[?#]|$)/i;

function localUrl(path, base = ROOT) {
  try {
    const url = new URL(path, base);
    if (url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return null;
    return url;
  } catch { return null; }
}

async function precacheShell() {
  const cache = await caches.open(CACHE_NAME);
  const shell = await fetch(new Request(ROOT, { cache: 'reload' }));
  if (!shell.ok) throw new Error('Não foi possível guardar o aplicativo offline.');
  const html = await shell.clone().text();
  await cache.put(ROOT, shell.clone());
  await cache.put(new URL('index.html', ROOT), shell);
  const pending = [
    'manifest.webmanifest', 'icon.svg', 'icon-maskable.svg',
    'icon-192.png', 'icon-512.png', 'icon-maskable-512.png',
    ...Array.from(html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi), match => match[1]),
  ].map(path => localUrl(path)).filter(url => url && ASSET.test(url.href));
  const visited = new Set();
  while (pending.length) {
    const url = pending.shift();
    if (!url || visited.has(url.href)) continue;
    visited.add(url.href);
    const response = await fetch(new Request(url, { cache: 'reload' }));
    if (!response.ok) throw new Error(`Falha no arquivo offline: ${url.pathname}`);
    await cache.put(url, response.clone());
    if (/\.(?:css|js)$/.test(url.pathname)) {
      const source = await response.text();
      // Vite bundles, static/dynamic imports, CSS @import and local font/image URLs.
      const references = /\.css$/.test(url.pathname)
        ? Array.from(source.matchAll(/(?:url\(\s*["']?|@import\s*["'])([^\s"'()]+)["']?\s*\)?/g), match => match[1])
        : Array.from(source.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g), match => match[1]);
      for (const path of references) {
        const nested = localUrl(path, url);
        if (nested && ASSET.test(nested.href)) pending.push(nested);
      }
    }
  }
}

self.addEventListener('install', event => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = localUrl(event.request.url);
  if (!url) return;
  // An APK download must never replace the HTML navigation fallback.
  if (/\.apk$/i.test(url.pathname)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          await cache.put(ROOT, response.clone());
          return response;
        }
        return (await cache.match(ROOT)) || response;
      } catch {
        return (await cache.match(ROOT)) || Response.error();
      }
    })());
  } else if (ASSET.test(url.href)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      // Public, same-origin build assets are identical for every caller. Preview
      // servers may send Vary: Origin, while crossorigin script/style requests
      // include Origin and our precache requests do not. Match those by URL.
      const stored = await cache.match(event.request, { ignoreVary: true });
      if (stored) return stored;
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    })());
  }
});
