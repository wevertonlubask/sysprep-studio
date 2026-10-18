module.exports = {
  num: 7,
  titulo: "Sistema e finalização",
  subtitulo: "Aparência, Apps e recursos, Drivers, Energia, Comandos e Sysprep",
  blocos: [
    { h2: "7.1 Aparência" },
    { p: "Tudo começa no padrão do Windows: só o que for mudado aqui entra na imagem." },
    { fig: "07-01-aparencia.png", legenda: "Seção Aparência." },
    { lista: [
      "**Papel de parede** [1]: padrão, **imagem inicial** (aplicada no primeiro logon; o usuário pode trocar) ou **fixa** (travada por política). Envie JPG, PNG ou BMP, de preferência 1920×1080 ou maior.",
      "**Tela de bloqueio** [2]: padrão ou fixa. O botão **Usar a mesma imagem** reaproveita a do papel de parede. Aqui também se desliga o Windows Spotlight e o desfoque da tela de login.",
      "**Tema e barra de tarefas** [3]: claro ou escuro, barra à esquerda, pesquisa, Visão de Tarefas, Widgets, Chat e \"Recomendados\" do Iniciar.",
      "**Exibição** [4]: resolução igual em todas as máquinas, duplicar ou estender para projetor, escala e tamanho do texto.",
      "**Explorador de Arquivos** [5]: extensões, arquivos ocultos, ícone Este Computador e o menu de contexto clássico.",
      "**Perfil modelo** [6]: o **CopyProfile** copia o perfil do Administrador de auditoria para todas as contas novas.",
    ] },
    { caixa: "atencao", texto: "Com CopyProfile, tudo o que estiver no perfil do Administrador de auditoria vira o padrão de todos: não deixe arquivos pessoais, senhas salvas no navegador ou logins de programas nele." },
    { caixa: "dica", texto: "O travamento \"fixo\" é por política: usuário padrão não consegue mudar; administrador consegue desfazer pelo registro." },

    { h2: "7.2 Apps e recursos" },
    { fig: "07-02-apps.png", legenda: "Seção Apps e recursos." },
    { lista: [
      "**Apps a remover** [1]: marque no catálogo (agrupado por tipo). **Marcar recomendados para uso compartilhado** marca de uma vez os apps de consumo. No campo de baixo, cole o nome de outros pacotes, um por linha.",
      "**OneDrive e Edge** [2]: remover o OneDrive (e impedir a reinstalação em perfis novos), tirar o assistente de primeira execução do Edge e definir a página inicial.",
      "**Recursos opcionais** [3]: ativar (ex.: .NET 3.5, WSL) ou desativar recursos do Windows.",
    ] },
    { p: "O script remove cada app **do usuário e da imagem** (desprovisiona). Remover só do usuário é a causa mais comum de falha do Sysprep." },

    { h2: "7.3 Drivers" },
    { p: "Para uma imagem servir em vários modelos de computador, envie aqui o pacote de drivers de cada modelo." },
    { fig: "07-03-drivers.png", legenda: "Seção Drivers com dois pacotes." },
    { passos: [
      "Arraste os arquivos para a área de envio [1] ou clique em **Escolher arquivos**. Aceita `.cab`, `.zip` e `.exe` (Driver Pack da Dell). Mantenha a página aberta até o envio terminar.",
      "Os pacotes enviados aparecem na lista [2], com o tamanho. A lixeira exclui.",
    ] },
    { p: "Na máquina de referência, o script extrai cada pacote e o adiciona ao repositório de drivers do Windows **sem instalar**. Cada máquina clonada instala, no primeiro boot, só os drivers do próprio hardware." },
    { caixa: "atencao", texto: "Dell: baixe o _Driver Pack_ de cada modelo para Windows 11 x64 (página Dell Command | Deploy Driver Packs), não os drivers soltos. Na BIOS, deixe o armazenamento em **AHCI** em todas as máquinas: em \"RAID On\" a imagem pode não iniciar (`INACCESSIBLE_BOOT_DEVICE`)." },
    { caixa: "atencao", texto: "Pendrive em FAT32 não aceita arquivo acima de 4 GB. Com pacotes grandes, formate o pendrive em NTFS ou exFAT." },

    { h2: "7.4 Energia" },
    { p: "Plano de energia, tempo para desligar a tela e suspender (0 = nunca), hibernação e inicialização rápida (desligue para Wake-on-LAN)." },
    { fig: "07-04-energia.png", legenda: "Seção Energia.", largura: 0.85 },

    { h2: "7.5 Comandos" },
    { p: "Para o que não tem opção pronta. Os comandos rodam depois dos ajustes das outras seções, na ordem da lista." },
    { fig: "07-05-comandos.png", legenda: "Seção Comandos." },
    { lista: [
      "**Passe specialize** [1]: roda como SYSTEM, antes de existir qualquer usuário. Bom para `reg.exe` em HKLM, `powercfg` e `sc.exe`. Não há rede garantida.",
      "**Primeiro logon** [2]: roda uma vez, elevado, no primeiro logon. Tem rede e PowerShell completo (ex.: mapear uma unidade de rede).",
    ] },
    { caixa: "atencao", texto: "O executável é chamado direto, sem `cmd`: para usar `&&`, `|` ou redirecionamento, comece com `cmd.exe /c`. Limite de 1024 caracteres por comando." },

    { h2: "7.6 Sysprep" },
    { fig: "07-06-sysprep.png", legenda: "Seção Sysprep." },
    { lista: [
      "**Após generalizar, a imagem inicia em**: **OOBE** (uso normal) ou **Auditoria** (para continuar ajustando uma imagem já generalizada).",
      "**Ao terminar**: **Desligar** (para capturar), reiniciar ou manter ligado.",
      "**Arquitetura**: x64 ou ARM64.",
      "**Restaurar o Windows Update** (deixe ligado), **Manter drivers instalados** (só com hardware idêntico em todas), **Não consumir rearm** e **Modo máquina virtual** (só para VHD no mesmo hipervisor).",
    ] },
  ],
};
