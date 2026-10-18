"""Gera os PNG do PWA a partir da geometria de public/favicon.svg (viewBox 64).

Uso (requer Pillow e numpy):  python scripts/gerar_icones.py public/icones
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

SAIDA = Path(sys.argv[1])
SAIDA.mkdir(parents=True, exist_ok=True)
SS = 4  # supersampling


def hexrgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) for i in (0, 2, 4)], dtype=float)


def gradiente(n, paradas, diagonal=True):
    y, x = np.mgrid[0:n, 0:n] / (n - 1)
    t = (x + y) / 2 if diagonal else y
    out = np.zeros((n, n, 3))
    for (p0, c0), (p1, c1) in zip(paradas, paradas[1:]):
        m = (t >= p0) & (t <= p1)
        k = ((t - p0) / (p1 - p0))[m][:, None]
        out[m] = hexrgb(c0) * (1 - k) + hexrgb(c1) * k
    return out


FUNDO = [(0, "#7c5cff"), (0.38, "#3d5afe"), (0.68, "#2458d6"), (1, "#18b6f0")]
VIDRO = [(0, "#ffffff"), (1, "#d3e0ff")]


def bezier(p0, p1, p2, p3, n=24):
    t = np.linspace(0, 1, n)[:, None]
    p0, p1, p2, p3 = map(np.array, (p0, p1, p2, p3))
    return ((1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t**2 * p2 + t**3 * p3).tolist()


def faisca():
    pts = []
    pts += bezier((42, 32.5), (43, 39), (45, 41), (51.5, 42))
    pts += bezier((51.5, 42), (45, 43), (43, 45), (42, 51.5))
    pts += bezier((42, 51.5), (41, 45), (39, 43), (32.5, 42))
    pts += bezier((32.5, 42), (39, 41), (41, 39), (42, 32.5))
    return pts


def desenhar(tam, sangria):
    """sangria=True: fundo cobre tudo (maskable/apple) e o simbolo encolhe para a zona segura."""
    n = tam * SS
    u = n / 64  # unidade do viewBox
    fundo = gradiente(n, FUNDO)
    brilho = gradiente(n, [(0, "#ffffff"), (0.55, "#000000"), (1, "#000000")], diagonal=False)[..., 0] / 255 * 0.28
    rgb = fundo * (1 - brilho[..., None]) + 255 * brilho[..., None]

    if sangria:
        alfa = Image.new("L", (n, n), 255)
        escala, desloc = 0.72, 64 * 0.14  # simbolo dentro do circulo seguro de 80%
    else:
        alfa = Image.new("L", (n, n), 0)
        ImageDraw.Draw(alfa).rounded_rectangle((0, 0, n - 1, n - 1), radius=15 * u, fill=255)
        escala, desloc = 1.0, 0.0

    def tr(x, y):
        return ((x * escala + desloc) * u, (y * escala + desloc) * u)

    mascara = Image.new("L", (n, n), 0)
    d = ImageDraw.Draw(mascara)
    for x, y in ((14, 14), (34, 14), (14, 34)):
        a, b = tr(x, y), tr(x + 16, y + 16)
        d.rounded_rectangle((*a, *b), radius=3.5 * escala * u, fill=255)
    janelas = np.asarray(mascara, dtype=float)[..., None] / 255
    vidro = gradiente(n, VIDRO)
    rgb = rgb * (1 - janelas) + vidro * janelas

    mascara = Image.new("L", (n, n), 0)
    ImageDraw.Draw(mascara).polygon([tr(x, y) for x, y in faisca()], fill=255)
    m = np.asarray(mascara, dtype=float)[..., None] / 255
    rgb = rgb * (1 - m) + 255 * m

    img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    img.putalpha(alfa)
    return img.resize((tam, tam), Image.LANCZOS)


desenhar(192, False).save(SAIDA / "icone-192.png", optimize=True)
desenhar(512, False).save(SAIDA / "icone-512.png", optimize=True)
desenhar(512, True).save(SAIDA / "icone-maskable-512.png", optimize=True)
desenhar(180, True).convert("RGB").save(SAIDA / "apple-touch-icon.png", optimize=True)
grande = desenhar(256, False)
grande.save(SAIDA.parent / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (256, 256)])
print("ok", sorted(p.name for p in SAIDA.iterdir()))
