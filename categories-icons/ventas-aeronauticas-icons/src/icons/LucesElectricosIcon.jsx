import React from "react";

export function LucesElectricosIcon({
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
      <path d="M12 2v3M4.9 4.9 7 7M2 12h3M19.1 4.9 17 7M22 12h-3"/><path d="M8.5 14.5a5 5 0 1 1 7 0c-.9.8-1.5 1.5-1.5 2.5h-4c0-1-.6-1.7-1.5-2.5Z"/><path d="M10 20h4M10.5 22h3"/><path d="M18 17h3v3h-3zM19.5 17v-2"/>
    </svg>
  );
}
