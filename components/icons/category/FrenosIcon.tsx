import { CategoryIconBase, type CategoryIconProps } from "./CategoryIconBase";

export function FrenosIcon(props: CategoryIconProps) {
  return (
    <CategoryIconBase {...props}>
      <circle cx="11" cy="12" r="7"/><circle cx="11" cy="12" r="2.2"/><path d="M18 6v12"/><path d="M18 7h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/><path d="M7 12h8M11 8v8"/>
    </CategoryIconBase>
  );
}
