"use client";

import { useSyncExternalStore } from "react";

// VA-83: aeronaves elegidas para comparar (hasta 3). Se guardan en localStorage para que
// sobrevivan a la navegación; si el navegador no deja guardar, funciona igual mientras dure la
// página. Las tarjetas, el detalle y la bandeja leen este mismo estado.

export const COMPARE_MAX = 3;
const KEY = "va_compare";
const EVENT = "va-compare-change";

export type CompareItem = { id: string; title: string; image?: string | null };

let memory: CompareItem[] = [];
let cached: { raw: string | null; items: CompareItem[] } = { raw: null, items: [] };

function read(): CompareItem[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return memory;
  }
  if (raw === cached.raw) return cached.items;
  let items: CompareItem[] = [];
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      items = parsed
        .filter((x): x is CompareItem => x && typeof x.id === "string" && typeof x.title === "string")
        .slice(0, COMPARE_MAX);
    }
  } catch {
    items = [];
  }
  cached = { raw, items };
  return items;
}

function write(items: CompareItem[]) {
  memory = items.slice(0, COMPARE_MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    // Modo privado o almacenamiento bloqueado: queda en memoria.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY: CompareItem[] = [];

/** Lista actual (vacía en el servidor y durante la hidratación). */
export function useCompareItems(): CompareItem[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export type AddResult = "added" | "already" | "full";

export function addToCompare(item: CompareItem): AddResult {
  const items = read();
  if (items.some((i) => i.id === item.id)) return "already";
  if (items.length >= COMPARE_MAX) {
    window.dispatchEvent(new CustomEvent("va-compare-full"));
    return "full";
  }
  write([...items, item]);
  return "added";
}

export function removeFromCompare(id: string) {
  write(read().filter((i) => i.id !== id));
}

export function clearCompare() {
  write([]);
}

/** La página de comparación manda: deja el estado igual a lo que se está viendo. */
export function setCompare(items: CompareItem[]) {
  const current = read();
  if (current.length === items.length && current.every((c, i) => c.id === items[i].id && c.title === items[i].title)) return;
  write(items);
}

export function compareUrl(ids: string[]) {
  return `/aircraft/compare?ids=${ids.map(encodeURIComponent).join(",")}`;
}
