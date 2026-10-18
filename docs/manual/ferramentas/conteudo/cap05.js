module.exports = {
  num: 5,
  titulo: "Contas e domínio",
  subtitulo: "Contas locais, ingresso no domínio e a Tela inicial",
  blocos: [
    { h2: "5.1 Contas e senhas" },
    { p: "As contas locais que o Windows cria no primeiro boot da máquina clonada. O perfil precisa de pelo menos uma conta no grupo **Administradores**." },
    { fig: "05-01-contas.png", legenda: "Seção Contas e senhas." },
    { lista: [
      "Cada conta [1] tem login (até 20 caracteres), nome exibido, grupo, senha e descrição. O selo mostra **Administrador** ou **Padrão**. As setas mudam a ordem e a lixeira exclui.",
      "No campo **Senha**, o olho mostra o que foi digitado e o botão ao lado gera uma senha forte.",
      "**Adicionar conta** [2] inclui uma conta nova.",
      "**Logon automático** [3]: a máquina entra sozinha numa conta, quantas vezes for definido. Útil para quiosques e para terminar configurações no primeiro logon.",
      "**Administrador embutido** [4]: a conta `Administrador` do Windows fica desativada depois do Sysprep. Ligue para reativá-la no primeiro logon, com a senha definida aqui.",
      "**Política de senha** [5]: senhas locais que nunca expiram.",
    ] },
    { caixa: "importante", texto: "No `sysprep.xml` as senhas vão em Base64, que é **codificação, não criptografia**: qualquer pessoa com o arquivo consegue lê-las. Trate o pendrive e o pacote como sigilosos. O script apaga o XML da máquina antes de desligar, para ele não ir na imagem capturada." },

    { h2: "5.2 Domínio" },
    { fig: "05-02-dominio.png", legenda: "Seção Domínio." },
    { p: "Em **Ingresso** [1], escolha **Não alterar** (grupo WORKGROUP), **Grupo de trabalho** (informe o nome) ou **Domínio Active Directory**. Para domínio, preencha [2] o nome DNS do domínio, a conta com permissão de ingresso, a senha e, se quiser, a OU onde os computadores devem ser criados." },
    { caixa: "importante", texto: "Use uma conta de serviço que **só tenha permissão para ingressar computadores** (delegada na OU), nunca a de um administrador do domínio. Sem a Tela inicial, a senha dela vai em texto puro no `sysprep.xml`." },

    { h2: "5.3 Tela inicial" },
    { p: "Com uma imagem só, todas as máquinas nascem iguais: o nome é aleatório ou o mesmo em todas. A **Tela inicial** resolve isso. No primeiro logon da máquina clonada, uma janela pede **unidade**, **setor** (ou sala) e **número do PC**; a máquina recebe o nome montado pelo padrão do perfil e reinicia." },
    { fig: "05-03-tela-inicial.png", legenda: "Seção Tela inicial com duas unidades." },
    { passos: [
      "Ligue **Ativar** e escolha a **Conta que abre a tela** [1]: uma conta local administradora do perfil. Ela entra sozinha uma única vez, só para abrir a tela. Deixe ligado **Permitir \"Pular\"** se o técnico puder deixar para depois (a tela volta no próximo logon dessa conta).",
      "Em **Padrão do nome** [2], monte o nome com os campos `{unidade}`, `{local}` e `{pc}`, escolha quantos dígitos tem o número do PC e como a unidade e o local são chamados na tela. O exemplo embaixo mostra o primeiro nome e o mais longo possível: o Windows aceita no máximo 15 caracteres.",
      "Cadastre cada unidade [3] com código (entra no nome), nome exibido e, com domínio, a OU padrão. Dentro dela, cadastre os locais, cada um com código, nome e OU própria (opcional).",
      "**Adicionar unidade** [4] inclui outra unidade.",
    ] },
    { p: "No exemplo, a unidade `SP` com o setor `ADM` e o PC 7 gera o nome `SPADMPC07`." },

    { h3: "Com domínio ou sem domínio" },
    { p: "A Tela inicial funciona **com ou sem domínio**: ela é ligada na própria seção, independente da seção Domínio. O que muda é o que ela faz ao confirmar:" },
    { tabela: {
      cab: ["Seção Domínio", "O que a Tela inicial faz na máquina clonada"],
      larguras: [2600, 7038],
      linhas: [
        ["**Domínio Active Directory**", "Renomeia e entra no domínio na mesma operação, já com o nome novo e na OU do local. O ingresso **sai do sysprep.xml** e passa para a tela, que só libera o botão quando o domínio responde e avisa se o nome já existe no AD."],
        ["**Não alterar** ou **Grupo de trabalho**", "Só renomeia e reinicia. As OUs não aparecem."],
      ],
    } },
    { p: "A OU usada é a do local; vazia, vale a da unidade; vazia também, a da seção Domínio; sem nenhuma, o contêiner padrão do domínio (`Computers`)." },
    { caixa: "atencao", texto: "Reimagem: a máquina refeita tenta usar um nome que já existe no AD. Desde a atualização KB5020276 (outubro de 2022), a conta de ingresso só reaproveita o objeto de computador que ela mesma criou, a menos que a política \"Domain controller: Allow computer account re-use during domain join\" a autorize. Sem isso, exclua o computador do AD antes ou peça essa autorização ao time do domínio." },
    { caixa: "importante", texto: "Com a Tela inicial e domínio, a senha da conta de ingresso fica num arquivo restrito a SYSTEM e Administradores (`C:\\Windows\\Setup\\Scripts\\TelaInicial`) até a máquina entrar no domínio, quando ele é apagado." },
    { caixa: "atencao", texto: "Com a Tela inicial, o nome em **Identidade** precisa ser **Aleatório**, e o logon automático da seção Contas precisa estar desligado ou usar a mesma conta." },
  ],
};
