module.exports = {
  num: 1,
  titulo: "Como usar este manual",
  subtitulo: "O que será instalado, convenções e o caminho da implantação",
  blocos: [
    { p: "Este manual leva a TI de um computador vazio ao **Sysprep Studio funcionando**: instala o Docker, baixa o código, sobe o sistema e mostra como mantê-lo (acesso pela rede, backup, atualização e problemas comuns)." },
    { p: "O uso de cada tela, a preparação da máquina de referência e a Tela inicial estão no **Manual de Uso**." },

    { h2: "1.1 O caminho da implantação" },
    { passos: [
      "Conferir os requisitos e escolher onde o sistema vai rodar (capítulo 2).",
      "Instalar o Docker (capítulo 3).",
      "Baixar o código e subir o sistema (capítulo 4).",
      "Se outras pessoas vão usar, publicar na rede com HTTPS e senha (capítulo 5).",
      "Agendar o backup da pasta de dados (capítulo 6).",
    ] },
    { p: "A lista de verificação do **Apêndice** repete esses passos em forma de checklist." },

    { h2: "1.2 Como os comandos estão escritos" },
    { p: "Os comandos aparecem em blocos com fonte fixa, como este:" },
    { codigo: "cd sysprep-studio\ndocker compose ps" },
    { lista: [
      "Salvo indicação, os comandos rodam **na pasta do projeto** (a que tem o `docker-compose.yml`).",
      "No Windows, use o **PowerShell**. No Linux, rode como um usuário do grupo `docker` ou com `sudo`.",
      "Linhas que começam com `#` são comentários.",
      "Valores entre sinais de menor e maior, como `<url-do-repositório>`, são para trocar pelo valor real, sem os sinais.",
    ] },

    { h2: "1.3 As caixas de destaque" },
    { caixa: "dica", texto: "Um atalho ou um jeito de conferir se o passo deu certo." },
    { caixa: "atencao", texto: "Algo que costuma dar errado e como evitar." },
    { caixa: "importante", texto: "Segurança, senhas e ações que não podem ser desfeitas." },
  ],
};
