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
  createFilterGroupAction,
  deleteFilterGroupAction,
  createFilterAction,
  deleteFilterAction,
} from "@/app/actions/admin-taxonomy-actions";
import { Plus, Plane, Wrench, CheckCircle2, ExternalLink, Pencil, Trash2, X, Check } from "lucide-react";
import { FilterType } from "@prisma/client";

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

interface SpareCategoryFlat {
  id: string;
  name: string;
  icon: string | null;
  parentId: string | null;
}

interface SpareCategoryTree extends SpareCategoryFlat {
  children: SpareCategoryTree[];
}

interface FilterOptionRow {
  id: string;
  label: string;
  value: string;
}

interface FilterRow {
  id: string;
  name: string;
  slug: string;
  type: FilterType;
  options: FilterOptionRow[];
  children?: FilterRow[];
}

interface FilterGroupRow {
  id: string;
  name: string;
  slug: string;
  categories: { id: string }[];
  filters: FilterRow[];
}

interface Props {
  aircraftCategories: { id: string; name: string }[];
  aircraftBrands: Brand[];
  sparePartCategories: SpareCategoryTree[];       // árbol, para mostrar
  sparePartCategoriesFlat: SpareCategoryFlat[];   // plano, para el selector de padre
  filterGroups: FilterGroupRow[];
}

export function TaxonomyManager({ aircraftCategories, aircraftBrands, sparePartCategories, sparePartCategoriesFlat, filterGroups }: Props) {
  const [activeTab, setActiveTab] = useState<"aircrafts" | "spareparts">("aircrafts");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedSpareParentId, setSelectedSpareParentId] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");

  // Estado para el formulario de crear GRUPO
  const [newGroupCategoryIds, setNewGroupCategoryIds] = useState<string[]>([]);

  // Estado para el formulario de crear FILTRO
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [newFilterType, setNewFilterType] = useState<FilterRow["type"]>("TEXT");
  const [newFilterOptions, setNewFilterOptions] = useState<string[]>([""]);

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

  function flattenWithDepth(
    categories: SpareCategoryFlat[],
    parentId: string | null = null,
    depth = 0
  ): { id: string; label: string }[] {
    return categories
      .filter((c) => c.parentId === parentId)
      .flatMap((c) => [
        { id: c.id, label: `${"— ".repeat(depth)}${c.name}` },
        ...flattenWithDepth(categories, c.id, depth + 1),
      ]);
  }

  const parentCategoryOptions = flattenWithDepth(sparePartCategoriesFlat);

  function CategoryTreeItem({
    node,
    depth = 0,
    editingId,
    editName,
    editIcon,
    setEditName,
    setEditIcon,
    startEditing,
    cancelEditing,
    handleUpdate,
    handleDelete,
  }: {
    node: SpareCategoryTree;
    depth?: number;
    editingId: string | null;
    editName: string;
    editIcon: string;
    setEditName: (v: string) => void;
    setEditIcon: (v: string) => void;
    startEditing: (id: string, name: string, icon?: string) => void;
    cancelEditing: () => void;
    handleUpdate: (id: string) => void;
    handleDelete: (id: string) => void;
  }) {
    return (
      <div className="flex flex-col gap-1" style={{ paddingLeft: depth > 0 ? 12 : 0 }}>
        <div className={`flex items-center justify-between p-2 rounded-xl text-xs ${depth === 0 ? "bg-slate-100 font-bold" : "bg-slate-50"}`}>
          {editingId === node.id ? (
            <div className="flex items-center gap-2 w-full">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 px-2 py-1 text-xs border rounded-lg bg-white"
              />
              {depth === 0 && (
                <input
                  type="text"
                  value={editIcon}
                  onChange={(e) => setEditIcon(e.target.value)}
                  placeholder="Icono"
                  className="w-24 px-2 py-1 text-xs border rounded-lg bg-white"
                />
              )}
              <button onClick={() => handleUpdate(node.id)} className="text-green-600">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={cancelEditing} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className={depth === 0 ? "text-[#001F58]" : "text-slate-600"}>{node.name}</span>
                {node.icon && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-md font-mono">
                    {node.icon}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => startEditing(node.id, node.name, node.icon || "")} className="text-slate-400 hover:text-blue-600">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(node.id)} className="text-slate-400 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>

        {node.children.length > 0 && (
          <div className="pl-3 border-l-2 border-slate-200 flex flex-col gap-1">
            {node.children.map((child) => (
              <CategoryTreeItem
                key={child.id}
                node={child}
                depth={depth + 1}
                editingId={editingId}
                editName={editName}
                editIcon={editIcon}
                setEditName={setEditName}
                setEditIcon={setEditIcon}
                startEditing={startEditing}
                cancelEditing={cancelEditing}
                handleUpdate={handleUpdate}
                handleDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const selectedBrand = aircraftBrands.find((b) => b.id === selectedBrandId);
  const selectedModel = selectedBrand?.models.find((m) => m.id === selectedModelId);

  // GRUPOS
  const handleAddFilterGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = new FormData(form).get("name") as string;
    if (newGroupCategoryIds.length === 0) return alert("Seleccioná al menos una categoría");

    setLoading(true);
    try {
      await createFilterGroupAction(name, newGroupCategoryIds);
      form.reset();
      setNewGroupCategoryIds([]);
      showFeedback("Grupo creado");
    } catch {
      alert("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFilterGroup = async (id: string) => {
    if (!confirm("¿Eliminar este grupo y todos sus filtros?")) return;
    try {
      await deleteFilterGroupAction(id);
      if (selectedGroupId === id) setSelectedGroupId("");
      showFeedback("Grupo eliminado");
    } catch {
      alert("Error al eliminar");
    }
  };

  // FILTROS
  const handleAddFilter = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedGroupId) return alert("Seleccioná un grupo");
    const form = e.currentTarget;
    const name = new FormData(form).get("name") as string;

    setLoading(true);
    try {
      await createFilterAction(
        selectedGroupId,
        name,
        newFilterType,
        newFilterOptions,
        newFilterParentId || undefined,
        newFilterTriggerValue || undefined
      );
      form.reset();
      setNewFilterType("TEXT");
      setNewFilterOptions([""]);
      setNewFilterParentId("");
      setNewFilterTriggerValue("");
      showFeedback("Filtro creado");
    } catch {
      alert("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFilter = async (id: string) => {
    if (!confirm("¿Eliminar este filtro?")) return;
    try {
      await deleteFilterAction(id);
      showFeedback("Filtro eliminado");
    } catch {
      alert("Error al eliminar");
    }
  };

  const toggleGroupCategory = (id: string) => {
    setNewGroupCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const updateFilterOption = (index: number, value: string) => {
    setNewFilterOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };

  const addFilterOption = () => setNewFilterOptions((prev) => [...prev, ""]);
  const removeFilterOption = (index: number) =>
    setNewFilterOptions((prev) => prev.filter((_, i) => i !== index));

  const selectedGroup = filterGroups.find((g) => g.id === selectedGroupId);

  const [newFilterParentId, setNewFilterParentId] = useState("");
  const [newFilterTriggerValue, setNewFilterTriggerValue] = useState("");

  // El filtro padre elegido, para saber qué opciones mostrar en el selector de "activador"
  const parentFilterCandidate = selectedGroup?.filters.find((f) => f.id === newFilterParentId);

  // Lista plana de todas las categorías de repuestos (padres + hijas), para el multi-select de grupos
  const allSpareCategoriesFlat = flattenWithDepth(sparePartCategoriesFlat).map((cat) => ({
    id: cat.id,
    name: cat.label, // ya viene con la indentación tipo "— — Cilindros"
  }));

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
                  {parentCategoryOptions.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
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
                <CategoryTreeItem
                  key={parent.id}
                  node={parent}
                  editingId={editingId}
                  editName={editName}
                  editIcon={editIcon}
                  setEditName={setEditName}
                  setEditIcon={setEditIcon}
                  startEditing={startEditing}
                  cancelEditing={cancelEditing}
                  handleUpdate={handleUpdateSpareCategory}
                  handleDelete={handleDeleteSpareCategory}
                />
              ))}
            </div>
          </div>

          {/* GRUPOS DE FILTROS */}
          <div className="p-5 bg-white/80 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-[#001F58]">Grupos de Filtros</h3>

            <form onSubmit={handleAddFilterGroup} className="space-y-3">
              <input
                type="text"
                name="name"
                placeholder="Ej: General, Especificaciones"
                required
                className="w-full px-3 py-2 text-xs border rounded-xl bg-white"
              />

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Categorías donde aplica
                </label>
                <div className="max-h-32 overflow-y-auto border rounded-xl p-2 space-y-1">
                  {allSpareCategoriesFlat.map((cat) => (
                    <label key={cat.id} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newGroupCategoryIds.includes(cat.id)}
                        onChange={() => toggleGroupCategory(cat.id)}
                        className="rounded"
                      />
                      {cat.name}
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-[#001F58] text-white text-xs font-bold rounded-xl hover:bg-blue-950 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Crear Grupo
              </button>
            </form>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {filterGroups.map((group) => (
                <div key={group.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl text-xs">
                  <div>
                    <span className="font-medium text-slate-700">{group.name}</span>
                    <span className="ml-2 text-[10px] text-slate-400">
                      ({group.categories.length} categoría{group.categories.length !== 1 ? "s" : ""}, {group.filters.length} filtro{group.filters.length !== 1 ? "s" : ""})
                    </span>
                  </div>
                  <button onClick={() => handleDeleteFilterGroup(group.id)} className="text-slate-400 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* FILTROS */}
          <div className="p-5 bg-white/80 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-[#001F58]">Filtros</h3>

            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-3 py-2 text-xs border rounded-xl bg-white font-medium"
            >
              <option value="">-- Seleccionar Grupo --</option>
              {filterGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            <form onSubmit={handleAddFilter} className="space-y-3">
              <input
                type="text"
                name="name"
                placeholder="Ej: Voltaje, Diámetro (mm)"
                required
                disabled={!selectedGroupId}
                className="w-full px-3 py-2 text-xs border rounded-xl bg-white disabled:opacity-50"
              />

              <select
                value={newFilterType}
                onChange={(e) => setNewFilterType(e.target.value as FilterRow["type"])}
                disabled={!selectedGroupId}
                className="w-full px-3 py-2 text-xs border rounded-xl bg-white disabled:opacity-50"
              >
                <option value="TEXT">Texto</option>
                <option value="RANGE">Numérico (rango)</option>
                <option value="BOOLEAN">Sí / No</option>
                <option value="SELECT">Opción única</option>
                <option value="MULTI_SELECT">Opción múltiple</option>
              </select>

              {(newFilterType === "SELECT" || newFilterType === "MULTI_SELECT") && (
                <div className="space-y-1.5 pl-3 border-l">
                  {newFilterOptions.map((option, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={option}
                        onChange={(e) => updateFilterOption(i, e.target.value)}
                        placeholder={`Opción ${i + 1}`}
                        className="flex-1 px-2 py-1.5 text-xs border rounded-lg bg-white"
                      />
                      <button type="button" onClick={() => removeFilterOption(i)} className="text-slate-400 hover:text-red-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addFilterOption}
                    className="flex items-center gap-1 text-[11px] text-blue-600"
                  >
                    <Plus className="w-3 h-3" /> Agregar opción
                  </button>
                </div>
              )}

              {/* Solo tiene sentido si ya hay filtros de tipo SELECT/MULTI_SELECT en el grupo, para elegir cuál "activa" a este */}
              {selectedGroup && selectedGroup.filters.filter((f) => f.type === "SELECT" || f.type === "MULTI_SELECT" || f.type === "BOOLEAN").length > 0 && (
                <div className="space-y-2 pt-1 border-t">
                  <label className="block text-[11px] font-semibold text-slate-500">
                    ¿Es un sub-filtro? (Opcional)
                  </label>
                  <select
                    value={newFilterParentId}
                    onChange={(e) => {
                      setNewFilterParentId(e.target.value);
                      setNewFilterTriggerValue("");
                    }}
                    className="w-full px-3 py-2 text-xs border rounded-xl bg-white"
                  >
                    <option value="">No, es un filtro independiente</option>
                    {selectedGroup.filters
                      .filter((f) => f.type === "SELECT" || f.type === "MULTI_SELECT" || f.type === "BOOLEAN")
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          Depende de: {f.name}
                        </option>
                      ))}
                  </select>

                  {newFilterParentId && parentFilterCandidate && (
                    <>
                      {parentFilterCandidate.type === "BOOLEAN" ? (
                        // Para un padre booleano, no hay opciones — el activador es simplemente Sí o No
                        <select
                          value={newFilterTriggerValue}
                          onChange={(e) => setNewFilterTriggerValue(e.target.value)}
                          required
                          className="w-full px-3 py-2 text-xs border rounded-xl bg-white"
                        >
                          <option value="">-- ¿Con qué valor se muestra? --</option>
                          <option value="true">Sí (activado)</option>
                          <option value="false">No (desactivado)</option>
                        </select>
                      ) : (
                        // Para SELECT/MULTI_SELECT, seguimos usando las opciones reales
                        <select
                          value={newFilterTriggerValue}
                          onChange={(e) => setNewFilterTriggerValue(e.target.value)}
                          required
                          className="w-full px-3 py-2 text-xs border rounded-xl bg-white"
                        >
                          <option value="">-- ¿Con qué opción se muestra? --</option>
                          {parentFilterCandidate.options.map((opt) => (
                            <option key={opt.id} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !selectedGroupId}
                className="w-full py-2 bg-[#001F58] text-white text-xs font-bold rounded-xl hover:bg-blue-950 transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" /> Crear Filtro
              </button>
            </form>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {selectedGroup?.filters.map((filter) => (
                <div key={filter.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl text-xs">
                  <div>
                    <span className="font-medium text-slate-700">{filter.name}</span>
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-md">
                      {filter.type}
                    </span>
                    {filter.options.length > 0 && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {filter.options.map((o) => o.label).join(", ")}
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleDeleteFilter(filter.id)} className="text-slate-400 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>




        </div>
      )}
    </div>
  );
}