export function PageShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
      {intro && <p className="mt-3 text-lg text-[var(--muted)]">{intro}</p>}
      <div className="mt-8 space-y-6 leading-relaxed text-[var(--foreground)]/90">{children}</div>
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold tracking-tight">{heading}</h2>
      <div className="mt-2 space-y-2 text-[var(--muted)]">{children}</div>
    </section>
  );
}
