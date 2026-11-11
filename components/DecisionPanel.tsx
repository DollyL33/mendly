"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Shown when the rules hand a job to Linda: pay Marco, or cancel and release the hold. */
export function DecisionPanel({ jobId, reason, amountLabel }: { jobId: string; reason: string; amountLabel: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "pay" | "cancel">(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(action: "pay" | "cancel") {
    if (action === "cancel" && !confirm(`Cancel this job? The ${amountLabel} hold is released and you aren't charged.`)) return;
    setBusy(action);
    setError(null);
    const res = await fetch(`/api/jobs/${jobId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) setError(data.error ?? "That didn't work. Try again.");
    router.refresh();
  }

  return (
    <div className="decision">
      <p className="decision-title">Needs your decision</p>
      <p>{reason}</p>
      <div className="decision-actions">
        <button type="button" className="button" onClick={() => decide("pay")} disabled={busy !== null}>
          {busy === "pay" ? "Paying Marco…" : `Pay Marco ${amountLabel}`}
        </button>
        <button type="button" className="button button-secondary" onClick={() => decide("cancel")} disabled={busy !== null}>
          {busy === "cancel" ? "Releasing the hold…" : "Cancel job"}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
