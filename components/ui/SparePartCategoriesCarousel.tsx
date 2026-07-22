"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Radio, Cog, Shield, Fan, Gauge, Wrench, Package } from "lucide-react";

const SPARE_PART_CATEGORIES = [
  { id: "AVIONICS", label: "Aviónica & Radio", icon: Radio },
  { id: "ENGINE", label: "Motor & Partes", icon: Cog },
  { id: "AIRFRAME", label: "Fuselaje & Estructura", icon: Shield },
  { id: "PROPELLER", label: "Hélices", icon: Fan },
  { id: "INSTRUMENTS", label: "Instrumental", icon: Gauge },
  { id: "HARDWARE", label: "Herramental & Varios", icon: Wrench },
];

export function SparePartCategoriesCarousel() {
  return (
    <section className="py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-heading font-semibold">
            Buscar Repuestos por Categoría
          </h2>
          <p className="text-sm text-muted-foreground">
            Encuentra piezas y componentes certificados para tu aeronave
          </p>
        </div>
        <Link
          href="/spare-parts"
          className="text-sm font-medium text-primary hover:underline hidden sm:block"
        >
          Ver todo el catálogo →
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-none">
        {SPARE_PART_CATEGORIES.map((cat) => {
          const Icon = cat.icon || Package;
          return (
            <Link
              key={cat.id}
              href={`/spare-parts?category=${cat.id}`}
              className="snap-start shrink-0 w-[160px] sm:w-[180px]"
            >
              <Card className="h-full bg-card hover:border-primary/50 hover:shadow-md transition-all group cursor-pointer border-border/60">
                <CardContent className="p-5 flex flex-col items-center text-center justify-center h-full">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
                    <Icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {cat.label}
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}