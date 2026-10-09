import { PLACEHOLDER_IMAGE } from "@/lib/constants";
/**
 * Convierte URLs estándar de Supabase Storage a URLs de la API de renderizado con dimensiones ajustadas.
 */
// Hoy devuelve la URL tal cual: el plan gratuito de Supabase no tiene Image Transformation.
// (Antes recibía ancho y calidad que no se usaban.)
export function getOptimizedImageUrl(url: string | null | undefined): string {
  if (!url) return PLACEHOLDER_IMAGE;

  // Si Supabase Image Transformation no está habilitado (Plan Free),
  // debemos usar la URL de objeto público directa (/object/public/):
  return url;
}