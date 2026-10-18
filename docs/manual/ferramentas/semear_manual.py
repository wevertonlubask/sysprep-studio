"""Cria os perfis fictícios do manual no contêiner sysprep-studio-manual (porta 8091).

Uso (raiz do projeto):  python docs/manual/ferramentas/semear_manual.py
Apaga os perfis que já existirem NESSE contêiner e recria tudo do zero. Os dados da
"Empresa Exemplo" são inventados; nenhuma senha aqui é usada de verdade.
"""
import io
import json
import urllib.request
import uuid

from PIL import Image, ImageDraw, ImageFont

BASE = "http://localhost:8091"


def req(metodo: str, rota: str, corpo=None, tipo="application/json"):
    dados = json.dumps(corpo).encode() if tipo == "application/json" and corpo is not None else corpo
    r = urllib.request.Request(BASE + rota, data=dados, method=metodo, headers={"Content-Type": tipo} if dados else {})
    with urllib.request.urlopen(r) as resp:
        txt = resp.read()
        return json.loads(txt) if txt else None


def multipart(rota: str, campos: dict, arquivo: tuple[str, bytes]):
    limite = uuid.uuid4().hex
    partes = []
    for k, v in campos.items():
        partes.append(f'--{limite}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    nome, conteudo = arquivo
    partes.append(f'--{limite}\r\nContent-Disposition: form-data; name="arquivo"; filename="{nome}"\r\n'
                  f"Content-Type: application/octet-stream\r\n\r\n".encode() + conteudo + b"\r\n")
    partes.append(f"--{limite}--\r\n".encode())
    return req("POST", rota, b"".join(partes), f"multipart/form-data; boundary={limite}")


# ------------------------------------------------------------------ imagens fictícias
def fonte(tam: int):
    for f in ("segoeuib.ttf", "arialbd.ttf"):
        try:
            return ImageFont.truetype(f, tam)
        except OSError:
            pass
    return ImageFont.load_default()


def fundo(texto: str, sub: str, c1, c2) -> bytes:
    w, h = 1920, 1080
    im = Image.new("RGB", (w, h))
    px = im.load()
    for y in range(h):
        for x in range(0, w, 4):
            t = (x / w + y / h) / 2
            cor = tuple(int(c1[i] * (1 - t) + c2[i] * t) for i in range(3))
            for k in range(4):
                px[x + k, y] = cor
    d = ImageDraw.Draw(im)
    d.text((140, 760), texto, font=fonte(96), fill=(255, 255, 255))
    d.text((146, 880), sub, font=fonte(40), fill=(200, 214, 255))
    b = io.BytesIO()
    im.save(b, "JPEG", quality=88)
    return b.getvalue()


def logo_oem() -> bytes:
    im = Image.new("RGB", (240, 240), (26, 44, 91))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((20, 20, 220, 220), 36, fill=(61, 90, 254))
    d.text((52, 62), "EE", font=fonte(110), fill=(255, 255, 255))
    b = io.BytesIO()
    im.save(b, "PNG")
    return b.getvalue()


def driver_falso(tipo: str, mb: int) -> bytes:
    cab = {".cab": b"MSCF", ".zip": b"PK\x03\x04", ".exe": b"MZ"}[tipo]
    return cab + bytes(mb * 1024 * 1024)


# ------------------------------------------------------------------ perfis
for p in req("GET", "/api/perfis"):
    req("DELETE", f"/api/perfis/{p['id']}")

# 1) Perfil completo: domínio + tela inicial + Wi-Fi + aparência + drivers
pid = req("POST", "/api/perfis", {"nome": "Estações administrativas", "modelo": "laboratorio"})["id"]
p = req("GET", f"/api/perfis/{pid}")["perfil"]
p["descricao"] = "Desktops do administrativo e do financeiro, matriz e filial."
p["licenca"] = {"modo": "oem", "chave": "", "reforcar_no_primeiro_logon": True}
p["identidade"].update({"proprietario": "Empresa Exemplo", "organizacao": "Empresa Exemplo Ltda"})
p["identidade"]["oem"] = {"ativo": True, "fabricante": "Empresa Exemplo", "modelo": "Estação padrão 2026",
                          "horario_suporte": "Seg a sex, 8h às 18h", "telefone_suporte": "(00) 0000-0000",
                          "url_suporte": "https://suporte.exemplo.com.br", "logo": ""}
p["contas"]["locais"] = [
    {"nome": "Suporte", "nome_exibicao": "Suporte TI", "descricao": "Conta administrativa da TI",
     "grupo": "Administrators", "senha": "Exemplo#Suporte2026"},
    {"nome": "Colaborador", "nome_exibicao": "Colaborador", "descricao": "Conta de uso geral",
     "grupo": "Users", "senha": "Exemplo#Uso2026"},
]
p["contas"]["senhas_nao_expiram"] = True
p["rede"]["ingresso"] = {"modo": "dominio", "grupo_trabalho": "WORKGROUP", "dominio": "empresa.local",
                         "usuario": "svc-ingresso", "senha": "Exemplo#Ingresso2026",
                         "ou": "OU=Computadores,DC=empresa,DC=local"}
p["rede"]["rdp_ativo"] = True
p["wifi"]["redes"] = [
    {"ssid": "Empresa-Corp", "seguranca": "wpa2", "senha": "Exemplo#WiFi2026", "oculta": False, "conectar_auto": True},
    {"ssid": "Empresa-Visitantes", "seguranca": "aberta", "senha": "", "oculta": False, "conectar_auto": False},
]
p["tela_inicial"].update({
    "ativo": True, "conta": "Suporte", "padrao_nome": "{unidade}{local}PC{pc}", "digitos_pc": 2,
    "rotulo_unidade": "Unidade", "rotulo_local": "Setor", "permitir_pular": True,
    "unidades": [
        {"codigo": "SP", "nome": "Matriz São Paulo", "ou": "OU=SP,OU=Computadores,DC=empresa,DC=local", "locais": [
            {"codigo": "ADM", "nome": "Administrativo", "ou": "OU=ADM,OU=SP,OU=Computadores,DC=empresa,DC=local"},
            {"codigo": "FIN", "nome": "Financeiro", "ou": ""},
            {"codigo": "RH", "nome": "Recursos Humanos", "ou": ""},
        ]},
        {"codigo": "RJ", "nome": "Filial Rio de Janeiro", "ou": "OU=RJ,OU=Computadores,DC=empresa,DC=local", "locais": [
            {"codigo": "ADM", "nome": "Administrativo", "ou": ""},
            {"codigo": "ATD", "nome": "Atendimento", "ou": ""},
        ]},
    ],
})
p["personalizacao"].update({"papel_parede_modo": "fixo", "tela_bloqueio_modo": "fixo", "desativar_spotlight": True,
                            "barra_alinhamento": "esquerda", "mostrar_extensoes": True, "copy_profile": True})
p["exibicao"].update({"resolucao": "1920x1080", "telas": "duplicar"})
p["privacidade"].update({"desativar_apps_sugeridos": True, "desativar_dicas_usuario": True,
                         "desativar_id_publicidade": True, "desativar_pesquisa_web": True})
p["apps"].update({"remover_onedrive": True, "edge_sem_primeira_execucao": True,
                  "edge_pagina_inicial": "https://intranet.exemplo.com.br"})
p["energia"].update({"plano": "equilibrado", "desligar_tela_min": 15, "suspender_min": 0, "desativar_hibernacao": True})
p["seguranca"]["impedir_bitlocker_automatico"] = True
p["comandos"]["primeiro_logon"] = [{"descricao": "Mapear unidade de rede da empresa",
                                     "comando": r"cmd.exe /c net use S: \\arquivos.empresa.local\publico /persistent:yes"}]
p["personalizacao"]["papel_parede"] = multipart(f"/api/perfis/{pid}/imagens/papel_parede", {},
    ("papel.jpg", fundo("Empresa Exemplo", "Bem-vindo à estação de trabalho", (26, 44, 91), (36, 88, 214))))["arquivo"]
p["personalizacao"]["tela_bloqueio"] = multipart(f"/api/perfis/{pid}/imagens/tela_bloqueio", {},
    ("bloqueio.jpg", fundo("Empresa Exemplo", "Uso restrito a colaboradores", (34, 22, 84), (24, 182, 240))))["arquivo"]
p["identidade"]["oem"]["logo"] = multipart(f"/api/perfis/{pid}/imagens/logo_oem", {}, ("logo.png", logo_oem()))["arquivo"]
req("PUT", f"/api/perfis/{pid}", p)
for nome, tipo, mb in (("Dell-OptiPlex-7010-win11-A05", ".cab", 6), ("Dell-Latitude-5440-win11-A08", ".cab", 4)):
    req("PUT", f"/api/perfis/{pid}/drivers/{nome}{tipo}", driver_falso(tipo, mb), "application/octet-stream")
print("perfil completo:", pid)

# 2) Perfil simples: notebooks, grupo de trabalho, sem tela inicial
nid = req("POST", "/api/perfis", {"nome": "Notebooks de campo", "modelo": "padrao"})["id"]
n = req("GET", f"/api/perfis/{nid}")["perfil"]
n["descricao"] = "Notebooks da equipe externa, fora do domínio."
n["contas"]["locais"] = [{"nome": "Suporte", "nome_exibicao": "Suporte TI", "descricao": "", "grupo": "Administrators",
                          "senha": "Exemplo#Suporte2026"},
                         {"nome": "Tecnico", "nome_exibicao": "Técnico de campo", "descricao": "", "grupo": "Users",
                          "senha": "Exemplo#Campo2026"}]
n["rede"]["ingresso"]["modo"] = "grupo_trabalho"
n["rede"]["ingresso"]["grupo_trabalho"] = "CAMPO"
req("PUT", f"/api/perfis/{nid}", n)
print("perfil simples:", nid)

# 3) Perfil com erro, para mostrar a verificação
eid = req("POST", "/api/perfis", {"nome": "Sala de treinamento (rascunho)", "modelo": "padrao"})["id"]
e = req("GET", f"/api/perfis/{eid}")["perfil"]
e["contas"]["locais"] = [{"nome": "Treinamento", "nome_exibicao": "", "descricao": "", "grupo": "Users", "senha": ""}]
e["licenca"] = {"modo": "chave", "chave": "ABCDE-12345", "reforcar_no_primeiro_logon": True}
req("PUT", f"/api/perfis/{eid}", e)
print("perfil rascunho:", eid)

open(__file__.replace("semear_manual.py", ".ids-manual.json"), "w").write(
    json.dumps({"completo": pid, "simples": nid, "rascunho": eid}))
