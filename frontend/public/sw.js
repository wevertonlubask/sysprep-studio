/* Service worker do Sysprep Studio.
 *
 * So guarda a casca do app (HTML, bundle, icones) para abrir rapido e
 * instalar como PWA. A API nunca passa por aqui: perfis tem senhas e chave
 * do Windows, e o pacote de drivers e transmitido direto ao navegador (GBs).
 *
 *  - navegacao (index.html): rede primeiro; sem rede, a ultima copia
 *  - /assets/* (nome com hash, imutavel): cache primeiro
 *  - icones/manifest: cache, atualizado em segundo plano
 */
const VERSAO = "sysprep-studio-v1";
const CASCA = ["/", "/manifest.webmanifest", "/favicon.svg", "/icones/icone-192.png", "/icones/icone-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(VERSAO)
      .then((c) => c.addAll(CASCA))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

async function redePrimeiro(req) {
  const cache = await caches.open(VERSAO);
  try {
    const resp = await fetch(req);
    if (resp.ok) cache.put("/", resp.clone());
    return resp;
  } catch {
    return (await cache.match("/")) ?? Response.error();
  }
}

async function cachePrimeiro(req) {
  const cache = await caches.open(VERSAO);
  const salvo = await cache.match(req);
  if (salvo) return salvo;
  const resp = await fetch(req);
  if (resp.ok) cache.put(req, resp.clone());
  return resp;
}

async function revalidar(req) {
  const cache = await caches.open(VERSAO);
  const salvo = await cache.match(req);
  const rede = fetch(req)
    .then((resp) => {
      if (resp.ok) cache.put(req, resp.clone());
      return resp;
    })
    .catch(() => salvo ?? Response.error());
  return salvo ?? rede;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") e.respondWith(redePrimeiro(req));
  else if (url.pathname.startsWith("/assets/")) e.respondWith(cachePrimeiro(req));
  else e.respondWith(revalidar(req));
});
