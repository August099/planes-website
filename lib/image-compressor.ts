import imageCompression from "browser-image-compression";

export type ImageBucketType = "listings" | "avatars" | "brands" | "documents";

interface CompressionPreset {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  fileType?: string;
}

// Configuraciones predeterminadas por tipo de bucket
const BUCKET_PRESETS: Record<ImageBucketType, CompressionPreset> = {
  avatars: {
    maxSizeMB: 0.2, // ~200 KB
    maxWidthOrHeight: 500, // Foto de perfil no requiere alta resolución
    useWebWorker: true,
  },
  brands: {
    maxSizeMB: 0.3, // ~300 KB
    maxWidthOrHeight: 800,
    useWebWorker: true,
  },
  listings: {
    maxSizeMB: 0.8, // ~800 KB para mantener excelente calidad técnica
    maxWidthOrHeight: 1920, // Full HD
    useWebWorker: true,
  },
  documents: {
    maxSizeMB: 1.5, // Documentos/PDFs con texto ejecutan menor compresión
    maxWidthOrHeight: 2048,
    useWebWorker: true,
  },
};

/**
 * Comprime un archivo de imagen antes de subirlo a Supabase.
 */
export async function compressImage(
  file: File,
  bucketType: ImageBucketType = "listings"
): Promise<File> {
  // Si no es una imagen (ej: PDF en documents), devolver el archivo original
  if (!file.type.startsWith("image/")) {
    return file;
  }

  const options = BUCKET_PRESETS[bucketType] || BUCKET_PRESETS.listings;

  try {
    const compressedBlob = await imageCompression(file, options);
    return new File([compressedBlob], file.name, {
      type: compressedBlob.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error("Error al comprimir la imagen, se usará el archivo original:", error);
    return file;
  }
}

/**
 * Comprime múltiples archivos en paralelo.
 */
export async function compressMultipleImages(
  files: File[],
  bucketType: ImageBucketType = "listings"
): Promise<File[]> {
  return Promise.all(files.map((file) => compressImage(file, bucketType)));
}