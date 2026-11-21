import React from "react";
import { Check } from "lucide-react";

/** Metallic gradients so the swatch reads as metal, not a flat paint chip. */
const METAL_GRADIENT: Record<string, string> = {
  "Yellow Gold": "radial-gradient(circle at 30% 30%, #F6E3A1 0%, #E0B84A 45%, #B8862B 100%)",
  "Rose Gold": "radial-gradient(circle at 30% 30%, #F8D9CE 0%, #E2A58F 45%, #B9705A 100%)",
  "White Gold": "radial-gradient(circle at 30% 30%, #FFFFFF 0%, #E3E3E3 45%, #AFAFAF 100%)",
  Platinum: "radial-gradient(circle at 30% 30%, #F4F5F7 0%, #D3D6DB 45%, #9BA0A8 100%)",
};

export function metalGradient(colour: string) {
  return METAL_GRADIENT[colour] || METAL_GRADIENT["Yellow Gold"];
}

export interface MetalSwatchProps {
  colour: string;
  /** Diameter in px. */
  size?: number;
  selected?: boolean;
  disabled?: boolean;
  /** When set, renders a button; otherwise a decorative span. */
  onClick?: () => void;
  /** Accessible name for the button form. */
  ariaLabel?: string;
  /** Show the colour name under the swatch. */
  withLabel?: boolean;
  className?: string;
}

/**
 * Metal colour swatch used on product cards (decorative) and the product
 * page selector (interactive). Same look everywhere so colours are learnable.
 */
export function MetalSwatch({
  colour,
  size = 16,
  selected = false,
  disabled = false,
  onClick,
  ariaLabel,
  withLabel = false,
  className = "",
}: MetalSwatchProps) {
  const disc = (
    <span
      aria-hidden="true"
      className="rounded-full block shadow-[inset_0_0_0_1px_rgba(26,26,26,0.12),0_1px_2px_rgba(26,26,26,0.15)]"
      style={{ width: size, height: size, background: metalGradient(colour) }}
    />
  );

  if (!onClick) {
    return (
      <span title={colour} className={`inline-flex flex-col items-center gap-1 ${className}`}>
        {disc}
        {withLabel && <span className="text-[10px] text-charcoal-600 leading-none">{colour}</span>}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={ariaLabel || colour}
      title={colour}
      className={`group inline-flex flex-col items-center gap-1.5 focus:outline-none ${disabled ? "opacity-40" : ""} ${className}`}
    >
      <span
        className={`relative rounded-full p-[3px] border-2 transition-colors ${
          selected ? "border-olive-600" : "border-transparent group-hover:border-olive-300 group-focus-visible:border-olive-600"
        }`}
      >
        {disc}
        {selected && (
          <span className="absolute -right-0.5 -bottom-0.5 w-4 h-4 rounded-full bg-olive-600 text-ivory-50 flex items-center justify-center border-2 border-ivory-100">
            <Check className="w-2.5 h-2.5 stroke-[3]" />
          </span>
        )}
      </span>
      {withLabel && (
        <span className={`text-[11px] leading-none ${selected ? "text-olive-800 font-medium" : "text-charcoal-600"}`}>{colour}</span>
      )}
    </button>
  );
}
