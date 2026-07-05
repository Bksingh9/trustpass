const apiBaseUrl = process.env.API_BASE_URL || "http://127.0.0.1:8000/api/v1";
const webBaseUrl = process.env.WEB_BASE_URL || "http://127.0.0.1:4174";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function getJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  assert(response.ok, `${url} returned ${response.status}: ${JSON.stringify(body)}`);
  return body.data ?? body;
}

const encodedApiBaseUrl = encodeURIComponent(apiBaseUrl);
const webResponse = await fetch(`${webBaseUrl}/?api=${encodedApiBaseUrl}#/`);
const webHtml = await webResponse.text();
assert(webResponse.status === 200, `web returned ${webResponse.status}`);
assert(webHtml.includes("TRUSTPASS"), "web did not serve TRUSTPASS");
assert(webHtml.includes("TRUSTPASS Live Gateway"), "web did not serve the live gateway");
assert(webHtml.includes("trustpass-live-api-base-url"), "web is missing live API wiring");
assert(!webHtml.includes("Seeded TRUSTPASS demo data"), "web still embeds seeded static data");
assert(!webHtml.includes("Atlas Freight Partners"), "web still embeds seeded vendor data");

const health = await getJson(`${apiBaseUrl}/health`);
assert(health.status === "ok", "API health did not return ok");

const demoHealth = await getJson(`${apiBaseUrl}/demo/health`);
assert(demoHealth.mode === "demo", "demo health did not report demo mode");

const reset = await getJson(`${apiBaseUrl}/demo/reset`, { method: "POST" });
assert(reset.vendors.length === 3, "reset did not return seeded vendors");

const renewal = await getJson(`${apiBaseUrl}/demo/vendor/renewal`, { method: "POST" });
assert(
  renewal.documents.some(
    (document) =>
      document.id === "doc-insurance-certificate" &&
      document.status === "submitted" &&
      document.expiry === "2027-08-15",
  ),
  "vendor renewal did not update insurance document",
);

const search = await getJson(`${apiBaseUrl}/demo/buyers/search?q=Atlas`);
assert(search.vendors.length === 1, "buyer search did not return exactly one Atlas vendor");
assert(search.vendors[0].name === "Atlas Freight Partners", "buyer search returned the wrong vendor");
assert(!("private_review_notes" in search.vendors[0]), "buyer search leaked private review notes");

const shortlist = await getJson(`${apiBaseUrl}/demo/buyers/shortlists`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ vendor_id: "atlas-freight-partners", notes: "Strong logistics fit" }),
});
assert(shortlist.status === "active", "shortlist was not active");

const buyerRequest = await getJson(`${apiBaseUrl}/demo/buyers/requests`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    vendor_id: "atlas-freight-partners",
    subject: "Need insurance summary",
    message: "Please share a buyer-safe insurance and renewal summary.",
  }),
});
assert(buyerRequest.status === "open", "buyer request was not open");

const review = await getJson(`${apiBaseUrl}/demo/admin/reviews/vr-1007/approve`, { method: "PATCH" });
assert(review.status === "approved", "review was not approved");
assert(review.risk === "low", "review risk was not reduced");

const contact = await getJson(`${apiBaseUrl}/demo/contact/demo-requests`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    name: "Priya Shah",
    email: "priya@example.com",
    organization: "Acme Procurement",
    plan: "Vendor Growth",
    message: "We want to verify vendors and manage renewal documents.",
  }),
});
assert(contact.status === "received", "contact request was not received");

const state = await getJson(`${apiBaseUrl}/demo/state`);
assert(state.shortlists.length === 1, "state did not persist shortlist");
assert(state.buyer_requests.length === 1, "state did not persist buyer request");
assert(state.demo_requests.length === 1, "state did not persist demo request");
assert(state.audit_events.some((event) => event.action === "approve"), "state did not record approval audit event");

console.log("API_BACKED_E2E_OK");
