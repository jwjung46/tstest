export default function AppPage() {
  return (
    <main className="page-shell page-shell--protected">
      <section className="panel">
        <p className="eyebrow">Protected Area</p>
        <h1>App workspace</h1>
        <p className="page-copy">
          This route is reserved for signed-in users. Feature modules can be
          added here one by one.
        </p>
      </section>
    </main>
  );
}
