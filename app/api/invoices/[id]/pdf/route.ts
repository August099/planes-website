import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { signedInvoicePdfUrl } from "@/lib/billing/issue";

// VA-92/VA-105: descarga de la factura (PDF en el bucket privado). Solo el dueño de la compra o un
// admin; redirige a un link firmado de 5 minutos.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.id) return NextResponse.json({ error: "Tenés que iniciar sesión." }, { status: 401 });
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: { pdfPath: true, status: true, payment: { select: { purchase: { select: { userId: true } }, subscription: { select: { userId: true } } } } },
  });
  const ownerId = invoice?.payment.purchase?.userId ?? invoice?.payment.subscription?.userId;
  if (!invoice || (ownerId !== user.id && !user.isAdmin)) return NextResponse.json({ error: "No encontrada." }, { status: 404 });
  if (invoice.status !== "ISSUED" || !invoice.pdfPath) return NextResponse.json({ error: "La factura todavía no está disponible." }, { status: 404 });
  const url = await signedInvoicePdfUrl(invoice.pdfPath);
  if (!url) return NextResponse.json({ error: "No se pudo generar el link." }, { status: 502 });
  return NextResponse.redirect(url);
}
