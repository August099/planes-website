import { CategoryIconBase, type CategoryIconProps } from "./CategoryIconBase";

export function RuedaIcon(props: CategoryIconProps) {
  return (
    <CategoryIconBase {...props}>
      <circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4v5M20 12h-5M12 20v-5M4 12h5"/><path d="m6.3 6.3 3.5 3.5M17.7 6.3l-3.5 3.5M17.7 17.7l-3.5-3.5M6.3 17.7l3.5-3.5"/>
    </CategoryIconBase>
  );
}
