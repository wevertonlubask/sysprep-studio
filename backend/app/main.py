"""API do Sysprep Studio + frontend estatico."""

from __future__ import annotations

import mimetypes
import os
import queue
import threading
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Iterator, Literal

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import armazenamento as arm
from . import catalogo, gerador_xml, importador, pacote
from .modelo import Conta, Perfil
from .validacao import tem_erro, validar

app = FastAPI(title="Sysprep Studio")


def _ler(id_: str) -> Perfil:
    try:
        return arm.ler(id_)
    except arm.NaoEncontrado:
        raise HTTPException(404, "Perfil não encontrado.")


def _modelo(tipo: str, nome: str) -> Perfil:
    p = Perfil(nome=nome)
    p.contas.locais.append(Conta(nome="Suporte", nome_exibicao="Suporte",
                                 descricao="Conta administrativa de suporte tecnico", grupo="Administrators"))
    if tipo == "laboratorio":
        p.apps.remover = [a["id"] for a in catalogo.APPS if a["padrao_lab"]]
        p.privacidade = p.privacidade.model_copy(update={
            "desativar_id_publicidade": True, "desativar_apps_sugeridos": True, "desativar_dicas_usuario": True,
            "desativar_pesquisa_web": True, "desativar_historico_atividades": True,
        })
        p.personalizacao.mostrar_extensoes = True
        p.seguranca.impedir_bitlocker_automatico = True
        p.energia.plano = "alto_desempenho"
        p.energia.desativar_hibernacao = True
        p.apps.edge_sem_primeira_execucao = True
    else:
        # mesmo no modelo "limpo": sem isto o Sysprep do Windows 11 costuma falhar
        p.apps.remover = ["Microsoft.WidgetsPlatformRuntime"]
    return p


# ------------------------------------------------------------------ catalogo

@app.get("/api/catalogo")
def get_catalogo():
    return catalogo.tudo()


# ------------------------------------------------------------------ perfis

class NovoPerfil(BaseModel):
    nome: str
    modelo: Literal["padrao", "laboratorio"] = "padrao"


class Nome(BaseModel):
    nome: str


@app.get("/api/perfis")
def listar():
    return arm.listar()


@app.post("/api/perfis", status_code=201)
def criar(dados: NovoPerfil):
    return {"id": arm.criar(_modelo(dados.modelo, dados.nome.strip() or "Novo perfil"))}


@app.post("/api/perfis/importar", status_code=201)
async def importar(arquivo: UploadFile = File(...), nome: str = Form("")):
    conteudo = await arquivo.read()
    try:
        perfil = importador.importar(conteudo, nome.strip() or Path(arquivo.filename or "Importado").stem)
    except importador.XMLInvalido as e:
        raise HTTPException(422, str(e))
    return {"id": arm.criar(perfil)}


@app.get("/api/perfis/{id_}")
def obter(id_: str):
    perfil = _ler(id_)
    return {"id": id_, "perfil": perfil, "imagens": _info_imagens(id_), "drivers": arm.drivers(id_)}


@app.put("/api/perfis/{id_}")
def atualizar(id_: str, perfil: Perfil):
    _ler(id_)
    arm.salvar(id_, perfil)
    return {"ok": True}


@app.delete("/api/perfis/{id_}", status_code=204)
def excluir(id_: str):
    try:
        arm.excluir(id_)
    except arm.NaoEncontrado:
        raise HTTPException(404, "Perfil não encontrado.")


@app.post("/api/perfis/{id_}/renomear")
def renomear(id_: str, dados: Nome):
    nome = dados.nome.strip()
    if not nome:
        raise HTTPException(422, "Informe um nome.")
    _ler(id_)
    arm.renomear(id_, nome)
    return {"ok": True}


@app.post("/api/perfis/{id_}/duplicar", status_code=201)
def duplicar(id_: str, dados: Nome):
    _ler(id_)
    return {"id": arm.duplicar(id_, dados.nome.strip() or "Copia")}


# ------------------------------------------------------------------ imagens

def _info_imagens(id_: str) -> dict:
    return {nome: arm.info_imagem(id_, nome) for nome in sorted(arm.imagens(id_))}


@app.post("/api/perfis/{id_}/imagens/{slot}")
async def enviar_imagem(id_: str, slot: str, arquivo: UploadFile = File(...)):
    _ler(id_)
    try:
        return arm.salvar_imagem(id_, slot, await arquivo.read())
    except arm.ImagemInvalida as e:
        raise HTTPException(422, str(e))


@app.get("/api/perfis/{id_}/imagens/{arquivo}")
def ver_imagem(id_: str, arquivo: str):
    _ler(id_)
    caminho = arm.pasta_imagens(id_) / Path(arquivo).name
    if not caminho.exists():
        raise HTTPException(404, "Imagem não encontrada.")
    return FileResponse(caminho, headers={"Cache-Control": "no-store"})


# ------------------------------------------------------------------ drivers

@app.get("/api/perfis/{id_}/drivers")
def listar_drivers(id_: str):
    _ler(id_)
    return arm.drivers(id_)


@app.put("/api/perfis/{id_}/drivers/{nome}")
async def enviar_driver(id_: str, nome: str, request: Request):
    """Corpo cru (nao multipart): o pacote vai direto para o disco, sem copia temporaria."""
    _ler(id_)
    try:
        return await arm.salvar_driver(id_, nome, request.stream())
    except arm.DriverInvalido as e:
        raise HTTPException(422, str(e))


@app.delete("/api/perfis/{id_}/drivers/{nome}", status_code=204)
def excluir_driver(id_: str, nome: str):
    _ler(id_)
    try:
        arm.excluir_driver(id_, nome)
    except arm.NaoEncontrado:
        raise HTTPException(404, "Pacote de drivers não encontrado.")


# ------------------------------------------------------------------ geracao

@app.post("/api/perfis/{id_}/previa")
def previa(id_: str, perfil: Perfil):
    """Previa do estado AINDA NAO SALVO do editor."""
    _ler(id_)
    return {
        "xml": gerador_xml.gerar(perfil),
        "validacao": validar(perfil, arm.imagens(id_), arm.drivers(id_)),
        "manifesto": pacote.manifesto(perfil, datetime.now(), arm.drivers(id_)),
    }


def _gerar_ou_422(id_: str) -> Perfil:
    perfil = _ler(id_)
    avisos = validar(perfil, arm.imagens(id_), arm.drivers(id_))
    if tem_erro(avisos):
        raise HTTPException(422, {"mensagem": "Corrija os erros antes de gerar.", "validacao": avisos})
    return perfil


# Com drivers o ZIP passa de GBs. Ele e montado enquanto e enviado, sem
# arquivo temporario: gravar GBs no compartilhamento Windows/WSL era lento
# (~12 MB/s), e no /tmp do container inchava o disco virtual do Docker ate
# lotar o disco do host.
_FIM = object()
LOTE = 1024**2


def _transmitir_zip(perfil: Perfil, id_: str) -> Iterator[bytes]:
    """Roda o escrever_zip numa thread e entrega o ZIP em lotes de 1 MB. A
    fila limitada segura a thread quando o navegador baixa mais devagar."""
    fila: queue.Queue = queue.Queue(maxsize=32)
    cancelado = threading.Event()

    def por(item) -> None:
        while not cancelado.is_set():
            try:
                fila.put(item, timeout=1)
                return
            except queue.Full:
                pass
        raise OSError("download cancelado")

    class Saida:
        """So write(): o ZipFile ve que nao da para voltar (seek) e grava
        os tamanhos depois de cada arquivo (data descriptor)."""

        def __init__(self):
            self.buf = bytearray()

        def write(self, dados) -> int:
            self.buf += dados
            if len(self.buf) >= LOTE:
                self.esvaziar()
            return len(dados)

        def esvaziar(self) -> None:
            if self.buf:
                por(bytes(self.buf))
                self.buf.clear()

        def flush(self) -> None:
            pass

    def produzir() -> None:
        try:
            saida = Saida()
            pacote.escrever_zip(saida, perfil, arm.pasta_imagens(id_), pasta_drivers=arm.pasta_drivers(id_))
            saida.esvaziar()
            por(_FIM)
        except BaseException as e:  # noqa: BLE001 - repassado ao consumidor
            if not cancelado.is_set():
                por(e)

    threading.Thread(target=produzir, daemon=True).start()
    try:
        while (item := fila.get()) is not _FIM:
            if isinstance(item, BaseException):
                raise item
            yield item
    finally:
        # navegador fechou/cancelou: a thread para no proximo write
        cancelado.set()


def _resposta_zip(id_: str) -> StreamingResponse:
    perfil = _gerar_ou_422(id_)
    nome = f"{pacote.nome_pasta(perfil)}.zip"
    return StreamingResponse(_transmitir_zip(perfil, id_), media_type="application/zip",
                             headers={"Content-Disposition": f'attachment; filename="{nome}"'})


@app.get("/api/perfis/{id_}/pacote")
def baixar_pacote(id_: str):
    return _resposta_zip(id_)


PRONTOS: dict[str, tuple[str, float]] = {}


@app.post("/api/perfis/{id_}/pacote")
def preparar_pacote(id_: str):
    """Valida e devolve um link de download direto: o navegador grava em
    disco (com a barra de progresso dele), sem passar GBs por um Blob."""
    perfil = _gerar_ou_422(id_)
    agora = time.time()
    for t, (_, criado) in list(PRONTOS.items()):
        if agora - criado > 600:
            PRONTOS.pop(t, None)
    token = uuid.uuid4().hex
    PRONTOS[token] = (id_, agora)
    pasta = arm.pasta_imagens(id_)
    imagens = sum(f.stat().st_size for f in pasta.iterdir()) if pasta.is_dir() else 0
    # estimativa: drivers vao sem compressao e dominam o tamanho
    tamanho = sum(d["tamanho"] for d in arm.drivers(id_)) + imagens
    return {"url": f"/api/downloads/{token}", "nome": f"{pacote.nome_pasta(perfil)}.zip", "tamanho": tamanho}


@app.get("/api/downloads/{token}")
def baixar_preparado(token: str):
    item = PRONTOS.pop(token, None)
    if not item:
        raise HTTPException(404, "Download expirado. Gere o pacote de novo.")
    return _resposta_zip(item[0])


@app.get("/api/perfis/{id_}/xml")
def baixar_xml(id_: str):
    perfil = _gerar_ou_422(id_)
    return Response(gerador_xml.gerar(perfil), media_type="application/xml",
                    headers={"Content-Disposition": 'attachment; filename="sysprep.xml"'})


@app.get("/api/saude")
def saude():
    return {"ok": True}


# ------------------------------------------------------------------ frontend

ESTATICO = Path(os.environ.get("SYSPREP_STUDIO_WEB", Path(__file__).resolve().parents[2] / "frontend" / "dist"))
# PWA: o Python nao conhece .webmanifest (sairia como text/plain)
mimetypes.add_type("application/manifest+json", ".webmanifest")
SEM_CACHE = {"sw.js", "manifest.webmanifest"}

if ESTATICO.exists():
    app.mount("/assets", StaticFiles(directory=ESTATICO / "assets"), name="assets")

    @app.get("/{caminho:path}", include_in_schema=False)
    def spa(caminho: str):
        if caminho.startswith("api/"):
            raise HTTPException(404, "Rota da API inexistente.")
        arq = ESTATICO / caminho
        if caminho and arq.is_file() and ESTATICO in arq.resolve().parents:
            # sw.js e o manifesto sem cache: e por eles que o PWA instalado percebe um deploy novo
            sem_cache = caminho in SEM_CACHE
            return FileResponse(arq, headers={"Cache-Control": "no-cache"} if sem_cache else None)
        # no-cache: o index.html aponta para o bundle com hash; guardado em
        # cache, o navegador seguiria com a versao anterior depois de um deploy
        return FileResponse(ESTATICO / "index.html", headers={"Cache-Control": "no-cache"})
