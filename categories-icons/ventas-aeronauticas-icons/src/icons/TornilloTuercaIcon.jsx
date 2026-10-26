import React from "react";

export function TornilloTuercaIcon({
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
      {/* Tornillo */}
      <path d="m5 17 7-7" />
      <path d="m4 19 2 1 9-9-2-2-9 9Z" />
      <path d="m11 9 4-4 4 4-4 4" />
      <path d="M12.5 7.5 16 11" />
      <path d="M8 14.5 10.5 17" />
      {/* Tuerca hexagonal */}
      <path d="m17 14 3 1.7v3.6L17 21l-3-1.7v-3.6L17 14Z" />
      <circle cx="17" cy="17.5" r="1.2" />
    </svg>
  );
}
