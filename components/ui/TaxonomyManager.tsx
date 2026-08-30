"use client";

import { useState } from "react";
import {
  createAircraftCategoryAction,
  updateAircraftCategoryAction,
  deleteAircraftCategoryAction,
  createAircraftBrandAction,
  updateAircraftBrandAction,
  deleteAircraftBrandAction,
  createAircraftModelAction,
  updateAircraftModelAction,
  deleteAircraftModelAction,
  createAircraftSubModelAction,
  updateAircraftSubModelAction,
  deleteAircraftSubModelAction,
  createSparePartCategoryAction,
  updateSparePartCategoryAction,
  deleteSparePartCategoryAction,
} from "@/app/actions/admin-taxonomy-actions";
import { Plus, Plane, Wrench, CheckCircle2, ExternalLink, Pencil, Trash2, X, Check } from "lucide-react";

interface SubModel {
  id: string;
  name: string;
}

interface Model {
  id: string;
  name: string;
  subModels: SubModel[];
}

interface Brand {
  id: string;
  name: string;
  models: Model[];
}

interface SpareCategory {
  id: string;
  name: string;
  icon?: string | null;
  children: { id: string; name: string }[];
}

interface Props {
  aircraftCategories: { id: string; name: string }[];
  aircraftBrands: Brand[];
  sparePartCategories: SpareCategory[];
}

export function TaxonomyManager({ aircraftCategories, aircraftBrands, sparePartCategories }: Props) {
  const [activeTab, setActiveTab] = useState<"aircrafts" | "spareparts">("aircrafts");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedSpareParentId, setSelectedSpareParentId] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");

  const showFeedback = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const startEditing = (id: string, name: string, icon: string = "") => {
    setEditingId(id);
    setEditName(name);
    setEditIcon(icon);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
    setEditIcon("");
  };

  // AERONAVES - CATEGORÍAS
  const handleAddAircraftCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const name = new FormData(form).get("name") as string;
    try {
      await createAircraftCategoryAction(name);
      form.reset();
      showFeedback("Categoría creada");
    } catch {
      alert("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAircraftCategory = async (id: string) => {
    try {
      await updateAircraftCategoryAction(id, editName);
      cancelEditing();
      showFeedback("Categoría actualizada");
    } catch {
      alert("Error al actualizar");
    }
  };

  const handleDeleteAircraftCategory = async (id: string) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    try {
      await deleteAircraftCategoryAction(id);
      showFeedback("Categoría eliminada");
    } catch {
      alert("Error al eliminar");
    }
  };

  // MARCAS
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

  const handleUpdateBrand = async (id: string) => {
    try {
      await updateAircraftBrandAction(id, editName);
      cancelEditing();
      showFeedback("Marca actualizada");
    } catch {
      alert("Error al actualizar");
    }
  };

  const handleDeleteBrand = async (id: string) => {
    if (!confirm("¿Eliminar esta marca?")) return;
    try {
      await deleteAircraftBrandAction(id);
      if (selectedBrandId === id) setSelectedBrandId("");
      showFeedback("Marca eliminada");
    } catch {
      alert("Error al eliminar");
    }
  };

  // MODELOS
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

  const handleUpdateModel = async (id: string) => {
    try {
      await updateAircraftModelAction(id, editName);
      cancelEditing();
      showFeedback("Modelo actualizado");
    } catch {
      alert("Error al actualizar");
    }
  };

  const handleDeleteModel = async (id: string) => {
    if (!confirm("¿Eliminar este modelo?")) return;
    try {
      await deleteAircraftModelAction(id);
      if (selectedModelId === id) setSelectedModelId("");
      showFeedback("Modelo eliminado");
    } catch {
      alert("Error al eliminar");
    }
  };

  // SUBMODELOS / VARIANTES
  const handleAddSubModel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedModelId) return alert("Selecciona un modelo");
    setLoading(true);
    const form = e.currentTarget;
    const name = new FormData(form).get("name") as string;
    try {
      await createAircraftSubModelAction(selectedModelId, name);
      form.reset();
      showFeedback("Submodelo agregado");
    } catch {
      alert("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubModel = async (id: string) => {
    try {
      await updateAircraftSubModelAction(id, editName);
      cancelEditing();
      showFeedback("Submodelo actualizado");
    } catch {
      alert("Error al actualizar");
    }
  };

  const handleDeleteSubModel = async (id: string) => {
    if (!confirm("¿Eliminar este submodelo?")) return;
    try {
      await deleteAircraftSubModelAction(id);
      showFeedback("Submodelo eliminado");
    } catch {
      alert("Error al eliminar");
    }
  };

  // REPUESTOS
  const handleAddSpareCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get("name") as string;
    const parentId = formData.get("parentId") as string;
    const icon = formData.get("icon") as string;

    try {
      await createSparePartCategoryAction(name, parentId, icon);
      form.reset();
      setSelectedSpareParentId("");
      showFeedback("Categoría agregada");
    } catch {
      alert("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSpareCategory = async (id: string) => {
    try {
      await updateSparePartCategoryAction(id, editName, editIcon);
      cancelEditing();
      showFeedback("Categoría actualizada");
    } catch {
      alert("Error al actualizar");
    }
  };

  const handleDeleteSpareCategory = async (id: string) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    try {
      await deleteSparePartCategoryAction(id);
      showFeedback("Categoría eliminada");
    } catch {
      alert("Error al eliminar");
    }
  };

  const selectedBrand = aircraftBrands.find((b) => b.id === selectedBrandId);
  const selectedModel = selectedBrand?.models.find((m) => m.id === selectedModelId);

  return (
    <div className="space-y-6 max-w-5xl">
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

      {/* AERONAVES */}
      {activeTab === "aircrafts" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CATEGORÍAS */}
          <div className="p-5 bg-white/80 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-[#001F58]">Categorías de Aeronave</h3>
            <form onSubmit={handleAddAircraftCategory} className="flex gap-2">
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

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {aircraftCategories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl text-xs">
                  {editingId === cat.id ? (
                    <div className="flex items-center gap-2 w-full">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2 py-1 text-xs border rounded-lg bg-white"
                      />
                      <button onClick={() => handleUpdateAircraftCategory(cat.id)} className="text-green-600">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={cancelEditing} className="text-slate-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium text-slate-700">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => startEditing(cat.id, cat.name)} className="text-slate-400 hover:text-blue-600">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteAircraftCategory(cat.id)} className="text-slate-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* MARCAS */}
          <div className="p-5 bg-white/80 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-[#001F58]">Marcas de Aeronave</h3>
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

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {aircraftBrands.map((brand) => (
                <div key={brand.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl text-xs">
                  {editingId === brand.id ? (
                    <div className="flex items-center gap-2 w-full">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2 py-1 text-xs border rounded-lg bg-white"
                      />
                      <button onClick={() => handleUpdateBrand(brand.id)} className="text-green-600">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={cancelEditing} className="text-slate-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium text-slate-700">{brand.name}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => startEditing(brand.id, brand.name)} className="text-slate-400 hover:text-blue-600">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteBrand(brand.id)} className="text-slate-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* MODELOS */}
          <div className="p-5 bg-white/80 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-[#001F58]">Modelos</h3>
            <select
              value={selectedBrandId}
              onChange={(e) => {
                setSelectedBrandId(e.target.value);
                setSelectedModelId("");
              }}
              className="w-full px-3 py-2 text-xs border rounded-xl bg-white font-medium"
            >
              <option value="">-- Seleccionar Marca --</option>
              {aircraftBrands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <form onSubmit={handleAddModel} className="flex gap-2">
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
            </form>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {selectedBrand?.models.map((model) => (
                <div key={model.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl text-xs">
                  {editingId === model.id ? (
                    <div className="flex items-center gap-2 w-full">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2 py-1 text-xs border rounded-lg bg-white"
                      />
                      <button onClick={() => handleUpdateModel(model.id)} className="text-green-600">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={cancelEditing} className="text-slate-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium text-slate-700">{model.name}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => startEditing(model.id, model.name)} className="text-slate-400 hover:text-blue-600">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteModel(model.id)} className="text-slate-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SUBMODELOS */}
          <div className="p-5 bg-white/80 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-[#001F58]">Variantes / Submodelos</h3>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              disabled={!selectedBrandId}
              className="w-full px-3 py-2 text-xs border rounded-xl bg-white disabled:opacity-50 font-medium"
            >
              <option value="">-- Seleccionar Modelo --</option>
              {selectedBrand?.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <form onSubmit={handleAddSubModel} className="flex gap-2">
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
            </form>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {selectedModel?.subModels.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl text-xs">
                  {editingId === sub.id ? (
                    <div className="flex items-center gap-2 w-full">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2 py-1 text-xs border rounded-lg bg-white"
                      />
                      <button onClick={() => handleUpdateSubModel(sub.id)} className="text-green-600">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={cancelEditing} className="text-slate-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium text-slate-700">{sub.name}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => startEditing(sub.id, sub.name)} className="text-slate-400 hover:text-blue-600">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteSubModel(sub.id)} className="text-slate-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* REPUESTOS */}
      {activeTab === "spareparts" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 bg-white/80 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-[#001F58]">Nueva Categoría / Subcategoría</h3>
            <form onSubmit={handleAddSpareCategory} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Categoría Padre (Opcional)
                </label>
                <select
                  name="parentId"
                  value={selectedSpareParentId}
                  onChange={(e) => setSelectedSpareParentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-xl bg-white font-medium"
                >
                  <option value="">Es Categoría Principal (Sin Padre)</option>
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
                <input
                  type="text"
                  name="name"
                  placeholder="Ej: Aviónica, Motores, Hélices"
                  required
                  className="w-full px-3 py-2 text-xs border rounded-xl bg-white"
                />
              </div>

              {!selectedSpareParentId && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-slate-500">
                      Icono (React Icons)
                    </label>
                    <a
                      href="https://react-icons.github.io/react-icons/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                    >
                      Buscar icono <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="text"
                    name="icon"
                    placeholder="Ej: PiEngine, TiLightBulb, BsNut"
                    className="w-full px-3 py-2 text-xs border rounded-xl bg-white"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-[#001F58] text-white text-xs font-bold rounded-xl hover:bg-blue-950 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Crear Categoría
              </button>
            </form>
          </div>

          <div className="p-5 bg-white/80 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-[#001F58]">Categorías Existentes</h3>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {sparePartCategories.map((parent) => (
                <div key={parent.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    {editingId === parent.id ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs border rounded-lg bg-white"
                        />
                        <input
                          type="text"
                          value={editIcon}
                          onChange={(e) => setEditIcon(e.target.value)}
                          placeholder="Icono"
                          className="w-24 px-2 py-1 text-xs border rounded-lg bg-white"
                        />
                        <button onClick={() => handleUpdateSpareCategory(parent.id)} className="text-green-600">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={cancelEditing} className="text-slate-400">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#001F58]">{parent.name}</span>
                          {parent.icon && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-md font-mono">
                              {parent.icon}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEditing(parent.id, parent.name, parent.icon || "")} className="text-slate-400 hover:text-blue-600">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteSpareCategory(parent.id)} className="text-slate-400 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {parent.children.length > 0 && (
                    <div className="pl-3 border-l-2 border-slate-200 space-y-1 mt-1">
                      {parent.children.map((child) => (
                        <div key={child.id} className="flex items-center justify-between py-1 text-xs">
                          {editingId === child.id ? (
                            <div className="flex items-center gap-2 w-full">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="flex-1 px-2 py-1 text-xs border rounded-lg bg-white"
                              />
                              <button onClick={() => handleUpdateSpareCategory(child.id)} className="text-green-600">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={cancelEditing} className="text-slate-400">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="text-slate-600">{child.name}</span>
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => startEditing(child.id, child.name)} className="text-slate-400 hover:text-blue-600">
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button onClick={() => handleDeleteSpareCategory(child.id)} className="text-slate-400 hover:text-red-600">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}