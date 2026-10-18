<#
    Definir-PapelParede.ps1  (gerado pelo Sysprep Studio)
    Roda UMA vez no primeiro logon de cada usuario (chave RunOnce) e aplica
    o papel de parede inicial. Diferente do modo "fixo", o usuario pode
    trocar depois normalmente.
#>
param([Parameter(Mandatory)][string]$Imagem)

if (-not (Test-Path $Imagem)) { exit 0 }

Add-Type -TypeDefinition @'
using System.Runtime.InteropServices;
public static class PapelParede {
    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool SystemParametersInfo(int acao, int param, string valor, int flags);
}
'@

# 10 = Preencher; TileWallpaper 0 = sem ladrilho
Set-ItemProperty 'HKCU:\Control Panel\Desktop' -Name WallpaperStyle -Value '10'
Set-ItemProperty 'HKCU:\Control Panel\Desktop' -Name TileWallpaper -Value '0'

# 0x14 = SPI_SETDESKWALLPAPER | 0x01 grava no perfil | 0x02 avisa as janelas
[void][PapelParede]::SystemParametersInfo(0x14, 0, $Imagem, 0x03)
