import type { ReactNode, SVGProps } from "react";

export interface CategoryIconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  size?: number | string;
  strokeWidth?: number;
  title?: string;
}

// Base común de los íconos de Ventas Aeronáuticas: grilla 24×24, trazo con currentColor.
export function CategoryIconBase({
  size = 24,
  strokeWidth = 1.8,
  title,
  children,
  ...props
}: CategoryIconProps & { children: ReactNode }) {
  const labelProps = title
    ? { role: "img", "aria-label": title }
    : { "aria-hidden": true };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...labelProps}
      {...props}
    >
      {children}
    </svg>
  );
}
