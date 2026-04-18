import type { ReactNode } from "react";

type AppShellProps = {
  brand: string;
  headerActions?: ReactNode;
  children: ReactNode;
};

export default function AppShell({
  brand,
  headerActions,
  children,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <strong className="app-shell__brand">{brand}</strong>

        {headerActions ? (
          <div className="app-shell__header-actions">{headerActions}</div>
        ) : null}
      </header>

      <main className="app-shell__content">{children}</main>
    </div>
  );
}
