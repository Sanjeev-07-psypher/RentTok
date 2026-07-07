import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]",
  outline: "border border-[var(--border)] bg-transparent hover:bg-[var(--surface-2)]",
  ghost: "bg-transparent hover:bg-[var(--surface-2)]",
  danger: "bg-[var(--danger)] text-white hover:opacity-90",
};

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        className
      )}
      {...props}
    />
  );
}

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--muted)]",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]",
        className
      )}
    >
      {children}
    </div>
  );
}
