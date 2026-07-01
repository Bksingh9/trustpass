import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "warning";
}) {
  return (
    <div className="border-r border-border px-5 py-4 last:border-r-0">
      <div className="text-xs font-medium uppercase tracking-normal text-muted">{label}</div>
      <div
        className={cn(
          "mt-1 text-2xl font-semibold",
          tone === "good" && "text-accent",
          tone === "warning" && "text-warning"
        )}
      >
        {value}
      </div>
    </div>
  );
}

