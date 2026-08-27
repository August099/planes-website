"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  getAircraftCategories,
  getBrands,
  getModelsByBrand,
} from "@/app/actions/filter-actions";

type Option = { id: string; name: string };

export default function HomeHeroFilter() {
  const router = useRouter();

  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [models, setModels] = useState<Option[]>([]);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedPrice, setSelectedPrice] = useState("");

  const [loadingModels, setLoadingModels] = useState(false);

  // Cargar categorías y marcas al montar
  useEffect(() => {
    getAircraftCategories().then(setCategories);
    getBrands().then(setBrands);
  }, []);

  // Al seleccionar/cambiar marca, traer todos los modelos de esa marca
  const handleBrandChange = async (bId: string) => {
    setSelectedBrand(bId);
    setSelectedModel(""); // Resetea el modelo anterior

    if (!bId) {
      setModels([]);
      return;
    }

    setLoadingModels(true);
    const availableModels = await getModelsByBrand(bId);
    setModels(availableModels);
    setLoadingModels(false);
  };

  const handleSearch = () => {
    const params = new URLSearchParams();

    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedBrand) params.set("brand", selectedBrand);
    if (selectedModel) params.set("model", selectedModel);
    if (selectedPrice) params.set("price", selectedPrice);

    const queryString = params.toString();
    router.push(`/planes${queryString ? `?${queryString}` : ""}`);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:p-3 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-2xl">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {/* Categoría libre */}
        <div className="relative">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full h-11 px-4 pr-8 bg-white text-slate-700 text-xs sm:text-sm rounded-xl appearance-none font-medium focus:outline-none cursor-pointer border border-slate-100 shadow-sm"
          >
            <option value="">Categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {/* Marca libre */}
        <div className="relative">
          <select
            value={selectedBrand}
            onChange={(e) => handleBrandChange(e.target.value)}
            className="w-full h-11 px-4 pr-8 bg-white text-slate-700 text-xs sm:text-sm rounded-xl appearance-none font-medium focus:outline-none cursor-pointer border border-slate-100 shadow-sm"
          >
            <option value="">Marca</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {/* Modelos según la Marca seleccionada */}
        <div className="relative">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={!selectedBrand || loadingModels}
            className="w-full h-11 px-4 pr-8 bg-white text-slate-700 text-xs sm:text-sm rounded-xl appearance-none font-medium focus:outline-none cursor-pointer border border-slate-100 shadow-sm disabled:opacity-60"
          >
            <option value="">
              {!selectedBrand ? "Elegí una marca" : "Modelo"}
            </option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {loadingModels ? (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400 pointer-events-none" />
          ) : (
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          )}
        </div>

        {/* Rango de Precio */}
        <div className="relative">
          <select
            value={selectedPrice}
            onChange={(e) => setSelectedPrice(e.target.value)}
            className="w-full h-11 px-4 pr-8 bg-white text-slate-700 text-xs sm:text-sm rounded-xl appearance-none font-medium focus:outline-none cursor-pointer border border-slate-100 shadow-sm"
          >
            <option value="">Precio</option>
            <option value="0-100k">Hasta USD 100.000</option>
            <option value="100k-300k">USD 100.000 - 300.000</option>
            <option value="300k+">Más de USD 300.000</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {/* Botón Buscar */}
        <button
          type="button"
          onClick={handleSearch}
          className="col-span-2 md:col-span-1 h-11 bg-[#DC2626] hover:bg-red-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          <span>Buscar</span>
        </button>
      </div>
    </div>
  );
}