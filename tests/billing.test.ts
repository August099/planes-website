// VA-105 · 1.1 y 1.2: tests de la puerta de facturación real y del JSON de TusFacturas.
// Correr con: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { billingDecision, canIssueRealInvoice, isTestPayment, readBillingEnv } from "../lib/billing/guard";
import { buildCliente, buildInvoicePayload, provinceCode, tfDate } from "../lib/billing/payload";

const PROD_ENV = { billingEnabled: true, vercelEnv: "production", tusfacturasMode: "production" };
const LIVE = { liveMode: true, mpAccountIsTest: false };

test("factura real solo con las cinco condiciones", () => {
  assert.deepEqual(canIssueRealInvoice(PROD_ENV, LIVE), { ok: true, reasons: [] });
  assert.equal(billingDecision(PROD_ENV, LIVE).action, "issue");
});

test("si falta cualquier condición, se simula (nunca se emite)", () => {
  const cases: [string, Parameters<typeof canIssueRealInvoice>[0], Parameters<typeof canIssueRealInvoice>[1]][] = [
    ["Preview", { ...PROD_ENV, vercelEnv: "preview" }, LIVE],
    ["local", { ...PROD_ENV, vercelEnv: undefined }, LIVE],
    ["sin TUSFACTURAS_MODE", { ...PROD_ENV, tusfacturasMode: undefined }, LIVE],
    ["TUSFACTURAS_MODE=development", { ...PROD_ENV, tusfacturasMode: "development" }, LIVE],
    ["pago no live_mode", PROD_ENV, { liveMode: false, mpAccountIsTest: false }],
    ["live_mode desconocido", PROD_ENV, { liveMode: null, mpAccountIsTest: false }],
    // Las cuentas de prueba de MP informan live_mode=true entre sí: igual es una prueba.
    ["cuenta de prueba con live_mode=true", PROD_ENV, { liveMode: true, mpAccountIsTest: true }],
  ];
  for (const [name, env, pay] of cases) {
    const d = billingDecision(env, pay);
    assert.equal(d.action, "simulate", name);
    assert.equal(canIssueRealInvoice(env, pay).ok, false, name);
  }
});

test("BILLING_ENABLED=false: no se procesa (queda PENDING), aunque todo lo demás sea de producción", () => {
  const d = billingDecision({ ...PROD_ENV, billingEnabled: false }, LIVE);
  assert.equal(d.action, "skip");
});

test("pagos de prueba", () => {
  assert.equal(isTestPayment(LIVE), false);
  assert.equal(isTestPayment({ liveMode: false, mpAccountIsTest: false }), true);
  assert.equal(isTestPayment({ liveMode: true, mpAccountIsTest: true }), true);
});

test("lectura de variables", () => {
  assert.deepEqual(readBillingEnv({ BILLING_ENABLED: "TRUE", VERCEL_ENV: "production", TUSFACTURAS_MODE: " Production " }), PROD_ENV);
  assert.equal(readBillingEnv({}).billingEnabled, false);
});

test("cliente: consumidor final sin datos, con DNI y empresa con CUIT", () => {
  const cf = buildCliente({ kind: "CONSUMIDOR_FINAL", name: "Juan Pérez", email: "juan@example.com" }, "user1", "Córdoba");
  assert.equal(cf.documento_tipo, "OTRO");
  assert.equal(cf.documento_nro, "0");
  assert.equal(cf.condicion_iva, "CF");
  assert.equal(cf.provincia, 6);
  assert.equal(cf.envia_por_mail, "S");
  assert.equal(cf.condicion_pago, 216);

  const dni = buildCliente({ kind: "CONSUMIDOR_FINAL", name: "Ana", docType: "DNI", docNumber: "30.123.456", email: "a@b.c" }, "u", null);
  assert.equal(dni.documento_tipo, "DNI");
  assert.equal(dni.documento_nro, "30123456");
  assert.equal(dni.provincia, 25);

  const empresa = buildCliente({ kind: "EMPRESA", name: "Aeroclub SA", docType: "CUIT", docNumber: "20-12345678-6", ivaCondition: "RI", email: "f@a.com", address: "Ruta 3 km 10" }, "u", "Buenos Aires");
  assert.equal(empresa.documento_tipo, "CUIT");
  assert.equal(empresa.documento_nro, "20123456786");
  assert.equal(empresa.condicion_iva, "RI");
  assert.equal(empresa.domicilio, "Ruta 3 km 10");
  assert.equal(empresa.provincia, 2);
});

test("factura C: tipo, total cobrado, período y sin IVA discriminado", () => {
  const date = new Date("2026-10-13T15:00:00Z");
  const payload = buildInvoicePayload({
    kind: "FACTURA_C",
    pointOfSale: 3,
    total: 15000, // cupón del 50% sobre 30.000: se factura lo cobrado
    description: "Publicación de aeronave – Cessna 182",
    date,
    periodFrom: date,
    periodTo: date,
    receiver: { kind: "CONSUMIDOR_FINAL", name: "Juan", email: "j@x.com" },
    customerCode: "cmv000000000000000000000000",
    province: "Santa Fe",
    externalReference: "inv_123",
  });
  const c = payload.comprobante;
  assert.equal(c.tipo, "FACTURA C");
  assert.equal(c.operacion, "V");
  assert.equal(c.moneda, "PES");
  assert.equal(c.cotizacion, 1);
  assert.equal(c.punto_venta, 3);
  assert.equal(c.total, 15000);
  assert.equal(c.detalle[0].producto.precio_unitario_sin_iva, 15000);
  assert.equal(c.detalle[0].producto.alicuota, 0);
  assert.equal(c.fecha, "13/10/2026");
  assert.equal(c.periodo_facturado_desde, "13/10/2026");
  assert.equal(payload.cliente.codigo.length <= 20, true);
  assert.equal("comprobantes_asociados" in c, false);
});

test("nota de crédito C asociada a la factura original", () => {
  const date = new Date("2026-10-20T15:00:00Z");
  const payload = buildInvoicePayload({
    kind: "NOTA_CREDITO_C",
    pointOfSale: 3,
    total: 5000,
    description: "Anulación parcial – Publicación de aeronave",
    date,
    periodFrom: date,
    periodTo: date,
    receiver: {},
    customerCode: "u",
    externalReference: "nc 1",
    associated: { pointOfSale: 3, number: 42, date: new Date("2026-10-13T15:00:00Z") },
  });
  assert.equal(payload.comprobante.tipo, "NOTA DE CREDITO C");
  assert.equal(payload.comprobante.external_reference, "nc_1");
  assert.deepEqual(payload.comprobante.comprobantes_asociados, [{ tipo_comprobante: "FACTURA C", punto_venta: 3, numero: 42, comprobante_fecha: "13/10/2026" }]);
});

test("fechas en hora argentina y provincias", () => {
  // 02:00 UTC del 14 = 23:00 del 13 en Argentina.
  assert.equal(tfDate(new Date("2026-10-14T02:00:00Z")), "13/10/2026");
  assert.equal(provinceCode("Ciudad Autónoma de Buenos Aires"), 1);
  assert.equal(provinceCode("Tierra del Fuego, Antártida e Islas del Atlántico Sur"), 23);
  assert.equal(provinceCode("Narnia"), 25);
});
