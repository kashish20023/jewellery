"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * Counts from 0 up to `value` once, on mount, for a lively KPI readout.
 * Respects prefers-reduced-motion by jumping straight to the final value.
 */
export function CountUp({ value, durationMs = 650 }: { value: number; durationMs?: number }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || value === 0) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * value));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, durationMs]);

  return <>{display.toLocaleString("en-IN")}</>;
}
