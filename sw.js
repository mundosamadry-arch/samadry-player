/* ==========================================================================
   SAMADRY PLAYER - SERVICE WORKER
   Caché offline para que la música y la app funcionen sin conexión.
   ========================================================================== */

// Sube este número cuando cambies el contenido del propio SW para forzar
// la limpieza de cachés antiguas. El contenido de la app (app.js, index.html)
// se actualiza solo gracias a la estrategia network-first.
const CACHE_VERSION = "samadry-v4";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const AUDIO_CACHE = `${CACHE_VERSION}-audio`;

// Archivos base de la app (app shell)
const SHELL_ASSETS = [
    "./",
    "./index.html",
    "./app.js",
    "./index.css",
    "./catalogo.html",
    "./manifest.json",
    "./icon.svg"
];

// --- INSTALL: pre-cachear el app shell ---
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE)
            .then((cache) => cache.addAll(SHELL_ASSETS))
            .catch((err) => console.warn("SW: fallo al precachear shell", err))
            .then(() => self.skipWaiting())
    );
});

// --- ACTIVATE: borrar cachés de versiones antiguas ---
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => !k.startsWith(CACHE_VERSION))
                    .map((k) => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

function isAudioRequest(pathname) {
    return /\.(mp3|wav|ogg|oga|m4a|aac|flac)$/i.test(pathname);
}

// --- FETCH: estrategias de caché ---
self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;

    const url = new URL(req.url);

    // 1. AUDIO → cache-first (los MP3 no cambian; se guardan al reproducirse)
    if (isAudioRequest(url.pathname)) {
        event.respondWith(
            caches.open(AUDIO_CACHE).then(async (cache) => {
                const hit = await cache.match(req);
                if (hit) return hit;
                try {
                    const res = await fetch(req);
                    if (res.ok) cache.put(req, res.clone());
                    return res;
                } catch (err) {
                    return hit || Response.error();
                }
            })
        );
        return;
    }

    // 2. JSON (playlists.json, sfx-manifest.json) → network-first
    if (url.pathname.endsWith(".json")) {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    if (res.ok && url.origin === self.location.origin) {
                        const copy = res.clone();
                        caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
                    }
                    return res;
                })
                .catch(() => caches.match(req))
        );
        return;
    }

    // 3. APP SHELL / navegación → network-first con fallback a caché
    event.respondWith(
        fetch(req)
            .then((res) => {
                if (res.ok && url.origin === self.location.origin) {
                    const copy = res.clone();
                    caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
                }
                return res;
            })
            .catch(() => caches.match(req).then((r) => {
                if (r) return r;
                if (req.mode === "navigate") return caches.match("./index.html");
                return Response.error();
            }))
    );
});

// --- MENSAJES: pre-cachear audio bajo demanda (botón "Descargar para offline") ---
self.addEventListener("message", (event) => {
    const data = event.data || {};

    if (data.type === "PRECACHE_AUDIO" && Array.isArray(data.urls)) {
        event.waitUntil((async () => {
            const cache = await caches.open(AUDIO_CACHE);
            const total = data.urls.length;
            let done = 0;
            let failed = 0;

            for (const u of data.urls) {
                try {
                    const existing = await cache.match(u);
                    if (!existing) {
                        const res = await fetch(u);
                        if (res.ok) await cache.put(u, res.clone());
                        else failed++;
                    }
                } catch (e) {
                    failed++;
                }
                done++;
                const clients = await self.clients.matchAll();
                clients.forEach((c) => c.postMessage({ type: "PRECACHE_PROGRESS", done, total }));
            }

            const clients = await self.clients.matchAll();
            clients.forEach((c) => c.postMessage({ type: "PRECACHE_DONE", total, failed }));
        })());
    }

    if (data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});
