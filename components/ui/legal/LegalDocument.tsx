import React from "react";

// 3/11: textos legales como datos (lib/terms-content.tsx y lib/privacy-content.ts). Cada párrafo o lista lleva
// un número de cláusula automático ("5.3"), para poder citarla en un reclamo o en un correo.
export type LegalTable = { headers: string[]; rows: string[][] };
export type LegalBlock = string | { list: string[] } | { table: LegalTable };
export type LegalSection = { id: string; title: string; blocks: LegalBlock[] };

const LINK = "font-semibold underline underline-offset-2";

// Admite **negrita** y [texto](/link).
function inline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
    if (part.startsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a key={i} href={link[2]} className={LINK}>
          {link[1]}
        </a>
      );
    }
    return part;
  });
}

function Table({ table }: { table: LegalTable }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-[#00205B]/15 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          <tr>
            {table.headers.map((h) => (
              <th key={h} className="py-2 pr-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#00205B]/10">
          {table.rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, i) => (
                <td key={i} className={`py-2 pr-3 align-top ${i === 0 ? "font-mono text-xs" : ""}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LegalDocument({ sections }: { sections: LegalSection[] }) {
  return (
    <div className="flex flex-col gap-8">
      {sections.map((section, s) => {
        let clause = 0;
        return (
          <section key={section.id} id={section.id} className="flex scroll-mt-24 flex-col gap-3">
            <h2 className="font-heading text-lg font-semibold text-[#001F58]">
              {s + 1}. {section.title}
            </h2>
            {section.blocks.map((block, b) => {
              if (typeof block === "string") {
                clause += 1;
                return (
                  <p key={b}>
                    <span className="mr-1.5 text-xs font-semibold tabular-nums text-[#001F58]/55">
                      {s + 1}.{clause}
                    </span>
                    {inline(block)}
                  </p>
                );
              }
              if ("list" in block) {
                return (
                  <ul key={b} className="list-disc space-y-1.5 pl-5">
                    {block.list.map((item) => (
                      <li key={item}>{inline(item)}</li>
                    ))}
                  </ul>
                );
              }
              return <Table key={b} table={block.table} />;
            })}
          </section>
        );
      })}
    </div>
  );
}

/** Índice lateral de un documento legal. Con muchas secciones, tiene su propio scroll. */
export function LegalIndex({ sections }: { sections: LegalSection[] }) {
  const links = sections.map((section, i) => (
    <a key={section.id} href={`#${section.id}`} className="py-1.5 text-sm font-medium text-[#00205B]/70 transition-colors hover:text-[#00205B]">
      {i + 1}. {section.title}
    </a>
  ));
  return (
    <>
      {/* En el celular, desplegable: abierto taparía el texto con decenas de links. */}
      <details className="rounded-lg border border-[#00205B]/15 bg-white/70 px-4 py-3 md:hidden">
        <summary className="min-h-6 cursor-pointer text-sm font-semibold text-[#00205B]">Índice ({sections.length} secciones)</summary>
        <div className="mt-2 flex flex-col">{links}</div>
      </details>
      <aside className="hidden flex-col gap-2 border-l border-[#00205B]/20 pl-4 md:sticky md:top-24 md:col-span-1 md:flex md:max-h-[calc(100vh-7rem)] md:overflow-y-auto">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#00205B]/50">Índice</p>
        {links}
      </aside>
    </>
  );
}
