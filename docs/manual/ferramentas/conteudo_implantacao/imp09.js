module.exports = {
  num: 9,
  titulo: "Problemas comuns",
  subtitulo: "Sintomas, causas e soluções",
  blocos: [
    { tabela: {
      cab: ["Sintoma", "O que fazer"],
      larguras: [3600, 6038],
      linhas: [
        ["`port is already allocated` ao subir", "Outro programa usa a porta 8090. Troque o número em `ports` no `docker-compose.yml` (ex.: `127.0.0.1:8095:8000`) e acesse a porta nova."],
        ["A página não abre de outro computador", "Esperado: o sistema só escuta no `127.0.0.1`. Publique com proxy reverso (capítulo 5)."],
        ["Erro ao salvar perfil ou enviar imagem (Linux)", "A pasta `dados/` não é do UID 1000: rode `sudo chown -R 1000:1000 dados` e `docker compose restart`."],
        ["O envio de drivers falha no meio", "Falta espaço em disco no servidor ou no Docker. Confira com `df -h` (Linux) ou nas configurações de disco do Docker Desktop. Atrás de proxy, confira o limite de tamanho de envio."],
        ["Docker Desktop: \"WSL 2 installation is incomplete\"", "Rode `wsl --update` como administrador e reinicie."],
        ["O build falha baixando pacotes", "O servidor está atrás de proxy de internet. Configure o proxy em Docker Desktop > Settings > Resources > Proxies, ou no serviço do Docker no Linux."],
        ["\"Download expirado\" ao baixar o pacote", "O link vale uma vez. Clique em **Gerar pacote** de novo."],
        ["A página mostra a versão antiga depois de atualizar", "Recarregue com `Ctrl+F5`, ou feche e abra o aplicativo instalado."],
      ],
    } },
    { p: "Para ver o erro detalhado de qualquer operação:" },
    { codigo: "docker compose logs --tail 100" },
  ],
};
