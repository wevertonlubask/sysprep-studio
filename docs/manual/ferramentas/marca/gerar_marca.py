"""Gera as logos do manual (PNG transparente) a partir do favicon.svg do sistema.

Uso: python docs/manual/ferramentas/marca/gerar_marca.py
Saída: logo-horizontal.png (capa) e logo-cabecalho.png (cabeçalho), nesta pasta.
"""
from pathlib import Path

from playwright.sync_api import sync_playwright

AQUI = Path(__file__).resolve().parent
SVG = (AQUI.parents[3] / "frontend" / "public" / "favicon.svg").read_text(encoding="utf-8")

HTML = """<!doctype html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; background: transparent; }
  .marca { display: inline-flex; align-items: center; gap: %(gap)spx; padding: 6px;
           font: 700 %(fonte)spx/1 "Segoe UI", Arial, sans-serif; letter-spacing: -0.02em; color: #1a1a1a; }
  .marca svg { width: %(icone)spx; height: %(icone)spx; display: block; }
  .studio { color: #0067c0; }
</style></head><body><div class="marca">%(svg)s<span>Sysprep <span class="studio">Studio</span></span></div></body></html>"""

with sync_playwright() as pw:
    nav = pw.chromium.launch()
    pg = nav.new_page(device_scale_factor=4)
    for nome, icone, fonte, gap in (("logo-horizontal", 96, 64, 22), ("logo-cabecalho", 40, 26, 10)):
        pg.set_content(HTML % {"svg": SVG, "icone": icone, "fonte": fonte, "gap": gap})
        pg.locator(".marca").screenshot(path=str(AQUI / f"{nome}.png"), omit_background=True)
        print("gerado:", nome)
    nav.close()
