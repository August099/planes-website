import type { AircraftDetail, SparePartDetail } from "@/lib/listing-data";
import type { Guide } from "@/lib/guides";
import { aircraftName, sparePartCurrency, truncate } from "@/lib/listing-seo";
import { absoluteUrl, CONTACT_PHONE, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

// Generadores de JSON-LD (schema.org). Validar con https://search.google.com/test/rich-results

const INSTAGRAM_URL = "https://instagram.com/ventas.aeronauticas";

export function organizationAndWebsiteJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": absoluteUrl("/#organization"),
      name: SITE_NAME,
      url: absoluteUrl("/"),
      logo: absoluteUrl("/logo-va-color.png"),
      telephone: CONTACT_PHONE.e164,
      sameAs: [INSTAGRAM_URL],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": absoluteUrl("/#website"),
      name: SITE_NAME,
      url: absoluteUrl("/"),
      description: SITE_DESCRIPTION,
      inLanguage: "es-AR",
      publisher: { "@id": absoluteUrl("/#organization") },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${absoluteUrl("/search")}?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ];
}

function offer({
  price,
  currency,
  isNew,
  url,
}: {
  price: unknown;
  currency: "USD" | "ARS";
  isNew: boolean;
  url: string;
}) {
  const value = price === null || price === undefined ? NaN : Number(price);
  return {
    "@type": "Offer",
    url,
    priceCurrency: currency,
    // "A consultar": se omite el precio.
    ...(Number.isFinite(value) && value > 0 ? { price: value.toFixed(2) } : {}),
    availability: "https://schema.org/InStock",
    itemCondition: isNew ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
  };
}

function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function aircraftJsonLd(aircraft: AircraftDetail) {
  const path = `/planes/plane-details/${aircraft.id}`;
  const brand = aircraft.brand?.name || aircraft.customBrand;
  const model = aircraft.model?.name || aircraft.customModel;

  const product = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${aircraftName(aircraft)} ${aircraft.year}`,
    description: truncate(aircraft.description || aircraft.title, 500),
    image: aircraft.images.map((img) => img.url),
    sku: aircraft.id,
    ...(brand ? { brand: { "@type": "Brand", name: brand } } : {}),
    ...(model ? { model } : {}),
    ...(aircraft.category?.name ? { category: aircraft.category.name } : {}),
    offers: offer({ price: aircraft.price, currency: "USD", isNew: aircraft.condition === "NUEVO", url: absoluteUrl(path) }),
  };

  const trail = [
    { name: "Inicio", path: "/" },
    { name: "Aviones", path: "/planes" },
    ...(aircraft.category ? [{ name: aircraft.category.name, path: `/planes?category=${aircraft.category.id}` }] : []),
    { name: aircraft.title, path },
  ];

  return [product, breadcrumbs(trail)];
}

export function sparePartJsonLd(sparePart: SparePartDetail) {
  const path = `/spareparts/sparepart-details/${sparePart.id}`;

  const product = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: sparePart.title,
    description: truncate(sparePart.description || sparePart.title, 500),
    image: sparePart.images.map((img) => img.url),
    sku: sparePart.id,
    ...(sparePart.partNumber ? { mpn: sparePart.partNumber } : {}),
    ...(sparePart.brand ? { brand: { "@type": "Brand", name: sparePart.brand } } : {}),
    ...(sparePart.category?.name ? { category: sparePart.category.name } : {}),
    offers: offer({
      price: sparePart.price,
      currency: sparePartCurrency(sparePart),
      isNew: sparePart.condition === "NUEVO",
      url: absoluteUrl(path),
    }),
  };

  // Categoría raíz del árbol (Categoría > Subcategoría > Sección).
  const rootCategory = sparePart.category?.parent?.parent ?? sparePart.category?.parent ?? sparePart.category;

  const trail = [
    { name: "Inicio", path: "/" },
    { name: "Repuestos", path: "/spareparts" },
    ...(rootCategory ? [{ name: rootCategory.name, path: `/spareparts?category=${rootCategory.id}` }] : []),
    { name: sparePart.title, path },
  ];

  return [product, breadcrumbs(trail)];
}

export function faqPageJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

// Guías (VA-78): Article + BreadcrumbList; el glosario suma DefinedTermSet.
export function guideJsonLd(guide: Guide) {
  const path = `/guias/${guide.slug}`;
  const organization = { "@id": absoluteUrl("/#organization"), "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") };
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.metaDescription,
    url: absoluteUrl(path),
    mainEntityOfPage: absoluteUrl(path),
    inLanguage: "es-AR",
    datePublished: guide.updatedAt,
    dateModified: guide.updatedAt,
    author: organization,
    publisher: { ...organization, logo: { "@type": "ImageObject", url: absoluteUrl("/logo-va-color.png") } },
  };
  const trail = breadcrumbs([
    { name: "Inicio", path: "/" },
    { name: "Guías", path: "/guias" },
    { name: guide.title, path },
  ]);
  if (!guide.isGlossary) return [article, trail];

  const termSet = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": absoluteUrl(`${path}#glosario`),
    name: guide.title,
    url: absoluteUrl(path),
    inLanguage: "es-AR",
    hasDefinedTerm: guide.sections.map((s) => ({
      "@type": "DefinedTerm",
      "@id": absoluteUrl(`${path}#${s.id}`),
      name: s.heading,
      description: (s.paragraphs ?? []).join(" "),
      url: absoluteUrl(`${path}#${s.id}`),
      inDefinedTermSet: absoluteUrl(`${path}#glosario`),
    })),
  };
  return [article, trail, termSet];
}

export function guidesIndexJsonLd() {
  return breadcrumbs([
    { name: "Inicio", path: "/" },
    { name: "Guías", path: "/guias" },
  ]);
}
