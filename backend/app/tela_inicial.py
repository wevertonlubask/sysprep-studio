"""Tela de configuracao inicial da maquina clonada.

Uma imagem so tem um sysprep.xml para todas as maquinas: o <ComputerName>
ou e aleatorio ou e o mesmo em todas. Para cada maquina nascer com o nome
do padrao do perfil (ex.: SPFINPC02), o ingresso no dominio sai
do unattend e passa para o Tela-Inicial.ps1:

1. o oobeSystem faz UM logon automatico na conta administradora escolhida;
2. o FirstLogonCommands abre a tela (o ultimo comando: ela reinicia);
3. o tecnico escolhe unidade, local e numero do PC;
4. Add-Computer -NewName -OUPath: o objeto ja nasce no AD com o nome certo,
   na OU do local, numa operacao so. Sem dominio, so renomeia;
5. desliga o logon automatico, apaga a configuracao (tem a senha do
   dominio) e reinicia.

"Pular" agenda a tela para o proximo logon da mesma conta.
"""

from __future__ import annotations

import json
import re

from .ajustes import SCRIPTS
from .modelo import LocalTela, Perfil, UnidadeTela

SCRIPT = "Tela-Inicial.ps1"
PASTA = rf"{SCRIPTS}\TelaInicial"
CONFIG = "config.json"
LOG = r"C:\Windows\Temp\SysprepStudio-tela-inicial.log"
CAMPOS = ("{unidade}", "{local}", "{pc}")
RE_CAMPO = re.compile(r"\{[^{}]*\}")


def ativa(p: Perfil) -> bool:
    return p.tela_inicial.ativo


def montar_nome(padrao: str, unidade: str, local: str, pc: int, digitos: int) -> str:
    """Mesma regra do Tela-Inicial.ps1 (MontarNome): troca literal e maiusculas."""
    return (padrao.replace("{unidade}", unidade.strip()).replace("{local}", local.strip())
            .replace("{pc}", str(pc).zfill(digitos)).upper())


def ou_do_local(p: Perfil, u: UnidadeTela, l: LocalTela) -> str:
    return (l.ou or u.ou or p.rede.ingresso.ou).strip()


def com_dominio(p: Perfil) -> bool:
    return p.rede.ingresso.modo == "dominio"


def config(p: Perfil) -> dict:
    t = p.tela_inicial
    ing = p.rede.ingresso
    dom = com_dominio(p)
    return {
        "padrao_nome": t.padrao_nome.strip(),
        "digitos_pc": t.digitos_pc,
        "rotulo_unidade": t.rotulo_unidade.strip() or "Unidade",
        "rotulo_local": t.rotulo_local.strip() or "Local",
        "permitir_pular": t.permitir_pular,
        "dominio": ing.dominio.strip() if dom else "",
        "usuario": ing.usuario.strip() if dom else "",
        "senha": ing.senha if dom else "",
        "unidades": [{
            "codigo": u.codigo.strip(),
            "nome": u.nome.strip() or u.codigo.strip(),
            "locais": [{"codigo": l.codigo.strip(), "nome": l.nome.strip() or l.codigo.strip(),
                        "ou": ou_do_local(p, u, l) if dom else ""} for l in u.locais],
        } for u in t.unidades],
    }


def arquivos(p: Perfil) -> list[tuple[str, str]]:
    """(nome, conteudo) dos arquivos restritos (so SYSTEM/Administradores)."""
    if not ativa(p):
        return []
    return [(CONFIG, json.dumps(config(p), ensure_ascii=False, indent=2))]


def comando() -> str:
    """FirstLogonCommands: roda na sessao do logon automatico, elevado."""
    return f"powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File {SCRIPTS}\\{SCRIPT}"
