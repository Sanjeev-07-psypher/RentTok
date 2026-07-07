import { Database } from "lucide-react";
import { Card } from "./ui";

export function ConnectNotice({ feature }: { feature: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <Card className="grid place-items-center py-16 text-center">
        <Database size={36} className="text-[var(--muted)]" />
        <p className="mt-3 text-lg font-semibold">{feature} needs a backend</p>
        <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">
          Add your Supabase keys to <code>.env.local</code> and run the schema in{" "}
          <code>supabase/schema.sql</code> to enable {feature.toLowerCase()}.
        </p>
      </Card>
    </div>
  );
}
