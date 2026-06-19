import { Link } from "react-router-dom";

export function NotFoundPage() {
  return <main className="page not-found"><h1>Page not found</h1><Link to="/">Return home</Link></main>;
}
