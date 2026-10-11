// VA-85: íconos permitidos para una guía (nombres de lucide). Se guarda el nombre; mantener la
// lista corta evita importar todo lucide en el sitio.
export const GUIDE_ICONS = [
  "BookOpen",
  "ClipboardCheck",
  "FileSignature",
  "Tag",
  "Calculator",
  "Compass",
  "GraduationCap",
  "ShieldCheck",
  "Warehouse",
  "Plane",
  "Wrench",
  "FileText",
] as const;

export type GuideIconName = (typeof GUIDE_ICONS)[number];
