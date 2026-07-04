import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const pagesRoot = path.join(webRoot, "pages");

rmSync(pagesRoot, { recursive: true, force: true });
mkdirSync(pagesRoot, { recursive: true });

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TRUSTPASS</title>
  <style>
    :root {
      --bg: #f8fafc;
      --panel: #ffffff;
      --ink: #162033;
      --muted: #657084;
      --border: #d8dee8;
      --accent: #147461;
      --accent-soft: #e6f4ef;
      --warning: #a15c07;
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
    a { color: inherit; text-decoration: none; }
    button, input, select, textarea { font: inherit; }
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
    .brand { font-weight: 800; letter-spacing: 0; }
    nav { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
    nav a, nav button {
      padding: 10px 12px;
      border-radius: 6px;
      color: var(--muted);
      font-size: 14px;
      font-weight: 700;
      border: 0;
      background: transparent;
      cursor: pointer;
    }
    nav a:hover, nav a.active, nav button:hover { background: #eef2f6; color: var(--ink); }
    main { max-width: 1180px; margin: 0 auto; padding: 30px 24px 56px; }
    h1 { margin: 8px 0 0; font-size: 40px; line-height: 1.08; letter-spacing: 0; }
    h2 { margin: 0; font-size: 18px; letter-spacing: 0; }
    h3 { margin: 0; font-size: 15px; letter-spacing: 0; }
    p { color: var(--muted); line-height: 1.6; }
    label { color: var(--muted); display: grid; gap: 6px; font-size: 13px; font-weight: 700; }
    input, select, textarea {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: white;
      color: var(--ink);
      padding: 10px 12px;
      min-height: 40px;
    }
    textarea { min-height: 112px; resize: vertical; }
    input:focus, select:focus, textarea:focus, button:focus, a:focus {
      outline: 2px solid var(--focus);
      outline-offset: 2px;
    }
    .eyebrow { color: var(--accent); font-weight: 800; font-size: 14px; }
    .hero {
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      gap: 24px;
      align-items: stretch;
      padding: 20px 0 28px;
      border-bottom: 1px solid var(--border);
    }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 22px; }
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
      font-weight: 800;
      font-size: 14px;
      cursor: pointer;
    }
    .button.secondary { background: white; color: var(--ink); border-color: var(--border); }
    .button.ghost { background: transparent; color: var(--accent); border-color: transparent; padding: 0 8px; }
    .button:disabled { opacity: 0.56; cursor: not-allowed; }
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
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); overflow: hidden; margin-top: 24px; }
    .stat { padding: 18px 20px; border-right: 1px solid var(--border); }
    .stat:last-child { border-right: 0; }
    .stat span { color: var(--muted); font-size: 12px; text-transform: uppercase; font-weight: 800; }
    .stat strong { display: block; margin-top: 4px; font-size: 28px; }
    .grid-2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 360px); gap: 24px; margin-top: 24px; align-items: start; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .grid-2 > *, .grid-3 > *, .hero > * { min-width: 0; }
    .filters { display: grid; grid-template-columns: minmax(220px, 1fr) 210px 130px; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--border); align-items: end; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
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
      font-weight: 800;
      font-size: 12px;
      white-space: nowrap;
    }
    .badge.warn { background: #fff7e6; color: var(--warning); }
    .badge.danger { background: #fff0ed; color: var(--danger); }
    .list { display: grid; gap: 10px; padding: 18px 20px; }
    .row { display: flex; justify-content: space-between; gap: 14px; color: var(--muted); }
    .row strong { color: var(--ink); }
    .notice {
      border: 1px solid #b7e4d5;
      background: #eefbf6;
      color: #075a46;
      border-radius: 6px;
      padding: 12px 14px;
      font-weight: 700;
      margin-top: 14px;
    }
    .empty { color: var(--muted); padding: 14px 0; }
    @media (max-width: 900px) {
      header { padding: 12px 16px; align-items: flex-start; flex-direction: column; }
      nav { justify-content: flex-start; }
      .hero, .grid-2, .grid-3, .filters, .form-grid { grid-template-columns: 1fr; }
      .stats { grid-template-columns: repeat(2, 1fr); }
      h1 { font-size: 32px; }
      main { padding: 24px 16px 44px; }
      table { min-width: 760px; }
    }
  </style>
</head>
<body>
  <header>
    <a class="brand" href="#/">TRUSTPASS</a>
    <nav id="nav">
      <a href="#/vendor">Vendor</a>
      <a href="#/buyer">Buyer</a>
      <a href="#/admin">Admin</a>
      <a href="#/pricing">Pricing</a>
      <a href="#/contact">Contact</a>
      <button type="button" data-action="reset-demo">Reset</button>
    </nav>
  </header>
  <div id="app"></div>
  <script>
    const defaults = {
      search: "",
      category: "All",
      shortlists: [],
      requests: [],
      renewalSubmitted: false,
      contactSuccess: "",
      documents: [
        { name: "Business registration", status: "Approved", expiry: "2027-03-30" },
        { name: "GST certificate", status: "Approved", expiry: "2027-03-30" },
        { name: "Insurance certificate", status: "Renewal due", expiry: "2026-08-15" }
      ],
      queue: [
        { vendor: "Northstar Digital Studio", category: "Digital services", submitted: "2026-06-27", documents: 7, risk: "Medium", status: "Under review" },
        { vendor: "Clearpath Advisory", category: "Consulting", submitted: "2026-06-29", documents: 4, risk: "High", status: "Changes requested" }
      ],
      demoRequests: []
    };
    const vendors = [
      { name: "Atlas Freight Partners", category: "Logistics", location: "Mumbai, IN", score: 88, level: "Trusted", status: "Approved", badges: "Verified, Insurance checked" },
      { name: "Northstar Digital Studio", category: "Digital services", location: "Bengaluru, IN", score: 73, level: "Verified", status: "Under review", badges: "Identity checked" },
      { name: "Clearpath Advisory", category: "Consulting", location: "Delhi, IN", score: 42, level: "In review", status: "Changes requested", badges: "None" }
    ];
    let state = loadState();

    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }
    function loadState() {
      try {
        const stored = JSON.parse(localStorage.getItem("trustpass-demo-state") || "{}");
        return Object.assign(clone(defaults), stored);
      } catch (error) {
        return clone(defaults);
      }
    }
    function saveState() {
      localStorage.setItem("trustpass-demo-state", JSON.stringify(state));
    }
    function resetState() {
      state = clone(defaults);
      saveState();
      render();
    }
    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, function (char) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
      });
    }
    function slug(value) {
      return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    }
    function badgeClass(status) {
      if (status === "Approved" || status === "Submitted" || status === "Requested") return "";
      if (status === "Under review" || status === "Renewal due") return "warn";
      return "danger";
    }
    function badge(status) {
      return '<span class="badge ' + badgeClass(status) + '">' + escapeHtml(status) + '</span>';
    }
    function currentRoute() {
      const raw = location.hash.replace("#", "") || "/";
      const parts = raw.split("?");
      return { path: parts[0] || "/", params: new URLSearchParams(parts[1] || "") };
    }
    function filteredVendors() {
      const term = state.search.trim().toLowerCase();
      return vendors.filter(function (vendor) {
        const matchesCategory = state.category === "All" || vendor.category === state.category;
        const haystack = [vendor.name, vendor.category, vendor.location, vendor.level, vendor.badges].join(" ").toLowerCase();
        return matchesCategory && (!term || haystack.includes(term));
      });
    }
    function vendorRows(list) {
      if (!list.length) {
        return '<tr><td colspan="7"><div class="empty">No vendors match the current filters.</div></td></tr>';
      }
      return list.map(function (vendor) {
        const id = slug(vendor.name);
        const isShortlisted = state.shortlists.includes(vendor.name);
        const requested = state.requests.includes(vendor.name);
        return '<tr>' +
          '<td><strong>' + escapeHtml(vendor.name) + '</strong><br><span style="color: var(--muted)">' + escapeHtml(vendor.level) + '</span></td>' +
          '<td>' + escapeHtml(vendor.category) + '</td>' +
          '<td>' + escapeHtml(vendor.location) + '</td>' +
          '<td><strong>' + vendor.score + '</strong></td>' +
          '<td>' + badge(vendor.status) + '</td>' +
          '<td>' + escapeHtml(vendor.badges) + '</td>' +
          '<td><button class="button secondary" data-action="shortlist" data-vendor="' + escapeHtml(vendor.name) + '">' + (isShortlisted ? "Shortlisted" : "Shortlist") + '</button> ' +
          '<button class="button ghost" data-action="request" data-vendor="' + escapeHtml(vendor.name) + '" id="request-' + id + '">' + (requested ? "Requested" : "Request") + '</button></td>' +
        '</tr>';
      }).join("");
    }
    function documentRows() {
      return state.documents.map(function (doc) {
        return '<tr><td>' + escapeHtml(doc.name) + '</td><td>' + badge(doc.status) + '</td><td>' + escapeHtml(doc.expiry) + '</td></tr>';
      }).join("");
    }
    function queueRows() {
      return state.queue.map(function (item) {
        const canApprove = item.status !== "Approved";
        return '<tr><td><strong>' + escapeHtml(item.vendor) + '</strong></td><td>' + escapeHtml(item.category) + '</td><td>' + escapeHtml(item.submitted) + '</td><td>' + item.documents + '</td><td>' + escapeHtml(item.risk) + '</td><td>' + badge(item.status) + '</td><td><button class="button secondary" data-action="approve" data-vendor="' + escapeHtml(item.vendor) + '"' + (canApprove ? "" : " disabled") + '>' + (canApprove ? "Approve" : "Approved") + '</button></td></tr>';
      }).join("");
    }
    function homePage() {
      return '<main>' +
        '<section class="hero"><div><div class="eyebrow">Vendor trust operations</div><h1>TRUSTPASS</h1><p>Vendor verification, document review, buyer shortlisting, and procurement-ready trust profiles for B2B teams.</p><div class="actions"><a class="button" href="#/vendor">Vendor workspace</a><a class="button secondary" href="#/buyer">Buyer search</a></div></div>' +
        '<div class="panel"><div class="panel-head"><div><h2>Verified vendors</h2><p style="margin: 4px 0 0">Seeded TRUSTPASS demo data</p></div><strong style="font-size: 28px; color: var(--accent)">3</strong></div><div class="table-wrap"><table><thead><tr><th>Vendor</th><th>Trust</th><th>Status</th></tr></thead><tbody>' +
        vendors.map(function (vendor) { return '<tr><td><strong>' + escapeHtml(vendor.name) + '</strong><br><span style="color: var(--muted)">' + escapeHtml(vendor.category) + '</span></td><td><strong>' + vendor.score + '</strong><br><span style="color: var(--muted)">' + escapeHtml(vendor.level) + '</span></td><td>' + badge(vendor.status) + '</td></tr>'; }).join("") +
        '</tbody></table></div></div></section>' +
        '<section class="panel stats"><div class="stat"><span>Vendors</span><strong>3</strong></div><div class="stat"><span>Shortlisted</span><strong id="home-shortlisted">' + state.shortlists.length + '</strong></div><div class="stat"><span>Requests</span><strong id="home-requests">' + state.requests.length + '</strong></div><div class="stat"><span>Queue</span><strong>' + state.queue.filter(function (item) { return item.status !== "Approved"; }).length + '</strong></div></section>' +
      '</main>';
    }
    function vendorPage() {
      const expiring = state.documents.filter(function (doc) { return doc.status === "Renewal due"; }).length;
      return '<main><div class="eyebrow">Atlas Freight Partners</div><h1>Vendor trust workspace</h1><p>Verification is approved. Renewal work can be submitted without leaving the workspace.</p>' +
        '<section class="panel stats"><div class="stat"><span>Trust score</span><strong>88</strong></div><div class="stat"><span>Checklist</span><strong>' + (state.renewalSubmitted ? "86%" : "74%") + '</strong></div><div class="stat"><span>Documents</span><strong>' + state.documents.length + '</strong></div><div class="stat"><span>Expiring</span><strong>' + expiring + '</strong></div></section>' +
        '<section class="grid-2"><div class="panel"><div class="panel-head"><h2>Document vault</h2><button class="button secondary" data-action="submit-renewal">Submit renewal</button></div><div class="table-wrap"><table><thead><tr><th>Document</th><th>Status</th><th>Expiry</th></tr></thead><tbody>' + documentRows() + '</tbody></table></div></div>' +
        '<div class="panel list"><h2>Checklist progress</h2><div class="row"><strong>Business identity</strong><span>Complete</span></div><div class="row"><strong>Tax registration</strong><span>Complete</span></div><div class="row"><strong>Bank proof</strong><span>Complete</span></div><div class="row"><strong>References</strong><span>' + (state.renewalSubmitted ? "Submitted" : "Pending") + '</span></div><div class="row"><strong>Category compliance</strong><span>' + (state.renewalSubmitted ? "In review" : "Pending") + '</span></div>' + (state.renewalSubmitted ? '<div class="notice" id="renewal-notice">Renewal submitted for admin review.</div>' : "") + '</div></section></main>';
    }
    function buyerPage() {
      const list = filteredVendors();
      return '<main><div class="eyebrow">Buyer workspace</div><h1>Verified vendor search</h1><p>Search is scoped to buyer-safe profile data, active badges, and approved trust summaries.</p>' +
        '<section class="panel"><div class="filters"><label>Search<input id="vendor-search" value="' + escapeHtml(state.search) + '" placeholder="Vendor, city, category" /></label><label>Category<select id="category-filter"><option>All</option>' + ["Logistics", "Digital services", "Consulting"].map(function (category) { return '<option' + (state.category === category ? " selected" : "") + '>' + category + '</option>'; }).join("") + '</select></label><button class="button secondary" data-action="clear-filters">Clear</button></div>' +
        '<div class="table-wrap"><table><thead><tr><th>Vendor</th><th>Category</th><th>Location</th><th>Trust</th><th>Status</th><th>Badges</th><th>Actions</th></tr></thead><tbody>' + vendorRows(list) + '</tbody></table></div></section>' +
        '<section class="grid-2"><div class="panel pad"><h2>Shortlist</h2>' + (state.shortlists.length ? '<p id="shortlist-summary">' + state.shortlists.map(escapeHtml).join(", ") + '</p>' : '<p id="shortlist-summary">No vendors shortlisted yet.</p>') + '</div>' +
        '<div class="panel pad"><h2>Requests</h2>' + (state.requests.length ? '<p id="request-summary">' + state.requests.map(escapeHtml).join(", ") + '</p>' : '<p id="request-summary">No vendor requests yet.</p>') + '</div></section></main>';
    }
    function adminPage() {
      const pending = state.queue.filter(function (item) { return item.status !== "Approved"; }).length;
      const approved = state.queue.filter(function (item) { return item.status === "Approved"; }).length;
      return '<main><div class="eyebrow">Admin console</div><h1>Verification review queue</h1><p>Review documents, resolve weighted checks, and issue badge decisions from one queue.</p><section class="panel stats"><div class="stat"><span>Pending</span><strong>' + pending + '</strong></div><div class="stat"><span>Approved</span><strong>' + approved + '</strong></div><div class="stat"><span>Changes</span><strong>' + state.queue.filter(function (item) { return item.status === "Changes requested"; }).length + '</strong></div><div class="stat"><span>Requests</span><strong>' + state.requests.length + '</strong></div></section><section class="panel" style="margin-top: 24px"><div class="table-wrap"><table><thead><tr><th>Vendor</th><th>Category</th><th>Submitted</th><th>Documents</th><th>Risk</th><th>Status</th><th>Decision</th></tr></thead><tbody>' + queueRows() + '</tbody></table></div></section></main>';
    }
    function pricingPage() {
      return '<main><h1>Pricing</h1><section class="grid-3" style="margin-top: 20px"><div class="panel pad"><h2>Vendor Basic</h2><p>Procurement-ready profile and document vault</p><a class="button secondary" href="#/contact?plan=Vendor%20Basic">Select plan</a></div><div class="panel pad"><h2>Vendor Growth</h2><p>Verification workflow, trust badge, and renewal reminders</p><a class="button secondary" href="#/contact?plan=Vendor%20Growth">Select plan</a></div><div class="panel pad"><h2>Buyer Team</h2><p>Vendor search, shortlists, and request tracking</p><a class="button secondary" href="#/contact?plan=Buyer%20Team">Select plan</a></div></section></main>';
    }
    function contactPage(params) {
      const plan = params.get("plan") || "TRUSTPASS demo";
      return '<main><h1>Request a demo</h1><section class="panel pad" style="max-width: 760px"><p>Tell us about your vendor verification or procurement workflow and the TRUSTPASS team will follow up.</p><form id="demo-form" class="form-grid"><label>Name<input name="name" required value="Priya Shah" /></label><label>Email<input name="email" type="email" required value="priya@example.com" /></label><label>Organization<input name="organization" required value="Acme Procurement" /></label><label>Plan<input name="plan" value="' + escapeHtml(plan) + '" /></label><label class="span-2">Message<textarea name="message">We want to verify vendors and manage renewal documents.</textarea></label><div class="span-2 actions"><button class="button" type="submit">Send request</button><a class="button secondary" href="mailto:demo@trustpass.local">Email instead</a></div></form>' + (state.contactSuccess ? '<div class="notice" id="contact-success">' + escapeHtml(state.contactSuccess) + '</div>' : "") + '</section></main>';
    }
    const pages = {
      "/": homePage,
      "/vendor": vendorPage,
      "/buyer": buyerPage,
      "/admin": adminPage,
      "/pricing": pricingPage,
      "/contact": function (params) { return contactPage(params); }
    };
    function render() {
      const route = currentRoute();
      const path = pages[route.path] ? route.path : "/";
      document.getElementById("app").innerHTML = pages[path](route.params);
      document.title = path === "/" ? "TRUSTPASS" : "TRUSTPASS - " + path.slice(1);
      Array.from(document.querySelectorAll("#nav a")).forEach(function (link) {
        link.classList.toggle("active", link.getAttribute("href") === "#" + path);
      });
    }
    document.addEventListener("input", function (event) {
      if (event.target.id === "vendor-search") {
        state.search = event.target.value;
        saveState();
        render();
        const input = document.getElementById("vendor-search");
        if (input) {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }
    });
    document.addEventListener("change", function (event) {
      if (event.target.id === "category-filter") {
        state.category = event.target.value;
        saveState();
        render();
      }
    });
    document.addEventListener("click", function (event) {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const action = button.getAttribute("data-action");
      const vendor = button.getAttribute("data-vendor");
      if (action === "shortlist" && vendor && !state.shortlists.includes(vendor)) {
        state.shortlists.push(vendor);
      }
      if (action === "request" && vendor && !state.requests.includes(vendor)) {
        state.requests.push(vendor);
      }
      if (action === "submit-renewal" && !state.renewalSubmitted) {
        state.renewalSubmitted = true;
        state.documents = state.documents.map(function (doc) {
          return doc.name === "Insurance certificate" ? Object.assign({}, doc, { status: "Submitted", expiry: "2027-08-15" }) : doc;
        });
      }
      if (action === "approve" && vendor) {
        state.queue = state.queue.map(function (item) {
          return item.vendor === vendor ? Object.assign({}, item, { status: "Approved", risk: "Low" }) : item;
        });
      }
      if (action === "clear-filters") {
        state.search = "";
        state.category = "All";
      }
      if (action === "reset-demo") {
        resetState();
        return;
      }
      saveState();
      render();
    });
    document.addEventListener("submit", function (event) {
      if (event.target.id !== "demo-form") return;
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target).entries());
      state.demoRequests.push(data);
      state.contactSuccess = "Demo request received for " + data.organization + ".";
      saveState();
      render();
    });
    window.TRUSTPASS_DEMO_RESET = resetState;
    addEventListener("hashchange", render);
    render();
  </script>
</body>
</html>`;

writeFileSync(path.join(pagesRoot, "index.html"), html);
writeFileSync(path.join(pagesRoot, "404.html"), html);
writeFileSync(path.join(pagesRoot, ".nojekyll"), "");
console.log(`GitHub Pages build written to ${pagesRoot}`);
