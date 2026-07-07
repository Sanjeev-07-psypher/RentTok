import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export const metadata = { title: "Help & FAQ — RentTok" };

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Do I need an account to browse rooms?",
    a: "No. You can search and view every listing without an account. You only sign in when you want to reserve a room.",
  },
  {
    q: "How does reserving a room work?",
    a: "You send a request to join the owner's queue. The owner reviews it and reaches out to you directly to finalise — no middlemen involved.",
  },
  {
    q: "How do I sign in?",
    a: "Use your email — we send you a secure one-tap sign-in link — or continue with Google. No passwords to remember.",
  },
  {
    q: "I'm an owner. How do I list my room?",
    a: (
      <>
        Head to <Link href="/owner" className="text-[var(--primary)] hover:underline">List your space</Link>,
        add photos, rent, amenities and house rules. Our team reviews it, and once approved it goes
        live for people to find.
      </>
    ),
  },
  {
    q: "What happens after I reserve a room?",
    a: "You're added to the owner's queue with your contact details. The owner reaches out to you directly to arrange a visit and finalise the stay.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. We only collect what's needed to connect you with owners, and identity documents are stored privately and reviewed manually.",
  },
];

export default function HelpPage() {
  return (
    <PageShell title="Help & FAQ" intro="Quick answers to the things tenants and owners ask most.">
      <div className="space-y-4">
        {FAQS.map((f) => (
          <details
            key={f.q}
            className="group rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]"
          >
            <summary className="cursor-pointer list-none font-semibold marker:content-none">
              <span className="flex items-center justify-between gap-4">
                {f.q}
                <span className="text-[var(--muted)] transition-transform group-open:rotate-45">+</span>
              </span>
            </summary>
            <div className="mt-3 text-sm text-[var(--muted)]">{f.a}</div>
          </details>
        ))}
      </div>

      <p className="pt-2 text-sm text-[var(--muted)]">
        Still stuck? Email us at{" "}
        <a href="mailto:hello@rent-tok.in" className="text-[var(--primary)] hover:underline">
          hello@rent-tok.in
        </a>
        .
      </p>
      <p className="pt-2 text-sm text-[var(--muted)]">
        Phone number:{" "}
        <a href="tel:8926413900" className="text-[var(--primary)] hover:underline">
          +91-8926413900
        </a>
        .
      </p>
    </PageShell>
  );
}
