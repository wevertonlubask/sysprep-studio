"""Modelo do perfil de imagem.

O perfil e a fonte de verdade: o sysprep.xml, o manifesto do script de
preparo e o LEIA-ME sao sempre DERIVADOS dele, nunca editados a parte.
As senhas ficam em texto puro aqui (o perfil mora em ./dados, fora do git)
e so sao codificadas na hora de gerar o XML.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class Conta(BaseModel):
    nome: str = ""
    nome_exibicao: str = ""
    descricao: str = ""
    grupo: str = "Users"
    senha: str = ""


class Comando(BaseModel):
    descricao: str = ""
    comando: str = ""


class Licenca(BaseModel):
    # chave: grava <ProductKey>; oem: sem chave, usa a da firmware (MSDM)
    modo: Literal["chave", "oem"] = "oem"
    chave: str = ""
    # reforco: o <ProductKey> do specialize falha em silencio (edicao errada,
    # chave OEM da firmware prevalecendo); slmgr /ipk + /ato no 1o logon
    # instala de novo, ativa e deixa log em C:\Windows\Temp
    reforcar_no_primeiro_logon: bool = True


class InfoOEM(BaseModel):
    ativo: bool = False
    fabricante: str = ""
    modelo: str = ""
    horario_suporte: str = ""
    telefone_suporte: str = ""
    url_suporte: str = ""
    logo: str = ""  # nome do arquivo em imagens/ (convertido para BMP)


class Identidade(BaseModel):
    nome_computador_modo: Literal["aleatorio", "fixo"] = "aleatorio"
    nome_computador: str = ""
    proprietario: str = ""
    organizacao: str = ""
    oem: InfoOEM = Field(default_factory=InfoOEM)


class Regiao(BaseModel):
    idioma_interface: str = "pt-BR"
    localidade_sistema: str = "pt-BR"
    localidade_usuario: str = "pt-BR"
    teclado: str = "0416:00010416"
    fuso_horario: str = "E. South America Standard Time"


class AutoLogon(BaseModel):
    ativo: bool = False
    usuario: str = ""
    quantidade: int = 1


class Contas(BaseModel):
    locais: list[Conta] = Field(default_factory=list)
    admin_embutido_ativo: bool = False
    admin_embutido_senha: str = ""
    autologon: AutoLogon = Field(default_factory=AutoLogon)
    senhas_nao_expiram: bool = False


class OOBE(BaseModel):
    ocultar_eula: bool = True
    ocultar_conta_local: bool = True
    ocultar_registro_oem: bool = True
    ocultar_contas_online: bool = True
    ocultar_wifi: bool = True
    proteger_pc: Literal[1, 2, 3] = 3
    local_rede: Literal["Work", "Home", "Other"] = "Work"
    pular_oobe_maquina: bool = True
    pular_oobe_usuario: bool = True
    dispensar_internet: bool = True
    ocultar_privacidade: bool = True
    sem_animacao_primeiro_logon: bool = True
    sem_scoobe: bool = True


class Firewall(BaseModel):
    dominio: bool = True
    privado: bool = True
    publico: bool = True
    grupos_liberados: list[str] = Field(default_factory=list)


class Ingresso(BaseModel):
    modo: Literal["nenhum", "grupo_trabalho", "dominio"] = "nenhum"
    grupo_trabalho: str = "WORKGROUP"
    dominio: str = ""
    usuario: str = ""
    senha: str = ""
    ou: str = ""


class Rede(BaseModel):
    rdp_ativo: bool = False
    rdp_nla: bool = True
    rdp_tls: bool = True
    winrm_ativo: bool = False
    firewall: Firewall = Field(default_factory=Firewall)
    ingresso: Ingresso = Field(default_factory=Ingresso)


class RedeWifi(BaseModel):
    ssid: str = ""
    # wpa2: WPA2-Pessoal (conecta tambem em rede WPA2/WPA3 mista) | wpa3: so SAE
    seguranca: Literal["wpa2", "wpa3", "aberta"] = "wpa2"
    senha: str = ""
    oculta: bool = False  # SSID nao transmitido: o Windows procura ativamente
    conectar_auto: bool = True


class Wifi(BaseModel):
    # a ordem da lista e a prioridade de conexao (primeira = preferida)
    redes: list[RedeWifi] = Field(default_factory=list)


class LocalTela(BaseModel):
    codigo: str = ""  # entra no {local} do nome, ex.: "FIN"
    nome: str = ""    # o que o tecnico ve na lista, ex.: "Financeiro"
    ou: str = ""      # vazio = a OU da unidade


class UnidadeTela(BaseModel):
    codigo: str = ""  # entra no {unidade} do nome, ex.: "SP"
    nome: str = ""
    ou: str = ""      # vazio = a OU de Rede > dominio
    locais: list[LocalTela] = Field(default_factory=list)


class TelaInicial(BaseModel):
    """Tela no 1o logon da maquina clonada: o tecnico escolhe unidade, local
    e numero do PC, e a maquina recebe o nome do padrao (e entra no dominio
    ja com ele, na OU do local)."""
    ativo: bool = False
    conta: str = ""  # conta local administradora do logon automatico unico
    padrao_nome: str = "{unidade}{local}PC{pc}"
    digitos_pc: Literal[1, 2, 3] = 2
    rotulo_unidade: str = "Unidade"
    rotulo_local: str = "Setor"
    permitir_pular: bool = True
    unidades: list[UnidadeTela] = Field(default_factory=list)


class Personalizacao(BaseModel):
    # padrao: nada e tocado | inicial: aplicado 1x, usuario pode trocar
    # fixo: travado por politica (PersonalizationCSP)
    papel_parede_modo: Literal["padrao", "inicial", "fixo"] = "padrao"
    papel_parede: str = ""
    tela_bloqueio_modo: Literal["padrao", "fixo"] = "padrao"
    tela_bloqueio: str = ""
    desativar_spotlight: bool = False
    login_sem_desfoque: bool = False
    # a imagem da tela de bloqueio tambem atras do campo de senha
    imagem_na_tela_login: bool = True
    tema: Literal["padrao", "claro", "escuro"] = "padrao"
    barra_alinhamento: Literal["padrao", "esquerda"] = "padrao"
    busca_barra: Literal["padrao", "oculta", "icone", "caixa"] = "padrao"
    ocultar_visao_tarefas: bool = False
    ocultar_widgets: bool = False
    ocultar_chat: bool = False
    ocultar_recomendados_iniciar: bool = False
    mostrar_extensoes: bool = False
    mostrar_ocultos: bool = False
    icone_este_computador: bool = False
    explorer_abre_este_computador: bool = False
    menu_contexto_classico: bool = False
    copy_profile: bool = False


class Exibicao(BaseModel):
    # "" = a recomendada de cada monitor (nativa) | "LxA", ex.: "1920x1080"
    resolucao: str = ""
    # varias telas: duplicar (projetor de sala) ou estender
    telas: Literal["padrao", "duplicar", "estender"] = "padrao"
    # True: reaplica em todo logon (HKLM Run) | False: so no 1o logon (RunOnce)
    sempre: bool = True
    # escala em %; 0 = a recomendada pelo Windows
    escala: Literal[0, 100, 125, 150, 175, 200] = 0
    # "Tamanho do texto" da Acessibilidade, em %; 100 = padrao
    tamanho_texto: Literal[100, 115, 125, 150, 175, 200] = 100


class Privacidade(BaseModel):
    telemetria: Literal["padrao", "obrigatoria", "desligada"] = "padrao"
    desativar_id_publicidade: bool = False
    desativar_apps_sugeridos: bool = False
    desativar_dicas_usuario: bool = False
    desativar_pesquisa_web: bool = False
    desativar_historico_atividades: bool = False
    desativar_localizacao: bool = False
    desativar_copilot_politica: bool = False


class Apps(BaseModel):
    remover: list[str] = Field(default_factory=list)
    remover_extras: list[str] = Field(default_factory=list)
    remover_onedrive: bool = False
    recursos_ativar: list[str] = Field(default_factory=list)
    recursos_desativar: list[str] = Field(default_factory=list)
    edge_sem_primeira_execucao: bool = False
    edge_pagina_inicial: str = ""


class Energia(BaseModel):
    plano: Literal["padrao", "equilibrado", "alto_desempenho"] = "padrao"
    desativar_hibernacao: bool = False
    desativar_inicializacao_rapida: bool = False
    # minutos na tomada; None = nao mexe, 0 = nunca
    desligar_tela_min: int | None = None
    suspender_min: int | None = None


class Atualizacoes(BaseModel):
    politica: Literal["padrao", "notificar", "desativar_automatica"] = "padrao"
    sem_reinicio_com_usuario: bool = False
    loja_sem_atualizacao_automatica: bool = False


class Seguranca(BaseModel):
    impedir_bitlocker_automatico: bool = False
    uac: Literal["padrao", "sem_prompt_admin"] = "padrao"
    desativar_smartscreen: bool = False
    desativar_hello_empresarial: bool = False
    caminhos_longos: bool = False


class Sysprep(BaseModel):
    arquitetura: Literal["amd64", "arm64"] = "amd64"
    entrar_em: Literal["oobe", "audit"] = "oobe"
    ao_final: Literal["desligar", "reiniciar", "nada"] = "desligar"
    modo_vm: bool = False
    manter_drivers: bool = False
    pular_rearm: bool = False
    # o script de preparo desabilita wuauserv/UsoSvc; isto os devolve no specialize
    restaurar_windows_update: bool = True


class Comandos(BaseModel):
    especializacao: list[Comando] = Field(default_factory=list)
    primeiro_logon: list[Comando] = Field(default_factory=list)


class Variavel(BaseModel):
    """Variavel de ambiente gravada pelo script de preparo, em auditoria.
    O generalize preserva o registro: ela chega pronta em cada clone."""
    nome: str = ""
    valor: str = ""
    # maquina: Session Manager\Environment (todos os usuarios)
    # usuario: HKCU\Environment do auditor + perfil Default (contas novas)
    escopo: Literal["maquina", "usuario"] = "maquina"
    # True: junta ao valor atual (lista com ";", ex.: Path) sem repetir itens
    acrescentar: bool = False


class Perfil(BaseModel):
    nome: str = "Novo perfil"
    descricao: str = ""
    licenca: Licenca = Field(default_factory=Licenca)
    identidade: Identidade = Field(default_factory=Identidade)
    regiao: Regiao = Field(default_factory=Regiao)
    contas: Contas = Field(default_factory=Contas)
    oobe: OOBE = Field(default_factory=OOBE)
    rede: Rede = Field(default_factory=Rede)
    wifi: Wifi = Field(default_factory=Wifi)
    tela_inicial: TelaInicial = Field(default_factory=TelaInicial)
    personalizacao: Personalizacao = Field(default_factory=Personalizacao)
    exibicao: Exibicao = Field(default_factory=Exibicao)
    privacidade: Privacidade = Field(default_factory=Privacidade)
    apps: Apps = Field(default_factory=Apps)
    energia: Energia = Field(default_factory=Energia)
    atualizacoes: Atualizacoes = Field(default_factory=Atualizacoes)
    seguranca: Seguranca = Field(default_factory=Seguranca)
    sysprep: Sysprep = Field(default_factory=Sysprep)
    comandos: Comandos = Field(default_factory=Comandos)
    variaveis: list[Variavel] = Field(default_factory=list)
