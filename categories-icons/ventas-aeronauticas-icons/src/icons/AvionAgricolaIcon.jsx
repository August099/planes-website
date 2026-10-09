import React from "react";

export function AvionAgricolaIcon({
  size = 24,
  strokeWidth = 1.8,
  className = "",
  title,
  ...props
}) {
  const labelProps = title
    ? { role: "img", "aria-label": title }
    : { "aria-hidden": true };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...labelProps}
      {...props}
    >
      <path d="M2.5 12h19"/><path d="M7 12 9 8l3-4 2 4 3 4"/><path d="M9 12l-2 7M15 12l2 7"/><path d="M5 15h14"/><path d="M4 17h2M8 17h2M12 17h2M16 17h2M20 17h.5"/>
    </svg>
  );
}
