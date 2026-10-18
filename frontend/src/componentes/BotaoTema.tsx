import { Monitor, Moon, Sun } from "lucide-react";
import { definirTema, useTema, type Tema } from "../tema";

const PROXIMO: Record<Tema, Tema> = { sistema: "claro", claro: "escuro", escuro: "sistema" };
const NOME: Record<Tema, string> = { sistema: "do sistema", claro: "claro", escuro: "escuro" };
const ACAO: Record<Tema, string> = { sistema: "seguir o sistema", claro: "usar o claro", escuro: "usar o escuro" };

// alterna sistema -> claro -> escuro
export function BotaoTema() {
  const tema = useTema();
  const Icone = tema === "claro" ? Sun : tema === "escuro" ? Moon : Monitor;
  return (
    <button
      type="button"
      className="icone"
      title={`Tema ${NOME[tema]} — clique para ${ACAO[PROXIMO[tema]]}`}
      aria-label={`Tema ${NOME[tema]}`}
      onClick={() => definirTema(PROXIMO[tema])}
    >
      <Icone size={18} />
    </button>
  );
}
