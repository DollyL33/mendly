"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Linda's auto-pay limit: jobs at or under it pay automatically once every photo is verified. */
export function LimitSetting({ limitCents }: { limitCents: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(limitCents / 100));
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limitUsd: Number(value) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error ?? "Couldn't save.");
    setError(null);
    setEditing(false);
    router.refresh();
  }

  const label = `$${(limitCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <div className="card limit">
      <div>
        <p className="limit-label">Auto-pay limit</p>
        {editing ? (
          <div className="limit-edit">
            <span className="money">$</span>
            <input
              className="mono"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))}
              aria-label="Auto-pay limit in dollars"
            />
            <button type="button" className="button" onClick={save}>
              Save
            </button>
            <button type="button" className="button-quiet" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <p className="limit-value money">{label}</p>
        )}
        {error && <p className="form-error">{error}</p>}
      </div>
      <p className="muted small limit-copy">
        Jobs at or under this pay Marco automatically once every proof photo is verified. Anything over it, or anything
        that fails twice, comes to you.
        {!editing && (
          <>
            {" "}
            <button type="button" className="button-quiet small" onClick={() => setEditing(true)}>
              Change
            </button>
          </>
        )}
      </p>
    </div>
  );
}
