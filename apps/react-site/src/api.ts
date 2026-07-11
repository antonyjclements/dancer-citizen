export type ImageView = {
  url: string;
  alt: string;
  dimensions?: { width: number; height: number };
};

export type JournalSummary = {
  id: string;
  uid: string;
  type: "issue_page" | "article_page" | "content_page";
  title: string;
  subtitle: string;
  issueNumber: number | null;
  publicationDate: string;
  href: string;
  thumbnail: ImageView | null;
};

export type PrismicDocument = {
  id: string;
  uid: string;
  type: string;
  tags: string[];
  data: Record<string, any>;
};

export type HomeData = {
  issues: JournalSummary[];
  latestIssue: JournalSummary | null;
};

export type IssueData = {
  issue: PrismicDocument;
  summary: JournalSummary;
  tableOfContents: JournalSummary[];
  previousIssue: JournalSummary | null;
  nextIssue: JournalSummary | null;
};

export type ArticleData = {
  article: PrismicDocument;
  summary: JournalSummary;
  issue: JournalSummary | null;
  previousArticle: JournalSummary | null;
  nextArticle: JournalSummary | null;
};

export type ContentPageData = {
  page: PrismicDocument;
  summary: JournalSummary;
};

export type SubmissionResult = {
  submissionId: string;
};

export type AdminSubmissionListItem = {
  submissionId: string;
  submittedAt: string;
  updatedAt: string;
  status: string;
  name: string;
  email: string;
  title: string;
  hasFile: boolean;
};

export type AdminSubmissionDetail = AdminSubmissionListItem & {
  abstract: string;
  videoUrl: string;
  date: string;
  file: {
    filename: string;
    contentType: string;
    size: number;
  } | null;
};

const apiBase = import.meta.env.VITE_CMS_API_BASE || "/cms";

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, { credentials: "include" });
  if (response.status === 404) throw new Error("not-found");
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export async function submitFormData(path: string, formData: FormData): Promise<SubmissionResult> {
  const response = await fetch(`${apiBase}${path}`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = Array.isArray(payload.errors) ? payload.errors.join(" ") : "Submission failed.";
    throw new Error(message);
  }

  return payload as SubmissionResult;
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : `Request failed: ${response.status}`);
  }

  return payload as T;
}

export async function getAdminSubmissions(): Promise<{ submissions: AdminSubmissionListItem[] }> {
  return getJson<{ submissions: AdminSubmissionListItem[] }>("/admin/submissions");
}

export async function getAdminSubmission(submissionId: string): Promise<{ submission: AdminSubmissionDetail }> {
  return getJson<{ submission: AdminSubmissionDetail }>(`/admin/submissions/${encodeURIComponent(submissionId)}`);
}

export async function getAdminSubmissionDownload(submissionId: string): Promise<{ url: string; expiresIn: number }> {
  return getJson<{ url: string; expiresIn: number }>(`/admin/submissions/${encodeURIComponent(submissionId)}/file`);
}
