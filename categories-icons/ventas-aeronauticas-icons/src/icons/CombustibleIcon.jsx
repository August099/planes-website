import React from "react";

export function CombustibleIcon({
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
      <path d="M6 3h9v18H6z"/><path d="M15 6h2l3 3v6a2 2 0 0 0 2-2V9"/><path d="M9 8c0 2-2 2-2 4a2 2 0 0 0 4 0c0-2-2-2-2-4Z"/><path d="M8 6h5"/>
    </svg>
  );
}
