import { useCallback, useState, type FormEvent } from "react";
import {
  getAdminSubmission,
  getAdminSubmissionDownload,
  getAdminSubmissions,
  postJson,
  type AdminSubmissionDetail,
  type AdminSubmissionListItem,
} from "../api";
import { Loading } from "../components/Loading";
import { useAsyncData } from "../hooks";

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");
    setIsSubmitting(true);

    try {
      await postJson("/admin/login", {
        username: formData.get("username"),
        password: formData.get("password"),
      });
      onLogin();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="admin-login" onSubmit={submit}>
      <label>
        <span>Username</span>
        <input name="username" type="text" autoComplete="username" required />
      </label>
      <label>
        <span>Password</span>
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Signing in..." : "Sign in"}</button>
      {error ? <p className="form-status form-status-error" role="alert">{error}</p> : null}
    </form>
  );
}

function SubmissionDetailPanel({ submission, onDownload }: { submission: AdminSubmissionDetail; onDownload: (id: string) => void }) {
  return (
    <section className="admin-detail" aria-label="Submission detail">
      <dl>
        <div><dt>Name</dt><dd>{submission.name}</dd></div>
        <div><dt>Email</dt><dd><a href={`mailto:${submission.email}`}>{submission.email}</a></dd></div>
        <div><dt>Title</dt><dd>{submission.title}</dd></div>
        <div><dt>Status</dt><dd>{submission.status}</dd></div>
        <div><dt>Submitted</dt><dd>{formatDate(submission.submittedAt)}</dd></div>
        {submission.videoUrl ? <div><dt>Video</dt><dd><a href={submission.videoUrl}>{submission.videoUrl}</a></dd></div> : null}
        <div><dt>Abstract</dt><dd>{submission.abstract || "Not provided"}</dd></div>
        <div>
          <dt>File</dt>
          <dd>
            {submission.file ? (
              <button type="button" onClick={() => onDownload(submission.submissionId)}>
                Download {submission.file.filename}
              </button>
            ) : "No file attached"}
          </dd>
        </div>
      </dl>
    </section>
  );
}

export function AdminSubmissionsPage() {
  const [sessionKey, setSessionKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminSubmissionDetail | null>(null);
  const [error, setError] = useState("");
  const loadSubmissions = useCallback(() => getAdminSubmissions(), []);
  const state = useAsyncData(`admin-submissions:${sessionKey}`, loadSubmissions);

  async function selectSubmission(submission: AdminSubmissionListItem) {
    setSelectedId(submission.submissionId);
    setError("");
    try {
      const result = await getAdminSubmission(submission.submissionId);
      setSelected(result.submission);
    } catch (detailError) {
      setSelected(null);
      setError(detailError instanceof Error ? detailError.message : "Submission unavailable.");
    }
  }

  async function downloadSubmission(submissionId: string) {
    setError("");
    try {
      const result = await getAdminSubmissionDownload(submissionId);
      window.location.assign(result.url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Download unavailable.");
    }
  }

  if (state.status === "loading") return <Loading />;

  if (state.status === "error") {
    return (
      <main>
        <section className="article-hero">
          <h1>Submissions Admin</h1>
        </section>
        <section className="body admin-page">
          <LoginForm onLogin={() => setSessionKey((value) => value + 1)} />
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="article-hero">
        <div className="hero-kicker">Editorial tools</div>
        <h1>Submissions Admin</h1>
      </section>
      <section className="admin-page">
        {error ? <p className="form-status form-status-error" role="alert">{error}</p> : null}
        {state.data.submissions.length ? (
          <div className="admin-layout">
            <div className="admin-list" role="list" aria-label="Submissions">
              {state.data.submissions.map((submission) => (
                <button
                  type="button"
                  key={submission.submissionId}
                  className={selectedId === submission.submissionId ? "is-selected" : ""}
                  onClick={() => selectSubmission(submission)}
                >
                  <span>{formatDate(submission.submittedAt)}</span>
                  <strong>{submission.title}</strong>
                  <small>{submission.name} · {submission.status}{submission.hasFile ? " · file" : ""}</small>
                </button>
              ))}
            </div>
            {selected ? <SubmissionDetailPanel submission={selected} onDownload={downloadSubmission} /> : <p className="pending">Select a submission.</p>}
          </div>
        ) : <p className="pending">No submissions yet.</p>}
      </section>
    </main>
  );
}
