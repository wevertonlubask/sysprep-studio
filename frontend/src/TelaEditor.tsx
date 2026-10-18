import {
  AppWindow,
  ArrowLeft,
  Battery,
  BrickWall,
  Building2,
  CircleAlert,
  Code2,
  Cpu,
  Download,
  FileCode,
  Globe,
  KeyRound,
  Lock,
  Menu,
  Monitor,
  MonitorCog,
  MonitorSmartphone,
  Network,
  Package,
  Paintbrush,
  PanelRightClose,
  PanelRightOpen,
  RefreshCcw,
  Rocket,
  Save,
  Settings2,
  ShieldCheck,
  Terminal,
  TriangleAlert,
  Users,
  Info,
  Wifi as IconeWifi,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, baixar, baixarUrl, ErroApi, formatarTamanho } from "./api";
import { EditorCtx, gravar, type Editor } from "./editor";
import { BotaoTema } from "./componentes/BotaoTema";
import { XmlView } from "./componentes/XmlView";
import { MarcaIcone } from "./componentes/Marca";
import { Cartao, Nota, Secao, Texto } from "./componentes/campos";
import { Identidade, Licenca, Regiao } from "./secoes/basico";
import { Contas } from "./secoes/contas";
import { Drivers } from "./secoes/drivers";
import { AcessoRemoto, Dominio, Firewall, Oobe } from "./secoes/sistema";
import { Personalizacao } from "./secoes/visual";
import { Wifi } from "./secoes/wifi";
import { TelaInicial } from "./secoes/telaInicial";
import { Apps, Atualizacoes, Comandos, Energia, Privacidade, Seguranca, Sysprep } from "./secoes/outros";
import type { Aviso, Catalogo, InfoDriver, InfoImagem, Perfil, Previa } from "./tipos";

interface ItemNav {
  id: string;
  rotulo: string;
  icone: LucideIcon;
  tela: () => ReactNode;
}

interface GrupoNav {
  titulo: string;
  curto: string; // nome que cabe na faixa
  icone: LucideIcon;
  itens: ItemNav[];
}

const GRUPOS: GrupoNav[] = [
  {
    titulo: "Perfil",
    curto: "Perfil",
    icone: FileCode,
    itens: [{ id: "geral", rotulo: "Geral", icone: FileCode, tela: () => <Geral /> }],
  },
  {
    titulo: "Instalação",
    curto: "Instalação",
    icone: Rocket,
    itens: [
      { id: "licenca", rotulo: "Licença", icone: KeyRound, tela: () => <Licenca /> },
      { id: "regiao", rotulo: "Idioma e região", icone: Globe, tela: () => <Regiao /> },
      { id: "oobe", rotulo: "Primeiro boot", icone: Rocket, tela: () => <Oobe /> },
      { id: "identidade", rotulo: "Identidade", icone: Monitor, tela: () => <Identidade /> },
    ],
  },
  {
    titulo: "Contas e domínio",
    curto: "Contas",
    icone: Users,
    itens: [
      { id: "contas", rotulo: "Contas e senhas", icone: Users, tela: () => <Contas /> },
      { id: "dominio", rotulo: "Domínio", icone: Building2, tela: () => <Dominio /> },
      { id: "tela_inicial", rotulo: "Tela inicial", icone: MonitorCog, tela: () => <TelaInicial /> },
    ],
  },
  {
    titulo: "Rede",
    curto: "Rede",
    icone: Network,
    itens: [
      { id: "wifi", rotulo: "Wi-Fi", icone: IconeWifi, tela: () => <Wifi /> },
      { id: "remoto", rotulo: "Acesso remoto", icone: MonitorSmartphone, tela: () => <AcessoRemoto /> },
      { id: "firewall", rotulo: "Firewall", icone: BrickWall, tela: () => <Firewall /> },
    ],
  },
  {
    titulo: "Segurança e políticas",
    curto: "Segurança",
    icone: ShieldCheck,
    itens: [
      { id: "seguranca", rotulo: "Segurança", icone: ShieldCheck, tela: () => <Seguranca /> },
      { id: "privacidade", rotulo: "Privacidade", icone: Lock, tela: () => <Privacidade /> },
      { id: "atualizacoes", rotulo: "Windows Update", icone: RefreshCcw, tela: () => <Atualizacoes /> },
    ],
  },
  {
    titulo: "Sistema",
    curto: "Sistema",
    icone: Settings2,
    itens: [
      { id: "personalizacao", rotulo: "Aparência", icone: Paintbrush, tela: () => <Personalizacao /> },
      { id: "apps", rotulo: "Apps e recursos", icone: AppWindow, tela: () => <Apps /> },
      { id: "drivers", rotulo: "Drivers", icone: Cpu, tela: () => <Drivers /> },
      { id: "energia", rotulo: "Energia", icone: Battery, tela: () => <Energia /> },
    ],
  },
  {
    titulo: "Finalização",
    curto: "Finalizar",
    icone: Terminal,
    itens: [
      { id: "comandos", rotulo: "Comandos", icone: Code2, tela: () => <Comandos /> },
      { id: "sysprep", rotulo: "Sysprep", icone: Terminal, tela: () => <Sysprep /> },
    ],
  },
];

const NAV: ItemNav[] = GRUPOS.flatMap((g) => g.itens);

const CHAVE_RECOLHIDO = "sysprep.menu.recolhido";

function lerRecolhido() {
  try {
    return localStorage.getItem(CHAVE_RECOLHIDO) === "1";
  } catch {
    return false;
  }
}

const telaEstreita = () => window.matchMedia("(max-width: 860px)").matches;

// secoes que mudaram de id: links antigos (#/p/<id>/rede) caem na secao certa
const ALIAS: Record<string, string> = { rede: "dominio" };

function Geral() {
  return (
    <Secao titulo="Geral" descricao="Identificação do perfil. O nome também nomeia a pasta do pacote gerado.">
      <Cartao>
        <Texto caminho="nome" rotulo="Nome do perfil" />
        <Texto caminho="descricao" rotulo="Descrição" dica="Aparece no topo do LEIA-ME do pacote." />
      </Cartao>
    </Secao>
  );
}

const ICONE_NIVEL = { erro: CircleAlert, aviso: TriangleAlert, info: Info };

function ListaAvisos({ avisos, irPara }: { avisos: Aviso[]; irPara: (s: string) => void }) {
  if (!avisos.length) return <p className="vazio">Nenhum problema encontrado.</p>;
  const ordem = { erro: 0, aviso: 1, info: 2 };
  return (
    <ul className="avisos">
      {[...avisos]
        .sort((a, b) => ordem[a.nivel] - ordem[b.nivel])
        .map((a, i) => {
          const Icone = ICONE_NIVEL[a.nivel];
          const secao = NAV.find((n) => n.id === a.secao);
          return (
            <li key={i} className={`aviso aviso-${a.nivel}`}>
              <Icone size={16} aria-hidden />
              <div>
                <span>{a.mensagem}</span>
                {secao && (
                  <button type="button" className="link" onClick={() => irPara(secao.id)}>
                    {secao.rotulo} →
                  </button>
                )}
              </div>
            </li>
          );
        })}
    </ul>
  );
}

interface ManifestoPrevia {
  arquivos: { origem: string; destino: string }[];
  drivers: { origem: string; tamanho: number }[];
  remover_apps: string[];
  registro_usuario: unknown[];
}

function TelaGerar({
  previa,
  irPara,
  baixarPacote,
  baixarXml,
  gerando,
}: {
  previa: Previa | null;
  irPara: (s: string) => void;
  baixarPacote: () => void;
  baixarXml: () => void;
  gerando: boolean;
}) {
  const erros = previa?.validacao.filter((a) => a.nivel === "erro").length ?? 0;
  const m = previa?.manifesto as ManifestoPrevia | undefined;
  return (
    <Secao titulo="Gerar pacote" descricao="Confira os avisos e baixe o ZIP. Extraia no pendrive e execute Preparar-Imagem.cmd em Modo Auditoria.">
      <Cartao titulo="Verificação">{previa ? <ListaAvisos avisos={previa.validacao} irPara={irPara} /> : <p className="vazio">Calculando…</p>}</Cartao>
      <Cartao titulo="Conteúdo do pacote">
        <ul className="arvore">
          <li>sysprep.xml</li>
          <li>pacote.json <small>— o que o script aplica</small></li>
          <li>Preparar-Imagem.cmd <small>— duplo clique aqui</small></li>
          <li>Preparar-Imagem.ps1</li>
          <li>LEIA-ME.txt</li>
          {m?.arquivos.map((a) => (
            <li key={a.origem}>
              {a.origem} <small>→ {a.destino}</small>
            </li>
          ))}
          {m?.drivers.map((d) => (
            <li key={d.origem}>
              {d.origem} <small>— {formatarTamanho(d.tamanho)}, vai para o repositório de drivers</small>
            </li>
          ))}
        </ul>
        {m && (
          <p className="dica">
            {m.remover_apps.length} app(s) a remover · {m.registro_usuario.length} ajuste(s) por usuário
          </p>
        )}
      </Cartao>
      <div className="gerar-acoes">
        <button type="button" className="botao primario grande" disabled={!!erros || gerando} onClick={baixarPacote}>
          <Package size={18} /> {gerando ? "Gerando…" : "Baixar pacote (.zip)"}
        </button>
        <button type="button" className="botao secundario" disabled={!!erros || gerando} onClick={baixarXml}>
          <Download size={16} /> Só o sysprep.xml
        </button>
        {erros > 0 && <span className="erro-campo">Corrija {erros} erro(s) para liberar o download.</span>}
      </div>
      <Nota tipo="aviso">
        Use o <strong>pacote (.zip)</strong> e rode o <code>Preparar-Imagem.cmd</code> em Modo Auditoria. O sysprep.xml sozinho não copia
        as imagens (papel de parede, tela de bloqueio, logo) nem aplica tema, barra de tarefas e remoção de apps: esses itens só
        funcionam pelo script do pacote.
      </Nota>
    </Secao>
  );
}

export function TelaEditor({
  id,
  secao,
  irPara,
  voltar,
  catalogo,
}: {
  id: string;
  secao: string;
  irPara: (s: string) => void;
  voltar: () => void;
  catalogo: Catalogo;
}) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [salvo, setSalvo] = useState("");
  const [imagens, setImagens] = useState<Record<string, InfoImagem>>({});
  const [drivers, setDrivers] = useState<InfoDriver[]>([]);
  const [versaoImagens, setVersaoImagens] = useState(0);
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [painel, setPainel] = useState<"xml" | "json" | null>(() => (window.innerWidth > 1280 ? "xml" : null));
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erroCarga, setErroCarga] = useState("");
  const [menuAberto, setMenuAberto] = useState(false);
  const [recolhido, setRecolhido] = useState(lerRecolhido);
  const [janela, setJanela] = useState<{ grupo: number; topo: number } | null>(null);
  const abertaEm = useRef(0);

  const nav = useRef<HTMLElement>(null);
  const conteudo = useRef<HTMLElement>(null);

  // ao trocar de secao: fecha o menu sanduiche (tablet/celular), a janela do grupo e volta ao topo
  useEffect(() => {
    setMenuAberto(false);
    setJanela(null);
    conteudo.current?.scrollTo({ top: 0 });
  }, [secao, perfil === null]);

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_RECOLHIDO, recolhido ? "1" : "0");
    } catch {
      /* sem storage: vale so nesta sessao */
    }
  }, [recolhido]);

  // janela do grupo aberta: clique fora, Esc, rolar a faixa ou mudar a largura fecha
  useEffect(() => {
    if (!janela) return;
    const fora = (e: PointerEvent) => !nav.current?.contains(e.target as Node) && setJanela(null);
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setJanela(null);
    const rolar = () => Date.now() - abertaEm.current > 400 && setJanela(null);
    const largura = window.innerWidth;
    const redimensionar = () => window.innerWidth !== largura && setJanela(null);
    const faixa = nav.current;
    document.addEventListener("pointerdown", fora);
    window.addEventListener("keydown", tecla);
    window.addEventListener("resize", redimensionar);
    faixa?.addEventListener("scroll", rolar);
    return () => {
      document.removeEventListener("pointerdown", fora);
      window.removeEventListener("keydown", tecla);
      window.removeEventListener("resize", redimensionar);
      faixa?.removeEventListener("scroll", rolar);
    };
  }, [janela]);

  // gaveta aberta (tablet/celular): Esc fecha (com a janela do grupo aberta, fecha so ela)
  useEffect(() => {
    if (!menuAberto) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && !janela && setMenuAberto(false);
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [menuAberto, janela]);

  useEffect(() => {
    if (!painel) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && setPainel(null);
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [painel]);

  const sujo = perfil !== null && JSON.stringify(perfil) !== salvo;
  const perfilRef = useRef(perfil);
  perfilRef.current = perfil;

  useEffect(() => {
    api
      .obter(id)
      .then((d) => {
        setPerfil(d.perfil);
        setSalvo(JSON.stringify(d.perfil));
        setImagens(d.imagens);
        setDrivers(d.drivers);
      })
      .catch((e) => setErroCarga(e.message));
  }, [id]);

  // previa com debounce: recalcula XML e validacao do estado nao salvo
  useEffect(() => {
    if (!perfil) return;
    const t = setTimeout(() => {
      api.previa(id, perfil).then(setPrevia).catch(() => undefined);
    }, 300);
    return () => clearTimeout(t);
  }, [id, perfil, versaoImagens, drivers]);

  const salvar = useCallback(async () => {
    const atual = perfilRef.current;
    if (!atual) return false;
    setSalvando(true);
    try {
      await api.salvar(id, atual);
      setSalvo(JSON.stringify(atual));
      setMensagem({ tipo: "ok", texto: "Perfil salvo." });
      return true;
    } catch (e) {
      setMensagem({ tipo: "erro", texto: (e as Error).message });
      return false;
    } finally {
      setSalvando(false);
    }
  }, [id]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        salvar();
      }
    };
    const sair = (e: BeforeUnloadEvent) => {
      if (sujo) e.preventDefault();
    };
    window.addEventListener("keydown", tecla);
    window.addEventListener("beforeunload", sair);
    return () => {
      window.removeEventListener("keydown", tecla);
      window.removeEventListener("beforeunload", sair);
    };
  }, [salvar, sujo]);

  useEffect(() => {
    if (!mensagem) return;
    const t = setTimeout(() => setMensagem(null), 3500);
    return () => clearTimeout(t);
  }, [mensagem]);

  async function gerar(url: string) {
    setGerando(true);
    try {
      if (sujo && !(await salvar())) return;
      if (url.endsWith("/pacote")) {
        // o servidor monta o ZIP enquanto envia (com drivers, GBs) e o navegador grava direto no disco
        const r = await api.prepararPacote(id);
        baixarUrl(r.url);
        setMensagem({ tipo: "ok", texto: `Download iniciado (~${formatarTamanho(r.tamanho)}). Acompanhe pelos downloads do navegador.` });
        return;
      }
      await baixar(url);
      setMensagem({ tipo: "ok", texto: "Download iniciado." });
    } catch (e) {
      setMensagem({ tipo: "erro", texto: e instanceof ErroApi ? e.message : "Falha ao gerar." });
      if (e instanceof ErroApi && e.status === 422) irPara("gerar");
    } finally {
      setGerando(false);
    }
  }

  const editor: Editor | null = useMemo(
    () =>
      perfil && {
        id,
        perfil,
        catalogo,
        imagens,
        versaoImagens,
        avisos: previa?.validacao ?? [],
        set: (caminho, valor) => setPerfil((p) => (p ? gravar(p, caminho, valor) : p)),
        aoEnviarImagem: (info) => {
          setImagens((i) => ({ ...i, [info.arquivo]: info }));
          setVersaoImagens((v) => v + 1);
        },
        drivers,
        setDrivers,
      },
    [id, perfil, catalogo, imagens, versaoImagens, previa, drivers],
  );

  if (erroCarga)
    return (
      <main className="tela-perfis">
        <div className="nota nota-erro">{erroCarga}</div>
        <button className="botao secundario" onClick={voltar}>
          Voltar aos perfis
        </button>
      </main>
    );
  if (!editor || !perfil) return <main className="carregando">Carregando perfil…</main>;

  const contagem = (s: string, nivel: string) => (previa?.validacao ?? []).filter((a) => a.secao === s && a.nivel === nivel).length;
  const totalErros = (previa?.validacao ?? []).filter((a) => a.nivel === "erro").length;
  const totalAvisos = (previa?.validacao ?? []).filter((a) => a.nivel === "aviso").length;
  const secaoAtual = ALIAS[secao] ?? secao;
  const atual = NAV.find((n) => n.id === secaoAtual);

  return (
    <EditorCtx.Provider value={editor}>
      <div className={`editor ${painel ? "com-painel" : ""} ${recolhido ? "menu-recolhido" : ""}`}>
        <header className="barra">
          <button
            type="button"
            className="icone botao-menu"
            title={menuAberto ? "Fechar menu" : recolhido ? "Expandir menu" : "Recolher menu"}
            aria-label={menuAberto ? "Fechar menu de seções" : recolhido ? "Expandir menu de seções" : "Recolher menu de seções"}
            aria-controls="menu-secoes"
            onClick={() => {
              setJanela(null);
              if (telaEstreita()) setMenuAberto(!menuAberto);
              else setRecolhido(!recolhido);
            }}
          >
            {menuAberto ? <X size={20} /> : <Menu size={20} />}
          </button>
          <button
            type="button"
            className="icone"
            title="Voltar aos perfis"
            onClick={() => (!sujo || confirm("Há alterações não salvas. Sair mesmo assim?")) && voltar()}
          >
            <ArrowLeft size={18} />
          </button>
          <span className="barra-marca" title="Sysprep Studio">
            <MarcaIcone tamanho={28} />
          </span>
          <div className="barra-titulo">
            <strong>{perfil.nome}</strong>
            <span className={`estado ${sujo ? "sujo" : ""}`}>{sujo ? "Alterações não salvas" : "Salvo"}</span>
          </div>
          <button type="button" className="resumo-validacao" onClick={() => irPara("gerar")}>
            {totalErros > 0 ? (
              <span className="erro-campo">
                <CircleAlert size={15} /> {totalErros} <span className="so-largo">erro(s)</span>
              </span>
            ) : (
              <span className="ok">
                <ShieldCheck size={15} /> <span className="so-largo">Pronto para gerar</span>
              </span>
            )}
            {totalAvisos > 0 && (
              <span className="alerta">
                <TriangleAlert size={15} /> {totalAvisos} <span className="so-largo">aviso(s)</span>
              </span>
            )}
          </button>
          <div className="barra-acoes">
            <button type="button" className="botao secundario" disabled={!sujo || salvando} onClick={salvar} title="Ctrl+S">
              <Save size={16} /> <span className="so-largo">{salvando ? "Salvando…" : "Salvar"}</span>
            </button>
            <button type="button" className="botao primario" disabled={gerando || totalErros > 0} title="Gerar pacote" onClick={() => gerar(`/api/perfis/${id}/pacote`)}>
              <Package size={16} /> <span className="so-largo">Gerar pacote</span>
            </button>
            <button
              type="button"
              className="icone"
              title={painel ? "Ocultar prévia" : "Mostrar prévia do XML"}
              onClick={() => setPainel(painel ? null : "xml")}
            >
              {painel ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
            </button>
            <BotaoTema />
          </div>
        </header>

        {menuAberto && <div className="menu-fundo" aria-hidden onClick={() => setMenuAberto(false)} />}

        <nav id="menu-secoes" className={`lateral ${menuAberto ? "aberto" : ""}`} aria-label="Seções" ref={nav}>
          {GRUPOS.map((g, i) => {
            const ativo = g.itens.some((n) => n.id === secaoAtual);
            const aberto = janela?.grupo === i;
            const e = g.itens.reduce((t, n) => t + contagem(n.id, "erro"), 0);
            const a = g.itens.reduce((t, n) => t + contagem(n.id, "aviso"), 0);
            const unico = g.itens.length === 1 ? g.itens[0] : null;
            return (
              <div key={g.titulo} className={`nav-grupo ${ativo ? "tem-ativo" : ""} ${aberto ? "aberto" : ""}`}>
                <button
                  type="button"
                  className="nav-categoria"
                  title={g.titulo}
                  aria-expanded={unico ? undefined : aberto}
                  aria-current={unico && ativo ? "page" : undefined}
                  onClick={(ev) => {
                    if (unico) {
                      irPara(unico.id);
                      setJanela(null);
                      setMenuAberto(false);
                      return;
                    }
                    if (aberto) return setJanela(null);
                    // janela alinhada ao botao, sem passar do pe da tela (altura estimada pela quantidade de itens)
                    const r = ev.currentTarget.getBoundingClientRect();
                    const altura = 52 + g.itens.length * 42;
                    const topoMin = (nav.current?.getBoundingClientRect().top ?? 0) + 6;
                    abertaEm.current = Date.now();
                    setJanela({ grupo: i, topo: Math.max(topoMin, Math.min(r.top - 6, window.innerHeight - altura - 40)) });
                  }}
                >
                  <span className="nav-categoria-icone">
                    <g.icone size={20} aria-hidden />
                    {e > 0 ? <span className="contador erro">{e}</span> : a > 0 ? <span className="contador alerta">{a}</span> : null}
                  </span>
                  <span className="nav-categoria-nome">{g.curto}</span>
                </button>
                {aberto && (
                  <div className="nav-janela" role="group" aria-label={g.titulo} style={{ top: janela.topo }}>
                    <div className="nav-janela-titulo">{g.titulo}</div>
                    {g.itens.map((n) => {
                      const ne = contagem(n.id, "erro");
                      const na = contagem(n.id, "aviso");
                      return (
                        <button
                          key={n.id}
                          type="button"
                          className={secaoAtual === n.id ? "ativo" : ""}
                          aria-current={secaoAtual === n.id ? "page" : undefined}
                          onClick={() => {
                            irPara(n.id);
                            setJanela(null);
                            setMenuAberto(false);
                          }}
                        >
                          <n.icone size={17} aria-hidden />
                          <span>{n.rotulo}</span>
                          {ne > 0 ? <span className="contador erro">{ne}</span> : na > 0 ? <span className="contador alerta">{na}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          <div className={`nav-grupo gerar-nav ${secao === "gerar" ? "tem-ativo" : ""}`}>
            <button
              type="button"
              className="nav-categoria"
              title="Gerar pacote"
              aria-current={secao === "gerar" ? "page" : undefined}
              onClick={() => {
                irPara("gerar");
                setJanela(null);
                setMenuAberto(false);
              }}
            >
              <span className="nav-categoria-icone">
                <Package size={20} aria-hidden />
              </span>
              <span className="nav-categoria-nome">Gerar</span>
            </button>
          </div>
        </nav>

        <main className="conteudo" ref={conteudo}>
          {secao === "gerar" ? (
            <TelaGerar
              previa={previa}
              irPara={irPara}
              gerando={gerando}
              baixarPacote={() => gerar(`/api/perfis/${id}/pacote`)}
              baixarXml={() => gerar(`/api/perfis/${id}/xml`)}
            />
          ) : (
            <>
              {(atual ?? NAV[0]).tela()}
              {previa && previa.validacao.some((a) => a.secao === secaoAtual && a.nivel !== "info") && (
                <div className="avisos-secao">
                  <ListaAvisos avisos={previa.validacao.filter((a) => a.secao === secaoAtual && a.nivel !== "info")} irPara={irPara} />
                </div>
              )}
            </>
          )}
        </main>

        {painel && (
          <aside className="painel">
            <div className="abas" role="tablist">
              <button role="tab" aria-selected={painel === "xml"} className={painel === "xml" ? "ativa" : ""} onClick={() => setPainel("xml")}>
                sysprep.xml
              </button>
              <button role="tab" aria-selected={painel === "json"} className={painel === "json" ? "ativa" : ""} onClick={() => setPainel("json")}>
                pacote.json
              </button>
              <button type="button" className="icone fechar-painel" title="Fechar prévia" onClick={() => setPainel(null)}>
                <X size={18} />
              </button>
            </div>
            {previa ? (
              <XmlView texto={painel === "xml" ? previa.xml : JSON.stringify(previa.manifesto, null, 2)} tipo={painel} />
            ) : (
              <p className="vazio">Gerando prévia…</p>
            )}
          </aside>
        )}

        {mensagem && (
          <div className={`toast toast-${mensagem.tipo}`} role="status">
            {mensagem.texto}
          </div>
        )}
      </div>
    </EditorCtx.Provider>
  );
}
