export type StageStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export type StageKey =
  | "PROSPECT"
  | "PROPOSAL"
  | "ENGAGEMENT_LETTER"
  | "DOCUMENT_COLLECTION"
  | "PREPARATION"
  | "REVIEW"
  | "FILING"
  | "BILLING"
  | "PAYMENT"
  | "RENEWAL";

export interface EngagementStage {
  stageKey: StageKey;
  stageName: string;
  status: StageStatus;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
}

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
  stages?: EngagementStage[];
}

export interface TimelineEvent {
  id: string;
  stageKey: string;
  title: string;
  status: StageStatus;
  timestamp: string;
  actor: string;
  notes?: string;
}
