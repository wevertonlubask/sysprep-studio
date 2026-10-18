module.exports = {
  num: 1,
  titulo: "Apresentação",
  subtitulo: "O que é o Sysprep Studio e como a imagem padrão é feita",
  blocos: [
    { p: "O **Sysprep Studio** é uma página web, usada pela equipe de TI, para montar a **imagem padrão do Windows 11** sem editar XML à mão. Você descreve no navegador como as máquinas devem ficar (contas, licença, domínio, Wi-Fi, aparência, apps, drivers...) e o sistema gera um **pacote** pronto para o pendrive. Na máquina de referência, um duplo clique no script do pacote aplica tudo e roda o Sysprep." },
    { p: "Cada configuração fica guardada num **perfil**. Um perfil pode ser reaproveitado, duplicado e ajustado para gerar uma imagem nova sempre que o Windows ou os programas forem atualizados." },

    { h2: "1.1 O caminho da imagem padrão" },
    { passos: [
      "**No Sysprep Studio:** crie ou abra um perfil e preencha as seções (capítulos 2 a 7).",
      "**No Sysprep Studio:** confira a verificação e baixe o pacote `.zip` (capítulo 8).",
      "**Na máquina de referência:** instale o Windows, entre em Modo Auditoria (`Ctrl+Shift+F3` na primeira tela), instale os programas e rode o `Preparar-Imagem.cmd` do pacote (capítulo 9).",
      "**Na máquina de referência:** depois do Sysprep a máquina desliga. Capture a imagem com a ferramenta de clonagem da empresa (DISM, WDS, MDT, FOG, Clonezilla...).",
      "**Nas máquinas clonadas:** aplique a imagem. No primeiro boot o Windows cria as contas, aplica as configurações e, se o perfil usar a Tela inicial, pede unidade, setor e número do PC (capítulo 10).",
    ] },
    { caixa: "dica", texto: "O Sysprep Studio não captura nem distribui a imagem: ele prepara a máquina de referência. A captura e a implantação continuam com a ferramenta que a empresa já usa." },

    { h2: "1.2 Termos usados neste manual" },
    { tabela: {
      cab: ["Termo", "O que é"],
      larguras: [2600, 7038],
      linhas: [
        ["Máquina de referência", "O computador onde a imagem é montada: Windows instalado, programas, ajustes. É dela que a imagem é capturada."],
        ["Modo Auditoria", "Modo especial do Windows para preparar a máquina de referência sem criar usuário. Entra-se nele com `Ctrl+Shift+F3` na primeira tela de configuração (OOBE)."],
        ["Sysprep", "Ferramenta da Microsoft que **generaliza** o Windows: remove o que é único da máquina (SID, nome, drivers ativos) para a imagem poder ser clonada."],
        ["sysprep.xml", "Arquivo de resposta (_unattend_) que o Windows lê no primeiro boot da máquina clonada: contas, idioma, OOBE, domínio, comandos."],
        ["Perfil", "O conjunto de configurações de uma imagem no Sysprep Studio. Gera o `sysprep.xml` e o pacote."],
        ["Pacote", "O `.zip` gerado pelo perfil: `sysprep.xml`, script de preparo, imagens, perfis Wi-Fi, drivers e LEIA-ME."],
        ["OOBE", "As telas de primeira configuração do Windows (região, conta, privacidade). O perfil decide quais são puladas."],
        ["Máquina clonada", "Cada computador que recebe a imagem capturada."],
      ],
    } },

    { h2: "1.3 Como este manual está escrito" },
    { p: "Os números nos prints, como [1], correspondem aos números do texto logo abaixo ou acima de cada figura." },
    { caixa: "dica", texto: "Um atalho ou um jeito de conferir se o passo deu certo." },
    { caixa: "atencao", texto: "Algo que costuma dar errado e como evitar." },
    { caixa: "importante", texto: "Senhas, chaves e ações que não podem ser desfeitas." },
    { caixa: "importante", titulo: "Dados fictícios", texto: "Todos os prints usam a empresa fictícia **Empresa Exemplo** (domínio `empresa.local`). Nenhuma senha, chave ou nome real aparece neste documento." },
  ],
};
