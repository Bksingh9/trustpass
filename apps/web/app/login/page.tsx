import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-md px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-normal text-ink">Login</h1>
        <form className="mt-6 rounded-md border border-border bg-white p-5 shadow-panel">
          <label className="block text-sm font-medium text-ink">
            Email
            <input className="focus-ring mt-2 h-10 w-full rounded-md border border-border px-3" type="email" />
          </label>
          <label className="mt-4 block text-sm font-medium text-ink">
            Password
            <input className="focus-ring mt-2 h-10 w-full rounded-md border border-border px-3" type="password" />
          </label>
          <Button className="mt-5 w-full">Login</Button>
        </form>
      </main>
    </AppShell>
  );
}

