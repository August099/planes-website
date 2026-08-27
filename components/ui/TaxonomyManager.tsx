"use client";

import { useState } from "react";
import {
  createAircraftCategoryAction,
  createAircraftBrandAction,
  createAircraftModelAction,
  createAircraftSubModelAction,
  createSparePartCategoryAction,
} from "@/app/actions/admin-taxonomy-actions";
import { Plus, Plane, Wrench, CheckCircle2 } from "lucide-react";

interface Props {
  aircraftBrands: { id: string; name: string; models: { id: string; name: string }[] }[];
  sparePartCategories: { id: string; name: string }[];
}

export function TaxonomyManager({ aircraftBrands, sparePartCategories }: Props) {
  const [activeTab, setActiveTab] = useState<"aircrafts" | "spareparts">("aircrafts");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");

  const showFeedback = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleAddCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const name = new FormData(form).get("name") as string;
    try {
      await createAircraftCategoryAction(name);
      form.reset();
      showFeedback("Categoría de aeronave agregada");
    } catch {
      alert("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const handleAddBrand = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const name = new FormData(form).get("name") as string;
    try {
      await createAircraftBrandAction(name);
      form.reset();
      showFeedback("Marca agregada");
    } catch {
      alert("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const handleAddModel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedBrandId) return alert("Selecciona una marca");
    setLoading(true);
    const form = e.currentTarget;
    const name = new FormData(form).get("name") as string;
    try {
      await createAircraftModelAction(selectedBrandId, name);
      form.reset();
      showFeedback("Modelo agregado");
    } catch {
      alert("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubModel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedModelId) return alert("Selecciona un modelo");
    setLoading(true);
    const form = e.currentTarget;
    const name = new FormData(form).get("name") as string;
    try {
      await createAircraftSubModelAction(selectedModelId, name);
      form.reset();
      showFeedback("Variante/Submodelo agregado");
    } catch {
      alert("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSpareCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get("name") as string;
    const parentId = formData.get("parentId") as string;
    try {
      await createSparePartCategoryAction(name, parentId);
      form.reset();
      showFeedback("Categoría de repuesto agregada");
    } catch {
      alert("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const selectedBrand = aircraftBrands.find((b) => b.id === selectedBrandId);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab("aircrafts")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 cursor-pointer transition-all ${
            activeTab === "aircrafts"
              ? "border-[#001F58] text-[#001F58]"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Plane className="w-4 h-4" /> Aeronaves
        </button>
        <button
          onClick={() => setActiveTab("spareparts")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 cursor-pointer transition-all ${
            activeTab === "spareparts"
              ? "border-[#001F58] text-[#001F58]"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Wrench className="w-4 h-4" /> Repuestos
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-green-50 text-green-700 text-xs font-semibold rounded-xl border border-green-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {/* SECCIÓN AVIONES */}
      {activeTab === "aircrafts" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Agregar categoría de avión */}
          <div className="p-5 bg-white/80 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="font-bold text-sm text-[#001F58]">Nueva Categoría de Aeronave</h3>
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input
                type="text"
                name="name"
                placeholder="Ej: Turbohélice, Anfibio"
                required
                className="flex-1 px-3 py-2 text-xs border rounded-xl bg-white"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-[#001F58] text-white text-xs font-bold rounded-xl hover:bg-blue-950 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Crear
              </button>
            </form>
          </div>

          {/* Agregar marca de avión */}
          <div className="p-5 bg-white/80 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="font-bold text-sm text-[#001F58]">Nueva Marca</h3>
            <form onSubmit={handleAddBrand} className="flex gap-2">
              <input
                type="text"
                name="name"
                placeholder="Ej: Cirrus, Embraer"
                required
                className="flex-1 px-3 py-2 text-xs border rounded-xl bg-white"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-[#001F58] text-white text-xs font-bold rounded-xl hover:bg-blue-950 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Crear
              </button>
            </form>
          </div>

          {/* Agregar modelo a marca */}
          <div className="p-5 bg-white/80 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="font-bold text-sm text-[#001F58]">Nuevo Modelo</h3>
            <form onSubmit={handleAddModel} className="space-y-2">
              <select
                value={selectedBrandId}
                onChange={(e) => {
                  setSelectedBrandId(e.target.value);
                  setSelectedModelId("");
                }}
                className="w-full px-3 py-2 text-xs border rounded-xl bg-white"
              >
                <option value="">-- Seleccionar Marca --</option>
                {aircraftBrands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="name"
                  placeholder="Ej: SR22, Skylane 182"
                  required
                  disabled={!selectedBrandId}
                  className="flex-1 px-3 py-2 text-xs border rounded-xl bg-white disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading || !selectedBrandId}
                  className="px-4 py-2 bg-[#001F58] text-white text-xs font-bold rounded-xl hover:bg-blue-950 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" /> Crear
                </button>
              </div>
            </form>
          </div>

          {/* Agregar submodelo/variante */}
          <div className="p-5 bg-white/80 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="font-bold text-sm text-[#001F58]">Nueva Variante / Submodelo</h3>
            <form onSubmit={handleAddSubModel} className="space-y-2">
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                disabled={!selectedBrandId}
                className="w-full px-3 py-2 text-xs border rounded-xl bg-white disabled:opacity-50"
              >
                <option value="">-- Seleccionar Modelo --</option>
                {selectedBrand?.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="name"
                  placeholder="Ej: GTS, G6, Turbo"
                  required
                  disabled={!selectedModelId}
                  className="flex-1 px-3 py-2 text-xs border rounded-xl bg-white disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading || !selectedModelId}
                  className="px-4 py-2 bg-[#001F58] text-white text-xs font-bold rounded-xl hover:bg-blue-950 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" /> Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECCIÓN REPUESTOS */}
      {activeTab === "spareparts" && (
        <div className="p-5 bg-white/80 rounded-2xl border border-slate-200 space-y-3 max-w-lg">
          <h3 className="font-bold text-sm text-[#001F58]">Nueva Categoría / Subcategoría de Repuestos</h3>
          <form onSubmit={handleAddSpareCategory} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Categoría Padre (Opcional)
              </label>
              <select name="parentId" className="w-full px-3 py-2 text-xs border rounded-xl bg-white">
                <option value="">Es Categoría Principal</option>
                {sparePartCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Nombre de la Categoría
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="name"
                  placeholder="Ej: Aviónica, Motores, Hélices"
                  required
                  className="flex-1 px-3 py-2 text-xs border rounded-xl bg-white"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#001F58] text-white text-xs font-bold rounded-xl hover:bg-blue-950 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Crear
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}