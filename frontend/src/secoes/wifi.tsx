import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useEditor } from "../editor";
import { Cartao, Grade, Nota, Secao, Selecao, Senha, Texto, Toggle } from "../componentes/campos";
import type { RedeWifi } from "../tipos";

const nova = (): RedeWifi => ({ ssid: "", seguranca: "wpa2", senha: "", oculta: false, conectar_auto: true });

const SEGURANCA = [
  { valor: "wpa2", rotulo: "WPA2-Pessoal (também conecta em rede WPA2/WPA3)" },
  { valor: "wpa3", rotulo: "WPA3-Pessoal (somente WPA3)" },
  { valor: "aberta", rotulo: "Aberta (sem senha)" },
];

export function Wifi() {
  const { perfil, set } = useEditor();
  const redes = perfil.wifi.redes;
  const setRedes = (l: RedeWifi[]) => set("wifi.redes", l);

  const remover = (i: number) => {
    if (!confirm(`Excluir a rede "${redes[i].ssid || "sem nome"}"?`)) return;
    setRedes(redes.filter((_, j) => j !== i));
  };
  const mover = (i: number, d: -1 | 1) => {
    const l = [...redes];
    [l[i], l[i + d]] = [l[i + d], l[i]];
    setRedes(l);
  };

  return (
    <Secao
      titulo="Redes Wi-Fi"
      descricao="Redes que a máquina clonada já conhece ao ligar. A ordem da lista é a prioridade: com várias redes ao alcance, o Windows prefere a primeira."
    >
      <div className="contas">
        {redes.map((r, i) => (
          <Cartao
            key={i}
            titulo={r.ssid || "Nova rede"}
            extra={
              <div className="acoes-linha">
                <span className="selo">Prioridade {i + 1}</span>
                <button type="button" className="icone" title="Subir" disabled={i === 0} onClick={() => mover(i, -1)}>
                  <ArrowUp size={16} />
                </button>
                <button type="button" className="icone" title="Descer" disabled={i === redes.length - 1} onClick={() => mover(i, 1)}>
                  <ArrowDown size={16} />
                </button>
                <button type="button" className="icone perigo" title="Excluir rede" onClick={() => remover(i)}>
                  <Trash2 size={16} />
                </button>
              </div>
            }
          >
            <Grade>
              <Texto caminho={`wifi.redes.${i}.ssid`} rotulo="Nome da rede (SSID)" maxLength={32} dica="Exatamente como aparece, com maiúsculas e espaços." />
              <Selecao caminho={`wifi.redes.${i}.seguranca`} rotulo="Segurança" opcoes={SEGURANCA} />
              {r.seguranca !== "aberta" && <Senha caminho={`wifi.redes.${i}.senha`} rotulo="Senha da rede" dica="De 8 a 63 caracteres." />}
            </Grade>
            <Grade>
              <Toggle caminho={`wifi.redes.${i}.conectar_auto`} rotulo="Conectar automaticamente" />
              <Toggle caminho={`wifi.redes.${i}.oculta`} rotulo="Rede oculta" dica="O SSID não é transmitido pelo roteador." />
            </Grade>
          </Cartao>
        ))}
        <button type="button" className="botao adicionar" onClick={() => setRedes([...redes, nova()])}>
          <Plus size={16} /> Adicionar rede
        </button>
      </div>

      <Nota>
        Conectar no Wi-Fi na máquina de referência não basta: o Windows prende cada rede à placa, e o generalize e o hardware
        diferente a descartam. Por isso o pacote leva um perfil por rede, e uma tarefa agendada os importa como SYSTEM na
        inicialização da máquina clonada, antes do login, para qualquer placa Wi-Fi. Sem placa, ela tenta de novo nas próximas
        inicializações (até 5). O driver Wi-Fi precisa estar na imagem ou na seção <strong>Drivers</strong>.
      </Nota>
      <Nota tipo="aviso">
        A senha vai em texto puro no pacote e na imagem capturada (pasta restrita a SYSTEM e Administradores), até a máquina
        clonada importar as redes e apagar os arquivos. Redes corporativas com usuário e senha (WPA2/WPA3-Enterprise, 802.1X)
        não são suportadas aqui: use GPO ou Intune.
      </Nota>
    </Secao>
  );
}
