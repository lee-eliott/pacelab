"use client";
import { useCountUp } from "@/hooks/useCountUp";

interface CountUpProps {
  value: number;
  decimals?: number;
  duration?: number;
  suffix?: string;
  format?: (n: number) => string;
}

export default function CountUp({ value, decimals = 0, duration = 1400, suffix = "", format }: CountUpProps) {
  const animated = useCountUp(value, { decimals, duration });
  const display = format ? format(animated) : `${animated.toFixed(decimals)}${suffix}`;
  return <>{display}</>;
}
