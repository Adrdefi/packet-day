import { HTMLAttributes } from "react";

type BadgeVariant = "sage" | "honey" | "coral" | "muted";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  sage: "bg-sage/15 text-sage-dark",
  honey: "bg-honey/20 text-honey-dark",
  coral: "bg-coral/15 text-coral-dark",
  muted: "bg-gray-100 text-muted",
};

export default function Badge({
  variant = "sage",
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
        variantClasses[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}
