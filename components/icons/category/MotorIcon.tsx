import { CategoryIconBase, type CategoryIconProps } from "./CategoryIconBase";

export function MotorIcon(props: CategoryIconProps) {
  return (
    <CategoryIconBase {...props}>
      <circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 4v6M12 14v6M4 12h6M14 12h6"/><path d="m6.3 6.3 4.2 4.2M13.5 13.5l4.2 4.2M17.7 6.3l-4.2 4.2M10.5 13.5l-4.2 4.2"/>
    </CategoryIconBase>
  );
}
