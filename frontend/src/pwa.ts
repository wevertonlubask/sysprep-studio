import { useEffect, useState } from "react";

// so no build: no `vite dev` o service worker guardaria o bundle de desenvolvimento
export function registrarServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}

interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// o navegador dispara beforeinstallprompt uma vez, cedo; guardado fora do
// React para nao perder o evento se a tela de perfis montar depois
let pendente: EventoInstalar | null = null;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  pendente = e as EventoInstalar;
  avisar();
});
window.addEventListener("appinstalled", () => {
  pendente = null;
  avisar();
});

/** Devolve a funcao de instalar quando o navegador oferece instalacao (Chrome/Edge); senao, null. */
export function useInstalar(): (() => Promise<void>) | null {
  const [, setVersao] = useState(0);
  useEffect(() => {
    const f = () => setVersao((v) => v + 1);
    ouvintes.add(f);
    return () => void ouvintes.delete(f);
  }, []);
  if (!pendente) return null;
  const evento = pendente;
  return async () => {
    await evento.prompt();
    await evento.userChoice;
    pendente = null;
    avisar();
  };
}
