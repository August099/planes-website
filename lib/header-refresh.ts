// VA-179: el header pide sus indicadores (puntos de "Mi Cuenta") al cambiar de página. Cuando algo los
// cambia sin navegar (responder una pregunta, republicar), se avisa con este evento.
export const HEADER_REFRESH_EVENT = "va-header-refresh";

export function refreshHeaderIndicators() {
  window.dispatchEvent(new Event(HEADER_REFRESH_EVENT));
}
