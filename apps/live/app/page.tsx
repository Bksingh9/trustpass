"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Vendor = {
  id: string;
  name: string;
  category: string;
  location: string;
  contact_email: string;
  trust_score: number;
  verification_status: string;
  created_at: string;
};

type Buyer = {
  id: string;
  name: string;
  category: string;
  location: string;
  contact_email: string;
  created_at: string;
};

type DocumentRecord = {
  id: string;
  vendor_name: string;
  document_name: string;
  status: string;
  expiry_date: string;
  created_at: string;
};

type BuyerRequest = {
  id: string;
  buyer_id: string;
  buyer_name: string;
  vendor_name: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
};

type Decision = {
  id: string;
  vendor_name: string;
  status: string;
  trust_score: number;
  notes: string;
  created_at: string;
};

type ScoreSnapshot = {
  id: string;
  vendor_name: string;
  score: number;
  status: string;
  reason: string;
  buyer_safe_summary: string;
  evidence_request_id: string;
  created_at: string;
};

type Notification = {
  id: string;
  organization_name: string;
  type: string;
  title: string;
  body: string;
  status: string;
  request_id: string;
  created_at: string;
};

type AuditEvent = {
  id: string;
  request_id: string;
  action: string;
  entity_type: string;
  summary: string;
  created_at: string;
};

type RequestLog = {
  id: string;
  request_id: string;
  method: string;
  path: string;
  status: number;
  created_at: string;
};

type TrustpassState = {
  vendors: Vendor[];
  buyers: Buyer[];
  documents: DocumentRecord[];
  buyer_requests: BuyerRequest[];
  verification_decisions: Decision[];
  trust_score_snapshots: ScoreSnapshot[];
  notifications: Notification[];
  audit_events: AuditEvent[];
  request_logs: RequestLog[];
};

const emptyState: TrustpassState = {
  vendors: [],
  buyers: [],
  documents: [],
  buyer_requests: [],
  verification_decisions: [],
  trust_score_snapshots: [],
  notifications: [],
  audit_events: [],
  request_logs: [],
};

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value.replace(" ", "T") + "Z"));
}

function human(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function fields(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
}

export default function Home() {
  const [state, setState] = useState<TrustpassState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Connecting to live D1 data");
  const [lastRequestId, setLastRequestId] = useState("");

  async function submit(action: string, form: HTMLFormElement) {
    setStatus("Saving live record");
    const response = await fetch("/api/trustpass", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, ...fields(form) }),
    });
    const payload = await response.json();
    setLastRequestId(response.headers.get("x-request-id") ?? payload.request_id ?? "");
    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to save TRUSTPASS data");
    }
    setState(payload.data);
    setStatus("Saved to live D1 data");
    form.reset();
  }

  function onSubmit(action: string) {
    return async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      try {
        await submit(action, event.currentTarget);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unexpected save error");
      }
    };
  }

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/trustpass", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to read TRUSTPASS data");
        }
        if (!active) return;
        setState(payload.data);
        setLastRequestId(response.headers.get("x-request-id") ?? payload.request_id ?? "");
        setLoading(false);
        setStatus("Live D1 data connected");
      } catch (error) {
        if (!active) return;
        setLoading(false);
        setStatus(error instanceof Error ? error.message : "Unable to connect");
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(
    () => [
      ["Vendors", state.vendors.length],
      ["Buyers", state.buyers.length],
      ["Documents", state.documents.length],
      ["Requests", state.buyer_requests.length],
      ["Decisions", state.verification_decisions.length],
      ["Score history", state.trust_score_snapshots.length],
      ["Notifications", state.notifications.length],
      ["Audit events", state.audit_events.length],
    ],
    [state],
  );

  const primaryVendorId = state.vendors[0]?.id ?? "";
  const primaryBuyerId = state.buyers[0]?.id ?? "";

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-[#142033]">
      <header className="border-b border-[#d9e0ea] bg-white px-6 py-5">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#147461]">
              TRUSTPASS Live Operations
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal">Real data verification console</h1>
          </div>
          <div className="rounded-md border border-[#cfd8e4] bg-[#f7f9fc] px-4 py-3 text-sm">
            <strong>{status}</strong>
            {lastRequestId ? <span className="block text-[#5f6d80]">Request {lastRequestId}</span> : null}
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-6 sm:grid-cols-2 lg:grid-cols-4">
        {totals.map(([label, value]) => (
          <div key={label} className="rounded-md border border-[#d9e0ea] bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#657084]">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-8 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-5">
          <form onSubmit={onSubmit("create_vendor")} className="rounded-md border border-[#d9e0ea] bg-white p-5">
            <h2 className="text-lg font-bold">Create Vendor</h2>
            <div className="mt-4 grid gap-3">
              <input name="name" required placeholder="Vendor legal name" />
              <input name="category" placeholder="Category" />
              <input name="location" placeholder="City, region, country" />
              <input name="contact_email" type="email" placeholder="Contact email" />
              <button>Create vendor</button>
            </div>
          </form>

          <form onSubmit={onSubmit("create_buyer")} className="rounded-md border border-[#d9e0ea] bg-white p-5">
            <h2 className="text-lg font-bold">Create Buyer</h2>
            <div className="mt-4 grid gap-3">
              <input name="name" required placeholder="Buyer organization name" />
              <input name="category" placeholder="Procurement category" />
              <input name="location" placeholder="City, region, country" />
              <input name="contact_email" type="email" placeholder="Contact email" />
              <button>Create buyer</button>
            </div>
          </form>

          <form onSubmit={onSubmit("add_document")} className="rounded-md border border-[#d9e0ea] bg-white p-5">
            <h2 className="text-lg font-bold">Add Document Metadata</h2>
            <div className="mt-4 grid gap-3">
              <select key={primaryVendorId || "no-document-vendor"} name="vendor_id" required defaultValue={primaryVendorId}>
                <option value="">Select vendor</option>
                {state.vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
              <input name="document_name" required placeholder="Document name" />
              <select name="status" defaultValue="submitted">
                <option value="submitted">Submitted</option>
                <option value="under_review">Under review</option>
                <option value="approved">Approved</option>
                <option value="changes_requested">Changes requested</option>
              </select>
              <input name="expiry_date" type="date" />
              <button>Add document</button>
            </div>
          </form>

          <form onSubmit={onSubmit("create_buyer_request")} className="rounded-md border border-[#d9e0ea] bg-white p-5">
            <h2 className="text-lg font-bold">Create Buyer Request</h2>
            <div className="mt-4 grid gap-3">
              <select key={primaryBuyerId || "no-buyer"} name="buyer_id" required defaultValue={primaryBuyerId}>
                <option value="">Select buyer</option>
                {state.buyers.map((buyer) => (
                  <option key={buyer.id} value={buyer.id}>
                    {buyer.name}
                  </option>
                ))}
              </select>
              <select key={primaryVendorId || "no-vendor"} name="vendor_id" required defaultValue={primaryVendorId}>
                <option value="">Select vendor</option>
                {state.vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
              <input name="subject" required placeholder="Request subject" />
              <textarea name="message" placeholder="Message" />
              <button>Create request</button>
            </div>
          </form>

          <form onSubmit={onSubmit("decide_verification")} className="rounded-md border border-[#d9e0ea] bg-white p-5">
            <h2 className="text-lg font-bold">Record Verification Decision</h2>
            <div className="mt-4 grid gap-3">
              <select key={primaryVendorId || "no-decision-vendor"} name="vendor_id" required defaultValue={primaryVendorId}>
                <option value="">Select vendor</option>
                {state.vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
              <select name="status" required defaultValue="approved">
                <option value="approved">Approved</option>
                <option value="changes_requested">Changes requested</option>
                <option value="rejected">Rejected</option>
              </select>
              <input name="trust_score" type="number" min="0" max="100" placeholder="Trust score" />
              <textarea name="notes" placeholder="Reviewer notes" />
              <button>Record decision</button>
            </div>
          </form>
        </div>

        <div className="space-y-5">
          <section className="rounded-md border border-[#d9e0ea] bg-white">
            <div className="border-b border-[#d9e0ea] px-5 py-4">
              <h2 className="text-lg font-bold">Vendor Trust Profiles</h2>
            </div>
            <Table empty={loading ? "Loading live records." : "No vendors created yet."}>
              {state.vendors.map((vendor) => (
                <tr key={vendor.id}>
                  <td>
                    <strong>{vendor.name}</strong>
                    <span>{vendor.contact_email || "No contact email"}</span>
                  </td>
                  <td>{vendor.category || "Uncategorized"}</td>
                  <td>{vendor.location || "No location"}</td>
                  <td>{vendor.trust_score}</td>
                  <td>{human(vendor.verification_status)}</td>
                </tr>
              ))}
            </Table>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <Panel title="Documents" empty="No document metadata yet.">
              {state.documents.map((document) => (
                <Row
                  key={document.id}
                  title={document.document_name}
                  meta={`${document.vendor_name} - ${human(document.status)}`}
                  value={document.expiry_date || "No expiry"}
                />
              ))}
            </Panel>
            <Panel title="Buyer Requests" empty="No buyer requests yet.">
              {state.buyer_requests.map((request) => (
                <Row
                  key={request.id}
                  title={request.subject}
                  meta={`${request.buyer_name} -> ${request.vendor_name}`}
                  value={human(request.status)}
                />
              ))}
            </Panel>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <Panel title="Verification Decisions" empty="No decisions recorded yet.">
              {state.verification_decisions.map((decision) => (
                <Row
                  key={decision.id}
                  title={`${decision.vendor_name} - ${human(decision.status)}`}
                  meta={decision.notes || "No reviewer notes"}
                  value={String(decision.trust_score)}
                />
              ))}
            </Panel>
            <Panel title="Trust Score History" empty="No trust score snapshots yet.">
              {state.trust_score_snapshots.map((snapshot) => (
                <Row
                  key={snapshot.id}
                  title={`${snapshot.vendor_name} - ${snapshot.score}`}
                  meta={snapshot.buyer_safe_summary || snapshot.reason}
                  value={human(snapshot.status)}
                />
              ))}
            </Panel>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <Panel title="Notifications" empty="No notifications yet.">
              {state.notifications.map((notification) => (
                <Row
                  key={notification.id}
                  title={notification.title}
                  meta={`${notification.organization_name} - ${notification.body}`}
                  value={human(notification.status)}
                />
              ))}
            </Panel>
            <Panel title="Audit Events" empty="No audit events yet.">
              {state.audit_events.map((event) => (
                <Row
                  key={event.id}
                  title={human(event.action)}
                  meta={`${event.summary} - ${event.request_id || "no request id"}`}
                  value={formatDate(event.created_at)}
                />
              ))}
            </Panel>
          </section>

          <section className="rounded-md border border-[#d9e0ea] bg-white">
            <div className="border-b border-[#d9e0ea] px-5 py-4">
              <h2 className="text-lg font-bold">Request Logs</h2>
            </div>
            <Table empty="No API request logs yet.">
              {state.request_logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <strong>{log.method} {log.path}</strong>
                    <span>{log.request_id}</span>
                  </td>
                  <td>{log.status}</td>
                  <td>{formatDate(log.created_at)}</td>
                  <td></td>
                  <td></td>
                </tr>
              ))}
            </Table>
          </section>
        </div>
      </section>
    </main>
  );
}

function Panel({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-[#d9e0ea] bg-white">
      <div className="border-b border-[#d9e0ea] px-5 py-4">
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      <div className="grid gap-3 p-4">{Array.isArray(children) && children.length === 0 ? <p className="empty">{empty}</p> : children}</div>
    </section>
  );
}

function Row({ title, meta, value }: { title: string; meta: string; value: string }) {
  return (
    <div className="flex gap-4 rounded-md border border-[#e4e9f0] p-3">
      <div className="min-w-0 flex-1">
        <p className="font-bold">{title}</p>
        <p className="mt-1 truncate text-sm text-[#657084]">{meta}</p>
      </div>
      <div className="shrink-0 text-right text-sm font-bold text-[#147461]">{value}</div>
    </div>
  );
}

function Table({ empty, children }: { empty: string; children: React.ReactNode }) {
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className="overflow-x-auto">
      <table>
        <tbody>{hasRows ? children : <tr><td colSpan={5} className="empty">{empty}</td></tr>}</tbody>
      </table>
    </div>
  );
}
