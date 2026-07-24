type DetailRowProps = {
  label: string;
  value: string | number | null | undefined;
  highlight?: boolean;
  multiline?: boolean;
  last?: boolean;
};

export function DetailRow({ label, value, highlight, multiline, last }: DetailRowProps) {
  if (value === null || value === undefined || value === "") return null;

  return (
    <div
      className={`flex flex-col sm:flex-row ${!last ? "border-b border-gray-200" : ""}`}
    >
      <div className="sm:w-1/3 bg-gray-50 px-4 py-3 font-medium text-gray-600 text-sm">
        {label}
      </div>
      <div
        className={`sm:w-2/3 px-4 py-3 text-base ${
          highlight ? "text-blue-600 font-medium hover:underline cursor-pointer" : "text-gray-800"
        } ${multiline ? "whitespace-pre-line leading-relaxed" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}