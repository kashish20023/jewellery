import React from "react";
import { clsx } from "clsx";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "hallmark" | "gold" | "charcoal" | "outline" | "danger";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({
  children,
  variant = "hallmark",
  size = "sm",
  className,
}: BadgeProps) {
  const baseClasses =
    "inline-flex items-center uppercase font-mono tracking-wider font-medium transition-colors";

  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
  };

  const variantClasses = {
    hallmark: "bg-ivory-200 text-charcoal-800 border border-border",
    gold: "bg-gold-100 text-gold-900 border border-gold-300",
    charcoal: "bg-charcoal-900 text-ivory-50 border border-charcoal-800",
    outline: "bg-transparent text-charcoal-700 border border-border",
    danger: "bg-red-50 text-red-800 border border-red-200",
  };

  return (
    <span
      className={clsx(
        baseClasses,
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

