import { HardDriveDownload, Trash2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { api, enviarDriver, formatarTamanho } from "../api";
import { useEditor } from "../editor";
import { Cartao, Nota, Secao } from "../componentes/campos";

const EXTENSOES = [".cab", ".zip", ".exe"];

interface Envio {
  chave: number;
  nome: string;
  tamanho: number;
  fracao: number;
  erro?: string;
  cancelar?: () => void;
}

function Progresso({ fracao }: { fracao: number }) {
  return (
    <div className="progresso" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fracao * 100)}>
      <span style={{ width: `${fracao * 100}%` }} />
    </div>
  );
}

export function Drivers() {
  const { id, drivers, setDrivers, perfil } = useEditor();
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [erro, setErro] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const fila = useRef(Promise.resolve());
  const seq = useRef(0);

  const atualizar = (chave: number, dados: Partial<Envio>) =>
    setEnvios((l) => l.map((e) => (e.chave === chave ? { ...e, ...dados } : e)));

  function adicionar(arquivos: FileList | null) {
    setErro("");
    const lista = Array.from(arquivos ?? []);
    const recusados = lista.filter((f) => !EXTENSOES.some((x) => f.name.toLowerCase().endsWith(x)));
    if (recusados.length) setErro(`Ignorado(s): ${recusados.map((f) => f.name).join(", ")}. Envie .cab, .zip ou .exe.`);
    for (const f of lista.filter((f) => !recusados.includes(f))) {
      const chave = ++seq.current;
      setEnvios((l) => [...l, { chave, nome: f.name, tamanho: f.size, fracao: 0 }]);
      // um por vez: varios uploads de GBs em paralelo so disputam o mesmo disco
      fila.current = fila.current.then(async () => {
        const { promessa, cancelar } = enviarDriver(id, f, (fracao) => atualizar(chave, { fracao }));
        atualizar(chave, { cancelar });
        try {
          const info = await promessa;
          setDrivers((d) => [...d.filter((x) => x.arquivo !== info.arquivo), info].sort((a, b) => a.arquivo.localeCompare(b.arquivo)));
          setEnvios((l) => l.filter((e) => e.chave !== chave));
        } catch (e) {
          atualizar(chave, { erro: (e as Error).message, cancelar: undefined });
        }
      });
    }
    if (input.current) input.current.value = "";
  }

  async function excluir(arquivo: string) {
    if (!confirm(`Excluir ${arquivo}? Para usar de novo será preciso enviá-lo outra vez.`)) return;
    try {
      await api.excluirDriver(id, arquivo);
      setDrivers((d) => d.filter((x) => x.arquivo !== arquivo));
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  const total = drivers.reduce((s, d) => s + d.tamanho, 0);
  const enviando = envios.some((e) => !e.erro);

  return (
    <Secao
      titulo="Drivers"
      descricao="Pacotes de drivers dos modelos de computador. Entram no ZIP e o script os adiciona ao repositório de drivers do Windows em Modo Auditoria."
    >
      <Cartao titulo="Pacotes de drivers">
        <div
          className="envio"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            adicionar(e.dataTransfer.files);
          }}
        >
          <div className="envio-vazio">
            <Upload size={22} aria-hidden />
            <span>Arraste aqui os Driver Packs (.cab, .zip ou .exe), um por modelo</span>
          </div>
          <div className="envio-acoes">
            <button type="button" className="botao secundario" onClick={() => input.current?.click()}>
              Escolher arquivos
            </button>
            {enviando && <span className="envio-info">Mantenha esta página aberta até terminar o envio.</span>}
          </div>
          <input ref={input} type="file" accept={EXTENSOES.join(",")} multiple hidden onChange={(e) => adicionar(e.target.files)} />
        </div>
        {erro && <small className="erro-campo">{erro}</small>}

        {envios.length > 0 && (
          <ul className="lista-drivers">
            {envios.map((e) => (
              <li key={e.chave}>
                <div className="driver-linha">
                  <span className="driver-nome">{e.nome}</span>
                  <span className="envio-info">
                    {e.erro ? <span className="erro-campo">{e.erro}</span> : `${Math.round(e.fracao * 100)}% de ${formatarTamanho(e.tamanho)}`}
                  </span>
                  {e.erro ? (
                    <button type="button" className="icone" title="Dispensar" onClick={() => setEnvios((l) => l.filter((x) => x.chave !== e.chave))}>
                      <X size={16} />
                    </button>
                  ) : (
                    <button type="button" className="icone perigo" title="Cancelar envio" disabled={!e.cancelar} onClick={() => e.cancelar?.()}>
                      <X size={16} />
                    </button>
                  )}
                </div>
                {!e.erro && <Progresso fracao={e.fracao} />}
              </li>
            ))}
          </ul>
        )}

        {drivers.length > 0 ? (
          <>
            <ul className="lista-drivers">
              {drivers.map((d) => (
                <li key={d.arquivo}>
                  <div className="driver-linha">
                    <HardDriveDownload size={16} aria-hidden />
                    <span className="driver-nome">{d.arquivo}</span>
                    <span className="envio-info">{formatarTamanho(d.tamanho)}</span>
                    <button type="button" className="icone perigo" title="Excluir pacote" onClick={() => excluir(d.arquivo)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="dica">
              {drivers.length} pacote(s) · {formatarTamanho(total)} no ZIP. Já ficam salvos no servidor, sem precisar clicar em “Salvar”.
            </p>
          </>
        ) : (
          !envios.length && <p className="vazio">Nenhum pacote enviado. Sem drivers aqui, o script pula esta etapa.</p>
        )}
      </Cartao>

      <Cartao titulo="O que o script faz com eles">
        <ol className="passos">
          <li>
            Extrai cada pacote: <code>.cab</code> com <code>expand</code>, <code>.zip</code> com <code>tar</code> e <code>.exe</code> da Dell
            com <code>/s /e=pasta</code>.
          </li>
          <li>
            Roda <code>pnputil /add-driver *.inf /subdirs</code>, <strong>sem</strong> <code>/install</code>: os drivers vão para o
            repositório (<code>DriverStore</code>), não são instalados nesta máquina.
          </li>
          <li>Apaga a pasta extraída. O Sysprep mantém o repositório e cada máquina clonada instala só o que é do próprio hardware.</li>
        </ol>
        <p className="dica">Ao rodar o script de novo (depois de um reinício), pacotes já adicionados são pulados.</p>
      </Cartao>

      <Nota tipo="aviso">
        <strong>Dell:</strong> baixe o <em>Driver Pack</em> de cada modelo para Windows 11 x64 (página “Dell Command | Deploy Driver
        Packs”), não os drivers soltos da página do modelo. Antes de implantar, na BIOS (F2), em <em>Storage → SATA/NVMe Operation</em>,
        use <strong>AHCI</strong> em todas as máquinas. Em “RAID On” (Intel RST/VMD) a imagem pode não iniciar
        (<code>INACCESSIBLE_BOOT_DEVICE</code>).
      </Nota>
      {perfil.sysprep.manter_drivers && drivers.length > 1 && (
        <Nota tipo="aviso">
          “Manter drivers instalados” está ligado na seção Sysprep. Com vários modelos, desligue.
        </Nota>
      )}
    </Secao>
  );
}
