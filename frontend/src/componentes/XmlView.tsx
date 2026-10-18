import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Realce minimo de XML/JSON, sem dependencia. */
function realcar(texto: string, tipo: "xml" | "json"): string {
  const t = esc(texto);
  if (tipo === "json") {
    return t.replace(/("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null|-?\d+)\b/g, (_, str, doisPontos, lit) =>
      str
        ? `<span class="${doisPontos ? "x-attr" : "x-val"}">${str}</span>${doisPontos ?? ""}`
        : `<span class="x-lit">${lit}</span>`,
    );
  }
  // uma passada so: substituicoes encadeadas casariam com o class="..." inserido antes
  return t.replace(
    /(&lt;!--[\s\S]*?--&gt;)|(&lt;\/?)([\w:.-]+)|([\w:.-]+)=("[^"]*")/g,
    (_, com, abre, tag, attr, val) =>
      com
        ? `<span class="x-com">${com}</span>`
        : tag
          ? `${abre}<span class="x-tag">${tag}</span>`
          : `<span class="x-attr">${attr}</span>=<span class="x-val">${val}</span>`,
  );
}

export function XmlView({ texto, tipo = "xml" }: { texto: string; tipo?: "xml" | "json" }) {
  const html = useMemo(() => realcar(texto, tipo), [texto, tipo]);
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="codigo">
      <button
        type="button"
        className="icone copiar"
        title="Copiar"
        onClick={async () => {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1500);
        }}
      >
        {copiado ? <Check size={16} /> : <Copy size={16} />}
      </button>
      <pre dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
