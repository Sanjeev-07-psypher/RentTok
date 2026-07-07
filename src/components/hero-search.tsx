"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "./ui";

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form
      onSubmit={submit}
      className="flex w-full max-w-2xl items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-lg)] transition-shadow focus-within:border-[var(--primary)]"
    >
      <Search size={20} className="ml-3 shrink-0 text-[var(--muted)]" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Try “Tadong”, “PG with food”, “single room”…"
        className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
      />
      <Button type="submit" className="shrink-0">Search</Button>
    </form>
  );
}
