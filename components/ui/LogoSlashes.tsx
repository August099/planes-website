// Las "//" del logo con las proporciones del original (27/10): la misma geometría que BrandSlashes del footer
// (barra ancha de 120, fina de 60, separación de 30 e inclinación de 144 sobre 152), pero rellenas. Se escala
// sin deformarse (preserveAspectRatio por defecto): el alto lo da la clase y el ancho sale solo.
export function LogoSlashes({
  className = "",
  wide = "currentColor",
  thin = "currentColor",
}: {
  className?: string;
  /** Color de la barra ancha. */
  wide?: string;
  /** Color de la barra fina. */
  thin?: string;
}) {
  return (
    <svg aria-hidden viewBox="6 4 354 152" className={`aspect-[354/152] ${className}`}>
      <polygon points="150,4 270,4 126,156 6,156" fill={wide} />
      <polygon points="300,4 360,4 216,156 156,156" fill={thin} />
    </svg>
  );
}
