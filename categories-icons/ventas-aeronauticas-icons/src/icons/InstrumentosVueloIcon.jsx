import React from "react";

export function InstrumentosVueloIcon({
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
      <rect x="2.5" y="4" width="19" height="16" rx="2"/><circle cx="8" cy="12" r="3.5"/><circle cx="16" cy="12" r="3.5"/><path d="M8 12V9.5M8 12l2 1M16 12l2-2M14.5 12H17.5"/><path d="M5 12h6M13 12h6"/>
    </svg>
  );
}
