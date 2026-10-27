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
  seller: { id: string; name: string | null; image: string | null; logoUrl?: string | null; phone: string | null; email: string | null; city: string | null; province: string | null };
  whatsappUrl: string | null;
  emailUrl: string | null;
  entityId: string;
  entityType: "AIRCRAFT" | "SPARE_PART" | "HANGAR";
  className?: string;
}) {
  const sellerLocation = [seller.city, seller.province].filter(Boolean).join(", ");
  const photo = seller.image ?? seller.logoUrl ?? null; // 27/10: foto y logo son una sola imagen
  return (
    <div className={`va-plate p-6 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="va-label">Vendedor</h2>
        <a className="py-2 text-xs font-semibold text-[#00205B] underline decoration-[#D62828] decoration-2 underline-offset-4 hover:text-[#D62828]" href={`/profile/${seller.id}`}>
          Ver perfil
        </a>
      </div>

      <div className="flex items-center gap-3">
        {photo ? (
          <AppImage
            className="h-12 w-12 rounded-md border border-[#00205B]/12 object-cover"
            src={photo}
            alt={seller.name || "Foto de vendedor"}
            width={48}
            height={48}
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#00205B] text-lg font-bold text-white">
            {seller.name?.charAt(0).toUpperCase() || "V"}
          </div>
        )}
        <div>
          <p className="text-sm font-bold text-[#00205B]">{seller.name}</p>
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
