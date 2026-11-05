import "server-only";
import { getDocumentProxy } from "unpdf";
import type { AeroDataset, AeroImport, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { EMAIL_FROM, appBaseUrl, sendMail } from "@/lib/mail";
import { BUSINESS_SIGNUP_NOTICE_TO } from "@/lib/business-signup-notice-to";
import { diffRecords, looksTruncated, type AeroDiff, type AeroRecord } from "@/lib/aero/records";
import { parseLadPages, type PdfItem } from "@/lib/aero/lad";
import { MADHEL_API, normalizeMadhel, type MadhelListItem } from "@/lib/aero/madhel";

// VA-191: actualización de aeródromos (MADHEL) y LAD. Nunca publica sola: deja un informe en /admin/aero-data
// con las altas, bajas y cambios, y un admin lo aplica. Si algo falla, sigue vigente la versión anterior.
// Las bases, en el payload: { records, missing } mientras faltan detalles del MADHEL (se retoma por tandas,
// porque la API de ANAC es lenta y no conviene pedirle todo de una vez).

const USER_AGENT = "VentasAeronauticas/1.0 (+https://ventasaeronauticas.com)";
const REQUEST_TIMEOUT_MS = 20_000;
const MADHEL_CONCURRENCY = 3;
const MAX_ATTEMPTS = 5;
const PAUSE_BETWEEN_BATCHES_MS = 250;
const PAUSE_AFTER_FAILURE_MS = 5_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type MissingItem = MadhelListItem & { attempts?: number };
type Payload = { records: AeroRecord[]; missing?: MissingItem[]; listed?: string[] };

const asPayload = (v: Prisma.JsonValue | null) => (v ?? { records: [] }) as unknown as Payload;
const asJson = (v: unknown) => v as Prisma.InputJsonValue;

async function currentRecords(dataset: AeroDataset): Promise<AeroRecord[]> {
  const rows = await prisma.aeroPlace.findMany({ where: { source: dataset } });
  return rows.map((r) => ({
    kind: r.kind,
    code: r.code,
    icao: r.icao,
    iata: r.iata,
    name: r.name,
    fir: r.fir,
    province: r.province,
    location: r.location,
    lat: r.lat,
    lng: r.lng,
    elevationM: r.elevationM,
    condition: r.condition,
    runways: (r.runways ?? []) as string[],
    frequencies: (r.frequencies ?? []) as string[],
    details: (r.details ?? {}) as Record<string, unknown>,
    sourceUpdatedAt: r.sourceUpdatedAt?.toISOString() ?? null,
  }));
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), cache: "no-store" });
  if (!res.ok) throw new Error(`${url} respondió ${res.status}`);
  return (await res.json()) as T;
}

/** Cierra un informe: compara con lo vigente; sin cambios se aplica solo, para actualizar la fecha de vigencia. */
async function finishImport(id: string, dataset: AeroDataset, records: AeroRecord[], warnings: string[], sourceDate: Date | null) {
  const current = await currentRecords(dataset);
  if (looksTruncated(current.length, records.length)) {
    const error = `La fuente trajo ${records.length} registros y hay ${current.length} vigentes. Parece una falla de lectura: no se ofrece esta versión.`;
    await prisma.aeroImport.update({ where: { id }, data: { status: "FAILED", error, payload: asJson({ records: [] }) } });
    return prisma.aeroImport.findUniqueOrThrow({ where: { id } });
  }
  const diff = diffRecords(current, records);
  const noChanges = diff.added.length + diff.removed.length + diff.changed.length === 0;
  await prisma.aeroImport.updateMany({ where: { dataset, status: "PENDING", id: { not: id } }, data: { status: "REJECTED" } });
  const saved = await prisma.aeroImport.update({
    where: { id },
    data: {
      added: diff.added.length,
      changed: diff.changed.length,
      removed: diff.removed.length,
      diff: asJson(diff),
      warnings: asJson(warnings),
      sourceDate,
      payload: noChanges ? asJson({ records: [] }) : asJson({ records }),
      status: noChanges ? "APPLIED" : "PENDING",
      appliedAt: noChanges ? new Date() : null,
    },
  });
  if (!noChanges) await notifyReport(saved);
  return saved;
}

async function notifyReport(report: AeroImport) {
  try {
    await sendMail({
      from: EMAIL_FROM,
      to: BUSINESS_SIGNUP_NOTICE_TO,
      subject: `Datos aeronáuticos: hay una actualización de ${report.dataset} para revisar`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #001F58;">
          <h2>Actualización de ${report.dataset}</h2>
          <p>${report.added} altas, ${report.changed} cambios y ${report.removed} bajas. No se publica hasta que un admin la aplique.</p>
          <p><a href="${appBaseUrl()}/admin/aero-data" style="color: #001F58;">Revisar el informe</a></p>
        </div>
      `,
    });
  } catch (error) {
    console.error("[aero] no se pudo avisar por mail:", error);
  }
}

/** Nombres posibles del PDF de LAD, del mes actual hacia atrás: ANAC no publica uno todos los meses. */
export function ladCandidateUrls(now = new Date(), monthsBack = 6): string[] {
  return Array.from({ length: monthsBack + 1 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `https://www.argentina.gob.ar/sites/default/files/listado_lad_${d.getUTCFullYear()}-${month}.pdf`;
  });
}

async function findLatestLad(): Promise<{ url: string; data: Uint8Array } | null> {
  for (const url of ladCandidateUrls()) {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), cache: "no-store" });
    if (res.ok && (res.headers.get("content-type") ?? "").includes("pdf")) return { url, data: new Uint8Array(await res.arrayBuffer()) };
  }
  return null;
}

async function pdfItems(data: Uint8Array): Promise<PdfItem[][]> {
  const doc = await getDocumentProxy(data);
  const pages: PdfItem[][] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    pages.push(
      (content.items as { str?: string; transform?: number[]; width?: number }[])
        .filter((i) => i.str?.trim() && i.transform)
        .map((i) => ({ x: i.transform![4], y: i.transform![5], width: i.width ?? 0, text: i.str!.trim() }))
    );
  }
  return pages;
}

async function runLad(): Promise<AeroImport> {
  const found = await findLatestLad();
  if (!found) throw new Error("No se encontró ningún PDF de LAD de los últimos 6 meses. Puede haber cambiado el nombre o el lugar del archivo.");
  const already = await prisma.aeroImport.findFirst({ where: { dataset: "LAD", sourceUrl: found.url, status: { in: ["PENDING", "APPLIED"] } }, orderBy: { createdAt: "desc" } });
  const parsed = parseLadPages(await pdfItems(found.data));
  if (already?.sourceDate && parsed.sourceDate && already.sourceDate.getTime() === parsed.sourceDate.getTime()) return already;
  const report = await prisma.aeroImport.create({ data: { dataset: "LAD", sourceUrl: found.url, sourceDate: parsed.sourceDate } });
  return finishImport(report.id, "LAD", parsed.records, parsed.warnings, parsed.sourceDate);
}

async function startMadhel(): Promise<AeroImport> {
  const list = await fetchJson<{ results?: MadhelListItem[] }>(`${MADHEL_API}?format=json`);
  const items = list.results ?? [];
  if (!items.length || !items[0].local_identifier) throw new Error("El listado del MADHEL llegó vacío o cambió de formato.");
  const current = new Map((await currentRecords("MADHEL")).map((r) => [r.code, r]));
  const records: AeroRecord[] = [];
  const missing: MissingItem[] = [];
  for (const item of items) {
    const known = current.get(item.local_identifier);
    // La API informa la fecha de cada registro: solo se pide el detalle de lo que cambió.
    if (known?.sourceUpdatedAt && item.updated_at && new Date(known.sourceUpdatedAt).getTime() === new Date(item.updated_at).getTime()) records.push(known);
    else missing.push(item);
  }
  return prisma.aeroImport.create({ data: { dataset: "MADHEL", sourceUrl: "https://ais.anac.gob.ar/madhel/", sourceDate: new Date(), payload: asJson({ records, missing }) } });
}

/**
 * Pide detalles de a poco, hasta agotar el tiempo. Si ANAC rechaza pedidos, espera y lo deja para la próxima tanda.
 * Agotados los intentos, un lugar ya cargado conserva sus datos; uno nuevo queda con los del listado. En los dos
 * casos hay aviso, y se vuelve a pedir en la próxima lectura.
 */
async function continueMadhel(report: AeroImport, deadline: number): Promise<AeroImport> {
  const payload = asPayload(report.payload);
  const records = [...payload.records];
  const warnings = [...((report.warnings ?? []) as string[])];
  let missing = [...(payload.missing ?? [])];
  const known = new Map((await currentRecords("MADHEL")).map((r) => [r.code, r]));
  let failedBatches = 0;
  while (missing.length && Date.now() < deadline && failedBatches < 3) {
    const batch = missing.slice(0, MADHEL_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (item) => {
        try {
          return { item, detail: await fetchJson<Parameters<typeof normalizeMadhel>[1]>(`${MADHEL_API}${encodeURIComponent(item.local_identifier)}/?format=json`) };
        } catch {
          return { item, detail: null };
        }
      })
    );
    missing = missing.slice(batch.length);
    for (const { item, detail } of results) {
      const attempts = (item.attempts ?? 0) + 1;
      if (!detail && attempts < MAX_ATTEMPTS) {
        missing.push({ ...item, attempts });
        continue;
      }
      const previous = known.get(item.local_identifier);
      if (!detail && previous) {
        warnings.push(`${item.local_identifier}: no se pudo leer el detalle; se conservan los datos anteriores.`);
        records.push({ ...previous, sourceUpdatedAt: null });
        continue;
      }
      if (!detail) warnings.push(`${item.local_identifier}: no se pudo leer el detalle; quedan solo los datos del listado.`);
      const normalized = normalizeMadhel(item, detail);
      records.push(normalized.record);
      warnings.push(...normalized.warnings);
    }
    const allFailed = results.every((r) => !r.detail);
    failedBatches = allFailed ? failedBatches + 1 : 0;
    await sleep(allFailed ? PAUSE_AFTER_FAILURE_MS : PAUSE_BETWEEN_BATCHES_MS);
  }
  if (missing.length) {
    return prisma.aeroImport.update({ where: { id: report.id }, data: { payload: asJson({ records, missing }), warnings: asJson(warnings) } });
  }
  return finishImport(report.id, "MADHEL", records, warnings, report.sourceDate);
}

const incomplete = (report: AeroImport) => (asPayload(report.payload).missing?.length ?? 0) > 0;

/**
 * Busca actualizaciones o retoma una lectura a medias. Devuelve el informe; `pending` indica cuántos faltan.
 * El MADHEL no se vuelve a leer si ya hay un informe esperando revisión.
 */
export async function runAeroCheck(dataset: "MADHEL" | "LAD", budgetMs = 45_000): Promise<{ report: AeroImport; remaining: number }> {
  const deadline = Date.now() + budgetMs;
  try {
    if (dataset === "LAD") {
      const report = await runLad();
      return { report, remaining: 0 };
    }
    const open = await prisma.aeroImport.findFirst({ where: { dataset: "MADHEL", status: "PENDING" }, orderBy: { createdAt: "desc" } });
    if (open && !incomplete(open)) return { report: open, remaining: 0 };
    const started = open ?? (await startMadhel());
    const report = await continueMadhel(started, deadline);
    return { report, remaining: report.status === "PENDING" ? (asPayload(report.payload).missing?.length ?? 0) : 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[aero] falló la importación de ${dataset}:`, error);
    const report = await prisma.aeroImport.create({ data: { dataset, status: "FAILED", error: message.slice(0, 1000) } });
    return { report, remaining: 0 };
  }
}

const toRow = (r: AeroRecord, source: AeroDataset) => ({
  kind: r.kind,
  source,
  code: r.code,
  icao: r.icao,
  iata: r.iata,
  name: r.name,
  fir: r.fir,
  province: r.province,
  location: r.location,
  lat: r.lat,
  lng: r.lng,
  elevationM: r.elevationM,
  condition: r.condition,
  runways: r.runways,
  frequencies: r.frequencies,
  details: asJson(r.details),
  sourceUpdatedAt: r.sourceUpdatedAt ? new Date(r.sourceUpdatedAt) : null,
});

/** Publica un informe. Todo o nada: si algo falla, sigue la versión anterior. */
export async function applyAeroImport(id: string, adminId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const report = await prisma.aeroImport.findUnique({ where: { id } });
  if (!report || report.status !== "PENDING") return { ok: false, error: "Este informe ya no está pendiente." };
  if (incomplete(report)) return { ok: false, error: "La lectura todavía no terminó." };
  const { records } = asPayload(report.payload);
  const diff = report.diff as unknown as AeroDiff;
  const byCode = new Map(records.map((r) => [r.code, r]));
  const source = report.dataset;
  await prisma.$transaction(
    async (tx) => {
      if (diff.removed.length) await tx.aeroPlace.deleteMany({ where: { source, code: { in: diff.removed.map((r) => r.code) } } });
      const added = diff.added.map((a) => byCode.get(a.code)).filter((r): r is AeroRecord => !!r);
      if (added.length) await tx.aeroPlace.createMany({ data: added.map((r) => toRow(r, source)) });
      for (const c of diff.changed) {
        const r = byCode.get(c.code);
        if (r) await tx.aeroPlace.update({ where: { source_code: { source, code: c.code } }, data: toRow(r, source) });
      }
      await tx.aeroImport.update({ where: { id }, data: { status: "APPLIED", appliedAt: new Date(), appliedById: adminId, payload: asJson({ records: [] }) } });
    },
    { timeout: 55_000 }
  );
  return { ok: true };
}

export async function rejectAeroImport(id: string) {
  await prisma.aeroImport.updateMany({ where: { id, status: "PENDING" }, data: { status: "REJECTED", payload: asJson({ records: [] }) } });
}

export type AeroStatus = { dataset: "MADHEL" | "LAD"; count: number; lastApplied: { sourceDate: string | null; appliedAt: string | null } | null };

/** Vigencia de cada fuente: la última versión aplicada. */
export async function aeroStatus(): Promise<AeroStatus[]> {
  return Promise.all(
    (["MADHEL", "LAD"] as const).map(async (dataset) => {
      const [count, last] = await Promise.all([
        prisma.aeroPlace.count({ where: { source: dataset } }),
        prisma.aeroImport.findFirst({ where: { dataset, status: "APPLIED" }, orderBy: { appliedAt: "desc" }, select: { sourceDate: true, appliedAt: true } }),
      ]);
      return { dataset, count, lastApplied: last ? { sourceDate: last.sourceDate?.toISOString() ?? null, appliedAt: last.appliedAt?.toISOString() ?? null } : null };
    })
  );
}
