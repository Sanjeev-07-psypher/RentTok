"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] text-[var(--foreground)] transition-colors hover:bg-[var(--surface-2)]"
    >
      {mounted ? (isDark ? <Sun size={18} /> : <Moon size={18} />) : <Sun size={18} />}
    </button>
  );
}
