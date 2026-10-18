module.exports = {
  num: 10,
  titulo: "Na máquina clonada",
  subtitulo: "O primeiro boot e a Tela inicial",
  blocos: [
    { p: "No primeiro boot da máquina clonada, o Windows lê o `sysprep.xml`: aplica idioma e região, pula as telas de configuração, cria as contas, aplica os ajustes de máquina e, se houver, importa as redes Wi-Fi antes do login. Sem a Tela inicial, a máquina para na tela de login (ou entra sozinha, com logon automático)." },

    { h2: "10.1 A Tela inicial" },
    { p: "Com a Tela inicial ligada no perfil, a conta escolhida entra sozinha uma única vez e a tela abre por cima de tudo, em tela cheia." },
    { fig: "10-01-tela-inicial.png", legenda: "Tela inicial na máquina clonada, com domínio." },
    { passos: [
      "Escolha a **Unidade** e o **Setor**. Com uma unidade só, ela já vem escolhida.",
      "Digite o **Nº do PC**. O **Nome do computador** é montado na hora, pelo padrão do perfil.",
      "Confira as linhas de estado: a **rede** (cabo ou Wi-Fi) e, com domínio, o **domínio** e a **OU** onde o computador será criado. A tela testa a rede e o domínio sozinha, de tempos em tempos.",
      "Clique em **Confirmar e reiniciar**. Com domínio, o botão só libera quando o domínio responde.",
    ] },
    { p: "A máquina recebe o nome (e, com domínio, entra nele na OU do local), desliga o logon automático, apaga a configuração e reinicia, pronta para uso." },
    { caixa: "dica", texto: "**Pular (configurar depois)**, quando o perfil permite, fecha a tela sem mudar nada. Ela volta no próximo logon da mesma conta." },

    { h2: "10.2 Nome que já existe no AD" },
    { p: "Numa reimagem, o nome escolhido normalmente já existe no AD. A tela avisa e mostra onde está o objeto. Se a conta de ingresso puder reaproveitá-lo, basta confirmar." },
    { fig: "10-02-tela-inicial-reimagem.png", legenda: "Aviso de nome já existente no AD." },
    { caixa: "atencao", texto: "Se aparecer o erro de que o domínio não deixa reaproveitar o nome (proteção KB5020276), peça ao time do domínio para excluir o computador do AD ou para autorizar a conta de ingresso a reutilizá-lo, e confirme de novo. Detalhes na seção 5.3." },

    { h2: "10.3 Mensagens de erro da tela" },
    { tabela: {
      cab: ["Mensagem", "O que fazer"],
      larguras: [3600, 6038],
      linhas: [
        ["Domínio: aguardando a rede / sem resposta", "Conecte o cabo ou confira o Wi-Fi. Se a rede está ok, o DNS da rede não resolve o domínio: confira o DHCP."],
        ["Usuário ou senha do domínio recusados", "A credencial da seção Domínio está errada ou expirou. Corrija o perfil, gere o pacote e refaça a imagem."],
        ["A conta de ingresso não tem permissão", "Peça a delegação de \"criar objetos de computador\" na OU do local."],
        ["Nome inválido", "O nome passou de 15 caracteres ou tem caractere inválido. Revise o padrão e os códigos no perfil."],
      ],
    } },
    { caixa: "dica", texto: "Tudo o que a tela faz fica em `C:\\Windows\\Temp\\SysprepStudio-tela-inicial.log`; o Wi-Fi, em `C:\\Windows\\Temp\\SysprepStudio-wifi.log`." },
  ],
};
