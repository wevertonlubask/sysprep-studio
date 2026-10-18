import { useEditor } from "../editor";
import { Cartao, Escolha, EnvioImagem, Grade, Nota, Secao, Texto, Toggle } from "../componentes/campos";

export function Licenca() {
  const { perfil, catalogo, set } = useEditor();
  return (
    <Secao
      titulo="Licença e ativação"
      descricao="Define a chave gravada no passe specialize. Sem chave, cada máquina usa a licença OEM da própria firmware."
    >
      <Cartao>
        <Escolha
          caminho="licenca.modo"
          rotulo="Como a máquina será ativada"
          opcoes={[
            { valor: "oem", rotulo: "Licença OEM da firmware", descricao: "Sem chave no XML. Cada máquina lê a chave gravada de fábrica (MSDM) e ativa sozinha." },
            { valor: "chave", rotulo: "Chave do produto", descricao: "MAK, KMS (GVLK) ou varejo. A chave vai no sysprep.xml." },
          ]}
        />
        {perfil.licenca.modo === "chave" && (
          <>
            <Texto
              caminho="licenca.chave"
              rotulo="Chave do produto"
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
              maiusculas
              mono
              maxLength={29}
              dica="A chave precisa ser da MESMA edição da imagem (ex.: MAK de Education não ativa Pro Education)."
            />
            <div className="atalhos">
              <span>Chaves genéricas KMS (só ativam com servidor KMS):</span>
              {catalogo.chaves_genericas.map((c) => (
                <button key={c.id} type="button" className="botao chip" onClick={() => set("licenca.chave", c.id)}>
                  {c.nome}
                </button>
              ))}
            </div>
            <Toggle
              caminho="licenca.reforcar_no_primeiro_logon"
              rotulo="Reinstalar e ativar a chave no primeiro logon"
              dica={
                <>
                  Garante a chave mesmo se o Windows preferir a OEM da placa-mãe: roda <code>slmgr /ipk</code> e{" "}
                  <code>slmgr /ato</code> e grava o resultado em <code>C:\Windows\Temp\SysprepStudio-ativacao.log</code>.
                </>
              }
            />
          </>
        )}
      </Cartao>
      <Nota>
        Para conferir a chave OEM de uma máquina: <code>(Get-CimInstance SoftwareLicensingService).OA3xOriginalProductKey</code>.
        Depois de aplicar a imagem, valide com <code>slmgr /dlv</code> e <code>slmgr /xpr</code>.
      </Nota>
    </Secao>
  );
}

export function Identidade() {
  const { perfil } = useEditor();
  const idt = perfil.identidade;
  return (
    <Secao titulo="Identidade do computador" descricao="Nome da máquina, proprietário registrado e as informações de suporte exibidas em Configurações > Sistema > Sobre.">
      <Cartao titulo="Nome do computador">
        <Escolha
          caminho="identidade.nome_computador_modo"
          rotulo="Nome"
          opcoes={[
            { valor: "aleatorio", rotulo: "Aleatório (DESKTOP-XXXX)", descricao: "Recomendado para imagem clonada: cada máquina recebe um nome único." },
            { valor: "fixo", rotulo: "Fixo", descricao: "Todas as máquinas terão o mesmo nome. Use só para uma única máquina." },
          ]}
        />
        {idt.nome_computador_modo === "fixo" && (
          <Texto caminho="identidade.nome_computador" rotulo="Nome fixo" maxLength={15} maiusculas mono dica="Até 15 caracteres: letras, números e hífen." />
        )}
      </Cartao>
      <Cartao titulo="Registro">
        <Grade>
          <Texto caminho="identidade.proprietario" rotulo="Proprietário registrado" placeholder="Empresa Exemplo" />
          <Texto caminho="identidade.organizacao" rotulo="Organização" placeholder="Empresa Exemplo Ltda" />
        </Grade>
      </Cartao>
      <Cartao titulo="Informações de suporte (OEM)" extra={<Toggle caminho="identidade.oem.ativo" rotulo="Exibir" />}>
        {idt.oem.ativo ? (
          <>
            <Grade>
              <Texto caminho="identidade.oem.fabricante" rotulo="Fabricante" placeholder="Empresa Exemplo" />
              <Texto caminho="identidade.oem.modelo" rotulo="Modelo" placeholder="Estação padrão" />
              <Texto caminho="identidade.oem.telefone_suporte" rotulo="Telefone de suporte" placeholder="(00) 0000-0000" />
              <Texto caminho="identidade.oem.horario_suporte" rotulo="Horário de suporte" placeholder="Seg a sex, 8h às 18h" />
            </Grade>
            <Texto caminho="identidade.oem.url_suporte" rotulo="Site de suporte" placeholder="https://" />
            <EnvioImagem
              slot="logo_oem"
              caminho="identidade.oem.logo"
              rotulo="Logo"
              dica="Convertido automaticamente para BMP 120×120 (exigência do Windows)."
            />
          </>
        ) : (
          <p className="vazio">Desligado: a página Sobre mostra apenas os dados do Windows.</p>
        )}
      </Cartao>
    </Secao>
  );
}

export function Regiao() {
  const { catalogo } = useEditor();
  return (
    <Secao titulo="Idioma e região" descricao="Aplicado no passe oobeSystem (International-Core) e no fuso horário do specialize.">
      <Cartao>
        <Grade>
          <Texto caminho="regiao.idioma_interface" rotulo="Idioma da interface" sugestoes={catalogo.idiomas} dica="O pacote de idioma precisa estar instalado na imagem." />
          <Texto caminho="regiao.teclado" rotulo="Layout do teclado" sugestoes={catalogo.teclados} mono dica="0416:00010416 = ABNT2" />
          <Texto caminho="regiao.localidade_sistema" rotulo="Localidade do sistema" sugestoes={catalogo.idiomas} dica="Programas não Unicode" />
          <Texto caminho="regiao.localidade_usuario" rotulo="Formato (data, moeda)" sugestoes={catalogo.idiomas} />
        </Grade>
        <Texto caminho="regiao.fuso_horario" rotulo="Fuso horário" sugestoes={catalogo.fusos} dica="Identificador do Windows (tzutil /l)." />
      </Cartao>
    </Secao>
  );
}
