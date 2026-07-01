import { AppShell } from "@/components/app-shell";
import { AdminDashboard } from "@/features/admin-dashboard";

export default function AdminPage() {
  return (
    <AppShell>
      <AdminDashboard />
    </AppShell>
  );
}

