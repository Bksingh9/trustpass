export type TrustStatus = "draft" | "submitted" | "under_review" | "approved" | "changes_requested";

export type VendorSummary = {
  id: string;
  name: string;
  category: string;
  location: string;
  trustScore: number;
  trustLevel: string;
  status: TrustStatus;
  badges: string[];
  teamSize: string;
  lastReviewed: string;
};

export type ReviewQueueItem = {
  id: string;
  vendorName: string;
  category: string;
  submittedAt: string;
  documents: number;
  risk: "low" | "medium" | "high";
  status: TrustStatus;
};

