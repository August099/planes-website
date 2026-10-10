import Image from "next/image";
import { BadgeCheck, Edit, Globe, MapPin, MessageCircle } from "lucide-react";
import { SiFacebook, SiInstagram } from "@icons-pack/react-simple-icons";

// Encabezado de la "página personalizada" (VA-87): como la tienda oficial de una marca frente al
// perfil de un vendedor común. Portada, logo, nombre comercial, insignia, descripción y una placa de
// contacto. Sin hooks (se usa dentro de ProfileView, que es cliente).
export type StorefrontData = {
  businessName: string | null;
  bio: string | null;
  coverUrl: string | null;
  logoUrl: string | null;
  website: string | null;
  whatsapp: string | null;
};

type Props = {
  storefront: StorefrontData;
  fallbackName: string;
  userTypeLabel: string;
  location: string;
  memberSince: string;
  instagram: string | null;
  facebook: string | null;
  isOwner: boolean;
  onEdit?: () => void;
};

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";

export function StorefrontHeader({ storefront, fallbackName, userTypeLabel, location, memberSince, instagram, facebook, isOwner, onEdit }: Props) {
  const name = storefront.businessName || fallbackName;
  const websiteLabel = storefront.website?.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  const contacts = [
    storefront.whatsapp && {
      label: "WhatsApp",
      value: `+${storefront.whatsapp}`,
      href: `https://wa.me/${storefront.whatsapp}`,
      icon: <MessageCircle className="h-4 w-4" aria-hidden />,
    },
    storefront.website && { label: "Web", value: websiteLabel, href: storefront.website, icon: <Globe className="h-4 w-4" aria-hidden /> },
    instagram && { label: "Instagram", value: "Ver perfil", href: instagram, icon: <SiInstagram className="h-4 w-4" aria-hidden /> },
    facebook && { label: "Facebook", value: "Ver página", href: facebook, icon: <SiFacebook className="h-4 w-4" aria-hidden /> },
  ].filter(Boolean) as { label: string; value: string; href: string; icon: React.ReactNode }[];

  return (
    <section className="overflow-hidden rounded-lg border border-[#001F58]/10 bg-white">
      {/* Portada */}
      <div className="relative aspect-[3/1] w-full bg-[#001F58] sm:aspect-[4/1]">
        {storefront.coverUrl ? (
          <Image src={storefront.coverUrl} alt="" fill sizes="(min-width: 1280px) 1248px, 100vw" className="object-cover" priority />
        ) : (
          <svg aria-hidden viewBox="0 0 400 160" fill="none" className="absolute right-6 top-1/2 h-2/3 -translate-y-1/2 text-white/10">
            <path d="M150 4h120L126 156H6z" stroke="currentColor" strokeWidth="8" />
            <path d="M300 4h60L216 156h-60z" stroke="currentColor" strokeWidth="8" />
          </svg>
        )}
      </div>

      <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-10">
        <div>
          {/* Logo sobre la portada */}
          <div className="relative -mt-14 mb-4 h-24 w-24 overflow-hidden rounded-md border-4 border-white bg-white shadow-sm sm:-mt-16 sm:h-28 sm:w-28">
            {storefront.logoUrl ? (
              <Image src={storefront.logoUrl} alt={`Logo de ${name}`} fill sizes="112px" className="object-contain" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-[#001F58]/5 text-3xl font-bold text-[#001F58]">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-2xl font-bold text-[#001F58] sm:text-3xl">{name}</h1>
            <span className="inline-flex items-center gap-1 rounded-sm bg-[#001F58] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
              Tienda oficial
            </span>
          </div>
          <p className={`mt-2 ${LABEL}`}>
            {userTypeLabel} · Miembro desde {memberSince}
          </p>
          {storefront.bio && <p className="mt-4 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-slate-700">{storefront.bio}</p>}
          {isOwner && onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="mt-5 inline-flex items-center gap-2 rounded-md border border-[#001F58]/20 px-4 py-2 text-xs font-semibold text-[#001F58] hover:bg-slate-50 cursor-pointer"
            >
              <Edit className="h-4 w-4" aria-hidden />
              Editar página
            </button>
          )}
        </div>

        {/* Placa de contacto */}
        <aside className="self-start rounded-md border border-[#001F58]/12 lg:mt-2">
          <p className={`border-b border-[#001F58]/12 px-4 py-3 ${LABEL}`}>Contacto</p>
          <dl className="divide-y divide-[#001F58]/10 text-sm">
            {location && (
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <dt className="flex items-center gap-2 text-slate-500">
                  <MapPin className="h-4 w-4" aria-hidden />
                  Ubicación
                </dt>
                <dd className="text-right font-medium text-slate-800">{location}</dd>
              </div>
            )}
            {contacts.map((c) => (
              <div key={c.label} className="flex items-center justify-between gap-3 px-4 py-3">
                <dt className="flex items-center gap-2 text-slate-500">
                  {c.icon}
                  {c.label}
                </dt>
                <dd className="min-w-0 truncate text-right">
                  <a href={c.href} target="_blank" rel="noopener noreferrer" className="font-medium text-[#001F58] hover:text-[#C20D1A] hover:underline">
                    {c.value}
                  </a>
                </dd>
              </div>
            ))}
            {!location && contacts.length === 0 && <p className="px-4 py-3 text-slate-500">Sin datos de contacto cargados.</p>}
          </dl>
        </aside>
      </div>
    </section>
  );
}
