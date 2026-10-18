import { Plus, Trash2 } from "lucide-react";
import { useEditor } from "../editor";
import { Cartao, Grade, Nota, Secao, Texto, Toggle } from "../componentes/campos";
import type { LocalTela, UnidadeTela } from "../tipos";

const novaUnidade = (): UnidadeTela => ({ codigo: "", nome: "", ou: "", locais: [novoLocal()] });
const novoLocal = (): LocalTela => ({ codigo: "", nome: "", ou: "" });

// Mesma regra de backend/app/tela_inicial.py (montar_nome) e do Tela-Inicial.ps1
function montarNome(padrao: string, unidade: string, local: string, pc: number, digitos: number) {
  return padrao
    .replaceAll("{unidade}", unidade.trim())
    .replaceAll("{local}", local.trim())
    .replaceAll("{pc}", String(pc).padStart(digitos, "0"))
    .toUpperCase();
}

export function TelaInicial() {
  const { perfil, set } = useEditor();
  const t = perfil.tela_inicial;
  const ing = perfil.rede.ingresso;
  const dominio = ing.modo === "dominio";
  const admins = perfil.contas.locais.filter((c) => c.nome && c.grupo.split(";").includes("Administrators"));
  const rotuloLocal = t.rotulo_local || "Local";
  const rotuloUnidade = t.rotulo_unidade || "Unidade";

  const setUnidades = (l: UnidadeTela[]) => set("tela_inicial.unidades", l);
  const alterarUnidade = (i: number, campo: "codigo" | "nome" | "ou", valor: string) =>
    setUnidades(t.unidades.map((u, j) => (j === i ? { ...u, [campo]: valor } : u)));
  const removerUnidade = (i: number) => {
    const u = t.unidades[i];
    if (!confirm(`Excluir ${rotuloUnidade.toLowerCase()} "${u.nome || u.codigo || "sem nome"}" e seus locais?`)) return;
    setUnidades(t.unidades.filter((_, j) => j !== i));
  };
  const setLocais = (i: number, locais: LocalTela[]) =>
    setUnidades(t.unidades.map((u, j) => (j === i ? { ...u, locais } : u)));
  const alterarLocal = (i: number, k: number, campo: keyof LocalTela, valor: string) =>
    setLocais(i, t.unidades[i].locais.map((l, j) => (j === k ? { ...l, [campo]: valor } : l)));

  const maior = 10 ** t.digitos_pc - 1;
  const exemplos = t.unidades.flatMap((u) => u.locais.map((l) => montarNome(t.padrao_nome, u.codigo, l.codigo, maior, t.digitos_pc)));
  const maisLongo = exemplos.reduce((a, b) => (b.length > a.length ? b : a), "");
  const primeiro = t.unidades[0]?.locais[0];
  const exemplo = primeiro ? montarNome(t.padrao_nome, t.unidades[0].codigo, primeiro.codigo, 1, t.digitos_pc) : "";

  return (
    <Secao
      titulo="Tela inicial"
      descricao="Uma tela no primeiro logon da máquina clonada, onde você escolhe a unidade, o local (setor, sala) e o número do PC. A máquina recebe o nome do padrão e, com domínio, entra nele já com esse nome, direto na OU do local."
    >
      <Cartao titulo="Tela de configuração inicial" extra={<Toggle caminho="tela_inicial.ativo" rotulo="Ativar" />}>
        {t.ativo ? (
          <>
            <Grade>
              <div className="campo">
                <label>Conta que abre a tela</label>
                <select value={t.conta} onChange={(e) => set("tela_inicial.conta", e.target.value)}>
                  <option value="">Escolha…</option>
                  {admins.map((c) => (
                    <option key={c.nome} value={c.nome}>
                      {c.nome}
                    </option>
                  ))}
                </select>
                <small className="dica">Conta local administradora. Ela entra sozinha uma única vez para abrir a tela.</small>
              </div>
              <Toggle
                caminho="tela_inicial.permitir_pular"
                rotulo="Permitir “Pular (configurar depois)”"
                dica="A máquina fica fora do domínio e a tela volta no próximo logon dessa conta."
              />
            </Grade>
            <Nota>
              {dominio ? (
                <>
                  Com a tela, o ingresso no domínio <strong>{ing.dominio || "(Domínio)"}</strong> sai do sysprep.xml: é a tela
                  que entra no domínio, com a credencial da seção <strong>Domínio</strong>, já com o nome escolhido. Ela testa a conexão com
                  o domínio e avisa se o nome já existe no AD. Depois desliga o logon automático, apaga a configuração e reinicia.
                </>
              ) : (
                <>
                  Sem domínio configurado na seção <strong>Domínio</strong>, a tela só renomeia a máquina. Para entrar no domínio já com o nome,
                  escolha “Domínio Active Directory” lá.
                </>
              )}
            </Nota>
          </>
        ) : (
          <p className="vazio">A máquina usa o nome definido em Identidade.</p>
        )}
      </Cartao>

      {t.ativo && (
        <>
          <Cartao titulo="Padrão do nome">
            <Grade>
              <Texto
                caminho="tela_inicial.padrao_nome"
                rotulo="Padrão"
                mono
                placeholder="{unidade}{local}PC{pc}"
                dica={<>Campos: <code>{"{unidade}"}</code>, <code>{"{local}"}</code> e <code>{"{pc}"}</code>. Máximo de 15 caracteres no nome final.</>}
              />
              <div className="campo">
                <label>Dígitos do nº do PC</label>
                <select value={t.digitos_pc} onChange={(e) => set("tela_inicial.digitos_pc", Number(e.target.value))}>
                  <option value={1}>1 (PC1 a PC9)</option>
                  <option value={2}>2 (PC01 a PC99)</option>
                  <option value={3}>3 (PC001 a PC999)</option>
                </select>
              </div>
              <Texto caminho="tela_inicial.rotulo_unidade" rotulo="Como chamar a unidade na tela" placeholder="Unidade" dica="Ex.: Unidade, Filial, Prédio." />
              <Texto caminho="tela_inicial.rotulo_local" rotulo="Como chamar o local na tela" placeholder="Setor" dica="Ex.: Setor, Sala, Andar, Laboratório." />
            </Grade>
            {exemplo && (
              <p className="dica">
                Exemplo: <code>{exemplo}</code>
                {maisLongo && (
                  <>
                    {" "}· nome mais longo possível: <code>{maisLongo}</code> ({maisLongo.length} caracteres)
                  </>
                )}
              </p>
            )}
          </Cartao>

          <div className="contas">
            {t.unidades.map((u, i) => (
              <Cartao
                key={i}
                titulo={`${rotuloUnidade} ${u.codigo || "nova"}${u.nome ? ` · ${u.nome}` : ""}`}
                extra={
                  <button type="button" className="icone perigo" title={`Excluir ${rotuloUnidade.toLowerCase()}`} onClick={() => removerUnidade(i)}>
                    <Trash2 size={16} />
                  </button>
                }
              >
                <Grade colunas={dominio ? 3 : 2}>
                  <div className="campo">
                    <label>Código (entra no nome)</label>
                    <input className="mono" value={u.codigo} placeholder="SP" onChange={(e) => alterarUnidade(i, "codigo", e.target.value.toUpperCase())} />
                  </div>
                  <div className="campo">
                    <label>Nome exibido na tela</label>
                    <input value={u.nome} placeholder="Matriz São Paulo" onChange={(e) => alterarUnidade(i, "nome", e.target.value)} />
                  </div>
                  {dominio && (
                    <div className="campo">
                      <label>OU padrão da {rotuloUnidade.toLowerCase()}</label>
                      <input className="mono" value={u.ou} placeholder={ing.ou || "OU=SP,DC=empresa,DC=local"} onChange={(e) => alterarUnidade(i, "ou", e.target.value)} />
                    </div>
                  )}
                </Grade>

                <h4 className="subtitulo">Locais</h4>
                <div className="locais">
                  {u.locais.map((l, k) => (
                    <div key={k} className={`linha-local ${dominio ? "com-ou" : ""}`}>
                      <div className="campo">
                        <label>Código</label>
                        <input className="mono" value={l.codigo} placeholder={String(k + 1)} onChange={(e) => alterarLocal(i, k, "codigo", e.target.value.toUpperCase())} />
                      </div>
                      <div className="campo">
                        <label>Nome exibido</label>
                        <input value={l.nome} placeholder={`${rotuloLocal} ${k + 1}`} onChange={(e) => alterarLocal(i, k, "nome", e.target.value)} />
                      </div>
                      {dominio && (
                        <div className="campo">
                          <label>OU</label>
                          <input
                            className="mono"
                            value={l.ou}
                            placeholder={u.ou || ing.ou || "padrão do domínio (Computers)"}
                            onChange={(e) => alterarLocal(i, k, "ou", e.target.value)}
                          />
                        </div>
                      )}
                      <button
                        type="button"
                        className="icone perigo"
                        title={`Excluir ${rotuloLocal.toLowerCase()}`}
                        onClick={() => setLocais(i, u.locais.filter((_, j) => j !== k))}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button type="button" className="botao adicionar" onClick={() => setLocais(i, [...u.locais, novoLocal()])}>
                    <Plus size={16} /> Adicionar {rotuloLocal.toLowerCase()}
                  </button>
                </div>
              </Cartao>
            ))}
            <button type="button" className="botao adicionar" onClick={() => setUnidades([...t.unidades, novaUnidade()])}>
              <Plus size={16} /> Adicionar {rotuloUnidade.toLowerCase()}
            </button>
          </div>

          {dominio && (
            <Nota tipo="aviso">
              OU vazia herda a da {rotuloUnidade.toLowerCase()}, e esta a da seção <strong>Domínio</strong>. Na reimagem o nome já existe no
              AD: desde a KB5020276 (out/2022), a conta de ingresso só reaproveita um objeto que ela mesma criou, a menos que a GPO
              “Domain controller: Allow computer account re-use during domain join” a autorize. A senha do domínio fica num arquivo restrito
              a SYSTEM e Administradores até a máquina entrar no domínio.
            </Nota>
          )}
        </>
      )}
    </Secao>
  );
}
