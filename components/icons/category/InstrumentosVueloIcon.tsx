import { CategoryIconBase, type CategoryIconProps } from "./CategoryIconBase";

export function InstrumentosVueloIcon(props: CategoryIconProps) {
  return (
    <CategoryIconBase {...props}>
      <rect x="2.5" y="4" width="19" height="16" rx="2"/><circle cx="8" cy="12" r="3.5"/><circle cx="16" cy="12" r="3.5"/><path d="M8 12V9.5M8 12l2 1M16 12l2-2M14.5 12H17.5"/><path d="M5 12h6M13 12h6"/>
    </CategoryIconBase>
  );
}
