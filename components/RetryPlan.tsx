"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RetryPlan({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/jobs/${jobId}/plan`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setError(data.message ?? data.error ?? "Still couldn't plan it. Try again shortly.");
    router.refresh();
  }

  return (
    <div>
      <button type="button" className="button" onClick={retry} disabled={busy}>
        {busy ? "Planning…" : "Try planning again"}
      </button>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
