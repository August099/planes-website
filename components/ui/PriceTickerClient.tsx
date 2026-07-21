"use client";

type TickerItem = { label: string; value: string };

export function PriceTickerClient({ items }: { items: TickerItem[] }) {
  // duplicamos el array para que el loop sea continuo sin salto visible
  const looped = [...items, ...items];

  return (
    <div className="bg-[#001F58] text-white overflow-hidden py-2">
      <div className="flex animate-ticker whitespace-nowrap">
        {looped.map((item, i) => (
          <span key={i} className="mx-6 text-sm flex items-center gap-2">
            <span className="text-white/60">{item.label}</span>
            <span className="font-semibold text-[#ff8f8f]">{item.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}