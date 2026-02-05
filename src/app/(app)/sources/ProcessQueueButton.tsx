"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProcessQueueButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`/api/worker?secret=${process.env.NEXT_PUBLIC_WORKER_SECRET}`);
      const data = await res.json();

      if (res.ok) {
        setResult(`Processed ${data.processed} article(s)`);
        router.refresh();
      } else {
        setResult(`Error: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : "Failed to call worker"}`);
    }

    setLoading(false);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {loading ? "Processing..." : "Process Queue"}
      </button>
      {result && <span className="text-sm text-slate-600">{result}</span>}
    </div>
  );
}
