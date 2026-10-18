module.exports = {
  num: 8,
  titulo: "Gerar o pacote",
  subtitulo: "Conferir a verificação e baixar o ZIP para o pendrive",
  blocos: [
    { p: "Clique em **Gerar** no pé do menu, ou no resumo da verificação na barra superior." },
    { fig: "08-01-gerar.png", legenda: "Tela Gerar pacote de um perfil sem erros." },
    { passos: [
      "Leia a **Verificação** [1]: avisos e informações sobre o que o pacote fará. Cada item tem o link para a seção dele.",
      "Confira o **Conteúdo do pacote** [2]: os arquivos que vão no ZIP e para onde cada um é copiado no Windows, os drivers e a contagem de apps removidos e ajustes por usuário.",
      "Clique em **Baixar pacote (.zip)** [3]. O perfil é salvo e o download começa pelo navegador. Com drivers, o ZIP pode ter vários GB: acompanhe pelos downloads do navegador.",
      "Extraia o ZIP inteiro num pendrive, mantendo a estrutura de pastas.",
    ] },
    { p: "**Só o sysprep.xml** [4] baixa apenas o arquivo de resposta, para quem já tem outro processo de preparo." },
    { caixa: "atencao", texto: "O `sysprep.xml` sozinho não copia as imagens nem aplica tema, barra de tarefas, Wi-Fi, Tela inicial, drivers e remoção de apps: isso tudo é feito pelo script do pacote." },

    { h2: "8.1 Perfil com erros" },
    { p: "Enquanto houver erro, os botões de download ficam bloqueados [2] e a verificação [1] lista o que corrigir. Clique no link de cada erro para ir direto à seção." },
    { fig: "08-02-com-erros.png", legenda: "Perfil com erros: download bloqueado." },

    { h2: "8.2 O que vem no pacote" },
    { tabela: {
      cab: ["Arquivo", "Papel"],
      larguras: [2800, 6838],
      linhas: [
        ["`Preparar-Imagem.cmd`", "O que se executa (duplo clique). Pede elevação e chama o script PowerShell."],
        ["`Preparar-Imagem.ps1`", "O script de preparo: aplica o `pacote.json` e roda o Sysprep."],
        ["`sysprep.xml`", "Arquivo de resposta gerado pelo perfil."],
        ["`pacote.json`", "O que o script aplica: arquivos, apps, recursos, registro por usuário, drivers."],
        ["`LEIA-ME.txt`", "Resumo do perfil e o passo a passo, sem senhas."],
        ["`arquivos\\`", "Imagens, scripts auxiliares, perfis Wi-Fi e a configuração da Tela inicial."],
        ["`drivers\\`", "Os pacotes de drivers, se houver."],
      ],
    } },
    { caixa: "importante", texto: "O pacote contém senhas (contas, domínio, Wi-Fi) e, se houver, a chave do Windows. Não o envie por e-mail, não o coloque em pasta compartilhada e apague-o do pendrive quando a imagem estiver pronta." },
  ],
};
