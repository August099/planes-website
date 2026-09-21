import Link from "next/link";
import Image from "next/image";
import { Mail, Phone } from "lucide-react";
import { SiInstagram } from "@icons-pack/react-simple-icons";

export function Footer() {
  return (
    <footer className="relative bg-[#001F58] text-white overflow-hidden">
      <Image
        src="/bkg-footer.png"
        alt="Fondo Footer"
        fill
        className="object-cover object-[center_30%]"
      />

      <div className="relative z-10 container mx-auto px-4 pt-12 pb-8 sm:pt-16 sm:pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="relative w-80 sm:w-[384px] md:w-[448px] h-24 mb-3">
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
            <ul className="space-y-2 text-sm text-white/90 drop-shadow-sm">
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">
                  Preguntas frecuentes
                </Link>
              </li>
              <li>
                <Link href="/howtopublish" className="hover:text-white transition-colors">
                  Cómo publicar
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Términos y condiciones
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacidad
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-heading font-semibold mb-3 text-sm text-white drop-shadow-md">
              Explorar
            </h3>
            <ul className="space-y-2 text-sm text-white/90 drop-shadow-sm">
              <li>
                <Link href="/planes" className="hover:text-white transition-colors">
                  Aviones en venta
                </Link>
              </li>
              <li>
                <Link href="/spareparts" className="hover:text-white transition-colors">
                  Repuestos en venta
                </Link>
              </li>
              {/*<li>
                <Link href="/plans" className="hover:text-white transition-colors">
                  Planes para publicar
                </Link>
              </li>
              <li>
                <Link href="/ads" className="hover:text-white transition-colors">
                  Publicite su negocio
                </Link>
              </li>*/}
            </ul>
          </div>

          <div>
            <h3 className="font-heading font-semibold mb-3 text-sm text-white drop-shadow-md">
              Contacto
            </h3>
            <ul className="space-y-2.5 text-sm text-white/90 drop-shadow-sm">
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
                <a href="tel:+5490000000000" className="hover:text-white transition-colors">
                  +54 9 000 000 0000
                </a>
              </li>
              <li className="flex items-center gap-2">
                <SiInstagram size={18} className="shrink-0 text-white" />
                <a
                  href="https://instagram.com/ventas.aeronauticas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
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