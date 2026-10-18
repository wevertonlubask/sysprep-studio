// Espelho de backend/app/modelo.py. Mantenha os dois em sincronia.

export interface Conta {
  nome: string;
  nome_exibicao: string;
  descricao: string;
  grupo: string;
  senha: string;
}

export interface Comando {
  descricao: string;
  comando: string;
}

export interface RedeWifi {
  ssid: string;
  seguranca: "wpa2" | "wpa3" | "aberta";
  senha: string;
  oculta: boolean;
  conectar_auto: boolean;
}

export interface LocalTela {
  codigo: string;
  nome: string;
  ou: string;
}

export interface UnidadeTela {
  codigo: string;
  nome: string;
  ou: string;
  locais: LocalTela[];
}

export interface Perfil {
  nome: string;
  descricao: string;
  licenca: { modo: "chave" | "oem"; chave: string; reforcar_no_primeiro_logon: boolean };
  identidade: {
    nome_computador_modo: "aleatorio" | "fixo";
    nome_computador: string;
    proprietario: string;
    organizacao: string;
    oem: {
      ativo: boolean;
      fabricante: string;
      modelo: string;
      horario_suporte: string;
      telefone_suporte: string;
      url_suporte: string;
      logo: string;
    };
  };
  regiao: {
    idioma_interface: string;
    localidade_sistema: string;
    localidade_usuario: string;
    teclado: string;
    fuso_horario: string;
  };
  contas: {
    locais: Conta[];
    admin_embutido_ativo: boolean;
    admin_embutido_senha: string;
    autologon: { ativo: boolean; usuario: string; quantidade: number };
    senhas_nao_expiram: boolean;
  };
  oobe: {
    ocultar_eula: boolean;
    ocultar_conta_local: boolean;
    ocultar_registro_oem: boolean;
    ocultar_contas_online: boolean;
    ocultar_wifi: boolean;
    proteger_pc: 1 | 2 | 3;
    local_rede: "Work" | "Home" | "Other";
    pular_oobe_maquina: boolean;
    pular_oobe_usuario: boolean;
    dispensar_internet: boolean;
    ocultar_privacidade: boolean;
    sem_animacao_primeiro_logon: boolean;
    sem_scoobe: boolean;
  };
  rede: {
    rdp_ativo: boolean;
    rdp_nla: boolean;
    rdp_tls: boolean;
    winrm_ativo: boolean;
    firewall: { dominio: boolean; privado: boolean; publico: boolean; grupos_liberados: string[] };
    ingresso: {
      modo: "nenhum" | "grupo_trabalho" | "dominio";
      grupo_trabalho: string;
      dominio: string;
      usuario: string;
      senha: string;
      ou: string;
    };
  };
  wifi: { redes: RedeWifi[] };
  tela_inicial: {
    ativo: boolean;
    conta: string;
    padrao_nome: string;
    digitos_pc: 1 | 2 | 3;
    rotulo_unidade: string;
    rotulo_local: string;
    permitir_pular: boolean;
    unidades: UnidadeTela[];
  };
  personalizacao: {
    papel_parede_modo: "padrao" | "inicial" | "fixo";
    papel_parede: string;
    tela_bloqueio_modo: "padrao" | "fixo";
    tela_bloqueio: string;
    desativar_spotlight: boolean;
    login_sem_desfoque: boolean;
    imagem_na_tela_login: boolean;
    tema: "padrao" | "claro" | "escuro";
    barra_alinhamento: "padrao" | "esquerda";
    busca_barra: "padrao" | "oculta" | "icone" | "caixa";
    ocultar_visao_tarefas: boolean;
    ocultar_widgets: boolean;
    ocultar_chat: boolean;
    ocultar_recomendados_iniciar: boolean;
    mostrar_extensoes: boolean;
    mostrar_ocultos: boolean;
    icone_este_computador: boolean;
    explorer_abre_este_computador: boolean;
    menu_contexto_classico: boolean;
    copy_profile: boolean;
  };
  exibicao: {
    resolucao: string;
    telas: "padrao" | "duplicar" | "estender";
    sempre: boolean;
    escala: 0 | 100 | 125 | 150 | 175 | 200;
    tamanho_texto: 100 | 115 | 125 | 150 | 175 | 200;
  };
  privacidade: {
    telemetria: "padrao" | "obrigatoria" | "desligada";
    desativar_id_publicidade: boolean;
    desativar_apps_sugeridos: boolean;
    desativar_dicas_usuario: boolean;
    desativar_pesquisa_web: boolean;
    desativar_historico_atividades: boolean;
    desativar_localizacao: boolean;
    desativar_copilot_politica: boolean;
  };
  apps: {
    remover: string[];
    remover_extras: string[];
    remover_onedrive: boolean;
    recursos_ativar: string[];
    recursos_desativar: string[];
    edge_sem_primeira_execucao: boolean;
    edge_pagina_inicial: string;
  };
  energia: {
    plano: "padrao" | "equilibrado" | "alto_desempenho";
    desativar_hibernacao: boolean;
    desativar_inicializacao_rapida: boolean;
    desligar_tela_min: number | null;
    suspender_min: number | null;
  };
  atualizacoes: {
    politica: "padrao" | "notificar" | "desativar_automatica";
    sem_reinicio_com_usuario: boolean;
    loja_sem_atualizacao_automatica: boolean;
  };
  seguranca: {
    impedir_bitlocker_automatico: boolean;
    uac: "padrao" | "sem_prompt_admin";
    desativar_smartscreen: boolean;
    desativar_hello_empresarial: boolean;
    caminhos_longos: boolean;
  };
  sysprep: {
    arquitetura: "amd64" | "arm64";
    entrar_em: "oobe" | "audit";
    ao_final: "desligar" | "reiniciar" | "nada";
    modo_vm: boolean;
    manter_drivers: boolean;
    pular_rearm: boolean;
    restaurar_windows_update: boolean;
  };
  comandos: { especializacao: Comando[]; primeiro_logon: Comando[] };
}

export interface ItemCatalogo {
  id: string;
  nome: string;
  grupo?: string;
  nota?: string;
  padrao_lab?: boolean;
  acao?: "ativar" | "desativar";
}

export interface Catalogo {
  apps: ItemCatalogo[];
  recursos: ItemCatalogo[];
  fusos: ItemCatalogo[];
  idiomas: ItemCatalogo[];
  teclados: ItemCatalogo[];
  chaves_genericas: ItemCatalogo[];
  grupos_firewall: ItemCatalogo[];
  grupos_conta: ItemCatalogo[];
}

export interface Aviso {
  nivel: "erro" | "aviso" | "info";
  secao: string;
  mensagem: string;
}

export interface InfoImagem {
  arquivo: string;
  largura: number;
  altura: number;
  tamanho: number;
}

export interface InfoDriver {
  arquivo: string;
  tamanho: number;
}

export interface ResumoPerfil {
  id: string;
  nome: string;
  descricao: string;
  atualizado_em: string;
}

export interface Previa {
  xml: string;
  validacao: Aviso[];
  manifesto: unknown;
}
