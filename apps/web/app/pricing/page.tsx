import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

const plans = [
  ["Vendor Basic", "Procurement-ready profile and document vault"],
  ["Vendor Growth", "Verification workflow, trust badge, and renewal reminders"],
  ["Vendor Premium", "Assisted verification packs and priority review"],
  ["Buyer Team", "Vendor search, shortlists, and request tracking"]
];

export default function PricingPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-normal text-ink">Pricing</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.map(([name, description]) => (
            <section key={name} className="rounded-md border border-border bg-white p-5 shadow-panel">
              <h2 className="text-lg font-semibold text-ink">{name}</h2>
              <p className="mt-3 min-h-16 text-sm leading-6 text-muted">{description}</p>
              <Button className="mt-5 w-full" variant="secondary">
                Select
              </Button>
            </section>
          ))}
        </div>
      </main>
    </AppShell>
  );
}

