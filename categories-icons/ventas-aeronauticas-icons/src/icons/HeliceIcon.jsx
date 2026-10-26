import React from "react";

export function HeliceIcon({
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
      <circle cx="12" cy="12" r="2"/><path d="M12 10C8 8 7 4 9 3c2-1 3 3 3 7"/><path d="M14 12c2-4 6-5 7-3 1 2-3 3-7 3"/><path d="M12 14c4 2 5 6 3 7-2 1-3-3-3-7"/><path d="M10 12c-2 4-6 5-7 3-1-2 3-3 7-3Z"/>
    </svg>
  );
}
