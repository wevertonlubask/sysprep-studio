module.exports = {
  num: 2,
  titulo: "Perfis de imagem",
  subtitulo: "Criar, importar, abrir, renomear, duplicar e excluir perfis",
  blocos: [
    { p: "Ao abrir o Sysprep Studio no navegador aparece a tela **Perfis de imagem**: no alto, os cartões para criar ou importar um perfil; embaixo, a lista **Seus perfis**, do alterado mais recentemente para o mais antigo." },
    { fig: "02-01-tela-perfis.png", legenda: "Tela de perfis." },

    { h2: "2.1 Criar um perfil" },
    { fig: "02-02-novo-e-importar.png", legenda: "Novo perfil e importação de um sysprep.xml." },
    { passos: [
      "Em **Nome** [1], digite um nome que diga para que serve a imagem, por exemplo _Estações do financeiro_. O nome também nomeia a pasta do pacote.",
      "Escolha o modelo [2]: **Padrão do Windows** traz só o essencial para o Sysprep funcionar; **Uso compartilhado** já marca a remoção de apps de consumo (jogos, Bing, Xbox...), desliga sugestões e impede o BitLocker automático.",
      "Clique em **Criar** [3]. O editor do perfil abre na seção **Geral**.",
    ] },
    { caixa: "dica", texto: "O modelo só define o ponto de partida. Tudo pode ser mudado depois, seção por seção." },

    { h2: "2.2 Importar um sysprep.xml existente" },
    { p: "Se a empresa já tem um `sysprep.xml`, use o cartão **Importar sysprep.xml existente** [4] e clique em **Escolher arquivo XML**. O sistema lê contas (decodificando as senhas), chave, OOBE, região, RDP, firewall, domínio e comandos, e cria um perfil com esses valores." },
    { p: "Comandos que não correspondem a nenhuma opção da página entram na seção **Comandos**, para nada se perder. Se o campo **Nome** do cartão ao lado estiver preenchido, ele vira o nome do perfil importado." },
    { caixa: "atencao", texto: "Imagens (papel de parede, tela de bloqueio, logo) não vêm dentro do XML: envie-as de novo na seção **Aparência** e em **Identidade**." },

    { h2: "2.3 Abrir, renomear, duplicar e excluir" },
    { fig: "02-03-acoes-do-perfil.png", legenda: "Ações de cada perfil da lista." },
    { lista: [
      "Clique no nome do perfil [1] para abrir o editor.",
      "**Renomear** [2]: pede o novo nome.",
      "**Duplicar** [3]: cria uma cópia com outro nome, com imagens e drivers. Use para fazer a imagem de outro setor a partir de uma pronta.",
      "**Excluir** [4]: apaga o perfil, as imagens e os drivers dele. Pede confirmação.",
    ] },
    { caixa: "importante", texto: "Excluir não pode ser desfeito. Os perfis ficam na pasta `dados/` do servidor: só um backup dela devolve um perfil excluído (Manual de Implantação, capítulo de backup)." },
  ],
};
