import { CategoryIconBase, type CategoryIconProps } from "./CategoryIconBase";

export function CombustibleIcon(props: CategoryIconProps) {
  return (
    <CategoryIconBase {...props}>
      <path d="M6 3h9v18H6z"/><path d="M15 6h2l3 3v6a2 2 0 0 0 2-2V9"/><path d="M9 8c0 2-2 2-2 4a2 2 0 0 0 4 0c0-2-2-2-2-4Z"/><path d="M8 6h5"/>
    </CategoryIconBase>
  );
}
