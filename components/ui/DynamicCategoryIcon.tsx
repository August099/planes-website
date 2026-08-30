"use client";

import React from "react";
import { Package } from "lucide-react";

// Importaciones directas de todas las familias comunes de React Icons
import * as PiIcons from "react-icons/pi";
import * as TiIcons from "react-icons/ti";
import * as BsIcons from "react-icons/bs";
import * as TbIcons from "react-icons/tb";
import * as LuIcons from "react-icons/lu";
import * as FaIcons from "react-icons/fa";
import * as Fa6Icons from "react-icons/fa6";
import * as GrIcons from "react-icons/gr";
import * as TfiIcons from "react-icons/tfi";
import * as MdIcons from "react-icons/md";
import * as HiIcons from "react-icons/hi2";
import * as FiIcons from "react-icons/fi";
import * as RiIcons from "react-icons/ri";
import * as GiIcons from "react-icons/gi";

const ALL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ...PiIcons,
  ...TiIcons,
  ...BsIcons,
  ...TbIcons,
  ...LuIcons,
  ...FaIcons,
  ...Fa6Icons,
  ...GrIcons,
  ...TfiIcons,
  ...MdIcons,
  ...HiIcons,
  ...FiIcons,
  ...RiIcons,
  ...GiIcons,
};

interface DynamicCategoryIconProps {
  name?: string | null;
  className?: string;
}

export function DynamicCategoryIcon({ name, className }: DynamicCategoryIconProps) {
  if (!name || !ALL_ICONS[name.trim()]) {
    return <Package className={className} />;
  }

  const IconComponent = ALL_ICONS[name.trim()];
  return <IconComponent className={className} />;
}