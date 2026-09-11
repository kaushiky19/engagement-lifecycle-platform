export type StageStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export const STAGES = [
  ["PROSPECT", "Prospect"],
  ["PROPOSAL", "Proposal"],
  ["ENGAGEMENT_LETTER", "Engagement Letter"],
  ["DOCUMENT_COLLECTION", "Document Collection"],
  ["PREPARATION", "Preparation"],
  ["REVIEW", "Review"],
  ["FILING", "Filing"],
  ["BILLING", "Billing"],
  ["PAYMENT", "Payment"],
  ["RENEWAL", "Renewal"],
] as const;

export type StageKey = typeof STAGES[number][0];

export interface Engagement {
  id: string;
  clientId: string;
  clientName: string;
  engagementNumber: string;
  taxYear: number;
  status: StageStatus;
  currentStage: StageKey;
  owner: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}
