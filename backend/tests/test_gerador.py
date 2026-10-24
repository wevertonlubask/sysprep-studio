import io
import json
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

import pytest

from app import gerador_xml, importador, pacote, senhas
from app.ajustes import AJUSTES_MAQUINA, ajustes_usuario, comandos_especializacao
from app.modelo import Comando, Conta, Perfil
from app.validacao import validar

FIXTURE = Path(__file__).parent / "fixtures" / "legado_sanitizado.xml"
NS = {"u": "urn:schemas-microsoft-com:unattend"}


@pytest.fixture
def legado() -> Perfil:
    return importador.importar(FIXTURE.read_bytes(), "Legado")


def _perfil_valido() -> Perfil:
    p = Perfil(nome="T")
    p.contas.locais.append(Conta(nome="Suporte", nome_exibicao="Suporte", grupo="Administrators", senha="x1"))
    return p


# ------------------------------------------------------------------ senhas

def test_senha_usa_sufixo_password():
    # "a" + "Password" em UTF-16LE: o Setup remove os ultimos 8 caracteres
    assert senhas.codificar("a") == "YQBQAGEAcwBzAHcAbwByAGQA"
    assert senhas.decodificar("YQBQAGEAcwBzAHcAbwByAGQA", False) == "a"


def test_senha_admin_usa_sufixo_proprio():
    cod = senhas.codificar("Xy1!", senhas.SUFIXO_ADMIN)
    assert senhas.decodificar(cod, False, senhas.SUFIXO_ADMIN) == "Xy1!"
    assert senhas.decodificar(cod, False) != "Xy1!"


def test_senha_texto_puro_e_base64_invalido():
    assert senhas.decodificar("abc", True) == "abc"
    assert senhas.decodificar("###", False) == ""


# ------------------------------------------------------------------ importacao do legado

def test_importa_legado_completo(legado: Perfil):
    assert [c.nome for c in legado.contas.locais] == ["Suporte", "Usuario01"]
    assert [c.senha for c in legado.contas.locais] == ["SenhaSuporte#1", "SenhaUsuario#2"]
    assert all(c.grupo == "Administrators" for c in legado.contas.locais)
    assert legado.contas.locais[1].nome_exibicao == "Usuario 01"
    assert legado.licenca.modo == "chave"
    assert legado.licenca.chave == "AAAAA-BBBBB-CCCCC-DDDDD-EEEEE"
    assert legado.personalizacao.copy_profile is True
    assert legado.personalizacao.papel_parede_modo == "fixo"
    assert legado.personalizacao.papel_parede == "plano_de_fundo.jpg"
    assert legado.personalizacao.tela_bloqueio_modo == "fixo"
    assert legado.personalizacao.tela_bloqueio == "tela_bloqueio.jpg"
    assert legado.personalizacao.desativar_spotlight
    assert legado.personalizacao.login_sem_desfoque
    assert legado.privacidade.desativar_apps_sugeridos
    assert legado.rede.rdp_ativo and legado.rede.rdp_nla and legado.rede.rdp_tls
    assert legado.rede.firewall.grupos_liberados == []
    assert legado.oobe.pular_oobe_maquina and legado.oobe.ocultar_privacidade and legado.oobe.sem_scoobe
    assert legado.regiao.fuso_horario == "E. South America Standard Time"
    assert legado.identidade.proprietario == "Empresa Exemplo"


def test_legado_nao_deixa_comando_orfao(legado: Perfil):
    # todos os 16 comandos do legado correspondem a opcoes da interface
    assert legado.comandos.especializacao == []


def test_ida_e_volta_preserva_perfil(legado: Perfil):
    de_novo = importador.importar(gerador_xml.gerar(legado), "Legado")
    assert de_novo.model_dump() == legado.model_dump()


def test_ida_e_volta_preserva_todos_os_ajustes():
    p = _perfil_valido()
    for a in AJUSTES_MAQUINA:
        a.marcar(p)
    p.energia.plano = "alto_desempenho"  # "equilibrado" e excludente
    p.privacidade.telemetria = "desligada"
    p.energia.desligar_tela_min = 0
    p.energia.suspender_min = 30
    p.apps.edge_pagina_inicial = "https://intranet.exemplo.com.br"
    p.comandos.especializacao.append(Comando(descricao="x", comando="cmd.exe /c echo oi"))
    p.comandos.primeiro_logon.append(Comando(descricao="y", comando="cmd.exe /c echo tchau"))
    p.contas.admin_embutido_ativo = True
    p.contas.admin_embutido_senha = "Adm!"
    p.rede.winrm_ativo = True
    p.rede.ingresso.modo = "dominio"
    p.rede.ingresso.dominio, p.rede.ingresso.usuario, p.rede.ingresso.senha = "exemplo.com.br", "joiner", "s"
    p.sysprep.manter_drivers = p.sysprep.pular_rearm = True
    p.identidade.oem.ativo = True
    p.identidade.oem.fabricante = "Empresa Exemplo"
    de_novo = importador.importar(gerador_xml.gerar(p), "T")
    assert de_novo.model_dump() == p.model_dump()


def test_xml_invalido():
    with pytest.raises(importador.XMLInvalido):
        importador.importar(b"<nao-e-unattend/>")
    with pytest.raises(importador.XMLInvalido):
        importador.importar(b"<quebrado")


def test_comando_desconhecido_vira_personalizado():
    xml = gerador_xml.gerar(_perfil_valido()).replace(
        "</settings>\n    <settings pass=\"oobeSystem\">",
        "<component name=\"Microsoft-Windows-Deployment\"><RunSynchronous><RunSynchronousCommand>"
        "<Order>1</Order><Description>meu</Description><Path>calc.exe</Path>"
        "</RunSynchronousCommand></RunSynchronous></component></settings>\n    <settings pass=\"oobeSystem\">")
    p = importador.importar(xml)
    assert p.comandos.especializacao == [Comando(descricao="meu", comando="calc.exe")]


# ------------------------------------------------------------------ geracao

def test_papel_de_parede_padrao_nao_gera_personalizacao():
    xml = gerador_xml.gerar(_perfil_valido())
    assert "PersonalizationCSP" not in xml
    assert "Spotlight" not in xml
    assert "NoChangingLockScreen" not in xml


def test_tela_bloqueio_fixa_forca_spotlight_desligado():
    p = _perfil_valido()
    p.personalizacao.tela_bloqueio_modo = "fixo"
    p.personalizacao.tela_bloqueio = "tela_bloqueio.jpg"
    xml = gerador_xml.gerar(p)
    assert r"C:\Windows\Web\Branding\tela_bloqueio.jpg" in xml
    assert "DisableWindowsSpotlightFeatures" in xml
    assert "NoChangingLockScreen" in xml


def test_estrutura_do_xml():
    p = _perfil_valido()
    p.licenca.modo, p.licenca.chave = "chave", "aaaaa-bbbbb-ccccc-ddddd-eeeee"
    raiz = ET.fromstring(gerador_xml.gerar(p))
    passes = [s.get("pass") for s in raiz.findall("u:settings", NS)]
    assert passes == ["windowsPE", "specialize", "oobeSystem"]
    assert raiz.find(".//u:ProductKey", NS).text == "AAAAA-BBBBB-CCCCC-DDDDD-EEEEE"
    conta = raiz.find(".//u:LocalAccount", NS)
    assert conta.get("{http://schemas.microsoft.com/WMIConfig/2002/State}action") == "add"
    assert conta.find("u:Password/u:PlainText", NS).text == "false"
    ordens = [int(o.text) for o in raiz.findall(".//u:RunSynchronousCommand/u:Order", NS)]
    assert ordens == list(range(1, len(ordens) + 1))


def test_licenca_oem_omite_chave():
    assert "ProductKey" not in gerador_xml.gerar(_perfil_valido())


def test_rdp_desligado_nao_libera_firewall():
    xml = gerador_xml.gerar(_perfil_valido())
    assert "fDenyTSConnections" not in xml and "Remote Desktop" not in xml


def test_comandos_sem_duplicata():
    p = _perfil_valido()
    p.personalizacao.desativar_spotlight = True
    p.personalizacao.tela_bloqueio_modo = "fixo"
    p.personalizacao.tela_bloqueio = "t.jpg"
    cmds = [c for _, c in comandos_especializacao(p)]
    assert len(cmds) == len(set(cmds))


def test_autologon_usa_senha_da_conta():
    p = _perfil_valido()
    p.contas.autologon.ativo, p.contas.autologon.usuario = True, "Suporte"
    raiz = ET.fromstring(gerador_xml.gerar(p))
    valor = raiz.find(".//u:AutoLogon/u:Password/u:Value", NS).text
    assert senhas.decodificar(valor, False) == "x1"


# ------------------------------------------------------------------ usuario / manifesto

def test_ajustes_usuario():
    p = _perfil_valido()
    assert ajustes_usuario(p) == [{"chave": r"Software\Microsoft\Windows\CurrentVersion\UserProfileEngagement",
                                   "nome": "ScoobeSystemSettingEnabled", "tipo": "DWord", "valor": 0}]
    p.personalizacao.tema = "escuro"
    p.personalizacao.barra_alinhamento = "esquerda"
    p.apps.remover_onedrive = True
    nomes = {a["nome"] for a in ajustes_usuario(p)}
    assert {"AppsUseLightTheme", "SystemUsesLightTheme", "TaskbarAl", "OneDriveSetup"} <= nomes


def test_tema_e_busca_reaplicados_no_primeiro_logon():
    p = _perfil_valido()
    p.personalizacao.tema = "escuro"
    p.personalizacao.busca_barra = "oculta"
    runonce = {a["nome"]: a["valor"] for a in ajustes_usuario(p)}["AplicarVisual"]
    assert runonce.endswith(r'Aplicar-Visual.ps1" -Tema escuro -Busca 0')
    assert r"Themes\dark.theme" in gerador_xml.gerar(p)
    from datetime import datetime
    m = pacote.manifesto(p, datetime.now())
    assert [a["origem"] for a in m["arquivos"]] == ["arquivos/Aplicar-Visual.ps1"]


def test_exibicao_fixa_em_todo_logon():
    from datetime import datetime
    p = _perfil_valido()
    p.exibicao.resolucao = "1920x1080"
    p.exibicao.telas = "duplicar"
    p.exibicao.escala = 100
    p.exibicao.tamanho_texto = 125
    xml = gerador_xml.gerar(p)
    assert r"CurrentVersion\Run" in xml and "-Resolucao 1920x1080 -Telas duplicar" in xml
    usr = {a["nome"]: a["valor"] for a in ajustes_usuario(p)}
    assert usr["LogPixels"] == 96 and usr["Win8DpiScaling"] == 1 and usr["TextScaleFactor"] == 125
    assert "AjustarExibicao" not in usr
    m = pacote.manifesto(p, datetime.now())
    assert [a["origem"] for a in m["arquivos"]] == ["arquivos/Ajustar-Exibicao.ps1"]
    assert not [a for a in validar(p) if a["nivel"] == "erro"]

    # importar o XML gerado devolve a mesma exibicao
    volta = importador.importar(xml.encode("utf-8"), "X")
    assert (volta.exibicao.resolucao, volta.exibicao.telas, volta.exibicao.sempre) == ("1920x1080", "duplicar", True)
    assert not volta.comandos.especializacao


def test_exibicao_so_no_primeiro_logon():
    p = _perfil_valido()
    p.exibicao.resolucao = "1366x768"
    p.exibicao.sempre = False
    assert "AjustarExibicao" not in gerador_xml.gerar(p)
    usr = {a["nome"]: a["valor"] for a in ajustes_usuario(p)}
    assert usr["AjustarExibicao"].endswith(r"Scripts\Ajustar-Exibicao.ps1 -Resolucao 1366x768")


def test_exibicao_resolucao_invalida():
    p = _perfil_valido()
    p.exibicao.resolucao = "1920 por 1080"
    assert any("Resolução" in e for e in _erros(p))


def test_papel_parede_inicial_usa_runonce_e_script():
    p = _perfil_valido()
    p.personalizacao.papel_parede_modo = "inicial"
    p.personalizacao.papel_parede = "papel_parede.jpg"
    assert "PersonalizationCSP" not in gerador_xml.gerar(p)
    nomes = {a["nome"] for a in ajustes_usuario(p)}
    assert {"Wallpaper", "DefinirPapelParede"} <= nomes
    from datetime import datetime
    m = pacote.manifesto(p, datetime.now())
    assert [a["tipo"] for a in m["arquivos"]] == ["fundo", "script"]


def test_zip(tmp_path):
    p = _perfil_valido()
    p.nome = "Estação 07"
    p.personalizacao.papel_parede_modo = "fixo"
    p.personalizacao.papel_parede = "papel_parede.jpg"
    (tmp_path / "papel_parede.jpg").write_bytes(b"jpg")
    nome, dados = pacote.gerar_zip(p, tmp_path)
    assert nome == "Imagem-Estacao-07.zip"
    z = zipfile.ZipFile(io.BytesIO(dados))
    raiz = "Imagem-Estacao-07/"
    assert set(z.namelist()) == {raiz + x for x in (
        "sysprep.xml", "pacote.json", "Preparar-Imagem.cmd", "Preparar-Imagem.ps1",
        "LEIA-ME.txt", "arquivos/papel_parede.jpg")}
    assert b"\r\n" in z.read(raiz + "Preparar-Imagem.cmd")
    m = json.loads(z.read(raiz + "pacote.json"))
    assert m["arquivos"][0]["destino"] == r"C:\Windows\Web\Branding\papel_parede.jpg"
    leia = z.read(raiz + "LEIA-ME.txt").decode("utf-8-sig")
    assert "x1" not in leia  # senha nunca no LEIA-ME
    assert "FIXO papel_parede.jpg" in leia


# ------------------------------------------------------------------ validacao

def _erros(p, imagens=None):
    return [a["mensagem"] for a in validar(p, imagens) if a["nivel"] == "erro"]


def test_valido_sem_erros():
    assert _erros(_perfil_valido()) == []


def test_sem_admin_e_erro():
    p = _perfil_valido()
    p.contas.locais[0].grupo = "Users"
    assert any("Administrators" in e for e in _erros(p))


def test_conta_nome_invalido_e_repetido():
    p = _perfil_valido()
    p.contas.locais += [Conta(nome="a/b", grupo="Users"), Conta(nome="suporte", grupo="Users"),
                        Conta(nome="Administrador", grupo="Users")]
    erros = " ".join(_erros(p))
    assert "proibido" in erros and "repetido" in erros and "reservado" in erros


def test_imagem_obrigatoria_quando_personalizado():
    p = _perfil_valido()
    p.personalizacao.papel_parede_modo = "fixo"
    p.personalizacao.papel_parede = "papel_parede.jpg"
    assert _erros(p)
    assert _erros(p, {"papel_parede.jpg"}) == []


def test_chave_e_nome_computador():
    p = _perfil_valido()
    p.licenca.modo, p.licenca.chave = "chave", "123"
    p.identidade.nome_computador_modo, p.identidade.nome_computador = "fixo", "NOME_MUITO_GRANDE_DEMAIS"
    assert len(_erros(p)) == 2


def test_mode_vm_exige_oobe():
    p = _perfil_valido()
    p.sysprep.modo_vm, p.sysprep.entrar_em = True, "audit"
    assert any("mode:vm" in e for e in _erros(p))


def test_recursos_com_reinicio_detectados():
    # a deteccao le a nota do catalogo: se o texto mudar, o aviso some em silencio
    from app.validacao import REINICIO
    assert {"Microsoft-Hyper-V-All", "Microsoft-Windows-Subsystem-Linux"} <= REINICIO


def test_chave_reforcada_no_primeiro_logon_com_log():
    p = _perfil_valido()
    p.licenca.modo, p.licenca.chave = "chave", "nppr9-fwdcx-d2c8j-h872k-2yt43"
    raiz = ET.fromstring(gerador_xml.gerar(p))
    assert raiz.find(".//u:ProductKey", NS).text == "NPPR9-FWDCX-D2C8J-H872K-2YT43"
    linhas = [c.text for c in raiz.findall(".//u:FirstLogonCommands/u:SynchronousCommand/u:CommandLine", NS)]
    assert "/ipk NPPR9-FWDCX-D2C8J-H872K-2YT43" in linhas[0] and "/ato" in linhas[1]
    assert all("SysprepStudio-ativacao.log" in x for x in linhas[:2])
    # reimportar nao duplica os comandos em "Comandos personalizados"
    volta = importador.importar(gerador_xml.gerar(p).encode(), "X")
    assert volta.licenca.reforcar_no_primeiro_logon and not volta.comandos.primeiro_logon

    p.licenca.reforcar_no_primeiro_logon = False
    assert "slmgr" not in gerador_xml.gerar(p)
    p.licenca.modo = "oem"
    p.licenca.reforcar_no_primeiro_logon = True
    assert "slmgr" not in gerador_xml.gerar(p)


def test_tela_bloqueio_tambem_na_tela_de_login():
    p = _perfil_valido()
    p.personalizacao.tela_bloqueio_modo, p.personalizacao.tela_bloqueio = "fixo", "tela_bloqueio.png"
    cmds = [c for _, c in comandos_especializacao(p)]
    assert any("DisableLogonBackgroundImage /t REG_DWORD /d 0" in c for c in cmds)
    avisos = [a["mensagem"] for a in validar(p, {"tela_bloqueio.png"}) if a["nivel"] == "aviso"]
    assert any("papel de parede" in a for a in avisos)

    p.personalizacao.imagem_na_tela_login = False
    assert not any("DisableLogonBackgroundImage" in c for _, c in comandos_especializacao(p))


def test_mesma_imagem_no_papel_de_parede_e_na_tela_de_bloqueio():
    from datetime import datetime
    p = _perfil_valido()
    pz = p.personalizacao
    pz.tela_bloqueio_modo = pz.papel_parede_modo = "fixo"
    pz.tela_bloqueio = pz.papel_parede = "tela_bloqueio.png"
    m = pacote.manifesto(p, datetime.now())
    assert [a["origem"] for a in m["arquivos"]] == ["arquivos/tela_bloqueio.png"]
    assert not [a for a in validar(p, {"tela_bloqueio.png"}) if a["nivel"] == "erro"]


def test_wsl_puxa_plataforma_de_vm_e_instala_pacote():
    from datetime import datetime
    p = _perfil_valido()
    p.apps.recursos_ativar = ["Microsoft-Windows-Subsystem-Linux"]
    m = pacote.manifesto(p, datetime.now())
    assert m["instalar_wsl"] and "VirtualMachinePlatform" in m["recursos_ativar"]
    assert p.apps.recursos_ativar == ["Microsoft-Windows-Subsystem-Linux"]  # perfil intacto

    p.apps.recursos_ativar = ["NetFx3"]
    m = pacote.manifesto(p, datetime.now())
    assert not m["instalar_wsl"] and m["recursos_ativar"] == ["NetFx3"]


# ------------------------------------------------------------------ variaveis

def test_variaveis_no_manifesto_e_leia_me():
    from datetime import datetime
    from app.modelo import Variavel
    p = _perfil_valido()
    p.variaveis = [Variavel(nome="ANDROID_HOME", valor=r"C:\Android\Sdk"),
                   Variavel(nome="Path", valor=r"%ANDROID_HOME%\platform-tools", acrescentar=True),
                   Variavel(nome="GRADLE_USER_HOME", valor=r"D:\gradle", escopo="usuario"),
                   Variavel(nome="", valor="")]  # linha em branco: fica de fora
    m = pacote.manifesto(p, datetime.now())
    assert m["variaveis"] == [
        {"nome": "ANDROID_HOME", "valor": r"C:\Android\Sdk", "escopo": "maquina", "acrescentar": False},
        {"nome": "Path", "valor": r"%ANDROID_HOME%\platform-tools", "escopo": "maquina", "acrescentar": True},
        {"nome": "GRADLE_USER_HOME", "valor": r"D:\gradle", "escopo": "usuario", "acrescentar": False},
    ]
    assert r"Path += %ANDROID_HOME%\platform-tools" in pacote.leia_me(p, m)
    # nada vai para o XML: o script grava em auditoria e o generalize preserva
    assert "ANDROID_HOME" not in gerador_xml.gerar(p)


def test_variaveis_validacao():
    from app.modelo import Variavel
    p = _perfil_valido()
    p.variaveis = [Variavel(nome="ANDROID_HOME", valor=r"C:\Android\Sdk"),
                   Variavel(nome="Path", valor=r"%ANDROID_HOME%\platform-tools", acrescentar=True)]
    assert not [a for a in validar(p) if a["nivel"] == "erro"]

    p.variaveis = [Variavel(nome="Path", valor=r"C:\x"),                # substituiria o Path
                   Variavel(nome="MEU VAR", valor="1"),                 # espaco
                   Variavel(nome="A", valor=""),                        # sem valor
                   Variavel(nome="B", valor="1"), Variavel(nome="b", valor="2")]  # repetida
    erros = [a["mensagem"] for a in validar(p) if a["nivel"] == "erro" and a["secao"] == "variaveis"]
    assert len(erros) == 4
    assert any("Path" in e for e in erros) and any("repete" in e for e in erros)

    p.variaveis = [Variavel(nome="b", valor="1", escopo="usuario"), Variavel(nome="b", valor="2")]
    assert not [a for a in validar(p) if a["nivel"] == "erro"]  # escopos diferentes


# ------------------------------------------------------------------ wifi

def _com_wifi() -> Perfil:
    from app.modelo import RedeWifi
    p = _perfil_valido()
    p.wifi.redes = [RedeWifi(ssid="Lab & Cia", senha="segredo<123>"),
                    RedeWifi(ssid="Visitantes", seguranca="aberta", conectar_auto=False),
                    RedeWifi(ssid="Oculta", seguranca="wpa3", senha="x" * 8, oculta=True)]
    return p


def test_wifi_perfil_xml():
    from app import wifi
    p = _com_wifi()
    (n1, x1), (n2, x2), (n3, x3) = wifi.arquivos(p)
    assert (n1, n2, n3) == ("wifi-01.xml", "wifi-02.xml", "wifi-03.xml")
    ns = {"w": "http://www.microsoft.com/networking/WLAN/profile/v1"}
    r1 = ET.fromstring(x1.encode())
    assert r1.findtext("w:name", namespaces=ns) == "Lab & Cia"
    assert r1.findtext(".//w:hex", namespaces=ns) == "Lab & Cia".encode().hex().upper()
    assert r1.findtext(".//w:authentication", namespaces=ns) == "WPA2PSK"
    assert r1.findtext(".//w:keyMaterial", namespaces=ns) == "segredo<123>"
    assert r1.findtext(".//w:keyType", namespaces=ns) == "passPhrase"
    r2 = ET.fromstring(x2.encode())
    assert r2.findtext(".//w:authentication", namespaces=ns) == "open"
    assert r2.find(".//w:sharedKey", ns) is None
    assert r2.findtext("w:connectionMode", namespaces=ns) == "manual"
    r3 = ET.fromstring(x3.encode())
    assert r3.findtext(".//w:authentication", namespaces=ns) == "WPA3SAE"
    assert r3.findtext(".//w:nonBroadcast", namespaces=ns) == "true"


def test_wifi_tarefa_no_specialize_e_zip(tmp_path):
    p = _com_wifi()
    cmds = [c for _, c in comandos_especializacao(p) if "Configurar-WiFi.ps1" in c]
    assert len(cmds) == 1 and "/RU SYSTEM" in cmds[0] and "/SC ONSTART" in cmds[0]
    # importar o XML gerado nao transforma a tarefa em comando personalizado
    volta = importador.importar(gerador_xml.gerar(p))
    assert not any("Configurar-WiFi" in c.comando for c in volta.comandos.especializacao)

    _, dados = pacote.gerar_zip(p, tmp_path)
    z = zipfile.ZipFile(io.BytesIO(dados))
    raiz = "Imagem-T/"
    nomes = set(z.namelist())
    assert {raiz + "arquivos/Configurar-WiFi.ps1", raiz + "arquivos/wifi/wifi-01.xml",
            raiz + "arquivos/wifi/wifi-03.xml"} <= nomes
    assert "segredo&lt;123&gt;" in z.read(raiz + "arquivos/wifi/wifi-01.xml").decode()
    m = json.loads(z.read(raiz + "pacote.json"))
    destinos = {a["destino"] for a in m["arquivos"] if a["tipo"] == "wifi"}
    assert r"C:\Windows\Setup\Scripts\WiFi\wifi-02.xml" in destinos
    assert "segredo" not in json.dumps(m)  # senha so nos XMLs da rede
    leia = z.read(raiz + "LEIA-ME.txt").decode("utf-8-sig")
    assert "1. Lab & Cia (WPA2-Pessoal)" in leia and "segredo" not in leia


def test_sem_wifi_sem_tarefa():
    from datetime import datetime
    p = _perfil_valido()
    assert not any("WiFi" in c for _, c in comandos_especializacao(p))
    assert not any(a["tipo"] == "wifi" for a in pacote.manifesto(p, datetime.now())["arquivos"])


def test_wifi_validacao():
    from app.modelo import RedeWifi
    p = _perfil_valido()
    assert not _erros(p)
    p.wifi.redes = [RedeWifi(ssid="", senha="12345678"),
                    RedeWifi(ssid="A", senha="curta"),
                    RedeWifi(ssid="B" * 33, senha="12345678"),
                    RedeWifi(ssid="C", senha="12345678"), RedeWifi(ssid="C", senha="12345678"),
                    RedeWifi(ssid="D", senha="ab" * 32),  # chave hex de 64
                    RedeWifi(ssid="E", seguranca="aberta")]
    e = " | ".join(_erros(p))
    assert "Rede 1" in e and "SSID" in e
    assert "Rede 2 (A)" in e and "8 a 63" in e
    assert "32 bytes" in e
    assert "Rede 4 (C): rede repetida" in e
    assert "(D)" not in e and "(E)" not in e


# ------------------------------------------------------------------ tela inicial

def _com_tela(dominio: bool = True) -> Perfil:
    from app.modelo import LocalTela, UnidadeTela
    p = _perfil_valido()
    if dominio:
        p.rede.ingresso.modo = "dominio"
        p.rede.ingresso.dominio, p.rede.ingresso.usuario, p.rede.ingresso.senha = "exemplo.local", "joiner", "S3nh@"
        p.rede.ingresso.ou = "OU=Computadores,DC=exemplo,DC=local"
    t = p.tela_inicial
    t.ativo, t.conta = True, "Suporte"
    t.padrao_nome, t.rotulo_local = "EMP{unidade}LAB{local}PC{pc}", "Laboratório"
    t.unidades = [UnidadeTela(codigo="101", nome="Matriz", ou="OU=101,DC=exemplo,DC=local", locais=[
        LocalTela(codigo="1", nome="Sala 1", ou="OU=LAB1,OU=101,DC=exemplo,DC=local"),
        LocalTela(codigo="2", nome="Sala 2"),
    ])]
    return p


def test_tela_montar_nome():
    from app.tela_inicial import montar_nome
    assert montar_nome("EMP{unidade}LAB{local}PC{pc}", "101", "1", 2, 2) == "EMP101LAB1PC02"
    assert montar_nome("emp{unidade}-{pc}", "101", "", 7, 3) == "EMP101-007"


def test_tela_tira_join_do_xml_e_faz_logon_automatico_unico():
    p = _com_tela()
    raiz = ET.fromstring(gerador_xml.gerar(p))
    assert raiz.find(".//u:component[@name='Microsoft-Windows-UnattendedJoin']", NS) is None
    assert "S3nh@" not in gerador_xml.gerar(p)  # a senha do dominio nao vai no XML
    assert raiz.findtext(".//u:AutoLogon/u:Username", namespaces=NS) == "Suporte"
    assert raiz.findtext(".//u:AutoLogon/u:LogonCount", namespaces=NS) == "1"
    cmds = raiz.findall(".//u:FirstLogonCommands/u:SynchronousCommand", NS)
    assert "Tela-Inicial.ps1" in cmds[-1].findtext("u:CommandLine", namespaces=NS)  # por ultimo: reinicia
    assert any("EnableFirstLogonAnimation" in c for _, c in comandos_especializacao(p))


def test_tela_sem_dominio_mantem_grupo_de_trabalho():
    p = _com_tela(dominio=False)
    p.rede.ingresso.modo = "grupo_trabalho"
    p.rede.ingresso.grupo_trabalho = "LABS"
    xml = gerador_xml.gerar(p)
    assert "<JoinWorkgroup>LABS</JoinWorkgroup>" in xml
    from app import tela_inicial
    cfg = tela_inicial.config(p)
    assert cfg["dominio"] == "" and cfg["senha"] == "" and cfg["unidades"][0]["locais"][0]["ou"] == ""


def test_tela_config_e_zip(tmp_path):
    from app import tela_inicial
    p = _com_tela()
    cfg = tela_inicial.config(p)
    ous = [l["ou"] for l in cfg["unidades"][0]["locais"]]
    assert ous == ["OU=LAB1,OU=101,DC=exemplo,DC=local", "OU=101,DC=exemplo,DC=local"]  # local > unidade > Rede

    _, dados = pacote.gerar_zip(p, tmp_path)
    z = zipfile.ZipFile(io.BytesIO(dados))
    raiz = "Imagem-T/"
    script = z.read(raiz + "arquivos/Tela-Inicial.ps1")
    assert script.startswith(b"\xef\xbb\xbf")  # PS 5.1 le os acentos da tela
    no_zip = json.loads(z.read(raiz + "arquivos/tela-inicial/config.json"))
    assert no_zip["senha"] == "S3nh@" and no_zip["usuario"] == "joiner"
    m = json.loads(z.read(raiz + "pacote.json"))
    restritos = [a["destino"] for a in m["arquivos"] if a["tipo"] == "restrito"]
    assert restritos == [r"C:\Windows\Setup\Scripts\TelaInicial\config.json"]
    assert "S3nh@" not in json.dumps(m)
    leia = z.read(raiz + "LEIA-ME.txt").decode("utf-8-sig")
    assert "EMP101LAB1PC01" in leia and "S3nh@" not in leia


def test_tela_validacao_ok():
    assert not _erros(_com_tela())


def test_tela_validacao_erros():
    from app.modelo import LocalTela, UnidadeTela
    p = _com_tela()
    p.tela_inicial.conta = "Ninguem"
    p.tela_inicial.padrao_nome = "EMP{unidade}LAB{local}{sala}"
    p.identidade.nome_computador_modo = "fixo"
    p.identidade.nome_computador = "PC"
    p.contas.autologon.ativo, p.contas.autologon.usuario = True, "Outra"
    p.tela_inicial.unidades.append(UnidadeTela(codigo="101", locais=[]))
    e = " | ".join(_erros(p))
    assert "conta administradora" in e
    assert "{sala}" in e and "inclua {pc}" in e
    assert "precisa ser aleatório" in e
    assert "conflita" in e
    assert "código repetido" in e and "pelo menos um laboratório" in e

    p = _com_tela()
    p.tela_inicial.digitos_pc = 3
    p.tela_inicial.unidades[0].locais.append(LocalTela(codigo="10", nome="Lab 10"))
    e = " | ".join(_erros(p))
    assert "EMP101LAB10PC999" in e and "15 caracteres" in e
    assert "LAB1PC999" not in e  # 15 caracteres: cabe


def test_tela_importar_reconhece_comando():
    volta = importador.importar(gerador_xml.gerar(_com_tela()))
    assert volta.tela_inicial.ativo and volta.tela_inicial.conta == "Suporte"
    assert not volta.contas.autologon.ativo
    assert not any("Tela-Inicial" in c.comando for c in volta.comandos.primeiro_logon)
