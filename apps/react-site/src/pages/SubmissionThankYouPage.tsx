import { Link, useLocation } from "react-router-dom";

export function SubmissionThankYouPage() {
  const location = useLocation();
  const state = location.state as { submissionId?: string } | null;

  return (
    <main>
      <section className="article-hero">
        <div className="hero-kicker">Submission received</div>
        <h1>Thank you for your submission</h1>
      </section>
      <section className="body">
        <p>
          Your submission has been received by The Dancer-Citizen editorial team.
          {state?.submissionId ? <> Your confirmation ID is <strong>{state.submissionId}</strong>.</> : null}
        </p>
        <p><Link to="/">Return home</Link></p>
      </section>
    </main>
  );
}
