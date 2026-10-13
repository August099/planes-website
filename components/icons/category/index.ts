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

// Íconos disponibles para las categorías de repuestos. En el admin de taxonomía
// se carga el nombre (por ejemplo "MotorIcon") en el campo "icon" de la categoría.
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

// Nombres de react-icons que ya están guardados en la base, mapeados al ícono propio
// equivalente para no tener que migrar los datos.
const LEGACY_ICON_NAMES: Record<string, CategoryIcon> = {
  FaHeadset: HeadsetIcon,
  MdRadar: InstrumentosVueloIcon,
  FaPlaneUp: AvionIcon,
  FaTools: HerramientasIcon,
  GiPlantWatering: AvionAgricolaIcon,
  FaOilCan: AceiteraIcon,
  TbScrew: TornilloTuercaIcon,
  TbEngine: MotorIcon,
  FaBolt: LucesElectricosIcon,
  GiCarWheel: RuedaIcon,
};

export function getCategoryIcon(name?: string | null): CategoryIcon | null {
  const key = name?.trim();
  if (!key) return null;
  return CATEGORY_ICONS[key] ?? LEGACY_ICON_NAMES[key] ?? null;
}
