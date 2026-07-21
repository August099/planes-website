import Image from "next/image";
import Link from "next/link";
import type { SparePartCategory, SparePartCondition } from "@prisma/client";
import {
  sparePartCategoryLabels,
  sparePartConditionLabels,
} from "@/lib/spare-part-labels";

interface SparePartCardProps {
  id: string;
  title: string;
  price: number | null;
  priceOnRequest: boolean;
  category: SparePartCategory;
  condition: SparePartCondition;
  city: string;
  province: string;
  imageUrl: string;
}

export function SparePartCard({
  id,
  title,
  price,
  priceOnRequest,
  category,
  condition,
  city,
  province,
  imageUrl,
}: SparePartCardProps) {
  return (
    <Link
      href={`/spareparts/${id}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-white transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-secondary">
          {sparePartConditionLabels[condition]}
        </span>
      </div>

      <div className="p-4">
        <p className="text-xs font-medium text-muted-foreground">
          {sparePartCategoryLabels[category]}
        </p>
        <h3 className="mt-1 font-heading text-base font-semibold text-secondary line-clamp-2">
          {title}
        </h3>

        <p className="mt-2 font-heading text-lg font-bold text-primary">
          {priceOnRequest || price === null
            ? "Precio a consultar"
            : `$${price.toLocaleString("es-AR")}`}
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          {city}, {province}
        </p>
      </div>
    </Link>
  );
}