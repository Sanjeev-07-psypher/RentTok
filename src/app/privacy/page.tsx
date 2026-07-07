import { PageShell, Section } from "@/components/page-shell";

export const metadata = { title: "Privacy Policy — RentTok" };

export default function PrivacyPage() {
  return (
    <PageShell
      title="Privacy Policy"
      intro="What we collect, why we collect it, and how we keep it safe."
    >
      <Section heading="What we collect">
        <p>
          When you sign in we store your email and, optionally, your name and phone number so owners
          can contact you about a booking. Owners provide listing details and photos. Payment
          details are handled entirely by our payment provider — we never store them.
        </p>
      </Section>
      <Section heading="How we use it">
        <p>
          Your information is used to run the service: showing you listings, processing reservations,
          and connecting you with owners. When you reserve a room, the owner can see your name and
          contact details so they can reach out.
        </p>
      </Section>
      <Section heading="Who can see your data">
        <p>
          Owners only see the contact details of tenants who have requested their room. We don&apos;t
          sell your data, and we don&apos;t share it with third parties except the infrastructure
          providers needed to operate (such as hosting and database).
        </p>
      </Section>
      <Section heading="Your control">
        <p>
          You can request deletion of your account and personal data at any time by emailing us at{" "}
          <a href="mailto:hello@rent-tok.in" className="text-[var(--primary)] hover:underline">
            hello@rent-tok.in
          </a>
          .
        </p>
      </Section>
      <p className="text-sm text-[var(--muted)]">Last updated: June 2026.</p>
    </PageShell>
  );
}
