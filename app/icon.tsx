import { ImageResponse } from "next/og";
import { BrandIcon, whiteLogoDataUrl } from "@/lib/brand-image";

// Ícono grande (también lo usa el manifest). El favicon.ico sigue siendo app/favicon.ico.
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default async function Icon() {
  return new ImageResponse(<BrandIcon logo={await whiteLogoDataUrl()} size={size.width} />, size);
}
