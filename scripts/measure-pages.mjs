// Medición rápida del servidor (VA-76): TTFB (mediana de 5), tamaño del HTML (plano y gzip) y
// cache-control de cada página. Uso: node scripts/measure-pages.mjs [baseUrl]
// Las métricas del navegador (JS, LCP, CLS) se miden aparte; ver docs/perf.md.
import http from "node:http";
import https from "node:https";
import zlib from "node:zlib";

const base = process.argv[2] ?? "http://localhost:3001";
const pages = process.argv.slice(3).length
  ? process.argv.slice(3)
  : ["/", "/aircraft", "/spareparts", "/aircraft/cmuzv34o7000058v7vknurgc8", "/terms", "/faq"];

function get(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const start = process.hrtime.bigint();
    let ttfb = null;
    const req = lib.get(url, { headers: { "accept-encoding": "identity" } }, (res) => {
      const chunks = [];
      res.once("data", () => {
        ttfb = Number(process.hrtime.bigint() - start) / 1e6;
      });
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const body = Buffer.concat(chunks);
        resolve({ ttfb, size: body.length, gzip: zlib.gzipSync(body).length, cache: res.headers["cache-control"] ?? "", vercel: res.headers["x-vercel-cache"] ?? "" });
      });
    });
    req.on("error", reject);
  });
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

for (const p of pages) {
  await get(base + p); // calentamiento
  const runs = [];
  for (let i = 0; i < 5; i++) runs.push(await get(base + p));
  const last = runs[runs.length - 1];
  console.log(
    `${p.padEnd(50)} TTFB ${String(Math.round(median(runs.map((r) => r.ttfb)))).padStart(4)} ms | HTML ${String(Math.round(last.size / 1024)).padStart(4)} KB (gzip ${Math.round(last.gzip / 1024)} KB) | ${last.cache}${last.vercel ? ` | x-vercel-cache: ${last.vercel}` : ""}`
  );
}
