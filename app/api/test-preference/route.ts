import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "",
});

export async function POST() {
  try {
    const session = await auth();

    // 1. Obtener un usuario (el logueado o el primero que exista en la DB)
    let userId = session?.user?.id;

    if (!userId) {
      const fallbackUser = await prisma.user.findFirst();
      if (!fallbackUser) {
        return NextResponse.json(
          { error: "No hay ningún usuario en la base de datos para realizar la prueba." },
          { status: 400 }
        );
      }
      userId = fallbackUser.id;
    }

    // 2. Buscar o crear un Plan de prueba
    let testPlan = await prisma.plan.findFirst({
      where: { name: "Plan de Prueba Webhook" },
    });

    if (!testPlan) {
      testPlan = await prisma.plan.create({
        data: {
          name: "Plan de Prueba Webhook",
          type: "AIRCRAFT_PACK", // Ajustá al enum que tengas en Prisma
          price: 100.0,
          aircraftListingsCount: 1,
          billingType: "ONE_TIME",
        },
      });
    }

    // 3. Crear el registro Purchase en estado PENDING
    const purchase = await prisma.purchase.create({
      data: {
        userId: userId,
        planId: testPlan.id,
        paymentStatus: "PENDING",
      },
    });

    // 4. Crear la Preferencia de Mercado Pago
    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: [
          {
            id: testPlan.id,
            title: `Compra: ${testPlan.name}`,
            quantity: 1,
            unit_price: Number(testPlan.price),
            currency_id: "ARS",
          },
        ],
        // external_reference vincula el pago de Mercado Pago con tu ID de Purchase
        external_reference: purchase.id,

        // Usá la URL de ngrok guardada en tu NEXTAUTH_URL
        notification_url: `${process.env.NEXTAUTH_URL}/api/webhooks/mercadopago`,
        back_urls: {
          success: `${process.env.NEXTAUTH_URL}/testmp?status=success`,
          failure: `${process.env.NEXTAUTH_URL}/testmp?status=failure`,
          pending: `${process.env.NEXTAUTH_URL}/testmp?status=pending`,
        },
        auto_return: "approved",
      },
    });

    // 5. Guardar el ID de la preferencia en la Purchase
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { mpPreferenceId: result.id },
    });

    return NextResponse.json({
      init_point: result.sandbox_init_point || result.init_point,
      purchaseId: purchase.id,
    });
  } catch (error) {
    console.error("Error al crear la preferencia de prueba:", error);
    return NextResponse.json(
      { error: "Error al generar la preferencia de pago" },
      { status: 500 }
    );
  }
}