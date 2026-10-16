import { PROVINCES, normalizeProvince } from "@/lib/provinces";

// Selector de provincia (VA-77): solo deja elegir una de las 24 canónicas. El valor es el nombre
// oficial. Si llega un valor viejo ("CABA", "Santa fe") se muestra ya normalizado.
const label = (name: string) =>
  name === "Tierra del Fuego, Antártida e Islas del Atlántico Sur" ? "Tierra del Fuego" : name;

type Props = {
  className: string;
  name?: string;
  required?: boolean;
  placeholder?: string;
} & (
  | { value: string; onChange: (value: string) => void; defaultValue?: never }
  | { defaultValue?: string | null; value?: never; onChange?: never }
);

export function ProvinceSelect({ className, name, required, placeholder = "Elegí una provincia", ...rest }: Props) {
  const controlled = "value" in rest && rest.value !== undefined;
  const selectProps = controlled
    ? { value: normalizeProvince(rest.value) ?? "", onChange: (e: React.ChangeEvent<HTMLSelectElement>) => rest.onChange?.(e.target.value) }
    : { defaultValue: normalizeProvince(rest.defaultValue) ?? "" };

  return (
    <select name={name} required={required} className={className} {...selectProps}>
      <option value="">{placeholder}</option>
      {PROVINCES.map((p) => (
        <option key={p.slug} value={p.name}>
          {label(p.name)}
        </option>
      ))}
    </select>
  );
}
