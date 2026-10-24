<#
    Preparar-Imagem.ps1
    Prepara a imagem de referencia e executa o Sysprep.
    Gerado pelo Sysprep Studio - a logica e fixa; o que muda por perfil
    esta em pacote.json e sysprep.xml, na mesma pasta.

    Execute SEMPRE em Modo Auditoria (Ctrl+Shift+F3 na tela do OOBE),
    iniciando pelo Preparar-Imagem.cmd (duplo clique).

    Com o generalize confirmado, a pasta do pacote e apagada (se estiver
    no disco do sistema), para as senhas nao irem na imagem capturada.

    Parametros:
        -SomentePreparar   Faz tudo, menos rodar o Sysprep (util para testar).
        -SemConfirmacao    Nao pede a confirmacao final. Use com cuidado.
#>

[CmdletBinding()]
param(
    [switch]$SomentePreparar,
    [switch]$SemConfirmacao
)

$ErrorActionPreference = 'Stop'

$TempDir    = 'C:\TEMP'
$XmlDestino = Join-Path $TempDir 'sysprep.xml'

# ------------------------------------------------------------------ log

$LogDir = $PSScriptRoot
try { [IO.File]::WriteAllText((Join-Path $LogDir '.w'), 'x'); Remove-Item (Join-Path $LogDir '.w') -Force }
catch { $LogDir = 'C:\Windows\Temp' }
$LogFile = Join-Path $LogDir ("Preparar-Imagem_{0:yyyyMMdd_HHmmss}.log" -f (Get-Date))

function Escrever {
    param([string]$Texto, [string]$Nivel = 'INFO')
    $cor = switch ($Nivel) {
        'OK'    { 'Green' }
        'AVISO' { 'Yellow' }
        'ERRO'  { 'Red' }
        'PASSO' { 'Cyan' }
        default { 'Gray' }
    }
    $linha = "[{0:HH:mm:ss}] [{1,-5}] {2}" -f (Get-Date), $Nivel, $Texto
    Write-Host $linha -ForegroundColor $cor
    Add-Content -Path $LogFile -Value $linha -Encoding UTF8
}

function Titulo {
    param([string]$Texto)
    Write-Host ''
    Write-Host ('=' * 70) -ForegroundColor DarkCyan
    Write-Host "  $Texto" -ForegroundColor White
    Write-Host ('=' * 70) -ForegroundColor DarkCyan
    Add-Content -Path $LogFile -Value "`r`n=== $Texto ===" -Encoding UTF8
}

# ------------------------------------------------------------ manifesto

$ManifestoArq = Join-Path $PSScriptRoot 'pacote.json'
if (-not (Test-Path $ManifestoArq)) {
    Write-Host "pacote.json nao encontrado em $PSScriptRoot" -ForegroundColor Red
    exit 1
}
# -Raw + UTF8: sem isso o PS 5.1 le como ANSI e quebra acentos de caminhos
$M = Get-Content $ManifestoArq -Raw -Encoding UTF8 | ConvertFrom-Json

Titulo "IMAGEM PADRAO - $($M.perfil)"
Escrever "Log: $LogFile"
Escrever "Pacote gerado em $($M.gerado_em)"

# ------------------------------------------------- 0. verificacoes previas

Titulo '0/10  Verificacoes previas'

$admin = ([Security.Principal.WindowsPrincipal] `
          [Security.Principal.WindowsIdentity]::GetCurrent()
         ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) {
    Escrever 'Este script precisa ser executado como Administrador.' 'ERRO'
    Escrever 'Use o Preparar-Imagem.cmd, que eleva sozinho.' 'ERRO'
    exit 1
}
Escrever 'Executando como Administrador.' 'OK'

$so = Get-CimInstance Win32_OperatingSystem
Escrever ("Sistema: {0} (build {1})" -f $so.Caption, $so.BuildNumber)

$auditBoot = (Get-ItemProperty 'HKLM:\SYSTEM\Setup\Status' -Name AuditBoot -EA SilentlyContinue).AuditBoot
if ($auditBoot -eq 1) {
    Escrever 'Maquina em Modo Auditoria.' 'OK'
} else {
    Escrever 'A maquina NAO parece estar em Modo Auditoria.' 'AVISO'
    Escrever 'O recomendado e preparar a imagem de referencia em auditoria (Ctrl+Shift+F3).' 'AVISO'
}

try {
    $rearm = (Get-CimInstance SoftwareLicensingService).RemainingWindowsReArmCount
    if ($null -eq $rearm) {
        # Sem o guarda de $null o teste abaixo abortaria: ($null -le 1) e verdadeiro.
        Escrever 'Contagem de rearm indisponivel - seguindo assim mesmo.' 'AVISO'
    } elseif ($rearm -eq 4294967295) {
        Escrever 'Rearms restantes: ilimitado (0xFFFFFFFF).' 'OK'
    } elseif ($rearm -le 1 -and -not $M.sysprep.pular_rearm) {
        Escrever "Rearms restantes: $rearm - LIMITE ATINGIDO. O generalize vai falhar." 'ERRO'
        Escrever 'Ative "Pular rearm" no perfil se precisar generalizar mesmo assim.' 'ERRO'
        exit 1
    } else {
        Escrever "Rearms restantes: $rearm" 'OK'
    }
} catch {
    Escrever 'Nao foi possivel ler a contagem de rearm.' 'AVISO'
}

$XmlOrigem = Join-Path $PSScriptRoot 'sysprep.xml'
if (-not (Test-Path $XmlOrigem)) { Escrever "Nao encontrei sysprep.xml em $PSScriptRoot" 'ERRO'; exit 1 }
try {
    $xmlDoc = [xml](Get-Content $XmlOrigem -Raw -Encoding UTF8)
    Escrever 'sysprep.xml encontrado e bem formado.' 'OK'
} catch {
    Escrever "sysprep.xml esta corrompido: $($_.Exception.Message)" 'ERRO'
    exit 1
}

# Mostra as contas que o XML vai criar. Serve para flagrar XML desatualizado
# ANTES de generalizar (ja aconteceu de o pendrive estar com versao velha).
$contas = @($xmlDoc.unattend.settings.component.UserAccounts.LocalAccounts.LocalAccount)
if ($contas.Count -eq 0) {
    Escrever 'O sysprep.xml nao define nenhuma conta local!' 'AVISO'
} else {
    Escrever "Contas que o XML vai criar ($($contas.Count)):" 'OK'
    foreach ($c in $contas) {
        Escrever ("   {0,-20} grupo: {1,-16} exibido como: {2}" -f $c.Name, $c.Group, $c.DisplayName) 'OK'
    }
    Escrever '   >>> CONFIRA OS GRUPOS ACIMA antes de seguir.' 'AVISO'
}

$faltando = @(@($M.arquivos) + @($M.drivers) | Where-Object { -not (Test-Path (Join-Path $PSScriptRoot $_.origem)) })
if ($faltando.Count -gt 0) {
    $faltando | ForEach-Object { Escrever "Arquivo do pacote ausente: $($_.origem)" 'ERRO' }
    exit 1
}

Add-Type -AssemblyName System.Drawing
foreach ($a in @($M.arquivos | Where-Object { $_.imagem })) {
    $bmp = [System.Drawing.Image]::FromFile((Join-Path $PSScriptRoot $a.origem))
    $nome = Split-Path $a.origem -Leaf
    if ($a.tipo -eq 'fundo' -and ($bmp.Width -lt 1920 -or $bmp.Height -lt 1080)) {
        Escrever ("{0}: {1}x{2} - abaixo de Full HD, vai ficar borrado ao ampliar." -f $nome, $bmp.Width, $bmp.Height) 'AVISO'
    } else {
        Escrever ("{0}: {1}x{2}" -f $nome, $bmp.Width, $bmp.Height) 'OK'
    }
    $bmp.Dispose()
}

# ------------------------------------------------------- 1. arquivos

Titulo '1/10  Instalando arquivos (imagens e scripts)'

if (@($M.arquivos).Count -eq 0) {
    Escrever 'Nenhum arquivo para instalar (papel de parede e tela de bloqueio no padrao do Windows).'
}
$pastas = @()
$pastasWifi = @()
# Pastas restritas (perfis Wi-Fi, configuracao da tela inicial) de uma
# execucao anterior: recriadas do zero, para nao sobrar rede removida do perfil. O /reset devolve as permissoes herdadas antes de
# apagar (versoes antigas deste script deixavam os XMLs sem permissao
# nenhuma, e ai nem o administrador sobrescrevia ou apagava).
foreach ($pasta in @($M.arquivos | Where-Object { $_.tipo -in 'wifi', 'restrito' } | ForEach-Object { Split-Path $_.destino -Parent } | Select-Object -Unique)) {
    if (Test-Path -LiteralPath $pasta) {
        & icacls $pasta /reset /T /C /Q | Out-Null
        Remove-Item -LiteralPath $pasta -Recurse -Force
        Escrever "Arquivos restritos anteriores removidos de $pasta" 'OK'
    }
}
foreach ($a in @($M.arquivos)) {
    $pasta = Split-Path $a.destino -Parent
    New-Item -ItemType Directory -Force -Path $pasta | Out-Null
    Copy-Item (Join-Path $PSScriptRoot $a.origem) $a.destino -Force
    Escrever "$(Split-Path $a.origem -Leaf) -> $($a.destino)" 'OK'
    if ($a.tipo -in 'wifi', 'restrito') {
        if ($pastasWifi -notcontains $pasta) { $pastasWifi += $pasta }
    } elseif ($pastas -notcontains $pasta) { $pastas += $pasta }
}
# S-1-5-32-545 = grupo Users, independente do idioma. Sem leitura o usuario
# ve fundo preto. Sem "2>&1" de proposito: no PS 5.1 isso vira ErrorRecord
# e, com ErrorAction Stop, derruba o script em vez de cair no aviso.
foreach ($pasta in $pastas) {
    $acl = & icacls $pasta /grant "*S-1-5-32-545:(OI)(CI)RX" /T
    if ($LASTEXITCODE -eq 0) {
        Escrever "Leitura concedida ao grupo Users em $pasta" 'OK'
    } else {
        Escrever "icacls retornou $LASTEXITCODE em $pasta - confira as permissoes." 'AVISO'
        $acl | Select-Object -Last 3 | ForEach-Object { Escrever "   $_" 'AVISO' }
    }
}
# Perfis Wi-Fi e a configuracao da tela inicial tem senha em texto puro: sem
# heranca, so SYSTEM (S-1-5-18) e Administradores (S-1-5-32-544). Quem os usa
# na maquina clonada os apaga depois (tarefa do Wi-Fi, tela inicial). So na PASTA, sem /T: os arquivos herdam.
# Com /T o icacls aplica o (OI)(CI) tambem nos arquivos, onde ele nao vale,
# e eles ficam sem permissao nenhuma - nem o SYSTEM da tarefa os leria.
foreach ($pasta in $pastasWifi) {
    $acl = & icacls $pasta /inheritance:r /grant:r "*S-1-5-18:(OI)(CI)F" "*S-1-5-32-544:(OI)(CI)F"
    if ($LASTEXITCODE -ne 0) {
        Escrever "icacls retornou $LASTEXITCODE em $pasta - a pasta tem senhas, restrinja manualmente." 'AVISO'
        $acl | Select-Object -Last 3 | ForEach-Object { Escrever "   $_" 'AVISO' }
    }
    # sem leitura para o SYSTEM o Wi-Fi falharia em silencio em cada clone
    $semSystem = @(Get-ChildItem -LiteralPath $pasta -File | Where-Object {
        -not ((Get-Acl -LiteralPath $_.FullName).Access | Where-Object {
            $_.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value -eq 'S-1-5-18' })
    })
    if ($semSystem.Count -gt 0) {
        Escrever "SYSTEM sem acesso a $($semSystem.Count) arquivo(s) em $pasta - a maquina clonada nao conseguiria usa-los." 'ERRO'
        exit 1
    }
    Escrever "Arquivos em $pasta restritos a SYSTEM e Administradores" 'OK'
}

# ------------------------------------------------------- 2. drivers

Titulo '2/10  Pacotes de drivers (repositorio de drivers do Windows)'

# pnputil SEM /install: so copia para o DriverStore. O generalize mantem o
# repositorio e cada maquina clonada instala, no 1o boot, apenas o que
# casa com o proprio hardware. Antes da checagem de reinicio (passo 7):
# o PnP pode atualizar um dispositivo desta maquina e pedir reinicio.
$precisaReiniciar = $false
$drivers = @($M.drivers)
$marcas   = Join-Path $env:SystemRoot 'Temp\SysprepStudio-Drivers'
$trabalho = Join-Path $env:SystemDrive 'SysprepStudio-Drivers'
# Caminho completo: outro "expand.exe" no PATH (ex.: o do Git) nao entende -F.
# pnputil so existe na System32 de 64 bits (Sysnative se o PowerShell for 32).
$expandExe  = Join-Path $env:SystemRoot 'System32\expand.exe'
$pnputilExe = Join-Path $env:SystemRoot 'System32\pnputil.exe'
if (-not (Test-Path $pnputilExe)) { $pnputilExe = Join-Path $env:SystemRoot 'Sysnative\pnputil.exe' }
if ($drivers.Count -eq 0) { Escrever 'Nenhum pacote de drivers no perfil.' }
foreach ($d in $drivers) {
    $arq  = Get-Item (Join-Path $PSScriptRoot $d.origem)
    $gb   = [math]::Round($arq.Length / 1GB, 2)
    # Marca por nome + tamanho: rodar o .cmd de novo (apos reiniciar) nao
    # extrai GBs outra vez. Para forcar, apague a marca.
    $marca = Join-Path $marcas ('{0}_{1}.ok' -f $arq.Name, $arq.Length)
    if (Test-Path $marca) {
        Escrever "$($arq.Name): ja adicionado numa execucao anterior." 'OK'
        continue
    }
    $livre = (Get-PSDrive ($env:SystemDrive.TrimEnd(':'))).Free
    if ($livre -lt ($arq.Length * 3 + 2GB)) {
        Escrever ("{0}: pouco espaco em {1} ({2:N1} GB livres). Pulei este pacote." -f $arq.Name, $env:SystemDrive, ($livre / 1GB)) 'AVISO'
        continue
    }
    $destino = Join-Path $trabalho $arq.BaseName
    Remove-Item $destino -Recurse -Force -EA SilentlyContinue
    New-Item -ItemType Directory -Force -Path $destino | Out-Null
    Escrever "Extraindo $($arq.Name) ($gb GB)... pode levar alguns minutos." 'PASSO'
    try {
        switch ($arq.Extension.ToLower()) {
            '.cab' {
                & $expandExe $arq.FullName -F:* $destino | Out-Null
                if ($LASTEXITCODE -ne 0) { throw "expand.exe retornou $LASTEXITCODE" }
            }
            '.zip' {
                # tar.exe (Windows 10 1803+) e bem mais rapido que o Expand-Archive do PS 5.1
                $tar = Join-Path $env:SystemRoot 'System32\tar.exe'
                if (Test-Path $tar) {
                    & $tar -xf $arq.FullName -C $destino
                    if ($LASTEXITCODE -ne 0) { throw "tar.exe retornou $LASTEXITCODE" }
                } else {
                    $ProgressPreference = 'SilentlyContinue'
                    Expand-Archive -LiteralPath $arq.FullName -DestinationPath $destino -Force
                }
            }
            '.exe' {
                # Pacote autoextraivel da Dell (DUP): /s silencioso, /e= so extrai
                Escrever "   Se abrir uma janela do pacote, escolha extrair para $destino" 'INFO'
                $proc = Start-Process $arq.FullName -ArgumentList '/s', "/e=$destino" -Wait -PassThru
                if ($proc.ExitCode -ne 0) { Escrever "$($arq.Name) retornou $($proc.ExitCode) ao extrair." 'AVISO' }
            }
        }
    } catch {
        Escrever "Falha ao extrair $($arq.Name): $($_.Exception.Message)" 'AVISO'
        Remove-Item $destino -Recurse -Force -EA SilentlyContinue
        continue
    }
    $infs = @(Get-ChildItem $destino -Recurse -Filter *.inf -File -EA SilentlyContinue)
    if ($infs.Count -eq 0) {
        Escrever "$($arq.Name): nenhum .inf depois de extrair. Nao e um pacote de drivers para implantacao." 'AVISO'
        Escrever '   Extraia-o no seu computador, compacte a pasta em .zip e envie o .zip no Sysprep Studio.' 'AVISO'
        Remove-Item $destino -Recurse -Force -EA SilentlyContinue
        continue
    }
    Escrever "$($infs.Count) arquivo(s) .inf. Adicionando ao repositorio (pnputil)..." 'PASSO'
    $saida = & $pnputilExe /add-driver (Join-Path $destino '*.inf') /subdirs
    $rc = $LASTEXITCODE
    # Saida completa (uma linha por .inf) so no log; na tela, o resumo final.
    if ($saida) { Add-Content -Path $LogFile -Value $saida -Encoding UTF8 }
    $saida | Where-Object { $_.Trim() } | Select-Object -Last 3 | ForEach-Object { Escrever "   $($_.Trim())" }
    # 0 = ok | 3010 = ok, pede reinicio | 259 = nada novo (ja estavam no repositorio)
    if ($rc -eq 3010) { $precisaReiniciar = $true }
    if (@(0, 259, 3010) -contains $rc) {
        Escrever "$($arq.Name): drivers adicionados ao repositorio." 'OK'
    } else {
        Escrever "$($arq.Name): pnputil retornou $rc - parte dos drivers pode nao ter entrado (detalhes no log)." 'AVISO'
    }
    New-Item -ItemType Directory -Force -Path $marcas | Out-Null
    Set-Content -Path $marca -Value (Get-Date -Format s)
    Remove-Item $destino -Recurse -Force -EA SilentlyContinue
}
# A pasta extraida nao pode ir para a imagem: o DriverStore ja tem a copia.
if (Test-Path $trabalho) { Remove-Item $trabalho -Recurse -Force -EA SilentlyContinue }
if ($drivers.Count -gt 0) {
    Escrever 'Conferir depois: pnputil /enum-drivers (lista o que esta no repositorio).' 'INFO'
}

# ------------------------------------------------------- 3. recursos opcionais

Titulo '3/10  Recursos opcionais do Windows'

# Antes de parar o Windows Update: o .NET 3.5 e baixado por ele.
foreach ($r in @($M.recursos_ativar)) {
    try {
        $res = Enable-WindowsOptionalFeature -Online -FeatureName $r -All -NoRestart -EA Stop
        if ($res.RestartNeeded) { $precisaReiniciar = $true }
        Escrever "Ativado: $r$(if ($res.RestartNeeded) { ' (exige reinicio)' })" 'OK'
    } catch {
        Escrever "Falha ao ativar ${r}: $($_.Exception.Message)" 'AVISO'
    }
}
foreach ($r in @($M.recursos_desativar)) {
    $estado = Get-WindowsOptionalFeature -Online -FeatureName $r -EA SilentlyContinue
    if ($null -eq $estado -or $estado.State -notlike 'Enabled*') {
        Escrever "$r ja esta desativado ou nao existe nesta edicao."
        continue
    }
    try {
        $res = Disable-WindowsOptionalFeature -Online -FeatureName $r -NoRestart -EA Stop
        if ($res.RestartNeeded) { $precisaReiniciar = $true }
        Escrever "Desativado: $r" 'OK'
    } catch {
        Escrever "Falha ao desativar ${r}: $($_.Exception.Message)" 'AVISO'
    }
}
if (@($M.recursos_ativar).Count + @($M.recursos_desativar).Count -eq 0) { Escrever 'Nenhum recurso a alterar.' }

# O recurso sozinho nao basta: o WSL atual e um pacote separado do Windows.
# --web-download baixa o MSI do GitHub (instalacao por maquina, em
# Program Files\WSL); a versao da Store e Appx por usuario e derruba o generalize.
if ($M.instalar_wsl) {
    $wslPacote = Join-Path $env:ProgramFiles 'WSL\wsl.exe'
    if (Test-Path $wslPacote) {
        Escrever 'Pacote WSL ja instalado (Program Files\WSL).' 'OK'
    } else {
        $wslExe = Join-Path $env:SystemRoot 'System32\wsl.exe'
        if (-not (Test-Path $wslExe)) { $wslExe = Join-Path $env:SystemRoot 'Sysnative\wsl.exe' }
        Escrever 'Instalando o pacote WSL (wsl --update --web-download)...' 'PASSO'
        $env:WSL_UTF8 = '1'   # sem isso a saida do wsl.exe vem em UTF-16 e o log fica ilegivel
        try { $saida = & $wslExe --update --web-download; $rc = $LASTEXITCODE }
        catch { $saida = @($_.Exception.Message); $rc = -1 }
        $saida | Where-Object { $_ } | ForEach-Object { Escrever "   $_" }
        if (Test-Path $wslPacote) {
            Escrever 'Pacote WSL instalado.' 'OK'
        } else {
            Escrever "Pacote WSL NAO instalado (wsl retornou $rc). Confira a internet e rode o .cmd de novo." 'AVISO'
            Escrever 'Sem ele, o usuario precisa rodar "wsl --install" (como admin) na maquina clonada.' 'AVISO'
        }
    }
    Escrever 'Distros sao por usuario: cada um roda "wsl --install -d Ubuntu" no primeiro uso.' 'INFO'
}

# ------------------------------------------------------- 4. apps

Titulo '4/10  Removendo apps (por usuario + provisionado)'

# Os DOIS passos sao obrigatorios: remover so do usuario sem desprovisionar
# e a causa mais comum de falha do generalize ("installed for a user, but
# not provisioned for all users").
foreach ($alvo in @($M.remover_apps)) {
    $padrao = "$alvo*"
    foreach ($p in @(Get-AppxPackage -AllUsers -Name $padrao -EA SilentlyContinue)) {
        try {
            Remove-AppxPackage -Package $p.PackageFullName -AllUsers -EA Stop
            Escrever "Removido (usuarios): $($p.PackageFullName)" 'OK'
        } catch {
            Escrever "Falha ao remover $($p.PackageFullName): $($_.Exception.Message)" 'AVISO'
        }
    }
    foreach ($p in @(Get-AppxProvisionedPackage -Online | Where-Object DisplayName -like $padrao)) {
        try {
            Remove-AppxProvisionedPackage -Online -PackageName $p.PackageName -EA Stop | Out-Null
            Escrever "Removido (provisionado): $($p.PackageName)" 'OK'
        } catch {
            Escrever "Falha ao desprovisionar $($p.PackageName): $($_.Exception.Message)" 'AVISO'
        }
    }
}
if (@($M.remover_apps).Count -eq 0) { Escrever 'Nenhum app marcado para remocao.' }

# ------------------------------------------------------- 5. onedrive

Titulo '5/10  OneDrive'

if ($M.remover_onedrive) {
    Get-Process OneDrive -EA SilentlyContinue | Stop-Process -Force -EA SilentlyContinue
    $instalador = @("$env:SystemRoot\System32\OneDriveSetup.exe", "$env:SystemRoot\SysWOW64\OneDriveSetup.exe") |
        Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($instalador) {
        $proc = Start-Process $instalador -ArgumentList '/uninstall' -Wait -PassThru
        Escrever "OneDriveSetup /uninstall retornou $($proc.ExitCode)." 'OK'
    } else {
        Escrever 'OneDriveSetup.exe nao encontrado - o OneDrive ja pode ter sido removido.'
    }
    Escrever 'A reinstalacao em perfis novos e bloqueada no passo 6 (chave Run do Default).' 'INFO'
} else {
    Escrever 'OneDrive mantido.'
}

# ------------------------------------------------------- 6. registro por usuario

Titulo '6/10  Variaveis de ambiente e ajustes por usuario'

# Grava como REG_EXPAND_SZ (o tipo do Path do Windows): o valor pode citar
# outra variavel, ex.: %ANDROID_HOME%\platform-tools. Le o valor atual SEM
# expandir, senao o %USERPROFILE% do Path do Default viraria o caminho do auditor.
function Definir-Variavel {
    param([string]$Chave, $V)
    if (-not (Test-Path -LiteralPath $Chave)) { New-Item -Path $Chave -Force | Out-Null }
    $k = Get-Item -LiteralPath $Chave
    $atual = $k.GetValue($V.nome, $null, 'DoNotExpandEnvironmentNames')
    $k.Close()
    $valor = $V.valor
    if ($V.acrescentar -and $atual) {
        $itens = @($atual -split ';' | Where-Object { $_ })
        # -notcontains ignora maiusculas, como o proprio Windows nos caminhos
        $novos = @($V.valor -split ';' | Where-Object { $_ -and $itens -notcontains $_ })
        if ($novos.Count -eq 0) { return "$($V.nome): ja continha $($V.valor)" }
        $valor = ($itens + $novos) -join ';'
    }
    New-ItemProperty -LiteralPath $Chave -Name $V.nome -Value $valor -PropertyType ExpandString -Force | Out-Null
    return "$($V.nome) $(if ($V.acrescentar) { '+=' } else { '=' }) $($V.valor)"
}

# Maquina: Session Manager\Environment sobrevive ao generalize e vale para todos.
$variaveis = @($M.variaveis)
$varsUsuario = @($variaveis | Where-Object { $_.escopo -eq 'usuario' })
foreach ($v in @($variaveis | Where-Object { $_.escopo -eq 'maquina' })) {
    try {
        Escrever ("[maquina] " + (Definir-Variavel 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment' $v)) 'OK'
    } catch {
        Escrever "Falha na variavel de maquina $($v.nome): $($_.Exception.Message)" 'AVISO'
    }
}
if ($variaveis.Count -eq 0) { Escrever 'Nenhuma variavel de ambiente no perfil.' }

# Aplica no HKCU do Administrador de auditoria (e o que o CopyProfile copia)
# E no NTUSER.DAT do perfil Default (usado quando nao ha CopyProfile).
$ajustes = @($M.registro_usuario)
if ($ajustes.Count + $varsUsuario.Count -eq 0) {
    Escrever 'Nenhum ajuste por usuario.'
} else {
    $hive = 'HKU\SysprepStudioDefault'
    & reg.exe load $hive "$env:SystemDrive\Users\Default\NTUSER.DAT" | Out-Null
    $default = ($LASTEXITCODE -eq 0)
    if (-not $default) { Escrever 'Nao consegui carregar o hive do perfil Default - aplicando so no HKCU.' 'AVISO' }

    $raizes = @('HKCU:')
    if ($default) {
        New-PSDrive -Name HKU -PSProvider Registry -Root HKEY_USERS -EA SilentlyContinue | Out-Null
        $raizes += 'HKU:\SysprepStudioDefault'
    }
    try {
        foreach ($raiz in $raizes) {
            foreach ($a in $ajustes) {
                $chave = Join-Path $raiz $a.chave
                try {
                    if ($a.remover) {
                        Remove-ItemProperty -Path $chave -Name $a.nome -EA SilentlyContinue
                        continue
                    }
                    # LiteralPath: chaves com {GUID} e "*" nao podem virar curinga
                    if (-not (Test-Path -LiteralPath $chave)) { New-Item -Path $chave -Force | Out-Null }
                    if ($a.nome -eq '(default)') {
                        Set-Item -LiteralPath $chave -Value $a.valor
                    } else {
                        New-ItemProperty -LiteralPath $chave -Name $a.nome -Value $a.valor -PropertyType $a.tipo -Force | Out-Null
                    }
                } catch {
                    Escrever "Falha em $chave\$($a.nome): $($_.Exception.Message)" 'AVISO'
                }
            }
            if ($ajustes.Count -gt 0) { Escrever "$($ajustes.Count) ajuste(s) aplicados em $raiz" 'OK' }
            foreach ($v in $varsUsuario) {
                try {
                    Escrever ("[usuario] " + (Definir-Variavel (Join-Path $raiz 'Environment') $v) + " em $raiz") 'OK'
                } catch {
                    Escrever "Falha na variavel $($v.nome) em ${raiz}: $($_.Exception.Message)" 'AVISO'
                }
            }
        }
    } finally {
        if ($default) {
            Remove-PSDrive HKU -EA SilentlyContinue
            # Handles abertos pelo PowerShell impedem o unload; coletar antes.
            [GC]::Collect(); [GC]::WaitForPendingFinalizers()
            & reg.exe unload $hive | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Start-Sleep -Seconds 2
                [GC]::Collect(); & reg.exe unload $hive | Out-Null
            }
            if ($LASTEXITCODE -eq 0) { Escrever 'Hive do Default descarregado.' 'OK' }
            else { Escrever 'O hive do Default continua carregado: REINICIE antes do Sysprep.' 'ERRO'; exit 1 }
        }
    }
}

# ------------------------------------------------------- 7. reinicio pendente

Titulo '7/10  Conferindo reinicio pendente'

# Sysprep com servicing pendente falha. Em auditoria a maquina volta
# para a auditoria ao reiniciar; basta rodar o .cmd de novo (idempotente).
$pendente = $precisaReiniciar -or
    (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending') -or
    (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired')
if ($pendente) {
    Titulo 'REINICIO NECESSARIO'
    Escrever 'Ha alteracoes que so terminam apos reiniciar. O Sysprep NAO foi executado.' 'AVISO'
    Escrever 'Reinicie (a maquina volta em Modo Auditoria) e rode o Preparar-Imagem.cmd de novo.' 'AVISO'
    exit 3010
}
Escrever 'Nenhum reinicio pendente.' 'OK'

# ------------------------------------------------------- 8. windows update

Titulo '8/10  Parando o Windows Update'

# Atualizacao em andamento e a 2a maior causa de falha do generalize.
# O DoSvc e protegido no Windows 11 e recusa "Acesso negado" mesmo para
# Administrador - esperado, NAO impede o Sysprep.
$criticos = @('wuauserv', 'UsoSvc')
foreach ($svc in @($criticos + 'DoSvc')) {
    try {
        Stop-Service $svc -Force -EA Stop
        Set-Service  $svc -StartupType Disabled -EA Stop
        Escrever "Servico $svc parado e desabilitado." 'OK'
    } catch {
        if ($criticos -contains $svc) {
            Escrever "FALHA ao parar $svc : $($_.Exception.Message)" 'AVISO'
        } else {
            Escrever "$svc protegido pelo sistema - esperado, nao afeta o Sysprep." 'INFO'
        }
    }
}
# Desabilitados ficam assim DENTRO da imagem. Com a opcao "Restaurar o
# Windows Update" do perfil (padrao), o specialize devolve o StartType
# original em cada maquina clonada.

# ------------------------------------------------------- 9. verificacao appx

Titulo '9/10  Conferindo pendencias que fazem o Sysprep falhar'

$provNomes = (Get-AppxProvisionedPackage -Online).DisplayName
# Apps de sistema e frameworks nunca sao provisionados e nao quebram o
# Sysprep; sem este filtro aparecem ~58 falsos positivos.
$instalados = Get-AppxPackage -AllUsers | Where-Object {
    -not $_.IsFramework -and
    $_.SignatureKind -ne 'System' -and
    $_.InstallLocation -notlike "$env:SystemRoot\SystemApps\*"
}
$suspeitos = @(
    $instalados | Group-Object Name |
        Where-Object { $provNomes -notcontains $_.Name } |
        ForEach-Object { $_.Name }
)
if ($suspeitos.Count -gt 0) {
    Escrever "$($suspeitos.Count) app(s) da Store instalados por usuario e nao provisionados." 'AVISO'
    Escrever 'ESTES podem derrubar o generalize (adicione-os em "Apps" no perfil):' 'AVISO'
    $suspeitos | ForEach-Object { Escrever "   - $_" 'AVISO' }
} else {
    Escrever 'Nenhum app da Store fora de sincronia. Sysprep liberado.' 'OK'
}

New-Item -ItemType Directory -Force -Path $TempDir | Out-Null
Copy-Item $XmlOrigem $XmlDestino -Force
Escrever "sysprep.xml copiado para $XmlDestino" 'OK'

$argumentos = @('/generalize', "/$($M.sysprep.entrar_em)", '/quit')
if ($M.sysprep.modo_vm) { $argumentos += '/mode:vm' }
$argumentos += "/unattend:$XmlDestino"

if ($SomentePreparar) {
    Titulo 'CONCLUIDO (modo -SomentePreparar)'
    Escrever 'Preparacao pronta. O Sysprep NAO foi executado.' 'OK'
    Escrever 'Para executar depois, rode este mesmo .cmd sem argumento (recomendado).' 'INFO'
    Escrever 'Na mao, use o caminho completo (a pasta do Sysprep nao esta no PATH):' 'INFO'
    Escrever "   & `"`$env:SystemRoot\System32\Sysprep\sysprep.exe`" $($argumentos -join ' ')" 'INFO'
    Escrever "Atencao: na mao, VOCE apaga $XmlDestino (contem as senhas) antes de desligar." 'INFO'
    exit 0
}

# ------------------------------------------------------- 10. sysprep

Titulo '10/10  Sysprep - generalize'

$final = @{ desligar = 'a maquina sera DESLIGADA'; reiniciar = 'a maquina sera REINICIADA'; nada = 'a maquina ficara ligada' }
Write-Host ''
Write-Host '  ATENCAO - acao irreversivel:' -ForegroundColor Yellow
Write-Host '    - a instalacao sera generalizada' -ForegroundColor Yellow
Write-Host "    - ao final, $($final[$M.sysprep.ao_final])" -ForegroundColor Yellow
Write-Host '    - nao ligue a maquina de novo antes de capturar a imagem' -ForegroundColor Yellow
Write-Host "    - comando: sysprep $($argumentos -join ' ')" -ForegroundColor Yellow
Write-Host ''

if (-not $SemConfirmacao) {
    $resp = Read-Host 'Digite SYSPREP para continuar (qualquer outra coisa cancela)'
    if ($resp -cne 'SYSPREP') {
        Escrever 'Cancelado pelo operador. Nada foi generalizado.' 'AVISO'
        Escrever 'A preparacao dos passos 1 a 9 permanece aplicada.' 'INFO'
        exit 0
    }
}

Escrever "Executando sysprep $($argumentos -join ' ') ..." 'PASSO'
$sysprepExe = Join-Path $env:SystemRoot 'System32\Sysprep\sysprep.exe'
$proc = Start-Process -FilePath $sysprepExe -ArgumentList $argumentos -Wait -PassThru -NoNewWindow

$err = 'C:\Windows\System32\Sysprep\Panther\setuperr.log'
if ($proc.ExitCode -ne 0) {
    Escrever "Sysprep falhou com codigo $($proc.ExitCode)." 'ERRO'
    Escrever "Veja o motivo real em: $err" 'ERRO'
    if (Test-Path $err) {
        Write-Host ''
        Get-Content $err -Tail 20 | ForEach-Object { Write-Host "   $_" -ForegroundColor DarkRed }
    }
    Escrever 'A maquina NAO sera desligada, para voce poder investigar.' 'ERRO'
    exit $proc.ExitCode
}
Escrever 'Sysprep retornou codigo 0.' 'OK'

# O codigo de saida NAO prova sucesso: ja retornou 0 com "Erro fatal" numa
# caixa de dialogo. A unica confirmacao confiavel e o ImageState.
$esperado = if ($M.sysprep.entrar_em -eq 'audit') { 'IMAGE_STATE_GENERALIZE_RESEAL_TO_AUDIT' } else { 'IMAGE_STATE_GENERALIZE_RESEAL_TO_OOBE' }
$estado = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Setup\State' -EA SilentlyContinue).ImageState
Escrever "ImageState: $estado"
if ($estado -ne $esperado) {
    Escrever "GENERALIZE NAO CONFIRMADO (esperado $esperado)." 'ERRO'
    Escrever 'NAO capture a imagem neste estado - ela nao funcionaria.' 'ERRO'
    Escrever "A maquina NAO sera desligada e $XmlDestino foi mantido para nova tentativa." 'ERRO'
    if (Test-Path $err) {
        Write-Host ''
        Escrever 'Ultimas linhas do setuperr.log:' 'ERRO'
        Get-Content $err -Tail 20 | ForEach-Object { Write-Host "   $_" -ForegroundColor DarkRed }
        Escrever 'NAO apague a pasta Panther antes de ler este log.' 'ERRO'
    }
    exit 1
}
Escrever 'Generalize CONFIRMADO pelo ImageState. Imagem selada.' 'OK'

# /quit em vez de /shutdown existe por isto: apagar o XML com as senhas
# antes de desligar, para ele nao ir junto na imagem capturada.
Remove-Item $XmlDestino -Force -EA SilentlyContinue
if (Test-Path $XmlDestino) {
    Escrever "NAO consegui apagar $XmlDestino - apague manualmente, ele contem as senhas." 'AVISO'
} else {
    Escrever 'Arquivo de resposta removido de C:\TEMP (continha as senhas e a chave).' 'OK'
}

if ($LogDir -ne $PSScriptRoot) {
    try {
        Copy-Item $LogFile (Join-Path $PSScriptRoot (Split-Path $LogFile -Leaf)) -Force
        Escrever 'Copia do log salva na pasta do script.' 'OK'
    } catch {
        Escrever "Log ficou apenas em $LogFile (dentro da imagem)." 'AVISO'
    }
}

# Apagar a pasta do pacote: ela tem o sysprep.xml original (senhas, chave),
# os perfis Wi-Fi em texto puro e os scripts, e numa subpasta de C:\
# qualquer usuario le. Depois do generalize nada nela e usado (tudo ja foi
# copiado para o destino final). Pendrive nao entra na imagem: so limpa no
# disco do sistema. Chega aqui apenas com o generalize confirmado.
$pacoteApagado = $false
$pastaPacote = $PSScriptRoot.TrimEnd('\')
if ($pastaPacote -notlike "$env:SystemDrive\*") {
    Escrever "Pacote fora de $env:SystemDrive ($pastaPacote) - nao vai para a imagem, mantido." 'INFO'
} else {
    # O log mora na pasta do pacote: daqui em diante grava em Windows\Temp
    # (usuario comum nao lista essa pasta). Nao tem senhas.
    if ((Split-Path $LogFile -Parent) -eq $pastaPacote) {
        $novoLog = Join-Path $env:SystemRoot ('Temp\' + (Split-Path $LogFile -Leaf))
        Copy-Item $LogFile $novoLog -Force
        $LogFile = $novoLog
    }
    # So o que o Sysprep Studio gera. Se o ZIP foi extraido numa pasta com
    # outras coisas (ex.: direto em C:\TEMP), o resto fica onde esta.
    $itens = @('Preparar-Imagem.cmd', 'Preparar-Imagem.ps1', 'sysprep.xml', 'pacote.json', 'LEIA-ME.txt', 'arquivos', 'drivers') |
        ForEach-Object { Join-Path $pastaPacote $_ } |
        Where-Object { Test-Path -LiteralPath $_ }
    $itens = @($itens) + @(Get-ChildItem -LiteralPath $pastaPacote -Filter 'Preparar-Imagem_*.log' -File | ForEach-Object FullName)
    $falhas = @()
    foreach ($i in $itens) {
        try { Remove-Item -LiteralPath $i -Recurse -Force -EA Stop }
        catch {
            # ACL sem heranca (ex.: copia de uma pasta Wi-Fi restrita): devolve a herdada e tenta de novo
            & icacls $i /reset /T /C /Q | Out-Null
            try { Remove-Item -LiteralPath $i -Recurse -Force -EA Stop } catch { $falhas += $i }
        }
    }
    if ($falhas.Count -gt 0) {
        $falhas | ForEach-Object { Escrever "NAO consegui apagar $_ - apague manualmente ANTES de capturar." 'AVISO' }
    } else {
        $pacoteApagado = $true
        if (@(Get-ChildItem -LiteralPath $pastaPacote -Force).Count -gt 0) {
            Escrever "Pacote apagado de $pastaPacote (a pasta tinha outros arquivos e foi mantida)." 'OK'
        } else {
            try {
                Remove-Item -LiteralPath $pastaPacote -Force -EA Stop
                Escrever "Pasta do pacote apagada: $pastaPacote" 'OK'
            } catch {
                # Algum prompt aberto dentro dela a trava; sem conteudo, nao expoe nada.
                Escrever "Conteudo do pacote apagado; a pasta vazia $pastaPacote esta em uso e ficou." 'OK'
            }
        }
        Escrever "Log desta execucao: $LogFile" 'INFO'
    }
}

switch ($M.sysprep.ao_final) {
    'nada' {
        Titulo 'PRONTO'
        Escrever 'Imagem selada. A maquina continua ligada - desligue SEM reiniciar antes de capturar.' 'OK'
        # O .cmd foi apagado junto com o pacote: o "pause" dele nao roda mais.
        if ($pacoteApagado) { Read-Host 'Enter para fechar' | Out-Null }
    }
    default {
        $acao = if ($M.sysprep.ao_final -eq 'reiniciar') { 'REINICIANDO' } else { 'DESLIGANDO' }
        Titulo "PRONTO - $acao EM 15 SEGUNDOS"
        if ($M.sysprep.ao_final -eq 'desligar') {
            Escrever 'Capture a imagem pelo WinPE/DISM. NAO ligue este Windows novamente.' 'OK'
        }
        Write-Host ''
        Write-Host '  Ctrl+C agora se quiser inspecionar algo antes.' -ForegroundColor Yellow
        Write-Host ''
        Start-Sleep -Seconds 15
        if ($M.sysprep.ao_final -eq 'reiniciar') { Restart-Computer -Force } else { Stop-Computer -Force }
    }
}
