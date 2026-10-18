import { Eye, EyeOff, Info, RefreshCw, Upload } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";
import { api } from "../api";
import { useCampo, useEditor } from "../editor";
import type { ItemCatalogo } from "../tipos";

export function Secao({ titulo, descricao, children }: { titulo: string; descricao?: ReactNode; children: ReactNode }) {
  return (
    <section className="secao">
      <header>
        <h2>{titulo}</h2>
        {descricao && <p className="descricao">{descricao}</p>}
      </header>
      {children}
    </section>
  );
}

export function Cartao({ titulo, children, extra }: { titulo?: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="cartao">
      {(titulo || extra) && (
        <div className="cartao-topo">
          {titulo && <h3>{titulo}</h3>}
          {extra}
        </div>
      )}
      {children}
    </div>
  );
}

export function Nota({ children, tipo = "info" }: { children: ReactNode; tipo?: "info" | "aviso" }) {
  return (
    <div className={`nota nota-${tipo}`}>
      <Info size={16} aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function Grade({ children, colunas = 2 }: { children: ReactNode; colunas?: number }) {
  return <div className={`grade grade-${colunas}`}>{children}</div>;
}

interface Base {
  rotulo: string;
  dica?: ReactNode;
}

export function Rotulo({ rotulo, dica, htmlFor, children }: Base & { htmlFor?: string; children: ReactNode }) {
  return (
    <div className="campo">
      <label htmlFor={htmlFor}>{rotulo}</label>
      {children}
      {dica && <small className="dica">{dica}</small>}
    </div>
  );
}

export function Toggle({ caminho, rotulo, dica, desabilitado }: Base & { caminho: string; desabilitado?: boolean }) {
  const [v, set] = useCampo<boolean>(caminho);
  const id = useId();
  return (
    <div className={`toggle ${desabilitado ? "desabilitado" : ""}`}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={!!v}
        disabled={desabilitado}
        className="interruptor"
        onClick={() => set(!v)}
      >
        <span />
      </button>
      <label htmlFor={id}>
        <span className="toggle-rotulo">{rotulo}</span>
        {dica && <small className="dica">{dica}</small>}
      </label>
    </div>
  );
}

export function Texto({
  caminho,
  rotulo,
  dica,
  placeholder,
  sugestoes,
  maiusculas,
  maxLength,
  mono,
}: Base & {
  caminho: string;
  placeholder?: string;
  sugestoes?: ItemCatalogo[];
  maiusculas?: boolean;
  maxLength?: number;
  mono?: boolean;
}) {
  const [v, set] = useCampo<string>(caminho);
  const id = useId();
  return (
    <Rotulo rotulo={rotulo} dica={dica} htmlFor={id}>
      <input
        id={id}
        value={v ?? ""}
        placeholder={placeholder}
        maxLength={maxLength}
        className={mono ? "mono" : undefined}
        list={sugestoes ? `${id}-l` : undefined}
        onChange={(e) => set(maiusculas ? e.target.value.toUpperCase() : e.target.value)}
      />
      {sugestoes && (
        <datalist id={`${id}-l`}>
          {sugestoes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </datalist>
      )}
    </Rotulo>
  );
}

export function Numero({
  caminho,
  rotulo,
  dica,
  min = 0,
  vazioNulo,
  sufixo,
}: Base & { caminho: string; min?: number; vazioNulo?: boolean; sufixo?: string }) {
  const [v, set] = useCampo<number | null>(caminho);
  const id = useId();
  return (
    <Rotulo rotulo={rotulo} dica={dica} htmlFor={id}>
      <div className="com-sufixo">
        <input
          id={id}
          type="number"
          min={min}
          value={v ?? ""}
          placeholder={vazioNulo ? "não alterar" : undefined}
          onChange={(e) => set(e.target.value === "" ? (vazioNulo ? null : min) : Math.max(min, Number(e.target.value)))}
        />
        {sufixo && <span>{sufixo}</span>}
      </div>
    </Rotulo>
  );
}

export interface OpcaoEscolha {
  valor: string | number;
  rotulo: string;
  descricao?: string;
}

export function Escolha({ caminho, rotulo, dica, opcoes }: Base & { caminho: string; opcoes: OpcaoEscolha[] }) {
  const [v, set] = useCampo<string | number>(caminho);
  const nome = useId();
  return (
    <fieldset className="campo escolha">
      <legend>{rotulo}</legend>
      <div className="escolha-opcoes">
        {opcoes.map((o) => (
          <label key={o.valor} className={v === o.valor ? "marcada" : ""}>
            <input type="radio" name={nome} checked={v === o.valor} onChange={() => set(o.valor)} />
            <span className="escolha-rotulo">{o.rotulo}</span>
            {o.descricao && <small>{o.descricao}</small>}
          </label>
        ))}
      </div>
      {dica && <small className="dica">{dica}</small>}
    </fieldset>
  );
}

export function Selecao({
  caminho,
  rotulo,
  dica,
  opcoes,
}: Base & { caminho: string; opcoes: { valor: string; rotulo: string }[] }) {
  const [v, set] = useCampo<string>(caminho);
  const id = useId();
  return (
    <Rotulo rotulo={rotulo} dica={dica} htmlFor={id}>
      <select id={id} value={v} onChange={(e) => set(e.target.value)}>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </Rotulo>
  );
}

const CARACTERES = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const SIMBOLOS = "!@#$%&*-_";

export function gerarSenha(tamanho = 14): string {
  const n = new Uint32Array(tamanho);
  crypto.getRandomValues(n);
  const base = Array.from(n, (x, i) => (i % 5 === 4 ? SIMBOLOS : CARACTERES)[x % (i % 5 === 4 ? SIMBOLOS.length : CARACTERES.length)]);
  return base.join("");
}

export function Senha({ caminho, rotulo, dica }: Base & { caminho: string }) {
  const [v, set] = useCampo<string>(caminho);
  const [ver, setVer] = useState(false);
  const id = useId();
  return (
    <Rotulo rotulo={rotulo} dica={dica} htmlFor={id}>
      <div className="senha">
        <input
          id={id}
          type={ver ? "text" : "password"}
          value={v}
          autoComplete="new-password"
          className="mono"
          onChange={(e) => set(e.target.value)}
        />
        <button type="button" className="icone" title={ver ? "Ocultar" : "Mostrar"} onClick={() => setVer(!ver)}>
          {ver ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
        <button
          type="button"
          className="icone"
          title="Gerar senha forte"
          onClick={() => {
            set(gerarSenha());
            setVer(true);
          }}
        >
          <RefreshCw size={16} />
        </button>
      </div>
    </Rotulo>
  );
}

export function ListaMarcavel({
  caminho,
  itens,
  agrupar,
}: {
  caminho: string;
  itens: ItemCatalogo[];
  agrupar?: boolean;
}) {
  const [v, set] = useCampo<string[]>(caminho);
  const marcados = new Set(v);
  const grupos = agrupar
    ? Array.from(new Set(itens.map((i) => i.grupo ?? ""))).map((g) => [g, itens.filter((i) => (i.grupo ?? "") === g)] as const)
    : ([["", itens]] as const);
  const alternar = (id: string) => set(marcados.has(id) ? v.filter((x) => x !== id) : [...v, id]);
  return (
    <div className="lista-marcavel">
      {grupos.map(([g, lista]) => (
        <div key={g} className="lista-grupo">
          {g && <h4>{g}</h4>}
          {lista.map((i) => (
            <label key={i.id} className={`marcavel ${marcados.has(i.id) ? "marcada" : ""}`}>
              <input type="checkbox" checked={marcados.has(i.id)} onChange={() => alternar(i.id)} />
              <span>
                <span className="marcavel-nome">{i.nome}</span>
                <code title={i.id}>{i.id}</code>
                {i.nota && <small className="dica">{i.nota}</small>}
              </span>
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}

export function EnvioImagem({
  slot,
  caminho,
  rotulo,
  dica,
  alvoMinimo,
}: Base & { slot: string; caminho: string; alvoMinimo?: [number, number] }) {
  const { id, imagens, versaoImagens, aoEnviarImagem } = useEditor();
  const [arquivo, set] = useCampo<string>(caminho);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const info = arquivo ? imagens[arquivo] : undefined;
  const pequena = info && alvoMinimo && (info.largura < alvoMinimo[0] || info.altura < alvoMinimo[1]);

  async function enviar(f: File | undefined) {
    if (!f) return;
    setErro("");
    setEnviando(true);
    try {
      const r = await api.enviarImagem(id, slot, f);
      aoEnviarImagem(r);
      set(r.arquivo);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="campo">
      <span className="rotulo-texto">{rotulo}</span>
      <div
        className={`envio ${info ? "com-imagem" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          enviar(e.dataTransfer.files[0]);
        }}
      >
        {info ? (
          <img src={api.urlImagem(id, info.arquivo, versaoImagens)} alt={rotulo} />
        ) : (
          <div className="envio-vazio">
            <Upload size={22} aria-hidden />
            <span>Arraste a imagem aqui</span>
          </div>
        )}
        <div className="envio-acoes">
          <button type="button" className="botao secundario" disabled={enviando} onClick={() => input.current?.click()}>
            {enviando ? "Enviando…" : info ? "Trocar imagem" : "Escolher arquivo"}
          </button>
          {info && (
            <span className={`envio-info ${pequena ? "alerta" : ""}`}>
              {info.arquivo} · {info.largura}×{info.altura}
              {pequena && " · abaixo de Full HD"}
            </span>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/bmp"
          hidden
          onChange={(e) => enviar(e.target.files?.[0])}
        />
      </div>
      {erro && <small className="erro-campo">{erro}</small>}
      {dica && <small className="dica">{dica}</small>}
    </div>
  );
}
