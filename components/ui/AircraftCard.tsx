import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react"; // Importamos el ícono de mapa

type AircraftCardProps = {
  id: string;
  title: string;
  price: number | null;
  year: number | null;
  category: string | null;
  totalTimeHours: number | null;
  city?: string | null;
  province?: string | null;
  imageUrl: string;
};

export function AircraftCard({
  id,
  title,
  price,
  year,
  category,
  totalTimeHours,
  city,
  province,
  imageUrl,
}: AircraftCardProps) {
  const formattedPrice = price
    ? new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(price)
    : "Consultar precio";

  // Formateamos la ubicación según los datos disponibles
  const locationText = [city, province].filter(Boolean).join(", ");

  return (
    <Link href={`/plane-details/${id}`}>
      <Card className="overflow-hidden bg-[#001F58]/[0.025] border-[#001F58]/10 hover:border-primary/40 hover:shadow-lg transition-all">
        <div className="relative w-full h-48">
          <Image src={imageUrl} alt={title} fill className="object-cover" />
        </div>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium text-base">{title}</h3>
            {category && <Badge variant="secondary">{category}</Badge>}
          </div>
          <p className="text-xl font-heading font-bold text-primary mb-2">
            {formattedPrice}
          </p>
          <div className="text-sm text-muted-foreground space-y-1">
            {(year || totalTimeHours) && (
              <p>
                {year ? `Año ${year}` : ""}
                {year && totalTimeHours ? " · " : ""}
                {totalTimeHours ? `${totalTimeHours.toLocaleString()} hs totales` : ""}
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