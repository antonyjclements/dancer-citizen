export function Loading() {
  return (
    <main className="loading-page" aria-busy="true" aria-label="Loading page content">
      <section className="loading-hero" aria-hidden="true">
        <div className="skeleton skeleton-kicker" />
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-title skeleton-title-short" />
      </section>
      <section className="loading-body" aria-hidden="true">
        <div className="skeleton skeleton-line skeleton-line-wide" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line skeleton-line-mid" />
        <div className="skeleton skeleton-card-grid">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      </section>
    </main>
  );
}
