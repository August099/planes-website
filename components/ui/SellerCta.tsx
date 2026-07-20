import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SellerCta() {
  return (
    <section className="bg-[#001F58]/[0.03] border-y border-[#001F58]/10">
      <div className="container mx-auto px-4 py-14 text-center">
        <h2 className="text-2xl font-heading font-semibold text-[#001F58] mb-2">
          ¿Tenés un avión para vender?
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto mb-6">
          Publicalo en minutos y llegá a compradores de todo el país.
        </p>
        <Link href="/register">
          <Button size="lg" className="bg-primary hover:bg-primary/90">
            Publicar mi avión
          </Button>
        </Link>
      </div>
    </section>
  );
}