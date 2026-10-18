"""Opcoes fechadas oferecidas pela interface.

Tudo aqui tambem aceita valor livre na interface; o catalogo so evita
digitacao e documenta o efeito de cada item.
"""

# Apps provisionados (Get-AppxProvisionedPackage) do Windows 11 23H2/24H2.
# "padrao_lab" marca o que faz sentido tirar numa maquina de uso compartilhado.
APPS = [
    {"id": "Microsoft.Copilot", "nome": "Copilot", "grupo": "IA", "padrao_lab": True},
    {"id": "Microsoft.Windows.Ai.Copilot.Provider", "nome": "Copilot Provider", "grupo": "IA", "padrao_lab": True},
    {"id": "Microsoft.WidgetsPlatformRuntime", "nome": "Widgets Platform Runtime",
     "grupo": "Sistema", "padrao_lab": True,
     "nota": "Bloqueador conhecido do Sysprep (instalado por usuário e não provisionado)."},
    {"id": "MicrosoftWindows.Client.WebExperience", "nome": "Widgets (painel)", "grupo": "Sistema", "padrao_lab": False},
    {"id": "Microsoft.BingNews", "nome": "Notícias", "grupo": "Bing", "padrao_lab": True},
    {"id": "Microsoft.BingWeather", "nome": "Clima", "grupo": "Bing", "padrao_lab": True},
    {"id": "Microsoft.BingSearch", "nome": "Pesquisa Bing", "grupo": "Bing", "padrao_lab": True},
    {"id": "Microsoft.GamingApp", "nome": "Xbox", "grupo": "Jogos", "padrao_lab": True},
    {"id": "Microsoft.XboxGamingOverlay", "nome": "Xbox Game Bar", "grupo": "Jogos", "padrao_lab": True},
    {"id": "Microsoft.XboxIdentityProvider", "nome": "Xbox Identity Provider", "grupo": "Jogos", "padrao_lab": False},
    {"id": "Microsoft.XboxSpeechToTextOverlay", "nome": "Xbox Speech to Text", "grupo": "Jogos", "padrao_lab": True},
    {"id": "Microsoft.Xbox.TCUI", "nome": "Xbox TCUI", "grupo": "Jogos", "padrao_lab": False},
    {"id": "Microsoft.MicrosoftSolitaireCollection", "nome": "Paciência (Solitaire)", "grupo": "Jogos", "padrao_lab": True},
    {"id": "Microsoft.MicrosoftOfficeHub", "nome": "Microsoft 365 (Office Hub)", "grupo": "Produtividade", "padrao_lab": False},
    {"id": "Microsoft.OutlookForWindows", "nome": "Outlook (novo)", "grupo": "Produtividade", "padrao_lab": False},
    {"id": "Microsoft.Todos", "nome": "Microsoft To Do", "grupo": "Produtividade", "padrao_lab": True},
    {"id": "Microsoft.PowerAutomateDesktop", "nome": "Power Automate", "grupo": "Produtividade", "padrao_lab": True},
    {"id": "Microsoft.MicrosoftStickyNotes", "nome": "Notas Autoadesivas", "grupo": "Produtividade", "padrao_lab": False},
    {"id": "Clipchamp.Clipchamp", "nome": "Clipchamp", "grupo": "Mídia", "padrao_lab": True},
    {"id": "Microsoft.ZuneMusic", "nome": "Media Player", "grupo": "Mídia", "padrao_lab": False},
    {"id": "Microsoft.ZuneVideo", "nome": "Filmes e TV", "grupo": "Mídia", "padrao_lab": False},
    {"id": "Microsoft.WindowsSoundRecorder", "nome": "Gravador de Som", "grupo": "Mídia", "padrao_lab": False},
    {"id": "Microsoft.WindowsCamera", "nome": "Câmera", "grupo": "Mídia", "padrao_lab": False},
    {"id": "MSTeams", "nome": "Teams (pessoal)", "grupo": "Comunicação", "padrao_lab": True},
    {"id": "MicrosoftTeams", "nome": "Teams (versão antiga)", "grupo": "Comunicação", "padrao_lab": True},
    {"id": "Microsoft.YourPhone", "nome": "Vincular ao Celular", "grupo": "Comunicação", "padrao_lab": True},
    {"id": "MicrosoftCorporationII.QuickAssist", "nome": "Assistência Rápida", "grupo": "Suporte", "padrao_lab": False},
    {"id": "Microsoft.GetHelp", "nome": "Obter Ajuda", "grupo": "Suporte", "padrao_lab": True},
    {"id": "Microsoft.Getstarted", "nome": "Dicas", "grupo": "Suporte", "padrao_lab": True},
    {"id": "Microsoft.WindowsFeedbackHub", "nome": "Hub de Comentários", "grupo": "Suporte", "padrao_lab": True},
    {"id": "MicrosoftCorporationII.MicrosoftFamily", "nome": "Family Safety", "grupo": "Outros", "padrao_lab": True},
    {"id": "Microsoft.WindowsMaps", "nome": "Mapas", "grupo": "Outros", "padrao_lab": True},
    {"id": "Microsoft.WindowsAlarms", "nome": "Relógio / Alarmes", "grupo": "Outros", "padrao_lab": False},
    {"id": "Microsoft.Windows.DevHome", "nome": "Dev Home", "grupo": "Outros", "padrao_lab": True},
    {"id": "Microsoft.549981C3F5F10", "nome": "Cortana (legado)", "grupo": "Outros", "padrao_lab": True},
]

# Recursos opcionais (Enable/Disable-WindowsOptionalFeature -Online)
RECURSOS = [
    {"id": "NetFx3", "nome": ".NET Framework 3.5", "acao": "ativar",
     "nota": "Baixa do Windows Update: exige internet. O script ativa ANTES de parar o Update."},
    {"id": "Microsoft-Windows-Subsystem-Linux", "nome": "Subsistema Windows para Linux (WSL)", "acao": "ativar",
     "nota": "Exige reinício. Ativa junto a Plataforma de Máquina Virtual e instala o pacote WSL "
             "(exige internet). Distros (Ubuntu etc.) são por usuário."},
    {"id": "VirtualMachinePlatform", "nome": "Plataforma de Máquina Virtual", "acao": "ativar",
     "nota": "Exige reinício."},
    {"id": "Microsoft-Hyper-V-All", "nome": "Hyper-V", "acao": "ativar", "nota": "Exige reinício."},
    {"id": "Containers-DisposableClientVM", "nome": "Windows Sandbox", "acao": "ativar", "nota": "Exige reinício."},
    {"id": "TelnetClient", "nome": "Cliente Telnet", "acao": "ativar"},
    {"id": "TFTP", "nome": "Cliente TFTP", "acao": "ativar"},
    {"id": "IIS-WebServerRole", "nome": "IIS (Servidor Web)", "acao": "ativar"},
    {"id": "SMB1Protocol", "nome": "SMB 1.0 (inseguro)", "acao": "desativar"},
    {"id": "MicrosoftWindowsPowerShellV2Root", "nome": "Windows PowerShell 2.0", "acao": "desativar"},
    {"id": "Recall", "nome": "Recall (Copilot+ PC)", "acao": "desativar"},
    {"id": "Printing-XPSServices-Features", "nome": "Impressora XPS", "acao": "desativar"},
    {"id": "WorkFolders-Client", "nome": "Pastas de Trabalho", "acao": "desativar"},
]

FUSOS = [
    {"id": "E. South America Standard Time", "nome": "Brasília (SP, RJ, MG, Sul, GO, DF)"},
    {"id": "Bahia Standard Time", "nome": "Salvador"},
    {"id": "Tocantins Standard Time", "nome": "Palmas"},
    {"id": "SA Eastern Standard Time", "nome": "Fortaleza, Belém, Recife"},
    {"id": "Central Brazilian Standard Time", "nome": "Cuiabá"},
    {"id": "SA Western Standard Time", "nome": "Manaus"},
    {"id": "SA Pacific Standard Time", "nome": "Rio Branco"},
    {"id": "UTC-02", "nome": "Fernando de Noronha"},
    {"id": "UTC", "nome": "UTC"},
    {"id": "GMT Standard Time", "nome": "Lisboa, Londres"},
    {"id": "Eastern Standard Time", "nome": "Nova York"},
    {"id": "Pacific Standard Time", "nome": "Los Angeles"},
]

IDIOMAS = [
    {"id": "pt-BR", "nome": "Português (Brasil)"},
    {"id": "en-US", "nome": "Inglês (EUA)"},
    {"id": "es-ES", "nome": "Espanhol (Espanha)"},
    {"id": "pt-PT", "nome": "Português (Portugal)"},
]

TECLADOS = [
    {"id": "0416:00010416", "nome": "Português (Brasil) ABNT2"},
    {"id": "0416:00000416", "nome": "Português (Brasil) ABNT"},
    {"id": "0409:00000409", "nome": "Inglês (EUA)"},
    {"id": "0409:00020409", "nome": "Inglês (EUA) Internacional"},
    {"id": "0816:00000816", "nome": "Português (Portugal)"},
    {"id": "pt-BR", "nome": "Padrão do idioma pt-BR"},
]

# Chaves genericas publicas de cliente KMS (GVLK) documentadas pela Microsoft.
# So ativam contra um servidor KMS; servem para fixar a EDICAO.
CHAVES_GENERICAS = [
    {"id": "W269N-WFGWX-YVC9B-4J6C9-T83GX", "nome": "Pro (GVLK)"},
    {"id": "6TP4R-GNPTD-KYYHQ-7B7DP-J447Y", "nome": "Pro Education (GVLK)"},
    {"id": "NW6C2-QMPVW-D7KKK-3GKT6-VCFB2", "nome": "Education (GVLK)"},
    {"id": "NPPR9-FWDCX-D2C8J-H872K-2YT43", "nome": "Enterprise (GVLK)"},
]

GRUPOS_FIREWALL = [
    {"id": "Remote Desktop", "nome": "Área de Trabalho Remota"},
    {"id": "File and Printer Sharing", "nome": "Compartilhamento de Arquivos e Impressoras (inclui ping)"},
    {"id": "Network Discovery", "nome": "Descoberta de Rede"},
    {"id": "Windows Remote Management", "nome": "Gerenciamento Remoto (WinRM)"},
    {"id": "Remote Event Log Management", "nome": "Gerenciamento Remoto de Log de Eventos"},
]

GRUPOS_CONTA = [
    {"id": "Administrators", "nome": "Administradores"},
    {"id": "Users", "nome": "Usuários"},
    {"id": "Power Users", "nome": "Usuários avançados"},
    {"id": "Remote Desktop Users", "nome": "Usuários da Área de Trabalho Remota"},
]


def tudo() -> dict:
    return {
        "apps": APPS,
        "recursos": RECURSOS,
        "fusos": FUSOS,
        "idiomas": IDIOMAS,
        "teclados": TECLADOS,
        "chaves_genericas": CHAVES_GENERICAS,
        "grupos_firewall": GRUPOS_FIREWALL,
        "grupos_conta": GRUPOS_CONTA,
    }
