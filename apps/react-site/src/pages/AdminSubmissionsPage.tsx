import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  ApiError,
  getAdminSubmission,
  getAdminSubmissionDownload,
  getAdminSubmissions,
  postJson,
  type AdminLoginResult,
  type AdminSubmissionDetail,
  type AdminSubmissionListItem,
  type AdminSubmissionsResult,
} from "../api";
import { Loading } from "../components/Loading";
import { useAsyncData } from "../hooks";

function formatDate(value: string) {
  if (!value || Number.isNaN(Date.parse(value))) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [challenge, setChallenge] = useState<Extract<AdminLoginResult, { challenge: string }> | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setError("");
    setIsSubmitting(true);
    try {
      const result = await postJson<AdminLoginResult>("/admin/login", challenge ? {
        username: challenge.username, session: challenge.session, newPassword: formData.get("newPassword"),
      } : { username: formData.get("username"), password: formData.get("password") });
      form.reset();
      if ("challenge" in result) setChallenge(result);
      else if ("ok" in result && result.ok) onLogin();
      else throw new Error("Unexpected sign-in response. Please try again.");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="admin-login" onSubmit={submit}>
      <p>{challenge ? "Choose a new password for the shared editorial account." : "Sign in with the editorial Cognito account."}</p>
      {challenge ? (
        <label><span>New password</span><input key="new-password" name="newPassword" type="password" autoComplete="new-password" minLength={12} maxLength={256} required aria-describedby="password-help" />
          <small id="password-help">At least 12 characters, including uppercase and lowercase letters, a number and a symbol.</small>
        </label>
      ) : <>
        <label><span>Username</span><input name="username" type="text" autoComplete="username" maxLength={128} required /></label>
        <label><span>Password</span><input name="password" type="password" autoComplete="current-password" maxLength={256} required /></label>
      </>}
      <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Signing in…" : challenge ? "Set password and sign in" : "Sign in"}</button>
      {challenge ? <button type="button" disabled={isSubmitting} onClick={() => { setChallenge(null); setError(""); }}>Restart sign-in</button> : null}
      {error ? <p className="form-status form-status-error" role="alert">{error}</p> : null}
    </form>
  );
}

function SubmissionDetailPanel({ submission, onDownload, downloading }: { submission: AdminSubmissionDetail; onDownload: (id: string) => void; downloading: boolean }) {
  const safeVideoUrl = /^https?:\/\//i.test(submission.videoUrl) ? submission.videoUrl : null;
  return (
    <section className="admin-detail" aria-label="Submission detail">
      <h2>{submission.title}</h2>
      <dl>
        <div><dt>Name</dt><dd>{submission.name}</dd></div>
        <div><dt>Email</dt><dd><a href={`mailto:${submission.email}`}>{submission.email}</a></dd></div>
        <div><dt>Status</dt><dd>{submission.status.replaceAll("_", " ")}</dd></div>
        <div><dt>Submitted</dt><dd>{formatDate(submission.submittedAt)}</dd></div>
        {safeVideoUrl ? <div><dt>Video</dt><dd><a href={safeVideoUrl} target="_blank" rel="noopener noreferrer">{safeVideoUrl}</a></dd></div> : null}
        <div><dt>Abstract</dt><dd className="admin-abstract">{submission.abstract || "Not provided"}</dd></div>
        <div><dt>File</dt><dd>{submission.file ? (
          <button type="button" disabled={downloading} onClick={() => onDownload(submission.submissionId)}>Download {submission.file.filename}</button>
        ) : "No file attached"}</dd></div>
      </dl>
    </section>
  );
}

function SubmissionBrowser({ initial, onExpired }: { initial: AdminSubmissionsResult; onExpired: () => void }) {
  const [submissions, setSubmissions] = useState(initial.submissions);
  const [nextCursor, setNextCursor] = useState(initial.nextCursor);
  const [draftQuery, setDraftQuery] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminSubmissionDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [detailBusy, setDetailBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const listRequest = useRef(0);
  const detailRequest = useRef(0);
  const downloadRequest = useRef(0);
  useEffect(() => () => { listRequest.current++; detailRequest.current++; downloadRequest.current++; }, []);

  function handleError(error: unknown) {
    if (error instanceof ApiError && error.status === 401) onExpired();
    else setError(error instanceof Error ? error.message : "Request failed. Please try again.");
  }

  async function load(queryValue: string, cursor?: string) {
    const request = ++listRequest.current;
    detailRequest.current++;
    downloadRequest.current++;
    setDownloading(false);
    setSelected(null);
    setSelectedId(null);
    setDetailBusy(false);
    setError("");
    setBusy(true);
    try {
      const result = await getAdminSubmissions(queryValue, cursor);
      if (request !== listRequest.current) return;
      setSubmissions((previous) => Array.from(new Map((cursor ? [...previous, ...result.submissions] : result.submissions)
        .map((submission) => [submission.submissionId, submission])).values())
        .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt)));
      setQuery(queryValue);
      setNextCursor(result.nextCursor);
    } catch (error) {
      if (request === listRequest.current) handleError(error);
    } finally {
      if (request === listRequest.current) setBusy(false);
    }
  }

  async function selectSubmission(submission: AdminSubmissionListItem) {
    const request = ++detailRequest.current;
    downloadRequest.current++;
    setDownloading(false);
    setSelectedId(submission.submissionId);
    setSelected(null);
    setDetailBusy(true);
    setError("");
    try {
      const result = await getAdminSubmission(submission.submissionId);
      if (request === detailRequest.current) setSelected(result.submission);
    } catch (error) {
      if (request === detailRequest.current) handleError(error);
    } finally {
      if (request === detailRequest.current) setDetailBusy(false);
    }
  }

  async function downloadSubmission(submissionId: string) {
    const request = ++downloadRequest.current;
    setDownloading(true);
    setError("");
    try {
      const result = await getAdminSubmissionDownload(submissionId);
      if (request === downloadRequest.current) window.location.assign(result.url);
    } catch (error) {
      if (request === downloadRequest.current) handleError(error);
    } finally {
      if (request === downloadRequest.current) setDownloading(false);
    }
  }

  async function logout() {
    listRequest.current++;
    detailRequest.current++;
    downloadRequest.current++;
    setBusy(true);
    setSelected(null);
    setSelectedId(null);
    setSubmissions([]);
    setError("");
    try {
      await postJson("/admin/logout", {});
      onExpired();
    } catch {
      setError("Sign-out failed. Please retry signing out.");
      setBusy(false);
    }
  }

  return <>
    <div className="admin-toolbar">
      <form className="admin-search" onSubmit={(event) => { event.preventDefault(); void load(draftQuery.trim()); }}>
        <label htmlFor="submission-search">Search submissions</label>
        <div><input id="submission-search" type="search" value={draftQuery} maxLength={200} onChange={(event) => setDraftQuery(event.target.value)} placeholder="Name, email, title or abstract" />
          <button type="submit" disabled={busy}>Search</button>
          <button type="button" disabled={busy} onClick={() => { setDraftQuery(""); void load(""); }}>Reset</button>
        </div>
      </form>
      <button type="button" className="admin-signout" disabled={busy} onClick={logout}>Sign out</button>
    </div>
    {error ? <p className="form-status form-status-error" role="alert">{error}</p> : null}
    <p role="status">{submissions.length} {query ? `matches for “${query}”` : "submissions"} loaded. {nextCursor ? "More records remain to be searched." : "All records searched."}</p>
    {busy ? <Loading embedded /> : <>
      {submissions.length ? <div className="admin-layout">
        <div className="admin-list" aria-label="Submissions">
          {submissions.map((submission) => <button type="button" key={submission.submissionId}
            className={selectedId === submission.submissionId ? "is-selected" : ""}
            aria-pressed={selectedId === submission.submissionId} onClick={() => selectSubmission(submission)}>
            <span>{formatDate(submission.submittedAt)}</span><strong>{submission.title}</strong>
            <small>{submission.name} · {submission.email}</small>
            <small>{submission.status.replaceAll("_", " ")}{submission.hasFile ? " · attachment" : ""}</small>
          </button>)}
        </div>
        {detailBusy ? <Loading embedded /> : selected ? <SubmissionDetailPanel submission={selected} onDownload={downloadSubmission} downloading={downloading} /> : <p className="pending">Select a submission.</p>}
      </div> : <p className="pending">{nextCursor ? "No matches in the records searched so far. Continue searching below." : query ? "No matching submissions." : "No submissions yet."}</p>}
      {nextCursor ? <button className="admin-more" type="button" onClick={() => load(query, nextCursor)}>{query ? "Search next 100 records" : "Load next 100 records"}</button> : null}
    </>}
  </>;
}

function AdminSession({ onExpired }: { onExpired: () => void }) {
  const loadSubmissions = useCallback(() => getAdminSubmissions(), []);
  const state = useAsyncData("admin-submissions", loadSubmissions);
  if (state.status === "loading") return <Loading embedded />;
  if (state.status === "error") {
    if (state.error instanceof ApiError && state.error.status === 401) return <LoginForm onLogin={onExpired} />;
    return <><p role="alert">Submissions are unavailable. Please try again.</p><button type="button" onClick={onExpired}>Retry</button></>;
  }
  return <SubmissionBrowser initial={state.data} onExpired={onExpired} />;
}

export function AdminSubmissionsPage() {
  const [sessionKey, setSessionKey] = useState(0);
  return <main>
    <section className="article-hero"><div className="hero-kicker">Editorial tools</div><h1>Submissions Admin</h1></section>
    <section className="admin-page"><AdminSession key={sessionKey} onExpired={() => setSessionKey((value) => value + 1)} /></section>
  </main>;
}
