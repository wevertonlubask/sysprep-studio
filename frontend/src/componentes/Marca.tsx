import { useId } from "react";

/* Identidade visual do Sysprep Studio, toda em SVG (sem imagens):
 *  - MarcaIcone: bloco violeta -> azul -> ciano com tres janelas claras e
 *    uma faisca no lugar da quarta (a imagem padrao "preparada" para clonar).
 *  - MarcaNome: "Sysprep" na cor do texto + "Studio" no gradiente da marca.
 * O desenho e proporcional a `tamanho`, do cabecalho (34px) a tela de carga.
 * public/favicon.svg e os icones do PWA (public/icones/) replicam o mesmo desenho. */

export function MarcaIcone({ tamanho = 32 }: { tamanho?: number }) {
  // ids unicos: o mesmo SVG pode aparecer mais de uma vez na pagina
  const id = useId().replace(/:/g, "");
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 64 64" aria-hidden className="marca-icone">
      <defs>
        <linearGradient id={`${id}f`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c5cff" />
          <stop offset="38%" stopColor="#3d5afe" />
          <stop offset="68%" stopColor="#2458d6" />
          <stop offset="100%" stopColor="#18b6f0" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}v`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#d3e0ff" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${id}f)`} />
      <rect width="64" height="64" rx="15" fill={`url(#${id}b)`} />
      <rect x="14" y="14" width="16" height="16" rx="3.5" fill={`url(#${id}v)`} />
      <rect x="34" y="14" width="16" height="16" rx="3.5" fill={`url(#${id}v)`} />
      <rect x="14" y="34" width="16" height="16" rx="3.5" fill={`url(#${id}v)`} />
      <path d="M42 32.5C43 39 45 41 51.5 42C45 43 43 45 42 51.5C41 45 39 43 32.5 42C39 41 41 39 42 32.5Z" fill="#fff" />
    </svg>
  );
}

export function MarcaNome() {
  return (
    <span className="marca-nome">
      Sysprep <span className="marca-nome-destaque">Studio</span>
    </span>
  );
}
