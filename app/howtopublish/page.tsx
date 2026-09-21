import Image from "next/image";
import Link from "next/link";
import { 
    UserPlus, 
    ListPlus, 
    CreditCard, 
    Megaphone, 
    HelpCircle, 
    ArrowRight, 
    Ticket,
    ShieldCheck
} from "lucide-react";

export default function HowToPublishPage() {
    return (
        <main className="relative isolate overflow-hidden min-h-screen">
            {/* Fondo general */}
            <Image 
                src="/bkg-publish2.png" 
                alt="Fondo de la plataforma" 
                fill 
                priority 
                className="-z-20 object-cover" 
            />
            <div className="absolute inset-0 -z-10 bg-slate-50/90 backdrop-blur-[2px]" />

            <div className="container mx-auto px-4 pt-16 pb-24 max-w-4xl">
                
                {/* Encabezado Principal */}
                <div className="text-center mb-16">
                    <h1 className="font-heading text-4xl sm:text-5xl font-bold text-[#001F58] mb-6 tracking-tight">
                        ¿Cómo publicar tu producto?
                    </h1>
                    <p className="text-lg sm:text-xl text-slate-700 max-w-2xl mx-auto leading-relaxed">
                        Vender tu aeronave o repuesto en nuestra plataforma es un proceso seguro y directo. Seguí estos 4 simples pasos para llegar a miles de compradores.
                    </p>
                </div>

                {/* Pasos a seguir (Diseño Lineal para máxima claridad) */}
                <div className="space-y-6 mb-16">
                    
                    {/* Paso 1 */}
                    <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-lg flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                        <div className="flex-shrink-0 bg-blue-50 w-16 h-16 flex items-center justify-center rounded-2xl border border-blue-100">
                            <UserPlus className="w-8 h-8 text-[#001F58]" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-[#001F58] mb-2">1. Creá tu cuenta gratis</h2>
                            <p className="text-lg text-slate-600">
                                Para proteger tus datos y administrar tus ventas, el primer paso es <strong>registrarte o iniciar sesión</strong>. Es totalmente gratuito y solo te tomará un minuto.
                            </p>
                        </div>
                    </div>

                    {/* Paso 2 */}
                    <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-lg flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                        <div className="flex-shrink-0 bg-blue-50 w-16 h-16 flex items-center justify-center rounded-2xl border border-blue-100">
                            <ListPlus className="w-8 h-8 text-[#001F58]" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-[#001F58] mb-2">2. Completá el formulario</h2>
                            <p className="text-lg text-slate-600">
                                Dirigite a la sección de publicación. Te guiaremos paso a paso para cargar:
                            </p>
                            <ul className="list-disc list-inside mt-3 text-lg text-slate-600 space-y-1">
                                <li>Datos técnicos (Marca, modelo, horas de motor).</li>
                                <li>Hasta 15 fotografías de buena calidad.</li>
                                <li>Descripción detallada de tu avión o repuesto.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Paso 3 (Destacado porque involucra pago) */}
                    <div className="bg-[#001F58] rounded-2xl p-6 sm:p-8 border border-[#001F58] shadow-xl flex flex-col sm:flex-row gap-6 items-start sm:items-center text-white relative overflow-hidden">
                        <div className="absolute -right-10 -top-10 opacity-10 pointer-events-none">
                            <CreditCard className="w-48 h-48" />
                        </div>
                        <div className="flex-shrink-0 bg-white/10 w-16 h-16 flex items-center justify-center rounded-2xl border border-white/20 backdrop-blur-md relative z-10">
                            <CreditCard className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1 relative z-10">
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-2xl font-bold text-white">3. Pago y Cupón de Descuento</h2>
                            </div>
                            <p className="text-lg text-blue-100 mb-4">
                                Antes de que el anuncio se haga público, el sistema te pedirá abonar el costo de la publicación mediante nuestra pasarela de pago segura. 
                            </p>
                            <div className="bg-white/10 border border-white/20 p-4 rounded-xl flex items-start gap-3">
                                <Ticket className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-base text-white font-medium">
                                    ¿Tenés un código promocional? ¡No te olvides de ingresarlo en este paso para aplicar tu descuento antes de pagar!
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Paso 4 */}
                    <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-lg flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                        <div className="flex-shrink-0 bg-emerald-50 w-16 h-16 flex items-center justify-center rounded-2xl border border-emerald-100">
                            <Megaphone className="w-8 h-8 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-[#001F58] mb-2">4. ¡Publicación activa!</h2>
                            <p className="text-lg text-slate-600">
                                Una vez confirmado el pago, tu producto estará visible inmediatamente. Los compradores interesados te contactarán de forma directa y sin intermediarios.
                            </p>
                        </div>
                    </div>

                </div>

                {/* Acciones Principales */}
                <div className="flex flex-col sm:flex-row justify-center gap-4 mb-20">
                    <Link 
                        href="/publish" 
                        className="px-8 py-4 bg-[#001F58] text-white rounded-xl font-bold text-lg text-center hover:bg-blue-900 transition-colors shadow-lg flex items-center justify-center gap-2"
                    >
                        Comenzar Ahora <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>

                {/* Sección Alternativa: Publicación Asistida */}
                <div className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-red-100 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                        <HelpCircle className="w-64 h-64" />
                    </div>
                    
                    <div className="relative z-10 text-center sm:text-left flex flex-col sm:flex-row items-center gap-8">
                        <div className="flex-1">
                            <h3 className="text-3xl font-bold text-[#001F58] mb-4">
                                ¿No tenés tiempo o se te complica la tecnología?
                            </h3>
                            <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                                Contamos con un <strong>Servicio de Publicación Asistida</strong>. Dejanos tu número de teléfono y nosotros nos ponemos en contacto con vos. Solo tenés que mandarnos las fotos e información por WhatsApp y nuestro equipo arma el anuncio completo para que no tengas que preocuparte por nada.
                            </p>
                            <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-500 font-medium mb-6">
                                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                Sin estrés, fácil y rápido.
                            </div>
                            <Link 
                                href="/publish" 
                                className="inline-block px-8 py-3.5 bg-red-600 text-white rounded-xl font-bold text-lg text-center hover:bg-red-700 transition-colors shadow-md"
                            >
                                Solicitar asistencia técnica
                            </Link>
                        </div>
                    </div>
                </div>

            </div>
        </main>
    );
}