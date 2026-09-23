import { TableClient, odata } from "@azure/data-tables";
import { DefaultAzureCredential } from "@azure/identity";
import type { Engagement, StageKey, StageStatus } from "./types";

const connectionString = process.env.STORAGE_CONNECTION_STRING;
const accountUrl = process.env.STORAGE_ACCOUNT_URL;

function client(tableName: string): TableClient {
  if (connectionString && !connectionString.includes("<YOUR_")) {
    return TableClient.fromConnectionString(connectionString, tableName);
  }

  if (!accountUrl) {
    throw new Error("Set STORAGE_CONNECTION_STRING locally or STORAGE_ACCOUNT_URL in Azure.");
  }

  return new TableClient(accountUrl, tableName, new DefaultAzureCredential());
}

export async function ensureTables() {
  for (const table of ["Clients", "Engagements", "EngagementStages", "Activities"]) {
    await client(table).createTable().catch((error: any) => {
      if (error.statusCode !== 409) throw error;
    });
  }
}

export async function listEngagements(): Promise<Engagement[]> {
  const table = client("Engagements");
  const result: Engagement[] = [];
  for await (const entity of table.listEntities()) {
    result.push({
      id: String(entity.rowKey),
      clientId: String(entity.clientId),
      clientName: String(entity.clientName),
      engagementNumber: String(entity.engagementNumber),
      taxYear: Number(entity.taxYear),
      status: String(entity.status) as StageStatus,
      currentStage: String(entity.currentStage) as StageKey,
      owner: String(entity.owner),
      dueDate: String(entity.dueDate),
      createdAt: String(entity.createdAt),
      updatedAt: String(entity.updatedAt),
    });
  }
  return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getEngagementById(id: string): Promise<Engagement | null> {
  const entity = await client("Engagements").getEntity("ENGAGEMENT", id).catch((error: any) => {
    if (error.statusCode === 404) return null;
    throw error;
  });
  if (!entity) return null;

  return {
    id: String(entity.rowKey),
    clientId: String(entity.clientId),
    clientName: String(entity.clientName),
    engagementNumber: String(entity.engagementNumber),
    taxYear: Number(entity.taxYear),
    status: String(entity.status) as StageStatus,
    currentStage: String(entity.currentStage) as StageKey,
    owner: String(entity.owner),
    dueDate: String(entity.dueDate),
    createdAt: String(entity.createdAt),
    updatedAt: String(entity.updatedAt),
  };
}

export async function upsertEngagement(engagement: Engagement) {
  await client("Engagements").upsertEntity({
    partitionKey: "ENGAGEMENT",
    rowKey: engagement.id,
    clientId: engagement.clientId,
    clientName: engagement.clientName,
    engagementNumber: engagement.engagementNumber,
    taxYear: engagement.taxYear,
    status: engagement.status,
    currentStage: engagement.currentStage,
    owner: engagement.owner,
    dueDate: engagement.dueDate,
    createdAt: engagement.createdAt,
    updatedAt: engagement.updatedAt,
  }, "Merge");
}

export async function listStages(engagementId: string) {
  const result: any[] = [];
  const table = client("EngagementStages");
  for await (const entity of table.listEntities({
    queryOptions: { filter: odata`PartitionKey eq ${engagementId}` },
  })) {
    result.push({
      stageKey: String(entity.rowKey),
      stageName: String(entity.stageName),
      status: String(entity.status),
      startedAt: entity.startedAt ? String(entity.startedAt) : undefined,
      completedAt: entity.completedAt ? String(entity.completedAt) : undefined,
      notes: entity.notes ? String(entity.notes) : undefined,
    });
  }
  return result;
}

export async function upsertStage(
  engagementId: string,
  stageKey: string,
  stageName: string,
  status: StageStatus,
) {
  const now = new Date().toISOString();
  const entity: Record<string, any> = {
    partitionKey: engagementId,
    rowKey: stageKey,
    stageName,
    status,
    updatedAt: now,
  };
  if (status === "IN_PROGRESS") entity.startedAt = now;
  if (status === "COMPLETED") entity.completedAt = now;

//@ts-ignore
  await client("EngagementStages").upsertEntity(entity, "Merge");
  return entity;
}

export async function listActivities(engagementId: string) {
  const result: any[] = [];
  const table = client("Activities");
  for await (const entity of table.listEntities({
    queryOptions: { filter: odata`PartitionKey eq ${engagementId}` },
  })) {
    result.push({
      id: String(entity.rowKey),
      stageKey: String(entity.stageKey),
      title: String(entity.title),
      status: String(entity.status),
      timestamp: String(entity.timestamp),
      actor: String(entity.actor),
      notes: entity.notes ? String(entity.notes) : undefined,
    });
  }
  return result.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export async function addActivity(
  engagementId: string,
  data: { stageKey: string; title: string; status: StageStatus; actor: string; notes?: string },
) {
  const id = `evt-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  await client("Activities").upsertEntity({
    partitionKey: engagementId,
    rowKey: id,
    ...data,
    timestamp: new Date().toISOString(),
  });
  return id;
}
