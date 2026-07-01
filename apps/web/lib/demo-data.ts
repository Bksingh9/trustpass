import type { ReviewQueueItem, VendorSummary } from "@/types/domain";

export const vendors: VendorSummary[] = [
  {
    id: "atlas-logistics",
    name: "Atlas Freight Partners",
    category: "Logistics",
    location: "Mumbai, IN",
    trustScore: 88,
    trustLevel: "Trusted",
    status: "approved",
    badges: ["Verified", "Insurance checked"],
    teamSize: "51-200",
    lastReviewed: "2026-06-24"
  },
  {
    id: "northstar-digital",
    name: "Northstar Digital Studio",
    category: "Digital services",
    location: "Bengaluru, IN",
    trustScore: 73,
    trustLevel: "Verified",
    status: "under_review",
    badges: ["Identity checked"],
    teamSize: "11-50",
    lastReviewed: "2026-06-27"
  },
  {
    id: "clearpath-advisory",
    name: "Clearpath Advisory",
    category: "Consulting",
    location: "Delhi, IN",
    trustScore: 42,
    trustLevel: "In review",
    status: "changes_requested",
    badges: [],
    teamSize: "2-10",
    lastReviewed: "2026-06-29"
  }
];

export const reviewQueue: ReviewQueueItem[] = [
  {
    id: "vr-1007",
    vendorName: "Northstar Digital Studio",
    category: "Digital services",
    submittedAt: "2026-06-27",
    documents: 7,
    risk: "medium",
    status: "under_review"
  },
  {
    id: "vr-1008",
    vendorName: "Clearpath Advisory",
    category: "Consulting",
    submittedAt: "2026-06-29",
    documents: 4,
    risk: "high",
    status: "changes_requested"
  }
];

