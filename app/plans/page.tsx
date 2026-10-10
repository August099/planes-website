import { getListingPrices } from "@/lib/listing-prices";
import { PlansClient } from "./PlansClient";

// VA-59: los precios por aviso vienen de la base (cacheados con tag); la página sigue estática.
export default async function PlansPage() {
  const prices = await getListingPrices();
  return <PlansClient listingPrices={{ aircraft: prices.AIRCRAFT.amount, sparePart: prices.SPARE_PART.amount }} />;
}
