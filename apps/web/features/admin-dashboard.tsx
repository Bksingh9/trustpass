import { ClipboardCheck, Gauge, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Stat } from "@/components/ui/stat";
import { reviewQueue } from "@/lib/demo-data";

export function AdminDashboard() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-accent">Admin console</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink">Verification review queue</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Review documents, resolve weighted checks, and issue badge decisions from one queue.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">
            <Settings2 className="h-4 w-4" aria-hidden="true" />
            Rules
          </Button>
          <Button>
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            Assign reviewer
          </Button>
        </div>
      </div>

      <section className="mt-6 grid overflow-hidden rounded-md border border-border bg-white shadow-panel md:grid-cols-4">
        <Stat label="Pending" value="12" tone="warning" />
        <Stat label="Approved" value="38" tone="good" />
        <Stat label="Changes" value="7" />
        <Stat label="Expired" value="3" />
      </section>

      <section className="mt-8 rounded-md border border-border bg-white shadow-panel">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Gauge className="h-5 w-5 text-accent" aria-hidden="true" />
          <h2 className="text-base font-semibold text-ink">Active reviews</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-normal text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Vendor</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Submitted</th>
              <th className="px-5 py-3 font-medium">Documents</th>
              <th className="px-5 py-3 font-medium">Risk</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {reviewQueue.map((item) => (
              <tr key={item.id}>
                <td className="px-5 py-4 font-medium text-ink">{item.vendorName}</td>
                <td className="px-5 py-4 text-muted">{item.category}</td>
                <td className="px-5 py-4 text-muted">{item.submittedAt}</td>
                <td className="px-5 py-4 text-muted">{item.documents}</td>
                <td className="px-5 py-4 capitalize text-muted">{item.risk}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={item.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

