"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  value?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value = 0, onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => (
    <input
      ref={ref}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onValueChange?.(Number(e.target.value))}
      className={cn(
        "w-full h-2 rounded-full appearance-none bg-[var(--border)] accent-[var(--foreground)]",
        className
      )}
      {...props}
    />
  )
);
Slider.displayName = "Slider";

export { Slider };
