import React from "react";

export function FrenosIcon({
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
      <circle cx="11" cy="12" r="7"/><circle cx="11" cy="12" r="2.2"/><path d="M18 6v12"/><path d="M18 7h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/><path d="M7 12h8M11 8v8"/>
    </svg>
  );
}
