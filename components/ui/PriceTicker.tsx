import { getDolarRates } from "@/lib/dolar";
import { PriceTickerClient } from "./PriceTickerClient";

// Valores de referencia cargados a mano — actualizar periódicamente
const FUEL_REFERENCE = [
  { label: "Avgas 100LL (ref.)", value: "USD 1,25/L" },
  { label: "Jet A1 (ref.)", value: "USD 0,95/L" },
];

export async function PriceTicker() {
  const dolares = await getDolarRates();

  const items = [
    ...dolares.map((d) => ({
      label: `Dólar ${d.nombre}`,
      value: `$${d.venta.toLocaleString("es-AR")}`,
    })),
    ...FUEL_REFERENCE,
  ];

  if (items.length === 0) return null;

  return <PriceTickerClient items={items} />;
}