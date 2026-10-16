import React from "react";

export function AvionIcon({
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
      <path d="M3 12h18" />
      <path d="M12 3v18" />
      <path d="M5 12l3-2 4-7 4 7 3 2-3 2-4 7-4-7-3-2Z" />
      <circle cx="12" cy="12" r="1.5" />
      {/* Hélice tripala */}
      <path d="M12 10.5c-1.8-1.9-1.8-4.2-.5-4.7 1.3-.5 1.8 1.9.5 4.7Z" />
      <path d="M13.3 12.8c2.6-.2 4.3.9 4 2.2-.3 1.3-2.6.8-4-.9Z" />
      <path d="M11.3 12.8c-.8 2.5-2.5 3.5-3.4 2.5-.9-1 1-2.5 2.8-3.2Z" />
    </svg>
  );
}
