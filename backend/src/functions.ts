import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import {
  addActivity,
  ensureTables,
  getEngagementById,
  listActivities,
  listEngagements,
  listStages,
  upsertEngagement,
  upsertStage,
} from "./storage";
import { STAGES, type Engagement, type StageKey, type StageStatus } from "./types";

function json(body: unknown, status = 200): HttpResponseInit {
  return {
    status,
    jsonBody: body,
    headers: { "Content-Type": "application/json" },
  };
}

function now() {
  return new Date().toISOString();
}

async function health(_request: HttpRequest, context: InvocationContext) {
  context.log("Health check");
  return json({ status: "ok", service: "engagement-lifecycle-api", time: now() });
}

async function engagements(request: HttpRequest, context: InvocationContext) {
  try {
    await ensureTables();

    if (request.method === "GET") {
      return json(await listEngagements());
    }

    const body = (await request.json()) as Partial<Engagement>;
    if (!body.clientId || !body.clientName || !body.engagementNumber || !body.owner || !body.dueDate) {
      return json({ error: "clientId, clientName, engagementNumber, owner and dueDate are required." }, 400);
    }

    const timestamp = now();
    const engagement: Engagement = {
      id: `eng-${Date.now()}`,
      clientId: body.clientId,
      clientName: body.clientName,
      engagementNumber: body.engagementNumber,
      taxYear: Number(body.taxYear ?? new Date().getFullYear()),
      status: "IN_PROGRESS",
      currentStage: "PROSPECT",
      owner: body.owner,
      dueDate: body.dueDate,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await upsertEngagement(engagement);
    await upsertStage(engagement.id, "PROSPECT", "Prospect", "IN_PROGRESS");
    await addActivity(engagement.id, {
      stageKey: "PROSPECT",
      title: "Engagement created",
      status: "IN_PROGRESS",
      actor: engagement.owner,
    });

    return json(engagement, 201);
  } catch (error: any) {
    context.error(error);
    return json({ error: error.message ?? "Internal server error" }, 500);
  }
}

async function engagementById(request: HttpRequest, context: InvocationContext) {
  const id = request.params.id;
  if (!id) return json({ error: "Engagement id is required." }, 400);

  try {
    await ensureTables();
    const engagement = await getEngagementById(id);
    if (!engagement) return json({ error: "Engagement not found." }, 404);

    if (request.method === "GET") {
      const stages = await listStages(id);
      return json({ ...engagement, stages });
    }

    return json({ error: "Method not supported." }, 405);
  } catch (error: any) {
    context.error(error);
    return json({ error: error.message ?? "Internal server error" }, 500);
  }
}

async function timeline(request: HttpRequest, context: InvocationContext) {
  const id = request.params.id;
  if (!id) return json({ error: "Engagement id is required." }, 400);

  try {
    await ensureTables();
    return json(await listActivities(id));
  } catch (error: any) {
    context.error(error);
    return json({ error: error.message ?? "Internal server error" }, 500);
  }
}

async function stageUpdate(request: HttpRequest, context: InvocationContext) {
  const id = request.params.id;
  const stageKey = request.params.stageKey as StageKey;
  if (!id || !stageKey) return json({ error: "Engagement id and stage are required." }, 400);

  const stage = STAGES.find(([key]) => key === stageKey);
  if (!stage) return json({ error: "Unknown lifecycle stage." }, 400);

  try {
    await ensureTables();
    const engagement = await getEngagementById(id);
    if (!engagement) return json({ error: "Engagement not found." }, 404);

    const body = (await request.json()) as { status?: StageStatus };
    const status = body.status;
    if (!status || !["PENDING", "IN_PROGRESS", "COMPLETED"].includes(status)) {
      return json({ error: "status must be PENDING, IN_PROGRESS or COMPLETED." }, 400);
    }

    const updatedStage = await upsertStage(id, stageKey, stage[1], status);
    const updatedEngagement: Engagement = {
      ...engagement,
      currentStage: stageKey,
      status: status === "COMPLETED" && stageKey === "PAYMENT" ? "COMPLETED" : "IN_PROGRESS",
      updatedAt: now(),
    };

    await upsertEngagement(updatedEngagement);
    await addActivity(id, {
      stageKey,
      title: `${stage[1]} updated`,
      status,
      actor: engagement.owner,
    });

    return json({
      stageKey,
      stageName: stage[1],
      status,
      startedAt: updatedStage.startedAt,
      completedAt: updatedStage.completedAt,
    });
  } catch (error: any) {
    context.error(error);
    return json({ error: error.message ?? "Internal server error" }, 500);
  }
}

app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health",
  handler: health,
});

app.http("engagements", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "engagements",
  handler: engagements,
});

app.http("engagementById", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "engagements/{id}",
  handler: engagementById,
});

app.http("timeline", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "engagements/{id}/timeline",
  handler: timeline,
});

app.http("stageUpdate", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "engagements/{id}/stages/{stageKey}",
  handler: stageUpdate,
});
