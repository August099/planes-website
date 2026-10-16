import { CategoryIconBase, type CategoryIconProps } from "./CategoryIconBase";

export function HeadsetIcon(props: CategoryIconProps) {
  return (
    <CategoryIconBase {...props}>
      <path d="M4 13v-1a8 8 0 0 1 16 0v1"/><rect x="3" y="12" width="4" height="6" rx="1"/><rect x="17" y="12" width="4" height="6" rx="1"/><path d="M17 18h-2a3 3 0 0 1-3 3h-2"/><path d="M10 21h2"/>
    </CategoryIconBase>
  );
}
