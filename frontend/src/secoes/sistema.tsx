import { useEditor } from "../editor";
import { Cartao, Escolha, Grade, ListaMarcavel, Nota, Secao, Senha, Texto, Toggle } from "../componentes/campos";

export function Oobe() {
  return (
    <Secao
      titulo="Primeiro boot (OOBE)"
      descricao="Telas de configuração inicial que o usuário veria depois da imagem aplicada. Com tudo ligado, a máquina vai direto para a tela de login."
    >
      <Cartao titulo="Pular o OOBE">
        <Toggle caminho="oobe.pular_oobe_maquina" rotulo="Pular OOBE da máquina (SkipMachineOOBE)" dica="Obsoleto na documentação, mas é o que efetivamente pula o OOBE em imagem sysprepada." />
        <Toggle caminho="oobe.pular_oobe_usuario" rotulo="Pular OOBE do usuário (SkipUserOOBE)" />
        <Toggle caminho="oobe.ocultar_privacidade" rotulo="Pular as telas de privacidade" dica="DisablePrivacyExperience. Sem isso o Windows 11 ainda mostra as perguntas de privacidade." />
        <Toggle caminho="oobe.dispensar_internet" rotulo="Não exigir internet (BypassNRO)" />
        <Toggle caminho="oobe.sem_animacao_primeiro_logon" rotulo="Sem animação de primeiro logon (“Olá”, “Estamos preparando…”)" />
        <Toggle caminho="oobe.sem_scoobe" rotulo="Sem “Vamos terminar de configurar seu dispositivo”" dica="Aplicado na máquina e no perfil de cada usuário." />
      </Cartao>
      <Cartao titulo="Telas individuais">
        <Grade>
          <Toggle caminho="oobe.ocultar_eula" rotulo="Ocultar licença (EULA)" />
          <Toggle caminho="oobe.ocultar_conta_local" rotulo="Ocultar criação de conta local" />
          <Toggle caminho="oobe.ocultar_contas_online" rotulo="Ocultar conta Microsoft" />
          <Toggle caminho="oobe.ocultar_registro_oem" rotulo="Ocultar registro do fabricante" />
          <Toggle caminho="oobe.ocultar_wifi" rotulo="Ocultar configuração de Wi-Fi" />
        </Grade>
      </Cartao>
      <Cartao titulo="Padrões aceitos automaticamente">
        <Escolha
          caminho="oobe.proteger_pc"
          rotulo="Configurações de proteção (ProtectYourPC)"
          opcoes={[
            { valor: 1, rotulo: "1 · Recomendadas", descricao: "Atualizações e envio de dados ligados" },
            { valor: 2, rotulo: "2 · Só atualizações", descricao: "Instala apenas atualizações importantes" },
            { valor: 3, rotulo: "3 · Nenhuma", descricao: "Não liga nada automaticamente" },
          ]}
        />
        <Escolha
          caminho="oobe.local_rede"
          rotulo="Local da rede"
          opcoes={[
            { valor: "Work", rotulo: "Trabalho" },
            { valor: "Home", rotulo: "Casa" },
            { valor: "Other", rotulo: "Pública" },
          ]}
        />
      </Cartao>
    </Secao>
  );
}

export function AcessoRemoto() {
  const { perfil } = useEditor();
  const r = perfil.rede;
  return (
    <Secao titulo="Acesso remoto" descricao="Área de Trabalho Remota e PowerShell remoto nas máquinas clonadas.">
      <Cartao titulo="Área de Trabalho Remota (RDP)" extra={<Toggle caminho="rede.rdp_ativo" rotulo="Ativar" />}>
        {r.rdp_ativo ? (
          <>
            <Toggle caminho="rede.rdp_nla" rotulo="Exigir autenticação no nível da rede (NLA)" dica="Recomendado. Sem NLA o servidor aceita a conexão antes de autenticar." />
            <Toggle caminho="rede.rdp_tls" rotulo="Exigir TLS (SecurityLayer 2)" />
            <p className="dica">A regra de firewall “Remote Desktop” é liberada automaticamente.</p>
          </>
        ) : (
          <p className="vazio">RDP desligado (padrão do Windows).</p>
        )}
      </Cartao>
      <Cartao titulo="PowerShell remoto">
        <Toggle caminho="rede.winrm_ativo" rotulo="Habilitar WinRM no primeiro logon" dica="Enable-PSRemoting. Libere também o grupo “Windows Remote Management” em Firewall." />
      </Cartao>
    </Secao>
  );
}

export function Firewall() {
  const { perfil, catalogo } = useEditor();
  const r = perfil.rede;
  return (
    <Secao titulo="Firewall" descricao="Perfis do Firewall do Windows e grupos de regras liberados.">
      <Cartao titulo="Perfis">
        <Grade colunas={3}>
          <Toggle caminho="rede.firewall.dominio" rotulo="Perfil Domínio" />
          <Toggle caminho="rede.firewall.privado" rotulo="Perfil Privado" />
          <Toggle caminho="rede.firewall.publico" rotulo="Perfil Público" />
        </Grade>
      </Cartao>
      <Cartao titulo="Grupos de regras liberados">
        <ListaMarcavel caminho="rede.firewall.grupos_liberados" itens={catalogo.grupos_firewall.filter((g) => !(r.rdp_ativo && g.id === "Remote Desktop"))} />
      </Cartao>
    </Secao>
  );
}

export function Dominio() {
  const { perfil } = useEditor();
  const r = perfil.rede;
  return (
    <Secao titulo="Domínio" descricao="Ingresso em grupo de trabalho ou domínio Active Directory.">
      <Cartao titulo="Grupo de trabalho / domínio">
        <Escolha
          caminho="rede.ingresso.modo"
          rotulo="Ingresso"
          opcoes={[
            { valor: "nenhum", rotulo: "Não alterar", descricao: "WORKGROUP padrão" },
            { valor: "grupo_trabalho", rotulo: "Grupo de trabalho" },
            { valor: "dominio", rotulo: "Domínio Active Directory" },
          ]}
        />
        {r.ingresso.modo === "grupo_trabalho" && <Texto caminho="rede.ingresso.grupo_trabalho" rotulo="Nome do grupo de trabalho" maiusculas />}
        {r.ingresso.modo === "dominio" && (
          <>
            <Grade>
              <Texto caminho="rede.ingresso.dominio" rotulo="Domínio" placeholder="empresa.local" />
              <Texto caminho="rede.ingresso.usuario" rotulo="Usuário com permissão de ingresso" />
              <Senha caminho="rede.ingresso.senha" rotulo="Senha" />
              <Texto caminho="rede.ingresso.ou" rotulo="OU (opcional)" placeholder="OU=Computadores,DC=empresa,DC=local" mono />
            </Grade>
            {perfil.tela_inicial.ativo ? (
              <Nota>
                A <strong>Tela inicial</strong> está ativa: é ela que entra no domínio, já com o nome escolhido. A OU acima vale para os
                locais sem OU própria. Use uma conta que só tenha permissão de ingresso.
              </Nota>
            ) : (
              <Nota tipo="aviso">A senha do domínio vai em texto puro no XML. Use uma conta que só tenha permissão de ingresso.</Nota>
            )}
          </>
        )}
      </Cartao>
    </Secao>
  );
}
