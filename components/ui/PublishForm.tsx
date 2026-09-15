"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createListing, sendManagedListingEmail } from "@/app/publish/actions";
import Image from "next/image";
import Link from "next/link";
import Stepper, { Step } from "@/components/ui/Stepper";
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
    CreditCard,
    AlertCircle,
    Info,
    Upload,
    FileCheck,
    Paperclip
} from "lucide-react";

export interface CategoryOption { 
    id: string; 
    name: string;
    children?: CategoryOption[];
}

export interface SubModelOption {
    id: string;
    name: string;
    categoryOverride?: string | null;
}

export interface ModelOption {
    id: string;
    name: string;
    defaultCategoryId?: string | null;
    variants?: SubModelOption[];
}

export interface BrandOption { 
    id: string; 
    name: string; 
    models: ModelOption[];
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

const SUGGESTED_SLOTS = [
  { label: "Portada", sub: "Ángulo 45°" },
  { label: "Frente", sub: "Vista frontal" },
  { label: "De atrás", sub: "Vista posterior" },
  { label: "Izquierdo", sub: "Perfil izq." },
  { label: "Derecho", sub: "Perfil der." },
  { label: "Interior", sub: "Cabina" },
  { label: "Tablero", sub: "Aviónica" },
  { label: "Motor", sub: "Planta motriz" },
  { label: "Hélice / Detalles", sub: "Primer plano" },
  { label: "Historial", sub: "Bitácora" },
];

export default function PublishForm({
    userId,
    categoriesData = [],
    brandsData = [],
    spareCategoriesData = []
}: PublishFormProps) {
    const errorRef = useRef<HTMLDivElement>(null);

    const [activeTab, setActiveTab] = useState<"aircraft" | "parts">("aircraft");    

    const [selectedBrandModels, setSelectedBrandModels] = useState<ModelOption[]>([]);
    const [selectedModelVariants, setSelectedModelVariants] = useState<SubModelOption[]>([]);
    const [selectedParentCategoryId, setSelectedParentCategoryId] = useState<string>("");

    const subCategories = useMemo(() => {
      const parent = spareCategoriesData.find((cat) => cat.id === selectedParentCategoryId);
      return parent?.children || [];
    }, [selectedParentCategoryId, spareCategoriesData]);

    const [managedListingForm, setManagedListingForm] = useState({
        name: "",
        whatsapp: "",
        itemType: "Aeronave",
        description: "",
    });

    const [isPublishing, setIsPublishing] = useState(false);
    const [isSubmittingManaged, setIsSubmittingManaged] = useState(false);

    const [formError, setFormError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [managedSuccess, setManagedSuccess] = useState(false);

    // Formulario de aeronaves
    const [aircraftForm, setAircraftForm] = useState({
        title: "",
        brandId: "",
        customBrand: "",
        modelId: "",
        subModelId: "",
        customModel: "",
        year: new Date().getFullYear(),
        totalTimeHours: "",
        categoryId: "",
        engineType: "PISTON",
        condition: "USADO",
        financing: false,
        trade: false,
        rent: false,
        price: "",
        priceOnRequest: false,
        city: "",
        province: "",
        description: "",
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
        inPesos: false,
        price: "",
        priceOnRequest: false,
        stock: "1",
        city: "",
        province: "",
        description: "",
    });

    const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
    const [documents, setDocuments] = useState<File[]>([]);

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

    // Asignación automática de categoría según Modelo/Submodelo seleccionado
    useEffect(() => {
      if (
        aircraftForm.brandId === "CUSTOM" ||
        aircraftForm.modelId === "CUSTOM_MODEL" ||
        !aircraftForm.modelId
      ) {
        return;
      }

      const currentModel = selectedBrandModels.find((m) => m.id === aircraftForm.modelId);
      const currentVariant = selectedModelVariants.find((v) => v.id === aircraftForm.subModelId);

      const resolvedCategory = currentVariant?.categoryOverride || currentModel?.defaultCategoryId;

      if (resolvedCategory) {
        setAircraftForm((prev) => ({
          ...prev,
          categoryId: resolvedCategory,
        }));
      }
    }, [aircraftForm.modelId, aircraftForm.subModelId, selectedBrandModels, selectedModelVariants, aircraftForm.brandId]);

    const setErrorAndScroll = (msg: string) => {
      setFormError(msg);
      setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    };

    const handleBrandChange = (brandId: string) => {
        const foundBrand = brandsData.find((b) => b.id === brandId);
        setAircraftForm((prev) => ({
            ...prev,
            brandId,
            customBrand: "",
            modelId: "",
            subModelId: "",
            customModel: "",
            categoryId: "",
        }));
        setSelectedBrandModels(foundBrand?.models || []);
        setSelectedModelVariants([]);
    };

    const handleModelChange = (modelId: string) => {
      if (modelId === "CUSTOM_MODEL") {
        setSelectedModelVariants([]);
        setAircraftForm((prev) => ({
          ...prev,
          modelId: "CUSTOM_MODEL",
          subModelId: "",
          customModel: "",
          categoryId: "",
        }));
        return;
      }

      const foundModel = selectedBrandModels.find((m) => m.id === modelId);
      const variants = foundModel?.variants || [];
      setSelectedModelVariants(variants);

      const targetCategory = foundModel?.defaultCategoryId || "";

      setAircraftForm((prev) => ({
        ...prev,
        modelId,
        subModelId: "",
        customModel: "",
        categoryId: targetCategory,
      }));
    };

    const handleSubModelChange = (subModelId: string) => {
      const foundVariant = selectedModelVariants.find((v) => v.id === subModelId);
      const currentModel = selectedBrandModels.find((m) => m.id === aircraftForm.modelId);

      const resolvedCategory = foundVariant?.categoryOverride || currentModel?.defaultCategoryId || aircraftForm.categoryId;

      setAircraftForm((prev) => ({
        ...prev,
        subModelId,
        categoryId: resolvedCategory,
      }));
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

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      const filesArray = Array.from(e.target.files);
      setFormError(null);

      if (images.length + filesArray.length > 10) {
        setErrorAndScroll("Solo puedes subir un máximo de 10 imágenes por publicación.");
        return;
      }

      const newImages = filesArray.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));

      setImages((prev) => [...prev, ...newImages]);
    };

    const removeImage = (index: number) => {
      setImages((prev) => {
        const updated = [...prev];
        URL.revokeObjectURL(updated[index].preview);
        updated.splice(index, 1);
        return updated;
      });
    };

    const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      const filesArray = Array.from(e.target.files);
      
      for (const file of filesArray) {
        if (file.size > 10 * 1024 * 1024) {
          setErrorAndScroll(`El archivo ${file.name} excede el tamaño máximo permitido de 10MB.`);
          return;
        }
      }

      setDocuments((prev) => [...prev, ...filesArray]);
    };

    const removeDocument = (index: number) => {
      setDocuments((prev) => prev.filter((_, i) => i !== index));
    };

    const isCustomModelOrBrand =
      aircraftForm.brandId === "CUSTOM" ||
      selectedBrandModels.length === 0 ||
      aircraftForm.modelId === "CUSTOM_MODEL";

    const validateForm = () => {
      if (activeTab === "aircraft") {
        if (!aircraftForm.title.trim()) return "El título de la aeronave es obligatorio.";
        
        if (aircraftForm.brandId === "CUSTOM" && !aircraftForm.customBrand.trim()) {
          return "Debe ingresar el nombre de la marca personalizada.";
        }

        if (
          (aircraftForm.modelId === "CUSTOM_MODEL" || selectedBrandModels.length === 0) &&
          !aircraftForm.customModel.trim()
        ) {
          return "Debe ingresar el modelo de la aeronave.";
        }

        const yearNum = Number(aircraftForm.year);
        const currentYear = new Date().getFullYear();
        if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear) {
          return `El año debe ser un número válido entre 1900 y ${currentYear}.`;
        }

        const hoursNum = Number(aircraftForm.totalTimeHours);
        if (isNaN(hoursNum) || hoursNum < 0) {
          return "Las Horas Totales deben ser un número mayor o igual a 0.";
        }

        if (!aircraftForm.priceOnRequest) {
          const priceNum = Number(aircraftForm.price);
          if (isNaN(priceNum) || priceNum < 0) {
            return "El precio de la aeronave no puede ser un valor negativo.";
          }
        }

        if (!aircraftForm.city.trim() || !aircraftForm.province.trim()) {
          return "Debe ingresar una ciudad y provincia válidas.";
        }
      } else {
        if (!partsForm.title.trim()) return "El título del repuesto es obligatorio.";
        if (!partsForm.categoryId) return "Debe seleccionar una subcategoría.";

        const stockNum = Number(partsForm.stock);
        if (isNaN(stockNum) || stockNum < 1) {
          return "El stock debe ser al menos 1 unidad.";
        }

        if (!partsForm.priceOnRequest) {
          const priceNum = Number(partsForm.price);
          if (isNaN(priceNum) || priceNum < 0) {
            return "El precio del repuesto no puede ser negativo.";
          }
        }

        if (!partsForm.city.trim() || !partsForm.province.trim()) {
          return "Debe ingresar una ciudad y provincia válidas.";
        }
      }

      return null;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setFormError(null);

      const validationError = validateForm();
      if (validationError) {
        setErrorAndScroll(validationError);
        return;
      }

      if (images.length === 0) {
        setErrorAndScroll("Por favor, agregá al menos una imagen de tu producto.");
        return;
      }

      setIsPublishing(true);

      try {
        const data = new FormData();
        data.append("listingType", activeTab);

        images.forEach((img) => {
          data.append("files", img.file);
        });

        documents.forEach((doc) => {
          data.append("documents", doc);
        });

        if (activeTab === "aircraft") {
          data.append("title", aircraftForm.title.trim());
          data.append("categoryId", aircraftForm.categoryId);
          data.append("brandId", aircraftForm.brandId === "CUSTOM" ? "" : aircraftForm.brandId);
          data.append("customBrand", aircraftForm.customBrand.trim());
          data.append("modelId", aircraftForm.modelId === "CUSTOM_MODEL" ? "" : aircraftForm.modelId);
          data.append("subModelId", aircraftForm.subModelId);
          data.append("customModel", aircraftForm.customModel.trim());
          data.append("year", aircraftForm.year.toString());
          data.append("totalTimeHours", aircraftForm.totalTimeHours);
          data.append("condition", aircraftForm.condition);
          data.append("engineType", aircraftForm.engineType);
          data.append("financing", aircraftForm.financing.toString());
          data.append("trade", aircraftForm.trade.toString());
          data.append("rent", aircraftForm.rent.toString());
          data.append("price", aircraftForm.price);
          data.append("priceOnRequest", aircraftForm.priceOnRequest.toString());
          data.append("city", aircraftForm.city.trim());
          data.append("province", aircraftForm.province.trim());
          data.append("description", aircraftForm.description.trim());
          data.append("engines", JSON.stringify(engines));
          data.append("propellers", JSON.stringify(propellers));
        } else {
          data.append("title", partsForm.title.trim());
          data.append("categoryId", partsForm.categoryId);
          data.append("condition", partsForm.condition);
          data.append("brand", partsForm.brand.trim());
          data.append("partNumber", partsForm.partNumber.trim());
          data.append("inPesos", partsForm.inPesos.toString());
          data.append("price", partsForm.price);
          data.append("priceOnRequest", partsForm.priceOnRequest.toString());
          data.append("stock", partsForm.stock);
          data.append("city", partsForm.city.trim());
          data.append("province", partsForm.province.trim());
          data.append("description", partsForm.description.trim());
        }

        await createListing(data);
        setIsSuccess(true);
      } catch (error) {
        console.error("Error al publicar:", error);
        setErrorAndScroll("Ocurrió un error al guardar la publicación.");
      } finally {
        setIsPublishing(false);
      }
    };

    const handleManagedSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsSubmittingManaged(true);
      setManagedSuccess(false);

      if (!managedListingForm.name.trim() || !managedListingForm.whatsapp.trim()) {
        setErrorAndScroll("Ingresá tu nombre y WhatsApp para ponernos en contacto.");
        setIsSubmittingManaged(false);
        return;
      }

      const res = await sendManagedListingEmail({
        name: managedListingForm.name.trim(),
        whatsapp: managedListingForm.whatsapp.trim(),
        itemType: managedListingForm.itemType,
        description: managedListingForm.description.trim()
      });

      if (res.success) {
        setManagedSuccess(true);
        setManagedListingForm({ name: "", whatsapp: "", itemType: "Aeronave", description: "" });
      } else {
        setErrorAndScroll("Error al enviar la solicitud: " + res.error);
      }

      setIsSubmittingManaged(false);
    };

    if (userId === null) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-4">
          <h2 className="text-2xl font-bold text-[#001F58]">Debes iniciar sesión</h2>
          <Link href="/login" className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-semibold">
            Iniciar Sesión
          </Link>
        </div>
      );
    }

    if (isSuccess) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-6">
          <CheckCircle2 className="w-16 h-16 text-emerald-600" />
          <h2 className="text-3xl font-bold text-[#001F58]">¡Publicación Creada con Éxito!</h2>
          <p className="text-slate-600 max-w-md">Tu producto ha sido publicado en la plataforma correctamente.</p>
          <Link href="/" className="mt-4 px-6 py-3 bg-[#001F58] text-white font-semibold rounded-xl hover:bg-blue-900 transition-colors">
            Volver al Inicio
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
            </div>

            {formError && (
              <div ref={errorRef} className="max-w-2xl mx-auto mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex justify-center mb-10">
              <div className="bg-white/80 p-1.5 rounded-2xl border border-[#001F58]/20 flex gap-2 shadow-sm backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => { setActiveTab("aircraft"); setFormError(null); }}
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
                  onClick={() => { setActiveTab("parts"); setFormError(null); }}
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
                <div className="lg:col-span-2">
                  <form onSubmit={handleSubmit}>
                    <div className="bg-white/90 border border-[#001F58]/20 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl text-[#001F58]">
                      
                      {activeTab === "aircraft" ? (
                        <Stepper
                          backButtonText="Anterior"
                          nextButtonText="Siguiente paso"
                        >
                          {/* Paso 1: Datos Principales */}
                          <Step>
                            <h3 className="font-heading text-xl font-semibold border-b border-[#001F58]/15 pb-3 mb-5 flex items-center gap-2">
                              <Plane className="w-5 h-5 text-red-600" />
                              Paso 1: Datos Principales de la Aeronave
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
                                  className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Marca *</label>
                                <select
                                  value={aircraftForm.brandId}
                                  onChange={(e) => handleBrandChange(e.target.value)}
                                  className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white"
                                >
                                  <option value="">Seleccionar Marca</option>
                                  {brandsData.map((brand) => (
                                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                                  ))}
                                  <option value="CUSTOM">Otra Marca...</option>
                                </select>
                              </div>

                              {aircraftForm.brandId === "CUSTOM" && (
                                <div>
                                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">Marca Personalizada *</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="Nombre de la marca"
                                    value={aircraftForm.customBrand}
                                    onChange={(e) => setAircraftForm({ ...aircraftForm, customBrand: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white"
                                  />
                                </div>
                              )}

                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Modelo *</label>
                                {selectedBrandModels.length > 0 ? (
                                  <select
                                    value={aircraftForm.modelId}
                                    onChange={(e) => handleModelChange(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white"
                                  >
                                    <option value="">Seleccionar Modelo</option>
                                    {selectedBrandModels.map((model) => (
                                      <option key={model.id} value={model.id}>{model.name}</option>
                                    ))}
                                    <option value="CUSTOM_MODEL">Otro modelo...</option>
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    required
                                    placeholder="Ej: 172N"
                                    value={aircraftForm.customModel}
                                    onChange={(e) => setAircraftForm({ ...aircraftForm, customModel: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white"
                                  />
                                )}
                              </div>

                              {aircraftForm.modelId === "CUSTOM_MODEL" && selectedBrandModels.length > 0 && (
                                <div>
                                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">Modelo Personalizado *</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="Escribí el modelo"
                                    value={aircraftForm.customModel}
                                    onChange={(e) => setAircraftForm({ ...aircraftForm, customModel: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white"
                                  />
                                </div>
                              )}

                              {selectedModelVariants.length > 0 && aircraftForm.modelId !== "CUSTOM_MODEL" && (
                                <div>
                                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">Variante / Submodelo</label>
                                  <select
                                    value={aircraftForm.subModelId}
                                    onChange={(e) => handleSubModelChange(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white"
                                  >
                                    <option value="">Seleccionar Variante</option>
                                    {selectedModelVariants.map((variant) => (
                                      <option key={variant.id} value={variant.id}>{variant.name}</option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {isCustomModelOrBrand && (
                                <div>
                                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">Categoría *</label>
                                  <select
                                    value={aircraftForm.categoryId}
                                    onChange={(e) => setAircraftForm({ ...aircraftForm, categoryId: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white"
                                    required
                                  >
                                    <option value="">Seleccionar Categoría</option>
                                    {categoriesData.map((cat) => (
                                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Condición *</label>
                                <select
                                  value={aircraftForm.condition}
                                  onChange={(e) => setAircraftForm({ ...aircraftForm, condition: e.target.value as "NUEVO" | "USADO" })}
                                  className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white"
                                >
                                  <option value="USADO">Usado</option>
                                  <option value="NUEVO">Nuevo</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Tipo de Motor</label>
                                <select
                                  value={aircraftForm.engineType}
                                  onChange={(e) => setAircraftForm({ ...aircraftForm, engineType: e.target.value as "PISTON" | "TURBOPROP" })}
                                  className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white"
                                >
                                  <option value="PISTON">Pistón</option>
                                  <option value="TURBOPROP">Turbohélice</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Año *</label>
                                <input
                                  type="number"
                                  required
                                  min="1900"
                                  max={new Date().getFullYear()}
                                  value={aircraftForm.year}
                                  onChange={(e) => setAircraftForm({ ...aircraftForm, year: Number(e.target.value) })}
                                  className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Horas Totales (TT) *</label>
                                <input
                                  type="number"
                                  required
                                  min="0"
                                  placeholder="Ej: 3200"
                                  value={aircraftForm.totalTimeHours}
                                  onChange={(e) => setAircraftForm({ ...aircraftForm, totalTimeHours: e.target.value })}
                                  className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white"
                                />
                              </div>
                            </div>
                          </Step>

                          {/* Paso 2: Ubicación y Precio */}
                          <Step>
                            <h3 className="font-heading text-xl font-semibold border-b border-[#001F58]/15 pb-3 mb-5 flex items-center gap-2">
                              <FileText className="w-5 h-5 text-red-600" />
                              Paso 2: Ubicación, Precio y Modalidades
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Precio (USD)</label>
                                <input
                                  type="number"
                                  min="0"
                                  disabled={aircraftForm.priceOnRequest}
                                  placeholder={aircraftForm.priceOnRequest ? "A Consultar" : "Ej: 125000"}
                                  value={aircraftForm.price}
                                  onChange={(e) => setAircraftForm({ ...aircraftForm, price: e.target.value })}
                                  className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white disabled:bg-slate-100"
                                />
                                <div className="flex items-center gap-2 mt-2">
                                  <input
                                    type="checkbox"
                                    id="priceReq"
                                    checked={aircraftForm.priceOnRequest}
                                    onChange={(e) => setAircraftForm({ ...aircraftForm, priceOnRequest: e.target.checked, price: "" })}
                                    className="rounded text-[#001F58]"
                                  />
                                  <label htmlFor="priceReq" className="text-xs font-semibold cursor-pointer">
                                    Precio a Consultar
                                  </label>
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Ciudad *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Ej: Morón"
                                  value={aircraftForm.city}
                                  onChange={(e) => setAircraftForm({ ...aircraftForm, city: e.target.value })}
                                  className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Provincia *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Ej: Buenos Aires"
                                  value={aircraftForm.province}
                                  onChange={(e) => setAircraftForm({ ...aircraftForm, province: e.target.value })}
                                  className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white"
                                />
                              </div>

                              <div className="sm:col-span-2 pt-2 border-t border-[#001F58]/10 space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2">
                                  Opciones de Negociación
                                </label>
                                <div className="flex flex-wrap gap-6">
                                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={aircraftForm.financing}
                                      onChange={(e) => setAircraftForm({ ...aircraftForm, financing: e.target.checked })}
                                      className="rounded text-[#001F58]"
                                    />
                                    <span>Acepta Financiación</span>
                                  </label>

                                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={aircraftForm.trade}
                                      onChange={(e) => setAircraftForm({ ...aircraftForm, trade: e.target.checked })}
                                      className="rounded text-[#001F58]"
                                    />
                                    <span>Acepta Permuta</span>
                                  </label>

                                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={aircraftForm.rent}
                                      onChange={(e) => setAircraftForm({ ...aircraftForm, rent: e.target.checked })}
                                      className="rounded text-[#001F58]"
                                    />
                                    <span>Disponible para Alquiler</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          </Step>

                          {/* Paso 3: Descripción, Motores y Hélices */}
                          <Step>
                            <h3 className="font-heading text-xl font-semibold border-b border-[#001F58]/15 pb-3 mb-5 flex items-center gap-2">
                              <Gauge className="w-5 h-5 text-red-600" />
                              Paso 3: Descripción, Motores y Hélices
                            </h3>

                            <div className="space-y-6">
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Descripción General *</label>
                                <textarea
                                  required
                                  rows={5}
                                  value={aircraftForm.description}
                                  onChange={(e) => setAircraftForm({ ...aircraftForm, description: e.target.value })}
                                  className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white"
                                />
                              </div>

                              {/* MOTORES */}
                              <div className="pt-2 border-t border-[#001F58]/10">
                                <div className="flex justify-between items-center mb-3">
                                  <label className="text-xs font-bold uppercase text-[#001F58]">Información de Motores (Opcional)</label>
                                  <button
                                    type="button"
                                    onClick={addEngine}
                                    className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#001F58]/10 text-[#001F58] hover:bg-[#001F58]/20 transition-colors cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Agregar Motor
                                  </button>
                                </div>

                                {engines.length === 0 ? (
                                  <p className="text-xs text-[#001F58]/60 italic bg-[#001F58]/5 p-3 rounded-xl text-center">
                                    Sin datos de motores cargados.
                                  </p>
                                ) : (
                                  <div className="space-y-3">
                                    {engines.map((eng, idx) => (
                                      <div key={idx} className="p-3.5 rounded-xl border border-[#001F58]/20 bg-white/50 relative space-y-2">
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs font-bold uppercase text-[#001F58]/80">Motor #{idx + 1}</span>
                                          <button
                                            type="button"
                                            onClick={() => removeEngine(idx)}
                                            className="text-red-600 hover:text-red-800 text-xs flex items-center gap-1 font-semibold cursor-pointer"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                          </button>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                          <input type="text" placeholder="Marca" value={eng.brand} onChange={(e) => updateEngine(idx, "brand", e.target.value)} className="p-2 border rounded-lg text-xs bg-white" />
                                          <input type="text" placeholder="Modelo" value={eng.model} onChange={(e) => updateEngine(idx, "model", e.target.value)} className="p-2 border rounded-lg text-xs bg-white" />
                                          <input type="number" min="0" placeholder="Horas" value={eng.engineHours} onChange={(e) => updateEngine(idx, "engineHours", e.target.value)} className="p-2 border rounded-lg text-xs bg-white" />
                                          <input type="number" min="0" placeholder="TBO" value={eng.TBO} onChange={(e) => updateEngine(idx, "TBO", e.target.value)} className="p-2 border rounded-lg text-xs bg-white" />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* HÉLICES */}
                              <div className="pt-2 border-t border-[#001F58]/10">
                                <div className="flex justify-between items-center mb-3">
                                  <label className="text-xs font-bold uppercase text-[#001F58]">Información de Hélices (Opcional)</label>
                                  <button
                                    type="button"
                                    onClick={addPropeller}
                                    className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#001F58]/10 text-[#001F58] hover:bg-[#001F58]/20 transition-colors cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Agregar Hélice
                                  </button>
                                </div>

                                {propellers.length === 0 ? (
                                  <p className="text-xs text-[#001F58]/60 italic bg-[#001F58]/5 p-3 rounded-xl text-center">
                                    Sin datos de hélices cargados.
                                  </p>
                                ) : (
                                  <div className="space-y-3">
                                    {propellers.map((prop, idx) => (
                                      <div key={idx} className="p-3.5 rounded-xl border border-[#001F58]/20 bg-white/50 relative space-y-2">
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs font-bold uppercase text-[#001F58]/80">Hélice #{idx + 1}</span>
                                          <button
                                            type="button"
                                            onClick={() => removePropeller(idx)}
                                            className="text-red-600 hover:text-red-800 text-xs flex items-center gap-1 font-semibold cursor-pointer"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                          </button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          <input type="text" placeholder="Modelo de Hélice" value={prop.model} onChange={(e) => updatePropeller(idx, "model", e.target.value)} className="p-2 border rounded-lg text-xs bg-white" />
                                          <input type="number" min="0" placeholder="Horas de Hélice" value={prop.propellerHours} onChange={(e) => updatePropeller(idx, "propellerHours", e.target.value)} className="p-2 border rounded-lg text-xs bg-white" />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </Step>

                          {/* Paso 4: Fotos */}
                          <Step>
                            <div className="space-y-4">
                              <h3 className="font-heading text-xl font-semibold border-b border-[#001F58]/15 pb-3 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-red-600" />
                                Paso 4: Fotos de la Publicación *
                              </h3>

                              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3 text-xs text-blue-900">
                                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-bold">Subí fotos claras de tu aeronave</p>
                                  <p className="text-blue-700 mt-0.5">
                                    Te sugerimos los siguientes ángulos para una presentación profesional. La primera foto será la portada.
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                                {SUGGESTED_SLOTS.map((slot, idx) => {
                                  const img = images[idx];

                                  return (
                                    <div
                                      key={idx}
                                      className="relative aspect-square rounded-2xl border-2 border-dashed border-[#001F58]/20 bg-white flex flex-col items-center justify-center p-2 text-center group hover:border-[#001F58] transition-all overflow-hidden"
                                    >
                                      {img ? (
                                        <>
                                          <Image
                                            src={img.preview}
                                            alt={`Foto ${idx + 1}`}
                                            fill
                                            className="object-cover"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => removeImage(idx)}
                                            className="absolute top-1.5 right-1.5 bg-red-600 text-white p-1 rounded-full shadow-md z-10 cursor-pointer"
                                            title="Eliminar foto"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                          {idx === 0 && (
                                            <span className="absolute bottom-1.5 left-1.5 bg-[#001F58] text-white text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shadow">
                                              Portada
                                            </span>
                                          )}
                                        </>
                                      ) : (
                                        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                          <Upload className="w-5 h-5 text-[#001F58]/40 mb-1 group-hover:text-[#001F58] transition-colors" />
                                          <span className="text-xs font-bold text-[#001F58]">
                                            {slot.label}
                                          </span>
                                          <span className="text-[10px] text-slate-400">
                                            {slot.sub}
                                          </span>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                          />
                                        </label>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              <p className="text-[11px] text-[#001F58]/60 mt-1">
                                Podés subir hasta 10 fotos en formatos JPG o PNG.
                              </p>
                            </div>
                          </Step>

                          {/* Paso 5: Documentos Opcionales */}
                          <Step>
                            <div className="space-y-6">
                              <h3 className="font-heading text-xl font-semibold border-b border-[#001F58]/15 pb-3 flex items-center gap-2">
                                <FileCheck className="w-5 h-5 text-red-600" />
                                Paso 5: Documentación y Confirmación (Opcional)
                              </h3>

                              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                                Adjuntá de forma opcional archivos como informes de mantenimiento, fichas técnicas o certificados para generar mayor confianza en los compradores.
                              </div>

                              <div className="border-2 border-dashed border-[#001F58]/20 rounded-2xl p-6 text-center bg-white">
                                <Paperclip className="w-8 h-8 text-[#001F58]/40 mx-auto mb-2" />
                                <p className="text-xs font-bold text-[#001F58]">Subir archivos o documentos</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">Formatos soportados: PDF, Word, imágenes (máx. 10MB por archivo)</p>
                                <label className="inline-block mt-3 px-4 py-2 bg-[#001F58]/10 hover:bg-[#001F58]/20 text-[#001F58] text-xs font-bold rounded-xl cursor-pointer transition-colors">
                                  Seleccionar Archivo
                                  <input
                                    type="file"
                                    multiple
                                    accept=".pdf,.doc,.docx,image/*"
                                    onChange={handleDocumentUpload}
                                    className="hidden"
                                  />
                                </label>
                              </div>

                              {documents.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-xs font-bold uppercase text-[#001F58]">Documentos Adjuntados:</p>
                                  {documents.map((doc, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white text-xs">
                                      <span className="font-medium truncate max-w-[250px]">{doc.name}</span>
                                      <button
                                        type="button"
                                        onClick={() => removeDocument(idx)}
                                        className="text-red-600 hover:text-red-800 text-xs font-bold cursor-pointer"
                                      >
                                        Eliminar
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <button
                                type="submit"
                                disabled={isPublishing}
                                className="w-full py-4 px-6 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                              >
                                <CreditCard className="w-5 h-5" />
                                <span>{isPublishing ? "Publicando producto..." : "Publicar Ahora"}</span>
                                <ArrowRight className="w-5 h-5" />
                              </button>
                            </div>
                          </Step>
                        </Stepper>
                      ) : (
                        /* STEPPER REPUESTOS */
                        <Stepper
                          backButtonText="Anterior"
                          nextButtonText="Siguiente paso"
                        >
                          <Step>
                            <h3 className="font-heading text-xl font-semibold border-b border-[#001F58]/15 pb-3 mb-5 flex items-center gap-2">
                              <Wrench className="w-5 h-5 text-red-600" />
                              Paso 1: Categoría y Datos del Repuesto
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="sm:col-span-2">
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Título de la Publicación *</label>
                                <input
                                  type="text"
                                  required
                                  value={partsForm.title}
                                  onChange={(e) => setPartsForm({ ...partsForm, title: e.target.value })}
                                  className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Categoría Principal *</label>
                                <select
                                  value={selectedParentCategoryId}
                                  onChange={(e) => {
                                    setSelectedParentCategoryId(e.target.value);
                                    setPartsForm((prev) => ({ ...prev, categoryId: "" }));
                                  }}
                                  className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white"
                                  required
                                >
                                  <option value="">Seleccionar Categoría</option>
                                  {spareCategoriesData.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Subcategoría *</label>
                                <select
                                  value={partsForm.categoryId}
                                  onChange={(e) => setPartsForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                                  disabled={!selectedParentCategoryId || subCategories.length === 0}
                                  className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white disabled:bg-gray-100"
                                  required
                                >
                                  <option value="">
                                    {!selectedParentCategoryId ? "Seleccionar primero categoría" : "Seleccionar Subcategoría"}
                                  </option>
                                  {subCategories.map((sub) => (
                                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Condición *</label>
                                <select
                                  value={partsForm.condition}
                                  onChange={(e) => setPartsForm({ ...partsForm, condition: e.target.value })}
                                  className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white"
                                >
                                  <option value="NUEVO">Nuevo</option>
                                  <option value="USADO">Usado</option>
                                  <option value="RECORRIDO">Recorrido / Reparado</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Stock Disponible *</label>
                                <input
                                  type="number"
                                  min="1"
                                  required
                                  value={partsForm.stock}
                                  onChange={(e) => setPartsForm({ ...partsForm, stock: e.target.value })}
                                  className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Número de Parte (P/N / SKU)</label>
                                <input
                                  type="text"
                                  value={partsForm.partNumber}
                                  onChange={(e) => setPartsForm({ ...partsForm, partNumber: e.target.value })}
                                  className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Marca / Fabricante</label>
                                <input
                                  type="text"
                                  value={partsForm.brand}
                                  onChange={(e) => setPartsForm({ ...partsForm, brand: e.target.value })}
                                  className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white"
                                />
                              </div>
                            </div>
                          </Step>

                          <Step>
                            <h3 className="font-heading text-xl font-semibold border-b border-[#001F58]/15 pb-3 mb-5 flex items-center gap-2">
                              <FileText className="w-5 h-5 text-red-600" />
                              Paso 2: Precio, Ubicación y Descripción
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                                  Precio {partsForm.inPesos ? "(ARS)" : "(USD)"}
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  disabled={partsForm.priceOnRequest}
                                  value={partsForm.price}
                                  onChange={(e) => setPartsForm({ ...partsForm, price: e.target.value })}
                                  className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white"
                                />
                                <div className="flex flex-col sm:flex-row gap-4 mt-2">
                                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={partsForm.inPesos}
                                      onChange={(e) => setPartsForm({ ...partsForm, inPesos: e.target.checked })}
                                      className="rounded text-[#001F58]"
                                    />
                                    <span>Expresado en Pesos (ARS)</span>
                                  </label>

                                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={partsForm.priceOnRequest}
                                      onChange={(e) => setPartsForm({ ...partsForm, priceOnRequest: e.target.checked, price: "" })}
                                      className="rounded text-[#001F58]"
                                    />
                                    <span>Precio a Consultar</span>
                                  </label>
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Ciudad *</label>
                                <input
                                  type="text"
                                  required
                                  value={partsForm.city}
                                  onChange={(e) => setPartsForm({ ...partsForm, city: e.target.value })}
                                  className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Provincia *</label>
                                <input
                                  type="text"
                                  required
                                  value={partsForm.province}
                                  onChange={(e) => setPartsForm({ ...partsForm, province: e.target.value })}
                                  className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white"
                                />
                              </div>

                              <div className="sm:col-span-2">
                                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Descripción *</label>
                                <textarea
                                  required
                                  rows={4}
                                  value={partsForm.description}
                                  onChange={(e) => setPartsForm({ ...partsForm, description: e.target.value })}
                                  className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white"
                                />
                              </div>
                            </div>
                          </Step>

                          <Step>
                            <h3 className="font-heading text-xl font-semibold border-b border-[#001F58]/15 pb-3 mb-5 flex items-center gap-2">
                              <FileText className="w-5 h-5 text-red-600" />
                              Paso 3: Imágenes y Publicación
                            </h3>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                              {SUGGESTED_SLOTS.slice(0, 5).map((slot, idx) => {
                                const img = images[idx];
                                return (
                                  <div key={idx} className="relative aspect-square rounded-2xl border-2 border-dashed border-[#001F58]/20 bg-white flex flex-col items-center justify-center p-2 text-center group hover:border-[#001F58] transition-all overflow-hidden">
                                    {img ? (
                                      <>
                                        <Image src={img.preview} alt="Preview" fill className="object-cover" />
                                        <button type="button" onClick={() => removeImage(idx)} className="absolute top-1.5 right-1.5 bg-red-600 text-white p-1 rounded-full shadow-md z-10 cursor-pointer">
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    ) : (
                                      <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                        <Upload className="w-5 h-5 text-[#001F58]/40 mb-1" />
                                        <span className="text-xs font-bold text-[#001F58]">{slot.label}</span>
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                      </label>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            <button
                              type="submit"
                              disabled={isPublishing}
                              className="w-full py-4 px-6 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                              <CreditCard className="w-5 h-5" />
                              <span>{isPublishing ? "Publicando producto..." : "Publicar Ahora"}</span>
                              <ArrowRight className="w-5 h-5" />
                            </button>
                          </Step>
                        </Stepper>
                      )}

                    </div>
                  </form>
                </div>

                {/* Formulario Asistido (Sidebar) */}
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

                    {managedSuccess ? (
                      <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-xs font-semibold text-center space-y-2">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                        <p>¡Solicitud enviada con éxito! Te contactaremos a la brevedad.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleManagedSubmit} className="space-y-4">
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/90 mb-1">
                            Tu Nombre *
                          </label>
                          <input
                            type="text"
                            required
                            value={managedListingForm.name}
                            onChange={(e) => setManagedListingForm({ ...managedListingForm, name: e.target.value })}
                            className="w-full px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/90 mb-1">
                            WhatsApp *
                          </label>
                          <input
                            type="tel"
                            required
                            value={managedListingForm.whatsapp}
                            onChange={(e) => setManagedListingForm({ ...managedListingForm, whatsapp: e.target.value })}
                            className="w-full px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/90 mb-1">
                            ¿Qué querés vender?
                          </label>
                          <select
                            value={managedListingForm.itemType}
                            onChange={(e) => setManagedListingForm({ ...managedListingForm, itemType: e.target.value })}
                            className="w-full px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none [&>option]:text-black"
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
                            value={managedListingForm.description}
                            onChange={(e) => setManagedListingForm({ ...managedListingForm, description: e.target.value })}
                            className="w-full px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmittingManaged}
                          className="w-full py-3 px-4 rounded-xl font-semibold bg-white text-[#001F58] hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 text-sm shadow-md disabled:opacity-50 cursor-pointer"
                        >
                          <Send className="w-4 h-4 text-red-600" />
                          <span>{isSubmittingManaged ? "Enviando..." : "Solicitar Asistencia"}</span>
                        </button>
                      </form>
                    )}
                  </div>
                </div>

            </div>
        </div>
    </main>
    );
}