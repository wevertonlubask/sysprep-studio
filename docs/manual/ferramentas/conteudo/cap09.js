module.exports = {
  num: 9,
  titulo: "Na máquina de referência",
  subtitulo: "Modo Auditoria, o script de preparo, o Sysprep e a captura",
  blocos: [
    { p: "O `LEIA-ME.txt` do pacote repete este passo a passo e resume o que o perfil faz. Leia-o antes de começar." },
    { fig: "09-01-leia-me-como-usar.png", legenda: "Início do LEIA-ME.txt do pacote.", largura: 0.85 },

    { h2: "9.1 Entrar em Modo Auditoria" },
    { passos: [
      "Instale o Windows 11 na máquina de referência a partir da mídia oficial, na edição que será usada (Pro, Education, Enterprise...).",
      "Na primeira tela da configuração inicial (escolha da região), tecle `Ctrl+Shift+F3`. A máquina reinicia e entra sozinha como **Administrador**, em Modo Auditoria.",
      "Feche a janela **Ferramenta de Preparação do Sistema** que abre sozinha. Ela vai abrir de novo a cada reinício: feche sempre.",
    ] },
    { caixa: "atencao", texto: "Não crie usuário nem entre com conta Microsoft na máquina de referência. Se a configuração inicial já passou da primeira tela, reinstale o Windows." },

    { h2: "9.2 Instalar programas e atualizar" },
    { lista: [
      "Instale os programas da empresa como faria numa máquina comum. Prefira instaladores \"para todos os usuários\".",
      "Atualize o Windows pelo Windows Update e reinicie quantas vezes for preciso: em Modo Auditoria a máquina volta sempre para a auditoria.",
      "Evite instalar apps da Microsoft Store: o que é instalado para um usuário e não para a imagem faz o Sysprep falhar.",
    ] },

    { h2: "9.3 Rodar o script de preparo" },
    { passos: [
      "Conecte o pendrive com o pacote extraído (ou copie a pasta do pacote para o disco).",
      "Dê duplo clique em **Preparar-Imagem.cmd** e confirme a elevação.",
      "Acompanhe as etapas na janela. Se o script pedir **reinício**, reinicie e rode o `.cmd` de novo: ele continua de onde parou.",
      "No fim, confira a lista de contas e digite `SYSPREP` (em maiúsculas) para generalizar. Qualquer outra coisa cancela sem generalizar.",
    ] },
    { caixa: "dica", texto: "Para testar sem generalizar, rode no Prompt de Comando `Preparar-Imagem.cmd /preparar`. Todas as etapas são aplicadas, menos o Sysprep." },
    { tabela: {
      cab: ["Etapa", "O que o script faz"],
      larguras: [1100, 8538],
      linhas: [
        ["0", "Confere se roda como administrador e em Modo Auditoria, a contagem de rearm, o `sysprep.xml`, as contas que serão criadas e o tamanho das imagens."],
        ["1", "Copia imagens e scripts para o Windows (perfis Wi-Fi e Tela inicial em pasta restrita)."],
        ["2", "Extrai os pacotes de drivers e os adiciona ao repositório de drivers, sem instalar."],
        ["3", "Ativa e desativa os recursos opcionais."],
        ["4", "Remove os apps do usuário e da imagem."],
        ["5", "Remove o OneDrive, se o perfil pedir."],
        ["6", "Grava os ajustes por usuário no Administrador de auditoria e no perfil Default."],
        ["7", "Confere reinício pendente: se houver, para e pede para reiniciar."],
        ["8", "Para o Windows Update."],
        ["9", "Procura apps que fariam o Sysprep falhar e os lista."],
        ["10", "Roda o Sysprep com o `sysprep.xml` e confirma que a imagem foi generalizada."],
      ],
    } },

    { h2: "9.4 Depois do Sysprep" },
    { p: "Com a generalização confirmada, o script apaga o `sysprep.xml` copiado para `C:\\TEMP` (ele tem as senhas) e, se o pacote estava no disco do sistema, apaga também a pasta do pacote. No pendrive, nada é apagado. Em seguida a máquina desliga (ou faz o que a seção Sysprep definiu)." },
    { passos: [
      "**Não ligue a máquina de referência no Windows de novo**: o primeiro boot \"consome\" a imagem generalizada.",
      "Inicie pela ferramenta de captura da empresa (WinPE com DISM, WDS, MDT, FOG, Clonezilla...) e capture a imagem.",
      "Aplique a imagem nas máquinas.",
    ] },
    { caixa: "dica", texto: "Guarde uma cópia da máquina de referência (ou uma máquina virtual) antes do Sysprep. Para a próxima versão da imagem, volte a ela, atualize e rode o pacote novo." },
    { caixa: "importante", texto: "O log de cada execução fica na pasta do pacote (`Preparar-Imagem_<data>.log`) e, depois da limpeza, em `C:\\Windows\\Temp`. Ele não contém senhas." },
  ],
};
