// sw.js - Service Worker Básico para GROBO

// 1. Cuando se instala, se activa inmediatamente
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// 2. Toma el control de la página rápido
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// 3. EVENTO OBLIGATORIO PARA PWA
// Esto es lo que Chrome exige para mostrar el botón de "Instalar".
// Por ahora, solo deja pasar el tráfico normal.
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return new Response('No tienes conexión a internet.');
        })
    );
});