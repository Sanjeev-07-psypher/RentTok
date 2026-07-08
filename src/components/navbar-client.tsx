"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search, Menu, X, LogOut, LayoutDashboard, Shield, CalendarCheck, Heart, History, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Button } from "./ui";
import { ThemeToggle } from "./theme-toggle";
import { AuthDialog } from "./auth-dialog";

export interface NavUser {
  id: string;
  email: string | null;
  name: string | null;
  isAdmin: boolean;
}

export function NavbarClient({ user, unreadCount = 0 }: { user: NavUser | null; unreadCount?: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  async function signOut() {
    if (isSupabaseConfigured) await createClient().auth.signOut();
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="shrink-0 text-xl font-extrabold tracking-tight">
          Rent<span className="text-[var(--primary)]">Tok</span>
        </Link>

        <form onSubmit={submitSearch} className="relative hidden flex-1 md:block">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by area, city or room type…"
            className="h-11 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] pl-11 pr-4 text-sm placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
        </form>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link href="/owner" className="hidden sm:block">
            <Button variant="outline" size="sm">List your space</Button>
          </Link>

          {user ? (
            <UserMenu user={user} onSignOut={signOut} unreadCount={unreadCount} />
          ) : (
            <Button size="sm" onClick={() => setAuthOpen(true)}>Sign in</Button>
          )}

          <button
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-[var(--border)] px-4 py-3 md:hidden">
          <form onSubmit={submitSearch} className="relative mb-3">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search rooms…"
              className="h-11 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] pl-11 pr-4 text-sm"
            />
          </form>
          <Link href="/owner" className="block py-2 text-sm" onClick={() => setMenuOpen(false)}>
            List your space
          </Link>
        </div>
      )}

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}

function UserMenu({ user, onSignOut, unreadCount }: { user: NavUser; onSignOut: () => void; unreadCount: number }) {
  const [open, setOpen] = useState(false);
  const initial = (user.name ?? user.email ?? "U").charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-10 w-10 place-items-center rounded-full bg-[var(--primary)] text-sm font-semibold text-[var(--primary-foreground)]"
      >
        {initial}
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-xl">
            <div className="border-b border-[var(--border)] px-4 py-2 text-xs text-[var(--muted)]">
              {user.email}
            </div>
            <Link
              href="/account/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-4 py-2 text-sm hover:bg-[var(--surface-2)]"
            >
              <span className="flex items-center gap-2"><Bell size={16} /> Notifications</span>
              {unreadCount > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            <MenuLink href="/account/bookings" icon={<CalendarCheck size={16} />} label="My bookings" onClick={() => setOpen(false)} />
            <MenuLink href="/account/wishlist" icon={<Heart size={16} />} label="Wishlist" onClick={() => setOpen(false)} />
            <MenuLink href="/account/history" icon={<History size={16} />} label="Recently viewed" onClick={() => setOpen(false)} />
            <MenuLink href="/owner" icon={<LayoutDashboard size={16} />} label="Owner dashboard" onClick={() => setOpen(false)} />
            {user.isAdmin && (
              <MenuLink href="/admin" icon={<Shield size={16} />} label="Admin" onClick={() => setOpen(false)} />
            )}
            <button
              onClick={onSignOut}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[var(--danger)] hover:bg-[var(--surface-2)]"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function MenuLink({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--surface-2)]">
      {icon} {label}
    </Link>
  );
}
