import type { AircraftDetail, SparePartDetail } from "@/lib/listing-data";

// Textos de SEO de los avisos: los usan generateMetadata y el JSON-LD de los detalles.

const MAX_DESCRIPTION = 155;

export function truncate(text: string, max = MAX_DESCRIPTION): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : cut.length).replace(/[\s,.;:–-]+$/, "")}…`;
}

export function priceLabel(price: unknown, currency: "USD" | "ARS"): string {
  if (price === null || price === undefined) return "Consultar precio";
  const value = Number(price);
  if (!Number.isFinite(value) || value <= 0) return "Consultar precio";
  return `${currency} ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

function location(city?: string | null, province?: string | null): string {
  return [city, province].filter(Boolean).join(", ");
}

// "Cessna 182" (marca + modelo); si no hay marca ni modelo, el título del aviso.
export function aircraftName(aircraft: AircraftDetail): string {
  const brand = aircraft.brand?.name || aircraft.customBrand;
  const model = aircraft.model?.name || aircraft.customModel;
  const name = [brand, model].filter(Boolean).join(" ").trim();
  return name || aircraft.title;
}

export function aircraftSeoTitle(aircraft: AircraftDetail): string {
  return `${aircraftName(aircraft)} ${aircraft.year} en venta – ${priceLabel(aircraft.price, "USD")}`;
}

export function aircraftSeoDescription(aircraft: AircraftDetail): string {
  const parts = [
    `${aircraftName(aircraft)} ${aircraft.year} en venta`,
    aircraft.totalTimeHours ? `${aircraft.totalTimeHours.toLocaleString("es-AR")} horas totales` : null,
    aircraft.category?.name ? `categoría ${aircraft.category.name}` : null,
    location(aircraft.city, aircraft.province) ? `en ${location(aircraft.city, aircraft.province)}` : null,
  ].filter(Boolean);
  return truncate(`${parts.join(", ")}. ${priceLabel(aircraft.price, "USD")}.`);
}

const SPARE_PART_CONDITION_LABEL: Record<string, string> = {
  NUEVO: "nuevo",
  USADO: "usado",
  RECORRIDO: "recorrido",
  REPARAR: "para reparar",
};

export function sparePartCurrency(sparePart: SparePartDetail): "USD" | "ARS" {
  return sparePart.inPesos ? "ARS" : "USD";
}

export function sparePartSeoTitle(sparePart: SparePartDetail): string {
  return `${sparePart.title} en venta – ${priceLabel(sparePart.price, sparePartCurrency(sparePart))}`;
}

export function sparePartSeoDescription(sparePart: SparePartDetail): string {
  const condition = SPARE_PART_CONDITION_LABEL[sparePart.condition] ?? "usado";
  const parts = [
    `${sparePart.title} (${condition})`,
    sparePart.brand ? `marca ${sparePart.brand}` : null,
    sparePart.partNumber ? `P/N ${sparePart.partNumber}` : null,
    sparePart.category?.name ? `categoría ${sparePart.category.name}` : null,
    location(sparePart.city, sparePart.province) ? `en ${location(sparePart.city, sparePart.province)}` : null,
  ].filter(Boolean);
  return truncate(`${parts.join(", ")}. ${priceLabel(sparePart.price, sparePartCurrency(sparePart))}.`);
}
