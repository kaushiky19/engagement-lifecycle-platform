import axios from "axios";
import type { Engagement, EngagementStage, TimelineEvent } from "./types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:7071/api",
});

export async function getEngagements(accessToken?: string): Promise<Engagement[]> {
  const response = await api.get<Engagement[]>("/engagements", {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  return response.data;
}

export async function getEngagement(id: string, accessToken?: string): Promise<Engagement> {
  const response = await api.get<Engagement>(`/engagements/${id}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  return response.data;
}

export async function createEngagement(
  data: Omit<Engagement, "id" | "createdAt" | "updatedAt" | "stages">,
  accessToken?: string,
): Promise<Engagement> {
  const response = await api.post<Engagement>("/engagements", data, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  return response.data;
}

export async function getTimeline(id: string, accessToken?: string): Promise<TimelineEvent[]> {
  const response = await api.get<TimelineEvent[]>(`/engagements/${id}/timeline`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  return response.data;
}

export async function updateStage(
  id: string,
  stageKey: EngagementStage["stageKey"],
  status: EngagementStage["status"],
  accessToken?: string,
): Promise<EngagementStage> {
  const response = await api.put<EngagementStage>(
    `/engagements/${id}/stages/${stageKey}`,
    { status },
    {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    },
  );
  return response.data;
}
