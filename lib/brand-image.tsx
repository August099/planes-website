import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BRAND_COLORS } from "@/lib/site";

// Logo "VA//" en blanco (con la barra roja) como data URL, para usar dentro de ImageResponse.
export async function whiteLogoDataUrl(): Promise<string> {
  const data = await readFile(join(process.cwd(), "public", "logo-va-white.svg"), "base64");
  return `data:image/png;base64,${data}`;
}

// Ícono cuadrado: logo blanco centrado sobre el azul de la marca.
export function BrandIcon({ logo, size }: { logo: string; size: number }) {
  // El logo es 1032×276: ocupa ~70 % del ancho del ícono.
  const width = Math.round(size * 0.7);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND_COLORS.blue,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} width={width} height={Math.round((width * 276) / 1032)} alt="" />
    </div>
  );
}
