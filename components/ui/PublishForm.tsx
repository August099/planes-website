"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createListing, sendManagedListingEmail, updateListing } from "@/app/publish/actions";
import { compressImage } from "@/lib/image-compressor";
import {
    AIRCRAFT_GROUPS,
    ENGINE_LABELS,
    categoriesInGroup,
    categoryDef,
    groupHasEngines,
    resolveCategoryId,
    type EngineKind,
} from "@/lib/aircraft-categories";
import { isRequired, minEngines, requiredMark } from "@/lib/aircraft-rules";
import { discardUploaded, uploadListingFiles } from "@/lib/listing-upload-client";
import { listingSchema, toFieldErrors, MAX_LISTING_IMAGES, type EditListingData, type FieldErrors, type ListingInput } from "@/lib/listing-schema";
import Image from "next/image";
import Link from "next/link";
import Stepper, { Step } from "@/components/ui/Stepper";
import { PageBackground } from "@/components/ui/PageBackground";
import { Plane, Wrench, Plus, Trash2, CheckCircle2, Gauge, FileText, HelpCircle, Send, AlertCircle, Upload, Paperclip, Search, X, GripHorizontal, Rocket } from "lucide-react";
import { PhoneRequiredCard } from "@/components/ui/PhoneRequiredCard";
import { DescriptionTextarea } from "@/components/ui/DescriptionTextarea";
import { ProvinceSelect } from "@/components/ui/ProvinceSelect";

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
    brandsData?: BrandOption[];
    spareCategoriesData?: CategoryOption[];
    // Si viene, el formulario edita esa publicación (/publish?edit=<id>) en vez de crear una.
    editListing?: EditListingData;
    // VA-46: el usuario no tiene teléfono cargado (no puede publicar hasta cargarlo).
    needsPhone?: boolean;
    // VA-152: uso del cupo de la cuenta (solo al crear). limit null = ilimitado.
    quota?: { tier: "FREE" | "PRO" | "BUSINESS" | "ADMIN"; planName: string; aircraft: QuotaLine; parts: QuotaLine };
    // VA-152: hay planes pagos activos en /plans (si no, no se ofrece "Pasarme a Pro").
    plansAvailable?: boolean;
}

type QuotaLine = { used: number; limit: number | null };

// VA-152: "Ya tenés 1 avión activo, que es el cupo de tu plan Gratis" (o, si quedó por encima del
// cupo, "Tenés 5 aviones activos y el cupo de tu plan Gratis es de 1").
function quotaFullText(tab: "aircraft" | "parts", used: number, limit: number, planName: string) {
    const word = (n: number) => (tab === "aircraft" ? (n === 1 ? "avión activo" : "aviones activos") : n === 1 ? "repuesto activo" : "repuestos activos");
    return used > limit
        ? `Tenés ${used} ${word(used)} y el cupo de tu plan ${planName} es de ${limit}`
        : `Ya tenés ${used} ${word(used)}, que es el cupo de tu plan ${planName}`;
}

interface EngineInput {
    brand: string;
    model: string;
    engineHours: string;
    TBO: string;
    horsepower: string;
    description: string;
}

interface PropellerInput {
    brand: string;
    model: string;
    propellerHours: string;
    description: string;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DOCUMENT_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ...IMAGE_TYPES,
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Error de validación debajo de un campo (viene del mismo esquema que usa el servidor).
function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return <p className="text-[11px] text-red-600 font-semibold mt-1">{message}</p>;
}

const EMPTY_ENGINE: EngineInput = { brand: "", model: "", engineHours: "", TBO: "", horsepower: "", description: "" };

export default function PublishForm({
    userId,
    brandsData = [],
    spareCategoriesData = [],
    editListing,
    needsPhone = false,
    quota,
    plansAvailable = false
}: PublishFormProps) {
    const errorRef = useRef<HTMLDivElement>(null);
    const isEditing = !!editListing;
    const [phoneMissing, setPhoneMissing] = useState(needsPhone && !isEditing);

    // Sistema de Pasos
    const [activeTab, setActiveTab] = useState<"aircraft" | "parts">(editListing?.type ?? "aircraft");
    // VA-152: sin cupo libre, el usuario puede elegir guardarlo pausado (por tipo de aviso).
    const [saveAsPaused, setSaveAsPaused] = useState<{ aircraft: boolean; parts: boolean }>({ aircraft: false, parts: false });
    const quotaLine = quota ? (activeTab === "aircraft" ? quota.aircraft : quota.parts) : null;
    const quotaFull = !isEditing && !!quotaLine && quotaLine.limit !== null && quotaLine.used >= quotaLine.limit;
    const [currentStep, setCurrentStep] = useState(1);

    // Controla si el usuario ya intentó avanzar en el paso actual.
    // Mientras esté en false, no se muestran las advertencias de campos faltantes.
    const [stepAttempted, setStepAttempted] = useState(false);

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
    const [compatibleModels, setCompatibleModels] = useState<string[]>(editListing?.parts?.aircrafts ?? []);

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

    // Marca inicial: la de la publicación que se edita o, si no hay, la primera de la lista.
    // Antes se completaba en un efecto después del primer render (VA-63).
    const initialBrandId = editListing?.aircraft?.brandId || brandsData[0]?.id || "";
    const [selectedBrandModels, setSelectedBrandModels] = useState<ModelOption[]>(
        () => brandsData.find((b) => b.id === initialBrandId)?.models ?? []
    );
    const [selectedModelVariants, setSelectedModelVariants] = useState<SubModelOption[]>(
        () =>
            brandsData
                .find((b) => b.id === editListing?.aircraft?.brandId)
                ?.models.find((m) => m.id === editListing?.aircraft?.modelId)?.variants ?? []
    );
    const [selectedParentCategoryId, setSelectedParentCategoryId] = useState<string>(editListing?.parts?.parentCategoryId ?? "");
    const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string>(editListing?.parts?.subCategoryId ?? "");

    const subCategories = useMemo(() => {
      const parent = spareCategoriesData.find((cat) => cat.id === selectedParentCategoryId);
      return parent?.children || [];
    }, [selectedParentCategoryId, spareCategoriesData]);

    // Nivel adicional: algunas subcategorías tienen a su vez "sub-subcategorías".
    // Si existen, hay que mostrarlas y obligar a elegir siempre lo más específico.
    const subSubCategories = useMemo(() => {
      const sub = subCategories.find((cat) => cat.id === selectedSubCategoryId);
      return sub?.children || [];
    }, [selectedSubCategoryId, subCategories]);

    const handleParentCategoryChange = (id: string) => {
        setSelectedParentCategoryId(id);
        setSelectedSubCategoryId("");
        setPartsForm((p) => ({ ...p, categoryId: "" }));
    };

    const handleSubCategoryChange = (id: string) => {
        setSelectedSubCategoryId(id);
        const sub = subCategories.find((c) => c.id === id);
        const hasChildren = !!(sub?.children && sub.children.length > 0);
        // Si la subcategoría elegida no tiene hijos, ya es la categoría final.
        // Si tiene hijos, se deja categoryId vacío hasta que elijan la sub-subcategoría.
        setPartsForm((p) => ({ ...p, categoryId: hasChildren ? "" : id }));
    };

    const handleSubSubCategoryChange = (id: string) => {
        setPartsForm((p) => ({ ...p, categoryId: id }));
    };

    const [managedListingForm, setManagedListingForm] = useState({
        name: "",
        whatsapp: "",
        itemType: "Aeronave",
        description: "",
    });

    const router = useRouter();
    const [isPublishing, setIsPublishing] = useState(false);
    // Candado contra doble clic: el estado de React tarda un render en actualizarse.
    const submittingRef = useRef(false);
    const [publishStatus, setPublishStatus] = useState<string | null>(null);
    const [compressing, setCompressing] = useState<{ done: number; total: number } | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [isSubmittingManaged, setIsSubmittingManaged] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [managedSuccess, setManagedSuccess] = useState(false);

    const currentYear = new Date().getFullYear();

    // Solo los modelos del año en curso pueden ser "Nuevo"; la marca vacía toma la inicial.
    const withInitialFixes = <T extends { year: number; condition: "USADO" | "NUEVO"; brandId: string }>(form: T): T => ({
        ...form,
        brandId: form.brandId || initialBrandId,
        condition: form.year === currentYear ? form.condition : "USADO",
    });

    // ESTADO: Formulario de aeronaves
    const [aircraftForm, setAircraftForm] = useState(() => withInitialFixes(editListing?.aircraft ?? {
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
        totalTimeHours: "",
        financing: false,
        trade: false,
        rent: false,
        negotiable: false,
        extraEquipment: "",
        agEquipment: "",
        avDescription: "",
        avAaptoifr: false,
        avAutopilot: false,
        certified: null as boolean | null,
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
    }));

    // VA-43: "Tipo de aeronave" + "Motorización" resuelven la categoría (MP/MT/BP/BT/...).
    // pendingGroup guarda el tipo elegido mientras todavía falta la motorización.
    const [pendingGroup, setPendingGroup] = useState("");
    const selectedGroup = categoryDef(aircraftForm.categoryId)?.group ?? pendingGroup;
    const selectedEngine = categoryDef(aircraftForm.categoryId)?.engine ?? null;

    // Nueva categoría + limpieza de "Implementos agrícolas" si deja de ser Agrícola (VA-54).
    const withCategory = <T extends { categoryId: string; agEquipment: string }>(prev: T, categoryId: string): T => ({
        ...prev,
        categoryId,
        agEquipment: categoryId === "A" ? prev.agEquipment : "",
    });

    const handleGroupChange = (group: string) => {
        setPendingGroup(group);
        // Monomotor/Bimotor: se conserva la motorización si ya estaba elegida.
        setAircraftForm((prev) => withCategory(prev, resolveCategoryId(group, categoryDef(prev.categoryId)?.engine)));
    };

    const handleEngineChange = (engine: EngineKind) => {
        setAircraftForm((prev) => withCategory(prev, resolveCategoryId(selectedGroup, engine)));
    };

    // VA-90: el alta arranca con un motor vacío, así no hay que buscar "Agregar Motor".
    const [engines, setEngines] = useState<EngineInput[]>(editListing?.engines ?? [{ ...EMPTY_ENGINE }]);
    const [propellers, setPropellers] = useState<PropellerInput[]>(editListing?.propellers ?? []);

    // ESTADO: Formulario de repuestos
    const [partsForm, setPartsForm] = useState(() => editListing?.parts ?? {
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
    // Fotos: las que ya tenía la publicación (url) y las nuevas (file), en el orden elegido.
    const [images, setImages] = useState<{ file?: File; url?: string; preview: string }[]>(
        () => editListing?.images.map((url) => ({ url, preview: url })) ?? []
    );
    const [documents, setDocuments] = useState<File[]>([]);
    const [existingDocuments, setExistingDocuments] = useState<{ name: string; url: string }[]>(editListing?.documents ?? []);

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
        ...withCategory(prev, targetCategory),
        modelId,
        subModelId: "",
        customModel: "",
      }));
    };

    const handleSubModelChange = (subModelId: string) => {
      const foundVariant = selectedModelVariants.find((v) => v.id === subModelId);
      const currentModel = selectedBrandModels.find((m) => m.id === aircraftForm.modelId);
      const targetCategory = foundVariant?.categoryOverride || currentModel?.defaultCategoryId || aircraftForm.categoryId;
      setAircraftForm((prev) => ({
        ...withCategory(prev, targetCategory),
        subModelId,
      }));
    };

    const addEngine = () => setEngines([...engines, { ...EMPTY_ENGINE }]);
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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      const filesArray = Array.from(e.target.files);
      e.target.value = "";
      setFormError(null);

      if (images.length + filesArray.length > MAX_LISTING_IMAGES) {
        setErrorAndScroll(`Solo podés subir un máximo de ${MAX_LISTING_IMAGES} imágenes.`);
        return;
      }

      // Mismo criterio que el servidor (lib/upload-validation.ts): JPG, PNG o WebP de hasta 10 MB.
      const invalid = filesArray.find((file) => !IMAGE_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE);
      if (invalid) {
        setErrorAndScroll(`"${invalid.name}" debe ser una imagen JPG, PNG o WebP de hasta 10 MB.`);
        return;
      }

      // Las fotos de celular (3–6 MB) se comprimen acá (máx. 1920 px y ~0,8 MB) antes de subirlas.
      setCompressing({ done: 0, total: filesArray.length });
      const compressed: File[] = [];
      for (const file of filesArray) {
        compressed.push(await compressImage(file, "listings"));
        setCompressing({ done: compressed.length, total: filesArray.length });
      }
      setCompressing(null);

      const newImages = compressed.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));

      setImages((prev) => [...prev, ...newImages]);
      setFieldErrors((prev) => ({ ...prev, images: "" }));
    };

    const removeImage = (index: number) => {
      setImages((prev) => {
        const updated = [...prev];
        if (updated[index].file) URL.revokeObjectURL(updated[index].preview);
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
      e.target.value = "";
      const invalid = filesArray.find((file) => !DOCUMENT_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE);
      if (invalid) {
        setErrorAndScroll(`"${invalid.name}" debe ser un PDF, Word o imagen de hasta 10 MB.`);
        return;
      }
      setDocuments((prev) => [...prev, ...filesArray]);
    };
    const removeDocument = (index: number) => setDocuments((prev) => prev.filter((_, i) => i !== index));

    // ==========================================
    // VALIDACIÓN DINÁMICA POR PASO
    // ==========================================
    const validateStep = (tab: "aircraft" | "parts", step: number): string | null => {
        if (tab === "aircraft") {
            if (step === 1) {
                if (!aircraftForm.title.trim()) return "Falta el Título de la publicación.";
                if (isNaN(Number(aircraftForm.year)) || aircraftForm.year < 1900 || aircraftForm.year > currentYear) return "Año inválido.";
                if (!aircraftForm.priceOnRequest && (!aircraftForm.price || Number(aircraftForm.price) < 0)) return "Ingrese el Precio (o marque 'A Consultar').";
                if (aircraftForm.totalTimeHours === "" && isRequired("totalTimeHours", aircraftForm.categoryId)) return "Faltan las Horas Totales.";
                if (aircraftForm.totalTimeHours !== "" && Number(aircraftForm.totalTimeHours) < 0) return "Las horas totales no pueden ser negativas.";
                if (!aircraftForm.brandId) return "Seleccione una Marca.";
                if (aircraftForm.brandId === "CUSTOM" && !aircraftForm.customBrand.trim()) return "Ingrese la Marca personalizada.";
                if (!aircraftForm.modelId) return "Seleccione un Modelo.";
                if (aircraftForm.modelId === "CUSTOM_MODEL" && !aircraftForm.customModel.trim()) return "Ingrese el Modelo personalizado.";
                if (!selectedGroup) return "Elegí el tipo de aeronave.";
                if (!aircraftForm.categoryId) return "Elegí la motorización (Pistón o Turbohélice).";
            }
            if (step === 2) {
                if (!aircraftForm.avDescription.trim() && isRequired("avDescription", aircraftForm.categoryId)) return "La descripción de Aviónica es obligatoria.";
                const neededEngines = minEngines(aircraftForm.categoryId);
                if (engines.length < neededEngines) return neededEngines === 2 ? "Un bimotor necesita los dos motores." : "Agregá al menos un motor.";
                for (let i = 0; i < engines.length; i++) {
                    if (!engines[i].brand.trim() && !engines[i].model.trim()) return `Completá la marca o el modelo del Motor #${i + 1}.`;
                }
                for (let i = 0; i < engines.length; i++) {
                    if (!engines[i].TBO && isRequired("TBO", aircraftForm.categoryId)) return `El TBO del Motor #${i + 1} es obligatorio.`;
                }
                if (propellers.length > engines.length) return "Demasiadas hélices (máximo igual a la cantidad de motores).";
            }
            if (step === 3) {
                if (images.length === 0) return "Debe adjuntar al menos una imagen.";
                if (aircraftForm.certified === null) return "Indicá si la aeronave está habilitada (Sí o No).";
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
                if (!selectedSubCategoryId) return "Seleccione la Subcategoría.";
                if (!partsForm.categoryId) return "Seleccione la Subcategoría específica (la opción más detallada disponible).";
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

    // Datos del formulario con la forma que espera el esquema (lib/listing-schema.ts).
    const buildListingInput = (imagePaths: string[], docs: { path: string; name: string }[]): ListingInput =>
      activeTab === "aircraft"
        ? {
            listingType: "aircraft",
            title: aircraftForm.title,
            year: String(aircraftForm.year),
            condition: aircraftForm.condition,
            price: aircraftForm.price,
            priceOnRequest: aircraftForm.priceOnRequest,
            brandId: aircraftForm.brandId === "CUSTOM" ? "" : aircraftForm.brandId,
            customBrand: aircraftForm.brandId === "CUSTOM" ? aircraftForm.customBrand : "",
            modelId: aircraftForm.modelId === "CUSTOM_MODEL" ? "" : aircraftForm.modelId,
            subModelId: aircraftForm.subModelId,
            customModel: aircraftForm.modelId === "CUSTOM_MODEL" ? aircraftForm.customModel : "",
            categoryId: aircraftForm.categoryId,
            totalTimeHours: aircraftForm.totalTimeHours,
            financing: aircraftForm.financing,
            trade: aircraftForm.trade,
            rent: aircraftForm.rent,
            negotiable: aircraftForm.negotiable,
            extraEquipment: aircraftForm.extraEquipment,
            agEquipment: aircraftForm.categoryId === "A" ? aircraftForm.agEquipment : "",
            avDescription: aircraftForm.avDescription,
            avAaptoifr: aircraftForm.avAaptoifr,
            avAutopilot: aircraftForm.avAutopilot,
            // null = sin responder: el esquema lo rechaza con su mensaje.
            certified: aircraftForm.certified as boolean,
            certDate: aircraftForm.certDate,
            plate: aircraftForm.plate,
            city: aircraftForm.city,
            province: aircraftForm.province,
            intDescription: aircraftForm.intDescription,
            extDescription: aircraftForm.extDescription,
            passengers: aircraftForm.passengers,
            airconditioner: aircraftForm.airconditioner,
            oxygen: aircraftForm.oxygen,
            description: aircraftForm.description,
            engines,
            propellers,
            images: imagePaths,
            documents: docs,
          }
        : {
            listingType: "parts",
            title: partsForm.title,
            brand: partsForm.brand,
            price: partsForm.price,
            inPesos: partsForm.inPesos,
            priceOnRequest: partsForm.priceOnRequest,
            condition: partsForm.condition as "NUEVO" | "USADO" | "RECORRIDO" | "REPARAR",
            city: partsForm.city,
            province: partsForm.province,
            description: partsForm.description,
            partNumber: partsForm.partNumber,
            stock: partsForm.stock,
            categoryId: partsForm.categoryId,
            aircrafts: compatibleModels,
            images: imagePaths,
          };

    const showFieldErrors = (errors: FieldErrors, message = "Revisá los campos marcados.") => {
      setFieldErrors(errors);
      const details = [...new Set(Object.values(errors))].filter((d) => d && d !== message);
      setErrorAndScroll(details.length ? `${message} ${details.join(" ")}` : message);
    };

    const submitForm = async () => {
      if (submittingRef.current || compressing) return;
      setFormError(null);
      setFieldErrors({});

      if (phoneMissing) {
        setErrorAndScroll("Para publicar tenés que cargar tu teléfono de contacto (arriba de todo).");
        return;
      }

      const validationError = validateForm();
      if (validationError) {
        setErrorAndScroll(validationError);
        return;
      }

      // Misma validación que el servidor, antes de subir nada (las rutas son provisorias).
      const precheck = listingSchema.safeParse(
        buildListingInput(
          images.map((img, i) => img.url ?? `pendiente-${i}`),
          [
            ...existingDocuments.map((d) => ({ path: d.url, name: d.name })),
            ...documents.map((d, i) => ({ path: `pendiente-${i}`, name: d.name })),
          ]
        )
      );
      if (!precheck.success) {
        showFieldErrors(toFieldErrors(precheck.error));
        return;
      }

      submittingRef.current = true;
      setIsPublishing(true);
      let uploaded: { images: string[]; documents: { path: string; name: string }[] } | null = null;
      try {
        // 1. Fotos y documentos directo a Supabase (no pasan por Vercel).
        setPublishStatus("Subiendo fotos...");
        // En la edición solo se suben las fotos y documentos nuevos.
        const upload = await uploadListingFiles(
          activeTab,
          images.flatMap((img) => (img.file ? [img.file] : [])),
          activeTab === "aircraft" ? documents : [],
          ({ done, total }) => setPublishStatus(`Subiendo archivos ${done}/${total}...`)
        );
        if (!upload.ok) {
          setErrorAndScroll(upload.error);
          return;
        }
        uploaded = upload;

        // 2. Crear (o actualizar) la publicación con las rutas ya subidas. En la edición, las
        //    fotos que ya existían van por URL y las nuevas por su ruta, en el orden elegido.
        setPublishStatus(isEditing ? "Guardando cambios..." : "Guardando publicación...");
        const newPaths = [...upload.images];
        const orderedImages = images.map((img) => img.url ?? newPaths.shift()!);
        const allDocuments = [...existingDocuments.map((d) => ({ path: d.url, name: d.name })), ...upload.documents];
        const input = buildListingInput(orderedImages, allDocuments);
        const res = editListing ? await updateListing(editListing.id, input) : await createListing(input, { saveAsPaused: saveAsPaused[activeTab] });
        // Con o sin éxito, el servidor ya se hizo cargo de estos archivos.
        uploaded = null;
        if (!res.ok) {
          if (res.fieldErrors) showFieldErrors(res.fieldErrors, res.error);
          else setErrorAndScroll(res.error);
          return;
        }

        setPublishStatus(
          isEditing ? "¡Guardado! Abriendo tu aviso..." : res.paused ? "¡Guardado como pausado! Abriendo tu aviso..." : "¡Publicado! Abriendo tu aviso..."
        );
        router.push(res.url);
      } catch (error) {
        console.error("Error al publicar:", error);
        // Si se cortó la red después de subir, se intenta borrar lo subido.
        if (uploaded) await discardUploaded(activeTab, uploaded.images, uploaded.documents);
        setErrorAndScroll(
          isEditing
            ? "Se perdió la conexión al guardar. Revisá tu internet y probá de nuevo: la publicación no se modificó."
            : "Se perdió la conexión al publicar. Revisá tu internet y probá de nuevo: no se creó ninguna publicación."
        );
      } finally {
        submittingRef.current = false;
        setIsPublishing(false);
        setPublishStatus(null);
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

    return (
    <main className="relative isolate overflow-hidden min-h-screen">
        <PageBackground page="publish" />

        <div className="container mx-auto px-4 pt-16 pb-20 max-w-7xl">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <h1 className="font-heading text-3xl sm:text-5xl font-semibold text-[#001F58] mb-4">
                {isEditing ? "EDITAR PUBLICACIÓN" : "PUBLICAR PRODUCTO"}
              </h1>
            </div>

            {/* VA-152: cupo de la cuenta. Sin lugar libre se avisa al empezar (no al final), con las salidas. */}
            {!isEditing && quota && quotaLine && !quotaFull && quotaLine.limit !== null && (
              <p className="max-w-2xl mx-auto mb-6 border-l-2 border-[#001F58]/30 pl-3 text-sm text-slate-600">
                Plan {quota.planName}:{" "}
                <span className="font-semibold tabular-nums text-[#001F58]">
                  {quotaLine.used} de {quotaLine.limit}
                </span>{" "}
                {activeTab === "aircraft" ? "aviones" : "repuestos"} activos. Tus avisos no vencen.
              </p>
            )}
            {quotaFull && quota && quotaLine && (
              <section
                aria-labelledby="quota-full-title"
                className="max-w-2xl mx-auto mb-6 rounded-lg border border-[#001F58]/15 border-l-4 border-l-[#E70F1F] bg-white p-5 space-y-3"
              >
                <h2 id="quota-full-title" className="text-base font-bold leading-snug text-[#001F58] sm:text-lg">
                  {quotaFullText(activeTab, quotaLine.used, quotaLine.limit ?? 0, quota.planName)}
                </h2>
                {saveAsPaused[activeTab] ? (
                  <p className="text-sm text-slate-600">
                    Este aviso se va a guardar <strong className="text-[#001F58]">pausado</strong>: no se ve hasta que lo actives desde tu
                    perfil, cuando tengas lugar.{" "}
                    <button
                      type="button"
                      onClick={() => setSaveAsPaused({ ...saveAsPaused, [activeTab]: false })}
                      className="font-semibold text-[#001F58] underline underline-offset-2 hover:text-[#E70F1F] cursor-pointer"
                    >
                      Cambiar
                    </button>
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-slate-600">Para publicar otro, elegí una opción:</p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Link
                        href={`/profile/${userId}?tipo=${activeTab === "aircraft" ? "aeronaves" : "repuestos"}&estado=activos`}
                        className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#001F58]/20 px-4 text-sm font-semibold text-[#001F58] hover:border-[#001F58]"
                      >
                        Pausar uno de mis avisos
                      </Link>
                      {plansAvailable && (
                        <Link
                          href="/plans"
                          className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#E70F1F] px-4 text-sm font-bold text-white hover:bg-[#C20D1A]"
                        >
                          {quota.tier === "FREE" ? "Pasarme a Pro" : "Ver planes con más cupo"}
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSaveAsPaused({ ...saveAsPaused, [activeTab]: true });
                          setFormError(null);
                        }}
                        className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#001F58]/20 px-4 text-sm font-semibold text-[#001F58] hover:border-[#001F58] cursor-pointer"
                      >
                        Guardar como pausado
                      </button>
                    </div>
                  </>
                )}
              </section>
            )}

            {phoneMissing && <PhoneRequiredCard onSaved={() => { setPhoneMissing(false); setFormError(null); }} />}

            {formError && (
              <div ref={errorRef} className="max-w-2xl mx-auto mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* En la edición no se puede cambiar el tipo de publicación */}
            <div className={isEditing ? "hidden" : "flex justify-center mb-8"}>
              <div className="bg-white/80 p-1.5 rounded-2xl border border-[#001F58]/20 flex gap-2 shadow-sm backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => { 
                      setActiveTab("aircraft"); 
                      setFormError(null); 
                      setCurrentStep(1); // Reiniciar al paso 1 al cambiar
                      setStepAttempted(false);
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
                      setStepAttempted(false);
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
                                onStepChange={(step) => { setCurrentStep(step); setStepAttempted(false); }}
                                backButtonProps={{ 
                                    type: "button", 
                                    className: "px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors" 
                                }}
                                nextButtonProps={{ 
                                    type: "button", 
                                    title: "Avanzar al siguiente paso",
                                    className: "px-6 py-2.5 rounded-xl font-bold transition-all shadow-md bg-[#001F58] text-white hover:bg-blue-900",
                                    style: currentStep === 4 ? { display: 'none' } : {},
                                    onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
                                        const err = validateStep(activeTab, currentStep);
                                        // VA-112: al pasar al paso de motores de un alta, dejar listos los que pide la categoría (2 en Bimotor).
                                        if (!err && activeTab === "aircraft" && currentStep === 1 && !isEditing) {
                                            const needed = minEngines(aircraftForm.categoryId);
                                            const isBlank = (eng: EngineInput) => Object.values(eng).every((v) => !String(v).trim());
                                            if (needed === 0) setEngines(engines.filter((eng) => !isBlank(eng)));
                                            else if (engines.length < needed) setEngines([...engines, ...Array.from({ length: needed - engines.length }, () => ({ ...EMPTY_ENGINE }))]);
                                        }
                                        if (err) {
                                            e.preventDefault();
                                            setStepAttempted(true);
                                        }
                                    }
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
                                            <p className="text-xs text-slate-500 mt-1">Completá la información básica obligatoria para identificar tu aeronave.</p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-bold uppercase mb-1">Título de Publicación *</label>
                                                <input type="text" value={aircraftForm.title} onChange={e => setAircraftForm({...aircraftForm, title: e.target.value})} placeholder="Ej: Cessna 172 Skyhawk" className="w-full p-2.5 rounded-xl border border-slate-300 bg-white" />
                                                <FieldError message={fieldErrors.title} />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1">Año *</label>
                                                {/* VA-145: vacío se guarda como 0 y se muestra vacío (antes quedaba un "0" imposible de borrar). */}
                                                <input type="number" min="1900" max={currentYear} value={aircraftForm.year || ""} onChange={e => {
                                                    const year = Number(e.target.value);
                                                    setAircraftForm({...aircraftForm, year, condition: year === currentYear ? aircraftForm.condition : "USADO"});
                                                }} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white" />
                                                <FieldError message={fieldErrors.year} />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1">Condición *</label>
                                                <select value={aircraftForm.condition} onChange={e => setAircraftForm({...aircraftForm, condition: e.target.value as "USADO" | "NUEVO"})} disabled={aircraftForm.year !== currentYear} className="w-full p-2.5 rounded-xl border border-slate-300 disabled:bg-slate-100 bg-white">
                                                    <option value="USADO">Usado</option>
                                                    {aircraftForm.year === currentYear && <option value="NUEVO">Nuevo</option>}
                                                </select>
                                                {aircraftForm.year !== currentYear && <p className="text-[10px] text-slate-400 mt-1">Solo los modelos del año {currentYear} pueden marcarse como Nuevos.</p>}
                                                <FieldError message={fieldErrors.condition} />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1">Precio (USD) *</label>
                                                <input type="number" min="0" disabled={aircraftForm.priceOnRequest} placeholder={aircraftForm.priceOnRequest ? "A Consultar" : "Ej: 150000"} value={aircraftForm.price} onChange={e => setAircraftForm({...aircraftForm, price: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white disabled:bg-slate-100" />
                                                <label className="flex items-center gap-2 mt-2 text-xs font-semibold cursor-pointer">
                                                    <input type="checkbox" checked={aircraftForm.priceOnRequest} onChange={e => setAircraftForm({...aircraftForm, priceOnRequest: e.target.checked, price: ""})} className="rounded text-[#001F58]" /> 
                                                    Precio a Consultar
                                                </label>
                                                <FieldError message={fieldErrors.price} />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1">Horas Totales (TT){requiredMark("totalTimeHours", aircraftForm.categoryId)}</label>
                                                <input type="number" min="0" placeholder="Ej: 3200" value={aircraftForm.totalTimeHours} onChange={e => setAircraftForm({...aircraftForm, totalTimeHours: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white" />
                                                <FieldError message={fieldErrors.totalTimeHours} />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1">Marca *</label>
                                                <select value={aircraftForm.brandId} onChange={(e) => handleBrandChange(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white">
                                                    <option value="">Seleccionar Marca</option>
                                                    {brandsData.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                    <option value="CUSTOM">Otra Marca...</option>
                                                </select>
                                                {aircraftForm.brandId === "CUSTOM" && <input type="text" placeholder="Escribí la marca" value={aircraftForm.customBrand} onChange={e => setAircraftForm({...aircraftForm, customBrand: e.target.value})} className="w-full mt-2 p-2.5 rounded-xl border border-slate-300 bg-white" />}
                                                <FieldError message={fieldErrors.brandId} />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1">Modelo/Submodelo *</label>
                                                <select value={aircraftForm.modelId} onChange={(e) => handleModelChange(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white">
                                                    <option value="">Seleccionar Modelo</option>
                                                    {selectedBrandModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                                    <option value="CUSTOM_MODEL">Otro modelo...</option>
                                                </select>
                                                {aircraftForm.modelId === "CUSTOM_MODEL" && <input type="text" placeholder="Escribí el modelo" value={aircraftForm.customModel} onChange={e => setAircraftForm({...aircraftForm, customModel: e.target.value})} className="w-full mt-2 p-2.5 rounded-xl border border-slate-300 bg-white" />}
                                                <FieldError message={fieldErrors.modelId} />
                                                
                                                {selectedModelVariants.length > 0 && aircraftForm.modelId !== "CUSTOM_MODEL" && (
                                                    <select value={aircraftForm.subModelId} onChange={(e) => handleSubModelChange(e.target.value)} className="w-full mt-2 p-2.5 rounded-xl border border-slate-300 bg-white">
                                                        <option value="">(Opcional) Variante específica</option>
                                                        {selectedModelVariants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                                    </select>
                                                )}
                                            </div>

                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-bold uppercase mb-1">Tipo de aeronave *</label>
                                                <select value={selectedGroup} onChange={e => handleGroupChange(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300 font-medium bg-white">
                                                    <option value="">-- Seleccionar tipo --</option>
                                                    {AIRCRAFT_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                                                </select>
                                                <p className="text-[10px] text-slate-400 mt-1">Si el modelo elegido tiene un tipo sugerido, se completa solo. Podés cambiarlo.</p>
                                                <FieldError message={fieldErrors.categoryId} />
                                            </div>

                                            {selectedGroup && groupHasEngines(selectedGroup) && (
                                            <div className="sm:col-span-2 bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 space-y-1.5">
                                                <label className="block text-xs font-bold uppercase tracking-wider text-[#001F58]">
                                                Motorización *
                                                </label>
                                                <div className="flex gap-6 text-sm font-medium">
                                                    {categoriesInGroup(selectedGroup).map(c => c.engine && (
                                                        <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                                                            <input type="radio" name="engine" checked={selectedEngine === c.engine} onChange={() => handleEngineChange(c.engine!)} className="w-4 h-4 text-[#001F58]" />
                                                            {ENGINE_LABELS[c.engine]}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            )}

                                            <div className="sm:col-span-2 pt-4 border-t border-slate-100">
                                                <label className="block text-xs font-bold uppercase mb-2">Opciones de Negociación</label>
                                                <div className="flex flex-wrap gap-6 text-sm font-medium">
                                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={aircraftForm.financing} onChange={e => setAircraftForm({...aircraftForm, financing: e.target.checked})} className="w-4 h-4 rounded text-[#001F58]" /> Permite Financiación</label>
                                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={aircraftForm.trade} onChange={e => setAircraftForm({...aircraftForm, trade: e.target.checked})} className="w-4 h-4 rounded text-[#001F58]" /> Acepta Permuta</label>
                                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={aircraftForm.rent} onChange={e => setAircraftForm({...aircraftForm, rent: e.target.checked})} className="w-4 h-4 rounded text-[#001F58]" /> Disponible p/ Alquiler</label>
                                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={aircraftForm.negotiable} onChange={e => setAircraftForm({...aircraftForm, negotiable: e.target.checked})} className="w-4 h-4 rounded text-[#001F58]" /> Precio negociable</label>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* AVISO DE ERROR AL FINAL DEL PASO: solo se muestra tras intentar avanzar */}
                                        {stepAttempted && currentStepError && (
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
                                                <label className="block text-xs font-bold mb-1">Descripción del panel{requiredMark("avDescription", aircraftForm.categoryId)}</label>
                                                <textarea rows={3} placeholder="Ej: Garmin G1000, 2 NAV/COM, Transponder GXR..." value={aircraftForm.avDescription} onChange={e => setAircraftForm({...aircraftForm, avDescription: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white" />
                                                <FieldError message={fieldErrors.avDescription} />
                                            </div>
                                            <div className="flex gap-6 text-sm font-medium">
                                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={aircraftForm.avAaptoifr} onChange={e => setAircraftForm({...aircraftForm, avAaptoifr: e.target.checked})} className="w-4 h-4 rounded text-[#001F58]" /> Apto IFR</label>
                                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={aircraftForm.avAutopilot} onChange={e => setAircraftForm({...aircraftForm, avAutopilot: e.target.checked})} className="w-4 h-4 rounded text-[#001F58]" /> Autopilot</label>
                                            </div>
                                        </div>

                                        {/* EQUIPAMIENTO ADICIONAL */}
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                                            <h4 className="font-bold uppercase text-xs text-[#001F58]">Equipamiento adicional (opcional)</h4>
                                            <textarea rows={3} placeholder={"Un ítem por línea, por ejemplo:\nEncendido electrónico\nSlats\nCubiertas Alaskan 38\""} value={aircraftForm.extraEquipment} onChange={e => setAircraftForm({...aircraftForm, extraEquipment: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-sm" />
                                            <p className="text-[10px] text-slate-500">Cada línea se muestra como un ítem de la lista en tu aviso.</p>
                                        </div>

                                        {/* IMPLEMENTOS AGRÍCOLAS: solo en categoría Agrícola */}
                                        {aircraftForm.categoryId === "A" && (
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                                            <h4 className="font-bold uppercase text-xs text-[#001F58]">Implementos agrícolas (opcional)</h4>
                                            <textarea rows={3} placeholder="Ej: Tolva de 1.500 l, barra de 18 m, banderillero satelital..." value={aircraftForm.agEquipment} onChange={e => setAircraftForm({...aircraftForm, agEquipment: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-sm" />
                                        </div>
                                        )}

                                        {/* MOTOR */}
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-bold uppercase text-xs text-[#001F58]">Motor{requiredMark("engines", aircraftForm.categoryId)}</h4>
                                                <button type="button" onClick={addEngine} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#001F58]/10 text-[#001F58] hover:bg-[#001F58]/20 transition-colors">
                                                    <Plus className="w-4 h-4" /> Agregar Motor
                                                </button>
                                            </div>
                                            {engines.map((eng, idx) => (
                                                <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-3 relative pt-7">
                                                    <span className="absolute top-2 left-3 text-[10px] font-bold text-[#001F58] uppercase bg-blue-50 px-2 py-0.5 rounded">Motor #{idx + 1}</span>
                                                    <button type="button" onClick={() => removeEngine(idx)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-[10px] uppercase flex items-center gap-1"><Trash2 className="w-3 h-3" /> Quitar</button>
                                                    
                                                    <div><label className="text-[10px] font-bold uppercase mb-1 block">Marca</label><input type="text" placeholder="Ej: Lycoming" value={eng.brand} onChange={e => updateEngine(idx, "brand", e.target.value)} className="w-full p-2 text-xs rounded-xl border border-slate-300" /><FieldError message={fieldErrors[`engines.${idx}.brand`]} /></div>
                                                    <div><label className="text-[10px] font-bold uppercase mb-1 block">Modelo</label><input type="text" placeholder="Ej: O-320" value={eng.model} onChange={e => updateEngine(idx, "model", e.target.value)} className="w-full p-2 text-xs rounded-xl border border-slate-300" /></div>
                                                    <div><label className="text-[10px] font-bold uppercase mb-1 block">TBO{requiredMark("TBO", aircraftForm.categoryId)}</label><input type="number" min="0" placeholder="Ej: 2000" value={eng.TBO} onChange={e => updateEngine(idx, "TBO", e.target.value)} className="w-full p-2 text-xs rounded-xl border border-slate-300" /><FieldError message={fieldErrors[`engines.${idx}.TBO`]} /></div>
                                                    <div><label className="text-[10px] font-bold uppercase mb-1 block">Potencia (HP)</label><input type="number" min="0" placeholder="Ej: 150" value={eng.horsepower} onChange={e => updateEngine(idx, "horsepower", e.target.value)} className="w-full p-2 text-xs rounded-xl border border-slate-300" /></div>
                                                    <div><label className="text-[10px] font-bold uppercase mb-1 block">Horas del motor</label><input type="number" min="0" placeholder="Ej: 2200" value={eng.engineHours} onChange={e => updateEngine(idx, "engineHours", e.target.value)} className="w-full p-2 text-xs rounded-xl border border-slate-300" /></div>
                                                    <div className="col-span-2"><label className="text-[10px] font-bold uppercase mb-1 block">Descripción Adicional</label><input type="text" placeholder="Detalles de cilindros, overhaul o accesorios." value={eng.description} onChange={e => updateEngine(idx, "description", e.target.value)} className="w-full p-2 text-xs rounded-xl border border-slate-300" /></div>
                                                </div>
                                            ))}
                                            {engines.length === 0 && <p className="text-xs text-slate-500 italic bg-white/50 p-2 rounded text-center">{isRequired("engines", aircraftForm.categoryId) ? "Agregá al menos un motor con el botón \u201cAgregar Motor\u201d." : "Sin motor (opcional en Proyecto)."}</p>}
                                            <FieldError message={fieldErrors["engines"]} />
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
                                            <FieldError message={fieldErrors.propellers} />
                                        </div>

                                        {stepAttempted && currentStepError && (
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
                                            {/* VA-126 (socio, 14/10): por ahora, sin las plantillas dibujadas de VA-124 (PhotoGuide queda en components/ui/publish). */}
                                            <p className="mt-2 border-l-2 border-[#E70F1F] pl-3 text-xs text-slate-600">
                                                Sacá buenas fotos: con luz de día, nítidas y de todos los ángulos (exterior, cabina, tablero y motor). Podés subir hasta {MAX_LISTING_IMAGES}.
                                            </p>
                                        </div>
                                        
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-xs font-bold uppercase">Imágenes (Max 15) *</label>
                                                <span className="text-[10px] text-slate-500 font-medium">Mantén apretado y arrastrá para reordenar</span>
                                            </div>
                                            {compressing && (
                                                <p className="text-xs font-semibold text-[#001F58] mb-2">Optimizando fotos {compressing.done}/{compressing.total}...</p>
                                            )}
                                            <FieldError message={fieldErrors.images} />
                                            
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
                                                {images.length < MAX_LISTING_IMAGES && !compressing && (
                                                    <label className="w-28 h-28 rounded-xl border-2 border-dashed border-[#001F58]/30 flex flex-col items-center justify-center cursor-pointer hover:border-[#001F58]/60 bg-slate-50 hover:bg-slate-100 transition-colors">
                                                        <Upload className="w-6 h-6 text-[#001F58]/50 mb-1" />
                                                        <span className="text-[10px] font-bold text-[#001F58]">Agregar Foto</span>
                                                        <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="hidden" />
                                                    </label>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4 mt-6">
                                            <h4 className="font-bold uppercase text-xs text-[#001F58]">Documentación (Solo Privado)</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-bold uppercase mb-1">Estado de Habilitación *</label>
                                                    <div className="flex items-center gap-6 mt-2 text-sm font-medium">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input type="radio" name="certified" checked={aircraftForm.certified === true} onChange={() => setAircraftForm({...aircraftForm, certified: true})} className="w-4 h-4 text-[#001F58]" />
                                                            Sí, con anual al día
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input type="radio" name="certified" checked={aircraftForm.certified === false} onChange={() => setAircraftForm({...aircraftForm, certified: false})} className="w-4 h-4 text-[#001F58]" />
                                                            No
                                                        </label>
                                                    </div>
                                                    <FieldError message={fieldErrors.certified} />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold uppercase mb-1">Habilitado hasta (vencimiento del anual)</label>
                                                    <input type="date" value={aircraftForm.certDate} onChange={e => setAircraftForm({...aircraftForm, certDate: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 text-sm bg-white" />
                                                    <FieldError message={fieldErrors.certDate} />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-[10px] font-bold uppercase mb-1">Matrícula <span className="font-normal normal-case text-slate-500">(opcional)</span></label>
                                                    <input type="text" placeholder="Ej: LV-XXX" value={aircraftForm.plate} onChange={e => setAircraftForm({...aircraftForm, plate: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 uppercase bg-white" />
                                                    <p className="text-[10px] text-slate-500 mt-1">Opcional. Si la cargás, se muestra en el aviso, en el PDF y en el comparador.</p>
                                                </div>
                                            </div>

                                            <div className="border-t border-slate-200 pt-3">
                                                <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50 shadow-sm transition-colors">
                                                    <Paperclip className="w-4 h-4 text-[#001F58]" /> Adjuntar Fichas o Informes (PDF/Docs)
                                                    <input type="file" multiple accept=".pdf,.doc,.docx,image/*" onChange={handleDocumentUpload} className="hidden" />
                                                </label>
                                                {existingDocuments.map((doc) => (
                                                    <div key={doc.url} className="flex justify-between items-center p-2.5 mt-2 bg-white rounded-lg border border-slate-200 text-xs shadow-sm">
                                                        <span className="truncate w-3/4 font-medium text-slate-600">{doc.name}</span>
                                                        <button type="button" onClick={() => setExistingDocuments((prev) => prev.filter((d) => d.url !== doc.url))} className="text-red-600 hover:text-red-800 font-bold px-2">X</button>
                                                    </div>
                                                ))}
                                                {documents.map((doc, idx) => (
                                                    <div key={idx} className="flex justify-between items-center p-2.5 mt-2 bg-white rounded-lg border border-slate-200 text-xs shadow-sm">
                                                        <span className="truncate w-3/4 font-medium text-slate-600">{doc.name}</span>
                                                        <button type="button" onClick={() => removeDocument(idx)} className="text-red-600 hover:text-red-800 font-bold px-2">X</button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {stepAttempted && currentStepError && (
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
                                            {/* VA-78: guía para vender */}
                                            <p className="text-xs text-slate-500 mt-1">
                                                ¿Qué conviene contar en el aviso?{" "}
                                                <Link href="/services/guides/selling-your-aircraft" target="_blank" className="font-semibold text-[#E70F1F] hover:underline">
                                                    Leé la guía para vender tu avión
                                                </Link>
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1">Ciudad *</label>
                                                <input type="text" placeholder="Ej: San Fernando" value={aircraftForm.city} onChange={e => setAircraftForm({...aircraftForm, city: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white" />
                                                <FieldError message={fieldErrors.city} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1">Provincia *</label>
                                                <ProvinceSelect required value={aircraftForm.province} onChange={(province) => setAircraftForm({...aircraftForm, province})} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white" />
                                                <FieldError message={fieldErrors.province} />
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
                                                    <FieldError message={fieldErrors.passengers} />
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
                                            <DescriptionTextarea required placeholder={"Historial:\n- Siempre hangarado\n- Último anual en marzo 2026\n\nMotivo de venta: cambio por un bimotor."} value={aircraftForm.description} onChange={(description) => setAircraftForm({...aircraftForm, description})} />
                                            <FieldError message={fieldErrors.description} />
                                        </div>

                                        <div className="flex justify-end pt-4">
                                            <button 
                                                type="button" 
                                                onClick={submitForm} 
                                                disabled={isPublishing || !!compressing} 
                                                className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-lg disabled:opacity-50 transition-colors"
                                            >
                                                <Rocket className="w-5 h-5" /> {isPublishing ? publishStatus ?? "Publicando..." : compressing ? "Optimizando fotos..." : isEditing ? "Guardar cambios" : "Finalizar y Publicar"}
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
                                onStepChange={(step) => { setCurrentStep(step); setStepAttempted(false); }}
                                backButtonProps={{ 
                                    type: "button", 
                                    className: "px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors" 
                                }}
                                nextButtonProps={{ 
                                    type: "button", 
                                    title: "Avanzar al siguiente paso",
                                    className: "px-6 py-2.5 rounded-xl font-bold transition-all shadow-md bg-[#001F58] text-white hover:bg-blue-900",
                                    style: currentStep === 3 ? { display: 'none' } : {},
                                    onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
                                        const err = validateStep(activeTab, currentStep);
                                        if (err) {
                                            e.preventDefault();
                                            setStepAttempted(true);
                                        }
                                    }
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
                                                <FieldError message={fieldErrors.title} />
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
                                                <FieldError message={fieldErrors.price} />
                                            </div>
                                        </div>

                                        {stepAttempted && currentStepError && (
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
                                            {compressing && (
                                                <p className="text-xs font-semibold text-[#001F58] mb-2">Optimizando fotos {compressing.done}/{compressing.total}...</p>
                                            )}
                                            <FieldError message={fieldErrors.images} />
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
                                                {images.length < MAX_LISTING_IMAGES && !compressing && (
                                                    <label className="w-24 h-24 rounded-xl border-2 border-dashed border-[#001F58]/30 flex flex-col items-center justify-center cursor-pointer hover:border-[#001F58]/60 bg-slate-50 transition-colors">
                                                        <Upload className="w-6 h-6 text-[#001F58]/50 mb-1" />
                                                        <span className="text-[10px] font-bold text-[#001F58]">Agregar</span>
                                                        <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="hidden" />
                                                    </label>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1">Ciudad *</label>
                                                <input type="text" placeholder="Ej: Morón" value={partsForm.city} onChange={e => setPartsForm({...partsForm, city: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white" />
                                                <FieldError message={fieldErrors.city} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1">Provincia *</label>
                                                <ProvinceSelect required value={partsForm.province} onChange={(province) => setPartsForm({...partsForm, province})} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white" />
                                                <FieldError message={fieldErrors.province} />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold uppercase mb-1">Descripción del Artículo *</label>
                                            <DescriptionTextarea placeholder="Detallá uso, tiempo remanente si aplica, fallas, compatibilidades generales..." value={partsForm.description} onChange={(description) => setPartsForm({...partsForm, description})} />
                                            <FieldError message={fieldErrors.description} />
                                        </div>

                                        {stepAttempted && currentStepError && (
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
                                                <FieldError message={fieldErrors.stock} />
                                            </div>

                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="block text-xs font-bold uppercase mb-1">Categoría *</label>
                                                <select value={selectedParentCategoryId} onChange={e => handleParentCategoryChange(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium">
                                                    <option value="">Seleccionar principal</option>
                                                    {spareCategoriesData.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>

                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="block text-xs font-bold uppercase mb-1">Subcategoría *</label>
                                                <select value={selectedSubCategoryId} onChange={e => handleSubCategoryChange(e.target.value)} disabled={!selectedParentCategoryId} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium disabled:bg-slate-100">
                                                    <option value="">Seleccionar subcategoría</option>
                                                    {subCategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                                <FieldError message={fieldErrors.categoryId} />
                                            </div>

                                            {subSubCategories.length > 0 && (
                                                <div className="col-span-2">
                                                    <label className="block text-xs font-bold uppercase mb-1">Subcategoría Específica *</label>
                                                    <select value={partsForm.categoryId} onChange={e => handleSubSubCategoryChange(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium">
                                                        <option value="">Seleccionar la opción más específica</option>
                                                        {subSubCategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                    </select>
                                                    <p className="text-[10px] text-slate-400 mt-1">Esta subcategoría tiene opciones más detalladas: elegí siempre la más específica.</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-5 bg-blue-50/60 rounded-xl border-2 border-[#001F58]/20">
                                            {/* VA-88: más visible; con esto el repuesto aparece recomendado en los avisos de ese modelo */}
                                            <h4 className="font-bold text-base text-[#001F58]">¿Para qué aeronave es?</h4>
                                            <p className="text-sm text-slate-600 mt-1 mb-4">Así aparece recomendado en los avisos de ese modelo. Podés elegir varias (ideal para motores, hélices, tren de aterrizaje, frenos, cubiertas y agrícolas).</p>
                                            
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

                                        {stepAttempted && currentStepError && (
                                            <div className="p-3 mt-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 shrink-0" />
                                                {currentStepError}
                                            </div>
                                        )}

                                        <div className="flex justify-end pt-4">
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    const err = validateStep(activeTab, currentStep);
                                                    if (err) {
                                                        setStepAttempted(true);
                                                        return;
                                                    }
                                                    submitForm();
                                                }} 
                                                disabled={isPublishing || !!compressing} 
                                                className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-lg disabled:opacity-50 transition-colors"
                                            >
                                                <Rocket className="w-5 h-5" /> {isPublishing ? publishStatus ?? "Publicando..." : compressing ? "Optimizando fotos..." : isEditing ? "Guardar cambios" : "Finalizar y Publicar"}
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