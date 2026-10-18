"""Gera o sysprep.xml (arquivo de resposta) a partir do perfil."""

from __future__ import annotations

import xml.etree.ElementTree as ET
from datetime import datetime

from . import senhas
from .ajustes import caminho_branding, comandos_especializacao, comandos_primeiro_logon
from .modelo import Perfil

NS = "urn:schemas-microsoft-com:unattend"
WCM = "http://schemas.microsoft.com/WMIConfig/2002/State"
XSI = "http://www.w3.org/2001/XMLSchema-instance"

ET.register_namespace("", NS)
ET.register_namespace("wcm", WCM)
ET.register_namespace("xsi", XSI)

LOGO_OEM = "logo_oem.bmp"


def _t(tag: str) -> str:
    return f"{{{NS}}}{tag}"


def _sub(pai: ET.Element, tag: str, texto: str | int | bool | None = None, **attrs) -> ET.Element:
    el = ET.SubElement(pai, _t(tag), attrs)
    if texto is not None:
        el.text = str(texto).lower() if isinstance(texto, bool) else str(texto)
    return el


def _add(pai: ET.Element, tag: str, **attrs) -> ET.Element:
    """Elemento de lista (<X wcm:action="add">)."""
    return ET.SubElement(pai, _t(tag), {f"{{{WCM}}}action": "add", **attrs})


class _Passe:
    def __init__(self, raiz: ET.Element, nome: str, arquitetura: str):
        self.el = _sub(raiz, "settings", **{"pass": nome})
        self.arq = arquitetura

    def componente(self, nome: str) -> ET.Element:
        return _sub(self.el, "component", name=nome, processorArchitecture=self.arq,
                    publicKeyToken="31bf3856ad364e35", language="neutral", versionScope="nonSxS")


def _senha(pai: ET.Element, tag: str, valor: str, sufixo: str) -> None:
    s = _sub(pai, tag)
    _sub(s, "Value", senhas.codificar(valor, sufixo))
    _sub(s, "PlainText", False)


def gerar(p: Perfil, agora: datetime | None = None) -> str:
    agora = agora or datetime.now()
    arq = p.sysprep.arquitetura
    raiz = ET.Element(_t("unattend"))
    raiz.append(ET.Comment(
        f" Perfil: {p.nome} | gerado em {agora:%d/%m/%Y %H:%M} pelo Sysprep Studio. "
        "Nao edite a mao: altere o perfil e gere de novo. "))

    # windowsPE nao roda no fluxo do sysprep; mantido so por compatibilidade
    pe = _Passe(raiz, "windowsPE", arq)
    _sub(_sub(pe.componente("Microsoft-Windows-Setup"), "UserData"), "AcceptEula", True)

    _generalize(raiz, p, arq)
    _specialize(raiz, p, arq)
    _oobe(raiz, p, arq)

    ET.indent(raiz, "    ")
    return '<?xml version="1.0" encoding="utf-8"?>\n' + ET.tostring(raiz, encoding="unicode") + "\n"


def _generalize(raiz: ET.Element, p: Perfil, arq: str) -> None:
    s = p.sysprep
    if not (s.manter_drivers or s.pular_rearm):
        return
    passe = _Passe(raiz, "generalize", arq)
    if s.manter_drivers:
        _sub(passe.componente("Microsoft-Windows-PnpSysprep"), "PersistAllDeviceInstalls", True)
    if s.pular_rearm:
        _sub(passe.componente("Microsoft-Windows-Security-SPP"), "SkipRearm", 1)


def _specialize(raiz: ET.Element, p: Perfil, arq: str) -> None:
    passe = _Passe(raiz, "specialize", arq)
    idt = p.identidade

    shell = passe.componente("Microsoft-Windows-Shell-Setup")
    if p.licenca.modo == "chave" and p.licenca.chave.strip():
        _sub(shell, "ProductKey", p.licenca.chave.strip().upper())
    _sub(shell, "TimeZone", p.regiao.fuso_horario)
    nome = idt.nome_computador.strip() if idt.nome_computador_modo == "fixo" else ""
    _sub(shell, "ComputerName", nome or "*")
    _sub(shell, "CopyProfile", p.personalizacao.copy_profile)
    if idt.proprietario:
        _sub(shell, "RegisteredOwner", idt.proprietario)
    if idt.organizacao:
        _sub(shell, "RegisteredOrganization", idt.organizacao)
    oem = idt.oem
    if oem.ativo:
        info = _sub(shell, "OEMInformation")
        for tag, valor in (("Manufacturer", oem.fabricante), ("Model", oem.modelo),
                           ("SupportHours", oem.horario_suporte), ("SupportPhone", oem.telefone_suporte),
                           ("SupportURL", oem.url_suporte)):
            if valor:
                _sub(info, tag, valor)
        if oem.logo:
            _sub(info, "Logo", caminho_branding(LOGO_OEM))

    ing = p.rede.ingresso
    # com a tela inicial o join e do Tela-Inicial.ps1, ja com o nome escolhido:
    # aqui ele usaria o nome aleatorio (e a senha nem precisa ir no XML)
    if ing.modo == "grupo_trabalho" or (ing.modo == "dominio" and not p.tela_inicial.ativo):
        ident = _sub(passe.componente("Microsoft-Windows-UnattendedJoin"), "Identification")
        if ing.modo == "grupo_trabalho":
            _sub(ident, "JoinWorkgroup", ing.grupo_trabalho)
        else:
            cred = _sub(ident, "Credentials")
            _sub(cred, "Domain", ing.dominio)
            _sub(cred, "Password", ing.senha)
            _sub(cred, "Username", ing.usuario)
            _sub(ident, "JoinDomain", ing.dominio)
            if ing.ou:
                _sub(ident, "MachineObjectOU", ing.ou)

    rede = p.rede
    if rede.rdp_ativo:
        _sub(passe.componente("Microsoft-Windows-TerminalServices-LocalSessionManager"),
             "fDenyTSConnections", False)
        ext = passe.componente("Microsoft-Windows-TerminalServices-RDP-WinStationExtensions")
        ext.append(ET.Comment(" SecurityLayer 2 = TLS | UserAuthentication 1 = NLA obrigatorio "))
        _sub(ext, "SecurityLayer", 2 if rede.rdp_tls else 1)
        _sub(ext, "UserAuthentication", 1 if rede.rdp_nla else 0)

    fw = rede.firewall
    grupos = list(dict.fromkeys((["Remote Desktop"] if rede.rdp_ativo else []) + fw.grupos_liberados))
    if grupos or not (fw.dominio and fw.privado and fw.publico):
        comp = passe.componente("Networking-MPSSVC-Svc")
        if grupos:
            fgs = _sub(comp, "FirewallGroups")
            for g in grupos:
                fg = _add(fgs, "FirewallGroup", **{f"{{{WCM}}}keyValue": "".join(c for c in g if c.isalnum())})
                _sub(fg, "Active", True)
                _sub(fg, "Group", g)
                _sub(fg, "Profile", "all")
        _sub(comp, "DomainProfile_EnableFirewall", fw.dominio)
        _sub(comp, "PrivateProfile_EnableFirewall", fw.privado)
        _sub(comp, "PublicProfile_EnableFirewall", fw.publico)

    cmds = comandos_especializacao(p)
    if cmds:
        rs = _sub(passe.componente("Microsoft-Windows-Deployment"), "RunSynchronous")
        for i, (desc, cmd) in enumerate(cmds, 1):
            c = _add(rs, "RunSynchronousCommand")
            _sub(c, "Order", i)
            _sub(c, "Description", desc[:256])
            _sub(c, "Path", cmd)


def _oobe(raiz: ET.Element, p: Perfil, arq: str) -> None:
    passe = _Passe(raiz, "oobeSystem", arq)
    r = p.regiao
    intl = passe.componente("Microsoft-Windows-International-Core")
    _sub(intl, "InputLocale", r.teclado)
    _sub(intl, "SystemLocale", r.localidade_sistema)
    _sub(intl, "UILanguage", r.idioma_interface)
    _sub(intl, "UserLocale", r.localidade_usuario)

    shell = passe.componente("Microsoft-Windows-Shell-Setup")
    c = p.contas
    al = c.autologon
    usuario, vezes = (al.usuario, al.quantidade) if al.ativo else ("", 0)
    if p.tela_inicial.ativo:
        # a tela precisa de uma sessao: um logon automatico, que ela desliga
        usuario, vezes = p.tela_inicial.conta, 1
    conta_al = next((x for x in c.locais if x.nome == usuario), None)
    if conta_al:
        auto = _sub(shell, "AutoLogon")
        _senha(auto, "Password", conta_al.senha, senhas.SUFIXO_CONTA)
        _sub(auto, "Enabled", True)
        _sub(auto, "LogonCount", max(1, vezes))
        _sub(auto, "Username", conta_al.nome)

    primeiros = comandos_primeiro_logon(p)
    if primeiros:
        flc = _sub(shell, "FirstLogonCommands")
        for i, (desc, cmd) in enumerate(primeiros, 1):
            sc = _add(flc, "SynchronousCommand")
            _sub(sc, "Order", i)
            _sub(sc, "CommandLine", cmd)
            _sub(sc, "Description", desc[:256])

    o = p.oobe
    oo = _sub(shell, "OOBE")
    _sub(oo, "HideEULAPage", o.ocultar_eula)
    _sub(oo, "HideLocalAccountScreen", o.ocultar_conta_local)
    _sub(oo, "HideOEMRegistrationScreen", o.ocultar_registro_oem)
    _sub(oo, "HideOnlineAccountScreens", o.ocultar_contas_online)
    _sub(oo, "HideWirelessSetupInOOBE", o.ocultar_wifi)
    _sub(oo, "NetworkLocation", o.local_rede)
    _sub(oo, "ProtectYourPC", o.proteger_pc)
    if o.pular_oobe_maquina:
        _sub(oo, "SkipMachineOOBE", True)
    if o.pular_oobe_usuario:
        _sub(oo, "SkipUserOOBE", True)

    if c.locais or c.admin_embutido_senha:
        ua = _sub(shell, "UserAccounts")
        if c.admin_embutido_senha:
            _senha(ua, "AdministratorPassword", c.admin_embutido_senha, senhas.SUFIXO_ADMIN)
        if c.locais:
            la = _sub(ua, "LocalAccounts")
            for conta in c.locais:
                el = _add(la, "LocalAccount")
                _sub(el, "Name", conta.nome)
                _sub(el, "DisplayName", conta.nome_exibicao or conta.nome)
                if conta.descricao:
                    _sub(el, "Description", conta.descricao)
                _sub(el, "Group", conta.grupo)
                _senha(el, "Password", conta.senha, senhas.SUFIXO_CONTA)
