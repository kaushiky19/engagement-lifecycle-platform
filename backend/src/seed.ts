import { ensureTables, upsertEngagement, upsertStage, addActivity } from "./storage";
import { STAGES, type Engagement } from "./types";

async function main() {
  await ensureTables();

  const now = new Date().toISOString();

  const records: Engagement[] = [
    {
      id: "eng-1001",
      clientId: "client-1001",
      clientName: "ABC Manufacturing",
      engagementNumber: "ENG-2026-1001",
      taxYear: 2026,
      status: "IN_PROGRESS",
      currentStage: "REVIEW",
      owner: "John Smith",
      dueDate: "2026-10-15",
      createdAt: "2026-08-01T10:00:00Z",
      updatedAt: now,
    },
    {
      id: "eng-1002",
      clientId: "client-1002",
      clientName: "XYZ Corporation",
      engagementNumber: "ENG-2026-1002",
      taxYear: 2026,
      status: "IN_PROGRESS",
      currentStage: "PREPARATION",
      owner: "Sarah Lee",
      dueDate: "2026-10-20",
      createdAt: "2026-08-15T10:00:00Z",
      updatedAt: now,
    },
  ];

  for (const engagement of records) {
    await upsertEngagement(engagement);
    const currentIndex = STAGES.findIndex(([key]) => key === engagement.currentStage);

    for (let i = 0; i < STAGES.length; i++) {
      const [key, name] = STAGES[i];
      const status = i < currentIndex ? "COMPLETED" : i === currentIndex ? "IN_PROGRESS" : "PENDING";
      await upsertStage(engagement.id, key, name, status);
    }

    await addActivity(engagement.id, {
      stageKey: engagement.currentStage,
      title: "Seed engagement created",
      status: "IN_PROGRESS",
      actor: engagement.owner,
    });
  }

  console.log("Seed complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
