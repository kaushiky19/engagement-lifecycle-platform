import { useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { loginRequest, isDemoMode } from "./auth";
import {
  createEngagement,
  getEngagement,
  getEngagements,
  getTimeline,
  updateStage,
} from "./api";
import { demoEngagements, demoTimeline } from "./demoData";
import type { Engagement, EngagementStage, StageKey, StageStatus, TimelineEvent } from "./types";
import "./styles.css";

const stageLabels: Record<StageKey, string> = {
  PROSPECT: "Prospect",
  PROPOSAL: "Proposal",
  ENGAGEMENT_LETTER: "Engagement Letter",
  DOCUMENT_COLLECTION: "Document Collection",
  PREPARATION: "Preparation",
  REVIEW: "Review",
  FILING: "Filing",
  BILLING: "Billing",
  PAYMENT: "Payment",
  RENEWAL: "Renewal",
};

//stage

const stageOrder = Object.keys(stageLabels) as StageKey[];

async function getToken(instance: ReturnType<typeof useMsal>["instance"]): Promise<string | undefined> {
  if (isDemoMode) return undefined;
  const account = instance.getActiveAccount() ?? instance.getAllAccounts()[0];
  if (!account) return undefined;
  const result = await instance.acquireTokenSilent({ ...loginRequest, account });
  return result.accessToken;
}

function App() {
  const { instance } = useMsal();
  const authenticated = useIsAuthenticated();

  if (!isDemoMode && !authenticated) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/engagements" element={<EngagementsPage />} />
        <Route path="/engagements/:id" element={<EngagementDetails />} />
        <Route path="/billing" element={<SimplePage title="Billing" />} />
        <Route path="/payments" element={<SimplePage title="Payments" />} />
      </Routes>
    </Layout>
  );
}

function LoginPage() {
  const { instance } = useMsal();

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-mark">EL</div>
        <h1>Engagement Lifecycle Manager</h1>
        <p>Sign in with your Microsoft work account to continue.</p>
        <button className="primary-button" onClick={() => instance.loginRedirect(loginRequest)}>
          Sign in
        </button>
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const { instance } = useMsal();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark small">EL</div>
          <div>
            <strong>Engagement</strong>
            <span>Lifecycle Manager</span>
          </div>
        </div>

        <nav>
          <Link to="/">Dashboard</Link>
          <Link to="/engagements">Engagements</Link>
          <Link to="/billing">Billing</Link>
          <Link to="/payments">Payments</Link>
        </nav>

        <div className="sidebar-footer">
          {isDemoMode ? (
            <span className="demo-pill">Demo mode</span>
          ) : (
            <button className="link-button" onClick={() => instance.logoutRedirect()}>
              Sign out
            </button>
          )}
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>Engagement Lifecycle</h1>
            <p>Track every engagement from prospect to renewal.</p>
          </div>
          <div className="user-chip">{isDemoMode ? "Demo User" : "Signed in"}</div>
        </header>
        {children}
      </main>
    </div>
  );
}

function Dashboard() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);

  useEffect(() => {
    if (isDemoMode) {
      setEngagements(demoEngagements);
      return;
    }
    getToken(window.msalInstanceForApp).then((token) =>
      getEngagements(token).then(setEngagements),
    );
  }, []);

  const stats = useMemo(() => {
    const active = engagements.filter((e) => e.status !== "COMPLETED").length;
    const review = engagements.filter((e) => e.currentStage === "REVIEW").length;
    const dueSoon = engagements.filter((e) => {
      const days = (new Date(e.dueDate).getTime() - Date.now()) / 86400000;
      return days >= 0 && days <= 14;
    }).length;
    return { total: engagements.length, active, review, dueSoon };
  }, [engagements]);

  return (
    <section>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p className="muted">A quick view of your engagement pipeline.</p>
        </div>
        <Link className="primary-button" to="/engagements">
          View engagements
        </Link>
      </div>

      <div className="stat-grid">
        <StatCard label="Total engagements" value={stats.total} />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="In review" value={stats.review} />
        <StatCard label="Due in 14 days" value={stats.dueSoon} />
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Recent engagements</h3>
          <Link to="/engagements">View all</Link>
        </div>
        <EngagementTable engagements={engagements.slice(0, 5)} />
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EngagementsPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (isDemoMode) {
      setEngagements(demoEngagements);
      return;
    }
    getToken(window.msalInstanceForApp).then((token) =>
      getEngagements(token).then(setEngagements),
    );
  }, []);

  const addEngagement = async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const payload = {
      clientId: String(data.get("clientId")),
      clientName: String(data.get("clientName")),
      engagementNumber: String(data.get("engagementNumber")),
      taxYear: Number(data.get("taxYear")),
      status: "IN_PROGRESS" as StageStatus,
      currentStage: "PROSPECT" as StageKey,
      owner: String(data.get("owner")),
      dueDate: String(data.get("dueDate")),
    };

    if (isDemoMode) {
      const created: Engagement = {
        ...payload,
        id: `eng-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stages: [],
      };
      setEngagements((current) => [created, ...current]);
      setShowCreate(false);
      return;
    }

    const token = await getToken(window.msalInstanceForApp);
    const created = await createEngagement(payload, token);
    setEngagements((current) => [created, ...current]);
    setShowCreate(false);
  };

  return (
    <section>
      <div className="page-header">
        <div>
          <h2>Engagements</h2>
          <p className="muted">Manage every client engagement and its lifecycle.</p>
        </div>
        <button className="primary-button" onClick={() => setShowCreate(true)}>
          + New engagement
        </button>
      </div>

      <div className="card">
        <EngagementTable engagements={engagements} />
      </div>

      {showCreate && (
        <Modal title="Create engagement" onClose={() => setShowCreate(false)}>
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              void addEngagement(e.currentTarget);
            }}
          >
            <label>Client name<input name="clientName" required /></label>
            <label>Client ID<input name="clientId" required defaultValue={`client-${Date.now()}`} /></label>
            <label>Engagement number<input name="engagementNumber" required placeholder="ENG-2026-1004" /></label>
            <label>Tax year<input name="taxYear" type="number" defaultValue={2026} required /></label>
            <label>Owner<input name="owner" required /></label>
            <label>Due date<input name="dueDate" type="date" required /></label>
            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="primary-button">Create</button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

function EngagementTable({ engagements }: { engagements: Engagement[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Client</th>
            <th>Engagement</th>
            <th>Current stage</th>
            <th>Owner</th>
            <th>Due date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {engagements.map((engagement) => (
            <tr key={engagement.id}>
              <td>
                <Link className="table-link" to={`/engagements/${engagement.id}`}>
                  {engagement.clientName}
                </Link>
              </td>
              <td>{engagement.engagementNumber}</td>
              <td>{stageLabels[engagement.currentStage]}</td>
              <td>{engagement.owner}</td>
              <td>{new Date(engagement.dueDate).toLocaleDateString()}</td>
              <td><StatusBadge status={engagement.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!engagements.length && <div className="empty-state">No engagements found.</div>}
    </div>
  );
}

function EngagementDetails() {
  const { id = "" } = useParams();
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    if (isDemoMode) {
      const item = demoEngagements.find((e) => e.id === id) ?? null;
      setEngagement(item);
      setTimeline(demoTimeline[id] ?? []);
      return;
    }
    getToken(window.msalInstanceForApp).then(async (token) => {
      const [item, events] = await Promise.all([
        getEngagement(id, token),
        getTimeline(id, token),
      ]);
      setEngagement(item);
      setTimeline(events);
    });
  }, [id]);

  if (!engagement) return <div className="card">Engagement not found.</div>;

    const stages: EngagementStage[] = engagement.stages?.length
    ? engagement.stages
    : stageOrder.map((key) => ({
        stageKey: key,
        stageName: stageLabels[key],
        status: key === engagement.currentStage ? "IN_PROGRESS" : "PENDING" as StageStatus,
      }));

  async function changeStage(stage: EngagementStage, status: StageStatus) {
    if (isDemoMode) {
      setEngagement((current) =>
        current
          ? {
              ...current,
              currentStage: stage.stageKey,
              status,
              stages: current.stages?.map((s) =>
                s.stageKey === stage.stageKey ? { ...s, status } : s,
              ),
            }
          : current,
      );
      return;
    }

    const token = await getToken(window.msalInstanceForApp);
    const updated = await updateStage(id, stage.stageKey, status, token);
    setEngagement((current) =>
      current
        ? {
            ...current,
            currentStage: updated.stageKey,
            status,
            stages: current.stages?.map((s) =>
              s.stageKey === updated.stageKey ? updated : s,
            ),
          }
        : current,
    );
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <Link className="back-link" to="/engagements">← Back to engagements</Link>
          <h2>{engagement.clientName}</h2>
          <p className="muted">{engagement.engagementNumber} · Tax year {engagement.taxYear}</p>
        </div>
        <StatusBadge status={engagement.status} />
      </div>

      <div className="detail-grid">
        <div className="card">
          <div className="card-header"><h3>Engagement information</h3></div>
          <div className="info-grid">
            <Info label="Owner" value={engagement.owner} />
            <Info label="Due date" value={new Date(engagement.dueDate).toLocaleDateString()} />
            <Info label="Current stage" value={stageLabels[engagement.currentStage]} />
            <Info label="Tax year" value={String(engagement.taxYear)} />
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Lifecycle</h3></div>
          <div className="lifecycle">
            {stages.map((stage) => (
              <div className="stage-row" key={stage.stageKey}>
                <div className={`stage-dot ${stage.status.toLowerCase()}`}>
                  {stage.status === "COMPLETED" ? "✓" : stage.status === "IN_PROGRESS" ? "●" : "○"}
                </div>
                <div className="stage-main">
                  <strong>{stage.stageName}</strong>
                  <span>{stage.status.replace("_", " ")}</span>
                </div>
                <select
                  value={stage.status}
                  onChange={(e) => void changeStage(stage, e.target.value as StageStatus)}
                >
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>Timeline</h3></div>
        <div className="timeline">
          {timeline.map((event) => (
            <div className="timeline-item" key={event.id}>
              <div className="timeline-line" />
              <div className="timeline-dot" />
              <div>
                <strong>{event.title}</strong>
                <p>{event.actor} · {new Date(event.timestamp).toLocaleString()}</p>
                {event.notes && <span>{event.notes}</span>}
              </div>
            </div>
          ))}
          {!timeline.length && <div className="empty-state">No activity recorded yet.</div>}
        </div>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><span className="info-label">{label}</span><strong>{value}</strong></div>;
}

function StatusBadge({ status }: { status: StageStatus }) {
  return <span className={`status-badge ${status.toLowerCase()}`}>{status.replace("_", " ")}</span>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="card-header">
          <h3>{title}</h3>
          <button className="icon-button" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SimplePage({ title }: { title: string }) {
  return (
    <section>
      <div className="page-header"><div><h2>{title}</h2><p className="muted">This module is ready for the next development phase.</p></div></div>
      <div className="card empty-state">We will connect {title.toLowerCase()} to the lifecycle after the core engagement workflow is working.</div>
    </section>
  );
}

declare global {
  interface Window {
        msalInstanceForApp: import("@azure/msal-browser").PublicClientApplication;
  }
}

export default function RootApp() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
