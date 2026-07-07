import Link from "next/link";
import { PageShell, Section } from "@/components/page-shell";
import { Button } from "@/components/ui";

export const metadata = { title: "About — Rent-tok" };

export default function AboutPage() {
  return (
    <PageShell
      title="About Rent-tok"
      intro="Finding a room as a student in Gangtok shouldn't mean endless WhatsApp groups, broker fees and dead ends."
    >
      <Section heading="Why we built it">
        <p>
          RentTok started with a simple frustration: students moving to Gangtok for college spend
          weeks chasing leads for a decent, affordable room. Listings are scattered, brokers take a
          cut, and there&apos;s no easy way to compare options side by side.
        </p>
        <p>
          We&apos;re building a single, trustworthy place to discover rooms, PGs, flats and hostels 
          listed directly by owners, verified by us, and bookable without a middleman.
        </p>
      </Section>

      <Section heading="How it&apos;s different">
        <p>
          Every listing is added building-by-building and reviewed before it goes live. There&apos;s
          no brokerage and no fees - reserving a spot is completely free and simply puts you in
          the owner&apos;s request queue.
        </p>
      </Section>

      <Section heading="Made in Sikkim">
        <p>
          RentTok is built locally, for the local student community. We&apos;re starting in Gangtok
          and growing one neighbourhood at a time.
        </p>
      </Section>

      <div className="flex flex-wrap gap-3 pt-2">
        <Link href="/search">
          <Button>Browse rooms</Button>
        </Link>
        <Link href="/owner">
          <Button variant="outline">List your space</Button>
        </Link>
      </div>
    </PageShell>
  );
}
