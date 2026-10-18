import type { Catalogo, InfoDriver, InfoImagem, Perfil, Previa, ResumoPerfil } from "./tipos";

export class ErroApi extends Error {
  constructor(
    message: string,
    public status: number,
    public detalhe: unknown,
  ) {
    super(message);
  }
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) {
    let detalhe: unknown = null;
    try {
      detalhe = (await r.json()).detail;
    } catch {
      /* corpo nao-JSON */
    }
    const msg =
      typeof detalhe === "string"
        ? detalhe
        : (detalhe as { mensagem?: string } | null)?.mensagem ?? `Erro ${r.status}`;
    throw new ErroApi(msg, r.status, detalhe);
  }
  return r.status === 204 ? (undefined as T) : r.json();
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  catalogo: () => req<Catalogo>("/api/catalogo"),
  listar: () => req<ResumoPerfil[]>("/api/perfis"),
  criar: (nome: string, modelo: "padrao" | "laboratorio") =>
    req<{ id: string }>("/api/perfis", json("POST", { nome, modelo })),
  importar: (arquivo: File, nome: string) => {
    const fd = new FormData();
    fd.append("arquivo", arquivo);
    fd.append("nome", nome);
    return req<{ id: string }>("/api/perfis/importar", { method: "POST", body: fd });
  },
  obter: (id: string) =>
    req<{ id: string; perfil: Perfil; imagens: Record<string, InfoImagem>; drivers: InfoDriver[] }>(`/api/perfis/${id}`),
  salvar: (id: string, perfil: Perfil) => req<{ ok: boolean }>(`/api/perfis/${id}`, json("PUT", perfil)),
  excluir: (id: string) => req<void>(`/api/perfis/${id}`, { method: "DELETE" }),
  renomear: (id: string, nome: string) =>
    req<{ ok: boolean }>(`/api/perfis/${id}/renomear`, json("POST", { nome })),
  duplicar: (id: string, nome: string) =>
    req<{ id: string }>(`/api/perfis/${id}/duplicar`, json("POST", { nome })),
  previa: (id: string, perfil: Perfil) => req<Previa>(`/api/perfis/${id}/previa`, json("POST", perfil)),
  enviarImagem: (id: string, slot: string, arquivo: File) => {
    const fd = new FormData();
    fd.append("arquivo", arquivo);
    return req<InfoImagem>(`/api/perfis/${id}/imagens/${slot}`, { method: "POST", body: fd });
  },
  urlImagem: (id: string, arquivo: string, versao = 0) =>
    `/api/perfis/${id}/imagens/${encodeURIComponent(arquivo)}?v=${versao}`,
  excluirDriver: (id: string, arquivo: string) =>
    req<void>(`/api/perfis/${id}/drivers/${encodeURIComponent(arquivo)}`, { method: "DELETE" }),
  prepararPacote: (id: string) => req<{ url: string; nome: string; tamanho: number }>(`/api/perfis/${id}/pacote`, { method: "POST" }),
};

/**
 * Envia um pacote de drivers como corpo cru. XHR em vez de fetch: so ele
 * informa o progresso do upload, e o arquivo tem GBs.
 */
export function enviarDriver(
  id: string,
  arquivo: File,
  progresso: (fracao: number) => void,
): { promessa: Promise<InfoDriver>; cancelar: () => void } {
  const xhr = new XMLHttpRequest();
  const promessa = new Promise<InfoDriver>((ok, falha) => {
    xhr.open("PUT", `/api/perfis/${id}/drivers/${encodeURIComponent(arquivo.name)}`);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && progresso(e.loaded / e.total);
    xhr.onload = () => {
      let corpo: { detail?: string } & Partial<InfoDriver> = {};
      try {
        corpo = JSON.parse(xhr.responseText);
      } catch {
        /* corpo nao-JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300) ok(corpo as InfoDriver);
      else falha(new ErroApi(typeof corpo.detail === "string" ? corpo.detail : `Erro ${xhr.status}`, xhr.status, corpo.detail));
    };
    xhr.onerror = () => falha(new ErroApi("Falha de rede no envio.", 0, null));
    xhr.onabort = () => falha(new ErroApi("Envio cancelado.", 0, null));
    xhr.send(arquivo);
  });
  return { promessa, cancelar: () => xhr.abort() };
}

/** Download direto pelo navegador (grava em disco; sem Blob de GBs na memoria). */
export function baixarUrl(url: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.click();
}

export function formatarTamanho(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2).replace(".", ",")} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Baixa um arquivo gerado; devolve o erro da API (ex.: validacao) se houver. */
export async function baixar(url: string): Promise<void> {
  const r = await fetch(url);
  if (!r.ok) {
    const detalhe = (await r.json().catch(() => ({}))).detail;
    throw new ErroApi(detalhe?.mensagem ?? detalhe ?? `Erro ${r.status}`, r.status, detalhe);
  }
  const nome = /filename="([^"]+)"/.exec(r.headers.get("Content-Disposition") ?? "")?.[1] ?? "arquivo";
  const blob = await r.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
