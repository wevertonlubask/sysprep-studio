module.exports = {
  num: 5,
  titulo: "Acesso pela rede",
  subtitulo: "Publicar para a equipe com HTTPS e senha",
  blocos: [
    { p: "Para a equipe usar o mesmo Sysprep Studio, instale-o num servidor da TI e coloque **na frente dele** um proxy reverso que exija HTTPS e senha. O contêiner continua escutando só no `127.0.0.1`; quem atende a rede é o proxy." },
    { caixa: "importante", texto: "**Não** troque `127.0.0.1:8090:8000` por `8090:8000` para \"liberar\" a rede: qualquer pessoa da rede abriria os perfis, com todas as senhas, sem login nenhum." },

    { h2: "5.1 Exemplo com Caddy (Linux)" },
    { p: "O Caddy é um servidor web que cuida do HTTPS sozinho. Instale-o no mesmo servidor e gere o hash da senha da equipe:" },
    { codigo: "sudo apt install -y caddy\ncaddy hash-password\n# digite a senha duas vezes e copie o hash gerado" },
    { p: "Troque o conteúdo de `/etc/caddy/Caddyfile` por:" },
    { codigo: "sysprep.empresa.local {\n    # certificado da CA interna do Caddy; com nome público, apague esta linha\n    tls internal\n    basic_auth {\n        ti <hash-gerado>\n    }\n    reverse_proxy 127.0.0.1:8090\n}", titulo: "/etc/caddy/Caddyfile" },
    { codigo: "sudo systemctl reload caddy" },
    { lista: [
      "Crie no DNS interno o nome `sysprep.empresa.local` apontando para o servidor.",
      "Libere no firewall do servidor só a porta 443, e só para a rede da TI.",
      "Cada acesso pede o usuário `ti` e a senha. Para mais pessoas, acrescente uma linha por usuário no bloco `basic_auth`.",
    ] },
    { caixa: "atencao", texto: "Com `tls internal` o navegador desconfia do certificado até a CA do Caddy ser instalada nas máquinas da TI. Se a empresa tem certificado próprio, use `tls <certificado.pem> <chave.pem>` no lugar." },
    { caixa: "atencao", texto: "Versões do Caddy anteriores à 2.8 chamam a diretiva de `basicauth` (sem o sublinhado)." },

    { h2: "5.2 Usando Nginx ou IIS" },
    { p: "Qualquer proxy reverso serve, desde que tenha HTTPS, autenticação e **nenhum limite de tamanho de envio**: os pacotes de drivers têm vários GB. No Nginx, por exemplo, use `client_max_body_size 0;` e `proxy_request_buffering off;` no bloco do site e aponte o `proxy_pass` para `http://127.0.0.1:8090`." },
  ],
};
