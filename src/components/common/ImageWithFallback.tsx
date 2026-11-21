"use client";

import React, { useState } from "react";
import Image, { ImageProps } from "next/image";
import { Image as ImageIcon } from "lucide-react";

export interface ImageWithFallbackProps extends Omit<ImageProps, "onError"> {
  fallbackTitle?: string;
}

export function ImageWithFallback({
  src,
  alt,
  fallbackTitle = "Fine Jewellery Piece",
  className,
  ...props
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        role="img"
        aria-label={alt || fallbackTitle}
        className={`bg-ivory-200 border border-border flex flex-col items-center justify-center p-6 text-center text-charcoal-700 select-none ${
          className || "w-full h-full min-h-[220px]"
        }`}
      >
        <ImageIcon className="w-8 h-8 text-gold-500 mb-2 stroke-[1.25]" aria-hidden="true" />
        <span className="font-serif text-sm text-charcoal-900 line-clamp-1">
          {fallbackTitle}
        </span>
        <span className="text-[11px] font-mono text-charcoal-700 tracking-wider uppercase mt-1">
          Image In Atelier Archive
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}

