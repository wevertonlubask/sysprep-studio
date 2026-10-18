module.exports = {
  num: 7,
  titulo: "Atualizar o sistema",
  subtitulo: "Baixar uma versão nova sem perder os perfis",
  blocos: [
    { p: "A versão em uso aparece no rodapé da página. As versões seguem o padrão **SemVer** (MAIOR.MENOR.CORREÇÃO), e o arquivo `CHANGELOG.md` do repositório diz o que mudou em cada uma." },
    { tabela: {
      cab: ["Muda o número", "Significa"],
      larguras: [2400, 7238],
      linhas: [
        ["CORREÇÃO (1.8.**1**)", "Correção ou melhoria. Atualize sem medo."],
        ["MENOR (1.**9**.0)", "Recurso novo. Os perfis continuam valendo."],
        ["MAIOR (**2**.0.0)", "Pode exigir revisar os perfis ou os pacotes. Leia o `CHANGELOG.md` antes."],
      ],
    } },
    { h2: "7.1 Passo a passo" },
    { codigo: "# 1. backup da pasta dados (capítulo 6)\n# 2. baixar a versão nova\ngit pull\n# 3. reconstruir e subir\ndocker compose up -d --build\n# 4. conferir\ndocker compose ps" },
    { caixa: "atencao", texto: "Depois de atualizar, **gere de novo** o pacote dos perfis em uso: o script de preparo e os scripts auxiliares vêm da versão do sistema que gerou o pacote." },
    { caixa: "dica", texto: "Com o sistema instalado como aplicativo (capítulo 8), feche e abra o aplicativo depois da atualização para ele carregar a versão nova." },
  ],
};
