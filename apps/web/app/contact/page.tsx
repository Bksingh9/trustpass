import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-normal text-ink">Request a demo</h1>
        <form className="mt-6 rounded-md border border-border bg-white p-5 shadow-panel">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              Name
              <input className="focus-ring mt-2 h-10 w-full rounded-md border border-border px-3" />
            </label>
            <label className="text-sm font-medium text-ink">
              Work email
              <input className="focus-ring mt-2 h-10 w-full rounded-md border border-border px-3" />
            </label>
          </div>
          <label className="mt-4 block text-sm font-medium text-ink">
            Company
            <input className="focus-ring mt-2 h-10 w-full rounded-md border border-border px-3" />
          </label>
          <Button className="mt-5">Submit</Button>
        </form>
      </main>
    </AppShell>
  );
}

