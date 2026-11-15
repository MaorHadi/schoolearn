import type { ComponentProps, ReactNode } from "react";

/** A square button that shows only an icon; `label` is its accessible name and tooltip. */
export function IconButton({
  label,
  icon,
  danger = false,
  className,
  type = "button",
  ...buttonProps
}: {
  label: string;
  icon: ReactNode;
  danger?: boolean;
} & ComponentProps<"button">) {
  const classes = ["icon-btn", danger ? "icon-btn--danger" : "", className ?? ""];
  return (
    <button
      type={type}
      className={classes.filter(Boolean).join(" ")}
      aria-label={label}
      title={label}
      {...buttonProps}
    >
      {icon}
    </button>
  );
}
