"use client";

import { useState } from "react";
import Image from "next/image";
import { 
  Plane, 
  Wrench, 
  Plus, 
  Trash2, 
  Upload, 
  Info, 
  CheckCircle2, 
  Gauge, 
  FileText, 
  ShieldCheck 
} from "lucide-react";

// Tipos auxiliares para estado dinámico
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

export default function PublishPage() {
  const [activeTab, setActiveTab] = useState<"aircraft" | "parts">("aircraft");

  // ==========================================
  // ESTADOS FORMULARIO AERONAVES
  // ==========================================
  const [aircraftForm, setAircraftForm] = useState({
    title: "",
    brand: "CESSNA",
    customBrand: "",
    model: "",
    year: new Date().getFullYear(),
    totalTimeHours: "",
    category: "PISTON",
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

  // Handlers para Motores
  const addEngine = () => {
    setEngines([...engines, { brand: "", model: "", engineHours: "", TBO: "" }]);
  };
  const removeEngine = (index: number) => {
    setEngines(engines.filter((_, i) => i !== index));
  };
  const updateEngine = (index: number, field: keyof EngineInput, value: string) => {
    const updated = [...engines];
    updated[index][field] = value;
    setEngines(updated);
  };

  // Handlers para Hélices
  const addPropeller = () => {
    setPropellers([...propellers, { model: "", propellerHours: "" }]);
  };
  const removePropeller = (index: number) => {
    setPropellers(propellers.filter((_, i) => i !== index));
  };
  const updatePropeller = (index: number, field: keyof PropellerInput, value: string) => {
    const updated = [...propellers];
    updated[index][field] = value;
    setPropellers(updated);
  };

  // ==========================================
  // ESTADOS FORMULARIO REPUESTOS
  // ==========================================
  const [partsForm, setPartsForm] = useState({
    title: "",
    brand: "",
    model: "",
    partNumber: "",
    category: "MECANICO",
    condition: "NUEVO",
    price: "",
    priceOnRequest: false,
    stock: "1",
    city: "",
    province: "",
    description: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "aircraft") {
      console.log("Enviando Aeronave:", { ...aircraftForm, engines, propellers });
    } else {
      console.log("Enviando Repuesto:", partsForm);
    }
  };

  return (
    <main className="relative isolate overflow-hidden min-h-screen -mb-16">
      {/* Fondo optimizado con bkg-forms.png */}
      <Image
        src="/bkg-forms.png"
        alt="Fondo Formularios"
        fill
        priority
        className="-z-20 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-background/85" />

      <div className="container mx-auto px-4 pt-16 pb-36 max-w-4xl">
        {/* Encabezado Principal */}
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

        {/* Selector de Pestañas: Aeronaves vs Repuestos */}
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

        {/* Formulario Principal */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {activeTab === "aircraft" ? (
            /* ==========================================
               FORMULARIO AERONAVES
               ========================================== */
            <div className="bg-white/90 border border-[#001F58]/20 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl text-[#001F58]">
              
              {/* Sección 1: Información Principal */}
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
                      value={aircraftForm.brand}
                      onChange={(e) => setAircraftForm({ ...aircraftForm, brand: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                    >
                      {["AIR_TRACTOR", "CESSNA", "PIPER", "PZL", "GRUMMAN", "EMBRAER", "BELL", "CICARE", "AIRBUS", "AERO_BOERO", "BEECHCRAFT", "OTHER"].map((b) => (
                        <option key={b} value={b}>{b.replace("_", " ")}</option>
                      ))}
                    </select>
                  </div>

                  {aircraftForm.brand === "OTHER" && (
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
                    <input
                      type="text"
                      required
                      placeholder="Ej: 172N"
                      value={aircraftForm.model}
                      onChange={(e) => setAircraftForm({ ...aircraftForm, model: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                    />
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
                      Categoría
                    </label>
                    <select
                      value={aircraftForm.category}
                      onChange={(e) => setAircraftForm({ ...aircraftForm, category: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                    >
                      {["PISTON", "TURBOHELICE", "EXPERIMENTAL", "HELICOPTERO", "PROYECTO"].map((c) => (
                        <option key={c} value={c}>{c}</option>
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

              {/* Sección 2: Especificaciones Detalladas (Opcionales) */}
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
                        Estado / Descripción de Fuselaje
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
                        placeholder="Ej: STC de STOL kit, tanques extendidos"
                        value={aircraftForm.fuselageModifications}
                        onChange={(e) => setAircraftForm({ ...aircraftForm, fuselageModifications: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                        Aviónica
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Ej: Garmin G1000, Autopilot S-TEC..."
                        value={aircraftForm.avionics}
                        onChange={(e) => setAircraftForm({ ...aircraftForm, avionics: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                        Equipamiento Adicional
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Ej: Aire acondicionado, fundas, GPUs..."
                        value={aircraftForm.extraEquipment}
                        onChange={(e) => setAircraftForm({ ...aircraftForm, extraEquipment: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección 3: Motores (Grilla Opcional Dinámica) */}
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
                    No se han añadido datos de motores. Hacé clic en "Agregar Motor" si querés especificar detalles técnicos del motor.
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
                            placeholder="Marca (Ej: Lycoming)"
                            value={eng.brand}
                            onChange={(e) => updateEngine(idx, "brand", e.target.value)}
                            className="px-3 py-2 rounded-lg border border-[#001F58]/20 text-xs bg-white"
                          />
                          <input
                            type="text"
                            placeholder="Modelo (Ej: O-360-A1A)"
                            value={eng.model}
                            onChange={(e) => updateEngine(idx, "model", e.target.value)}
                            className="px-3 py-2 rounded-lg border border-[#001F58]/20 text-xs bg-white"
                          />
                          <input
                            type="number"
                            placeholder="Horas Uso (TSN/TSO)"
                            value={eng.engineHours}
                            onChange={(e) => updateEngine(idx, "engineHours", e.target.value)}
                            className="px-3 py-2 rounded-lg border border-[#001F58]/20 text-xs bg-white"
                          />
                          <input
                            type="number"
                            placeholder="TBO (Horas)"
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

              {/* Sección 4: Hélices (Grilla Opcional Dinámica) */}
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
                            className="px-3 py-2 rounded-lg border border-[#001F58]/20 text-xs bg-white"
                          />
                          <input
                            type="number"
                            placeholder="Horas de Hélice"
                            value={prop.propellerHours}
                            onChange={(e) => updatePropeller(idx, "propellerHours", e.target.value)}
                            className="px-3 py-2 rounded-lg border border-[#001F58]/20 text-xs bg-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botón Guardar / Continuar */}
              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 shadow-md transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span>Continuar a Fotos y Pago</span>
                <Upload className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* ==========================================
               FORMULARIO REPUESTOS
               ========================================== */
            <div className="bg-white/90 border border-[#001F58]/20 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl text-[#001F58]">
              
              <div className="mb-8">
                <h3 className="font-heading text-xl font-semibold border-b border-[#001F58]/15 pb-3 mb-5 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-red-600" />
                  Información del Repuesto / Accesorio
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Título del Repuesto *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Bombas de combustible Continental IO-520"
                      value={partsForm.title}
                      onChange={(e) => setPartsForm({ ...partsForm, title: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Categoría *
                    </label>
                    <select
                      value={partsForm.category}
                      onChange={(e) => setPartsForm({ ...partsForm, category: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                    >
                      {[
                        { label: "Mecánico", val: "MECANICO" },
                        { label: "Estructural", val: "ESTRUCTURAL" },
                        { label: "Pieza Móvil", val: "PIEZA_MOVIL" },
                        { label: "Aviónica y Radio", val: "AVIONICA_Y_RADIO" },
                        { label: "Equipo de Fumigación", val: "EQUIPO_DE_FUMIGACION" },
                      ].map((c) => (
                        <option key={c.val} value={c.val}>{c.label}</option>
                      ))}
                    </select>
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
                      <option value="REMANUFACTURADO">Remanufacturado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Marca *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Bendix / King"
                      value={partsForm.brand}
                      onChange={(e) => setPartsForm({ ...partsForm, brand: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Modelo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: KX-155"
                      value={partsForm.model}
                      onChange={(e) => setPartsForm({ ...partsForm, model: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Número de Parte (N/P)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 069-1024-00"
                      value={partsForm.partNumber}
                      onChange={(e) => setPartsForm({ ...partsForm, partNumber: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Stock Disponibles *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={partsForm.stock}
                      onChange={(e) => setPartsForm({ ...partsForm, stock: e.target.value })}
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
                        id="priceReqPart"
                        checked={partsForm.priceOnRequest}
                        onChange={(e) => setPartsForm({ ...partsForm, priceOnRequest: e.target.checked, price: "" })}
                        className="rounded text-[#001F58] focus:ring-0"
                      />
                      <label htmlFor="priceReqPart" className="text-xs font-semibold cursor-pointer">
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
                      className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-[#ffffff] focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Descripción del Repuesto *
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Describa el estado, aplicabilidad, si incluye certificado o Form 8130-3..."
                      value={partsForm.description}
                      onChange={(e) => setPartsForm({ ...partsForm, description: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#001F58]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#001F58]"
                    />
                  </div>
                </div>
              </div>

              {/* Botón Guardar / Continuar */}
              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 shadow-md transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span>Continuar a Fotos y Pago</span>
                <Upload className="w-4 h-4" />
              </button>
            </div>
          )}
        </form>

        {/* Banner Informativo / Ayuda */}
        <div className="bg-white/80 border border-[#001F58]/20 rounded-2xl p-6 backdrop-blur-sm max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-5 shadow-sm mt-12">
          <div className="bg-[#001F58] p-3 rounded-xl text-white shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="text-center sm:text-left">
            <h4 className="font-heading font-semibold text-[#001F58] text-base mb-1">
              Publicaciones verificadas
            </h4>
            <p className="text-xs sm:text-sm text-[#001F58]/80 leading-relaxed">
              Toda la información brindada en este formulario será revisada para mantener los estándares de seguridad de la comunidad aeronáutica.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}