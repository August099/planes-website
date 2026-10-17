import type { ComponentType } from "react";
import type { CategoryIconProps } from "./CategoryIconBase";
import { AceiteraIcon } from "./AceiteraIcon";
import { AvionAgricolaIcon } from "./AvionAgricolaIcon";
import { AvionIcon } from "./AvionIcon";
import { CombustibleIcon } from "./CombustibleIcon";
import { FrenosIcon } from "./FrenosIcon";
import { GpsIcon } from "./GpsIcon";
import { HeadsetIcon } from "./HeadsetIcon";
import { HeliceIcon } from "./HeliceIcon";
import { HerramientasIcon } from "./HerramientasIcon";
import { InstrumentosVueloIcon } from "./InstrumentosVueloIcon";
import { LucesElectricosIcon } from "./LucesElectricosIcon";
import { MotorIcon } from "./MotorIcon";
import { RuedaIcon } from "./RuedaIcon";
import { TornilloTuercaIcon } from "./TornilloTuercaIcon";

export type { CategoryIconProps } from "./CategoryIconBase";

type CategoryIcon = ComponentType<CategoryIconProps>;

// Íconos disponibles para las categorías de repuestos. En el admin de taxonomía se elige uno de
// la lista (lib/category-icon-names.ts) y se guarda su nombre (por ejemplo "MotorIcon").
export const CATEGORY_ICONS: Record<string, CategoryIcon> = {
  AceiteraIcon,
  AvionAgricolaIcon,
  AvionIcon,
  CombustibleIcon,
  FrenosIcon,
  GpsIcon,
  HeadsetIcon,
  HeliceIcon,
  HerramientasIcon,
  InstrumentosVueloIcon,
  LucesElectricosIcon,
  MotorIcon,
  RuedaIcon,
  TornilloTuercaIcon,
};

// VA-148: los nombres viejos de react-icons se migraron en la base (va148_iconos_categorias).

export function getCategoryIcon(name?: string | null): CategoryIcon | null {
  const key = name?.trim();
  if (!key) return null;
  return CATEGORY_ICONS[key] ?? null;
}
