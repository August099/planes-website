// Criterio único de "publicación visible al público" (ver VA-14 en docs/PLAN_FIXES_MVP.md).
// Sirve tanto para Aircraft como para SparePart. VA-152: los avisos no vencen; visible = activo
// (pausado, vendido o moderado no se ven).

export function activeListingWhere() {
  return { status: "ACTIVE" as const };
}

export function isListingActive(listing: { status: string }): boolean {
  return listing.status === "ACTIVE";
}
