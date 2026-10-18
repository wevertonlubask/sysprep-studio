"""Redes Wi-Fi pre-configuradas.

O perfil salvo na maquina de referencia nao sobrevive ao clone: o Windows
guarda cada rede presa ao GUID da placa
(ProgramData\\Microsoft\\Wlansvc\\Profiles\\Interfaces\\{GUID}) e a placa da
maquina clonada tem outro GUID. Por isso o pacote leva um XML de perfil WLAN
por rede e o Configurar-WiFi.ps1 importa com "netsh wlan add profile" sem
interface= (vale para qualquer placa), ja na maquina final.

Quem dispara o script e uma tarefa agendada criada no specialize, como
SYSTEM, a cada inicializacao: funciona antes de qualquer logon, sem depender
de o primeiro usuario ser administrador, e tenta de novo no proximo boot se
o driver da placa ainda nao estiver pronto. Ao concluir, o script apaga os
XMLs (a senha vai em texto puro neles) e a propria tarefa.
"""

from __future__ import annotations

import re
from xml.sax.saxutils import escape

from .ajustes import SCRIPTS
from .modelo import Perfil, RedeWifi

PASTA = rf"{SCRIPTS}\WiFi"
SCRIPT = "Configurar-WiFi.ps1"
TAREFA = r"\SysprepStudio\Configurar Wi-Fi"
LOG = r"C:\Windows\Temp\SysprepStudio-wifi.log"
RE_CHAVE_HEX = re.compile(r"^[0-9A-Fa-f]{64}$")

AUTENTICACAO = {"wpa2": "WPA2PSK", "wpa3": "WPA3SAE", "aberta": "open"}


def arquivo(i: int) -> str:
    """Nome do XML da i-esima rede (1 = maior prioridade). Nao usa o SSID:
    ele aceita qualquer caractere, inclusive os proibidos em nome de arquivo."""
    return f"wifi-{i:02d}.xml"


def redes_validas(p: Perfil) -> list[RedeWifi]:
    return [r for r in p.wifi.redes if r.ssid.strip()]


def perfil_xml(r: RedeWifi) -> str:
    """XML no formato do "netsh wlan export profile key=clear"."""
    ssid = r.ssid.strip()
    nome = escape(ssid)
    if r.seguranca == "aberta":
        chave = ""
        cifra = "none"
    else:
        tipo = "networkKey" if RE_CHAVE_HEX.match(r.senha) else "passPhrase"
        chave = (f"\t\t\t<sharedKey>\n"
                 f"\t\t\t\t<keyType>{tipo}</keyType>\n"
                 f"\t\t\t\t<protected>false</protected>\n"
                 f"\t\t\t\t<keyMaterial>{escape(r.senha)}</keyMaterial>\n"
                 f"\t\t\t</sharedKey>\n")
        cifra = "AES"
    # <hex> e o que o Windows usa para casar a rede: nao depende de como o
    # <name> com acento/emoji e lido
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1">\n'
        f"\t<name>{nome}</name>\n"
        "\t<SSIDConfig>\n"
        "\t\t<SSID>\n"
        f"\t\t\t<hex>{ssid.encode('utf-8').hex().upper()}</hex>\n"
        f"\t\t\t<name>{nome}</name>\n"
        "\t\t</SSID>\n"
        f"\t\t<nonBroadcast>{'true' if r.oculta else 'false'}</nonBroadcast>\n"
        "\t</SSIDConfig>\n"
        "\t<connectionType>ESS</connectionType>\n"
        f"\t<connectionMode>{'auto' if r.conectar_auto else 'manual'}</connectionMode>\n"
        "\t<MSM>\n"
        "\t\t<security>\n"
        "\t\t\t<authEncryption>\n"
        f"\t\t\t\t<authentication>{AUTENTICACAO[r.seguranca]}</authentication>\n"
        f"\t\t\t\t<encryption>{cifra}</encryption>\n"
        "\t\t\t\t<useOneX>false</useOneX>\n"
        "\t\t\t</authEncryption>\n"
        f"{chave}"
        "\t\t</security>\n"
        "\t</MSM>\n"
        "</WLANProfile>\n"
    )


def arquivos(p: Perfil) -> list[tuple[str, str]]:
    """(nome do arquivo, conteudo) de cada rede, na ordem de prioridade."""
    return [(arquivo(i), perfil_xml(r)) for i, r in enumerate(redes_validas(p), 1)]


def comando_tarefa() -> str:
    """Tarefa de inicializacao criada no specialize (roda como SYSTEM)."""
    return (f'schtasks.exe /Create /TN "{TAREFA}" /SC ONSTART /DELAY 0000:30 /RU SYSTEM /RL HIGHEST /F '
            f'/TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File {SCRIPTS}\\{SCRIPT}"')
