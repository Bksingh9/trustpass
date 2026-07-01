import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-md px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-normal text-ink">Create account</h1>
        <form className="mt-6 rounded-md border border-border bg-white p-5 shadow-panel">
          <label className="block text-sm font-medium text-ink">
            Work email
            <input className="focus-ring mt-2 h-10 w-full rounded-md border border-border px-3" type="email" />
          </label>
          <label className="mt-4 block text-sm font-medium text-ink">
            Organization name
            <input className="focus-ring mt-2 h-10 w-full rounded-md border border-border px-3" />
          </label>
          <Button className="mt-5 w-full">Create account</Button>
        </form>
      </main>
    </AppShell>
  );
}

