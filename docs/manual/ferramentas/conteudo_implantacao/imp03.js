module.exports = {
  num: 3,
  titulo: "Instalar o Docker",
  subtitulo: "Docker Desktop no Windows ou Docker Engine no Linux",
  blocos: [
    { h2: "3.1 Windows" },
    { passos: [
      "Baixe o **Docker Desktop** em `https://www.docker.com/products/docker-desktop/` e instale com as opções padrão (backend **WSL 2**).",
      "Reinicie quando o instalador pedir e abra o Docker Desktop uma vez, até aparecer \"Engine running\".",
      "No PowerShell, confira:",
    ] },
    { codigo: "docker version\ndocker compose version" },
    { caixa: "atencao", texto: "Se o WSL 2 não estiver instalado, rode `wsl --install` num PowerShell como administrador e reinicie. A virtualização precisa estar ligada na BIOS." },
    { caixa: "dica", texto: "Em **Settings > General**, deixe ligado \"Start Docker Desktop when you sign in\" para o sistema voltar sozinho depois de reiniciar o computador." },

    { h2: "3.2 Linux (Debian ou Ubuntu)" },
    { p: "Instale o Docker Engine pelo script oficial e coloque seu usuário no grupo `docker`:" },
    { codigo: "curl -fsSL https://get.docker.com | sudo sh\nsudo usermod -aG docker $USER\n# saia e entre de novo na sessão, depois confira:\ndocker version\ndocker compose version" },
    { p: "O serviço do Docker já inicia com o sistema. Instale também o Git:" },
    { codigo: "sudo apt install -y git" },
  ],
};
