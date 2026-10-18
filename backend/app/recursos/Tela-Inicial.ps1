<#
    Tela-Inicial.ps1  (gerado pelo Sysprep Studio)
    Tela de configuracao inicial da maquina clonada.

    O tecnico escolhe a unidade, o local (setor, sala) e o numero do PC; a
    maquina recebe o nome do padrao do perfil e, com dominio, entra nele ja
    com esse nome, direto na OU do local (Add-Computer -NewName -OUPath).
    Sem dominio, so renomeia.

    Rede primeiro: a tela mostra o estado da rede e, se o Wi-Fi do perfil
    ainda nao foi importado (a tarefa de inicializacao desiste depois de 2
    minutos sem placa, comum quando o driver Wi-Fi instala no 1o boot), ela
    roda o Configurar-WiFi.ps1 de novo ate a placa aparecer. O ingresso so e
    liberado quando o dominio responde.

    Aberta pelo FirstLogonCommands no logon automatico unico da conta
    administradora. "Pular" agenda a tela para o proximo logon dessa conta.
    Concluido: desliga o logon automatico, apaga a configuracao (tem a senha
    do dominio), a tarefa e este script, e reinicia.

    Log: C:\Windows\Temp\SysprepStudio-tela-inicial.log
#>
param(
    [string]$Pasta = (Join-Path $PSScriptRoot 'TelaInicial'),
    [string]$TarefaPasta = '\SysprepStudio\',
    [string]$TarefaNome = 'Tela inicial',
    [string]$PastaWifi = (Join-Path $PSScriptRoot 'WiFi'),
    [string]$ScriptWifi = (Join-Path $PSScriptRoot 'Configurar-WiFi.ps1')
)

$Log = Join-Path $env:WINDIR 'Temp\SysprepStudio-tela-inicial.log'
function Escrever([string]$Texto) {
    Add-Content -Path $Log -Value ("[{0:dd/MM HH:mm:ss}] {1}" -f (Get-Date), $Texto) -Encoding UTF8
}

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    # pela tarefa agendada ja vem elevado; isto cobre quem rodar a mao
    Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit 0
}

$arqConfig = Join-Path $Pasta 'config.json'
if (-not (Test-Path -LiteralPath $arqConfig)) { Escrever 'Sem configuracao (tela ja concluida).'; exit 0 }

# uma tela so, mesmo que a tarefa e o FirstLogonCommands disparem juntos
$mutex = New-Object System.Threading.Mutex($false, 'Global\SysprepStudioTelaInicial')
if (-not $mutex.WaitOne(0)) { exit 0 }

$C = Get-Content -LiteralPath $arqConfig -Raw -Encoding UTF8 | ConvertFrom-Json
$Unidades = @($C.unidades)
$ComDominio = [bool]$C.dominio
$Digitos = [int]$C.digitos_pc
$UsuarioDominio = if ($C.usuario -match '[\\@]') { $C.usuario } else { "$($C.dominio)\$($C.usuario)" }

function DesligarLogonAutomatico {
    $wl = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon'
    Set-ItemProperty -Path $wl -Name AutoAdminLogon -Value '0' -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path $wl -Name DefaultPassword, AutoLogonCount -ErrorAction SilentlyContinue
}

function Limpar {
    Unregister-ScheduledTask -TaskPath $TarefaPasta -TaskName $TarefaNome -Confirm:$false -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $Pasta -Recurse -Force -ErrorAction SilentlyContinue
    if (Test-Path -LiteralPath $Pasta) {
        & icacls $Pasta /reset /T /C /Q | Out-Null
        Remove-Item -LiteralPath $Pasta -Recurse -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path -LiteralPath $Pasta) {
        Escrever "NAO consegui apagar $Pasta - apague manualmente, contem a senha do dominio."
    } else {
        Escrever "Configuracao removida de $Pasta."
    }
    Remove-Item -LiteralPath $PSCommandPath -Force -ErrorAction SilentlyContinue
}

function AgendarProximoLogon {
    $eu = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    $acao = New-ScheduledTaskAction -Execute 'powershell.exe' `
        -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    $gatilho = New-ScheduledTaskTrigger -AtLogOn -User $eu
    $quem = New-ScheduledTaskPrincipal -UserId $eu -LogonType Interactive -RunLevel Highest
    Register-ScheduledTask -TaskPath $TarefaPasta -TaskName $TarefaNome -Action $acao -Trigger $gatilho `
        -Principal $quem -Force | Out-Null
    Escrever "Pulada: a tela volta no proximo logon de $eu."
}

# Mesma regra do montar_nome() do Sysprep Studio: troca literal e maiusculas
function MontarNome($u, $l, [string]$pc) {
    if ($null -eq $u -or $null -eq $l -or -not $pc) { return '' }
    $n = $C.padrao_nome.Replace('{unidade}', [string]$u.codigo).Replace('{local}', [string]$l.codigo)
    return $n.Replace('{pc}', $pc.PadLeft($Digitos, '0')).ToUpper()
}

function NomeValido([string]$n) {
    return $n -match '^[A-Za-z0-9-]{1,15}$' -and $n -notmatch '^\d+$'
}

# LDAP (389) de algum DC: o nome DNS do dominio resolve para os DCs
function TestarDominio {
    try {
        foreach ($ip in @([System.Net.Dns]::GetHostAddresses($C.dominio) | Select-Object -First 3)) {
            $tcp = New-Object System.Net.Sockets.TcpClient
            try {
                $ar = $tcp.BeginConnect($ip, 389, $null, $null)
                if ($ar.AsyncWaitHandle.WaitOne(1500) -and $tcp.Connected) { return $true }
            } finally { $tcp.Close() }
        }
    } catch { }
    return $false
}

# DN do computador no AD; '' = nao existe; $null = nao deu para consultar
function BuscarNoAD([string]$nome) {
    try {
        $raiz = New-Object System.DirectoryServices.DirectoryEntry("LDAP://$($C.dominio)", $UsuarioDominio, $C.senha)
        $busca = New-Object System.DirectoryServices.DirectorySearcher($raiz, "(&(objectCategory=computer)(sAMAccountName=$nome`$))")
        [void]$busca.PropertiesToLoad.Add('distinguishedName')
        $r = $busca.FindOne()
        if ($r) { return [string]$r.Properties['distinguishedname'][0] }
        return ''
    } catch {
        return $null
    }
}

# ------------------------------------------------------------------ rede

$script:procWifi = $null
function WifiPendente {
    return @(Get-ChildItem -LiteralPath $PastaWifi -Filter '*.xml' -ErrorAction SilentlyContinue).Count -gt 0
}

# O Configurar-WiFi.ps1 apaga os XMLs ao concluir: enquanto existirem, o Wi-Fi
# do perfil ainda nao foi importado. -SemContar: estas tentativas nao gastam
# as 5 da tarefa de inicializacao (sobram para os proximos boots).
function CuidarDoWifi {
    if (-not (WifiPendente) -or -not (Test-Path -LiteralPath $ScriptWifi)) { return }
    if ($script:procWifi -and -not $script:procWifi.HasExited) { return }
    # no maximo uma tentativa por minuto, mesmo que o script termine logo
    if ($script:procWifi -and ((Get-Date) - $script:procWifi.StartTime).TotalSeconds -lt 60) { return }
    $tarefa = Get-ScheduledTask -TaskPath '\SysprepStudio\' -TaskName 'Configurar Wi-Fi' -ErrorAction SilentlyContinue
    if ($tarefa -and $tarefa.State -eq 'Running') { return }
    Escrever 'Wi-Fi do perfil ainda nao importado: rodando o Configurar-WiFi.ps1 pela tela.'
    $script:procWifi = Start-Process powershell.exe -WindowStyle Hidden -PassThru `
        -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptWifi`" -SemContar"
}

function EstadoRede {
    $ativas = @(Get-NetAdapter -Physical -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Up' })
    # NdisPhysicalMedium 9 = Wi-Fi; Status Up nela = associada a uma rede
    if (@($ativas | Where-Object { $_.NdisPhysicalMedium -eq 9 }).Count -gt 0) {
        $linha = & netsh.exe wlan show interfaces | Select-String '^\s*SSID\s*:\s*(.+)$' | Select-Object -First 1
        $ssid = if ($linha) { ': ' + $linha.Matches[0].Groups[1].Value.Trim() } else { '' }
        return @{ ok = $true; texto = "● Wi-Fi conectado$ssid" }
    }
    if ($ativas.Count -gt 0) { return @{ ok = $true; texto = '● Cabo de rede conectado' } }
    if (WifiPendente) { return @{ ok = $false; texto = '● Configurando o Wi-Fi do perfil (aguardando a placa de rede)...' } }
    return @{ ok = $false; texto = '● Sem conexão de rede. Conecte o cabo ou confira o Wi-Fi.' }
}

function ExplicarErro([string]$msg) {
    if ($msg -match '2732|0x0*aac|reuse|reutiliz') {
        return "O nome ja existe no AD e o dominio nao deixa esta conta reaproveita-lo (protecao KB5020276).`n" +
               "Peca para excluir o objeto do computador no AD, ou para autorizar a conta de ingresso a reutiliza-lo, e tente de novo.`n`n$msg"
    }
    if ($msg -match 'senha|password|logon failure|1326') {
        return "Usuario ou senha do dominio recusados. Gere o pacote de novo com a credencial correta.`n`n$msg"
    }
    if ($msg -match 'negado|denied|0x5\b') {
        return "A conta de ingresso nao tem permissao para criar ou alterar computadores nesta OU.`n`n$msg"
    }
    return $msg
}

if ($ComDominio -and (Get-CimInstance Win32_ComputerSystem).PartOfDomain) {
    Escrever 'A maquina ja esta no dominio: nada a fazer.'
    DesligarLogonAutomatico
    Limpar
    exit 0
}

# ------------------------------------------------------------------ tela

Add-Type -AssemblyName System.Windows.Forms, System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$corFundo = [System.Drawing.Color]::FromArgb(22, 27, 34)
$corCartao = [System.Drawing.Color]::White
$corTexto = [System.Drawing.Color]::FromArgb(22, 27, 34)
$corTexto2 = [System.Drawing.Color]::FromArgb(90, 100, 114)
$corPrimaria = [System.Drawing.Color]::FromArgb(36, 88, 214)
$corOk = [System.Drawing.Color]::FromArgb(29, 122, 62)
$corAlerta = [System.Drawing.Color]::FromArgb(161, 92, 0)
$corErro = [System.Drawing.Color]::FromArgb(198, 40, 40)
$corDesabilitado = [System.Drawing.Color]::FromArgb(196, 203, 214)
function Fonte([float]$t, [string]$estilo = 'Regular', [string]$familia = 'Segoe UI') {
    New-Object System.Drawing.Font($familia, $t, [System.Drawing.FontStyle]$estilo)
}

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Configuração inicial'
$form.FormBorderStyle = 'None'
$form.WindowState = 'Maximized'
$form.TopMost = $true
$form.BackColor = $corFundo
$form.KeyPreview = $true
$script:podeFechar = $false
$form.Add_FormClosing({ if (-not $script:podeFechar) { $_.Cancel = $true } })

$cartao = New-Object System.Windows.Forms.Panel
$cartao.Size = New-Object System.Drawing.Size(640, 650)
$cartao.BackColor = $corCartao
$form.Controls.Add($cartao)
$centralizar = { $cartao.Location = New-Object System.Drawing.Point(
    [Math]::Max(0, [int](($form.ClientSize.Width - $cartao.Width) / 2)),
    [Math]::Max(0, [int](($form.ClientSize.Height - $cartao.Height) / 2))) }
$form.Add_Resize($centralizar)
$form.Add_Shown($centralizar)

$y = 32
function Rotulo([string]$texto, $fonte, $cor, [int]$altura) {
    $l = New-Object System.Windows.Forms.Label
    $l.Text = $texto
    $l.Font = $fonte
    $l.ForeColor = $cor
    $l.Location = New-Object System.Drawing.Point(40, $script:y)
    $l.Size = New-Object System.Drawing.Size(560, $altura)
    $cartao.Controls.Add($l)
    $script:y += $altura
    return $l
}
function Campo([string]$texto, $controle) {
    $l = New-Object System.Windows.Forms.Label
    $l.Text = $texto
    $l.Font = Fonte 11
    $l.ForeColor = $corTexto2
    $l.Location = New-Object System.Drawing.Point(40, ($script:y + 4))
    $l.Size = New-Object System.Drawing.Size(170, 28)
    $cartao.Controls.Add($l)
    $controle.Font = Fonte 12
    $controle.Location = New-Object System.Drawing.Point(220, $script:y)
    $controle.Width = 380
    $cartao.Controls.Add($controle)
    $script:y += 48
}

[void](Rotulo 'Configuração inicial do computador' (Fonte 18 'Bold') $corTexto 42)
[void](Rotulo 'Informe onde este computador vai ficar. O nome é montado automaticamente.' (Fonte 10.5) $corTexto2 40)
$y += 8

$cbUnidade = New-Object System.Windows.Forms.ComboBox
$cbUnidade.DropDownStyle = 'DropDownList'
foreach ($u in $Unidades) { [void]$cbUnidade.Items.Add($(if ($u.nome -and $u.nome -ne $u.codigo) { "$($u.codigo) - $($u.nome)" } else { $u.codigo })) }
Campo $C.rotulo_unidade $cbUnidade

$cbLocal = New-Object System.Windows.Forms.ComboBox
$cbLocal.DropDownStyle = 'DropDownList'
Campo $C.rotulo_local $cbLocal

$txtPc = New-Object System.Windows.Forms.TextBox
$txtPc.MaxLength = $Digitos
$txtPc.Add_KeyPress({ if (-not [char]::IsDigit($_.KeyChar) -and -not [char]::IsControl($_.KeyChar)) { $_.Handled = $true } })
Campo 'Nº do PC' $txtPc
$txtPc.Width = 120

$y += 10
$linha = New-Object System.Windows.Forms.Label
$linha.BorderStyle = 'Fixed3D'
$linha.Location = New-Object System.Drawing.Point(40, $y)
$linha.Size = New-Object System.Drawing.Size(560, 2)
$cartao.Controls.Add($linha)
$y += 16

[void](Rotulo 'Nome do computador' (Fonte 10) $corTexto2 22)
$lblNome = Rotulo '—' (Fonte 24 'Bold' 'Consolas') $corPrimaria 46
$lblRede = Rotulo '' (Fonte 10.5) $corTexto2 28
$lblDominio = Rotulo '' (Fonte 10.5) $corTexto2 46
$lblOu = Rotulo '' (Fonte 9.5) $corTexto2 24
$lblAviso = Rotulo '' (Fonte 10) $corAlerta 62

$btnConfirmar = New-Object System.Windows.Forms.Button
$btnConfirmar.Text = 'Confirmar e reiniciar'
$btnConfirmar.Font = Fonte 11.5 'Bold'
$btnConfirmar.Size = New-Object System.Drawing.Size(230, 44)
$btnConfirmar.Location = New-Object System.Drawing.Point(370, ($cartao.Height - 70))
$btnConfirmar.FlatStyle = 'Flat'
$btnConfirmar.BackColor = $corPrimaria
$btnConfirmar.ForeColor = [System.Drawing.Color]::White
$btnConfirmar.Enabled = $false
$cartao.Controls.Add($btnConfirmar)

$btnPular = New-Object System.Windows.Forms.Button
$btnPular.Text = 'Pular (configurar depois)'
$btnPular.Font = Fonte 10.5
$btnPular.Size = New-Object System.Drawing.Size(210, 44)
$btnPular.Location = New-Object System.Drawing.Point(40, ($cartao.Height - 70))
$btnPular.FlatStyle = 'Flat'
$btnPular.Visible = [bool]$C.permitir_pular
$cartao.Controls.Add($btnPular)

if (-not $ComDominio) {
    $lblDominio.Text = 'Sem domínio: a máquina só será renomeada.'
    $lblOu.Visible = $false
}

# ------------------------------------------------------------------ estado

$script:dominioOk = $false
$script:dnExistente = ''

function Selecionados {
    $u = if ($cbUnidade.SelectedIndex -ge 0) { $Unidades[$cbUnidade.SelectedIndex] } else { $null }
    # @() por fora: o "if" desembrulharia uma lista de 1 item, e no PS 5.1 o objeto solto nao tem .Count
    $locais = @(if ($u) { $u.locais })
    $l = if ($cbLocal.SelectedIndex -ge 0 -and $cbLocal.SelectedIndex -lt $locais.Count) { $locais[$cbLocal.SelectedIndex] } else { $null }
    $pc = if ($txtPc.Text -and [int]$txtPc.Text -gt 0) { $txtPc.Text } else { '' }
    return @{ u = $u; l = $l; pc = $pc; nome = (MontarNome $u $l $pc) }
}

function Atualizar {
    $s = Selecionados
    $lblNome.Text = if ($s.nome) { $s.nome } else { '—' }
    if ($s.nome -and -not (NomeValido $s.nome)) {
        $lblNome.ForeColor = $corErro
        $lblAviso.ForeColor = $corErro
        $lblAviso.Text = 'Nome inválido: até 15 caracteres, só letras, números e hífen.'
    } else {
        $lblNome.ForeColor = $corPrimaria
        $lblAviso.Text = ''
    }
    if ($ComDominio) {
        $lblOu.Text = if ($s.l) { 'OU: ' + $(if ($s.l.ou) { $s.l.ou } else { 'padrão do domínio (Computers)' }) } else { '' }
        if ($s.nome -and (NomeValido $s.nome) -and $script:dnExistente) {
            $lblAviso.ForeColor = $corAlerta
            $lblAviso.Text = "Este nome já existe no AD e será reaproveitado (reimagem?):`n$($script:dnExistente)"
        }
    }
    $btnConfirmar.Enabled = [bool]($s.nome -and (NomeValido $s.nome) -and (-not $ComDominio -or $script:dominioOk))
    # botao Flat nao muda de cor sozinho quando desabilitado
    $btnConfirmar.BackColor = if ($btnConfirmar.Enabled) { $corPrimaria } else { $corDesabilitado }
}

function AtualizarDominio {
    if (-not $ComDominio) { return }
    $script:dominioOk = TestarDominio
    if ($script:dominioOk) {
        $lblDominio.ForeColor = $corOk
        $lblDominio.Text = "● Domínio $($C.dominio): conectado"
    } else {
        $lblDominio.ForeColor = $corErro
        $lblDominio.Text = if ($script:redeOk) {
            "● Domínio $($C.dominio): sem resposta. Confira se esta rede alcança o domínio (DNS). Tentando de novo..."
        } else {
            "● Domínio $($C.dominio): aguardando a rede..."
        }
    }
    Atualizar
}

# consulta ao AD so depois de o tecnico parar de digitar
$tAd = New-Object System.Windows.Forms.Timer
$tAd.Interval = 700
$tAd.Add_Tick({
    $tAd.Stop()
    $s = Selecionados
    $script:dnExistente = ''
    if ($ComDominio -and $script:dominioOk -and $s.nome -and (NomeValido $s.nome)) {
        $dn = BuscarNoAD $s.nome
        if ($dn) { $script:dnExistente = $dn }
    }
    Atualizar
})
$mudou = { $script:dnExistente = ''; Atualizar; $tAd.Stop(); $tAd.Start() }

$cbUnidade.Add_SelectedIndexChanged({
    $cbLocal.Items.Clear()
    foreach ($l in @($Unidades[$cbUnidade.SelectedIndex].locais)) { [void]$cbLocal.Items.Add($l.nome) }
    if ($cbLocal.Items.Count -eq 1) { $cbLocal.SelectedIndex = 0 }
    & $mudou
})
$cbLocal.Add_SelectedIndexChanged($mudou)
$txtPc.Add_TextChanged($mudou)

$script:redeOk = $false
function AtualizarRede {
    CuidarDoWifi
    $r = EstadoRede
    $lblRede.Text = $r.texto
    $lblRede.ForeColor = if ($r.ok) { $corOk } else { $corAlerta }
    $antes = $script:redeOk
    $script:redeOk = $r.ok
    # a rede acabou de subir: testa o dominio na hora, sem esperar o timer
    if ($r.ok -and -not $antes -and $ComDominio -and -not $script:dominioOk) { AtualizarDominio }
}

$tRede = New-Object System.Windows.Forms.Timer
$tRede.Interval = 4000
$tRede.Add_Tick({ AtualizarRede })

$tDominio = New-Object System.Windows.Forms.Timer
$tDominio.Interval = 5000
$tDominio.Add_Tick({ if (-not $script:dominioOk) { AtualizarDominio } })

$btnPular.Add_Click({
    try {
        DesligarLogonAutomatico
        AgendarProximoLogon
    } catch {
        Escrever "Falha ao agendar a tela: $($_.Exception.Message)"
    }
    $script:podeFechar = $true
    $form.Close()
})

$btnConfirmar.Add_Click({
    $s = Selecionados
    $nome = $s.nome
    $ou = if ($s.l) { [string]$s.l.ou } else { '' }
    foreach ($ctl in @($cbUnidade, $cbLocal, $txtPc, $btnConfirmar, $btnPular)) { $ctl.Enabled = $false }
    $lblAviso.ForeColor = $corTexto2
    $lblAviso.Text = if ($ComDominio) { "Entrando no domínio como $nome..." } else { "Renomeando para $nome..." }
    $form.Cursor = 'WaitCursor'
    [System.Windows.Forms.Application]::DoEvents()
    try {
        if ($ComDominio) {
            $cred = New-Object System.Management.Automation.PSCredential($UsuarioDominio,
                (ConvertTo-SecureString $C.senha -AsPlainText -Force))
            $p = @{ DomainName = $C.dominio; NewName = $nome; Credential = $cred; Force = $true; ErrorAction = 'Stop' }
            if ($ou) { $p.OUPath = $ou }
            Add-Computer @p
            Escrever "Ingressou em $($C.dominio) como $nome (OU: $(if ($ou) { $ou } else { 'padrao' }))."
        } else {
            Rename-Computer -NewName $nome -Force -ErrorAction Stop
            Escrever "Renomeada para $nome."
        }
    } catch {
        $msg = $_.Exception.Message
        Escrever "FALHA com o nome $nome (OU: $ou): $msg"
        $form.Cursor = 'Default'
        $lblAviso.Text = ''
        foreach ($ctl in @($cbUnidade, $cbLocal, $txtPc, $btnPular)) { $ctl.Enabled = $true }
        Atualizar
        [void][System.Windows.Forms.MessageBox]::Show($form, (ExplicarErro $msg), 'Não foi possível concluir',
            'OK', 'Error')
        return
    }
    DesligarLogonAutomatico
    Limpar
    $lblAviso.ForeColor = $corOk
    $lblAviso.Text = 'Pronto! Reiniciando...'
    [System.Windows.Forms.Application]::DoEvents()
    Start-Sleep -Seconds 2
    Restart-Computer -Force
})

if ($Unidades.Count -ge 1) { $cbUnidade.SelectedIndex = 0 }
$cbUnidade.Enabled = $Unidades.Count -gt 1
$form.Add_Shown({
    $form.Activate()
    $lblRede.Text = '● Verificando a rede...'
    [System.Windows.Forms.Application]::DoEvents()
    AtualizarRede
    $tRede.Start()
    if ($ComDominio) {
        $lblDominio.Text = "Procurando o domínio $($C.dominio)..."
        [System.Windows.Forms.Application]::DoEvents()
        AtualizarDominio
        $tDominio.Start()
    }
    if ($cbLocal.Items.Count -gt 1) { $cbLocal.Focus() } else { $txtPc.Focus() }
})

Escrever 'Tela aberta.'
[void]$form.ShowDialog()
$mutex.ReleaseMutex()
