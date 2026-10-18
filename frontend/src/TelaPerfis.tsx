import { Copy, FilePlus2, FileUp, FolderOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import type { ResumoPerfil } from "./tipos";

export function TelaPerfis({ abrir }: { abrir: (id: string) => void }) {
  const [perfis, setPerfis] = useState<ResumoPerfil[] | null>(null);
  const [nome, setNome] = useState("");
  const [modelo, setModelo] = useState<"padrao" | "laboratorio">("padrao");
  const [erro, setErro] = useState("");
  const arquivo = useRef<HTMLInputElement>(null);

  const carregar = () => api.listar().then(setPerfis).catch((e) => setErro(e.message));
  useEffect(() => {
    carregar();
  }, []);

  async function acao(f: () => Promise<unknown>) {
    setErro("");
    try {
      await f();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <main className="tela-perfis">
      <div className="perfis-cabecalho">
        <h1>Perfis de imagem</h1>
        <p className="descricao">
          Cada perfil gera um pacote completo para o pendrive: <code>sysprep.xml</code>, script de preparo, imagens e LEIA-ME.
        </p>
      </div>

      {erro && <div className="nota nota-erro">{erro}</div>}

      <div className="perfis-acoes">
        <form
          className="cartao novo-perfil"
          onSubmit={(e) => {
            e.preventDefault();
            acao(async () => abrir((await api.criar(nome || "Novo perfil", modelo)).id));
          }}
        >
          <h3>
            <FilePlus2 size={18} aria-hidden /> Novo perfil
          </h3>
          <div className="campo">
            <label htmlFor="novo-nome">Nome</label>
            <input id="novo-nome" value={nome} placeholder="Ex.: Estações do financeiro" onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="escolha-opcoes">
            <label className={modelo === "padrao" ? "marcada" : ""}>
              <input type="radio" name="modelo" checked={modelo === "padrao"} onChange={() => setModelo("padrao")} />
              <span className="escolha-rotulo">Padrão do Windows</span>
              <small>Só o essencial para o Sysprep funcionar.</small>
            </label>
            <label className={modelo === "laboratorio" ? "marcada" : ""}>
              <input type="radio" name="modelo" checked={modelo === "laboratorio"} onChange={() => setModelo("laboratorio")} />
              <span className="escolha-rotulo">Uso compartilhado</span>
              <small>Remove apps de consumo, sugestões e BitLocker automático.</small>
            </label>
          </div>
          <button className="botao primario" type="submit">
            <Plus size={16} /> Criar
          </button>
        </form>

        <div className="cartao importar">
          <h3>
            <FileUp size={18} aria-hidden /> Importar sysprep.xml existente
          </h3>
          <p className="dica">
            Contas, senhas, chave e comandos são lidos do arquivo. O que não corresponder a uma opção da página entra em “Comandos
            personalizados”.
          </p>
          <button className="botao secundario" type="button" onClick={() => arquivo.current?.click()}>
            <FileUp size={16} /> Escolher arquivo XML
          </button>
          <input
            ref={arquivo}
            type="file"
            accept=".xml,text/xml"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) acao(async () => abrir((await api.importar(f, nome)).id));
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <h2 className="subtitulo-lista">
        Seus perfis {perfis && perfis.length > 0 && <span className="selo">{perfis.length}</span>}
      </h2>
      {perfis === null ? (
        <p className="vazio">Carregando…</p>
      ) : perfis.length === 0 ? (
        <p className="vazio">Nenhum perfil ainda. Crie um novo ou importe um sysprep.xml.</p>
      ) : (
        <ul className="lista-perfis">
          {perfis.map((p) => (
            <li key={p.id} className="cartao perfil-item">
              <button type="button" className="perfil-abrir" onClick={() => abrir(p.id)}>
                <span className="perfil-icone">
                  <FolderOpen size={20} aria-hidden />
                </span>
                <span>
                  <strong>{p.nome}</strong>
                  {p.descricao && <span className="perfil-desc">{p.descricao}</span>}
                  <small>Alterado em {new Date(p.atualizado_em).toLocaleString("pt-BR")}</small>
                </span>
              </button>
              <div className="acoes-linha">
                <button
                  type="button"
                  className="icone"
                  title="Renomear"
                  onClick={() => {
                    const n = prompt("Novo nome do perfil:", p.nome)?.trim();
                    if (n && n !== p.nome) acao(async () => (await api.renomear(p.id, n), carregar()));
                  }}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  className="icone"
                  title="Duplicar"
                  onClick={() => {
                    const n = prompt("Nome da cópia:", `${p.nome} (cópia)`);
                    if (n) acao(async () => (await api.duplicar(p.id, n), carregar()));
                  }}
                >
                  <Copy size={16} />
                </button>
                <button
                  type="button"
                  className="icone perigo"
                  title="Excluir"
                  onClick={() => {
                    if (confirm(`Excluir o perfil "${p.nome}" e as imagens dele? Não dá para desfazer.`))
                      acao(async () => (await api.excluir(p.id), carregar()));
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
