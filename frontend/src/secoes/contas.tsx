import { ArrowDown, ArrowUp, Plus, ShieldCheck, Trash2, User } from "lucide-react";
import { useEditor } from "../editor";
import { Cartao, Grade, Nota, Numero, Secao, Senha, Toggle } from "../componentes/campos";
import type { Conta } from "../tipos";

const nova = (): Conta => ({ nome: "", nome_exibicao: "", descricao: "", grupo: "Users", senha: "" });

export function Contas() {
  const { perfil, catalogo, set } = useEditor();
  const c = perfil.contas;
  const grupos = catalogo.grupos_conta;
  const contaTela = perfil.tela_inicial.conta;

  // renomear/excluir precisa manter o logon automatico coerente: grava tudo junto
  const setContas = (locais: Conta[], usuarioAuto = c.autologon.usuario) =>
    set("contas", { ...c, locais, autologon: { ...c.autologon, usuario: usuarioAuto } });

  const alterar = (i: number, campo: keyof Conta, valor: string) => {
    const locais = c.locais.map((x, j) => (j === i ? { ...x, [campo]: valor } : x));
    const antigo = c.locais[i].nome;
    setContas(locais, campo === "nome" && c.autologon.usuario === antigo ? valor : c.autologon.usuario);
    if (campo === "nome" && contaTela === antigo) set("tela_inicial.conta", valor);
  };
  const remover = (i: number) => {
    const conta = c.locais[i];
    if (!confirm(`Excluir a conta "${conta.nome || "sem nome"}"?`)) return;
    setContas(c.locais.filter((_, j) => j !== i), c.autologon.usuario === conta.nome ? "" : c.autologon.usuario);
    if (contaTela === conta.nome) set("tela_inicial.conta", "");
  };
  const mover = (i: number, d: -1 | 1) => {
    const l = [...c.locais];
    [l[i], l[i + d]] = [l[i + d], l[i]];
    setContas(l);
  };

  return (
    <Secao
      titulo="Contas de usuário"
      descricao="Contas locais criadas no primeiro boot. As senhas são codificadas no XML com o sufixo correto automaticamente."
    >
      <div className="contas">
        {c.locais.map((conta, i) => {
          const admin = conta.grupo.split(";").includes("Administrators");
          const custom = !grupos.some((g) => g.id === conta.grupo);
          return (
            <Cartao
              key={i}
              titulo={conta.nome || "Nova conta"}
              extra={
                <div className="acoes-linha">
                  <span className={`selo ${admin ? "selo-admin" : ""}`}>
                    {admin ? <ShieldCheck size={14} /> : <User size={14} />}
                    {admin ? "Administrador" : "Padrão"}
                  </span>
                  <button type="button" className="icone" title="Subir" disabled={i === 0} onClick={() => mover(i, -1)}>
                    <ArrowUp size={16} />
                  </button>
                  <button type="button" className="icone" title="Descer" disabled={i === c.locais.length - 1} onClick={() => mover(i, 1)}>
                    <ArrowDown size={16} />
                  </button>
                  <button type="button" className="icone perigo" title="Excluir conta" onClick={() => remover(i)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              }
            >
              <Grade>
                <div className="campo">
                  <label>Nome de usuário (login)</label>
                  <input value={conta.nome} maxLength={20} onChange={(e) => alterar(i, "nome", e.target.value)} />
                </div>
                <div className="campo">
                  <label>Nome exibido</label>
                  <input value={conta.nome_exibicao} placeholder={conta.nome} onChange={(e) => alterar(i, "nome_exibicao", e.target.value)} />
                </div>
                <div className="campo">
                  <label>Grupo</label>
                  <select value={custom ? "__outro" : conta.grupo} onChange={(e) => alterar(i, "grupo", e.target.value === "__outro" ? "" : e.target.value)}>
                    {grupos.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nome} ({g.id})
                      </option>
                    ))}
                    <option value="__outro">Outro…</option>
                  </select>
                  {custom && (
                    <input className="mono" value={conta.grupo} placeholder="Grupo1;Grupo2" onChange={(e) => alterar(i, "grupo", e.target.value)} />
                  )}
                </div>
                <Senha caminho={`contas.locais.${i}.senha`} rotulo="Senha" />
              </Grade>
              <div className="campo">
                <label>Descrição</label>
                <input value={conta.descricao} onChange={(e) => alterar(i, "descricao", e.target.value)} />
              </div>
            </Cartao>
          );
        })}
        <button type="button" className="botao adicionar" onClick={() => setContas([...c.locais, nova()])}>
          <Plus size={16} /> Adicionar conta
        </button>
      </div>

      <Cartao titulo="Logon automático" extra={<Toggle caminho="contas.autologon.ativo" rotulo="Ativar" />}>
        {c.autologon.ativo ? (
          <Grade>
            <div className="campo">
              <label>Conta</label>
              <select value={c.autologon.usuario} onChange={(e) => set("contas.autologon.usuario", e.target.value)}>
                <option value="">Escolha…</option>
                {c.locais.filter((x) => x.nome).map((x) => (
                  <option key={x.nome} value={x.nome}>
                    {x.nome}
                  </option>
                ))}
              </select>
            </div>
            <Numero caminho="contas.autologon.quantidade" rotulo="Quantidade de logons" min={1} sufixo="vezes" />
          </Grade>
        ) : (
          <p className="vazio">A máquina para na tela de login.</p>
        )}
      </Cartao>

      <Cartao titulo="Administrador embutido">
        <Toggle
          caminho="contas.admin_embutido_ativo"
          rotulo="Ativar a conta Administrador embutida"
          dica="Fica desativada após o Sysprep. É ativada pelo SID (-500) no primeiro logon, em qualquer idioma."
        />
        {(c.admin_embutido_ativo || c.admin_embutido_senha) && (
          <Senha caminho="contas.admin_embutido_senha" rotulo="Senha do Administrador embutido" dica="Codificada com o sufixo AdministratorPassword." />
        )}
      </Cartao>

      <Cartao titulo="Política de senha">
        <Toggle caminho="contas.senhas_nao_expiram" rotulo="Senhas locais nunca expiram" dica="net accounts /maxpwage:UNLIMITED" />
      </Cartao>

      <Nota tipo="aviso">
        As senhas ficam em texto puro apenas na pasta <code>dados/</code> desta ferramenta (fora do git). No XML elas vão em Base64, que é{" "}
        <strong>codificação, não criptografia</strong>: trate o pendrive como sigiloso.
      </Nota>
    </Secao>
  );
}

