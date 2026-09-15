/**
 * Convierte URLs estándar de Supabase Storage a URLs de la API de renderizado con dimensiones ajustadas.
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  width: number = 800,
  quality: number = 75
): string {
  if (!url) return "/placeholder.svg";

  // Si Supabase Image Transformation no está habilitado (Plan Free),
  // debemos usar la URL de objeto público directa (/object/public/):
  return url;
}