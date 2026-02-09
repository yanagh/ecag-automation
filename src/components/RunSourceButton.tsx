"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RunSourceButton({
  runAction,
  label = "Run",
  className = "rounded border px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-50"
}: {
  runAction: () => Promise<void>;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    setStatus("Queuing articles...");

    try {
      await runAction();

      setStatus("Processing queue...");
      const res = await fetch(`/api/worker?secret=${process.env.NEXT_PUBLIC_WORKER_SECRET}`);
      const data = await res.json();

      if (res.ok) {
        const count = data.processed ?? 0;
        setStatus(count > 0 ? `Done! ${count} processed` : "No new articles to process");
      } else {
        setStatus(`Error: ${data.error || "Worker failed"}`);
      }

      router.refresh();
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : "Failed"}`);
    }

    setLoading(false);
    setTimeout(() => setStatus(null), 5000);
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={handleClick} disabled={loading} className={className}>
        {loading ? (status ?? "Running...") : label}
      </button>
      {!loading && status && (
        <span className="text-xs text-slate-500">{status}</span>
      )}
    </div>
  );
}
