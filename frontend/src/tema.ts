import { useEffect, useState } from "react";

// preferencia do usuario; "sistema" segue o tema do Windows/navegador.
// A chave e a resolucao inicial se repetem no script inline do index.html,
// que aplica o tema antes da primeira pintura para nao piscar.
export type Tema = "sistema" | "claro" | "escuro";

const CHAVE_TEMA = "sysprep.tema";
const consultaEscuro = window.matchMedia("(prefers-color-scheme: dark)");

function lerTema(): Tema {
  try {
    const v = localStorage.getItem(CHAVE_TEMA);
    return v === "claro" || v === "escuro" ? v : "sistema";
  } catch {
    return "sistema";
  }
}

function aplicar(tema: Tema) {
  const efetivo = tema === "sistema" ? (consultaEscuro.matches ? "escuro" : "claro") : tema;
  document.documentElement.dataset.tema = efetivo;
  // barra de status/titulo do PWA acompanha a superficie
  const cor = getComputedStyle(document.documentElement).getPropertyValue("--superficie").trim();
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.content = cor;
  });
}

let atual = lerTema();
const ouvintes = new Set<() => void>();

consultaEscuro.addEventListener("change", () => {
  if (atual === "sistema") aplicar(atual);
});

// outra aba trocou o tema
window.addEventListener("storage", (e) => {
  if (e.key !== CHAVE_TEMA) return;
  atual = lerTema();
  aplicar(atual);
  ouvintes.forEach((f) => f());
});

aplicar(atual);

export function definirTema(tema: Tema) {
  atual = tema;
  try {
    if (tema === "sistema") localStorage.removeItem(CHAVE_TEMA);
    else localStorage.setItem(CHAVE_TEMA, tema);
  } catch {
    // sem armazenamento: vale so para esta sessao
  }
  aplicar(tema);
  ouvintes.forEach((f) => f());
}

export function useTema(): Tema {
  const [tema, setTema] = useState(atual);
  useEffect(() => {
    const f = () => setTema(atual);
    ouvintes.add(f);
    return () => {
      ouvintes.delete(f);
    };
  }, []);
  return tema;
}
