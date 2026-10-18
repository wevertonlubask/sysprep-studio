// Gera os manuais em Word a partir do conteúdo de cada um e dos prints em docs/manual/prints.
// Uso: cd docs/manual/ferramentas && npm install && node gerar_manual.js [uso|implantacao]
//   uso (padrão)  -> docs/manual/Manual_Sysprep_Studio.docx             (conteudo/, versoes.js)
//   implantacao   -> docs/manual/Manual_Implantacao_Sysprep_Studio.docx (conteudo_implantacao/, versoes_implantacao.js)
// Depois, atualizar_sumario.ps1 abre no Word, atualiza o sumário e exporta o PDF para docs/.
//
// O conteúdo é uma lista de blocos por capítulo (ver CAPITULOS). Tipos de bloco:
//   { h2 }, { h3 }, { p }, { passos: [...] }, { lista: [...] }, { fig, legenda, largura? },
//   { caixa: "dica"|"atencao"|"acesso"|"importante", titulo?, texto | lista }, { tabela: {cab, linhas, larguras} },
//   { codigo: "linhas\nde comando", titulo? }  (comandos em fonte fixa; o texto sai como está, sem marcações)
// Texto aceita **negrito**, _itálico_, `código` (fonte fixa; protege o _ de nomes como AD_HOST) e
// [n] (marca numerada, a mesma dos prints).

const fs = require("fs");
const path = require("path");
const sizeOf = require("image-size").default || require("image-size");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, Header, Footer,
  AlignmentType, HeadingLevel, LevelFormat, BorderStyle, WidthType, ShadingType, PageNumber,
  TableOfContents, PageBreak, TabStopType, VerticalAlign,
} = require("docx");

const RAIZ = path.resolve(__dirname, "..");
const PRINTS = path.join(RAIZ, "prints");
const LOGO = path.join(__dirname, "marca", "logo-horizontal.png");      // capa
const LOGO_CAB = path.join(__dirname, "marca", "logo-cabecalho.png");  // cabeçalho das páginas

// Cada manual: pasta de conteúdo, controle de versões, arquivo de saída e os textos fixos.
const MANUAIS = {
  uso: {
    conteudo: "conteudo", versoes: "versoes.js", saida: "Manual_Sysprep_Studio.docx",
    titulo: "Manual de Uso", chamada: "Da criação do perfil à máquina clonada pronta",
    publico: "Para a equipe de TI que prepara e implanta a imagem padrão do Windows",
    rodape: "Imagens com dados fictícios", descricao: "Manual de uso do Sysprep Studio",
  },
  implantacao: {
    conteudo: "conteudo_implantacao", versoes: "versoes_implantacao.js", saida: "Manual_Implantacao_Sysprep_Studio.docx",
    titulo: "Manual de Implantação", chamada: "Instalação com Docker no Windows ou no Linux",
    publico: "Para a equipe de TI que instala, atualiza e mantém o Sysprep Studio",
    rodape: "Uso interno da TI", descricao: "Manual de implantação do Sysprep Studio",
  },
};
const QUAL = process.argv[2] || "uso";
const MANUAL = MANUAIS[QUAL];
if (!MANUAL) throw new Error(`manual desconhecido: ${QUAL} (use: ${Object.keys(MANUAIS).join(", ")})`);
const SAIDA = path.join(RAIZ, MANUAL.saida);

// ---------------------------------------------------------------- identidade (cores do sistema)
// "destaque" é o violeta da marca: marcas numeradas, títulos de nível 3, números dos passos.
const COR = {
  destaque: "6A4CF5",   // violeta da logo (gradiente #7c5cff -> #3d5afe)
  marinho: "1A2C5B",    // azul escuro da marca, para títulos e cabeçalhos de tabela
  cinza: "5A6472",      // --texto-2 do sistema
  linha: "CBD5E1",
  fundo: "F1F5F9",
};
const FONTE = "Segoe UI";
const FONTE_FIXA = "Consolas";
const LARGURA_UTIL = 9638;         // A4 (11906) − margens de 2 cm (2 × 1134), em DXA
const LARGURA_UTIL_PX = 642;       // a mesma largura em px (96 dpi) para as imagens

// ---------------------------------------------------------------- texto com marcações
function runs(texto, base = {}) {
  const partes = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|_[^_]+_|\[\d+\])/g;
  let ultimo = 0, m;
  while ((m = re.exec(texto))) {
    if (m.index > ultimo) partes.push(new TextRun({ text: texto.slice(ultimo, m.index), ...base }));
    const t = m[0];
    if (t.startsWith("`")) partes.push(new TextRun({ text: t.slice(1, -1), ...base, font: FONTE_FIXA, color: COR.marinho }));
    else if (t.startsWith("**")) partes.push(new TextRun({ text: t.slice(2, -2), bold: true, ...base }));
    else if (t.startsWith("_")) partes.push(new TextRun({ text: t.slice(1, -1), italics: true, ...base }));
    else partes.push(marca(t.slice(1, -1)));
    ultimo = m.index + t.length;
  }
  if (ultimo < texto.length) partes.push(new TextRun({ text: texto.slice(ultimo), ...base }));
  return partes;
}

// A "bolinha" numerada, igual à dos prints.
function marca(n) {
  return new TextRun({
    text: ` ${n} `, bold: true, color: "FFFFFF", size: 18,
    shading: { type: ShadingType.CLEAR, color: "auto", fill: COR.destaque },
  });
}

const p = (texto, opts = {}) => new Paragraph({ children: runs(texto), spacing: { after: 120 }, ...opts });

// ---------------------------------------------------------------- blocos
let contadorListas = 0;
let figuraCap = 0, figuraN = 0;

function blocoPassos(itens) {
  contadorListas += 1;
  const inst = contadorListas;
  return itens.map((t) => new Paragraph({
    numbering: { reference: "passos", level: 0, instance: inst },
    children: runs(t), spacing: { after: 100 },
  }));
}

function blocoLista(itens) {
  return itens.map((t) => new Paragraph({
    numbering: { reference: "marcadores", level: 0 }, children: runs(t), spacing: { after: 60 },
  }));
}

function blocoFigura(arquivo, legenda, largura = 1) {
  const caminho = path.join(PRINTS, arquivo);
  if (!fs.existsSync(caminho)) throw new Error("print não encontrado: " + arquivo);
  const dim = sizeOf(fs.readFileSync(caminho));
  const w = Math.round(LARGURA_UTIL_PX * largura);
  let h = Math.round((dim.height / dim.width) * w);
  const maxH = 820;                                  // não passar da altura útil da página
  const wFinal = h > maxH ? Math.round(w * maxH / h) : w;
  h = Math.min(h, maxH);
  figuraN += 1;
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, keepNext: true,
      children: [new ImageRun({
        type: "png", data: fs.readFileSync(caminho),
        transformation: { width: wFinal, height: h },
        altText: { title: legenda, description: legenda, name: arquivo },
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 240 },
      children: [
        new TextRun({ text: `Figura ${figuraCap}.${figuraN} – `, bold: true, size: 18, color: COR.cinza }),
        ...runs(legenda, { size: 18, color: COR.cinza, italics: true }),
      ],
    }),
  ];
}

const CAIXAS = {
  dica:       { rotulo: "Dica",        cor: "2E7D5B", fundo: "ECF7F1" },
  atencao:    { rotulo: "Atenção",     cor: "B45309", fundo: "FFF7E6" },
  importante: { rotulo: "Importante",  cor: COR.destaque, fundo: "FDECEE" },
  acesso:     { rotulo: "Quem acessa", cor: COR.marinho, fundo: COR.fundo },
};

function blocoCaixa(b) {
  const tipo = CAIXAS[b.caixa];
  const filhos = [new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: (b.titulo || tipo.rotulo).toUpperCase(), bold: true, size: 18, color: tipo.cor })],
  })];
  if (b.texto) filhos.push(new Paragraph({ children: runs(b.texto), spacing: { after: 40 } }));
  if (b.lista) filhos.push(...blocoLista(b.lista));
  const semBorda = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  return [
    new Table({
      width: { size: LARGURA_UTIL, type: WidthType.DXA },
      columnWidths: [LARGURA_UTIL],
      rows: [new TableRow({
        cantSplit: true,
        children: [new TableCell({
          width: { size: LARGURA_UTIL, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, color: "auto", fill: tipo.fundo },
          margins: { top: 120, bottom: 120, left: 200, right: 200 },
          borders: { top: semBorda, bottom: semBorda, right: semBorda,
                     left: { style: BorderStyle.SINGLE, size: 24, color: tipo.cor } },
          children: filhos,
        })],
      })],
    }),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
  ];
}

// Comandos e arquivos de configuração: fonte fixa, fundo cinza, uma linha por parágrafo.
function blocoCodigo(b) {
  const semBorda = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const filhos = [];
  if (b.titulo) filhos.push(new Paragraph({ spacing: { after: 60 },
    children: [new TextRun({ text: b.titulo, bold: true, size: 17, color: COR.cinza })] }));
  for (const linha of b.codigo.replace(/\n$/, "").split("\n")) {
    filhos.push(new Paragraph({ spacing: { after: 0, line: 240 },
      children: [new TextRun({ text: linha || " ", font: FONTE_FIXA, size: 17, color: "0F172A" })] }));
  }
  return [
    new Table({
      width: { size: LARGURA_UTIL, type: WidthType.DXA },
      columnWidths: [LARGURA_UTIL],
      rows: [new TableRow({ children: [new TableCell({
        width: { size: LARGURA_UTIL, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, color: "auto", fill: COR.fundo },
        margins: { top: 100, bottom: 100, left: 160, right: 160 },
        borders: { top: semBorda, bottom: semBorda, right: semBorda,
                   left: { style: BorderStyle.SINGLE, size: 18, color: COR.marinho } },
        children: filhos,
      })] })],
    }),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
  ];
}

function blocoTabela({ cab, linhas, larguras }) {
  const total = larguras.reduce((a, b) => a + b, 0);
  const borda = { style: BorderStyle.SINGLE, size: 4, color: COR.linha };
  const bordas = { top: borda, bottom: borda, left: borda, right: borda };
  const celula = (texto, i, cabecalho) => new TableCell({
    width: { size: larguras[i], type: WidthType.DXA },
    borders: bordas,
    verticalAlign: VerticalAlign.CENTER,
    shading: cabecalho ? { type: ShadingType.CLEAR, color: "auto", fill: COR.marinho } : undefined,
    margins: { top: 70, bottom: 70, left: 120, right: 120 },
    children: [new Paragraph({
      children: cabecalho ? [new TextRun({ text: texto, bold: true, color: "FFFFFF", size: 19 })] : runs(texto, { size: 19 }),
    })],
  });
  return [
    new Table({
      width: { size: total, type: WidthType.DXA },
      columnWidths: larguras,
      rows: [
        new TableRow({ tableHeader: true, children: cab.map((t, i) => celula(t, i, true)) }),
        ...linhas.map((l) => new TableRow({ cantSplit: true, children: l.map((t, i) => celula(t, i, false)) })),
      ],
    }),
    new Paragraph({ spacing: { after: 160 }, children: [] }),
  ];
}

function renderizar(blocos) {
  const out = [];
  for (const b of blocos) {
    if (b.h2) out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(b.h2)] }));
    else if (b.h3) out.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(b.h3)] }));
    else if (b.p) out.push(p(b.p));
    else if (b.passos) out.push(...blocoPassos(b.passos));
    else if (b.lista) out.push(...blocoLista(b.lista));
    else if (b.fig) out.push(...blocoFigura(b.fig, b.legenda, b.largura));
    else if (b.caixa) out.push(...blocoCaixa(b));
    else if (b.tabela) out.push(...blocoTabela(b.tabela));
    else if (b.codigo) out.push(...blocoCodigo(b));
    else if (b.quebra) out.push(new Paragraph({ children: [new PageBreak()] }));
  }
  return out;
}

function capitulo(num, titulo, subtitulo, blocos) {
  figuraCap = num; figuraN = 0;
  return [
    new Paragraph({
      pageBreakBefore: true,  // e não um parágrafo com PageBreak: esse gera página em branco quando a anterior termina cheia
      spacing: { after: 0 },
      children: [new TextRun({ text: typeof num === "string" ? "APÊNDICE" : `CAPÍTULO ${num}`, bold: true,
        color: COR.destaque, size: 20, characterSpacing: 40 })],
    }),
    new Paragraph({ heading: HeadingLevel.HEADING_1,
      children: [new TextRun(typeof num === "string" ? titulo : `${num}. ${titulo}`)] }),
    new Paragraph({
      spacing: { after: 280 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COR.destaque, space: 8 } },
      children: [new TextRun({ text: subtitulo, color: COR.cinza, size: 22 })],
    }),
    ...renderizar(blocos),
  ];
}

// ================================================================ CONTEÚDO
// Um arquivo por capítulo em conteudo/ (capNN.js e apendices.js), na ordem do nome.
const PASTA_CONTEUDO = path.join(__dirname, MANUAL.conteudo);
const VERSOES = require("./" + MANUAL.versoes);
const ATUAL = VERSOES[VERSOES.length - 1];
const CAPITULOS = fs.readdirSync(PASTA_CONTEUDO)
  .filter((f) => f.endsWith(".js"))
  .sort()
  .map((f) => require(path.join(PASTA_CONTEUDO, f)));

// ================================================================ DOCUMENTO
function capa() {
  const logo = fs.readFileSync(LOGO);
  const d = sizeOf(logo);
  const w = 420;
  return [
    new Paragraph({ spacing: { before: 1800, after: 900 }, alignment: AlignmentType.CENTER,
      children: [new ImageRun({ type: "png", data: logo, transformation: { width: w, height: Math.round(w * d.height / d.width) },
        altText: { title: "Sysprep Studio", description: "Logo do Sysprep Studio", name: "logo" } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
      children: [new TextRun({ text: MANUAL.titulo, bold: true, size: 64, color: COR.marinho })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: COR.destaque, space: 16 } },
      children: [new TextRun({ text: MANUAL.chamada, size: 28, color: COR.cinza })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [new TextRun({ text: MANUAL.publico, size: 22, color: COR.cinza })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1800, after: 80 },
      children: [new TextRun({ text: `Versão ${ATUAL.versao}`, bold: true, size: 22, color: COR.destaque, characterSpacing: 40 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Sysprep Studio v${ATUAL.sistema} · ${ATUAL.data}`, size: 20, color: COR.cinza })] }),
  ];
}

// Última página: histórico de versões e alterações do manual (versoes.js).
function controleDeVersoes() {
  const larguras = [1000, 1400, 2300, 4938];
  const borda = { style: BorderStyle.SINGLE, size: 4, color: COR.linha };
  const bordas = { top: borda, bottom: borda, left: borda, right: borda };
  const cel = (filhos, i, cab) => new TableCell({
    width: { size: larguras[i], type: WidthType.DXA }, borders: bordas,
    shading: cab ? { type: ShadingType.CLEAR, color: "auto", fill: COR.marinho } : undefined,
    margins: { top: 70, bottom: 70, left: 120, right: 120 }, children: filhos,
  });
  const txt = (t, cab) => new Paragraph({ children: cab ? [new TextRun({ text: t, bold: true, color: "FFFFFF", size: 19 })] : runs(t, { size: 19 }) });
  const linhas = [...VERSOES].reverse().map((v) => new TableRow({ cantSplit: true, children: [
    cel([txt(`**${v.versao}**`)], 0), cel([txt(v.data)], 1), cel([txt(v.responsavel)], 2),
    cel(v.alteracoes.map((a) => new Paragraph({ numbering: { reference: "marcadores", level: 0 }, children: runs(a, { size: 19 }), spacing: { after: 40 } })), 3),
  ] }));
  return [
    new Paragraph({ pageBreakBefore: true, spacing: { after: 0 },
      children: [new TextRun({ text: "DOCUMENTO", bold: true, color: COR.destaque, size: 20, characterSpacing: 40 })] }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Controle de versões")] }),
    new Paragraph({ spacing: { after: 280 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COR.destaque, space: 8 } },
      children: [new TextRun({ text: "Histórico de versões e alterações deste manual", color: COR.cinza, size: 22 })] }),
    new Table({ width: { size: LARGURA_UTIL, type: WidthType.DXA }, columnWidths: larguras, rows: [
      new TableRow({ tableHeader: true, children: ["Versão", "Data", "Responsável", "Alterações"].map((t, i) => cel([txt(t, true)], i, true)) }),
      ...linhas,
    ] }),
    new Paragraph({ spacing: { before: 200 }, children: runs(`Versão atual: **${ATUAL.versao}**, de ${ATUAL.data}. As imagens usam dados fictícios.`, { size: 18, color: COR.cinza }) }),
  ];
}

function cabecalho() {
  const logo = fs.readFileSync(LOGO_CAB);
  const d = sizeOf(logo);
  return new Header({ children: [new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: LARGURA_UTIL }],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COR.linha, space: 6 } },
    children: [
      new ImageRun({ type: "png", data: logo, transformation: { width: Math.round(22 * d.width / d.height), height: 22 },
        altText: { title: "logo", description: "Sysprep Studio", name: "logo-cab" } }),
      new TextRun({ text: "\t" + MANUAL.titulo, size: 16, color: COR.cinza }),
    ],
  })] });
}

function rodape() {
  return new Footer({ children: [new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: LARGURA_UTIL }],
    children: [
      new TextRun({ text: MANUAL.rodape, size: 16, color: COR.cinza }),
      new TextRun({ children: ["\tPágina ", PageNumber.CURRENT, " de ", PageNumber.TOTAL_PAGES], size: 16, color: COR.cinza }),
    ],
  })] });
}

const doc = new Document({
  creator: "Sysprep Studio", title: `${MANUAL.titulo} – Sysprep Studio`, description: MANUAL.descricao,
  styles: {
    default: { document: { run: { font: FONTE, size: 21, color: "1F2937" }, paragraph: { spacing: { line: 276 } } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 44, bold: true, color: COR.marinho, font: FONTE }, paragraph: { spacing: { before: 0, after: 80 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, color: COR.marinho, font: FONTE }, paragraph: { spacing: { before: 360, after: 140 }, outlineLevel: 1, keepNext: true } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: COR.destaque, font: FONTE }, paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 2, keepNext: true } },
    ],
  },
  numbering: { config: [
    { reference: "passos", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
      style: { run: { bold: true, color: COR.destaque }, paragraph: { indent: { left: 440, hanging: 340 } } } }] },
    { reference: "marcadores", levels: [{ level: 0, format: LevelFormat.BULLET, text: "▪", alignment: AlignmentType.LEFT,
      style: { run: { color: COR.destaque }, paragraph: { indent: { left: 440, hanging: 300 } } } }] },
  ] },
  sections: [
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      children: capa() },
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1300, bottom: 1134, left: 1134, right: 1134, header: 600, footer: 500 } } },
      headers: { default: cabecalho() }, footers: { default: rodape() },
      children: [
        new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Sumário", bold: true, size: 32, color: COR.marinho })] }),
        new TableOfContents("Sumário", { hyperlink: true, headingStyleRange: "1-2" }),
        ...CAPITULOS.flatMap((c) => capitulo(c.num, c.titulo, c.subtitulo, c.blocos)),
        ...controleDeVersoes(),
      ] },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(SAIDA, buf);
  console.log("gerado:", SAIDA);
});
