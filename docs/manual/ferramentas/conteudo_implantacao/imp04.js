module.exports = {
  num: 4,
  titulo: "Baixar e subir o sistema",
  subtitulo: "Clonar o repositório, construir o contêiner e abrir no navegador",
  blocos: [
    { h2: "4.1 Baixar o código" },
    { codigo: "git clone <url-do-repositório> sysprep-studio\ncd sysprep-studio" },
    { p: "Sem Git, baixe o ZIP do repositório pela página dele (botão **Code > Download ZIP**) e extraia." },
    { caixa: "atencao", texto: "No **Linux**, crie a pasta de dados e entregue-a ao usuário do contêiner (UID 1000) **antes** da primeira subida. Senão o Docker a cria como root e o sistema não consegue gravar os perfis." },
    { codigo: "mkdir -p dados\nsudo chown -R 1000:1000 dados" },

    { h2: "4.2 Subir" },
    { codigo: "docker compose up -d --build" },
    { p: "A primeira vez leva alguns minutos: o Docker baixa as imagens do Node e do Python, compila a página e instala a API. Nas próximas, só o que mudou é refeito." },
    { p: "Confira se o contêiner está saudável:" },
    { codigo: "docker compose ps\n# a coluna STATUS deve mostrar \"healthy\" depois de uns 30 segundos\ncurl http://localhost:8090/api/saude\n# resposta esperada: {\"ok\":true}" },
    { caixa: "dica", texto: "No PowerShell do Windows, use `curl.exe` (com `.exe`) ou simplesmente abra o endereço no navegador." },

    { h2: "4.3 Abrir no navegador" },
    { p: "Abra `http://localhost:8090`. Aparece a tela **Perfis de imagem**, ainda sem perfis. O Manual de Uso, capítulo 2, continua daqui." },
    { fig: "02-01-tela-perfis.png", legenda: "Tela de perfis (aqui já com perfis de exemplo)." },

    { h2: "4.4 O que o docker-compose.yml define" },
    { codigo: "services:\n  studio:\n    build: .\n    container_name: sysprep-studio\n    ports:\n      - \"127.0.0.1:8090:8000\"\n    volumes:\n      - ./dados:/dados\n    restart: unless-stopped", titulo: "docker-compose.yml" },
    { lista: [
      "`ports`: a porta 8090 do computador, **só no 127.0.0.1**, aponta para a 8000 do contêiner. Para usar outra porta, troque o 8090.",
      "`volumes`: os perfis ficam na pasta `dados/` do projeto, fora do contêiner. Reconstruir ou apagar o contêiner não apaga os perfis.",
      "`restart: unless-stopped`: o contêiner volta sozinho quando o Docker inicia, a menos que tenha sido parado à mão.",
    ] },

    { h2: "4.5 Comandos do dia a dia" },
    { tabela: {
      cab: ["Comando", "Para quê"],
      larguras: [4200, 5438],
      linhas: [
        ["`docker compose ps`", "Ver se está rodando e saudável."],
        ["`docker compose logs -f`", "Acompanhar o log (Ctrl+C sai)."],
        ["`docker compose stop`", "Parar sem remover."],
        ["`docker compose up -d`", "Subir de novo."],
        ["`docker compose up -d --build`", "Reconstruir depois de atualizar o código."],
        ["`docker compose down`", "Remover o contêiner (os perfis em `dados/` ficam)."],
      ],
    } },
  ],
};
