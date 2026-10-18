import Link from "next/link";
import Image from "next/image";
import { BrandSlashes } from "@/components/ui/BrandSlashes";
import { CookieSettingsLink } from "@/components/ui/CookieSettingsLink";
import { Mail, Phone } from "lucide-react";
import { CONTACT_PHONE } from "@/lib/site";
import { SiInstagram } from "@icons-pack/react-simple-icons";

// VA-83: el mismo footer en todo el sitio: azul profundo liso (el color con que termina la Home)
// y el "//" de la marca en SVG, en lugar de la imagen bkg-footer.png.
export function Footer() {
  return (
    <footer className="relative isolate bg-[#001331] text-white overflow-hidden">
      <BrandSlashes className="-top-8 right-[-5rem] w-80 sm:w-[30rem]" />
      <BrandSlashes className="-bottom-10 -left-20 w-64 sm:w-96" />

      <div className="relative z-10 container mx-auto px-4 pt-12 pb-8 sm:pt-16 sm:pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            {/* VA-50: ancho fluido con la proporción real del logo (1842×128); antes medía 448 px
                fijos y se salía de la columna en la grilla de 4. */}
            <div className="relative w-full max-w-72 aspect-[1842/128] mb-4">
              <Image
                src="/logo-full-white.png"
                alt="Ventas Aeronáuticas"
                fill
                className="object-contain object-left"
              />
            </div>
            <p className="text-white/90 text-sm drop-shadow-md">
              ¿Necesitás algo para aviación? Buscalo acá.
            </p>
          </div>

          <div>
            <h3 className="font-heading font-semibold mb-3 text-sm text-white drop-shadow-md">
              Ayuda
            </h3>
            <ul className="space-y-1 sm:space-y-2 text-sm text-white/90 drop-shadow-sm">
              <li>
                <Link href="/about" className="inline-block py-1.5 sm:py-0 hover:text-white transition-colors">
                  Nosotros
                </Link>
              </li>
              <li>
                <Link href="/faq" className="inline-block py-1.5 sm:py-0 hover:text-white transition-colors">
                  Preguntas frecuentes
                </Link>
              </li>
              <li>
                <Link href="/howtopublish" className="inline-block py-1.5 sm:py-0 hover:text-white transition-colors">
                  Cómo publicar
                </Link>
              </li>
              <li>
                <Link href="/services/guides" className="inline-block py-1.5 sm:py-0 hover:text-white transition-colors">
                  Guías
                </Link>
              </li>
              <li>
                <Link href="/terms" className="inline-block py-1.5 sm:py-0 hover:text-white transition-colors">
                  Términos y condiciones
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="inline-block py-1.5 sm:py-0 hover:text-white transition-colors">
                  Privacidad
                </Link>
              </li>
              <li>
                <Link href="/arrepentimiento" className="inline-block py-1.5 sm:py-0 hover:text-white transition-colors">
                  Botón de arrepentimiento
                </Link>
              </li>
              <li>
                {/* VA-155: cambiar la elección del cartel de cookies */}
                <CookieSettingsLink className="inline-block py-1.5 sm:py-0 hover:text-white transition-colors" />
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-heading font-semibold mb-3 text-sm text-white drop-shadow-md">
              Explorar
            </h3>
            <ul className="space-y-1 sm:space-y-2 text-sm text-white/90 drop-shadow-sm">
              <li>
                <Link href="/aircraft" className="inline-block py-1.5 sm:py-0 hover:text-white transition-colors">
                  Aviones en venta
                </Link>
              </li>
              <li>
                <Link href="/spareparts" className="inline-block py-1.5 sm:py-0 hover:text-white transition-colors">
                  Repuestos en venta
                </Link>
              </li>
              {/* VA-94 */}
              <li>
                <Link href="/plans" className="inline-block py-1.5 sm:py-0 hover:text-white transition-colors">
                  Planes y precios
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-heading font-semibold mb-3 text-sm text-white drop-shadow-md">
              Contacto
            </h3>
            <ul className="space-y-1 sm:space-y-2.5 text-sm text-white/90 drop-shadow-sm">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-white" />
                <a
                  href="mailto:aeronauticasventas@gmail.com"
                  className="hover:text-white transition-colors truncate"
                >
                  aeronauticasventas@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-white" />
                <a href={`tel:${CONTACT_PHONE.e164}`} className="inline-block py-1.5 sm:py-0 hover:text-white transition-colors">
                  {CONTACT_PHONE.display}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <SiInstagram size={18} className="shrink-0 text-white" />
                <a
                  href="https://instagram.com/ventas.aeronauticas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block py-1.5 sm:py-0 hover:text-white transition-colors"
                >
                  @ventas.aeronauticas
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* DESCARGO DE RESPONSABILIDAD / DISCLAIMER DE MARCAS */}
        <div className="border-t border-white/20 mt-10 pt-6 text-center space-y-2">
          <p className="max-w-4xl mx-auto text-[11px] leading-relaxed text-white/70 drop-shadow-sm">
            Las marcas y logotipos de fabricantes exhibidos en este sitio pertenecen a sus respectivos titulares y se utilizan únicamente con fines de identificación de productos. Su uso no implica alianza comercial ni patrocinio.
          </p>
          <p className="text-xs text-white/80 drop-shadow-sm">
            © {new Date().getFullYear()} Ventas Aeronáuticas. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}