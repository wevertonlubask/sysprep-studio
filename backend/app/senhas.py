"""Codificacao de senhas do unattend.

O Setup espera Base64 de UTF-16LE da senha COM um sufixo literal colado
no final e remove esse sufixo ao aplicar. Gerar sem o sufixo faz o Setup
comer os ultimos caracteres da senha real (erro classico, ver legado).

    LocalAccount / AutoLogon  -> sufixo "Password"
    AdministratorPassword     -> sufixo "AdministratorPassword"
"""

import base64
import binascii

SUFIXO_CONTA = "Password"
SUFIXO_ADMIN = "AdministratorPassword"


def codificar(senha: str, sufixo: str = SUFIXO_CONTA) -> str:
    return base64.b64encode((senha + sufixo).encode("utf-16-le")).decode("ascii")


def decodificar(valor: str, texto_puro: bool, sufixo: str = SUFIXO_CONTA) -> str:
    if texto_puro:
        return valor
    try:
        texto = base64.b64decode(valor).decode("utf-16-le")
    except (binascii.Error, UnicodeDecodeError, ValueError):
        return ""
    return texto[: -len(sufixo)] if texto.endswith(sufixo) else texto
