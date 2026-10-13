import React from "react";

export function HerramientasIcon({
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
      <path d="m4 5 5 5"/><path d="M3 3l4 1 2 2-3 3-2-2Z"/><path d="m20 19-5-5"/><path d="M21 21l-4-1-2-2 3-3 2 2Z"/><path d="m9 15 6-6"/><path d="m8 16 1 1M7 17l1 1"/>
    </svg>
  );
}
