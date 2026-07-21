export type DolarRate = { casa: string; nombre: string; venta: number };

export async function getDolarRates(): Promise<DolarRate[]> {
  const res = await fetch("https://dolarapi.com/v1/dolares", {
    next: { revalidate: 600 }, // cachea 10 minutos
  });
  if (!res.ok) return [];
  return res.json();
}