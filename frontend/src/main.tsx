import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Download } from "lucide-react";
import { api } from "./api";
import { TelaEditor } from "./TelaEditor";
import { TelaPerfis } from "./TelaPerfis";
import { MarcaIcone, MarcaNome } from "./componentes/Marca";
import { Rodape } from "./componentes/Rodape";
import { registrarServiceWorker, useInstalar } from "./pwa";
import type { Catalogo } from "./tipos";
import "./estilos.css";

// rotas por hash:  #/   |   #/p/<id>/<secao>
function useRota(): [string[], (r: string) => void] {
  const ler = () => window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const [rota, setRota] = useState(ler);
  useEffect(() => {
    const f = () => setRota(ler());
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  return [rota, (r) => (window.location.hash = r)];
}

function App() {
  const [rota, ir] = useRota();
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [erro, setErro] = useState("");
  const instalar = useInstalar();

  useEffect(() => {
    api.catalogo().then(setCatalogo).catch(() => setErro("Não foi possível falar com o servidor. O container está rodando?"));
  }, []);

  if (erro)
    return (
      <main className="carregando erro-campo">
        <div>
          <MarcaIcone tamanho={56} />
          <p>{erro}</p>
        </div>
      </main>
    );
  if (!catalogo)
    return (
      <main className="carregando">
        <div>
          <MarcaIcone tamanho={56} />
          <p>Carregando…</p>
        </div>
      </main>
    );

  if (rota[0] === "p" && rota[1]) {
    return (
      <TelaEditor
        key={rota[1]}
        id={rota[1]}
        secao={rota[2] ?? "geral"}
        catalogo={catalogo}
        irPara={(s) => ir(`/p/${rota[1]}/${s}`)}
        voltar={() => ir("/")}
      />
    );
  }
  return (
    <>
      <header className="marca">
        <MarcaIcone tamanho={34} />
        <MarcaNome />
        <small>Preparação de imagem padrão do Windows</small>
        {instalar && (
          <button type="button" className="botao instalar" onClick={instalar} title="Instalar como aplicativo">
            <Download size={16} /> <span className="so-largo">Instalar app</span>
          </button>
        )}
      </header>
      <TelaPerfis abrir={(id) => ir(`/p/${id}/contas`)} />
    </>
  );
}

registrarServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <Rodape />
  </StrictMode>,
);
