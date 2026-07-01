import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition",
        variant === "primary" && "bg-accent text-white hover:bg-emerald-800",
        variant === "secondary" && "border border-border bg-white text-ink hover:bg-slate-50",
        variant === "ghost" && "text-muted hover:bg-slate-100 hover:text-ink",
        className
      )}
      {...props}
    />
  );
}

