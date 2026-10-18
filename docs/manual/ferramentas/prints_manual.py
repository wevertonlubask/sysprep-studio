"""Tira os prints do manual a partir do contêiner sysprep-studio-manual (porta 8091, dados fictícios).

Pré-requisitos: contêiner do manual no ar e semear_manual.py já rodado.
Uso (raiz do projeto):  python docs/manual/ferramentas/prints_manual.py [capitulo ...]

Cada capítulo é uma função `cap_<nome>`; os arquivos saem em docs/manual/prints/<cap>-<nn>-<nome>.png.
As marcações (caixa + número) são desenhadas por cima da página antes do print e batem com os
números [n] do texto do manual. Os prints da Tela inicial do Windows saem de tela_inicial_demo.py.
"""
import io
import json
import sys
import urllib.request
import zipfile
from html import escape
from pathlib import Path

from playwright.sync_api import sync_playwright

AQUI = Path(__file__).resolve().parent
SAIDA = AQUI.parent / "prints"
BASE = "http://localhost:8091"
COR = "#6A4CF5"  # violeta da marca (o mesmo "destaque" do gerar_manual.js)
IDS = json.loads((AQUI / ".ids-manual.json").read_text())

_JS_MARCAR = """
(itens) => {
  document.querySelectorAll('.manual-marca').forEach(e => e.remove());
  for (const it of itens) {
    // `txt`: entre os que casam com `sel`, o primeiro visível cujo texto contém `txt`.
    const el = it.txt
      ? [...document.querySelectorAll(it.sel)].find(e => e.offsetParent !== null && e.innerText.includes(it.txt))
      : document.querySelector(it.sel);
    if (!el) { console.warn('sem ' + it.sel); continue; }
    const r = el.getBoundingClientRect();
    const p = it.pad ?? 4;
    const caixa = document.createElement('div');
    caixa.className = 'manual-marca';
    Object.assign(caixa.style, {
      position: 'fixed', zIndex: 2147483646, pointerEvents: 'none',
      left: (r.left - p) + 'px', top: (r.top - p) + 'px',
      width: (r.width + 2 * p) + 'px', height: (r.height + 2 * p) + 'px',
      border: '3px solid %(cor)s', borderRadius: '8px', boxSizing: 'border-box'
    });
    document.body.appendChild(caixa);
    if (it.n != null) {
      const b = document.createElement('div');
      b.className = 'manual-marca';
      b.textContent = it.n;
      const lado = it.lado || 'esq';
      Object.assign(b.style, {
        position: 'fixed', zIndex: 2147483647, pointerEvents: 'none',
        // sem passar da borda da janela: a bolinha cortada não se lê no print
        left: Math.min(innerWidth - 36, Math.max(2, lado === 'dir' ? r.right + p - 16 : r.left - p - 16)) + 'px',
        top: Math.max(2, r.top - p - 16) + 'px',
        width: '32px', height: '32px', borderRadius: '50%%', background: '%(cor)s', color: '#fff',
        font: '700 17px/32px Segoe UI, Arial, sans-serif', textAlign: 'center',
        boxShadow: '0 2px 6px rgba(0,0,0,.35)', border: '2px solid #fff'
      });
      document.body.appendChild(b);
    }
  }
}
""" % {"cor": COR}


class Tela:
    def __init__(self, nav, cap: str, largura=1280, altura=800, recolhido=False):
        self.ctx = nav.new_context(viewport={"width": largura, "height": altura}, device_scale_factor=1.5,
                                   color_scheme="light", locale="pt-BR", timezone_id="America/Sao_Paulo")
        self.ctx.add_init_script("try { localStorage.setItem('sysprep.menu.recolhido', '%s'); } catch (e) {}"
                                 % ("1" if recolhido else "0"))
        self.pg = self.ctx.new_page()
        self.cap, self.n, self.largura, self.altura = cap, 0, largura, altura

    def abrir(self, rota: str):
        self.pg.set_viewport_size({"width": self.largura, "height": self.altura})
        # carga completa: só trocar o hash manteria as marcações e o estado não salvo do print anterior
        self.pg.goto("about:blank")
        self.pg.goto(BASE + "/#" + rota, wait_until="networkidle")
        self.pg.add_style_tag(content="*, *::before, *::after { transition: none !important; animation: none !important; }"
                                      " .toast { display: none !important; }")
        self.pg.wait_for_timeout(900)  # prévia/validação com debounce

    def editor(self, perfil: str, secao: str):
        self.abrir(f"/p/{IDS[perfil]}/{secao}")

    def marcar(self, itens: list[dict]):
        self.pg.evaluate(_JS_MARCAR, itens)

    def _arquivo(self, nome: str) -> str:
        self.n += 1
        return str(SAIDA / f"{self.cap}-{self.n:02d}-{nome}.png")

    def janela(self, nome: str):
        caminho = self._arquivo(nome)
        self.pg.screenshot(path=caminho)
        print("print:", Path(caminho).name)

    def secao(self, nome: str, marcas: list[dict] | None = None):
        """Só a área de conteúdo do editor, inteira: a janela cresce até caber sem rolar."""
        altura = self.pg.evaluate("() => { const c = document.querySelector('.conteudo');"
                                  " return c.scrollHeight + (window.innerHeight - c.clientHeight); }")
        self.pg.set_viewport_size({"width": self.largura, "height": min(int(altura) + 8, 4000)})
        self.pg.wait_for_timeout(300)
        if marcas:
            self.marcar(marcas)
        # recorte: só o que a seção ocupa (seção + avisos), sem o fundo vazio embaixo
        caixa = self.pg.evaluate("""() => {
          const c = document.querySelector('.conteudo'), r = c.getBoundingClientRect();
          let topo = Infinity, fim = 0;
          for (const f of c.children) { const b = f.getBoundingClientRect(); topo = Math.min(topo, b.top); fim = Math.max(fim, b.bottom); }
          return { x: r.left, y: Math.max(r.top, topo - 24), width: r.width, height: Math.min(r.bottom, fim + 28) - Math.max(r.top, topo - 24) };
        }""")
        caminho = self._arquivo(nome)
        self.pg.screenshot(path=caminho, clip=caixa)
        print("print:", Path(caminho).name)
        self.pg.set_viewport_size({"width": self.largura, "height": self.altura})

    def fechar(self):
        self.ctx.close()


def cartao(txt: str, n: int | None = None, **k) -> dict:
    return {"sel": ".cartao", "txt": txt, "n": n, **k}


# ================================================================ capítulos
def cap_perfis(nav):
    t = Tela(nav, "02", 1280, 860)
    t.abrir("/")
    t.janela("tela-perfis")
    t.marcar([
        {"sel": "#novo-nome", "n": 1},
        {"sel": "form.novo-perfil .escolha-opcoes", "n": 2},
        {"sel": "form.novo-perfil button[type=submit]", "n": 3},
        {"sel": ".cartao.importar", "n": 4, "lado": "dir"},
    ])
    t.janela("novo-e-importar")
    t.marcar([
        {"sel": ".lista-perfis li:last-child .perfil-abrir", "n": 1},
        {"sel": ".lista-perfis li:last-child button[title=Renomear]", "n": 2, "pad": 2},
        {"sel": ".lista-perfis li:last-child button[title=Duplicar]", "n": 3, "pad": 2, "lado": "dir"},
        {"sel": ".lista-perfis li:last-child button[title=Excluir]", "n": 4, "pad": 2, "lado": "dir"},
    ])
    t.janela("acoes-do-perfil")
    t.fechar()


def cap_editor(nav):
    t = Tela(nav, "03", 1440, 900)
    t.editor("completo", "contas")
    t.marcar([
        {"sel": ".lateral", "n": 1, "pad": 0},
        {"sel": ".barra-titulo", "n": 2},
        {"sel": ".resumo-validacao", "n": 3},
        {"sel": ".barra-acoes button.secundario", "n": 4},
        {"sel": ".barra-acoes button.primario", "n": 5},
        {"sel": ".barra-acoes button.icone", "n": 6, "lado": "dir"},
        {"sel": ".painel", "n": 7, "pad": -2, "lado": "dir"},
    ])
    t.janela("visao-geral")
    t.pg.click(".nav-categoria[title='Contas e domínio']")
    t.pg.wait_for_timeout(300)
    t.marcar([{"sel": ".nav-janela", "n": 1, "lado": "dir"}])
    t.janela("janela-do-grupo")
    t.pg.click(".secao > .descricao, .secao h1, .secao h2")  # clique fora fecha a janela (Esc fecharia a prévia)
    t.pg.click(".painel .abas button:has-text('pacote.json')")
    t.pg.wait_for_timeout(300)
    t.marcar([{"sel": ".painel .abas", "n": 1, "lado": "dir"}])
    t.janela("previa-pacote-json")
    t.fechar()

    t = Tela(nav, "03", 1280, 800, recolhido=True)
    t.n = 3
    t.editor("rascunho", "licenca")
    t.marcar([{"sel": ".lateral", "n": 1, "pad": 0}, {"sel": ".avisos-secao", "n": 2},
              {"sel": ".resumo-validacao", "n": 3}])
    t.janela("menu-recolhido-e-avisos")
    t.fechar()


def cap_instalacao(nav):
    t = Tela(nav, "04")
    t.editor("completo", "geral"); t.secao("geral")
    t.editor("completo", "licenca")  # chave genérica (GVLK) só na tela, sem salvar
    t.pg.click(".escolha-rotulo:text-is('Chave do produto')")
    t.pg.click(".atalhos button:has-text('Pro (GVLK)')")
    t.pg.wait_for_timeout(900)
    t.secao("licenca", [{"sel": ".escolha", "n": 1}, {"sel": ".atalhos", "n": 2}, {"sel": ".toggle", "n": 3}])
    t.editor("completo", "regiao"); t.secao("regiao")
    t.editor("completo", "oobe"); t.secao("oobe", [cartao("Pular o OOBE", 1), cartao("Telas individuais", 2),
                                                   cartao("Padrões aceitos", 3)])
    t.editor("completo", "identidade"); t.secao("identidade", [cartao("Nome do computador", 1), cartao("Registro", 2),
                                                               cartao("Informações de suporte", 3)])
    t.fechar()


def cap_contas(nav):
    t = Tela(nav, "05")
    t.editor("completo", "contas")
    t.secao("contas", [cartao("Suporte TI", 1), {"sel": ".botao.adicionar", "n": 2}, cartao("Logon automático", 3),
                       cartao("Administrador embutido", 4), cartao("Política de senha", 5)])
    t.editor("completo", "dominio"); t.secao("dominio", [{"sel": ".escolha", "n": 1}, {"sel": ".grade", "n": 2}])
    t.editor("completo", "tela_inicial")
    t.secao("tela-inicial", [cartao("Tela de configuração inicial", 1), cartao("Padrão do nome", 2),
                             cartao("Matriz São Paulo", 3), {"sel": ".contas > .botao.adicionar", "n": 4}])
    t.fechar()


def cap_rede(nav):
    t = Tela(nav, "06")
    t.editor("completo", "wifi")
    t.secao("wifi", [cartao("Empresa-Corp", 1), {"sel": ".contas > .botao.adicionar", "n": 2}])
    t.editor("completo", "remoto"); t.secao("acesso-remoto")
    t.editor("completo", "firewall"); t.secao("firewall")
    t.editor("completo", "seguranca"); t.secao("seguranca")
    t.editor("completo", "privacidade"); t.secao("privacidade")
    t.editor("completo", "atualizacoes"); t.secao("windows-update")
    t.fechar()


def cap_sistema(nav):
    t = Tela(nav, "07")
    t.editor("completo", "personalizacao")
    t.secao("aparencia", [cartao("Papel de parede", 1), cartao("Tela de bloqueio", 2), cartao("Tema e barra", 3),
                          cartao("Exibição", 4), cartao("Explorador de Arquivos", 5), cartao("Perfil modelo", 6)])
    t.editor("completo", "apps")
    t.secao("apps", [cartao("Apps a remover", 1), cartao("OneDrive e Edge", 2), cartao("Recursos opcionais", 3)])
    t.editor("completo", "drivers")
    t.secao("drivers", [{"sel": ".envio", "n": 1}, {"sel": ".lista-drivers", "n": 2}])
    t.editor("completo", "energia"); t.secao("energia")
    t.editor("completo", "comandos")
    t.secao("comandos", [cartao("Passe specialize", 1), cartao("Primeiro logon", 2)])
    t.editor("completo", "sysprep"); t.secao("sysprep")
    t.fechar()


def cap_gerar(nav):
    t = Tela(nav, "08")
    t.editor("completo", "gerar")
    t.secao("gerar", [cartao("Verificação", 1), cartao("Conteúdo do pacote", 2),
                      {"sel": ".gerar-acoes button.primario", "n": 3}, {"sel": ".gerar-acoes button.secundario", "n": 4}])
    t.editor("rascunho", "gerar")
    t.secao("com-erros", [cartao("Verificação", 1), {"sel": ".gerar-acoes", "n": 2}])
    t.fechar()


def cap_pacote(nav):
    """09: o LEIA-ME.txt do pacote do perfil completo, como aparece no Bloco de Notas."""
    with urllib.request.urlopen(f"{BASE}/api/perfis/{IDS['completo']}/pacote") as r:
        z = zipfile.ZipFile(io.BytesIO(r.read()))
    raiz = z.namelist()[0].split("/")[0]
    leia = z.read(f"{raiz}/LEIA-ME.txt").decode("utf-8-sig").splitlines()
    t = Tela(nav, "09", 900, 400)
    for nome, ini, fim in (("leia-me-como-usar", 0, 26),):
        html = ("<body style='margin:0;background:#fff'><div style='border:1px solid #c4cbd6'>"
                "<div style='background:#f1f3f7;border-bottom:1px solid #c4cbd6;padding:8px 14px;"
                "font:13px Segoe UI'>LEIA-ME.txt</div><pre style='margin:0;padding:14px 18px;"
                "font:14px/1.45 Consolas,monospace;color:#161b22'>%s</pre></div></body>"
                % escape("\n".join(leia[ini:fim])))
        t.pg.set_content(html)
        caminho = t._arquivo(nome)
        t.pg.locator("body > div").screenshot(path=caminho)
        print("print:", Path(caminho).name)
    t.fechar()


CAPITULOS = {
    "perfis": cap_perfis, "editor": cap_editor, "instalacao": cap_instalacao, "contas": cap_contas,
    "rede": cap_rede, "sistema": cap_sistema, "gerar": cap_gerar, "pacote": cap_pacote,
}

if __name__ == "__main__":
    SAIDA.mkdir(exist_ok=True)
    escolhidos = sys.argv[1:] or list(CAPITULOS)
    with sync_playwright() as pw:
        nav = pw.chromium.launch()
        for c in escolhidos:
            CAPITULOS[c](nav)
        nav.close()
