import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useEditor } from "../editor";
import { Cartao, Escolha, Grade, ListaMarcavel, Nota, Numero, Secao, Selecao, Texto, Toggle } from "../componentes/campos";
import type { Comando, Variavel } from "../tipos";

export function Privacidade() {
  return (
    <Secao titulo="Privacidade e sugestões" descricao="Políticas gravadas em HKLM no passe specialize (e algumas também no perfil de cada usuário).">
      <Cartao titulo="Telemetria">
        <Escolha
          caminho="privacidade.telemetria"
          rotulo="Nível de dados de diagnóstico"
          opcoes={[
            { valor: "padrao", rotulo: "Padrão", descricao: "Não altera" },
            { valor: "obrigatoria", rotulo: "Só obrigatórios (1)" },
            { valor: "desligada", rotulo: "Segurança (0)", descricao: "Só Enterprise/Education" },
          ]}
        />
      </Cartao>
      <Cartao titulo="Sugestões e anúncios">
        <Toggle caminho="privacidade.desativar_apps_sugeridos" rotulo="Não instalar apps sugeridos/promocionais" dica="DisableWindowsConsumerFeatures (Candy Crush, Spotify, etc.)." />
        <Toggle caminho="privacidade.desativar_dicas_usuario" rotulo="Sem dicas, truques e sugestões no Iniciar e em Configurações" />
        <Toggle caminho="privacidade.desativar_id_publicidade" rotulo="Desativar ID de publicidade" />
        <Toggle caminho="privacidade.desativar_pesquisa_web" rotulo="Pesquisa do Iniciar sem resultados da web (Bing)" />
      </Cartao>
      <Cartao titulo="Dados pessoais">
        <Toggle caminho="privacidade.desativar_historico_atividades" rotulo="Desativar histórico de atividades" />
        <Toggle caminho="privacidade.desativar_localizacao" rotulo="Desativar serviço de localização" />
        <Toggle caminho="privacidade.desativar_copilot_politica" rotulo="Desligar Windows Copilot por política" dica="Complementa a remoção do app Copilot na seção Apps." />
      </Cartao>
    </Secao>
  );
}

export function Apps() {
  const { perfil, catalogo, set } = useEditor();
  const recomendados = catalogo.apps.filter((a) => a.padrao_lab).map((a) => a.id);
  return (
    <Secao
      titulo="Apps e recursos do Windows"
      descricao="Removidos pelo script de preparo em Modo Auditoria: para todos os usuários E desprovisionados (senão o Sysprep falha)."
    >
      <Cartao
        titulo="Apps a remover"
        extra={
          <div className="acoes-linha">
            <button type="button" className="botao chip" onClick={() => set("apps.remover", Array.from(new Set([...perfil.apps.remover, ...recomendados])))}>
              Marcar recomendados para uso compartilhado
            </button>
            <button type="button" className="botao chip" onClick={() => set("apps.remover", [])}>
              Limpar
            </button>
          </div>
        }
      >
        <ListaMarcavel caminho="apps.remover" itens={catalogo.apps} agrupar />
        <div className="campo">
          <label htmlFor="extras">Outros pacotes (um por linha, prefixo do nome)</label>
          <textarea
            id="extras"
            className="mono"
            rows={3}
            value={perfil.apps.remover_extras.join("\n")}
            placeholder="SpotifyAB.SpotifyMusic"
            onChange={(e) => set("apps.remover_extras", e.target.value.split("\n"))}
          />
          <small className="dica">
            O script lista no passo 9 os apps “instalados por usuário e não provisionados”. Cole aqui os nomes que ele apontar.
          </small>
        </div>
      </Cartao>

      <Cartao titulo="OneDrive e Edge">
        <Toggle caminho="apps.remover_onedrive" rotulo="Remover o OneDrive" dica="Desinstala, bloqueia a sincronização por política e impede a reinstalação em perfis novos." />
        <Toggle caminho="apps.edge_sem_primeira_execucao" rotulo="Edge sem assistente de primeira execução" />
        <Texto caminho="apps.edge_pagina_inicial" rotulo="Página inicial do Edge (opcional)" placeholder="https://" />
      </Cartao>

      <Cartao titulo="Recursos opcionais">
        <Grade>
          <div>
            <h4 className="subtitulo">Ativar</h4>
            <ListaMarcavel caminho="apps.recursos_ativar" itens={catalogo.recursos.filter((r) => r.acao === "ativar")} />
          </div>
          <div>
            <h4 className="subtitulo">Desativar</h4>
            <ListaMarcavel caminho="apps.recursos_desativar" itens={catalogo.recursos.filter((r) => r.acao === "desativar")} />
          </div>
        </Grade>
      </Cartao>
    </Secao>
  );
}

const ESCOPOS = [
  { valor: "maquina", rotulo: "Máquina (todos os usuários)" },
  { valor: "usuario", rotulo: "Usuário (cada conta nova)" },
];

export function Variaveis() {
  const { perfil, set } = useEditor();
  const lista = perfil.variaveis;
  const gravar = (l: Variavel[]) => set("variaveis", l);
  return (
    <Secao
      titulo="Variáveis de ambiente"
      descricao="Gravadas no registro pelo script de preparo, em Modo Auditoria. O generalize preserva o registro: cada máquina clonada já nasce com elas."
    >
      <div className="contas">
        {lista.map((v, i) => (
          <Cartao
            key={i}
            titulo={v.nome || "Nova variável"}
            extra={
              <button type="button" className="icone perigo" title="Excluir variável" onClick={() => gravar(lista.filter((_, j) => j !== i))}>
                <Trash2 size={16} />
              </button>
            }
          >
            <Grade>
              <Texto caminho={`variaveis.${i}.nome`} rotulo="Nome" placeholder="ANDROID_HOME" mono />
              <Selecao caminho={`variaveis.${i}.escopo`} rotulo="Escopo" opcoes={ESCOPOS} />
            </Grade>
            <Texto
              caminho={`variaveis.${i}.valor`}
              rotulo="Valor"
              placeholder={v.acrescentar ? "%ANDROID_HOME%\\platform-tools;%ANDROID_HOME%\\emulator" : "C:\\Android\\Sdk"}
              dica="Pode citar outra variável entre %, ex.: %ANDROID_HOME%\platform-tools. Vários itens separados por ;"
              mono
            />
            <Toggle
              caminho={`variaveis.${i}.acrescentar`}
              rotulo="Acrescentar ao valor atual"
              dica="Para listas como o Path: junta os itens ao fim, sem repetir os que já existem. Desligado, substitui o valor."
            />
          </Cartao>
        ))}
        <button type="button" className="botao adicionar" onClick={() => gravar([...lista, { nome: "", valor: "", escopo: "maquina", acrescentar: false }])}>
          <Plus size={16} /> Adicionar variável
        </button>
      </div>
      <Nota>
        Exemplo (Android Studio): <code>ANDROID_HOME = C:\Android\Sdk</code>, <code>JAVA_HOME = C:\Program Files\Android\Android Studio\jbr</code> e{" "}
        <code>Path</code> com “acrescentar” = <code>%ANDROID_HOME%\platform-tools;%JAVA_HOME%\bin</code>, todas no escopo Máquina.
      </Nota>
      <Nota tipo="aviso">
        Instale SDKs e ferramentas numa pasta da máquina (ex.: <code>C:\Android\Sdk</code>), não no padrão por usuário (
        <code>%LOCALAPPDATA%</code>): o perfil do Administrador de auditoria não chega às contas das máquinas clonadas, e a variável
        apontaria para uma pasta que não existe.
      </Nota>
    </Secao>
  );
}

export function Energia() {
  return (
    <Secao titulo="Energia" descricao="Aplicado com powercfg no passe specialize, em cada máquina clonada.">
      <Cartao>
        <Escolha
          caminho="energia.plano"
          rotulo="Plano de energia"
          opcoes={[
            { valor: "padrao", rotulo: "Padrão" },
            { valor: "equilibrado", rotulo: "Equilibrado" },
            { valor: "alto_desempenho", rotulo: "Alto desempenho" },
          ]}
        />
        <Grade>
          <Numero caminho="energia.desligar_tela_min" rotulo="Desligar a tela após" vazioNulo sufixo="min (0 = nunca)" />
          <Numero caminho="energia.suspender_min" rotulo="Suspender após" vazioNulo sufixo="min (0 = nunca)" />
        </Grade>
        <Toggle caminho="energia.desativar_hibernacao" rotulo="Desativar hibernação" dica="Libera o espaço do hiberfil.sys." />
        <Toggle caminho="energia.desativar_inicializacao_rapida" rotulo="Desativar inicialização rápida" dica="Recomendado para Wake-on-LAN e dual boot." />
      </Cartao>
    </Secao>
  );
}

export function Atualizacoes() {
  return (
    <Secao titulo="Windows Update" descricao="Políticas das máquinas clonadas. Durante o preparo, o script sempre para o Windows Update.">
      <Cartao>
        <Escolha
          caminho="atualizacoes.politica"
          rotulo="Atualizações automáticas"
          opcoes={[
            { valor: "padrao", rotulo: "Padrão", descricao: "Baixa e instala sozinho" },
            { valor: "notificar", rotulo: "Apenas notificar", descricao: "Avisa antes de baixar" },
            { valor: "desativar_automatica", rotulo: "Desativar automáticas", descricao: "Só manual" },
          ]}
        />
        <Toggle caminho="atualizacoes.sem_reinicio_com_usuario" rotulo="Não reiniciar sozinho com usuário conectado" />
        <Toggle caminho="atualizacoes.loja_sem_atualizacao_automatica" rotulo="Microsoft Store sem atualização automática de apps" />
      </Cartao>
    </Secao>
  );
}

export function Seguranca() {
  return (
    <Secao titulo="Segurança">
      <Cartao>
        <Toggle
          caminho="seguranca.impedir_bitlocker_automatico"
          rotulo="Impedir a criptografia automática do dispositivo (BitLocker)"
          dica="O Windows 11 24H2 criptografa o disco sozinho no primeiro logon com conta Microsoft/Entra. Sem a chave de recuperação, o disco fica inacessível."
        />
        <Escolha
          caminho="seguranca.uac"
          rotulo="Controle de Conta de Usuário (UAC)"
          opcoes={[
            { valor: "padrao", rotulo: "Padrão" },
            { valor: "sem_prompt_admin", rotulo: "Sem confirmação para administradores", descricao: "Eleva sem perguntar (UAC continua ligado)" },
          ]}
        />
        <Toggle caminho="seguranca.desativar_smartscreen" rotulo="Desativar SmartScreen" />
        <Toggle caminho="seguranca.desativar_hello_empresarial" rotulo="Não pedir configuração do Windows Hello (PIN)" />
        <Toggle caminho="seguranca.caminhos_longos" rotulo="Permitir caminhos com mais de 260 caracteres" />
      </Cartao>
    </Secao>
  );
}

export function Sysprep() {
  return (
    <Secao titulo="Execução do Sysprep" descricao="Como o script chama o sysprep.exe e o que acontece depois.">
      <Cartao>
        <Escolha
          caminho="sysprep.entrar_em"
          rotulo="Após generalizar, a imagem inicia em"
          opcoes={[
            { valor: "oobe", rotulo: "OOBE (/oobe)", descricao: "Uso normal: a imagem vai para produção." },
            { valor: "audit", rotulo: "Auditoria (/audit)", descricao: "Para continuar ajustando uma imagem já generalizada." },
          ]}
        />
        <Escolha
          caminho="sysprep.ao_final"
          rotulo="Ao terminar"
          opcoes={[
            { valor: "desligar", rotulo: "Desligar", descricao: "Para capturar pelo WinPE/DISM" },
            { valor: "reiniciar", rotulo: "Reiniciar" },
            { valor: "nada", rotulo: "Manter ligado" },
          ]}
        />
        <Escolha
          caminho="sysprep.arquitetura"
          rotulo="Arquitetura"
          opcoes={[
            { valor: "amd64", rotulo: "x64 (amd64)" },
            { valor: "arm64", rotulo: "ARM64" },
          ]}
        />
      </Cartao>
      <Cartao titulo="Opções avançadas">
        <Toggle caminho="sysprep.restaurar_windows_update" rotulo="Restaurar o Windows Update nas máquinas clonadas" dica="O script desabilita wuauserv e UsoSvc antes do Sysprep. Isto os devolve ao padrão no specialize." />
        <Toggle caminho="sysprep.manter_drivers" rotulo="Manter drivers instalados (PersistAllDeviceInstalls)" dica="Só quando TODAS as máquinas têm o mesmo hardware. Acelera o primeiro boot. Com drivers de vários modelos, deixe desligado." />
        <Toggle caminho="sysprep.pular_rearm" rotulo="Não consumir rearm (SkipRearm)" dica="Permite generalizar mesmo com a contagem de rearm esgotada." />
        <Toggle caminho="sysprep.modo_vm" rotulo="Modo máquina virtual (/mode:vm)" dica="Só para VHD que será implantado no MESMO hipervisor/hardware virtual." />
      </Cartao>
    </Secao>
  );
}

function ListaComandos({ caminho, titulo, dica }: { caminho: "especializacao" | "primeiro_logon"; titulo: string; dica: string }) {
  const { perfil, set } = useEditor();
  const lista = perfil.comandos[caminho];
  const gravar = (l: Comando[]) => set(`comandos.${caminho}`, l);
  const mover = (i: number, d: -1 | 1) => {
    const l = [...lista];
    [l[i], l[i + d]] = [l[i + d], l[i]];
    gravar(l);
  };
  return (
    <Cartao titulo={titulo}>
      <p className="dica">{dica}</p>
      {lista.map((c, i) => (
        <div key={i} className="comando">
          <span className="comando-ordem">{i + 1}</span>
          <div className="comando-campos">
            <input value={c.descricao} placeholder="Descrição" onChange={(e) => gravar(lista.map((x, j) => (j === i ? { ...x, descricao: e.target.value } : x)))} />
            <textarea
              className="mono"
              rows={2}
              value={c.comando}
              placeholder='reg.exe add "HKLM\..." /v Nome /t REG_DWORD /d 1 /f'
              onChange={(e) => gravar(lista.map((x, j) => (j === i ? { ...x, comando: e.target.value } : x)))}
            />
          </div>
          <div className="comando-acoes">
            <button type="button" className="icone" disabled={i === 0} onClick={() => mover(i, -1)} title="Subir">
              <ArrowUp size={16} />
            </button>
            <button type="button" className="icone" disabled={i === lista.length - 1} onClick={() => mover(i, 1)} title="Descer">
              <ArrowDown size={16} />
            </button>
            <button type="button" className="icone perigo" onClick={() => gravar(lista.filter((_, j) => j !== i))} title="Remover">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="botao adicionar" onClick={() => gravar([...lista, { descricao: "", comando: "" }])}>
        <Plus size={16} /> Adicionar comando
      </button>
    </Cartao>
  );
}

export function Comandos() {
  return (
    <Secao titulo="Comandos personalizados" descricao="Para o que não tem opção pronta. Os comandos rodam depois dos ajustes gerados pelas outras seções.">
      <ListaComandos
        caminho="especializacao"
        titulo="Passe specialize (RunSynchronous)"
        dica="Roda como SYSTEM, antes de qualquer usuário existir. Ideal para reg.exe em HKLM, powercfg e sc.exe. Não há área de trabalho nem rede garantida."
      />
      <ListaComandos
        caminho="primeiro_logon"
        titulo="Primeiro logon (FirstLogonCommands)"
        dica="Roda uma vez, com privilégio elevado, no primeiro logon de um usuário. Tem rede e PowerShell completo."
      />
      <Nota>
        O executável é chamado direto, sem <code>cmd</code>: para usar <code>&amp;&amp;</code>, <code>|</code> ou redirecionamento, comece com{" "}
        <code>cmd.exe /c</code>. Limite de 1024 caracteres por comando.
      </Nota>
    </Secao>
  );
}
