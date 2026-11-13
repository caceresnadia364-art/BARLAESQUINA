// Definimos la versión actual de nuestra caché para controlarla fácilmente en el futuro
const VERSION = "v1";

// Lista con todos los archivos esenciales que la app necesita para funcionar sin conexión
const ARCHIVOS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icono-192.png",
  "./icono-512.png"
];

// Evento 'install': Se ejecuta cuando el navegador descarga e instala el service worker por primera vez
self.addEventListener("install", (event) => {
  // waitUntil le avisa al navegador que espere hasta que todo el proceso de caché termine
  event.waitUntil(
    // Abrimos un espacio de almacenamiento seguro en el navegador con un nombre único basado en la versión
    caches.open(`bar-la-esquina-${VERSION}`).then((cache) => {
      // Descargamos y guardamos todos los archivos del array ARCHIVOS en esa caché
      return cache.addAll(ARCHIVOS);
    })
  );
});

// Evento 'activate': Se ejecuta cuando el service worker toma el control de la aplicación (ideal para limpieza)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    // Buscamos todas las cachés almacenadas en el navegador
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // Si encontramos una caché antigua de nuestra app que ya no es la versión actual, la borramos
          if (key.startsWith("bar-la-esquina-") && key !== `bar-la-esquina-${VERSION}`) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// Evento 'fetch': Se activa cada vez que la app solicita un archivo (una imagen, un script, el HTML, etc.)
self.addEventListener("fetch", (event) => {
  // Aplicamos la estrategia "Primero la caché" (Cache First)
  event.respondWith(
    // Buscamos si el archivo solicitado ya existe dentro de nuestra caché local
    caches.match(event.request).then((respuestaCache) => {
      // Si el archivo está guardado en la caché, lo devolvemos de inmediato sin usar internet
      if (respuestaCache) {
        return respuestaCache;
      }
      // Si no está en la caché, lo vamos a buscar a la red (internet) de forma normal
      return fetch(event.request);
    })
  );
});