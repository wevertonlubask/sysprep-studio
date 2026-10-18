# Sysprep Studio

Página local para montar a **imagem padrão do Windows** (Modo Auditoria + Sysprep)
sem editar XML à mão. Cada perfil gera um ZIP pronto para o pendrive com:

| Arquivo | Papel |
|---|---|
| `sysprep.xml` | Arquivo de resposta (unattend) gerado a partir do perfil |
| `pacote.json` | O que o script de preparo aplica (apps, recursos, registro por usuário, imagens) |
| `Preparar-Imagem.cmd` / `.ps1` | Script de preparo e execução do Sysprep (lógica fixa, dirigida pelo `pacote.json`) |
| `LEIA-ME.txt` | Resumo do perfil e procedimento, sem senhas |
| `arquivos/` | Imagens enviadas (papel de parede, tela de bloqueio, logo OEM) e scripts auxiliares |
| `drivers/` | Pacotes de drivers enviados (.cab, .zip ou .exe da Dell), se houver |

## Manuais

- [Manual de Uso](docs/Manual_Sysprep_Studio.pdf): perfis, cada seção do editor, geração do pacote,
  preparo da máquina de referência em Modo Auditoria e a Tela inicial na máquina clonada.
- [Manual de Implantação](docs/Manual_Implantacao_Sysprep_Studio.pdf): Docker no Windows ou no Linux,
  subida, acesso pela rede com HTTPS e senha, backup, atualização e problemas comuns.

## Rodar

Precisa só do Docker (Docker Desktop no Windows, Docker Engine no Linux).

```bash
git clone <url-do-repositório> sysprep-studio
cd sysprep-studio
# só no Linux: a pasta de dados precisa ser do usuário do contêiner (UID 1000)
mkdir -p dados && sudo chown -R 1000:1000 dados
docker compose up -d --build
```

Abra <http://localhost:8090>. A porta só escuta em `127.0.0.1`: o sistema não tem login próprio.
Para a equipe usar pela rede, publique com um proxy reverso com HTTPS e senha (Manual de Implantação,
capítulo 5). Não troque para `8090:8000`.

Os perfis ficam em `./dados/` (fora do git): eles guardam as senhas em texto puro
e a chave do Windows. Faça backup dessa pasta.

## O que dá para personalizar

- **Contas**: criar, editar, excluir e reordenar contas locais, grupo, senha (codificada com o
  sufixo `Password` automaticamente), Administrador embutido, logon automático, expiração de senha.
- **Licença**: chave (MAK/KMS/varejo, com atalhos GVLK) ou OEM da firmware.
- **Identidade**: nome do computador (aleatório/fixo), proprietário, organização, informações OEM com logo.
- **Idioma e região**: interface, teclado (ABNT2), localidade, fuso.
- **Primeiro boot (OOBE)**: todas as telas `Hide*`, `Skip*OOBE`, privacidade, BypassNRO, animação, SCOOBE.
- **Rede**: RDP (NLA/TLS), WinRM, perfis e grupos do firewall, grupo de trabalho ou domínio.
- **Wi-Fi**: redes (SSID, WPA2/WPA3/aberta, oculta, prioridade) que a máquina clonada já conhece ao ligar.
  O perfil salvo na máquina de referência não serve (fica preso ao GUID da placa): o pacote leva um XML
  de perfil por rede e uma tarefa criada no *specialize* os importa como SYSTEM na inicialização
  (`netsh wlan add profile`, qualquer placa), antes do login, e depois apaga os arquivos com as senhas.
- **Tela inicial**: tela no primeiro logon da máquina clonada (logon automático único) onde o técnico
  escolhe unidade, local (setor, sala) e nº do PC. O nome sai de um padrão (ex.: `{unidade}{local}PC{pc}`)
  e a máquina entra no domínio já com ele, na OU do local (`Add-Computer -NewName -OUPath`).
  Unidades, locais e OUs são cadastrados no perfil. Sem domínio, só renomeia.
- **Aparência**: papel de parede (padrão / inicial / fixo), tela de bloqueio (padrão / fixa),
  Spotlight, tema, barra de tarefas, Explorador, menu de contexto clássico, CopyProfile.
- **Privacidade**: telemetria, sugestões, ID de publicidade, pesquisa web, histórico, localização, Copilot.
- **Apps**: remoção de apps provisionados (catálogo + nomes livres), OneDrive, Edge, recursos opcionais.
- **Energia**, **Windows Update**, **Segurança** (BitLocker automático, UAC, SmartScreen, Hello, caminhos longos).
- **Drivers**: envio dos Driver Packs de cada modelo (vários GB). O script extrai cada um e roda
  `pnputil /add-driver *.inf /subdirs` (sem `/install`): os drivers vão para o repositório do Windows,
  o generalize os mantém e cada máquina clonada instala só os do próprio hardware.
- **Sysprep**: `/oobe` ou `/audit`, desligar/reiniciar, `/mode:vm`, PersistAllDeviceInstalls, SkipRearm.
- **Comandos livres** no passe specialize e no primeiro logon.

A validação roda a cada alteração e bloqueia o download enquanto houver erro
(sem administrador, imagem faltando, chave inválida…).

## Onde cada ajuste é aplicado

- **Máquina (HKLM, powercfg, sc)**: `RunSynchronous` no passe *specialize* do `sysprep.xml`.
- **Usuário (HKCU)**: o script grava, em Modo Auditoria, no HKCU do Administrador de auditoria
  (copiado pelo CopyProfile) **e** no `NTUSER.DAT` do perfil Default. Assim o efeito não depende
  da ordem interna do specialize.

## Importar um XML existente

"Importar sysprep.xml" lê contas (decodificando as senhas), chave, OOBE, RDP, firewall e comandos.
Comandos que não correspondem a nenhuma opção entram em "Comandos personalizados", para nada se perder.

## Desenvolvimento

```powershell
cd backend; python -m venv .venv; .venv\Scripts\pip install -r requirements-dev.txt
.venv\Scripts\python -m pytest              # testes
.venv\Scripts\uvicorn app.main:app --reload # API em :8000
cd ..\frontend; npm install; npm run dev    # UI em :5173 com proxy para a API
```

`frontend/src/tipos.ts` espelha `backend/app/modelo.py`: altere os dois juntos.

## Licença

[MIT](LICENSE). Pode ser usado, adaptado e distribuído por qualquer empresa.
