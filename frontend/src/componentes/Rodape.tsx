export function Rodape() {
  return (
    <footer className="rodape">
      <span>
        Desenvolvido por{" "}
        <a href="https://www.wevertonlubask.com.br" target="_blank" rel="noopener noreferrer">
          Weverton E. Lubask
        </a>
      </span>
      <span className="rodape-sep" aria-hidden>
        ·
      </span>
      <span className="rodape-versao" title="Versão do Sysprep Studio">
        v{__VERSAO__}
      </span>
    </footer>
  );
}
