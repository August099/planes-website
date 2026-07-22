import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";

type SparePartCardProps = {
  id: string;
  title: string;
  price: number | null;
  priceOnRequest?: boolean;
  category: string | null;
  condition: string | null; // NUEVO, USADO, REMANUFACTURADO
  brand?: string | null;
  model?: string | null;
  city?: string | null;
  province?: string | null;
  imageUrl: string;
};

export function SparePartCard({
  id,
  title,
  price,
  priceOnRequest,
  category,
  condition,
  brand,
  model,
  city,
  province,
  imageUrl,
}: SparePartCardProps) {
  const formattedPrice =
    !priceOnRequest && price
      ? new Intl.NumberFormat("es-AR", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(price)
      : "Consultar precio";

  // Formateamos la ubicación según los datos disponibles
  const locationText = [city, province].filter(Boolean).join(", ");

  // Formatear texto de categoría y condición limpiando guiones bajos
  const formattedCategory = category ? category.replace(/_/g, " ") : null;
  const formattedCondition = condition ? condition.replace(/_/g, " ") : null;

  // Marca y modelo juntos
  const brandAndModel = [brand, model].filter(Boolean).join(" ");

  return (
    <Link href={`/sparepart-details/${id}`}>
      <Card className="overflow-hidden bg-[#001F58]/[0.025] border-[#001F58]/10 hover:border-primary/40 hover:shadow-lg transition-all group">
        <div className="relative w-full h-48">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {/* Condición flotando sobre la esquina superior derecha de la imagen */}
          {formattedCondition && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-black/70 hover:bg-black/80 text-white backdrop-blur-md uppercase text-[10px] font-semibold tracking-wider px-2.5 py-1 border-none shadow-sm">
                {formattedCondition}
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2 gap-2">
            <h3 className="font-medium text-base line-clamp-2">{title}</h3>
            {/* Categoría ahora al lado del título */}
            {formattedCategory && (
              <Badge variant="secondary" className="shrink-0 uppercase text-[10px]">
                {formattedCategory}
              </Badge>
            )}
          </div>

          <p className="text-xl font-heading font-bold text-primary mb-2">
            {formattedPrice}
          </p>

          <div className="text-sm text-muted-foreground space-y-1">
            {brandAndModel && (
              <p className="capitalize text-xs font-medium text-muted-foreground/90">
                {brandAndModel}
              </p>
            )}

            {locationText && (
              <p className="flex items-center gap-1 text-xs pt-1 border-t border-border/40 mt-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                <span>{locationText}</span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}