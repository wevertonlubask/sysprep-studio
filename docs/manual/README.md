# Manuais do Sysprep Studio

Os PDFs ficam em `docs/`:

- `Manual_Sysprep_Studio.pdf`: manual de uso (perfis, editor, seções, pacote, máquina de referência, Tela inicial).
- `Manual_Implantacao_Sysprep_Studio.pdf`: manual de implantação (Docker, subida, acesso pela rede, backup, atualização).

Os dois são **gerados**: não edite o PDF nem o Word à mão. O texto de cada capítulo está em
`ferramentas/conteudo/capNN.js` (uso) e `ferramentas/conteudo_implantacao/impNN.js` (implantação). Os
blocos aceitos (parágrafo, passos, figura, caixa, tabela, código) estão descritos no topo de
`ferramentas/gerar_manual.js`. A cada atualização, acrescente uma entrada em `ferramentas/versoes.js`
ou `ferramentas/versoes_implantacao.js`: a última vai para a capa e a tabela inteira, para a última página.

## Os prints usam dados fictícios, num contêiner separado

Nada vem da pasta `dados/` real. Os prints saem de um contêiner próprio (`sysprep-studio-manual`,
porta 8091) com os perfis da "Empresa Exemplo" criados por `semear_manual.py`. Os prints da Tela
inicial do Windows saem de `tela_inicial_demo.py`, que roda uma cópia do `Tela-Inicial.ps1` com rede,
domínio e AD simulados (nada é renomeado nem reiniciado).

## Refazer tudo (raiz do projeto, no Windows, com Word instalado)

```powershell
docker compose -f docs/manual/ferramentas/docker-compose.manual.yml up -d --build
python docs/manual/ferramentas/semear_manual.py         # recria os perfis fictícios
python docs/manual/ferramentas/prints_manual.py         # todos; ou só alguns: ... prints_manual.py contas gerar
python docs/manual/ferramentas/tela_inicial_demo.py     # prints 10-01 e 10-02 (janela do Windows)
cd docs/manual/ferramentas; npm install
node gerar_manual.js uso; node gerar_manual.js implantacao
powershell -NoProfile -ExecutionPolicy Bypass -File atualizar_sumario.ps1 uso
powershell -NoProfile -ExecutionPolicy Bypass -File atualizar_sumario.ps1 implantacao
```

Requisitos: Python com `playwright` (e `python -m playwright install chromium`) e `pillow`; Node.js;
Microsoft Word (o `atualizar_sumario.ps1` atualiza o sumário e exporta o PDF). As logos da capa e
do cabeçalho saem de `ferramentas/marca/gerar_marca.py`, a partir de `frontend/public/favicon.svg`.

Capítulos de prints (`prints_manual.py`): perfis, editor, instalacao, contas, rede, sistema, gerar, pacote.

Para desmontar: `docker compose -f docs/manual/ferramentas/docker-compose.manual.yml down` e apague
`docs/manual/ferramentas/.dados-manual/`.
