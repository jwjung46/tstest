import type { ReactNode } from "react";

type AppShellProps = {
  brand: string;
  headerActions?: ReactNode;
  children: ReactNode;
  contentMode?: "default" | "blank";
};

export default function AppShell({
  brand,
  headerActions,
  children,
  contentMode = "default",
}: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <strong className="app-shell__brand">{brand}</strong>

        {headerActions ? (
          <div className="app-shell__header-actions">{headerActions}</div>
        ) : null}
      </header>

      <main
        className={[
          "app-shell__body",
          contentMode === "blank" ? "app-shell__body--blank" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {contentMode === "blank" ? (
          children
        ) : (
          <div className="app-shell__content">{children}</div>
        )}
      </main>
    </div>
  );
}
