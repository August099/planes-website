import React from "react";

export function AceiteraIcon({
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
      <path d="M5 8h9l3 3v5H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2Z"/><path d="M14 8V5h4l3 3"/><path d="M8 8V5"/><path d="M18 13c0 1.5-1.5 2.2-1.5 3.2a1.5 1.5 0 0 0 3 0c0-1-1.5-1.7-1.5-3.2Z"/>
    </svg>
  );
}
