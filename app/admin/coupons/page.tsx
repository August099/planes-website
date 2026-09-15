"use client";

import { useEffect, useState } from "react";
import { 
  getAdminCoupons, 
  createAdminCoupon, 
  generateRandomCouponCode, 
  toggleCouponStatus,
  type CreateCouponInput 
} from "@/app/actions/coupons-actions";
import { 
  Ticket, 
  Plus, 
  Copy, 
  Check, 
  RefreshCw, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Layers,
  Calendar
} from "lucide-react";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Estado del formulario
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateCouponInput>({
    code: "",
    type: "DISCOUNT",
    discountType: "FULL_DISCOUNT",
    discountValue: 0,
    scope: "ALL",
    maxUses: null,
    maxUsesPerUser: 1,
    isActive: true,
    expiresAt: "",
  });

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const data = await getAdminCoupons();
      setCoupons(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleGenerateCode = async () => {
    const randomCode = await generateRandomCouponCode();
    setFormData((prev) => ({ ...prev, code: randomCode }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const res = await createAdminCoupon(formData);

    if (res.success) {
      setIsModalOpen(false);
      setFormData({
        code: "",
        type: "DISCOUNT",
        discountType: "FULL_DISCOUNT",
        discountValue: 0,
        scope: "ALL",
        maxUses: null,
        maxUsesPerUser: 1,
        isActive: true,
        expiresAt: "",
      });
      fetchCoupons();
    } else {
      setFormError(res.error || "Ocurrió un error inesperado.");
    }
    setSubmitting(false);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    await toggleCouponStatus(id, !currentStatus);
    fetchCoupons();
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#001F58]">Gestión de Cupones</h1>
          <p className="text-xs text-slate-500 mt-1">
            Crea y administra los códigos promocionales para publicaciones y renovaciones.
          </p>
        </div>

        <button
          onClick={() => {
            handleGenerateCode();
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#001F58] hover:bg-[#001740] text-white font-semibold text-xs rounded-xl shadow transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Crear Nuevo Cupón
        </button>
      </div>

      {/* Lista de Cupones */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 font-medium text-sm">
          Cargando cupones...
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-[#001F58] text-sm flex items-center gap-2">
              <Ticket className="w-4 h-4 text-indigo-600" />
              Cupones Registrados ({coupons.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase bg-slate-50">
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Beneficio</th>
                  <th className="py-3 px-4">Alcance</th>
                  <th className="py-3 px-4">Usos Restantes</th>
                  <th className="py-3 px-4">Límite p/User</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {coupons.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No hay cupones creados todavía.
                    </td>
                  </tr>
                ) : (
                  coupons.map((coupon) => {
                    const usesLeft = coupon.maxUses !== null 
                      ? Math.max(0, coupon.maxUses - coupon.currentUses)
                      : "Ilimitado";

                    return (
                      <tr key={coupon.id} className="hover:bg-slate-50 transition-colors">
                        {/* Código con botón de copiar */}
                        <td className="py-3 px-4 font-mono font-bold text-[#001F58]">
                          <div className="flex items-center gap-2">
                            <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                              {coupon.code}
                            </span>
                            <button
                              onClick={() => handleCopy(coupon.code)}
                              title="Copiar código"
                              className="text-slate-400 hover:text-[#001F58] transition-colors cursor-pointer"
                            >
                              {copiedCode === coupon.code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Tipo */}
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {coupon.type === "RENEWAL" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              Renovación
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Descuento
                            </span>
                          )}
                        </td>

                        {/* Beneficio */}
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {coupon.discountType === "FULL_DISCOUNT" && "100% Gratis"}
                          {coupon.discountType === "PERCENTAGE" && `${coupon.discountValue}% OFF`}
                          {coupon.discountType === "FIXED_AMOUNT" && `$${coupon.discountValue} OFF`}
                        </td>

                        {/* Alcance */}
                        <td className="py-3 px-4 text-slate-600">
                          {coupon.scope === "ALL" && "Todos los avisos"}
                          {coupon.scope === "AIRCRAFT" && "Aeronaves"}
                          {coupon.scope === "SPARE_PART" && "Repuestos"}
                          {coupon.scope === "AD_BANNER" && "Banners"}
                        </td>

                        {/* Usos Restantes */}
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-700">
                            {usesLeft}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {coupon.currentUses} usado(s)
                          </span>
                        </td>

                        {/* Límite por usuario */}
                        <td className="py-3 px-4 text-slate-600">
                          {coupon.maxUsesPerUser} uso(s)
                        </td>

                        {/* Estado */}
                        <td className="py-3 px-4">
                          {coupon.isActive ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3" /> Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                              <XCircle className="w-3 h-3" /> Inactivo
                            </span>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleToggleStatus(coupon.id, coupon.isActive)}
                            className="text-xs font-semibold text-slate-600 hover:text-[#001F58] underline cursor-pointer"
                          >
                            {coupon.isActive ? "Desactivar" : "Activar"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Creación de Cupón */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-[#001F58] text-base flex items-center gap-2">
                <Ticket className="w-5 h-5 text-indigo-600" />
                Crear Nuevo Cupón
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Código */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Código de Cupón (6 Caracteres)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="Ej: AERO26"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl font-mono uppercase font-bold text-sm focus:outline-none focus:border-[#001F58]"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Random
                  </button>
                </div>
              </div>

              {/* Tipo de Cupón */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tipo de Operación
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as "DISCOUNT" | "RENEWAL",
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#001F58]"
                  >
                    <option value="DISCOUNT">Descuento en Compra</option>
                    <option value="RENEWAL">Renovación de Aviso</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Alcance
                  </label>
                  <select
                    value={formData.scope}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        scope: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#001F58]"
                  >
                    <option value="ALL">Todos los Avisos</option>
                    <option value="AIRCRAFT">Solo Aeronaves</option>
                    <option value="SPARE_PART">Solo Repuestos</option>
                  </select>
                </div>
              </div>

              {/* Lógica de descuento si es tipo DISCOUNT */}
              {formData.type === "DISCOUNT" && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Modalidad
                    </label>
                    <select
                      value={formData.discountType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discountType: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none"
                    >
                      <option value="FULL_DISCOUNT">100% Gratis</option>
                      <option value="PERCENTAGE">Porcentaje (%)</option>
                      <option value="FIXED_AMOUNT">Monto Fijo ($)</option>
                    </select>
                  </div>

                  {formData.discountType !== "FULL_DISCOUNT" && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Valor del Descuento
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={formData.discountValue}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            discountValue: Number(e.target.value),
                          })
                        }
                        placeholder={formData.discountType === "PERCENTAGE" ? "Ej: 20" : "Ej: 5000"}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Límites de uso */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Usos Totales Máximos
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.maxUses ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxUses: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    placeholder="Vacío = Ilimitado"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#001F58]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Límite por Usuario
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.maxUsesPerUser}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxUsesPerUser: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#001F58]"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#001F58] hover:bg-[#001740] text-white font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  {submitting ? "Guardando..." : "Crear Cupón"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}