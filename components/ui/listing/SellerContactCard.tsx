import { AppImage } from "@/components/ui/AppImage";
import { ContactButtons } from "@/components/ui/ContactButtons";

// Tarjeta "Vendedor" del detalle de avión y de repuesto (VA-41): una sola, sin copias mobile/desktop.
export function SellerContactCard({
  seller,
  whatsappUrl,
  emailUrl,
  entityId,
  entityType,
  className = "",
}: {
  seller: { id: string; name: string | null; image: string | null; phone: string | null; email: string | null; city: string | null; province: string | null };
  whatsappUrl: string | null;
  emailUrl: string | null;
  entityId: string;
  entityType: "AIRCRAFT" | "SPARE_PART" | "HANGAR";
  className?: string;
}) {
  const sellerLocation = [seller.city, seller.province].filter(Boolean).join(", ");
  return (
    <div className={`border border-slate-200 rounded-lg bg-white p-6 shadow-sm space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-[#001F58]">Vendedor</h2>
        <a className="text-xs font-semibold text-blue-600 hover:underline py-2" href={`/profile/${seller.id}`}>
          Ver perfil
        </a>
      </div>

      <div className="flex items-center gap-3">
        {seller.image ? (
          <AppImage
            className="rounded-full w-12 h-12 object-cover border border-slate-200"
            src={seller.image}
            alt={seller.name || "Foto de vendedor"}
            width={48}
            height={48}
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-lg border border-slate-200">
            {seller.name?.charAt(0).toUpperCase() || "V"}
          </div>
        )}
        <div>
          <p className="font-bold text-slate-800 text-sm">{seller.name}</p>
          {sellerLocation && <p className="text-xs text-slate-500">{sellerLocation}</p>}
        </div>
      </div>

      <ContactButtons
        phone={seller.phone}
        email={seller.email}
        whatsappUrl={whatsappUrl}
        emailUrl={emailUrl}
        entityId={entityId}
        entityType={entityType}
      />
    </div>
  );
}
