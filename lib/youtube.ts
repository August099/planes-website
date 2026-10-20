// VA-170: video de YouTube del aviso (solo el link; el video no se aloja en VA). Acepta
// youtube.com/watch?v=…, youtu.be/…, youtube.com/shorts/… (con o sin www. o m.).
const ID = /^[A-Za-z0-9_-]{11}$/;

/** Id del video, o null si el link no es de YouTube. */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^(www\.|m\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" && u.pathname === "/watch") id = u.searchParams.get("v");
  else if (host === "youtube.com" && u.pathname.startsWith("/shorts/")) id = u.pathname.split("/")[2];
  return id && ID.test(id) ? id : null;
}

/** Reproductor sin cookies hasta que se reproduce (youtube-nocookie). */
export const youtubeEmbedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
