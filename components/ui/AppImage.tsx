"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";
import { getOptimizedImageUrl } from "@/lib/supabase-image";

interface AppImageProps extends Omit<ImageProps, "src"> {
  src: string | null | undefined;
  optimizedWidth?: number;
  quality?: number;
  fallbackSrc?: string;
}

export function AppImage({
  src,
  alt,
  optimizedWidth = 800,
  quality = 75,
  fallbackSrc = "/placeholder.png",
  className,
  ...props
}: AppImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(
    getOptimizedImageUrl(src, optimizedWidth, quality)
  );

  return (
    <Image
      {...props}
      src={imgSrc}
      alt={alt || "Imagen"}
      className={className}
      onError={() => {
        if (imgSrc !== fallbackSrc) {
          setImgSrc(fallbackSrc);
        }
      }}
    />
  );
}