"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  getAircraftCategories,
  getBrands,
  getModelsByBrand,
  getPartCategories,
} from "@/app/actions/filter-actions";
import { SPARE_PART_CONDITION_LABELS } from "@/lib/constants";

type Option = { id: string; name: string };
type PartCategory = Option & { parentId: string | null };
type Mode = "aircraft" | "parts";
type PriceRange = { label: string; minPrice?: string; maxPrice?: string };

// Rangos del selector de precio → parámetros que entienden /aircraft (VA-31) y /spareparts (2/11, solo USD).
const AIRCRAFT_PRICES: Record<string, PriceRange> = {
  "0-100k": { label: "Hasta USD 100.000", maxPrice: "100000" },
  "100k-300k": { label: "USD 100.000 - 300.000", minPrice: "100000", maxPrice: "300000" },
  "300k+": { label: "Más de USD 300.000", minPrice: "300000" },
};
const PART_PRICES: Record<string, PriceRange> = {
  "0-5k": { label: "Hasta USD 5.000", maxPrice: "5000" },
  "5k-50k": { label: "USD 5.000 - 50.000", minPrice: "5000", maxPrice: "50000" },
  "50k+": { label: "Más de USD 50.000", minPrice: "50000" },
};

const MODES: { key: Mode; label: string }[] = [
  { key: "aircraft", label: "Aviones" },
  { key: "parts", label: "Repuestos" },
];

const SELECT =
  "w-full h-11 px-4 pr-8 bg-white text-slate-700 text-xs sm:text-sm rounded-xl appearance-none font-medium focus:outline-none cursor-pointer border border-slate-100 shadow-sm disabled:opacity-60";
const ICON = "absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none";

export default function HomeHeroFilter() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("aircraft");

  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [models, setModels] = useState<Option[]>([]);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedPrice, setSelectedPrice] = useState("");

  const [loadingModels, setLoadingModels] = useState(false);

  // 2/11: repuestos. Las categorías se piden recién al pasar a "Repuestos".
  const [partCategories, setPartCategories] = useState<PartCategory[]>([]);
  const [selectedPartCategory, setSelectedPartCategory] = useState("");
  const [selectedPartSubcategory, setSelectedPartSubcategory] = useState("");
  const [selectedCondition, setSelectedCondition] = useState("");
  const [selectedPartPrice, setSelectedPartPrice] = useState("");

  // Cargar categorías y marcas al montar
  useEffect(() => {
    getAircraftCategories().then(setCategories);
    getBrands().then(setBrands);
  }, []);

  const handleModeChange = (next: Mode) => {
    setMode(next);
    if (next === "parts" && partCategories.length === 0) void getPartCategories().then(setPartCategories);
  };

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

    if (mode === "aircraft") {
      if (selectedCategory) params.set("category", selectedCategory);
      if (selectedBrand) params.set("brand", selectedBrand);
      if (selectedModel) params.set("model", selectedModel);
      const range = AIRCRAFT_PRICES[selectedPrice];
      if (range?.minPrice) params.set("minPrice", range.minPrice);
      if (range?.maxPrice) params.set("maxPrice", range.maxPrice);
    } else {
      const category = selectedPartSubcategory || selectedPartCategory;
      if (category) params.set("category", category);
      if (selectedCondition) params.set("condition", selectedCondition);
      const range = PART_PRICES[selectedPartPrice];
      if (range) params.set("currency", "USD");
      if (range?.minPrice) params.set("minPrice", range.minPrice);
      if (range?.maxPrice) params.set("maxPrice", range.maxPrice);
    }

    const queryString = params.toString();
    router.push(`${mode === "aircraft" ? "/aircraft" : "/spareparts"}${queryString ? `?${queryString}` : ""}`);
  };

  const rootCategories = partCategories.filter((c) => !c.parentId);
  const subcategories = selectedPartCategory ? partCategories.filter((c) => c.parentId === selectedPartCategory) : [];

  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:p-3 rounded-lg bg-white/20 backdrop-blur-md border border-white/30 shadow-2xl">
      <div role="group" aria-label="Qué querés buscar" className="mb-2 flex w-fit gap-1 rounded-full bg-[#00205B]/55 p-1">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            aria-pressed={mode === m.key}
            onClick={() => handleModeChange(m.key)}
            className={`min-h-11 sm:min-h-9 cursor-pointer rounded-full px-4 text-xs font-bold transition-colors sm:text-sm ${
              mode === m.key ? "bg-white text-[#00205B]" : "text-white hover:bg-white/15"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {mode === "aircraft" ? (
          <>
            {/* Categoría libre */}
            <div className="relative">
              <select aria-label="Categoría" value={selectedCategory} onChange={(e) => void handleCategoryChange(e.target.value)} className={SELECT}>
                <option value="">Categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className={ICON} />
            </div>

            {/* Marca libre */}
            <div className="relative">
              <select aria-label="Marca" value={selectedBrand} onChange={(e) => handleBrandChange(e.target.value)} className={SELECT}>
                <option value="">Marca</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown className={ICON} />
            </div>

            {/* Modelos según la Marca seleccionada */}
            <div className="relative">
              <select aria-label="Modelo" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} disabled={!selectedBrand || loadingModels} className={SELECT}>
                <option value="">{!selectedBrand ? "Elegí una marca" : "Modelo"}</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              {loadingModels ? <Loader2 className={`${ICON} animate-spin`} /> : <ChevronDown className={ICON} />}
            </div>
          </>
        ) : (
          <>
            {/* Categoría de repuesto */}
            <div className="relative">
              <select
                aria-label="Categoría"
                value={selectedPartCategory}
                onChange={(e) => {
                  setSelectedPartCategory(e.target.value);
                  setSelectedPartSubcategory("");
                }}
                className={SELECT}
              >
                <option value="">Categoría</option>
                {rootCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className={ICON} />
            </div>

            {/* Subcategorías según la categoría elegida */}
            <div className="relative">
              <select aria-label="Subcategoría" value={selectedPartSubcategory} onChange={(e) => setSelectedPartSubcategory(e.target.value)} disabled={subcategories.length === 0} className={SELECT}>
                <option value="">{selectedPartCategory && subcategories.length === 0 ? "Sin subcategorías" : "Subcategoría"}</option>
                {subcategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className={ICON} />
            </div>

            {/* Condición */}
            <div className="relative">
              <select aria-label="Condición" value={selectedCondition} onChange={(e) => setSelectedCondition(e.target.value)} className={SELECT}>
                <option value="">Condición</option>
                {Object.entries(SPARE_PART_CONDITION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown className={ICON} />
            </div>
          </>
        )}

        {/* Rango de Precio */}
        <div className="relative">
          <select
            aria-label="Precio"
            value={mode === "aircraft" ? selectedPrice : selectedPartPrice}
            onChange={(e) => (mode === "aircraft" ? setSelectedPrice(e.target.value) : setSelectedPartPrice(e.target.value))}
            className={SELECT}
          >
            <option value="">Precio</option>
            {Object.entries(mode === "aircraft" ? AIRCRAFT_PRICES : PART_PRICES).map(([value, range]) => (
              <option key={value} value={value}>
                {range.label}
              </option>
            ))}
          </select>
          <ChevronDown className={ICON} />
        </div>

        {/* Botón Buscar */}
        <button
          type="button"
          onClick={handleSearch}
          className="col-span-2 md:col-span-1 h-11 bg-[#D62828] hover:bg-[#B71F1F] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          <span>Buscar</span>
        </button>
      </div>
    </div>
  );
}
