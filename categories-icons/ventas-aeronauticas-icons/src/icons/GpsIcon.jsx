import React from "react";

export function GpsIcon({
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
      <rect x="3" y="4" width="18" height="16" rx="2"/><path d="m5 16 4-4 3 2 5-6"/><path d="M17 6h1M18 16h1M7 7h1"/><circle cx="16" cy="15" r="1.2"/>
    </svg>
  );
}
