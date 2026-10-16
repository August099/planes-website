// Formato único de precios en todo el sitio (VA-23): "US$ 180.500" o "AR$ 1.249.999".
// Antes convivían "$551.007", "US$ 180.500" y "USD $180500" según la pantalla.

const NUMBER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

export function formatPrice(
  price: unknown,
  { inPesos = false, fallback = "Consultar precio" }: { inPesos?: boolean; fallback?: string } = {}
): string {
  const value = price === null || price === undefined || price === "" ? NaN : Number(price);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return `${inPesos ? "AR$" : "US$"} ${NUMBER.format(value)}`;
}
