import { CheckCircle2, FileText, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";

const checklist = [
  { label: "Business identity", done: true },
  { label: "Tax registration", done: true },
  { label: "Bank proof", done: true },
  { label: "References", done: false },
  { label: "Category compliance", done: false }
];

export function VendorDashboard() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-accent">Atlas Freight Partners</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink">Vendor trust workspace</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Verification is approved. Two renewal items need attention before the next review window.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">
            <Upload className="h-4 w-4" aria-hidden="true" />
            Upload
          </Button>
          <Button>
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Submit review
          </Button>
        </div>
      </div>

      <section className="mt-6 grid overflow-hidden rounded-md border border-border bg-white shadow-panel md:grid-cols-4">
        <Stat label="Trust score" value="88" tone="good" />
        <Stat label="Checklist" value="74%" />
        <Stat label="Documents" value="9" />
        <Stat label="Expiring" value="2" tone="warning" />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="rounded-md border border-border bg-white shadow-panel">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold text-ink">Document vault</h2>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-normal text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Document</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {["Business registration", "GST certificate", "Insurance certificate"].map((item, index) => (
                <tr key={item}>
                  <td className="px-5 py-4 font-medium text-ink">{item}</td>
                  <td className="px-5 py-4 text-accent">{index === 2 ? "Renewal due" : "Approved"}</td>
                  <td className="px-5 py-4 text-muted">{index === 2 ? "2026-08-15" : "2027-03-30"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-md border border-border bg-white p-5 shadow-panel">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" aria-hidden="true" />
            <h2 className="text-base font-semibold text-ink">Checklist progress</h2>
          </div>
          <div className="mt-4 space-y-3">
            {checklist.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink">{item.label}</span>
                <CheckCircle2
                  className={item.done ? "h-5 w-5 text-accent" : "h-5 w-5 text-slate-300"}
                  aria-hidden="true"
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

