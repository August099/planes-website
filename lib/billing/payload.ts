// VA-105: JSON de TusFacturasAPP para una factura C o una nota de crédito C (referencia oficial:
// developers.tusfacturas.app → Referencia API y Tablas de referencia). Sin credenciales: se agregan
// recién al enviar. Sin dependencias: se prueba con tests/billing.test.ts.

export type Receiver = {
  kind?: "CONSUMIDOR_FINAL" | "EMPRESA";
  name?: string | null;
  docType?: string | null; // DNI o CUIT
  docNumber?: string | null;
  ivaCondition?: string | null; // CF, M, RI, E
  address?: string | null;
  email?: string | null;
};

export type InvoiceInput = {
  kind: "FACTURA_C" | "NOTA_CREDITO_C";
  pointOfSale: number;
  total: number;
  description: string;
  date: Date;
  periodFrom: Date;
  periodTo: Date;
  receiver: Receiver;
  /** Código del cliente en TusFacturas (máx. 20): el id del usuario. */
  customerCode: string;
  /** Provincia del usuario (nombre canónico) para el código de TusFacturas. */
  province?: string | null;
  externalReference: string;
  /** Nota de crédito: la factura que anula (o anula en parte). */
  associated?: { pointOfSale: number; number: number; date: Date; issuerCuit?: string };
};

// Tabla "provincias" de TusFacturas.
const PROVINCE_CODES: Record<string, number> = {
  "Ciudad Autónoma de Buenos Aires": 1,
  "Buenos Aires": 2,
  Catamarca: 3,
  Chaco: 4,
  Chubut: 5,
  Córdoba: 6,
  Corrientes: 7,
  "Entre Ríos": 8,
  Formosa: 9,
  Jujuy: 10,
  "La Pampa": 11,
  "La Rioja": 12,
  Mendoza: 13,
  Misiones: 14,
  Neuquén: 15,
  "Río Negro": 16,
  Salta: 17,
  "San Juan": 18,
  "San Luis": 19,
  "Santa Cruz": 20,
  "Santa Fe": 21,
  "Santiago del Estero": 22,
  "Tierra del Fuego": 23,
  Tucumán: 24,
};

const AR_DATE = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });
/** dd/mm/aaaa en hora argentina. */
export const tfDate = (d: Date) => AR_DATE.format(d);
const money = (n: number) => Math.round(n * 100) / 100;
const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

export function provinceCode(name: string | null | undefined): number {
  // 29/10: sin provincia o desconocida → 25 ("Otro" en la tabla de TusFacturas). Antes 26, una fila sin nombre
  // que TusFacturas rechazaba al crear el cliente.
  if (!name) return 25;
  return PROVINCE_CODES[name] ?? (/tierra del fuego/i.test(name) ? 23 : /caba|ciudad aut/i.test(name) ? 1 : 25);
}

/** Bloque "cliente": empresa con CUIT, consumidor final con DNI o consumidor final sin datos. */
export function buildCliente(r: Receiver, customerCode: string, province: string | null | undefined) {
  const cuit = digits(r.docNumber);
  const isCompany = r.kind === "EMPRESA" && r.docType === "CUIT" && cuit.length === 11;
  const dni = r.docType === "DNI" ? digits(r.docNumber) : "";
  return {
    documento_tipo: isCompany ? "CUIT" : dni ? "DNI" : "OTRO",
    documento_nro: isCompany ? cuit : dni || "0",
    razon_social: (r.name?.trim() || "Consumidor final").slice(0, 255),
    // 29/10: como el ejemplo oficial de consumidor final ("-" daba "Error al crear al cliente").
    domicilio: (r.address?.trim() || "No especifica").slice(0, 255),
    provincia: provinceCode(province),
    envia_por_mail: r.email ? "S" : "N",
    email: r.email ?? "",
    condicion_pago: 216, // MercadoPago
    condicion_iva: isCompany ? (["RI", "M", "E"].includes(r.ivaCondition ?? "") ? r.ivaCondition : "RI") : "CF",
    // RG 5616/2024 (desde el 15/04/2025): condición frente al IVA de la operación, la misma.
    condicion_iva_operacion: isCompany ? (["RI", "M", "E"].includes(r.ivaCondition ?? "") ? r.ivaCondition : "RI") : "CF",
    codigo: customerCode.slice(0, 20),
    rg5329: "N",
  };
}

export function buildComprobante(input: InvoiceInput) {
  const total = money(input.total);
  const tipo = input.kind === "FACTURA_C" ? "FACTURA C" : "NOTA DE CREDITO C";
  return {
    fecha: tfDate(input.date),
    tipo,
    operacion: "V",
    idioma: 1,
    punto_venta: input.pointOfSale,
    moneda: "PES",
    cotizacion: 1,
    vencimiento: tfDate(input.date),
    periodo_facturado_desde: tfDate(input.periodFrom),
    periodo_facturado_hasta: tfDate(input.periodTo),
    rubro: "Servicios de publicación online",
    rubro_grupo_contable: "Servicios",
    detalle: [
      {
        cantidad: 1,
        afecta_stock: "N",
        producto: {
          descripcion: input.description.slice(0, 255).padEnd(4, "."),
          unidad_bulto: 1,
          lista_precios: "Ventas Aeronáuticas web",
          codigo: input.kind === "FACTURA_C" ? "SERV-WEB" : "NC-WEB",
          // En comprobantes C va el precio final (sin IVA discriminado).
          precio_unitario_sin_iva: total,
          alicuota: 0,
          unidad_medida: 7,
          actualiza_precio: "N",
          rg5329: "N",
        },
      },
    ],
    total,
    external_reference: input.externalReference.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 255),
    ...(input.associated
      ? {
          comprobantes_asociados: [
            {
              tipo_comprobante: "FACTURA C",
              punto_venta: input.associated.pointOfSale,
              numero: input.associated.number,
              comprobante_fecha: tfDate(input.associated.date),
              ...(input.associated.issuerCuit ? { cuit: input.associated.issuerCuit } : {}),
            },
          ],
        }
      : {}),
  };
}

/** JSON completo sin credenciales (se guarda en Invoice.requestPayload). */
export function buildInvoicePayload(input: InvoiceInput) {
  return { cliente: buildCliente(input.receiver, input.customerCode, input.province), comprobante: buildComprobante(input) };
}
