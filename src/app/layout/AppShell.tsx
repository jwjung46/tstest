import type { ReactNode } from "react";

type NavigationItem = {
  label: string;
  description: string;
};

type AppShellProps = {
  brand: string;
  title: string;
  subtitle: string;
  navigationItems: NavigationItem[];
  children: ReactNode;
};

export default function AppShell({
  brand,
  title,
  subtitle,
  navigationItems,
  children,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div>
          <p className="eyebrow">Protected Route</p>
          <strong className="app-shell__brand">{brand}</strong>
        </div>
        <div className="app-shell__header-copy">
          <h1 className="app-shell__title">{title}</h1>
          <p>{subtitle}</p>
        </div>
      </header>

      <div className="app-shell__body">
        <aside
          className="app-shell__sidebar"
          aria-label="Future app navigation"
        >
          <div className="app-shell__sidebar-header">
            <p className="eyebrow">Menu</p>
            <p className="app-shell__sidebar-copy">
              Future modules will be placed here.
            </p>
          </div>

          <nav className="app-shell__nav">
            {navigationItems.map((item) => (
              <div className="app-shell__nav-item" key={item.label}>
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </div>
            ))}
          </nav>
        </aside>

        <section className="app-shell__content">{children}</section>
      </div>
    </div>
  );
}
