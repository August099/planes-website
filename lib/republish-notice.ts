// VA-167: el cartel de "Tenés N republicaciones" y el punto de "Mi Cuenta" se cierran en el navegador.
// Se guarda la clave del saldo que se cerró; si el saldo cambia, la clave cambia y vuelven a aparecer.
// localStorage puede no estar (modo privado): sin él, siempre se muestran.

const STORAGE_KEY = "va_republish_dismissed";
export const REPUBLISH_NOTICE_EVENT = "va-republish-notice";

export function isRepublishNoticeDismissed(key: string | null | undefined): boolean {
  if (!key) return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === key;
  } catch {
    return false;
  }
}

export function dismissRepublishNotice(key: string) {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // Sin almacenamiento: el cartel se cierra solo en esta visita.
  }
  window.dispatchEvent(new Event(REPUBLISH_NOTICE_EVENT));
}

/** Después de republicar: el header vuelve a pedir el saldo para el punto de "Mi Cuenta" (VA-178). */
export function notifyRepublished() {
  window.dispatchEvent(new Event(REPUBLISH_NOTICE_EVENT));
}
