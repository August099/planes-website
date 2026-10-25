"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Plane, Wrench } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { searchGlobal, searchSellers, SearchResultItem, SearchType, type SellerResult } from "@/app/actions/search-actions";
import { SellerResults } from "@/components/ui/search/SellerResults";
import { logSearch } from "@/app/actions/analytics-actions";
import { ensureAnalyticsCookies } from "@/lib/analytics-client";

function sectionSearchType(pathname: string): SearchType | null {
  if (pathname.startsWith("/spareparts")) return "Repuesto";
  if (pathname.startsWith("/aircraft")) return "Aeronave";
  return null;
}

export default function HeaderSearchBar() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  // Tipo según la sección actual; se ajusta al cambiar de sección sin un efecto (VA-63).
  const section = sectionSearchType(pathname);
  const [searchType, setSearchType] = useState<SearchType>(section ?? "Aeronave");
  const [prevSection, setPrevSection] = useState(section);
  if (section !== prevSection) {
    setPrevSection(section);
    if (section) setSearchType(section);
  }
  // VA-146: al cambiar de página se limpia el buscador. Antes el texto quedaba, el cambio de sección
  // cambiaba el tipo y la búsqueda se repetía sola y abría los resultados en la página nueva.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setQuery("");
    setIsOpen(false);
  }

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Resultados preliminares: se guardan junto con la búsqueda que los trajo, así "cargando",
  // "sin texto" y "abierto" se derivan en el render en vez de sincronizarse en un efecto (VA-63).
  const hasQuery = query.trim().length >= 2;
  const searchKey = `${searchType}|${query}`;
  const [fetched, setFetched] = useState<{ key: string; items: SearchResultItem[] }>({ key: "", items: [] });
  const results = hasQuery ? fetched.items : [];
  // VA-172: vendedores (Brokers) que coinciden por nombre comercial, arriba del interruptor.
  const [sellerHits, setSellerHits] = useState<{ key: string; items: SellerResult[] }>({ key: "", items: [] });
  const sellers = hasQuery && sellerHits.key === query ? sellerHits.items : [];
  const loading = hasQuery && fetched.key !== searchKey;
  const open = isOpen && hasQuery;

  useEffect(() => {
    if (!hasQuery) return;

    const timer = setTimeout(async () => {
      const [res, found] = await Promise.all([searchGlobal(query, searchType), searchSellers(query)]);
      setSellerHits({ key: query, items: found });

      setFetched({ key: `${searchType}|${query}`, items: res });
      setIsOpen(true);
    }, 350);

    return () => clearTimeout(timer);
  }, [query, searchType, hasQuery]);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (url: string) => {
    // VA-15: la búsqueda se registra al elegir un resultado (no en cada tecla).
    ensureAnalyticsCookies();
    void logSearch(query, results.length, "HEADER_RESULT_CLICK", searchType);
    setIsOpen(false);
    setQuery("");
    router.push(url);
  };

  const handleSearchSubmit = () => {
    if (query.trim().length < 2) return;

    setIsOpen(false);

    // Antes iba a /aircraft?search= o /spareparts?search=, que no leen ese parámetro (no filtraba
    // nada). /search busca en aviones y repuestos, y registra la búsqueda (VA-15).
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      handleSearchSubmit();
    }
  };

  const handleTypeChange = (type: SearchType) => {
    setSearchType(type);

    // Si ya hay texto, mostramos resultados del nuevo tipo
    if (query.trim().length >= 2) {
      setIsOpen(true);
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="relative w-full max-w-md"
    >
      {/* Buscador */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() =>
            query.trim().length >= 2 && setIsOpen(true)
          }
          placeholder="Buscar aeronaves, repuestos y más..."
          className="w-full py-2 pl-5 pr-11 bg-white/95 text-slate-800 text-xs sm:text-sm rounded-full border border-slate-200/80 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#001F58]/30 placeholder:text-slate-400 placeholder:font-light"
        />

        <button
          type="button"
          onClick={handleSearchSubmit}
          className="absolute right-3.5 flex items-center text-slate-400 hover:text-[#001F58] transition-colors cursor-pointer"
          aria-label="Buscar"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#001F58]" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">

          <SellerResults sellers={sellers} query={query} onSelect={() => { setIsOpen(false); setQuery(""); }} />

          {/* SWITCH */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative flex bg-slate-100 rounded-xl p-1">

              {/* Indicador */}
              <div
                className={`absolute top-1 bottom-1 w-1/2 rounded-lg bg-white shadow-sm transition-transform duration-200 ${
                  searchType === "Repuesto"
                    ? "translate-x-full"
                    : "translate-x-0"
                }`}
              />

              {/* Aeronaves */}
              <button
                type="button"
                onClick={() => handleTypeChange("Aeronave")}
                className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  searchType === "Aeronave"
                    ? "text-[#001F58]"
                    : "text-slate-400"
                }`}
              >
                <Plane className="w-3.5 h-3.5" />
                Aeronaves
              </button>

              {/* Repuestos */}
              <button
                type="button"
                onClick={() => handleTypeChange("Repuesto")}
                className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  searchType === "Repuesto"
                    ? "text-[#001F58]"
                    : "text-slate-400"
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                Repuestos
              </button>

            </div>
          </div>

          {/* RESULTADOS */}
          {results.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              No se encontraron resultados preliminares para “{query}”
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {results.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelect(item.url)}
                  className="w-full p-3 text-left hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="pr-2 truncate">
                    <p className="text-xs font-bold text-slate-800 truncate group-hover:text-[#001F58]">
                      {item.title}
                    </p>

                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>

                  <span className="shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {item.type === "Aeronave" ? (
                      <Plane className="w-3 h-3 text-red-600" />
                    ) : (
                      <Wrench className="w-3 h-3 text-blue-600" />
                    )}

                    {item.type}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}