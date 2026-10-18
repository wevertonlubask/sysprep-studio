module.exports = {
  num: 6,
  titulo: "Rede, segurança e políticas",
  subtitulo: "Wi-Fi, Acesso remoto, Firewall, Segurança, Privacidade e Windows Update",
  blocos: [
    { h2: "6.1 Wi-Fi" },
    { p: "Redes que a máquina clonada já conhece ao ligar, antes de qualquer login. A ordem da lista é a prioridade: com várias redes ao alcance, o Windows prefere a primeira." },
    { fig: "06-01-wifi.png", legenda: "Seção Wi-Fi com duas redes." },
    { passos: [
      "Em cada rede [1], informe o **SSID** exatamente como aparece (maiúsculas e espaços contam), a **Segurança** (WPA2-Pessoal, WPA3-Pessoal ou Aberta) e a senha.",
      "Ligue **Rede oculta** se o roteador não transmite o nome, e desligue **Conectar automaticamente** para redes que o usuário deve escolher.",
      "**Adicionar rede** [2] inclui outra; as setas mudam a prioridade.",
    ] },
    { p: "Conectar no Wi-Fi na máquina de referência não basta: o Windows prende cada rede à placa, e o Sysprep e o hardware diferente a descartam. Por isso o pacote leva um perfil por rede, e uma tarefa agendada os importa na inicialização da máquina clonada, para qualquer placa. Sem placa Wi-Fi (driver ainda instalando), ela tenta de novo nas próximas inicializações, até 5 vezes." },
    { caixa: "atencao", texto: "O driver da placa Wi-Fi precisa estar na imagem ou num pacote da seção **Drivers**. Redes corporativas com usuário e senha (WPA2/WPA3-Enterprise, 802.1X) não são suportadas aqui: use GPO ou Intune." },
    { caixa: "importante", texto: "As senhas Wi-Fi vão em texto puro no pacote e na imagem (pasta restrita a SYSTEM e Administradores) até a máquina clonada importar as redes e apagar os arquivos." },

    { h2: "6.2 Acesso remoto" },
    { fig: "06-02-acesso-remoto.png", legenda: "Seção Acesso remoto.", largura: 0.85 },
    { lista: [
      "**Área de Trabalho Remota (RDP)**: liga o RDP e libera a regra do firewall. Mantenha **NLA** e **TLS** ligados.",
      "**PowerShell remoto**: roda `Enable-PSRemoting` no primeiro logon. Libere também o grupo \"Windows Remote Management\" na seção Firewall.",
    ] },

    { h2: "6.3 Firewall" },
    { p: "Liga ou desliga os perfis Domínio, Privado e Público do Firewall do Windows e libera grupos de regras prontos (compartilhamento de arquivos, ping, gerenciamento remoto...)." },
    { fig: "06-03-firewall.png", legenda: "Seção Firewall.", largura: 0.85 },

    { h2: "6.4 Segurança" },
    { fig: "06-04-seguranca.png", legenda: "Seção Segurança.", largura: 0.85 },
    { lista: [
      "**Impedir a criptografia automática (BitLocker)**: o Windows 11 24H2 criptografa o disco sozinho em certas condições. Sem a chave de recuperação guardada, o disco fica inacessível numa troca de placa. Ligue, a menos que a empresa gerencie o BitLocker.",
      "**UAC**: padrão ou sem confirmação para administradores (o UAC continua ligado).",
      "**SmartScreen**, **Windows Hello (PIN)** e **caminhos longos** (mais de 260 caracteres).",
    ] },

    { h2: "6.5 Privacidade" },
    { p: "Nível de telemetria, apps sugeridos e promocionais, dicas no Iniciar, ID de publicidade, resultados do Bing na pesquisa, histórico de atividades, localização e Copilot por política." },
    { fig: "06-05-privacidade.png", legenda: "Seção Privacidade.", largura: 0.85 },

    { h2: "6.6 Windows Update" },
    { p: "Política de atualização das máquinas clonadas: padrão, só notificar ou sem atualização automática; sem reinício com usuário conectado; Microsoft Store sem atualizar apps sozinha." },
    { fig: "06-06-windows-update.png", legenda: "Seção Windows Update.", largura: 0.85 },
    { caixa: "dica", texto: "Durante o preparo, o script sempre para o Windows Update (atualização em andamento é uma das maiores causas de falha do Sysprep). A opção **Restaurar o Windows Update**, na seção Sysprep, devolve os serviços ao normal nas máquinas clonadas." },
  ],
};
