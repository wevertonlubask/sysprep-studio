module.exports = {
  num: 11,
  titulo: "Problemas comuns",
  subtitulo: "Quando o Sysprep falha e outras situações",
  blocos: [
    { h2: "11.1 O Sysprep falhou" },
    { p: "O script mostra as últimas linhas do log e **não desliga** a máquina, para permitir investigar. O motivo real está em:" },
    { codigo: "C:\\Windows\\System32\\Sysprep\\Panther\\setuperr.log" },
    { tabela: {
      cab: ["Causa", "Solução"],
      larguras: [3600, 6038],
      linhas: [
        ["App instalado para um usuário e não para a imagem", "O script lista os suspeitos na etapa 9. Inclua os nomes em **Apps e recursos** > Outros pacotes, gere o pacote e rode de novo."],
        ["Windows Update em andamento", "Reinicie, espere as atualizações terminarem e rode de novo. O script para os serviços na etapa 8."],
        ["Limite de rearm atingido", "Ligue **Não consumir rearm** na seção Sysprep."],
        ["Máquina em domínio", "Tire a máquina de referência do domínio antes de generalizar."],
        ["Reinício pendente", "Reinicie (volta em Modo Auditoria) e rode o `.cmd` de novo."],
      ],
    } },
    { caixa: "atencao", texto: "Não apague a pasta `Panther` antes de ler o `setuperr.log`." },

    { h2: "11.2 Outras situações" },
    { tabela: {
      cab: ["Situação", "O que fazer"],
      larguras: [3600, 6038],
      linhas: [
        ["O botão Gerar pacote está cinza", "Há erro na verificação. Clique no resumo da barra superior para ver a lista."],
        ["\"Download expirado\"", "O link do pacote vale uma vez. Clique em Gerar pacote de novo."],
        ["A imagem não inicia (`INACCESSIBLE_BOOT_DEVICE`)", "Armazenamento em RAID/RST na BIOS. Use AHCI em todas as máquinas."],
        ["O Wi-Fi não conectou na máquina clonada", "Falta o driver da placa: inclua o pacote do modelo em Drivers. Veja `C:\\Windows\\Temp\\SysprepStudio-wifi.log`."],
        ["O Windows não ativou", "Rode `slmgr /dlv`. Com chave no perfil, veja `C:\\Windows\\Temp\\SysprepStudio-ativacao.log`. Confira se a chave é da mesma edição."],
        ["O papel de parede ficou preto", "A imagem não foi copiada: use o pacote completo (o `sysprep.xml` sozinho não leva imagens)."],
        ["Perguntou região ou conta no primeiro boot", "Alguma tela da seção Primeiro boot está desligada, ou o `sysprep.xml` usado é de outra versão do perfil."],
      ],
    } },
  ],
};
