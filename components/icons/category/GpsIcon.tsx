import { CategoryIconBase, type CategoryIconProps } from "./CategoryIconBase";

export function GpsIcon(props: CategoryIconProps) {
  return (
    <CategoryIconBase {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2"/><path d="m5 16 4-4 3 2 5-6"/><path d="M17 6h1M18 16h1M7 7h1"/><circle cx="16" cy="15" r="1.2"/>
    </CategoryIconBase>
  );
}
