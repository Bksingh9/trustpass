import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, Search, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { vendors } from "@/lib/demo-data";

export default function HomePage() {
  return (
    <AppShell>
      <main>
        <section className="border-b border-border bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
            <div className="flex flex-col justify-center">
              <div className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-slate-50 px-3 py-1 text-sm font-medium text-muted">
                <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
                Vendor trust operations
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-normal text-ink sm:text-5xl">
                TRUSTPASS
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
                Vendor verification, document review, buyer shortlisting, and procurement-ready trust profiles for B2B teams.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/vendor">
                  <Button>
                    <Building2 className="h-4 w-4" aria-hidden="true" />
                    Vendor workspace
                  </Button>
                </Link>
                <Link href="/buyer">
                  <Button variant="secondary">
                    <Search className="h-4 w-4" aria-hidden="true" />
                    Buyer search
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-md border border-border bg-slate-50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted">Verified vendors</p>
                  <p className="mt-1 text-2xl font-semibold text-ink">3 demo profiles</p>
                </div>
                <BadgeCheck className="h-8 w-8 text-accent" aria-hidden="true" />
              </div>
              <div className="mt-5 divide-y divide-border rounded-md border border-border bg-white">
                {vendors.map((vendor) => (
                  <div key={vendor.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div>
                      <div className="font-medium text-ink">{vendor.name}</div>
                      <div className="text-sm text-muted">{vendor.category}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-ink">{vendor.trustScore}</div>
                      <div className="text-xs text-muted">{vendor.trustLevel}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/admin" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent">
                Open admin queue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

