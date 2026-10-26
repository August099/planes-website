import "server-only";

// VA-105: ¿las credenciales de Mercado Pago son de una cuenta de prueba? Las cuentas de prueba operan
// con live_mode=true entre sí (lo vimos el 12/10 con el pago 182844536319), así que live_mode solo no
// alcanza para distinguir una prueba. Se consulta /users/me una vez por proceso.

let cached: Promise<boolean> | null = null;

export function mpAccountIsTest(): Promise<boolean> {
  cached ??= (async () => {
    const token = process.env.MP_ACCESS_TOKEN?.trim();
    if (!token) return true; // sin credenciales, nunca es "real"
    if (token.startsWith("TEST-")) return true;
    try {
      const res = await fetch("https://api.mercadopago.com/users/me", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (!res.ok) return true; // ante la duda, prueba (nunca factura real)
      const me = (await res.json()) as { tags?: string[]; nickname?: string; email?: string };
      return (me.tags ?? []).includes("test_user") || /^TESTUSER/i.test(me.nickname ?? "") || /@testuser\.com$/i.test(me.email ?? "");
    } catch {
      cached = null; // se reintenta en la próxima llamada
      return true;
    }
  })();
  return cached;
}
