"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { FilterShell, FilterSection, AppliedFilterChips, ProvinceFilterSelect } from "@/components/ui/filters/FilterShell";
import { provinceBySlug, provinceShortName } from "@/lib/provinces";
import { AIRCRAFT_TYPE_LABELS, OFFER_TYPES, SERVICE_LABELS } from "@/lib/hangars";

// VA-84: filtros del listado de hangares, con la misma estructura que los de /aircraft (FilterShell):
// tipo de publicación, provincia, ancho mínimo de puerta, tipo de aeronave, precio y servicios.

type SectionKey = "type" | "province" | "door" | "aircraft" | "price" | "services";

const OFFER_LABELS: Record<string, string> = Object.fromEntries(OFFER_TYPES.map((o) => [o.value, o.label]));
const AIRCRAFT_LABELS: Record<string, string> = AIRCRAFT_TYPE_LABELS;
const SERVICES: Record<string, string> = SERVICE_LABELS;

export function HangarFiltersSidebar() {
  const searchParams = useSearchParams();
  return <HangarFiltersForm key={searchParams.toString()} />;
}

function HangarFiltersForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [types, setTypes] = useState<string[]>(searchParams.getAll("type"));
  const [province, setProvince] = useState(searchParams.get("province") ?? "");
  const [minDoor, setMinDoor] = useState(searchParams.get("minDoor") ?? "");
  const [aircraft, setAircraft] = useState<string[]>(searchParams.getAll("aircraft"));
  const [currency, setCurrency] = useState(searchParams.get("currency") === "USD" ? "USD" : "ARS");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const [services, setServices] = useState<string[]>(searchParams.getAll("service"));

  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(() => ({
    type: true,
    province: searchParams.has("province"),
    door: searchParams.has("minDoor"),
    aircraft: searchParams.has("aircraft"),
    price: searchParams.has("minPrice") || searchParams.has("maxPrice"),
    services: searchParams.has("service"),
  }));
  const toggleSection = (section: SectionKey) => setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));

  const toggleValue = (list: string[], setList: (v: string[]) => void, value: string) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    const sort = searchParams.get("sort");
    if (sort) params.set("sort", sort);
    types.forEach((t) => params.append("type", t));
    if (province) params.set("province", province);
    if (minDoor) params.set("minDoor", minDoor);
    aircraft.forEach((a) => params.append("aircraft", a));
    if (minPrice || maxPrice) params.set("currency", currency);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    services.forEach((s) => params.append("service", s));
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
    setIsOpenMobile(false);
  }, [searchParams, types, province, minDoor, aircraft, currency, minPrice, maxPrice, services, router, pathname]);

  const clearFilters = () => {
    const sort = searchParams.get("sort");
    router.push(sort ? `${pathname}?sort=${sort}` : pathname);
    setIsOpenMobile(false);
  };

  const counts = {
    type: types.length,
    province: province ? 1 : 0,
    door: minDoor ? 1 : 0,
    aircraft: aircraft.length,
    price: (minPrice ? 1 : 0) + (maxPrice ? 1 : 0),
    services: services.length,
  };
  const activeFilterCount = Object.values(counts).reduce((a, b) => a + b, 0);

  const appliedChips = useMemo(() => {
    const chips: { key: string; value: string | null; label: string }[] = [];
    for (const value of searchParams.getAll("type")) chips.push({ key: "type", value, label: OFFER_LABELS[value] ?? value });
    const prov = provinceBySlug(searchParams.get("province"));
    if (prov) chips.push({ key: "province", value: null, label: provinceShortName(prov.name) });
    const door = searchParams.get("minDoor");
    if (door) chips.push({ key: "minDoor", value: null, label: `Puerta desde ${door.replace(".", ",")} m` });
    for (const value of searchParams.getAll("aircraft")) chips.push({ key: "aircraft", value, label: AIRCRAFT_LABELS[value] ?? value });
    const cur = searchParams.get("currency") === "USD" ? "US$" : "AR$";
    const min = searchParams.get("minPrice");
    const max = searchParams.get("maxPrice");
    if (min) chips.push({ key: "minPrice", value: null, label: `Desde ${cur} ${Number(min).toLocaleString("es-AR")}` });
    if (max) chips.push({ key: "maxPrice", value: null, label: `Hasta ${cur} ${Number(max).toLocaleString("es-AR")}` });
    for (const value of searchParams.getAll("service")) chips.push({ key: "service", value, label: SERVICES[value] ?? value });
    return chips;
  }, [searchParams]);

  const removeChip = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) params.delete(key);
    else params.delete(key, value);
    if (!params.has("minPrice") && !params.has("maxPrice")) params.delete("currency");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const checkRow = (id: string, checked: boolean, onChange: () => void, label: React.ReactNode) => (
    <div key={id} className="flex items-center gap-2 min-h-9">
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
      <label htmlFor={id} className="text-sm cursor-pointer flex-1 select-none py-1">
        {label}
      </label>
    </div>
  );

  const inputClass = "w-full px-2 py-2 border rounded-md text-sm bg-white";

  return (
    <FilterShell onApply={applyFilters} activeCount={activeFilterCount} onClear={clearFilters} isOpenMobile={isOpenMobile} setIsOpenMobile={setIsOpenMobile}>
      <AppliedFilterChips chips={appliedChips} onRemove={removeChip} />

      <FilterSection title="Tipo de publicación" count={counts.type} open={openSections.type} onToggle={() => toggleSection("type")}>
        <div className="flex flex-col gap-0.5">
          {OFFER_TYPES.map((o) => checkRow(`type-${o.value}`, types.includes(o.value), () => toggleValue(types, setTypes, o.value), o.label))}
        </div>
      </FilterSection>

      <FilterSection title="Provincia" count={counts.province} open={openSections.province} onToggle={() => toggleSection("province")}>
        <ProvinceFilterSelect value={province} onChange={setProvince} />
      </FilterSection>

      <FilterSection title="Ancho mínimo de puerta" count={counts.door} open={openSections.door} onToggle={() => toggleSection("door")}>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            aria-label="Ancho mínimo de puerta en metros"
            placeholder="Ej.: 12"
            value={minDoor}
            onChange={(e) => setMinDoor(e.target.value)}
            className={inputClass}
          />
          <span className="text-sm text-slate-500">m</span>
        </div>
      </FilterSection>

      <FilterSection title="Tipo de aeronave" count={counts.aircraft} open={openSections.aircraft} onToggle={() => toggleSection("aircraft")}>
        <div className="flex flex-col gap-0.5">
          {Object.entries(AIRCRAFT_LABELS).map(([value, label]) =>
            checkRow(`aircraft-${value}`, aircraft.includes(value), () => toggleValue(aircraft, setAircraft, value), label)
          )}
        </div>
      </FilterSection>

      <FilterSection title="Precio" count={counts.price} open={openSections.price} onToggle={() => toggleSection("price")}>
        <div className="space-y-2">
          <div role="radiogroup" aria-label="Moneda" className="grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1">
            {(["ARS", "USD"] as const).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={currency === c}
                onClick={() => setCurrency(c)}
                className={`min-h-9 rounded text-sm font-medium cursor-pointer transition-colors ${
                  currency === c ? "bg-white text-[#001F58] shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {c === "ARS" ? "Pesos" : "Dólares"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input type="number" inputMode="numeric" aria-label="Precio mínimo" placeholder="Mín" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className={inputClass} />
            <span className="text-gray-400">-</span>
            <input type="number" inputMode="numeric" aria-label="Precio máximo" placeholder="Máx" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className={inputClass} />
          </div>
          <p className="text-xs text-muted-foreground">Compara el precio de venta o de alquiler, en la moneda elegida.</p>
        </div>
      </FilterSection>

      <FilterSection title="Servicios" count={counts.services} open={openSections.services} onToggle={() => toggleSection("services")}>
        <div className="flex flex-col gap-0.5">
          {Object.entries(SERVICES).map(([value, label]) =>
            checkRow(`service-${value}`, services.includes(value), () => toggleValue(services, setServices, value), label)
          )}
        </div>
      </FilterSection>
    </FilterShell>
  );
}
