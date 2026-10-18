@echo off
rem ====================================================================
rem  Preparar-Imagem.cmd  (gerado pelo Sysprep Studio)
rem  Eleva sozinho e chama o Preparar-Imagem.ps1 da mesma pasta.
rem
rem  USO: duplo clique. Execute em Modo Auditoria (Ctrl+Shift+F3).
rem
rem  Para preparar sem rodar o Sysprep:
rem      Preparar-Imagem.cmd /preparar
rem ====================================================================

title Imagem Padrao - Sysprep Studio

net session >nul 2>&1
if not errorlevel 1 goto :elevado

echo.
echo  Solicitando privilegios de Administrador...
echo.
rem  -ArgumentList so pode ser passado se houver argumento; com string
rem  vazia o Start-Process falha e a elevacao nao acontece.
set "PASSAR="
if not "%~1"=="" set "PASSAR= -ArgumentList '%*'"

powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0'%PASSAR% -Verb RunAs"
exit /b

:elevado

rem  Fora da pasta do pacote: o script a apaga no final, e o cmd parado
rem  dentro dela impediria remover a pasta. Os caminhos abaixo usam %~dp0.
cd /d "%SystemRoot%\System32"

for %%F in (Preparar-Imagem.ps1 sysprep.xml pacote.json) do (
    if not exist "%~dp0%%F" (
        echo.
        echo  ERRO: %%F nao encontrado em:
        echo        %~dp0
        echo.
        echo  Extraia o ZIP inteiro e mantenha a estrutura de pastas.
        echo.
        pause
        exit /b 1
    )
)

set "ARGS="
if /i "%~1"=="/preparar" set "ARGS=-SomentePreparar"
if /i "%~1"=="-preparar" set "ARGS=-SomentePreparar"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Preparar-Imagem.ps1" %ARGS%
set "RC=%ERRORLEVEL%"

echo.
if "%RC%"=="3010" (
    echo  ================================================================
    echo   REINICIE a maquina e execute este arquivo de novo.
    echo  ================================================================
) else if not "%RC%"=="0" (
    echo  ================================================================
    echo   Terminou com erro. Codigo: %RC%
    echo   Confira o log gerado na pasta do script.
    echo  ================================================================
)

echo.
pause
exit /b %RC%
