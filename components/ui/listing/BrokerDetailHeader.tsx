"use client";

import { useEffect, useState, ReactNode, isValidElement, cloneElement, ReactElement } from "react";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import type { BrokerDetail } from "@/lib/broker-detail";
import { ContactButtons } from "@/components/ui/ContactButtons";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsElementProps {
  items?: BreadcrumbItem[];
  [key: string]: unknown;
}

function formatTruncatedBreadcrumbs(breadcrumbs?: ReactNode): ReactNode {
  if (!isValidElement(breadcrumbs)) return breadcrumbs;

  const element = breadcrumbs as ReactElement<BreadcrumbsElementProps>;
  const items = element.props?.items;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return breadcrumbs;
  }

  const truncatedItems = items.map((item, index) => {
    if (index === items.length - 1 && item.label && item.label.length > 10) {
      return {
        ...item,
        label: `${item.label.slice(0, 10)}...`,
      };
    }
    return item;
  });

  return cloneElement(element, { items: truncatedItems });
}

export function BrokerDetailHeader({
  broker,
  phone,
  email,
  whatsappUrl,
  emailUrl,
  entityId,
  entityType,
  breadcrumbs,
}: {
  broker: BrokerDetail;
  phone: string | null;
  email: string | null;
  whatsappUrl: string | null;
  emailUrl: string | null;
  entityId: string;
  entityType: "AIRCRAFT" | "SPARE_PART" | "HANGAR";
  breadcrumbs?: ReactNode;
}) {
  const [showSticky, setShowSticky] = useState(false);
  const formattedBreadcrumbs = formatTruncatedBreadcrumbs(breadcrumbs);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > 250 && currentScrollY < lastScrollY) {
        setShowSticky(true);
      } else {
        setShowSticky(false);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* 1. BANNER PRINCIPAL ESTÁTICO */}
      <section aria-label={`Vendido por ${broker.name}`} className="relative isolate overflow-hidden w-full bg-[#001F58] print:hidden">
        <div className="relative aspect-[16/7] xs:aspect-[16/6] sm:aspect-[6/1] w-full min-h-[160px] sm:min-h-0">
          {broker.coverUrl ? (
            <Image 
              src={broker.coverUrl} 
              alt="" 
              fill 
              priority 
              sizes="100vw" 
              className="object-cover object-center"
            />
          ) : (
            <svg aria-hidden viewBox="0 0 400 160" fill="none" className="absolute right-6 top-1/2 h-3/4 -translate-y-1/2 text-white/10">
              <path d="M150 4h120L126 156H6z" stroke="currentColor" strokeWidth="8" />
              <path d="M300 4h60L216 156h-60z" stroke="currentColor" strokeWidth="8" />
            </svg>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-[#001F58]/95 via-[#001F58]/50 to-[#001F58]/50" aria-hidden />
          
          <div className="absolute top-2.5 inset-x-0 px-3 sm:top-4 sm:px-6 z-10 flex items-center justify-between gap-2">
            <div className="min-w-0 truncate text-[11px] sm:text-xs text-white/90 drop-shadow-md [&_a]:text-white/80 [&_a:hover]:text-white [&_span]:text-white">
              {formattedBreadcrumbs}
            </div>
            <Link 
              href={broker.pageHref} 
              className="text-xs font-semibold text-white hover:underline shrink-0 drop-shadow-md mr-[5%] sm:mr-0"
            >
              Ver perfil
            </Link>
          </div>

          <div className="absolute inset-x-0 bottom-0 flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 p-3 sm:p-6">
            <div className="flex items-center sm:items-end gap-2.5 sm:gap-3 min-w-0">
              <span className="relative h-9 w-9 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-md border-2 border-white bg-white">
                {broker.logoUrl ? (
                  <Image src={broker.logoUrl} alt={`Logo de ${broker.name}`} fill sizes="56px" className="object-contain" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-sm sm:text-lg font-bold text-[#001F58]">
                    {broker.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-xl font-bold text-white">
                  <span className="truncate">{broker.name}</span>
                  {broker.verified && (
                    <>
                      {/* Escritorio: Insignia con texto completo */}
                      <span className="hidden sm:inline-flex items-center gap-1 rounded-sm bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#001F58] shrink-0">
                        <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Verificado
                      </span>

                      {/* Móvil: Solo ícono de verificado */}
                      <span className="sm:hidden text-white shrink-0" title="Verificado">
                        <BadgeCheck className="h-4 w-4 fill-white text-[#001F58]" aria-hidden />
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* En el banner estático los botones se muestran completos en mobile y PC */}
            <ContactButtons
              phone={phone}
              email={email}
              whatsappUrl={whatsappUrl}
              emailUrl={emailUrl}
              entityId={entityId}
              entityType={entityType}
              className="w-full sm:w-auto sm:ml-auto justify-start sm:justify-end"
            />
          </div>
        </div>
      </section>

      {/* 2. BARRA PEGAJOSA (SCROLL ARRIBA) */}
      <div 
        className={`fixed top-0 inset-x-0 z-50 bg-[#001F58] border-b border-white/10 shadow-lg transition-transform duration-300 print:hidden ${
          showSticky ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-2">
          {/* Vendedor + Ícono Verificado */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="hidden sm:flex relative h-8 w-8 shrink-0 overflow-hidden rounded-md border border-white bg-white">
              {broker.logoUrl ? (
                <Image src={broker.logoUrl} alt="" fill sizes="32px" className="object-contain" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xs font-bold text-[#001F58]">
                  {broker.name.charAt(0).toUpperCase()}
                </span>
              )}
            </span>

            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-white text-xs sm:text-base truncate">
                {broker.name}
              </span>
              
              {broker.verified && (
                <>
                  {/* Escritorio: Insignia con texto completo */}
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-sm bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#001F58] shrink-0">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Verificado
                  </span>

                  {/* Móvil: Solo ícono de verificado */}
                  <span className="sm:hidden text-white shrink-0" title="Verificado">
                    <BadgeCheck className="h-4 w-4 fill-white text-[#001F58]" />
                  </span>
                </>
              )}
            </div>
          </div>

          {/* En la barra pegajosa los botones usan compact={true} para mostrar solo íconos en móvil */}
          <ContactButtons
            phone={phone}
            email={email}
            whatsappUrl={whatsappUrl}
            emailUrl={emailUrl}
            entityId={entityId}
            entityType={entityType}
            compact={true}
            className="shrink-0"
          />
        </div>
      </div>
    </>
  );
}