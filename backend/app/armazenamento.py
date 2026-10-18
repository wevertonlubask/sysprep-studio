"""Perfis em disco: dados/perfis/<id>/perfil.json + imagens/ + drivers/.

JSON simples de proposito: e uma ferramenta local de uma pessoa, e o
arquivo pode ser copiado/inspecionado a mao. A pasta dados/ fica fora do
git (contem senhas em texto puro).
"""

from __future__ import annotations

import io
import json
import os
import re
import shutil
import unicodedata
import uuid
from collections.abc import AsyncIterator
from datetime import datetime
from pathlib import Path

from PIL import Image, UnidentifiedImageError

from .modelo import Perfil

DADOS = Path(os.environ.get("SYSPREP_STUDIO_DADOS", Path(__file__).resolve().parents[2] / "dados"))
PERFIS = DADOS / "perfis"
RE_ID = re.compile(r"^[a-f0-9]{8}$")
LIMITE_IMAGEM = 25 * 1024 * 1024
SLOTS = {"papel_parede", "tela_bloqueio", "logo_oem"}
FORMATOS = {"JPEG": "jpg", "PNG": "png", "BMP": "bmp"}
# Pacote de drivers vai inteiro para o ZIP e e extraido pelo script, no
# Windows: o servidor (Linux, no Docker) nao roda o .exe autoextraivel.
ASSINATURAS = {".cab": b"MSCF", ".zip": b"PK\x03\x04", ".exe": b"MZ"}


class NaoEncontrado(KeyError):
    pass


class ImagemInvalida(ValueError):
    pass


class DriverInvalido(ValueError):
    pass


def _pasta(id_: str) -> Path:
    if not RE_ID.match(id_):
        raise NaoEncontrado(id_)
    return PERFIS / id_


def listar() -> list[dict]:
    PERFIS.mkdir(parents=True, exist_ok=True)
    itens = []
    for arq in PERFIS.glob("*/perfil.json"):
        dados = json.loads(arq.read_text(encoding="utf-8"))
        itens.append({"id": arq.parent.name, "nome": dados.get("nome", ""),
                      "descricao": dados.get("descricao", ""),
                      "atualizado_em": datetime.fromtimestamp(arq.stat().st_mtime).isoformat(timespec="seconds")})
    return sorted(itens, key=lambda x: x["atualizado_em"], reverse=True)


def ler(id_: str) -> Perfil:
    arq = _pasta(id_) / "perfil.json"
    if not arq.exists():
        raise NaoEncontrado(id_)
    return Perfil.model_validate_json(arq.read_text(encoding="utf-8"))


def salvar(id_: str, perfil: Perfil) -> None:
    pasta = _pasta(id_)
    pasta.mkdir(parents=True, exist_ok=True)
    tmp = pasta / "perfil.json.tmp"
    tmp.write_text(perfil.model_dump_json(indent=2), encoding="utf-8")
    tmp.replace(pasta / "perfil.json")  # escrita atomica: nunca deixa JSON pela metade


def criar(perfil: Perfil) -> str:
    id_ = uuid.uuid4().hex[:8]
    salvar(id_, perfil)
    return id_


def excluir(id_: str) -> None:
    pasta = _pasta(id_)
    if not pasta.exists():
        raise NaoEncontrado(id_)
    shutil.rmtree(pasta)


def renomear(id_: str, nome: str) -> None:
    perfil = ler(id_)
    perfil.nome = nome
    salvar(id_, perfil)


def duplicar(id_: str, nome: str) -> str:
    perfil = ler(id_)
    perfil.nome = nome
    novo = criar(perfil)
    origem = pasta_imagens(id_)
    if origem.exists():
        shutil.copytree(origem, pasta_imagens(novo), dirs_exist_ok=True)
    origem = pasta_drivers(id_)
    if origem.exists():
        # hard link: pacotes de drivers tem GBs; copia so se o disco nao suportar
        shutil.copytree(origem, pasta_drivers(novo), dirs_exist_ok=True, copy_function=_link_ou_copia)
    return novo


def _link_ou_copia(origem: str, destino: str) -> None:
    try:
        os.link(origem, destino)
    except OSError:
        shutil.copy2(origem, destino)


def pasta_imagens(id_: str) -> Path:
    return _pasta(id_) / "imagens"


def imagens(id_: str) -> set[str]:
    pasta = pasta_imagens(id_)
    return {a.name for a in pasta.iterdir()} if pasta.exists() else set()


def info_imagem(id_: str, arquivo: str) -> dict | None:
    caminho = pasta_imagens(id_) / Path(arquivo).name
    if not caminho.exists():
        return None
    with Image.open(caminho) as im:
        return {"arquivo": caminho.name, "largura": im.width, "altura": im.height,
                "tamanho": caminho.stat().st_size}


def salvar_imagem(id_: str, slot: str, conteudo: bytes) -> dict:
    if slot not in SLOTS:
        raise ImagemInvalida(f"Destino desconhecido: {slot}")
    if len(conteudo) > LIMITE_IMAGEM:
        raise ImagemInvalida("Imagem maior que 25 MB.")
    try:
        im = Image.open(io.BytesIO(conteudo))
        im.load()
    except (UnidentifiedImageError, OSError) as e:
        raise ImagemInvalida("Arquivo não é uma imagem válida.") from e

    pasta = pasta_imagens(id_)
    pasta.mkdir(parents=True, exist_ok=True)
    for antigo in pasta.glob(f"{slot}.*"):
        antigo.unlink()

    if slot == "logo_oem":
        # O Windows so aceita BMP de ate 120x120 no OEMInformation/Logo
        im = im.convert("RGBA")
        im.thumbnail((120, 120))
        fundo = Image.new("RGB", (120, 120), "white")
        fundo.paste(im, ((120 - im.width) // 2, (120 - im.height) // 2), im)
        nome = "logo_oem.bmp"
        fundo.save(pasta / nome, "BMP")
    else:
        ext = FORMATOS.get(im.format or "")
        if not ext:
            raise ImagemInvalida("Use JPG, PNG ou BMP (formatos aceitos pelo Windows como fundo).")
        nome = f"{slot}.{ext}"
        (pasta / nome).write_bytes(conteudo)  # original, sem recompressao
    return info_imagem(id_, nome)


# ------------------------------------------------------------------ drivers

def pasta_drivers(id_: str) -> Path:
    return _pasta(id_) / "drivers"


def drivers(id_: str) -> list[dict]:
    return listar_drivers(pasta_drivers(id_))


def listar_drivers(pasta: Path) -> list[dict]:
    if not pasta.exists():
        return []
    return [{"arquivo": a.name, "tamanho": a.stat().st_size}
            for a in sorted(pasta.iterdir(), key=lambda a: a.name.lower())
            if a.is_file() and a.suffix.lower() in ASSINATURAS]


def nome_driver(nome: str) -> str:
    """Nome seguro para o pendrive e para o PowerShell: ASCII, sem espaco."""
    original = Path(nome.replace("\\", "/")).name
    ext = Path(original).suffix.lower()
    if ext not in ASSINATURAS:
        raise DriverInvalido("Envie o pacote de drivers como .cab, .zip ou .exe.")
    base = unicodedata.normalize("NFKD", Path(original).stem).encode("ascii", "ignore").decode()
    base = re.sub(r"[^A-Za-z0-9._-]+", "-", base).strip("-.")[:80] or "drivers"
    return base + ext


async def salvar_driver(id_: str, nome: str, corpo: AsyncIterator[bytes]) -> dict:
    """Grava em streaming: o pacote pode ter GBs e nao cabe na memoria."""
    nome = nome_driver(nome)
    pasta = pasta_drivers(id_)
    pasta.mkdir(parents=True, exist_ok=True)
    parcial = pasta / f"{nome}.parcial"
    inicio, total = b"", 0
    try:
        with parcial.open("wb") as f:
            async for bloco in corpo:
                if len(inicio) < 4:
                    inicio += bloco[:4]
                    if len(inicio) >= 4 and not inicio.startswith(ASSINATURAS[Path(nome).suffix]):
                        raise DriverInvalido(f"O conteúdo não é um arquivo {Path(nome).suffix} válido.")
                f.write(bloco)
                total += len(bloco)
        if not inicio.startswith(ASSINATURAS[Path(nome).suffix]):
            raise DriverInvalido("Arquivo vazio ou incompleto.")
        parcial.replace(pasta / nome)
    finally:
        parcial.unlink(missing_ok=True)
    return {"arquivo": nome, "tamanho": total}


def excluir_driver(id_: str, nome: str) -> None:
    caminho = pasta_drivers(id_) / Path(nome).name
    if not caminho.is_file():
        raise NaoEncontrado(nome)
    caminho.unlink()
