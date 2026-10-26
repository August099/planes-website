// Archivos huérfanos en Supabase Storage: fotos y documentos de avisos que ya no existen.
//
// Uso (desde la raíz del repo; usa DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL y
// SUPABASE_SERVICE_ROLE_KEY del entorno):
//   node --env-file=.env scripts/storage-orphans.mjs           → solo informa (no borra nada)
//   node --env-file=.env scripts/storage-orphans.mjs --delete  → borra los huérfanos
//
// IMPORTANTE: DATABASE_URL tiene que apuntar a la MISMA base que usa ese Storage
// (producción con producción). Si apunta a otra base, todo parecería huérfano.
// Nunca se tocan archivos de menos de 24 h (pueden ser de una publicación en curso).
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pg = require("pg");
const { createClient } = require("@supabase/supabase-js");

const BUCKETS = ["listings", "documents"];
const MIN_AGE_MS = 24 * 60 * 60 * 1000;
const doDelete = process.argv.includes("--delete");

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listAll(bucket, prefix = "") {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) out.push(...(await listAll(bucket, path))); // carpeta
      else out.push({ path, size: item.metadata?.size ?? 0, created: item.created_at });
    }
    if (data.length < 1000) break;
  }
  return out;
}

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const { rows } = await db.query(`
  select url from "AircraftImage"
  union all select url from "SparePartImage"
  union all select url from "AircraftDocument"`);
await db.end();

const referenced = new Set();
for (const { url } of rows) {
  for (const bucket of BUCKETS) {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const at = url.indexOf(marker);
    if (at !== -1) referenced.add(`${bucket}/${decodeURIComponent(url.slice(at + marker.length).split("?")[0])}`);
  }
}

const dbHost = new URL(process.env.DATABASE_URL).host;
console.log(`Base: ${dbHost} · ${rows.length} archivos referenciados por avisos.`);

let totalOrphans = 0;
for (const bucket of BUCKETS) {
  const files = await listAll(bucket);
  const now = Date.now();
  const orphans = files.filter(
    (f) => !referenced.has(`${bucket}/${f.path}`) && now - new Date(f.created).getTime() > MIN_AGE_MS
  );
  const mb = (orphans.reduce((a, f) => a + f.size, 0) / 1048576).toFixed(1);
  console.log(`${bucket}: ${files.length} archivos, ${orphans.length} huérfanos (${mb} MB)`);
  totalOrphans += orphans.length;

  if (doDelete && orphans.length > 0) {
    for (let i = 0; i < orphans.length; i += 100) {
      const batch = orphans.slice(i, i + 100).map((o) => o.path);
      const { error } = await supabase.storage.from(bucket).remove(batch);
      if (error) throw new Error(`No se pudo borrar en ${bucket}: ${error.message}`);
    }
    console.log(`  → ${orphans.length} borrados.`);
  }
}

if (!doDelete && totalOrphans > 0) {
  console.log("\nNo se borró nada. Para borrar, volvé a correrlo con --delete.");
}
