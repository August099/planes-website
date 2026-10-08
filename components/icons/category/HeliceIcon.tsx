import { CategoryIconBase, type CategoryIconProps } from "./CategoryIconBase";

export function HeliceIcon(props: CategoryIconProps) {
  return (
    <CategoryIconBase {...props}>
      <circle cx="12" cy="12" r="2"/><path d="M12 10C8 8 7 4 9 3c2-1 3 3 3 7"/><path d="M14 12c2-4 6-5 7-3 1 2-3 3-7 3"/><path d="M12 14c4 2 5 6 3 7-2 1-3-3-3-7"/><path d="M10 12c-2 4-6 5-7 3-1-2 3-3 7-3Z"/>
    </CategoryIconBase>
  );
}
