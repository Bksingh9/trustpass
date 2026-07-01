import { Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { vendors } from "@/lib/demo-data";

export function BuyerDashboard() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-accent">Buyer workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink">Verified vendor search</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Search is scoped to buyer-safe profile data, active badges, and approved trust summaries.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">
            <Filter className="h-4 w-4" aria-hidden="true" />
            Filters
          </Button>
          <Button>
            <Search className="h-4 w-4" aria-hidden="true" />
            Search
          </Button>
        </div>
      </div>

      <section className="mt-6 rounded-md border border-border bg-white shadow-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-normal text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Vendor</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Location</th>
              <th className="px-5 py-3 font-medium">Trust</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Badges</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {vendors.map((vendor) => (
              <tr key={vendor.id}>
                <td className="px-5 py-4">
                  <div className="font-medium text-ink">{vendor.name}</div>
                  <div className="text-xs text-muted">{vendor.teamSize} employees</div>
                </td>
                <td className="px-5 py-4 text-muted">{vendor.category}</td>
                <td className="px-5 py-4 text-muted">{vendor.location}</td>
                <td className="px-5 py-4 font-semibold text-ink">{vendor.trustScore}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={vendor.status} />
                </td>
                <td className="px-5 py-4 text-muted">{vendor.badges.join(", ") || "None"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

