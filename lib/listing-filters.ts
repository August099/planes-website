// Criterio único de "publicación visible al público" (ver VA-14 en docs/PLAN_FIXES_MVP.md).
// Sirve tanto para Aircraft como para SparePart: los dos tienen status y listingExpiresAt.

export function activeListingWhere(now = new Date()) {
  return {
    status: "ACTIVE" as const,
    OR: [{ listingExpiresAt: null }, { listingExpiresAt: { gte: now } }],
  };
}

export function isListingActive(
  listing: { status: string; listingExpiresAt: Date | null },
  now = new Date()
): boolean {
  if (listing.status !== "ACTIVE") return false;
  return !listing.listingExpiresAt || listing.listingExpiresAt >= now;
}
