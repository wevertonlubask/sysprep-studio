"""Prints da Tela inicial (a janela do 1º logon da máquina clonada) para o manual.

Roda uma CÓPIA do Tela-Inicial.ps1 do pacote do perfil "Estações administrativas" com o domínio,
o AD e a rede simulados: nada é renomeado, nenhum domínio é contatado, nada reinicia. A janela
abre fora da tela cheia, preenche os campos sozinha, se desenha num PNG e fecha.

Uso (raiz do projeto, no Windows, com o contêiner do manual no ar e semear_manual.py já rodado):
    python docs/manual/ferramentas/tela_inicial_demo.py
"""
import io
import json
import subprocess
import tempfile
import urllib.request
import zipfile
from pathlib import Path

AQUI = Path(__file__).resolve().parent
PRINTS = AQUI.parent / "prints"
BASE = "http://localhost:8091"

# Funções do script trocadas por versões simuladas (definidas depois das originais, prevalecem).
SIMULACAO = r"""
function Escrever([string]$Texto) { }
function TestarDominio { return $true }
function BuscarNoAD([string]$nome) { return $env:DEMO_DN }
function CuidarDoWifi { }
function EstadoRede { return @{ ok = $true; texto = '● Cabo de rede conectado' } }
"""

# Antes do ShowDialog: preenche, espera a tela se atualizar, desenha num PNG e fecha.
CAPTURA = r"""
$tDemo = New-Object System.Windows.Forms.Timer
$tDemo.Interval = 1800
$script:etapa = 0
$tDemo.Add_Tick({
    $script:etapa++
    if ($script:etapa -eq 1) {
        $cbUnidade.SelectedIndex = [int]$env:DEMO_UNIDADE
        $cbLocal.SelectedIndex = [int]$env:DEMO_LOCAL
        $txtPc.Text = $env:DEMO_PC
        $txtPc.SelectionStart = $txtPc.Text.Length
        return
    }
    $tDemo.Stop()
    $bmp = New-Object System.Drawing.Bitmap($form.Width, $form.Height)
    $form.DrawToBitmap($bmp, (New-Object System.Drawing.Rectangle(0, 0, $form.Width, $form.Height)))
    $bmp.Save($env:DEMO_SAIDA, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $script:podeFechar = $true
    $form.Close()
})
$tDemo.Start()
"""


def preparar(pasta: Path) -> Path:
    ids = json.loads((AQUI / ".ids-manual.json").read_text())
    with urllib.request.urlopen(f"{BASE}/api/perfis/{ids['completo']}/pacote") as r:
        z = zipfile.ZipFile(io.BytesIO(r.read()))
    raiz = z.namelist()[0].split("/")[0]
    script = z.read(f"{raiz}/arquivos/Tela-Inicial.ps1").decode("utf-8-sig")
    (pasta / "TelaInicial").mkdir()
    (pasta / "TelaInicial" / "config.json").write_bytes(z.read(f"{raiz}/arquivos/tela-inicial/config.json"))

    trocas = [
        ("if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {", "if ($false) {"),
        ("(Get-CimInstance Win32_ComputerSystem).PartOfDomain", "$false"),
        ("$form.WindowState = 'Maximized'",
         "$form.WindowState = 'Normal'; $form.StartPosition = 'CenterScreen'; "
         "$form.Size = New-Object System.Drawing.Size(1120, 760)"),
        ("$form.TopMost = $true", "$form.TopMost = $false"),
        ("# ------------------------------------------------------------------ tela",
         SIMULACAO + "\n# ------------------------------------------------------------------ tela"),
        ("[void]$form.ShowDialog()", CAPTURA + "\n[void]$form.ShowDialog()"),
    ]
    for antes, depois in trocas:
        if antes not in script:
            raise SystemExit(f"Tela-Inicial.ps1 mudou: não achei {antes!r}")
        script = script.replace(antes, depois, 1)
    destino = pasta / "Tela-Inicial-demo.ps1"
    destino.write_text(script, encoding="utf-8-sig")
    return destino


def capturar(script: Path, saida: str, unidade: int, local: int, pc: str, dn: str = ""):
    env = {"DEMO_SAIDA": str(PRINTS / saida), "DEMO_UNIDADE": str(unidade), "DEMO_LOCAL": str(local),
           "DEMO_PC": pc, "DEMO_DN": dn}
    import os
    subprocess.run(["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-STA", "-File", str(script),
                    "-Pasta", str(script.parent / "TelaInicial"), "-PastaWifi", str(script.parent / "sem-wifi")],
                   env={**os.environ, **env}, check=True, timeout=60)
    print("gerado:", saida)


if __name__ == "__main__":
    PRINTS.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        s = preparar(Path(tmp))
        capturar(s, "10-01-tela-inicial.png", 0, 1, "7")
        capturar(s, "10-02-tela-inicial-reimagem.png", 0, 0, "3",
                 "CN=SPADMPC03,OU=ADM,OU=SP,OU=Computadores,DC=empresa,DC=local")
