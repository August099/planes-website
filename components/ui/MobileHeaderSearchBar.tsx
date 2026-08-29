"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Plane, Wrench, ArrowLeft, X } from "lucide-react";
import { useRouter, usePathname } from "next/navigation"; // Importamos usePathname
import { searchGlobal, SearchResultItem } from "@/app/actions/search-actions";

export default function MobileHeaderSearchBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const pathname = usePathname(); // Detectamos la ruta actual
  const isHome = pathname === "/";
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      let anonymousId = localStorage.getItem("anon_id");
      if (!anonymousId) {
        anonymousId = `anon_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem("anon_id", anonymousId);
      }

      const res = await searchGlobal(query, anonymousId);
      setResults(res);
      setLoading(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (url: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(url);
  };

  const handleSearchSubmit = () => {
    if (query.trim().length >= 2) {
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearchSubmit();
    }
  };

  return (
    <>
      {/* Botón Lupa con color dinámico: blanco en Home, azul en el resto */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`p-2 transition-colors md:hidden outline-none cursor-pointer ${
          isHome
            ? "text-white hover:text-white/80"
            : "text-[#001F58] hover:text-blue-900"
        }`}
        aria-label="Abrir buscador"
      >
        <Search className="w-5 h-5" />
      </button>

      {/* Pantalla Blanca de Búsqueda para Mobile */}
      {isOpen && (
        <div className="fixed inset-0 z-[999] bg-white flex flex-col animate-in fade-in duration-150">
          {/* Header Superior Blanco */}
          <div className="flex items-center gap-2 p-3 border-b border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setQuery("");
              }}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="relative flex-1 flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar aeronaves, repuestos..."
                className="w-full py-2 pl-3 pr-10 text-sm bg-slate-100 text-slate-900 rounded-xl focus:outline-none border border-slate-200 placeholder:text-slate-400"
              />

              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleSearchSubmit}
              className="p-2.5 bg-[#001F58] text-white rounded-xl font-bold text-xs shrink-0"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Buscar"
              )}
            </button>
          </div>

          {/* Resultados desplegados */}
          <div className="flex-1 overflow-y-auto bg-white p-2">
            {query.trim().length >= 2 && results.length === 0 && !loading && (
              <div className="p-8 text-center text-xs text-slate-400">
                No se encontraron resultados para "{query}"
              </div>
            )}

            {results.length > 0 && (
              <div className="divide-y divide-slate-100">
                {results.map((item) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSelect(item.url)}
                    className="w-full py-3 px-2 text-left hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer"
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
        </div>
      )}
    </>
  );
}