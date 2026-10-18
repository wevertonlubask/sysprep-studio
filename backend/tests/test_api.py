import io
import zipfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image


@pytest.fixture
def cliente(tmp_path, monkeypatch):
    from app import armazenamento

    monkeypatch.setattr(armazenamento, "PERFIS", tmp_path / "perfis")
    from app.main import app

    return TestClient(app)


def test_pacote_transmitido_com_driver(cliente, monkeypatch):
    from app import armazenamento, main

    monkeypatch.setattr(main, "LOTE", 1000)  # forca varios lotes
    id_ = cliente.post("/api/perfis", json={"nome": "Lab", "modelo": "padrao"}).json()["id"]
    driver = bytes(range(256)) * 20_000  # ~5 MB, maior que um bloco de leitura
    pasta = armazenamento.pasta_drivers(id_)
    pasta.mkdir(parents=True, exist_ok=True)
    (pasta / "Modelo-X.cab").write_bytes(driver)

    r = cliente.post(f"/api/perfis/{id_}/pacote")
    assert r.status_code == 200 and r.json()["tamanho"] >= len(driver)
    r = cliente.get(r.json()["url"])
    assert r.status_code == 200
    assert 'filename="Imagem-Lab.zip"' in r.headers["content-disposition"]
    z = zipfile.ZipFile(io.BytesIO(r.content))
    assert z.testzip() is None
    assert z.read("Imagem-Lab/drivers/Modelo-X.cab") == driver
    assert z.getinfo("Imagem-Lab/drivers/Modelo-X.cab").compress_type == zipfile.ZIP_STORED
    # o link vale uma vez
    assert cliente.get(r.url).status_code == 404


def _png(w=1920, h=1080) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (w, h), "navy").save(buf, "PNG")
    return buf.getvalue()


def test_ciclo_completo(cliente):
    id_ = cliente.post("/api/perfis", json={"nome": "Lab", "modelo": "laboratorio"}).json()["id"]
    assert [p["nome"] for p in cliente.get("/api/perfis").json()] == ["Lab"]

    dados = cliente.get(f"/api/perfis/{id_}").json()
    perfil = dados["perfil"]
    assert perfil["contas"]["locais"][0]["nome"] == "Suporte"
    assert "Microsoft.Copilot" in perfil["apps"]["remover"]

    # sem senha -> so aviso; wallpaper fixo sem imagem -> erro que bloqueia o pacote
    perfil["personalizacao"]["papel_parede_modo"] = "fixo"
    perfil["personalizacao"]["papel_parede"] = "papel_parede.png"
    assert cliente.put(f"/api/perfis/{id_}", json=perfil).status_code == 200
    r = cliente.get(f"/api/perfis/{id_}/pacote")
    assert r.status_code == 422

    info = cliente.post(f"/api/perfis/{id_}/imagens/papel_parede",
                        files={"arquivo": ("x.png", _png(), "image/png")}).json()
    assert info == {"arquivo": "papel_parede.png", "largura": 1920, "altura": 1080, "tamanho": info["tamanho"]}

    previa = cliente.post(f"/api/perfis/{id_}/previa", json=perfil).json()
    assert "PersonalizationCSP" in previa["xml"]
    assert not [a for a in previa["validacao"] if a["nivel"] == "erro"]

    r = cliente.get(f"/api/perfis/{id_}/pacote")
    assert r.status_code == 200
    nomes = zipfile.ZipFile(io.BytesIO(r.content)).namelist()
    assert "Imagem-Lab/arquivos/papel_parede.png" in nomes

    assert cliente.post(f"/api/perfis/{id_}/renomear", json={"nome": "  "}).status_code == 422
    assert cliente.post(f"/api/perfis/{id_}/renomear", json={"nome": " Sala 07 "}).status_code == 200
    assert cliente.get(f"/api/perfis/{id_}").json()["perfil"]["nome"] == "Sala 07"
    assert cliente.post("/api/perfis/00000000/renomear", json={"nome": "X"}).status_code == 404

    novo = cliente.post(f"/api/perfis/{id_}/duplicar", json={"nome": "Lab 2"}).json()["id"]
    assert "papel_parede.png" in cliente.get(f"/api/perfis/{novo}").json()["imagens"]

    assert cliente.delete(f"/api/perfis/{id_}").status_code == 204
    assert cliente.get(f"/api/perfis/{id_}").status_code == 404


def test_logo_oem_vira_bmp_120(cliente):
    id_ = cliente.post("/api/perfis", json={"nome": "X"}).json()["id"]
    info = cliente.post(f"/api/perfis/{id_}/imagens/logo_oem",
                        files={"arquivo": ("l.png", _png(500, 300), "image/png")}).json()
    assert (info["arquivo"], info["largura"], info["altura"]) == ("logo_oem.bmp", 120, 120)


def test_upload_invalido(cliente):
    id_ = cliente.post("/api/perfis", json={"nome": "X"}).json()["id"]
    r = cliente.post(f"/api/perfis/{id_}/imagens/papel_parede", files={"arquivo": ("a.txt", b"oi", "text/plain")})
    assert r.status_code == 422
    r = cliente.post(f"/api/perfis/{id_}/imagens/qualquer", files={"arquivo": ("a.png", _png(), "image/png")})
    assert r.status_code == 422


def test_importar_xml(cliente):
    xml = (Path(__file__).parent / "fixtures" / "legado_sanitizado.xml").read_bytes()
    id_ = cliente.post("/api/perfis/importar", files={"arquivo": ("sysprep.xml", xml, "text/xml")},
                       data={"nome": "Estacao 07"}).json()["id"]
    perfil = cliente.get(f"/api/perfis/{id_}").json()["perfil"]
    assert perfil["nome"] == "Estacao 07"
    assert len(perfil["contas"]["locais"]) == 2
    r = cliente.post("/api/perfis/importar", files={"arquivo": ("a.xml", b"<x/>", "text/xml")})
    assert r.status_code == 422


def test_id_malicioso(cliente):
    assert cliente.get("/api/perfis/..%2F..%2Fetc").status_code == 404
    assert cliente.get("/api/perfis/zzzzzzzz").status_code == 404


def test_drivers_envio_pacote_e_exclusao(cliente):
    id_ = cliente.post("/api/perfis", json={"nome": "Lab Dell"}).json()["id"]
    perfil = cliente.get(f"/api/perfis/{id_}").json()["perfil"]
    perfil["contas"]["locais"][0]["senha"] = "x1"
    assert cliente.put(f"/api/perfis/{id_}", json=perfil).status_code == 200

    cab = b"MSCF" + b"\0" * 1000
    r = cliente.put(f"/api/perfis/{id_}/drivers/Latitude 3420 Win11 (A05).CAB", content=cab)
    assert r.json() == {"arquivo": "Latitude-3420-Win11-A05.cab", "tamanho": len(cab)}
    assert cliente.put(f"/api/perfis/{id_}/drivers/x.cab", content=b"PK\x03\x04nao-e-cab").status_code == 422
    assert cliente.put(f"/api/perfis/{id_}/drivers/x.msi", content=b"MZ").status_code == 422
    assert cliente.put(f"/api/perfis/{id_}/drivers/OptiPlex.zip", content=b"PK\x03\x04" + b"z" * 10).status_code == 200
    assert [d["arquivo"] for d in cliente.get(f"/api/perfis/{id_}").json()["drivers"]] == [
        "Latitude-3420-Win11-A05.cab", "OptiPlex.zip"]

    perfil["sysprep"]["manter_drivers"] = True
    previa = cliente.post(f"/api/perfis/{id_}/previa", json=perfil).json()
    assert [d["origem"] for d in previa["manifesto"]["drivers"]] == [
        "drivers/Latitude-3420-Win11-A05.cab", "drivers/OptiPlex.zip"]
    assert any("PersistAllDeviceInstalls" in a["mensagem"] for a in previa["validacao"] if a["nivel"] == "aviso")

    pronto = cliente.post(f"/api/perfis/{id_}/pacote").json()
    r = cliente.get(pronto["url"])
    # tamanho e estimativa (drivers + imagens): o ZIP soma os cabecalhos e textos
    assert r.status_code == 200 and len(r.content) >= pronto["tamanho"]
    z = zipfile.ZipFile(io.BytesIO(r.content))
    info = z.getinfo("Imagem-Lab-Dell/drivers/Latitude-3420-Win11-A05.cab")
    assert info.compress_type == zipfile.ZIP_STORED and z.read(info) == cab
    assert "Latitude-3420-Win11-A05.cab" in z.read("Imagem-Lab-Dell/LEIA-ME.txt").decode("utf-8-sig")
    assert cliente.get(pronto["url"]).status_code == 404  # link de uso unico

    novo = cliente.post(f"/api/perfis/{id_}/duplicar", json={"nome": "Copia"}).json()["id"]
    assert len(cliente.get(f"/api/perfis/{novo}").json()["drivers"]) == 2

    assert cliente.delete(f"/api/perfis/{id_}/drivers/OptiPlex.zip").status_code == 204
    assert cliente.delete(f"/api/perfis/{id_}/drivers/OptiPlex.zip").status_code == 404
    assert len(cliente.get(f"/api/perfis/{id_}").json()["drivers"]) == 1
    assert len(cliente.get(f"/api/perfis/{novo}").json()["drivers"]) == 2  # hard link nao afeta a copia
