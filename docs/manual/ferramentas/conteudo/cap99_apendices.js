module.exports = {
  num: "A",
  titulo: "Apêndice: logs e arquivos na máquina",
  subtitulo: "Onde o Sysprep Studio grava o que faz no Windows",
  blocos: [
    { tabela: {
      cab: ["Arquivo ou pasta", "Conteúdo"],
      larguras: [4800, 4838],
      linhas: [
        ["`Preparar-Imagem_<data>.log`", "Log do script de preparo, na pasta do pacote (ou em `C:\\Windows\\Temp` depois da limpeza)."],
        ["`C:\\Windows\\System32\\Sysprep\\Panther\\setuperr.log`", "Erros do Sysprep."],
        ["`C:\\Windows\\Panther\\UnattendGC\\setupact.log`", "O que o Windows aplicou do `sysprep.xml` no primeiro boot."],
        ["`C:\\Windows\\Temp\\SysprepStudio-ativacao.log`", "Reinstalação e ativação da chave no primeiro logon."],
        ["`C:\\Windows\\Temp\\SysprepStudio-wifi.log`", "Importação das redes Wi-Fi."],
        ["`C:\\Windows\\Temp\\SysprepStudio-tela-inicial.log`", "Tela inicial: nome escolhido, ingresso no domínio, erros."],
        ["`C:\\Windows\\Setup\\Scripts\\`", "Scripts auxiliares copiados pelo pacote."],
        ["`C:\\Windows\\Web\\Branding\\`", "Papel de parede, tela de bloqueio e logo OEM."],
      ],
    } },
  ],
};
