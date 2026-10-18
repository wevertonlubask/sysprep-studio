module.exports = {
  num: 6,
  titulo: "Dados e backup",
  subtitulo: "Onde ficam os perfis, como copiar e como restaurar",
  blocos: [
    { p: "Tudo o que o sistema guarda está na pasta `dados/` do projeto. O código e o contêiner podem ser refeitos a qualquer momento; os dados, não." },
    { codigo: "dados/\n  perfis/\n    <id>/\n      perfil.json     # todas as opções do perfil, com senhas e chave\n      imagens/        # papel de parede, tela de bloqueio, logo OEM\n      drivers/        # pacotes de drivers enviados", titulo: "Estrutura da pasta dados" },
    { caixa: "importante", texto: "O `perfil.json` tem senhas em texto puro. O backup precisa ficar num lugar com acesso restrito à TI, de preferência criptografado. A pasta `dados/` já está fora do Git (`.gitignore`): nunca a envie para um repositório." },

    { h2: "6.1 Fazer o backup" },
    { p: "Não é preciso parar o sistema: cada perfil é gravado de forma atômica. Copie a pasta inteira." },
    { codigo: "# Windows (PowerShell), na pasta do projeto\nCompress-Archive -Path dados -DestinationPath \"D:\\Backup\\sysprep-dados-$(Get-Date -Format yyyyMMdd).zip\"\n\n# Linux\ntar czf /backup/sysprep-dados-$(date +%Y%m%d).tar.gz dados" },
    { caixa: "dica", texto: "Os drivers são os arquivos grandes e podem ser baixados de novo do fabricante. Se o espaço do backup for curto, deixe as pastas `drivers` fora da cópia diária e faça uma cópia completa só de vez em quando." },

    { h2: "6.2 Restaurar" },
    { codigo: "docker compose stop\n# troque a pasta dados pela do backup (extraia o ZIP ou o tar.gz)\ndocker compose up -d" },
    { p: "No Linux, depois de restaurar, devolva a pasta ao usuário do contêiner: `sudo chown -R 1000:1000 dados`." },

    { h2: "6.3 Levar para outro servidor" },
    { p: "Instale normalmente no servidor novo (capítulos 3 e 4), pare o contêiner, copie a pasta `dados/` do antigo e suba de novo." },
  ],
};
