module.exports = {
  num: 2,
  titulo: "Requisitos",
  subtitulo: "Onde o sistema roda e do que ele precisa",
  blocos: [
    { p: "O Sysprep Studio é **um contêiner Docker só**: a página web (React) e a API (Python/FastAPI) vêm juntas. Não há banco de dados: cada perfil é uma pasta dentro de `dados/`, ao lado do código." },
    { tabela: {
      cab: ["Item", "Requisito"],
      larguras: [2600, 7038],
      linhas: [
        ["Sistema", "Windows 10/11 com **Docker Desktop**, ou Linux (Debian, Ubuntu...) com **Docker Engine** e o plugin Compose."],
        ["Processador e memória", "2 núcleos e 2 GB de RAM livres bastam. O pacote é montado enquanto é enviado ao navegador, sem cópia em memória."],
        ["Disco", "Poucos MB por perfil sem drivers. **Com drivers, vários GB por perfil**: cada Driver Pack tem de 1 a 3 GB. Reserve espaço para eles e para as imagens do Docker (cerca de 1 GB)."],
        ["Rede", "Só para baixar as imagens do Docker e os pacotes na primeira subida. Depois o sistema funciona sem internet."],
        ["Navegador", "Chrome, Edge ou Firefox atuais."],
        ["Git", "Para baixar e atualizar o código (opcional: dá para baixar o ZIP do repositório)."],
      ],
    } },

    { h2: "2.1 Onde instalar" },
    { tabela: {
      cab: ["Cenário", "Quando usar"],
      larguras: [2800, 6838],
      linhas: [
        ["**No computador do técnico**", "Uma pessoa prepara as imagens. É o padrão: o sistema só aceita conexões do próprio computador (`127.0.0.1`)."],
        ["**Num servidor da TI**", "Várias pessoas usam os mesmos perfis. Exige publicar com HTTPS e senha (capítulo 5)."],
      ],
    } },
    { caixa: "importante", texto: "Os perfis guardam em texto puro as senhas das contas locais, do domínio e do Wi-Fi e a chave do Windows. O sistema **não tem login próprio**: por isso, de fábrica, ele só escuta no `127.0.0.1`. Nunca o publique na rede sem a proteção do capítulo 5." },
  ],
};
