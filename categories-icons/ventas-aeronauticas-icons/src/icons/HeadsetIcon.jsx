import React from "react";

export function HeadsetIcon({
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
      <path d="M4 13v-1a8 8 0 0 1 16 0v1"/><rect x="3" y="12" width="4" height="6" rx="1"/><rect x="17" y="12" width="4" height="6" rx="1"/><path d="M17 18h-2a3 3 0 0 1-3 3h-2"/><path d="M10 21h2"/>
    </svg>
  );
}
