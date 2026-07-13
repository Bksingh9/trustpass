import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const pagesRoot = path.join(webRoot, "pages");
const liveApiBaseUrl = (
  process.env.TRUSTPASS_LIVE_BASE_URL ||
  process.env.TRUSTPASS_API_BASE_URL ||
  "https://trustpass-api.onrender.com/api/v1"
)
  .trim()
  .replace(/\/$/, "");
const buildSha = (process.env.GITHUB_SHA || "local-build").trim();

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="TRUSTPASS">
  <rect width="64" height="64" rx="12" fill="#147461" />
  <path d="M16 18h32v8H36v22h-8V26H16z" fill="#fff" />
</svg>`;

rmSync(pagesRoot, { recursive: true, force: true });
mkdirSync(pagesRoot, { recursive: true });

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="trustpass-build-sha" content="${buildSha}" />
  <link rel="icon" href="favicon.svg" type="image/svg+xml" />
  <title>TRUSTPASS</title>
  <style>
    :root {
      --bg: #f7f9fb;
      --panel: #ffffff;
      --ink: #162033;
      --muted: #667085;
      --border: #d8dee8;
      --accent: #147461;
      --accent-soft: #e6f4ef;
      --danger: #b42318;
      --focus: #2f80ed;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    button, input, select, textarea { font: inherit; }
    a { color: inherit; text-decoration: none; }
    header {
      min-height: 64px;
      border-bottom: 1px solid var(--border);
      background: var(--panel);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      padding: 0 32px;
      position: sticky;
      top: 0;
      z-index: 5;
    }
    .brand { font-weight: 850; letter-spacing: 0; }
    nav { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
    nav a {
      padding: 10px 12px;
      border-radius: 6px;
      color: var(--muted);
      font-size: 14px;
      font-weight: 750;
    }
    nav a:hover, nav a.active { background: #eef2f6; color: var(--ink); }
    main { max-width: 1180px; margin: 0 auto; padding: 30px 24px 56px; }
    h1 { margin: 8px 0 0; font-size: 38px; line-height: 1.08; letter-spacing: 0; }
    h2 { margin: 0; font-size: 18px; letter-spacing: 0; }
    h3 { margin: 0; font-size: 15px; letter-spacing: 0; }
    p { color: var(--muted); line-height: 1.6; }
    label { color: var(--muted); display: grid; gap: 6px; font-size: 13px; font-weight: 750; }
    input, select, textarea {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: white;
      color: var(--ink);
      padding: 10px 12px;
      min-height: 40px;
    }
    input:focus, select:focus, textarea:focus, button:focus, a:focus {
      outline: 2px solid var(--focus);
      outline-offset: 2px;
    }
    .eyebrow { color: var(--accent); font-weight: 850; font-size: 14px; }
    .hero {
      display: grid;
      grid-template-columns: 1fr minmax(320px, 0.7fr);
      gap: 24px;
      align-items: stretch;
      padding: 20px 0 28px;
      border-bottom: 1px solid var(--border);
    }
    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 6px;
      box-shadow: 0 1px 2px rgb(15 23 42 / 6%);
      min-width: 0;
    }
    .panel.pad { padding: 18px 20px; }
    .panel-head {
      padding: 18px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
    }
    .grid-2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; margin-top: 20px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); overflow: hidden; margin-top: 20px; }
    .stat { padding: 18px 20px; border-right: 1px solid var(--border); }
    .stat:last-child { border-right: 0; }
    .stat span { color: var(--muted); font-size: 12px; text-transform: uppercase; font-weight: 850; }
    .stat strong { display: block; margin-top: 4px; font-size: 28px; }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 18px; }
    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      padding: 0 15px;
      border-radius: 6px;
      border: 1px solid var(--accent);
      background: var(--accent);
      color: white;
      font-weight: 850;
      font-size: 14px;
      cursor: pointer;
    }
    .button.secondary { background: white; color: var(--ink); border-color: var(--border); }
    .button.compact { min-height: 32px; padding: 0 9px; margin: 2px 4px 2px 0; font-size: 12px; }
    .button:disabled { opacity: 0.55; cursor: not-allowed; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .span-2 { grid-column: 1 / -1; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th {
      text-align: left;
      color: var(--muted);
      background: #f3f6fa;
      padding: 12px 16px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0;
    }
    td { padding: 14px 16px; border-top: 1px solid var(--border); vertical-align: top; }
    .table-wrap { overflow-x: auto; max-width: 100%; min-width: 0; }
    .badge {
      display: inline-flex;
      align-items: center;
      border-radius: 6px;
      padding: 5px 8px;
      background: var(--accent-soft);
      color: #09664f;
      font-weight: 850;
      font-size: 12px;
      white-space: nowrap;
    }
    .badge.error { background: #fff0ed; color: var(--danger); }
    .api-pill {
      display: inline-flex;
      align-items: center;
      min-height: 30px;
      margin-top: 14px;
      padding: 5px 9px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: white;
      color: var(--muted);
      font-size: 12px;
      font-weight: 850;
    }
    .api-pill.connected { border-color: #b7e4d5; color: #075a46; background: #eefbf6; }
    .api-pill.error { border-color: #ffd5cc; color: var(--danger); background: #fff0ed; }
    .empty { color: var(--muted); padding: 18px 20px; }
    @media (max-width: 900px) {
      header { padding: 12px 16px; align-items: flex-start; flex-direction: column; }
      nav { justify-content: flex-start; }
      .hero, .grid-2, .form-grid { grid-template-columns: 1fr; }
      .stats { grid-template-columns: repeat(2, 1fr); }
      h1 { font-size: 31px; }
      main { padding: 24px 16px 44px; }
      table { min-width: 760px; }
    }
  </style>
</head>
<body>
  <header>
    <a class="brand" href="#/">TRUSTPASS</a>
    <nav id="nav">
      <a href="#/">Status</a>
      <a href="#/vendors">Vendors</a>
      <a href="#/requests">Requests</a>
      <a href="#/workspace">Workspace</a>
      <a href="#/logs">Logs</a>
      <a href="#/connect">Connect</a>
    </nav>
  </header>
  <div id="app"></div>
  <script>
    const runtimeParams = new URLSearchParams(location.search);
    const storageKey = "trustpass-live-api-base-url";
    const adminStorageKey = "trustpass-live-admin-context";
    const authStorageKey = "trustpass-live-auth-context";
    const buildConfiguredApiBaseUrl = ${JSON.stringify(liveApiBaseUrl)};
    const configuredApiBaseUrl = (runtimeParams.get("api") || localStorage.getItem(storageKey) || buildConfiguredApiBaseUrl || "").replace(/\\/$/, "");
    if (runtimeParams.get("api")) {
      localStorage.setItem(storageKey, configuredApiBaseUrl);
    }
    function readAdminContext() {
      try {
        return Object.assign(
          { token: "", userId: "", organizationId: "", roles: "super_admin" },
          JSON.parse(localStorage.getItem(adminStorageKey) || "{}")
        );
      } catch (_error) {
        return { token: "", userId: "", organizationId: "", roles: "super_admin" };
      }
    }
    function readAuthContext() {
      try {
        return Object.assign(
          { projectUrl: "", publishableKey: "", email: "", accessToken: "", userId: "", organizationId: "", role: "" },
          JSON.parse(localStorage.getItem(authStorageKey) || "{}")
        );
      } catch (_error) {
        return { projectUrl: "", publishableKey: "", email: "", accessToken: "", userId: "", organizationId: "", role: "" };
      }
    }

    let state = {
      apiBaseUrl: configuredApiBaseUrl,
      apiDraft: configuredApiBaseUrl,
      adminContext: readAdminContext(),
      auth: readAuthContext(),
      health: null,
      readiness: null,
      proof: null,
      data: {
        vendors: [],
        buyers: [],
        documents: [],
        buyer_requests: [],
        verification_decisions: [],
        trust_score_snapshots: [],
        notifications: [],
        audit_events: [],
        request_logs: []
      },
      workspace: {
        loading: false,
        error: "",
        role: "",
        dashboard: null,
        documents: [],
        documentTypes: [],
        vendors: [],
        shortlists: [],
        plans: [],
        subscription: null,
        notifications: [],
        memberships: []
      },
      meta: null,
      loading: false,
      error: "",
      lastRequestId: ""
    };

    function escapeHtml(value) {
      return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
      });
    }
    function human(value) {
      return String(value || "").split("_").filter(Boolean).map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      }).join(" ");
    }
    function endpoint(path) {
      return state.apiBaseUrl.replace(/\\/$/, "") + "/" + path.replace(/^\\//, "");
    }
    function hasAdminContext() {
      return Boolean(
        state.adminContext.token &&
        state.adminContext.userId &&
        state.adminContext.organizationId &&
        state.adminContext.roles &&
        state.adminContext.roles.split(",").some(function (role) { return role.trim() === "admin" || role.trim() === "super_admin"; })
      );
    }
    function hasAuthContext() {
      return Boolean(state.auth.accessToken);
    }
    function authHeaders() {
      if (!hasAuthContext()) throw new Error("Sign in or create an account first.");
      const headers = { authorization: "Bearer " + state.auth.accessToken };
      if (state.auth.userId) headers["x-trustpass-user-id"] = state.auth.userId;
      if (state.auth.organizationId) headers["x-trustpass-organization-id"] = state.auth.organizationId;
      if (state.auth.role) headers["x-trustpass-roles"] = state.auth.role;
      return headers;
    }
    function adminHeaders() {
      if (!hasAdminContext()) {
        throw new Error("Admin write access is required.");
      }
      return {
        authorization: "Bearer " + state.adminContext.token,
        "x-trustpass-user-id": state.adminContext.userId,
        "x-trustpass-organization-id": state.adminContext.organizationId,
        "x-trustpass-roles": state.adminContext.roles
      };
    }
    async function fetchJson(path, options) {
      if (!state.apiBaseUrl) throw new Error("Connect a live API URL first.");
      const requestOptions = options || {};
      const requestHeaders = Object.assign({ "content-type": "application/json" }, requestOptions.headers || {});
      const response = await fetch(endpoint(path), Object.assign({}, requestOptions, {
        headers: requestHeaders,
        cache: "no-store"
      }));
      const body = await response.json().catch(function () { return {}; });
      state.lastRequestId = response.headers.get("x-request-id") || body.request_id || "";
      if (!response.ok) {
        throw new Error(body.error || path + " returned " + response.status);
      }
      return body;
    }
    async function fetchUpload(path, formData) {
      if (!state.apiBaseUrl) throw new Error("Connect a live API URL first.");
      const response = await fetch(endpoint(path), {
        method: "POST",
        headers: authHeaders(),
        body: formData,
        cache: "no-store"
      });
      const body = await response.json().catch(function () { return {}; });
      state.lastRequestId = response.headers.get("x-request-id") || body.request_id || "";
      if (!response.ok) throw new Error(body.error || path + " returned " + response.status);
      return body;
    }
    function totals() {
      return [
        ["Vendors", state.data.vendors.length],
        ["Buyers", state.data.buyers.length],
        ["Documents", state.data.documents.length],
        ["Requests", state.data.buyer_requests.length],
        ["Score history", state.data.trust_score_snapshots.length],
        ["Notifications", state.data.notifications.length]
      ];
    }
    function dataSummary() {
      return state.meta || (state.proof && state.proof.data_summary) || null;
    }
    function dataSummaryLabel(key, fallback) {
      const summary = dataSummary();
      const value = summary && summary[key];
      if (value === false) return "No";
      if (value === true) return "Yes";
      return human(value || fallback || "Not reported");
    }
    async function refreshLiveData() {
      if (!state.apiBaseUrl) {
        render();
        return;
      }
      state.loading = true;
      state.error = "";
      render();
      try {
        state.health = await fetchJson("/api/health");
        state.readiness = await fetchJson("/api/readiness");
        const current = await fetchJson("/api/trustpass");
        state.data = Object.assign({}, state.data, current.data || {});
        state.meta = current.meta || null;
        state.proof = await fetchJson("/api/operational-proof");
        if (!state.meta && state.proof && state.proof.data_summary) {
          state.meta = state.proof.data_summary;
        }
      } catch (error) {
        state.error = error.message;
      } finally {
        state.loading = false;
        render();
      }
    }
    async function postTrustpass(action, payload) {
      const body = await fetchJson("/api/trustpass", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify(Object.assign({ action: action }, payload))
      });
      state.data = Object.assign({}, state.data, body.data || {});
      state.meta = body.meta || state.meta;
      render();
    }
    async function authenticate(mode, form) {
      const values = Object.fromEntries(new FormData(form).entries());
      const projectUrl = String(values.project_url || "").trim().replace(/\\/$/, "");
      const publishableKey = String(values.publishable_key || "").trim();
      const email = String(values.email || "").trim();
      const password = String(values.password || "");
      if (!projectUrl || !publishableKey || !email || !password) throw new Error("Supabase project, publishable key, email, and password are required.");
      const endpointPath = mode === "signup" ? "/auth/v1/signup" : "/auth/v1/token?grant_type=password";
      const authResponse = await fetch(projectUrl + endpointPath, {
        method: "POST",
        headers: { apikey: publishableKey, "content-type": "application/json" },
        body: JSON.stringify(mode === "signup" ? {
          email: email,
          password: password,
          data: { full_name: String(values.full_name || "").trim() }
        } : { email: email, password: password })
      });
      const authBody = await authResponse.json().catch(function () { return {}; });
      if (!authResponse.ok) throw new Error(authBody.msg || authBody.error_description || authBody.error || "Supabase authentication failed.");
      const session = authBody.session || authBody;
      const accessToken = session.access_token;
      const user = session.user || authBody.user || {};
      if (!accessToken) throw new Error("Supabase requires email confirmation before this account can access TRUSTPASS.");
      state.auth = {
        projectUrl: projectUrl,
        publishableKey: publishableKey,
        email: user.email || email,
        accessToken: accessToken,
        userId: user.id || "",
        organizationId: "",
        role: ""
      };
      state.adminContext = { token: accessToken, userId: "", organizationId: "", roles: "" };
      if (mode === "signup") {
        const organizationName = String(values.organization_name || "").trim();
        if (!organizationName) throw new Error("Organization name is required to finish signup.");
        const organizationResponse = await fetchJson("/orgs/", {
          method: "POST",
          headers: Object.assign({ "content-type": "application/json" }, authHeaders()),
          body: JSON.stringify({
            name: organizationName,
            type: String(values.organization_type || "vendor"),
            email: email,
            full_name: String(values.full_name || "").trim()
          })
        });
        const created = organizationResponse.data || {};
        state.auth.userId = created.user && created.user.id ? created.user.id : state.auth.userId;
        state.auth.organizationId = created.organization && created.organization.id ? created.organization.id : "";
        state.auth.role = created.role || String(values.organization_type || "vendor");
      } else {
        const me = await fetchJson("/auth/me", { headers: authHeaders() });
        const current = me.data || {};
        state.auth.userId = current.user_id || state.auth.userId;
        state.auth.organizationId = current.organization_id || "";
        state.auth.role = (current.roles || []).join(",");
      }
      localStorage.setItem(authStorageKey, JSON.stringify(state.auth));
      localStorage.setItem(adminStorageKey, JSON.stringify(state.adminContext));
      state.error = "";
      render();
      await refreshLiveData();
      location.hash = "#/workspace";
      await refreshWorkspace();
    }
    function signOut() {
      localStorage.removeItem(authStorageKey);
      localStorage.removeItem(adminStorageKey);
      state.auth = readAuthContext();
      state.adminContext = readAdminContext();
      state.error = "";
      render();
    }
    function statusBadge() {
      if (!state.apiBaseUrl) return '<span class="api-pill">Live API not connected</span>';
      if (state.error) return '<span class="api-pill error">' + escapeHtml(state.error) + '</span>';
      if (state.readiness && state.readiness.status === "ready") return '<span class="api-pill connected">Live API ready</span>';
      return '<span class="api-pill">Checking live API</span>';
    }
    function adminBadge() {
      if (hasAdminContext()) return '<span class="api-pill connected">Admin writes enabled</span>';
      return '<span class="api-pill">Read-only until admin access is configured</span>';
    }
    function authBadge() {
      if (hasAuthContext()) return '<span class="api-pill connected">Signed in as ' + escapeHtml(state.auth.email || state.auth.role || "authenticated user") + '</span>';
      return '<span class="api-pill">No customer account connected</span>';
    }
    function workspaceRole() {
      const roles = String(state.auth.role || "").split(",").map(function (role) { return role.trim(); });
      return roles.includes("vendor") ? "vendor" : roles.includes("buyer") ? "buyer" : roles[0] || "";
    }
    function workspaceError(error) {
      state.workspace.error = error && error.message ? error.message : String(error || "Workspace request failed.");
    }
    async function refreshWorkspace() {
      if (!hasAuthContext()) {
        state.workspace.error = "Sign in or create an account to open your workspace.";
        render();
        return;
      }
      state.workspace.loading = true;
      state.workspace.error = "";
      render();
      try {
        const headers = authHeaders();
        const me = await fetchJson("/auth/me", { headers: headers });
        const current = me.data || {};
        state.auth.userId = current.user_id || state.auth.userId;
        state.auth.organizationId = current.organization_id || state.auth.organizationId;
        state.auth.role = Array.isArray(current.roles) ? current.roles.join(",") : String(current.roles || state.auth.role || "");
        state.workspace.role = workspaceRole();
        const memberships = await fetchJson("/orgs/memberships", { headers: authHeaders() });
        state.workspace.memberships = (memberships.data && memberships.data.memberships) || [];
        const [plans, subscription, notifications] = await Promise.all([
          fetchJson("/billing/plans", { headers: authHeaders() }),
          fetchJson("/billing/subscription", { headers: authHeaders() }),
          fetchJson("/notifications/", { headers: authHeaders() })
        ]);
        state.workspace.plans = (plans.data && plans.data.plans) || [];
        state.workspace.subscription = subscription.data && subscription.data.subscription;
        state.workspace.notifications = (notifications.data && notifications.data.notifications) || [];
        if (state.workspace.role === "vendor") {
          const [dashboard, documents, types] = await Promise.all([
            fetchJson("/vendors/dashboard", { headers: authHeaders() }),
            fetchJson("/documents/", { headers: authHeaders() }),
            fetchJson("/documents/types", { headers: authHeaders() })
          ]);
          state.workspace.dashboard = dashboard.data || null;
          state.workspace.documents = (documents.data && documents.data.documents) || [];
          state.workspace.documentTypes = (types.data && types.data.document_types) || [];
        }
        if (state.workspace.role === "buyer") {
          const [vendors, shortlists] = await Promise.all([
            fetchJson("/buyers/search", { headers: authHeaders() }),
            fetchJson("/buyers/shortlists", { headers: authHeaders() })
          ]);
          state.workspace.vendors = (vendors.data && vendors.data.vendors) || [];
          state.workspace.shortlists = (shortlists.data && shortlists.data.shortlists) || [];
        }
        localStorage.setItem(authStorageKey, JSON.stringify(state.auth));
      } catch (error) {
        workspaceError(error);
      } finally {
        state.workspace.loading = false;
        render();
      }
    }
    async function runWorkspaceTask(task) {
      try {
        state.workspace.error = "";
        await task();
      } catch (error) {
        workspaceError(error);
        render();
      }
    }
    function workspaceNotice() {
      if (state.workspace.loading) return '<span class="api-pill">Loading workspace</span>';
      if (state.workspace.error) return '<span class="api-pill error">' + escapeHtml(state.workspace.error) + '</span>';
      return '<span class="api-pill connected">Workspace connected</span>';
    }
    function workspaceRows(rows, emptyText, renderRow, columns) {
      return rows.length ? rows.map(renderRow).join("") : '<tr><td colspan="' + escapeHtml(columns || 1) + '"><div class="empty">' + escapeHtml(emptyText) + '</div></td></tr>';
    }
    function workspaceNotificationRows() {
      return workspaceRows(state.workspace.notifications, "No notifications for this workspace.", function (notification) {
        const action = notification.read_at ? "" : '<button class="button secondary compact" data-workspace-action="read-notification" data-notification-id="' + escapeHtml(notification.id) + '">Mark read</button>';
        return '<tr><td><strong>' + escapeHtml(notification.subject || "Notification") + '</strong><br><span style="color: var(--muted)">' + escapeHtml(notification.body || "") + '</span></td><td>' + escapeHtml(human(notification.status)) + '</td><td>' + action + '</td></tr>';
      }, 3);
    }
    function vendorDocumentRows() {
      return workspaceRows(state.workspace.documents, "Upload your first compliance document.", function (document) {
        return '<tr><td><strong>' + escapeHtml(document.document_type && document.document_type.name || document.file_name) + '</strong><br><span style="color: var(--muted)">' + escapeHtml(document.file_name) + '</span></td><td>' + escapeHtml(human(document.status)) + '</td><td>' + escapeHtml(document.expires_at || "No expiry") + '</td></tr>';
      }, 3);
    }
    function buyerVendorRows() {
      return workspaceRows(state.workspace.vendors, "No public vendors match the current search.", function (vendor) {
        return '<tr><td><strong>' + escapeHtml(vendor.name) + '</strong><br><span style="color: var(--muted)">' + escapeHtml(vendor.location || "Location not listed") + '</span></td><td>' + escapeHtml(vendor.trust_score) + ' / 100</td><td>' + escapeHtml(human(vendor.trust_level)) + '</td><td><button class="button secondary compact" data-workspace-action="shortlist" data-vendor-id="' + escapeHtml(vendor.organization_id) + '">Shortlist</button><button class="button secondary compact" data-workspace-action="request" data-vendor-id="' + escapeHtml(vendor.organization_id) + '">Request info</button></td></tr>';
      }, 4);
    }
    function billingWorkspaceForm() {
      const plans = state.workspace.plans.length ? state.workspace.plans.map(function (plan) { return '<option value="' + escapeHtml(plan.code) + '">' + escapeHtml(plan.name) + ' - $' + escapeHtml((plan.amount_cents / 100).toFixed(2)) + '</option>'; }).join("") : '<option value="">No billing plans available</option>';
      return '<form id="billing-form" class="panel pad"><h2>Workspace billing</h2><p>Checkout records a subscription and payment intent for the active organization.</p><div class="form-grid"><label class="span-2">Plan<select name="plan_code" required>' + plans + '</select></label><div class="span-2 actions"><button class="button">Create checkout</button></div></div><p>' + escapeHtml(state.workspace.subscription ? human(state.workspace.subscription.status) + " - " + state.workspace.subscription.plan_name : "No active subscription") + '</p></form>';
    }
    function vendorWorkspacePage() {
      const dashboard = state.workspace.dashboard || {};
      const profile = dashboard.profile || {};
      const verification = dashboard.verification || {};
      const documentTypes = state.workspace.documentTypes.length ? state.workspace.documentTypes.map(function (item) { return '<option value="' + escapeHtml(item.id) + '">' + escapeHtml(item.name) + '</option>'; }).join("") : '<option value="">No document types available</option>';
      return '<main><div class="eyebrow">Vendor workspace</div><h1>' + escapeHtml((dashboard.organization && dashboard.organization.name) || "Vendor workspace") + '</h1><p>Manage your public trust profile, upload evidence, and submit verification from this organization-scoped workspace.</p>' + workspaceNotice() + '<section class="panel stats"><div class="stat"><span>Trust score</span><strong>' + escapeHtml(profile.trust_score || 0) + '</strong></div><div class="stat"><span>Trust level</span><strong>' + escapeHtml(human(profile.trust_level || "unverified")) + '</strong></div><div class="stat"><span>Verification</span><strong>' + escapeHtml(human(verification.status || "draft")) + '</strong></div><div class="stat"><span>Documents</span><strong>' + escapeHtml(state.workspace.documents.length) + '</strong></div></section><section class="grid-2"><form id="vendor-profile-form" class="panel pad"><h2>Public trust profile</h2><div class="form-grid"><label class="span-2">Business summary<textarea name="business_summary" rows="5">' + escapeHtml(profile.business_summary || "") + '</textarea></label><label>Primary location<input name="primary_location" value="' + escapeHtml(profile.primary_location || "") + '" /></label><label>Regions served<input name="regions_served" value="' + escapeHtml((profile.regions_served || []).join(", ")) + '" /></label><label class="span-2"><span>Public profile enabled</span><input type="checkbox" name="public_profile_enabled" ' + (profile.public_profile_enabled ? "checked" : "") + ' /></label><div class="span-2 actions"><button class="button">Save profile</button><button class="button secondary" type="button" data-workspace-action="submit-verification">Submit for verification</button></div></div></form><form id="document-upload-form" class="panel pad"><h2>Upload evidence</h2><p>PDF, PNG, or JPEG files are stored by the API and remain private until approved.</p><div class="form-grid"><label class="span-2">Document type<select name="document_type_id" required>' + documentTypes + '</select></label><label>Issued date<input name="issued_at" type="date" /></label><label>Expiry date<input name="expires_at" type="date" /></label><label class="span-2">File<input name="file" type="file" accept="application/pdf,image/png,image/jpeg" required /></label><div class="span-2 actions"><button class="button">Upload document</button></div></div></form></section><section class="grid-2">' + billingWorkspaceForm() + '<section class="panel pad"><h2>Organization access</h2><p>Active organization memberships are loaded from the API and applied to every customer workflow request.</p><div class="table-wrap"><table><thead><tr><th>Organization</th><th>Role</th></tr></thead><tbody>' + workspaceRows(state.workspace.memberships, "No active memberships.", function (item) { return '<tr><td>' + escapeHtml(item.organization_name) + '</td><td>' + escapeHtml(human(item.role)) + '</td></tr>'; }, 2) + '</tbody></table></div></section></section><section class="panel"><div class="panel-head"><h2>Submitted documents</h2></div><div class="table-wrap"><table><thead><tr><th>Document</th><th>Status</th><th>Expiry</th></tr></thead><tbody>' + vendorDocumentRows() + '</tbody></table></div></section><section class="panel"><div class="panel-head"><h2>Notifications</h2></div><div class="table-wrap"><table><thead><tr><th>Message</th><th>Status</th><th>Action</th></tr></thead><tbody>' + workspaceNotificationRows() + '</tbody></table></div></section></main>';
    }
    function buyerWorkspacePage() {
      return '<main><div class="eyebrow">Buyer workspace</div><h1>Find trusted vendors</h1><p>Search public trust profiles, keep a shortlist, and request evidence from an explicit buyer-to-vendor workflow.</p>' + workspaceNotice() + '<section class="grid-2"><form id="buyer-search-form" class="panel pad"><h2>Search vendors</h2><div class="form-grid"><label class="span-2">Vendor or company<input name="q" placeholder="Search by organization name" /></label><label>Location<input name="location" placeholder="City, region, country" /></label><label>Trust level<select name="trust_level"><option value="">Any level</option><option value="unverified">Unverified</option><option value="emerging">Emerging</option><option value="trusted">Trusted</option><option value="verified">Verified</option></select></label><div class="span-2 actions"><button class="button">Search vendors</button></div></div></form>' + billingWorkspaceForm() + '</section><section class="panel"><div class="panel-head"><h2>Public vendor directory</h2></div><div class="table-wrap"><table><thead><tr><th>Vendor</th><th>Score</th><th>Level</th><th>Actions</th></tr></thead><tbody>' + buyerVendorRows() + '</tbody></table></div></section><section class="grid-2"><div class="panel"><div class="panel-head"><h2>Shortlist</h2></div><div class="table-wrap"><table><thead><tr><th>Vendor</th><th>Status</th><th>Added</th></tr></thead><tbody>' + workspaceRows(state.workspace.shortlists, "Your shortlist is empty.", function (item) { return '<tr><td><strong>' + escapeHtml(item.vendor_name) + '</strong><br><span style="color: var(--muted)">' + escapeHtml(item.notes || "") + '</span></td><td>' + escapeHtml(human(item.status)) + '</td><td>' + escapeHtml(item.created_at) + '</td></tr>'; }, 3) + '</tbody></table></div></div><form id="buyer-request-form" class="panel pad"><h2>Request vendor information</h2><div class="form-grid"><label class="span-2">Vendor organization ID<input name="vendor_organization_id" required placeholder="Use Request info from the directory" /></label><label class="span-2">Subject<input name="subject" required value="Evidence request" /></label><label class="span-2">Message<textarea name="message" rows="4" required> Please share the evidence needed for our procurement review.</textarea></label><div class="span-2 actions"><button class="button">Send request</button></div></div></form></section><section class="panel"><div class="panel-head"><h2>Notifications</h2></div><div class="table-wrap"><table><thead><tr><th>Message</th><th>Status</th><th>Action</th></tr></thead><tbody>' + workspaceNotificationRows() + '</tbody></table></div></section></main>';
    }
    function workspacePage() {
      if (!hasAuthContext()) return '<main><div class="eyebrow">Authenticated workflows</div><h1>Your workspace</h1><p>Sign in or create a customer account to access organization-scoped workflows.</p>' + workspaceNotice() + '<div class="actions"><a class="button" href="#/connect">Open account connection</a></div></main>';
      if (workspaceRole() === "vendor") return vendorWorkspacePage();
      if (workspaceRole() === "buyer") return buyerWorkspacePage();
      return '<main><div class="eyebrow">Authenticated workflows</div><h1>Workspace access</h1><p>Your current role is ' + escapeHtml(state.auth.role || "unknown") + '. Admin review tools remain on the Connect and Requests pages.</p>' + workspaceNotice() + '</main>';
    }
    function writeDisabled() {
      return state.apiBaseUrl && hasAdminContext() ? "" : "disabled";
    }
    function emptyRow(columns, text) {
      return '<tr><td colspan="' + columns + '"><div class="empty">' + escapeHtml(text) + '</div></td></tr>';
    }
    function vendorRows() {
      if (!state.data.vendors.length) return emptyRow(5, state.apiBaseUrl ? "No live vendors yet." : "Connect a live API to view vendors.");
      return state.data.vendors.map(function (vendor) {
        return '<tr><td><strong>' + escapeHtml(vendor.name) + '</strong><br><span style="color: var(--muted)">' + escapeHtml(vendor.contact_email || "No contact email") + '</span></td><td>' + escapeHtml(vendor.category || "Uncategorized") + '</td><td>' + escapeHtml(vendor.location || "") + '</td><td><strong>' + escapeHtml(vendor.trust_score || 0) + '</strong></td><td><span class="badge">' + escapeHtml(human(vendor.verification_status || "draft")) + '</span></td></tr>';
      }).join("");
    }
    function requestRows() {
      if (!state.data.buyer_requests.length) return emptyRow(4, state.apiBaseUrl ? "No live buyer requests yet." : "Connect a live API to view requests.");
      return state.data.buyer_requests.map(function (request) {
        return '<tr><td><strong>' + escapeHtml(request.subject) + '</strong><br><span style="color: var(--muted)">' + escapeHtml(request.message || "") + '</span></td><td>' + escapeHtml(request.buyer_name) + '</td><td>' + escapeHtml(request.vendor_name) + '</td><td><span class="badge">' + escapeHtml(human(request.status)) + '</span></td></tr>';
      }).join("");
    }
    function logRows() {
      if (!state.data.request_logs.length) return emptyRow(4, state.apiBaseUrl ? "No live request logs yet." : "Connect a live API to view logs.");
      return state.data.request_logs.slice(0, 25).map(function (log) {
        return '<tr><td><strong>' + escapeHtml(log.method + " " + log.path) + '</strong></td><td>' + escapeHtml(log.status) + '</td><td>' + escapeHtml(log.request_id) + '</td><td>' + escapeHtml(log.created_at) + '</td></tr>';
      }).join("");
    }
    function auditRows() {
      if (!state.data.audit_events.length) return emptyRow(4, state.apiBaseUrl ? "No live audit events yet." : "Connect a live API to view audit events.");
      return state.data.audit_events.slice(0, 25).map(function (event) {
        return '<tr><td><strong>' + escapeHtml(human(event.action)) + '</strong></td><td>' + escapeHtml(event.entity_type) + '</td><td>' + escapeHtml(event.request_id || "") + '</td><td>' + escapeHtml(event.summary) + '</td></tr>';
      }).join("");
    }
    function scoreRows() {
      if (!state.data.trust_score_snapshots.length) return emptyRow(4, state.apiBaseUrl ? "No live score history yet." : "Connect a live API to view score history.");
      return state.data.trust_score_snapshots.slice(0, 25).map(function (snapshot) {
        return '<tr><td><strong>' + escapeHtml(snapshot.vendor_name) + '</strong></td><td>' + escapeHtml(snapshot.score) + '</td><td>' + escapeHtml(human(snapshot.status)) + '</td><td>' + escapeHtml(snapshot.buyer_safe_summary || snapshot.reason || "") + '</td></tr>';
      }).join("");
    }
    function notificationRows() {
      if (!state.data.notifications.length) return emptyRow(4, state.apiBaseUrl ? "No live notifications yet." : "Connect a live API to view notifications.");
      return state.data.notifications.slice(0, 25).map(function (notification) {
        return '<tr><td><strong>' + escapeHtml(notification.title) + '</strong></td><td>' + escapeHtml(notification.organization_name || "") + '</td><td>' + escapeHtml(notification.request_id || "") + '</td><td>' + escapeHtml(notification.body || "") + '</td></tr>';
      }).join("");
    }
    function selectOptions(rows, valueKey, labelKey, emptyLabel) {
      if (!rows.length) return '<option value="">' + escapeHtml(emptyLabel) + '</option>';
      return '<option value="">Select a live record</option>' + rows.map(function (row) {
        return '<option value="' + escapeHtml(row[valueKey]) + '">' + escapeHtml(row[labelKey] || row[valueKey]) + '</option>';
      }).join("");
    }
    function shellIntro() {
      return '<section class="hero"><div><div class="eyebrow">Live trust operations</div><h1>TRUSTPASS Live Gateway</h1><p>This public page reads Render/FastAPI/Postgres records through the deployed TRUSTPASS API. The connected API reports whether visible organizations are synthetic seed/QA/proof records or unknown data.</p>' + statusBadge() + authBadge() + adminBadge() + '<div class="actions"><a class="button" href="#/connect">Connect Live API</a><button class="button secondary" data-action="refresh" ' + (state.apiBaseUrl ? "" : "disabled") + '>Refresh live data</button></div></div><div class="panel pad"><h2>Connection</h2><p><strong>API base</strong><br>' + escapeHtml(state.apiBaseUrl || "Not configured") + '</p><p><strong>Write mode</strong><br>' + (hasAdminContext() ? "Admin protected" : "Read-only") + '</p><p><strong>Data classification</strong><br>' + escapeHtml(dataSummaryLabel("data_classification", "not reported")) + '</p><p><strong>Customer data assessment</strong><br>' + escapeHtml(dataSummaryLabel("customer_data_assessment", "not reported")) + '</p><p><strong>Last request</strong><br>' + escapeHtml(state.lastRequestId || "None") + '</p></div></section>';
    }
    function statusPage() {
      return '<main>' + shellIntro() + '<section class="panel stats">' + totals().map(function (item) { return '<div class="stat"><span>' + item[0] + '</span><strong>' + item[1] + '</strong></div>'; }).join("") + '</section><section class="grid-2"><div class="panel pad"><h2>Health</h2><pre>' + escapeHtml(JSON.stringify(state.health || {}, null, 2)) + '</pre></div><div class="panel pad"><h2>Readiness</h2><pre>' + escapeHtml(JSON.stringify(state.readiness || {}, null, 2)) + '</pre></div></section><section class="grid-2"><div class="panel pad"><h2>Data Summary</h2><pre>' + escapeHtml(JSON.stringify(dataSummary() || {}, null, 2)) + '</pre></div><div class="panel pad"><h2>Operational Proof</h2><p>Fetched from /api/operational-proof on the connected Render API.</p><pre>' + escapeHtml(JSON.stringify(state.proof || {}, null, 2)) + '</pre></div></section></main>';
    }
    function vendorsPage() {
      return '<main><div class="eyebrow">Live records</div><h1>Vendors</h1><p>Rows below come from the connected live API only.</p><section class="grid-2"><div class="panel"><div class="panel-head"><h2>Vendor Trust Profiles</h2></div><div class="table-wrap"><table><thead><tr><th>Vendor</th><th>Category</th><th>Location</th><th>Trust</th><th>Status</th></tr></thead><tbody>' + vendorRows() + '</tbody></table></div></div><form id="vendor-form" class="panel pad"><h2>Create Vendor</h2><p>Create a real record in the connected live API. Writes require admin access.</p><div class="form-grid"><label>Name<input name="name" required /></label><label>Category<input name="category" /></label><label>Location<input name="location" /></label><label>Email<input name="contact_email" type="email" /></label><div class="span-2 actions"><button class="button" ' + writeDisabled() + '>Create live vendor</button><a class="button secondary" href="#/connect">Admin access</a></div></div></form></section></main>';
    }
    function requestsPage() {
      const disabled = writeDisabled();
      const vendorOptions = selectOptions(state.data.vendors, "id", "name", "Create a vendor first");
      const buyerOptions = selectOptions(state.data.buyers, "id", "name", "Create a buyer first");
      return '<main><div class="eyebrow">Buyer workflows</div><h1>Requests</h1><section class="panel"><div class="panel-head"><h2>Buyer Requests</h2></div><div class="table-wrap"><table><thead><tr><th>Subject</th><th>Buyer</th><th>Vendor</th><th>Status</th></tr></thead><tbody>' + requestRows() + '</tbody></table></div></section><section class="grid-2"><form id="buyer-form" class="panel pad"><h2>Create Buyer</h2><p>Create a real buyer organization in the connected live API.</p><div class="form-grid"><label>Name<input name="name" required /></label><label>Email<input name="contact_email" type="email" /></label><label class="span-2">Location<input name="location" /></label><div class="span-2 actions"><button class="button" ' + disabled + '>Create live buyer</button></div></div></form><form id="document-form" class="panel pad"><h2>Add Document Metadata</h2><p>Attach file metadata to a live vendor without storing raw files in the page.</p><div class="form-grid"><label class="span-2">Vendor<select name="vendor_id" required>' + vendorOptions + '</select></label><label>Document name<input name="document_name" required placeholder="Insurance certificate" /></label><label>Status<select name="status"><option value="submitted">Submitted</option><option value="under_review">Under review</option><option value="approved">Approved</option><option value="changes_requested">Changes requested</option><option value="rejected">Rejected</option><option value="expired">Expired</option></select></label><label>Expiry date<input name="expiry_date" type="date" /></label><div class="span-2 actions"><button class="button" ' + disabled + '>Add live document</button></div></div></form></section><section class="grid-2"><form id="buyer-request-form" class="panel pad"><h2>Create Buyer Request</h2><p>Open a real buyer-to-vendor request and notification trail.</p><div class="form-grid"><label>Buyer<select name="buyer_id" required>' + buyerOptions + '</select></label><label>Vendor<select name="vendor_id" required>' + vendorOptions + '</select></label><label class="span-2">Subject<input name="subject" required placeholder="Compliance review request" /></label><label class="span-2">Message<textarea name="message" rows="4"></textarea></label><div class="span-2 actions"><button class="button" ' + disabled + '>Create live request</button></div></div></form><form id="decision-form" class="panel pad"><h2>Record Verification Decision</h2><p>Write the review result, score snapshot, audit event, and notification.</p><div class="form-grid"><label>Vendor<select name="vendor_id" required>' + vendorOptions + '</select></label><label>Status<select name="status"><option value="approved">Approved</option><option value="changes_requested">Changes requested</option><option value="rejected">Rejected</option><option value="expired">Expired</option></select></label><label>Trust score<input name="trust_score" type="number" min="0" max="100" value="82" /></label><label class="span-2">Notes<textarea name="notes" rows="4">Verified from public gateway workflow.</textarea></label><div class="span-2 actions"><button class="button" ' + disabled + '>Record live decision</button></div></div></form></section></main>';
    }
    function logsPage() {
      return '<main><div class="eyebrow">Operational proof</div><h1>Logs</h1><section class="grid-2"><div class="panel"><div class="panel-head"><h2>Request Logs</h2></div><div class="table-wrap"><table><thead><tr><th>Request</th><th>Status</th><th>ID</th><th>Time</th></tr></thead><tbody>' + logRows() + '</tbody></table></div></div><div class="panel"><div class="panel-head"><h2>Audit Events</h2></div><div class="table-wrap"><table><thead><tr><th>Action</th><th>Entity</th><th>Request ID</th><th>Summary</th></tr></thead><tbody>' + auditRows() + '</tbody></table></div></div></section><section class="grid-2"><div class="panel"><div class="panel-head"><h2>Trust Score History</h2></div><div class="table-wrap"><table><thead><tr><th>Vendor</th><th>Score</th><th>Status</th><th>Summary</th></tr></thead><tbody>' + scoreRows() + '</tbody></table></div></div><div class="panel"><div class="panel-head"><h2>Notifications</h2></div><div class="table-wrap"><table><thead><tr><th>Title</th><th>Organization</th><th>Request ID</th><th>Body</th></tr></thead><tbody>' + notificationRows() + '</tbody></table></div></div></section></main>';
    }
    function connectPage() {
      return '<main><div class="eyebrow">Configuration</div><h1>Connect Live API</h1><section class="grid-2"><section class="panel pad"><h2>Live API</h2><p>This page calls /api/health, /api/readiness, /api/trustpass, and /api/operational-proof from the connected host.</p><form id="api-form" class="form-grid"><label class="span-2">Live API base URL<input name="api_base_url" required value="' + escapeHtml(state.apiDraft || "") + '" placeholder="https://trustpass-api.onrender.com/api/v1" /></label><div class="span-2 actions"><button class="button">Save and test</button><button class="button secondary" type="button" data-action="clear-api">Clear</button></div></form></section><section class="panel pad"><h2>Supabase account</h2><p>Use a configured Supabase project to sign in or create a vendor or buyer workspace.</p><form id="auth-form" class="form-grid"><label class="span-2">Project URL<input name="project_url" type="url" value="' + escapeHtml(state.auth.projectUrl) + '" placeholder="https://project.supabase.co" /></label><label class="span-2">Publishable key<input name="publishable_key" value="' + escapeHtml(state.auth.publishableKey) + '" autocomplete="off" /></label><label>Email<input name="email" type="email" value="' + escapeHtml(state.auth.email) + '" autocomplete="email" /></label><label>Password<input name="password" type="password" autocomplete="current-password" /></label><label>Full name<input name="full_name" autocomplete="name" /></label><label>Organization type<select name="organization_type"><option value="vendor">Vendor</option><option value="buyer">Buyer</option></select></label><label class="span-2">Organization name<input name="organization_name" placeholder="Required for new accounts" /></label><div class="span-2 actions"><button class="button" type="button" data-auth-action="signin">Sign in</button><button class="button secondary" type="button" data-auth-action="signup">Create account</button><button class="button secondary" type="button" data-action="signout">Sign out</button></div></form></section><section class="panel pad"><h2>Admin Write Access</h2><p>Writes require an authorized TRUSTPASS admin context. Customer accounts use their own role-scoped API routes.</p><form id="admin-form" class="form-grid"><label class="span-2">Bearer token<input name="token" value="' + escapeHtml(state.adminContext.token) + '" autocomplete="off" placeholder="Supabase access token or TRUSTPASS admin subject" /></label><label>User ID<input name="user_id" value="' + escapeHtml(state.adminContext.userId) + '" autocomplete="off" /></label><label>Organization ID<input name="organization_id" value="' + escapeHtml(state.adminContext.organizationId) + '" autocomplete="off" /></label><label class="span-2">Roles<input name="roles" value="' + escapeHtml(state.adminContext.roles || "super_admin") + '" autocomplete="off" /></label><div class="span-2 actions"><button class="button">Save admin access</button><button class="button secondary" type="button" data-action="clear-admin">Clear admin access</button></div></form></section></section></main>';
    }
    const pages = {
      "/": statusPage,
      "/vendors": vendorsPage,
      "/requests": requestsPage,
      "/workspace": workspacePage,
      "/logs": logsPage,
      "/connect": connectPage
    };
    function currentRoute() {
      const raw = location.hash.replace("#", "") || "/";
      const parts = raw.split("?");
      return { path: parts[0] || "/", params: new URLSearchParams(parts[1] || "") };
    }
    function render() {
      const route = currentRoute();
      const path = pages[route.path] ? route.path : "/";
      document.getElementById("app").innerHTML = pages[path](route.params);
      document.title = path === "/" ? "TRUSTPASS" : "TRUSTPASS - " + path.slice(1);
      Array.from(document.querySelectorAll("#nav a")).forEach(function (link) {
        link.classList.toggle("active", link.getAttribute("href") === "#" + path);
      });
    }
    document.addEventListener("click", async function (event) {
      const button = event.target.closest("[data-action]");
      const authButton = event.target.closest("[data-auth-action]");
      const workspaceButton = event.target.closest("[data-workspace-action]");
      if (authButton) {
        try {
          await authenticate(authButton.getAttribute("data-auth-action"), document.getElementById("auth-form"));
        } catch (error) {
          state.error = error.message;
          render();
        }
        return;
      }
      if (workspaceButton) {
        const action = workspaceButton.getAttribute("data-workspace-action");
        if (action === "shortlist") {
          await runWorkspaceTask(async function () {
            await fetchJson("/buyers/shortlists", {
              method: "POST",
              headers: authHeaders(),
              body: JSON.stringify({ vendor_organization_id: workspaceButton.getAttribute("data-vendor-id"), notes: "Added from vendor directory" })
            });
            await refreshWorkspace();
          });
        }
        if (action === "request") {
          const input = document.querySelector('#buyer-request-form input[name="vendor_organization_id"]');
          if (input) {
            input.value = workspaceButton.getAttribute("data-vendor-id") || "";
            input.focus();
            input.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
        if (action === "submit-verification") {
          await runWorkspaceTask(async function () {
            await fetchJson("/vendors/submit", { method: "POST", headers: authHeaders(), body: JSON.stringify({}) });
            await refreshWorkspace();
          });
        }
        if (action === "read-notification") {
          await runWorkspaceTask(async function () {
            await fetchJson("/notifications/" + workspaceButton.getAttribute("data-notification-id") + "/read", { method: "POST", headers: authHeaders(), body: JSON.stringify({}) });
            await refreshWorkspace();
          });
        }
        return;
      }
      if (!button) return;
      const action = button.getAttribute("data-action");
      if (action === "refresh") {
        await refreshLiveData();
      }
      if (action === "clear-api") {
        localStorage.removeItem(storageKey);
        state.apiBaseUrl = "";
        state.apiDraft = "";
        state.health = null;
        state.readiness = null;
        state.proof = null;
        state.error = "";
        render();
      }
      if (action === "clear-admin") {
        localStorage.removeItem(adminStorageKey);
        state.adminContext = { token: "", userId: "", organizationId: "", roles: "super_admin" };
        state.error = "";
        render();
      }
      if (action === "signout") {
        signOut();
      }
    });
    document.addEventListener("submit", async function (event) {
      if (event.target.id === "api-form") {
        event.preventDefault();
        const form = new FormData(event.target);
        state.apiBaseUrl = String(form.get("api_base_url") || "").replace(/\\/$/, "");
        state.apiDraft = state.apiBaseUrl;
        localStorage.setItem(storageKey, state.apiBaseUrl);
        await refreshLiveData();
        location.hash = "#/";
      }
      if (event.target.id === "admin-form") {
        event.preventDefault();
        const form = new FormData(event.target);
        state.adminContext = {
          token: String(form.get("token") || "").trim(),
          userId: String(form.get("user_id") || "").trim(),
          organizationId: String(form.get("organization_id") || "").trim(),
          roles: String(form.get("roles") || "").trim() || "super_admin"
        };
        localStorage.setItem(adminStorageKey, JSON.stringify(state.adminContext));
        state.error = "";
        render();
      }
      if (event.target.id === "vendor-profile-form") {
        event.preventDefault();
        await runWorkspaceTask(async function () {
          const values = Object.fromEntries(new FormData(event.target).entries());
          await fetchJson("/vendors/profile", {
            method: "PATCH",
            headers: authHeaders(),
            body: JSON.stringify({
              business_summary: values.business_summary || null,
              primary_location: values.primary_location || null,
              regions_served: String(values.regions_served || "").split(",").map(function (item) { return item.trim(); }).filter(Boolean),
              public_profile_enabled: values.public_profile_enabled === "on"
            })
          });
          await refreshWorkspace();
        });
      }
      if (event.target.id === "document-upload-form") {
        event.preventDefault();
        await runWorkspaceTask(async function () {
          await fetchUpload("/documents/upload", new FormData(event.target));
          event.target.reset();
          await refreshWorkspace();
        });
      }
      if (event.target.id === "buyer-search-form") {
        event.preventDefault();
        await runWorkspaceTask(async function () {
          const values = Object.fromEntries(new FormData(event.target).entries());
          const params = new URLSearchParams();
          Object.keys(values).forEach(function (key) { if (values[key]) params.set(key, values[key]); });
          const result = await fetchJson("/buyers/search" + (params.toString() ? "?" + params.toString() : ""), { headers: authHeaders() });
          state.workspace.vendors = (result.data && result.data.vendors) || [];
          render();
        });
      }
      if (event.target.id === "billing-form") {
        event.preventDefault();
        await runWorkspaceTask(async function () {
          const values = Object.fromEntries(new FormData(event.target).entries());
          const result = await fetchJson("/billing/checkout", { method: "POST", headers: authHeaders(), body: JSON.stringify({ plan_code: values.plan_code }) });
          state.workspace.error = "Checkout created: " + ((result.data && result.data.external_id) || "pending");
          await refreshWorkspace();
        });
      }
      if (event.target.id === "buyer-request-form") {
        event.preventDefault();
        await runWorkspaceTask(async function () {
          const values = Object.fromEntries(new FormData(event.target).entries());
          await fetchJson("/buyers/requests", { method: "POST", headers: authHeaders(), body: JSON.stringify(values) });
          event.target.reset();
          await refreshWorkspace();
        });
      }
      if (event.target.id === "vendor-form") {
        event.preventDefault();
        const form = Object.fromEntries(new FormData(event.target).entries());
        await postTrustpass("create_vendor", form);
        event.target.reset();
      }
      if (event.target.id === "buyer-form") {
        event.preventDefault();
        const form = Object.fromEntries(new FormData(event.target).entries());
        await postTrustpass("create_buyer", form);
        event.target.reset();
      }
      if (event.target.id === "document-form") {
        event.preventDefault();
        const form = Object.fromEntries(new FormData(event.target).entries());
        await postTrustpass("add_document", form);
        event.target.reset();
      }
      if (event.target.id === "buyer-request-form") {
        event.preventDefault();
        const form = Object.fromEntries(new FormData(event.target).entries());
        await postTrustpass("create_buyer_request", form);
        event.target.reset();
      }
      if (event.target.id === "decision-form") {
        event.preventDefault();
        const form = Object.fromEntries(new FormData(event.target).entries());
        await postTrustpass("decide_verification", form);
        event.target.reset();
      }
    });
    addEventListener("hashchange", render);
    render();
    refreshLiveData();
  </script>
</body>
</html>`;

writeFileSync(path.join(pagesRoot, "index.html"), html);
writeFileSync(path.join(pagesRoot, "404.html"), html);
writeFileSync(path.join(pagesRoot, "favicon.svg"), faviconSvg);
writeFileSync(path.join(pagesRoot, ".nojekyll"), "");
console.log("GitHub Pages build written to " + pagesRoot);
