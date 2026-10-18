module.exports = {
  num: 8,
  titulo: "Aplicativo e desenvolvimento",
  subtitulo: "Instalar como aplicativo e rodar o código sem Docker",
  blocos: [
    { h2: "8.1 Instalar como aplicativo" },
    { p: "O Sysprep Studio pode ser instalado como aplicativo (PWA): ganha ícone no menu Iniciar e janela própria. No Chrome ou no Edge, clique em **Instalar app** no cabeçalho da tela de perfis, ou no ícone de instalação na barra de endereço." },
    { caixa: "atencao", texto: "O navegador só oferece a instalação em `http://localhost` ou em endereço **HTTPS**. Publicado na rede sem HTTPS, o botão não aparece." },
    { caixa: "dica", texto: "O aplicativo guarda só a \"casca\" da página para abrir rápido. Perfis, senhas e chaves continuam só no servidor: nada disso fica no cache do navegador." },

    { h2: "8.2 Rodar sem Docker (desenvolvimento)" },
    { p: "Para alterar o código, rode a API e a página separadas. Precisa de Python 3.12 e Node.js 22." },
    { codigo: "# API (porta 8000) e testes\ncd backend\npython -m venv .venv\n.venv\\Scripts\\pip install -r requirements-dev.txt\n.venv\\Scripts\\python -m pytest\n.venv\\Scripts\\uvicorn app.main:app --reload\n\n# página (porta 5173, repassa /api para a 8000)\ncd frontend\nnpm install\nnpm run dev" },
    { lista: [
      "No Linux, troque `.venv\\Scripts\\` por `.venv/bin/`.",
      "`frontend/src/tipos.ts` espelha `backend/app/modelo.py`: altere os dois juntos.",
      "Toda mudança sobe a versão em `frontend/package.json` e ganha uma entrada no `CHANGELOG.md`.",
    ] },

    { h2: "8.3 Refazer os manuais" },
    { p: "Os dois manuais saem de `docs/manual/ferramentas/` (o `README.md` de lá tem os comandos). Os prints vêm de um contêiner separado, na porta 8091, com perfis fictícios: os perfis reais não são tocados." },
  ],
};
