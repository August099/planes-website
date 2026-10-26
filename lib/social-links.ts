// Links de redes del perfil (26/10): que el de Instagram sea de Instagram y el de Facebook de Facebook.
// Se acepta el link completo, sin "https://" o solo el usuario ("@ventas.aeronauticas"); se guarda siempre
// el link canónico con https. Lo usan el formulario de Ajustes (mensaje claro) y updateProfileAction (la
// validación que cuenta: sin ella se podía guardar cualquier link, incluso uno engañoso).

export type SocialNetwork = "instagram" | "facebook";

const HOSTS: Record<SocialNetwork, string[]> = {
  instagram: ["instagram.com", "www.instagram.com", "m.instagram.com", "instagr.am"],
  facebook: ["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com", "fb.com", "www.fb.com"],
};

const CANONICAL: Record<SocialNetwork, string> = {
  instagram: "https://www.instagram.com",
  facebook: "https://www.facebook.com",
};

const LABEL: Record<SocialNetwork, string> = { instagram: "Instagram", facebook: "Facebook" };

// Usuario suelto: letras, números, punto, guion bajo (y guion en Facebook), hasta 50.
const HANDLE = /^@?([A-Za-z0-9._-]{1,50})$/;

export type SocialResult = { ok: true; url: string | null } | { ok: false; error: string };

export function normalizeSocialUrl(network: SocialNetwork, raw: string | null | undefined): SocialResult {
  const value = (raw ?? "").trim();
  if (!value) return { ok: true, url: null };

  const handle = HANDLE.exec(value);
  if (handle && !value.includes("/")) return { ok: true, url: `${CANONICAL[network]}/${handle[1]}` };

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
  } catch {
    return { ok: false, error: `El link de ${LABEL[network]} no es válido.` };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, error: `El link de ${LABEL[network]} no es válido.` };
  if (!HOSTS[network].includes(url.hostname.toLowerCase())) {
    return { ok: false, error: `El link de ${LABEL[network]} tiene que ser de ${LABEL[network]} (por ejemplo, ${CANONICAL[network]}/tu-usuario).` };
  }
  const path = url.pathname.replace(/\/+$/, "");
  if (!path || path === "/") return { ok: false, error: `Falta tu usuario en el link de ${LABEL[network]}.` };
  if (url.username || url.password) return { ok: false, error: `El link de ${LABEL[network]} no es válido.` };
  return { ok: true, url: `${CANONICAL[network]}${path}${url.search}`.slice(0, 200) };
}
