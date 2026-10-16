import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { signedDocumentUrl } from "@/lib/listing-uploads";

// VA-105 · 5.7: documentación de un aviso ("solo privado"). Solo el dueño del aviso o un admin;
// redirige a un link firmado de 60 segundos. Así no se publica la URL del archivo y sigue
// funcionando cuando el bucket "documents" pase a privado.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.id) return NextResponse.json({ error: "Tenés que iniciar sesión." }, { status: 401 });
  const { id } = await params;
  const doc = await prisma.aircraftDocument.findUnique({ where: { id }, select: { url: true, aircraft: { select: { sellerId: true } } } });
  if (!doc || (doc.aircraft.sellerId !== user.id && !user.isAdmin)) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  const url = await signedDocumentUrl(doc.url);
  if (!url) return NextResponse.json({ error: "No se pudo generar el link." }, { status: 502 });
  const res = NextResponse.redirect(url);
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
