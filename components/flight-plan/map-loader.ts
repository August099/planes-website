// VA-191: MapLibre + OpenFreeMap, cargado solo en esta sección desde public/vendor/ (como el mapa de los avisos, VA-156).
export const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const VENDOR = `/vendor/maplibre-gl-${process.env.NEXT_PUBLIC_MAPLIBRE_VERSION}`;
export const ARGENTINA: [[number, number], [number, number]] = [
  [-74, -55.5],
  [-53, -21.5],
];

/** Textos del mapa en castellano. En el celular se mueve con dos dedos, para que un dedo siga moviendo la página. */
export const MAP_LOCALE = {
  "CooperativeGesturesHandler.WindowsHelpText": "Usá Ctrl + rueda para hacer zoom",
  "CooperativeGesturesHandler.MacHelpText": "Usá ⌘ + rueda para hacer zoom",
  "CooperativeGesturesHandler.MobileHelpText": "Usá dos dedos para mover el mapa",
  "NavigationControl.ZoomIn": "Acercar",
  "NavigationControl.ZoomOut": "Alejar",
};

export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export async function loadMapLibre(): Promise<typeof import("maplibre-gl")> {
  const href = `${VENDOR}/maplibre-gl.css`;
  if (!document.querySelector(`link[href="${href}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }
  return import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${VENDOR}/maplibre-gl.mjs`);
}
