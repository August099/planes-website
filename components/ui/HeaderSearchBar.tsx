"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Plane, Wrench } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { searchGlobal, SearchResultItem, SearchType } from "@/app/actions/search-actions";

export default function HeaderSearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const [searchType, setSearchType] = useState<SearchType>("Aeronave");

  const router = useRouter();
  const pathname = usePathname();

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Determinar el tipo según la sección actual
  useEffect(() => {
    if (pathname.startsWith("/spareparts")) {
      setSearchType("Repuesto");
    } else if (pathname.startsWith("/planes")) {
      setSearchType("Aeronave");
    }
  }, [pathname]);

  // Buscar resultados preliminares
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);

    const timer = setTimeout(async () => {
      let anonymousId = localStorage.getItem("anon_id");

      if (!anonymousId) {
        anonymousId = `anon_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem("anon_id", anonymousId);
      }

      const res = await searchGlobal(
        query,
        anonymousId,
        searchType
      );

      setResults(res);
      setIsOpen(true);
      setLoading(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [query, searchType]);

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
    setIsOpen(false);
    setQuery("");
    router.push(url);
  };

  const handleSearchSubmit = () => {
    if (query.trim().length < 2) return;

    setIsOpen(false);

    const encodedQuery = encodeURIComponent(query.trim());

    if (searchType === "Aeronave") {
      router.push(`/planes?search=${encodedQuery}`);
    } else {
      router.push(`/spareparts?search=${encodedQuery}`);
    }
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
          placeholder="Buscar aeronaves, repuestos y mas..."
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
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">

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
              No se encontraron resultados preliminares para "{query}"
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