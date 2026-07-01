import Link from "next/link";
import { Bell, Building2, FileCheck2, Search, ShieldCheck } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const nav = [
    { href: "/vendor", label: "Vendor", icon: FileCheck2 },
    { href: "/buyer", label: "Buyer", icon: Search },
    { href: "/admin", label: "Admin", icon: ShieldCheck }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-semibold text-ink">
            <Building2 className="h-5 w-5 text-accent" aria-hidden="true" />
            TRUSTPASS
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted hover:bg-slate-100 hover:text-ink"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-white text-muted hover:bg-slate-50"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}

