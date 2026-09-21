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
    HelpCircle,
    Send,
    AlertCircle,
    Upload,
    Paperclip,
    Search,
    X,
    GripHorizontal,
    Rocket
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
    DURG: string;
    description: string;
}

interface PropellerInput {
    brand: string;
    model: string;
    propellerHours: string;
    description: string;
}

export default function PublishForm({
    userId,
    categoriesData = [],
    brandsData = [],
    spareCategoriesData = []
}: PublishFormProps) {
    const errorRef = useRef<HTMLDivElement>(null);

    // Sistema de Pasos
    const [activeTab, setActiveTab] = useState<"aircraft" | "parts">("aircraft");    
    const [currentStep, setCurrentStep] = useState(1);

    // Combobox (Aeronaves compatibles)
    const allAircraftModels = useMemo(() => {
        const list: string[] = [];
        brandsData.forEach(b => {
            b.models.forEach(m => list.push(`${b.name} ${m.name}`));
        });
        return list;
    }, [brandsData]);
    const [searchModel, setSearchModel] = useState("");
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const [compatibleModels, setCompatibleModels] = useState<string[]>([]);

    const filteredModels = useMemo(() => {
        if (!searchModel) return allAircraftModels.slice(0, 10);
        return allAircraftModels.filter(m => m.toLowerCase().includes(searchModel.toLowerCase())).slice(0, 10);
    }, [searchModel, allAircraftModels]);

    const addCompatibleModel = (model: string) => {
        if (!compatibleModels.includes(model)) {
            setCompatibleModels([...compatibleModels, model]);
        }
        setSearchModel("");
        setShowModelDropdown(false);
    };

    const removeCompatibleModel = (model: string) => {
        setCompatibleModels(compatibleModels.filter(m => m !== model));
    };

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

    const currentYear = new Date().getFullYear();

    // ESTADO: Formulario de aeronaves
    const [aircraftForm, setAircraftForm] = useState({
        title: "",
        year: currentYear,
        condition: "USADO" as "USADO" | "NUEVO",
        price: "",
        priceOnRequest: false,
        brandId: "",
        customBrand: "",
        modelId: "",
        subModelId: "",
        customModel: "",
        categoryId: "",
        engineType: "PISTON" as "PISTON" | "TURBOPROP",
        totalTimeHours: "",
        financing: false,
        trade: false,
        rent: false,
        avDescription: "",
        avAaptoifr: false,
        avAutopilot: false,
        certified: false,
        certDate: "",
        plate: "",
        city: "",
        province: "",
        intDescription: "",
        passengers: "",
        airconditioner: false,
        oxygen: false,
        extDescription: "",
        description: "",
    });

    useEffect(() => {
        if (aircraftForm.year !== currentYear) {
            setAircraftForm(prev => ({ ...prev, condition: "USADO" }));
        }
    }, [aircraftForm.year, currentYear]);

    const [engines, setEngines] = useState<EngineInput[]>([]);
    const [propellers, setPropellers] = useState<PropellerInput[]>([]);

    // ESTADO: Formulario de repuestos
    const [partsForm, setPartsForm] = useState({
        title: "",
        brand: "",
        price: "",
        inPesos: false,
        priceOnRequest: false,
        condition: "NUEVO",
        city: "",
        province: "",
        description: "",
        partNumber: "",
        stock: "1",
        categoryId: "",
    });

    // ESTADO: Archivos
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
        }));
        setSelectedBrandModels(foundBrand?.models || []);
        setSelectedModelVariants([]);
    };

    const handleModelChange = (modelId: string) => {
      if (modelId === "CUSTOM_MODEL") {
        setSelectedModelVariants([]);
        setAircraftForm((prev) => ({ ...prev, modelId: "CUSTOM_MODEL", subModelId: "", customModel: "" }));
        return;
      }
      const foundModel = selectedBrandModels.find((m) => m.id === modelId);
      const targetCategory = foundModel?.defaultCategoryId || aircraftForm.categoryId;
      setSelectedModelVariants(foundModel?.variants || []);
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
      const targetCategory = foundVariant?.categoryOverride || currentModel?.defaultCategoryId || aircraftForm.categoryId;
      setAircraftForm((prev) => ({
        ...prev,
        subModelId,
        categoryId: targetCategory,
      }));
    };

    const addEngine = () => setEngines([...engines, { brand: "", model: "", engineHours: "", TBO: "", DURG: "", description: "" }]);
    const removeEngine = (index: number) => {
        const updatedEngines = engines.filter((_, i) => i !== index);
        setEngines(updatedEngines);
        if (propellers.length > updatedEngines.length) {
            setPropellers(propellers.slice(0, updatedEngines.length));
        }
    };
    const updateEngine = (index: number, field: keyof EngineInput, value: string) => {
        const updated = [...engines];
        updated[index][field] = value;
        setEngines(updated);
    };

    const addPropeller = () => {
        if (propellers.length >= engines.length) {
            setErrorAndScroll("La cantidad de hélices no puede ser mayor a la cantidad de motores agregados.");
            return;
        }
        setFormError(null);
        setPropellers([...propellers, { brand: "", model: "", propellerHours: "", description: "" }]);
    };
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

      if (images.length + filesArray.length > 15) {
        setErrorAndScroll("Solo podés subir un máximo de 15 imágenes.");
        return;
      }

      const newImages = filesArray.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));

      setImages((prev) => [...prev, ...newImages]);
      e.target.value = '';
    };

    const removeImage = (index: number) => {
      setImages((prev) => {
        const updated = [...prev];
        URL.revokeObjectURL(updated[index].preview);
        updated.splice(index, 1);
        return updated;
      });
    };

    const onDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.dataTransfer.setData("imgIndex", index.toString());
    };

    const onDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); };

    const onDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
        e.preventDefault();
        const dragIndex = parseInt(e.dataTransfer.getData("imgIndex"));
        if (dragIndex === dropIndex || isNaN(dragIndex)) return;
        const newImages = [...images];
        const draggedImage = newImages[dragIndex];
        newImages.splice(dragIndex, 1);
        newImages.splice(dropIndex, 0, draggedImage);
        setImages(newImages);
    };

    const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      const filesArray = Array.from(e.target.files);
      setDocuments((prev) => [...prev, ...filesArray]);
      e.target.value = '';
    };
    const removeDocument = (index: number) => setDocuments((prev) => prev.filter((_, i) => i !== index));

    // ==========================================
    // NUEVO: VALIDACIÓN DINÁMICA POR PASO
    // ==========================================
    const validateStep = (tab: "aircraft" | "parts", step: number): string | null => {
        if (tab === "aircraft") {
            if (step === 1) {
                if (!aircraftForm.title.trim()) return "Falta el Título de la publicación.";
                if (isNaN(Number(aircraftForm.year)) || aircraftForm.year < 1900 || aircraftForm.year > currentYear) return "Año inválido.";
                if (!aircraftForm.priceOnRequest && (!aircraftForm.price || Number(aircraftForm.price) < 0)) return "Ingrese el Precio (o marque 'A Consultar').";
                if (aircraftForm.totalTimeHours === "" || Number(aircraftForm.totalTimeHours) < 0) return "Faltan las Horas Totales.";
                if (!aircraftForm.brandId) return "Seleccione una Marca.";
                if (aircraftForm.brandId === "CUSTOM" && !aircraftForm.customBrand.trim()) return "Ingrese la Marca personalizada.";
                if (!aircraftForm.modelId) return "Seleccione un Modelo.";
                if (aircraftForm.modelId === "CUSTOM_MODEL" && !aircraftForm.customModel.trim()) return "Ingrese el Modelo personalizado.";
                if (!aircraftForm.categoryId) return "Seleccione una Categoría.";
            }
            if (step === 2) {
                if (!aircraftForm.avDescription.trim()) return "La descripción de Aviónica es obligatoria.";
                for (let i = 0; i < engines.length; i++) {
                    if (!engines[i].TBO) return `El TBO del Motor #${i + 1} es obligatorio.`;
                }
                if (propellers.length > engines.length) return "Demasiadas hélices (máximo igual a la cantidad de motores).";
            }
            if (step === 3) {
                if (images.length === 0) return "Debe adjuntar al menos una imagen.";
                if (!aircraftForm.certified) return "Debe confirmar si cuenta con habilitación anual.";
            }
        } else {
            if (step === 1) {
                if (!partsForm.title.trim()) return "Falta el Título del repuesto.";
                if (!partsForm.priceOnRequest && (!partsForm.price || Number(partsForm.price) < 0)) return "Ingrese el Precio (o marque 'A Consultar').";
            }
            if (step === 2) {
                if (images.length === 0) return "Debe adjuntar al menos una imagen.";
                if (!partsForm.city.trim() || !partsForm.province.trim()) return "Ciudad y Provincia son obligatorias.";
                if (!partsForm.description.trim()) return "La Descripción del repuesto es obligatoria.";
            }
            if (step === 3) {
                if (!partsForm.stock || Number(partsForm.stock) < 1) return "El stock mínimo es de 1 unidad.";
                if (!selectedParentCategoryId) return "Seleccione la Categoría principal.";
                if (!partsForm.categoryId) return "Seleccione la Subcategoría.";
            }
        }
        return null;
    };

    const currentStepError = validateStep(activeTab, currentStep);

    // Validación Total Final (Submit)
    const validateForm = () => {
        for (let i = 1; i <= (activeTab === "aircraft" ? 4 : 3); i++) {
            const err = validateStep(activeTab, i);
            if (err) return err;
        }
        if (activeTab === "aircraft" && (!aircraftForm.description.trim() || !aircraftForm.city.trim() || !aircraftForm.province.trim())) {
            return "Faltan datos en el último paso (Descripción, Ciudad o Provincia).";
        }
        return null;
    };

    const submitForm = async () => {
      setFormError(null);
      const validationError = validateForm();
      if (validationError) {
        setErrorAndScroll(validationError);
        return;
      }

      setIsPublishing(true);
      try {
        const data = new FormData();
        data.append("listingType", activeTab);

        images.forEach((img) => data.append("files", img.file));
        documents.forEach((doc) => data.append("documents", doc));

        if (activeTab === "aircraft") {
          data.append("title", aircraftForm.title.trim());
          data.append("year", aircraftForm.year.toString());
          data.append("condition", aircraftForm.condition);
          data.append("price", aircraftForm.price);
          data.append("priceOnRequest", aircraftForm.priceOnRequest.toString());
          data.append("brandId", aircraftForm.brandId === "CUSTOM" ? "" : aircraftForm.brandId);
          data.append("customBrand", aircraftForm.customBrand.trim());
          data.append("modelId", aircraftForm.modelId === "CUSTOM_MODEL" ? "" : aircraftForm.modelId);
          data.append("subModelId", aircraftForm.subModelId);
          data.append("customModel", aircraftForm.customModel.trim());
          data.append("categoryId", aircraftForm.categoryId);
          data.append("engineType", aircraftForm.engineType);
          data.append("totalTimeHours", aircraftForm.totalTimeHours);
          data.append("financing", aircraftForm.financing.toString());
          data.append("trade", aircraftForm.trade.toString());
          data.append("rent", aircraftForm.rent.toString());
          data.append("avDescription", aircraftForm.avDescription.trim());
          data.append("avAaptoifr", aircraftForm.avAaptoifr.toString());
          data.append("avAutopilot", aircraftForm.avAutopilot.toString());
          data.append("certified", aircraftForm.certified.toString());
          if (aircraftForm.certDate) data.append("certDate", new Date(aircraftForm.certDate).toISOString());
          data.append("plate", aircraftForm.plate.trim());
          data.append("city", aircraftForm.city.trim());
          data.append("province", aircraftForm.province.trim());
          data.append("intDescription", aircraftForm.intDescription.trim());
          data.append("passengers", aircraftForm.passengers.toString());
          data.append("airconditioner", aircraftForm.airconditioner.toString());
          data.append("oxygen", aircraftForm.oxygen.toString());
          data.append("extDescription", aircraftForm.extDescription.trim());
          data.append("description", aircraftForm.description.trim());
          
          data.append("engines", JSON.stringify(engines));
          const mappedPropellers = propellers.map(p => ({
              ...p,
              model: p.brand ? `${p.brand} ${p.model}`.trim() : p.model
          }));
          data.append("propellers", JSON.stringify(mappedPropellers));
        } else {
          data.append("title", partsForm.title.trim());
          data.append("brand", partsForm.brand.trim());
          data.append("price", partsForm.price);
          data.append("inPesos", partsForm.inPesos.toString());
          data.append("priceOnRequest", partsForm.priceOnRequest.toString());
          data.append("condition", partsForm.condition);
          data.append("city", partsForm.city.trim());
          data.append("province", partsForm.province.trim());
          data.append("description", partsForm.description.trim());
          data.append("partNumber", partsForm.partNumber.trim());
          data.append("stock", partsForm.stock.toString());
          data.append("categoryId", partsForm.categoryId); 
          data.append("aircrafts", JSON.stringify(compatibleModels));
        }

        await createListing(data);
        setIsSuccess(true);
      } catch (error) {
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
        setErrorAndScroll("Error al enviar la solicitud.");
      }
      setIsSubmittingManaged(false);
    };

    if (userId === null) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-4">
          <h2 className="text-2xl font-bold text-[#001F58]">Debes iniciar sesión</h2>
          <Link href="/login" className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-semibold">Iniciar Sesión</Link>
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
        <Image src="/bkg-forms.png" alt="Fondo" fill priority className="-z-20 object-cover" />
        <div className="absolute inset-0 -z-10 bg-background/85" />

        <div className="container mx-auto px-4 pt-16 pb-36 max-w-7xl">
            <div className="text-center max-w-3xl mx-auto mb-10">
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

            <div className="flex justify-center mb-8">
              <div className="bg-white/80 p-1.5 rounded-2xl border border-[#001F58]/20 flex gap-2 shadow-sm backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => { 
                      setActiveTab("aircraft"); 
                      setFormError(null); 
                      setCurrentStep(1); // Reiniciar al paso 1 al cambiar
                  }}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    activeTab === "aircraft" ? "bg-[#001F58] text-white shadow-md" : "text-[#001F58]/70 hover:text-[#001F58] hover:bg-[#001F58]/5"
                  }`}
                >
                  <Plane className="w-4 h-4" /> Aeronaves
                </button>
                <button
                  type="button"
                  onClick={() => { 
                      setActiveTab("parts"); 
                      setFormError(null); 
                      setCurrentStep(1); // Reiniciar al paso 1 al cambiar
                  }}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    activeTab === "parts" ? "bg-[#001F58] text-white shadow-md" : "text-[#001F58]/70 hover:text-[#001F58] hover:bg-[#001F58]/5"
                  }`}
                >
                  <Wrench className="w-4 h-4" /> Repuestos
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2">
                    <div className="bg-white/90 border border-[#001F58]/20 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl text-[#001F58]">
                        
                        {/* ======================= FORMULARIO AVIONES ======================= */}
                        {activeTab === "aircraft" ? (
                            <Stepper 
                                key="stepper-aircraft" // Forzar desmontaje y reinicio completo al cambiar pestaña
                                backButtonText="← Volver" 
                                nextButtonText="Siguiente Paso"
                                disableStepIndicators={true} // Bloquea los clics en los números superiores
                                onStepChange={(step) => setCurrentStep(step)}
                                backButtonProps={{ 
                                    type: "button", 
                                    className: "px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors" 
                                }}
                                nextButtonProps={{ 
                                    type: "button", 
                                    disabled: !!currentStepError, // Bloquea el botón si hay error
                                    title: currentStepError || "Avanzar al siguiente paso",
                                    className: `px-6 py-2.5 rounded-xl font-bold transition-all shadow-md ${
                                        currentStepError
                                            ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                                            : "bg-[#001F58] text-white hover:bg-blue-900"
                                    }`,
                                    style: currentStep === 4 ? { display: 'none' } : {} 
                                }}
                            >
                                {/* PASO 1: DATOS PRINCIPALES */}
                                <Step>
                                    <div className="space-y-6">
                                        <div className="pb-4 border-b border-slate-200">
                                            <h3 className="font-heading text-xl font-semibold flex items-center gap-2">
                                                <Plane className="w-5 h-5 text-red-600" />
                                                Paso 1: Datos principales de la aeronave
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-1">Completa la información básica obligatoria para identificar tu aeronave.</p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-bold uppercase mb-1">Título de Publicación *</label>
                                                <input type="text" value={aircraftForm.title} onChange={e => setAircraftForm({...aircraftForm, title: e.target.value})} placeholder="Ej: Cessna 172 Skyhawk" className="w-full p-2.5 rounded-xl border border-slate-300 bg-white" />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1">Año *</label>
                                                <input type="number" min="1900" max={currentYear} value={aircraftForm.year} onChange={e => setAircraftForm({...aircraftForm, year: Number(e.target.value)})} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white" />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1">Condición *</label>
                                                <select value={aircraftForm.condition} onChange={e => setAircraftForm({...aircraftForm, condition: e.target.value as any})} disabled={aircraftForm.year !== currentYear} className="w-full p-2.5 rounded-xl border border-slate-300 disabled:bg-slate-100 bg-white">
                                                    <option value="USADO">Usado</option>
                                                    {aircraftForm.year === currentYear && <option value="NUEVO">Nuevo</option>}
                                                </select>
                                                {aircraftForm.year !== currentYear && <p className="text-[10px] text-slate-400 mt-1">Solo los modelos del año {currentYear} pueden marcarse como Nuevos.</p>}
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1">Precio (USD) *</label>
                                                <input type="number" min="0" disabled={aircraftForm.priceOnRequest} placeholder={aircraftForm.priceOnRequest ? "A Consultar" : "Ej: 150000"} value={aircraftForm.price} onChange={e => setAircraftForm({...aircraftForm, price: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white disabled:bg-slate-100" />
                                                <label className="flex items-center gap-2 mt-2 text-xs font-semibold cursor-pointer">
                                                    <input type="checkbox" checked={aircraftForm.priceOnRequest} onChange={e => setAircraftForm({...aircraftForm, priceOnRequest: e.target.checked, price: ""})} className="rounded text-[#001F58]" /> 
                                                    Precio a Consultar
                                                </label>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1">Horas Totales (TT) *</label>
                                                <input type="number" min="0" placeholder="Ej: 3200" value={aircraftForm.totalTimeHours} onChange={e => setAircraftForm({...aircraftForm, totalTimeHours: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white" />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1">Marca *</label>
                                                <select value={aircraftForm.brandId} onChange={(e) => handleBrandChange(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white">
                                                    <option value="">Seleccionar Marca</option>
                                                    {brandsData.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                    <option value="CUSTOM">Otra Marca...</option>
                                                </select>
                                                {aircraftForm.brandId === "CUSTOM" && <input type="text" placeholder="Escribí la marca" value={aircraftForm.customBrand} onChange={e => setAircraftForm({...aircraftForm, customBrand: e.target.value})} className="w-full mt-2 p-2.5 rounded-xl border border-slate-300 bg-white" />}
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1">Modelo/Submodelo *</label>
                                                <select value={aircraftForm.modelId} onChange={(e) => handleModelChange(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white">
                                                    <option value="">Seleccionar Modelo</option>
                                                    {selectedBrandModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                                    <option value="CUSTOM_MODEL">Otro modelo...</option>
                                                </select>
                                                {aircraftForm.modelId === "CUSTOM_MODEL" && <input type="text" placeholder="Escribí el modelo" value={aircraftForm.customModel} onChange={e => setAircraftForm({...aircraftForm, customModel: e.target.value})} className="w-full mt-2 p-2.5 rounded-xl border border-slate-300 bg-white" />}
                                                
                                                {selectedModelVariants.length > 0 && aircraftForm.modelId !== "CUSTOM_MODEL" && (
                                                    <select value={aircraftForm.subModelId} onChange={(e) => handleSubModelChange(e.target.value)} className="w-full mt-2 p-2.5 rounded-xl border border-slate-300 bg-white">
                                                        <option value="">(Opcional) Variante específica</option>
                                                        {selectedModelVariants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                                    </select>
                                                )}
                                            </div>

                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-bold uppercase mb-1">Categoría asignada *</label>
                                                <select value={aircraftForm.categoryId} onChange={e => setAircraftForm({...aircraftForm, categoryId: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 font-medium bg-white">
                                                    <option value="">-- Seleccionar Categoría --</option>
                                                    {categoriesData.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                                <p className="text-[10px] text-slate-400 mt-1">Sugerimos una categoría basada en tu modelo, pero podés cambiarla si es necesario.</p>
                                            </div>

                                            {(aircraftForm.categoryId === "MP" || aircraftForm.categoryId === "BP") && (
                                            <div className="sm:col-span-2 bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 space-y-1.5">
                                                <label className="block text-xs font-bold uppercase tracking-wider text-[#001F58]">
                                                Tipo de Motor *
                                                </label>
                                                <select
                                                value={aircraftForm.engineType}
                                                onChange={(e) => setAircraftForm({ ...aircraftForm, engineType: e.target.value as "PISTON" | "TURBOPROP" })}
                                                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-sm text-[#001F58]"
                                                >
                                                <option value="PISTON">Pistón</option>
                                                <option value="TURBOPROP">Turbohélice</option>
                                                </select>
                                                <p className="text-[10px] text-slate-500">
                                                Indicá si la planta motriz de esta categoría es a Pistón o Turbohélice.
                                                </p>
                                            </div>
                                            )}

                                            <div className="sm:col-span-2 pt-4 border-t border-slate-100">
                                                <label className="block text-xs font-bold uppercase mb-2">Opciones de Negociación</label>
                                                <div className="flex flex-wrap gap-6 text-sm font-medium">
                                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={aircraftForm.financing} onChange={e => setAircraftForm({...aircraftForm, financing: e.target.checked})} className="w-4 h-4 rounded text-[#001F58]" /> Permite Financiación</label>
                                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={aircraftForm.trade} onChange={e => setAircraftForm({...aircraftForm, trade: e.target.checked})} className="w-4 h-4 rounded text-[#001F58]" /> Acepta Permuta</label>
                                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={aircraftForm.rent} onChange={e => setAircraftForm({...aircraftForm, rent: e.target.checked})} className="w-4 h-4 rounded text-[#001F58]" /> Disponible p/ Alquiler</label>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* AVISO DE ERROR AL FINAL DEL PASO */}
                                        {currentStepError && (
                                            <div className="p-3 mt-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 shrink-0" />
                                                {currentStepError}
                                            </div>
                                        )}
                                    </div>
                                </Step>

                                {/* PASO 2: EQUIPAMIENTO */}
                                <Step>
                                    <div className="space-y-6">
                                        <div className="pb-4 border-b border-slate-200">
                                            <h3 className="font-heading text-xl font-semibold flex items-center gap-2">
                                                <Gauge className="w-5 h-5 text-red-600" />
                                                Paso 2: Equipamiento
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-1">Detallá la aviónica y el estado de la planta motriz.</p>
                                        </div>

                                        {/* AVIONICA */}
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                                            <h4 className="font-bold uppercase text-xs text-[#001F58]">Aviónica / Radio / Equipamiento</h4>
                                            <div>
                                                <label className="block text-xs font-bold mb-1">Descripción del panel *</label>
                                                <textarea rows={3} placeholder="Ej: Garmin G1000, 2 NAV/COM, Transponder GXR..." value={aircraftForm.avDescription} onChange={e => setAircraftForm({...aircraftForm, avDescription: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white" />
                                            </div>
                                            <div className="flex gap-6 text-sm font-medium">
                                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={aircraftForm.avAaptoifr} onChange={e => setAircraftForm({...aircraftForm, avAaptoifr: e.target.checked})} className="w-4 h-4 rounded text-[#001F58]" /> Apto IFR</label>
                                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={aircraftForm.avAutopilot} onChange={e => setAircraftForm({...aircraftForm, avAutopilot: e.target.checked})} className="w-4 h-4 rounded text-[#001F58]" /> Autopilot</label>
                                            </div>
                                        </div>

                                        {/* MOTOR */}
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-bold uppercase text-xs text-[#001F58]">Motor</h4>
                                                <button type="button" onClick={addEngine} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#001F58]/10 text-[#001F58] hover:bg-[#001F58]/20 transition-colors">
                                                    <Plus className="w-4 h-4" /> Agregar Motor
                                                </button>
                                            </div>
                                            {engines.map((eng, idx) => (
                                                <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-3 relative pt-7">
                                                    <span className="absolute top-2 left-3 text-[10px] font-bold text-[#001F58] uppercase bg-blue-50 px-2 py-0.5 rounded">Motor #{idx + 1}</span>
                                                    <button type="button" onClick={() => removeEngine(idx)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-[10px] uppercase flex items-center gap-1"><Trash2 className="w-3 h-3" /> Quitar</button>
                                                    
                                                    <div><label className="text-[10px] font-bold uppercase mb-1 block">Marca</label><input type="text" placeholder="Ej: Lycoming" value={eng.brand} onChange={e => updateEngine(idx, "brand", e.target.value)} className="w-full p-2 text-xs rounded-xl border border-slate-300" /></div>
                                                    <div><label className="text-[10px] font-bold uppercase mb-1 block">Modelo</label><input type="text" placeholder="Ej: O-320" value={eng.model} onChange={e => updateEngine(idx, "model", e.target.value)} className="w-full p-2 text-xs rounded-xl border border-slate-300" /></div>
                                                    <div><label className="text-[10px] font-bold uppercase mb-1 block">TBO *</label><input type="number" min="0" placeholder="Ej: 2000" value={eng.TBO} onChange={e => updateEngine(idx, "TBO", e.target.value)} className="w-full p-2 text-xs rounded-xl border border-slate-300" /></div>
                                                    <div><label className="text-[10px] font-bold uppercase mb-1 block">DURG</label><input type="number" min="0" placeholder="Ej: 500" value={eng.DURG} onChange={e => updateEngine(idx, "DURG", e.target.value)} className="w-full p-2 text-xs rounded-xl border border-slate-300" /></div>
                                                    <div className="col-span-2"><label className="text-[10px] font-bold uppercase mb-1 block">Descripción Adicional</label><input type="text" placeholder="Detalles de cilindros, overhaul o accesorios." value={eng.description} onChange={e => updateEngine(idx, "description", e.target.value)} className="w-full p-2 text-xs rounded-xl border border-slate-300" /></div>
                                                </div>
                                            ))}
                                            {engines.length === 0 && <p className="text-xs text-slate-500 italic bg-white/50 p-2 rounded text-center">No hay motores agregados.</p>}
                                        </div>

                                        {/* HÉLICE */}
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <h4 className="font-bold uppercase text-xs text-[#001F58]">Hélice</h4>
                                                    <p className="text-[10px] text-slate-400 font-normal">Máximo {engines.length} {engines.length === 1 ? 'hélice' : 'hélices'} (igual o menor al N° de motores)</p>
                                                </div>
                                                <button type="button" onClick={addPropeller} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#001F58]/10 text-[#001F58] hover:bg-[#001F58]/20 transition-colors">
                                                    <Plus className="w-4 h-4" /> Agregar Hélice
                                                </button>
                                            </div>
                                            {propellers.map((prop, idx) => (
                                                <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-3 relative pt-7">
                                                    <span className="absolute top-2 left-3 text-[10px] font-bold text-[#001F58] uppercase bg-blue-50 px-2 py-0.5 rounded">Hélice #{idx + 1}</span>
                                                    <button type="button" onClick={() => removePropeller(idx)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-[10px] uppercase flex items-center gap-1"><Trash2 className="w-3 h-3" /> Quitar</button>

                                                    <div><label className="text-[10px] font-bold uppercase mb-1 block">Marca</label><input type="text" placeholder="Ej: Hartzell" value={prop.brand} onChange={e => updatePropeller(idx, "brand", e.target.value)} className="w-full p-2 text-xs rounded-xl border border-slate-300" /></div>
                                                    <div><label className="text-[10px] font-bold uppercase mb-1 block">Modelo</label><input type="text" placeholder="Ej: HC-C2YR-1BF" value={prop.model} onChange={e => updatePropeller(idx, "model", e.target.value)} className="w-full p-2 text-xs rounded-xl border border-slate-300" /></div>
                                                    <div><label className="text-[10px] font-bold uppercase mb-1 block">Horas Usadas</label><input type="number" min="0" placeholder="Ej: 300" value={prop.propellerHours} onChange={e => updatePropeller(idx, "propellerHours", e.target.value)} className="w-full p-2 text-xs rounded-xl border border-slate-300" /></div>
                                                    <div className="col-span-2"><label className="text-[10px] font-bold uppercase mb-1 block">Descripción Adicional</label><input type="text" placeholder="Detalles de inspección o modelo específico." value={prop.description} onChange={e => updatePropeller(idx, "description", e.target.value)} className="w-full p-2 text-xs rounded-xl border border-slate-300" /></div>
                                                </div>
                                            ))}
                                            {propellers.length === 0 && <p className="text-xs text-slate-500 italic bg-white/50 p-2 rounded text-center">No hay hélices agregadas.</p>}
                                        </div>

                                        {currentStepError && (
                                            <div className="p-3 mt-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 shrink-0" />
                                                {currentStepError}
                                            </div>
                                        )}
                                    </div>
                                </Step>

                                {/* PASO 3: FOTOS Y DOCS */}
                                <Step>
                                    <div className="space-y-6">
                                        <div className="pb-4 border-b border-slate-200">
                                            <h3 className="font-heading text-xl font-semibold flex items-center gap-2">
                                                <Upload className="w-5 h-5 text-red-600" />
                                                Paso 3: Fotos y Documentos
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-1">Mostrale al comprador el estado real de tu aeronave. La primera foto será la portada.</p>
                                        </div>
                                        
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-xs font-bold uppercase">Imágenes (Max 15) *</label>
                                                <span className="text-[10px] text-slate-500 font-medium">Mantén apretado y arrastrá para reordenar</span>
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-3">
                                                {images.map((img, idx) => (
                                                    <div 
                                                        key={idx} 
                                                        draggable 
                                                        onDragStart={(e) => onDragStart(e, idx)}
                                                        onDragOver={onDragOver}
                                                        onDrop={(e) => onDrop(e, idx)}
                                                        className="relative w-28 h-28 rounded-xl border border-slate-300 overflow-hidden cursor-move group shadow-sm"
                                                    >
                                                        <Image src={img.preview} alt={`Foto ${idx}`} fill className="object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <GripHorizontal className="w-6 h-6 text-white" />
                                                        </div>
                                                        <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-600 rounded-lg p-1.5 text-white shadow-md z-10 hover:bg-red-700"><Trash2 className="w-4 h-4" /></button>
                                                        {idx === 0 && <span className="absolute bottom-1 left-1 right-1 text-center bg-[#001F58] text-white text-[10px] font-bold py-0.5 rounded shadow">PORTADA</span>}
                                                    </div>
                                                ))}
                                                {images.length < 15 && (
                                                    <label className="w-28 h-28 rounded-xl border-2 border-dashed border-[#001F58]/30 flex flex-col items-center justify-center cursor-pointer hover:border-[#001F58]/60 bg-slate-50 hover:bg-slate-100 transition-colors">
                                                        <Upload className="w-6 h-6 text-[#001F58]/50 mb-1" />
                                                        <span className="text-[10px] font-bold text-[#001F58]">Agregar Foto</span>
                                                        <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                                                    </label>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4 mt-6">
                                            <h4 className="font-bold uppercase text-xs text-[#001F58]">Documentación (Solo Privado)</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-bold uppercase mb-1">Estado de Habilitación *</label>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <input type="checkbox" checked={aircraftForm.certified} onChange={e => setAircraftForm({...aircraftForm, certified: e.target.checked})} className="w-4 h-4 rounded text-[#001F58]" />
                                                        <span className="text-sm font-medium">Sí, cuenta con anual al día</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold uppercase mb-1">Fecha de habilitación anual</label>
                                                    <input type="date" value={aircraftForm.certDate} onChange={e => setAircraftForm({...aircraftForm, certDate: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 text-sm bg-white" />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-[10px] font-bold uppercase mb-1">Matrícula</label>
                                                    <input type="text" placeholder="Ej: LV-XXX" value={aircraftForm.plate} onChange={e => setAircraftForm({...aircraftForm, plate: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 uppercase bg-white" />
                                                    <p className="text-[10px] text-slate-500 mt-1">La matrícula es únicamente para control interno administrativo, NO será pública.</p>
                                                </div>
                                            </div>

                                            <div className="border-t border-slate-200 pt-3">
                                                <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50 shadow-sm transition-colors">
                                                    <Paperclip className="w-4 h-4 text-[#001F58]" /> Adjuntar Fichas o Informes (PDF/Docs)
                                                    <input type="file" multiple accept=".pdf,.doc,.docx,image/*" onChange={handleDocumentUpload} className="hidden" />
                                                </label>
                                                {documents.map((doc, idx) => (
                                                    <div key={idx} className="flex justify-between items-center p-2.5 mt-2 bg-white rounded-lg border border-slate-200 text-xs shadow-sm">
                                                        <span className="truncate w-3/4 font-medium text-slate-600">{doc.name}</span>
                                                        <button type="button" onClick={() => removeDocument(idx)} className="text-red-600 hover:text-red-800 font-bold px-2">X</button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {currentStepError && (
                                            <div className="p-3 mt-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 shrink-0" />
                                                {currentStepError}
                                            </div>
                                        )}
                                    </div>
                                </Step>

                                {/* PASO 4: DESCRIPCIONES */}
                                <Step>
                                    <div className="space-y-6">
                                        <div className="pb-4 border-b border-slate-200">
                                            <h3 className="font-heading text-xl font-semibold flex items-center gap-2">
                                                <FileText className="w-5 h-5 text-red-600" />
                                                Paso 4: Descripción y otras características
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-1">Brindá los detalles finales sobre la estética y el estado general.</p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1">Ciudad *</label>
                                                <input type="text" placeholder="Ej: San Fernando" value={aircraftForm.city} onChange={e => setAircraftForm({...aircraftForm, city: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1">Provincia *</label>
                                                <input type="text" placeholder="Ej: Buenos Aires" value={aircraftForm.province} onChange={e => setAircraftForm({...aircraftForm, province: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white" />
                                            </div>
                                        </div>

                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                                            <h4 className="font-bold uppercase text-xs text-[#001F58]">Interior</h4>
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase mb-1">Descripción del Interior</label>
                                                <textarea rows={2} placeholder="Ej: Tapizados de cuero beige 9/10, alfombras nuevas en 2021." value={aircraftForm.intDescription} onChange={e => setAircraftForm({...aircraftForm, intDescription: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 text-sm bg-white" />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-[10px] font-bold uppercase mb-1">Cant. Pasajeros</label>
                                                    <input type="number" min="0" placeholder="Ej: 4" value={aircraftForm.passengers} onChange={e => setAircraftForm({...aircraftForm, passengers: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 text-sm bg-white" />
                                                </div>
                                                <div className="flex flex-col justify-center gap-3 mt-4 sm:col-span-2 sm:flex-row sm:justify-start">
                                                    <label className="flex items-center gap-2 text-sm font-medium cursor-pointer"><input type="checkbox" checked={aircraftForm.airconditioner} onChange={e => setAircraftForm({...aircraftForm, airconditioner: e.target.checked})} className="w-4 h-4 rounded text-[#001F58]" /> Aire Acondicionado</label>
                                                    <label className="flex items-center gap-2 text-sm font-medium cursor-pointer"><input type="checkbox" checked={aircraftForm.oxygen} onChange={e => setAircraftForm({...aircraftForm, oxygen: e.target.checked})} className="w-4 h-4 rounded text-[#001F58]" /> Sist. de Oxígeno</label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                                            <h4 className="font-bold uppercase text-xs text-[#001F58]">Exterior</h4>
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase mb-1">Descripción de Pintura / Exterior</label>
                                                <textarea rows={2} placeholder="Ej: Esquema original blanco con franjas azules, pintado en 2018." value={aircraftForm.extDescription} onChange={e => setAircraftForm({...aircraftForm, extDescription: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 text-sm bg-white" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold uppercase mb-1">Descripción General y Comentarios Adicionales *</label>
                                            <textarea required rows={4} placeholder="Explayate sobre el historial, mantenimientos recientes, o motivo de venta de la aeronave..." value={aircraftForm.description} onChange={e => setAircraftForm({...aircraftForm, description: e.target.value})} className="w-full p-3 rounded-xl border border-slate-300 bg-white" />
                                        </div>

                                        <div className="flex justify-end pt-4">
                                            <button 
                                                type="button" 
                                                onClick={submitForm} 
                                                disabled={isPublishing} 
                                                className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-lg disabled:opacity-50 transition-colors"
                                            >
                                                <Rocket className="w-5 h-5" /> {isPublishing ? "Publicando..." : "Finalizar y Publicar"}
                                            </button>
                                        </div>
                                    </div>
                                </Step>
                            </Stepper>
                        ) : (
                        /* ======================= FORMULARIO REPUESTOS ======================= */
                            <Stepper 
                                key="stepper-parts" // Forzar desmontaje y reinicio completo al cambiar pestaña
                                backButtonText="← Volver" 
                                nextButtonText="Siguiente Paso"
                                disableStepIndicators={true} // Bloquea los clics en los números superiores
                                onStepChange={(step) => setCurrentStep(step)}
                                backButtonProps={{ 
                                    type: "button", 
                                    className: "px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors" 
                                }}
                                nextButtonProps={{ 
                                    type: "button", 
                                    disabled: !!currentStepError, // Bloquea el botón si hay error
                                    title: currentStepError || "Avanzar al siguiente paso",
                                    className: `px-6 py-2.5 rounded-xl font-bold transition-all shadow-md ${
                                        currentStepError
                                            ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                                            : "bg-[#001F58] text-white hover:bg-blue-900"
                                    }`,
                                    style: currentStep === 3 ? { display: 'none' } : {} 
                                }}
                            >
                                {/* PASO 1 REPUESTOS */}
                                <Step>
                                    <div className="space-y-6">
                                        <div className="pb-4 border-b border-slate-200">
                                            <h3 className="font-heading text-xl font-semibold flex items-center gap-2">
                                                <Wrench className="w-5 h-5 text-red-600" />
                                                Paso 1: Datos principales del repuesto
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-1">Ingresá la información más importante para clasificar tu producto.</p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-bold uppercase mb-1">Título de Publicación *</label>
                                                <input type="text" placeholder="Ej: Cilindro Lycoming Superior con válvulas" value={partsForm.title} onChange={e => setPartsForm({...partsForm, title: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1">Marca / Fabricante</label>
                                                <input type="text" placeholder="Ej: Lycoming, Superior..." value={partsForm.brand} onChange={e => setPartsForm({...partsForm, brand: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1">Estado del Producto *</label>
                                                <select value={partsForm.condition} onChange={e => setPartsForm({...partsForm, condition: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white">
                                                    <option value="NUEVO">Nuevo</option>
                                                    <option value="USADO">Usado</option>
                                                    <option value="RECORRIDO">Overholeado / Recorrido</option>
                                                    <option value="REPARAR">A Reparar / Core</option>
                                                </select>
                                            </div>
                                            <div className="sm:col-span-2 pt-2">
                                                <label className="block text-xs font-bold uppercase mb-1">Precio *</label>
                                                <div className="flex gap-2 mb-2">
                                                    <input type="number" min="0" disabled={partsForm.priceOnRequest} placeholder={partsForm.priceOnRequest ? "A Consultar" : "Ej: 1200"} value={partsForm.price} onChange={e => setPartsForm({...partsForm, price: e.target.value})} className="flex-1 p-2.5 rounded-xl border border-slate-300 bg-white disabled:bg-slate-100 font-semibold" />
                                                    <select value={partsForm.inPesos ? "ARS" : "USD"} onChange={e => setPartsForm({...partsForm, inPesos: e.target.value === "ARS"})} disabled={partsForm.priceOnRequest} className="p-2.5 rounded-xl border border-slate-300 font-bold bg-slate-50 disabled:bg-slate-100">
                                                        <option value="USD">U$D (Dólares)</option>
                                                        <option value="ARS">ARS$ (Pesos)</option>
                                                    </select>
                                                </div>
                                                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                                                    <input type="checkbox" checked={partsForm.priceOnRequest} onChange={e => setPartsForm({...partsForm, priceOnRequest: e.target.checked, price: ""})} className="rounded text-[#001F58]" /> 
                                                    Precio a Consultar
                                                </label>
                                            </div>
                                        </div>

                                        {currentStepError && (
                                            <div className="p-3 mt-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 shrink-0" />
                                                {currentStepError}
                                            </div>
                                        )}
                                    </div>
                                </Step>

                                {/* PASO 2 REPUESTOS */}
                                <Step>
                                    <div className="space-y-6">
                                        <div className="pb-4 border-b border-slate-200">
                                            <h3 className="font-heading text-xl font-semibold flex items-center gap-2">
                                                <Upload className="w-5 h-5 text-red-600" />
                                                Paso 2: Fotos y Descripción
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-1">Brindá contexto sobre la ubicación y estado visual del producto.</p>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-xs font-bold uppercase">Imágenes (Max 15) *</label>
                                                <span className="text-[10px] text-slate-500 font-medium">Mantén apretado para reordenar</span>
                                            </div>
                                            <div className="flex flex-wrap gap-3">
                                                {images.map((img, idx) => (
                                                    <div key={idx} draggable onDragStart={(e) => onDragStart(e, idx)} onDragOver={onDragOver} onDrop={(e) => onDrop(e, idx)} className="relative w-24 h-24 rounded-xl border border-slate-300 overflow-hidden cursor-move group">
                                                        <Image src={img.preview} alt={`Foto ${idx}`} fill className="object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <GripHorizontal className="w-5 h-5 text-white" />
                                                        </div>
                                                        <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-600 rounded-lg p-1 text-white shadow-md z-10 hover:bg-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                ))}
                                                {images.length < 15 && (
                                                    <label className="w-24 h-24 rounded-xl border-2 border-dashed border-[#001F58]/30 flex flex-col items-center justify-center cursor-pointer hover:border-[#001F58]/60 bg-slate-50 transition-colors">
                                                        <Upload className="w-6 h-6 text-[#001F58]/50 mb-1" />
                                                        <span className="text-[10px] font-bold text-[#001F58]">Agregar</span>
                                                        <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                                                    </label>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1">Ciudad *</label>
                                                <input type="text" placeholder="Ej: Morón" value={partsForm.city} onChange={e => setPartsForm({...partsForm, city: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1">Provincia *</label>
                                                <input type="text" placeholder="Ej: Buenos Aires" value={partsForm.province} onChange={e => setPartsForm({...partsForm, province: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold uppercase mb-1">Descripción del Artículo *</label>
                                            <textarea rows={4} placeholder="Detallá uso, tiempo remanente si aplica, fallas, compatibilidades generales..." value={partsForm.description} onChange={e => setPartsForm({...partsForm, description: e.target.value})} className="w-full p-3 rounded-xl border border-slate-300 bg-white" />
                                        </div>

                                        {currentStepError && (
                                            <div className="p-3 mt-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 shrink-0" />
                                                {currentStepError}
                                            </div>
                                        )}
                                    </div>
                                </Step>

                                {/* PASO 3 REPUESTOS */}
                                <Step>
                                    <div className="space-y-6">
                                        <div className="pb-4 border-b border-slate-200">
                                            <h3 className="font-heading text-xl font-semibold flex items-center gap-2">
                                                <FileText className="w-5 h-5 text-red-600" />
                                                Paso 3: Otras características
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-1">Configurá las variables finales para que los compradores encuentren tu repuesto.</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1">Nro. de Parte (P/N)</label>
                                                <input type="text" placeholder="Opcional" value={partsForm.partNumber} onChange={e => setPartsForm({...partsForm, partNumber: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1">Stock Disponible *</label>
                                                <input type="number" min="1" value={partsForm.stock} onChange={e => setPartsForm({...partsForm, stock: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white" />
                                            </div>

                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="block text-xs font-bold uppercase mb-1">Categoría Padre *</label>
                                                <select value={selectedParentCategoryId} onChange={e => { setSelectedParentCategoryId(e.target.value); setPartsForm(p => ({...p, categoryId: ""})) }} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium">
                                                    <option value="">Seleccionar principal</option>
                                                    {spareCategoriesData.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>

                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="block text-xs font-bold uppercase mb-1">Subcategoría Específica *</label>
                                                <select value={partsForm.categoryId} onChange={e => setPartsForm({...partsForm, categoryId: e.target.value})} disabled={!selectedParentCategoryId} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium disabled:bg-slate-100">
                                                    <option value="">Seleccionar subcategoría</option>
                                                    {subCategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="p-5 bg-blue-50/50 rounded-xl border border-[#001F58]/10">
                                            <h4 className="font-bold uppercase text-xs text-[#001F58] mb-2">Aeronaves Compatibles</h4>
                                            <p className="text-[10px] text-slate-500 mb-4">Si tu artículo es exclusivo para ciertos modelos de avión, buscalos y marcalos acá. (Ideal para motores, hélices, tren de aterrizaje, frenos, cubiertas y agrícolas).</p>
                                            
                                            <div className="relative max-w-lg">
                                                <div className="flex items-center gap-2 border border-slate-300 rounded-xl p-2.5 bg-white shadow-sm">
                                                    <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                                                    <input 
                                                        type="text" 
                                                        placeholder="Ej: Cessna 150..." 
                                                        value={searchModel}
                                                        onChange={e => { setSearchModel(e.target.value); setShowModelDropdown(true); }}
                                                        onFocus={() => setShowModelDropdown(true)}
                                                        className="w-full text-sm outline-none bg-transparent"
                                                    />
                                                </div>
                                                
                                                {showModelDropdown && (
                                                    <>
                                                        <div className="fixed inset-0 z-10" onClick={() => setShowModelDropdown(false)} />
                                                        <div className="absolute top-full mt-2 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 shadow-xl rounded-xl z-20">
                                                            {filteredModels.length === 0 ? (
                                                                <div className="p-4 text-xs text-slate-500 text-center">No se encontraron modelos.</div>
                                                            ) : (
                                                                filteredModels.map(m => (
                                                                    <div key={m} onClick={() => addCompatibleModel(m)} className="p-3 text-xs hover:bg-slate-50 cursor-pointer font-semibold text-slate-700 border-b border-slate-100 last:border-0">
                                                                        {m}
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {compatibleModels.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#001F58]/10">
                                                    {compatibleModels.map(m => (
                                                        <span key={m} className="inline-flex items-center gap-1.5 bg-white border border-[#001F58]/20 text-[#001F58] px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                                                            {m}
                                                            <button type="button" onClick={() => removeCompatibleModel(m)} className="hover:bg-red-50 hover:text-red-600 rounded p-0.5 transition-colors"><X className="w-3.5 h-3.5" /></button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex justify-end pt-4">
                                            <button 
                                                type="button" 
                                                onClick={submitForm} 
                                                disabled={isPublishing} 
                                                className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-lg disabled:opacity-50 transition-colors"
                                            >
                                                <Rocket className="w-5 h-5" /> {isPublishing ? "Publicando..." : "Finalizar y Publicar"}
                                            </button>
                                        </div>
                                    </div>
                                </Step>
                            </Stepper>
                        )}
                    </div>
                </div>

                {/* Sidebar Asistencia */}
                <div className="lg:col-span-1 hidden lg:block">
                  <div className="bg-[#001F58] text-white rounded-2xl p-6 shadow-xl border border-white/10 sticky top-24">
                    <div className="flex items-center gap-2 text-red-500 font-bold text-xs uppercase tracking-wider mb-2">
                      <HelpCircle className="w-4 h-4" /> ¿Preferís que nos encarguemos?
                    </div>
                    <h3 className="font-heading text-xl font-bold mb-3">Publicación Asistida</h3>
                    <p className="text-xs text-white/80 leading-relaxed mb-6">Dejanos tus datos, una breve descripción, y nuestro equipo preparará la publicación oficial por vos.</p>

                    {managedSuccess ? (
                      <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-xs font-semibold text-center space-y-2">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                        <p>¡Solicitud enviada! Te contactaremos a la brevedad.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleManagedSubmit} className="space-y-4">
                        <div><input type="text" required placeholder="Tu Nombre *" value={managedListingForm.name} onChange={e => setManagedListingForm({...managedListingForm, name: e.target.value})} className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm" /></div>
                        <div><input type="tel" required placeholder="Tu WhatsApp *" value={managedListingForm.whatsapp} onChange={e => setManagedListingForm({...managedListingForm, whatsapp: e.target.value})} className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm" /></div>
                        <div>
                          <select value={managedListingForm.itemType} onChange={e => setManagedListingForm({...managedListingForm, itemType: e.target.value})} className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm [&>option]:text-black">
                            <option value="Aeronave">Quiero vender una Aeronave</option>
                            <option value="Repuesto">Quiero vender un Repuesto</option>
                          </select>
                        </div>
                        <div><textarea rows={3} placeholder="Descripción, ubicación o enlace a fotos del producto..." value={managedListingForm.description} onChange={e => setManagedListingForm({...managedListingForm, description: e.target.value})} className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm" /></div>
                        <button type="submit" disabled={isSubmittingManaged} className="w-full py-3 rounded-xl bg-white text-[#001F58] font-bold flex items-center justify-center gap-2 hover:bg-slate-100 disabled:opacity-50 shadow-md">
                            <Send className="w-4 h-4 text-red-600" /> Solicitar Asistencia
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