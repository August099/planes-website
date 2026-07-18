import Image from "next/image";

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <Image src="/logo-full.png" alt="Ventas Aeronáuticas" width={200} height={48} priority />
        </div>

        <svg viewBox="0 0 200 12" className="w-32 mx-auto mb-6" aria-hidden="true">
          <path
            d="M2 8 Q 50 -2, 100 6 T 198 4"
            fill="none"
            stroke="#E70F1F"
            strokeWidth="1.5"
            strokeDasharray="3 4"
            strokeLinecap="round"
          />
        </svg>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-heading font-semibold text-[#001F58]">{title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
        </div>

        <div className="bg-white border border-border rounded-xl p-6 shadow-sm space-y-4">
          {children}
        </div>
      </div>
    </main>
  );
}