"use client";

import { useState, useEffect, useMemo } from "react";
import { createListing, sendManagedListingEmail } from "@/app/publish/actions";
import Image from "next/image";
import Link from "next/link";
import { 
    Plane, 
    Wrench, 
    Plus, 
    Trash2, 
    CheckCircle2, 
    Gauge, 
    FileText,
    ArrowRight,
    HelpCircle,
    Send,
    CreditCard
} from "lucide-react";

export interface CategoryOption { 
    id: string; 
    name: string;
    children?: CategoryOption[];
}

export interface BrandOption { 
    id: string; 
    name: string; 
    models: { id: string; name: string }[];
}

interface PublishFormProps {
    userId: string | null;
    categoriesData?: CategoryOption[];
    brandsData?: BrandOption[];
    spareCategoriesData?: CategoryOption[];
}

interface EngineInput {
    brand: string;
    model: string;
    engineHours: string;
    TBO: string;
}

interface PropellerInput {
    model: string;
    propellerHours: string;
}

export default function PublishForm({
    userId,
    categoriesData = [],
    brandsData = [],
    spareCategoriesData = []
}: PublishFormProps) {
    console.log("Props recibidas en cliente:", { brandsData, categoriesData, spareCategoriesData });
    const [activeTab, setActiveTab] = useState<"aircraft" | "parts">("aircraft");    

    // Estados para selects dinámicos de aviones
    const [selectedBrandModels, setSelectedBrandModels] = useState<{ id: string; name: string }[]>([]);

    // Estado para selector en cascada de repuestos
    const [selectedParentCategoryId, setSelectedParentCategoryId] = useState<string>("");

    // Subcategorías disponibles según el padre elegido para repuestos
    const subCategories = useMemo(() => {
      const parent = spareCategoriesData.find((cat) => cat.id === selectedParentCategoryId);
      return parent?.children || [];
    }, [selectedParentCategoryId, spareCategoriesData]);

    // Formulario de asistencia lateral (por suerte se arregló así y no con cambio de schema)
    const [managedListingForm, setManagedListingForm] = useState({
        name: "",
        whatsapp: "",
        itemType: "Aeronave",
        description: "",
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Formulario de aviones
    const [aircraftForm, setAircraftForm] = useState({
        title: "",
        brandId: "",
        customBrand: "",
        modelId: "",
        customModel: "",
        year: new Date().getFullYear(),
        totalTimeHours: "",
        categoryId: "",
        engineType: "PISTON",
        condition: "USADO",
        price: "",
        priceOnRequest: false,
        city: "",
        province: "",
        description: "",
        fuselageDescription: "",
        fuselageModifications: "",
        avionics: "",
        extraEquipment: "",
    });

    const [engines, setEngines] = useState<EngineInput[]>([]);
    const [propellers, setPropellers] = useState<PropellerInput[]>([]);

    // Formulario de repuestos
    const [partsForm, setPartsForm] = useState({
        title: "",
        brand: "",
        partNumber: "",
        categoryId: "",
        condition: "NUEVO",
        price: "",
        priceOnRequest: false,
        stock: "1",
        city: "",
        province: "",
        description: "",
    });

    // Imágenes del producto
    const [images, setImages] = useState<{ file: File; preview: string }[]>([]);

    // Cargar marcas/categorías por defecto en aeronaves si están disponibles
    useEffect(() => {
      if (brandsData && brandsData.length > 0 && !aircraftForm.brandId) {
        const firstBrand = brandsData[0];
        setAircraftForm((prev) => ({
          ...prev,
          brandId: firstBrand.id,
        }));
        setSelectedBrandModels(firstBrand.models || []);
      }
    }, [brandsData]);

    useEffect(() => {
      if (categoriesData && categoriesData.length > 0 && !aircraftForm.categoryId) {
        setAircraftForm((prev) => ({
          ...prev,
          categoryId: categoriesData[0].id,
        }));
      }
    }, [categoriesData]);

    const handleBrandChange = (brandId: string) => {
        const foundBrand = brandsData.find((b) => b.id === brandId);
        setAircraftForm((prev) => ({
            ...prev,
            brandId,
            modelId: "",
        }));
        setSelectedBrandModels(foundBrand?.models || []);
    };

    const addEngine = () => setEngines([...engines, { brand: "", model: "", engineHours: "", TBO: "" }]);
    const removeEngine = (index: number) => setEngines(engines.filter((_, i) => i !== index));
    const updateEngine = (index: number, field: keyof EngineInput, value: string) => {
        const updated = [...engines];
        updated[index][field] = value;
        setEngines(updated);
    };

    const addPropeller = () => setPropellers([...propellers, { model: "", propellerHours: "" }]);
    const removePropeller = (index: number) => setPropellers(propellers.filter((_, i) => i !== index));
    const updatePropeller = (index: number, field: keyof PropellerInput, value: string) => {
        const updated = [...propellers];
        updated[index][field] = value;
        setPropellers(updated);
    };

    // Manejador para agregar imágenes (máximo 10)
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      const filesArray = Array.from(e.target.files);
      
      if (images.length + filesArray.length > 10) {
        alert("Solo puedes subir un máximo de 10 imágenes por publicación.");
        return;
      }

      const newImages = filesArray.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));

      setImages((prev) => [...prev, ...newImages]);
    };

    // Eliminar una imagen de la lista
    const removeImage = (index: number) => {
      setImages((prev) => {
        const updated = [...prev];
        URL.revokeObjectURL(updated[index].preview);
        updated.splice(index, 1);
        return updated;
      });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (images.length === 0) {
        alert("Por favor, agregá al menos una imagen de tu producto.");
        return;
      }

      setIsSubmitting(true);

      try {
        const data = new FormData();
        data.append("listingType", activeTab);

        images.forEach((img) => {
          data.append("files", img.file);
        });

        if (activeTab === "aircraft") {
          data.append("title", aircraftForm.title);
          data.append("categoryId", aircraftForm.categoryId);
          data.append("brandId", aircraftForm.brandId);
          data.append("customBrand", aircraftForm.customBrand);
          data.append("modelId", aircraftForm.modelId);
          data.append("customModel", aircraftForm.customModel);
          data.append("year", aircraftForm.year.toString());
          data.append("totalTimeHours", aircraftForm.totalTimeHours);
          data.append("price", aircraftForm.price);
          data.append("priceOnRequest", aircraftForm.priceOnRequest.toString());
          data.append("city", aircraftForm.city);
          data.append("province", aircraftForm.province);
          data.append("description", aircraftForm.description);
          data.append("fuselageDescription", aircraftForm.fuselageDescription);
          data.append("fuselageModifications", aircraftForm.fuselageModifications);
          data.append("avionics", aircraftForm.avionics);
          data.append("extraEquipment", aircraftForm.extraEquipment);
          data.append("engines", JSON.stringify(engines));
          data.append("propellers", JSON.stringify(propellers));
        } else {
          data.append("title", partsForm.title);
          data.append("categoryId", partsForm.categoryId);
          data.append("condition", partsForm.condition);
          data.append("brand", partsForm.brand);
          data.append("partNumber", partsForm.partNumber);
          data.append("price", partsForm.price);
          data.append("priceOnRequest", partsForm.priceOnRequest.toString());
          data.append("stock", partsForm.stock);
          data.append("city", partsForm.city);
          data.append("province", partsForm.province);
          data.append("description", partsForm.description);
        }

        await createListing(data);
      } catch (error) {
        console.error("Error al publicar:", error);
        alert("Ocurrió un error al guardar la publicación. Verificá los datos e intentá de nuevo.");
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleManagedSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsSubmitting(true);

      const res = await sendManagedListingEmail(managedListingForm);

      if (res.success) {
        alert("¡Solicitud enviada con éxito! Te contactaremos a la brevedad.");
        setManagedListingForm({ name: "", whatsapp: "", itemType: "Aeronave", description: "" });
      } else {
        alert("Error al enviar el mensaje: " + res.error);
      }

      setIsSubmitting(false);
    };

    // Verificación de autenticación
    if (userId === null) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-4">
          <h2 className="text-2xl font-bold text-[#001F58]">Debes iniciar sesión</h2>
          <p className="text-sm text-[#001F58]/70">Para publicar una aeronave o repuesto necesitas una cuenta activa.</p>
          <Link href="/login" className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors">
            Iniciar Sesión
          </Link>
        </div>
      );
    }

    return (
    <main className="relative isolate overflow-hidden min-h-screen -mb-16">
        <Image
            src="/bkg-forms.png"
            alt="Fondo Formularios"
            fill
            priority
            className="-z-20 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-background/85" />

        <div className="container mx-auto px-4 pt-16 pb-36 max-w-7xl">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#001F58]/10 border border-[#001F58]/20 text-[#001F58] text-xs font-semibold uppercase tracking-wider mb-4">
                <CheckCircle2 className="w-4 h-4 text-red-600" />
                <span>Publicación Oficial</span>
              </div>
              <h1 className="font-heading text-3xl sm:text-5xl font-semibold text-[#001F58] mb-4">
                PUBLICAR PRODUCTO
              </h1>
              <p className="text-sm sm:text-base text-[#001F58]/80 leading-relaxed">
                Completá las especificaciones técnicas de tu publicación. Los campos marcados con (*) son obligatorios.
              </p>
            </div>

            <div className="flex justify-center mb-10">
              <div className="bg-white/80 p-1.5 rounded-2xl border border-[#001F58]/20 flex gap-2 shadow-sm backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setActiveTab("aircraft")}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    activeTab === "aircraft"
                      ? "bg-[#001F58] text-white shadow-md"
                      : "text-[#001F58]/70 hover:text-[#001F58] hover:bg-[#001F58]/5"
                  }`}
                >
                  <Plane className="w-4 h-4" />
                  <span>Publicar Aeronave</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("parts")}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    activeTab === "parts"
                      ? "bg-[#001F58] text-white shadow-md"
                      : "text-[#001F58]/70 hover:text-[#001F58] hover:bg-[#001F58]/5"
                  }`}
                >
                  <Wrench className="w-4 h-4" />
                  <span>Publicar Repuesto</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Formulario Principal */}
                <div className="lg:col-span-2">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {activeTab === "aircraft" ? (
                      <div className="bg-white/90 border border-[#001F58]/20 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl text-[#001F58]">
                        <div className="mb-8">
                          <h3 className="font-heading text-xl font-semibold border-b border-[#001F58]/15 pb-3 mb-5 flex items-center gap-2">
                            <Plane className="w-5 h-5 text-red-600" />
                            Información Principal
                          </h3>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                                Título de la Publicación *
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="Ej: Cessna 172 Skyhawk en excelente estado"
                                value={aircraftForm.title}
                                onChange={(e) => setAircraftForm({ ...aircraftForm, title: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                                Marca *
                              </label>
                              <select
                                value={aircraftForm.brandId}
                                onChange={(e) => handleBrandChange(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                              >
                                <option value="">Seleccionar Marca</option>
                                {brandsData.map((brand) => (
                                  <option key={brand.id} value={brand.id}>
                                    {brand.name}
                                  </option>
                                ))}
                                <option value="CUSTOM">Otra Marca...</option>
                              </select>
                            </div>

                            {aircraftForm.brandId === "CUSTOM" && (
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                                  Marca Personalizada *
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Escriba la marca"
                                  value={aircraftForm.customBrand}
                                  onChange={(e) => setAircraftForm({ ...aircraftForm, customBrand: e.target.value })}
                                  className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                                />
                              </div>
                            )}

                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                                Modelo *
                              </label>
                              {selectedBrandModels.length > 0 ? (
                                <select
                                  value={aircraftForm.modelId}
                                  onChange={(e) => setAircraftForm({ ...aircraftForm, modelId: e.target.value })}
                                  className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                                >
                                  <option value="">Seleccionar Modelo</option>
                                  {selectedBrandModels.map((model) => (
                                    <option key={model.id} value={model.id}>
                                      {model.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  required
                                  placeholder="Ej: 172N"
                                  value={aircraftForm.customModel}
                                  onChange={(e) => setAircraftForm({ ...aircraftForm, customModel: e.target.value })}
                                  className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                                />
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                                Año *
                              </label>
                              <input
                                type="number"
                                required
                                min="1900"
                                max={new Date().getFullYear()}
                                value={aircraftForm.year}
                                onChange={(e) => setAircraftForm({ ...aircraftForm, year: Number(e.target.value) })}
                                className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                                Horas Totales (TT) *
                              </label>
                              <input
                                type="number"
                                required
                                placeholder="Ej: 3200"
                                value={aircraftForm.totalTimeHours}
                                onChange={(e) => setAircraftForm({ ...aircraftForm, totalTimeHours: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                                Categoría *
                              </label>
                              <select
                                value={aircraftForm.categoryId}
                                onChange={(e) => setAircraftForm({ ...aircraftForm, categoryId: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                              >
                                <option value="">Seleccionar Categoría</option>
                                {categoriesData.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                                Precio (USD)
                              </label>
                              <input
                                type="number"
                                disabled={aircraftForm.priceOnRequest}
                                placeholder={aircraftForm.priceOnRequest ? "A Consultar" : "Ej: 125000"}
                                value={aircraftForm.price}
                                onChange={(e) => setAircraftForm({ ...aircraftForm, price: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58] disabled:bg-slate-100 disabled:opacity-60"
                              />
                              <div className="flex items-center gap-2 mt-2">
                                <input
                                  type="checkbox"
                                  id="priceReq"
                                  checked={aircraftForm.priceOnRequest}
                                  onChange={(e) => setAircraftForm({ ...aircraftForm, priceOnRequest: e.target.checked, price: "" })}
                                  className="rounded text-[#001F58] focus:ring-0"
                                />
                                <label htmlFor="priceReq" className="text-xs font-semibold cursor-pointer">
                                  Precio a Consultar
                                </label>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                                Ciudad *
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="Ej: Morón"
                                value={aircraftForm.city}
                                onChange={(e) => setAircraftForm({ ...aircraftForm, city: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                                Provincia *
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="Ej: Buenos Aires"
                                value={aircraftForm.province}
                                onChange={(e) => setAircraftForm({ ...aircraftForm, province: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mb-8">
                          <h3 className="font-heading text-xl font-semibold border-b border-[#001F58]/15 pb-3 mb-5 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-red-600" />
                            Detalles y Equipamiento
                          </h3>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                                Descripción General *
                              </label>
                              <textarea
                                required
                                rows={4}
                                placeholder="Describa el historial, mantenimiento y estado general..."
                                value={aircraftForm.description}
                                onChange={(e) => setAircraftForm({ ...aircraftForm, description: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                                  Estado de Fuselaje
                                </label>
                                <input
                                  type="text"
                                  placeholder="Ej: Pintura 8/10, interior en cuero"
                                  value={aircraftForm.fuselageDescription}
                                  onChange={(e) => setAircraftForm({ ...aircraftForm, fuselageDescription: e.target.value })}
                                  className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                                  Modificaciones
                                </label>
                                <input
                                  type="text"
                                  placeholder="Ej: STC de STOL kit"
                                  value={aircraftForm.fuselageModifications}
                                  onChange={(e) => setAircraftForm({ ...aircraftForm, fuselageModifications: e.target.value })}
                                  className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Motores */}
                        <div className="mb-8">
                          <div className="flex justify-between items-center border-b border-[#001F58]/15 pb-3 mb-5">
                            <h3 className="font-heading text-xl font-semibold flex items-center gap-2">
                              <Gauge className="w-5 h-5 text-red-600" />
                              Información de Motores (Opcional)
                            </h3>
                            <button
                              type="button"
                              onClick={addEngine}
                              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#001F58]/10 text-[#001F58] hover:bg-[#001F58]/20 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" /> Agregar Motor
                            </button>
                          </div>

                          {engines.length === 0 ? (
                            <p className="text-xs text-[#001F58]/60 italic bg-[#001F58]/5 p-4 rounded-xl text-center">
                              No se han añadido datos de motores. Hacé clic en "Agregar Motor" si querés especificar detalles técnicos.
                            </p>
                          ) : (
                            <div className="space-y-4">
                              {engines.map((eng, idx) => (
                                <div key={idx} className="p-4 rounded-xl border border-[#001F58]/20 bg-white/50 relative">
                                  <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-bold uppercase text-[#001F58]/80">Motor #{idx + 1}</span>
                                    <button
                                      type="button"
                                      onClick={() => removeEngine(idx)}
                                      className="text-red-600 hover:text-red-800 text-xs flex items-center gap-1"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                    <input
                                      type="text"
                                      placeholder="Marca"
                                      value={eng.brand}
                                      onChange={(e) => updateEngine(idx, "brand", e.target.value)}
                                      className="px-3 py-2 rounded-lg border border-[#001F58]/20 text-xs bg-white"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Modelo"
                                      value={eng.model}
                                      onChange={(e) => updateEngine(idx, "model", e.target.value)}
                                      className="px-3 py-2 rounded-lg border border-[#001F58]/20 text-xs bg-white"
                                    />
                                    <input
                                      type="number"
                                      placeholder="Horas Uso"
                                      value={eng.engineHours}
                                      onChange={(e) => updateEngine(idx, "engineHours", e.target.value)}
                                      className="px-3 py-2 rounded-lg border border-[#001F58]/20 text-xs bg-white"
                                    />
                                    <input
                                      type="number"
                                      placeholder="TBO"
                                      value={eng.TBO}
                                      onChange={(e) => updateEngine(idx, "TBO", e.target.value)}
                                      className="px-3 py-2 rounded-lg border border-[#001F58]/20 text-xs bg-white"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Hélices */}
                        <div className="mb-8">
                          <div className="flex justify-between items-center border-b border-[#001F58]/15 pb-3 mb-5">
                            <h3 className="font-heading text-xl font-semibold flex items-center gap-2">
                              <Gauge className="w-5 h-5 text-red-600" />
                              Información de Hélices (Opcional)
                            </h3>
                            <button
                              type="button"
                              onClick={addPropeller}
                              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#001F58]/10 text-[#001F58] hover:bg-[#001F58]/20 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" /> Agregar Hélice
                            </button>
                          </div>

                          {propellers.length === 0 ? (
                            <p className="text-xs text-[#001F58]/60 italic bg-[#001F58]/5 p-4 rounded-xl text-center">
                              No se han añadido datos de hélices. Hacé clic en "Agregar Hélice" para detallarlas.
                            </p>
                          ) : (
                            <div className="space-y-4">
                              {propellers.map((prop, idx) => (
                                <div key={idx} className="p-4 rounded-xl border border-[#001F58]/20 bg-white/50 relative">
                                  <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-bold uppercase text-[#001F58]/80">Hélice #{idx + 1}</span>
                                    <button
                                      type="button"
                                      onClick={() => removePropeller(idx)}
                                      className="text-red-600 hover:text-red-800 text-xs flex items-center gap-1"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <input
                                      type="text"
                                      placeholder="Modelo de Hélice (Ej: McCauley 1A170)"
                                      value={prop.model}
                                      onChange={(e) => updatePropeller(idx, "model", e.target.value)}
                                      className="px-3 py-2 rounded-lg border border-[#001F58]/20 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                                    />
                                    <input
                                      type="number"
                                      placeholder="Horas de Hélice (TSN/TSO)"
                                      value={prop.propellerHours}
                                      onChange={(e) => updatePropeller(idx, "propellerHours", e.target.value)}
                                      className="px-3 py-2 rounded-lg border border-[#001F58]/20 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Sección de galería de imágenes */}
                        <div className="mb-8">
                          <div className="flex justify-between items-center border-b border-[#001F58]/15 pb-3 mb-5">
                            <h3 className="font-heading text-xl font-semibold flex items-center gap-2">
                              <FileText className="w-5 h-5 text-red-600" />
                              Imágenes del Producto *
                            </h3>
                            <span className="text-xs font-semibold text-[#001F58]/70">
                              {images.length} / 10 fotos
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            {images.map((img, idx) => (
                              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-[#001F58]/20 group">
                                <Image
                                  src={img.preview}
                                  alt={`Vista previa ${idx + 1}`}
                                  fill
                                  className="object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeImage(idx)}
                                  className="absolute top-1.5 right-1.5 bg-red-600 text-white p-1 rounded-full opacity-90 hover:opacity-100 transition-opacity shadow-sm"
                                  title="Eliminar foto"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                {idx === 0 && (
                                  <span className="absolute bottom-1.5 left-1.5 bg-black/70 backdrop-blur-md text-white text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">
                                    Principal
                                  </span>
                                )}
                              </div>
                            ))}

                            {images.length < 10 && (
                              <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-[#001F58]/30 hover:border-[#001F58] bg-white/50 hover:bg-white transition-all cursor-pointer p-2 text-center">
                                <Plus className="w-6 h-6 text-[#001F58]/60 mb-1" />
                                <span className="text-xs font-semibold text-[#001F58]/80">Agregar Foto</span>
                                <span className="text-[10px] text-[#001F58]/50">PNG, JPG</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={handleImageUpload}
                                  className="hidden"
                                />
                              </label>
                            )}
                          </div>
                          <p className="text-[11px] text-[#001F58]/60 mt-2">
                            La primera imagen será la foto de portada. Podés subir hasta 10 fotos en alta resolución.
                          </p>
                        </div>

                        {/* Botón de enviar (despues hay que cambiarlo por el webhook de MP) */}
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-4 px-6 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-red-600/30 transition-all flex items-center justify-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CreditCard className="w-5 h-5" />
                          <span>{isSubmitting ? "Publicando producto..." : "Publicar Ahora"}</span>
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      /* Formulario de Repuestos */
                      <div className="bg-white/90 border border-[#001F58]/20 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl text-[#001F58]">
                        <h3 className="font-heading text-xl font-semibold border-b border-[#001F58]/15 pb-3 mb-5 flex items-center gap-2">
                          <Wrench className="w-5 h-5 text-red-600" />
                          Detalles del Repuesto
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                              Título de la Publicación *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Ej: Altímetro Garmin GI-275"
                              value={partsForm.title}
                              onChange={(e) => setPartsForm({ ...partsForm, title: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                            />
                          </div>

                          {/* Selección de categoría principal */}
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                              Categoría Principal *
                            </label>
                            <select
                              value={selectedParentCategoryId}
                              onChange={(e) => {
                                setSelectedParentCategoryId(e.target.value);
                                setPartsForm((prev) => ({ ...prev, categoryId: "" }));
                              }}
                              className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                              required
                            >
                              <option value="">Seleccionar Categoría</option>
                              {spareCategoriesData.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Selección de subcategoría */}
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                              Subcategoría / Tipo *
                            </label>
                            <select
                              value={partsForm.categoryId}
                              onChange={(e) => setPartsForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                              disabled={!selectedParentCategoryId || subCategories.length === 0}
                              className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58] disabled:bg-gray-100 disabled:cursor-not-allowed"
                              required
                            >
                              <option value="">
                                {!selectedParentCategoryId
                                  ? "Primero elegí una categoría principal"
                                  : subCategories.length === 0
                                  ? "Sin subcategorías disponibles"
                                  : "Seleccionar Subcategoría"}
                              </option>
                              {subCategories.map((sub) => (
                                <option key={sub.id} value={sub.id}>
                                  {sub.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                              Marca / Fabricante
                            </label>
                            <input
                              type="text"
                              placeholder="Ej: Garmin, Lycoming, McCauley"
                              value={partsForm.brand}
                              onChange={(e) => setPartsForm({ ...partsForm, brand: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                              Condición *
                            </label>
                            <select
                              value={partsForm.condition}
                              onChange={(e) => setPartsForm({ ...partsForm, condition: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                            >
                              <option value="NUEVO">Nuevo</option>
                              <option value="USADO">Usado</option>
                              <option value="RECORRIDO">Recorrido / Reparado</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                              Número de Parte (P/N / SKU)
                            </label>
                            <input
                              type="text"
                              placeholder="Ej: 010-02201-00"
                              value={partsForm.partNumber}
                              onChange={(e) => setPartsForm({ ...partsForm, partNumber: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                              Precio (USD)
                            </label>
                            <input
                              type="number"
                              disabled={partsForm.priceOnRequest}
                              placeholder={partsForm.priceOnRequest ? "A Consultar" : "Ej: 1500"}
                              value={partsForm.price}
                              onChange={(e) => setPartsForm({ ...partsForm, price: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58] disabled:bg-slate-100 disabled:opacity-60"
                            />
                            <div className="flex items-center gap-2 mt-2">
                              <input
                                type="checkbox"
                                id="partPriceReq"
                                checked={partsForm.priceOnRequest}
                                onChange={(e) => setPartsForm({ ...partsForm, priceOnRequest: e.target.checked, price: "" })}
                                className="rounded text-[#001F58] focus:ring-0"
                              />
                              <label htmlFor="partPriceReq" className="text-xs font-semibold cursor-pointer">
                                Precio a Consultar
                              </label>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                              Ciudad *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Ej: Rosario"
                              value={partsForm.city}
                              onChange={(e) => setPartsForm({ ...partsForm, city: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                              Provincia *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Ej: Santa Fe"
                              value={partsForm.province}
                              onChange={(e) => setPartsForm({ ...partsForm, province: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                              Descripción *
                            </label>
                            <textarea
                              required
                              rows={4}
                              placeholder="Describa el repuesto, compatibilidad y detalles..."
                              value={partsForm.description}
                              onChange={(e) => setPartsForm({ ...partsForm, description: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                            />
                          </div>
                        </div>

                        {/* Galería de imágenes */}
                        <div className="mb-8">
                          <div className="flex justify-between items-center border-b border-[#001F58]/15 pb-3 mb-5">
                            <h3 className="font-heading text-xl font-semibold flex items-center gap-2">
                              <FileText className="w-5 h-5 text-red-600" />
                              Imágenes del Producto *
                            </h3>
                            <span className="text-xs font-semibold text-[#001F58]/70">
                              {images.length} / 10 fotos
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            {images.map((img, idx) => (
                              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-[#001F58]/20 group">
                                <Image
                                  src={img.preview}
                                  alt={`Vista previa ${idx + 1}`}
                                  fill
                                  className="object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeImage(idx)}
                                  className="absolute top-1.5 right-1.5 bg-red-600 text-white p-1 rounded-full opacity-90 hover:opacity-100 transition-opacity shadow-sm"
                                  title="Eliminar foto"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                {idx === 0 && (
                                  <span className="absolute bottom-1.5 left-1.5 bg-black/70 backdrop-blur-md text-white text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">
                                    Principal
                                  </span>
                                )}
                              </div>
                            ))}

                            {images.length < 10 && (
                              <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-[#001F58]/30 hover:border-[#001F58] bg-white/50 hover:bg-white transition-all cursor-pointer p-2 text-center">
                                <Plus className="w-6 h-6 text-[#001F58]/60 mb-1" />
                                <span className="text-xs font-semibold text-[#001F58]/80">Agregar Foto</span>
                                <span className="text-[10px] text-[#001F58]/50">PNG, JPG</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={handleImageUpload}
                                  className="hidden"
                                />
                              </label>
                            )}
                          </div>
                          <p className="text-[11px] text-[#001F58]/60 mt-2">
                            La primera imagen será la foto de portada. Podés subir hasta 10 fotos en alta resolución.
                          </p>
                        </div>

                        {/* Botón de envío (lo mismo que con aviones) */}
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-4 px-6 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-red-600/30 transition-all flex items-center justify-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CreditCard className="w-5 h-5" />
                          <span>{isSubmitting ? "Publicando producto..." : "Publicar Ahora"}</span>
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </form>
                </div>

                {/* Publicación Asistida */}
                <div className="lg:col-span-1">
                  <div className="bg-[#001F58] text-white rounded-2xl p-6 shadow-xl border border-white/10 sticky top-24">
                    <div className="flex items-center gap-2 text-red-500 font-bold text-xs uppercase tracking-wider mb-2">
                      <HelpCircle className="w-4 h-4" />
                      <span>¿Preferís que nos encarguemos?</span>
                    </div>
                    <h3 className="font-heading text-xl font-bold mb-3">
                      Quiero que lo publiquen ustedes
                    </h3>
                    <p className="text-xs text-white/80 leading-relaxed mb-6">
                      Dejanos tus datos y las fotos del producto. Nuestro equipo especializado preparará la publicación oficial por vos.
                    </p>

                    <form onSubmit={handleManagedSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/90 mb-1">
                          Tu Nombre *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Juan Pérez"
                          value={managedListingForm.name}
                          onChange={(e) => setManagedListingForm({ ...managedListingForm, name: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/90 mb-1">
                          WhatsApp *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="Ej: +54 9 11 1234-5678"
                          value={managedListingForm.whatsapp}
                          onChange={(e) => setManagedListingForm({ ...managedListingForm, whatsapp: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/90 mb-1">
                          ¿Qué querés vender?
                        </label>
                        <select
                          value={managedListingForm.itemType}
                          onChange={(e) => setManagedListingForm({ ...managedListingForm, itemType: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 [&>option]:text-black"
                        >
                          <option value="Aeronave">Aeronave</option>
                          <option value="Repuesto">Repuesto / Accesorio</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/90 mb-1">
                          Descripción o link a fotos
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Detallá modelo, precio pretendido y adjuntá links de Drive/Dropbox..."
                          value={managedListingForm.description}
                          onChange={(e) => setManagedListingForm({ ...managedListingForm, description: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 px-4 rounded-xl font-semibold bg-white text-[#001F58] hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 text-sm shadow-md disabled:opacity-50"
                      >
                        <Send className="w-4 h-4 text-red-600" />
                        <span>{isSubmitting ? "Enviando..." : "Solicitar Asistencia"}</span>
                      </button>
                    </form>
                  </div>
                </div>

            </div>
        </div>
    </main>
    );
}