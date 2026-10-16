import { MAX_DESCRIPTION_LENGTH } from "@/lib/listing-schema";

// Campo "Descripción" del formulario de publicación (VA-53): texto libre con tope de 2000
// caracteres, contador y la ayuda de formato que después respeta el detalle
// (components/ui/listing/ListingDescription.tsx).
export function DescriptionTextarea({
  value,
  onChange,
  placeholder,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const remaining = MAX_DESCRIPTION_LENGTH - value.length;
  return (
    <div>
      <textarea
        required={required}
        rows={6}
        maxLength={MAX_DESCRIPTION_LENGTH}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 rounded-xl border border-slate-300 bg-white"
      />
      <div className="mt-1 flex items-start justify-between gap-3 text-[11px] text-slate-500">
        <p>
          Tip: una línea que termina en <strong>&quot;:&quot;</strong> se ve como subtítulo, y las líneas que empiezan con{" "}
          <strong>&quot;-&quot;</strong> forman una lista.
        </p>
        <span className={`shrink-0 tabular-nums ${remaining < 100 ? "text-red-600 font-semibold" : ""}`}>
          {value.length}/{MAX_DESCRIPTION_LENGTH}
        </span>
      </div>
    </div>
  );
}
