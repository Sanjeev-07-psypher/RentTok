import Link from "next/link";
import { TourLink } from "./tour-link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <div className="text-lg font-extrabold">
            Rent<span className="text-[var(--primary)]">Tok</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-[var(--muted)]">
            Rooms for students in Gangtok - searched, verified, and booked the easy way.
          </p>
        </div>
        <FooterCol title="Explore" links={[["Browse rooms", "/search"], ["About Rent-tok", "/about"], ["List your space", "/owner"]]} />
        <FooterCol title="Support" links={[["Help & FAQ", "/help"], ["Contact us", "mailto:hello@rent-tok.in"]]} />
        <FooterCol title="Legal" links={[["Terms of Service", "/terms"], ["Privacy Policy", "/privacy"]]} />
      </div>
      <div className="border-t border-[var(--border)] py-5 text-center text-xs text-[var(--muted)]">
        <p className="font-medium text-[var(--foreground)]">
          Built in the hills 🏔️ - by students, for students of Gangtok.
        </p>
        <p className="mt-1">
          © {new Date().getFullYear()} RentTok · Crafted with chai &amp; cold winters in Sikkim. · <TourLink />
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="hover:text-[var(--foreground)]">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
