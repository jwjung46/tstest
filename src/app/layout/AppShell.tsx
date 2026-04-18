import type * as React from "react";

type AppShellProps = {
  header?: React.ReactNode;
  children: React.ReactNode;
};

export default function AppShell({ header, children }: AppShellProps) {
  return (
    <div className="app-shell">
      {header && <header className="app-shell__header">{header}</header>}

      <main className="app-shell__body">{children}</main>
    </div>
  );
}
