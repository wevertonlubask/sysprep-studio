# Abre o manual no Word, atualiza o sumário (e demais campos), salva e exporta o PDF para docs/.
# Uso: powershell -NoProfile -ExecutionPolicy Bypass -File docs/manual/ferramentas/atualizar_sumario.ps1 [uso|implantacao]
$qual = if ($args.Count) { $args[0] } else { "uso" }
$nome = @{ uso = "Manual_Sysprep_Studio"; implantacao = "Manual_Implantacao_Sysprep_Studio" }[$qual]
if (-not $nome) { throw "manual desconhecido: $qual (use: uso, implantacao)" }
$docx = (Resolve-Path (Join-Path $PSScriptRoot "..\$nome.docx")).Path
$pdf  = Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path "$nome.pdf"

# Cada etapa num processo PowerShell próprio (Start-Job): o PDF gerado no mesmo processo que
# atualizou os campos travava o Word sem erro (CPU alta, sem diálogo), até num Word novo.
$etapas = @(
    {   param($docx, $pdf)
        $word = New-Object -ComObject Word.Application
        $word.Visible = $false
        $word.DisplayAlerts = 0   # sem diálogos: um aviso invisível trava a automação
        try {
            $d = $word.Documents.Open($docx)
            foreach ($toc in $d.TablesOfContents) { $toc.Update() }
            $d.Fields.Update() | Out-Null
            $d.Save()
            "paginas: " + $d.ComputeStatistics(2)
            $d.Close()
        } finally { $word.Quit() }
    },
    {   param($docx, $pdf)
        $word = New-Object -ComObject Word.Application
        $word.Visible = $false
        $word.DisplayAlerts = 0
        try {
            $d = $word.Documents.Open($docx)
            $d.SaveAs2($pdf, 17)   # 17 = PDF. ExportAsFixedFormat travava sem erro com arquivo grande
            $d.Close(0)
        } finally { $word.Quit() }
    }
)
foreach ($etapa in $etapas) {
    Start-Job -ScriptBlock $etapa -ArgumentList $docx, $pdf | Wait-Job | Receive-Job
}
"pdf: $pdf"
