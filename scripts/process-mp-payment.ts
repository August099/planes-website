// Pago real en local: Mercado Pago no puede mandar el webhook a localhost, así que la compra queda
// pendiente. Este script hace lo mismo que el webhook: busca el pago en la API de Mercado Pago (con el
// MP_ACCESS_TOKEN del .env.local) y lo procesa con handlePayment (activa, revierte o registra).
//
// Uso (el id de la compra es el ?purchase= de /payment/status):
//   npx tsx --env-file=.env.local --require ./scripts/stub-server-only.cjs scripts/process-mp-payment.ts <idDeCompra>
// O con el id del pago de Mercado Pago (el ?payment_id= de la vuelta, o el del comprobante):
//   npx tsx --env-file=.env.local --require ./scripts/stub-server-only.cjs scripts/process-mp-payment.ts --payment <idDePago>
import { Payment as MpPayment } from "mercadopago";
import { mpClient, mpIsTestMode } from "@/lib/mercadopago";
import { handlePayment } from "@/lib/payments/process";
import { prisma } from "@/lib/prisma";

async function main() {
  const args = process.argv.slice(2);
  const byPayment = args[0] === "--payment";
  const id = byPayment ? args[1] : args[0];
  if (!id) {
    console.error("Falta el id de la compra (o --payment <idDePago>).");
    process.exit(1);
  }
  console.log(`Credenciales de Mercado Pago: ${mpIsTestMode() ? "de PRUEBA" : "de PRODUCCIÓN"}`);

  let paymentIds: string[];
  if (byPayment) {
    paymentIds = [id];
  } else {
    const found = await new MpPayment(mpClient()).search({ options: { external_reference: id, sort: "date_created", criteria: "asc" } });
    paymentIds = (found.results ?? []).map((p) => String(p.id));
    if (paymentIds.length === 0) {
      console.log(`Mercado Pago no tiene pagos para la compra ${id} (¿se terminó de pagar? ¿mismas credenciales?).`);
      return;
    }
  }

  for (const paymentId of paymentIds) {
    const outcome = await handlePayment(paymentId);
    console.log(`Pago ${paymentId}: ${outcome.status}${outcome.note ? ` · ${outcome.note}` : ""}`);
  }

  if (!byPayment) {
    const purchase = await prisma.purchase.findUnique({ where: { id }, select: { paymentStatus: true, activatedAt: true } });
    console.log(purchase ? `Compra ${id}: ${purchase.paymentStatus}${purchase.activatedAt ? ", entregada" : ""}` : `La compra ${id} no existe en esta base.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
