<#
    Configurar-WiFi.ps1  (gerado pelo Sysprep Studio)
    Importa as redes Wi-Fi do perfil na maquina clonada.

    Roda como SYSTEM a cada inicializacao, por uma tarefa agendada criada no
    specialize. O perfil gravado na maquina de referencia nao serviria: o
    Windows prende cada rede ao GUID da placa, e a placa daqui e outra.
    "netsh wlan add profile" sem interface= vale para qualquer placa Wi-Fi.

    - Sem placa Wi-Fi (driver ainda instalando): tenta de novo no proximo boot.
    - Concluido, ou depois de 5 inicializacoes sem placa: apaga os XMLs (a
      senha esta em texto puro neles) e a propria tarefa.
    - Importadas as redes, ja manda conectar na de maior prioridade.
    - Com a Tela inicial aberta, ela roda este script de novo (-SemContar)
      enquanto os XMLs existirem: o driver Wi-Fi que instala no 1o boot pode
      passar dos 2 minutos de espera daqui.

    Log: C:\Windows\Temp\SysprepStudio-wifi.log
#>
param(
    [string]$Pasta = (Join-Path $PSScriptRoot 'WiFi'),
    [string]$Tarefa = '\SysprepStudio\Configurar Wi-Fi',
    [int]$MaxTentativas = 5,
    # chamado pela Tela inicial, que tenta de novo enquanto estiver aberta:
    # nao conta tentativa nem desiste (sobram as 5 dos proximos boots)
    [switch]$SemContar
)

$Log = Join-Path $env:WINDIR 'Temp\SysprepStudio-wifi.log'
function Escrever([string]$Texto) {
    Add-Content -Path $Log -Value ("[{0:dd/MM HH:mm:ss}] {1}" -f (Get-Date), $Texto) -Encoding UTF8
}

function Encerrar([string]$Motivo) {
    Escrever $Motivo
    Remove-Item -LiteralPath $Pasta -Recurse -Force -ErrorAction SilentlyContinue
    if (Test-Path -LiteralPath $Pasta) {
        Escrever "NAO consegui apagar $Pasta - apague manualmente, contem as senhas Wi-Fi."
    } else {
        Escrever "Perfis removidos de $Pasta."
    }
    & schtasks.exe /Delete /TN $Tarefa /F | Out-Null
    exit 0
}

# conta as inicializacoes sem sucesso; na ultima, desiste e limpa
function TentarDeNovo([string]$Motivo) {
    if ($SemContar) { Escrever "$Motivo (tentativa da Tela inicial; ela tenta de novo)"; exit 0 }
    $contador = Join-Path $Pasta 'tentativas.txt'
    $n = 1 + [int](Get-Content -LiteralPath $contador -ErrorAction SilentlyContinue | Select-Object -First 1)
    if ($n -ge $MaxTentativas) { Encerrar "$Motivo Desistindo apos $n inicializacoes." }
    Set-Content -LiteralPath $contador -Value $n
    Escrever "$Motivo Tentativa $n de $MaxTentativas, tento de novo no proximo boot."
    exit 0
}

$perfis = @(Get-ChildItem -LiteralPath $Pasta -Filter '*.xml' -ErrorAction SilentlyContinue | Sort-Object Name)
if ($perfis.Count -eq 0) { Encerrar 'Nenhum perfil Wi-Fi para importar.' }

# NdisPhysicalMedium 9 = Native 802.11 (independe do idioma e do nome da placa)
function Placas { @(Get-NetAdapter -Physical -ErrorAction SilentlyContinue | Where-Object { $_.NdisPhysicalMedium -eq 9 }) }

Set-Service -Name WlanSvc -StartupType Automatic -ErrorAction SilentlyContinue
$placas = Placas
for ($i = 0; $placas.Count -eq 0 -and $i -lt 24; $i++) {
    Start-Sleep -Seconds 5
    $placas = Placas
}

if ($placas.Count -eq 0) { TentarDeNovo 'Nenhuma placa Wi-Fi encontrada (maquina sem Wi-Fi ou driver ausente).' }

Start-Service -Name WlanSvc -ErrorAction SilentlyContinue
Escrever ("Placas Wi-Fi: " + (($placas | ForEach-Object { $_.Name }) -join ', '))

$falhas = 0
$nomes = @()
foreach ($f in $perfis) {
    $nome = ([xml](Get-Content -LiteralPath $f.FullName -Raw -Encoding UTF8)).WLANProfile.name
    # remove antes: numa nova tentativa o perfil pode ja existir
    & netsh.exe wlan delete profile name="$nome" | Out-Null
    $saida = & netsh.exe wlan add profile filename="$($f.FullName)" user=all
    if ($LASTEXITCODE -eq 0) {
        Escrever "Rede '$nome' importada."
        $nomes += $nome
    } else {
        $falhas++
        Escrever "FALHA ao importar '$nome' (codigo $LASTEXITCODE): $($saida -join ' ')"
    }
}

# a ordem dos arquivos (wifi-01, wifi-02...) e a prioridade definida no perfil
foreach ($p in $placas) {
    for ($i = 0; $i -lt $nomes.Count; $i++) {
        & netsh.exe wlan set profileorder name="$($nomes[$i])" interface="$($p.Name)" priority=$($i + 1) | Out-Null
    }
}

# conecta ja, sem esperar o Windows tentar sozinho (a Tela inicial precisa
# da rede para alcancar o dominio)
if ($nomes.Count -gt 0) {
    foreach ($p in $placas) {
        if ($p.Status -ne 'Up') {
            $saida = & netsh.exe wlan connect name="$($nomes[0])" interface="$($p.Name)"
            Escrever "Conectar '$($nomes[0])' em $($p.Name): $($saida -join ' ')"
        }
    }
}

if ($falhas -eq 0) { Encerrar "Concluido: $($nomes.Count) rede(s) importada(s)." }
TentarDeNovo "$falhas rede(s) nao importada(s)."
