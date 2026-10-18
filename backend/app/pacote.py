"""Monta o ZIP que vai para o pendrive."""

from __future__ import annotations

import io
import json
import re
import shutil
import unicodedata
import zipfile
from datetime import datetime
from pathlib import Path
from typing import BinaryIO

from . import gerador_xml, tela_inicial, wifi
from .ajustes import (SCRIPTS, ajustes_usuario, caminho_branding, comandos_especializacao, comandos_primeiro_logon,
                      precisa_aplicar_visual, precisa_exibicao)
from .armazenamento import listar_drivers
from .catalogo import APPS, RECURSOS
from .modelo import Perfil

RECURSOS_DIR = Path(__file__).parent / "recursos"
WSL, VMP = "Microsoft-Windows-Subsystem-Linux", "VirtualMachinePlatform"


def nome_pasta(p: Perfil) -> str:
    ascii_ = unicodedata.normalize("NFKD", p.nome).encode("ascii", "ignore").decode()
    base = re.sub(r"[^A-Za-z0-9._-]+", "-", ascii_).strip("-") or "perfil"
    return f"Imagem-{base}"


def manifesto(p: Perfil, agora: datetime, drivers: list[dict] | None = None) -> dict:
    pz = p.personalizacao
    fundos = []
    if pz.papel_parede_modo != "padrao" and pz.papel_parede:
        fundos.append(pz.papel_parede)
    if pz.tela_bloqueio_modo == "fixo" and pz.tela_bloqueio:
        fundos.append(pz.tela_bloqueio)
    arquivos = [{"origem": f"arquivos/{f}", "destino": caminho_branding(f), "imagem": True, "tipo": "fundo"}
                for f in dict.fromkeys(fundos)]
    if p.identidade.oem.ativo and p.identidade.oem.logo:
        arquivos.append({"origem": f"arquivos/{p.identidade.oem.logo}",
                         "destino": caminho_branding(gerador_xml.LOGO_OEM), "imagem": True, "tipo": "logo"})
    if pz.papel_parede_modo == "inicial" and pz.papel_parede:
        arquivos.append({"origem": "arquivos/Definir-PapelParede.ps1",
                         "destino": rf"{SCRIPTS}\Definir-PapelParede.ps1", "imagem": False, "tipo": "script"})
    if precisa_aplicar_visual(p):
        arquivos.append({"origem": "arquivos/Aplicar-Visual.ps1",
                         "destino": rf"{SCRIPTS}\Aplicar-Visual.ps1", "imagem": False, "tipo": "script"})
    if precisa_exibicao(p):
        arquivos.append({"origem": "arquivos/Ajustar-Exibicao.ps1",
                         "destino": rf"{SCRIPTS}\Ajustar-Exibicao.ps1", "imagem": False, "tipo": "script"})
    redes = wifi.arquivos(p)
    if redes:
        arquivos.append({"origem": f"arquivos/{wifi.SCRIPT}",
                         "destino": rf"{SCRIPTS}\{wifi.SCRIPT}", "imagem": False, "tipo": "script"})
        # tipo wifi: o script de preparo restringe a pasta a SYSTEM/Administradores
        arquivos += [{"origem": f"arquivos/wifi/{nome}", "destino": rf"{wifi.PASTA}\{nome}",
                      "imagem": False, "tipo": "wifi"} for nome, _ in redes]
    restritos = tela_inicial.arquivos(p)
    if restritos:
        arquivos.append({"origem": f"arquivos/{tela_inicial.SCRIPT}",
                         "destino": rf"{SCRIPTS}\{tela_inicial.SCRIPT}", "imagem": False, "tipo": "script"})
        # restrito: como os perfis Wi-Fi, so SYSTEM/Administradores (senha do dominio)
        arquivos += [{"origem": f"arquivos/tela-inicial/{nome}", "destino": rf"{tela_inicial.PASTA}\{nome}",
                      "imagem": False, "tipo": "restrito"} for nome, _ in restritos]

    remover = list(dict.fromkeys(p.apps.remover + [x.strip() for x in p.apps.remover_extras if x.strip()]))
    ativar = list(p.apps.recursos_ativar)
    wsl = WSL in ativar
    # WSL 2 (padrao do wsl --install) nao sobe sem a Plataforma de Maquina Virtual
    if wsl and VMP not in ativar:
        ativar.append(VMP)
    return {
        "versao": 1,
        "perfil": p.nome,
        "gerado_em": agora.strftime("%d/%m/%Y %H:%M"),
        "arquivos": arquivos,
        "remover_apps": remover,
        "remover_onedrive": p.apps.remover_onedrive,
        "recursos_ativar": ativar,
        "instalar_wsl": wsl,
        "recursos_desativar": p.apps.recursos_desativar,
        "drivers": [{"origem": f"drivers/{d['arquivo']}", "tamanho": d["tamanho"]} for d in drivers or []],
        "registro_usuario": ajustes_usuario(p),
        "sysprep": {
            "entrar_em": p.sysprep.entrar_em,
            "ao_final": p.sysprep.ao_final,
            "modo_vm": p.sysprep.modo_vm,
            "pular_rearm": p.sysprep.pular_rearm,
        },
    }


def _crlf(texto: str) -> bytes:
    return texto.replace("\r\n", "\n").replace("\n", "\r\n").encode("utf-8")


def gerar_zip(p: Perfil, pasta_imagens: Path, agora: datetime | None = None,
              pasta_drivers: Path | None = None) -> tuple[str, bytes]:
    buf = io.BytesIO()
    nome = escrever_zip(buf, p, pasta_imagens, agora, pasta_drivers)
    return nome, buf.getvalue()


def escrever_zip(destino: BinaryIO | Path, p: Perfil, pasta_imagens: Path, agora: datetime | None = None,
                 pasta_drivers: Path | None = None) -> str:
    """Escreve o ZIP em `destino` (arquivo, para pacotes com drivers de GBs) e devolve o nome."""
    agora = agora or datetime.now()
    raiz = nome_pasta(p)
    m = manifesto(p, agora, listar_drivers(pasta_drivers) if pasta_drivers else [])
    with zipfile.ZipFile(destino, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(f"{raiz}/sysprep.xml", gerador_xml.gerar(p, agora).encode("utf-8"))
        z.writestr(f"{raiz}/pacote.json", json.dumps(m, ensure_ascii=False, indent=2).encode("utf-8"))
        for nome in ("Preparar-Imagem.cmd", "Preparar-Imagem.ps1"):
            z.writestr(f"{raiz}/{nome}", _crlf((RECURSOS_DIR / nome).read_text(encoding="utf-8")))
        # BOM: o Bloco de Notas antigo e o "type" do cmd leem melhor os acentos
        z.writestr(f"{raiz}/LEIA-ME.txt", b"\xef\xbb\xbf" + _crlf(leia_me(p, m)))
        gerados = {f"arquivos/wifi/{n}": c for n, c in wifi.arquivos(p)}
        gerados |= {f"arquivos/tela-inicial/{n}": c for n, c in tela_inicial.arquivos(p)}
        for a in m["arquivos"]:
            nome = a["origem"].split("/", 1)[1]
            if a["origem"] in gerados:
                z.writestr(f"{raiz}/{a['origem']}", gerados[a["origem"]].encode("utf-8"))
            elif a["tipo"] == "script":
                # BOM: sem ele o PowerShell 5.1 le o .ps1 como ANSI e quebra os acentos da tela
                z.writestr(f"{raiz}/{a['origem']}",
                           b"\xef\xbb\xbf" + _crlf((RECURSOS_DIR / nome).read_text(encoding="utf-8")))
            else:
                z.write(pasta_imagens / nome, f"{raiz}/{a['origem']}")
        for d in m["drivers"]:
            _copiar_grande(z, pasta_drivers / d["origem"].split("/", 1)[1], f"{raiz}/{d['origem']}")
    return f"{raiz}.zip"


# A pasta de dados chega ao container pelo compartilhamento Windows/WSL: com
# os blocos de 8 KB do ZipFile.write a leitura cai para ~1/8 da velocidade.
BLOCO = 8 * 1024**2


def _copiar_grande(z: zipfile.ZipFile, origem: Path, nome: str) -> None:
    info = zipfile.ZipInfo.from_file(origem, nome)
    # .cab/.zip/.exe ja sao comprimidos: recomprimir so gasta tempo
    info.compress_type = zipfile.ZIP_STORED
    with origem.open("rb") as f, z.open(info, "w", force_zip64=True) as destino:
        shutil.copyfileobj(f, destino, BLOCO)


# ------------------------------------------------------------------ LEIA-ME

def _sim(v: bool) -> str:
    return "sim" if v else "não"


def leia_me(p: Perfil, m: dict) -> str:
    L: list[str] = []
    sep = "-" * 68

    def secao(t: str) -> None:
        L.extend(["", sep, f" {t}", sep, ""])

    L += ["=" * 68, f" IMAGEM PADRÃO - {p.nome}", f" Gerado pelo Sysprep Studio em {m['gerado_em']}", "=" * 68]
    if p.descricao:
        L += ["", p.descricao]

    secao("1. COMO USAR")
    L += [
        "  1. Instale o Windows e, na primeira tela do OOBE, pressione",
        "     Ctrl+Shift+F3. A máquina reinicia em Modo Auditoria.",
        "  2. Instale programas e drivers normalmente. Os pacotes de drivers",
        "     da pasta drivers\\ são adicionados pelo script (passo 2).",
        "  3. Copie ESTA PASTA inteira para a máquina (ou rode do pendrive).",
        "  4. Duplo clique em Preparar-Imagem.cmd.",
        "     Teste sem generalizar:  Preparar-Imagem.cmd /preparar",
        "  5. Se o script pedir REINÍCIO (recursos opcionais), reinicie e",
        "     rode de novo - a máquina volta em Modo Auditoria.",
        "  6. Digite SYSPREP para confirmar. Depois capture pelo WinPE/DISM.",
        "",
        "  NÃO edite o sysprep.xml à mão: altere o perfil no Sysprep Studio",
        "  e gere um novo pacote. O pacote.json diz ao script o que fazer.",
    ]

    secao("2. CONTAS")
    for c in p.contas.locais:
        L.append(f"  {c.nome:<20} grupo {c.grupo:<16} exibido como \"{c.nome_exibicao or c.nome}\"")
    if p.contas.admin_embutido_ativo:
        L.append("  Administrador embutido: ATIVADO no primeiro logon")
    if p.tela_inicial.ativo:
        L.append(f"  Logon automático: {p.tela_inicial.conta} (1x, só para abrir a tela inicial)")
    elif p.contas.autologon.ativo:
        L.append(f"  Logon automático: {p.contas.autologon.usuario} ({p.contas.autologon.quantidade}x)")
    L += ["", "  As senhas NÃO estão neste arquivo. Estão codificadas (Base64,",
          "  reversível - NÃO é criptografia) dentro do sysprep.xml."]

    secao("3. O QUE A IMAGEM ENTREGA")
    lic = f"chave {p.licenca.chave[-5:]} (final)" if p.licenca.modo == "chave" else "OEM da firmware (sem chave no XML)"
    if p.licenca.modo == "chave" and p.licenca.reforcar_no_primeiro_logon:
        lic += r", reinstalada e ativada no 1º logon (log: C:\Windows\Temp\SysprepStudio-ativacao.log)"
    idt = p.identidade
    pz = p.personalizacao
    fundo = {"padrao": "padrão do Windows", "inicial": f"inicial {pz.papel_parede} (usuário pode trocar)",
             "fixo": f"FIXO {pz.papel_parede} (travado)"}[pz.papel_parede_modo]
    bloqueio = "padrão do Windows" if pz.tela_bloqueio_modo == "padrao" else f"FIXA {pz.tela_bloqueio} (travada)"
    ex = p.exibicao
    exib = [f"resolução {ex.resolucao}" if ex.resolucao else "resolução recomendada"]
    if ex.telas != "padrao":
        exib.append(f"telas: {ex.telas}")
    if ex.resolucao or ex.telas != "padrao":
        exib.append("reaplicada em todo logon" if ex.sempre else "aplicada no 1º logon")
    if ex.escala:
        exib.append(f"escala {ex.escala}%")
    if ex.tamanho_texto != 100:
        exib.append(f"texto {ex.tamanho_texto}%")
    if p.tela_inicial.ativo:
        nome_pc = f"escolhido na tela inicial ({p.tela_inicial.padrao_nome})"
    else:
        nome_pc = idt.nome_computador if idt.nome_computador_modo == "fixo" else "aleatório"
    L += [
        f"  Ativação ..........: {lic}",
        f"  Nome do computador : {nome_pc}",
        f"  Idioma / teclado ..: {p.regiao.idioma_interface} / {p.regiao.teclado}",
        f"  Fuso horário ......: {p.regiao.fuso_horario}",
        f"  OOBE pulado .......: {_sim(p.oobe.pular_oobe_maquina and p.oobe.pular_oobe_usuario)}",
        f"  Papel de parede ...: {fundo}",
        f"  Tela de bloqueio ..: {bloqueio}",
        f"  Exibição ..........: {', '.join(exib)}",
        f"  Área de Trab. Rem. : {'ativa' + (' (NLA)' if p.rede.rdp_nla else '') if p.rede.rdp_ativo else 'desligada'}",
        f"  CopyProfile .......: {_sim(pz.copy_profile)}",
        f"  Sysprep ...........: /generalize /{p.sysprep.entrar_em}"
        f"{' /mode:vm' if p.sysprep.modo_vm else ''} e depois {p.sysprep.ao_final}",
    ]

    nomes_app = {a["id"]: a["nome"] for a in APPS}
    if m["remover_apps"]:
        L += ["", "  Apps removidos:"] + [f"     - {nomes_app.get(a, a)} ({a})" for a in m["remover_apps"]]
    if p.apps.remover_onedrive:
        L.append("  OneDrive: removido e bloqueado para perfis novos")
    nomes_rec = {r["id"]: r["nome"] for r in RECURSOS}
    if p.apps.recursos_ativar:
        L += ["", "  Recursos ativados:"] + [f"     + {nomes_rec.get(r, r)}" for r in p.apps.recursos_ativar]
    if p.apps.recursos_desativar:
        L += ["", "  Recursos desativados:"] + [f"     - {nomes_rec.get(r, r)}" for r in p.apps.recursos_desativar]

    redes = wifi.redes_validas(p)
    if redes:
        nomes_seg = {"wpa2": "WPA2-Pessoal", "wpa3": "WPA3-Pessoal", "aberta": "aberta"}
        L += ["", "  Redes Wi-Fi (na ordem de prioridade):"]
        L += [f"     {i}. {r.ssid.strip()} ({nomes_seg[r.seguranca]}"
              f"{', oculta' if r.oculta else ''}{', manual' if not r.conectar_auto else ''})"
              for i, r in enumerate(redes, 1)]
        L += ["     Importadas como SYSTEM na inicialização da máquina clonada, antes do",
              "     login (tarefa agendada). Depois os arquivos com as senhas são apagados.",
              f"     Log: {wifi.LOG}"]

    t = p.tela_inicial
    if t.ativo:
        dom = tela_inicial.com_dominio(p)
        L += ["", "  Tela de configuração inicial (1º logon da máquina clonada):",
              f"     Logon automático em {t.conta}; o técnico escolhe {t.rotulo_unidade.lower()}, "
              f"{t.rotulo_local.lower()} e nº do PC.",
              "     " + (f"Entra no domínio {p.rede.ingresso.dominio} já com o nome, na OU do local."
                         if dom else "Sem domínio: só renomeia a máquina."),
              "     Depois desliga o logon automático, apaga a configuração e reinicia."]
        if t.permitir_pular:
            L.append(f"     \"Pular\" deixa para depois: a tela volta no próximo logon de {t.conta}.")
        for u in t.unidades:
            L.append(f"     {u.codigo} - {u.nome or u.codigo}")
            for l in u.locais:
                ex = tela_inicial.montar_nome(t.padrao_nome, u.codigo, l.codigo, 1, t.digitos_pc)
                ou = f"  ->  {tela_inicial.ou_do_local(p, u, l) or 'OU padrão (Computers)'}" if dom else ""
                L.append(f"        {l.nome or l.codigo:<20} {ex}...{ou}")
        L.append(f"     Log: {tela_inicial.LOG}")

    if m["drivers"]:
        total = sum(d["tamanho"] for d in m["drivers"]) / 1024**3
        L += ["", f"  Pacotes de drivers ({total:.1f} GB), adicionados ao repositório de drivers:"]
        L += [f"     - {d['origem'].split('/', 1)[1]}" for d in m["drivers"]]
        L += ["     Cada máquina instala só os drivers do próprio hardware no 1º boot.",
              "     Pendrive em FAT32 não aceita arquivo acima de 4 GB: use NTFS ou exFAT."]

    esp = comandos_especializacao(p)
    if esp:
        L += ["", "  Ajustes de máquina (passe specialize do sysprep.xml):"]
        L += [f"     {i:>2}. {d}" for i, (d, _) in enumerate(esp, 1)]
    usr = m["registro_usuario"]
    if usr:
        L += ["", "  Ajustes por usuário (aplicados pelo script no perfil Default):"]
        L += [f"     - {u['chave']}\\{u['nome']}" + (" (removido)" if u.get("remover") else f" = {u['valor']}")
              for u in usr]
    prim = comandos_primeiro_logon(p)
    if prim:
        L += ["", "  Comandos no primeiro logon:"] + [f"     {i:>2}. {d}" for i, (d, _) in enumerate(prim, 1)]

    secao("4. QUANDO O SYSPREP FALHA")
    L += [
        "  O motivo real está em:",
        "      C:\\Windows\\System32\\Sysprep\\Panther\\setuperr.log",
        "",
        "  a) App instalado para o usuário e não provisionado: o script lista",
        "     os suspeitos no passo 9. Inclua-os em \"Apps\" no perfil.",
        "  b) Windows Update rodando: o script para os serviços no passo 8.",
        "  c) Limite de rearm: (Get-CimInstance SoftwareLicensingService).RemainingWindowsReArmCount",
        "  d) Máquina em domínio: remova do domínio antes de generalizar.",
        "  e) Reinício pendente: reinicie em auditoria e rode de novo.",
    ]

    secao("5. SEGURANÇA")
    L += [
        "  - O sysprep.xml contém senhas (Base64) e, se houver, a chave e a",
        "    senha do domínio. Não versione, não deixe o pendrive largado.",
        "  - O script apaga C:\\TEMP\\sysprep.xml antes de desligar, para a",
        "    senha não viajar dentro da imagem capturada.",
        "  - Com o generalize confirmado, o script também apaga esta pasta",
        "    inteira (se estiver no disco do sistema; no pendrive ela fica).",
        "    Se o Sysprep falhar, nada é apagado. O log vai para C:\\Windows\\Temp.",
    ]
    if t.ativo and tela_inicial.com_dominio(p):
        L += [
            "  - A senha do domínio NÃO vai no sysprep.xml: fica em texto puro em",
            f"    arquivos\\tela-inicial\\ e, na imagem, em {tela_inicial.PASTA}",
            "    (só SYSTEM e Administradores leem) até a máquina entrar no domínio.",
        ]
    if redes:
        L += [
            "  - As senhas Wi-Fi ficam em texto puro em arquivos\\wifi\\ e, na imagem,",
            f"    em {wifi.PASTA} (só SYSTEM e Administradores leem)",
            "    até a máquina clonada importá-las e apagá-las.",
        ]
    L.append("")
    return "\n".join(L)
