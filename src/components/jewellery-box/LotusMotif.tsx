import React from "react";

export interface LotusMotifProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Clean, single-colour SVG Lotus Blossom motif matching the reference artwork.
 * Default fill is brand ivory #F6F0E2.
 */
export const LotusMotif: React.FC<LotusMotifProps> = ({
  className = "w-full h-full text-[#F6F0E2]",
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 100 80"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Central Majestic Lotus Petal */}
      <path
        d="M 50 2 C 43 20 40 40 50 62 C 60 40 57 20 50 2 Z"
        opacity="0.95"
      />

      {/* Inner-Left Petal */}
      <path
        d="M 46 16 C 33 26 27 42 41 62 C 32 46 35 32 46 16 Z"
        opacity="0.85"
      />

      {/* Inner-Right Petal */}
      <path
        d="M 54 16 C 67 26 73 42 59 62 C 68 46 65 32 54 16 Z"
        opacity="0.85"
      />

      {/* Outer Spreading Left Petal */}
      <path
        d="M 37 32 C 18 40 10 53 29 66 C 21 54 25 44 37 32 Z"
        opacity="0.75"
      />

      {/* Outer Spreading Right Petal */}
      <path
        d="M 63 32 C 82 40 90 53 71 66 C 79 54 75 44 63 32 Z"
        opacity="0.75"
      />

      {/* Low Calyx Flanks */}
      <path
        d="M 27 50 C 12 56 6 64 22 71 C 15 63 19 56 27 50 Z"
        opacity="0.65"
      />
      <path
        d="M 73 50 C 88 56 94 64 78 71 C 85 63 81 56 73 50 Z"
        opacity="0.65"
      />

      {/* Base Calyx Foundation Ribbon */}
      <path
        d="M 28 66 C 38 62 62 62 72 66 C 66 73 34 73 28 66 Z"
        opacity="0.9"
      />
    </svg>
  );
};

export default LotusMotif;

