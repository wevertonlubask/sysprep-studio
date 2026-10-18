"""Regras que pegam, antes de gerar a imagem, os erros que so apareceriam
depois do generalize (quando ja custou um rearm e uma captura)."""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass

from . import tela_inicial
from .catalogo import RECURSOS
from .modelo import Perfil
from .wifi import RE_CHAVE_HEX

RE_CHAVE = re.compile(r"^[A-Z0-9]{5}(-[A-Z0-9]{5}){4}$", re.I)
PROIBIDOS_CONTA = set('"/\\[]:;|=,+*?<>@')
RESERVADOS_CONTA = {"administrator", "administrador", "guest", "convidado", "defaultaccount",
                    "wdagutilityaccount", "system", "none"}
RE_RESOLUCAO = re.compile(r"^[1-9]\d{2,3}x[1-9]\d{2,3}$")
RE_COMPUTADOR =re.compile(r"^[A-Za-z0-9-]{1,15}$")
REINICIO = {r["id"] for r in RECURSOS if "reinício" in r.get("nota", "").lower()}


@dataclass
class Aviso:
    nivel: str  # erro | aviso | info
    secao: str
    mensagem: str


def validar(p: Perfil, imagens: set[str] | None = None, drivers: list[dict] | None = None) -> list[dict]:
    imagens = imagens or set()
    drivers = drivers or []
    r: list[Aviso] = []

    def erro(secao, msg):
        r.append(Aviso("erro", secao, msg))

    def aviso(secao, msg):
        r.append(Aviso("aviso", secao, msg))

    def info(secao, msg):
        r.append(Aviso("info", secao, msg))

    # ---------------- licenca
    if p.licenca.modo == "chave":
        if not RE_CHAVE.match(p.licenca.chave.strip()):
            erro("licenca", "Chave do produto inválida: use o formato XXXXX-XXXXX-XXXXX-XXXXX-XXXXX.")
        else:
            aviso("licenca", "Chave gravada no XML: cada máquina clonada consome uma ativação (MAK) "
                             "e a chave precisa ser da mesma edição da imagem.")
            if p.licenca.reforcar_no_primeiro_logon:
                info("licenca", "No primeiro logon a chave é reinstalada (slmgr /ipk) e ativada (slmgr /ato). "
                                r"Resultado em C:\Windows\Temp\SysprepStudio-ativacao.log.")
    else:
        info("licenca", "Sem chave: cada máquina ativa com a chave OEM gravada na própria firmware (MSDM).")

    # ---------------- identidade
    idt = p.identidade
    if idt.nome_computador_modo == "fixo":
        n = idt.nome_computador.strip()
        if not RE_COMPUTADOR.match(n) or n.isdigit():
            erro("identidade", "Nome do computador: até 15 caracteres, letras, números e hífen, não só números.")
        aviso("identidade", "Nome fixo: todas as máquinas clonadas terão o MESMO nome (conflito na rede).")
    if idt.oem.ativo and idt.oem.logo and idt.oem.logo not in imagens:
        erro("identidade", "Logo OEM configurado, mas o arquivo não foi enviado.")

    # ---------------- contas
    c = p.contas
    nomes = [x.nome.strip().lower() for x in c.locais]
    for i, conta in enumerate(c.locais, 1):
        n = conta.nome.strip()
        rotulo = f"Conta {i} ({n or 'sem nome'})"
        if not n:
            erro("contas", f"{rotulo}: nome obrigatório.")
            continue
        if len(n) > 20:
            erro("contas", f"{rotulo}: nome com mais de 20 caracteres.")
        if set(n) & PROIBIDOS_CONTA or n.endswith("."):
            erro("contas", f'{rotulo}: nome com caractere proibido ({"".join(sorted(PROIBIDOS_CONTA))}).')
        if n.lower() in RESERVADOS_CONTA:
            erro("contas", f"{rotulo}: nome reservado pelo Windows.")
        if nomes.count(n.lower()) > 1:
            erro("contas", f"{rotulo}: nome repetido.")
        if not conta.senha:
            aviso("contas", f"{rotulo}: senha em branco - qualquer um entra na conta.")
        if not conta.grupo.strip():
            erro("contas", f"{rotulo}: grupo obrigatório.")
    admins = [x for x in c.locais if "administrators" in x.grupo.lower().split(";")]
    if not c.locais:
        erro("contas", "Nenhuma conta local. Com o OOBE pulado a máquina ficaria sem login.")
    elif not admins and not (c.admin_embutido_ativo and c.admin_embutido_senha):
        erro("contas", "Nenhuma conta no grupo Administrators: ninguém conseguirá administrar a máquina.")
    elif len(admins) > 1:
        info("contas", f"{len(admins)} contas administradoras: " + ", ".join(x.nome for x in admins) + ".")
    if c.admin_embutido_ativo and not c.admin_embutido_senha:
        erro("contas", "Administrador embutido ativado sem senha.")
    if c.autologon.ativo:
        alvo = next((x for x in c.locais if x.nome == c.autologon.usuario), None)
        if not alvo:
            erro("contas", "Logon automático: escolha uma das contas locais.")
        else:
            aviso("contas", "Logon automático grava a senha de forma recuperável no registro "
                            "(Winlogon) durante os logons configurados.")

    # ---------------- rede
    ing = p.rede.ingresso
    if ing.modo == "dominio":
        if not (ing.dominio and ing.usuario and ing.senha):
            erro("dominio", "Ingresso no domínio: domínio, usuário e senha são obrigatórios.")
        if p.tela_inicial.ativo:
            aviso("dominio", "A senha do domínio não vai no XML: fica em texto puro num arquivo do pacote e da imagem "
                          "(pasta só de SYSTEM/Administradores) até a máquina clonada entrar no domínio e apagá-lo.")
        else:
            aviso("dominio", "A senha do domínio vai em TEXTO PURO no XML (o unattend não a codifica).")
    if ing.modo == "grupo_trabalho" and not ing.grupo_trabalho.strip():
        erro("dominio", "Informe o nome do grupo de trabalho.")
    if p.rede.rdp_ativo and not p.rede.rdp_nla:
        aviso("remoto", "RDP sem NLA aceita conexão antes da autenticação (mais exposto).")
    fw = p.rede.firewall
    if not (fw.dominio and fw.privado and fw.publico):
        aviso("firewall", "Firewall desligado em pelo menos um perfil.")

    # ---------------- wifi
    ssids = [r.ssid.strip() for r in p.wifi.redes]
    for i, rede in enumerate(p.wifi.redes, 1):
        ssid = rede.ssid.strip()
        rotulo = f"Rede {i} ({ssid or 'sem nome'})"
        if not ssid:
            erro("wifi", f"{rotulo}: informe o nome da rede (SSID).")
            continue
        if len(ssid.encode("utf-8")) > 32:
            erro("wifi", f"{rotulo}: SSID com mais de 32 bytes (limite do Wi-Fi).")
        if ssids.count(ssid) > 1:
            erro("wifi", f"{rotulo}: rede repetida.")
        if rede.seguranca == "aberta":
            aviso("wifi", f"{rotulo}: rede aberta, o tráfego não é criptografado.")
        elif not (8 <= len(rede.senha) <= 63 or RE_CHAVE_HEX.match(rede.senha)):
            erro("wifi", f"{rotulo}: a senha precisa ter de 8 a 63 caracteres (ou 64 dígitos hexadecimais).")
        if rede.oculta:
            info("wifi", f"{rotulo}: rede oculta. O Windows sonda o SSID ativamente, o que expõe o nome "
                         "da rede fora do alcance dela.")
    if p.wifi.redes:
        aviso("wifi", "As senhas Wi-Fi vão em texto puro dentro do pacote e da imagem capturada "
                      "(pasta só de SYSTEM/Administradores) até a máquina clonada importá-las e apagá-las.")
        info("wifi", "As redes são importadas na inicialização da máquina clonada, antes do login, por uma "
                     "tarefa agendada (SYSTEM). O driver da placa Wi-Fi precisa estar na imagem ou em um "
                     r"pacote da seção Drivers. Log em C:\Windows\Temp\SysprepStudio-wifi.log.")

    # ---------------- tela inicial
    t = p.tela_inicial
    if t.ativo:
        _validar_tela_inicial(p, admins, erro, aviso, info)

    # ---------------- personalizacao
    pz = p.personalizacao
    if pz.papel_parede_modo != "padrao" and pz.papel_parede not in imagens:
        erro("personalizacao", "Papel de parede personalizado: envie a imagem.")
    if pz.tela_bloqueio_modo == "fixo" and pz.tela_bloqueio not in imagens:
        erro("personalizacao", "Tela de bloqueio fixa: envie a imagem.")
    if pz.tela_bloqueio_modo == "fixo" and not pz.desativar_spotlight:
        info("personalizacao", "O Spotlight será desligado automaticamente: ele sobrescreveria a tela de bloqueio fixa.")
    if pz.papel_parede_modo == "fixo" or pz.tela_bloqueio_modo == "fixo":
        info("personalizacao", "O travamento por política só é intransponível para usuário padrão: "
                               "administradores conseguem desfazer pelo registro.")
    if pz.tela_bloqueio_modo == "fixo" and pz.papel_parede_modo == "padrao":
        aviso("personalizacao", "Só a tela de bloqueio tem imagem: o papel de parede da área de trabalho "
                                "continua o padrão do Windows.")
    if pz.papel_parede_modo != "padrao" or pz.tela_bloqueio_modo == "fixo" or pz.tema != "padrao":
        info("personalizacao", "Imagens e ajustes por usuário (tema, barra de tarefas) são instalados pelo "
                               "Preparar-Imagem.cmd do pacote: o sysprep.xml sozinho não copia as imagens.")
    ex = p.exibicao
    if ex.resolucao:
        if not RE_RESOLUCAO.match(ex.resolucao):
            erro("personalizacao", "Resolução inválida: use o formato LARGURAxALTURA, ex.: 1920x1080.")
        else:
            aviso("personalizacao", f"Resolução fixa {ex.resolucao}: em monitor com resolução nativa diferente a "
                                    "imagem fica menos nítida. Monitor que não suporta esse modo fica na recomendada.")
    if ex.telas == "duplicar" and not ex.resolucao:
        info("personalizacao", "Telas duplicadas sem resolução fixa: o Windows usa a maior resolução comum "
                               "aos dois monitores.")
    if ex.escala:
        info("personalizacao", f"Escala {ex.escala}% vale para todos os monitores (escala personalizada). "
                               "As Configurações mostram o aviso \"escala personalizada definida\".")
    if pz.copy_profile:
        aviso("personalizacao", "CopyProfile ativo: o perfil do Administrador de auditoria vira o modelo "
                                "de todos os usuários. Não deixe arquivos ou logins pessoais nele.")

    # ---------------- privacidade
    if p.privacidade.telemetria == "desligada":
        info("privacidade", "Telemetria 0 (Segurança) só tem efeito em Enterprise/Education; nas demais vira 1.")

    # ---------------- apps
    ativ = set(p.apps.recursos_ativar) & REINICIO
    if ativ:
        info("apps", "Recursos que exigem reinício: " + ", ".join(sorted(ativ)) +
                     ". O script para antes do Sysprep, você reinicia (volta em auditoria) e roda de novo.")
    if "Microsoft-Windows-Subsystem-Linux" in p.apps.recursos_ativar:
        info("apps", "WSL: o script também ativa a Plataforma de Máquina Virtual e instala o pacote WSL "
                     "(wsl --update --web-download, exige internet). Cada usuário instala a sua distro "
                     "(wsl --install -d Ubuntu): distros não passam pelo Sysprep.")
    conflito = set(p.apps.recursos_ativar) & set(p.apps.recursos_desativar)
    if conflito:
        erro("apps", "Recurso marcado para ativar e desativar ao mesmo tempo: " + ", ".join(sorted(conflito)))
    if "Microsoft.WidgetsPlatformRuntime" not in p.apps.remover:
        info("apps", "Microsoft.WidgetsPlatformRuntime não será removido: se o Sysprep acusar "
                     "'installed for a user, but not provisioned', marque-o.")

    # ---------------- drivers
    if drivers:
        gb = sum(d["tamanho"] for d in drivers) / 1024**3
        info("drivers", f"{len(drivers)} pacote(s) de drivers ({gb:.1f} GB): o script os extrai e adiciona ao "
                        "repositório de drivers (pnputil /add-driver /subdirs), sem instalar. Cada máquina usa "
                        "só os do próprio hardware.")
        if any(d["tamanho"] >= 4 * 1024**3 for d in drivers):
            aviso("drivers", "Há pacote com 4 GB ou mais: pendrive em FAT32 não aceita. Formate em NTFS ou exFAT.")
        if any(d["arquivo"].lower().endswith(".exe") for d in drivers):
            info("drivers", "Pacotes .exe são extraídos com \"/s /e=pasta\" (padrão Dell). Se algum não extrair, "
                            "extraia-o no seu computador, compacte a pasta em .zip e envie o .zip.")

    # ---------------- sysprep
    s = p.sysprep
    if s.manter_drivers and len(drivers) > 1:
        aviso("sysprep", "Manter drivers instalados (PersistAllDeviceInstalls) com pacotes de vários modelos: "
                         "desligue, para cada máquina detectar o próprio hardware no primeiro boot.")
    if s.modo_vm and s.entrar_em != "oobe":
        erro("sysprep", "/mode:vm só pode ser usado junto com /oobe.")
    if s.pular_rearm:
        info("sysprep", "SkipRearm: o generalize não consome rearm, mas a contagem de ativação não é reiniciada.")

    # ---------------- comandos
    for passe, lista in (("especialização", p.comandos.especializacao), ("primeiro logon", p.comandos.primeiro_logon)):
        for i, cmd in enumerate(lista, 1):
            if not cmd.comando.strip():
                aviso("comandos", f"Comando {i} de {passe} está vazio e será ignorado.")
            elif len(cmd.comando) > 1024:
                erro("comandos", f"Comando {i} de {passe} passa de 1024 caracteres (limite do unattend).")

    return [asdict(a) for a in r]


def _validar_tela_inicial(p: Perfil, admins: list, erro, aviso, info) -> None:
    t = p.tela_inicial
    s = "tela_inicial"
    if t.conta not in [x.nome for x in admins]:
        erro(s, "Escolha a conta administradora que abre a tela (logon automático único).")
    if p.contas.autologon.ativo and p.contas.autologon.usuario != t.conta:
        erro(s, f"O logon automático de Contas ({p.contas.autologon.usuario or 'sem conta'}) conflita com o da "
                "tela inicial: desligue-o ou use a mesma conta.")
    if p.identidade.nome_computador_modo == "fixo":
        erro(s, "Com a tela inicial, o nome do computador em Identidade precisa ser aleatório.")

    padrao = t.padrao_nome.strip()
    estranhos = set(tela_inicial.RE_CAMPO.findall(padrao)) - set(tela_inicial.CAMPOS)
    if estranhos:
        erro(s, f"Padrão do nome: campo desconhecido {', '.join(sorted(estranhos))}. "
                "Use {unidade}, {local} e {pc}.")
    if "{pc}" not in padrao:
        erro(s, "Padrão do nome: inclua {pc}, senão todas as máquinas do local teriam o mesmo nome.")

    if not t.unidades:
        erro(s, f"Cadastre pelo menos uma {t.rotulo_unidade.lower() or 'unidade'} com seus locais.")
    maior = 10 ** t.digitos_pc - 1
    cod_u = [u.codigo.strip().lower() for u in t.unidades]
    for i, u in enumerate(t.unidades, 1):
        ru = f"{t.rotulo_unidade} {i} ({u.codigo.strip() or 'sem código'})"
        if not u.codigo.strip() and "{unidade}" in padrao:
            erro(s, f"{ru}: código obrigatório (entra no nome).")
        if u.codigo.strip() and cod_u.count(u.codigo.strip().lower()) > 1:
            erro(s, f"{ru}: código repetido.")
        if not u.locais:
            erro(s, f"{ru}: cadastre pelo menos um {t.rotulo_local.lower() or 'local'}.")
        cod_l = [l.codigo.strip().lower() for l in u.locais]
        for j, l in enumerate(u.locais, 1):
            rl = f"{ru} > {t.rotulo_local} {j} ({l.nome.strip() or l.codigo.strip() or 'sem nome'})"
            if not l.codigo.strip() and "{local}" in padrao:
                erro(s, f"{rl}: código obrigatório (entra no nome).")
                continue
            if cod_l.count(l.codigo.strip().lower()) > 1:
                erro(s, f"{rl}: código repetido.")
            nome = tela_inicial.montar_nome(padrao, u.codigo, l.codigo, maior, t.digitos_pc)
            if not RE_COMPUTADOR.match(nome) or nome.isdigit():
                erro(s, f"{rl}: o nome {nome} passa de 15 caracteres ou tem caractere inválido "
                        "(só letras, números e hífen).")

    if tela_inicial.com_dominio(p):
        sem_ou = [f"{u.codigo}/{l.codigo}" for u in t.unidades for l in u.locais
                  if not tela_inicial.ou_do_local(p, u, l)]
        if sem_ou:
            info(s, "Sem OU definida (" + ", ".join(sem_ou) + "): essas máquinas vão para o contêiner padrão "
                    "do domínio (Computers).")
        aviso(s, "Reimagem: o nome já existe no AD. Desde out/2022 (KB5020276) o domínio só deixa a conta de "
                 "ingresso reaproveitar um objeto que ela mesma criou, a menos que a GPO \"Domain controller: "
                 "Allow computer account re-use during domain join\" a autorize. A tela avisa quando o nome já existe.")
    else:
        info(s, "Sem domínio em Rede: a tela só renomeia a máquina.")
    info(s, "A tela abre no primeiro logon, com um logon automático único na conta escolhida, e precisa de "
            r"alguém na máquina. Log em C:\Windows\Temp\SysprepStudio-tela-inicial.log.")


def tem_erro(avisos: list[dict]) -> bool:
    return any(a["nivel"] == "erro" for a in avisos)
