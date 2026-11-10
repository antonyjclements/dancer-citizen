import { Link } from "react-router-dom";
import type { BookReviewCard } from "../api";

export function BookReviews({ heading, cards }: { heading?: string; cards?: BookReviewCard[] }) {
  if (!cards?.length) return null;

  const Title = heading ? "h3" : "h2";

  return (
    <section className="book-reviews" aria-label={heading || "Book reviews"}>
      {heading ? <h2>{heading}</h2> : null}
      <ul className="book-review-grid" role="list">
        {cards.map(({ title, href, bookAuthor, reviewer, summary, cover }, index) => (
          <li key={`${href}-${index}`}>
            <Link className="book-review-card" to={href} aria-label={`Read the review of ${title}`}>
              <div className="book-review-cover">
                {cover ? (
                  <img src={cover.url} alt={cover.alt} width={cover.dimensions?.width} height={cover.dimensions?.height} />
                ) : (
                  <span className="book-review-cover-placeholder" aria-hidden="true" />
                )}
              </div>
              <div className="book-review-copy">
                <Title>{title}</Title>
                {bookAuthor ? <p>A book by {bookAuthor}</p> : null}
                {reviewer ? <p className="book-review-byline">Reviewed by {reviewer}</p> : null}
                {summary ? <p>{summary}</p> : null}
              </div>
              <span className="book-review-action">
                <span>Read the review</span>
                <span aria-hidden="true">→</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
