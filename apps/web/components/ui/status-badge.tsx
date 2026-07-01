import { cn } from "@/lib/utils";
import type { TrustStatus } from "@/types/domain";

const statusLabel: Record<TrustStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  changes_requested: "Changes requested"
};

const statusStyle: Record<TrustStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-cyan-50 text-cyan-800",
  under_review: "bg-amber-50 text-amber-800",
  approved: "bg-emerald-50 text-emerald-800",
  changes_requested: "bg-rose-50 text-rose-800"
};

export function StatusBadge({ status, className }: { status: TrustStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
        statusStyle[status],
        className
      )}
    >
      {statusLabel[status]}
    </span>
  );
}

