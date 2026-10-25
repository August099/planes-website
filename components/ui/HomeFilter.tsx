"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  getAircraftCategories,
  getBrands,
  getModelsByBrand,
} from "@/app/actions/filter-actions";

type Option = { id: string; name: string };

// Rangos del selector de precio → parámetros que entiende /aircraft (VA-31).
const PRICE_RANGES: Record<string, { minPrice?: string; maxPrice?: string }> = {
  "0-100k": { maxPrice: "100000" },
  "100k-300k": { minPrice: "100000", maxPrice: "300000" },
  "300k+": { minPrice: "300000" },
};

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

  // Al seleccionar/cambiar marca, traer los modelos de esa marca (de la categoría elegida, si hay).
  const loadModels = async (bId: string, categoryId: string) => {
    if (!bId) {
      setModels([]);
      return;
    }
    setLoadingModels(true);
    setModels(await getModelsByBrand(bId, categoryId || undefined));
    setLoadingModels(false);
  };

  const handleBrandChange = async (bId: string) => {
    setSelectedBrand(bId);
    setSelectedModel(""); // Resetea el modelo anterior
    await loadModels(bId, selectedCategory);
  };

  // VA-153: la categoría acota las marcas y los modelos; si la marca elegida no tiene, se limpia.
  const handleCategoryChange = async (categoryId: string) => {
    setSelectedCategory(categoryId);
    const available = await getBrands(categoryId || undefined);
    setBrands(available);
    if (selectedBrand && !available.some((b) => b.id === selectedBrand)) {
      setSelectedBrand("");
      setSelectedModel("");
      setModels([]);
      return;
    }
    const models = selectedBrand ? await getModelsByBrand(selectedBrand, categoryId || undefined) : [];
    setModels(models);
    if (selectedModel && !models.some((m) => m.id === selectedModel)) setSelectedModel("");
  };

  const handleSearch = () => {
    const params = new URLSearchParams();

    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedBrand) params.set("brand", selectedBrand);
    if (selectedModel) params.set("model", selectedModel);
    const range = PRICE_RANGES[selectedPrice];
    if (range?.minPrice) params.set("minPrice", range.minPrice);
    if (range?.maxPrice) params.set("maxPrice", range.maxPrice);

    const queryString = params.toString();
    router.push(`/aircraft${queryString ? `?${queryString}` : ""}`);
  };

  // Rediseño (25/10): una "tira de plan de vuelo" sólida en vez del panel de vidrio. Cada campo lleva su
  // rótulo arriba; la única sombra separa la tira de la foto del hero.
  const field = "group/field relative block min-w-0 border-[#00205B]/10 px-4 pt-3 pb-2.5 transition-colors focus-within:bg-[#F5F5F5]";
  const select = "mt-0.5 w-full min-w-0 appearance-none truncate bg-transparent pr-6 text-sm font-semibold text-[#00205B] focus:outline-none cursor-pointer disabled:cursor-not-allowed disabled:text-[#00205B]/45";
  const chevron = "pointer-events-none absolute right-3 bottom-3 h-4 w-4 text-[#00205B]/45";
  return (
    <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-md bg-white text-left shadow-[0_22px_48px_-28px_rgba(0,19,49,0.75)]">
      <div className="grid grid-cols-2 md:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
        <label className={`${field} border-r border-b md:border-b-0`}>
          <span className="va-label block">Categoría</span>
          <select value={selectedCategory} onChange={(e) => void handleCategoryChange(e.target.value)} className={select}>
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className={chevron} />
        </label>

        <label className={`${field} border-b md:border-r md:border-b-0`}>
          <span className="va-label block">Marca</span>
          <select value={selectedBrand} onChange={(e) => handleBrandChange(e.target.value)} className={select}>
            <option value="">Todas</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <ChevronDown className={chevron} />
        </label>

        <label className={`${field} border-r border-b md:border-b-0`}>
          <span className="va-label block">Modelo</span>
          <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} disabled={!selectedBrand || loadingModels} className={select}>
            <option value="">{!selectedBrand ? "Elegí una marca" : "Todos"}</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {loadingModels ? <Loader2 className={`${chevron} animate-spin`} /> : <ChevronDown className={chevron} />}
        </label>

        <label className={`${field} border-b md:border-b-0`}>
          <span className="va-label block">Precio</span>
          <select value={selectedPrice} onChange={(e) => setSelectedPrice(e.target.value)} className={select}>
            <option value="">Cualquiera</option>
            <option value="0-100k">Hasta USD 100.000</option>
            <option value="100k-300k">USD 100.000 - 300.000</option>
            <option value="300k+">Más de USD 300.000</option>
          </select>
          <ChevronDown className={chevron} />
        </label>

        <button
          type="button"
          onClick={handleSearch}
          className="col-span-2 flex min-h-12 items-center justify-center gap-2 bg-[#D62828] px-8 text-sm font-bold text-white transition-colors hover:bg-[#B71F1F] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white md:col-span-1 cursor-pointer"
        >
          <Search className="h-4 w-4" aria-hidden />
          Buscar aviones
        </button>
      </div>
    </div>
  );
}