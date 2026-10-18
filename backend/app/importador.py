"""Le um unattend.xml existente e devolve um Perfil equivalente.

Principio: nada se perde. Comando que nao corresponde a nenhuma opcao da
interface vira "comando personalizado" no mesmo passe.
"""

from __future__ import annotations

import xml.etree.ElementTree as ET

from . import senhas
from .ajustes import reconhecer
from .modelo import AutoLogon, Comando, Conta, Perfil

NS = "urn:schemas-microsoft-com:unattend"


class XMLInvalido(ValueError):
    pass


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _filho(el: ET.Element | None, *caminho: str) -> ET.Element | None:
    for nome in caminho:
        if el is None:
            return None
        el = next((c for c in el if _local(c.tag) == nome), None)
    return el


def _texto(el: ET.Element | None, *caminho: str, padrao: str = "") -> str:
    alvo = _filho(el, *caminho) if caminho else el
    return (alvo.text or "").strip() if alvo is not None else padrao


def _bool(el: ET.Element | None, *caminho: str, padrao: bool) -> bool:
    t = _texto(el, *caminho)
    return padrao if t == "" else t.lower() == "true"


def _filhos(el: ET.Element | None, nome: str) -> list[ET.Element]:
    return [c for c in el if _local(c.tag) == nome] if el is not None else []


def _senha(el: ET.Element | None, sufixo: str) -> str:
    if el is None:
        return ""
    return senhas.decodificar(_texto(el, "Value"), _bool(el, "PlainText", padrao=True), sufixo)


def importar(conteudo: bytes | str, nome: str = "Importado") -> Perfil:
    try:
        raiz = ET.fromstring(conteudo)
    except ET.ParseError as e:
        raise XMLInvalido(f"XML mal formado: {e}") from e
    if _local(raiz.tag) != "unattend":
        raise XMLInvalido("O arquivo nao e um unattend.xml (raiz diferente de <unattend>).")

    p = Perfil(nome=nome)
    # o que nao esta no XML fica desligado, e nao no padrao do modelo
    p.oobe = p.oobe.model_copy(update={"ocultar_privacidade": False, "dispensar_internet": False,
                                       "sem_animacao_primeiro_logon": False, "sem_scoobe": False,
                                       "pular_oobe_maquina": False, "pular_oobe_usuario": False})
    p.sysprep.restaurar_windows_update = False
    comps: dict[tuple[str, str], ET.Element] = {}
    for s in _filhos(raiz, "settings"):
        for c in _filhos(s, "component"):
            comps[(s.get("pass", ""), c.get("name", ""))] = c
            arq = c.get("processorArchitecture")
            if arq in ("amd64", "arm64"):
                p.sysprep.arquitetura = arq

    _generalize(p, comps)
    _specialize(p, comps)
    _oobe(p, comps)
    return p


def _generalize(p: Perfil, comps: dict) -> None:
    pnp = comps.get(("generalize", "Microsoft-Windows-PnpSysprep"))
    p.sysprep.manter_drivers = _bool(pnp, "PersistAllDeviceInstalls", padrao=False)
    spp = comps.get(("generalize", "Microsoft-Windows-Security-SPP"))
    p.sysprep.pular_rearm = _texto(spp, "SkipRearm") == "1"


def _specialize(p: Perfil, comps: dict) -> None:
    shell = comps.get(("specialize", "Microsoft-Windows-Shell-Setup"))
    chave = _texto(shell, "ProductKey")
    if chave:
        p.licenca.modo, p.licenca.chave = "chave", chave
    if _texto(shell, "TimeZone"):
        p.regiao.fuso_horario = _texto(shell, "TimeZone")
    nome = _texto(shell, "ComputerName")
    if nome and nome != "*":
        p.identidade.nome_computador_modo, p.identidade.nome_computador = "fixo", nome
    p.personalizacao.copy_profile = _bool(shell, "CopyProfile", padrao=False)
    p.identidade.proprietario = _texto(shell, "RegisteredOwner")
    p.identidade.organizacao = _texto(shell, "RegisteredOrganization")
    info = _filho(shell, "OEMInformation")
    if info is not None:
        o = p.identidade.oem
        o.ativo = True
        o.fabricante = _texto(info, "Manufacturer")
        o.modelo = _texto(info, "Model")
        o.horario_suporte = _texto(info, "SupportHours")
        o.telefone_suporte = _texto(info, "SupportPhone")
        o.url_suporte = _texto(info, "SupportURL")

    join = _filho(comps.get(("specialize", "Microsoft-Windows-UnattendedJoin")), "Identification")
    if join is not None:
        ing = p.rede.ingresso
        if _texto(join, "JoinDomain"):
            ing.modo = "dominio"
            ing.dominio = _texto(join, "JoinDomain")
            ing.usuario = _texto(join, "Credentials", "Username")
            ing.senha = _texto(join, "Credentials", "Password")
            ing.ou = _texto(join, "MachineObjectOU")
        elif _texto(join, "JoinWorkgroup"):
            ing.modo, ing.grupo_trabalho = "grupo_trabalho", _texto(join, "JoinWorkgroup")

    ts = comps.get(("specialize", "Microsoft-Windows-TerminalServices-LocalSessionManager"))
    p.rede.rdp_ativo = _texto(ts, "fDenyTSConnections").lower() == "false"
    ext = comps.get(("specialize", "Microsoft-Windows-TerminalServices-RDP-WinStationExtensions"))
    if ext is not None:
        p.rede.rdp_tls = _texto(ext, "SecurityLayer") == "2"
        p.rede.rdp_nla = _texto(ext, "UserAuthentication") == "1"

    fw = comps.get(("specialize", "Networking-MPSSVC-Svc"))
    if fw is not None:
        p.rede.firewall.dominio = _bool(fw, "DomainProfile_EnableFirewall", padrao=True)
        p.rede.firewall.privado = _bool(fw, "PrivateProfile_EnableFirewall", padrao=True)
        p.rede.firewall.publico = _bool(fw, "PublicProfile_EnableFirewall", padrao=True)
        for g in _filhos(_filho(fw, "FirewallGroups"), "FirewallGroup"):
            grupo = _texto(g, "Group")
            # RDP ja e liberado automaticamente pela opcao de acesso remoto
            if grupo and _bool(g, "Active", padrao=True) and not (grupo == "Remote Desktop" and p.rede.rdp_ativo):
                p.rede.firewall.grupos_liberados.append(grupo)

    dep = comps.get(("specialize", "Microsoft-Windows-Deployment"))
    cmds = sorted(_filhos(_filho(dep, "RunSynchronous"), "RunSynchronousCommand"),
                  key=lambda c: int(_texto(c, "Order") or 0))
    for c in cmds:
        cmd = _texto(c, "Path")
        if cmd and not reconhecer(p, cmd):
            p.comandos.especializacao.append(Comando(descricao=_texto(c, "Description"), comando=cmd))


def _oobe(p: Perfil, comps: dict) -> None:
    intl = comps.get(("oobeSystem", "Microsoft-Windows-International-Core"))
    if intl is not None:
        r = p.regiao
        r.teclado = _texto(intl, "InputLocale") or r.teclado
        r.localidade_sistema = _texto(intl, "SystemLocale") or r.localidade_sistema
        r.idioma_interface = _texto(intl, "UILanguage") or r.idioma_interface
        r.localidade_usuario = _texto(intl, "UserLocale") or r.localidade_usuario

    shell = comps.get(("oobeSystem", "Microsoft-Windows-Shell-Setup"))
    if shell is None:
        return
    oo = _filho(shell, "OOBE")
    if oo is not None:
        o = p.oobe
        o.ocultar_eula = _bool(oo, "HideEULAPage", padrao=False)
        o.ocultar_conta_local = _bool(oo, "HideLocalAccountScreen", padrao=False)
        o.ocultar_registro_oem = _bool(oo, "HideOEMRegistrationScreen", padrao=False)
        o.ocultar_contas_online = _bool(oo, "HideOnlineAccountScreens", padrao=False)
        o.ocultar_wifi = _bool(oo, "HideWirelessSetupInOOBE", padrao=False)
        o.pular_oobe_maquina = _bool(oo, "SkipMachineOOBE", padrao=False)
        o.pular_oobe_usuario = _bool(oo, "SkipUserOOBE", padrao=False)
        if _texto(oo, "NetworkLocation") in ("Work", "Home", "Other"):
            o.local_rede = _texto(oo, "NetworkLocation")
        if _texto(oo, "ProtectYourPC") in ("1", "2", "3"):
            o.proteger_pc = int(_texto(oo, "ProtectYourPC"))

    ua = _filho(shell, "UserAccounts")
    p.contas.admin_embutido_senha = _senha(_filho(ua, "AdministratorPassword"), senhas.SUFIXO_ADMIN)
    for la in _filhos(_filho(ua, "LocalAccounts"), "LocalAccount"):
        p.contas.locais.append(Conta(
            nome=_texto(la, "Name"),
            nome_exibicao=_texto(la, "DisplayName"),
            descricao=_texto(la, "Description"),
            grupo=_texto(la, "Group") or "Users",
            senha=_senha(_filho(la, "Password"), senhas.SUFIXO_CONTA),
        ))

    auto = _filho(shell, "AutoLogon")
    if auto is not None and _bool(auto, "Enabled", padrao=False):
        p.contas.autologon.ativo = True
        p.contas.autologon.usuario = _texto(auto, "Username")
        p.contas.autologon.quantidade = int(_texto(auto, "LogonCount") or 1)

    for sc in sorted(_filhos(_filho(shell, "FirstLogonCommands"), "SynchronousCommand"),
                     key=lambda c: int(_texto(c, "Order") or 0)):
        cmd = _texto(sc, "CommandLine")
        if "Enable-LocalUser" in cmd and "-500" in cmd:
            p.contas.admin_embutido_ativo = True
        elif "Enable-PSRemoting" in cmd:
            p.rede.winrm_ativo = True
        elif "slmgr.vbs" in cmd and ("/ipk" in cmd or "/ato" in cmd):
            p.licenca.reforcar_no_primeiro_logon = True
        elif "tela-inicial.ps1" in cmd.lower():
            # unidades e locais estao no config.json do pacote, nao no XML;
            # o logon automatico unico e o da propria tela
            t = p.tela_inicial
            t.ativo, t.conta = True, p.contas.autologon.usuario
            p.contas.autologon = AutoLogon()
        elif cmd:
            p.comandos.primeiro_logon.append(Comando(descricao=_texto(sc, "Description"), comando=cmd))
