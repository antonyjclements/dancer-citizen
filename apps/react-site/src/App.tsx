import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { IssuePage } from "./pages/IssuePage";
import { ArticlePage } from "./pages/ArticlePage";
import { ContentPage } from "./pages/ContentPage";
import { NotFoundPage } from "./pages/NotFoundPage";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/submissions", label: "Submissions" },
  { href: "/contributors", label: "Contributors" },
  { href: "/support-us", label: "Support Us" },
];

function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);

  return null;
}

export function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <>
      <ScrollToTop />
      <header className="site-header">
        <Link to="/" className="brand" onClick={() => setIsMenuOpen(false)}>The Dancer-Citizen</Link>
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={isMenuOpen}
          aria-controls="primary-navigation"
          aria-label={isMenuOpen ? "Close main navigation" : "Open main navigation"}
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
        <nav
          id="primary-navigation"
          className={isMenuOpen ? "primary-nav is-open" : "primary-nav"}
          aria-label="Main navigation"
        >
          {navLinks.map((link) => (
            <Link key={link.href} to={link.href} onClick={() => setIsMenuOpen(false)}>
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/issues/:uid" element={<IssuePage />} />
        <Route path="/articles/:uid" element={<ArticlePage />} />
        <Route path="/:uid" element={<ContentPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <footer className="site-footer">
        <div>
          <h2>The Dancer-Citizen</h2>
          <p>An open-access, peer-reviewed dance journal exploring dance, civic life, and public imagination.</p>
        </div>
        <div>
          <p>Contact: <a href="mailto:editors@dancercitizen.org">editors@dancercitizen.org</a></p>
          <Link to="/support-us">Support the journal</Link>
        </div>
      </footer>
    </>
  );
}
