import AuthButton from "../shared/ui/AuthButton";
import PageContainer from "../shared/ui/PageContainer";

export default function HomePage() {
  return (
    <PageContainer className="page-container--landing">
      <section className="landing-hero">
        <div className="landing-hero__copy">
          <p className="eyebrow">Public Route</p>
          <span className="landing-hero__brand">Teamspace</span>
          <h1>One place to enter your protected work area.</h1>
          <p className="page-copy">
            Start from a clear landing page now, then plug in real OAuth and
            actual feature modules later without rewriting the page structure.
          </p>
        </div>

        <div className="landing-login-card">
          <div className="landing-login-card__header">
            <p className="eyebrow">Login Entry</p>
            <p className="hint">
              Social login UI is prepared, but real provider integration is not
              connected in this phase.
            </p>
          </div>

          <div className="auth-button-group" aria-label="Planned social login">
            <AuthButton provider="Google" disabled />
            <AuthButton provider="Kakao" disabled />
            <AuthButton provider="Naver" disabled />
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section__heading">
          <p className="eyebrow">After Login</p>
          <h2>What users will be able to do here</h2>
          <p className="page-copy">
            This section stays simple on purpose so future features can replace
            these placeholders without fighting the page structure.
          </p>
        </div>

        <div className="capability-grid">
          <article className="capability-card">
            <h3>Enter the protected workspace</h3>
            <p>
              Land inside a stable app shell with clear header, sidebar, and
              content boundaries.
            </p>
          </article>
          <article className="capability-card">
            <h3>Use feature modules gradually</h3>
            <p>
              Add dashboard, profile, settings, or other modules later without
              mixing them into the public landing page.
            </p>
          </article>
          <article className="capability-card">
            <h3>Connect real authentication later</h3>
            <p>
              Replace disabled login buttons with real provider actions when the
              auth layer is ready.
            </p>
          </article>
        </div>
      </section>
    </PageContainer>
  );
}
