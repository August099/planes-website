import { ImageResponse } from "next/og";
import { BrandIcon, whiteLogoDataUrl } from "@/lib/brand-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return new ImageResponse(<BrandIcon logo={await whiteLogoDataUrl()} size={size.width} />, size);
}
