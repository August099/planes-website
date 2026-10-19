import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { signedDocumentUrl } from "@/lib/listing-uploads";

// Documentación de un aviso: pública desde el 19/10 (pedido del socio; antes, VA-105 · 5.7, solo el dueño
// o un admin). Redirige a un link firmado de 60 segundos: no se publica la URL del archivo y sigue
// funcionando con el bucket "documents" privado. Un aviso pausado por moderación (VA-154) no se ve: sus
// documentos, solo para el dueño o un admin.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.aircraftDocument.findUnique({ where: { id }, select: { url: true, aircraft: { select: { sellerId: true, status: true } } } });
  if (!doc) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  if (doc.aircraft.status === "MODERATED") {
    const user = await getCurrentUser();
    if (doc.aircraft.sellerId !== user?.id && !user?.isAdmin) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }
  const url = await signedDocumentUrl(doc.url);
  if (!url) return NextResponse.json({ error: "No se pudo generar el link." }, { status: 502 });
  const res = NextResponse.redirect(url);
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
