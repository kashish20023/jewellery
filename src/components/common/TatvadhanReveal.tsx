"use client";

import React, { useEffect, useRef, useState } from "react";

export interface TatvadhanRevealProps {
  children: React.ReactNode;
  delayMs?: number;
  direction?: "up" | "down" | "fade" | "scale";
  className?: string;
}

/**
 * Tatvadhan-style majestic scroll reveal component.
 * Inspired by royal heritage showcases (Tatvadhan / Jaipur Haute Joaillerie),
 * this applies smooth easing, gentle vertical drifts, and opulent opacity transitions.
 */
export function TatvadhanReveal({
  children,
  delayMs = 0,
  direction = "up",
  className = "",
}: TatvadhanRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Accessibility check: Reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (ref.current) {
            observer.unobserve(ref.current);
          }
        }
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    const el = ref.current;
    if (el) {
      observer.observe(el);
    }

    return () => {
      if (el) {
        observer.unobserve(el);
      }
    };
  }, []);

  const getTransformClasses = () => {
    if (isVisible) {
      return "opacity-100 translate-y-0 scale-100";
    }

    switch (direction) {
      case "up":
        return "opacity-0 translate-y-8";
      case "down":
        return "opacity-0 -translate-y-8";
      case "scale":
        return "opacity-0 scale-95";
      case "fade":
      default:
        return "opacity-0";
    }
  };

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: `${delayMs}ms`,
        transitionDuration: "900ms",
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      className={`transition-all will-change-[opacity,transform] ${getTransformClasses()} ${className}`}
    >
      {children}
    </div>
  );
}

