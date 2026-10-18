module.exports = {
  num: "A",
  titulo: "Apêndice: lista de verificação e repositório",
  subtitulo: "Checklist da implantação e o que há em cada pasta",
  blocos: [
    { h2: "Lista de verificação" },
    { tabela: {
      cab: ["✓", "Item"],
      larguras: [700, 8938],
      linhas: [
        ["☐", "Docker instalado e `docker compose version` respondendo."],
        ["☐", "Código baixado (`git clone`) na pasta definitiva."],
        ["☐", "Linux: pasta `dados/` criada e entregue ao UID 1000."],
        ["☐", "`docker compose up -d --build` concluído e `docker compose ps` mostrando **healthy**."],
        ["☐", "`http://localhost:8090` abre a tela de perfis."],
        ["☐", "Uso em rede: proxy reverso com HTTPS e senha; a porta 8090 continua só no `127.0.0.1`."],
        ["☐", "Backup da pasta `dados/` agendado, num local restrito à TI."],
        ["☐", "Primeiro perfil criado e pacote gerado (Manual de Uso)."],
      ],
    } },
    { h2: "Estrutura do repositório" },
    { tabela: {
      cab: ["Pasta ou arquivo", "Conteúdo"],
      larguras: [3600, 6038],
      linhas: [
        ["`backend/app/`", "API (FastAPI): modelo do perfil, gerador do `sysprep.xml`, validação, montagem do pacote."],
        ["`backend/app/recursos/`", "Scripts que vão no pacote: preparo da imagem, Wi-Fi, Tela inicial, exibição e visual."],
        ["`backend/tests/`", "Testes automatizados (pytest)."],
        ["`frontend/`", "Página (React + Vite) e os ícones do aplicativo."],
        ["`docs/`", "Os manuais em PDF e, em `docs/manual/`, as ferramentas que os geram."],
        ["`dados/`", "Perfis (criada na primeira subida; fora do Git)."],
        ["`Dockerfile`, `docker-compose.yml`", "Construção e execução do contêiner."],
        ["`CHANGELOG.md`", "O que mudou em cada versão."],
      ],
    } },
  ],
};
