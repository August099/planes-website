import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AircraftCardProps = {
  id: string;
  title: string;
  price: number | null;
  year: number | null;
  category: string | null;
  totalTimeHours: number | null;
  location: string | null;
  imageUrl: string;
};

export function AircraftCard({
  id,
  title,
  price,
  year,
  category,
  totalTimeHours,
  location,
  imageUrl,
}: AircraftCardProps) {
  const formattedPrice = price
    ? new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(price)
    : "Consultar precio";

  return (
    <Link href={`/aviones/${id}`}>
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
            {location && <p>{location}</p>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}