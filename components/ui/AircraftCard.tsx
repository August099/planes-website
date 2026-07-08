import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AircraftCardProps = {
  id: string;
  title: string;
  price: number;
  year: number;
  category: string;
  totalTimeHours: number;
  location: string;
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
  const formattedPrice = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);

  return (
    <Link href={`/aviones/${id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative w-full h-48">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover"
          />
        </div>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium text-base">{title}</h3>
            <Badge variant="secondary">{category}</Badge>
          </div>
          <p className="text-lg font-semibold text-primary mb-2">
            {formattedPrice}
          </p>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Año {year} · {totalTimeHours.toLocaleString()} hs totales</p>
            <p>{location}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}