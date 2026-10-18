module.exports = {
  num: 3,
  titulo: "O editor do perfil",
  subtitulo: "Menu, barra superior, verificação, prévia do XML e salvamento",
  blocos: [
    { p: "Todo perfil é editado na mesma tela. À esquerda fica o menu das seções, no centro o conteúdo da seção aberta e, em telas largas, à direita a prévia do que será gerado." },
    { fig: "03-01-visao-geral.png", legenda: "Visão geral do editor." },
    { tabela: {
      cab: ["", "O que é"],
      larguras: [700, 8938],
      linhas: [
        ["[1]", "**Menu das seções**, agrupado por assunto: Perfil, Instalação, Contas, Rede, Segurança, Sistema, Finalizar e, no pé, **Gerar**. O número sobre um ícone é a quantidade de erros (vermelho) ou avisos (laranja) daquele grupo."],
        ["[2]", "Nome do perfil e o estado: **Salvo** ou **Alterações não salvas**."],
        ["[3]", "Resumo da verificação: **Pronto para gerar** ou a quantidade de erros, e a de avisos. Clicar aqui abre a tela **Gerar pacote**, com a lista completa."],
        ["[4]", "**Salvar** (atalho `Ctrl+S`). Só fica ativo quando há alteração."],
        ["[5]", "**Gerar pacote**: salva e baixa o `.zip`. Fica bloqueado enquanto houver erro."],
        ["[6]", "Mostra ou esconde a prévia."],
        ["[7]", "**Prévia** do `sysprep.xml` e do `pacote.json`, recalculada a cada alteração, antes mesmo de salvar."],
      ],
    } },

    { h2: "3.1 Navegar pelas seções" },
    { p: "Clique num grupo do menu para abrir a janela com as seções dele [1]. Cada seção mostra ao lado o seu contador de erros ou avisos. Clicar fora, teclar `Esc` ou rolar o menu fecha a janela. Os grupos de uma seção só (Perfil e Gerar) abrem direto." },
    { fig: "03-02-janela-do-grupo.png", legenda: "Janela do grupo Contas e domínio." },
    { caixa: "dica", texto: "O botão ☰ no canto da barra recolhe o menu, deixando só os ícones (o nome do grupo aparece ao passar o mouse). A escolha fica guardada no navegador. Em tablet e celular, o ☰ abre o menu por cima da tela." },

    { h2: "3.2 A prévia: sysprep.xml e pacote.json" },
    { p: "A prévia [1] tem duas abas. **sysprep.xml** é o arquivo de resposta que o Windows lê no primeiro boot. **pacote.json** é a lista do que o script de preparo faz na máquina de referência: arquivos copiados, apps removidos, ajustes por usuário, drivers. O botão de copiar, no alto da prévia, copia o conteúdo da aba." },
    { fig: "03-03-previa-pacote-json.png", legenda: "Prévia na aba pacote.json." },
    { caixa: "atencao", texto: "Não edite o `sysprep.xml` à mão depois de baixado. Altere o perfil e gere outro pacote: o `sysprep.xml` e o `pacote.json` saem juntos do mesmo perfil e precisam combinar." },

    { h2: "3.3 Erros e avisos" },
    { p: "A verificação roda a cada alteração. No pé da seção aberta aparecem os problemas dela [2], cada um com o link para a seção certa. O resumo da barra [3] soma tudo." },
    { fig: "03-04-menu-recolhido-e-avisos.png", legenda: "Menu recolhido [1], erro da seção [2] e resumo da verificação [3]." },
    { tabela: {
      cab: ["Nível", "Significado"],
      larguras: [1600, 8038],
      linhas: [
        ["**Erro**", "Impede gerar o pacote: falta algo obrigatório ou há valor inválido (sem conta administradora, chave em formato errado, imagem faltando...)."],
        ["**Aviso**", "O pacote é gerado, mas há um risco a conhecer (senha em texto puro no pacote, resolução fixa, CopyProfile...)."],
        ["**Informação**", "Explica o que vai acontecer. Só aparece na tela **Gerar pacote**."],
      ],
    } },

    { h2: "3.4 Salvar" },
    { lista: [
      "As alterações só vão para o servidor ao clicar em **Salvar** ou teclar `Ctrl+S`. **Gerar pacote** também salva antes de gerar.",
      "Ao sair com alterações não salvas (seta de voltar ou fechar a aba), o navegador pede confirmação.",
      "Imagens e drivers são gravados no envio, sem precisar salvar.",
    ] },
  ],
};
