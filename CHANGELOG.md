# Changelog

Versões no padrão [SemVer](https://semver.org/lang/pt-BR/): **MAJOR** quebra perfis/pacotes já
existentes, **MINOR** traz recurso novo, **PATCH** corrige ou melhora sem mudar o que o usuário faz.
A versão fica em `frontend/package.json` e aparece no rodapé do sistema.

## [1.8.0] — 2026-10-18

### Adicionado
- Manual de uso (`docs/Manual_Sysprep_Studio.pdf`) e manual de implantação
  (`docs/Manual_Implantacao_Sysprep_Studio.pdf`), com capturas de tela.
- Licença MIT.

### Alterado
- Sistema genérico, sem dados de nenhuma organização: exemplos e placeholders neutros
  (`empresa.local`, "Empresa Exemplo"), padrão de nome da Tela inicial `{unidade}{local}PC{pc}`
  e rótulo do local "Setor" em perfis novos. Perfis existentes não mudam.
- O modelo de perfil "Laboratório" passou a se chamar "Uso compartilhado" (mesmo conteúdo).
- A pasta `legado/` (material de referência local) saiu do repositório.

## [1.7.2] — 2026-10-18

### Alterado
- Tela de perfis: o cartão "Importar sysprep.xml existente" ficou da mesma altura do
  "Novo perfil", com o botão alinhado ao "Criar". As larguras continuam as de antes.

## [1.7.1] — 2026-10-18

### Alterado
- Menu estendido (com os nomes dos grupos): ícones maiores, de 20 para 26px. Recolhido continua
  com os ícones de 20px.

## [1.7.0] — 2026-10-18

### Alterado
- Menu do editor em faixa estreita: uma faixa estreita só com os grupos (ícone em
  cima, nome pequeno embaixo). Clicar num grupo abre uma janela ao lado com as seções e seus
  contadores; clicar fora, Esc ou rolar a faixa fecha. O grupo da seção atual fica marcado e
  mostra no ícone o total de erros/avisos das suas seções. Grupos de uma seção só (Perfil,
  Gerar) abrem direto.

### Adicionado
- Recolher o menu: o botão ☰ da barra deixa a faixa só com os ícones (o nome do grupo vira
  dica ao passar o mouse). A escolha fica guardada no navegador. No tablet/celular o ☰
  continua abrindo a faixa por cima do conteúdo.

## [1.6.0] — 2026-10-18

### Alterado
- Menu do editor agrupado por assunto: **Perfil**, **Instalação** (Licença, Idioma e região,
  Primeiro boot, Identidade), **Contas e domínio** (Contas e senhas, Domínio, Tela inicial),
  **Rede** (Wi-Fi, Acesso remoto, Firewall), **Segurança e políticas** (Segurança, Privacidade,
  Windows Update), **Sistema** (Aparência, Apps e recursos, Drivers, Energia) e **Finalização**
  (Comandos, Sysprep).
- A seção "Rede e remoto" foi dividida em três: **Acesso remoto** (RDP e WinRM), **Firewall** e
  **Domínio** (grupo de trabalho / Active Directory). Os avisos da verificação apontam para a nova
  seção certa; links antigos para "Rede e remoto" abrem a seção Domínio.

## [1.5.0] — 2026-10-18

### Alterado
- Editor no tablet/celular (até 860px): a faixa de abas rolável das seções virou um menu
  sanduíche. O botão ☰ na barra abre uma gaveta lateral com todas as seções e seus contadores
  de erro/aviso; fecha ao escolher uma seção, tocar fora ou apertar Esc.

## [1.4.1] — 2026-10-18

### Alterado
- Subtítulo do cabeçalho: "Imagem padrão Windows · Modo Auditoria" virou
  "Preparação de imagem padrão do Windows".

## [1.4.0] — 2026-10-18

### Adicionado
- Logo própria do Sysprep Studio (bloco violeta → azul → ciano com três janelas e uma faísca),
  usada no cabeçalho, na barra do editor, na tela de carregamento e como favicon.
- PWA: instalável como aplicativo (manifesto, ícones, service worker que guarda só a casca do
  app — a API, com senhas e chave do Windows, nunca passa por ele). Botão "Instalar app".
- Rodapé fixo com "Desenvolvido por Weverton E. Lubask" (link para wevertonlubask.com.br) e a versão.

### Alterado
- Responsividade: áreas seguras (entalhe/barra de gestos), alvos de toque maiores em telas de
  toque, barra menor com o celular deitado e sem pull-to-refresh com o app instalado.

## [1.3.0] — 2026-10-16

### Adicionado
- Tela inicial no primeiro logon da máquina clonada: o técnico escolhe unidade, local e
  nº do PC; o nome sai de um padrão (ex.: `{unidade}{local}PC{pc}`) e a máquina entra
  no domínio já com ele, na OU do local. Validação do padrão, códigos e OUs.
- Wi-Fi: conecta na rede de maior prioridade logo após importar, e a Tela inicial tenta de novo
  enquanto estiver aberta (driver Wi-Fi que demora no primeiro boot).

## [1.2.3] — 2026-10-16

### Corrigido
- Perfis Wi-Fi ficavam sem permissão nenhuma (nem para o SYSTEM).

## [1.2.2] — 2026-10-15

### Melhorado
- Pacote transmitido direto ao navegador, sem ZIP temporário (8,8 GB de drivers em ~65 s).

## [1.2.1] — 2026-10-15

### Corrigido
- Pacote com drivers lotava o disco virtual e derrubava o Docker.

## [1.2.0] — 2026-10-15

### Adicionado
- Seção Wi-Fi: redes pré-configuradas na máquina clonada.

## [1.1.0] — 2026-10-15

### Adicionado
- Pacotes de drivers por modelo, configurações de exibição e ajustes visuais.

## [1.0.0] — 2026-09-26

### Adicionado
- Sysprep Studio: editor visual do sysprep.xml e gerador do pacote de preparo.
