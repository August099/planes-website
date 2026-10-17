// VA-140: compra pendiente de pago cancelada a los 5 minutos. Correr con: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { pendingPaymentExpired } from "../lib/payments/pending";

const now = new Date("2026-10-17T12:00:00Z");
const ago = (min: number) => new Date(now.getTime() - min * 60_000);

test("pendiente hace más de 5 minutos: vencida", () => {
  assert.equal(pendingPaymentExpired({ paymentStatus: "PENDING", activatedAt: null, updatedAt: ago(6) }, now), true);
});

test("pendiente hace menos de 5 minutos, en proceso o ya activada: no", () => {
  assert.equal(pendingPaymentExpired({ paymentStatus: "PENDING", activatedAt: null, updatedAt: ago(4) }, now), false);
  assert.equal(pendingPaymentExpired({ paymentStatus: "IN_PROCESS", activatedAt: null, updatedAt: ago(60) }, now), false);
  assert.equal(pendingPaymentExpired({ paymentStatus: "PENDING", activatedAt: ago(1), updatedAt: ago(60) }, now), false);
});
