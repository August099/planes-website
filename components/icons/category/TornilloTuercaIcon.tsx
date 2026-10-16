import { CategoryIconBase, type CategoryIconProps } from "./CategoryIconBase";

export function TornilloTuercaIcon(props: CategoryIconProps) {
  return (
    <CategoryIconBase {...props}>
      {/* Tornillo */}
      <path d="m5 17 7-7" />
      <path d="m4 19 2 1 9-9-2-2-9 9Z" />
      <path d="m11 9 4-4 4 4-4 4" />
      <path d="M12.5 7.5 16 11" />
      <path d="M8 14.5 10.5 17" />
      {/* Tuerca hexagonal */}
      <path d="m17 14 3 1.7v3.6L17 21l-3-1.7v-3.6L17 14Z" />
      <circle cx="17" cy="17.5" r="1.2" />
    </CategoryIconBase>
  );
}
