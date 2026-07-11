import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { submitFormData } from "../api";

type SubmissionState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; submissionId: string }
  | { status: "error"; message: string };

function createClientSubmissionId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

declare global {
  interface Window {
    grecaptcha?: {
      ready(callback: () => void): void;
      execute(siteKey: string, options: { action: string }): Promise<string>;
    };
  }
}

const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "";
const recaptchaAction = import.meta.env.VITE_RECAPTCHA_ACTION || "submission";

function loadRecaptchaScript() {
  if (!recaptchaSiteKey || window.grecaptcha) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>("script[data-recaptcha]");
  if (existing) {
    return new Promise<void>((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Human verification could not load.")), { once: true });
    });
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(recaptchaSiteKey)}`;
    script.async = true;
    script.defer = true;
    script.dataset.recaptcha = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Human verification could not load.")), { once: true });
    document.head.appendChild(script);
  });
}

async function recaptchaToken() {
  if (!recaptchaSiteKey) return "";
  await loadRecaptchaScript();
  if (!window.grecaptcha) throw new Error("Human verification could not load.");
  return new Promise<string>((resolve, reject) => {
    window.grecaptcha!.ready(() => {
      window.grecaptcha!.execute(recaptchaSiteKey, { action: recaptchaAction }).then(resolve, reject);
    });
  });
}

export function SubmissionForm() {
  const [state, setState] = useState<SubmissionState>({ status: "idle" });
  const [clientSubmissionId, setClientSubmissionId] = useState(createClientSubmissionId);
  const navigate = useNavigate();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (!form.reportValidity()) return;

    setState({ status: "submitting" });

    try {
      const formData = new FormData(form);
      formData.set("recaptchaToken", await recaptchaToken());
      const result = await submitFormData("/submissions", formData);
      form.reset();
      setClientSubmissionId(createClientSubmissionId());
      setState({ status: "success", submissionId: result.submissionId });
      navigate("/submissions/thank-you", { state: { submissionId: result.submissionId } });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Submission failed." });
    }
  }

  return (
    <section className="submission-form-section" aria-labelledby="submission-form-heading">
      <h2 id="submission-form-heading">Issue 20 Submission Form</h2>
      <form className="submission-form" onSubmit={onSubmit}>
        <input name="clientSubmissionId" type="hidden" value={clientSubmissionId} />
        <input name="recaptchaToken" type="hidden" value="" />
        <label className="submission-honeypot" aria-hidden="true">
          <span>Website</span>
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>

        <label>
          <span>Name <strong aria-hidden="true">*</strong></span>
          <input name="name" type="text" required autoComplete="name" />
        </label>

        <fieldset>
          <legend>Date</legend>
          <div className="date-fields">
            <label>
              <span>MM</span>
              <input name="dateMonth" type="text" inputMode="numeric" maxLength={2} pattern="[0-9]{1,2}" />
            </label>
            <label>
              <span>DD</span>
              <input name="dateDay" type="text" inputMode="numeric" maxLength={2} pattern="[0-9]{1,2}" />
            </label>
            <label>
              <span>YYYY</span>
              <input name="dateYear" type="text" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" />
            </label>
          </div>
        </fieldset>

        <label>
          <span>Email <strong aria-hidden="true">*</strong></span>
          <input name="email" type="email" required autoComplete="email" />
        </label>

        <label>
          <span>Title of Work <strong aria-hidden="true">*</strong></span>
          <input name="title" type="text" required />
        </label>

        <label>
          <span>Abstract</span>
          <textarea name="abstract" rows={9} />
        </label>

        <label>
          <span>Link to Video</span>
          <input name="videoUrl" type="url" inputMode="url" />
        </label>

        <label>
          <span>Attach a File</span>
          <input
            name="file"
            type="file"
            accept=".doc,.docx,.pdf,.rtf,.txt,application/msword,application/pdf,application/rtf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          />
        </label>

        <label className="certification-field">
          <input name="certification" type="checkbox" value="true" required />
          <span>I certify that this paper is not under review elsewhere <strong aria-hidden="true">*</strong></span>
        </label>

        <button type="submit" disabled={state.status === "submitting"}>
          {state.status === "submitting" ? "Submitting..." : "Submit"}
        </button>

        {state.status === "success" ? (
          <p className="form-status form-status-success" role="status">
            Thank you. Your submission was received.
          </p>
        ) : null}
        {state.status === "error" ? (
          <p className="form-status form-status-error" role="alert">
            {state.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
