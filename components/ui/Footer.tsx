import Link from "next/link";
import Image from "next/image";
import { Mail, Phone } from "lucide-react";
import { SiInstagram } from '@icons-pack/react-simple-icons';




export function Footer() {
  return (
    <footer className="bg-[#001F58] text-white pt-16">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Image
              src="/logo-mark.png"
              alt="Ventas Aeronáuticas"
              width={48}
              height={48}
              className="mb-3"
            />
            <p className="text-white/70 text-sm">
              Marketplace de aviones agrícolas en Argentina.
            </p>
          </div>

          <div>
            <h3 className="font-heading font-semibold mb-3 text-sm">Ayuda</h3>
            <ul className="space-y-2 text-sm text-white/70">
              <li><Link href="/faq" className="hover:text-white transition-colors">Preguntas frecuentes</Link></li>
              <li><Link href="/como-publicar" className="hover:text-white transition-colors">Cómo publicar</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Términos y condiciones</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacidad</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-heading font-semibold mb-3 text-sm">Explorar</h3>
            <ul className="space-y-2 text-sm text-white/70">
              <li><Link href="/aviones" className="hover:text-white transition-colors">Aviones en venta</Link></li>
              <li><Link href="/plans" className="hover:text-white transition-colors">Planes para publicar</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-heading font-semibold mb-3 text-sm">Contacto</h3>
            <ul className="space-y-2 text-sm text-white/70">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href="mailto:aeronauticasventas@gmail.com" className="hover:text-white transition-colors">
                  aeronauticasventas@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <a href="tel:+5490000000000" className="hover:text-white transition-colors">
                  +54 9 000 000 0000
                </a>
              </li>
              <li className="flex items-center gap-2">
                <SiInstagram size={24} />
                <a href="https://instagram.com/ventas.aeronauticas" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  @ventas.aeronauticas
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 text-center text-xs text-white/50">
          © {new Date().getFullYear()} Ventas Aeronáuticas. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}