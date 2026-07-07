import { PageShell, Section } from "@/components/page-shell";

export const metadata = { title: "Terms of Service — Rent-tok" };

export default function TermsPage() {
  return (
    <PageShell
      title="Terms of Service"
      intro="The basics of using Rent-tok. Please read them before booking or listing a room."
    >
      <Section heading="1. About these terms">
        <p>
          By using Rent-tok you agree to these terms. Rent-tok is a platform that connects students
          looking for accommodation with room owners in and around Gangtok, Sikkim.
        </p>
      </Section>
      <Section heading="2. Bookings and requests">
        <p>
          Rent-tok is currently free to use. Reserving a room sends a request that adds you to the
          owner&apos;s queue; it is not rent, a deposit, or a guarantee of accommodation. The final
          rental agreement is made directly between you and the owner. You can cancel a pending
          request at any time, and owners may decline requests. (Paid options may be introduced in
          the future, with prior notice.)
        </p>
      </Section>
      <Section heading="3. Calls and recording">
        <p>
          To protect everyone&apos;s privacy, owners and tenants connect through Rent-tok&apos;s
          in-app calling, which masks both phone numbers. By placing or receiving these calls you
          consent to them being recorded for safety, quality, and dispute resolution. An announcement
          plays at the start of each call. Recordings are accessible only to Rent-tok administrators.
        </p>
      </Section>
      <Section heading="4. Listings">
        <p>
          Owners are responsible for the accuracy of their listings. Rent-tok reviews listings
          before they go live but does not own or manage the properties. We may remove listings that
          are misleading, unsafe, or violate these terms.
        </p>
      </Section>
      <Section heading="5. Acceptable use">
        <p>
          Don&apos;t misuse the platform — no fraudulent bookings, fake listings, harassment, or
          attempts to bypass the platform to avoid fees.
        </p>
      </Section>
      <Section heading="6. Liability">
        <p>
          Rent-tok facilitates introductions between students and owners. We are not party to any
          rental agreement and are not liable for disputes, the condition of any property, or the
          conduct of users.
        </p>
      </Section>
      <Section heading="7. Changes">
        <p>
          We may update these terms as the platform grows. Continued use after changes means you
          accept the updated terms.
        </p>
      </Section>
      <p className="text-sm text-[var(--muted)]">Last updated: June 2026.</p>
    </PageShell>
  );
}
