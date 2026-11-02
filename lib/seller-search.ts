// 3/11: búsqueda de vendedores por nombre, sin distinguir mayúsculas ni acentos ("Agustin" encuentra "Agustín").
// Postgres no ignora acentos sin una extensión; los Brokers son pocos, así que se compara acá.

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

type Named = { name: string | null; businessName: string | null };

/** 0 = algún nombre empieza con la búsqueda; 1 = una palabra empieza con ella; 2 = la contiene; null = no coincide. */
export function sellerMatchRank(seller: Named, query: string): number | null {
  const q = normalize(query);
  if (!q) return null;
  const names = [seller.businessName, seller.name].filter((n): n is string => !!n).map(normalize);
  const tokens = q.split(/\s+/);
  const matching = names.filter((n) => tokens.every((t) => n.includes(t)));
  if (matching.length === 0) return null;
  if (matching.some((n) => n.startsWith(q))) return 0;
  if (matching.some((n) => n.split(/\s+/).some((word) => word.startsWith(tokens[0])))) return 1;
  return 2;
}

/** Los que coinciden, primero los más parecidos y, a igual parecido, por nombre. */
export function rankSellers<T extends Named>(sellers: T[], query: string, limit: number): T[] {
  return sellers
    .map((seller) => ({ seller, rank: sellerMatchRank(seller, query) }))
    .filter((x): x is { seller: T; rank: number } => x.rank !== null)
    .sort((a, b) => a.rank - b.rank || (a.seller.businessName || a.seller.name || "").localeCompare(b.seller.businessName || b.seller.name || "", "es"))
    .slice(0, limit)
    .map((x) => x.seller);
}
