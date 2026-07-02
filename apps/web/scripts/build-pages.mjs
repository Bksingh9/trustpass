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
      --ink: #172033;
      --muted: #667085;
      --border: #d8dee8;
      --accent: #147461;
      --warning: #b7791f;
      --danger: #b42318;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    a { color: inherit; text-decoration: none; }
    header {
      height: 64px;
      border-bottom: 1px solid var(--border);
      background: var(--panel);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 32px;
      position: sticky;
      top: 0;
      z-index: 5;
    }
    .brand { font-weight: 750; letter-spacing: 0; }
    nav { display: flex; gap: 8px; align-items: center; }
    nav a {
      padding: 10px 12px;
      border-radius: 6px;
      color: var(--muted);
      font-size: 14px;
      font-weight: 600;
    }
    nav a:hover { background: #eef2f6; color: var(--ink); }
    main { max-width: 1180px; margin: 0 auto; padding: 32px 24px 56px; }
    .hero {
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      gap: 28px;
      align-items: stretch;
      padding: 28px 0;
      border-bottom: 1px solid var(--border);
    }
    h1 { margin: 10px 0 0; font-size: 44px; line-height: 1.05; letter-spacing: 0; }
    h2 { margin: 0; font-size: 18px; letter-spacing: 0; }
    p { color: var(--muted); line-height: 1.65; }
    .eyebrow { color: var(--accent); font-weight: 700; font-size: 14px; }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 24px; }
    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      padding: 0 16px;
      border-radius: 6px;
      border: 1px solid var(--accent);
      background: var(--accent);
      color: white;
      font-weight: 700;
      font-size: 14px;
    }
    .button.secondary { background: white; color: var(--ink); border-color: var(--border); }
    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 6px;
      box-shadow: 0 1px 2px rgb(15 23 42 / 6%);
    }
    .panel-head { padding: 18px 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; gap: 16px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); overflow: hidden; margin-top: 24px; }
    .stat { padding: 18px 20px; border-right: 1px solid var(--border); }
    .stat:last-child { border-right: 0; }
    .stat span { color: var(--muted); font-size: 12px; text-transform: uppercase; font-weight: 700; }
    .stat strong { display: block; margin-top: 4px; font-size: 28px; }
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
    td { padding: 15px 16px; border-top: 1px solid var(--border); vertical-align: top; }
    .badge {
      display: inline-flex;
      align-items: center;
      border-radius: 6px;
      padding: 5px 8px;
      background: #e7f5ef;
      color: #09664f;
      font-weight: 700;
      font-size: 12px;
    }
    .badge.warn { background: #fff7e6; color: var(--warning); }
    .badge.danger { background: #fff0ed; color: var(--danger); }
    .grid-2 { display: grid; grid-template-columns: 1fr 360px; gap: 24px; margin-top: 24px; }
    .checklist { padding: 18px 20px; display: grid; gap: 12px; }
    .check { display: flex; justify-content: space-between; gap: 16px; color: var(--muted); }
    .check strong { color: var(--ink); }
    @media (max-width: 860px) {
      header { padding: 0 16px; }
      nav { gap: 0; }
      nav a { padding: 8px; font-size: 13px; }
      .hero, .grid-2 { grid-template-columns: 1fr; }
      .stats { grid-template-columns: repeat(2, 1fr); }
      h1 { font-size: 34px; }
      main { padding: 24px 16px 44px; }
      table { min-width: 760px; }
      .table-wrap { overflow-x: auto; }
    }
  </style>
</head>
<body>
  <header>
    <a class="brand" href="#/">TRUSTPASS</a>
    <nav>
      <a href="#/vendor">Vendor</a>
      <a href="#/buyer">Buyer</a>
      <a href="#/admin">Admin</a>
      <a href="#/pricing">Pricing</a>
    </nav>
  </header>
  <div id="app"></div>
  <script>
    const vendors = [
      { name: "Atlas Freight Partners", category: "Logistics", location: "Mumbai, IN", score: 88, level: "Trusted", status: "Approved", badges: "Verified, Insurance checked" },
      { name: "Northstar Digital Studio", category: "Digital services", location: "Bengaluru, IN", score: 73, level: "Verified", status: "Under review", badges: "Identity checked" },
      { name: "Clearpath Advisory", category: "Consulting", location: "Delhi, IN", score: 42, level: "In review", status: "Changes requested", badges: "None" }
    ];
    const queue = [
      { vendor: "Northstar Digital Studio", category: "Digital services", submitted: "2026-06-27", documents: 7, risk: "Medium", status: "Under review" },
      { vendor: "Clearpath Advisory", category: "Consulting", submitted: "2026-06-29", documents: 4, risk: "High", status: "Changes requested" }
    ];
    const badgeClass = (status) => status === "Approved" ? "" : status === "Under review" ? "warn" : "danger";
    const vendorRows = () => vendors.map((vendor) => \`<tr>
      <td><strong>\${vendor.name}</strong><br><span style="color: var(--muted)">\${vendor.level}</span></td>
      <td>\${vendor.category}</td>
      <td>\${vendor.location}</td>
      <td><strong>\${vendor.score}</strong></td>
      <td><span class="badge \${badgeClass(vendor.status)}">\${vendor.status}</span></td>
      <td>\${vendor.badges}</td>
    </tr>\`).join("");
    const queueRows = () => queue.map((item) => \`<tr>
      <td><strong>\${item.vendor}</strong></td>
      <td>\${item.category}</td>
      <td>\${item.submitted}</td>
      <td>\${item.documents}</td>
      <td>\${item.risk}</td>
      <td><span class="badge \${badgeClass(item.status)}">\${item.status}</span></td>
    </tr>\`).join("");
    const pages = {
      "/": () => \`<main>
        <section class="hero">
          <div>
            <div class="eyebrow">Vendor trust operations</div>
            <h1>TRUSTPASS</h1>
            <p>Vendor verification, document review, buyer shortlisting, and procurement-ready trust profiles for B2B teams.</p>
            <div class="actions"><a class="button" href="#/vendor">Vendor workspace</a><a class="button secondary" href="#/buyer">Buyer search</a></div>
          </div>
          <div class="panel">
            <div class="panel-head"><div><h2>Verified vendors</h2><p style="margin: 4px 0 0">Seeded TRUSTPASS demo data</p></div><strong style="font-size: 28px; color: var(--accent)">3</strong></div>
            <div class="table-wrap"><table><thead><tr><th>Vendor</th><th>Trust</th></tr></thead><tbody>\${vendors.map((v) => \`<tr><td><strong>\${v.name}</strong><br><span style="color: var(--muted)">\${v.category}</span></td><td><strong>\${v.score}</strong><br><span style="color: var(--muted)">\${v.level}</span></td></tr>\`).join("")}</tbody></table></div>
          </div>
        </section>
      </main>\`,
      "/vendor": () => \`<main>
        <div class="eyebrow">Atlas Freight Partners</div><h1>Vendor trust workspace</h1><p>Verification is approved. Two renewal items need attention before the next review window.</p>
        <section class="panel stats"><div class="stat"><span>Trust score</span><strong>88</strong></div><div class="stat"><span>Checklist</span><strong>74%</strong></div><div class="stat"><span>Documents</span><strong>9</strong></div><div class="stat"><span>Expiring</span><strong>2</strong></div></section>
        <section class="grid-2">
          <div class="panel"><div class="panel-head"><h2>Document vault</h2><a class="button secondary" href="#/vendor">Upload</a></div><div class="table-wrap"><table><thead><tr><th>Document</th><th>Status</th><th>Expiry</th></tr></thead><tbody><tr><td>Business registration</td><td><span class="badge">Approved</span></td><td>2027-03-30</td></tr><tr><td>GST certificate</td><td><span class="badge">Approved</span></td><td>2027-03-30</td></tr><tr><td>Insurance certificate</td><td><span class="badge warn">Renewal due</span></td><td>2026-08-15</td></tr></tbody></table></div></div>
          <div class="panel checklist"><h2>Checklist progress</h2><div class="check"><strong>Business identity</strong><span>Complete</span></div><div class="check"><strong>Tax registration</strong><span>Complete</span></div><div class="check"><strong>Bank proof</strong><span>Complete</span></div><div class="check"><strong>References</strong><span>Pending</span></div><div class="check"><strong>Category compliance</strong><span>Pending</span></div></div>
        </section>
      </main>\`,
      "/buyer": () => \`<main><div class="eyebrow">Buyer workspace</div><h1>Verified vendor search</h1><p>Search is scoped to buyer-safe profile data, active badges, and approved trust summaries.</p><section class="panel"><div class="table-wrap"><table><thead><tr><th>Vendor</th><th>Category</th><th>Location</th><th>Trust</th><th>Status</th><th>Badges</th></tr></thead><tbody>\${vendorRows()}</tbody></table></div></section></main>\`,
      "/admin": () => \`<main><div class="eyebrow">Admin console</div><h1>Verification review queue</h1><p>Review documents, resolve weighted checks, and issue badge decisions from one queue.</p><section class="panel stats"><div class="stat"><span>Pending</span><strong>12</strong></div><div class="stat"><span>Approved</span><strong>38</strong></div><div class="stat"><span>Changes</span><strong>7</strong></div><div class="stat"><span>Expired</span><strong>3</strong></div></section><section class="panel" style="margin-top: 24px"><div class="table-wrap"><table><thead><tr><th>Vendor</th><th>Category</th><th>Submitted</th><th>Documents</th><th>Risk</th><th>Status</th></tr></thead><tbody>\${queueRows()}</tbody></table></div></section></main>\`,
      "/pricing": () => \`<main><h1>Pricing</h1><section class="grid-2" style="grid-template-columns: repeat(4, 1fr)"><div class="panel" style="padding: 18px 20px"><h2>Vendor Basic</h2><p>Procurement-ready profile and document vault</p><a class="button secondary" href="#/contact">Select</a></div><div class="panel" style="padding: 18px 20px"><h2>Vendor Growth</h2><p>Verification workflow, trust badge, and renewal reminders</p><a class="button secondary" href="#/contact">Select</a></div><div class="panel" style="padding: 18px 20px"><h2>Vendor Premium</h2><p>Assisted verification packs and priority review</p><a class="button secondary" href="#/contact">Select</a></div><div class="panel" style="padding: 18px 20px"><h2>Buyer Team</h2><p>Vendor search, shortlists, and request tracking</p><a class="button secondary" href="#/contact">Select</a></div></section></main>\`,
      "/contact": () => \`<main><h1>Request a demo</h1><section class="panel" style="max-width: 680px; padding: 20px"><p>Tell us about your vendor verification or procurement workflow and the TRUSTPASS team will follow up.</p><a class="button" href="mailto:demo@trustpass.local">Contact demo team</a></section></main>\`
    };
    function render() {
      const path = location.hash.replace("#", "") || "/";
      const page = pages[path] ? path : "/";
      document.getElementById("app").innerHTML = pages[page]();
      document.title = page === "/" ? "TRUSTPASS" : "TRUSTPASS - " + page.slice(1);
    }
    addEventListener("hashchange", render);
    render();
  </script>
</body>
</html>`;

writeFileSync(path.join(pagesRoot, "index.html"), html);
writeFileSync(path.join(pagesRoot, "404.html"), html);
writeFileSync(path.join(pagesRoot, ".nojekyll"), "");
console.log(`GitHub Pages build written to ${pagesRoot}`);
