<#
    Aplicar-Visual.ps1  (gerado pelo Sysprep Studio)
    Roda UMA vez no primeiro logon de cada usuario (chave RunOnce).
    Gravar tema e modo da pesquisa so no perfil Default nao basta: no
    primeiro logon o Windows aplica o tema padrao (claro) e os padroes da
    barra de tarefas por cima. Aqui os valores sao regravados depois disso.
    O usuario pode trocar depois normalmente.

    -Tema   claro | escuro | (vazio = nao mexe)
    -Busca  0 oculta | 1 icone | 2 caixa | -1 nao mexe
#>
param(
    [string]$Tema = '',
    [int]$Busca = -1
)

# da tempo de o Windows terminar de aplicar o tema padrao do perfil novo
Start-Sleep -Seconds 10

if ($Tema) {
    $claro = [int]($Tema -eq 'claro')
    $chave = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize'
    if (-not (Test-Path $chave)) { New-Item -Path $chave -Force | Out-Null }
    New-ItemProperty $chave -Name AppsUseLightTheme -Value $claro -PropertyType DWord -Force | Out-Null
    New-ItemProperty $chave -Name SystemUsesLightTheme -Value $claro -PropertyType DWord -Force | Out-Null
}

if ($Busca -ge 0) {
    $chave = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Search'
    if (-not (Test-Path $chave)) { New-Item -Path $chave -Force | Out-Null }
    New-ItemProperty $chave -Name SearchboxTaskbarMode -Value $Busca -PropertyType DWord -Force | Out-Null
}

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class Aviso {
    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern IntPtr SendMessageTimeout(IntPtr hWnd, int msg, IntPtr wParam, string lParam,
                                                   int flags, int timeout, out IntPtr result);
}
'@
# WM_SETTINGCHANGE "ImmersiveColorSet": janelas abertas trocam de tema na hora
$r = [IntPtr]::Zero
[void][Aviso]::SendMessageTimeout([IntPtr]0xffff, 0x1A, [IntPtr]::Zero, 'ImmersiveColorSet', 2, 5000, [ref]$r)

# A barra de tarefas so rele o modo da pesquisa ao reiniciar o Explorer
# (ele volta sozinho: AutoRestartShell).
if ($Busca -ge 0) {
    Get-Process explorer -EA SilentlyContinue |
        Where-Object { $_.SessionId -eq (Get-Process -Id $PID).SessionId } |
        Stop-Process -Force -EA SilentlyContinue
}
