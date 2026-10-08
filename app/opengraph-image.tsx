import { ImageResponse } from "next/og";
import { whiteLogoDataUrl } from "@/lib/brand-image";
import { BRAND_COLORS, SITE_NAME } from "@/lib/site";

// Imagen por defecto al compartir páginas sin foto propia (los avisos usan su primera foto).
export const alt = `${SITE_NAME}: aviones y repuestos aeronáuticos en Argentina`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const logo = await whiteLogoDataUrl();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 48,
          background: BRAND_COLORS.blue,
          color: "white",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={516} height={138} alt="" />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 56, fontWeight: 700 }}>{SITE_NAME}</div>
          <div style={{ fontSize: 32, opacity: 0.85 }}>Aviones y repuestos aeronáuticos en Argentina</div>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 16, background: BRAND_COLORS.red }} />
      </div>
    ),
    size
  );
}
