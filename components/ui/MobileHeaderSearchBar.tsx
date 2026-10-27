"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Plane, Wrench, ArrowLeft, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useIsHome } from "@/lib/use-is-home";
import { searchGlobal, searchSellers, SearchResultItem, type SellerResult } from "@/app/actions/search-actions";
import { SellerResults } from "@/components/ui/search/SellerResults";
import { logSearch } from "@/app/actions/analytics-actions";
import { ensureAnalyticsCookies } from "@/lib/analytics-client";
import { createPortal } from "react-dom";

export default function MobileHeaderSearchBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [fetched, setFetched] = useState<{ query: string; items: SearchResultItem[]; sellers: SellerResult[] }>({ query: "", items: [], sellers: [] });

  const router = useRouter();
  const isHome = useIsHome();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      // "" quita el estilo en línea; "unset" quedaba escrito y pisaba el overflow-x: clip del body (globals.css).
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Los resultados se guardan con la búsqueda que los trajo; "cargando" se deriva (VA-63).
  const hasQuery = query.trim().length >= 2;
  const results = hasQuery ? fetched.items : [];
  // VA-172: vendedores (Brokers) por nombre comercial.
  const sellers = hasQuery && fetched.query === query ? fetched.sellers : [];
  const loading = hasQuery && fetched.query !== query;

  useEffect(() => {
    if (!hasQuery) return;

    const timer = setTimeout(async () => {
      const [res, found] = await Promise.all([searchGlobal(query, "Todos"), searchSellers(query)]);
      setFetched({ query, items: res, sellers: found });
    }, 350);

    return () => clearTimeout(timer);
  }, [query, hasQuery]);

  // VA-137: la pantalla de búsqueda ocupa una entrada del historial, así el "atrás" del celular la
  // cierra en vez de volver a la página anterior (antes llevaba, por ejemplo, a Repuestos).
  useEffect(() => {
    if (!isOpen) return;
    const onPop = () => {
      setIsOpen(false);
      setQuery("");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [isOpen]);

  const open = () => {
    window.history.pushState({ ...window.history.state, vaSearch: true }, "");
    setIsOpen(true);
  };

  const close = () => {
    if (window.history.state?.vaSearch) window.history.back(); // dispara popstate y cierra
    else {
      setIsOpen(false);
      setQuery("");
    }
  };

  // Al ir a un resultado se reemplaza la entrada de la búsqueda (atrás vuelve a la página de antes).
  const go = (url: string) => {
    setIsOpen(false);
    setQuery("");
    if (window.history.state?.vaSearch) router.replace(url);
    else router.push(url);
  };

  const handleSelect = (url: string) => {
    // VA-15: la búsqueda se registra al elegir un resultado (no en cada tecla).
    ensureAnalyticsCookies();
    void logSearch(query, results.length, "HEADER_RESULT_CLICK");
    go(url);
  };

  const handleSearchSubmit = () => {
    if (query.trim().length >= 2) go(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearchSubmit();
    }
  };

  return (
    <>
      {/* 26/10: barra de búsqueda chica (en vez de solo la lupa); al tocarla abre la pantalla de búsqueda. */}
      <button
        type="button"
        onClick={open}
        className={`flex h-9 w-full min-w-0 items-center gap-2 rounded-full px-3 text-left text-xs outline-none cursor-pointer md:hidden ${
          isHome
            ? "bg-white/90 text-[#00205B]/60 ring-1 ring-white/60"
            : "border border-[#00205B]/12 bg-[#F5F5F5] text-[#00205B]/55"
        }`}
        aria-label="Abrir buscador"
      >
        <Search className="h-4 w-4 shrink-0 text-[#00205B]" />
        <span className="truncate">Buscar aviones, repuestos…</span>
      </button>

      {/* Pantalla Blanca de Búsqueda para Mobile */}
      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[999] bg-white flex flex-col animate-in fade-in duration-150">
            {/* Header Superior Blanco */}
            <div className="flex items-center gap-2 p-3 border-b border-slate-200 bg-white">
              <button
                type="button"
                onClick={close}
                aria-label="Cerrar buscador"
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
                className="p-2.5 bg-[#00205B] text-white rounded-xl font-bold text-xs shrink-0"
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
              <SellerResults sellers={sellers} query={query} onSelect={() => { setIsOpen(false); setQuery(""); }} />
              {query.trim().length >= 2 && results.length === 0 && sellers.length === 0 && !loading && (
                <div className="p-8 text-center text-xs text-slate-400">
                  No se encontraron resultados para “{query}”
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
                        <p className="text-xs font-bold text-slate-800 truncate group-hover:text-[#00205B]">
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
          </div>,
         document.body
        )}
    </>
  );
}