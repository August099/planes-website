"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";
import { getOptimizedImageUrl } from "@/lib/supabase-image";
import { PLACEHOLDER_IMAGE } from "@/lib/constants";

interface AppImageProps extends Omit<ImageProps, "src"> {
  src: string | null | undefined;
  fallbackSrc?: string;
}

export function AppImage({
  src,
  alt,
  fallbackSrc = PLACEHOLDER_IMAGE,
  className,
  ...props
}: AppImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(
    getOptimizedImageUrl(src)
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