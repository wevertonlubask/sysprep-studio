"""Traducao das opcoes do perfil em comandos.

Dois destinos, escolhidos pelo escopo do ajuste:

- MAQUINA (HKLM, powercfg, net): vira <RunSynchronousCommand> no passe
  specialize do sysprep.xml. Roda como SYSTEM antes do primeiro logon.
- USUARIO (HKCU): vai para o manifesto do pacote e o script de preparo
  aplica, em Modo Auditoria, no HKCU do Administrador de auditoria (que o
  CopyProfile copia) E no hive do perfil Default (usado sem CopyProfile).
  Assim o efeito nao depende da ordem interna do specialize.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Callable

from .modelo import Perfil

BRANDING = r"C:\Windows\Web\Branding"
SCRIPTS = r"C:\Windows\Setup\Scripts"


def reg_add(chave: str, nome: str, tipo: str, valor: str | int) -> str:
    return f'reg.exe add "{chave}" /v {nome} /t {tipo} /d "{valor}" /f' if tipo == "REG_SZ" \
        else f'reg.exe add "{chave}" /v {nome} /t {tipo} /d {valor} /f'


def dword(chave: str, nome: str, valor: int) -> str:
    return reg_add(chave, nome, "REG_DWORD", valor)


@dataclass(frozen=True)
class Ajuste:
    descricao: str
    comando: str
    ativo: Callable[[Perfil], bool]
    # aplica no perfil o efeito deste comando (usado ao importar um XML)
    marcar: Callable[[Perfil], None]


def _set(caminho: str, valor=True) -> Callable[[Perfil], None]:
    partes = caminho.split(".")

    def f(p: Perfil) -> None:
        alvo = p
        for parte in partes[:-1]:
            alvo = getattr(alvo, parte)
        setattr(alvo, partes[-1], valor)

    return f


def _get(caminho: str) -> Callable[[Perfil], object]:
    def f(p: Perfil):
        alvo = p
        for parte in caminho.split("."):
            alvo = getattr(alvo, parte)
        return alvo

    return f


def _se(caminho: str, valor=True) -> Callable[[Perfil], bool]:
    g = _get(caminho)
    return lambda p: g(p) == valor


POL = r"HKLM\SOFTWARE\Policies\Microsoft"
CSP = r"HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\PersonalizationCSP"


def _spotlight_off(p: Perfil) -> bool:
    # Spotlight sobrescreve a tela de bloqueio fixa: desligar e obrigatorio.
    return p.personalizacao.desativar_spotlight or p.personalizacao.tela_bloqueio_modo == "fixo"


# Ajustes de maquina com valor fixo, na ordem em que entram no XML.
# Os que dependem de texto do perfil (caminhos, minutos, URL) estao em
# comandos_dinamicos().
AJUSTES_MAQUINA: list[Ajuste] = [
    # -------- personalizacao
    Ajuste("Politica - impedir troca da tela de bloqueio",
           dword(rf"{POL}\Windows\Personalization", "NoChangingLockScreen", 1),
           _se("personalizacao.tela_bloqueio_modo", "fixo"), lambda p: None),
    Ajuste("Desativar Windows Spotlight (senao sobrescreve a tela de bloqueio)",
           dword(rf"{POL}\Windows\CloudContent", "DisableWindowsSpotlightFeatures", 1),
           _spotlight_off, _set("personalizacao.desativar_spotlight")),
    Ajuste("Desativar Spotlight na tela de bloqueio",
           dword(rf"{POL}\Windows\CloudContent", "ConfigureWindowsSpotlight", 2),
           _spotlight_off, _set("personalizacao.desativar_spotlight")),
    Ajuste("Tela de login sem desfoque (imagem nitida)",
           dword(rf"{POL}\Windows\System", "DisableAcrylicBackgroundOnLogon", 1),
           _se("personalizacao.login_sem_desfoque"), _set("personalizacao.login_sem_desfoque")),
    Ajuste("Ocultar Widgets da barra de tarefas",
           dword(rf"{POL}\Dsh", "AllowNewsAndInterests", 0),
           _se("personalizacao.ocultar_widgets"), _set("personalizacao.ocultar_widgets")),
    Ajuste("Ocultar icone de Chat/Teams da barra de tarefas",
           dword(rf"{POL}\Windows\Windows Chat", "ChatIcon", 3),
           _se("personalizacao.ocultar_chat"), _set("personalizacao.ocultar_chat")),
    Ajuste("Ocultar secao Recomendados do Iniciar (Education/Enterprise)",
           dword(rf"{POL}\Windows\Explorer", "HideRecommendedSection", 1),
           _se("personalizacao.ocultar_recomendados_iniciar"), _set("personalizacao.ocultar_recomendados_iniciar")),

    # -------- OOBE
    Ajuste("Pular as telas de privacidade do OOBE",
           dword(rf"{POL}\Windows\OOBE", "DisablePrivacyExperience", 1),
           _se("oobe.ocultar_privacidade"), _set("oobe.ocultar_privacidade")),
    Ajuste("Dispensar exigencia de internet no OOBE",
           dword(r"HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\OOBE", "BypassNRO", 1),
           _se("oobe.dispensar_internet"), _set("oobe.dispensar_internet")),
    # a animacao cobriria a tela de configuracao inicial do 1o logon
    Ajuste("Desligar a animacao de primeiro logon",
           dword(r"HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System", "EnableFirstLogonAnimation", 0),
           lambda p: p.oobe.sem_animacao_primeiro_logon or p.tela_inicial.ativo,
           _set("oobe.sem_animacao_primeiro_logon")),
    Ajuste('Desligar o "Vamos terminar de configurar seu dispositivo" (SCOOBE)',
           dword(r"HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\UserProfileEngagement", "ScoobeSystemSettingEnabled", 0),
           _se("oobe.sem_scoobe"), _set("oobe.sem_scoobe")),

    # -------- privacidade
    Ajuste("Desativar sugestoes e apps promocionais da Microsoft",
           dword(rf"{POL}\Windows\CloudContent", "DisableWindowsConsumerFeatures", 1),
           _se("privacidade.desativar_apps_sugeridos"), _set("privacidade.desativar_apps_sugeridos")),
    Ajuste("Desativar ID de publicidade",
           dword(rf"{POL}\Windows\AdvertisingInfo", "DisabledByGroupPolicy", 1),
           _se("privacidade.desativar_id_publicidade"), _set("privacidade.desativar_id_publicidade")),
    Ajuste("Desativar pesquisa na web pelo Iniciar",
           dword(rf"{POL}\Windows\Windows Search", "DisableWebSearch", 1),
           _se("privacidade.desativar_pesquisa_web"), _set("privacidade.desativar_pesquisa_web")),
    Ajuste("Nao usar a web nos resultados da pesquisa",
           dword(rf"{POL}\Windows\Windows Search", "ConnectedSearchUseWeb", 0),
           _se("privacidade.desativar_pesquisa_web"), _set("privacidade.desativar_pesquisa_web")),
    Ajuste("Historico de atividades - nao publicar",
           dword(rf"{POL}\Windows\System", "PublishUserActivities", 0),
           _se("privacidade.desativar_historico_atividades"), _set("privacidade.desativar_historico_atividades")),
    Ajuste("Historico de atividades - nao enviar",
           dword(rf"{POL}\Windows\System", "UploadUserActivities", 0),
           _se("privacidade.desativar_historico_atividades"), _set("privacidade.desativar_historico_atividades")),
    Ajuste("Desativar localizacao",
           dword(rf"{POL}\Windows\LocationAndSensors", "DisableLocation", 1),
           _se("privacidade.desativar_localizacao"), _set("privacidade.desativar_localizacao")),
    Ajuste("Politica - desligar Windows Copilot",
           dword(rf"{POL}\Windows\WindowsCopilot", "TurnOffWindowsCopilot", 1),
           _se("privacidade.desativar_copilot_politica"), _set("privacidade.desativar_copilot_politica")),

    # -------- apps
    Ajuste("Politica - impedir o OneDrive de sincronizar",
           dword(rf"{POL}\Windows\OneDrive", "DisableFileSyncNGSC", 1),
           _se("apps.remover_onedrive"), _set("apps.remover_onedrive")),
    Ajuste("Edge - pular a primeira execucao",
           dword(rf"{POL}\Edge", "HideFirstRunExperience", 1),
           _se("apps.edge_sem_primeira_execucao"), _set("apps.edge_sem_primeira_execucao")),

    # -------- energia
    Ajuste("Plano de energia - Alto desempenho",
           "powercfg.exe /setactive SCHEME_MIN",
           _se("energia.plano", "alto_desempenho"), _set("energia.plano", "alto_desempenho")),
    Ajuste("Plano de energia - Equilibrado",
           "powercfg.exe /setactive SCHEME_BALANCED",
           _se("energia.plano", "equilibrado"), _set("energia.plano", "equilibrado")),
    Ajuste("Desativar hibernacao",
           "powercfg.exe /hibernate off",
           _se("energia.desativar_hibernacao"), _set("energia.desativar_hibernacao")),
    Ajuste("Desativar inicializacao rapida (Fast Startup)",
           dword(r"HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Power", "HiberbootEnabled", 0),
           _se("energia.desativar_inicializacao_rapida"), _set("energia.desativar_inicializacao_rapida")),

    # -------- atualizacoes
    Ajuste("Windows Update - apenas notificar",
           dword(rf"{POL}\Windows\WindowsUpdate\AU", "AUOptions", 2),
           _se("atualizacoes.politica", "notificar"), _set("atualizacoes.politica", "notificar")),
    Ajuste("Windows Update - desativar atualizacao automatica",
           dword(rf"{POL}\Windows\WindowsUpdate\AU", "NoAutoUpdate", 1),
           _se("atualizacoes.politica", "desativar_automatica"), _set("atualizacoes.politica", "desativar_automatica")),
    Ajuste("Windows Update - nao reiniciar com usuario logado",
           dword(rf"{POL}\Windows\WindowsUpdate\AU", "NoAutoRebootWithLoggedOnUsers", 1),
           _se("atualizacoes.sem_reinicio_com_usuario"), _set("atualizacoes.sem_reinicio_com_usuario")),
    Ajuste("Loja - nao atualizar apps automaticamente",
           dword(rf"{POL}\WindowsStore", "AutoDownload", 2),
           _se("atualizacoes.loja_sem_atualizacao_automatica"), _set("atualizacoes.loja_sem_atualizacao_automatica")),

    # -------- seguranca
    Ajuste("Impedir criptografia automatica do dispositivo (BitLocker)",
           dword(r"HKLM\SYSTEM\CurrentControlSet\Control\BitLocker", "PreventDeviceEncryption", 1),
           _se("seguranca.impedir_bitlocker_automatico"), _set("seguranca.impedir_bitlocker_automatico")),
    Ajuste("UAC - administradores sem pedido de confirmacao",
           dword(r"HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System", "ConsentPromptBehaviorAdmin", 0),
           _se("seguranca.uac", "sem_prompt_admin"), _set("seguranca.uac", "sem_prompt_admin")),
    Ajuste("Desativar SmartScreen",
           dword(rf"{POL}\Windows\System", "EnableSmartScreen", 0),
           _se("seguranca.desativar_smartscreen"), _set("seguranca.desativar_smartscreen")),
    Ajuste("Desativar Windows Hello para Empresas",
           dword(rf"{POL}\PassportForWork", "Enabled", 0),
           _se("seguranca.desativar_hello_empresarial"), _set("seguranca.desativar_hello_empresarial")),
    Ajuste("Permitir caminhos longos (> 260 caracteres)",
           dword(r"HKLM\SYSTEM\CurrentControlSet\Control\FileSystem", "LongPathsEnabled", 1),
           _se("seguranca.caminhos_longos"), _set("seguranca.caminhos_longos")),

    # -------- sysprep
    Ajuste("Restaurar Windows Update (desabilitado pelo script de preparo)",
           "sc.exe config wuauserv start= demand",
           _se("sysprep.restaurar_windows_update"), _set("sysprep.restaurar_windows_update")),
    Ajuste("Restaurar Orquestrador de Atualizacoes (desabilitado pelo script de preparo)",
           "sc.exe config UsoSvc start= delayed-auto",
           _se("sysprep.restaurar_windows_update"), _set("sysprep.restaurar_windows_update")),

    # -------- tema
    # Ao criar cada conta o Windows aplica o tema de InstallTheme (aero.theme,
    # claro) por cima do que veio do perfil Default/CopyProfile. Apontar para
    # o dark.theme faz o perfil novo ja nascer no modo escuro.
    Ajuste("Tema escuro como padrao de contas novas",
           reg_add(r"HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes", "InstallTheme", "REG_SZ",
                   r"C:\Windows\Resources\Themes\dark.theme"),
           _se("personalizacao.tema", "escuro"), _set("personalizacao.tema", "escuro")),
    Ajuste("Tema escuro como padrao de contas novas (32 bits)",
           reg_add(r"HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Themes", "InstallTheme", "REG_SZ",
                   r"C:\Windows\Resources\Themes\dark.theme"),
           _se("personalizacao.tema", "escuro"), _set("personalizacao.tema", "escuro")),

    # -------- contas
    Ajuste("Senhas locais nunca expiram",
           "net.exe accounts /maxpwage:UNLIMITED",
           _se("contas.senhas_nao_expiram"), _set("contas.senhas_nao_expiram")),
]

TELEMETRIA = {"obrigatoria": 1, "desligada": 0}


def caminho_branding(arquivo: str) -> str:
    return rf"{BRANDING}\{arquivo}"


RUN_MAQUINA = r"HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"


def precisa_exibicao(p: Perfil) -> bool:
    return bool(p.exibicao.resolucao) or p.exibicao.telas != "padrao"


def comando_exibicao(p: Perfil) -> str:
    """Chamada do Ajustar-Exibicao.ps1. Sem aspas: o caminho nao tem espaco e
    o comando cabe dentro do /d "..." do reg.exe sem escapar nada."""
    ex = p.exibicao
    args = ""
    if ex.resolucao:
        args += f" -Resolucao {ex.resolucao}"
    if ex.telas != "padrao":
        args += f" -Telas {ex.telas}"
    return (f"powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass "
            f"-File {SCRIPTS}\\Ajustar-Exibicao.ps1{args}")


def comandos_dinamicos(p: Perfil) -> list[tuple[str, str]]:
    """Comandos de maquina cujo texto depende de valores do perfil."""
    cmds: list[tuple[str, str]] = []
    pz = p.personalizacao

    if pz.papel_parede_modo == "fixo" and pz.papel_parede:
        img = caminho_branding(pz.papel_parede)
        cmds += [
            ("Plano de fundo - caminho", reg_add(CSP, "DesktopImagePath", "REG_SZ", img)),
            ("Plano de fundo - url", reg_add(CSP, "DesktopImageUrl", "REG_SZ", img)),
            ("Plano de fundo - status", dword(CSP, "DesktopImageStatus", 1)),
        ]
    if pz.tela_bloqueio_modo == "fixo" and pz.tela_bloqueio:
        img = caminho_branding(pz.tela_bloqueio)
        cmds += [
            ("Tela de bloqueio - caminho", reg_add(CSP, "LockScreenImagePath", "REG_SZ", img)),
            ("Tela de bloqueio - url", reg_add(CSP, "LockScreenImageUrl", "REG_SZ", img)),
            ("Tela de bloqueio - status", dword(CSP, "LockScreenImageStatus", 1)),
            ("Politica - tela de bloqueio fixa (Education/Enterprise)",
             reg_add(rf"{POL}\Windows\Personalization", "LockScreenImage", "REG_SZ", img)),
        ]
        if pz.imagem_na_tela_login:
            cmds.append(("Tela de login - mostrar a imagem da tela de bloqueio",
                         dword(rf"{POL}\Windows\System", "DisableLogonBackgroundImage", 0)))

    if precisa_exibicao(p) and p.exibicao.sempre:
        # resolucao e topologia sao da maquina, mas so podem ser trocadas de
        # dentro de uma sessao com area de trabalho: roda em todo logon
        cmds.append(("Exibicao - reaplicar resolucao/telas em todo logon",
                     reg_add(RUN_MAQUINA, "AjustarExibicao", "REG_SZ", comando_exibicao(p))))

    if p.privacidade.telemetria in TELEMETRIA:
        cmds.append((f"Telemetria - nivel {TELEMETRIA[p.privacidade.telemetria]}",
                     dword(rf"{POL}\Windows\DataCollection", "AllowTelemetry",
                           TELEMETRIA[p.privacidade.telemetria])))

    url = p.apps.edge_pagina_inicial.strip()
    if url:
        cmds += [
            ("Edge - pagina inicial", reg_add(rf"{POL}\Edge", "HomepageLocation", "REG_SZ", url)),
            ("Edge - abrir paginas especificas ao iniciar", dword(rf"{POL}\Edge", "RestoreOnStartup", 4)),
            ("Edge - pagina ao iniciar", reg_add(rf"{POL}\Edge\RestoreOnStartupURLs", "1", "REG_SZ", url)),
        ]

    if p.energia.desligar_tela_min is not None:
        cmds.append(("Energia - desligar a tela (tomada)",
                     f"powercfg.exe /change monitor-timeout-ac {p.energia.desligar_tela_min}"))
    if p.energia.suspender_min is not None:
        cmds.append(("Energia - suspender (tomada)",
                     f"powercfg.exe /change standby-timeout-ac {p.energia.suspender_min}"))

    from . import wifi  # wifi importa SCRIPTS deste modulo
    if wifi.redes_validas(p):
        cmds.append(("Wi-Fi - tarefa que importa as redes na inicializacao (SYSTEM)", wifi.comando_tarefa()))
    return cmds


def comandos_especializacao(p: Perfil) -> list[tuple[str, str]]:
    """Todos os comandos do specialize, na ordem, sem duplicatas."""
    todos = comandos_dinamicos(p)[:]
    # branding primeiro (como no legado), depois o restante
    todos += [(a.descricao, a.comando) for a in AJUSTES_MAQUINA if a.ativo(p)]
    todos += [(c.descricao or "Comando personalizado", c.comando)
              for c in p.comandos.especializacao if c.comando.strip()]
    vistos: set[str] = set()
    saida = []
    for desc, cmd in todos:
        if cmd not in vistos:
            vistos.add(cmd)
            saida.append((desc, cmd))
    return saida


LOG_ATIVACAO = r"%WINDIR%\Temp\SysprepStudio-ativacao.log"


def comandos_ativacao(chave: str) -> list[tuple[str, str]]:
    slmgr = r"cscript.exe //nologo %WINDIR%\System32\slmgr.vbs"
    return [
        ("Licenca - instalar a chave do produto (slmgr /ipk)",
         f'cmd.exe /c {slmgr} /ipk {chave} >> "{LOG_ATIVACAO}" 2>&1'),
        ("Licenca - ativar o Windows (slmgr /ato)",
         f'cmd.exe /c {slmgr} /ato >> "{LOG_ATIVACAO}" 2>&1'),
    ]


def comandos_primeiro_logon(p: Perfil) -> list[tuple[str, str]]:
    cmds: list[tuple[str, str]] = []
    lic = p.licenca
    if lic.modo == "chave" and lic.chave.strip() and lic.reforcar_no_primeiro_logon:
        cmds += comandos_ativacao(lic.chave.strip().upper())
    if p.contas.admin_embutido_ativo:
        # pelo SID (-500): o nome muda com o idioma (Administrator/Administrador)
        cmds.append(("Ativar a conta Administrador embutida",
                     'powershell.exe -NoProfile -Command "Get-LocalUser | Where-Object { $_.SID -like \'S-1-5-*-500\' } | Enable-LocalUser"'))
    if p.rede.winrm_ativo:
        cmds.append(("Habilitar PowerShell remoto (WinRM)",
                     'powershell.exe -NoProfile -Command "Enable-PSRemoting -Force -SkipNetworkProfileCheck"'))
    cmds += [(c.descricao or "Comando personalizado", c.comando)
             for c in p.comandos.primeiro_logon if c.comando.strip()]
    from . import tela_inicial  # tela_inicial importa SCRIPTS deste modulo
    if tela_inicial.ativa(p):
        # por ultimo: ao confirmar, a tela reinicia a maquina
        cmds.append(("Tela de configuracao inicial (nome, dominio e OU)", tela_inicial.comando()))
    return cmds


# ------------------------------------------------------------------ usuario

EXPLORER_ADV = r"Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced"
CDM = r"Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager"


def _u(chave: str, nome: str, valor: int | str, tipo: str = "DWord") -> dict:
    return {"chave": chave, "nome": nome, "tipo": tipo, "valor": valor}


def precisa_aplicar_visual(p: Perfil) -> bool:
    return p.personalizacao.tema != "padrao" or p.personalizacao.busca_barra != "padrao"


def ajustes_usuario(p: Perfil) -> list[dict]:
    """Valores de HKCU aplicados pelo script (tipo = PropertyType do PowerShell)."""
    pz = p.personalizacao
    r: list[dict] = []
    if pz.tema != "padrao":
        claro = 1 if pz.tema == "claro" else 0
        tema = r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize"
        r += [_u(tema, "AppsUseLightTheme", claro), _u(tema, "SystemUsesLightTheme", claro)]
    if pz.barra_alinhamento == "esquerda":
        r.append(_u(EXPLORER_ADV, "TaskbarAl", 0))
    if pz.busca_barra != "padrao":
        modo = {"oculta": 0, "icone": 1, "caixa": 2}[pz.busca_barra]
        r.append(_u(r"Software\Microsoft\Windows\CurrentVersion\Search", "SearchboxTaskbarMode", modo))
    if pz.ocultar_visao_tarefas:
        r.append(_u(EXPLORER_ADV, "ShowTaskViewButton", 0))
    if pz.mostrar_extensoes:
        r.append(_u(EXPLORER_ADV, "HideFileExt", 0))
    if pz.mostrar_ocultos:
        r.append(_u(EXPLORER_ADV, "Hidden", 1))
    if pz.explorer_abre_este_computador:
        r.append(_u(EXPLORER_ADV, "LaunchTo", 1))
    if pz.icone_este_computador:
        r.append(_u(r"Software\Microsoft\Windows\CurrentVersion\Explorer\HideDesktopIcons\NewStartPanel",
                    "{20D04FE0-3AEA-1069-A2D8-08002B30309D}", 0))
    if pz.menu_contexto_classico:
        r.append(_u(r"Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32",
                    "(default)", "", "String"))
    if precisa_aplicar_visual(p):
        # os valores acima sozinhos nao bastam: o primeiro logon do perfil
        # novo aplica o tema padrao e os padroes da barra por cima deles
        args = ""
        if pz.tema != "padrao":
            args += f" -Tema {pz.tema}"
        if pz.busca_barra != "padrao":
            args += f" -Busca {modo}"
        r.append(_u(r"Software\Microsoft\Windows\CurrentVersion\RunOnce", "AplicarVisual",
                    f'powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass '
                    f'-File "{SCRIPTS}\\Aplicar-Visual.ps1"{args}', "String"))
    ex = p.exibicao
    if ex.escala:
        # escala personalizada unica para todos os monitores (96 dpi = 100%);
        # o valor por monitor (PerMonitorSettings) depende do ID de cada tela
        r += [_u(r"Control Panel\Desktop", "LogPixels", ex.escala * 96 // 100),
              _u(r"Control Panel\Desktop", "Win8DpiScaling", 1)]
    if ex.tamanho_texto != 100:
        r.append(_u(r"Software\Microsoft\Accessibility", "TextScaleFactor", ex.tamanho_texto))
    if precisa_exibicao(p) and not ex.sempre:
        r.append(_u(r"Software\Microsoft\Windows\CurrentVersion\RunOnce", "AjustarExibicao",
                    comando_exibicao(p), "String"))
    if pz.papel_parede_modo == "inicial" and pz.papel_parede:
        img = caminho_branding(pz.papel_parede)
        r.append(_u(r"Control Panel\Desktop", "Wallpaper", img, "String"))
        r.append(_u(r"Software\Microsoft\Windows\CurrentVersion\RunOnce", "DefinirPapelParede",
                    f'powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass '
                    f'-File "{SCRIPTS}\\Definir-PapelParede.ps1" -Imagem "{img}"', "String"))
    if p.privacidade.desativar_dicas_usuario:
        for nome in ("SubscribedContent-338388Enabled", "SubscribedContent-338389Enabled",
                     "SubscribedContent-353694Enabled", "SubscribedContent-353696Enabled",
                     "SystemPaneSuggestionsEnabled", "SoftLandingEnabled", "SilentInstalledAppsEnabled"):
            r.append(_u(CDM, nome, 0))
    if p.privacidade.desativar_pesquisa_web:
        r.append(_u(r"Software\Policies\Microsoft\Windows\Explorer", "DisableSearchBoxSuggestions", 1))
    if p.privacidade.desativar_copilot_politica:
        r.append(_u(r"Software\Policies\Microsoft\Windows\WindowsCopilot", "TurnOffWindowsCopilot", 1))
    if p.oobe.sem_scoobe:
        r.append(_u(r"Software\Microsoft\Windows\CurrentVersion\UserProfileEngagement",
                    "ScoobeSystemSettingEnabled", 0))
    if p.apps.remover_onedrive:
        # sem isso cada perfil novo reinstala o OneDrive no primeiro logon
        r.append({"chave": r"Software\Microsoft\Windows\CurrentVersion\Run", "nome": "OneDriveSetup",
                  "remover": True})
    return r


# ------------------------------------------------------------------ importacao

_NORMALIZA = re.compile(r"\s+")


def normalizar(cmd: str) -> str:
    return _NORMALIZA.sub(" ", cmd.strip()).lower()


_RE_CSP = re.compile(r'personalizationcsp" /v (desktopimagepath|lockscreenimagepath) /t reg_sz /d "([^"]+)"', re.I)
_RE_CSP_AUX = re.compile(r'personalizationcsp" /v (desktopimageurl|desktopimagestatus|lockscreenimageurl|'
                         r'lockscreenimagestatus) ', re.I)
_RE_LOCK_POL = re.compile(r'windows\\personalization" /v lockscreenimage /t reg_sz', re.I)
_RE_LOGON_IMG = re.compile(r'windows\\system" /v disablelogonbackgroundimage /t reg_dword /d 0', re.I)
_RE_TELEMETRIA =re.compile(r'datacollection" /v allowtelemetry /t reg_dword /d (\d)', re.I)
_RE_POWER = re.compile(r"powercfg(?:\.exe)? /change (monitor|standby)-timeout-ac (\d+)", re.I)
_RE_EDGE = re.compile(r'edge" /v homepagelocation /t reg_sz /d "([^"]+)"', re.I)
_RE_EXIBICAO = re.compile(r'\\run" /v ajustarexibicao /t reg_sz /d "([^"]+)"', re.I)
_RE_EDGE_AUX = re.compile(r'(edge" /v restoreonstartup /|edge\\restoreonstartupurls")', re.I)


def reconhecer(p: Perfil, comando: str) -> bool:
    """Aplica no perfil o efeito de um comando conhecido. False = desconhecido."""
    n = normalizar(comando)
    for a in AJUSTES_MAQUINA:
        if normalizar(a.comando) == n:
            a.marcar(p)
            return True

    m = _RE_CSP.search(comando)
    if m:
        arquivo = m.group(2).rsplit("\\", 1)[-1]
        if m.group(1).lower() == "desktopimagepath":
            p.personalizacao.papel_parede_modo = "fixo"
            p.personalizacao.papel_parede = arquivo
        else:
            p.personalizacao.tela_bloqueio_modo = "fixo"
            p.personalizacao.tela_bloqueio = arquivo
        return True
    if _RE_CSP_AUX.search(comando) or _RE_LOCK_POL.search(comando) or _RE_EDGE_AUX.search(comando):
        return True
    if _RE_LOGON_IMG.search(comando):
        p.personalizacao.imagem_na_tela_login = True
        return True
    m = _RE_TELEMETRIA.search(comando)
    if m:
        p.privacidade.telemetria = "desligada" if m.group(1) == "0" else "obrigatoria"
        return True
    m = _RE_POWER.search(comando)
    if m:
        if m.group(1).lower() == "monitor":
            p.energia.desligar_tela_min = int(m.group(2))
        else:
            p.energia.suspender_min = int(m.group(2))
        return True
    m = _RE_EXIBICAO.search(comando)
    if m:
        ex = p.exibicao
        ex.sempre = True
        r = re.search(r"-resolucao (\d+x\d+)", m.group(1), re.I)
        t = re.search(r"-telas (duplicar|estender)", m.group(1), re.I)
        ex.resolucao = r.group(1).lower() if r else ""
        ex.telas = t.group(1).lower() if t else "padrao"
        return True
    m = _RE_EDGE.search(comando)
    if m:
        p.apps.edge_pagina_inicial = m.group(1)
        return True
    # as redes (SSID/senha) estao nos XMLs do pacote, nao no sysprep.xml:
    # a tarefa sozinha nao tem o que reconstruir e volta quando houver redes
    if "configurar-wifi.ps1" in comando.lower():
        return True
    return False
