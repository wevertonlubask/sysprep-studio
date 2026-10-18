<#
    Ajustar-Exibicao.ps1  (gerado pelo Sysprep Studio)
    Deixa todas as maquinas com a mesma exibicao, seja qual for o monitor.
    Roda no logon (chave Run da maquina = todo logon; RunOnce = so no 1o).
    Resolucao e topologia sao da maquina, mas so podem ser trocadas de
    dentro de uma sessao com area de trabalho - por isso nao vai no specialize.

    -Resolucao  LxA, ex.: 1920x1080 (vazio = nao mexe)
    -Telas      duplicar | estender (vazio = nao mexe)

    Log: %TEMP%\SysprepStudio-exibicao.log
#>
param(
    [string]$Resolucao = '',
    [string]$Telas = ''
)

$Log = Join-Path $env:TEMP 'SysprepStudio-exibicao.log'
function Escrever([string]$Texto) {
    Add-Content -Path $Log -Value ("[{0:dd/MM HH:mm:ss}] {1}" -f (Get-Date), $Texto) -Encoding UTF8
}

# 1o a topologia: duplicar muda os modos disponiveis
if ($Telas) {
    $arg = @{ duplicar = '/clone'; estender = '/extend' }[$Telas]
    if ($arg) {
        Start-Process "$env:WINDIR\System32\DisplaySwitch.exe" -ArgumentList $arg -Wait
        Escrever "Telas: $Telas"
        Start-Sleep -Seconds 3
    }
}

if ($Resolucao -notmatch '^(\d+)x(\d+)$') { exit 0 }
$largura = [int]$Matches[1]
$altura = [int]$Matches[2]

Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public static class Exibicao {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct DEVMODE {
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmDeviceName;
        public short dmSpecVersion, dmDriverVersion, dmSize, dmDriverExtra;
        public int dmFields, dmPositionX, dmPositionY, dmDisplayOrientation, dmDisplayFixedOutput;
        public short dmColor, dmDuplex, dmYResolution, dmTTOption, dmCollate;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmFormName;
        public short dmLogPixels;
        public int dmBitsPerPel, dmPelsWidth, dmPelsHeight, dmDisplayFlags, dmDisplayFrequency;
        public int dmICMMethod, dmICMIntent, dmMediaType, dmDitherType, dmReserved1, dmReserved2;
        public int dmPanningWidth, dmPanningHeight;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct DISPLAY_DEVICE {
        public int cb;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string DeviceName;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceString;
        public int StateFlags;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceID;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceKey;
    }

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    static extern bool EnumDisplayDevices(string device, int indice, ref DISPLAY_DEVICE dd, int flags);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    static extern bool EnumDisplaySettings(string device, int modo, ref DEVMODE dm);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    static extern int ChangeDisplaySettingsEx(string device, ref DEVMODE dm, IntPtr hwnd, int flags, IntPtr param);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    static extern int ChangeDisplaySettingsEx(string device, IntPtr dm, IntPtr hwnd, int flags, IntPtr param);

    const int ATTACHED_TO_DESKTOP = 0x1, MODO_ATUAL = -1;
    const int CDS_UPDATEREGISTRY = 0x1, CDS_NORESET = 0x10000000;
    const int DM_PELSWIDTH = 0x80000, DM_PELSHEIGHT = 0x100000, DM_DISPLAYFREQUENCY = 0x400000;

    static DEVMODE Novo() {
        DEVMODE dm = new DEVMODE();
        dm.dmSize = (short)Marshal.SizeOf(typeof(DEVMODE));
        return dm;
    }

    public static List<string> Ajustar(int largura, int altura) {
        List<string> log = new List<string>();
        bool mudou = false;
        DISPLAY_DEVICE dd = new DISPLAY_DEVICE();
        dd.cb = Marshal.SizeOf(dd);
        for (int i = 0; EnumDisplayDevices(null, i, ref dd, 0); i++, dd.cb = Marshal.SizeOf(dd)) {
            if ((dd.StateFlags & ATTACHED_TO_DESKTOP) == 0) continue;
            string tela = dd.DeviceName;
            DEVMODE atual = Novo();
            if (!EnumDisplaySettings(tela, MODO_ATUAL, ref atual)) continue;
            if (atual.dmPelsWidth == largura && atual.dmPelsHeight == altura) {
                log.Add(tela + ": ja esta em " + largura + "x" + altura);
                continue;
            }
            // procura o modo; prefere a frequencia atual, senao a maior
            int freq = 0;
            DEVMODE m = Novo();
            for (int k = 0; EnumDisplaySettings(tela, k, ref m); k++) {
                if (m.dmPelsWidth != largura || m.dmPelsHeight != altura || m.dmBitsPerPel != 32) continue;
                if (m.dmDisplayFrequency == atual.dmDisplayFrequency) { freq = m.dmDisplayFrequency; break; }
                if (m.dmDisplayFrequency > freq) freq = m.dmDisplayFrequency;
            }
            if (freq == 0) {
                log.Add(tela + ": monitor nao suporta " + largura + "x" + altura + " - mantida " +
                        atual.dmPelsWidth + "x" + atual.dmPelsHeight);
                continue;
            }
            atual.dmPelsWidth = largura;
            atual.dmPelsHeight = altura;
            atual.dmDisplayFrequency = freq;
            atual.dmFields = DM_PELSWIDTH | DM_PELSHEIGHT | DM_DISPLAYFREQUENCY;
            int r = ChangeDisplaySettingsEx(tela, ref atual, IntPtr.Zero, CDS_UPDATEREGISTRY | CDS_NORESET, IntPtr.Zero);
            log.Add(tela + ": " + largura + "x" + altura + " @" + freq + "Hz -> " + (r == 0 ? "ok" : "falha " + r));
            if (r == 0) mudou = true;
        }
        // aplica de uma vez o que ficou pendente (CDS_NORESET)
        if (mudou) ChangeDisplaySettingsEx(null, IntPtr.Zero, IntPtr.Zero, 0, IntPtr.Zero);
        return log;
    }
}
'@

try {
    [Exibicao]::Ajustar($largura, $altura) | ForEach-Object { Escrever $_ }
} catch {
    Escrever "Erro: $($_.Exception.Message)"
}
