import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="not-found">
      <section className="not-found-hero" aria-labelledby="not-found-title">
        <p className="not-found-kicker">Error 404</p>
        <h1 id="not-found-title">This page has stepped out of frame.</h1>
        <p className="not-found-copy">
          The link may have moved, or the performance may have ended. Return to the journal, browse recent issues, or
          reach the editors from here.
        </p>
        <div className="not-found-actions" aria-label="404 page options">
          <Link className="not-found-primary" to="/">
            Return to the journal
          </Link>
          <Link to="/about">About the journal</Link>
          <Link to="/submissions">Submit work</Link>
        </div>
      </section>
      <section className="not-found-panel" aria-label="Suggested paths">
        <Link to="/">
          <span>01</span>
          <strong>Issue archive</strong>
          <small>Start again with the latest writing and past editions.</small>
        </Link>
        <Link to="/contributors">
          <span>02</span>
          <strong>Contributors</strong>
          <small>Find artists, scholars, editors, and collaborators.</small>
        </Link>
        <Link to="/support-us">
          <span>03</span>
          <strong>Support us</strong>
          <small>Help keep the journal open-access and independent.</small>
        </Link>
      </section>
    </main>
  );
}
