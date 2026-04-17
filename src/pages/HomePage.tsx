import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-panel">
        <p className="eyebrow">Public Route</p>
        <h1>Service entry</h1>
        <p className="page-copy">
          This page is publicly accessible. Social login and marketing sections
          can be added here in the next steps.
        </p>
        <div className="cta-row">
          <Link className="button button--primary" to="/app">
            Go to protected app
          </Link>
          <span className="hint">
            Unauthenticated users will be redirected.
          </span>
        </div>
      </section>
    </main>
  );
}
