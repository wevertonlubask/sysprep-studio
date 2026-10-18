import { createContext, useContext } from "react";
import type { Aviso, Catalogo, InfoDriver, InfoImagem, Perfil } from "./tipos";

export interface Editor {
  id: string;
  perfil: Perfil;
  catalogo: Catalogo;
  imagens: Record<string, InfoImagem>;
  versaoImagens: number;
  avisos: Aviso[];
  set: (caminho: string, valor: unknown) => void;
  aoEnviarImagem: (info: InfoImagem) => void;
  /** Pacotes de drivers: gravados no servidor na hora (nao dependem de "Salvar"). */
  drivers: InfoDriver[];
  setDrivers: (f: (atual: InfoDriver[]) => InfoDriver[]) => void;
}

export const EditorCtx = createContext<Editor | null>(null);

export function useEditor(): Editor {
  const e = useContext(EditorCtx);
  if (!e) throw new Error("useEditor fora do EditorCtx");
  return e;
}

export function ler(obj: unknown, caminho: string): unknown {
  return caminho.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], obj);
}

/** Copia imutavel com o valor trocado no caminho "a.b.0.c". */
export function gravar<T>(obj: T, caminho: string, valor: unknown): T {
  const [k, ...resto] = caminho.split(".");
  const atual = obj as Record<string, unknown>;
  const copia: Record<string, unknown> | unknown[] = Array.isArray(obj) ? [...obj] : { ...atual };
  (copia as Record<string, unknown>)[k] = resto.length ? gravar(atual[k], resto.join("."), valor) : valor;
  return copia as T;
}

export function useCampo<T>(caminho: string): [T, (v: T) => void] {
  const { perfil, set } = useEditor();
  return [ler(perfil, caminho) as T, (v: T) => set(caminho, v)];
}
