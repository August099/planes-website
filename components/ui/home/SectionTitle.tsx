// Título de sección de la Home (VA-79): mismo tamaño y peso en todas, azul marino en las zonas
// claras y blanco en las oscuras, con el "//" rojo de la marca como acento.
export function SectionTitle({
  children,
  tone = "light",
  id,
  className = "",
}: {
  children: React.ReactNode;
  tone?: "light" | "dark";
  id?: string;
  className?: string;
}) {
  return (
    <h2
      id={id}
      className={`text-2xl sm:text-3xl font-bold tracking-tight ${tone === "dark" ? "text-white" : "text-[#001F58]"} ${className}`}
    >
      <span aria-hidden className="mr-2 inline-block font-black tracking-tighter text-[#E70F1F]">
        {"//"}
      </span>
      {children}
    </h2>
  );
}
