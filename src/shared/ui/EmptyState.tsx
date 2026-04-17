type EmptyStateProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export default function EmptyState({
  eyebrow,
  title,
  description,
}: EmptyStateProps) {
  return (
    <section className="empty-state">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="empty-state__title">{title}</h1>
      <p className="page-copy">{description}</p>
    </section>
  );
}
