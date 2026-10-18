import { Images } from "lucide-react";
import { useEditor } from "../editor";
import { Cartao, EnvioImagem, Escolha, Grade, Nota, Secao, Selecao, Toggle } from "../componentes/campos";

const RESOLUCOES = [
  { valor: "", rotulo: "Recomendada de cada monitor (não alterar)" },
  ...[
    ["1920x1080", "Full HD, 16:9 - a mais comum"],
    ["1600x900", "16:9"],
    ["1366x768", "16:9"],
    ["1280x720", "HD, 16:9"],
    ["2560x1440", "QHD, 16:9"],
    ["3840x2160", "4K, 16:9"],
    ["1920x1200", "16:10"],
    ["1680x1050", "16:10"],
    ["1440x900", "16:10"],
    ["1280x800", "16:10"],
    ["1280x1024", "5:4"],
    ["1024x768", "4:3"],
  ].map(([v, d]) => ({ valor: v, rotulo: `${v.replace("x", " × ")} (${d})` })),
];

/** Reaproveita a imagem ja enviada no outro campo (papel de parede <-> tela de bloqueio). */
function UsarMesmaImagem({ de, para, rotulo }: { de: string; para: string; rotulo: string }) {
  const { imagens, set } = useEditor();
  if (!de || !imagens[de] || de === para) return null;
  return (
    <div className="atalhos">
      <button type="button" className="botao chip" onClick={() => set(rotulo, de)}>
        <Images size={14} aria-hidden /> Usar a mesma imagem ({de})
      </button>
    </div>
  );
}

export function Personalizacao() {
  const { perfil } = useEditor();
  const pz = perfil.personalizacao;
  const ex = perfil.exibicao;
  return (
    <Secao
      titulo="Aparência e área de trabalho"
      descricao="Tudo começa no padrão do Windows. Só o que você mudar aqui entra na imagem."
    >
      <Cartao titulo="Papel de parede">
        <Escolha
          caminho="personalizacao.papel_parede_modo"
          rotulo="Modo"
          opcoes={[
            { valor: "padrao", rotulo: "Padrão do Windows", descricao: "Nada é alterado." },
            { valor: "inicial", rotulo: "Imagem inicial", descricao: "Aplicada no 1º logon de cada usuário. Ele pode trocar depois." },
            { valor: "fixo", rotulo: "Imagem fixa (travada)", descricao: "Política PersonalizationCSP. A opção fica acinzentada nas Configurações." },
          ]}
        />
        {pz.papel_parede_modo !== "padrao" && (
          <UsarMesmaImagem de={pz.tela_bloqueio_modo === "fixo" ? pz.tela_bloqueio : ""} para={pz.papel_parede} rotulo="personalizacao.papel_parede" />
        )}
        {pz.papel_parede_modo !== "padrao" && (
          <EnvioImagem slot="papel_parede" caminho="personalizacao.papel_parede" rotulo="Imagem do papel de parede" alvoMinimo={[1920, 1080]} dica="JPG, PNG ou BMP. Ideal: 1920×1080 ou maior, proporção 16:9." />
        )}
      </Cartao>

      <Cartao titulo="Tela de bloqueio">
        <Escolha
          caminho="personalizacao.tela_bloqueio_modo"
          rotulo="Modo"
          opcoes={[
            { valor: "padrao", rotulo: "Padrão do Windows" },
            { valor: "fixo", rotulo: "Imagem fixa (travada)", descricao: "Desliga o Spotlight automaticamente." },
          ]}
        />
        {pz.tela_bloqueio_modo === "fixo" && (
          <>
            <UsarMesmaImagem
              de={pz.papel_parede_modo !== "padrao" ? pz.papel_parede : ""}
              para={pz.tela_bloqueio}
              rotulo="personalizacao.tela_bloqueio"
            />
            <EnvioImagem slot="tela_bloqueio" caminho="personalizacao.tela_bloqueio" rotulo="Imagem da tela de bloqueio" alvoMinimo={[1920, 1080]} />
            <Toggle
              caminho="personalizacao.imagem_na_tela_login"
              rotulo="Mostrar a imagem também na tela de login (onde se digita a senha)"
              dica="Garante a política DisableLogonBackgroundImage = 0. Sem isso o Windows pode mostrar só uma cor sólida atrás do campo de senha."
            />
          </>
        )}
        <Toggle caminho="personalizacao.desativar_spotlight" rotulo="Desativar Windows Spotlight" dica="Sem as imagens e dicas do Bing na tela de bloqueio." />
        <Toggle caminho="personalizacao.login_sem_desfoque" rotulo="Tela de login sem desfoque" dica="A imagem aparece nítida atrás do campo de senha." />
      </Cartao>

      <Cartao titulo="Tema e barra de tarefas">
        <Escolha
          caminho="personalizacao.tema"
          rotulo="Tema"
          opcoes={[
            { valor: "padrao", rotulo: "Padrão" },
            { valor: "claro", rotulo: "Claro" },
            { valor: "escuro", rotulo: "Escuro" },
          ]}
        />
        <Escolha
          caminho="personalizacao.barra_alinhamento"
          rotulo="Alinhamento da barra de tarefas"
          opcoes={[
            { valor: "padrao", rotulo: "Centralizada (padrão)" },
            { valor: "esquerda", rotulo: "À esquerda" },
          ]}
        />
        <Escolha
          caminho="personalizacao.busca_barra"
          rotulo="Pesquisa na barra de tarefas"
          opcoes={[
            { valor: "padrao", rotulo: "Padrão" },
            { valor: "oculta", rotulo: "Oculta" },
            { valor: "icone", rotulo: "Só ícone" },
            { valor: "caixa", rotulo: "Caixa de pesquisa" },
          ]}
        />
        <Grade>
          <Toggle caminho="personalizacao.ocultar_visao_tarefas" rotulo="Ocultar botão Visão de Tarefas" />
          <Toggle caminho="personalizacao.ocultar_widgets" rotulo="Ocultar Widgets" dica="Por política da máquina." />
          <Toggle caminho="personalizacao.ocultar_chat" rotulo="Ocultar Chat/Teams" />
          <Toggle caminho="personalizacao.ocultar_recomendados_iniciar" rotulo="Ocultar “Recomendados” do Iniciar" dica="Education/Enterprise." />
        </Grade>
      </Cartao>

      <Cartao titulo="Exibição">
        <Selecao
          caminho="exibicao.resolucao"
          rotulo="Resolução"
          dica="A mesma em todas as máquinas, seja qual for o monitor. Monitor que não suporta o modo escolhido fica na recomendada."
          opcoes={RESOLUCOES}
        />
        <Escolha
          caminho="exibicao.telas"
          rotulo="Várias telas (monitor + projetor)"
          opcoes={[
            { valor: "padrao", rotulo: "Padrão do Windows" },
            { valor: "duplicar", rotulo: "Duplicar", descricao: "Projetor mostra o mesmo que o monitor." },
            { valor: "estender", rotulo: "Estender" },
          ]}
        />
        {(ex.resolucao || ex.telas !== "padrao") && (
          <Toggle
            caminho="exibicao.sempre"
            rotulo="Reaplicar em todo logon"
            dica="Desligado: aplica só no 1º logon de cada usuário, e a troca feita depois é mantida."
          />
        )}
        <Escolha
          caminho="exibicao.escala"
          rotulo="Escala (tamanho de texto, apps e itens)"
          dica="Uma escala única para todos os monitores. Vale a partir do logon de cada usuário."
          opcoes={[
            { valor: 0, rotulo: "Recomendada" },
            ...[100, 125, 150, 175, 200].map((v) => ({ valor: v, rotulo: `${v}%` })),
          ]}
        />
        <Escolha
          caminho="exibicao.tamanho_texto"
          rotulo="Tamanho do texto (Acessibilidade)"
          opcoes={[100, 115, 125, 150, 175, 200].map((v) => ({ valor: v, rotulo: v === 100 ? "Padrão" : `${v}%` }))}
        />
      </Cartao>

      <Cartao titulo="Explorador de Arquivos e área de trabalho">
        <Grade>
          <Toggle caminho="personalizacao.mostrar_extensoes" rotulo="Mostrar extensões de arquivo" />
          <Toggle caminho="personalizacao.mostrar_ocultos" rotulo="Mostrar arquivos ocultos" />
          <Toggle caminho="personalizacao.icone_este_computador" rotulo="Ícone “Este Computador” na área de trabalho" />
          <Toggle caminho="personalizacao.explorer_abre_este_computador" rotulo="Explorador abre em “Este Computador”" />
          <Toggle caminho="personalizacao.menu_contexto_classico" rotulo="Menu de contexto clássico (Windows 10)" />
        </Grade>
      </Cartao>

      <Cartao titulo="Perfil modelo">
        <Toggle
          caminho="personalizacao.copy_profile"
          rotulo="CopyProfile: copiar o perfil do Administrador de auditoria para todos os usuários"
          dica="Atalhos, configurações de apps e o que você ajustou manualmente em auditoria viram o padrão de cada conta nova."
        />
      </Cartao>

      <Nota>
        Os ajustes de tema, barra de tarefas e Explorador são por usuário: o script de preparo os grava no perfil do Administrador de
        auditoria e no perfil <code>Default</code>, então valem para toda conta nova, com ou sem CopyProfile.
      </Nota>
    </Secao>
  );
}
