"use client";

import { useEffect, useRef, useState } from "react";

// Descripción de una publicación (VA-53, opción "a": texto libre con mejor formato).
// - Una línea corta que termina en ":" se muestra como subtítulo ("Mantenimiento:").
// - Las líneas que empiezan con "-", "•" o "*" forman una lista.
// - Una línea en blanco separa párrafos.
// En celular arranca recortada a 6 líneas con "Ver más" (solo si el texto es más largo).

type Block =
  | { kind: "heading"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; text: string };

const LIST_ITEM = /^\s*[-•*]\s+/;
const HEADING = /^[^\n]{1,60}:$/;

export function parseDescription(raw: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ kind: "paragraph", text: paragraph.join("\n") });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ kind: "list", items: list });
    list = [];
  };

  for (const rawLine of raw.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
    } else if (LIST_ITEM.test(line)) {
      flushParagraph();
      list.push(line.replace(LIST_ITEM, ""));
    } else if (HEADING.test(line)) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "heading", text: line.slice(0, -1) });
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}

export function DescriptionBody({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-slate-700 text-sm leading-relaxed break-words">
      {parseDescription(text).map((block, i) => {
        if (block.kind === "heading") {
          return (
            <h3 key={i} className="font-bold text-[#00205B] text-sm pt-1">
              {block.text}
            </h3>
          );
        }
        if (block.kind === "list") {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1 marker:text-[var(--sidebar-primary)]">
              {block.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

export function ListingDescription({ text, title = "Descripción General" }: { text: string; title?: string }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  // Solo hace falta "Ver más" si el texto recortado no entra (se mide en el navegador).
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-3 text-[#00205B]">{title}</h2>
      <div className="relative">
        {/* 6 líneas de text-sm/leading-relaxed ≈ 8.5rem. Desde lg se ve completa. */}
        <div ref={bodyRef} className={expanded ? "" : "max-lg:max-h-[8.5rem] max-lg:overflow-hidden"}>
          <DescriptionBody text={text} />
        </div>
        {!expanded && overflows && (
          <div className="lg:hidden pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
        )}
      </div>
      {(overflows || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="lg:hidden mt-2 text-sm font-semibold text-[var(--sidebar-primary)] hover:underline"
        >
          {expanded ? "Ver menos" : "Ver más"}
        </button>
      )}
    </div>
  );
}
