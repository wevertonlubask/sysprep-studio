module.exports = {
  num: 4,
  titulo: "Perfil e Instalação",
  subtitulo: "Geral, Licença, Idioma e região, Primeiro boot e Identidade",
  blocos: [
    { h2: "4.1 Geral" },
    { p: "Nome e descrição do perfil. A descrição aparece no topo do `LEIA-ME.txt` do pacote: use-a para dizer onde a imagem será usada." },
    { fig: "04-01-geral.png", legenda: "Seção Geral.", largura: 0.85 },

    { h2: "4.2 Licença" },
    { p: "Define como as máquinas clonadas ativam o Windows [1]." },
    { fig: "04-02-licenca.png", legenda: "Seção Licença com chave do produto." },
    { tabela: {
      cab: ["Opção", "Quando usar"],
      larguras: [2700, 6938],
      linhas: [
        ["**Licença OEM da firmware**", "Máquinas que vieram com Windows de fábrica. Nenhuma chave vai no XML: cada uma lê a chave gravada na placa-mãe e ativa sozinha."],
        ["**Chave do produto**", "Chave MAK, KMS (GVLK) ou de varejo. A chave vai no `sysprep.xml`. Os botões [2] preenchem as chaves genéricas KMS públicas da Microsoft, que só ativam com um servidor KMS na rede."],
      ],
    } },
    { p: "Com chave, deixe ligado **Reinstalar e ativar a chave no primeiro logon** [3]: o Windows às vezes prefere a chave OEM da placa e ignora a do XML sem avisar. Esta opção roda `slmgr /ipk` e `slmgr /ato` no primeiro logon e grava o resultado em `C:\\Windows\\Temp\\SysprepStudio-ativacao.log`." },
    { caixa: "atencao", texto: "A chave precisa ser da **mesma edição** da imagem: uma MAK de Education não ativa um Windows Pro Education, por exemplo." },

    { h2: "4.3 Idioma e região" },
    { p: "Idioma da interface, teclado, localidade do sistema, formato de data e moeda e fuso horário. Os campos sugerem os valores mais usados; o padrão é português do Brasil, teclado ABNT2 e horário de Brasília." },
    { fig: "04-03-regiao.png", legenda: "Seção Idioma e região.", largura: 0.85 },
    { caixa: "atencao", texto: "O idioma da interface precisa estar instalado no Windows da máquina de referência. O perfil só escolhe entre os idiomas que a imagem já tem." },

    { h2: "4.4 Primeiro boot (OOBE)" },
    { p: "Quais telas de primeira configuração a máquina clonada pula. Com tudo ligado (o padrão), ela vai direto para a tela de login." },
    { fig: "04-04-oobe.png", legenda: "Seção Primeiro boot." },
    { lista: [
      "**Pular o OOBE** [1]: pula a configuração da máquina e do usuário, as telas de privacidade e a exigência de internet, e tira a animação de primeiro logon e o \"Vamos terminar de configurar seu dispositivo\".",
      "**Telas individuais** [2]: licença, conta local, conta Microsoft, registro do fabricante e Wi-Fi.",
      "**Padrões aceitos** [3]: as configurações de proteção e o tipo de rede assumidos sem perguntar.",
    ] },

    { h2: "4.5 Identidade" },
    { fig: "04-05-identidade.png", legenda: "Seção Identidade." },
    { lista: [
      "**Nome do computador** [1]: **Aleatório** (recomendado: cada máquina recebe um `DESKTOP-XXXX` único) ou **Fixo** (todas com o mesmo nome; só para uma máquina). Para nomes padronizados por setor, use a **Tela inicial** (capítulo 5).",
      "**Registro** [2]: proprietário e organização, mostrados em Configurações > Sistema > Sobre.",
      "**Informações de suporte (OEM)** [3]: fabricante, modelo, telefone, horário e site de suporte e uma logo, também na página Sobre. A logo é convertida sozinha para BMP 120×120, como o Windows exige.",
    ] },
  ],
};
