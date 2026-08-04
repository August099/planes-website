"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePathname } from "next/navigation";

export function AnimatedSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const pathname = usePathname();
  const isHome = pathname === "/";

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <div className="relative flex items-center justify-end">
      <div
        className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out bg-white rounded-lg ${
          isOpen
            ? "w-64 px-2 py-1 shadow-md border border-slate-200"
            : "w-0 p-0 border-none"
        }`}
      >
        <Search className="h-4 w-4 text-slate-400 shrink-0 ml-1" />
        <Input
          ref={inputRef}
          placeholder="Buscar aviones..."
          className="border-none bg-transparent text-slate-800 placeholder:text-slate-400 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 h-8 px-2"
        />
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors shrink-0 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`p-2 rounded-lg transition-colors flex items-center justify-center outline-none cursor-pointer ${
            isHome
              ? "text-white hover:text-red-400"
              : "text-slate-800 hover:text-[#E70F1F]"
          }`}
          aria-label="Abrir buscador"
        >
          <Search className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}